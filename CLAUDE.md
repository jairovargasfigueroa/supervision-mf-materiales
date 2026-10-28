# ERP · Microfrontend Materiales

Microfrontend del ERP para materiales: catálogo, stock mínimo, stock por obra y consumos frente a lo previsto.

Parte de la «Plataforma de supervisión de obras». Si existe `../../CLAUDE.md` (carpeta que agrupa todos los proyectos), léelo primero: tiene las reglas transversales, el plan y los contratos generales.

**Estado:** solo documentación. El proyecto del framework todavía no se generó (tarea de la fase 1 del plan general). No implementes una funcionalidad sin su especificación aprobada en `docs/specs/`.

## Stack

- React · expuesto por Module Federation
- Cliente GraphQL hacia el gateway

## Comandos

Se completan al generar el proyecto.

## Estructura prevista

```
src/
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

- `docs/app.md`: qué hace, pantallas o responsabilidades, y qué no hace.
- `docs/contratos.md`: qué consume y qué expone.
- `docs/specs/`: especificaciones por funcionalidad (`requisitos.md`, `diseno.md`, `tareas.md`).

## Commits

Conventional Commits en español e imperativo (`feat(alcance): descripción`). Sin coautoría ni firmas de la IA.
