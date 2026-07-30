# Requirement Context: fix-frontend-nav-typography-color

## Objective

Cerrar tres hallazgos de una auditoría UX/UI ya hecha (mediciones en vivo +
barrido estático de código) que hoy degradan la credibilidad visual del panel
de administración: (1) el nav superior se rompe físicamente en tablet/laptop
— hay contenido de navegación inalcanzable sin scroll horizontal en las
resoluciones que este mismo proyecto ya marcó como prioritarias para POS y
tablet; (2) el sistema tipográfico y de densidad tiene el mismo rol visual
resuelto de 3 y 4 formas distintas sin criterio documentado, lo que hace que
un número de KPI compita con el título de la pantalla y que pantallas
equivalentes (lista vs. tabla, entidad vs. entidad) se sientan inconsistentes;
(3) las cards de resumen de ventas del día no diferencian visualmente sus 5
métricas, a pesar de que el proyecto ya tiene una paleta dedicada por método
de pago. Es 100 % frontend — ningún endpoint nuevo, ningún tipo nuevo.

## Current behavior

**Hallazgo 1 — Nav.tsx se rompe en tablet/laptop**

`src/components/shell/Nav.tsx:80-139` renderiza, en una sola fila `md:flex`
(desde 768px, línea 92), el logo, hasta 8 ítems de nav (`items.map`, línea
93-111), el chip de rol (línea 113-115, `hidden … md:inline-block`) y — para
roles sin `admin` — el botón "Cerrar sesión" con texto (línea 129-137,
`md:flex`). Para `admin` (que ve los 8 ítems completos: Ventas, Historial,
Productos, Inventario, Recepción, Categorías, Usuarios, Reportes —
`src/lib/nav.ts:3-12`), el botón de logout se reemplaza por el trigger del
menú móvil sólo bajo `md:hidden` (línea 116-128), así que en `md:` (≥768px)
sigue siendo el logout de texto el que compite por espacio.

Medido en vivo por la auditoría (`document.documentElement.scrollWidth` vs.
`clientWidth`, logueado como admin): overflow horizontal de 513px en
768×1024, 257px en 1024×768, 65px en 1280×800, 22px en 1366×768, 0 en
1440×900. Verificado contra el código: no hay `overflow-x`, `wrap`, ni
step-down de espaciado condicionado a un breakpoint intermedio entre `md`
(768px) y ningún otro punto de corte — el layout pasa de "una columna" (nav
oculto, drawer) a "todo en una fila sin más ajuste" en el mismo salto de
768px. `MobileNavDrawer.tsx` (`useDrawerNav = isAdmin`, línea 61) sólo se
renderiza bajo `md:hidden`; no participa del problema y no se toca.

1024×768 y 1366×768 están marcados como resoluciones **prioritarias de POS**
en `ai/skills/ux-ui-supervisor/references/responsive-design.md:200-213` y su
checklist gemelo (`checklists/responsive-review.md:10-14`); 768×1024 está
listado ahí mismo como "tablet vertical". El propio código de `Nav.tsx`
(comentario `nav-mobile-admin-drawer`, línea 49-58) documenta que una tablet
en soporte de kiosco ya fue un caso de uso relevante en un pase anterior de
este proyecto.

**Hallazgo 2 — Consistencia tipográfica y de densidad**

Verificado contra código, todas las citas del pedido original están vigentes:

- `src/components/ui/StatCard.tsx:26-29` (`valueSizes`): `compact` resuelve a
  `text-lg sm:text-2xl` → 24px/600 en desktop (`sm:` ≥640px), igual que
  `src/components/ui/PageHeader.tsx:35` (`text-2xl font-semibold`, el `<h1>`
  de cada pantalla admin).
- 4 implementaciones del mismo patrón "KPI tile": `StatCard size="compact"`
  (`src/components/reports/ReportsView.tsx:109-120` y
  `src/components/sales/SalesView.tsx:476-508`, esta última confirmada línea
  por línea) vs. markup ad hoc en `src/components/reports/SalesReportView.tsx`
  función `SummaryTiles` (confirmada en 161-181: `Card` + `text-sm` +
  `text-2xl font-semibold`, sin ícono ni step-down responsive) y
  `src/components/reports/InventoryValuationView.tsx:51-78` (mismo patrón,
  `text-2xl font-semibold`, sin ícono).
- "Total destacado" en `text-lg font-semibold`: confirmado en
  `ProductsView.tsx:150`, `ReceivingListView.tsx:157`,
  `InventoryView.tsx:222` (además con color condicional a stock bajo),
  `ReceivingDetailView.tsx:161`, `PosView.tsx:660`. `ReturnHistory.tsx:76` usa
  `text-sm font-semibold` para el mismo rol (total de una devolución) — la
  única instancia divergente del grupo.
