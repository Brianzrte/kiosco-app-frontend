# Contrato de acceso a datos

Camino completo y capas del proxy: `architecture.md`.

## `api<T>()` — el único fetch del cliente

`src/lib/api.ts`.

```ts
const list = await api<ProductList>("/products?limit=50");
await api("/categories", { method: "POST", body: { name } });
```

- **El path es el path del backend sin el prefijo `/api/v1`.** `api()` antepone
  `/api/backend`, y el proxy antepone `/api/v1`. Pasar `/api/v1/...` rompe la
  URL.
- `body` es un valor cualquiera y se serializa solo (`JSON.stringify`); no se
  pasa un string ya serializado. `Content-Type: application/json` va siempre,
  y `init.headers` puede sobrescribirlo.
- Devuelve el body parseado tipado como `T`. **No hay validación de runtime**:
  el tipo es una promesa, no una garantía. Los shapes viven en `lib/types.ts`.
- **Timeout de 15 s** (`REQUEST_TIMEOUT_MS`) vía `AbortController`.

## Cookies httpOnly

`kiosco_token`, `kiosco_role`, `kiosco_username` (`lib/session.ts`), escritas
por `POST /api/session` con `httpOnly`, `sameSite: "lax"`, `secure` en
producción, y `expires` tomado del `expires_at` del backend. **El token nunca
llega a JS del navegador.** No hay `localStorage`. Decisión cerrada.

Lado servidor, `getSession()` las lee con `cookies()` de `next/headers`.

## `ApiError`

```ts
class ApiError extends Error { status: number; message: string; kind: ErrorKind }
type ErrorKind = "network" | "timeout" | "server" | "unauthorized" | "forbidden" | "message";
```

Precedencia de mensajes: **si el backend mandó `{ message }`, ese mensaje gana
siempre** (`kind: "message"`). Sólo cuando no hay body parseable se usa el
vocabulario fijo en español de `TRANSPORT_TEXT` (red, timeout, 5xx, 403).

En la UI: mostrar `(e as ApiError).message` tal cual. No reescribir un fallo que
el backend ya explicó.

| Situación | `status` | `kind` |
|---|---|---|
| `fetch` rechaza | `0` | `network` |
| aborto por timeout | `0` | `timeout` |
| respuesta con `{ message }` | el del backend | `message` |
| `403` sin body | `403` | `forbidden` |
| `>= 500` sin body | el real | `server` |
| otro `4xx` sin body | el real | `message` (`"Error inesperado (n)"`) |

### 401 vs 403

- **`401`** → `api()` **redirige solo** a `/login` (`window.location.assign`) y
  además lanza. La sesión venció; no hay nada que reintentar. El proxy también
  devuelve `401` cuando falta la cookie.
- **`403`** → **se queda en la página**. La sesión es válida; lo que falta es
  permiso. `ErrorState` ofrece "Volver". Un `403` esperado por rol (p. ej. un
  cajero pidiendo `/users`) se evita no haciendo la llamada, no atrapándola.

## El proxy

`src/app/api/backend/[...path]/route.ts` exporta el mismo handler para GET,
POST, PUT, PATCH y DELETE. Reenvía método, query string y body; devuelve status
y cuerpo del backend sin reinterpretarlos. Sólo traduce un fallo de conexión a
`502` con `{ message }` en español. **Es agnóstico del path: un endpoint nuevo
no requiere tocarlo.**

## Convenciones de datos

- **Dinero: string decimal** (`"12.50"`) en el transporte, con `.` como
  separador decimal. Nunca float. Aritmética con `toCents`/`fromCents`, display
  con `formatMoney` (formato argentino: `$ 1.200,50`).
- **Errores**: `{ "message": "..." }`.
- **Timestamps**: RFC3339. Los rangos de reporte son días planos
  `"YYYY-MM-DD"`.
- Los agregados los calcula el backend; el cliente no recompone totales a
  partir de filas paginadas.

## Endpoints que el frontend consume hoy

Verificado leyendo las llamadas a `api()` en `src/` y contrastando contra
`../backend/internal/bootstrap/router.go` y los `routes.go` de cada módulo
(2026-07-28). **Esta lista es lo que se usa, no el catálogo del backend** — para
saber qué existe, la autoridad es el router del backend.

