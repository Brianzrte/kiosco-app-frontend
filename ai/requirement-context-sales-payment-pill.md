# Requirement Context: sales-list-payment-pill-and-page-fit

## Objective

Hoy, en Historial de ventas (`/sales`), el cajero o admin no puede ver de un
vistazo con qué método se pagó cada venta sin entrar al detalle, y una lista
de 20 filas por página fuerza scroll de página. El objetivo es que la lista
muestre el método (o los métodos, si el pago fue dividido) directamente en la
fila, con el mismo lenguaje visual que ya usa la columna Estado (`Badge`
sólido, color + texto), y que la cantidad de filas por página se ajuste a la
pantalla disponible en vez de un tamaño fijo que desborda la ventana — el
mismo mecanismo que ya resuelve este problema en Inventario.

## Current behavior

- `SalesTable` (`src/components/sales/SalesView.tsx:333-452`) renderiza dos
  columnas de estado/fecha/total pero **no tiene columna de método de pago**.
  Las columnas actuales son: Número, Estado, Cajero (si `showCashier`),
  Confirmada/Creada, Total.
- El tamaño de página es fijo: `const PAGE_SIZE = 20;`
  (`SalesView.tsx:40`), usado tanto para el `fetcher` como para
  `computeTotalPages`. No hay ningún ajuste según el alto de la ventana.
- `Table` (`src/components/ui/Table.tsx:1-14`) sólo declara
  `overflow-x-auto` (scroll horizontal); no hay ningún límite ni scroll
  vertical propio. Con 20 filas, la tabla desborda el viewport y fuerza
  scroll de página — coincide con la queja reportada.
- El estado y sólo el estado ya usa el patrón de pill sólida que el usuario
  pide replicar: `SaleStatusBadge` (`SalesView.tsx:454-459`) envuelve
  `Badge` con `tone={status === "confirmed" ? "success" : "warning"}`.
  `Badge` (`src/components/ui/Badge.tsx:45-56`) renderiza un `<span>` con
  fondo sólido de la `tone` + texto encima — nunca sólo color.
- El dato de pago **ya llega en la misma respuesta que alimenta la lista**:
  `OperationalSale.payments: SalePayment[]` (`src/lib/types.ts:44-53`), cada
  uno `{ id, method: "CASH" | "CARD" | "TRANSFER", amount }`. No hace falta
  ningún endpoint ni campo nuevo del backend.
- El precedente de "un pago sólo → método solo; dos o más → cada uno con su
  monto" ya existe, pero sólo en `SaleDetail.tsx:206-230`: si
  `sale.payments.length === 0` muestra el texto "Todavía no se registró
  ningún pago para esta venta."; si tiene 1+ payments, itera
  `sale.payments.map(...)` en el orden que llega del backend (sin reordenar)
  y sólo agrega el monto al lado si `sale.payments.length > 1`.
- El split de pago está limitado por diseño a 2 métodos como máximo
  (Efectivo/Tarjeta): `lib/paymentComposition.ts` documenta explícitamente
  que Transferencia queda fuera del compositor de split. No existe hoy un
  caso real de 3 métodos en un mismo `payments[]`.
- Los tres colores pedidos por el usuario ya son tokens de diseño dedicados
  a método de pago, no inventados para este change: `--color-payment-cash:
  #c3ddc2` (verde), `--color-payment-card: #e5d2b0` (el "marrón" pedido —
  en realidad un beige/tostado tostado), `--color-payment-transfer:
  #b5dbee` (celeste) — `src/app/globals.css:64-66`, usados hoy en el
  selector de método de `PosView.tsx:91-99`. Son **distintos** de
  `--color-pastel-green`/`--color-pastel-blue` (`globals.css:23-26`, tonos
  "candy-bright" para otro uso, no method-specific).
- `InventoryView.tsx:91-119` ya resuelve "que la pantalla no haga scroll"
  sin librería nueva: mide la altura real de la lista ya renderizada
  (`el.getBoundingClientRect()`), calcula cuántas filas entran con
  `computeInventoryPageSize` (`src/lib/inventory.ts:28-41`: clamp
  `[INVENTORY_MIN_PAGE_SIZE=5, INVENTORY_MAX_PAGE_SIZE=15]`), se re-mide en
  `resize`, y siempre vuelve a página 1 cuando el tamaño de página cambia
  (cambia la aritmética de offset). `InventoryView` usa una única
  estructura `<ul>` responsive (`InventoryView.tsx:238-241`) — **no** tiene
  dos árboles DOM separados por breakpoint.
