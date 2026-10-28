# ERP · Microfrontend Materiales: qué hace

## Pantallas

| Pantalla | Quién | Caso de uso | Etapa |
|---|---|---|---|
| Catálogo de materiales (lista y búsqueda) | Administración, residente, gerente | Gestionar materiales | Base |
| Catálogo: alta, edición, activar o desactivar (y proveedor habitual, capa 2) | Administración | Gestionar materiales | Base |
| Stock por obra (estado bajo, justo, ok) | Administración, residente (sus obras), gerente | Gestionar materiales | Base |
| Stock mínimo por obra («Fijar mínimo», «Agregar material») | Administración | Gestionar materiales | Base |
| Órdenes de compra generadas (solo lectura) | Administración, gerente | Automatización | Capa 2 |
| Panel «Control de materiales» (hallazgos y sugerencias del agente) | Administración, residente (sus obras), gerente | Agentes | Capa 5 |

La comparación «usado frente a previsto» por partida no está aquí: es la pestaña «Material» del detalle de obra, en mf-obras (006).

Referencia visual: el prototipo HTML de la carpeta general.

## Qué no hace

- No registra ingresos ni salidas (eso se hace desde la app de obra).
