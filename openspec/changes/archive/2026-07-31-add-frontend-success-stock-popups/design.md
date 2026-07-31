## Context

Tres pantallas existen hoy, cada una con su propio tratamiento de éxito:

- `ProductForm.submit` (alta): en éxito hace `toast("success", ...)` seguido
  de `router.push("/products")` + `router.refresh()`. No hay ningún popup.
- `PosView`: ya tiene, tras `confirmSale()`, un panel de confirmación
  (`confirmedSale`, líneas ~1190-1302) que **no** es el `Dialog` modal del kit
  (no usa `<dialog>`/`showModal`): es un `motion.div` con backdrop, no
  atrapa foco, se autodescarta a los `CONFIRMED_SALE_AUTO_DISMISS_MS` (6 s), y
  — según su propio comentario — "nunca gatea el inicio de la próxima venta":
  cerrarlo con el botón, click afuera, o directamente escanear el próximo
  código lo descarta igual. Hoy expone un botón "Nueva venta" (cierra) y un
  link "Ver detalle →" hacia `/sales/{id}`.
- `InventoryView` (`/inventory`): un único listado paginado con búsqueda
  server-side por nombre/SKU/código de barras; al hacer clic en
  "Inicializar"/"Ajustar" en una fila abre `<Dialog title="Gestionar stock">`
  con `StockPanel`, que decide entre `InitializeStockForm` (sin stock) o
  pestañas Ajustar/Mínimo (con stock), usando `GET /inventory/stock/{id}`. No
  existe hoy ningún soporte de query param: `useSearchParams` no se usa en
  ningún archivo de este repo.

`GET /api/v1/products/{id}` ya existe y ya se usa (`ProductDetail.tsx`), así
que resolver un producto puntual para el deep-link no requiere backend nuevo.

`GET /api/v1/products/barcode/{barcode}` (`catalog` spec del backend,
requirement "Product Lookup by Barcode") ya existe, ya está desplegado, y ya
lo consume `PosView.scan()` hoy: `200` con el producto completo si hay
match exacto (activo o inactivo — la unicidad de `barcode` no distingue
estado), `404` si no hay ninguno. Está disponible para cualquier rol
autenticado, así que tanto `inventory` como `admin` (los dos roles que
llegan a `/products/new`) pueden usarlo. No hace falta ningún endpoint de
backend nuevo para la validación en tiempo real pedida.

Hoy, en `ProductForm`, el campo "Código de barras" es un `Input` de texto
libre y opcional, ubicado después del SKU automático, dentro de la misma
grilla `sm:grid-cols-2`. Está dentro de un único `<form onSubmit={submit}>`:
presionar `Enter` en cualquier input de una sola línea dispara el `submit`
nativo del formulario. Hoy eso no llega a pegarle al backend antes de
completar el resto de campos requeridos (`name`, `category_id`, `unit_type`,
`cost`, precio) porque la validación HTML5 nativa (`required`) intercepta el
envío y mueve el foco al primer campo inválido — pero si se deja que ese
`submit` nativo dispare sin `preventDefault` específico del campo de código
de barras, el gesto de "Enter" del lector no dispararía ninguna consulta de
duplicado: sólo movería el foco al primer campo vacío requerido, sin ningún
feedback sobre el código escaneado.

Navegación por rol (`src/lib/nav.ts`, `ai/context/roles-and-navigation.md`):
`/inventory` exige `["inventory", "admin"]`; `/` (POS) exige
`["cashier", "admin"]`; `/products/new` exige `["inventory", "admin"]`. La
intersección de POS e Inventario es sólo `admin`: un `cashier` sin `admin`
nunca puede llegar a `/inventory`, hoy ni con este change.

## Goals / Non-Goals

**Goals:**

- Ofrecer, en el momento exacto de éxito de alta de producto y de
  confirmación de venta, un atajo de un clic hacia la inicialización/ajuste
  de stock del producto relevante, sin obligar a buscarlo de nuevo a mano.
- Preservar intacto el comportamiento scan-first de POS: el popup nuevo no
  agrega ningún foco atrapado ni bloquea el escaneo del próximo código.
- Reusar los primitives existentes (`Dialog`, `Button`) y el patrón de panel
  no modal que POS ya tiene, en vez de introducir un tercer patrón de popup.
- Que "Inicializar stock" lleve a un estado ya resuelto (diálogo abierto,
  producto correcto) y no a una lista donde hay que volver a buscar el
  producto a mano.
