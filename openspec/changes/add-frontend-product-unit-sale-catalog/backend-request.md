# Pedido a backend: venta por unidad suelta de productos vendidos por paquete

> Prompt para la sesión de backend (módulos `internal/catalog` e
> `internal/inventory`). Generado desde el frontend a partir de decisiones de
> producto ya tomadas con el usuario. El detalle del comportamiento frontend que
> depende de este contrato está en
> `openspec/changes/add-frontend-product-unit-sale-catalog/design.md`.
>
> **Este pedido cubre el feature completo**, que del lado del frontend se parte
> en tres changes. Los puntos §1-§5, §9, §10 y §11 **bloquean el change de
> catálogo** (este). Los puntos §6, §7, §8 y §12 son prerrequisitos de los
> changes de inventario y de POS, y se incluyen acá para que el backend pueda
> planificar el trabajo completo de una sola vez.

## Fecha y evidencia consultada

2026-08-04. Verificado contra:

- `../backend/internal/catalog/domain/product.go`: `Product` tiene `ID, SKU,
  Barcode, Name, Category, UnitType, Price, PricePerKg, Cost, Active, CreatedAt,
  UpdatedAt`. No hay relación entre productos, ni unidades por paquete, ni
  margen persistido, ni distinción de producto derivado.
- `../backend/internal/inventory/domain/stock.go`: `Stock{ProductID, Quantity
  int, MinimumQuantity int, UpdatedAt}` — un único entero de cantidad por
  producto.
- `../backend/internal/bootstrap/router.go`: existen `POST /api/v1/products`,
  `PUT /api/v1/products/{id}`, `POST /api/v1/products/{id}/deactivate`
  (`inventory` + `admin`), `POST /api/v1/products/{id}/activate` (`admin`),
  `POST /api/v1/inventory/stock`, `GET /api/v1/inventory/stock`,
  `GET /api/v1/inventory/stock/{product_id}`,
  `POST /api/v1/inventory/stock/{product_id}/adjust`. **No** existe ninguna ruta
  de búsqueda de productos por nombre.
- Búsqueda `rg` sobre `../backend` (`--glob '*.go'`) por
  `parent_product|units_per_package|sells_by_unit|extra_margin`: sin resultados.
- Frontend: `src/lib/types.ts` (`Product`, `Stock`, `StockListItem`,
  `MovementType`), `src/components/pos/PosView.tsx` (búsqueda por nombre sobre
  `GET /products?limit=100`, filtrada en cliente),
  `openspec/specs/ui-catalog/spec.md`, `openspec/specs/ui-inventory/spec.md`.

## Contexto y necesidad de usuario

El kiosco compra en paquetes cerrados (una caja de 12 sobres de café) y vende
buena parte de esa mercadería por unidad suelta, con un margen propio. Hoy el
sistema obliga a elegir un único modo de venta por producto, así que el kiosquero
carga dos productos sueltos a mano, sin vínculo entre ellos, y la apertura de un
paquete es una gimnasia de ajustes manuales de stock.

Decisiones de producto ya tomadas (insumo para el diseño del backend, no una
prescripción de su implementación interna):

1. Vínculo **padre-hijo formal** entre el producto paquete y el producto unidad.
   No un duplicado suelto ni un producto único con modo dual.
2. El costo del hijo es **derivado** (`costo del padre ÷ unidades por paquete`)
   y lo calcula el backend. El usuario nunca lo ingresa.
3. El precio del hijo es **derivado y sincronizado** desde el precio del padre y
   un **margen extra persistido**. Al cambiar el precio del padre, el backend
   recalcula el precio unitario; un override manual previo se pierde.
4. El nombre del hijo es `{nombre del padre} (unidad)` y **no es editable**.
5. La conversión de stock es **automática y del backend**: al agotarse las
   unidades sueltas habiendo paquetes cerrados, se descuenta un paquete y se
   suman `units_per_package` unidades.
6. La desactivación es **acoplada unidireccional** padre → hijo.
7. Reportes y cierre de caja muestran paquete y unidad como **líneas separadas**,
   sin consolidación. No se pide ningún cambio de agregados.
8. Un producto `pesable` nunca se vende por unidad.

## Estado actual verificado

- `Product` no tiene ninguna forma de relacionarse con otro producto ni de
  declararse derivado.
- No existe `units_per_package` ni ningún margen persistido.
- `Stock.Quantity` es un `int` único: no hay forma de representar paquetes
  cerrados y unidades sueltas por separado.
