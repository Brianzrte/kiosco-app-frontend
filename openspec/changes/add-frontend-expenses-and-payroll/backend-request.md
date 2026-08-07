# Backend request — Egresos, rubros de gasto, sueldos por hora y autoconsumo

**Change frontend:** `add-frontend-expenses-and-payroll`
**Fecha de verificación:** 2026-08-05
**Estado del frontend:** bloqueado en su totalidad. No se implementa ninguna
parte —ni con datos simulados, ni con un store local— hasta que los bloques de
abajo estén desplegados y verificados contra una instancia real.

Este documento pide **contrato de datos y permisos**. Donde una decisión es de
producto, queda marcada como tal y no se prescribe la respuesta.

## Evidencia consultada

- `../backend/internal/bootstrap/router.go` — registro completo de rutas. No hay
  ninguna ruta de egresos, gastos, rubros, horas ni sueldos.
- `../backend/openspec/specs/` — capabilities existentes: `catalog`,
  `database-platform`, `identity`, `inventory`, `purchasing`, `reporting`,
  `sales`. Ninguna cubre este dominio.
- `grep -ril 'expense|egreso|gasto|payroll|sueldo|salary|employee'` sobre
  `openspec/` e `internal/` del backend: sólo aparece en
  `openspec/changes/add-historical-sale-cost/`, que es otro tema (costo
  histórico de la venta).
- Frontend: `src/lib/types.ts` (`CashClosing`, `CashClosingStatus`,
  `MovementType`, `User`), `src/lib/nav.ts`.

**Conclusión: el dominio no existe. Los seis bloques son alta, no modificación**,
salvo D (usuarios), el tipo de movimiento del bloque E y el bloque F (cierre de
caja), que sí tocan estructuras vigentes.

## Orden recomendado

`A → B → C` habilita registrar y ver gastos, que es el 80 % del valor y ya es
entregable solo. Después `D → E` (sueldos) y `F` (efecto en el cierre). El
autoconsumo depende de A+B más el tipo de movimiento nuevo.

---

## A. Rubros de gasto (`expense_categories`)

**Motivo:** los motivos de gasto de un kiosco son abiertos —combustible, flete,
luz, arreglo de la heladera, impuestos, limpieza— y no se pueden enumerar en
código sin condenar cada motivo nuevo a un deploy.

Entidad:

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `name` | string | único entre los activos |
| `is_active` | bool | |
| `created_at` | timestamp | |

Endpoints:

- `GET /api/v1/expense-categories` — lista. Parámetro `include_inactive`
  (default `false`), necesario para rotular egresos históricos.
- `POST /api/v1/expense-categories` — alta.
- `PUT /api/v1/expense-categories/{id}` — renombrado.
- `PATCH /api/v1/expense-categories/{id}/deactivate` — archivado.

**No se pide borrado.** Un rubro archivado sigue rotulando egresos históricos;
borrarlo dejaría egresos huérfanos.

Permisos: `admin`.

---

## B. Egresos (`expenses`)

**Motivo:** es el núcleo del change. Hoy la plata que sale del cajón por
cualquier motivo que no sea el pago de una orden de compra no existe para el
sistema.

Entidad:

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `business_date` | date | día del negocio al que imputa |
| `type` | enum | `OPERATING`, `PURCHASE`, `PAYROLL`, `SELF_CONSUMPTION`, `OWNER_DRAW` |
| `expense_category_id` | uuid nullable | rubro; no aplica a `OWNER_DRAW` ni a `PAYROLL` |
| `payment_method` | enum | `CASH_REGISTER`, `OWNER_FUNDS`, `TRANSFER`, `CARD` |
| `amount` | decimal (string) | |
| `description` | string | |
| `supplier_id` | uuid nullable | sólo `PURCHASE` |
| `items` | array nullable | sólo `PURCHASE` y `SELF_CONSUMPTION`; ver abajo |
| `status` | enum | `ACTIVE`, `VOID` |
| `voided_at` / `voided_by` | nullable | |
| `void_reason` | string nullable | obligatorio al anular; sin él un egreso anulado no se audita |
| `payroll_payment_id` | uuid nullable | sólo `PAYROLL`; referencia al bloque E |
| `created_by` / `created_at` | | |

Línea de `items`: `product_id`, `quantity` (decimal string, misma escala que
purchasing), y en la respuesta `unit_cost` y `line_total` calculados por el
backend.

Endpoints:

- `GET /api/v1/expenses` — paginado, filtros `from`, `to`, `type`,
  `expense_category_id`, `payment_method`, `status`.
