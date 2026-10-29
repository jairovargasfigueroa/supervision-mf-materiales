import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import { getRouteApi } from '@tanstack/react-router';
import { EstadoChip } from '../compartido/EstadoChip';
import { EstadoError } from '../compartido/EstadoError';
import { EstadoVacio } from '../compartido/EstadoVacio';
import { ayudanteColumnas, TablaDatos } from '../compartido/TablaDatos';
import { codigoDeError, mensajeDeError } from '../nucleo/errores';
import { formatearCantidad } from '../nucleo/formato';
import { usePuedeGestionarMateriales } from '../nucleo/permisos';
import { AYUDA_ESTADOS, presentacionEstado, unidadSegunCantidad } from './estado-stock';
import { FijarMinimoDialogo } from './FijarMinimoDialogo';
import { useObras, useStockObra, type StockMaterial } from './stock.graphql';

const ruta = getRouteApi('/stock');
const columna = ayudanteColumnas<StockMaterial>();

type Dialogo = { abierto: false } | { abierto: true; fila?: StockMaterial };

const ORDEN_ESTADO = { BAJO: 0, JUSTO: 1, OK: 2 } as const;

// Stock por obra (003, criterios 6 a 8): cantidad, mínimo y estado de cada material de la obra elegida;
// administración fija mínimos y agrega materiales del catálogo a la obra.
export function StockPagina() {
  const { obra: obraId } = ruta.useSearch();
  const navegar = ruta.useNavigate();
  const puedeGestionar = usePuedeGestionarMateriales();
  const obras = useObras();
  const stock = useStockObra(obraId);
  const [dialogo, setDialogo] = useState<Dialogo>({ abierto: false });
  const [aviso, setAviso] = useState<string>();

  const columnas = useMemo(
    () => [
      columna.accessor('codigo', { header: 'Código', sortFn: 'alphanumeric' }),
      columna.accessor('nombre', { header: 'Material', sortFn: 'text' }),
      columna.accessor('cantidad', {
        header: 'Cantidad',
        sortFn: 'basic',
        meta: { numerica: true },
        cell: ({ row: { original: f } }) =>
          formatearCantidad(f.cantidad, unidadSegunCantidad(f.cantidad, f.unidad, f.unidadPlural)),
      }),
      columna.accessor('minimo', {
        header: 'Mínimo',
        sortFn: 'basic',
        meta: { numerica: true },
        cell: ({ row: { original: f } }) =>
          formatearCantidad(f.minimo, unidadSegunCantidad(f.minimo, f.unidad, f.unidadPlural)),
      }),
      columna.accessor((f) => ORDEN_ESTADO[f.estado], {
        id: 'estado',
        header: 'Estado',
        sortFn: 'basic',
        cell: ({ row: { original: f } }) => <EstadoChip {...presentacionEstado(f.estado)} />,
      }),
      // Solo admin fija mínimos (criterio 7)
      ...(!puedeGestionar
        ? []
        : [
            columna.display({
              id: 'acciones',
              header: 'Acciones',
              cell: ({ row }) => (
                <Button size="small" onClick={() => setDialogo({ abierto: true, fila: row.original })}>
                  Fijar mínimo
                </Button>
              ),
            }),
          ]),
    ],
    [puedeGestionar],
  );

  const filas = stock.data?.stockObra ?? SIN_FILAS;
  const listaObras = obras.data?.obras;

  const contenido = () => {
    if (!obraId) return <EstadoVacio texto="Elige una obra para ver su stock." />;
    if (stock.error && !stock.data) {
      if (codigoDeError(stock.error) === 'OBRA_NO_ENCONTRADA') return <EstadoVacio texto="Obra no encontrada" />;
      return <EstadoError alReintentar={() => void stock.refetch()} />;
    }
    return (
      <TablaDatos
        etiqueta="Stock de la obra"
        columnas={columnas}
        filas={filas}
        idFila={(f) => f.materialId}
        vacio={
          stock.data && (
            <EstadoVacio texto="Esta obra todavía no tiene materiales con movimientos ni mínimo definido." />
          )
        }
      />
    );
  };

  return (
    <>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 2, justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <TextField
          select
          size="small"
          label="Obra"
          value={listaObras?.some((o) => o.id === obraId) ? obraId : ''}
          onChange={(e) => void navegar({ search: { obra: e.target.value || undefined } })}
          sx={{ width: { xs: '100%', sm: 360 } }}
          disabled={!listaObras?.length}
          helperText={
            obras.error ? mensajeDeError(obras.error) : listaObras?.length === 0 ? 'Aún no hay obras.' : undefined
          }
          error={!!obras.error}
        >
          {(listaObras ?? []).map((obra) => (
            <MenuItem key={obra.id} value={obra.id}>
              {obra.nombre}
            </MenuItem>
          ))}
        </TextField>
        {puedeGestionar && obraId && stock.data && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogo({ abierto: true })}>
            Agregar material
          </Button>
        )}
      </Stack>

      <Paper variant="outlined">
        {(stock.loading || obras.loading) && <LinearProgress aria-label="Cargando stock" />}
        {stock.error && stock.data && <Alert severity="error">{mensajeDeError(stock.error)}</Alert>}
        {contenido()}
      </Paper>
      <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
        {AYUDA_ESTADOS}
      </Typography>

      {puedeGestionar && obraId && (
        <FijarMinimoDialogo
          key={dialogo.abierto ? (dialogo.fila?.materialId ?? 'agregar') : 'cerrado'}
          abierto={dialogo.abierto}
          obraId={obraId}
          fila={dialogo.abierto ? dialogo.fila : undefined}
          yaEnObra={filas.map((f) => f.materialId)}
          alCerrar={() => setDialogo({ abierto: false })}
          alGuardar={(fila) => {
            setDialogo({ abierto: false });
            setAviso(`Mínimo de ${fila.nombre}: ${formatearCantidad(fila.minimo, fila.unidadPlural)}`);
          }}
        />
      )}

      <Snackbar
        open={!!aviso}
        autoHideDuration={4000}
        onClose={() => setAviso(undefined)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setAviso(undefined)}>
          {aviso}
        </Alert>
      </Snackbar>
    </>
  );
}

const SIN_FILAS: StockMaterial[] = [];