- Los tipos de movimiento de inventario son una lista cerrada
  (`SALE`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `RETURN`); no hay ninguno para una
  apertura de paquete.
- No existe validación de nombre duplicado en ninguna capa (sí de SKU y barcode,
  con `409`).
- No existe endpoint de búsqueda de productos por nombre.

## Contrato mínimo solicitado

Los nombres de campo que aparecen abajo (`units_per_package`,
`extra_margin_percent`, `parent_product_id`, …) son una referencia para leer este
pedido, **no un contrato cerrado**: el backend puede nombrarlos según su propia
convención. Lo que el frontend necesita es la existencia de estos conceptos con
la forma general descripta, y saber sus nombres definitivos antes de fijar los
tipos en `lib/types.ts`.

Todo importe sigue siendo **string decimal**, nunca float. Las cantidades de
stock siguen siendo enteros.

---

### §1. Relación padre-hijo en `Product` — **bloquea catálogo**

- Un vínculo explícito entre el producto paquete y su producto unidad: por
  ejemplo `parent_product_id` (nullable) en el hijo y/o
  `unit_child_product_id` (nullable) en el padre.
- Una forma de responder, sobre **cualquier producto de una lista**, sin pedir
  nada más: ¿es un producto derivado por unidad? ¿de qué producto?
- Ambos datos presentes en `GET /api/v1/products` y `GET /api/v1/products/{id}`.
- El frontend los usa para: el badge "Por unidad" del listado, el detalle de
  sólo lectura del hijo, el link bidireccional padre↔hijo, y el aviso de
  acoplamiento en el diálogo de baja.

### §2. `units_per_package` y `extra_margin_percent` persistidos — **bloquea catálogo**

- `units_per_package` en el producto padre: entero, mínimo 2. Requerido cuando
  el producto se vende por unidad; ausente o irrelevante cuando no.
- `extra_margin_percent` **persistido** en el padre. Es lo que el backend usa
  para recalcular el precio unitario cuando cambia el precio del paquete, sin
  intervención del usuario. (Nota: el `%` de ganancia costo→precio que ya existe
  en el formulario **no** se persiste y no es este campo; son dos conceptos
  distintos.)
- `POST /api/v1/products` y `PUT /api/v1/products/{id}` aceptan ambos campos,
  más un flag de "se vende por unidad" (o su equivalente: la presencia de
  `units_per_package` puede oficiar de flag, si el backend lo prefiere, pero
  hace falta un modo explícito de **apagarlo** — ver §9).
- Rechazar con un `{ message }` legible: `units_per_package` menor a 2, no
  entero, o ausente con el flag activo; margen no numérico o fuera del rango que
  el backend decida.
- **Pregunta abierta (R2):** ¿se acepta bajar `units_per_package` cuando el stock
  tiene más unidades sueltas que el nuevo tamaño de paquete, o se rechaza? La
  decisión de producto vigente es **aceptarlo sin tocar el stock**, y el frontend
  ya avisa de ese estado. Si el backend prefiere rechazarlo, alcanza con un
  `{ message }` y el frontend lo muestra bajo el campo.

### §3. Costo del hijo derivado y sincronizado — **bloquea catálogo**

- El costo del producto hijo lo calcula el backend como
  `costo del padre ÷ units_per_package`. El frontend **nunca** lo envía.
- Se re-deriva cuando cambia el costo del padre o `units_per_package`.

### §4. Precio del hijo derivado y sincronizado — **bloquea catálogo**

- El precio del hijo se calcula como
  `(precio del padre ÷ units_per_package) × (1 + extra_margin_percent / 100)`.
- Se recalcula cuando cambia el precio del padre, `units_per_package` o el
  margen. Un precio unitario que el usuario haya escrito a mano en un alta o
  edición previa **se pierde** en ese recálculo: es una decisión de producto
  tomada, no un efecto colateral a evitar.
- **Pregunta:** ¿el request de alta/edición debe mandar el margen, el precio
  unitario, o ambos? El frontend puede mandar cualquiera de los dos: deriva uno
  del otro localmente. Preferimos mandar el **margen** (es el dato que
  sobrevive), pero si el backend quiere el precio como confirmación, lo mandamos
  también.

### §5. Regla de redondeo — **bloquea catálogo**

