# Datos de proveedor, fecha objetivo, pesables y recepción del cajero

> **Este change está BLOQUEADO por backend.** Los cuatro bloques que contiene
> dependen de contrato o de permisos que hoy no existen en `../backend`. No se
> implementa —ni parcialmente, ni con datos simulados— hasta que el backend
> descrito en `backend-request.md` esté desplegado y verificado contra una
> instancia real. Ver `design.md` → `Migration Plan` para el orden exacto.

## Why

El kiosco abastece sin papel sólo a medias. Hoy un proveedor es apenas un nombre:
no hay dónde anotar el teléfono al que se lo llama, la dirección donde opera ni
cada cuánto pasa a entregar, así que esa información sigue viviendo en la agenda
personal de quien hace los pedidos. Tampoco hay pantalla del proveedor: para
saber qué se le compra hay que entrar producto por producto, porque la
asociación producto–proveedor sólo se lee desde el lado del producto.

Un pedido, además, sólo sabe cuándo se creó. No hay forma de decir "esto lo
quiero para el jueves", y sin esa fecha el hub de compras no puede responder la
única pregunta que importa a la mañana: **qué llega hoy**. Como consecuencia,
quien recibe la mercadería en el mostrador —el cajero— no tiene ni entrada de
navegación ni permiso: si llega por link directo a un pedido, la pantalla monta
y el backend le devuelve `403`. Es un error vivo hoy, no hipotético.

Por último, un pesable no se puede pedir: toda cantidad de compra es entera de
punta a punta, así que "15,5 kg de pan" no es representable, aunque el catálogo
sí distinga `unit_type: unitario | pesable`.

## What Changes

Cuatro bloques, todos derivados del rediseño aprobado de Compras y Proveedores
(proyecto Claude Design `1669eca0-5224-4459-8b68-524eb6c00266`).

**A. Cantidades según el tipo de unidad del producto.** Las cantidades de compra
pasan a viajar como string decimal en los tres formularios que las escriben
—crear pedido, recibir y alta de ítem no pedido— y el campo muestra la unidad
del producto dentro del input (`15 kg` para un pesable, `24 un` para un
unitario), derivada de `product.unit_type` del catálogo. Un ítem de texto libre,
que no tiene producto de catálogo, se trata como unitario.

**B. Ficha de proveedor.** Ruta nueva `/purchasing/suppliers/[id]` con: datos de
contacto (empresa, teléfono, dirección, frecuencia de visita, notas), productos
asociados leídos **desde el lado del proveedor** —con la marca de preferido y la
frecuencia de reposición de cada asociación—, y un teaser de los últimos tres
pedidos con enlace al historial completo. Acciones `Editar ficha` y `Desactivar`.
El alta y la edición del proveedor aceptan los datos de contacto nuevos.

**C. Fecha objetivo y jerarquía del hub.** El formulario de nuevo pedido suma un
campo `Fecha objetivo` junto a `Fecha de creación`, con ayuda inline y
tratamiento visual propio. Con esa fecha, `/purchasing` se reordena en dos
bloques: **"Qué llega hoy"** —dominante, filas grandes, con botón `Recibir`
directo por pedido y contador de atrasados— y **"Esta semana"** —tabla densa, sin
CTA por fila, la fila entera abre el pedido—. Un pedido pendiente cuya fecha
objetivo ya pasó se rotula `Atrasado`, con texto y no sólo con color. Un pedido
sin fecha objetivo se renderiza sin romperse y no entra en ninguno de los dos
bloques.

**D. El cajero recibe.** El rol `cashier` gana entrada de navegación a
`/purchasing`, ve "Qué llega hoy" y puede abrir un pedido y recibirlo. No ve
`Crear pedido` ni `Lista de proveedores`. Se corrige de paso el gate de
`/purchasing/[id]`, que hoy admite `cashier` contra un backend que lo rechaza.

**Fuera de alcance de este change:**

- La estructura visual de las cinco pantallas del rediseño, el split de
  `PurchaseOrderForm.tsx`, el banner de precarga con el pedido anterior, la
  reubicación de las sugerencias, el modelo de resolución línea por línea del
  detalle, las pestañas de modo del alta de ítem y la fusión de la capability
  `ui-receiving` en `ui-suppliers-purchasing`: todo eso es
  `redesign-frontend-purchasing-section`, del que este change **depende**.
- La pantalla de cola de ítems pendientes de alta
  (`GET /purchase-orders/uncatalogued-items`, hoy sin consumidor).
- Cualquier notificación o recordatorio disparado por la fecha objetivo.
- El cambio de contrato del backend en sí: acá se documenta, no se implementa.
- Rediseñar el reporte de compras (`PurchasesReportView`).

## Capabilities

### Modified Capabilities

- `ui-suppliers-purchasing`: el hub prioriza los pedidos por fecha objetivo y se
  abre al rol `cashier`; el alta y la edición de proveedor incorporan datos de
  contacto; aparece la ficha de proveedor como ruta propia; la creación de
  pedidos registra una fecha objetivo; y toda cantidad de compra pasa a ser un
  decimal expresado en la unidad del producto.

No se declara `ui-receiving` como capability modificada: el change del que este
depende la fusiona en `ui-suppliers-purchasing`. Ver `design.md` →
`Relación con las specs vigentes` para el orden obligatorio y la contradicción
que quedaría abierta si se implementara fuera de ese orden.

No se declara `ui-catalog`: `product.unit_type` se lee tal como el catálogo ya lo
expone y no cambia ningún comportamiento de esa capability.

## Impact

**Rutas**

- `/purchasing/suppliers/[id]` — **nueva**; roles `admin`, `inventory`.
- `/purchasing` — nueva jerarquía por fecha objetivo; suma el rol `cashier`.
- `/purchasing/new` — campo de fecha objetivo; roles sin cambios
  (`admin`, `inventory`).
- `/purchasing/[id]` — el gate hoy admite `cashier` sin respaldo del backend; el
  rol queda válido recién cuando se despliega el bloque D del pedido a backend.

**Superficies**

- `src/lib/nav.ts` — la entrada `/purchasing` suma `cashier`; `nav.test.ts` cubre
  el cambio.
- `src/lib/types.ts` — `Supplier` suma campos de contacto nullables; `PurchaseOrder`
  y `PurchaseOrderListItem` suman `expected_at` nullable; las cantidades de
  `PurchaseOrderItem` pasan de `number` a string decimal.
- `src/lib/purchasing.ts` — query de los pedidos por fecha objetivo, clasificación
  hoy / esta semana / atrasado, y formato de cantidad con unidad; todo pura y
  testeable en `node`.
- `src/lib/receiving.ts` — `buildAddedItemPayload` deja de convertir la cantidad
  con `Number()`.
- Vistas de compras y proveedores, más la ficha nueva del proveedor. Los nombres
  y ubicaciones definitivos de esos componentes los fija
  `redesign-frontend-purchasing-section`, que los mueve y los parte.

**Backend**

Requiere los cuatro bloques de `backend-request.md`: cantidades decimales en
purchasing, campos de contacto del proveedor más `GET /suppliers/{id}`,
`expected_at` con filtro `expected_from`/`expected_to`, y ampliación de permisos
de recepción a `cashier`. El bloque D contiene además una decisión de producto
pendiente del lado del backend.

**Dependencias**

- Depende de `redesign-frontend-purchasing-section` (change hermano, frontend
  puro).
- Convive con `add-frontend-purchasing-optional-supplier`, también bloqueado por
  backend: un pedido sin proveedor no tiene ficha de proveedor a la que enlazar.

No agrega dependencias de `package.json`.
