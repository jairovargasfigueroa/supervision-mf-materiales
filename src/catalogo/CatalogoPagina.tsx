import Paper from '@mui/material/Paper';
import { EstadoVacio } from '../compartido/EstadoVacio';

// Catálogo de materiales (003): la tabla y el formulario llegan en la siguiente tarea.
export function CatalogoPagina() {
  return (
    <Paper variant="outlined">
      <EstadoVacio texto="Catálogo de materiales" />
    </Paper>
  );
}
