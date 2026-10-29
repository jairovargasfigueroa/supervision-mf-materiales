import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import type { MockLink } from '@apollo/client/testing';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { MATERIALES, type Material } from '../catalogo/catalogo.graphql';
import { crearRouter } from '../router';
import { DEFINIR_STOCK_MINIMO, OBRAS, STOCK_OBRA, type StockMaterial } from './stock.graphql';

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

const OBRA = 'b0000000-0000-4000-8000-000000000101';

const fila = (f: Partial<StockMaterial> & Pick<StockMaterial, 'materialId' | 'codigo' | 'nombre'>) => ({
  __typename: 'StockMaterial',
  unidad: 'bolsa',
  unidadPlural: 'bolsas',
  cantidad: 0,
  minimo: 0,
  estado: 'OK' as const,
  ...f,
});

const STOCK = [
  fila({ materialId: 'm1', codigo: 'CEM-IP30', nombre: 'Cemento IP-30', cantidad: 80, minimo: 100, estado: 'BAJO' }),
  fila({
    materialId: 'm2',
    codigo: 'ARE-01',
    nombre: 'Arena fina',
    unidad: 'm³',
    unidadPlural: 'm³',
    cantidad: 125,
    minimo: 100,
    estado: 'JUSTO',
  }),
  fila({
    materialId: 'm3',
    codigo: 'LAD-6H',
    nombre: 'Ladrillo 6 huecos',
    unidad: 'pieza',
    unidadPlural: 'piezas',
    cantidad: 1,
    minimo: 0,
    estado: 'OK',
  }),
];