- Section header (`<h2>`) en 3 estilos, confirmados: eyebrow
  `text-xs font-semibold uppercase tracking-wide text-text-muted`
  (`PageHeader.tsx:31`, y como `<h2>` de sección en
  `ReportsView.tsx:100,222,279,319`); `text-sm font-medium text-text-secondary`
  (`ReturnHistory.tsx:46`, `SaleDetail.tsx:138,203`); `text-lg font-semibold`
  (`Dialog.tsx:50`, `UserDetailView.tsx:142,269`).
- `LineChart.tsx:209`: `text-[15px]` en el label del punto marcado, frente a
  `text-xs` del tooltip del mismo componente (confirmado alrededor de la
  línea 257). **Corrección al hallazgo original**: no es el único valor fuera
  de escala del archivo — `LineChart.tsx:159` y `:173` usan `text-[14px]`
  para las etiquetas de eje (14px coincide con `text-sm`, así que no cambia
  el tamaño visual, pero también es un literal en vez de una clase de la
  escala). Se documenta la corrección; ver `Out of scope` sobre si se
  incluye la limpieza de esos dos.
- `size-4.5` (18px): confirmado en `StatCard`-consumers (`ReportsView.tsx`,
  `SalesView.tsx`), y además en `Dialog.tsx`, `Toast.tsx` y
  `MobileNavDrawer.tsx` — más lugares que los citados en el pedido original,
  mismo hallazgo (paso de ícono no documentado entre 16px nav desktop y 20px
  nav mobile).
- Densidad lista vs. tabla: confirmado — `InventoryView.tsx` y
  `CategoriesView.tsx` usan `text-base` (16px) para el nombre/label
  principal; `ProductsView.tsx` y `SalesView.tsx` usan `text-sm` (14px) para
  el mismo rol, incluido el colapso a card mobile de `ProductsView.tsx`
  (`text-base` nombre / `text-lg` precio, línea ~150).
- Historial de ventas mobile (390px): `SalesView.tsx:475`
  (`grid grid-cols-2 gap-3 md:grid-cols-3 …`) con 5 `StatCard`, el quinto con
  `col-span-2` (línea 502) — confirma matemáticamente 3 filas en mobile (2+2+1
  con el 5º ocupando su propia fila completa) antes de llegar al buscador o
  la tabla.
- `ui/Table.tsx` y `ui/Badge.tsx`: no se tocan (fuera de este hallazgo, ya
  confirmados consistentes).

No hay ningún requirement normativo en `openspec/specs/ui-foundation/spec.md`
ni en `ai/context/ui-system.md` que fije una escala tipográfica jerárquica
(h1/h2/KPI/total) o un set de pasos de tamaño de ícono — son huecos
descriptivos, no violaciones de un requirement escrito. `ui-system.md:22-38`
sólo documenta reglas de color, radios, sombras y las dos utilidades
`.data`/`.num`.

**Hallazgo 3 — Color en las cards de resumen de ventas del día**

`SalesView.tsx` función `SummaryCards` (línea 467-509) renderiza 5
`StatCard` — Ventas hoy, Total facturado, Efectivo, Tarjeta, Transferencia —
todos sin prop `tone`, por lo que los 5 caen en el default
`tone="neutral"` → `bg-primary-light text-primary` (`StatCard.tsx:6`), el
mismo tinte para las 5.

`StatCard` **ya tiene** un sistema de tono con 5 valores
(`StatCard.tsx:3-11`: `neutral | success | warning | error | info`), cada uno
mapeado a `bg-<token>/15 text-<token>`. Ningún consumidor actual pasa `tone`
— confirmado por `grep`: cero usos de `tone=` en `ReportsView.tsx` ni en
`SalesView.tsx`, los dos únicos consumidores de `StatCard` en todo `src/`.
Extender el mapa de tonos no rompe ningún caso existente.

**Ya existe un mapeo de color por método de pago**, pero está deliberadamente
acotado al selector de pago de POS: `PosView.tsx:34-61`
(`PAYMENT_SELECTED_STYLES`, comentario línea 35-41) usa los tokens
`--color-payment-cash`, `--color-payment-card`, `--color-payment-transfer`
(`globals.css:52-70`) — derivados en OKLCH, con un comentario extenso que
explica por qué **no** son los `--color-pastel-*` genéricos ni los tonos de
estado. El propio comentario de `globals.css:52-56` dice: "dedicated, muted
tones for the payment-method chips and the sale-confirmation action in
PosView" — no para otra pantalla.

