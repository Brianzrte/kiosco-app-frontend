# Solicitud de contrato backend: traducir el texto de `explanation` en sugerencias de reposición

Actualizado: 2026-07-30. Este documento reporta un defecto de contenido detectado durante la verificación manual de este change; **no bloquea ninguna tarea de `tasks.md`** de `add-frontend-purchasing-supplier-item-association` — el frontend ya muestra el campo `explanation` tal cual lo devuelve el backend, sin traducirlo ni reescribirlo, y seguirá funcionando igual una vez que backend corrija el texto.

## Contexto y necesidad de usuario

Al abrir `/purchasing/new`, la sección "Sugerencias de reposición" muestra, para cada producto, el texto de `explanation` devuelto por `GET /purchase-orders/suggestions`. El resto de la aplicación (validaciones, errores, copy de UI) está en español; estos dos textos están en inglés, lo cual es inconsistente y confunde a la persona usuaria (captura de pantalla adjunta al pedido original: "proposal covers the greater of minimum stock and sales volume for the configured replenishment frequency" y "missing preferred active supplier").

## Evidencia consultada (2026-07-30)

- `../backend/internal/purchasing/infrastructure/postgres_replenishment_suggestions.go:31-33`: la consulta SQL hardcodea el `CASE` de `explanation` en inglés:
  ```sql
  CASE WHEN ps.supplier_id IS NULL THEN 'missing preferred active supplier'
       ...
       ELSE 'proposal covers the greater of minimum stock and sales volume for the configured replenishment frequency' END
  ```
- Contraste con el resto del backend, que ya usa mensajes en español para el usuario final: `../backend/internal/shared/apperror/public_message.go` (p. ej. "Revisá los datos ingresados e intentá nuevamente.") y `../backend/internal/purchasing/transport/http/handler.go` (`decodeAndValidate`, mensajes en español).

## Estado actual verificado

- `GET /purchase-orders/suggestions` devuelve `explanation` en inglés en los dos casos posibles (dato incompleto por falta de proveedor preferido activo, y sugerencia calculada normalmente); no hay ningún caso en que el campo llegue en español.
- El frontend (`PurchaseOrderForm.tsx`, ambos changes `add-frontend-purchasing-supplier-item-association` y su predecesor `add-frontend-suppliers-purchasing`) muestra `explanation` literalmente, sin transformarlo: es el comportamiento correcto y esperado de un campo que el backend documenta como texto ya listo para mostrar.

## Contrato mínimo solicitado

Traducir al español los dos textos fijos de `explanation` en `postgres_replenishment_suggestions.go`, manteniendo el mismo criterio de negocio (mismo `CASE WHEN`, sólo cambia el literal). Sugerido (ajustable por backend, el frontend no impone el copy exacto):

- `'missing preferred active supplier'` → algo como `'falta un proveedor preferido activo'`.
- `'proposal covers the greater of minimum stock and sales volume for the configured replenishment frequency'` → algo como `'la sugerencia cubre el mayor valor entre el stock mínimo y el volumen de ventas para la frecuencia de reposición configurada'`.

No se solicita ningún cambio de forma, tipo ni de los demás campos de `ReplenishmentSuggestion` (`product_id`, `product_name`, `supplier_id`, `suggested_quantity`).

## Roles y errores

Sin cambios: `GET /purchase-orders/suggestions` sigue siendo Admin/Inventory (`creationWrapped`); no se solicita ningún cambio de status code ni de envelope de error.

## Compatibilidad y rollout

Cambio de contenido puro, sin cambio de forma del contrato: el frontend no necesita ningún ajuste para consumir el texto corregido, en cualquiera de los dos changes de purchasing (implementado o pendiente). Backend puede desplegar este cambio de forma independiente, sin coordinación de versión con el frontend.

## Impacto y bloqueo en el frontend

Ninguno. Es un reporte de defecto de contenido, no una dependencia bloqueante: `add-frontend-purchasing-supplier-item-association` ya está implementado y funcional mostrando el texto tal cual llega hoy.

## Criterio de desbloqueo frontend

No aplica — no hay tarea de frontend esperando este cambio.

## Fuera de alcance

- Cualquier cambio a la fórmula de cálculo de `suggested_quantity` o al criterio de negocio del `CASE WHEN`.
- Internacionalización general del backend (este documento sólo cubre estos dos literales puntuales).