const obras: MockLink.MockedResponse = {
  request: { query: OBRAS, variables: {} },
  result: {
    data: {
      obras: [
        { __typename: 'ObraResumen', id: OBRA, nombre: 'Edificio Las Palmas' },
        { __typename: 'ObraResumen', id: 'otra', nombre: 'Condominio Los Pinos' },
      ],
    },
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
};

const stock = (filas: ReturnType<typeof fila>[], obraId = OBRA): MockLink.MockedResponse => ({
  request: { query: STOCK_OBRA, variables: { obraId } },
  result: { data: { stockObra: filas } },
});

function dibujar(mocks: MockLink.MockedResponse[], direccion = `/materiales/stock?obra=${OBRA}`) {
  const historial = createMemoryHistory({ initialEntries: [direccion] });
  render(
    <MockedProvider mocks={mocks}>
      <RouterProvider router={crearRouter(historial)} />
    </MockedProvider>,
  );
  return historial;
}

/** Filas de la tabla (encabezado incluido) cuando ya llegaron los datos. */
const filasTabla = async (cuantas?: number) => {
  let filas: HTMLElement[] = [];
  await waitFor(() => {
    filas = within(screen.getByRole('table', { name: 'Stock de la obra' })).getAllByRole('row');
    if (cuantas === undefined ? filas.length < 2 : filas.length !== cuantas) throw new Error('sin datos');
  });
  return filas;
};

describe('StockPagina', () => {
  it('sin obra elegida pide elegir una; al elegirla la pone en la dirección y muestra su stock', async () => {
    const historial = dibujar([obras, stock(STOCK)], '/materiales/stock');
    expect(await screen.findByText('Elige una obra para ver su stock.')).toBeTruthy();

    const selector = await screen.findByRole('combobox', { name: 'Obra' });
    await waitFor(() => expect(selector.getAttribute('aria-disabled')).not.toBe('true'));
    fireEvent.mouseDown(selector);
    fireEvent.click(await screen.findByRole('option', { name: 'Edificio Las Palmas' }));

    expect(await filasTabla()).toHaveLength(4);
    expect(historial.location.search).toContain(OBRA);
  });

  it('muestra cantidad, mínimo y estado con su color (criterio 6)', async () => {
    dibujar([obras, stock(STOCK)]);
    const [, cemento, arena, ladrillo] = await filasTabla();

    expect(within(cemento).getByText('80 bolsas')).toBeTruthy();
    expect(within(cemento).getByText('100 bolsas')).toBeTruthy();
    expect(within(cemento).getByText('Bajo').closest('[data-tono]')?.getAttribute('data-tono')).toBe('error');
    expect(within(arena).getByText('125 m³')).toBeTruthy();
    expect(within(arena).getByText('Justo').closest('[data-tono]')?.getAttribute('data-tono')).toBe('atencion');
    expect(within(ladrillo).getByText('1 pieza')).toBeTruthy();
    expect(within(ladrillo).getByText('OK').closest('[data-tono]')?.getAttribute('data-tono')).toBe('exito');
  });

  it('residente ve el stock de su obra sin Fijar mínimo ni Agregar material (criterio 7)', async () => {
    sesionCon('residente');
    dibujar([obras, stock(STOCK)]);
    await filasTabla();

    expect(screen.queryByRole('button', { name: 'Fijar mínimo' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Agregar material' })).toBeNull();
    expect(screen.getByText('Bajo')).toBeTruthy();
  });

  it('admin ve Fijar mínimo en cada fila y Agregar material', async () => {
    dibujar([obras, stock(STOCK)]);
    await filasTabla();
    expect(screen.getAllByRole('button', { name: 'Fijar mínimo' })).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Agregar material' })).toBeTruthy();
  });

  it('una obra sin materiales muestra el estado vacío', async () => {
    dibujar([obras, stock([])]);
    expect(
      await screen.findByText('Esta obra todavía no tiene materiales con movimientos ni mínimo definido.'),
    ).toBeTruthy();
  });

  it('una obra que el usuario no ve muestra «Obra no encontrada» (criterio 8)', async () => {
    dibujar(
      [
        obras,
        {
          request: { query: STOCK_OBRA, variables: { obraId: 'ajena' } },
          result: { errors: [{ message: 'x', extensions: { codigo: 'OBRA_NO_ENCONTRADA', servicio: 'materiales' } }] },
        },
      ],
      '/materiales/stock?obra=ajena',
    );
    expect(await screen.findByText('Obra no encontrada')).toBeTruthy();
  });

  it('fijar mínimo valida ≥ 0, guarda y vuelve a pedir el stock (criterio 7)', async () => {
    const actualizado = { ...STOCK[0], minimo: 60, estado: 'OK' as const };
    dibujar([
      obras,
      stock(STOCK),
      {
        request: { query: DEFINIR_STOCK_MINIMO, variables: { obraId: OBRA, materialId: 'm1', minimo: 60 } },
        result: { data: { definirStockMinimo: actualizado } },
      },
      stock([actualizado, STOCK[1], STOCK[2]]),
    ]);
    const [, cemento] = await filasTabla();
    fireEvent.click(within(cemento).getByRole('button', { name: 'Fijar mínimo' }));

    const dialogo = within(await screen.findByRole('dialog', { name: 'Fijar mínimo · Cemento IP-30' }));
    const campo = dialogo.getByRole('textbox', { name: /Stock mínimo/ });
    expect((campo as HTMLInputElement).value).toBe('100');
    fireEvent.change(campo, { target: { value: '-5' } });
    expect(await dialogo.findByText('Debe ser un número mayor o igual a 0')).toBeTruthy();
    fireEvent.change(campo, { target: { value: '60' } });
    fireEvent.click(dialogo.getByRole('button', { name: 'Fijar mínimo' }));

    expect(await screen.findByText('Mínimo de Cemento IP-30: 60 bolsas')).toBeTruthy();
    await waitFor(() => {
      const filaCemento = within(screen.getByRole('table', { name: 'Stock de la obra' })).getAllByRole('row')[1];
      expect(within(filaCemento).getByText('OK')).toBeTruthy();
    });
  });

  it('MATERIAL_INACTIVO al fijar el mínimo se muestra en el diálogo', async () => {
    dibujar([
      obras,
      stock(STOCK),
      {
        request: { query: DEFINIR_STOCK_MINIMO, variables: { obraId: OBRA, materialId: 'm1', minimo: 100 } },
        result: { errors: [{ message: 'x', extensions: { codigo: 'MATERIAL_INACTIVO', servicio: 'materiales' } }] },
      },
    ]);
    const [, cemento] = await filasTabla();
    fireEvent.click(within(cemento).getByRole('button', { name: 'Fijar mínimo' }));
    const dialogo = within(await screen.findByRole('dialog'));
    fireEvent.click(dialogo.getByRole('button', { name: 'Fijar mínimo' }));
    expect(
      await dialogo.findByText('El material está desactivado; no se puede usar en movimientos ni fijarle un mínimo.'),
    ).toBeTruthy();
  });

  it('agregar material ofrece solo activos que no están en la obra y fija su mínimo (criterio 7)', async () => {
    const yeso: Material = {
      id: 'm9',
      codigo: 'YES-01',
      nombre: 'Yeso',
      tipo: 'OTRO',
      unidad: 'bolsa',
      unidadPlural: 'bolsas',
      precioReferencial: 35,
      activo: true,
      atributos: [],
    };
    const catalogo = (items: Material[]) => ({
      materiales: {
        __typename: 'MaterialesPagina',
        items: items.map((m) => ({ __typename: 'Material', ...m })),
        total: items.length,
        pagina: 1,
        tamano: 20,
      },
    });
    const cemento: Material = { ...yeso, id: 'm1', codigo: 'CEM-IP30', nombre: 'Cemento IP-30', tipo: 'CEMENTO' };
    const nuevaFila = fila({ materialId: 'm9', codigo: 'YES-01', nombre: 'Yeso', minimo: 20, estado: 'BAJO' });
    dibujar([
      obras,
      stock(STOCK),
      {
        request: { query: MATERIALES, variables: { busqueda: undefined, soloActivos: true, pagina: 1, tamano: 20 } },
        result: { data: catalogo([cemento, yeso]) },
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
      {
        request: { query: DEFINIR_STOCK_MINIMO, variables: { obraId: OBRA, materialId: 'm9', minimo: 20 } },
        result: { data: { definirStockMinimo: nuevaFila } },
      },
      stock([...STOCK, nuevaFila]),
    ]);
    await filasTabla();
    fireEvent.click(screen.getByRole('button', { name: 'Agregar material' }));
    const dialogo = within(await screen.findByRole('dialog', { name: 'Agregar material a la obra' }));

    fireEvent.mouseDown(dialogo.getByRole('combobox', { name: /Material/ }));
    expect(await screen.findByRole('option', { name: 'YES-01 · Yeso' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'CEM-IP30 · Cemento IP-30' })).toBeNull();
    fireEvent.click(screen.getByRole('option', { name: 'YES-01 · Yeso' }));
    fireEvent.change(dialogo.getByRole('textbox', { name: /Stock mínimo/ }), { target: { value: '20' } });
    fireEvent.click(dialogo.getByRole('button', { name: 'Agregar' }));

    expect(await screen.findByText('Mínimo de Yeso: 20 bolsas')).toBeTruthy();
    expect(await filasTabla(5)).toHaveLength(5);
  });
});