Y esta acotación está además **fijada por un requirement normativo vigente**,
no sólo por un comentario de código:
`openspec/specs/ui-sales/spec.md:106` (requirement "Payment breakdown
display", agregado por el change ya archivado
`2026-07-29-add-frontend-sales-payments`, la fecha de hoy): *"This display
SHALL remain plain text, with no color coding — the dedicated payment-method
color is scoped to the POS payment selector only"*, con el escenario
`ui-sales/spec.md:116-118` explícito para Transferencia: *"displayed as
'Transferencia', in plain text with no color, the same treatment as cash and
card"*. Verificado en código: la fila de la tabla de `SalesView.tsx:584`
(`<Td>{paymentMethodLabels[method]}</Td>`) efectivamente respeta esto — texto
plano, sin color, por venta individual. Ver `Decisions made` / preguntas
bloqueantes: esto es un choque directo con el pedido del Hallazgo 3, no una
mera preferencia de estilo, y determina si el change necesita un delta de
`ui-sales`.

La paleta `chart-1..4` (`globals.css:31-39`) está validada por contraste y
separación CVD, pero documentada y usada exclusivamente para series de
gráfico (`ui-system.md:32-34`, `color-system.md:194-196,220-221`) — no se
recomienda reutilizarla para tiles de ícono fuera de un gráfico sin ampliar
esa política.

## Desired behavior

**Hallazgo 1**

- WHEN un usuario `admin` autenticado ve cualquier pantalla en un viewport
  ≥768px de ancho (`md:` y superior) THEN el header no produce overflow
  horizontal: `scrollWidth` del documento es igual a `clientWidth`, y los 8
  ítems de nav, el chip de rol y el control de cierre de sesión son
  alcanzables sin scroll horizontal.
- WHEN ese mismo usuario ve el header en 768×1024, 1024×768, 1280×800,
  1366×768 y 1440×900 THEN en cada uno de esos cinco anchos el resultado es
  el mismo: cero overflow — no sólo en el más ancho (1440×900), que es el
  único que hoy pasa.
- WHEN el ancho es <768px (`md:hidden`) THEN el comportamiento de
  `MobileNavDrawer.tsx` no cambia: mismo trigger, mismo contenido, mismo
  foco de apertura/cierre.
- El conjunto de 8 secciones visibles para `admin` no se reduce ni se oculta
  arbitrariamente: la solución vive en layout/espaciado/disposición dentro de
  `Nav.tsx`, no en quitar ítems.

**Hallazgo 2**

- WHEN se renderiza un `StatCard size="compact"` en desktop (≥640px) THEN su
  valor se ve **menor** que el `<h1>` de `PageHeader` (24px/600) — deja de
  competir en peso visual con el título de pantalla.
- WHEN se muestra un tile "KPI" en cualquiera de las 4 ubicaciones hoy
  divergentes (dashboard, historial de ventas, reporte de ventas,
  valorización de inventario) THEN el marcado es el mismo primitive
  (`StatCard size="compact"`), con ícono y el mismo step-down responsive.
- WHEN se muestra el total destacado de una fila/card de un listado (activo,
  orden de recepción, stock, devolución, cobro dividido) THEN su tamaño es
  consistente entre todas esas instancias — `ReturnHistory.tsx` deja de ser
  la única en `text-sm`.
- WHEN se usa un `<h2>` de sección THEN el estilo aplicado corresponde a uno
  de un pequeño número de niveles jerárquicos **documentados**, no a 3
  variantes sin criterio (ver `Decisions made`).
- WHEN se muestra el label de un punto de dato marcado en `LineChart` THEN su
  tamaño coincide con el del tooltip del mismo componente (mismo rol de
  dato, mismo tamaño).
- WHEN se compara el nombre/label principal de una fila en una pantalla tipo
  "lista" (Inventario, Categorías) contra una tabla real (Productos, Ventas)
  THEN usa `text-sm`, igual que las tablas — se unifica en vez de
  documentarse como patrón separado (ver `Decisions made`).
- WHEN se ve el Historial de ventas en 390px THEN las 5 cards de resumen
  ocupan como máximo 2 filas (no 3 como hoy), dejando la tabla/lista de
  ventas visible con menos de una pantalla completa de scroll antes del
  buscador (ver `Decisions made` para el criterio y las opciones de layout).

**Hallazgo 3**

- WHEN se muestran las cards "Efectivo", "Tarjeta" y "Transferencia" en el
  Historial de ventas THEN cada una usa un tinte de ícono propio, coherente
  con el color ya asociado a ese método de pago en el resto del sistema —
  sujeto a resolver el choque con `ui-sales/spec.md:106` (ver la pregunta
  bloqueante, más abajo).
- WHEN se muestran las cards "Ventas hoy" y "Total facturado" THEN mantienen
  un tratamiento visualmente distinto del de las 3 cards de método de pago
  (no se ven como un cuarto/quinto método de pago inventado).
- El color es siempre un refuerzo junto al ícono y al texto del label — nunca
  el único canal: cada card sigue diciendo "Efectivo"/"Tarjeta"/etc. en
  texto, como hoy.