- `GET /api/v1/expenses/{id}`
- `POST /api/v1/expenses` — **rechaza `type=PAYROLL`**: un sueldo se origina sólo
  en la liquidación del bloque E. Dos caminos para el mismo hecho con reglas
  distintas es una fuente garantizada de descuadres.
- `POST /api/v1/expenses/{id}/void` — anulación. Revierte los efectos: devuelve
  el stock del autoconsumo y libera los días de una liquidación. Responde `409`
  si el cierre de caja del `business_date` ya está sellado.

Reglas que el frontend necesita que el backend valide y comunique:

- `SELF_CONSUMPTION` exige al menos una línea de producto, **calcula `amount` al
  costo** y lo devuelve; el frontend lo muestra de sólo lectura y no lo envía.
- `SELF_CONSUMPTION` genera un movimiento de stock de salida (ver bloque E del
  tipo de movimiento, más abajo) y **rechaza** con `422` si alguna línea dejaría
  stock negativo, identificando **qué producto** falla. El frontend mapea ese
  error a la línea, no al formulario.
- `OWNER_DRAW` no admite rubro.
- No hay `PUT`: un egreso no se edita, se anula y se carga de nuevo.

Permisos: `admin`.

**Decisión de producto (backend):** ¿un egreso de tipo `PURCHASE` puede ingresar
stock, o toda entrada de stock debe nacer de una orden de compra? El frontend
deja el campo opcional; si la respuesta es que no, se recorta antes de
implementar.

---

## C. Totales agregados (`expenses/summary`)

**Motivo:** el hub muestra los totales del período por los tres ejes. Calcularlos
en el cliente exigiría traer todos los egresos del período paginados y sumarlos,
que es exactamente el antipatrón que el resto del sistema ya evita con
`sales/summary`.

- `GET /api/v1/expenses/summary?from=&to=`

Respuesta con, al menos:

- `total_business_expenses` — suma de `OPERATING`, `PURCHASE`, `PAYROLL`,
  `SELF_CONSUMPTION`.
- `total_owner_draws` — suma de `OWNER_DRAW`, **separada**. Un retiro no es un
  gasto del negocio; mezclarlos distorsiona cualquier medida de resultado.
- `by_type` — total por tipo.
- `by_category` — total por rubro, incluyendo los archivados que tengan egresos
  en el período.
- `by_payment_method` — total por medio de pago.

Los egresos con `status=VOID` contribuyen **cero** a todos los totales.

Permisos: `admin`.

---

## D. Tarifa horaria en el usuario

**Motivo:** el empleado a liquidar es el usuario del sistema; no se crea una
entidad Empleado (ver `design.md` → D4).

- `User` suma `hourly_rate` — decimal (string), **nullable**. Los usuarios
  existentes no tienen ninguna, y `null` significa "no se le liquidan sueldos por
  este sistema", no cero.
- `GET /api/v1/users` y `GET /api/v1/users/{id}` lo devuelven.
- `PUT /api/v1/users/{id}` lo acepta.

**Bloqueante para el bloque E:** ¿la tarifa es histórica? El frontend asume que
la fila de horas **persiste la tarifa vigente al momento de cargarse**
(`hourly_rate_snapshot`). Si no se persiste, cambiar la tarifa reescribe todas
las liquidaciones pasadas y el reporte por empleado deja de ser conciliable. Se
pide confirmación explícita por escrito.

Permisos: los ya vigentes de usuarios (`admin`).

---

## E. Horas trabajadas y liquidación de sueldos

**Motivo:** hoy las horas se anotan en papel, el cálculo se hace a mano y no hay
forma de reconstruir qué se le pagó a quién.

### E.1 — Horas (`work_logs`)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `user_id` | uuid | |
| `business_date` | date | |
| `hours` | decimal (string) | |
| `hourly_rate_snapshot` | decimal (string) | tarifa vigente al cargar |
| `computed_amount` | decimal (string) | `hours × hourly_rate_snapshot` |
| `amount` | decimal (string) | monto final; puede diferir del calculado |
| `adjustment_reason` | string nullable | **obligatorio si `amount ≠ computed_amount`** |
| `payroll_payment_id` | uuid nullable | null mientras no esté liquidada |
| `created_by` / `created_at` | | |

- `GET /api/v1/work-logs` — filtros `user_id`, `from`, `to`, `paid` (bool).
- `POST /api/v1/work-logs`
- `PUT /api/v1/work-logs/{id}` — **rechaza con `409` si ya está liquidada.**
- `DELETE /api/v1/work-logs/{id}` — misma restricción.

