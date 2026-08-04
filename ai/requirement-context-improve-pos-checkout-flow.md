# Requirement Context: Confiabilidad y foco del flujo de venta (POS)

## Objective

El análisis de Etapa 1 (Claude Design) sobre `PosView.tsx` encontró fallas de
comportamiento, accesibilidad y arquitectura que afectan la velocidad y
confiabilidad de cada venta: un escaneo concurrente puede duplicar una línea,
un peso inválido deja un subtotal incorrecto en pantalla, un fallo parcial de
red duplica el "draft" de venta en el backend, y la columna de cobro apila
hasta cinco mensajes sin jerarquía. Este change corrige esos comportamientos y
descompone el componente monolítico (1334 líneas, 23 `useState`) en piezas
testeables, **sin tocar la disposición de columnas de la pantalla** (eso
convive con una decisión de layout ya aprobada en otro change, ver
"Coordinación con otros changes").

## Current behavior

- `scan()` (`PosView.tsx:324-352`) chequea `pending`, pero `pending` sólo lo
  activa `confirmSale()` (`:577-581`). Dos Enter rápidos del lector disparan
  dos `GET /products/barcode/:code` en paralelo; el segundo `addToCart` lee
  `cart` del closure viejo y puede saltarse el tope de stock.
- `addToCart()` (`:362-387`) hace `await availableStock()` (`GET
  /inventory/stock/:id`, cacheado) antes de tocar `setCart`: la línea tarda
  dos round-trips en aparecer en el primer escaneo de cada producto.
- Los productos pesables tienen dos caminos de UI para lo mismo:
  `beginWeightEntry()` (`:206-222`) abre un panel "Peso de X" arriba del
  carrito si la línea no existe, o enfoca el input inline si ya existe.
- `weightError` (`:152`) es un único string de estado, pasado como `error` a
  **todas** las líneas pesables (`:849, :792`); un peso inválido en una línea
  pinta de error todas las demás.
- La rama inválida de `updateLineWeight()` (`:249-273`) guarda el peso nuevo
  pero conserva el `calculatedPrice` anterior: la línea muestra un subtotal
  que ya no corresponde al peso escrito, y el total lo suma (aunque
  `confirmDisabledReason` bloquea la confirmación).
- `itemCount = cart.length` (`:496`): cuenta líneas, no unidades.
- "Precio real" se edita con un botón lápiz `iconOnly` + texto "Editado" en
  12px (`:887-916`); su validación reutiliza `scanError` (`:289-291`), que se
  renderiza en un banner arriba del carrito, lejos del campo.
- "Calcular vuelto" es un botón que hay que tocar para que aparezca el campo
  (`:1067-1127`); el vuelto se muestra en `text-sm font-medium` mientras el
  total usa `text-4xl/5xl` (`:945-955` vs `:1088-1098`).
- El pago no tiene medio preseleccionado; `payment` arranca en `null`
  (`:143`).
- `confirmSale()` (`:577-634`) ejecuta `POST /sales` → N × `POST
  /sales/:id/items` → `PUT /sales/:id/payment` → `POST /sales/:id/confirm`
  en serie; el `id` de la venta creada no se guarda en ningún estado, así que
  reintentar tras un fallo parcial dispara un `POST /sales` nuevo y el
  backend acumula un `draft` huérfano por cada intento fallido.
- Cinco variables de estado compiten por la columna de cobro sin prioridad
  explícita: `scanError`, `confirmError`, `unknownState`, el mensaje de
  balance (`balanceMessage`, `:534-544`) y `confirmDisabledReason`
  (`:545-558`); pueden aparecer varias a la vez, apiladas.
- `confirmError` (`:1130-1132`) se renderiza como `<p>` sin `role="alert"`, a
  diferencia de `scanError` que sí lo tiene (`:754-760`).
- No existe ninguna acción para vaciar el carrito completo ni para descartar
  una venta empezada.