- El contraste del ícono contra el fondo de su tile no baja del que ya
  ofrece el mapa `tileTones` actual de `StatCard` (`bg-<token>/15
  text-<token>`, o el patrón `bg-payment-* text-text-primary` ya usado en
  `PosView.tsx`, según cuál se adopte).

## Primary actor

Todos los roles autenticados, en distinta medida:

- **Hallazgo 1 (Nav)**: sólo `admin` — es el único rol con 8 ítems de nav en
  la fila `md:flex`; `cashier`/`inventory`/`receiving` (2 ítems cada uno) no
  desbordan a estos anchos.
- **Hallazgo 2 (tipografía/densidad)**: cruza roles según la pantalla —
  `admin`/`inventory` (Productos, Inventario, Categorías, Reportes),
  `admin`/`cashier` (Ventas, POS, devoluciones), `admin`/`receiving`
  (Recepción). `Dialog` es compartido por todos los roles.
- **Hallazgo 3 (color)**: `admin` y `cashier`, los dos roles que ven
  `SalesView` (`hasAnyRole` líneas 58-59) — la vista cajero
  (`CashierTodaySummaryCards`) y la vista admin (`DailySummaryCards`) usan el
  mismo componente `SummaryCards`, así que el cambio aplica a ambas por
  construcción.

## Roles and permissions

Sin cambios de permisos. Ninguno de los tres hallazgos toca `requireRole()`,
gates del backend, ni scopes por cajero. El chip de rol de `Nav.tsx` sigue
mostrando exactamente los mismos roles (`ROLE_META`); el fix de layout no
cambia qué se muestra, sólo cómo entra en la fila.

## Main user flow

No hay un flujo transaccional único — son correcciones puntuales sobre
pantallas ya existentes. Flujos representativos:

1. **Nav**: un admin abre sesión en una notebook de mostrador (1366×768) o
   una tablet vertical (768×1024) apoyada en el kiosco → navega entre
   secciones usando el nav superior → puede alcanzar y activar cualquiera de
   los 8 ítems, el chip de rol es legible, y puede cerrar sesión, todo sin
   scrollear el header.
2. **Tipografía/densidad**: un admin entra al dashboard de Reportes → el
   título de la pantalla (`<h1>`) sigue siendo el elemento de mayor peso
   visual aunque haya KPIs grandes debajo → navega a Reportes > Ventas o
   Valorización de inventario → los tiles de resumen tienen el mismo aspecto
   que los del dashboard, no un markup distinto.
3. **Color**: un cajero o admin entra a Historial de ventas → ve 5 cards de
   resumen del día → identifica de un vistazo cuál corresponde a cada método
   de pago por color, ícono y texto — sin que eso reemplace el texto como
   señal.

## UI states

Ningún hallazgo introduce un nuevo estado de carga/vacío/error: los tres son
ajustes visuales sobre datos que ya se cargan hoy. `SummaryCards` conserva
su `ListSkeleton`/`ErrorState` actuales (`SalesView.tsx:447-448,461-462`) sin
cambios; el color por tono se aplica sólo cuando `data` ya llegó. El fix de
`Nav.tsx` no depende de datos (roles ya vienen por prop). La consistencia
tipográfica no altera ningún estado, sólo el marcado/clases de cada uno.

## Keyboard and focus behavior

Sin cambios de foco ni de orden de tabulación en ninguno de los tres
hallazgos:

- Nav: el orden de los `Link` en el DOM no cambia (mismos 8 ítems), sólo su
  disposición visual/espaciado. Si la solución final introduce un elemento
  colapsable (p. ej. el chip de rol o el logout detrás de un control
  adicional en anchos intermedios), ese control nuevo necesita ser alcanzable
  por teclado y tener foco visible — mismo estándar que ya exige
  `ui-foundation/spec.md` ("Accessibility floor").
- StatCard/tipografía: ningún cambio de tamaño de fuente o de tono de color
  agrega o quita elementos interactivos; nada de esto es tabulable hoy
  (son `<p>`/`<h2>`, no controles) y sigue sin serlo.

## Responsive behavior

Es el eje central de los Hallazgos 1 y 2.8:

- Nav: el fix debe sostenerse en los 5 anchos medidos (768×1024, 1024×768,
  1280×800, 1366×768, 1440×900) y no puede regresar el comportamiento móvil
  (`<768px`, drawer) que hoy funciona.
- SalesView mobile (390px): reducir el espacio vertical de las 5 cards de
  resumen sin perder ninguna de las 5 métricas ni su ícono — máximo 2 filas,
  ver `Decisions made`.
- El resto de los ajustes de Hallazgo 2 (tamaños de texto, tonos) no cambian
  el comportamiento responsive existente de cada pantalla (mismos
  breakpoints `sm`/`md`/`xl` que ya usa cada `StatCard`/grid).

## Accessibility expectations

