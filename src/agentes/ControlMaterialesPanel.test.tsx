import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import type { MockLink } from '@apollo/client/testing';
import {
  APROBAR_SUGERENCIA,
  CONTROL_MATERIALES,
  RECHAZAR_SUGERENCIA,
  variablesControlMateriales,
  type Hallazgo,
  type Sugerencia,
} from './agentes.graphql';
import { ControlMaterialesPanel } from './ControlMaterialesPanel';

const OBRA = 'b0000000-0000-4000-8000-000000000101';

beforeEach(() => {
  window.plataforma = {
    sesion: {
      usuario: { id: 'u1', nombre: 'Ana', roles: ['gerente'] },
      obtenerToken: vi.fn().mockResolvedValue('t'),
      cerrarSesion: vi.fn(),
    },
    configuracion: { gatewayUrl: 'http://localhost:4000/graphql' },
  };
});
afterEach(() => {
  cleanup();
  delete window.plataforma;
});

const hallazgo = (h: Partial<Hallazgo> = {}) => ({
  __typename: 'Hallazgo',
  ejecucionId: 'e1',
  agente: 'CONTROL_MATERIALES' as const,
  obraId: OBRA,
  obraNombre: 'Edificio Las Palmas',
  tipo: 'STOCK_BAJO',
  severidad: 'ALTA' as const,
  situacion: 'Cemento IP-30: 80 bolsas, mínimo 100',
  causaProbable: 'Consumo de la losa mayor al previsto',
  evidencia: [{ __typename: 'Evidencia', herramienta: 'stock_obra', dato: 'cantidad 80, mínimo 100, estado BAJO' }],
  detectadoEn: '2027-04-20T10:01:12Z',
  ...h,
});

const sugerencia = (s: Partial<Sugerencia> = {}) => ({
  __typename: 'Sugerencia',
  id: 's1',
  ejecucionId: 'e1',
  agente: 'CONTROL_MATERIALES' as const,
  obraId: OBRA,
  obraNombre: 'Edificio Las Palmas',
  accion: 'VERIFICAR_INVENTARIO',
  accionTexto: 'Hacer un conteo físico del material en el depósito de la obra',
  descripcion: 'Contar el cemento IP-30: el stock está bajo el mínimo.',
  estado: 'PENDIENTE' as const,
  creadaEn: '2027-04-20T10:01:12Z',
  ...s,
});

const panel = (
  hallazgos: ReturnType<typeof hallazgo>[],
  sugerencias: ReturnType<typeof sugerencia>[],
): MockLink.MockedResponse => ({
  request: { query: CONTROL_MATERIALES, variables: variablesControlMateriales(OBRA) },
  result: { data: { hallazgos, sugerencias } },
});

const errorIa = (codigo: string, extra: Record<string, unknown> = {}) => ({
  errors: [{ message: 'x', extensions: { codigo, servicio: 'ia', ...extra } }],
});

function dibujar(mocks: MockLink.MockedResponse[]) {
  render(
    <MockedProvider mocks={mocks}>
      <ControlMaterialesPanel obraId={OBRA} />
    </MockedProvider>,
  );
}

const lista = (nombre: string) => screen.findByRole('list', { name: nombre });

