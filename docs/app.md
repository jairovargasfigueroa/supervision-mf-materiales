# ERP · Microfrontend Materiales: qué hace

## Pantallas

| Pantalla | Quién | Caso de uso | Etapa |
|---|---|---|---|
| Catálogo de materiales (lista y búsqueda) | Administración, residente, gerente | Gestionar materiales | Base |
| Catálogo: alta, edición, activar o desactivar | Administración | Gestionar materiales | Base |
| Stock por obra (estado bajo, justo, ok) | Administración, residente (sus obras), gerente | Gestionar materiales | Base |
| Stock mínimo por obra («Fijar mínimo», «Agregar material») | Administración | Gestionar materiales | Base |
| Panel «Control de materiales» (hallazgos y sugerencias del agente) | Administración, residente (sus obras), gerente | Agentes | Capa 5 |

La comparación «usado frente a previsto» por partida no está aquí: es la pestaña «Material» del detalle de obra, en mf-obras (006).

Sin conexión (104): el catálogo y el stock por obra muestran la última respuesta guardada en el equipo con «Sin conexión · datos del dd/mm/aaaa hh:mm» (o «No hay datos guardados de esta pantalla»), y las acciones de escritura quedan deshabilitadas con «Requiere conexión».

Referencia visual: el prototipo HTML de la carpeta general.

## Qué no hace

- No registra ingresos ni salidas (eso se hace desde la app de obra).
