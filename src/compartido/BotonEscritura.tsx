import Box from '@mui/material/Box';
import Button, { type ButtonProps } from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import { useEnLinea } from '../nucleo/conexion';

export const TEXTO_REQUIERE_CONEXION = 'Requiere conexión';

// Botón de una acción que escribe en el gateway (104, criterio 9): sin conexión queda deshabilitado con la
// ayuda «Requiere conexión» y se vuelve a habilitar solo cuando el shell avisa que volvió la conexión.
export function BotonEscritura({ disabled, ...props }: ButtonProps) {
  const enLinea = useEnLinea();
  const boton = <Button {...props} disabled={disabled || !enLinea} />;
  if (enLinea) return boton;
  // Un botón deshabilitado no recibe el puntero: la ayuda va en un contenedor
  return (
    <Tooltip title={TEXTO_REQUIERE_CONEXION}>
      <Box component="span" sx={{ display: 'inline-flex' }}>
        {boton}
      </Box>
    </Tooltip>
  );
}