- El color de las cards de Hallazgo 3 es refuerzo, nunca el único
  diferenciador (`ai/skills/ux-ui-supervisor/references/color-system.md`,
  "No usar el color como único indicador") — cada card conserva su ícono y
  su texto de label.
- Contraste del ícono contra su tile ≥3:1 si se considera información (WCAG
  1.4.11, `references/accessibility.md:19-20`) — a verificar contra la
  superficie final elegida (tokens `--color-payment-*` o el patrón
  `bg-<token>/15` ya usado por `tileTones`).
- El fix de Nav no puede degradar el foco visible existente
  (`:focus-visible` global, `ui-system.md:85-86`) en ninguno de los 8
  `Link`, el chip o el logout.
- Ningún cambio tipográfico baja el contraste de texto por debajo de 4.5:1
  (o 3:1 si es texto grande) — aplica en particular a `ReturnHistory.tsx` si
  sube a `text-lg` (mismo color de texto, sólo cambia tamaño: no debería
  afectar contraste, pero se verifica).

## Copy and feedback

Ninguno de los tres hallazgos cambia copy visible. Las etiquetas "Ventas
hoy", "Total facturado", "Efectivo", "Tarjeta", "Transferencia",
"Cerrar sesión" y los 8 labels de `NAV_ITEMS` permanecen igual.

## Backend dependencies

Ninguna. Confirmado: `StatCard`, `SalesView` y `Nav` ya reciben toda la data
necesaria vía props/fetch existentes — `roles: Role[]` (prop, `Nav`),
`SalesSummaryByPaymentMethod` ya trae `by_payment_method.{CASH,CARD,TRANSFER}`
(`lib/salesSummary.ts:9-18`, ya consumido). No se agrega, cambia ni depende
de ningún endpoint.

## API contract

Ninguno nuevo. No se verificó necesidad de tocar el router del backend — los
tres hallazgos son estructura/CSS/tokens/props ya disponibles en el cliente.

## Data types

Sin cambios en `lib/types.ts` ni en `lib/salesSummary.ts`. Si se extiende el
`tone` de `StatCard` con nuevos valores (p. ej. para los 3 tonos de método de
pago), es una extensión del `type Tone` local de `StatCard.tsx` — no toca
tipos de dominio ni respuestas del backend.

## Error behavior

Sin cambios. `ErrorState`/`onRetry` de `SummaryCards` y del resto de las
vistas tocadas no se modifican.

## Edge cases

- Nav: rol combinado que igual dispara el drawer (`admin` + otro rol,
  comentario `Nav.tsx:52-58`) — el fix de la fila desktop no debe alterar esa
  lógica de decisión drawer-vs-fila, sólo el layout dentro de la fila.
- Historial de ventas con `total_sales = 0` (día sin ventas): las 5 cards
  siguen mostrando 0/$0 — el tono de color no depende de si el monto es
  distinto de cero.
- `ReturnHistory.tsx` con una devolución de monto muy alto: al subir a
  `text-lg`, confirmar que no rompe el layout del header
  (`flex flex-wrap items-baseline justify-between`, línea ~64) — ya usa
  `flex-wrap`, debería tolerarlo.
- `LineChart` con series muy cortas (pocos puntos): el label del punto
  marcado sigue apareciendo aunque cambie de tamaño; no depende de la
  cantidad de datos.

## Affected routes

Ninguna ruta nueva. Rutas existentes cuyo contenido visual cambia:
`(app)/*` (todas, por el header `Nav`), `/sales` (Hallazgo 2.3, 2.8 y 3),
`/products`, `/inventory`, `/categories`, `/receiving`, `/receiving/[id]`,
`/reports`, `/reports/sales`, `/reports/inventory-valuation`, `/users/[id]`,
`/` (POS, sólo por el total del pago dividido, `PosView.tsx:660`).

## Affected components

- `src/components/shell/Nav.tsx` (Hallazgo 1) — no se toca
  `MobileNavDrawer.tsx`.
- `src/components/ui/StatCard.tsx` (Hallazgo 2.1, y 3 si se extiende `tone`).
- `src/components/ui/PageHeader.tsx` (referencia, probablemente sin cambios —
  el ajuste es en `StatCard`, no en el `<h1>`).
- `src/components/ui/Dialog.tsx` (Hallazgo 2.4, título de diálogo).
- `src/components/reports/ReportsView.tsx` (Hallazgo 2.2, ya usa `StatCard`).
- `src/components/reports/SalesReportView.tsx` (`SummaryTiles`, Hallazgo
  2.2, migrar a `StatCard`).
- `src/components/reports/InventoryValuationView.tsx` (Hallazgo 2.2, migrar
  a `StatCard`).
- `src/components/reports/charts/LineChart.tsx` (Hallazgo 2.5).
- `src/components/products/ProductsView.tsx` (Hallazgo 2.3 total destacado;
  referencia de densidad de tabla ya correcta en `text-sm`, no cambia por
  Hallazgo 2.7).
