# ERP · Microfrontend Materiales

Microfrontend del ERP para materiales: catálogo, stock mínimo, stock por obra y consumos frente a lo previsto.

Parte de la «Plataforma de supervisión de obras». Si existe `../../CLAUDE.md` (carpeta que agrupa todos los proyectos), léelo primero: tiene las reglas transversales, el plan y los contratos generales.

**Estado:** Native Federation configurado, tema MUI dentro del Shadow DOM, `formato.ts`, estados vacío y error, y lectura de la sesión del shell (`nucleo/sesion.ts`, `nucleo/configuracion.ts`; sin shell muestra «Abre esta pantalla desde el ERP») (fase 1); sin pantallas del negocio. No implementes una funcionalidad sin su especificación aprobada en `docs/specs/`.

## Stack

- Node 24 · React 19 · TypeScript 6
- Native Federation 4 con el **adaptador esbuild** (`@softarc/native-federation` 4.7 + `@softarc/native-federation-esbuild` 4.2) y su preset oficial de React
- Previsto: Apollo Client 4 (GraphQL hacia el gateway)
- Puerto: `4202` (`PORT`)

## Comandos

```sh
npm install
npm start            # recompila al guardar y sirve en http://localhost:4202 (recargar el navegador a mano)
npm run build        # genera dist/ con remoteEntry.json
npm run typecheck
npm test             # Vitest
```

`http://localhost:4202` abre `public/index.html`, una página para probar el microfrontend sin el shell.

## Cómo se integra

- `src/bootstrap.tsx` registra el Web Component `<mf-materiales>` (con Shadow DOM) y monta React dentro.
- `federation.config.js` expone `./Bootstrap`; el shell lo carga y luego usa la etiqueta `<mf-materiales>`.
- `build.mjs` compila con `runEsBuildBuilder` y, con `--dev`, sirve `dist/` y `public/` con CORS abierto para el shell.
- Los estilos van dentro del Shadow DOM; no se cargan hojas globales.

## Estructura prevista

```
src/
  bootstrap.tsx   Web Component (no tocar salvo para pasar propiedades del shell)
  App.tsx
  catalogo/       lista y edición de materiales
  stock/          stock por obra y estado (bajo, justo, ok)
  consumos/       usado frente a previsto por partida
  shared/
```

## Reglas del proyecto

- Solo habla con el gateway GraphQL.
- Recibe la sesión del shell; no inicia sesión por su cuenta.
- Debe poder levantarse solo para desarrollo.

## Documentación

- `docs/estructura.md`: **librerías permitidas y estructura exacta de carpetas y archivos. Obligatorio leerlo antes de escribir código.**
- `docs/app.md`: pantallas y qué no hace.
- `docs/contratos.md`: qué consume y qué expone.
- `docs/specs/`: especificaciones por funcionalidad (`requisitos.md`, `diseno.md`, `tareas.md`).

## Commits

Conventional Commits en español e imperativo (`feat(stock): agrega tabla de stock por obra`). Sin coautoría ni firmas de la IA.

Git Flow: ramas `feat/`, `fix/`, `docs/`… desde `develop`, que entran por *pull request*; nunca hagas *push* a `main` ni a `develop` (están protegidas). El agente crea y fusiona los PR (merge normal, sin squash) hacia `develop` cuando todas las pruebas pasan. Detalle y definición de terminado: `docs/flujo-trabajo.md` del repo `supervision-docs`.
