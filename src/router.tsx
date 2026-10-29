import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import {
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
  useLocation,
  useNavigate,
  type RouterHistory,
} from '@tanstack/react-router';
import { CatalogoPagina } from './catalogo/CatalogoPagina';
import { EstadoVacio } from './compartido/EstadoVacio';
import { StockPagina } from './stock/StockPagina';

// Rutas internas del microfrontend (docs/estructura.md, «Rutas»). El shell deja /materiales/** a este
// microfrontend; el router usa basepath /materiales: /materiales/catalogo y /materiales/stock.

export const SECCIONES = [
  { ruta: '/catalogo', etiqueta: 'Catálogo' },
  { ruta: '/stock', etiqueta: 'Stock por obra' },
] as const;

function Area() {
  const { pathname } = useLocation();
  const navegar = useNavigate();
  const actual = SECCIONES.find((s) => pathname === s.ruta || pathname.startsWith(`${s.ruta}/`))?.ruta ?? false;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h1" sx={{ mb: 1 }}>
        Materiales
      </Typography>
      <Tabs
        value={actual}
        onChange={(_, ruta: string) => void navegar({ to: ruta })}
        aria-label="Secciones de materiales"
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        {SECCIONES.map((s) => (
          <Tab key={s.ruta} value={s.ruta} label={s.etiqueta} />
        ))}
      </Tabs>
      <Outlet />
    </Box>
  );
}

function NoEncontrada() {
  const navegar = useNavigate();
  return (
    <Paper variant="outlined">
      <EstadoVacio
        texto="No encontramos lo que buscas. Puede que ya no exista o que no tengas acceso."
        accion={{ etiqueta: 'Ir al catálogo', alPulsar: () => void navegar({ to: '/catalogo' }) }}
      />
    </Paper>
  );
}

const raiz = createRootRoute({ component: Area, notFoundComponent: NoEncontrada });

// /materiales lleva al catálogo
const inicio = createRoute({
  getParentRoute: () => raiz,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/catalogo', replace: true });
  },
});
const catalogo = createRoute({ getParentRoute: () => raiz, path: '/catalogo', component: CatalogoPagina });
const stock = createRoute({ getParentRoute: () => raiz, path: '/stock', component: StockPagina });

const arbol = raiz.addChildren([inicio, catalogo, stock]);

/** Crea el router del área; en pruebas recibe un historial en memoria. */
export function crearRouter(historial: RouterHistory = createBrowserHistory()) {
  return createRouter({ routeTree: arbol, history: historial, basepath: '/materiales' });
}

export type RouterMateriales = ReturnType<typeof crearRouter>;

declare module '@tanstack/react-router' {
  interface Register {
    router: RouterMateriales;
  }
}
