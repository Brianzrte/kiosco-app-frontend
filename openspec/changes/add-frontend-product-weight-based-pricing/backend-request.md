# Pedido a backend: Productos pesables (peso) y precio real cobrado en la línea de venta

> Prompt para la sesión de backend (módulo `internal/catalog` y
> `internal/sales`). Generado desde el frontend a partir de una decisión de
> producto ya tomada con el usuario; ver `openspec/changes/add-frontend-product-weight-based-pricing/design.md`
> para el detalle completo del comportamiento frontend que depende de este
> contrato.

## Fecha y evidencia consultada

2026-07-31. Verificado contra:

- `../backend/internal/catalog/domain/product.go` (líneas 1-26): `Product`
  tiene `ID, SKU, Barcode, Name, Category, Price, Cost, Active, CreatedAt,
  UpdatedAt` — sin ningún campo de tipo de producto ni de precio por
  kilogramo.
- `../backend/internal/sales/domain/sale_item.go` (líneas 1-31): `SaleItem`
  tiene `ID, ProductID, ProductName, Quantity int, UnitPrice, Subtotal` —
  `Quantity` es un entero (`decimal.NewFromInt`), y no existe ningún campo
  de precio "real" separado del calculado.
- `../backend/internal/bootstrap/router.go`: no hay ninguna ruta relacionada
  con peso, kilogramos o precio corregido.
- Búsqueda `rg` sobre todo `../backend` (`--glob '*.go'`) para
  `weight|pesable|peso|unit_type|kilogram|by_weight|per_kg`: sin resultados.

## Contexto y necesidad de usuario

El kiosco vende algunos productos a granel (fiambre, verdura), cobrando en
base al peso pesado en el mostrador en vez de por unidades enteras a un
precio fijo. Además, el precio efectivamente cobrado por esa línea no
siempre coincide con el que el sistema calcula (`peso × precio por
kilogramo`) — el cliente pudo pagar un monto distinto en el mostrador. El
negocio necesita que la venta, el cierre de caja, los reportes y las
devoluciones reflejen el monto que efectivamente entró a la caja, sin perder
el dato del cálculo teórico como referencia histórica.

Decisiones de producto ya tomadas (no reabrir, son insumo para el diseño del
backend, no una prescripción de su implementación interna):

1. La edición del precio real sólo ocurre antes de confirmar la venta, en el
   mismo payload de creación de la línea. No hace falta un endpoint de
   edición retroactiva de una venta confirmada.
2. La edición usa el mismo scope que el backend ya fuerza hoy en `/sales`
   (cajero: propias del día; admin: todas). No se pide un scope nuevo.
3. El precio por kilogramo es un campo separado del `price` existente, no
   una reinterpretación de `price`.
4. Los productos pesables no llevan control de stock: ningún endpoint de
   `inventory` necesita cambios.
5. El precio real, cuando existe, reemplaza al calculado en todo agregado
   posterior (total de venta, cierre de caja, reportes, devoluciones); el
   calculado sólo se conserva como dato histórico.
6. Peso con 3 decimales; precio calculado redondeado a 2 decimales
   (centavo); todo como string decimal, nunca float.
7. Todo producto existente se considera `unitario` por defecto; el tipo de
   producto es obligatorio y explícito en el alta/edición.

## Estado actual verificado

- `Product` no distingue tipos de producto ni tiene un precio por
  kilogramo.
- `SaleItem.Quantity` es `int`; no hay forma de representar un peso decimal
  ni de registrar dos precios distintos (calculado vs. real) para una misma
  línea.
- Ningún endpoint de `catalog`, `sales` ni `inventory` menciona peso,
  kilogramos, tipo de producto o precio corregido.

## Contrato mínimo solicitado

Los nombres de campo abajo (`unit_type`, `price_per_kg`, etc.) son una
referencia para facilitar la lectura de este pedido, no un contrato cerrado:
el backend puede nombrarlos distinto según su propia convención; lo que el
frontend necesita es la existencia de estos conceptos con la forma general
descripta.

### 1. `Product`: tipo de producto y precio por kilogramo

- Agregar un campo de tipo de producto (`unit_type` o equivalente), con dos
  valores posibles: `unitario` y `pesable` (o los nombres que el backend
  prefiera para el mismo concepto). Obligatorio en la creación.
- Agregar `price_per_kg` (decimal string), obligatorio cuando el tipo es
  `pesable`, ausente o irrelevante cuando es `unitario`.
- `POST /api/v1/products` y `PUT /api/v1/products/{id}`: aceptar ambos
  campos en el request. Rechazar (422 o el status que ya use el backend para
  validación) un `pesable` sin `price_per_kg` válido.
- `GET /api/v1/products` y `GET /api/v1/products/{id}`: devolver ambos
  campos en la respuesta.
- Migración: productos existentes deben tratarse como `unitario` — ya sea
  migrando el dato en la base con ese valor por defecto, o documentando
  explícitamente si el campo puede llegar ausente durante una ventana de
  transición (el frontend ya contempla ese caso tratándolo como `unitario`,
  pero preferimos que el backend confirme cuál de las dos rutas toma).

### 2. `SaleItem`: representar una línea por peso

- `POST /api/v1/sales/{id}/items`: aceptar una línea correspondiente a un
  producto `pesable`, con una cantidad de peso decimal (kilogramos, hasta 3
  decimales) en vez de (o además de) `quantity: number`. La forma exacta —
  un campo paralelo específico para peso, o reinterpretar `quantity` como
  string decimal sólo para este tipo— la define el backend; el frontend se
  adapta al nombre y shape que se defina.
- Errores de validación (peso negativo, no numérico, o cualquier regla de
  negocio que el backend decida aplicar sobre el rango) deben devolver un
  `{ message }` legible, siguiendo el patrón ya usado por el resto de
  `/sales`.

