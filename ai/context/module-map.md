# Mapa de áreas del frontend

Una fila por área. **Roles** = los que pasa `requireRole()` en la página.
**Endpoints** = los paths que la view pasa a `api()` (sin `/api/v1`, ver
`api-contract.md`). Cuando una capability de OpenSpec todavía no existe para el
área, la columna lo dice explícitamente en vez de inventar un nombre.

Convenciones de archivo y de extensión general: `frontend-conventions.md`.

---

## Auth

| | |
|---|---|
| Rutas | `/login` (fuera de `(app)/`) · route handler `POST/DELETE /api/session` |
| Componentes | `src/app/login/page.tsx` → `src/app/login/LoginForm.tsx` |
| Libs | `lib/session.ts` (`getSession`, nombres de cookie, `BACKEND_URL`) |
| Roles | pública |
| Endpoints | vía `/api/session`: `POST /auth/login`, `POST /auth/logout` |
| Specs | `openspec/specs/ui-auth/spec.md` |
| Se toca al extender | `src/app/api/session/route.ts`, `lib/session.ts`, `src/app/login/LoginForm.tsx`, `src/app/(app)/layout.tsx` |

El login no usa `api()`: postea a `/api/session`, que es el único lugar que
habla con el endpoint de auth y escribe las cookies httpOnly.

## POS (`/`)

| | |
|---|---|
| Ruta | `src/app/(app)/page.tsx` |
| Componente | `src/components/pos/PosView.tsx` |
| Libs | `lib/money.ts`, `lib/types.ts` (`Product`, `ProductList`, `Sale`, `Stock`) |
| Roles | `cashier`, `admin` |
| Endpoints | `GET /products/barcode/{barcode}` · `GET /products` · `GET /inventory/stock/{product_id}` · `POST /sales` · `POST /sales/{id}/items` · `PUT /sales/{id}/payment` · `POST /sales/{id}/confirm` |
| Specs | `openspec/specs/ui-pos/spec.md` |
| Se toca al extender | `PosView.tsx`; la matemática nueva va a `lib/` con test |

Camino crítico del producto. El input de escaneo mantiene el foco después de
cada acción, un escaneo repetido incrementa cantidad, un producto desconocido o
inactivo muestra error inline y **no** entra al carrito. En un fallo de red
durante el confirm **nunca se asume éxito**: se relee la venta, el status del
backend manda.

## Products (`/products`)

| | |
|---|---|
| Rutas | `products/page.tsx` · `products/new/page.tsx` · `products/[id]/page.tsx` |
| Componentes | `ProductsView.tsx` (listado) · `ProductForm.tsx` (alta y edición) · `ProductDetail.tsx` |
| Libs | `lib/money.ts`, `lib/types.ts` |
| Roles | `inventory`, `admin` |
| Endpoints | `GET /products` · `GET /products/{id}` · `POST /products` · `PUT /products/{id}` · `POST /products/{id}/deactivate` · `POST /products/{id}/activate` · `GET /categories?limit=100` |
| Specs | `openspec/specs/ui-catalog/spec.md` |
| Se toca al extender | los tres componentes + `lib/types.ts` |

`ProductForm` sirve alta y edición según reciba o no un `product`; el mismo
patrón lo replica `UserForm`. `ProductDetail` recibe `role` como prop porque la
reactivación se oculta a roles no admin.

## Inventory (`/inventory`)

| | |
|---|---|
| Ruta | `inventory/page.tsx` |
| Componente | `InventoryView.tsx` (incluye el panel de movimientos y los diálogos de ajuste/mínimo) |
| Libs | `lib/inventory.ts` (`buildStockQuery`, `buildMovementsQuery`, `isRowLow`, `MOVEMENT_TYPE_LABELS`, `INVENTORY_PAGE_SIZE`), `lib/pagination.ts` |
| Roles | `inventory`, `admin` |
| Endpoints | `GET /inventory/stock?search=&limit=&offset=` · `GET /inventory/stock/{product_id}` · `POST /inventory/stock` · `POST /inventory/stock/{product_id}/adjust` · `PATCH /inventory/stock/{product_id}/minimum` · `GET /inventory/movements?…` · `GET /products` · `GET /categories?limit=100` |
| Specs | `openspec/specs/ui-inventory/spec.md` |
| Se toca al extender | `InventoryView.tsx` + `lib/inventory.ts` (query building y reglas de fila, con test) |

