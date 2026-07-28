# Design: add-frontend-sales-returns

## Context

Endpoints de `add-sales-returns`, hoy sólo `admin`:

| Método | Ruta |
|---|---|
| `POST` | `/api/v1/sales/{id}/returns` |
| `GET` | `/api/v1/sales/{id}/returns` |
| `GET` | `/api/v1/returns/{id}` |

**Ampliación pedida a backend** (ver `backend-request.md`): que estas rutas, y `GET /api/v1/sales`, acepten también rol `cashier`, con el alcance forzado en servidor a "propias ventas confirmadas el mismo día". El código de `bootstrap/router.go` documenta las devoluciones como "el vector de fraude más obvio del sistema" — esa es la razón por la que el alcance no puede quedar en manos del frontend: tiene que ser el mismo tipo de verificación server-side que ya usa `GetSale` (`CashierID` + `IsAdmin` en el caso de uso), extendida con una comparación de fecha.

Reglas del backend que la UI debe reflejar sin reimplementar:

- Devolución **parcial**, por ítem y cantidad, hasta lo vendido menos lo ya devuelto.
- **Motivo obligatorio**, validado en dominio y en constraint de DB.
- El stock se reintegra automáticamente, con un movimiento `RETURN` por ítem.
- La venta original **no cambia**.
- La devolución es **inmutable**: no hay anulación.
- El sistema **no ejecuta reintegro de dinero**.

## Goals / Non-Goals

**Goals:**
- Registrar qué se devolvió, cuánto, de qué venta y por qué, sin fricción innecesaria.
- Que quede claro qué hace el sistema y qué queda a cargo de la persona en el mostrador.
- Que la irreversibilidad se entienda antes de confirmar.

**Non-Goals:**
- **Anular una devolución: evaluado y desestimado.** Se revisó explícitamente si el backend ofrece el servicio: `add-sales-returns` expone únicamente `POST /sales/{id}/returns`, `GET /sales/{id}/returns` y `GET /returns/{id}` (ver `tasks.md:42`). No hay endpoint de anulación, ni tabla ni estado que lo soporte, y el propio design del backend lo deja como su pregunta abierta más importante. Construirlo del lado del frontend exigiría inventar el modelo de la anulación —¿devolución inversa? ¿estado anulado? ¿quién autoriza?— que es exactamente lo que `CLAUDE.md` §1 prohíbe. Si el backend lo agrega, es un change propio del frontend.
- Devolución sin venta de referencia.
- Reglas de plazo, estado del producto devuelto, o cargos por reposición: ninguna está definida y el frontend no las inventa.
- Elegir de qué método de pago se reintegra: depende de una política de negocio que nadie definió. El backend lo dejó explícitamente fuera.
- Reporte de devoluciones por período: fuera de alcance del backend.
- **Cajero dando de baja ventas ajenas o de días anteriores.** Deliberadamente fuera de alcance — es exactamente el vector de fraude que motiva que el backend restrinja devoluciones. Si en el futuro se necesita, es una decisión de producto nueva, no una ampliación silenciosa de ésta.

## Decisions

**El alcance de Cajero se aplica en el servidor, nunca en el cliente — mismo principio que la lista de ventas.**
Igual que en `add-frontend-sales-v15` (sección "Historial del Cajero"), la tentación es pedir todas las ventas o intentar la devolución igual y confiar en que el backend la rechace si no corresponde — eso funciona como control de errores, pero no alcanza como control de acceso si en algún punto la UI decide qué mostrar basándose en datos que ya viajaron. El frontend pide con el token de sesión del Cajero; el backend decide si esa venta es suya y es de hoy. Si el backend rechaza, se muestra su mensaje — nunca se intenta adivinar la razón ni se reintenta con otro parámetro.

**"El mismo día" lo define el servidor, no el reloj del navegador.**
Un cajero con la hora de su máquina mal configurada, o una venta confirmada a las 23:58, no pueden generar un resultado distinto según quién mire. La comparación de fecha vive en el backend (mismo criterio de zona horaria que ya usa para agrupar reportes por día), y el frontend no la recalcula para decidir si mostrar el botón — lo muestra siempre que el rol lo permita y dejaría que un intento tardío falle con el mensaje del backend, salvo que el propio backend devuelva la fecha límite en la respuesta de la venta para ocultar el botón sin necesidad de intentarlo. **Verificar al implementar** qué provee el backend.

**La acción se llama igual para Admin y para Cajero.**
No hay una version "chica" de la devolución para Cajero y otra "completa" para Admin — es la misma entidad, el mismo formulario, las mismas advertencias sobre dinero e irreversibilidad. Lo único que cambia es qué ventas puede alcanzar cada rol. Dos flujos distintos para el mismo concepto sería inventar una distinción que el dominio no tiene.

**El límite disponible por ítem se muestra antes de elegir, no después de errar.**
La regla es "vendido menos ya devuelto", y sólo el backend la conoce con certeza. La pantalla la muestra por ítem antes de que el operador escriba nada:

```
  Coca-Cola 600ml     vendidas 5 · ya devueltas 2 · disponibles 3
  [ 0 ]──────[ 3 ]
```

