import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import type { MockLink } from '@apollo/client/testing';
import { ACTUALIZAR_MATERIAL, CREAR_MATERIAL, MATERIALES, type Material } from './catalogo.graphql';
import { CatalogoPagina } from './CatalogoPagina';

/** Sesión del shell con los roles del token (incluye los técnicos de Keycloak). */
function sesionCon(...roles: string[]) {
  window.plataforma = {
    sesion: {
      usuario: { id: 'u1', nombre: 'Ana', roles: ['default-roles-supervision', 'offline_access', ...roles] },
      obtenerToken: vi.fn().mockResolvedValue('t'),
      cerrarSesion: vi.fn(),
    },
    configuracion: { gatewayUrl: 'http://localhost:4000/graphql' },
  };
}

beforeEach(() => sesionCon('admin'));
afterEach(() => {
  cleanup();
  delete window.plataforma;
});

const CEMENTO: Material = {
  id: 'm1',
  codigo: 'CEM-IP30',
  nombre: 'Cemento IP-30',
  tipo: 'CEMENTO',
  unidad: 'bolsa',
  unidadPlural: 'bolsas',
  precioReferencial: 62,
  activo: true,
  atributos: [{ nombre: 'peso', valor: '50 kg' }],
};
const FIERRO: Material = {
  ...CEMENTO,
  id: 'm2',
  codigo: 'ACE-12',
  nombre: 'Fierro corrugado 12 mm',
  tipo: 'ACERO',
  unidad: 'barra',
  unidadPlural: 'barras',
  precioReferencial: 1250,
  activo: false,
  atributos: [],
};

const pagina = (items: Material[]) => ({
  materiales: { __typename: 'MaterialesPagina', items, total: items.length, pagina: 1, tamano: 20 },
});

