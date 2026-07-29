# Design: add-frontend-sales-payments

## Context

El contrato nuevo:

- `PUT /api/v1/sales/{id}/payment` recibe **la lista completa** de pagos y la reemplaza atómicamente. No acumula.
- Cada pago es `{ method: "CASH"|"CARD", amount: "12.50" }`. El monto es positivo.
- Registrar pagos **no** valida contra el total: el total puede cambiar después.
- `POST /sales/{id}/confirm` exige que la suma sea **exactamente** igual al total. Si no, `422`.
- `payment_method` desaparece de las respuestas; llega `payments`.

Dos pagos del mismo método en una venta son válidos. No se registra el vuelto.

**`TRANSFER` ya existe en el backend.** El change backend `add-reports-detail-inventory-valuation` agregó `PaymentTransfer PaymentMethod = "TRANSFER"` a `PaymentMethod.Valid()` (`internal/sales/domain/sale.go`), con la migración `021_add_transfer_payment_method` sobre el `CHECK` de `sale_payments.method` y un test de integración de venta confirmada con pago `TRANSFER` (tasks 1.1–1.4, completas). `PUT /api/v1/sales/{id}/payment` acepta `{ method: "TRANSFER", amount }` con el mismo contrato que `CASH`/`CARD`, sin diferencias de forma. Ese change backend está esperando esta validación del lado del frontend antes de sincronizar sus specs y archivarse (su tarea 5.3). Queda pendiente de **confirmar**, no de construir, si ese código y esa migración ya están desplegados en el/los ambientes reales que sirven a este frontend — ver `Backend coordination`.

## Goals / Non-Goals

**Goals:**
- No penalizar el caso común. La venta de un método sigue siendo un toque.
- Que la aritmética se resuelva en pantalla, no en un `422`.
- No perder un centavo al repartir un total entre métodos.
- Habilitar transferencia como tercer método de un solo toque, ya soportado por el backend, con su propio color en el selector del POS.

**Non-Goals:**
- Métodos nuevos más allá de transferencia (QR, billeteras): el enum queda en `CASH`/`CARD`/`TRANSFER`.
- **Transferencia como pata de un pago dividido.** El compositor de split sigue limitado a `CASH`/`CARD`; Transferencia se ofrece únicamente como método único de un solo toque. Ver la decisión "Transferencia no participa del split" más abajo y `Open Questions`.
- Pagos parciales en el tiempo, fiado, señas.
- Persistir el efectivo entregado o el vuelto: el backend no los guarda y no se simulan.
- Reintegros: son `add-frontend-sales-returns`.
- Color de método de pago fuera del selector del POS: `SaleDetail.tsx`, `SalesView.tsx` y `SalesReportView.tsx` siguen mostrando el método como texto plano, igual que hoy con Efectivo y Tarjeta — agregarle color sólo a Transferencia ahí sería menos consistente, no más.

## Decisions

**El camino rápido no cambia. Es la decisión más importante del change.**

`CLAUDE.md` §1 pone la velocidad del cajero como prioridad número uno. Un modelo de datos más expresivo no puede convertirse en más trabajo para el 95% de las ventas que se pagan con un método.

```
   ANTES                        AHORA
   ─────                        ─────
  [ Efectivo ] [ Tarjeta ]     [ Efectivo ] [ Tarjeta ]
        │                            │
        ▼                            ▼
    confirmar               imputa el TOTAL COMPLETO
                            al método elegido
                                     │
                                     ▼
                                confirmar
                            ┌────────────────┐
                            │ Dividir pago   │ ← opcional,
                            └────────────────┘   sólo si se busca
```

Elegir un método arma internamente una lista de un pago por el total. El cajero no ve montos, ni sumas, ni nada nuevo. **Dividir es una acción secundaria**, no un modo en el que haya que entrar cada vez.

Se descarta el diseño "obvio" —una grilla de montos por método siempre visible— porque cobra a todas las ventas el costo de una función que se usa en pocas.

**El reparto se hace por resta, nunca por división.**
Acá está el centavo perdido que el backend señaló. Repartir 100.00 entre dos métodos "por mitades" produce 50.00 y 50.00, pero repartir 0.05 produce 0.025 y el redondeo de ambos lados da 0.06 o 0.04 — y la confirmación se rechaza con un `422` que el cajero no puede interpretar.

La regla es: **el cajero escribe un monto; el otro es el resto.**

```
  total: 73.50
  efectivo: [ 50.00 ]   ← lo escribe el cajero
  tarjeta:    23.50     ← calculado como total − efectivo
```

La resta decimal de dos valores de dos decimales es exacta. No hay división, no hay reparto proporcional, no hay redondeo. Con tres o más pagos, el último absorbe el resto por la misma regla.

Toda la aritmética usa el helper decimal existente (`lib/money.ts`), nunca `parseFloat`.

**El faltante se muestra en vivo y bloquea la confirmación en el cliente.**
El backend rechaza con `422` al confirmar. Llegar a ese error es una falla de diseño de la UI: la información para evitarlo está toda en pantalla.

