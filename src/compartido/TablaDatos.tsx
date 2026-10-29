import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
} from '@tanstack/react-table';
import type { ReactNode } from 'react';

// Tabla común del microfrontend: la lógica es de TanStack Table (orden por columna) y el dibujo, de la Table
// de MUI (filas compactas, docs/diseno-visual.md). Las columnas numéricas se alinean a la derecha.

export const caracteristicasTabla = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text, basic: sortFn_basic },
});

export type CaracteristicasTabla = typeof caracteristicasTabla;

// `any`: cada columna tiene su propio tipo de valor (como en ColumnDef de TanStack Table)
export type ColumnaTabla<T extends RowData> = ColumnDef<CaracteristicasTabla, T, any>;

/** Ayudante para declarar columnas tipadas de una fila. */
export function ayudanteColumnas<T extends RowData>() {
  return createColumnHelper<CaracteristicasTabla, T>();
}

declare module '@tanstack/react-table' {
  interface ColumnMeta<TFeatures, TData, TValue> {
    /** Columna numérica: a la derecha y con cifras tabulares. */
    numerica?: boolean;
  }
}

interface Props<T extends RowData> {
  columnas: ColumnaTabla<T>[];
  filas: T[];
  /** Nombre de la tabla para lectores de pantalla. */
  etiqueta: string;
  /** Identificador estable de cada fila. */
  idFila: (fila: T) => string;
  /** Lo que se muestra si no hay filas. */
  vacio?: ReactNode;
}

const estiloNumero = {
  fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
} as const;

export function TablaDatos<T extends RowData>({ columnas, filas, etiqueta, idFila, vacio }: Props<T>) {
  const tabla = useTable({
    features: caracteristicasTabla,
    columns: columnas,
    data: filas,
    getRowId: (fila) => idFila(fila),
    enableSortingRemoval: true,
  });

  const filasVisibles = tabla.getRowModel().rows;

  return (
    <TableContainer>
      <Table size="small" aria-label={etiqueta}>
        <TableHead>
          {tabla.getHeaderGroups().map((grupo) => (
            <TableRow key={grupo.id}>
              {grupo.headers.map((encabezado) => {
                const columna = encabezado.column;
                const numerica = columna.columnDef.meta?.numerica;
                const orden = columna.getIsSorted();
                return (
                  <TableCell
                    key={encabezado.id}
                    align={numerica ? 'right' : 'left'}
                    sortDirection={orden || false}
                    sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}
                  >
                    {encabezado.isPlaceholder ? null : columna.getCanSort() ? (
                      <TableSortLabel
                        active={!!orden}
                        direction={orden || 'asc'}
                        onClick={columna.getToggleSortingHandler()}
                      >
                        <tabla.FlexRender header={encabezado} />
                      </TableSortLabel>
                    ) : (
                      <tabla.FlexRender header={encabezado} />
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {filasVisibles.map((fila) => (
            <TableRow key={fila.id} hover sx={{ height: 40 }}>
              {fila.getAllCells().map((celda) => {
                const numerica = celda.column.columnDef.meta?.numerica;
                return (
                  <TableCell
                    key={celda.id}
                    align={numerica ? 'right' : 'left'}
                    sx={numerica ? estiloNumero : undefined}
                  >
                    <tabla.FlexRender cell={celda} />
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
          {filasVisibles.length === 0 && vacio && (
            <TableRow>
              <TableCell colSpan={columnas.length} sx={{ p: 0, border: 0 }}>
                {vacio}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
