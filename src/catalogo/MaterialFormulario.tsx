import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { useForm } from '@tanstack/react-form';
import { codigoDeError, mensajeDeError } from '../nucleo/errores';
import { NOMBRE_TIPO, TIPOS_MATERIAL, useGuardarMaterial, type Material } from './catalogo.graphql';
import {
  entradaDesdeValores,
  esquemaMaterial,
  normalizarCodigo,
  valoresDesdeMaterial,
  VALORES_NUEVO,
} from './material.esquema';

interface Props {
  abierto: boolean;
  /** Material a editar; sin él, el formulario crea uno nuevo. */
  material?: Material;
  alCerrar: () => void;
  alGuardar: (material: Material) => void;
}

/** Primer mensaje de error de un campo (los errores del esquema Zod llegan como issues). */
function primerError(errores: readonly unknown[]): string | undefined {
  const error = errores[0];
  if (!error) return undefined;
  if (typeof error === 'string') return error;
  return (error as { message?: string }).message;
}

/** El error de un campo se muestra recién cuando la persona lo tocó o intentó guardar (que marca todos). */
function errorVisible(meta: { isTouched: boolean; errors: readonly unknown[] }): string | undefined {
  return meta.isTouched ? primerError(meta.errors) : undefined;
}

// Panel lateral para crear o editar un material (003): datos, precio y atributos como filas dinámicas.
export function MaterialFormulario({ abierto, material, alCerrar, alGuardar }: Props) {
  const { crear, actualizar } = useGuardarMaterial();
  const [errorGeneral, setErrorGeneral] = useState<string>();
  const [errorCodigo, setErrorCodigo] = useState<string>();

  const formulario = useForm({
    defaultValues: material ? valoresDesdeMaterial(material) : VALORES_NUEVO,
    validators: { onChange: esquemaMaterial },
    onSubmit: async ({ value }) => {
      setErrorGeneral(undefined);
      setErrorCodigo(undefined);
      const entrada = entradaDesdeValores(value, material?.activo);
      try {
        const guardado = material
          ? (await actualizar({ variables: { id: material.id, entrada } })).data?.actualizarMaterial
          : (await crear({ variables: { entrada } })).data?.crearMaterial;
        if (guardado) alGuardar(guardado);
      } catch (error) {
        const mensaje = mensajeDeError(error, { codigo: normalizarCodigo(value.codigo) });
        if (codigoDeError(error) === 'CODIGO_MATERIAL_REPETIDO') setErrorCodigo(mensaje);
        else setErrorGeneral(mensaje);
      }
    },
  });

  const titulo = material ? 'Editar material' : 'Nuevo material';

  return (
    <Drawer
      anchor="right"
      open={abierto}
      onClose={alCerrar}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 480 } } } }}
    >
      <Box
        component="form"
        noValidate
        aria-label={titulo}
        onSubmit={(evento) => {
          evento.preventDefault();
          void formulario.handleSubmit();
        }}
        sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      >
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 3, pt: 2, pb: 1 }}>
          <Typography variant="h2" component="h2">
            {titulo}
          </Typography>
          <IconButton aria-label="Cerrar" onClick={alCerrar}>
            <CloseIcon />
          </IconButton>
        </Stack>

        <Stack spacing={2} sx={{ px: 3, py: 1, overflowY: 'auto', flex: 1 }}>
          {errorGeneral && <Alert severity="error">{errorGeneral}</Alert>}

          <formulario.Field
            name="codigo"
            listeners={{ onChange: () => setErrorCodigo(undefined) }}
            children={(campo) => {
              const error = errorCodigo ?? errorVisible(campo.state.meta);
              return (
                <TextField
                  label="Código"
                  required
                  value={campo.state.value}
                  onChange={(e) => campo.handleChange(e.target.value)}
                  onBlur={campo.handleBlur}
                  error={!!error}
                  helperText={error ?? 'Se guarda en mayúsculas, por ejemplo CEM-IP30'}
                  slotProps={{ htmlInput: { maxLength: 20 } }}
                />
              );
            }}
          />

          <formulario.Field
            name="nombre"
            children={(campo) => {
              const error = errorVisible(campo.state.meta);
              return (
                <TextField
                  label="Nombre"
                  required
                  value={campo.state.value}
                  onChange={(e) => campo.handleChange(e.target.value)}
                  onBlur={campo.handleBlur}
                  error={!!error}
                  helperText={error}
                  slotProps={{ htmlInput: { maxLength: 120 } }}
                />
              );
            }}
          />

          <formulario.Field
            name="tipo"
            children={(campo) => (
              <TextField
                select
                label="Tipo"
                required
                value={campo.state.value}
                onChange={(e) => campo.handleChange(e.target.value as typeof campo.state.value)}
                onBlur={campo.handleBlur}
              >
                {TIPOS_MATERIAL.map((tipo) => (
                  <MenuItem key={tipo} value={tipo}>
                    {NOMBRE_TIPO[tipo]}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          <Stack direction="row" spacing={2}>
            <formulario.Field
              name="unidad"
              children={(campo) => {
                const error = errorVisible(campo.state.meta);
                return (
                  <TextField
                    label="Unidad"
                    required
                    fullWidth
                    placeholder="bolsa"
                    value={campo.state.value}
                    onChange={(e) => campo.handleChange(e.target.value)}
                    onBlur={campo.handleBlur}
                    error={!!error}
                    helperText={error}
                  />
                );
              }}
            />
            <formulario.Field
              name="unidadPlural"
              children={(campo) => {
                const error = errorVisible(campo.state.meta);
                return (
                  <TextField
                    label="Unidad en plural"
                    required
                    fullWidth
                    placeholder="bolsas"
                    value={campo.state.value}
                    onChange={(e) => campo.handleChange(e.target.value)}
                    onBlur={campo.handleBlur}
                    error={!!error}
                    helperText={error}
                  />
                );
              }}
            />
          </Stack>

          <formulario.Field
            name="precioReferencial"
            children={(campo) => {
              const error = errorVisible(campo.state.meta);
              return (
                <TextField
                  label="Precio referencial"
                  required
                  inputMode="decimal"
                  value={campo.state.value}
                  onChange={(e) => campo.handleChange(e.target.value)}
                  onBlur={campo.handleBlur}
                  error={!!error}
                  helperText={error ?? 'Por unidad'}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start">Bs</InputAdornment> } }}
                />
              );
            }}
          />

          <formulario.Field
            name="atributos"
            mode="array"
            children={(lista) => (
              <Box component="fieldset" sx={{ border: 0, p: 0, m: 0 }}>
                <Typography component="legend" variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Atributos
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                  Opcionales, por ejemplo «resistencia: 210 kg/cm²».
                </Typography>
                <Stack spacing={1}>
                  {lista.state.value.map((_, i) => (
                    <Stack key={i} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                      <formulario.Field
                        name={`atributos[${i}].nombre`}
                        children={(campo) => {
                          const error = errorVisible(campo.state.meta);
                          return (
                            <TextField
                              size="small"
                              label="Nombre"
                              sx={{ flex: 1 }}
                              value={campo.state.value}
                              onChange={(e) => campo.handleChange(e.target.value)}
                              onBlur={campo.handleBlur}
                              error={!!error}
                              helperText={error}
                              slotProps={{ htmlInput: { 'aria-label': `Nombre del atributo ${i + 1}` } }}
                            />
                          );
                        }}
                      />
                      <formulario.Field
                        name={`atributos[${i}].valor`}
                        children={(campo) => {
                          const error = errorVisible(campo.state.meta);
                          return (
                            <TextField
                              size="small"
                              label="Valor"
                              sx={{ flex: 2 }}
                              value={campo.state.value}
                              onChange={(e) => campo.handleChange(e.target.value)}
                              onBlur={campo.handleBlur}
                              error={!!error}
                              helperText={error}
                              slotProps={{ htmlInput: { 'aria-label': `Valor del atributo ${i + 1}` } }}
                            />
                          );
                        }}
                      />
                      <IconButton aria-label={`Quitar atributo ${i + 1}`} onClick={() => lista.removeValue(i)}>
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>
                <Button
                  startIcon={<AddIcon />}
                  sx={{ mt: 1 }}
                  onClick={() => lista.pushValue({ nombre: '', valor: '' })}
                >
                  Agregar atributo
                </Button>
              </Box>
            )}
          />
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          sx={{ justifyContent: 'flex-end', px: 3, py: 2, borderTop: 1, borderColor: 'divider' }}
        >
          <Button onClick={alCerrar}>Cancelar</Button>
          <formulario.Subscribe
            selector={(estado) => estado.isSubmitting}
            children={(enviando) => (
              <Button type="submit" variant="contained" disabled={enviando}>
                {enviando ? 'Guardando…' : 'Guardar material'}
              </Button>
            )}
          />
        </Stack>
      </Box>
    </Drawer>
  );
}