- `src/components/receiving/ReceivingListView.tsx`,
  `ReceivingDetailView.tsx` (Hallazgo 2.3).
- `src/components/inventory/InventoryView.tsx` (Hallazgo 2.3 total
  destacado; Hallazgo 2.7 densidad — `text-base` → `text-sm` en el nombre
  de fila principal).
- `src/components/pos/PosView.tsx` (Hallazgo 2.3 total del pago dividido;
  también referencia de los tokens `--color-payment-*` para el Hallazgo 3 —
  no se modifica salvo que se decida ampliar esa convención).
- `src/components/returns/ReturnHistory.tsx` (Hallazgo 2.3 y 2.4).
- `src/components/sales/SaleDetail.tsx` (Hallazgo 2.4).
- `src/components/users/UserDetailView.tsx` (Hallazgo 2.4).
- `src/components/sales/SalesView.tsx` (Hallazgo 2.8 y 3, función
  `SummaryCards`).
- `src/components/categories/CategoriesView.tsx` (Hallazgo 2.7 —
  `text-base` → `text-sm` en el nombre de fila principal).

No se abrió `src/components/categories/CategoriesView.tsx` línea por línea
(fuera de presupuesto): la cita de "usa `text-base`" viene del pedido
original, tomada como vigente. Quien escriba el change confirma la línea
exacta al tocar el archivo.

## Affected libraries

Ninguna lógica nueva de `lib/`. Los tres hallazgos son de presentación
(clases Tailwind, props de componentes de `ui/`), no de cómputo — no hay
nada aquí que sea "computable sin React" en el sentido de
`frontend-conventions.md`. Si se extiende `StatCard`'s `tone`, el mapa de
tonos vive donde ya vive hoy (`StatCard.tsx`, objeto local), siguiendo el
mismo patrón que `PAYMENT_SELECTED_STYLES` en `PosView.tsx` — un `Record`
en el componente, no en `lib/`.

## Affected capabilities

- **`ui-foundation`** (Hallazgo 1 y transversalmente Hallazgo 2): toca
  `Role-gated navigation shell` y la superficie de `Shared UI kit`
  (`StatCard`, `Dialog`) sin contradecir ningún escenario existente de
  `openspec/specs/ui-foundation/spec.md`. Ningún escenario ahí fija hoy un
  comportamiento de no-overflow por breakpoint — quien escriba el change
  decide si conviene agregar un escenario nuevo o tratarlo como corrección
  de bug sin delta de spec.
- **`ui-sales`** (Hallazgo 3): choca potencialmente con el requirement
  `Payment breakdown display` (`openspec/specs/ui-sales/spec.md:105-118`).
  Si la resolución de la pregunta bloqueante implica colorear por método
  de pago fuera del selector de POS, este change necesita un delta que
  amplíe o acote ese requirement — no puede implementarse en silencio contra
  un SHALL vigente.
- **`ui-reports`** (Hallazgo 2.2, opcional): la extensión de color a
  `ReportsView` (fuera de alcance obligatorio, ver `Out of scope`) tocaría
  esta capability si el usuario la pide.
- **`ui-pos`**, **`ui-catalog`**, **`ui-inventory`**, **`ui-returns`**,
  **`ui-users`**: tocadas sólo superficialmente por Hallazgo 2 (tamaños de
  texto), sin cambio de comportamiento funcional ni de ningún escenario
  normativo existente en sus specs.

Nota aparte (no bloqueante para este change): `openspec/specs/ui-pos/spec.md`
todavía tiene el requirement `Single payment method per sale` en vez de
`Payment composition`, aunque el change que lo reemplazaba
(`2026-07-29-add-frontend-sales-payments`) ya está archivado y el código
(`PosView.tsx`, `splitPayments`) ya soporta pago dividido. Es una spec
desincronizada, no algo que este change deba resolver — se señala porque
quien escriba el proposal puede toparse con la misma inconsistencia al citar
`ui-pos`.

## Testing implications

No hay tests de componente en este repo (`ai/context/testing.md`). Ninguno
de los tres hallazgos agrega lógica a `lib/`, así que no hay nada nuevo
testeable con Vitest. Verificación manual esperada:

- Nav: los 5 anchos medidos por la auditoría, repetidos post-fix
  (768×1024, 1024×768, 1280×800, 1366×768, 1440×900), confirmando
  `scrollWidth === clientWidth` y que los 8 ítems + chip + logout son
  alcanzables sin scroll horizontal.
- Tipografía: comparación visual antes/después de `StatCard` compact vs.
  `PageHeader` h1; de los 3 estilos de `<h2>` colapsados al criterio elegido.
- Color: prueba en escala de grises (DevTools) para confirmar que las cards
  siguen siendo identificables sin color (texto + ícono alcanzan); medición
  de contraste del ícono sobre su tile.