describe('ControlMaterialesPanel', () => {
  it('muestra los hallazgos vigentes y las sugerencias pendientes de la obra (criterio 18)', async () => {
    dibujar([panel([hallazgo()], [sugerencia()])]);

    const h = within(await lista('Hallazgos')).getByRole('listitem', { name: 'Hallazgo: Stock bajo' });
    expect(within(h).getByText('Cemento IP-30: 80 bolsas, mínimo 100')).toBeTruthy();
    expect(within(h).getByText('Causa probable: Consumo de la losa mayor al previsto')).toBeTruthy();
    expect(within(h).getByText('stock_obra: cantidad 80, mínimo 100, estado BAJO')).toBeTruthy();
    expect(within(h).getByText('20/04/2027 06:01')).toBeTruthy();
    expect(within(h).getByText('Alta').closest('[data-tono]')?.getAttribute('data-tono')).toBe('error');

    const s = within(await lista('Sugerencias pendientes')).getByRole('listitem');
    expect(within(s).getByText('Hacer un conteo físico del material en el depósito de la obra')).toBeTruthy();
    expect(within(s).getByText('Contar el cemento IP-30: el stock está bajo el mínimo.')).toBeTruthy();
    expect(within(s).getByRole('button', { name: 'Aprobar' })).toBeTruthy();
    expect(within(s).getByRole('button', { name: 'Rechazar' })).toBeTruthy();
  });

  it('sin hallazgos ni sugerencias lo dice', async () => {
    dibujar([panel([], [])]);
    expect(await screen.findByText('No hay hallazgos vigentes en esta obra.')).toBeTruthy();
    expect(screen.getByText('No hay sugerencias pendientes en esta obra.')).toBeTruthy();
  });

  it('el texto del agente con etiquetas HTML se muestra como texto', async () => {
    const situacion = '<img src=x onerror=alert(1)> Cemento <b>bajo</b>';
    dibujar([panel([hallazgo({ situacion })], [sugerencia({ descripcion: '<script>x()</script>' })])]);
    expect(await screen.findByText(situacion)).toBeTruthy();
    expect(screen.getByText('<script>x()</script>')).toBeTruthy();
    const seccion = screen.getByRole('region', { name: 'Control de materiales' });
    expect(seccion.querySelector('img, b, script')).toBeNull();
  });

  it('si IA no responde, el panel dice «No disponible por el momento» y deja reintentar (criterio 21)', async () => {
    dibujar([
      { request: panel([], []).request, result: errorIa('SERVICIO_NO_DISPONIBLE') },
      panel([hallazgo()], []),
    ]);
    expect(await screen.findByText('No disponible por el momento')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Cemento IP-30: 80 bolsas, mínimo 100')).toBeTruthy();
  });

  it('aprobar con comentario registra la decisión y recarga el panel (criterio 12)', async () => {
    dibujar([
      panel([hallazgo()], [sugerencia()]),
      {
        request: { query: APROBAR_SUGERENCIA, variables: { id: 's1', comentario: 'Lo cuenta el almacenero hoy' } },
        result: { data: { aprobarSugerencia: sugerencia({ estado: 'APROBADA' }) } },
      },
      panel([hallazgo()], []),
    ]);
    fireEvent.click(within(await lista('Sugerencias pendientes')).getByRole('button', { name: 'Aprobar' }));

    const dialogo = within(await screen.findByRole('dialog', { name: 'Aprobar sugerencia' }));
    expect(dialogo.getByText(/Aprobar solo registra tu decisión/)).toBeTruthy();
    fireEvent.change(dialogo.getByRole('textbox', { name: 'Comentario (opcional)' }), {
      target: { value: '  Lo cuenta el almacenero hoy ' },
    });
    expect(dialogo.getByText('27 / 300')).toBeTruthy();
    fireEvent.click(dialogo.getByRole('button', { name: 'Aprobar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByText('No hay sugerencias pendientes en esta obra.')).toBeTruthy();
  });

  it('aprobar sin comentario no lo envía', async () => {
    dibujar([
      panel([], [sugerencia()]),
      {
        request: { query: APROBAR_SUGERENCIA, variables: { id: 's1' } },
        result: { data: { aprobarSugerencia: sugerencia({ estado: 'APROBADA' }) } },
      },
      panel([], []),
    ]);
    fireEvent.click(within(await lista('Sugerencias pendientes')).getByRole('button', { name: 'Aprobar' }));
    const dialogo = within(await screen.findByRole('dialog'));
    fireEvent.click(dialogo.getByRole('button', { name: 'Aprobar' }));
    expect(await screen.findByText('No hay sugerencias pendientes en esta obra.')).toBeTruthy();
  });

  it('rechazar exige un motivo de 10 a 500 caracteres con contador (criterio 13)', async () => {
    const motivo = 'El conteo ya se hizo ayer';
    dibujar([
      panel([], [sugerencia()]),
      {
        request: { query: RECHAZAR_SUGERENCIA, variables: { id: 's1', motivo } },
        result: { data: { rechazarSugerencia: sugerencia({ estado: 'RECHAZADA' }) } },
      },
      panel([], []),
    ]);
    fireEvent.click(within(await lista('Sugerencias pendientes')).getByRole('button', { name: 'Rechazar' }));
    const dialogo = within(await screen.findByRole('dialog', { name: 'Rechazar sugerencia' }));
    const campo = dialogo.getByRole('textbox', { name: /Motivo/ });

    fireEvent.click(dialogo.getByRole('button', { name: 'Rechazar' }));
    expect(
      await dialogo.findByText('El motivo debe tener entre 10 y 500 caracteres. · 0 / 500 (mínimo 10)'),
    ).toBeTruthy();
    fireEvent.change(campo, { target: { value: 'Muy corto' } });
    expect(await dialogo.findByText(/· 9 \/ 500 \(mínimo 10\)$/)).toBeTruthy();

    fireEvent.change(campo, { target: { value: motivo } });
    expect(await dialogo.findByText('25 / 500 (mínimo 10)')).toBeTruthy();
    fireEvent.click(dialogo.getByRole('button', { name: 'Rechazar' }));
    expect(await screen.findByText('No hay sugerencias pendientes en esta obra.')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('si otra persona ya la decidió, lo avisa y recarga el panel (criterio 14)', async () => {
    dibujar([
      panel([], [sugerencia()]),
      { request: { query: APROBAR_SUGERENCIA, variables: { id: 's1' } }, result: errorIa('SUGERENCIA_YA_DECIDIDA') },
      panel([], []),
    ]);
    fireEvent.click(within(await lista('Sugerencias pendientes')).getByRole('button', { name: 'Aprobar' }));
    const dialogo = within(await screen.findByRole('dialog'));
    fireEvent.click(dialogo.getByRole('button', { name: 'Aprobar' }));

    expect(await dialogo.findByText('Esta sugerencia ya fue aprobada o rechazada. Recarga la lista.')).toBeTruthy();
    expect(await screen.findByText('No hay sugerencias pendientes en esta obra.')).toBeTruthy();
  });

  it('COMENTARIO_INVALIDO muestra arriba «Revisa el comentario.» y la regla junto al campo', async () => {
    dibujar([
      panel([], [sugerencia()]),
      {
        request: { query: APROBAR_SUGERENCIA, variables: { id: 's1', comentario: 'ok' } },
        result: errorIa('COMENTARIO_INVALIDO', {
          errores: [{ campo: 'comentario', mensaje: 'Debe tener como máximo 300 caracteres' }],
        }),
      },
    ]);
    fireEvent.click(within(await lista('Sugerencias pendientes')).getByRole('button', { name: 'Aprobar' }));
    const dialogo = within(await screen.findByRole('dialog'));
    fireEvent.change(dialogo.getByRole('textbox'), { target: { value: 'ok' } });
    fireEvent.click(dialogo.getByRole('button', { name: 'Aprobar' }));

    expect(await dialogo.findByText('Revisa el comentario.')).toBeTruthy();
    expect(dialogo.getByText('Debe tener como máximo 300 caracteres · 2 / 300')).toBeTruthy();
  });

  it('si IA no responde al decidir, el diálogo lo avisa y queda abierto', async () => {
    dibujar([
      panel([], [sugerencia()]),
      { request: { query: APROBAR_SUGERENCIA, variables: { id: 's1' } }, result: errorIa('SERVICIO_NO_DISPONIBLE') },
    ]);
    fireEvent.click(within(await lista('Sugerencias pendientes')).getByRole('button', { name: 'Aprobar' }));
    const dialogo = within(await screen.findByRole('dialog'));
    fireEvent.click(dialogo.getByRole('button', { name: 'Aprobar' }));
    expect(
      await dialogo.findByText('Este servicio no está disponible por el momento. Intenta de nuevo en unos minutos.'),
    ).toBeTruthy();
  });

  it('sin conexión muestra lo guardado y deshabilita Aprobar y Rechazar (104)', async () => {
    const guardado = { hallazgos: [hallazgo()], sugerencias: [sugerencia()] };
    window.plataforma = {
      ...window.plataforma!,
      conexion: { enLinea: false, reportarFallo: vi.fn() },
      almacen: {
        guardarConsulta: vi.fn(),
        leerConsulta: vi.fn(async () => ({ datos: guardado, guardadoEn: '2026-10-30T18:05:00.000Z' })),
      } as never,
    };
    dibujar([]);
    const s = within(await lista('Sugerencias pendientes'));
    expect(screen.getByText('Sin conexión · datos del 30/10/2026 14:05')).toBeTruthy();
    expect((s.getByRole('button', { name: 'Aprobar' }) as HTMLButtonElement).disabled).toBe(true);
    expect((s.getByRole('button', { name: 'Rechazar' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