- `SalesTable`, en cambio, sí tiene dos árboles DOM separados:
  `<ul className="... md:hidden">` (cards, `SalesView.tsx:357-399`) y
  `<div className="hidden md:block"><Table>...</Table></div>`
  (`SalesView.tsx:400-449`). Cada uno tiene una altura de fila distinta.
- El requirement normativo vigente `ui-sales` → **"Payment breakdown
  display"** (`openspec/specs/ui-sales/spec.md`) hoy dice, en la superficie
  que este change toca: *"Wherever a single sale's payment is displayed —
  the sales list's payment-method column, a sale's detail view, and a
  return's line — the frontend SHALL render the payment breakdown returned
  by the backend as plain text, with no color coding."* Nombra
  explícitamente "the sales list's payment-method column" como cubierta por
  la regla de texto plano, aunque esa columna nunca llegó a implementarse
  en código (`tasks.md` del change que la introdujo, sección 7, sólo marca
  hecho el desglose en `SaleDetail.tsx` y en `SalesReportView.tsx`, no en
  `SalesTable`). La única excepción nombrada hoy es `SummaryCards` (acentos
  de color en icon-tile/borde de las cards agregadas del día), acotada y
  explícitamente no generalizable.
- `ReturnHistory.tsx` y `ReturnForm.tsx` (capability `ui-returns`) no
  renderizan ningún método de pago hoy — la cláusula "a return's line" del
  requirement es prospectiva, sin código asociado todavía.

## Desired behavior

- **WHEN** un Admin o Cajero abre Historial de ventas y la lista de escritorio
  se renderiza, **THEN** cada fila muestra una nueva columna "Medio de pago"
  con un `Badge` sólido (fondo de color pleno + texto del método) usando los
  tokens `--color-payment-cash` (verde, "Efectivo"), `--color-payment-card`
  (marrón/beige, "Tarjeta") o `--color-payment-transfer` (celeste,
  "Transferencia").
- **WHEN** una venta tiene un único pago, **THEN** se muestra un solo pill con
  el método correspondiente, sin monto.
- **WHEN** una venta tiene dos pagos (pago dividido), **THEN** se muestran los
  dos pills, uno junto al otro, en el orden en que llegan en
  `sale.payments[]` (sin reordenar por método), cada uno con su color y su
  texto de método — sin monto, salvo que el usuario decida más adelante que
  el monto también debe verse en la lista (ver `Remaining non-blocking
  questions`).
- **WHEN** una venta no tiene ningún pago registrado (borrador sin pago),
  **THEN** la celda muestra un guion (`—`), igual que la columna Número
  cuando `sale_number` es `null`.
- **WHEN** la lista de ventas se renderiza (desktop y mobile), **THEN** la
  cantidad de filas pedida al backend se ajusta a la altura disponible de la
  ventana (clamp `[5, 15]`, igual que Inventario) en vez del `PAGE_SIZE = 20`
  fijo actual, de forma que la pantalla no fuerce scroll vertical de página
  en un viewport de escritorio estándar.
- **WHEN** la ventana cambia de tamaño (resize, incluida una rotación de
  tablet), **THEN** el tamaño de página se recalcula y la vista vuelve a
  página 1.
- **WHEN** se muestra el detalle de una venta (`SaleDetail`) o la línea de
  una devolución, **THEN** el método de pago sigue en texto plano, sin
  color — este change no toca esas dos superficies.

## Primary actor

`admin` y `cashier`, los dos roles que hoy acceden a `/sales`
(`ai/context/module-map.md`: "Roles | `admin`, `cashier` (ambas rutas)").
`inventory` sigue redirigido fuera de la sección (comportamiento existente,
no tocado por este change).

## Roles and permissions

Sin cambios. El scope por cajero (ver sólo sus propias ventas) lo sigue
forzando el backend; la UI no filtra por su cuenta
(`ai/context/module-map.md`, sección Sales). Este change no agrega ni quita
ningún gate de rol — sólo agrega una columna y cambia la paginación, ambos
visibles para cualquier actor que ya ve la lista.

## Main user flow

1. El usuario (Admin o Cajero) abre `/sales`.
2. La lista carga con el tamaño de página que entra en la ventana actual sin
   forzar scroll.
3. Cada fila muestra, además de lo que ya muestra hoy, uno o dos pills de
   color con el/los método(s) de pago de esa venta (o un guion si aún no
   tiene pago).
