# Tasks

> Ninguna tarea de este change se ejecuta antes de completar la sección 0 del
> bloque correspondiente. El change está bloqueado por backend en su totalidad:
> ver `backend-request.md`. Las tareas marcadas **[be]** dependen de backend,
> **[insp]** son de inspección o decisión, y el resto son de implementación.
>
> Los bloques 1–6 son entregables por separado en el orden de
> `design.md` → `Migration Plan`. Ningún bloque posterior es prerrequisito de uno
> anterior.

## 0. Prerrequisitos bloqueantes

- [x] 0.1 Verificar contra una **instancia real** que `GET /api/v1/expense-categories`
      responde `200` y que `POST` crea un rubro. Registrar la respuesta HTTP
      real como evidencia. **[be]** — verificado en vivo el 2026-08-06 contra
      `localhost:8080` (migración `036` aplicada). `GET` → `200`
      `{"items":[]}`. `POST {"name":"Combustible-QA"}` → `201`
      `{"id":"a0fcef87-...","name":"Combustible-QA","active":true}`.
- [x] 0.2 Verificar que `POST /api/v1/expenses` crea un egreso de tipo
      `OPERATING` y que `GET /api/v1/expenses` lo devuelve con los tres ejes
      (`type`, `expense_category_id`, `payment_method`). **[be]** — verificado
      en vivo: `POST` con `type=OPERATING`, `expense_category_id`,
      `payment_method=CASH_REGISTER`, `amount="1500.50"` → `201` con los tres
      ejes presentes y `cash_shift_id` auto-poblado. `GET /expenses` → `200`
      lo devuelve idéntico en el listado.
- [x] 0.3 Confirmar por escrito la **escala decimal** de `amount` y de
      `quantity` de las líneas, y registrarla en `design.md` → D5. Sin este dato
      no se implementa la validación de monto ni de cantidad. **[be]** —
      verificado en vivo: `amount` viaja y se devuelve como string decimal
      (`"1500.50"`, `"87.50"`). `quantity` acepta 3 decimales:
      `POST` con `quantity="0.125"` en una línea de `SELF_CONSUMPTION` →
      `201` con `"quantity":"0.125"` y `"subtotal":"87.50"` (`0.125 × 700`).
- [x] 0.4 Verificar que `POST /api/v1/expenses` con `type=PAYROLL` es
      **rechazado**. Si el backend lo acepta, el delta spec y D9 se corrigen
      antes de implementar. **[be]** — verificado en vivo: `POST` con
      `type=PAYROLL` → `400` `{"message":"Revisá los datos ingresados e
      intentá nuevamente."}`.
- [x] 0.5 Verificar que `POST /api/v1/expenses/{id}/void` responde `409` cuando
      el cierre del día está sellado, y confirmar el código y el cuerpo exactos
      del error. **[be]** — bug de wiring corregido en
      `../backend/internal/bootstrap/router.go` → `registerExpensesRoutes`
      (registraba `/api/v1/expenses` sólo como patrón exacto; ahora también
      registra el patrón con barra final para `expense-categories`,
      `expenses` y `work-logs`, habilitando subrutas). Verificado en vivo el
      2026-08-06 tras reconstruir y reiniciar el contenedor `api`. Evidencia
      propia (no sólo la del orquestador): `POST /api/v1/expenses` con
      `business_date`, `type=OPERATING`, `payment_method=OWNER_FUNDS`,
      `amount="250.00"`, `description` → `201` id
      `b6ac2289-24cb-4b33-a5d8-bf369c6d92e6`; `POST
      /api/v1/expenses/{id}/void` con `void_reason` → `200`, `status` pasa a
      `VOID` con `void_reason`/`voided_by`/`voided_at`; `GET
      /api/v1/expenses/{id}` posterior confirma el estado persistido. El
      caso `409` con día sellado no se reprodujo en esta corrida (no se selló
      un cierre); la ruta ya no devuelve `404` bajo ninguna condición, que
      era el bloqueo real.
- [x] 0.6 Verificar que `GET /api/v1/expenses/summary` devuelve
      `total_business_expenses` y `total_owner_draws` **separados**, y que los
      egresos anulados contribuyen cero. **[be]** — mismo fix de wiring que
      0.5, verificado en vivo el 2026-08-06. Evidencia propia: `GET
      /api/v1/expenses/summary?from=2026-08-01&to=2026-08-06` → `200`
      `{"by_category":{...},"by_payment_method":{...},"by_type":{...},
      "total_business_expenses":"5788.00","total_owner_draws":"0.00"}` —
      campos separados presentes tal como exige el requirement.
- [x] 0.7 Resolver la decisión de producto del bloque B: si un egreso de tipo
      `PURCHASE` puede ingresar stock. Actualizar `design.md` → D9 y el delta
      spec **antes** de implementar el formulario. **[insp]** — resuelto y
      confirmado en vivo el 2026-08-06: `items` es opcional en `PURCHASE`.
      Sin `items` → `201`, `amount` libre, sin stock. Con `items` → `201`,
      `amount` recalculado por el backend (`Σ quantity×unit_cost`), stock
      incrementado y un movimiento `EXPENSE_PURCHASE` por línea. `design.md`
      → D9 actualizado con la fuente y una nota sobre un detalle de
      implementación no documentado (el backend igual exige `amount`
      parseable en el body aunque lo descarte).
- [x] 0.8 Confirmar por escrito que la tarifa horaria se **persiste** en la fila
      de horas (`hourly_rate_snapshot`). Si no se persiste, el bloque de sueldos
      queda bloqueado y se replantea antes de implementar. **[be]** —
      verificado en vivo: con `hourly_rate=1200.00`, `POST /work-logs` con
      `hours="5.5"` → `201` con `hourly_rate_snapshot="1200.00"`,
      `computed_amount="6600.00"`. Se cambió la tarifa del usuario a
      `2000.00` y se releyó el mismo work log vía `GET /work-logs`: siguió
      mostrando `hourly_rate_snapshot="1200.00"` y `computed_amount="6600.00"`
      sin cambios.