- No hay atajos de teclado más allá de Enter/Escape puntuales; el orden de
  tabulación pasa por cada botón +/- de cada línea (dos tab stops por línea
  unitaria).
- El buscador por nombre (`searchResults`, `:415-423`) se renderiza en un
  `<ul>` `absolute z-30` (`:702-704`) que se superpone visualmente al
  carrito.
- El componente entero vive en un único archivo cliente sin descomposición
  (`src/components/pos/PosView.tsx`, 1334 líneas, 23 `useState`, 5 `useRef`);
  no hay lógica de carrito/estado en `src/lib/` con tests.

## Desired behavior

1. **Guarda de escaneo en vuelo**: mientras un escaneo o selección de
   búsqueda tiene una petición en curso, un nuevo Enter/selección no dispara
   otra petición en paralelo — se ignora o se encola, nunca corre concurrente
   con la anterior. El tope de stock siempre se evalúa contra el carrito
   actual, no contra un closure viejo.
2. **Stock no bloqueante en el camino crítico**: la línea se agrega al
   carrito de inmediato al resolver el producto; la consulta de stock
   disponible se resuelve en paralelo y el tope se aplica (con su mensaje) en
   cuanto el dato llega, sin retrasar la aparición de la línea.
3. **`weightError` por línea**: cada línea pesable lleva su propio estado de
   error de peso; un peso inválido en una línea nunca afecta la
   presentación de otra.
4. **Subtotal siempre consistente con el peso mostrado**: si el peso
   ingresado es inválido, la línea deja de mostrar un subtotal calculado (o
   muestra explícitamente que no hay uno vigente) en vez de conservar el
   cálculo del peso anterior.
5. **Una sola UI para pesables**: el peso se ingresa siempre en el campo de
   la línea del carrito; se elimina el panel separado "Peso de X" que
   aparece antes de que la línea exista.
6. **"Precio real" como campo visible de la línea**: deja de depender de un
   ícono lápiz oculto; su validación se muestra debajo de su propio campo,
   no en el banner de escaneo.
7. **Efectivo con medio de pago preseleccionado**: al iniciar una venta con
   carrito no vacío, "Efectivo" es el medio por defecto (el cajero puede
   cambiarlo); esto no cambia el comportamiento de pago dividido existente.
8. **Vuelto con el mismo peso visual que el total**: el campo "Efectivo
   entregado" y el resultado del vuelto se muestran con jerarquía tipográfica
   comparable a la del total (no `text-sm`).
9. **Conteo real de unidades**: el resumen junto al total muestra tanto la
   cantidad de líneas como la cantidad total de unidades/peso vendido, no
   sólo `cart.length`.
10. **Una única región de estado por zona**, cada una mostrando un solo
    mensaje a la vez según prioridad (no todas las variables actuales
    renderizadas en simultáneo):
    - Región de entrada (bajo el campo de escaneo/búsqueda): código
      inexistente > producto inactivo > tope de stock > catálogo no
      disponible > estado de búsqueda.
    - Región de cobro (entre el bloque de pago y "Confirmar venta"): estado
      de red desconocida > error de confirmación (con `role="alert"`) >
      balance de pago pendiente > motivo de bloqueo (debe nombrar la línea
      afectada cuando aplica) > "Pago cerrado".
11. **`confirmError` con `role="alert"`** y una acción de recuperación acorde
    al tipo de error (reintentar cuando es transitorio; para un 401/403,
    ofrecer volver a iniciar sesión, siguiendo el patrón ya definido para
    otros errores de sesión expirada en el repo).
12. **No duplicar el draft de venta al reintentar**: si `POST /sales` ya
    devolvió un `id`, un reintento posterior (agregar ítems, pago o
    confirmar) reutiliza ese mismo `id` en vez de crear una venta nueva.
13. **Vaciar carrito**: una acción visible que abre un diálogo de
    confirmación (usa el `Dialog` ya existente en el repo) antes de vaciar
    todas las líneas; quitar una única línea sigue sin diálogo, como hoy.