- Detectar, en el momento de escanear un código de barras durante el alta de
  un producto (antes de completar el resto del formulario), si ese código ya
  pertenece a otro producto, para evitar que la persona complete todo el
  formulario y recién se entere del conflicto al enviar.

**Non-Goals:**

- No se agrega backend nuevo ni se cambia ningún contrato existente.
- No se resuelve la carga de stock para **cada** producto de una venta con
  varias líneas distintas; ver Decisión 3 sobre el criterio de un único
  producto objetivo.
- No se toca el flujo de edición de producto (`ProductForm` con `product`
  presente): su `toast` + redirect actual no cambia.
- No se agrega soporte genérico de deep-linking a Inventario más allá de
  `product_id` (no se agregan otros parámetros de URL para categoría, término
  de búsqueda, etc.).
- No se cambia el criterio de qué es "stock bajo" ni ninguna otra regla ya
  normada en `ui-inventory`.
- No se agrega ningún endpoint de backend para la validación de código de
  barras: se reutiliza `GET /api/v1/products/barcode/{barcode}`, ya
  desplegado.
- No se reordena ni se toca el campo de código de barras en el formulario de
  **edición** de producto (`product` presente): sólo aplica a la rama de
  creación.
- No se agrega una validación equivalente para SKU (ya tiene su propio
  manejo de duplicado vía `409` al enviar, sin cambios en este change) ni
  para ningún otro campo.

## Decisions

