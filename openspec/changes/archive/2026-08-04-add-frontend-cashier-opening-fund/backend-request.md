# Backend coordination: flexible cash shifts

La fuente de verdad es `../backend/openspec/changes/add-flexible-cash-shifts`.
Este documento sólo fija cómo la UI la consume; no solicita un contrato
alternativo.

## Endpoints verificados en el change backend

- `POST /api/v1/cashier-opening-funds` — Admin. Body:
  `{ "cashier_id": "…", "business_date": "YYYY-MM-DD", "amount": "250.00" }`.
  Aunque el nombre de campo histórico sea `cashier_id`, identifica un operador
  activo con rol `admin` o `cashier`. Responde `201` al crear, `200` al editar
  un fondo `declared` y `409` si ya fue confirmado.
- `GET /api/v1/cashier-opening-funds/current` — Admin o Cashier. No recibe
  identidad del operador y devuelve su fondo de la fecha de negocio actual o
  `null`.
- `POST /api/v1/cashier-opening-funds/{id}/confirm` — dueño Admin o Cashier.
  Confirma el fondo e inicia el turno.
- `POST /api/v1/cash-closings` — Admin o Cashier. Body breaking:
  `{ "to": "RFC3339", "counted_cash": "…", "notes": "…" }`; no acepta
  `from`. Responde el intervalo derivado, importes calculados y `state`.
- `PUT /api/v1/cash-closings/{id}` — dueño. Mismo body que POST; sólo un
  cierre `provisional` se puede corregir. Un sellado responde `409`.
- `GET /api/v1/cash-closings/current-status?date=YYYY-MM-DD` — Admin o
  Cashier, scopeado a sesión y fecha operativa.
- `GET /api/v1/cash-closings/daily-status?from=&to=&page=&limit=` — Admin.
  Las filas usan fecha operativa e incluyen `opening_fund` nullable con
  importe y estado cuando exista.

## Response shapes

`CashierOpeningFund` usa `operator_id`, `declared_by` y `confirmed_at`; no
`cashier_id` ni `declared_by_admin_id`. `CashClosing` añade
`state: "provisional" | "sealed"`. Todo monto es string decimal y todos los
errores son `{ "message": "…" }`.

## Known contract limits

- No existe un GET admin por operador/fecha. El formulario no puede precargar
  ni bloquear localmente un fondo confirmado: reenvía el POST y muestra el
  `409` autoritativo sin borrar lo ingresado.
- El reporte diario sólo contiene las filas que el backend devuelva; la UI
  muestra el resumen de fondo cuando viene en una fila y no fabrica una fila
  para un fondo sin actividad.
- No hay endpoint de previsualización de efectivo esperado para un turno
  abierto. Antes de guardar, la UI sólo confirma el efectivo contado; después
  renderiza los importes calculados de la respuesta del cierre.

## Unblocking criterion

La integración funcional queda bloqueada hasta verificar estos endpoints y
shapes contra una instancia real desplegada. La presencia del código en el
change backend no reemplaza esa prueba.