14. **Atajos de teclado**, impresos junto a cada control al que aplican (un
    atajo que no se muestra no cuenta como implementado):
    - Confirmar venta.
    - Enfocar el campo de búsqueda por nombre.
    - Enfocar "Efectivo entregado" / mostrar el cálculo de vuelto.
    - Abrir el diálogo de vaciar carrito.
    - Seleccionar cada medio de pago (Efectivo/Tarjeta/Transferencia).
    Deben ser teclas o combinaciones seguras para lector de pantalla (no una
    letra suelta); el detalle exacto de qué tecla asignar a cada acción es
    diseño, no bloqueante.
15. **Orden de tabulación agrupado por línea**: cada línea del carrito es un
    grupo navegable (flechas o Tab agrupado) en vez de un tab stop por cada
    botón +/- individual.
16. **El resultado de búsqueda no tapa el carrito**: el dropdown de
    resultados no se superpone visualmente a las líneas ya cargadas.
17. **El carrito lleva la línea recién afectada a la vista** cuando el
    contenedor tiene scroll propio (si el carrito crece más que el alto
    disponible, hace scroll interno en vez de empujar el resto de la
    pantalla).
18. **Persistencia de carrito en `sessionStorage`**: un refresh accidental de
    la pestaña no pierde una venta en curso (carrito, medio de pago
    seleccionado); se limpia al confirmar o al vaciar explícitamente.
19. **Descomposición**: la lógica de carrito (totales, conteo, tope de
    stock), la resolución de qué mensaje mostrar en cada región de estado, y
    la secuencia de envío de la venta (con la guarda anti-duplicado del
    punto 12) se extraen a funciones puras en `src/lib/` con tests;
    `PosView.tsx` pasa a orquestar sub-componentes en vez de contener toda la
    lógica y el JSX en un único archivo.

## Explicitly out of scope (deferred)

- **Unificar el campo de escaneo y el de búsqueda por nombre en un único
  omnibox**: el análisis de Claude Design lo propone como migración en dos
  pasos; este change hace sólo el primero (punto 16, que el dropdown no tape
  el carrito) y dejo el segundo (fusión real de los dos campos) fuera,
  porque toca la misma superficie que la decisión de layout de
  `refactor-erp-pos-visual-system` (ver abajo).
- **Cualquier cambio a la cantidad de columnas o a la composición
  rail/catálogo/carrito de la pantalla**: `refactor-erp-pos-visual-system`
  tiene un `design.md` aprobado con un mockup de 3 columnas con catálogo
  navegable en cards, sin implementar todavía (0/23 tareas). Este change no
  lo toca ni lo contradice; se limita a comportamiento, estado, teclado y
  descomposición interna, compatible con cualquiera de las dos direcciones
  de layout en danza.
- **Pago dividido en más de 2 tramos o con Transferencia**: requiere
  confirmar contrato de `PUT /sales/{id}/payment` con backend (ver
  dependencias).
- **Venta atómica** (un único endpoint que reciba ítems + pago y confirme en
  una transacción): eliminaría de raíz la clase de fallos parciales, pero
  requiere backend nuevo.
- **Búsqueda server-side de productos** (`GET /products?q=`): hoy el POS
  descarga 100 productos y filtra en cliente; arriba de ese límite un
  producto no aparece. Requiere backend.
- **Stock incluido en la respuesta de producto** (barcode/búsqueda): evitaría
  el segundo round-trip del punto 2 de raíz; hoy se resuelve con carga en
  paralelo del lado del cliente, sin depender de este cambio de contrato.
- Recuperación de un draft huérfano ya existente en el backend (listar/
  descartar ventas en estado draft): requiere backend nuevo.

## Coordination with other changes

- `audit-pos-density-and-header-overflow` ya está commiteado (altura del
  input de escaneo, composición lado a lado, grid de filas del carrito). Este
  change no lo revierte ni lo modifica estructuralmente, sólo ajusta z-index/
  overlap del dropdown (punto 16) y agrega scroll propio (punto 17) sobre esa
  base ya existente.
