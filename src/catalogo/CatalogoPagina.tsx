import { useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TablePagination from '@mui/material/TablePagination';
import TextField from '@mui/material/TextField';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { AvisoSinConexion } from '../compartido/AvisoSinConexion';
import { EstadoChip } from '../compartido/EstadoChip';
import { EstadoError } from '../compartido/EstadoError';
import { EstadoVacio } from '../compartido/EstadoVacio';
import { ayudanteColumnas, TablaDatos } from '../compartido/TablaDatos';
import { mensajeDeError } from '../nucleo/errores';
import { formatearMonto } from '../nucleo/formato';
import { usePuedeGestionarMateriales } from '../nucleo/permisos';
import {
  entradaDesdeMaterial,
  NOMBRE_TIPO,
  useGuardarMaterial,
  useMateriales,
  type Material,
} from './catalogo.graphql';
import { MaterialFormulario } from './MaterialFormulario';

const columna = ayudanteColumnas<Material>();

/** Espera a que el usuario deje de escribir antes de buscar. */
function useRetrasado<T>(valor: T, ms: number): T {
  const [retrasado, setRetrasado] = useState(valor);
  useEffect(() => {
    const espera = setTimeout(() => setRetrasado(valor), ms);
    return () => clearTimeout(espera);
  }, [valor, ms]);
  return retrasado;
}

type Formulario = { abierto: false } | { abierto: true; material?: Material };

// Catálogo de materiales (003, criterios 1 a 5): lista con búsqueda por código o nombre; administración
// crea, edita, activa y desactiva.
export function CatalogoPagina() {
  const [texto, setTexto] = useState('');
  const busqueda = useRetrasado(texto.trim(), 300);
  const [pagina, setPagina] = useState(0);
  const [tamano, setTamano] = useState(20);
  const [formulario, setFormulario] = useState<Formulario>({ abierto: false });
  const [porDesactivar, setPorDesactivar] = useState<Material>();
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean }>();

  const puedeGestionar = usePuedeGestionarMateriales();
  const consulta = useMateriales({ busqueda: busqueda || undefined, pagina: pagina + 1, tamano });
  const { actualizar } = useGuardarMaterial();

  // Una búsqueda nueva vuelve a la primera página
  useEffect(() => setPagina(0), [busqueda]);

  const cambiarActivo = async (material: Material, activo: boolean) => {
    setPorDesactivar(undefined);
    try {
      await actualizar({ variables: { id: material.id, entrada: entradaDesdeMaterial(material, { activo }) } });
      setAviso({ texto: activo ? `${material.nombre} activado` : `${material.nombre} desactivado` });
    } catch (error) {
      setAviso({ texto: mensajeDeError(error, { codigo: material.codigo }), error: true });
    }
  };

  const columnas = useMemo(
    () => [
      columna.accessor('codigo', { header: 'Código', sortFn: 'alphanumeric' }),
      columna.accessor('nombre', { header: 'Nombre', sortFn: 'text' }),
      columna.accessor('tipo', { header: 'Tipo', cell: (c) => NOMBRE_TIPO[c.getValue()] }),
      columna.accessor('unidad', { header: 'Unidad', enableSorting: false }),
      columna.accessor('precioReferencial', {
        header: 'Precio referencial',
        sortFn: 'basic',
        meta: { numerica: true },
        cell: (c) => formatearMonto(c.getValue()),
      }),
      columna.accessor('activo', {
        header: 'Estado',
        enableSorting: false,
        cell: (c) => (
          <EstadoChip etiqueta={c.getValue() ? 'Activo' : 'Inactivo'} tono={c.getValue() ? 'exito' : 'neutro'} />
        ),
      }),
      // Solo admin ve las acciones de escritura (criterio 2)
      ...(!puedeGestionar
        ? []
        : [
            columna.display({
              id: 'acciones',
              header: 'Acciones',
              cell: ({ row }) => {
                const material = row.original;
                return (
                  <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                    <Button size="small" onClick={() => setFormulario({ abierto: true, material })}>
                      Editar
                    </Button>
                    {material.activo ? (
                      <Button size="small" color="error" onClick={() => setPorDesactivar(material)}>
                        Desactivar
                      </Button>
                    ) : (
                      <Button size="small" onClick={() => void cambiarActivo(material, true)}>
                        Activar
                      </Button>
                    )}
                  </Stack>
                );
              },
            }),
          ]),
    ],
    // cambiarActivo solo usa setters y la función de la mutación, que son estables
    [puedeGestionar],
  );

  const items = consulta.pagina?.items ?? SIN_MATERIALES;

  return (
    <>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 2, justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <TextField
          size="small"
          placeholder="Buscar por código o nombre"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          sx={{ width: { xs: '100%', sm: 320 } }}
          slotProps={{
            htmlInput: { 'aria-label': 'Buscar por código o nombre' },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        {puedeGestionar && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormulario({ abierto: true })}>
            Nuevo material
          </Button>
        )}
      </Stack>

      <Paper variant="outlined">
        {consulta.loading && <LinearProgress aria-label="Cargando materiales" />}
        {/* 104: datos del equipo con su fecha, o que esta búsqueda nunca se guardó */}
        <AvisoSinConexion consulta={consulta} />
        {consulta.sinDatosGuardados ? null : consulta.error && !consulta.pagina ? (
          <EstadoError alReintentar={() => void consulta.refetch()} />
        ) : (
          <>
            {consulta.error && <Alert severity="error">{mensajeDeError(consulta.error)}</Alert>}
            <TablaDatos
              etiqueta="Catálogo de materiales"
              columnas={columnas}
              filas={items}
              idFila={(m) => m.id}
              vacio={
                consulta.pagina && (
                  <EstadoVacio
                    texto={busqueda ? `No hay materiales que coincidan con «${busqueda}».` : 'Aún no hay materiales.'}
                  />
                )
              }
            />
            {consulta.pagina && consulta.pagina.total > 0 && (
              <TablePagination
                component="div"
                count={consulta.pagina.total}
                page={pagina}
                rowsPerPage={tamano}
                rowsPerPageOptions={[10, 20, 50, 100]}
                onPageChange={(_, nueva) => setPagina(nueva)}
                onRowsPerPageChange={(e) => {
                  setTamano(Number(e.target.value));
                  setPagina(0);
                }}
                labelRowsPerPage="Por página"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
              />
            )}
          </>
        )}
      </Paper>

      {puedeGestionar && (
        <MaterialFormulario
          key={formulario.abierto ? (formulario.material?.id ?? 'nuevo') : 'cerrado'}
          abierto={formulario.abierto}
          material={formulario.abierto ? formulario.material : undefined}
          alCerrar={() => setFormulario({ abierto: false })}
          alGuardar={(material) => {
            setFormulario({ abierto: false });
            setAviso({ texto: `Material ${material.codigo} guardado` });
          }}
        />
      )}

      <Dialog open={!!porDesactivar} onClose={() => setPorDesactivar(undefined)} aria-labelledby="titulo-desactivar">
        <DialogTitle id="titulo-desactivar">Desactivar {porDesactivar?.nombre}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            No se borra: deja de aparecer para nuevos insumos y movimientos, pero sigue en el historial.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPorDesactivar(undefined)}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => porDesactivar && void cambiarActivo(porDesactivar, false)}
          >
            Desactivar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!aviso}
        autoHideDuration={4000}
        onClose={() => setAviso(undefined)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={aviso?.error ? 'error' : 'success'} onClose={() => setAviso(undefined)} variant="filled">
          {aviso?.texto}
        </Alert>
      </Snackbar>
    </>
  );
}

const SIN_MATERIALES: Material[] = [];