const listar = (items: Material[], busqueda?: string): MockLink.MockedResponse => ({
  request: { query: MATERIALES, variables: { busqueda, pagina: 1, tamano: 20 } },
  result: { data: pagina(items) },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

function dibujar(mocks: MockLink.MockedResponse[]) {
  return render(
    <MockedProvider mocks={mocks}>
      <CatalogoPagina />
    </MockedProvider>,
  );
}

describe('CatalogoPagina', () => {
  it('lista los materiales con código, nombre, tipo, unidad, precio y estado (criterio 1)', async () => {
    dibujar([listar([CEMENTO, FIERRO])]);

    await screen.findByText('CEM-IP30');
    const filas = within(screen.getByRole('table', { name: 'Catálogo de materiales' })).getAllByRole('row');
    expect(filas).toHaveLength(3);
    const cemento = within(filas[1]);
    expect(cemento.getByText('CEM-IP30')).toBeTruthy();
    expect(cemento.getByText('Cemento IP-30')).toBeTruthy();
    expect(cemento.getByText('Cemento')).toBeTruthy();
    expect(cemento.getByText('bolsa')).toBeTruthy();
    expect(cemento.getByText('Bs 62,00')).toBeTruthy();
    expect(cemento.getByText('Activo')).toBeTruthy();
    expect(within(filas[2]).getByText('Inactivo')).toBeTruthy();
    expect(within(filas[2]).getByText('Bs 1.250,00')).toBeTruthy();
  });

  it('busca por código o nombre en el gateway', async () => {
    dibujar([listar([CEMENTO, FIERRO]), listar([FIERRO], 'fierro')]);
    await screen.findByText('CEM-IP30');

    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar por código o nombre' }), {
      target: { value: 'fierro' },
    });

    await waitFor(() => expect(screen.queryByText('CEM-IP30')).toBeNull());
    expect(screen.getByText('ACE-12')).toBeTruthy();
  });

  describe('sin conexión (104)', () => {
    const CLAVE = 'Materiales:{"pagina":1,"tamano":20}';

    /** Publica la conexión y un almacén en memoria como los del shell. */
    function conShell(enLinea: boolean, guardadas: Record<string, unknown> = {}) {
      const consultas = new Map(
        Object.entries(guardadas).map(([clave, datos]) => [clave, { datos, guardadoEn: '2026-10-30T18:05:00.000Z' }]),
      );
      const almacen = {
        guardarConsulta: vi.fn(async (clave: string, datos: unknown) => {
          consultas.set(clave, { datos, guardadoEn: new Date().toISOString() });
        }),
        leerConsulta: vi.fn(async (clave: string) => consultas.get(clave) ?? null),
      };
      window.plataforma = {
        ...window.plataforma!,
        conexion: { enLinea, reportarFallo: vi.fn() },
        almacen: almacen as never,
      };
      return almacen;
    }

    it('en línea guarda la página del catálogo en el equipo', async () => {
      const almacen = conShell(true);
      dibujar([listar([CEMENTO])]);
      await screen.findByText('CEM-IP30');
      await waitFor(() => expect(almacen.guardarConsulta).toHaveBeenCalledWith(CLAVE, pagina([CEMENTO])));
      expect(screen.queryByText(/^Sin conexión/)).toBeNull();
    });

    it('muestra el catálogo guardado con el aviso y su fecha', async () => {
      conShell(false, { [CLAVE]: pagina([CEMENTO, FIERRO]) });
      dibujar([]);
      expect(await screen.findByText('CEM-IP30')).toBeTruthy();
      expect(screen.getByText('ACE-12')).toBeTruthy();
      expect(screen.getByText('Sin conexión · datos del 30/10/2026 14:05')).toBeTruthy();
    });

    it('deshabilita crear, editar, activar y desactivar con «Requiere conexión» hasta que vuelve la conexión', async () => {
      conShell(false, { [CLAVE]: pagina([CEMENTO, FIERRO]) });
      dibujar([listar([CEMENTO, FIERRO])]);
      await screen.findByText('CEM-IP30');

      const escritura = () => [
        screen.getByRole('button', { name: 'Nuevo material' }),
        ...screen.getAllByRole('button', { name: 'Editar' }),
        screen.getByRole('button', { name: 'Desactivar' }),
        screen.getByRole('button', { name: 'Activar' }),
      ];
      for (const boton of escritura()) expect((boton as HTMLButtonElement).disabled).toBe(true);
      fireEvent.mouseOver(screen.getByRole('button', { name: 'Nuevo material' }).parentElement!);
      expect((await screen.findByRole('tooltip')).textContent).toBe('Requiere conexión');

      act(() => {
        window.plataforma!.conexion!.enLinea = true;
        window.dispatchEvent(new CustomEvent('plataforma:conexion', { detail: { enLinea: true } }));
      });
      // Vuelve a pedir el catálogo a la red y habilita las acciones
      await waitFor(() => {
        for (const boton of escritura()) expect((boton as HTMLButtonElement).disabled).toBe(false);
      });
      expect(screen.queryByText(/^Sin conexión/)).toBeNull();
    });

    it('si el catálogo nunca se abrió en el equipo lo avisa', async () => {
      conShell(false);
      dibujar([]);
      expect(await screen.findByText('No hay datos guardados de esta pantalla')).toBeTruthy();
      expect(screen.queryByRole('table')).toBeNull();
    });
  });

  it('sin resultados muestra el estado vacío', async () => {
    dibujar([listar([])]);
    expect(await screen.findByText('Aún no hay materiales.')).toBeTruthy();
  });

  it('si el gateway falla muestra el error con Reintentar', async () => {
    dibujar([{ ...listar([]), result: undefined, error: new Error('red') }]);
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });

  it.each([['residente'], ['gerente']])(
    '%s solo consulta: no ve Nuevo material, Editar ni Desactivar (criterio 2)',
    async (rol) => {
      sesionCon(rol);
      dibujar([listar([CEMENTO, FIERRO])]);
      await screen.findByText('CEM-IP30');

      expect(screen.queryByRole('button', { name: 'Nuevo material' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Desactivar' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Activar' })).toBeNull();
      expect(screen.queryByRole('columnheader', { name: 'Acciones' })).toBeNull();
    },
  );

  it('admin ve las acciones de escritura', async () => {
    dibujar([listar([CEMENTO, FIERRO])]);
    await screen.findByText('CEM-IP30');
    expect(screen.getByRole('button', { name: 'Nuevo material' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Editar' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Desactivar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Activar' })).toBeTruthy();
  });

  it('el formulario lateral valida los campos obligatorios', async () => {
    dibujar([listar([])]);
    fireEvent.click(await screen.findByRole('button', { name: 'Nuevo material' }));

    const formulario = await screen.findByRole('form', { name: 'Nuevo material' });
    fireEvent.click(within(formulario).getByRole('button', { name: 'Guardar material' }));

    await waitFor(() => expect(within(formulario).getAllByText('Obligatorio')).toHaveLength(5));
  });

  it('crea un material con atributos y muestra el error de código repetido (criterio 4)', async () => {
    const entrada = {
      codigo: 'CEM-IP30',
      nombre: 'Cemento IP-30',
      tipo: 'CEMENTO',
      unidad: 'bolsa',
      unidadPlural: 'bolsas',
      precioReferencial: 62,
      atributos: [{ nombre: 'peso', valor: '50 kg' }],
    };
    dibujar([
      listar([]),
      {
        request: { query: CREAR_MATERIAL, variables: { entrada } },
        result: {
          errors: [
            {
              message: 'Ya existe',
              extensions: { codigo: 'CODIGO_MATERIAL_REPETIDO', servicio: 'materiales', estado: 409 },
            },
          ],
        },
      },
    ]);
    fireEvent.click(await screen.findByRole('button', { name: 'Nuevo material' }));
    const formulario = within(await screen.findByRole('form', { name: 'Nuevo material' }));

    const escribir = (etiqueta: string | RegExp, valor: string) =>
      fireEvent.change(formulario.getByRole('textbox', { name: etiqueta }), { target: { value: valor } });
    escribir(/^Código/, ' cem-ip30 ');
    escribir(/^Nombre/, 'Cemento IP-30');
    escribir(/^Unidad en plural/, 'bolsas');
    escribir(/^Unidad\b(?! en)/, 'bolsa');
    escribir(/^Precio referencial/, '62');
    fireEvent.click(formulario.getByRole('button', { name: 'Agregar atributo' }));
    escribir('Nombre del atributo 1', 'peso');
    escribir('Valor del atributo 1', '50 kg');
    fireEvent.click(formulario.getByRole('button', { name: 'Guardar material' }));

    expect(await formulario.findByText('Ya existe un material con el código CEM-IP30')).toBeTruthy();
  });

  it('editar abre el formulario con los datos del material y guarda con PUT completo', async () => {
    const entrada = {
      codigo: 'CEM-IP30',
      nombre: 'Cemento IP-30 Fancesa',
      tipo: 'CEMENTO',
      unidad: 'bolsa',
      unidadPlural: 'bolsas',
      precioReferencial: 62,
      activo: true,
      atributos: [{ nombre: 'peso', valor: '50 kg' }],
    };
    dibujar([
      listar([CEMENTO]),
      {
        request: { query: ACTUALIZAR_MATERIAL, variables: { id: 'm1', entrada } },
        result: { data: { actualizarMaterial: { __typename: 'Material', ...CEMENTO, nombre: entrada.nombre } } },
      },
    ]);
    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    const formulario = within(await screen.findByRole('form', { name: 'Editar material' }));
    expect((formulario.getByRole('textbox', { name: 'Valor del atributo 1' }) as HTMLInputElement).value).toBe('50 kg');

    fireEvent.change(formulario.getByRole('textbox', { name: /^Nombre\b(?! del)/ }), {
      target: { value: 'Cemento IP-30 Fancesa' },
    });
    fireEvent.click(formulario.getByRole('button', { name: 'Guardar material' }));

    expect(await screen.findByText('Material CEM-IP30 guardado')).toBeTruthy();
  });

  it('desactivar pide confirmación y manda el material con activo false (criterio 5)', async () => {
    dibujar([
      listar([CEMENTO]),
      {
        request: {
          query: ACTUALIZAR_MATERIAL,
          variables: {
            id: 'm1',
            entrada: {
              codigo: 'CEM-IP30',
              nombre: 'Cemento IP-30',
              tipo: 'CEMENTO',
              unidad: 'bolsa',
              unidadPlural: 'bolsas',
              precioReferencial: 62,
              activo: false,
              atributos: [{ nombre: 'peso', valor: '50 kg' }],
            },
          },
        },
        result: { data: { actualizarMaterial: { __typename: 'Material', ...CEMENTO, activo: false } } },
      },
    ]);
    fireEvent.click(await screen.findByRole('button', { name: 'Desactivar' }));
    const dialogo = within(await screen.findByRole('dialog'));
    expect(dialogo.getByText(/sigue en el historial/)).toBeTruthy();
    fireEvent.click(dialogo.getByRole('button', { name: 'Desactivar' }));

    expect(await screen.findByText('Cemento IP-30 desactivado')).toBeTruthy();
  });
});