- El backend define y documenta la regla de redondeo del **precio unitario** y
  del **costo derivado**. El frontend la refleja, no la inventa.
- Dato relevante: el frontend ya aplica hoy, como sugerencia de precio de venta,
  `roundPriceToSuggestedAmount` (`src/lib/products.ts`): redondea hacia arriba al
  múltiplo de $50, con mínimo $5. Si el backend adopta esa misma regla, la
  sugerencia que el usuario ve mientras carga y el valor que se guarda coinciden.
  Si adopta otra, el usuario va a ver cambiar el número después de guardar; el
  frontend puede alinearse si nos dicen cuál es.
- **Advertencia sobre la granularidad.** Ese redondeo al múltiplo de $50 es
  razonable para el precio de un paquete, pero un precio unitario es por
  definición una fracción de él: un cálculo de $70,80 se convertiría en $100, un
  41% arriba. Si la regla del backend para el precio unitario usa una
  granularidad más fina (al peso, a los $5, al centavo), decinos cuál y el
  frontend alinea su sugerencia.
- Necesitamos la regla **explicitada**, no inferida de ejemplos.

### §6. Stock de dos niveles — *prerrequisito del change de inventario*

- `Stock.Quantity` es hoy un `int` único. Hace falta representar **paquetes
  cerrados** y **unidades sueltas**, y exponer una **disponibilidad total
  consultable** para que el POS pueda bloquear la venta.
- Afecta respuestas existentes: `GET /api/v1/inventory/stock/{product_id}` y
  `GET /api/v1/inventory/stock?…` (consumidas por el POS y por toda la vista de
  inventario). **Cambia una respuesta existente**: el frontend compila igual y
  falla en runtime, así que hay dependencia de despliegue.
- **Pregunta de diseño:** ¿el stock de dos niveles vive en el producto **padre**,
  en el **hijo**, o hay una fila por cada uno con una relación entre ellas? El
  frontend necesita saber a qué `product_id` consultar desde el POS cuando el
  cajero elige el producto unidad, y sobre qué producto abrir el diálogo de
  inicialización.
- Un producto que **no** se vende por unidad debe seguir devolviendo exactamente
  la forma actual, o una forma que un frontend viejo pueda seguir leyendo.

### §7. Inicialización con dos cantidades — *prerrequisito del change de inventario*

- `POST /api/v1/inventory/stock` hoy acepta `{ product_id, quantity, reason }`
  con `quantity ≥ 0`. Hace falta la variante de dos cantidades (paquetes
  cerrados + unidades sueltas) para estos productos.
- `POST /api/v1/inventory/stock/{product_id}/adjust` hoy acepta
  `{ quantity_delta, reason }` con motivo obligatorio. Hace falta definir **cómo
  se ajusta cada nivel**: un delta por nivel, dos campos, o dos operaciones.
- Rechazo por quedar bajo cero: se mantiene el comportamiento vigente, con su
  `{ message }`.

### §8. Apertura automática de paquete — *prerrequisito del change de inventario*

- Operación de dominio del backend, sin actor humano: al agotarse las unidades
  sueltas habiendo paquetes cerrados, se descuenta un paquete y se suman
  `units_per_package` unidades sueltas.
- Debe quedar registrada en el historial de inventario con un **tipo de
  movimiento propio**. Hoy los tipos son una lista cerrada
  (`SALE`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `RETURN`) que el frontend traduce
  con `MOVEMENT_TYPE_LABELS` (`src/lib/inventory.ts`): un tipo nuevo implica una
  etiqueta nueva. Necesitamos su **valor exacto**.
- **Pregunta:** en una **devolución** de una venta que incluyó unidades sueltas,
  ¿el backend reintegra unidades sueltas, reconstruye un paquete, o algo
  distinto? El frontend no recalcula stock; sólo necesita saber qué mostrar en el
  historial.

### §9. Desactivación acoplada y `sells_by_unit = false` — **bloquea catálogo**

- `POST /api/v1/products/{id}/deactivate` sobre un producto padre desactiva
  **también** a su hijo. Sobre un hijo, **no** toca al padre (acoplamiento
  unidireccional). El frontend no emite una segunda llamada; anuncia el efecto en
  el diálogo de confirmación y relee el producto después.
- Apagar el flag de venta por unidad en `PUT /api/v1/products/{id}` desactiva
  **sólo al hijo**, de forma **reversible**: conserva su historial de ventas y su
  stock congelado. Volver a encender el flag **reactiva ese mismo registro**, no
  crea uno nuevo.