Se muestra permanentemente la diferencia entre pagos y total, con tres estados: falta X, sobra X, o cierra. Confirmar se deshabilita mientras no cierre.

Esto **no es inventar una regla de negocio**: es la misma regla del backend, ya especificada, reflejada antes de disparar el request. El backend sigue siendo la autoridad y su `422` se muestra si igual ocurre.

**El vuelto se calcula y se muestra, y no se manda.**
Con efectivo, el cajero suele recibir más de lo que corresponde. El campo de "entregado" es local: sirve para mostrar el vuelto y nada más. Lo que se imputa al método es el monto que corresponde, no lo entregado.

Es la separación que el backend pidió explícitamente al rechazar el sobrepago: lo que la venta registra es cuánto se imputó, no cuánto papel cambió de manos.

**Cambiar ítems después de registrar pagos deja la venta sin cerrar, y hay que decirlo cuando pasa.**
El backend lo especificó como escenario. Si el cajero agrega un producto después de componer el pago, la suma deja de coincidir. El aviso aparece **en el momento del cambio**, no al confirmar: el estado de diferencia se recalcula y se hace visible ahí mismo.

Con un solo método el caso se resuelve solo: el pago único se reimputa al nuevo total sin intervención. Sólo hay que resolver a mano cuando el pago está dividido, que es cuando el reparto es una decisión del cajero y el sistema no puede tomarla por él.

**No implementar la capa de compatibilidad temporal.**
El backend la ofrece como opcional. La recomendación es **no usarla** y desplegar simultáneamente: es un solo frontend contra un solo backend, sin clientes de terceros. Una capa de compatibilidad sin fecha de retiro se vuelve permanente, y su costo es que el backend acepta dos formas del mismo request — el escenario donde un bug del frontend pasa silenciosamente por el camino viejo.

**El desglose se muestra según cuántos pagos haya.**
En listados y reportes, un pago se muestra como hasta ahora ("Efectivo"). Dos o más se muestran como desglose con montos. No se inventa una etiqueta "Mixto" que esconda la composición: en un listado de ventas, saber que fue mixto sin saber cuánto de cada uno no sirve para nada.

**Transferencia es un tercer método de un solo toque, con el mismo comportamiento que Efectivo y Tarjeta.**
El cajero elige Transferencia y el total completo se imputa a ese método, sin pedir monto — no es un caso especial del compositor de pagos, es el mismo camino rápido que ya existe para los otros dos métodos, con un tercer valor de `SplitPaymentMethod`.

```
[ Efectivo ] [ Tarjeta ] [ Transferencia ]
```

**El color de Transferencia se deriva en la misma familia OKLCH que Efectivo y Tarjeta, no del `--color-pastel-blue` genérico.**
`globals.css` ya documenta la receta (comentario en "POS payment accents"): `--color-payment-cash` (`#c3ddc2`) y `--color-payment-card` (`#e5d2b0`) están anclados a L≈0.871, C≈0.046–0.050 (banda de croma apagado del brand, la misma de `--color-border` y `--color-primary`), cada uno con su propio matiz. Aplicando el mismo método (`ai/skills/ux-ui-supervisor/references/color-system.md`, "Construir una escala con OKLCH") con un matiz celeste (H≈230, la familia azul/celeste, distinta del verde de cash H≈144 y del ocre de card H≈82) y la misma banda de L/C, resulta:

```
--color-payment-transfer: #b5dbee;  /* OKLCH(0.871 0.048 230) */
```

Contraste contra `--color-text-primary` (`#1f2937`, el mismo texto que ya usan los botones de Efectivo y Tarjeta): **10.0:1**, en línea con cash (10.1:1) y card (9.9:1) — cumple AA (mínimo 4.5:1) con el mismo margen que los otros dos. Se descarta `--color-pastel-blue` (`#bae1ff`, L≈0.892, C≈0.058, H≈241) porque es la paleta candy de categorías/badges, un rol visual distinto (decorativo, no de estado de selección) y con croma más alta que la banda apagada de los otros dos métodos de pago — mezclarlas rompería la lectura de "estos tres botones son la misma familia".

Igual que Efectivo y Tarjeta, el color no es el único canal: el borde y el estado del `radio` subyacente ya comunican la selección de forma no visual, el mismo patrón se extiende a Transferencia sin diseño nuevo.

**Transferencia no participa del compositor de pago dividido.**
El compositor de split (`composeSplitPayment`/`otherMethod`) es hoy un toggle binario entre `CASH` y `CARD` construido para exactamente dos métodos. Ofrecer Transferencia como una de las dos patas de un split exigiría rediseñar esa función para elegir "cuál de los otros dos métodos" en vez de "el otro método" — un cambio de alcance no pedido y no necesario: no hay ningún caso de uso señalado de "una parte por transferencia, otra en efectivo". La UI del POS **no debe ofrecer** la acción "Dividir pago" cuando el método elegido es Transferencia (se oculta o deshabilita, igual que hoy no hay forma de dividir sin haber elegido primero un método). Esto evita que `otherMethod("TRANSFER")` se invoque nunca — hoy devolvería `"CASH"` incorrectamente porque su lógica sólo conoce dos valores, y no se corrige esa función en este change porque no la usa ningún camino con Transferencia. Ver `Open Questions` para si esto se generaliza a futuro.