Es el archivo más grande del repo. Toda lógica nueva de filtros o de query
string va a `lib/inventory.ts`, no a la view. El ajuste exige motivo; el
mínimo se actualiza con `PATCH`, no `PUT`.

## Categories (`/categories`)

| | |
|---|---|
| Ruta | `categories/page.tsx` |
| Componente | `CategoriesView.tsx` |
| Libs | `lib/pagination.ts`, `lib/types.ts` |
| Roles | `admin` |
| Endpoints | `GET /categories?limit=&page=` · `POST /categories` · `PUT /categories/{id}` · `GET /products?limit=100` |
| Specs | `openspec/specs/ui-catalog/spec.md` |
| Se toca al extender | `CategoriesView.tsx` |

Sin borrado: sólo alta y renombre. Pide productos para mostrar el uso de cada
categoría.

## Users (`/users`)

| | |
|---|---|
| Rutas | `users/page.tsx` · `users/new/page.tsx` · `users/[id]/page.tsx` |
| Componentes | `UsersView.tsx` · `UserForm.tsx` · `UserDetailView.tsx` |
| Libs | `lib/pagination.ts`, `lib/types.ts` (`User`, `Role`) |
| Roles | `admin` |
| Endpoints | `GET /users?limit=&page=` · `GET /users/{id}` · `POST /users` · `PUT /users/{id}` (perfil) · `PATCH /users/{id}/deactivate` |
| Specs | capability `ui-users` — hoy vive sólo como delta en `openspec/changes/add-frontend-users/specs/ui-users/spec.md`; **no hay `openspec/specs/ui-users/`** todavía |
| Se toca al extender | los tres componentes, `lib/types.ts`, `lib/nav.ts` |

`UserDetailView` obtiene el detalle con `GET /users/{id}`; el listado paginado
queda exclusivamente para `/users`. El endpoint es admin-only, igual que el
resto del módulo.
El alta fija username y rol; no hay edición de contraseña ni reactivación.

## Sales (`/sales`)

| | |
|---|---|
| Rutas | `sales/page.tsx` · `sales/[id]/page.tsx` |
| Componentes | `SalesView.tsx` (listado + cards del día + herramienta de cierre) · `SaleDetail.tsx` |
| Libs | `lib/salesSummary.ts` (`buildSummaryQuery`, `normalizeByPaymentMethod`, `todayISO`, `PAYMENT_METHODS`), `lib/money.ts`, `lib/pagination.ts` |
| Roles | `admin`, `cashier` (ambas rutas) |
| Endpoints | `GET /sales?…` · `GET /sales/{id}` · `GET /reports/sales/summary?from=&to=` · `GET /users?limit=100` (sólo admin, alimenta el selector de cajero) |
| Specs | `openspec/specs/ui-cash-closing/spec.md`; el listado operativo vive como delta en `openspec/changes/add-frontend-sales-v15/specs/` |
| Se toca al extender | `SalesView.tsx`, `SaleDetail.tsx`, `lib/salesSummary.ts` |

El scope por cajero lo fuerza el backend; la UI no filtra por su cuenta. Para
un `cashier`, `SalesView` **no** pide `/users` (sería un `403` esperado).
Los totales del cierre vienen agregados del backend, nunca se suman en el
cliente.

## Returns

| | |
|---|---|
| Ruta | no tiene ruta propia: vive dentro de `/sales/[id]` |
| Componentes | `returns/ReturnForm.tsx` · `returns/ReturnHistory.tsx`, montados por `SaleDetail.tsx` |
| Libs | `lib/returns.ts` (`computeAvailability`, `sumReturnedByItem`, `computeNetTotal`, `buildReturnPayload`, `isValidReason`, `computeSelectionValue`) |
| Roles | `admin` (cualquier venta confirmada) · `cashier` (sólo ventas propias del mismo día, lo verifica el backend) |
| Endpoints | `POST /sales/{id}/returns` · `GET /sales/{id}/returns` |
| Specs | delta en `openspec/changes/add-frontend-sales-returns/specs/` |
| Se toca al extender | `lib/returns.ts` + `returns/*` |