- `improve-mobile-responsive-ux` ya agregó la barra fija móvil de total +
  confirmar (tarea 4.1, commiteada). Este change no la toca.
- `refactor-erp-pos-visual-system` tiene una decisión de layout aprobada
  (3 columnas, catálogo en cards) sin implementar. Este change se diseña para
  ser compatible con esa dirección o con cualquier otra que se decida
  después — no depende de cuántas columnas tenga la pantalla.

## Primary actor

`cashier` (uso normal del POS) y `admin` (mismo flujo, sin diferencias de
comportamiento nuevas).

## Roles and permissions

Sin cambios: el POS ya está gateado a `cashier`/`admin`
(`src/app/(app)/page.tsx`). Ninguno de los puntos de "Desired behavior"
introduce una acción nueva restringida por rol.

## Main user flow

Sin cambios de alto nivel (escanear/buscar → carrito → medio de pago →
confirmar); los 19 puntos de "Desired behavior" corrigen comportamiento
dentro de ese mismo flujo, no agregan pasos nuevos salvo el diálogo opcional
de "vaciar carrito".

## UI states

- **Loading**: sin cambios de patrón; se agrega que el tope de stock (punto
  2) puede llegar después de que la línea ya es visible, mostrando su
  mensaje de bloqueo en cuanto resuelve, no antes.
- **Empty**: carrito vacío sigue mostrando el `EmptyState` actual.
- **Error**: consolidado en las dos regiones de estado (punto 10); cada
  mensaje conserva el texto ya normativo del repo, sólo cambia dónde y con
  qué prioridad se muestra.
- **Success**: el panel de "Venta confirmada" existente se conserva sin
  cambios (no atrapa foco, auto-dismiss a 6s); no forma parte de este change.

## Keyboard and focus behavior

Ver puntos 14 y 15 de "Desired behavior". Reglas generales a preservar (ya
vigentes, no se degradan):

- El foco vuelve al campo de escaneo después de cada acción que hoy ya lo
  hace (confirmar, cerrar el panel de éxito, quitar una línea).
- Abrir el diálogo de "vaciar carrito" (punto 13) sí interrumpe el foco
  deliberadamente, como cualquier diálogo modal del repo; al cerrarlo (con
  cualquier botón) el foco vuelve al campo de escaneo.
- Ningún atajo nuevo puede ser una tecla suelta (conflicto con lectores de
  pantalla); deben usarse teclas de función o combinaciones con modificador.

## Responsive behavior

Sin cambios de breakpoints existentes. El scroll propio del carrito (punto
17) y el conteo real de unidades (punto 9) aplican igual en mobile y
desktop. La barra fija móvil ya existente (`improve-mobile-responsive-ux`) no
se modifica.

## Accessibility expectations

- `confirmError` con `role="alert"` (punto 11), igual que `scanError` ya lo
  tiene.
- Estado/error nunca comunicado sólo por color (regla general del repo);
  aplica en particular al nuevo tratamiento de "precio real" (punto 6).
- Cada atajo de teclado (punto 14) debe tener nombre accesible visible junto
  al control, no sólo un tooltip.
- El grupo de línea del carrito (punto 15) debe exponer una estructura de
  navegación por teclado coherente (rol de grupo o equivalente), sin romper
  el nombre accesible de cada control +/-/quitar ya existente.

## Copy and feedback

- Los textos exactos de los nuevos mensajes de estado, el copy del diálogo de
  "vaciar carrito" y las etiquetas de los atajos quedan para `design.md` — no
  bloqueante.
- El mensaje de bloqueo de confirmación (punto 10, región de cobro) debe
  nombrar el producto/línea afectada cuando el bloqueo es por un dato de una
  línea específica (peso inválido, tope de stock), no sólo "hay un error".

## Backend dependencies

