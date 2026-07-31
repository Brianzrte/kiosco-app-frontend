## Context

El formulario de creación de productos ya solicita categoría y SKU. El backend coordinado agrega una consulta de propuesta, pero al 2026-07-30 la ruta aún no existe en `../backend/internal/bootstrap/router.go`; la implementación frontend queda condicionada a su despliegue. El backend es la fuente de verdad: la propuesta puede quedar ocupada antes de guardar y el SKU efectivo sólo se conoce en la respuesta de creación.

## Goals / Non-Goals

**Goals:**

- Consultar la propuesta al seleccionar una categoría mediante `api<T>()`.
- Presentarla como valor editable y respetar cualquier edición manual posterior.
- Preservar todos los valores del formulario ante errores de consulta y `409` de creación.
- Mostrar el SKU retornado por la creación exitosa.
- Mantener una experiencia operable, accesible y usable en pantallas pequeñas.

**Non-Goals:**

- Generar, validar disponibilidad o reservar SKUs en el navegador.
- Cambiar reglas de autorización, el contrato de precios/costos o la edición de productos.
- Agregar dependencias o crear un primitive visual ad hoc.

## User flow

1. La persona abre el alta y completa los campos disponibles.
2. Selecciona una categoría; el frontend consulta `GET /api/v1/products/sku-suggestion?category_id={id}` a través del proxy de `api<T>()`.
3. Mientras espera, el campo SKU conserva su valor actual y comunica el estado pendiente. Si no fue editado manualmente y llega una propuesta, se muestra `SKU-` seguido de tres cifras entre `001` y `999`.
4. La persona puede aceptar o reemplazar la propuesta. Una selección posterior de categoría sólo actualiza el SKU si el valor actual sigue siendo automático/no editado.
5. Al crear, la respuesta exitosa es la autoridad y el SKU devuelto se muestra junto con la confirmación.

## UI states

- Inicial: SKU editable y sin propuesta.
- Consulta pendiente: indicador asociado al campo; no bloquea la edición del resto del formulario.
- Propuesta recibida: valor visible en el campo SKU y distinguible por una ayuda textual, sin depender sólo del color.
- Error de propuesta (`401`, `403`, `422`, `409` u otro): se conservan los datos, se informa el problema y se permite ingresar SKU manualmente o continuar según las validaciones vigentes.
- Creación exitosa: confirmación y SKU efectivo devuelto por backend; no se sustituye por una estimación local.
- Conflicto `409`: mensaje del backend, formulario en la misma pantalla con todos los valores preservados y SKU editable para reintentar.

## Decisions

### Autoridad del backend

La UI sólo consulta y presenta propuestas; no genera ni reserva candidatos. Esto evita duplicar la regla de unicidad y permite que el backend resuelva carreras entre propuesta y creación. Se descarta calcular un número aleatorio o secuencial en el navegador.

### Protección de edición manual

La propuesta sólo puede completar o actualizar el SKU cuando la persona no lo modificó manualmente. Una edición explícita, incluso si coincide con el formato automático, queda protegida ante cambios de categoría y respuestas tardías. Se descarta sobrescribir silenciosamente texto ingresado.

### Transporte y UI kit

Todas las llamadas pasan por `api<T>()`; se reutilizan los campos, mensajes, toasts y estados del UI kit. No se agrega una librería de fetching, formularios o testing.

## Accessibility

El campo SKU conserva etiqueta visible y nombre accesible. La carga, el error y la propuesta se comunican mediante texto asociado al campo o una región anunciable; el estado no depende sólo del color. El control permanece operable con teclado y conserva foco al editar o corregir un conflicto.

## Keyboard and focus behavior

La selección de categoría y el campo SKU son operables con teclado. Una respuesta de propuesta no roba el foco. Después de un `409`, el foco vuelve al campo SKU o al mensaje accionable de conflicto, sin cerrar ni reiniciar el formulario.

## Responsive behavior

En móvil, categoría, SKU y sus mensajes se apilan dentro del layout existente sin requerir desplazamiento horizontal. El estado pendiente y los errores permanecen visibles cerca del campo.

## API contract

- Request: `GET /api/v1/products/sku-suggestion?category_id={id}`.
- Response `200`: `{ "sku": "SKU-123" }`.
- El valor siempre es `SKU-` seguido de tres cifras, de `001` a `999`; la categoría no forma parte del SKU.
- La propuesta es orientativa. La creación devuelve el producto y su SKU efectivo, que la UI debe mostrar.
- Errores esperados: `401` sesión inválida, `403` sin permiso, `422` categoría inexistente y `409` sin disponibilidad/conflicto; la UI conserva el formulario en los errores de operación.

## Error handling

Los mensajes del backend se muestran según las convenciones existentes. Un fallo de consulta no borra ni reemplaza datos y deja disponible el ingreso manual. Un `409` de creación no se interpreta como éxito, no reintenta silenciosamente y conserva todos los campos para corregir y volver a enviar. Un `401` sigue el manejo de sesión vigente; un `403` mantiene la sesión y comunica falta de permiso.

## Backend coordination

La ruta y el contrato dependen del change backend `add-automatic-product-sku`, que aún está abierto y no está registrada en el router real. La implementación se desbloquea cuando exista en una instancia desplegada y se verifiquen método, shape, autenticación y statuses contra backend real.

## Risks / Trade-offs

- [Propuesta obsoleta] → La creación usa siempre el SKU devuelto por backend y muestra `409` sin perder datos.
- [Respuesta tardía de una categoría anterior] → Aplicar la propuesta sólo si corresponde a la selección vigente y el SKU no fue editado manualmente.
- [Backend aún no desplegado] → Mantener fallback manual y exigir validación real antes de implementar.

## Migration Plan

Desplegar primero el endpoint y la creación compatible del backend; verificarlo en una instancia real; luego implementar y desplegar el frontend. No hay migración de datos ni cambio de formato histórico.

## Rollback

Revertir la integración frontend deja el alta manual existente. No se eliminan productos creados con SKU automático.

## Open Questions

Ninguna bloqueante. La forma final del mensaje de error continúa siendo la provista por el backend y las convenciones actuales del frontend.