- Roles: desactivar sigue siendo `inventory` + `admin`; reactivar sigue siendo
  `admin`. Volver a encender el flag de venta por unidad **es una reactivación**,
  así que esperamos que el backend lo rechace con `403` para un rol `inventory`.
  El frontend ya deshabilita ese caso en la UI y muestra el `403` sin limpiar la
  sesión, pero **necesitamos confirmación de que el backend lo trata así**.
- **Preguntas abiertas:**
  - ¿Reactivar el padre (`POST /products/{id}/activate`) reactiva también al
    hijo, o quedan independientes? El frontend relee y muestra lo que pase, en
    cualquiera de los dos casos; sólo cambia el copy del diálogo.
  - ¿Se permite reactivar el hijo mientras el padre está inactivo? Es posible por
    el acoplamiento unidireccional. Si se rechaza, alcanza con un `{ message }`.

### §10. Validación de nombre duplicado — **bloquea catálogo**

Hoy no existe en ninguna capa. Se necesitan dos cosas:

1. **Rechazo en el submit.** `POST /api/v1/products` y
   `PUT /api/v1/products/{id}` rechazan un nombre que colisiona con un producto
   existente **activo o inactivo** (`409` o el status que ya use el backend para
   unicidad). Aplica también al nombre derivado `{nombre} (unidad)` cuando se
   crea el par. El error debe traer, además del `{ message }`, **el `id`, el
   `name` y el `sku` del producto en conflicto**: el frontend tiene que linkear a
   su detalle, igual que ya hace con el barcode duplicado.
2. **Chequeo previo.** Una forma de consultar coincidencia exacta de nombre antes
   de enviar el formulario, para bloquear el guardado con un aviso en vez de
   dejar que el usuario complete todo y sea rechazado. Puede ser un parámetro en
   `GET /api/v1/products` (por ejemplo `?name=` con match exacto) o un endpoint
   dedicado, análogo a `GET /api/v1/products/barcode/{barcode}`. **No asumimos su
   forma.** Si el backend decide no exponerlo, el frontend se queda sólo con (1)
   y esa tarea queda descartada; el comportamiento observable es el mismo, más
   tardío.

Definir también si la comparación es sensible a mayúsculas y a espacios de más:
el frontend no normaliza el nombre por su cuenta.

### §11. ¿El hijo aparece en `GET /products`? — **bloquea catálogo**

- Necesitamos una respuesta explícita. Si aparece —lo cual es **necesario** para
  la búsqueda del POS, que es el único camino de acceso al producto unidad—
  también aparecerá en el listado de catálogo, en el filtro por categoría y en el
  listado de inventario.
- Si conviene poder ocultarlo en alguna de esas superficies, hace falta un
  **parámetro de filtro** en `GET /api/v1/products` (por ejemplo, excluir o
  incluir productos derivados). No lo asumimos: el change de catálogo está
  escrito asumiendo que el hijo **es visible** y se marca con un badge.
- Impacto en `total`/paginación: si el hijo cuenta en `total`, el listado del
  frontend lo pagina como cualquier otro producto.

### §12. Endpoint de búsqueda server-side para el POS — *prerrequisito del change de POS*

- Hoy `PosView.tsx` trae `GET /api/v1/products?limit=100` y filtra por nombre
  **en el cliente**. Cada producto vendible por unidad agrega una fila más a ese
  catálogo. En un kiosco cerca del techo de 100 productos, los productos unidad
  quedarían fuera del `limit` y serían **invisibles en la búsqueda del POS**, que
  es su único camino de acceso.
- Se pide un endpoint (o parámetro) de búsqueda de productos **activos** por
  nombre, server-side, con un límite razonable de resultados, accesible para el
  rol `cashier`. Forma exacta a definir por el backend.
- No se pide un buscador full-text ni ranking: alcanza con "contiene", el mismo
  criterio que aplica hoy el cliente.

---

## Roles y scopes

Ningún endpoint de este pedido cambia de rol respecto de lo que ya exige hoy:

- Alta/edición de producto y sus campos nuevos: `inventory` + `admin`.
- Desactivación de producto: `inventory` + `admin`.
- Reactivación de producto (y reactivación del hijo al reencender el flag de
  venta por unidad): `admin`.