| Método y path | Dónde se usa |
|---|---|
| `POST /auth/login`, `POST /auth/logout` | vía `/api/session` |
| `GET /products`, `GET /products/{id}`, `GET /products/barcode/{barcode}` | POS, catálogo, inventario, categorías |
| `POST /products`, `PUT /products/{id}`, `POST /products/{id}/deactivate`, `POST /products/{id}/activate` | catálogo |
| `GET /categories` (con `limit`/`page`), `POST /categories`, `PUT /categories/{id}` | categorías, formularios |
| `GET /inventory/stock` (`search`/`limit`/`offset`), `GET /inventory/stock/{product_id}` | inventario, POS |
| `POST /inventory/stock`, `POST /inventory/stock/{product_id}/adjust` | inventario |
| `PATCH /inventory/stock/{product_id}/minimum` | inventario — **PATCH**, no PUT |
| `GET /inventory/movements` | panel de movimientos en `InventoryView` |
| `GET /inventory/valuation` | `/reports/inventory-valuation` |
| `GET /users` (`limit`), `POST /users`, `PUT /users/{id}`, `PATCH /users/{id}/deactivate` | usuarios; `GET /users` también alimenta el selector de cajero |
| `POST /sales`, `GET /sales/{id}`, `POST /sales/{id}/items`, `PUT /sales/{id}/payment`, `POST /sales/{id}/confirm` | POS y detalle de venta |
| `GET /sales` (`status`, `page`, `limit`, `cashier_id`, `from`, `to`, `sale_number`) | historial operativo |
| `POST /sales/{id}/returns`, `GET /sales/{id}/returns` | devoluciones |
| `GET /reports/sales/summary` (`from`, `to`, `group_by`) | cierre de caja y dashboard |
| `GET /reports/products/top` (`from`, `to`, `limit`) | dashboard |
| `GET /reports/products` (`from`, `to`, `sort`, `page`, `limit`) | `/reports/products` |
| `GET /suppliers`, `GET /purchase-orders` (`from`, `to`, `supplier_id`, `page`, `limit`) | `/reports/purchases`, sólo lectura |

Todo `/api/v1/reports/*` es **admin-only**: el backend monta el subárbol
completo detrás de `RequireRole(admin)`.

### Existen en el backend y ninguna pantalla los consume

Útiles antes de asumir un hueco: `GET /inventory/stock/low` ·
`GET /reports/sales`, `GET /reports/sales/{id}`, `GET /reports/sales/daily-breakdown`,
`GET /reports/sales/by-cashier`, `GET /reports/sales/by-product` ·
`GET /reports/products` · `POST /suppliers` · `POST /purchase-orders` ·
`POST /purchase-orders/{id}/receive` (el contrato desplegado debe verificarse
antes de asumir que acepta `payment_method`).

### Presentes sólo en trabajo backend no desplegado

Al 2026-07-28, el working tree de `../backend` contiene
`GET /users/{id}`, `PUT /users/{id}/roles`, `GET /purchase-orders/{id}`,
`POST /purchase-orders/{id}/items`,
`DELETE /purchase-orders/{id}/items/{item_id}` y
`GET /purchase-orders/uncatalogued-items`, además del nuevo body para
`POST /purchase-orders/{id}/receive`, como parte del change abierto
`add-multi-role-and-receiving`. Su presencia en código no prueba merge ni
despliegue. El frontend no debe consumirlos hasta completar el prerrequisito de
backend real del change relacionado.

## Métodos de pago: contratos distintos

- POS vigente y `ui-pos`: un único medio, `CASH` o `CARD`.
- El modelo backend de ventas acepta `payments[]`; el working tree backend
  también reconoce `TRANSFER`, pero el frontend no lo ofrece y ningún documento
  descriptivo debe anticiparlo como feature vigente.
- Receiving propuesto usa otro enum y casing:
  `cash | transfer | account`. Pertenece a
  `add-frontend-user-roles-and-receiving`, no al contrato actual del POS.