- `npm run lint` y `npm run build` (toca `.tsx` y potencialmente el `type
  Tone` de `StatCard.tsx`); `npm test` no debería verse afectado si no se
  toca `lib/`.

## Deployment considerations

Ninguna. Sin endpoints, sin migración de datos, sin orden de despliegue —
puede desplegarse solo, en cualquier momento, sin coordinación con el
backend ni con otros changes de frontend en curso
(`add-frontend-cashier-shift-closing`, `add-frontend-suppliers-purchasing`,
`add-frontend-user-roles-and-receiving` no tocan estas superficies).

## Out of scope

- Rediseño completo del design system o de la escala tipográfica más allá de
  los puntos concretos listados en Hallazgo 2.
- Cualquier cambio en `ui/Table.tsx` o `ui/Badge.tsx` (ya confirmados
  consistentes por la auditoría).
- Extender el tratamiento de color a los tiles equivalentes de
  `ReportsView.tsx` (dashboard) — se señala como extensión opcional, no se
  incluye salvo pedido explícito.
- Normalizar `LineChart.tsx:159,173` (`text-[14px]` → `text-sm`) — mismo
  valor visual, cambio de higiene de código; se deja fuera del alcance
  obligatorio salvo que se pida explícitamente al escribir el change.
- Cualquier cambio de permisos, roles, endpoints o tipos de dominio.
- Sincronizar `ui-pos/spec.md` con el estado real de pago dividido (nota en
  `Affected capabilities`) — no es parte de este change.
- Rediseñar `MobileNavDrawer.tsx` o el bottom tab bar mobile — ninguno de los
  dos se toca.

## Decisions made

- **Un solo change bundled**, `fix-frontend-nav-typography-color` (nombre
  siguiendo la convención `fix-frontend-<tema>` ya usada por
  `fix-frontend-reports-dashboard-readability`; se prefiere sobre
  `ux-typography-nav-color-fixes` porque este repo no tiene precedente de
  prefijo `ux-` en `openspec/changes/`, y "fix" describe mejor tres
  correcciones sobre pantallas existentes que un "add"). Decisión explícita
  del usuario: no separar el bug de Nav de la unificación de consistencia.
- **Migrar `SalesReportView.SummaryTiles` e `InventoryValuationView`'s tiles
  a `StatCard size="compact"`** (Hallazgo 2.2) — recomendación explícita del
  usuario, adoptada tal cual.
- **Subir `ReturnHistory.tsx:76` a `text-lg font-semibold`** para alinear con
  el resto de "total destacado" (Hallazgo 2.3) — instrucción explícita del
  usuario, adoptada tal cual.
- **Jerarquía de `<h2>` recomendada** (Hallazgo 2.4), basada en el rol real
  de cada instancia relevada, a confirmar en `design.md`:
  - "Eyebrow / sección de un dashboard denso en datos" →
    `text-xs font-semibold uppercase tracking-wide text-text-muted` (se
    queda como está: `PageHeader` eyebrow, `ReportsView`, `PosView`).
  - "Subsección dentro de una pantalla de detalle" →
    `text-sm font-medium text-text-secondary` (se queda como está:
    `ReturnHistory`, `SaleDetail`). `UserDetailView.tsx:142,269`
    ("Credenciales", "Datos de perfil") cumple el mismo rol semántico hoy en
    `text-lg font-semibold` — candidato a bajar a este nivel por
    consistencia.
  - "Título de diálogo modal" → `text-lg font-semibold` se queda (`Dialog`
    es, en los hechos, el `<h1>` de su propio contexto modal — tamaño mayor
    justificado).
  - Si conviene un componente `SectionHeader` compartido (paralelo a
    `PageHeader`) para fijar esto en código en vez de en convención, es una
    decisión de composición de UI kit — se deja para quien escriba/ejecute
    el change (frontend-implementer + `ui-system.md`), no se fuerza acá.
- **`LineChart.tsx:209`**: unificar el label del punto marcado a `text-xs`
  para igualar al tooltip (`:257`) — más consistente que subir el tooltip a
  15px, porque 15px no es un paso de la escala Tailwind y `text-xs` ya es el
  tamaño establecido para este tipo de dato en el mismo componente.
- **`size-4.5` (18px)**: se documenta, no se elimina — es el paso "ícono en
  contexto compacto" (cierre de diálogo, tile de `StatCard`, drawer, toast),
  distinto de 16px (nav desktop) y 20px (nav mobile). La forma de
  documentarlo (comentario en código vs. nota en `ai/context/ui-system.md`)
  se deja a quien implemente.