- Inicialización y ajuste de stock: los roles que ya gatean `/inventory` hoy.
- Búsqueda de productos desde el POS: debe ser accesible para `cashier`, que hoy
  ya consume `GET /products?limit=100`.

No se pide ningún scope nuevo.

## Compatibilidad y rollout

- **Frontend viejo + backend nuevo:** debe seguir funcionando. Un producto que no
  se vende por unidad tiene que verse, crearse y editarse exactamente como hoy;
  los campos nuevos deben ser opcionales en el request. La forma de `Stock` para
  un producto sin venta por unidad debería seguir siendo legible por un frontend
  que no conoce los dos niveles (§6).
- **Frontend nuevo + backend viejo:** compila, pero falla en runtime en cuanto se
  marca el checkbox de venta por unidad. Por eso las tareas del frontend quedan
  bloqueadas hasta verificar contra una **instancia en ejecución**, no contra el
  código.
- Orden de despliegue: **backend primero**, frontend después. Rollback en orden
  inverso.
- Los productos existentes no requieren migración de datos desde la perspectiva
  del frontend: sin el flag activo, todo el comportamiento actual queda idéntico.

## Impacto/bloqueo en el frontend

Sin §1-§5, §9, §10 y §11 desplegados, el change de catálogo
(`add-frontend-product-unit-sale-catalog`) **no puede implementarse en absoluto**:
cada pieza —checkbox, tres campos, popup con dos productos, badge del derivado,
detalle de sólo lectura, acoplamiento de baja, colisión de nombre— depende de al
menos uno de esos puntos.

Sin §6, §7 y §8 no puede escribirse ni implementarse el change de inventario. Sin
§12 (y §6) no puede implementarse el change de POS.

## Criterio de desbloqueo

Este pedido se considera resuelto **para el change de catálogo** cuando, contra
una instancia real en ejecución (no sólo contra el código):

- [ ] `POST /api/v1/products` acepta unidades por paquete y margen extra, y
      devuelve **los dos productos creados** con sus `id`, `name` y `sku`.
- [ ] `GET /api/v1/products` y `GET /api/v1/products/{id}` devuelven, para
      cualquier producto, si es derivado y de qué producto, más
      `units_per_package`, margen extra y precio unitario cuando aplica.
- [ ] El costo y el precio del hijo son los derivados esperados y **no** se
      envían desde el frontend.
- [ ] Cambiar el precio del padre con `PUT /api/v1/products/{id}` recalcula el
      precio del hijo.
- [ ] Está documentada la regla de redondeo del precio unitario y del costo
      derivado.
- [ ] `POST /api/v1/products/{id}/deactivate` sobre el padre deja al hijo
      inactivo; sobre el hijo deja al padre activo.
- [ ] Apagar el flag con `PUT /api/v1/products/{id}` desactiva sólo al hijo, y
      volver a encenderlo reactiva ese mismo registro (mismo `id`).
- [ ] Un nombre duplicado es rechazado con un error que incluye `id`, `name` y
      `sku` del producto en conflicto.
- [ ] Está respondido si el hijo aparece en `GET /api/v1/products` y, si aplica,
      cuál es el parámetro de filtro.
- [ ] Están confirmados los **nombres definitivos** de todos los campos nuevos.
- [ ] Un producto que no se vende por unidad se comporta exactamente igual que
      antes del cambio.

Para los changes de inventario y POS, agregar:

- [ ] `GET /api/v1/inventory/stock/{product_id}` devuelve los dos niveles y una
      disponibilidad total, y está claro sobre qué `product_id` se consulta.
- [ ] `POST /api/v1/inventory/stock` acepta dos cantidades y
      `POST /api/v1/inventory/stock/{product_id}/adjust` define cómo se ajusta
      cada nivel.
- [ ] Vender la última unidad suelta habiendo un paquete cerrado produce un
      movimiento con el tipo nuevo, cuyo **valor exacto** está documentado.
- [ ] Existe una búsqueda de productos activos por nombre server-side accesible
      para `cashier`.

## Fuera de alcance de este pedido

- Consolidar paquete y unidad en reportes, cierre de caja o detalle de venta: van
  como líneas separadas y ningún agregado cambia.
- Más de un nivel de empaque (caja → paquete → unidad).
- Vender por unidad un producto `pesable`.
- Permitir editar a mano el nombre, el costo o el precio del producto derivado.
- Cualquier cambio en el flujo de escaneo por barcode.
- Un scope de autorización nuevo: se reutilizan los que ya existen.