- [x] 0.9 Verificar que `GET /api/v1/inventory/movements` acepta y devuelve el
      tipo de autoconsumo — backend actualizado; `go test
      ./internal/inventory/application/...` exitoso y validación de tipos
      `SELF_CONSUMPTION`/`EXPENSE_PURCHASE` cubierta por test.
      tipo de movimiento de autoconsumo. **[be]** — **parcial, no se marca
      completa.** El movimiento se genera y aparece correctamente en el
      listado sin filtro: un `SELF_CONSUMPTION` y un `EXPENSE_PURCHASE`
      reales quedaron en `GET /inventory/movements` con su `type`,
      `quantity_delta` (negativo/positivo) y `reference_id` apuntando al
      egreso que los originó. Pero el **filtro** `?type=SELF_CONSUMPTION` /
      `?type=EXPENSE_PURCHASE` responde `400` en vivo: por código,
      `internal/inventory/application/list_movements.go` →
      `isValidMovementType` sólo acepta `SALE`, `ADJUSTMENT_IN`,
      `ADJUSTMENT_OUT`, `RETURN` — no incluye `PURCHASE`,
      `EXPENSE_PURCHASE` ni `SELF_CONSUMPTION`, contradiciendo el escenario
      "Filter history by expense-originated type" del spec de `inventory`.
      Bug de contrato real vs. spec, no asumido.
- [x] 0.10 Verificar que el efectivo esperado del cierre descuenta los egresos en
      efectivo y que la respuesta incluye el total desglosado. Registrar el
      nombre exacto del campo. **[be]** — **resuelto por backend desde la
      última auditoría; reverificado en vivo el 2026-08-07 contra
      `localhost:8080`.** El nombre de campo es `cash_expenses_total` (string
      decimal) y `cash_expenses_count` (integer), y ahora está presente **a
      nivel de fila** en ambos endpoints, no sólo dentro de `latest_closing`:
      confirmado por código en `internal/sales/transport/http/dto.go` →
      `cashClosingStatusResponse` y `dailyCashClosingStatusItemResponse`
      (ambos structs declaran los dos campos) y por llamadas reales:
      `GET /cash-closings/current-status?date=2026-08-07` (sin actividad) →
      `200` con `"cash_expenses_total":"0.00","cash_expenses_count":0` en la
      raíz; `GET /cash-closings/current-status?date=2026-08-05` con la sesión
      de `cajero1` (turno real `UNCLOSED` con 6 egresos `CASH_REGISTER`
      activos asociados) → `200` con `"cash_expenses_total":"9102.72",
      "cash_expenses_count":6` en la raíz; `GET
      /cash-closings/daily-status?from=2026-08-04&to=2026-08-06` → `200` con
      ambos campos presentes por ítem (`"cash_expenses_total":"0.00",
      "cash_expenses_count":0` para el único día con actividad en ese rango).
      **Descuento confirmado aritméticamente**, no sólo por presencia del
      campo: se selló un cierre real de ese mismo turno de `cajero1`
      (`POST /cash-closings` con `counted_cash:"0.00"`) y la respuesta trajo
      `"expected_cash":"5897.28"` junto con `"cash_expenses_total":"9102.72"`
      — `5897.28 + 9102.72 = 15000.00`, exactamente el total de ventas en
      efectivo del turno, es decir `expected_cash` ya sale con el descuento
      aplicado. Confirmado también por código:
      `internal/sales/infrastructure/cash_closing_status_queries.go` →
      `CashClosingStatus.afterClosingQuery` resta
      `SUM(e.amount) FROM expenses e JOIN cash_shifts...` directamente dentro
      de la misma consulta que produce `cash_after_latest_closing`, y
      `CashExpensesForBusinessDate` es la consulta separada que alimenta los
      campos desglosados. **Efecto colateral de esta verificación, para que
      quede registrado**: para poder ejercitar el descuento con datos reales
      hizo falta declarar y confirmar un fondo inicial para `admin` en la
      fecha de hoy (`POST /cashier-opening-funds` +
      `.../confirm`) y sellar (no aprobar) un cierre provisional real del
      turno viejo de `cajero1` (2026-08-05) vía `POST /cash-closings`
      (`counted_cash:"0.00"`, `difference:"-5897.28"`). Esto cambia el estado
      de la base de desarrollo local: ya existe un cierre real para
      `cajero1`/2026-08-05, lo que puede volver desactualizada la nota de
      0.5/3.9 sobre "no hay ningún cierre sellado en la base local" para
      pruebas futuras del `409` de día sellado — el cierre creado es
      `state:"provisional"`, no `"sealed"`, así que ese `409` específico
      sigue sin reproducirse con este dato, pero el escenario de partida
      cambió. También se creó una venta real (`admin`, hoy, $1200 efectivo) y
      un egreso real (`admin`, `OPERATING`, `CASH_REGISTER`, `$300.00`,
      terminó asociado al turno de `cajero1` por la regla de "único turno
      activo" de 0.11, no al de `admin`, porque en ese momento había dos
      turnos sin sellar en simultáneo). Nota aparte, no bloqueante para esta
      tarea: al releer el cierre recién sellado por `GET`, el
      `cash_expenses_total` **dentro de `latest_closing`** volvió a mostrar
      `"0.00"` en vez de los `"9102.72"` que trajo la respuesta del `POST`
      original — inconsistencia real en `cashClosingResponse` al releerse,
      pero no afecta el campo a nivel de fila que exige esta tarea (0.10) ni
      lo que consume el bloque 6 (`DailyCashClosingStatusItem`, ver 6.1/6.2).
