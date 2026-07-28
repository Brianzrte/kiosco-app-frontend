# Pedido a backend: Cajero con acceso acotado a su historial del día y a dar de baja productos de sus propias ventas del día

> Prompt para la sesión de backend (skill `go-backend`, módulo `internal/sales`). Generado desde el frontend: decisión de producto tomada con el usuario, ver contexto abajo.

## Contexto y por qué el alcance es tan angosto

Hoy `GET /api/v1/sales` (listado operativo) y `POST/GET /api/v1/sales/{id}/returns` (devoluciones) son exclusivos de `admin`. El comentario en `internal/bootstrap/router.go` sobre las rutas de devolución es explícito: *"una devolución mueve mercadería y dinero en sentido inverso a una venta, y es el vector de fraude más obvio del sistema"*.

El producto necesita que un Cajero pueda:
1. Ver su propio historial de ventas del día (para encontrar la venta que acaba de cobrar).
2. Dar de baja un producto de una de sus propias ventas, con motivo, el mismo día que la cobró (ej. "cobré el producto equivocado, me di cuenta al toque").

Decisión de producto, ya tomada: **no** se amplía a cualquier venta propia sin límite de tiempo, y **no** se amplía a ventas ajenas bajo ninguna circunstancia — eso reabriría el vector de fraude que la restricción actual evita. El alcance pedido es deliberadamente angosto: propias, mismo día.

## 1. `GET /api/v1/sales`: aceptar rol `cashier`, scope forzado

Mismo pedido que ya está documentado en `add-frontend-sales-v15/tasks.md` sección "5b" — lo repito acá porque es prerrequisito de este change:

- Aceptar rol `cashier`.
- Ignorar (o rechazar) cualquier `cashier_id` que venga en la query cuando quien llama es `cashier`; forzar `cashier_id = usuario de la sesión` en el servidor, igual que ya hace `GetSale` con `CashierID`+`IsAdmin` en `application.GetSaleByIDInput`.
- No hace falta forzar un rango de fechas en el backend — el Cajero puede seguir viendo su propio historial más allá de hoy si pagina hacia atrás; "ver su historial del día" es el caso de uso principal que resuelve el frontend con el filtro de fecha por defecto, no una restricción de seguridad.

## 2. `POST /api/v1/sales/{id}/returns` y `GET /api/v1/sales/{id}/returns`: aceptar rol `cashier`, scope forzado a "propia + mismo día"

- Aceptar rol `cashier` en `RegisterReturn` y `ListSaleReturns`.
- Antes de ejecutar, verificar en el caso de uso (no sólo en el router):
  - `sale.CashierID == usuario de la sesión` — mismo patrón que `GetSaleByIDInput.CashierID`.
  - `sale.ConfirmedAt` cae dentro del día actual, con el mismo criterio de zona horaria que ya usa el backend para agrupar reportes por día (`group_by=day` en `internal/reporting`). Si la venta es de un día anterior, aunque sea propia → rechazar.
- Si cualquiera de las dos condiciones falla → `403`, mismo código que usa el resto del sistema para "no autorizado", no `404` (no hay que ocultar que la venta existe, sólo que no se puede operar sobre ella).
- Admin no cambia: sigue sin restricción de propiedad ni de fecha.

## 3. `GET /api/v1/returns/{id}`: mismo scope si el caller es `cashier`

Para que el Cajero pueda ver el detalle de una devolución que él mismo registró (ej. después de confirmarla). Mismo criterio: propia + mismo día que la venta referenciada. Si no aplica → `403`.

## 4. Pregunta abierta para el frontend: ¿el backend puede indicar el límite de horario?

Para no mostrarle al Cajero un botón que va a fallar, sería útil que la respuesta de `GET /sales/{id}` (o de la propia venta en el listado) indique de alguna forma si todavía está "dentro de ventana" para dar de baja — por ejemplo, devolviendo la fecha de corte, o un booleano. No es bloqueante: si no se agrega, el frontend muestra la acción siempre que el rol lo permita y deja que el backend la rechace con su mensaje cuando corresponda, que es la respuesta correcta cuando no hay otro dato para decidir con certeza.

## Fuera de alcance de este pedido

- No se pide ampliar a Cajero el acceso a `GET /api/v1/reports/*` — sigue siendo admin-only, sin cambios.
- No se pide que el Cajero pueda dar de baja ventas ajenas ni de días anteriores, bajo ninguna circunstancia.
- No se pide un concepto de "turno" o "cierre de caja" para definir "el día" — se usa el día calendario del servidor, igual que el resto del sistema.

## Checklist de verificación sugerida

- [ ] `GET /sales?cashier_id=<otro-id>` llamado por un cajero devuelve sólo las ventas del cajero autenticado, ignorando el `cashier_id` de la query
- [ ] `POST /sales/{id}/returns` sobre una venta propia de hoy, llamado por el cajero dueño → `201`
- [ ] `POST /sales/{id}/returns` sobre una venta ajena, llamado por un cajero → `403`
- [ ] `POST /sales/{id}/returns` sobre una venta propia de ayer, llamado por el cajero dueño → `403`
- [ ] Las mismas tres verificaciones para `GET /sales/{id}/returns` y `GET /returns/{id}`
- [ ] Admin sigue sin ninguna restricción nueva en ninguno de estos endpoints