## Risks / Trade-offs

- **Es el cambio más disruptivo de V1.5 y toca la ruta crítica** → Despliegue simultáneo obligatorio. Un frontend viejo contra un backend nuevo no puede confirmar ninguna venta: el body no valida. Es una caída total de la operación, no una degradación.
- **El centavo perdido al repartir** → Mitigado por diseño con la regla de resta. Test obligatorio con totales de reparto incómodo (0.01, 0.05, 33.33) para verificar que la confirmación nunca se rechaza por redondeo.
- **La función de dividir puede quedar tan escondida que nadie la encuentre** → El riesgo inverso de proteger el camino rápido. Debe ser descubrible desde la pantalla de pago, no detrás de un menú.
- **Los reportes por método sobre datos migrados muestran un pago único por venta histórica** → Correcto: es lo que la migración del backend genera y refleja lo que se sabía entonces.
- **Cambiar ítems con pago dividido exige rehacer el reparto** → Inevitable; sólo el cajero sabe cómo repartir el monto nuevo. Se mitiga haciendo visible la diferencia en el momento, no al confirmar.
- **Habilitar Transferencia contra un backend que todavía no tiene desplegada la migración `021_add_transfer_payment_method`** → El código y la migración ya están completos en el working tree de `../backend` (change `add-reports-detail-inventory-valuation`), pero no está confirmado que estén desplegados en el ambiente real que sirve a este frontend. Si el `CHECK` desplegado sigue siendo `CASH`/`CARD` únicamente, una venta por Transferencia falla al confirmarse con un error de base de datos. Riesgo menor que el de split payment (no cambia la forma del body, sólo agrega un valor válido más), pero real. Se mitiga con una tarea de verificación explícita antes de habilitar la opción en producción (`tasks.md`, sección 9) — no requiere `backend-request.md` porque no hay nada que pedir, sólo confirmar una ventana de despliegue ya resuelta del lado del backend.

## Migration Plan

1. Verificar en backend `SELECT DISTINCT payment_method FROM sales` antes de la migración (paso del lado del backend, pero condiciona el despliegue).
2. **Desplegar backend y frontend simultáneamente.** No hay orden seguro: el contrato cambia en ambos sentidos.
3. Probar en producción una venta de método único y una dividida, antes de dar el despliegue por bueno.
4. **Transferencia no exige migración de datos.** No hay ventas históricas que reinterpretar: `TRANSFER` es un valor nuevo hacia adelante, no una reclasificación de datos existentes. Antes de mostrar la opción en producción, confirmar que `add-reports-detail-inventory-valuation` (migración `021_add_transfer_payment_method` + código de dominio) está desplegado en el ambiente real — ver `Backend coordination`.

Rollback: revertir ambos. `sales.payment_method` sigue existiendo del lado del backend precisamente como red de seguridad, así que el modelo viejo vuelve a funcionar. Para Transferencia en particular, el rollback es aún más simple: alcanza con ocultar la tercera opción del selector y de los diccionarios de labels; el backend sigue aceptando `TRANSFER` sin problema, no hace falta revertir nada de su lado.

## Backend coordination

- `TRANSFER` como método de venta ya está implementado y probado en `../backend` (`add-reports-detail-inventory-valuation`, tasks 1.1–1.4). No se necesita `backend-request.md`: no hay endpoint faltante, ni cambio de contrato, ni cambio de autorización — el contrato de `PUT /sales/{id}/payment` es idéntico al que ya usa `CASH`/`CARD`.
- Lo único pendiente de confirmar (no de construir) es el **despliegue** de ese código en el ambiente real que sirve a este frontend. Es una coordinación de ventana de despliegue, no un pedido de feature — se resuelve como prerrequisito en `tasks.md` (sección 9), no como `backend-request.md`.
- Ese change backend tiene su propia tarea pendiente de sincronizar specs y archivarse (5.3), condicionada a esta validación del frontend.

## Open Questions

- ¿Hace falta registrar el efectivo entregado para arqueo de caja? Hoy es local y se pierde al confirmar. Si se pide, es un campo del backend, no un monto inflado en los pagos.
- ¿Cómo debe representar el listado de reportes una venta con pago mixto? El backend dejó la decisión al consumidor: acá se propone el desglose con montos, no una etiqueta "Mixto".
- ¿Cuántos pagos por venta tiene sentido admitir en la UI? El backend no pone límite. Más de dos parece improbable en un kiosco; conviene diseñar para dos y no impedir un tercero.
- ¿Transferencia como pata de un pago dividido, a futuro? Hoy no hay caso de uso señalado y el compositor de split queda limitado a `CASH`/`CARD` (ver Non-Goals y la decisión "Transferencia no participa del compositor de pago dividido"). Si en el futuro se pide, `otherMethod()` deja de ser un toggle binario y pasa a "elegir cuál de los otros dos métodos" — es un rediseño de ese helper, no una extensión trivial.
