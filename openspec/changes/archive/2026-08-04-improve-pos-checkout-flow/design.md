## Context

`src/components/pos/PosView.tsx` (1334 líneas, 23 `useState`, 5 `useRef`) es
el único archivo cliente del POS: escaneo, búsqueda, carrito, pesables, precio
real, pago y confirmación viven en un mismo componente sin lógica extraída a
`src/lib/`. Un análisis de comportamiento sobre ese archivo (íntegro) encontró
los defectos descritos en `proposal.md`: guarda de escaneo ausente, stock
bloqueante en el camino crítico, error de peso global en vez de por línea,
subtotal inconsistente tras un peso inválido, un draft de venta duplicable
por reintento, y una región de cobro con hasta cinco variables de estado sin
prioridad.

Este change corrige ese comportamiento y descompone el componente. No toca la
composición de columnas de la pantalla: `refactor-erp-pos-visual-system` tiene
un `design.md` aprobado (mockup B, decisión 4 "POS conserva prioridad
operacional") sin implementar (0/23 tareas) que decide esa dirección de
layout; este change se diseña para ser compatible con esa dirección o con
cualquier otra que se decida después. `audit-pos-density-and-header-overflow`
ya está commiteado (altura del input de escaneo, composición lado a lado,
grid de filas del carrito) y no se revierte.

## Goals / Non-Goals

**Goals:**

- Eliminar las condiciones de carrera y de estado inconsistente del carrito y
  del envío de venta descritas en `proposal.md`.
- Dar a cada zona de estado (entrada, cobro) una única fuente de verdad con
  prioridad explícita, en vez de variables que se superponen.
- Extraer lógica de carrito, resolución de mensajes de estado y secuencia de
  envío de venta a funciones puras testeables en `src/lib/`.
- Hacer que `PosView.tsx` orqueste sub-componentes en vez de contener todo el
  JSX y el estado.
- Agregar atajos de teclado visibles, agrupar el tab order del carrito por
  línea, mantener el dropdown de búsqueda superpuesto sin desplazar el
  carrito y dar scroll propio al carrito.
- Persistir carrito y medio de pago en `sessionStorage` para sobrevivir un
  refresh accidental.

**Non-Goals:**

- No cambia la cantidad de columnas ni la composición rail/catálogo/carrito
  de la pantalla (decisión de layout de `refactor-erp-pos-visual-system`).
- No fusiona el campo de escaneo y el de búsqueda por nombre en un único
  omnibox; sólo corrige que el dropdown de resultados no desplace el carrito.
- No cambia contrato de `PUT /sales/{id}/payment` ni agrega pago dividido en
  más de dos tramos o con Transferencia.
- No implementa venta atómica, búsqueda server-side, stock en la respuesta de
  producto, ni recuperación de un draft huérfano ya existente en el backend.
  Estos puntos quedan documentados como diferidos y requieren backend nuevo.
- No cambia roles, rutas, tipos de dominio (`Product`, `Sale`, `Stock`) ni el
  panel de "Venta confirmada" (se extrae tal cual, sin cambio de
  comportamiento).

## User flow

Sin cambios de alto nivel: escanear/buscar → carrito → medio de pago →
confirmar. Dentro de ese flujo:

1. El cajero escanea o busca un producto. Mientras esa petición está en
   vuelo, un segundo Enter/selección no dispara una segunda petición: se
   ignora hasta que la primera resuelve.
2. Para un producto `unitario`, la línea aparece de inmediato; el tope de
   stock se aplica (con su mensaje, en la región de entrada) en cuanto la
   consulta en paralelo responde. Para un producto `pesable`, se agrega (o ya
   existe) una línea con peso vacío/foco en su campo de peso — nunca se abre
   un panel separado.
3. El cajero edita cantidad, peso o precio real de una línea directamente en
   la fila; cada corrección de peso inválida se refleja sólo en esa línea.
4. Al pasar el carrito de vacío a no vacío, "Efectivo" queda preseleccionado;
   el cajero puede cambiarlo o dividir el pago como ya podía.
5. El cajero confirma con el botón, con el atajo de teclado impreso junto a
   él, o revisa el vuelto con el campo "Efectivo entregado" mostrado con la
   misma jerarquía tipográfica que el total.
6. Si la confirmación fallara a mitad de camino, un reintento reutiliza la
   venta ya creada en vez de generar un draft nuevo.
7. El cajero puede vaciar el carrito completo desde una acción visible, que
   pide confirmación en un `Dialog` antes de descartar todo, incluidas
   ediciones de línea a medio completar.

## UI states

- **Loading**: sin cambio de patrón. El tope de stock (punto 2) puede llegar
  después de que la línea ya es visible; su mensaje de bloqueo aparece recién
  cuando el dato resuelve, nunca antes ni de forma retroactiva a un intento ya
  aceptado.
- **Empty**: el `EmptyState` actual del carrito no cambia. Un carrito
  restaurado desde `sessionStorage` con contenido nunca muestra el empty
  state (ver "Migration Plan" sobre el instante entre montaje y restauración).
- **Error**: consolidado en dos regiones (`CheckoutStatus` y la región bajo
  el campo de entrada), una única línea visible a la vez, con la prioridad
  definida en "Decisions".
- **Success**: el panel "Venta confirmada" se conserva sin cambios de
  comportamiento (no atrapa foco, auto-dismiss a 6 s, mismas acciones). La
  columna de cobro además conserva un rastro breve de la última venta
  (Decisión 20) que persiste después de que el panel se cierre.
- **Pending**: `confirmSale` sigue deshabilitando el botón y mostrando
  "Confirmando…" vía `pending`/`pendingImmediate` del `Button` existente.

## Decisions

### 1. Guarda de escaneo/búsqueda en vuelo con un `useRef` booleano

Se agrega un `scanInFlightRef` (o equivalente) separado de `pending` — que
hoy sólo lo activa `confirmSale()` y por eso no protege `scan()`. Antes de
llamar a `GET /products/barcode/:code` o de resolver una selección de
búsqueda, se comprueba y fija ese ref de forma síncrona; se libera en un
`finally`. Un segundo Enter/selección mientras el ref está en `true` se
ignora (no se encola): encolar agregaría un estado adicional para un
beneficio marginal, porque el lector reenvía el mismo código si hace falta.

El tope de stock dentro de esa única llamada activa siempre lee `cart` vía el
`setCart` funcional (`(lines) => …`), nunca una variable capturada antes de la
espera asíncrona — así el tope se evalúa contra el carrito real en el momento
en que la respuesta de stock llega, sin importar cuántas actualizaciones de
carrito ocurrieron mientras tanto.

Alternativa descartada: usar `pending` (el mismo que gatea la confirmación)
para gatear también el escaneo. Acoplaría dos operaciones independientes: un
escaneo en vuelo bloquearía innecesariamente la confirmación y viceversa.

### 2. Alta de línea inmediata, tope de stock aplicado en paralelo

`addToCart` deja de esperar `availableStock()` antes de tocar `setCart` para
un producto `unitario`: agrega la línea (o incrementa) de inmediato y dispara
la consulta de stock en paralelo. Cuando esa consulta resuelve, si la
cantidad ya en el carrito para ese producto excede el stock disponible, se
aplica el tope (la cantidad se recorta al disponible) y se muestra el mensaje
ya existente (`stockLimitMessage`) en la región de entrada — nunca se revierte
silenciosamente sin explicar por qué. Esta lógica de "agregar, luego capear
cuando el dato llega" se extrae a `src/lib/cart.ts` como una función pura que
recibe el carrito, el producto y el stock disponible, y devuelve el carrito
resultante más un mensaje opcional.

Alternativa descartada: mantener el `await` antes de tocar el carrito (estado
actual). Es más simple pero retrasa la aparición de la línea en el camino
crítico en cada primer escaneo de un producto.

### 21. Stock inicializado agotado no se ofrece para la venta

Una respuesta numérica de stock `<= 0` representa disponibilidad cero para el
POS. Al escanear o seleccionar el producto, su línea optimista se elimina al
resolver la consulta y la región de entrada muestra
`“<producto>” no tiene stock disponible.`. La búsqueda manual consulta la
misma disponibilidad y conserva esos productos visibles con el badge "Sin
stock", pero sin un control seleccionable ni participación en la navegación
con flechas o Enter.

Un `404` sin registro de stock, como red, timeout, `403` o `5xx`, significa
disponibilidad desconocida: no se bloquea ni se anuncia como falta de stock.
Así se conserva la regla vigente de que la ausencia de registro no equivale a
inventario cero. No se cambia el endpoint ni los roles; se reutiliza el `GET`
existente.

Alternativa descartada: ocultar todo producto sin consultar su disponibilidad.
El catálogo no expone stock, así que la búsqueda no podría distinguir un
producto agotado de uno con disponibilidad desconocida. También se descarta
esperar la consulta de stock antes de cada escaneo: degradaría el camino
crítico del lector; la línea sólo se revierte ante cantidad cero conocida.

### 3. `weightError` pasa a ser por línea

El único `weightError` string se reemplaza por un campo en cada `CartLine`
(o un mapa `productId → string | null` en `src/lib/cart.ts`, según convenga a
la implementación). Cada input de peso lee y escribe únicamente el error de
su propia línea.

### 4. Subtotal nunca conserva el cálculo de un peso inválido

`updateLineWeight` dejar de escribir un `calculatedPrice` viejo cuando el peso
nuevo es inválido: la línea pasa a un estado explícito "sin subtotal vigente"
(el total excluye esa línea de su suma; la fila muestra un guion o
equivalente en vez de un número). En cuanto el peso vuelve a ser válido, se
recalcula desde ese valor — nunca desde un estado intermedio inválido. Esta
regla se extrae a `src/lib/cart.ts` junto con la función que ya envuelve
`calculateWeightedPrice`/`effectiveLinePrice` de `src/lib/weightPricing.ts`
(sin cambiar el contrato de ese archivo).

### 5. Una sola UI para pesables: siempre la línea del carrito

Se elimina el estado `weightProduct` y el panel "Peso de `<producto>`". Al
resolver un escaneo/búsqueda de un producto `pesable` que no está en el
carrito, se agrega una línea con peso vacío y foco en su campo de peso
(mismo campo que ya existe para una línea existente). Esto simplifica el
componente sin cambiar el requirement vigente de `ui-pos` ("Weighable
product scanned": ningún importe entra al carrito hasta que el peso sea
mayor a cero) — la línea existe visualmente antes, pero su efecto en el total
sigue siendo cero hasta que haya un peso válido.

### 6. "Precio real" como campo visible, no un ícono lápiz oculto

El botón `iconOnly` + texto "Editado" en 12px se reemplaza por un campo
"Precio real" visible junto al precio calculado de la línea (mismo patrón que
ya existe para el peso: label visible, sin depender de abrir/cerrar un modo
edición mediante un ícono). Su validación (`isMoneyAmount`) se muestra debajo
de ese campo, no en el banner de escaneo (`scanError`) como hoy.

Alternativa descartada: mantener el toggle de edición pero sólo agregarle un
label — no resuelve que la validación viva lejos del campo, que es el defecto
de accesibilidad y de UX señalado por el análisis.

### 7. Medio de pago preseleccionado en la transición vacío → no vacío

Cuando el carrito pasa de tener 0 líneas a tener al menos 1 y `payment` sigue
en `null`, se preselecciona `"CASH"`. Esto ocurre una sola vez por venta (no
se reimpone si el cajero ya eligió o cambió el medio) y no cambia el
comportamiento de pago dividido existente.

### 8. "Efectivo entregado" siempre visible cuando el medio incluye Efectivo, con la jerarquía tipográfica del total

Cuando `cashPayment` existe (medio de pago simple Efectivo, o un tramo
Efectivo dentro de un pago dividido), el campo "Efectivo entregado" y el
resultado del vuelto se muestran siempre — se elimina el botón "Calcular
vuelto" y el estado `showCashChange` de mostrar/ocultar. Ambos usan la misma
escala tipográfica que ya usa el total (`.num`, tamaño grande — el mismo
family de clases que hoy pinta `formatMoney(fromCents(totalCents))` en el
bloque de Total), en vez de `text-sm font-medium`. El atajo `F4` (Decisión
14) pasa a enfocar directamente el campo, ya visible, en vez de revelarlo
primero.

Cuando el medio de pago no incluye Efectivo (Tarjeta, Transferencia, o un
pago dividido sin tramo en efectivo), el campo no se muestra — no hay nada
que cobrar en efectivo.

Alternativa descartada: mantener el botón de mostrar/ocultar (decisión
original de este change, revisada tras validar el wireframe completo del
doc de análisis con el usuario). El propio análisis señala esto como la
operación más frecuente en una venta en efectivo — dos clics extra por
venta — y el wireframe de la sección "Jerarquía e IA propuestas" lo muestra
siempre abierto, sin botón.

### 9. Conteo real de unidades junto al total

Se reemplaza `itemCount = cart.length` por un resumen compuesto:
"`N` líneas" siempre, más "`M` unidades" cuando hay al menos una línea
`unitario` (`M` = suma de `quantity` de esas líneas) y, cuando hay al menos
una línea `pesable`, el peso total sumado (`kg`, hasta 3 decimales) por
separado — no se suman unidades y kilogramos entre sí, son magnitudes
distintas. Esta agregación se extrae a `src/lib/cart.ts`.

### 10. Región de estado única por zona, con prioridad explícita

`src/lib/posStatus.ts` expone dos funciones puras, cada una recibiendo el
subconjunto de estado relevante y devolviendo **un solo** mensaje (o
`null`) con su tono:

- **Región de entrada** (bajo el campo de escaneo/búsqueda), prioridad de
  mayor a menor: código inexistente (404 del último escaneo) > producto
  inactivo > tope de stock alcanzado > catálogo de búsqueda no disponible
  (`catalogError`) > estado de la búsqueda ("Buscando…" / "Ningún producto
  activo coincide…", ya existentes).
- **Región de cobro** (entre el bloque de pago y "Confirmar venta"),
  prioridad de mayor a menor: estado de red desconocida (`status === 0`,
  copy ya normativo) > error de confirmación (`confirmError`, con
  `role="alert"`) > balance de pago pendiente (`balanceMessage`) > motivo de
  bloqueo de confirmación (nombrando la línea afectada cuando el bloqueo es
  por peso inválido o tope de stock de un producto puntual) > "Pago
  cerrado".

Cada región renderiza como mucho un mensaje visible; el resto de las
variables de estado existentes pasan a ser entradas de esa función, no
elementos JSX independientes. La región de entrada reserva siempre la altura
de un mensaje de una línea (48 px), incluso cuando no hay texto: los mensajes
de búsqueda, código inexistente o stock no reacomodan verticalmente el
carrito. `CheckoutStatus` (componente nuevo) no tiene lógica propia: sólo
renderiza lo que `posStatus.ts` resuelve.

### 11. `confirmError` con `role="alert"` y recuperación por tipo de error

`confirmError` pasa a un contenedor con `role="alert"` (igual que
`scanError` ya lo tiene). La acción de recuperación sigue la clasificación de
`ApiError.kind` ya usada en `ErrorState`/`RecoveryAction`
(`src/components/ui/states.tsx`): `forbidden` ofrece "Volver"
(`window.history.back()`, mismo patrón ya normativo); el resto de los casos
(incluido un error de negocio con `{ message }` del backend, p. ej. stock
insuficiente al confirmar) ofrece "Reintentar", que vuelve a invocar
`confirmSale()` — seguro por la guarda anti-duplicado del punto 12, que
reutiliza el `id` de venta ya creado. Un `401` no llega a mostrarse: `api()`
ya redirige a `/login` antes de que la promesa se rechace (ver
`src/lib/api.ts`); se documenta para que la implementación no dé por sentado
que existe un `confirmError` de tipo `unauthorized` que mostrar.

### 12. No duplicar el draft de venta: retener `sale.id` entre reintentos

`src/lib/posSaleSubmission.ts` expone la secuencia de confirmación
(`POST /sales` → N × `POST /sales/:id/items` → `PUT /sales/:id/payment` →
`POST /sales/:id/confirm`) como una función que recibe el estado necesario
(carrito, pago, un `id` de venta ya retenido si existe) y las funciones de
red inyectadas (para poder testear la secuencia sin `fetch`). Si ya existe un
`id` retenido (una venta que `POST /sales` ya devolvió en un intento
anterior), un reintento lo reutiliza en vez de llamar a `POST /sales` de
nuevo. `PosView` retiene ese `id` en un estado de componente que sólo se
limpia al confirmar con éxito o al vaciar el carrito.

Límite reconocido: ese `id` retenido vive sólo en memoria del componente, no
en `sessionStorage` (ver Non-Goals) — un refresh de página justo después de
un fallo parcial pierde la guarda y un reintento tras ese refresh sí puede
generar un `draft` adicional. Ese caso ya está cubierto hoy por
`unknownState` ("verificá el estado antes de reintentar") y por la
recuperación/limpieza de drafts huérfanos, explícitamente diferida en
`proposal.md`.

### 13. Vaciar carrito con diálogo de confirmación

Nueva acción visible (botón secundario, cerca del carrito) que abre
`ClearCartDialog`, construido sobre el `Dialog` ya existente
(`src/components/ui/Dialog.tsx`). El diálogo nombra la cantidad de productos
que se van a perder y aclara que también descarta ediciones de línea a medio
completar (peso o precio real sin confirmar) y que la acción no se puede
deshacer. Confirmar vacía `cart`, `payment`, `splitPayments`, `cashReceived`,
limpia `sessionStorage` y devuelve el foco al campo de escaneo. Cancelar
(botón, Esc o backdrop, comportamiento ya provisto por `Dialog`) devuelve el
foco al botón que lo abrió. Quitar una única línea sigue sin diálogo, sin
cambios.

Copy: título "Vaciar carrito"; cuerpo "Se van a eliminar los `N` productos
del carrito, incluida cualquier edición de peso o precio sin confirmar. Esta
acción no se puede deshacer."; acciones "Cancelar" (secundaria) y "Vaciar
carrito" (`danger`).

### 14. Atajos de teclado con combinaciones seguras, impresos junto al control

Se eligen teclas de función y combinaciones con modificador — nunca una letra
suelta, para no chocar con el modo de navegación por letras de un lector de
pantalla:

| Acción | Atajo |
|---|---|
| Confirmar venta | `F9` |
| Enfocar búsqueda por nombre | `F3` |
| Enfocar "Efectivo entregado" (ya visible cuando el medio incluye Efectivo) | `F4` |
| Abrir "Vaciar carrito" | `F8` |
| Seleccionar Efectivo | `Alt+1` |
| Seleccionar Tarjeta | `Alt+2` |
| Seleccionar Transferencia | `Alt+3` |

Cada atajo se imprime como texto visible junto a su control (no sólo un
`title`/tooltip), siguiendo el mismo criterio de nombre accesible visible que
ya rige otros controles del repo. Los atajos no interceptan cuando el foco
está en un campo de texto que usa esa tecla para su propio propósito nativo
del navegador (p. ej. no se captura dentro del campo de escaneo mismo).

Alternativa descartada: letras sueltas (p. ej. `c` para confirmar). Quedan
explícitamente prohibidas por el Requirement Context: chocan con la
navegación por letra de un lector de pantalla.

Riesgo aceptado: algunas teclas de función (`F3`) tienen un significado nativo
del navegador (buscar en la página) que este atajo reemplaza sólo mientras el
POS tiene el foco del documento; se declara en "Risks / Trade-offs".

### 15. Orden de tabulación agrupado por línea del carrito

Cada `<li>` de línea pasa a exponer `role="group"` con un nombre accesible
(el nombre del producto) y sus controles internos (peso o +/-, precio real,
quitar) siguen siendo alcanzables por Tab en el orden ya existente dentro del
grupo — el cambio no es "un solo tab stop por línea" (eso rompería poder
editar cantidad/peso/precio con teclado) sino que el grupo se anuncia como
una unidad para que un lector de pantalla no lea 4 controles sueltos sin
contexto. El nombre accesible de cada botón +/- y "quitar" no cambia.

### 16. Dropdown de resultados no desplaza el carrito

El `<ul id="pos-search-results">` se posiciona como una capa `absolute`
anclada debajo del campo de búsqueda, con `z-index` por encima del contenido
del POS. Abrirlo no cambia la posición de las filas del carrito ni del resto
de la pantalla; la capa puede cubrir visualmente el contenido que queda por
debajo mientras está abierta. El comportamiento de teclado (flechas, Enter,
Escape) y `role="combobox"`/`role="option"` existentes no cambian. No se toca
la composición lado a lado ya commiteada en
`audit-pos-density-and-header-overflow`.

### 17. Scroll propio del carrito con auto-scroll a la línea afectada

El contenedor del listado de líneas (`<ul>` dentro del `Card` del carrito)
recibe una altura máxima y `overflow-y-auto` propio en vez de crecer sin
límite y empujar el resto de la pantalla. Al agregar/incrementar una línea
(mismo evento que ya dispara `.flash`), esa línea se lleva a la vista dentro
de ese contenedor (`scrollIntoView` con `block: "nearest"` o equivalente), sin
mover el scroll de la página.

### 18. Persistencia de carrito y medio de pago en `sessionStorage`

Se persiste únicamente `cart` (líneas, con sus pesos/precios reales
editados) y `payment` (el medio de pago simple elegido) bajo una clave
`pos:cart:v1` en `sessionStorage`, serializados como JSON. **No** se persiste
`splitPayments` ni `cashReceived`: si el cajero había iniciado un pago
dividido o un cálculo de vuelto, un refresh restaura el carrito y el medio de
pago base, pero el cajero debe rehacer el desglose de pago — el Requirement
Context sólo pide persistir "carrito, medio de pago seleccionado", y limitar
el alcance a eso evita reconciliar un pago dividido con un total que pudo
cambiar entre el guardado y la restauración.

Se limpia explícitamente al confirmar con éxito y al vaciar el carrito
(punto 13). Un producto restaurado que mientras tanto fue desactivado o
cambió de precio no se bloquea preventivamente en el cliente: el backend
sigue siendo la autoridad al agregar/confirmar, igual que ya ocurre hoy con
el stock desconocido.

Alternativa descartada: `localStorage`. `sessionStorage` es correcto para
"sobrevive un refresh, no una sesión nueva de navegador" — persistir entre
sesiones de navegador arriesga confirmar con datos mucho más viejos.

### 19. Descomposición de `PosView.tsx`

Nuevos módulos en `src/lib/` (puros, con test colocado):

- `cart.ts`: alta/incremento de línea, aplicación de tope de stock cuando el
  dato llega en paralelo, actualización de peso con la regla del punto 4,
  cálculo de totales (monto) y del resumen de conteo del punto 9.
- `posStatus.ts`: `resolveEntryStatus` y `resolveCheckoutStatus`, con la
  prioridad del punto 10.
- `posSaleSubmission.ts`: la secuencia de envío con la guarda anti-duplicado
  del punto 12.

Nuevos sub-componentes en `src/components/pos/` (JSX, sin lógica de negocio
propia más allá de la orquestación de props/handlers):

- Entrada/búsqueda (input de escaneo + búsqueda + su región de estado del
  punto 10), sin fusionar los dos campos (diferido).
- Líneas de carrito (contenedor con scroll propio del punto 17; cada línea
  con su propio error de peso y su campo de precio real visible).
- Panel de cobro (total, conteo real, chips de pago con default, vuelto con
  jerarquía del total, split existente sin cambios).
- Región de estado de cobro (punto 10, sin lógica propia).
- Diálogo de vaciar carrito (punto 13).

El panel de "Venta confirmada" se extrae tal cual (mismo JSX y
comportamiento), sin volver a implementarlo.

### 20. Rastro persistente de la última venta confirmada

Además del panel modal "Venta confirmada" existente (sin cambios: `role=
"status"`, sin atrapar foco, auto-cierre a los 6 s), la columna de cobro
conserva un rastro breve de la última venta confirmada en la sesión del
cajero: "Última venta: #`N` · `$ total` · Ver", con "Ver" enlazando a
`/sales/{id}` (mismo destino que ya ofrece el panel modal). Este rastro:

- Aparece la primera vez que una venta se confirma con éxito en la sesión
  (no antes; no hay rastro que mostrar si todavía no se confirmó ninguna
  venta).
- Persiste después de que el panel modal se cierra (manual o
  automáticamente), y se reemplaza por la siguiente venta confirmada — no
  acumula una lista.
- Vive sólo en memoria de componente (estado de `PosView`, no
  `sessionStorage`) — un refresh de página lo pierde, igual que cualquier
  otro estado efímero de la sesión de venta actual; no es el historial de
  ventas (`/sales`), que ya existe y sigue siendo la fuente completa.
- No compite con la región de estado de cobro (Decisión 10): vive debajo
  del botón "Confirmar venta", fuera de esas dos regiones priorizadas,
  visible siempre que exista una venta confirmada en la sesión.

Motivación: `ConfirmedSalePanel` se auto-cierra a los 6 s; si el cajero está
mirando al cliente en ese momento, pierde el número de venta sin ningún
rastro visible. El doc de análisis original señala esto explícitamente como
el problema que resuelve este rastro.

Alternativa descartada: mostrar el número sólo mientras el panel modal está
abierto (comportamiento actual). No resuelve el problema que motiva este
punto — el cajero lo necesita después de que el panel ya se cerró.

## Accessibility

- `confirmError` con `role="alert"`, igual que `scanError`.
- Ningún tratamiento nuevo depende sólo del color: "precio real" editado, el
  vuelto negativo/positivo y el estado de balance conservan texto explícito
  además del color ya existente.
- Cada atajo de teclado (punto 14) tiene su texto visible junto al control,
  no sólo un `title`.
- Cada línea del carrito expone `role="group"` con nombre accesible (punto
  15), sin remover el `aria-label` de sus controles +/-/quitar.
- Foco visible global (`:focus-visible`) no se altera; `prefers-reduced-motion`
  sigue respetado en toda animación existente (`.flash`, `.total-flash`,
  `.confirm-ready`) — este change no agrega motion decorativo nuevo.

## Keyboard and focus behavior

- Se preservan las reglas ya vigentes: el foco vuelve al campo de escaneo
  después de agregar, fallar, confirmar o cerrar el panel de éxito.
- Abrir `ClearCartDialog` interrumpe el foco deliberadamente (como cualquier
  diálogo modal del repo, vía `Dialog`); al cerrarlo por cualquier medio
  (confirmar, cancelar, Esc, backdrop) el foco vuelve al campo de escaneo.
- Los atajos del punto 14 son globales al documento mientras el foco no esté
  en un campo que consuma esa tecla nativamente; ninguno es una letra suelta.
- El tab order dentro de una línea del carrito no cambia su alcance por
  teclado, sólo agrega agrupación semántica (punto 15).
- El dropdown de búsqueda conserva ArrowUp/ArrowDown/Enter/Escape ya
  existentes; sólo cambia su capa visual sin reflujo (punto 16), no su
  comportamiento de teclado.

## Responsive behavior

Sin cambios de breakpoints existentes. El scroll propio del carrito (punto
17) y el resumen de conteo (punto 9) aplican igual en mobile y desktop. La
barra fija móvil de total + confirmar (`improve-mobile-responsive-ux`, ya
commiteada) no se modifica. El ajuste del dropdown (punto 16) se verifica en
los mismos anchos angostos donde hoy se superpone.

## API contract

Sin cambios de forma en ningún endpoint. Se usan exactamente los mismos ya
existentes: `GET /products/barcode/{code}`, `GET /inventory/stock/{id}`,
`GET /products` (búsqueda cliente), `POST /sales`, `POST /sales/{id}/items`,
`PUT /sales/{id}/payment`, `POST /sales/{id}/confirm`. Ningún tipo de
`src/lib/types.ts` cambia.

## Error handling

- Los mensajes de backend se siguen mostrando tal como llegan (`{ message }`),
  sin traducir.
- Una respuesta numérica `<= 0` de `GET /inventory/stock/{product_id}` se
  mapea al copy de stock cero definido en la Decisión 21. Un `404` de ese
  endpoint no se reinterpreta: conserva disponibilidad desconocida.
- `401`: `api()` ya redirige a `/login` antes de que el componente reciba el
  error; este change no cambia ese comportamiento.
- `403` (`forbidden`): conserva la sesión; la región de cobro ofrece "Volver"
  como recuperación (punto 11), igual que el patrón ya normativo de
  `RecoveryAction`.
- Red desconocida (`status === 0`): conserva su tratamiento actual (el
  carrito nunca se borra) y pasa a tener la prioridad más alta en la región
  de cobro (punto 10).
- Ningún fallo de una mutación asume éxito ni reintenta automáticamente sin
  acción del cajero.

## Backend coordination

Ninguna. Los 20 puntos de comportamiento se implementan íntegramente en el
frontend, reordenando llamadas existentes y agregando guardas/estado del lado
del cliente. No existe `backend-request.md` en este change.

## Risks / Trade-offs

- [Retener `sale.id` sólo en memoria de componente] → un refresh justo
  después de un fallo parcial de confirmación pierde la guarda anti-duplicado
  y puede generar un `draft` adicional; ya cubierto por el aviso de
  `unknownState` existente. La recuperación de drafts huérfanos queda
  diferida (requiere backend).
- [`F3` como atajo choca con "buscar en la página" del navegador] → el atajo
  sólo actúa mientras el documento del POS tiene el foco y usa
  `preventDefault`; se verifica manualmente en Chrome que no rompe el buscador
  nativo de forma inesperada para el cajero.
- [Restaurar desde `sessionStorage` no persiste pago dividido ni vuelto] →
  decisión explícita (punto 18) para no reconciliar un desglose de pago con
  un total que pudo cambiar; el cajero rehace esa parte tras un refresh.
- [Descomponer 1334 líneas en sub-componentes puede introducir una regresión
  visual o de foco no capturada por tests] → sin tests de componente en este
  repo (`ai/context/testing.md`); se mitiga con verificación manual explícita
  en `tasks.md` para foco, teclado, responsive y accesibilidad antes de cerrar
  el change.

## Migration Plan

1. Extraer `src/lib/cart.ts`, `src/lib/posStatus.ts` y
   `src/lib/posSaleSubmission.ts` con sus tests, sin cambiar el comportamiento
   observable de `PosView.tsx` todavía (paso 1 de `tasks.md`).
2. Migrar `PosView.tsx` a usar esos módulos y a descomponerse en
   sub-componentes, implementando entrada/carrito (guarda de escaneo, stock no
   bloqueante, pesables unificados, precio real visible, scroll propio,
   dropdown sin reflujo) en un paso, y cobro (vuelto siempre visible cuando el
   medio incluye Efectivo, default de pago, región de estado, vaciar carrito,
   no duplicar draft, rastro persistente de la última venta) en otro.
3. Agregar atajos de teclado y agrupación de tab order al final, cuando el
   resto del comportamiento ya es estable.
4. Verificar manualmente cada punto (teclado, foco, responsive, accesibilidad)
   antes de considerar el change listo para cierre.
5. Sobre `sessionStorage`: la hidratación ocurre en un efecto tras el montaje
   (no durante el render inicial, que corre igual en el server sin
   `sessionStorage` disponible); existe una transición breve entre el carrito
   vacío inicial y el carrito restaurado. Se documenta como comportamiento
   esperado, no como bug, dado que sólo ocurre en el instante posterior a un
   refresh.

## Rollback

Revertir el commit/deploy de frontend. No hay migración de datos ni
compatibilidad de backend que revertir: `sessionStorage` es efímero y no
requiere limpieza manual (una clave `pos:cart:v1` obsoleta simplemente deja de
leerse si se revierte el código que la escribe).

## Open Questions

Ninguna bloqueante.

- El mapeo exacto de teclas del punto 14 (`F3`/`F4`/`F8`/`F9`, `Alt+1..3`) es
  una elección razonable pero no es la única válida; puede ajustarse en
  implementación si la verificación manual encuentra un conflicto real con el
  navegador o con un lector de pantalla, siempre que la alternativa siga sin
  usar una letra suelta.
- El copy exacto de `ClearCartDialog` y de los mensajes consolidados de las
  regiones de estado (arriba, sección de Decisions) se toma como definitivo
  para este change; puede afinarse en una revisión de copy sin volver a abrir
  una decisión de producto.