- **Densidad lista vs. tabla (Hallazgo 2.7): unificar a `text-sm`.**
  `InventoryView.tsx` y `CategoriesView.tsx` pasan de `text-base` a
  `text-sm` en el nombre/label principal de fila, igualando a
  `ProductsView.tsx`/`SalesView.tsx`. Motivo: no hay ningún requirement ni
  nota en `ui-system.md` que documente "vista lista" como un patrón de
  densidad intencional — es el único uso de `text-base` para ese rol en las
   2 pantallas de listado simple, contra 2 tablas ya en `text-sm`, y el resto
  del hallazgo (StatCard compact, paddings más chicos) ya empuja el sistema
  hacia más densidad, no menos. Queda revisable en `design.md` si al mirar
  las pantallas completas 16px se ve necesario para legibilidad de una
  columna ancha.
- **Cards de resumen mobile en Historial de ventas (Hallazgo 2.8): bajar de
  3 a máximo 2 filas en 390px.** El criterio de éxito es cuantitativo, no
  "que no ocupen toda la pantalla" (la vaguedad que dejó el pedido anterior
  sólo parcialmente resuelto). La elección entre las 3 opciones que planteó
  el pedido original (fila horizontal scrolleable, 3 columnas en vez de 2,
  padding/alto reducido) es una decisión de layout de `design.md` — las tres
  cumplen el criterio de 2 filas, ninguna se descarta acá.
- **Hallazgo 3, cards de método de pago (Efectivo/Tarjeta/Transferencia):
  PENDIENTE — depende de la pregunta bloqueante.** Si se resuelve a favor de
  colorear, reusar `--color-payment-cash/card/transfer` (ya validados, ya
  con la semántica correcta) en vez de inventar tokens nuevos o de tomar
  `chart-1..4` (reservada a series de gráfico) o de reutilizar
  `success/warning/error` (reservados a estado/evento, per
  `color-system.md`).

## Remaining non-blocking questions

- ¿Conviene crear un primitive `SectionHeader` compartido para los `<h2>` de
  sección, o alcanza con documentar la convención de 3 niveles en
  `ui-system.md` y aplicarla ad hoc en cada pantalla? No bloquea: ambas
  opciones producen el mismo resultado visual: se resuelve en `design.md`.
- ¿Se limpia también `LineChart.tsx:159,173` (`text-[14px]` → `text-sm`,
  mismo valor visual) en la misma pasada, ya que se está tocando el mismo
  archivo por el `text-[15px]`? No bloquea: es opcional, cero impacto visual.
- Extensión opcional a `ReportsView.tsx` con el mismo tratamiento de color
  del Hallazgo 3 (dashboard admin) — el usuario dijo explícitamente que no
  se da por incluida salvo pedido.

## Evidence consulted

- `ai/roles/requirement-analyst.md`, `ai/skills/analyze-frontend-requirement/SKILL.md`.
- `AGENTS.md`, `ai/context/module-map.md`, `ai/context/ui-system.md`.
- `ai/skills/ux-ui-supervisor/references/color-system.md`,
  `references/responsive-design.md`,
  `ai/skills/ux-ui-supervisor/checklists/responsive-review.md`,
  `references/accessibility.md` (umbrales de contraste citados).
- `openspec/specs/ui-foundation/spec.md` (completo).
- `openspec/specs/ui-sales/spec.md` (requirement "Payment breakdown
  display" y contexto).
- `openspec/specs/ui-pos/spec.md` (requirements "Single payment method per
  sale", "Atomic sale confirmation", "Cart feedback on scan" — para
  verificar el estado de "Payment composition").
- `openspec/changes/` (listado) y
  `openspec/changes/archive/2026-07-28-add-frontend-ux-polish/proposal.md`,
  `openspec/changes/archive/2026-07-29-add-frontend-sales-payments/specs/ui-sales/spec.md`
  (origen del requirement "Payment breakdown display").
- `src/components/shell/Nav.tsx`, `src/components/shell/MobileNavDrawer.tsx`,
  `src/lib/nav.ts`.
- `src/components/ui/StatCard.tsx`, `src/components/ui/PageHeader.tsx`,
  `src/components/ui/Dialog.tsx`.
- `src/components/sales/SalesView.tsx` (completo en las secciones citadas),
  `src/components/sales/SaleDetail.tsx`, `src/components/returns/ReturnHistory.tsx`.
- `src/components/reports/ReportsView.tsx`,
  `src/components/reports/SalesReportView.tsx`,
  `src/components/reports/InventoryValuationView.tsx`,
  `src/components/reports/charts/LineChart.tsx`.
- `src/components/products/ProductsView.tsx`,
  `src/components/inventory/InventoryView.tsx`,
  `src/components/receiving/ReceivingListView.tsx`,
  `src/components/receiving/ReceivingDetailView.tsx`,
  `src/components/users/UserDetailView.tsx`, `src/components/pos/PosView.tsx`.
- `src/lib/salesSummary.ts`, `src/app/globals.css` (bloque `@theme`
  completo).
- `ai/requirement-context-proveedores.md` (precedente de formato/ubicación
  de este documento).
