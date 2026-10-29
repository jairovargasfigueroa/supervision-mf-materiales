# ERP · Microfrontend Materiales: contratos

**Estado:** lo de abajo es lo conocido; las operaciones exactas se definen en el `diseno.md` de cada funcionalidad.

## Consume

- Gateway GraphQL: área materiales (catálogo, stock, consumos); en la capa 2, órdenes de compra de finanzas.
  - 003: consultas `materiales(busqueda, soloActivos, pagina, tamano)` (paginada, `MaterialesPagina`), `stockObra(obraId)` y `obras { id nombre }` (selector de obra; Obras filtra las que ve cada usuario); mutaciones `crearMaterial(entrada)`, `actualizarMaterial(id, entrada)` (activar y desactivar mandan el material completo con `activo`) y `definirStockMinimo(obraId, materialId, minimo)`. Errores por `extensions.codigo` con los textos de `docs/mensajes.md` (`nucleo/errores.ts`).
- Shell: sesión del usuario en `window.plataforma.sesion` (token con `obtenerToken()`).

## Expone

- Web Component cargado por Native Federation (`./Bootstrap` registra la etiqueta), montado por el shell en su ruta.
