# ERP · Microfrontend Materiales: contratos

**Estado:** lo de abajo es lo conocido; las operaciones exactas se definen en el `diseno.md` de cada funcionalidad.

## Consume

- Gateway GraphQL: área materiales (catálogo, stock, consumos).
  - 003: consultas `materiales(busqueda, soloActivos, pagina, tamano)` (paginada, `MaterialesPagina`), `stockObra(obraId)` y `obras { id nombre }` (selector de obra; Obras filtra las que ve cada usuario); mutaciones `crearMaterial(entrada)`, `actualizarMaterial(id, entrada)` (activar y desactivar mandan el material completo con `activo`) y `definirStockMinimo(obraId, materialId, minimo)`. Errores por `extensions.codigo` con los textos de `docs/mensajes.md` (`nucleo/errores.ts`).
  - 502: consulta `ControlMateriales` con `hallazgos(agente: CONTROL_MATERIALES, obraId)` y `sugerencias(agente: CONTROL_MATERIALES, obraId, estado: PENDIENTE)` (panel «Control de materiales» del stock por obra; para `admin`, `gerente` y `residente`; el residente solo ve sus obras, lo aplica IA). Las dos son listas no nulas: si IA no responde, la consulta entera llega con `SERVICIO_NO_DISPONIBLE`. Mutaciones `aprobarSugerencia(id, comentario)` (`comentario` solo si se escribió) y `rechazarSugerencia(id, motivo)`; errores `SUGERENCIA_NO_ENCONTRADA`, `SUGERENCIA_YA_DECIDIDA`, `COMENTARIO_INVALIDO` (con `extensions.errores[]`) y `MOTIVO_INVALIDO`.
- Shell: sesión del usuario en `window.plataforma.sesion` (token con `obtenerToken()`; 104: `sesion.sinConexion` y, en ese modo, `obtenerToken()` rechaza con `Error('SIN_CONEXION')`).
  - 104: `window.plataforma.conexion` (`{ enLinea, reportarFallo() }` y el evento `plataforma:conexion` con `detail: { enLinea }`) y `window.plataforma.almacen` (`guardarConsulta`, `leerConsulta`; separado por usuario). Si no existen (microfrontend abierto solo), trabaja en línea y sin guardar nada.

## Expone

- Web Component cargado por Native Federation (`./Bootstrap` registra la etiqueta), montado por el shell en su ruta.