4. Si el usuario cambia el tamaño de la ventana, la próxima carga ajusta
   cuántas filas pide y vuelve a página 1.
5. El usuario puede seguir entrando al detalle de una fila (comportamiento
   sin cambios); en el detalle, el método de pago se sigue mostrando en
   texto plano.

## UI states

- **Loading:** sin cambios — `ListSkeleton` (`SalesView.tsx:281`) mientras
  `data === null`.
- **Empty:** sin cambios — `EmptyState` con los mensajes ya existentes según
  filtro (`SalesView.tsx:282-291`). No aplica ningún estado nuevo por esta
  feature: no hay un "empty" específico de la columna de pago.
- **Error:** sin cambios — `ErrorState` con `onRetry` (`SalesView.tsx:278-279`).
  Ningún nuevo modo de error se introduce; el pill de pago sólo lee un campo
  que ya viene en la misma respuesta que hoy alimenta la tabla.
- **Success:** la fila muestra el pill (o los dos pills, o el guion) junto al
  resto de las columnas ya existentes.

## Keyboard and focus behavior

Sin cambios. La fila entera sigue siendo el target de activación por teclado
(`handleRowKeyDown`, `SalesView.tsx:348-353`, Enter/Space abre el detalle). El
pill de pago es puramente informativo, no interactivo — no agrega ni quita
paradas de tabulación.

## Responsive behavior

- **Desktop (`>= md`):** la columna nueva se agrega a `<Table>`, con el
  ajuste dinámico de `pageSize` (opción A de la ronda de preguntas, decidido
  por el usuario para el mecanismo de paginación y extendido por criterio
  propio a ambas vistas — ver más abajo).
- **Mobile (`< md`, `<ul>` de cards):** se agrega el/los pill(s) al layout de
  card existente (`SalesView.tsx:357-398`), y el ajuste dinámico de
  `pageSize` también aplica acá, midiendo la altura de la card en vez de la
  fila de tabla.

**Nota sobre la decisión de aplicar el ajuste dinámico a ambas vistas
(desktop y mobile):** esto no fue preguntado al usuario — se decidió por
criterio propio, siguiendo la instrucción de extender el patrón de
Inventory a los dos DOMs de `SalesTable`. Verificado el riesgo: `Inventory`
mide un único `<ul>` porque tiene una sola estructura responsive; `SalesTable`
tiene dos árboles DOM montados simultáneamente (uno oculto con `md:hidden` /
`hidden md:block`, no desmontado). Esto es generalizable sin complejidad
desproporcionada: alcanza con medir el árbol visible en cada momento (el
oculto por `display: none` devuelve una `getBoundingClientRect()` de alto
cero, así que se puede intentar medir ambos refs y quedarse con el que tenga
altura > 0, o resolver por breakpoint con `matchMedia("(min-width: 768px)")`
sin duplicar la lógica de cálculo — `computeInventoryPageSize` ya es
agnóstico de qué fila se mide, sólo recibe `rowHeight`/`listTop` como
parámetros). No se identifica un riesgo de peso que justifique acotar el
ajuste sólo a desktop; se recomienda seguir la instrucción tal cual, con la
única salvedad de que la implementación necesita **dos refs** (uno por
árbol) en vez del ref único de `InventoryView`, y ambos se deben re-medir en
el mismo efecto de `resize` (un cambio de ancho puede cruzar el breakpoint y
cambiar cuál de los dos se está midiendo).

## Accessibility expectations

- El color nunca es el único canal: cada pill lleva el texto del método
  (Efectivo/Tarjeta/Transferencia) igual que `SaleStatusBadge` ya hace con
  Confirmada/Borrador — decisión explícita del usuario (pregunta 2).
- El contraste de texto sobre los tres tokens de color
  (`--color-payment-cash/-card/-transfer`) debe verificarse contra
  `text-text-primary`, el mismo texto que ya usa `PosView.tsx:91-93` sobre
  los mismos fondos — no es un contraste nuevo, es el mismo par ya validado
  en el selector de pago del POS.
- Sin animación asociada a este cambio; no aplica `prefers-reduced-motion`.

## Copy and feedback

- Labels de método: "Efectivo", "Tarjeta", "Transferencia" — el diccionario
  ya existe en `SalesView.tsx` (`paymentMethodLabels`, línea 462) y en
  `SaleDetail.tsx` (línea 24-28); se reutiliza, no se inventa copy nuevo.
- Header de columna: pendiente de nombre exacto ("Medio de pago" vs "Pago")
  — no bloqueante, es una decisión de copy menor (ver `Remaining
  non-blocking questions`).