Ninguno de los 19 puntos de "Desired behavior" requiere cambios de contrato
backend — se implementa por completo en el frontend, reordenando llamadas
existentes (`GET /products/barcode/:code`, `GET /inventory/stock/:id`, `POST
/sales`, `POST /sales/:id/items`, `PUT /sales/:id/payment`, `POST
/sales/:id/confirm`) y agregando guardas/estado del lado del cliente. Los
puntos diferidos en "Explicitly out of scope" sí requieren backend y quedan
documentados ahí para un change futuro con su propio `backend-request.md`.

## API contract

Sin cambios de forma en ningún endpoint. Se usan exactamente los mismos
existentes: `GET /products/barcode/{code}`, `GET /inventory/stock/{id}`,
`GET /products` (búsqueda cliente), `POST /sales`, `POST /sales/{id}/items`,
`PUT /sales/{id}/payment`, `POST /sales/{id}/confirm`.

## Data types

Sin cambios a `Product`, `Sale`, `Stock` ni ningún tipo de
`src/lib/types.ts`. El estado nuevo (guarda de escaneo en vuelo, `sale.id`
retenido para evitar duplicar el draft, carrito persistido) es estado de UI
local, no un tipo de dominio.

## Error behavior

- Errores de backend se muestran tal como llegan (`{ message }`), sin
  traducir — mismo patrón ya vigente en todo `ui-pos`.
- El estado de red desconocida (`status === 0`) conserva su tratamiento
  actual (el carrito nunca se borra) y gana prioridad más alta en la región
  de cobro (punto 10).

## Edge cases

- Doble Enter/doble clic sobre el mismo código de barras o el mismo
  resultado de búsqueda mientras la petición anterior sigue en curso: debe
  resultar en una sola línea agregada, no dos (punto 1).
- Peso editado a inválido y luego corregido a válido en la misma línea:
  el subtotal debe reflejar siempre el último peso válido confirmado, nunca
  uno de un estado intermedio inválido.
- Reintento de confirmación tras un fallo en el paso de pago (ítems ya
  creados, pago falló): no debe recrear los ítems ya creados ni la venta ya
  creada (punto 12).
- Carrito restaurado desde `sessionStorage` con un producto que mientras
  tanto fue desactivado o cambió de precio: al reintentar agregar/confirmar,
  el backend sigue siendo la autoridad (mismo criterio ya vigente hoy para
  stock desconocido) — no se bloquea preventivamente en el cliente por datos
  potencialmente desactualizados del carrito restaurado.
- Vaciar el carrito con una edición de precio real o de peso a medio
  completar: el diálogo de confirmación (punto 13) descarta también esos
  borradores de línea sin pedir confirmación adicional.

## Affected routes

- `/` (POS, `src/app/(app)/page.tsx`) — única ruta afectada.

## Affected components

- `src/components/pos/PosView.tsx`: pasa de contener toda la lógica a
  orquestar sub-componentes. Descomposición propuesta (nombres tentativos,
  ajustables en `design.md`):
  - `ScanOmnibox` o equivalente (input de escaneo/búsqueda + su región de
    estado), sin fusionar los dos campos existentes (eso queda diferido).
  - `CartLines`/`CartLine` (contenedor con scroll propio; error de peso por
    línea; "precio real" como campo visible).
  - `CheckoutPanel` (total, conteo real, chips de pago con default,
    vuelto con jerarquía tipográfica del total, split existente sin
    cambios).
  - `CheckoutStatus` (región única de estado de cobro, sin lógica propia).
  - `ClearCartDialog` (nuevo, usa el `Dialog` ya existente en el repo).
- El panel de "Venta confirmada" (`ConfirmedSalePanel`, hoy el bloque final
  de `AnimatePresence`) se extrae tal cual, sin cambios de comportamiento.

## Affected libraries

- `src/lib/cart.ts` (nuevo): reducer o funciones puras de carrito — agregar
  línea, actualizar cantidad/peso, calcular totales (unidades + líneas +
  monto), aplicar tope de stock cuando el dato llega de forma asíncrona.
