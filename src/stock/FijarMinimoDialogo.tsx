import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { useMateriales, type Material } from '../catalogo/catalogo.graphql';
import { leerPrecio } from '../catalogo/material.esquema';
import { mensajeDeError } from '../nucleo/errores';
import { formatearCantidad } from '../nucleo/formato';
import { useDefinirMinimo, type StockMaterial } from './stock.graphql';

// Mínimo ≥ 0 (003, criterio 7). Se escribe con coma o punto decimal.
export const esquemaMinimo = z.object({
  materialId: z.string().min(1, 'Elige un material'),
  minimo: z
    .string()
    .trim()
    .min(1, { error: 'Obligatorio', abort: true })
    .refine((v) => Number.isFinite(leerPrecio(v)) && leerPrecio(v) >= 0, 'Debe ser un número mayor o igual a 0'),
});

interface Props {
  abierto: boolean;
  obraId: string;
  /** Fila a la que se le cambia el mínimo; sin ella se agrega un material del catálogo a la obra. */
  fila?: StockMaterial;
  /** Materiales que ya están en la obra (no se ofrecen al agregar). */
  yaEnObra: string[];
  alCerrar: () => void;
  alGuardar: (fila: StockMaterial) => void;
}

function primerError(errores: readonly unknown[]): string | undefined {
  const error = errores[0];
  if (!error) return undefined;
  return typeof error === 'string' ? error : (error as { message?: string }).message;
}

/** Busca materiales activos del catálogo mientras se escribe. */
function SelectorMaterial({
  valor,
  yaEnObra,
  error,
  alElegir,
}: {
  valor: Material | null;
  yaEnObra: string[];
  error?: string;
  alElegir: (material: Material | null) => void;
}) {
  const [texto, setTexto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  useEffect(() => {
    const espera = setTimeout(() => setBusqueda(texto.trim()), 300);
    return () => clearTimeout(espera);
  }, [texto]);
  const { pagina, loading } = useMateriales({ busqueda: busqueda || undefined, soloActivos: true, pagina: 1, tamano: 20 });
  const opciones = (pagina?.items ?? []).filter((m) => !yaEnObra.includes(m.id));

  return (
    <Autocomplete
      options={opciones}
      value={valor}
      loading={loading}
      filterOptions={(x) => x}
      getOptionLabel={(m) => `${m.codigo} · ${m.nombre}`}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      onChange={(_, material) => alElegir(material)}
      onInputChange={(_, nuevo, razon) => razon === 'input' && setTexto(nuevo)}
      noOptionsText="No hay materiales activos que coincidan"
      loadingText="Buscando…"
      renderInput={(params) => (
        <TextField {...params} label="Material" required error={!!error} helperText={error ?? 'Solo materiales activos'} />
      )}
    />
  );
}

// Diálogo para fijar el mínimo de un material en la obra o agregar un material del catálogo con su mínimo.
export function FijarMinimoDialogo({ abierto, obraId, fila, yaEnObra, alCerrar, alGuardar }: Props) {
  const [definir] = useDefinirMinimo();
  const [errorGeneral, setErrorGeneral] = useState<string>();
  const [elegido, setElegido] = useState<Material | null>(null);

  const formulario = useForm({
    defaultValues: { materialId: fila?.materialId ?? '', minimo: fila ? String(fila.minimo) : '' },
    validators: { onChange: esquemaMinimo },
    onSubmit: async ({ value }) => {
      setErrorGeneral(undefined);
      try {
        const { data } = await definir({
          variables: { obraId, materialId: value.materialId, minimo: leerPrecio(value.minimo) },
        });
        if (data) alGuardar(data.definirStockMinimo);
      } catch (error) {
        setErrorGeneral(mensajeDeError(error));
      }
    },
  });

  const titulo = fila ? `Fijar mínimo · ${fila.nombre}` : 'Agregar material a la obra';
  const unidad = fila?.unidadPlural ?? elegido?.unidadPlural;

  return (
    <Dialog open={abierto} onClose={alCerrar} fullWidth maxWidth="xs" aria-labelledby="titulo-minimo">
      <form
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault();
          void formulario.handleSubmit();
        }}
      >
        <DialogTitle id="titulo-minimo">{titulo}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {errorGeneral && <Alert severity="error">{errorGeneral}</Alert>}
            {fila ? (
              <Typography sx={{ color: 'text.secondary' }}>
                {fila.codigo} · stock actual {formatearCantidad(fila.cantidad, fila.unidadPlural)}
              </Typography>
            ) : (
              <formulario.Field
                name="materialId"
                children={(campo) => (
                  <SelectorMaterial
                    valor={elegido}
                    yaEnObra={yaEnObra}
                    error={primerError(campo.state.meta.errors)}
                    alElegir={(material) => {
                      setElegido(material);
                      campo.handleChange(material?.id ?? '');
                    }}
                  />
                )}
              />
            )}
            <formulario.Field
              name="minimo"
              children={(campo) => {
                const error = primerError(campo.state.meta.errors);
                return (
                  <TextField
                    label="Stock mínimo"
                    required
                    autoFocus={!!fila}
                    inputMode="decimal"
                    value={campo.state.value}
                    onChange={(e) => campo.handleChange(e.target.value)}
                    onBlur={campo.handleBlur}
                    error={!!error}
                    helperText={error ?? (fila ? undefined : 'El material queda en la obra con cantidad 0')}
                    slotProps={{
                      input: unidad ? { endAdornment: <InputAdornment position="end">{unidad}</InputAdornment> } : {},
                    }}
                  />
                );
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={alCerrar}>Cancelar</Button>
          <formulario.Subscribe
            selector={(estado) => estado.isSubmitting}
            children={(enviando) => (
              <Button type="submit" variant="contained" disabled={enviando}>
                {enviando ? 'Guardando…' : fila ? 'Fijar mínimo' : 'Agregar'}
              </Button>
            )}
          />
        </DialogActions>
      </form>
    </Dialog>
  );
}