El control no permite pasarse: el máximo es lo disponible. Esto **no es una regla inventada** — es el dato que el backend devuelve, reflejado como límite del control. La validación real sigue siendo del backend, que valida bajo lock transaccional porque dos devoluciones concurrentes podrían pasar ambas una verificación previa.

Si el backend rechaza igual por concurrencia, se muestra su mensaje y se recargan las cantidades disponibles: es la única respuesta correcta, porque el dato que la pantalla tenía quedó viejo.

**Los ítems ya devueltos por completo se muestran, agotados.**
No se ocultan. Un ítem sin disponibilidad aparece con su cantidad en cero y una marca de "ya devuelto", porque su ausencia haría dudar de si la venta lo incluía. La lista de la devolución tiene que reflejar la venta completa.

**El monto es "valor de lo devuelto", no "a devolver".**
Es la advertencia que el backend pidió cargar. La UI no puede llamarlo "Total a reintegrar" ni "Devolución de $X", porque eso afirma algo que el sistema no hace.

Se rotula como el valor de la mercadería devuelta, y junto a la confirmación se dice explícitamente que el sistema **no** ejecuta el reintegro: registra la devolución y reintegra el stock, y la entrega del dinero es del mostrador.

Es texto que va a parecer excesivo a quien conoce el sistema, y es justamente para quien no lo conoce. La alternativa —un monto sin aclaración— produce la creencia de que el dinero ya se movió, que es el error caro.

**La confirmación dice que no hay vuelta atrás, y por qué.**
Una devolución no se puede anular. El diálogo lo dice, y dice que la única corrección posible es un ajuste manual de stock que no borra el registro.

No se ofrece deshacer. No se usa lenguaje que sugiera reversibilidad ("podés modificarla después").

**El motivo es texto libre obligatorio, y se explica para qué sirve.**
El backend exige motivo no vacío. El campo lleva una línea que dice que queda en la traza permanente de la devolución y en el movimiento de stock: es lo que hace que alguien escriba "producto vencido" en vez de "x".

Se valida no vacío tras recortar espacios, del mismo modo que el ajuste de stock.

**El acceso se llega desde la venta, nunca desde un menú suelto.**
Una devolución siempre cuelga de una venta confirmada. El camino es: encontrar la venta —por número, que es lo que trae el cliente— y desde su detalle registrar la devolución. No hay una sección "Devoluciones" de nivel superior, porque no se puede empezar una devolución sin venta.

Esto ata este change a `add-frontend-sales-v15`: la búsqueda por número de venta es el camino de entrada.

**El historial de devoluciones vive en el detalle de la venta.**
Es donde surge la pregunta ("¿de esta venta ya devolvieron algo?"), y es lo que explica por qué las cantidades disponibles son menores que las vendidas.

## Risks / Trade-offs

- **Alguien va a asumir que el sistema devolvió el dinero** → Es el riesgo principal y sólo se mitiga con texto. Conviene validar la redacción con quien opera, no darla por buena desde el escritorio.
- **Una devolución mal registrada es permanente** → Limitación del backend, comunicada antes de confirmar. Es la pregunta abierta más importante de todo `add-sales-returns`.
- **Devoluciones concurrentes de la misma venta pueden invalidar lo que la pantalla muestra** → Se muestra el mensaje del backend y se recargan las disponibilidades. No se reintenta automáticamente.
- **Restringido a Admin resultaba demasiado rígido en el mostrador** → Resuelto parcialmente: se pidió a backend ampliar a Cajero acotado a "propias ventas, mismo día" (ver `backend-request.md`), que reduce buena parte del vector de fraude sin dejar la acción completamente cerrada. Cualquier ampliación más allá de eso (ventas ajenas, días anteriores) sigue siendo exclusiva de Admin por decisión deliberada.
- **La ampliación a Cajero no está desplegada todavía** → La parte de Admin de este change no depende de ella y puede implementarse ya; la parte de Cajero queda bloqueada hasta que el backend confirme el despliegue.
- **La mercadería devuelta vuelve al stock como vendible** → El sistema no distingue el estado del producto. Si vuelve roto, hace falta un ajuste manual posterior. Vale la pena decirlo en la pantalla.

## Migration Plan

Aditivo. Se despliega después de `add-sales-returns` en backend. Preferentemente después de `add-frontend-inventory-v15`, para que los movimientos `RETURN` generados sean consultables desde algún lado.

Rollback: revertir el frontend. Las devoluciones registradas quedan en el backend sin pantalla que las muestre.

## Open Questions

- **¿Cómo se corrige una devolución registrada por error?** Se pidió implementar la anulación *si el backend ofrecía el servicio*; no lo ofrece, así que queda desestimada por ahora. La pregunta sigue viva del lado del backend, que la tiene como su pregunta abierta más importante. Cuando exista el endpoint, el frontend lo cubre en un change propio: la UI ya advierte la irreversibilidad, así que el cambio sería agregar la acción y reescribir esa advertencia.
- **¿Cuál es la política de reintegro con pago mixto?** Bloqueante para cualquier reintegro real; la define el negocio.
- ¿Debe la UI ofrecer marcar la mercadería devuelta como no apta para reventa? Hoy no existe el dato; el backend lo identificó como candidato a un campo `restock` si se vuelve frecuente.
- ¿Hace falta un reporte de devoluciones por período? Natural una vez que existan los datos.