Siempre contra una venta confirmada; nunca un reembolso suelto. El motivo es
obligatorio y la reintegración de stock la hace el backend.

## Reports (`/reports` + 4 subrutas)

| | |
|---|---|
| Rutas | `reports/page.tsx` · `reports/sales` · `reports/products` · `reports/purchases` · `reports/inventory-valuation` |
| Componentes | `ReportsView.tsx` (dashboard) · `SalesReportView.tsx` · `ProductsReportView.tsx` · `PurchasesReportView.tsx` · `InventoryValuationView.tsx` · `ReportNavCard.tsx` · `charts/LineChart.tsx` · `charts/BarChart.tsx` |
| Libs | `lib/reports.ts` (`addDays`, `fillDailySeries`, `previousPeriodRange`, `comparePeriods`, `presetRange`, `foldProductsIntoOtros`, `today`), `lib/money.ts` |
| Roles | `admin` en las cinco rutas (el backend monta todo `/api/v1/reports/` como admin-only) |
| Endpoints | `GET /reports/sales/summary?from=&to=[&group_by=day]` · `GET /reports/products/top?…` · `GET /reports/products?…` · `GET /inventory/valuation` · `GET /suppliers` · `GET /purchase-orders?…` |
| Specs | `openspec/specs/ui-reports/spec.md` + delta en `openspec/changes/add-frontend-reports-dashboard/specs/` |
| Se toca al extender | la view del reporte + `lib/reports.ts` (con test) + `ReportsView.tsx` si suma una card de navegación |

**La agregación siempre viene del backend.** Lo único permitido en el cliente
es *display shaping* (rellenar el eje de fechas, plegar la cola larga en
"Otros", restar dos totales ya calculados por el backend) y vive en
`lib/reports.ts`. Derivar un agregado a partir de filas crudas paginadas está
prohibido — el razonamiento está en `add-frontend-reports-dashboard/design.md`.

Los gráficos son SVG propio: una serie → `primary`; 2+ categorías →
`chart-1..4` en orden fijo, sin ciclar.

## Shell

| | |
|---|---|
| Archivos | `src/app/layout.tsx` (root) · `src/app/(app)/layout.tsx` · `components/shell/Nav.tsx` · `components/shell/SectionTransition.tsx` |
| Libs | `lib/nav.ts` (`NAV_ITEMS`, `homeFor`), `lib/session.ts`, `lib/roles.ts` |
| Specs | `openspec/specs/ui-foundation/spec.md` |
| Se toca al extender | agregar una ruta ⇒ entrada en `NAV_ITEMS`; agregar un rol ⇒ además `roleLabels` en `Nav.tsx` y el tipo `Role` |

`Nav` recibe el rol por prop y filtra `NAV_ITEMS`. El logout llama
`fetch("/api/session", { method: "DELETE" })` directo (no `api()`, porque no va
al backend) y después `router.push("/login")` + `router.refresh()`.

## UI kit

| | |
|---|---|
| Archivos | `components/ui/`: `Button`, `Input` (+`Select`), `Card`, `Badge` (+`pastelFor`), `Table`/`Th`/`Td`, `Dialog`, `Toast` (`ToastProvider`, `useToast`), `Spinner`, `states.tsx` (`LoadingState`, `Skeleton`, `ListSkeleton`, `EmptyState`, `ErrorState`) |
| Libs | `lib/motion.ts`, tokens de `src/app/globals.css` |
| Specs | `openspec/specs/ui-foundation/spec.md` (`Shared UI kit`, `Design system tokens`) |
| Se toca al extender | el primitive en sí — nunca estilo ad-hoc en la pantalla |

Detalle de variantes, tokens y cuándo extender: `ui-system.md`.

## API proxy

| | |
|---|---|
| Archivos | `src/app/api/backend/[...path]/route.ts` · `src/app/api/session/route.ts` · `lib/api.ts` |
| Roles | ninguno propio: reenvía el token y el backend decide |
| Se toca al extender | casi nunca. El proxy es agnóstico del path; un endpoint nuevo **no** requiere tocarlo |

Contrato completo: `api-contract.md`.