Persistir las tres cifras (horas, calculado, final) es lo que mantiene el reporte
auditable pese a que el monto sea editable.

### E.2 — Pendiente por empleado

- `GET /api/v1/payroll/pending?from=&to=` — por empleado con horas sin liquidar:
  usuario, total de horas, total a pagar, cantidad de días y fecha del día más
  antiguo sin pagar.

Debe incluir a los usuarios **inactivos** que tengan horas sin liquidar: alguien
que dejó de trabajar puede tener sueldo pendiente.

### E.3 — Liquidaciones (`payroll_payments`)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `user_id` | uuid | |
| `period_from` / `period_to` | date | |
| `total_hours` | decimal (string) | |
| `total_amount` | decimal (string) | |
| `payment_method` | enum | mismo enum que los egresos |
| `expense_id` | uuid | el egreso `PAYROLL` que genera |
| `paid_at`, `created_by` | | |

- `GET /api/v1/payroll/payments` — filtros `user_id`, `from`, `to`.
- `POST /api/v1/payroll/payments` — recibe `user_id`, período y medio de pago;
  toma **todas** las horas no liquidadas del empleado en ese período, las marca
  con `payroll_payment_id` y **genera el egreso de tipo `PAYROLL`** de forma
  atómica. Responde `409` si alguna de esas horas fue liquidada mientras tanto.

La atomicidad importa: una liquidación que marca las horas pero no crea el egreso
—o al revés— deja la contabilidad rota sin manera de detectarlo desde el
frontend.

Permisos: `admin`.

### E.4 — Tipo de movimiento de stock para autoconsumo

`MovementType` del frontend está cerrado a `SALE`, `ADJUSTMENT_IN`,
`ADJUSTMENT_OUT`, `RETURN`, según lo que valida el backend. El autoconsumo
necesita un valor propio —`SELF_CONSUMPTION`— y no reutilizar `ADJUSTMENT_OUT`:
si se mezcla con los ajustes manuales, deja de poder distinguirse un error de
inventario de mercadería consumida, que es justamente lo que se quiere medir.

- El nuevo valor se acepta en el filtro `type` de
  `GET /api/v1/inventory/movements` y se devuelve en las filas.
- El movimiento referencia el egreso que lo originó en `reference_id`.

---

## F. Efecto de los egresos en efectivo sobre el cierre de caja

**Motivo:** es la razón por la que hoy el cierre "no da". Un egreso con
`payment_method=CASH_REGISTER` salió físicamente del cajón.

Se pide:

- Que `expected_cash` de `POST /api/v1/cash-closings` y el efectivo esperado de
  `GET /api/v1/cash-closings/current-status` **descuenten** los egresos activos
  en efectivo del alcance del cierre.
- Que la respuesta incluya el desglose: un campo con el **total de egresos en
  efectivo** ya descontado, y la cantidad de egresos.
- Que `GET /api/v1/cash-closings/daily-status` lo exponga igual, para la vista de
  Admin.

El frontend **no calcula** este descuento: sigue mostrando el esperado que
computa el backend (regla vigente de `ui-cashier-shift-closing`, que este change
no relaja). Sólo necesita la cifra desglosada para que la operadora entienda de
dónde sale el número.

**Decisión de producto (backend):** a qué cierre imputa un egreso en efectivo
cargado por Admin cuando hay un turno de cajero abierto — ¿al turno abierto, al
día calendario, al cierre del propio Admin? El frontend no depende de la
respuesta, pero la copy de la pantalla sí, y sin decisión el desglose puede
explicar mal una diferencia.

**Riesgo señalado:** un egreso anulado sobre un cierre ya sellado cambiaría un
esperado histórico. Por eso B pide `409` en ese caso; si el backend prefiere otra
salida (nota de reversa, ajuste posterior), hay que decidirlo antes de que el
frontend implemente la anulación.

---

## Resumen de lo que bloquea qué

| Bloque | Habilita en el frontend | Bloquea |
|---|---|---|
| A | `/expenses/categories` y el selector de rubro | B |
| B | `/expenses`, `/expenses/new`, `/expenses/[id]` | C, E.3 |
| C | totales del período en el hub | — |
| D | tarifa horaria en `/users` | E |
| E | `/expenses/payroll`, `/expenses/payroll/[userId]`, autoconsumo | — |
| F | línea de egresos en el desglose del cierre | — |
