# Design: add-frontend-sales-payments

## Context

El contrato nuevo:

- `PUT /api/v1/sales/{id}/payment` recibe **la lista completa** de pagos y la reemplaza atómicamente. No acumula.
- Cada pago es `{ method: "CASH"|"CARD", amount: "12.50" }`. El monto es positivo.
- Registrar pagos **no** valida contra el total: el total puede cambiar después.
- `POST /sales/{id}/confirm` exige que la suma sea **exactamente** igual al total. Si no, `422`.
- `payment_method` desaparece de las respuestas; llega `payments`.

Dos pagos del mismo método en una venta son válidos. No se registra el vuelto.

## Goals / Non-Goals

**Goals:**
- No penalizar el caso común. La venta de un método sigue siendo un toque.
- Que la aritmética se resuelva en pantalla, no en un `422`.
- No perder un centavo al repartir un total entre métodos.

**Non-Goals:**
- Métodos nuevos (transferencia, QR): el enum sigue en `CASH`/`CARD`.
- Pagos parciales en el tiempo, fiado, señas.
- Persistir el efectivo entregado o el vuelto: el backend no los guarda y no se simulan.
- Reintegros: son `add-frontend-sales-returns`.

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

## Risks / Trade-offs

- **Es el cambio más disruptivo de V1.5 y toca la ruta crítica** → Despliegue simultáneo obligatorio. Un frontend viejo contra un backend nuevo no puede confirmar ninguna venta: el body no valida. Es una caída total de la operación, no una degradación.
- **El centavo perdido al repartir** → Mitigado por diseño con la regla de resta. Test obligatorio con totales de reparto incómodo (0.01, 0.05, 33.33) para verificar que la confirmación nunca se rechaza por redondeo.
- **La función de dividir puede quedar tan escondida que nadie la encuentre** → El riesgo inverso de proteger el camino rápido. Debe ser descubrible desde la pantalla de pago, no detrás de un menú.
- **Los reportes por método sobre datos migrados muestran un pago único por venta histórica** → Correcto: es lo que la migración del backend genera y refleja lo que se sabía entonces.
- **Cambiar ítems con pago dividido exige rehacer el reparto** → Inevitable; sólo el cajero sabe cómo repartir el monto nuevo. Se mitiga haciendo visible la diferencia en el momento, no al confirmar.

## Migration Plan

1. Verificar en backend `SELECT DISTINCT payment_method FROM sales` antes de la migración (paso del lado del backend, pero condiciona el despliegue).
2. **Desplegar backend y frontend simultáneamente.** No hay orden seguro: el contrato cambia en ambos sentidos.
3. Probar en producción una venta de método único y una dividida, antes de dar el despliegue por bueno.

Rollback: revertir ambos. `sales.payment_method` sigue existiendo del lado del backend precisamente como red de seguridad, así que el modelo viejo vuelve a funcionar.

## Open Questions

- ¿Hace falta registrar el efectivo entregado para arqueo de caja? Hoy es local y se pierde al confirmar. Si se pide, es un campo del backend, no un monto inflado en los pagos.
- ¿Cómo debe representar el listado de reportes una venta con pago mixto? El backend dejó la decisión al consumidor: acá se propone el desglose con montos, no una etiqueta "Mixto".
- ¿Cuántos pagos por venta tiene sentido admitir en la UI? El backend no pone límite. Más de dos parece improbable en un kiosco; conviene diseñar para dos y no impedir un tercero.