- Celda sin pago: guion `—`, igual que la columna Número
  (`SalesTable`, líneas 369/424) — decisión explícita del usuario
  (pregunta 3).
- Ningún mensaje de error o confirmación nuevo: esta feature no dispara
  ninguna acción, sólo lee datos que ya llegan con el fetch existente.

## Backend dependencies

Ninguna. `GET /sales` (el endpoint que ya alimenta `SalesTable`) ya devuelve
`payments: SalePayment[]` en cada `OperationalSale` (`src/lib/types.ts:44-53`).
No hace falta ningún campo nuevo, ningún endpoint nuevo, ni ningún
`backend-request.md`.

## API contract

Sin cambios. Se sigue consumiendo `GET /sales?status=&limit=&page=&...`
(`SalesView.tsx:96-107`), sólo que `limit` deja de ser el `PAGE_SIZE=20`
fijo y pasa a ser el resultado de `computeInventoryPageSize` (o su
equivalente adaptado a ventas). Ningún endpoint nuevo, ningún método nuevo.

## Data types

- No se agrega ningún campo a `OperationalSale` ni a `SalePayment`
  (`src/lib/types.ts:17-53`) — ya tienen todo lo necesario.
- Se agrega una `Tone` (o un mapeo equivalente) para tres nuevos colores de
  pill de método de pago en `src/components/ui/Badge.tsx`, ya que las
  `tones` existentes (`pastel-green`, `pastel-peach`, `pastel-blue`, etc.)
  usan tokens `--color-pastel-*` distintos de los tokens
  `--color-payment-cash/-card/-transfer` que el usuario pidió replicar
  (`globals.css:23-26` vs `:64-66`). Esto es una decisión de implementación
  para quien escriba el change (nombre de la tone, si vive en `Badge.tsx` o
  en un componente `PaymentMethodBadge` dedicado en `sales/`), no un
  requisito de producto — se deja anotado acá para que `design.md` lo
  resuelva, no para que el requirement-analyst lo decida.

## Error behavior

Sin cambios: ningún nuevo modo de error. El pill de pago sólo renderiza un
campo que ya está en la respuesta actual; si esa respuesta falla, ya se
maneja con el `ErrorState` existente (`SalesView.tsx:278-279`).

## Edge cases

- Venta sin pagos (borrador) → guion, resuelto (pregunta 3).
- Venta con un único pago → un solo pill, sin monto.
- Venta con dos pagos (split Efectivo/Tarjeta) → dos pills, sin monto, en el
  orden que llega el array.
- Venta histórica migrada con un único pago migrado (mencionada en el
  requirement de payments ya archivado) → se muestra igual que cualquier
  venta de un solo pago, sin tratamiento especial.
- Ventana muy angosta o muy baja (viewport chico) → `computeInventoryPageSize`
  ya clampea a un mínimo de 5 filas; se reutiliza el mismo clamp para ventas
  salvo que el usuario decida otros límites (no bloqueante, ver abajo).
- Cambio de ancho que cruza el breakpoint `md` mientras la lista está
  montada → ver la nota de riesgo en `Responsive behavior`: hay que re-medir
  el árbol que pasa a estar visible, no sólo el que estaba visible antes del
  cruce.

## Affected routes

`src/app/(app)/sales/page.tsx` — sin cambio de gate de rol, sólo renderiza
`SalesView` como ya hace hoy.

## Affected components

- `src/components/sales/SalesView.tsx` — `SalesTable` gana la columna/celda
  de método de pago (desktop y mobile) y el mecanismo de `pageSize` dinámico
  reemplaza al `PAGE_SIZE` fijo.
- `src/components/ui/Badge.tsx` — nueva(s) `tone`(s) para los tres colores
  de método de pago, o un componente dedicado que las use (decisión de
  `design.md`, no de este documento).
- No se toca `SaleDetail.tsx` ni `ReturnHistory.tsx`/`ReturnForm.tsx`: siguen
  en texto plano, sin color, por decisión explícita del usuario (pregunta 1).

## Affected libraries

- `src/lib/inventory.ts` — `computeInventoryPageSize` (y sus constantes
  `INVENTORY_MIN_PAGE_SIZE`/`INVENTORY_MAX_PAGE_SIZE`) es hoy un nombre y un
  módulo específicos de Inventario. Este change necesita la misma lógica
  pura para Sales; queda para `design.md` decidir si se generaliza el
  nombre/ubicación (p. ej. moverla a `lib/pagination.ts` como utilidad
  compartida) o si se duplica una versión equivalente en un nuevo
  `lib/sales.ts` — cualquiera de las dos es computable sin React y
  testeable en Node, que es el motivo por el que no puede quedar inline en
  la view.
