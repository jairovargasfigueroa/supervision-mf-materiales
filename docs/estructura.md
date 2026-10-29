# ERP · Microfrontend Materiales: estructura y librerías

Obligatorio para todo el código de este proyecto. mf-supervision usa exactamente la misma estructura.

## Librerías

React 19, MUI 9 (`@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`, `@emotion/cache`), `@tanstack/react-router` 1 (rutas en código), `@tanstack/react-table` 9, `@tanstack/react-form` 1 + `zod` 4, `@apollo/client` 4 + `graphql` 16 (con `rxjs` 7, que Apollo 4 exige como dependencia par). Pruebas: Vitest + `@testing-library/react` + `jsdom`. Native Federation con el adaptador esbuild (`build.mjs`).

## Shadow DOM y tema

- `src/bootstrap.tsx` crea el Shadow DOM, un contenedor y `createCache({ key: 'mf', container: shadowRoot })`.
- `src/tema.ts`: `createTheme` con los valores de `docs/diseno-visual.md` (primario `#0E4D5C`, secundario `#F08A24`, éxito `#1B7343`, atención `#9A4A00`, error `#B42318`, fondo `#F2F5F6`, radio 10, Inter) y `defaultProps.container` de `MuiPopover`, `MuiPopper`, `MuiModal` y `MuiDialog` apuntando al contenedor del Shadow DOM.
- `ScopedCssBaseline` envuelve la app. No se cargan fuentes (las da el shell).

## Rutas

TanStack Router con `createBrowserHistory()` y `basepath: '/materiales'` (en mf-supervision, `/supervision`). El shell deja la ruta `/materiales/**` al microfrontend; el router interno maneja el resto. Para ir a otra área se usa `window.history.pushState` + `dispatchEvent(new PopStateEvent('popstate'))`.

## Árbol

```
src/
  bootstrap.tsx                # Web Component <mf-materiales>, Shadow DOM, CacheProvider, ThemeProvider
  App.tsx                      # ApolloProvider + RouterProvider
  tema.ts
  router.tsx                   # árbol de rutas (catalogo, stock, ordenes en capa 2)
  nucleo/
    sesion.ts                  # window.plataforma.sesion (obtenerToken, usuario, roles)
    configuracion.ts           # window.plataforma.configuracion.gatewayUrl (en desarrollo, http://localhost:4000/graphql)
    apollo.ts                  # cliente con SetContextLink que usa obtenerToken(); StockMaterial sin normalizar (no tiene id propio)
    errores.ts                 # extensions.codigo → mensaje
    formato.ts
  catalogo/
    CatalogoPagina.tsx, MaterialFormulario.tsx, material.esquema.ts (Zod), catalogo.graphql.ts
  stock/
    StockPagina.tsx, FijarMinimoDialogo.tsx, stock.graphql.ts, estado-stock.ts
  compartido/
    TablaDatos.tsx             # TanStack Table dibujada con Table de MUI (orden, búsqueda)
    EstadoChip.tsx, EstadoVacio.tsx, EstadoError.tsx
build.mjs, federation.config.js, vitest.config.ts, public/index.html
```

## Reglas

- Componentes de función con TypeScript estricto; un componente por archivo (`PascalCase.tsx`); lógica pura en `kebab-case.ts`.
- Formularios: `useForm` de TanStack Form con `validators: { onChange: esquemaZod }`; los mensajes de error en español vienen del esquema.
- Datos: `useQuery`/`useMutation` de Apollo en hooks por área (`useMateriales`, `useStockObra`).
- Acciones visibles según `usuario.roles` (función pura probada).

## Pruebas

Vitest + Testing Library (entorno `jsdom`, `vitest.config.ts`) para componentes y funciones puras: `npm test`. Cada prueba va junto a su archivo (`formato.test.ts`, `estados.test.tsx`).