### 3. `SaleItem`: precio calculado y precio real

- `POST /api/v1/sales/{id}/items`: aceptar, en el mismo payload de creación
  de la línea, un precio real opcional que — cuando está presente —
  reemplaza al precio calculado (`peso × price_per_kg`) como el valor que
  participa del `subtotal` de la línea y de todo agregado posterior de la
  venta (total, cierre de caja, reportes, devoluciones).
- `GET /api/v1/sales/{id}`: la línea (`SaleItem`) debe devolver tanto el
  precio calculado histórico como el precio real efectivo (ambos decimal
  string), para que el frontend pueda mostrar el calculado tachado cuando
  difieren.
- No se pide un endpoint de edición retroactiva: una vez que la venta se
  confirma (`POST /sales/{id}/confirm`), la línea es inmutable, igual que
  hoy para cualquier otra línea.
- Reportes y cierre de caja (`GET /reports/...`, `GET /sales/summary`, `GET
  /sales/today-summary`) no necesitan un cambio de contrato desde la
  perspectiva del frontend: siguen devolviendo agregados ya calculados; se
  pide que esos agregados usen el precio real cuando exista, sin que el
  frontend cambie cómo los consume.

### 4. Inventory: sin cambios

No se pide ningún cambio en `internal/inventory` ni en sus endpoints. Los
productos `pesable` no generan filas de stock ni se validan contra
`GET /inventory/stock/{product_id}` — decisión de producto ya tomada, no
una limitación técnica a resolver.

## Roles y scopes

Ningún endpoint de este pedido cambia de rol respecto de lo que ya exige hoy:

- Alta/edición de producto (`unit_type`, `price_per_kg`): mismos roles que
  ya gatean `POST/PUT /products` (`inventory`, `admin`).
- Creación de línea de venta con peso y/o precio real
  (`POST /sales/{id}/items`): mismo scope que ya fuerza el backend en
  `/sales` hoy — cajero sobre sus propias ventas del día, admin sobre
  todas. No se pide un scope nuevo.

## Compatibilidad y rollout

- **Frontend viejo + backend nuevo**: debe seguir funcionando sin cambios —
  si el backend agrega `unit_type`/`price_per_kg` con un default
  `unitario`/ausente para productos existentes, un frontend que no conoce
  estos campos no debería romperse al leer o crear productos `unitario`.
- **Frontend nuevo + backend viejo**: el frontend trata la ausencia de
  `unit_type` en la respuesta como `unitario` (ver `design.md`, Decisión 7),
  así que la lectura no se rompe; sin embargo, el frontend no puede ofrecer
  alta de productos `pesable` ni líneas por peso hasta que el backend
  soporte el contrato de las secciones 1-3. Las tareas de implementación
  correspondientes quedan bloqueadas hasta verificar el despliegue contra
  una instancia real.
- Orden de despliegue sugerido: backend primero (secciones 1-3), luego
  frontend.

## Impacto/bloqueo en el frontend

Sin este contrato, el frontend no puede implementar:

- El selector de tipo de producto y el campo `price_per_kg` en
  `ProductForm.tsx`.
- El control de peso, el cálculo de precio por peso y el editor de precio
  real en `PosView.tsx`.
- El precio calculado tachado junto al precio real en `SaleDetail.tsx`.

Todo lo demás del change (que no depende de este contrato) no existe: cada
pieza de este change depende de al menos uno de los tres puntos anteriores.

## Criterio de desbloqueo

Este pedido se considera resuelto cuando, contra una instancia real (no sólo
contra el código):

- `POST /api/v1/products` acepta `unit_type` y, para `pesable`,
  `price_per_kg`, y los rechaza correctamente cuando falta o es inválido.
- `GET /api/v1/products` devuelve ambos campos.
- `POST /api/v1/sales/{id}/items` acepta una línea con peso decimal y,
  opcionalmente, un precio real.
- `GET /api/v1/sales/{id}` devuelve, para esa línea, tanto el precio
  calculado como el precio real efectivo.
- Se confirma qué status y forma de error usa cada validación nueva (peso
  inválido, `price_per_kg` faltante, etc.).

## Fuera de alcance de este pedido

- Cualquier cambio en `internal/inventory` — los pesables no llevan stock.
- Un endpoint de edición retroactiva de una línea de venta ya confirmada.
- Reportes nuevos o modificados específicos de pesables (p.ej. "ventas por
  kilo"); los reportes existentes sólo necesitan usar el precio real en sus
  agregados ya existentes.
- Un scope de autorización nuevo para la edición del precio real: se usa el
  mismo que ya existe en `/sales`.

## Checklist de verificación sugerida

- [ ] `POST /products` con `unit_type: "pesable"` y `price_per_kg` válido →
      `201`, el producto creado devuelve ambos campos
- [ ] `POST /products` con `unit_type: "pesable"` sin `price_per_kg` →
      rechazado con un mensaje de validación legible
- [ ] `GET /products` incluye `unit_type` y `price_per_kg` (cuando aplica)
      en cada producto de la lista
- [ ] `POST /sales/{id}/items` con una línea de peso decimal (3 decimales) y
      sin precio real → la línea se crea con el precio calculado
- [ ] `POST /sales/{id}/items` con la misma línea más un precio real → la
      línea se crea con el precio real como efectivo
- [ ] `GET /sales/{id}` devuelve, para esa línea, el precio calculado y el
      precio real por separado
- [ ] El total de la venta, el cierre de caja y los reportes usan el precio
      real (no el calculado) cuando existe
- [ ] Un producto `unitario` existente sigue funcionando exactamente igual
      que antes de este cambio, con o sin migración explícita de
      `unit_type` en la base
