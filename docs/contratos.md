# ERP · Microfrontend Materiales: contratos

**Estado:** lo de abajo es lo conocido; las operaciones exactas se definen en el `diseno.md` de cada funcionalidad.

## Consume

- Gateway GraphQL: área materiales (catálogo, stock, consumos); en la capa 2, órdenes de compra de finanzas.
- Shell: sesión del usuario en `window.plataforma.sesion` (token con `obtenerToken()`).

## Expone

- Web Component cargado por Native Federation (`./Bootstrap` registra la etiqueta), montado por el shell en su ruta.
