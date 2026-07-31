## Context and evidence

Fecha de verificación: 2026-07-30. El backend coordinado está en `../backend/openspec/changes/add-automatic-product-sku/`. Su change define la propuesta y la creación automática, pero la ruta todavía no aparece en `../backend/internal/bootstrap/router.go` ni en `../backend/internal/catalog/transport/http/routes.go`.

## Estado actual

El frontend no puede consumir de forma verificable el endpoint hasta que el change backend se implemente y despliegue. No se debe mockear la ruta ni generar el SKU en el navegador; mientras tanto, el alta manual existente debe seguir siendo válida.

## Contrato mínimo necesario

- Método y path: `GET /api/v1/products/sku-suggestion?category_id={id}`.
- Autenticación: usuario autenticado que pueda consultar categorías/productos; no amplía permisos de creación.
- Respuesta `200`: `{ "sku": "SKU-123" }`.
- Formato: `SKU-` seguido de tres cifras entre `001` y `999`; la categoría no forma parte del SKU.
- Errores mínimos: `401` sesión inválida, `403` si corresponde al control de acceso, `422` categoría inexistente y `409` espacio agotado/conflicto, con el mensaje backend consumible por la UI.
- Compatibilidad de creación: `POST /api/v1/products` debe aceptar el flujo coordinado y devolver el producto creado con el SKU efectivo; los SKU explícitos continúan siendo válidos.

## Inconsistencia a resolver en coordinación

El design y spec del change backend contienen ejemplos textuales que mencionan un prefijo de categoría (`ABC001` o `<three-letter-prefix><three-digit-number>`), mientras que el requerimiento frontend aprobado exige exclusivamente `SKU-001`…`SKU-999` y la categoría fuera del SKU. Antes de implementar, el backend debe confirmar y publicar el contrato fijo `SKU-` más tres cifras.

## Rollout y desbloqueo

1. Implementar y desplegar el endpoint y la compatibilidad de creación del change backend.
2. Verificar contra backend real método, autenticación, response shape, formato y statuses `401/403/409/422`.
3. Desbloquear la implementación frontend sólo cuando esa verificación pase; conservar el fallback manual durante el rollout.

## Fuera de alcance

Este pedido no modifica el backend, no define una nueva regla de unicidad y no solicita cambios de esquema.