1. **El popup de alta de producto usa el `Dialog` modal del kit; el de POS
   reusa y extiende el panel no modal existente (`confirmedSale`), no
   `Dialog`.**
   Son dos superficies con restricciones distintas. La alta de producto es un
   formulario de página completa sin ninguna necesidad de mantener foco en
   otro control: un `Dialog` modal (foco atrapado, `Escape` cierra) es
   consistente con el resto del kit (`InventoryView` ya lo usa así) y no
   compite con nada. POS, en cambio, tiene un requirement normativo vigente
   ("Scan-first sale screen": el foco vuelve siempre al input de escaneo) que
   un `<dialog>` modal rompería, porque el navegador movería el foco dentro
   del diálogo y un lector de código de barras que tipea contra el input de
   escaneo dejaría de funcionar hasta cerrar el popup. Extender el panel que
   ya existe (no atrapa foco, ya convive con el input de escaneo) evita esa
   regresión y no introduce un tercer patrón de popup en el codebase.
   Alternativa descartada: usar `Dialog` también en POS y aceptar que cada
   venta interrumpa el escaneo hasta que el cajero la cierre — descartada
   explícitamente por contradecir el requirement "Scan-first sale screen" y
   el comentario ya presente en el código ("confirmar una venta nunca bloquea
   el inicio de la próxima").

2. **En POS, "Ahora no" reemplaza al botón "Nueva venta" (mismo
   comportamiento); "Ver detalle →" se conserva sin cambios.**
   El Requirement Context pide exactamente dos botones ("Inicializar stock" /
   "Ahora no"), pero el panel ya tenía dos elementos (un botón "Nueva venta"
   y un link "Ver detalle"). Interpretar "Ahora no" como el nuevo nombre del
   botón de cierre — no como una tercera acción — evita duplicar la acción de
   cerrar y mantiene "Ver detalle" (un link, no uno de los "dos botones")
   disponible sin tocar su comportamiento actual. Alternativa descartada:
   quitar "Ver detalle" para dejar el panel con exactamente dos elementos
   totales — descartada porque el Requirement Context no pide remover esa
   funcionalidad y hacerlo sería alcance no solicitado.

3. **"Inicializar stock" en POS apunta al producto de la última línea
   agregada al carrito en el momento de confirmar, no a un selector de
   producto ni a todas las líneas de la venta.**
   El Requirement Context describe el flujo en singular ("el producto...
   vendido") y el panel de confirmación es un espacio de una sola acción, no
   un listado. Con un carrito de una sola línea (el caso más común en un
   kiosco chico) el resultado es inequívoco. Con varias líneas distintas, se
   usa la última agregada — un criterio determinístico y ya disponible sin
   pedir nada nuevo al backend (el array `cart` ya está en orden de agregado
   `cart[cart.length - 1].product`, se captura antes de que `confirmSale()`
   vacíe el carrito). Alternativas descartadas: (a) mostrar un selector de
   producto dentro del panel cuando hay más de una línea — agrega una
   decisión de UI dentro de una superficie pensada para ser mirada y
   descartada en segundos, no para elegir entre opciones; (b) enviar a la
   lista general de Inventario sin preseleccionar nada cuando hay más de un
   producto — no cumple la promesa de "Inicializar stock" como atajo directo.
   Esta decisión queda anotada como no bloqueante en Open Questions por si el
   dueño prefiere otro criterio (p. ej. el producto con mayor cantidad
   vendida) una vez que vea el comportamiento en uso.

4. **"Inicializar stock" en POS sólo se muestra si la sesión tiene acceso a
   `/inventory` (es decir, rol `admin`; un `cashier` sin `admin` nunca la
   tiene hoy).**
   `/inventory` exige `["inventory", "admin"]` y `/` (POS) exige
   `["cashier", "admin"]`; su intersección es sólo `admin`. Mostrar el botón
   a un cajero sin `admin` lo llevaría a una ruta de la que el guard de
   servidor lo redirige de inmediato (`requireRole` → `redirect(homeFor(...))`
   a `/`), un callejón sin salida disfrazado de acción útil. El gating es UX,
   no autorización (la autoridad real sigue siendo el guard de servidor de
   `/inventory`), consistente con `ai/context/roles-and-navigation.md`.
   `PosView` no recibe el rol de la sesión hoy: se agrega como prop desde
   `app/(app)/page.tsx`, con el mismo patrón que `InventoryView` ya usa para
   `canPlanStock`. Alternativa descartada: mostrar el botón siempre y dejar
   que el guard de `/inventory` redirija — descartada porque ofrece una
   acción que nunca puede completar el rol al que se le ofrece.

5. **El popup de alta de producto reemplaza — no complementa — el
   `toast` + redirect automático a `/products` que existe hoy en la rama de
   creación.**
   El Requirement Context pide un popup "inmediatamente después" de crear el
   producto con dos acciones que deciden a dónde ir; mantener además el
   redirect automático competiría con esas dos acciones (¿a dónde va la
   persona si no toca nada?) y el toast quedaría redundante con la
   confirmación visual del popup, igual que ya ocurre en POS (el código de
   `PosView` explícitamente evita el toast de venta confirmada porque el
   panel ya es la confirmación). El popup muestra el nombre y el SKU efectivo
   del producto creado — la misma información que hoy va en el texto del
   toast — así que no se pierde información. La rama de edición
   (`product` presente) no participa de esta decisión y sigue mostrando su
   `toast("success", "Producto actualizado")` sin popup ni cambio de
   navegación.

6. **"Ahora no" en el popup de alta navega a `/products/new` (formulario en
   blanco), no a `/products` (la lista).**
   El Requirement Context describe la acción como "permite... seguir cargando
   productos", que es explícitamente continuar dando de alta, no ver la
   lista. Cerrar el popup con `Escape`, click afuera, o su botón de cierre
   (×) tiene el mismo efecto que "Ahora no", por consistencia con el resto
   del kit (`Dialog`'s `onClose`). Alternativa descartada: volver a
   `/products` como hoy — descartada porque no cumple "seguir cargando
   productos" tal como está pedido; quien quiera ver la lista puede navegar
   por `Nav.tsx` como cualquier otra vez.

7. **Deep-link a Inventario usa el query param `product_id` y resuelve el
   producto con `GET /products/{id}`, no con el listado paginado de
   stock.**
   `product_id` reutiliza el mismo nombre de campo que ya usa el body de
   `POST /api/v1/inventory/stock`, evitando inventar un nombre nuevo. El
   producto recién creado o el de la última línea vendida puede no estar en
   la página actualmente cargada del listado paginado/filtrado de
   `InventoryView` (por orden, filtro de categoría activo, o búsqueda con
   texto distinto), así que buscarlo ahí sería frágil. `GET /products/{id}`
   siempre lo resuelve sin depender del estado de paginación/filtro vigente,
   y ya se usa en el mismo repo (`ProductDetail.tsx`) con el mismo patrón de
   `useLoad`. El nombre, SKU y `active` de ese producto son suficientes para
   armar la fila que hoy `StockPanel` espera (no depende de los demás campos
   del listado paginado, como categoría o precio). Alternativa descartada:
   pedir que el backend permita filtrar `GET /inventory/stock` por
   `product_id` exacto — no hace falta, porque `StockPanel` ya resuelve el
   stock del producto con `GET /inventory/stock/{product_id}` en cuanto se
   le pasa un `productId`; sólo falta el nombre/SKU para pintar el diálogo,
   y eso ya lo da `GET /products/{id}`.

8. **La apertura por `product_id` no cambia la lista ni sus filtros: abre el
   diálogo "Gestionar stock" por encima, con la lista de fondo intacta.**
   Igual que hoy al hacer clic en una fila. Si el usuario cierra el diálogo,
   queda en `/inventory` con la lista en su estado default (sin filtros
   heredados del origen), porque el origen (alta de producto o POS) no tenía
   ninguna noción de categoría/búsqueda que valga la pena propagar.

9. **El código de barras pasa a ser el primer campo, con foco inicial, sólo
   en la rama de creación; la edición conserva el orden actual.**
   El pedido es explícito para "el formulario de creación/alta de producto".
   La edición ya arranca con un `barcode` potencialmente ya cargado y con
   `skuManuallyEditedRef` inicializado en `true` (SKU no se resugiere en
   edición); moverle el foco inicial al código de barras en edición no tiene
   el mismo propósito (no hay "primer escaneo" que capturar antes de nada) y
   además podría interpretarse como habilitar el mismo flujo de detección de
   duplicados sobre el propio producto que se está editando, lo cual no fue
   pedido y se descarta explícitamente (ver Decisión 12). Alternativa
   descartada: reordenar en ambas ramas para mantener un único layout —
   descartada porque el pedido acota el cambio a alta y unificar el orden no
   aporta nada a la edición.

10. **La detección de duplicado se dispara con `Enter` en el campo de código
    de barras (`onKeyDown`), con `preventDefault` propio, en vez de dejar
    que dispare el `submit` nativo del formulario.**
    Un lector físico de código de barras tipea el código y termina con un
    `Enter` sintético — el mismo mecanismo por el que el input de escaneo de
    POS ya funciona hoy. Si ese `Enter` se deja propagar como el `submit`
    nativo del `<form>` de `ProductForm`, HTML5 intercepta el envío por los
    demás campos `required` vacíos (nombre, categoría, tipo, costo, precio) y
    sólo mueve el foco al primer campo inválido, sin dar ningún feedback
    sobre el código escaneado — el peor resultado posible para este pedido.
    Manejar `Enter` específicamente en el campo de código de barras, con su
    propio `preventDefault`, dispara la consulta de duplicado sin intentar
    enviar el resto del formulario, y dejando que un `Enter` en cualquier
    *otro* campo del formulario se comporte exactamente igual que hoy.
    Alternativa descartada: usar el evento `onChange`/debounce como ya hace
    la sugerencia de SKU al elegir categoría — descartada porque el gesto que
    hay que capturar es específicamente la finalización de un escaneo
    (`Enter`), no cada tecla individual tipeada a mano, que generaría una
    consulta por cada dígito si alguien carga el código manualmente.

11. **Un duplicado encontrado bloquea el envío del formulario (no sólo
    advierte) hasta que el valor del campo cambie, y ofrece un enlace directo
    a `/products/{id}` del producto existente.**
    Enviar igual sería trabajo perdido: el backend ya rechaza un código de
    barras duplicado con `409` en `POST /api/v1/products` (requirement
    "Duplicate SKU or barcode" de `ui-catalog`, sin cambios). Bloquear apenas
    se detecta el conflicto — en vez de dejar que la persona complete todo el
    formulario para recién enterarse al enviar — es el propósito explícito
    del pedido. El enlace a `/products/{id}` reconoce el caso más probable
    (la persona quiere editar/reabastecer un producto que ya existe, no
    duplicarlo) sin navegar automáticamente por ella: sigue siendo su
    decisión. El bloqueo se limpia solo si edita el campo de código de
    barras (nuevo valor, ya no hay conflicto conocido hasta la próxima
    verificación), igual criterio que ya usa este mismo formulario para
    limpiar el estado de conflicto de SKU (`onSkuChange` limpia
    `skuSuggestionError`). Alternativa descartada: sólo advertir sin
    bloquear — descartada porque el Requirement Context deja la decisión a
    quien escribe el change y bloquear evita explícitamente el trabajo
    perdido que motiva el pedido ("para eso existe la advertencia").

12. **La consulta de duplicado se dispara sólo en creación, nunca en
    edición, y sólo por `Enter` explícito — no en cada tecla ni al perder el
    foco (`onBlur`).**
    En edición, el propio `barcode` cargado le pertenece al producto que se
    está editando: correr la misma consulta encontraría "un producto con ese
    código" que es el mismo que se está editando, y distinguir ese caso
    (excluir el propio `id`) es complejidad no pedida para un campo que en
    edición ya tiene su propio manejo de conflicto al guardar (`409` en
    `PUT`, sin cambios). Limitarlo a `Enter` (no `onBlur`) evita una consulta
    accidental cuando alguien tabula fuera del campo sin haber terminado de
    escribir un código a mano. Alternativa descartada: correr la consulta
    también en edición excluyendo el `id` propio — fuera del pedido explícito
    y agrega un caso (¿qué pasa si dos productos comparten un barcode ya
    inválido de datos históricos?) que no vale la pena resolver en este
    change.

## User flow

### Alta de producto

1. La persona completa el formulario de alta y envía.
2. `POST /api/v1/products` responde con éxito.
3. En vez de redirigir, se abre el popup modal de éxito con el nombre y el
   SKU efectivo del producto creado.
4. La persona elige una de las dos acciones (o cierra el popup, con el mismo
   efecto que "Ahora no"):
   - **"Inicializar stock":** navega a `/inventory?product_id={id}`. Esa
     página resuelve el producto, abre "Gestionar stock" ya en modo
     inicialización (el producto recién creado nunca tiene stock), listo
     para cargar la cantidad inicial.
   - **"Ahora no":** cierra el popup y navega a `/products/new`, formulario
     en blanco, listo para cargar el siguiente producto.

### Confirmación de venta (POS)

1. El cajero confirma la venta; `confirmSale()` tiene éxito.
2. El panel de "Venta confirmada" ya existente se muestra igual que hoy
   (número, total), con dos acciones en vez de una: **"Inicializar stock"**
   (sólo si la sesión tiene acceso a Inventario) y **"Ahora no"**, más el
   link "Ver detalle →" sin cambios.
3. El input de escaneo mantiene el foco todo el tiempo; nada de esto bloquea
   escanear el siguiente código. El panel se sigue autodescartando a los 6 s.
4. Si el cajero (o admin) elige una acción:
   - **"Inicializar stock":** navega a
     `/inventory?product_id={último producto agregado al carrito}`, con el
     mismo comportamiento de apertura que en alta de producto — en modo
     inicialización si el producto no tiene stock, o en modo ajuste
     (pestaña "Ajustar") si ya lo tiene.
   - **"Ahora no":** cierra el panel; equivalente a lo que hoy hace "Nueva
     venta" (el cajero ya puede seguir escaneando, como ya podía antes de
     tocar nada).

### Código de barras al inicio del alta, con validación en tiempo real

1. La persona abre `/products/new`. El foco inicial está en "Código de
   barras" (primer campo del formulario), no en "Nombre".
2. Escanea con un lector físico (o tipea el código y presiona `Enter` a
   mano): el campo recibe el valor y el `Enter` sintético.
3. El frontend intercepta ese `Enter` (sin dejar que dispare el `submit`
   nativo) y consulta `GET /api/v1/products/barcode/{barcode}`.
4. Según la respuesta:
   - **`404` (no existe):** no se muestra ningún mensaje; el foco sigue
     disponible para continuar completando el resto del formulario con
     normalidad (nombre, categoría, etc.).
   - **`200` (ya existe):** se muestra una advertencia inline con el nombre y
     SKU del producto encontrado y un enlace "Ver producto" a
     `/products/{id}`; el botón de envío del formulario queda deshabilitado.
5. Si la persona edita el valor del campo de código de barras después de un
   duplicado detectado, la advertencia y el bloqueo se limpian de inmediato
   (vuelve al estado sin verificar hasta el próximo `Enter`).
6. El resto del alta (nombre, categoría, tipo, costo, precio, SKU
   automático) sigue exactamente igual que hoy, sin cambios de
   comportamiento — sólo cambia su posición relativa al campo de código de
   barras, que ahora va primero.

### Apertura directa de Inventario por producto

1. `/inventory?product_id={id}` carga.
2. La vista pide `GET /products/{id}` para ese producto (en paralelo a su
   carga normal de la lista paginada, que no cambia).
3. Si el producto existe: se abre `Gestionar stock` para ese producto de
   inmediato (mismo `StockPanel` que ya existe), sin esperar a que el
   producto aparezca en la página visible de la lista.
4. Si el producto no existe o el pedido falla (por ejemplo, un enlace viejo
   apuntando a un producto luego eliminado — hoy no hay baja dura, sólo
   desactivación, así que esto sólo ocurriría ante un id inválido): no se
   abre ningún diálogo y se muestra un error explicativo no bloqueante (ver
   Error handling), dejando la lista utilizable debajo.

## UI states

### Popup de alta de producto

- **Éxito (mostrado):** nombre y SKU efectivo del producto, dos botones
  ("Inicializar stock" primario, "Ahora no" secundario).
- **Cerrado (cualquier vía — botón, `Escape`, click afuera, ×):** siempre
  navega a `/products/new`, igual que "Ahora no".
- **Error de creación:** sin cambios respecto de hoy — el popup no se abre;
  el formulario conserva sus valores y el mensaje de error existente
  (incluyendo el flujo de conflicto `409` ya normado en `ui-catalog`).

### Panel de POS ("Venta confirmada")

- **Éxito (mostrado):** sin cambios visuales en número/total; agrega
  "Inicializar stock" (condicionado al rol, ver Decisión 4) y renombra
  "Nueva venta" a "Ahora no"; "Ver detalle →" intacto.
- **Auto-descarte a los 6 s, click afuera, `Ahora no`, o escanear el próximo
  código:** todos cierran el panel igual que hoy cierra "Nueva venta"; nada
  de esto navega fuera de POS.
- **"Inicializar stock" navega fuera de POS:** el carrito ya está vacío
  (`confirmSale()` lo vacía antes de esto) y la sesión de venta actual queda
  atrás; no hay ningún estado de POS que preservar al volver.

### Inventario por `product_id`

- **Cargando:** el diálogo no se abre todavía; la lista de fondo se muestra
  con su skeleton habitual si también está cargando.
- **Producto resuelto:** diálogo "Gestionar stock" abierto de inmediato,
  mismo contenido que si se hubiera hecho clic en la fila (inicialización o
  ajuste, según tenga stock).
- **Producto no encontrado / error de red:** el diálogo no se abre; aparece
  un mensaje corto y no bloqueante (ver Error handling) y la lista queda
  disponible para buscar manualmente.
- **Sin `product_id` en la URL:** comportamiento idéntico al actual, sin
  ningún cambio.

### Código de barras en el alta de producto

- **Campo recién montado / sin verificar:** sin mensaje, formulario enviable
  como hoy (código de barras sigue siendo opcional: un alta sin código de
  barras nunca dispara esta validación).
- **`Enter` con código no encontrado (`404`):** sin mensaje, formulario
  enviable; el resultado es indistinguible de "todavía no se verificó" a
  simple vista, que es la conducta esperada (nada que advertir).
- **`Enter` con código encontrado (`200`, duplicado):** advertencia inline
  visible con nombre + SKU del producto existente y enlace a su ficha;
  formulario **no** enviable mientras este estado esté activo.
- **Consulta en curso:** el campo no se bloquea para seguir escribiendo, pero
  el formulario tampoco se envía hasta que la consulta resuelva (mismo
  criterio que ya usa la sugerencia de SKU con su estado `loading`).
- **La consulta de duplicado falla por red/servidor (no es un `404`
  semántico, sino un error real):** no bloquea el alta — el mismo criterio
  que ya aplica hoy a la sugerencia de SKU cuando falla ("el backend
  intentará generarlo/validarlo al crear el producto"); se muestra un aviso
  breve y no bloqueante, y la verificación definitiva sigue quedando a cargo
  del `409` del backend al enviar.

## Accessibility

- El popup de alta usa `Dialog`, que ya cumple los requirements vigentes de
  `ui-foundation` (foco visible, `role`/estructura del kit); no se introduce
  ningún patrón de accesibilidad nuevo.
- El panel de POS ya es `role="status"` `aria-live="polite"`
  (no cambia): los dos botones nuevos/renombrados son `<button>` estándar,
  alcanzables por teclado con el mismo `tab order` que hoy tiene "Nueva
  venta" / "Ver detalle".
- Ninguna de las dos acciones se comunica sólo con color: son texto de botón
  ("Inicializar stock" / "Ahora no"), igual que el resto del kit.
- El mensaje de error de `product_id` no resuelto en Inventario se anuncia
  con el mismo patrón `aria-live="polite"` que ya usan los otros mensajes
  inline de esa vista (p. ej. la ayuda de SKU en `ProductForm`).
- La advertencia de código de barras duplicado usa `role="alert"` (no
  `role="status"`): a diferencia de la ayuda de SKU, este mensaje bloquea el
  envío del formulario y debe anunciarse de inmediato, igual criterio que ya
  usa este mismo formulario para su error general de envío (`role="alert"`
  en el `<p>` de `error`). El enlace "Ver producto" es un `<a>`/`Link`
  estándar con texto visible, alcanzable por teclado.

## Keyboard and focus behavior

- **Alta de producto:** al abrirse, `Dialog` mueve el foco dentro de sí
  (comportamiento nativo de `showModal`), como cualquier otro `Dialog` del
  kit hoy. `Escape` cierra (equivalente a "Ahora no"). Al cerrar y navegar a
  `/products/new`, el foco inicial es el mismo `autoFocus` que ya tiene el
  campo "Nombre" del formulario en blanco.
- **POS:** foco explícitamente **no** se mueve hacia el panel al aparecer —
  se preserva el comportamiento ya documentado en el código
  (`scanRef.current` mantiene el foco). Los dos botones son alcanzables por
  `Tab`/`Shift+Tab` y por mouse, pero nunca son obligatorios: escanear el
  siguiente código sigue siendo la única acción que hace falta para empezar
  la próxima venta, sin togglear foco a mano. `Escape` conserva su
  comportamiento actual del panel (si ya cierra hoy, lo sigue haciendo; si no
  existe ese atajo hoy, este change no lo agrega, para no interferir con
  cualquier uso de `Escape` en el resto de POS, p. ej. para cerrar el panel
  de búsqueda manual).
- **Inventario por `product_id`:** al abrirse el diálogo, el foco sigue el
  mismo comportamiento nativo de `Dialog` que ya tiene `StockPanel` al
  abrirse por clic en una fila; no se agrega un manejo de foco distinto por
  llegar vía URL en vez de vía clic.
- **Código de barras en el alta:** el foco inicial del formulario pasa de
  "Nombre" a "Código de barras" (mismo mecanismo `autoFocus`, sólo se mueve
  de campo). `Enter` en ese campo específico dispara la validación sin mover
  el foco ni enviar el formulario; el foco permanece en el campo para poder
  seguir corrigiendo el código si hace falta. `Tab`/`Shift+Tab` recorren el
  formulario en su nuevo orden (código de barras primero), sin trampas de
  foco nuevas. Cuando aparece la advertencia de duplicado, el foco **no** se
  mueve automáticamente al enlace "Ver producto": queda en el campo, para que
  la persona pueda simplemente seguir editando el código si el duplicado fue
  un error de tipeo.

## Responsive behavior

- El popup de alta usa el mismo `Dialog` responsivo del kit
  (`w-[calc(100%-2rem)] max-w-md`), ya validado a 320px en el resto de la
  app; sin layout nuevo.
- El panel de POS ya es responsivo (`w-full max-w-sm`); agregar un segundo
  botón en la misma columna vertical (`flex-col gap-2`) no cambia su
  comportamiento en mobile, sólo agrega una fila más al mismo stack.
- El diálogo de Inventario abierto por `product_id` es el mismo `Dialog` que
  ya se usa hoy; ningún cambio responsivo adicional.

## API contract

Sin endpoints nuevos ni cambios de contrato. Se reutilizan, sin modificar
request/response:

- `POST /api/v1/products` (ya usado por `ProductForm`): la respuesta exitosa
  (`Product`, incluye `id`, `sku`) es la fuente del nombre/SKU mostrado en el
  popup y del `product_id` para el deep-link.
- `GET /api/v1/products/{id}` (ya usado por `ProductDetail.tsx`): resuelve el
  producto al abrir `/inventory?product_id=...`.
- `GET /api/v1/inventory/stock/{product_id}` y
  `POST /api/v1/inventory/stock` (ya usados por `StockPanel`/
  `InitializeStockForm`): sin cambios, sólo se les llega por un camino nuevo.
- `POST /api/v1/sales`, `POST /api/v1/sales/{id}/items`,
  `PUT /api/v1/sales/{id}/payment`, `POST /api/v1/sales/{id}/confirm` (ya
  usados por `confirmSale()`): sin cambios; el `product_id` de la última
  línea ya está disponible en el estado local del carrito antes de que
  `confirmSale()` lo vacíe.
- `GET /api/v1/products/barcode/{barcode}` (ya usado por `PosView.scan()`,
  disponible a cualquier rol autenticado): se reutiliza sin cambios desde
  `ProductForm`, sólo en creación, disparado por `Enter` en el campo de
  código de barras. `200` trae el producto completo (nombre, SKU, `id`,
  `active`) para armar la advertencia y el enlace; `404` significa "no hay
  duplicado" y no requiere leer el cuerpo de la respuesta.

## Error handling

- **Alta de producto:** sin cambios — un error de creación (incluyendo
  `409` por SKU/código de barras duplicado) sigue el comportamiento ya
  normado en `ui-catalog`; el popup nuevo sólo participa en la rama de
  éxito.
- **`GET /products/{id}` falla o devuelve 404 al resolver `product_id` en
  Inventario:** no se abre ningún diálogo; se muestra un mensaje inline
  corto ("No se pudo abrir el producto solicitado.") sin bloquear el resto
  de la vista, siguiendo el mismo criterio de error no bloqueante ya usado
  en otros mensajes inline de este repo (nunca un toast efímero para un
  error de carga). La persona puede seguir usando la lista normalmente.
- **Confirmación de venta en POS:** sin cambios — los caminos de error ya
  normados en "Atomic sale confirmation" (rechazo del backend, red
  desconocida, pagos no balanceados) siguen exactamente igual; el panel de
  éxito y sus dos acciones nuevas sólo existen en la rama de éxito.
- **Validación de código de barras duplicado en el alta:** un `404` no es un
  error — es la respuesta esperada de "no hay duplicado" y se trata en
  silencio. Un `200` no es un error tampoco — es el resultado que dispara la
  advertencia bloqueante descripta arriba. Sólo una falla real de la
  consulta (red caída, `5xx`, sesión inválida) es un error de verdad: no
  bloquea el alta (mismo criterio que la sugerencia de SKU cuando falla), se
  muestra un aviso breve, y la garantía final de unicidad sigue siendo el
  `409` del backend al enviar `POST /api/v1/products` — sin cambios respecto
  del comportamiento ya normado en "Duplicate SKU or barcode".

## Backend coordination

Ninguna. No hay endpoint faltante, cambio de contrato, cambio de
autorización ni dependencia de despliegue: los tres endpoints que participan
del deep-link (`GET /products/{id}`, `GET /inventory/stock/{product_id}`,
`POST /api/v1/inventory/stock`) ya están desplegados y en uso hoy por este
mismo frontend. Por eso este change no incluye `backend-request.md`.

## Risks / Trade-offs

- [Ambigüedad del "producto objetivo" en una venta con varias líneas
  distintas] → Se documenta explícitamente el criterio (última línea
  agregada, Decisión 3) y queda anotado como Open Question no bloqueante
  para confirmar con el dueño una vez en uso.
- [El popup de alta reemplaza el redirect automático a `/products`, un
  comportamiento en el que alguien pudo haberse acostumbrado a confiar] →
  Mitigado porque el popup sigue mostrando la confirmación de éxito (nombre +
  SKU) que antes daba el toast, y "Ahora no" deja a la persona en un lugar
  igual de útil (formulario en blanco) para seguir trabajando; ver la lista
  sigue disponible por `Nav.tsx`.
- [Cambiar `PosView` para recibir `role` como prop toca un componente grande
  y ya complejo] → Acotado: es un prop nuevo, sin re-render adicional donde
  no se usa, siguiendo el mismo patrón ya probado de `canPlanStock` en
  `InventoryView`.
- [Deep-link a Inventario con un `product_id` inválido o de un producto muy
  viejo] → Cubierto explícitamente en Error handling: no rompe la vista,
  sólo no abre el diálogo y explica por qué.
- [Mover el foco inicial de "Nombre" a "Código de barras" cambia el hábito
  de quien hoy empieza tipeando el nombre a mano] → Aceptado explícitamente:
  es el propósito del pedido (habilitar escanear primero); el campo de
  código de barras sigue siendo opcional, así que quien no tiene un código
  para escanear puede tabular o hacer clic directo en "Nombre" sin fricción
  extra.
- [Bloquear el envío ante un duplicado detectado podría frustrar a alguien
  que sabe que el código es correcto pero cree — erróneamente — que el
  producto encontrado no es el mismo] → Mitigado por el enlace directo "Ver
  producto": la persona puede confirmar de un vistazo si es el mismo
  producto antes de decidir cambiar el código o abandonar el alta.

## Migration Plan

No aplica migración de datos ni de contrato; no hay estado persistido nuevo.
Las tres superficies (`ProductForm`, `PosView`, `InventoryView`) pueden
desplegarse juntas en un único deploy frontend, sin depender de ningún
cambio de backend ni de otro change frontend abierto.

## Rollback

Revertir los cambios en `ProductForm.tsx` (restaura el `toast` + redirect a
`/products`, el orden de campos actual, y quita la validación de duplicado
por código de barras), en `PosView.tsx` (restaura "Nueva venta" sin
"Inicializar stock") y en `InventoryView.tsx`/`app/(app)/inventory/page.tsx`
(deja de leer `product_id`) restaura el comportamiento actual sin ningún dato
persistido que deshacer.

## Open Questions

- ¿El criterio "última línea agregada al carrito" (Decisión 3) para
  "Inicializar stock" en POS es el esperado cuando una venta tiene varios
  productos distintos, o el dueño prefiere otro criterio (por ejemplo, el de
  mayor cantidad, o no ofrecer el botón cuando hay más de un producto)? No
  bloquea la implementación: el criterio queda documentado y es fácil de
  ajustar después si hace falta.
