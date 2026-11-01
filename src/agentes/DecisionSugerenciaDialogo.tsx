import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useForm } from '@tanstack/react-form';
import { BotonEscritura } from '../compartido/BotonEscritura';
import { codigoDeError, erroresDeCampo, mensajeDeError } from '../nucleo/errores';
import {
  COMENTARIO_MAXIMO,
  MOTIVO_MAXIMO,
  MOTIVO_MINIMO,
  useAprobarSugerencia,
  useRechazarSugerencia,
  type Sugerencia,
} from './agentes.graphql';
import { esquemaAprobar, esquemaRechazar } from './decision.esquema';

// Diálogos para decidir una sugerencia del agente de materiales (502, criterios 12 a 14): aprobar con un comentario
// opcional o rechazar con un motivo obligatorio y contador de caracteres. Aprobar solo registra la decisión.

export type ModoDecision = 'aprobar' | 'rechazar';

/** Códigos tras los que la lista ya no refleja la sugerencia (otra persona la decidió o ya no se ve): se recarga. */
const RECARGAR_CON = ['SUGERENCIA_YA_DECIDIDA', 'SUGERENCIA_NO_ENCONTRADA'];

interface Props {
  sugerencia: Sugerencia;
  modo: ModoDecision;
  alCerrar: () => void;
  /** La decisión quedó registrada (o la lista quedó desactualizada): hay que recargar el panel. */
  alDecidir: () => void;
}

function primerError(errores: readonly unknown[]): string | undefined {
  const error = errores[0];
  if (!error) return undefined;
  return typeof error === 'string' ? error : (error as { message?: string }).message;
}

export function DecisionSugerenciaDialogo({ sugerencia, modo, alCerrar, alDecidir }: Props) {
  const [aprobar] = useAprobarSugerencia();
  const [rechazar] = useRechazarSugerencia();
  const [error, setError] = useState<unknown>();
  const rechazo = modo === 'rechazar';
  const campo = rechazo ? 'motivo' : 'comentario';

  const formulario = useForm({
    defaultValues: { texto: '' },
    validators: { onChange: rechazo ? esquemaRechazar : esquemaAprobar },
    onSubmit: async ({ value }) => {
      setError(undefined);
      const texto = value.texto.trim();
      try {
        if (rechazo) await rechazar({ variables: { id: sugerencia.id, motivo: texto } });
        else await aprobar({ variables: { id: sugerencia.id, ...(texto && { comentario: texto }) } });
        alDecidir();
        alCerrar();
      } catch (e) {
        setError(e);
        if (RECARGAR_CON.includes(codigoDeError(e) ?? '')) alDecidir();
      }
    },
  });

  const errorServidor = erroresDeCampo(error).find((e) => e.campo === campo)?.mensaje;
  const titulo = rechazo ? 'Rechazar sugerencia' : 'Aprobar sugerencia';

  return (
    <formulario.Subscribe
      selector={(estado) => estado.isSubmitting}
      children={(enviando) => (
        <Dialog
          open
          onClose={enviando ? undefined : alCerrar}
          fullWidth
          maxWidth="sm"
          aria-labelledby="titulo-decision"
        >
          <form
            noValidate
            onSubmit={(evento) => {
              evento.preventDefault();
              void formulario.handleSubmit();
            }}
          >
            <DialogTitle id="titulo-decision">{titulo}</DialogTitle>
            <DialogContent>
              <Stack spacing={1.5} sx={{ pt: 1 }}>
                <Typography sx={{ fontWeight: 600 }}>{sugerencia.accionTexto}</Typography>
                <Typography variant="body2">{sugerencia.descripcion}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {rechazo
                    ? 'Escribe por qué no corresponde esta sugerencia.'
                    : 'Aprobar solo registra tu decisión: no se crea ni se envía nada en otra área.'}
                </Typography>
                {error !== undefined && <Alert severity="error">{mensajeDeError(error)}</Alert>}
                <formulario.Field
                  name="texto"
                  children={(c) => {
                    const largo = c.state.value.trim().length;
                    const errorLocal = largo > 0 || c.state.meta.isTouched ? primerError(c.state.meta.errors) : undefined;
                    const mensaje = errorServidor ?? errorLocal;
                    const contador = rechazo
                      ? `${largo} / ${MOTIVO_MAXIMO} (mínimo ${MOTIVO_MINIMO})`
                      : `${largo} / ${COMENTARIO_MAXIMO}`;
                    return (
                      <TextField
                        label={rechazo ? 'Motivo' : 'Comentario (opcional)'}
                        required={rechazo}
                        multiline
                        minRows={3}
                        fullWidth
                        autoFocus
                        value={c.state.value}
                        onChange={(e) => c.handleChange(e.target.value)}
                        onBlur={c.handleBlur}
                        error={!!mensaje}
                        helperText={mensaje ? `${mensaje} · ${contador}` : contador}
                      />
                    );
                  }}
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={alCerrar} disabled={enviando}>
                Cancelar
              </Button>
              <BotonEscritura type="submit" variant="contained" color={rechazo ? 'error' : 'primary'} disabled={enviando}>
                {rechazo ? 'Rechazar' : 'Aprobar'}
              </BotonEscritura>
            </DialogActions>
          </form>
        </Dialog>
      )}
    />
  );
}
