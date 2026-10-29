import Paper from '@mui/material/Paper';
import { EstadoVacio } from '../compartido/EstadoVacio';

// Stock por obra (003): el selector de obra y la tabla llegan en su tarea.
export function StockPagina() {
  return (
    <Paper variant="outlined">
      <EstadoVacio texto="Stock por obra" />
    </Paper>
  );
}