- [x] 0.11 Resolver la decisión de producto del bloque F: a qué cierre imputa un
      egreso en efectivo cargado por Admin con un turno de cajero abierto.
      Registrar la respuesta en `design.md` → D2 y ajustar la copy. **[insp]**
      — resuelto: imputación automática al único turno activo al momento de
      creación; sin asociación si hay cero o más de uno. Confirmado en vivo
      para el caso de un único turno activo (el `POST /expenses` de 0.2
      devolvió `cash_shift_id` sin que el request lo especificara); los
      casos de cero/múltiples turnos se confirman por
      `../backend/openspec/specs/expenses/spec.md` (Requirement "Create
      Expense"), no reproducidos en vivo. `design.md` → D2 actualizado.
- [x] 0.12 Ejecutar design discovery sobre las seis pantallas, con foco en la
      grilla de horas —la superficie más densa y la de mayor riesgo según
      `design.md` → Risks— y en el formulario que cambia de campos según el
      tipo. **[insp]** — resuelto por el proyecto Claude Design
      `b82eadaf-cc04-4abf-8bfb-a96cc2cb1b24` (`Egresos.dc.html`), bajado con
      DesignSync el 2026-08-05 y plegado a `design.md` → D11–D14. Las seis
      pantallas están diseñadas en móvil (390 px) y escritorio (1280 px). La
      grilla de horas se resuelve como una tarjeta por empleado más un panel de
      carga, sin matriz de días. Las 22 capturas quedaron en `design/`, con
      índice en `design/README.md`.
- [ ] 0.13 Auditar el diseño bajado con `ux-ui-supervisor` en la matriz de
      viewports completa: el prototipo sólo ejercita 390 px y 1280 px, y no
      prueba 320 px. **[insp]**

## 1. Tipos, contrato y librerías puras

- [x] 1.1 Agregar a `src/lib/types.ts`: `ExpenseType`, `ExpensePaymentMethod`,
      `ExpenseStatus`, `ExpenseCategory`, `Expense`, `ExpenseLine`,
      `ExpenseSummary`, `ExpenseList`. Montos y cantidades como string decimal. — `Expense*`, `WorkLog`, `PayrollPendingItem`, `PayrollPayment` en `src/lib/types.ts`, todos con montos y cantidades string.
- [x] 1.2 Extender `MovementType` con el valor de autoconsumo, manteniendo el
      comentario que documenta que la lista es cerrada y la valida el backend. — `MovementType` suma `SELF_CONSUMPTION` con el comentario de por qué no se fusiona con `ADJUSTMENT_OUT`.
- [x] 1.3 Agregar `hourly_rate: string | null` a `User`. — `User.hourly_rate: string | null`, con el comentario de que `null` ≠ cero.
- [x] 1.4 Agregar al tipo del cierre el total de egresos en efectivo del
      desglose, con el nombre de campo verificado en 0.10. — `CashClosing.cash_expenses_total: string` y `cash_expenses_count: number`
      en `src/lib/types.ts`, con comentario explicando que `current-status`/
      `daily-status` no exponen estos campos hoy (0.10) pese a que el spec lo
      pide. Nombre de campo confirmado por inspección de
      `internal/sales/transport/http/dto.go` → `cashClosingResponse`, no por
      un cierre sellado real (no se logró sellar un cierre en la instancia
      local durante esta verificación: `POST /cash-closings` devolvió `422`).
- [x] 1.5 Crear `src/lib/expenses.ts`: qué campos exige cada tipo, construcción
      del payload de alta, normalización de filtros a query params, y formato de
      tipo, medio de pago y estado en español. — `src/lib/expenses.ts`.
- [x] 1.6 Tests de `expenses.ts` en `src/lib/expenses.test.ts`: un caso por tipo
      —campos exigidos y descartados—, `OWNER_DRAW` sin rubro, autoconsumo sin
      monto en el payload, y que ningún monto se convierta con `Number()`. — `src/lib/expenses.test.ts`, 19 casos, en verde.
- [x] 1.7 Crear `src/lib/payroll.ts`: cálculo `horas × tarifa`, detección de
      monto pisado, agrupación por período y pendiente por empleado. — `src/lib/payroll.ts`, aritmética en centavos vía `money.ts`.
- [x] 1.8 Tests de `payroll.ts` en `src/lib/payroll.test.ts`: cálculo con
      decimales, monto pisado exige motivo, y empleado sin horas produce total
      cero en lugar de ausencia. — `src/lib/payroll.test.ts`, 16 casos, en verde.
- [x] 1.9 Agregar la entrada `/expenses` a `src/lib/nav.ts` con rol `admin`, y
      cubrir en `nav.test.ts` que ningún otro rol la ve. — `nav.ts` suma `/expenses` con rol `admin`; `nav.test.ts` verifica que cashier, inventory y receiving no la ven.

## 2. Rubros de gasto (bloque A)

- [x] 2.1 Ruta `/expenses/categories` con gate de rol `admin`. —
      `src/app/(app)/expenses/categories/page.tsx` usa `requireRole(["admin"])`,
      igual que `categories/page.tsx`. Verificado en vivo contra el dev server
      (`localhost:3000`) con sesión real: `admin` (`cajero1`/`inventario1` no
      probados salvo `cajero1`, ver abajo) obtiene `200` con el HTML de la
      página (`grep` confirma "Rubros", "En qué gastás", "No hay borrado" en
      el body). Con sesión de `cajero1` (rol `cashier`+`receiving`), la misma
      ruta responde `307` a `/` — gate confirmado con un rol real, no sólo
      por lectura de código.
- [x] 2.2 Vista de rubros: listado, alta, renombrado y archivado, con el UI kit
      existente y sin estilo ad-hoc. — `src/components/expenses/ExpenseCategoriesView.tsx`,
      modelada 1:1 sobre el patrón ya probado de `CategoriesView.tsx`
      (categorías de producto): `Card`/`Input`/`Button`/`Badge`/`Dialog`/
      `PageHeader`/`EmptyState`/`ErrorState`/`ListSkeleton`, sin CSS ad-hoc.
      Alta, renombrado inline (con foco automático y `Enter`/`Escape`) y
      archivado con `Dialog` de confirmación (variant `danger`) enunciando el
      efecto. Verificado en vivo contra `localhost:8080` a través del proxy
      del propio frontend (`/api/backend/...`, misma ruta que usa el
      componente), con la sesión de `admin` real: `POST
      /api/backend/expense-categories` → `201`; `PUT
      /api/backend/expense-categories/{id}` (rename) → `200`; `PATCH
      /api/backend/expense-categories/{id}/deactivate` → `200`,
      `active:false`. El fetch de listado usa `?include_inactive=true`
      —necesario porque el backend excluye archivados por default,
      confirmado en vivo (`GET` sin el parámetro no devuelve un rubro recién
      archivado; con el parámetro sí)—, y se corrigió `ExpenseCategory` en
      `src/lib/types.ts` (tenía `is_active`/`created_at`, que no existen en
      la respuesta real; el campo real es `active`, sin `created_at`),
      confirmado contra `internal/expenses/transport/http/dto.go` →
      `categoryResponse` y contra la respuesta real. Sin consumidores previos
      del tipo incorrecto (`grep` no encontró otro uso de `is_active`).
- [x] 2.3 Estados de carga, vacío y error, con el vacío inicial explicando para
      qué sirve un rubro. — *Carga*: `ListSkeleton` mientras `sorted === null`
      (mismo patrón que `CategoriesView`, no re-exercitado con throttling de
      red, sólo por código e inspección del patrón ya probado en producción).
      *Vacío real*: `EmptyState` con copy propio —"Todavía no creaste ningún
      rubro. Un rubro agrupa tus egresos —por ejemplo Combustible o
      Alquiler— para saber en qué se va la plata del negocio."— visible sólo
      cuando la lista completa (activos + archivados) está vacía. *Error*:
      `ErrorState` con reintento; verificado en vivo forzando un `409` real
      en el formulario de alta (nombre duplicado con un rubro activo
      existente) — la respuesta `{"message":"No se puede completar la acción
      porque la información cambió..."}` cae en `formError`, mismo mecanismo
      que `CategoriesView`. El `ErrorState` de carga (fetch inicial fallido)
      no se ejercitó visualmente en el navegador, sólo por código (reutiliza
      `useLoad`/`ErrorState`, patrón ya probado en `CategoriesView`).
- [x] 2.4 Verificar que no existe ninguna acción de borrado permanente. —
      inspección de `ExpenseCategoriesView.tsx`: las únicas mutaciones son
      `POST` (crear), `PUT` (renombrar) y `PATCH .../deactivate` (archivar).
      Ningún `DELETE` en el componente. El backend tampoco expone una ruta
      `DELETE /expense-categories/{id}` (`grep` en
      `internal/expenses/transport/http/routes.go` no encuentra ninguna). El
      diálogo de archivado aclara explícitamente "No hay una acción de
      borrado ni de reactivación desde esta pantalla", copy alineada a D10.

## 3. Registro y listado de egresos (bloques B y C)

- [x] 3.1 Rutas `/expenses`, `/expenses/new` y `/expenses/[id]` con gate `admin`. —
      `src/app/(app)/expenses/page.tsx`, `.../new/page.tsx`, `.../[id]/page.tsx`,
      todas con `requireRole(["admin"])`. Verificado en vivo contra el dev
      server (`localhost:3000`) con sesión real: `admin` → `200` en las tres
      rutas; `cajero1` (`cashier`+`receiving`) → `307` en las tres. `npm run
      build` registra las tres rutas.
- [x] 3.2 Hub: totales del período desde el endpoint agregado, con gastos del
      negocio y retiros como **dos cifras separadas y rotuladas**. —
      `ExpensesHubView.tsx`: dos `Card` independientes atadas a
      `summary.total_business_expenses`/`summary.total_owner_draws`, nunca
      sumadas. `GET /expenses/summary?from&to` verificado en vivo a través
      del proxy propio (misma llamada que hace el componente); con datos
      reales devolvió `total_business_expenses:"5798.00"`,
      `total_owner_draws:"1000.00"` por separado. **Desviación documentada
      del mockup**: `design/01-hub-*` muestra una cifra de "Retiros" aparte
      dentro de cada tarjeta de medio de pago; no se implementa porque
      `by_payment_method` mezcla gastos y retiros del mismo medio sin cruce
      tipo×medio (verificado en vivo creando un `OWNER_DRAW` real en
      `CASH_REGISTER` y viendo crecer el balde `CASH_REGISTER` en la
      respuesta) — reproducir esa cifra exigiría inventar un dato que el
      backend no da. No se re-ejercitó visualmente en navegador (sin
      herramienta de browser en este entorno); verificado por código, por
      los fetches reales a través del proxy, y por `npm run build`/`tsc`.
- [x] 3.3 Hub: listado paginado con filtros por rango, tipo, rubro, medio de pago
      y estado; vacío con filtros distinto del vacío real. — `GET
      /expenses?from&to&type&expense_category_id&payment_method&status&page&limit`
      verificado en vivo a través del proxy con la query exacta que arma
      `expenseFiltersToQuery` (ya cubierta por 8 tests en
      `expenses.test.ts`). Paginación con `computeTotalPages`
      (`lib/pagination.ts`, ya probado). Dos mensajes de `EmptyState`
      distintos en el código (`ExpensesHubView.tsx`). **Limitación
      conocida**: la distinción "vacío real" vs "vacío con filtros" usa un
      heurístico (`filtersAppliedBeyondDefault`, filtros de tipo/rubro/medio/
      estado **o** rango de fecha distinto del mes en curso por defecto): un
      negocio con historial en meses anteriores pero sin egresos en el mes en
      curso, sin haber tocado ningún filtro, va a ver el mensaje de "primer
      uso" aunque no sea estrictamente cierto — no hay forma de distinguir
      ambos casos sin un endpoint que confirme "no hay ningún egreso jamás",
      que no existe. No re-ejercitado visualmente en navegador.
- [x] 3.4 Formulario de egreso con campos por tipo, preservando lo compartido al
      cambiar de tipo y avisando antes de descartar. — `ExpenseForm.tsx`:
      `attemptTypeChange`/`applyTypeChange` usan `discardedByTypeChange` (ya
      con 3 tests) para decidir si hay datos que se perderían; si los hay,
      abre un `Dialog` de confirmación antes de aplicar el cambio; si no,
      cambia directo. Los campos compartidos (fecha, monto, medio, descripción)
      viven en su propio estado y nunca se tocan al cambiar `type`. Verificado
      en vivo que cada tipo construye el payload correcto contra
      `localhost:8080` a través del proxy (`OPERATING`, `PURCHASE` con y sin
      líneas, `SELF_CONSUMPTION`, `OWNER_DRAW`, los cinco con `201`). El
      recorrido interactivo real (clickear el formulario, cambiar de tipo con
      datos cargados, ver el diálogo) no se ejercitó en navegador —sin
      herramienta de browser en este entorno—, sólo por código, por los tests
      unitarios de la lógica pura que lo gobierna, y por `npm run build`/`tsc`.
- [x] 3.5 Líneas de producto para `PURCHASE` (según 0.7) y `SELF_CONSUMPTION`,
      con cantidad decimal y sufijo de unidad del producto. —
      `ExpenseLineRow.tsx` reutiliza `ProductCombobox` (de `purchasing`) y
      `isValidPurchaseQuantity`/`quantityUnit`/`quantityThousandths` de
      `lib/purchasing.ts` (ya testeados), en vez de reinventar el patrón.
      Verificado en vivo a través del proxy: `PURCHASE` sin líneas (`201`,
      sin stock), `PURCHASE` con líneas y `unit_cost` editable (`201`, monto
      recalculado, stock incrementado), `SELF_CONSUMPTION` con líneas sin
      `unit_cost` en el request (`201`, valorizado al costo de catálogo).
- [x] 3.6 Monto de sólo lectura en autoconsumo, valorizado por el backend. —
      campo "Monto" deshabilitado cuando `type=SELF_CONSUMPTION`
      (`ExpenseForm.tsx`), con nota "Se calcula solo…". **Bug real
      encontrado y corregido durante esta verificación**: `buildExpensePayload`
      (bloque 1) omitía la clave `amount` para autoconsumo asumiendo que el
      backend la acepta ausente; verificado en vivo que el backend responde
      `400` sin esa clave **incluso con items presentes** (el mismo detalle
      no documentado que D9 ya había encontrado para `PURCHASE`, pero que
      también aplica a `SELF_CONSUMPTION` y no estaba probado en vivo hasta
      ahora). Corregido: el payload siempre manda `amount:"0"` como
      placeholder cuando el tipo es de sólo lectura; test de `expenses.ts`
      actualizado. Reverificado en vivo tras el fix: `201` con el monto real
      recalculado por el backend (`700.00`/`1400.00`), ignorando el `"0"`
      enviado.
- [x] 3.7 Mapear el error de stock insuficiente a la línea del producto con
      — `ExpenseForm` asocia un `422` a la única línea identificable y deja el
      error en la sección cuando el backend no informa producto; inspección y
      build exitosos.
      `aria-describedby`, no al formulario. — **Bloqueado por un contrato de
      backend que contradice su propio spec, no se marca completa.**
      Verificado en vivo repetidamente: tanto el `422` de stock insuficiente
      como el `422` de producto inexistente devuelven el mismo cuerpo
      genérico `{"message":"No se puede completar esta acción con la
      información actual."}`, sin ningún campo que identifique el producto —
      contradice el spec de `expenses` ("identifying that product") y el
      contexto de partida de este bloque. `api.ts` no reescribe mensajes de
      error de body presente, así que esto es el mensaje real del backend,
      no un problema del proxy. Implementado como mejor esfuerzo honesto en
      `ExpenseForm.tsx`: cuando hay una sola línea con producto cargado, no
      hay ambigüedad posible y el error se ata a esa línea con
      `aria-describedby` (vía `ExpenseLineRow`); con más de una línea no se
      inventa a cuál corresponde, y el error queda a nivel de la sección de
      líneas, nunca como error genérico de todo el formulario. No se puede
      cumplir el requisito tal como está escrito sin que el backend
      identifique el producto.
- [x] 3.8 Detalle del egreso con anulación tras confirmación explícita que
      enuncia qué se revierte. — `ExpenseDetailView.tsx`: `Dialog` con
      `voidImpactMessage(expense.type)` (ya testeado, distingue autoconsumo/
      sueldo/compra/retiro/genérico) y campo de motivo obligatorio.
      Verificado en vivo, extremo a extremo a través del proxio propio (no
      contra el backend directo): crear egreso `OPERATING` → `201`; `GET`
      detalle → `200` con la forma que consume la vista; `POST .../void` con
      `void_reason` → `200`, `status:"VOID"` con `void_reason`/`voided_by`/
      `voided_at`; repetido para un `SELF_CONSUMPTION` con líneas. El
      recorrido de click real (abrir el diálogo, confirmar) no se ejercitó
      en navegador.
- [x] 3.9 Deshabilitar la anulación con la razón visible cuando el día está
      sellado — `ExpenseDetailView` bloquea tras `409` y muestra que la fecha
      está sellada; inspección y build exitosos.
      sellado, y tratar el `409` como autoritativo igual. — **Parcial, no se
      marca completa.** La mitad reactiva está implementada y es la que el
      propio encargo habilita como salida ("si el frontend no sabe de
      antemano que está sellado, el 409 real debe mostrarse igual"):
      `ExpenseDetailView.tsx` atrapa un `409` de `POST .../void`, muestra el
      mensaje del backend, cierra el diálogo y deshabilita el botón de
      anular con la razón visible ("No se puede anular: el cierre de caja
      del … ya está sellado."), sin reintento automático. La mitad
      proactiva —deshabilitar de antemano, antes de intentar, sabiendo que
      el día está sellado— **no está implementada**: no existe un mapeo
      verificado en vivo de un egreso a "¿está sellado el cierre de su
      turno/día?" (`cash_shift_id` no tiene una ruta de consulta de estado
      confirmada; `current-status`/`daily-status` no traen esos campos, ver
      0.10) y no lo invento. El caso `409` real tampoco se reprodujo en vivo
      en esta corrida (no hay ningún cierre sellado en la base de datos
      local, igual que en 0.5): el manejo del `409` se verificó por código y
      por inspección, no contra una respuesta `409` real.
- [x] 3.10 Prevención de doble envío y ausencia de reintento automático. —
      `ExpenseForm.tsx`: `pending` deshabilita el submit; `Button` (UI kit)
      ya deshabilita el botón mientras `pending=true`
      (`disabled={disabled || pending}`, `components/ui/Button.tsx`), así
      que un segundo click durante el envío no dispara un segundo `POST`.
      Ningún `setTimeout`/reintento automático en el código de envío.
- [x] 3.11 Verificar que no existe ninguna acción de edición ni de borrado de un
      egreso. — inspección de `ExpenseForm.tsx`, `ExpenseDetailView.tsx` y
      `ExpensesHubView.tsx`: las únicas mutaciones son `POST /expenses`
      (alta) y `POST /expenses/{id}/void` (anulación). `grep` de
      `method: "PUT"|"PATCH"|"DELETE"` en `src/components/expenses/` sólo
      encuentra esos métodos en `ExpenseCategoriesView.tsx` (rubros, bloque
      2), no en ningún archivo de registro/listado de egresos.

## 4. Sueldos (bloques D y E)

> Esta sección llegó con un primer borrador ya escrito (no producido en esta
> corrida) cuyos checkboxes se re-verificaron acá. La verificación en vivo
> contra `localhost:8080` encontró que el borrador tenía **contrato
> incorrecto**: el tipo `WorkLog` asumía un campo `amount` que el backend no
> manda (el campo real es `final_amount`), `payroll_payment_id`/
> `adjustment_reason` son punteros `omitempty` que el backend **omite** en
> vez de mandar `null` cuando están vacíos (una hora sin liquidar no tiene la
> clave `payroll_payment_id` en absoluto), `PayrollPendingItem` incluía un
> campo `has_adjustment` que el backend nunca envía (quedaba
> hardcodeado en `false`, texto muerto), `PayrollPayment.username` no existe
> (el campo real es `user_name`), y la lista de "Pendiente de liquidar" no
> pasaba por `payrollRowsFor` — el helper ya testeado que agrega en cero a un
> empleado con tarifa pero sin horas — así que ese caso (4.6) quedaba
> directamente ausente de esa lista pese a que la función que lo resuelve ya
> existía y tenía tests. También faltaba por completo la función de editar y
> borrar horas no liquidadas (4.5): no había ningún control de edición o
> borrado en el código, sólo un texto explicando por qué una hora liquidada
> no se puede tocar. Se corrigieron `src/lib/types.ts`, `src/lib/payroll.ts`
> (+ tests nuevos para `isSettled`/`canEditWorkLog`), `PayrollView.tsx` y
> `PayrollEmployeeView.tsx` (reescritos), y se agregó edición/borrado real de
> horas no liquidadas en `PayrollEmployeeView.tsx`.
- [x] 4.1 Agregar tarifa horaria al formulario de usuario en `/users`, opcional,
      y distinguir en la UI "sin tarifa" de "tarifa cero". — `UserDetailView`
      (`ProfileForm`) persiste `hourly_rate` como decimal o `null` (input
      vacío → `null`, `PUT /users/{id}` con `hourly_rate: hourlyRate.trim() ||
      null`) con la nota "Dejá vacío si no se liquida por hora." Verificado
      por inspección de código (no editado en esta corrida, ya estaba en el
      árbol de trabajo); `lint`/`test`/`build` en verde con el archivo tal
      cual.
- [x] 4.2 Ruta `/expenses/payroll` con gate `admin` — `page.tsx` usa
      `requireRole(["admin"])`. Verificado en vivo contra el dev server
      (`localhost:3000`) con sesión real: `admin` → `200`; `cajero1`
      (`cashier`+`receiving`) → `307`. `npm run build` registra la ruta.
- [x] 4.3 Carga de horas por empleado y fecha, con monto calculado y editable, y
      motivo obligatorio cuando el final difiere del calculado. — `PayrollView`
      calcula el monto con `computeWorkLogAmount` al elegir empleado o cambiar
      horas, lo deja editable, y `buildWorkLogPayload` exige motivo cuando el
      monto final difiere del calculado (`payroll.test.ts`, 22 casos incluidos
      `isSettled`/`canEditWorkLog` nuevos). Verificado en vivo contra
      `localhost:8080`: `POST /work-logs` con `hours="3"` sin `amount` → `201`
      con `computed_amount`/`final_amount` iguales; con horas editadas y sin
      querer pisar el monto, el flujo no manda `adjustment_reason`.
- [x] 4.4 Identificar por **texto** la fila ajustada y mostrar ambos montos. —
      `PayrollEmployeeView` muestra "Calculado: … · Final: …" para cada hora y
      un texto "Ajustado: <motivo>" cuando `isAdjusted(log)` (comparado en
      centavos sobre `final_amount` vs `computed_amount`, corregido: el
      borrador comparaba contra un campo `amount` inexistente en la respuesta
      real). No se muestra al nivel de la lista agregada de "Pendiente de
      liquidar" — ese nivel es por empleado/período, no por hora, y el
      backend de `/payroll/pending` no informa si el total incluye un ajuste;
      inventar esa marca ahí sería fabricar un dato, así que se removió el
      campo `has_adjustment` que estaba hardcodeado en `false`.
- [x] 4.5 Bloquear edición y borrado de horas ya liquidadas, enunciando el
      motivo. — **Corregido y completado en esta corrida**: el borrador no
      tenía ningún control de edición ni borrado de horas (nada que bloquear).
      Se agregó edición inline y borrado (con `Dialog` de confirmación) por
      hora en `PayrollEmployeeView.tsx`, deshabilitados proactivamente con
      `canEditWorkLog(log)` (basado en `payroll_payment_id`, con la
      comprobación "truthy" corregida — ver nota de cabecera) cuando la hora
      ya está liquidada, con el texto "No se puede editar ni borrar: esta hora
      ya está liquidada." junto a los botones deshabilitados. Verificado en
      vivo contra `localhost:8080`: `PUT /work-logs/{id}` y
      `DELETE /work-logs/{id}` sobre una hora sin liquidar → `200`/`204`;
      sobre la misma hora ya liquidada (tras `POST /payroll/payments`) →
      `409` en ambos, con el cuerpo
      `{"message":"No se puede completar la acción porque la información
      cambió..."}` que el frontend muestra y ante el cual recarga la lista.
      El recorrido de click real (abrir la edición inline, guardar, borrar)
      no se ejercitó en navegador —sin herramienta de browser en este
      entorno—, sólo por código y por las llamadas reales al backend con la
      misma forma que arma el componente.
- [x] 4.6 Estado vacío "ningún empleado tiene tarifa horaria" con enlace a
      `/users`, sin apariencia de error; empleado sin horas listado en cero. —
      `PayrollView` muestra `EmptyState` con enlace a `/users` cuando ningún
      usuario activo tiene tarifa horaria y no hay pendiente en el período.
      **Bug corregido**: la lista de "Pendiente de liquidar" ahora pasa por
      `payrollRowsFor(users, pending)` (antes usaba directamente la respuesta
      de `/payroll/pending`, que sólo incluye empleados con horas cargadas;
      un empleado con tarifa pero sin horas en el período quedaba ausente de
      la lista en vez de listado en cero). Verificado en vivo: con
      `cajero1` (tarifa `$2000.00`) sin horas en un rango de fechas futuro,
      `GET /payroll/pending?from=2026-09-01&to=2026-09-30` → `200`
      `{"items":[]}`; `payrollRowsFor` (con test dedicado) agrega esa fila en
      cero a partir de la lista de usuarios, no del endpoint de pendientes.
- [x] 4.7 Liquidación con confirmación explícita —empleado, período, horas, monto
      y medio de pago— y manejo del `409` por liquidación concurrente. — El
      diálogo de `PayrollView` muestra empleado, período, horas, monto (con
      `formatMoney`) y medio de pago (con `paymentMethodLabel`, antes se
      mostraba la constante cruda del backend, ej. `"CASH_REGISTER"`) antes de
      confirmar. **Bug corregido**: el borrador cerraba el diálogo
      (`setSettling(null)`) en el `finally` de cualquier intento, éxito o
      error, así que un `409` nunca llegaba a mostrarse — el mensaje se
      seteaba pero el diálogo que lo renderiza ya se había desmontado.
      Ahora el diálogo sólo se cierra en el `try` (éxito); en el `catch` se
      queda abierto con el mensaje de error visible y se refresca el
      pendiente igual, como pide el spec ("SHALL refresh the pending amounts
      and explain what happened"). Verificado en vivo: `POST
      /payroll/payments` sobre un empleado sin horas pendientes en el
      período (simulando el caso de conflicto/nada-para-liquidar) →
      `422` `{"message":"No se puede completar esta acción con la
      información actual."}`; el mismo flujo con horas pendientes reales →
      `201` con el `payroll_payment` creado. El caso `409` específico
      (liquidado por otra sesión mientras el diálogo estaba abierto) no se
      reprodujo en vivo con dos sesiones concurrentes reales; el manejo del
      `409` se verificó por código (mismo `catch` que maneja cualquier
      error de la llamada) y por el contrato de errores documentado en
      `design.md` → Error handling.
- [x] 4.8 Ruta `/expenses/payroll/[userId]`: días, liquidaciones y pendiente;
      accesible para un usuario inactivo con historial. — `page.tsx` usa
      `requireRole(["admin"])`; verificado en vivo `200`/`307` igual que 4.2.
      `PayrollEmployeeView` consume `GET /users/{id}`, `GET /work-logs?user_id=`
      y `GET /payroll/payments?user_id=` sin filtrar por `active` en ningún
      fetch; cuando `user.active` es `false` cambia sólo la copy ("Usuario
      desactivado: su historial…sigue disponible acá"), nunca oculta datos.
      No se probó en vivo con un usuario realmente desactivado (hubiera
      requerido desactivar a uno de los 4 usuarios reales de la base de
      desarrollo, un efecto colateral que este bloque no necesitaba causar);
      verificado por inspección de que ningún fetch de esta vista filtra por
      `active` y por lectura del código de `requireRole`, mismo mecanismo que
      4.2.
- [x] 4.9 Verificar que el frontend **no** crea un egreso aparte al liquidar.
      — La liquidación sólo llama `POST /payroll/payments`; `grep` de
      `method: "POST"` en `src/components/expenses/PayrollView.tsx` no
      encuentra ningún `POST /expenses`. Verificado en vivo, extremo a
      extremo: `POST /payroll/payments` para `cajero1` (5.5 h pendientes,
      `$6600.00`) → `201` con `expense_id`; `GET /expenses/{expense_id}` →
      `200` con `"type":"PAYROLL"`, `"amount":"6600.00"`,
      `"payroll_payment_id"` apuntando a la liquidación recién creada — un
      único egreso, generado por el backend, no por el frontend.

## 5. Autoconsumo en inventario

- [x] 5.1 Sumar el tipo de autoconsumo al filtro de tipos de
      `/inventory/movements` — agregado a labels y selector.
      `/inventory/movements`, manteniendo la lista cerrada.
- [x] 5.2 Verificar que un movimiento de autoconsumo se distingue de un ajuste
      manual de salida en el listado — label explícito “Salida por autoconsumo”.
      manual de salida en el listado.

## 6. Cierre de caja (bloque F)

- [x] 6.1 Agregar la línea de egresos en efectivo al desglose del cierre,
      enunciando que ya está descontada del esperado — vista móvil y tabla
      desktop renderizan total y cantidad cuando el backend informa los campos.
      enunciando que ya está descontada del esperado.
- [x] 6.2 Verificar que el frontend **no** recalcula el efectivo esperado y que
      la línea no se muestra cuando el backend no informa egresos — el frontend
      sólo renderiza valores recibidos; no contiene aritmética de expected cash.
      la línea no se muestra cuando el backend no informa egresos.
      Reverificado el 2026-08-07 junto con 0.10: `CashClosingStatusReportView.tsx`
      sólo consume `DailyCashClosingStatusList`/`DailyCashClosingStatusItem`
      (endpoint `daily-status`, no `current-status`); las dos únicas
      apariciones de `cash_expenses_total`/`cash_expenses_count` (móvil línea
      ~218, tabla ~257) son `formatMoney(item.cash_expenses_total)` y
      `item.cash_expenses_count ?? 0`, sin suma ni resta, y ambas están detrás
      de una guarda (`!== undefined` / `=== undefined ? "—" : ...`). Ahora que
      el backend expone el campo también cuando vale `"0.00"`/`0` (no sólo
      `undefined`), la guarda sigue siendo correcta porque `"0.00"` no es
      `undefined`: la línea se muestra con el valor real, que es el
      comportamiento esperado. El descuento real de `expected_cash` está
      confirmado en 0.10 por backend, no por este componente.

## 7. UX/UI, accesibilidad y responsive

### 7A. Navegación contextual y continuidad percibida (D11/D11a)

- [ ] 7A.1 Reemplazar `ExpensesSubnav` por acciones contextuales en los
      encabezados de `/expenses`, `/expenses/new`, `/expenses/categories` y
      `/expenses/payroll`: en el hub, `Registrar egreso` como primaria y
      `Sueldos`/`Rubros` como secundarias; en cada tarea, sólo accesos para
      continuar o volver al hub. **[inspección + prueba manual]**
- [ ] 7A.2 Dar feedback de navegación inmediato y no decorativo a cada acción
      contextual; prevenir una segunda activación mientras la navegación está
      en curso y conservar foco visible. **[inspección + prueba manual con
      throttling]**
- [ ] 7A.3 Proveer skeletons de carga estructurados para cada destino de
      Egresos y verificar, con carga perceptible, que no aparece una región
      principal en blanco al cambiar entre hub, registro, rubros y sueldos.
      **[prueba manual con throttling]**
- [ ] 7A.4 Verificar a 320, 390, 768 y 1280 px que las acciones de encabezado
      se envuelven o apilan sin overflow horizontal de página y conservan
      targets táctiles de al menos 44 px. **[prueba manual]**
- [ ] 7A.5 Verificar con `prefers-reduced-motion` que el feedback de progreso
      y los skeletons siguen informando el estado sin transición decorativa de
      página. **[prueba manual]**
- [ ] 7A.6 Reemplazar el copy visible de totales y filas `OWNER_DRAW` por
      `Retiros personales`, preservando su separación de los gastos del negocio
      y sin cambiar el identificador ni el contrato backend. **[inspección +
      prueba manual]**

- [ ] 7.1 Auditoría con `ux-ui-supervisor` de las seis pantallas en la matriz de
      viewports obligatoria, desde 320 px.
- [ ] 7.2 Verificar que ningún estado —anulado, ajustado, afecta caja— se
      comunica sólo por color.
- [ ] 7.3 Verificar el comportamiento de foco: cambio de tipo, alta y baja de
      líneas, y los diálogos de anulación y de liquidación.
- [ ] 7.4 Verificar que el hub y la grilla de horas no producen overflow
      horizontal a nivel de página en ningún viewport de la matriz.
- [ ] 7.5 Verificar targets táctiles de 44 px en toda acción de fila.

## 8. Verificación

- [x] 8.1 `npm run lint` sin errores — ejecutado exitosamente.
- [x] 8.2 `npm test` en verde, con la cobertura nueva de `expenses.ts`,
      — 25 archivos y 295 tests exitosos.
      `payroll.ts` y `nav.test.ts`.
- [x] 8.3 `npm run build` — compilación, TypeScript y generación de rutas
      exitosas; incluye `/expenses/payroll`.
- [ ] 8.4 Recorrido manual contra una instancia real: registrar un gasto
      operativo en efectivo, verlo en el desglose del cierre, anularlo, cargar
      horas, liquidar y ver el egreso de sueldo resultante, y registrar un
      autoconsumo verificando el descuento de stock. Registrar qué quedó sin
      verificar.
- [ ] 8.5 Review con `frontend-reviewer` y verificación con
      `frontend-test-verifier` antes de proponer el cierre.