- `src/lib/posStatus.ts` (nuevo): función pura que, dado el estado relevante,
  resuelve qué mensaje mostrar en cada una de las dos regiones de estado
  (punto 10), con la prioridad ya definida arriba.
- `src/lib/posSaleSubmission.ts` o similar (nuevo): secuencia de
  confirmación con guarda anti-duplicado (retiene el `sale.id` ya creado
  entre reintentos).
- `src/lib/paymentComposition.ts`: sin cambios de contrato; se sigue usando
  tal cual.
- `src/lib/weightPricing.ts`: sin cambios de contrato; se ajusta cómo
  `PosView`/`CartLine` lo invocan para no conservar un subtotal calculado con
  un peso inválido (punto 4).

## Necesidad de tests

- `src/lib/cart.ts`: tests de la lógica de totales, conteo de unidades y
  aplicación de tope de stock (entorno `node`, siguiendo el patrón de
  `src/lib/sales.test.ts`/`paymentComposition.test.ts`).
- `src/lib/posStatus.ts`: tests de la función de prioridad de mensajes por
  región (tabla de casos: qué se muestra cuando hay N condiciones activas a
  la vez).
- `src/lib/posSaleSubmission.ts`: test de que un reintento tras fallo parcial
  no repite `POST /sales` si ya existe un `id` retenido.
- El resto (foco, atajos de teclado, animación, scroll) queda como
  verificación manual — no hay tests de componente en este repo
  (`ai/context/testing.md`).

## Deployment considerations

Ninguna: todo el alcance es frontend puro, sin dependencia de un deploy de
backend previo. Se puede mergear de forma independiente.

## Out of scope

Ver "Explicitly out of scope (deferred)" arriba — se mantiene como sección
separada porque son puntos que el análisis original sí cubría y se decidió
conscientemente no incluir en este change.

## Decisions made

1. Este change es exclusivamente frontend; nada de su alcance requiere
   `backend-request.md`.
2. No se reconcilia ni se modifica el layout aprobado en
   `refactor-erp-pos-visual-system`; este change se limita a comportamiento,
   estado, teclado y descomposición interna.
3. La unificación del campo de escaneo y búsqueda en un único omnibox queda
   fuera; sólo se corrige que el dropdown de resultados no tape el carrito.
4. Se prioriza corregir primero los bugs de comportamiento con riesgo real
   (guarda de escaneo, subtotal con peso inválido, draft duplicado) sobre las
   mejoras de conveniencia (atajos, persistencia en sessionStorage).

## Remaining non-blocking questions

- Qué combinación exacta de teclas asignar a cada atajo (queda para
  `design.md`).
- Copy exacto del diálogo de "vaciar carrito" y de los nuevos mensajes de
  estado consolidados.
- Si el orden de implementación debe seguir los 4 pasos sugeridos por el
  análisis original (descomposición → entrada/carrito → cobro → teclado) o
  reagruparse distinto en `tasks.md`.

## Evidence consulted

- `src/components/pos/PosView.tsx` (íntegro, 1334 líneas).
- `src/lib/paymentComposition.ts`, `src/lib/weightPricing.ts`.
- Análisis "Etapa 1" generado en Claude Design (`POS Análisis y Rediseño`,
  proyecto `c34982d9-f3a1-4671-b296-b02ebf0883e7`), leído completo vía
  DesignSync.
- `openspec/changes/audit-pos-density-and-header-overflow/tasks.md` (estado:
  commiteado en `5a3a461`, checkboxes de verificación pendientes).
- `openspec/changes/improve-mobile-responsive-ux/tasks.md` (tarea 4.1 de
  barra móvil, commiteada).
- `openspec/changes/refactor-erp-pos-visual-system/design.md` (mockup B,
  decisión 4 "POS conserva prioridad operacional"; 0/23 tareas, sin
  implementar).

---

Listo para escribir el change cuando el usuario lo decida.