- Posible `lib/sales.ts` nuevo (hoy no existe: la query de `/sales` se arma
  inline en `SalesView.tsx:96-107`, a diferencia de `buildStockQuery` en
  `lib/inventory.ts` para Inventario) si `design.md` decide extraer también
  la construcción de query — no es parte obligatoria de este pedido, pero
  es el lugar natural si se toca esta view de todos modos.
- No se toca `lib/salesSummary.ts` ni `lib/paymentComposition.ts`: la
  columna de la lista lee `sale.payments` directamente, no pasa por
  agregación.

## Affected capabilities

- `ui-sales` — se **modifica** el requirement "Payment breakdown display"
  (ver `Decisions made`).
- `ui-foundation` (si los `Tone` de `Badge` viven ahí) o `ui-sales` (si el
  pill de método de pago se resuelve como componente propio de la
  capability) — a decidir en `design.md`; no es una decisión de producto.
- No toca `ui-inventory`: sólo se reutiliza su patrón de paginación, no se
  modifica ese requirement.

## Testing implications

- Testeable en `lib/*.test.ts` (entorno Node, sin componente):
  - la lógica de `computeInventoryPageSize` (o su equivalente para Sales)
    ya tiene precedente de test en `lib/inventory.test.ts`; el mismo
    conjunto de casos (clamp mínimo/máximo, `rowHeight <= 0`, ventana chica)
    debería replicarse para la versión usada por Sales.
  - una función pura que decida el texto/orden a mostrar para
    `sale.payments` (p. ej. "un solo pago → método solo; 2+ → cada uno con
    su método, sin reordenar") es candidata a vivir en `lib/` con test,
    igual que `normalizeByPaymentMethod` ya vive en `lib/salesSummary.ts`
    con test — evita que esa regla de "no colapsar en Mixto" quede sólo en
    la view.
- No testeable automáticamente (verificación manual, no hay tests de
  componente en este repo): que el pill se vea con el color y el texto
  correctos en pantalla, que el ajuste dinámico de página realmente evite
  el scroll en una ventana de escritorio estándar, y que el resize
  recalculo funcione al cruzar el breakpoint `md`.

## Deployment considerations

Ninguna migración ni orden de despliegue especial: no hay dependencia de
backend, no hay campo nuevo en ninguna respuesta, no hay compatibilidad
hacia atrás que romper. Es un cambio puramente de frontend sobre datos que
ya se reciben hoy.

## Out of scope

- No se toca `SaleDetail.tsx` ni la línea de una devolución: siguen en
  texto plano, sin color (decisión explícita del usuario, pregunta 1).
- No se agrega el monto de cada método al lado del pill en la lista (a
  diferencia de `SaleDetail`, que sí muestra el monto cuando hay 2+ pagos) —
  el usuario pidió "agregar los 2 métodos de pago" para el split, no pidió
  explícitamente el monto en la lista; queda como pregunta no bloqueante
  (ver abajo), no como parte de este alcance salvo que se confirme.
- No se toca `SummaryCards.tsx` ni su excepción de color ya aprobada — sigue
  como está, sin relación con este change.
- No se generaliza el patrón de paginación dinámica a ninguna otra pantalla
  además de Sales (Reports, Products, etc. quedan fuera).
- No se agrega ninguna librería de virtualización de listas; el mecanismo
  sigue siendo "medir y ajustar `limit`", igual que Inventario.
- No se cambia el criterio de scope por cajero, ni ningún otro filtro o
  permiso de `/sales`.

## Decisions made

1. **Conflicto con "Payment breakdown display" (pregunta 1):** se
   **modifica** ese requirement de `openspec/specs/ui-sales/spec.md`. La
   excepción de color se acota explícitamente a "the sales list's
   payment-method column"; el detalle de venta y la línea de una devolución
   siguen con la regla de texto plano sin color, tal como está hoy.
2. **Estilo del pill (pregunta 2):** sólido, mismo patrón que
   `SaleStatusBadge`/"Confirmada" — fondo de color pleno + texto del método
   adentro. El color nunca es el único canal.
3. **Venta sin pagos (pregunta 3):** guion `—`, igual que la columna Número
   cuando no hay dato.
4. **Mecanismo de paginación (pregunta 5 de la ronda original):** dinámico,
   igual que `InventoryView`/`computeInventoryPageSize` — mide altura
   disponible, ajusta filas, clamp 5–15, re-mide en `resize`, vuelve a
   página 1 al cambiar el tamaño.
5. **Alcance mobile del ajuste dinámico (pregunta 4 de la ronda original):**
   resuelto por criterio del agente, no por el usuario — se aplica a ambas
   vistas (desktop `<table>` y mobile `<ul>` de cards), midiendo la altura
   de fila que corresponda según qué árbol esté visible. Ver la nota de
   riesgo en `Responsive behavior`: no se identificó una razón de peso para
   acotarlo sólo a desktop, más allá de que la implementación necesita dos
   refs en vez de uno.

## Remaining non-blocking questions

- **Header de columna:** "Medio de pago" vs "Pago" vs otro texto — copy
  menor, no bloquea el requirement.
- **¿El pill de la lista muestra el monto además del método cuando hay 2+
  pagos**, igual que ya hace `SaleDetail`, o se queda sólo con el método (sin
  monto) para no saturar la fila? El pedido original del usuario ("agregar
  los 2 métodos de pago") no menciona el monto explícitamente — se asumió
  "sólo método" para la lista en este documento, pero es una decisión de
  diseño visual razonable de revisar en `design.md`, no bloqueante.
- **Nombre y ubicación del nuevo `Tone`/componente de pill de pago:** ¿tone
  nueva en `Badge.tsx` (p. ej. `payment-cash`/`payment-card`/
  `payment-transfer`) o un componente `PaymentMethodBadge` dedicado en
  `sales/`? Es una decisión de composición, no de producto — se resuelve en
  `design.md`.
- **Ubicación de la lógica de `pageSize` dinámico compartida con
  Inventario:** ¿se generaliza `computeInventoryPageSize` a
  `lib/pagination.ts`, o se duplica una versión equivalente en un
  `lib/sales.ts` nuevo? Tampoco es una decisión de producto.
- **Clamp de filas para Sales:** ¿se reutiliza el mismo `[5, 15]` de
  Inventario, o Sales necesita su propio rango (p. ej. porque una fila de
  venta con dos pills es más ancha/alta que una fila de stock)? No
  bloqueante — puede resolverse midiendo en el momento de implementar.

## Evidence consulted

- `openspec/specs/ui-sales/spec.md` — requirement "Payment breakdown
  display" (texto completo revisado, incluida la excepción de
  `SummaryCards`).
- `openspec/changes/archive/2026-07-29-add-frontend-sales-payments/proposal.md`
  y `tasks.md` (sección 7, "Desglose en listados") — confirma que la
  columna de la lista nunca se implementó pese a estar nombrada en el
  requirement.
- `src/components/sales/SalesView.tsx` (líneas 1-115, 260-459) —
  `SalesTable`, `SaleStatusBadge`, `PAGE_SIZE`, fetcher, diccionario
  `paymentMethodLabels`.
- `src/components/sales/SaleDetail.tsx` (líneas 24-28, 206-230) — precedente
  de texto plano, orden de `payments[]`, copy de "sin pagos".
- `src/components/inventory/InventoryView.tsx` (líneas 70-260) — mecanismo
  de medición y ajuste dinámico de `pageSize`, estructura de `<ul>` única.
- `src/lib/inventory.ts` (líneas 12-41) — `computeInventoryPageSize` y sus
  constantes.
- `src/lib/types.ts` (líneas 1-60) — `SalePayment`, `Sale`, `OperationalSale`,
  `OperationalSalesList`.
- `src/components/ui/Badge.tsx` (completo) — `Tone`, `tones`, `Badge`.
- `src/components/ui/Table.tsx` (completo) — confirma ausencia de límite
  vertical.
- `src/app/globals.css` (líneas 23-26, 49-66) — tokens `--color-pastel-*` vs
  `--color-payment-cash/-card/-transfer`.
- `src/components/pos/PosView.tsx` (líneas 78-114) — uso actual de los tres
  colores de método de pago y su contraste de texto.
- `src/lib/paymentComposition.ts` — confirma el límite de 2 métodos en el
  split.
- `src/components/returns/ReturnHistory.tsx`, `ReturnForm.tsx` — confirma
  que "a return's line" del requirement no tiene código asociado hoy.
- `ai/context/module-map.md` — sección Sales (rutas, componentes, libs,
  roles, endpoints, specs).
- Ronda de preguntas y respuestas del usuario (esta conversación).
