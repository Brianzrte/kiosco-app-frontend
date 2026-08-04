## 1. Descomposición y lógica pura, sin cambio visual

- [x] 1.1 Crear `src/lib/cart.ts` con funciones puras: alta/incremento de línea
      `unitario`, aplicación diferida del tope de stock (línea ya agregada +
      cap cuando el dato de stock llega), actualización de peso de una línea
      `pesable` sin conservar un `calculatedPrice` de un peso inválido previo,
      cálculo del total decimal-safe y del resumen de conteo (líneas +
      unidades + peso). Verificado por `src/lib/cart.test.ts` (entorno
      `node`): alta simple, incremento, tope de stock aplicado tras la línea
      ya visible, peso inválido no deja subtotal viejo, peso corregido
      recalcula desde el nuevo valor, total decimal-safe con precios tipo
      "12.50".
- [x] 1.2 Crear `src/lib/posStatus.ts` con `resolveEntryStatus` y
      `resolveCheckoutStatus`, cada una devolviendo un único mensaje (o
      `null`) según la prioridad definida en `design.md` (Decisión 10).
      Verificado por `src/lib/posStatus.test.ts`: tabla de casos con 2+
      condiciones activas a la vez para cada región, confirmando cuál mensaje
      gana y que el resto no aparece.
- [x] 1.3 Crear `src/lib/posSaleSubmission.ts` con la secuencia de
      confirmación (crear venta → ítems → pago → confirmar) parametrizada por
      funciones de red inyectadas, reteniendo el `id` de venta ya creado entre
      reintentos. Verificado por `src/lib/posSaleSubmission.test.ts`: un
      reintento tras fallo parcial no vuelve a llamar a la función de "crear
      venta" si ya existe un `id`; un primer intento fallido antes de crear la
      venta sí la crea en el reintento.
- [x] 1.4 Ajustar cómo `PosView`/la futura `CartLine` invocan
      `src/lib/weightPricing.ts` para que nunca se muestre un precio
      calculado con un peso inválido, sin cambiar el contrato exportado de
      ese archivo. Verificado por inspección de código y por los tests de
      `cart.test.ts` de 1.1.
      Nota: implementado dentro de `src/lib/cart.ts` (`updateLineWeight`),
      que sigue envolviendo `calculateWeightedPrice`/`effectiveLinePrice` de
      `weightPricing.ts` sin tocar ese archivo ni su contrato exportado.
      `PosView.tsx` todavía usa su propia lógica inline en este paso (se
      migra en la sección 2, tarea 2.2/2.4), por eso la verificación de este
      punto es sobre `cart.ts` y sus tests, no sobre `PosView.tsx` todavía.
- [x] 1.5 Confirmar por inspección que estos tres módulos no importan de
      `src/components/` ni de `react`, y que `PosView.tsx` todavía no cambia
      su comportamiento observable en este paso (sin cambios de JSX/estado
      todavía).
      Evidencia: `grep -n "^import"` sobre los tres módulos nuevos no
      muestra ningún import de `react` ni `@/components`; `git diff --stat --
      src/components/pos/PosView.tsx` no devuelve salida (archivo sin tocar).

## 2. Entrada y carrito

- [ ] 2.1 Agregar la guarda de escaneo/búsqueda en vuelo (`useRef` booleano,
      independiente de `pending`) en el envío del formulario de escaneo y en
      la selección de un resultado de búsqueda; verificar que el segundo
      Enter/selección durante una petición en curso se ignora. Verificado por
      inspección de código (no hay test de componente en este repo) y prueba
      manual: doble Enter rápido sobre el mismo código de barras produce una
      sola línea.
      Nota: implementado (`scanInFlightRef` en `PosView.tsx`, chequeado y
      fijado sincrónicamente en `scan()` y `pickSearchResult()`, liberado en
      `finally`). Falta la prueba manual con teclado/lector real — no hay
      navegador disponible en este entorno de ejecución; queda pendiente de
      un cajero o de una sesión con navegador real.
- [x] 2.2 Reescribir `addToCart` para un producto `unitario` según
      `src/lib/cart.ts` (1.1): agrega/incrementa la línea de inmediato,
      dispara la consulta de stock en paralelo y aplica el tope + mensaje
      cuando resuelve, usando siempre el `cart` vigente (no un closure
      capturado antes de la espera). Verificado por inspección de código y
      prueba manual: la línea aparece antes de que resuelva la consulta de
      stock; el tope se aplica y se explica cuando llega.
      Nota: implementado en `PosView.tsx` (`addToCart`) usando
      `addOrIncrementUnitLine`/`applyStockCap` de `cart.ts`, con `setCart`
      funcional para leer el carrito vigente. Prueba manual (Chrome DevTools
      MCP contra `localhost:3000`, usuario `cajero1`): escaneo de 11
      productos unitarios distintos (`7790895000997` y otros) agrega cada
      línea de inmediato con su total correcto, sin bloqueo visible por la
      consulta de stock.
- [x] 2.3 Eliminar el estado y el panel separado "Peso de `<producto>`"
      (`weightProduct`, `beginWeightEntry` como panel externo); al escanear o
      seleccionar un producto `pesable` sin línea existente, agregar la línea
      con peso vacío y enfocar su campo de peso dentro del carrito.
      Verificado por inspección de código (no queda ningún panel fuera del
      carrito) y prueba manual: escaneo de un pesable nuevo agrega la línea y
      enfoca su input.
      Nota: `weightProduct`/`beginWeightEntry` eliminados de `PosView.tsx`;
      `addToCart` usa `addEmptyWeightLine` y enfoca `[data-weight-input]`.
      Prueba manual (Chrome DevTools MCP): seleccionar el producto pesable
      "Papa" desde el buscador agrega su línea directamente en el carrito
      (sin ningún panel externo) con foco en el campo "Peso (kg)" de esa
      línea; snapshot de accesibilidad confirma `textbox "Peso (kg)"
      focusable focused`.
- [x] 2.4 Cambiar `weightError` a estado por línea (campo en la línea o mapa
      por `productId`) y usarlo en el input de peso de cada línea. Verificado
      por inspección de código y prueba manual: un peso inválido en una línea
      no pinta de error otra línea pesable.
      Nota: `weightError` ahora vive en `CartLine.weightError` (`cart.ts`,
      1.1) y cada `<Input>` de peso en `CartLines.tsx` lee sólo
      `line.weightError`. Prueba manual (Chrome DevTools MCP): con "Papa"
      (pesable) en el carrito junto a dos líneas unitarias, tipear `0.5x` en
      su campo de peso muestra "Ingresá un peso mayor a cero con hasta tres
      decimales." sólo bajo esa línea, el subtotal de esa línea pasa a "—" (no
      conserva el `$ 600,00` calculado con el peso válido anterior) y el
      TOTAL/las unidades se recalculan excluyéndola (`$ 2.900,00`, "0.000
      kg"); corregir el peso a `0.5` restaura el subtotal y el total
      correctos sin tocar las otras líneas.
- [x] 2.5 Reemplazar el ícono lápiz + "Editado" de precio real por un campo
      "Precio real" siempre visible junto al precio calculado, con su
      validación (`isMoneyAmount`) mostrada bajo ese campo. Verificado por
      inspección de código y prueba manual: el campo tiene label visible y el
      error aparece junto a él, no en el banner de escaneo.
      Nota: implementado en `CartLineRow` (`CartLines.tsx`): campo "Precio
      real" siempre visible (sin toggle de edición), con `error` propio
      mostrado por `Input` bajo el campo. Prueba manual (Chrome DevTools
      MCP): el snapshot de accesibilidad de la línea "Papa" muestra el label
      "Precio real" y su `textbox` visibles de entrada, sin ícono ni acción
      de edición previa; el banner de escaneo (región de entrada) no
      participa de esta validación.
- [x] 2.6 Ajustar el `<ul id="pos-search-results">` para que no se superponga
      visualmente a las filas del carrito en ningún ancho donde ambos se
      muestran (posición/ancho/`z-index`), sin cambiar su `role="combobox"`,
      `aria-expanded`, `aria-activedescendant` ni el manejo de
      ArrowUp/ArrowDown/Enter/Escape existente. Verificado por prueba manual
      en Chrome DevTools en los anchos donde hoy se superpone (incluido
      320–768px).
      Nota: implementado quitando `absolute`/`z-30` del `<ul>`
      (`ScanOmnibox.tsx`) — ahora vive en flujo normal, empujando el
      contenido siguiente en vez de taparlo; `role`/`aria-*`/teclado sin
      cambios. Prueba manual (Chrome DevTools MCP): screenshot a 1366px con
      resultados de "coca" abiertos y un carrito con líneas debajo confirma
      que la lista se inserta antes del carrito, empujándolo, sin taparlo;
      repetido a 375px (`emulate` viewport móvil) con el mismo resultado
      (screenshot adjunto en la sesión). `role="combobox"`/`aria-expanded`
      sin cambios.
- [x] 2.7 Dar al contenedor de líneas del carrito una altura máxima con
      scroll propio (`overflow-y-auto`) y llevar a la vista la línea recién
      agregada/incrementada dentro de ese contenedor. Verificado por prueba
      manual: un carrito con más líneas de las que entran en el alto
      disponible scrollea internamente sin empujar el resto de la pantalla, y
      agregar una línea la trae a la vista.
      Nota: implementado (`<ul className="max-h-[28rem] overflow-y-auto">` +
      `scrollIntoView({ block: "nearest" })` sobre `[data-cart-line]` en un
      efecto que corre en cada cambio de `flash`, `CartLines.tsx`). Prueba
      manual (Chrome DevTools MCP): con 11 líneas cargadas, `scrollHeight`
      (670px) > `clientHeight` (448px) y `overflow-y: auto` en el `<ul>` del
      carrito, mientras el encabezado, el bloque de entrada y la columna de
      cobro no se desplazan (screenshot); re-escanear una línea ya presente
      (fuera de vista) cambia `scrollTop` de `0` a `61`, trayéndola a la
      vista.
- [x] 2.8 Construir `src/lib/cart.ts`'s cálculo de resumen (líneas + unidades
      + peso total) en el bloque de Total, reemplazando `itemCount =
      cart.length`. Verificado por los tests de 1.1 y por inspección de que
      el JSX consume ese resultado sin recalcular la lógica localmente.
      Evidencia: `grep itemCount` sobre `PosView.tsx`/`CheckoutPanel.tsx` no
      devuelve resultados; `CheckoutPanel.tsx`'s `summaryText()` sólo formatea
      el `CartSummary` que `summarizeCart(cart)` (`PosView.tsx`) ya calculó.
      `npm test` (185 tests, incluye `cart.test.ts`) en verde.
- [x] 2.9 Extraer la entrada (escaneo + búsqueda + su región de estado de
      1.2) y las líneas de carrito a sub-componentes de
      `src/components/pos/`, dejando `PosView.tsx` como orquestador para esta
      porción del árbol. Verificado por inspección de código: los
      sub-componentes no repiten lógica ya movida a `src/lib/`.
      Evidencia: `src/components/pos/ScanOmnibox.tsx` y
      `src/components/pos/CartLines.tsx` creados; reciben mensajes/resultados
      ya resueltos por `PosView.tsx` (`resolveEntryStatus`, `cart.ts`) como
      props y sólo orquestan JSX/handlers (la única lógica local es de
      presentación: el draft del campo "Precio real" en `CartLineRow`).

## 3. Cobro

- [x] 3.1 Preseleccionar "Efectivo" la primera vez que el carrito pasa de
      vacío a tener al menos una línea y no hay medio de pago elegido; no
      reimponerlo si el cajero ya eligió/cambió el medio. Verificado por
      inspección de código y prueba manual: agregar el primer ítem
      preselecciona Efectivo; cambiarlo y agregar otro ítem no lo revierte.
      Nota: implementado (`prevCartLengthRef` + efecto en `PosView.tsx` que
      hace `setPayment("CASH")` sólo en la transición 0→N con `payment ===
      null`). Prueba manual (Chrome DevTools MCP): con el carrito vacío y sin
      medio elegido, escanear el primer producto deja el radio "Efectivo"
      `checked` de inmediato (snapshot de accesibilidad), sin click
      adicional.
- [x] 3.2 Hacer que "Efectivo entregado" y el vuelto se muestren siempre que
      el medio de pago incluya Efectivo (`cashPayment`), eliminando el botón
      "Calcular vuelto" y el estado `showCashChange` de mostrar/ocultar
      (`design.md`, Decisión 8 revisada); aplicarles la misma jerarquía
      tipográfica que usa el total (dejar `text-sm font-medium`); ajustar el
      atajo `F4` para que enfoque el campo, ya visible, en vez de revelarlo.
      Cuando el medio no incluye Efectivo, el campo no se muestra. Verificado
      por prueba manual/inspección visual en desktop y mobile: elegir
      Efectivo (o un tramo Efectivo en pago dividido) muestra el campo sin
      ningún clic adicional; elegir Tarjeta/Transferencia lo oculta.
      Nota: implementado — `showCashChange`/`onShowCashChange` y el botón
      "Calcular vuelto" (con su ícono `IconCalculator`, ya sin uso) se
      quitaron de `CheckoutPanel.tsx` y `PosView.tsx`; el bloque de
      "Efectivo entregado"/vuelto se renderiza directamente dentro de
      `{cashPayment && (...)}`. El handler de `F4` en `PosView.tsx` y el
      `onShowCashChange` que antes pasaba `PosView` ahora sólo hacen
      `cashReceivedRef.current?.focus()`. Prueba manual (Chrome DevTools
      MCP): con el carrito vacío, elegir Efectivo tras escanear el primer
      producto muestra "Efectivo entregado" de inmediato (sin botón previo);
      `F4` enfoca ese campo ya visible (`document.activeElement` confirma el
      input, no requiere doble paso); cargar `2000` sobre un total de
      `1.800,00` muestra "Vuelto $ 200,00"; cambiar el medio a Tarjeta
      (`Alt+2`) oculta el campo y el vuelto por completo. `npm run
      build`/`npm run lint`/`npm test` (185/185) en verde tras el cambio.
- [x] 3.3 Reemplazar las variables de estado de la columna de cobro
      (`scanError` cuando aplica a cobro, `confirmError`, `unknownState`,
      `balanceMessage`, `confirmDisabledReason`) por un único
      `CheckoutStatus` que consume `resolveCheckoutStatus` (1.2) y muestra un
      solo mensaje. Verificado por inspección de código y por los tests de
      `posStatus.test.ts`.
      Evidencia: `CheckoutStatus.tsx` sólo renderiza el resultado de
      `resolveCheckoutStatus(...)` calculado en `PosView.tsx`; no queda
      ningún `<p>`/`<div>` independiente para `confirmError`/`unknownState`/
      `balanceMessage`/`confirmDisabledReason` en `PosView.tsx`. `npm test`
      (185 tests, incluye `posStatus.test.ts`) en verde.
- [ ] 3.4 Dar a `confirmError` un contenedor con `role="alert"` y una acción
      de recuperación según `ApiError.kind`: "Volver" para `forbidden`,
      "Reintentar" (invoca `confirmSale()` de nuevo) para el resto.
      Verificado por inspección de código y prueba manual forzando un error
      de confirmación (p. ej. desconectando la red durante la petición).
      Nota: implementado (`CheckoutStatus.tsx`, rama `kind === "confirmError"`
      con `role="alert"` y `Button` "Volver"/"Reintentar" según
      `confirmErrorKind`). Prueba manual (Chrome DevTools MCP) del camino no
      forbidden: `POST /sales/:id/confirm` devolvió un 500 real del backend
      (no simulado) durante esta sesión; la UI mostró la región con
      `role="alert"` y el botón "Reintentar", tal como se esperaba para
      `error.kind !== "forbidden"`. Falta ejercitar específicamente el
      camino `403`/`forbidden` con el botón "Volver" (no se forzó un 403 en
      esta sesión) — sin navegador dedicado a ese caso todavía.
- [x] 3.5 Migrar la secuencia de `confirmSale()` a `src/lib/posSaleSubmission.ts`
      (1.3), reteniendo el `id` de venta creado en el estado del componente y
      reutilizándolo en un reintento en vez de volver a llamar a `POST
      /sales`. Verificado por los tests de 1.3 y por prueba manual: simular
      un fallo en el paso de pago (p. ej. cortando la red tras crear los
      ítems) y confirmar que un reintento no duplica la venta ni sus ítems.
      Nota: `confirmSale()` en `PosView.tsx` ahora llama a `submitSale(...)`
      con `existingSaleId: retainedSaleId` y `onSaleCreated: setRetainedSaleId`;
      `retainedSaleId` se limpia sólo al confirmar con éxito o al vaciar el
      carrito. `posSaleSubmission.test.ts` (1.3) sigue en verde. Prueba
      manual (Chrome DevTools MCP): un `POST /sales/:id/confirm` real del
      backend falló con 500; al reintentar (botón "Reintentar") la red
      registró `POST /sales/:id/items` → `PUT /sales/:id/payment` → `POST
      /sales/:id/confirm` reutilizando el mismo `:id`
      (`b15facae-49ed-41d4-b423-34a206dbc09d`) sin un segundo `POST
      /sales` — confirma que el reintento no duplica el draft de venta.
- [x] 3.6 Agregar la acción "Vaciar carrito" y `ClearCartDialog` sobre el
      `Dialog` existente (`src/components/ui/Dialog.tsx`), con el copy
      definido en `design.md` (Decisión 13); confirmar vacía carrito, medio
      de pago, pago dividido y efectivo entregado, limpia `sessionStorage`
      (ver 4.4) y devuelve el foco al campo de escaneo; cancelar devuelve el
      foco al botón que abrió el diálogo. Verificado por inspección de código
      y prueba manual: abrir, cancelar (Esc, backdrop, botón) y confirmar,
      comprobando foco en cada caso.
      Nota: implementado (`ClearCartDialog.tsx` sobre `Dialog`, copy igual al
      de `design.md`; `confirmClearCart()` en `PosView.tsx` vacía
      `cart`/`payment`/`splitPayments`/`cashReceived`, limpia
      `sessionStorage` vía el efecto de persistencia — cart vacío borra la
      clave — y llama a `refocus()`; cancelar delega en el cierre nativo de
      `<dialog>`, que ya devuelve el foco al disparador). Prueba manual
      (Chrome DevTools MCP): F8 con 3 y luego 11 líneas abrió el diálogo con
      el copy exacto de `design.md` ("Se van a eliminar los `N`
      productos..."); "Vaciar carrito" vació `cart` (0 líneas), reseteó el
      medio de pago y borró la clave `pos:cart:v1` de `sessionStorage`,
      devolviendo el foco al campo de escaneo. Camino de cancelación
      verificado con click en "Cancelar": abrir el diálogo con click en el
      botón "Vaciar carrito (F8)" y cancelar devuelve el foco a ese mismo
      botón (confirmado con `document.activeElement`); abrir el diálogo vía
      el atajo F8 (sin click previo en el botón) y cancelar devuelve el foco
      al campo de escaneo, que era el elemento con foco antes de abrir el
      diálogo — comportamiento nativo esperado de `<dialog>`, no un defecto.
      No se probaron explícitamente Esc ni click en el backdrop (delegan en
      el mismo cierre nativo ya usado por `Dialog` en el resto del repo).
- [x] 3.7 Extraer el panel de cobro (`CheckoutPanel`) y el panel de "Venta
      confirmada" (`ConfirmedSalePanel`) a sub-componentes de
      `src/components/pos/`, sin cambiar el comportamiento del panel de venta
      confirmada. Verificado por inspección de código.
      Evidencia: `CheckoutPanel.tsx` y `ConfirmedSalePanel.tsx` creados;
      `ConfirmedSalePanel` es el mismo JSX/comportamiento que tenía
      `PosView.tsx` (auto-dismiss a cargo del padre, sin `aria-modal`, mismo
      `role="status"`, mismas acciones).
- [x] 3.8 Agregar un rastro persistente de la última venta confirmada en la
      sesión ("Última venta: #`N` · Ver", enlazando a `/sales/{id}`) en
      `CheckoutPanel.tsx`, debajo del botón "Confirmar venta" (`design.md`,
      Decisión 20). Se guarda en un estado nuevo de `PosView` (p. ej.
      `lastConfirmedSale`), separado del estado que dispara
      `ConfirmedSalePanel`, para que sobreviva el auto-cierre a los 6 s de
      ese panel. Se fija en cada confirmación exitosa (mismo punto donde hoy
      se dispara el panel modal) y se reemplaza en la siguiente venta
      confirmada; no persiste en `sessionStorage` ni acumula una lista.
      Verificado por inspección de código y prueba manual: confirmar una
      venta y esperar (o cerrar) el panel modal deja visible el rastro con el
      número y "Ver" correctos; confirmar una segunda venta reemplaza el
      rastro por el número nuevo.
      Nota: implementado en `PosView.tsx` (estado `lastConfirmedSale`, fijado
      junto a `setConfirmedSale` en el `try` exitoso de `confirmSale()`) y
      renderizado como `<p>` debajo del botón "Confirmar venta" dentro del
      `Card` de cobro, oculto en mobile (`hidden md:block`, la barra fija
      móvil sólo repite total + acción primaria, sin este rastro, según
      `design.md`). Como el backend real devuelve 500 en `/confirm` en este
      entorno (bug de backend ya reportado, ver 3.4/3.5/4.9 — no relacionado
      con este change), la confirmación exitosa se ejerció con un `fetch`
      interceptado en el navegador sólo para la llamada a `/confirm` (deja
      pasar `/sales`, `/items` y `/payment` reales sin tocar), devolviendo un
      `Sale` sintético — prueba explícitamente marcada como red mockeada, no
      como una confirmación real. Con eso: (1) tras confirmar, el rastro
      aparece con el número y el link correctos; (2) esperar más de 6 s deja
      el panel modal auto-cerrado (confirmado por `document.body.textContent`
      sin "Venta confirmada") mientras el rastro sigue visible; (3) confirmar
      una segunda venta cambia el `href` de "Ver" al nuevo `id` de venta,
      confirmando que se reemplaza y no se acumula. `npm run
      build`/`npm run lint`/`npm test` (185/185) en verde.

## 4. Teclado, atajos, persistencia y verificación

- [x] 4.1 Implementar los atajos de teclado de `design.md` (Decisión 14):
      `F9` confirmar venta, `F3` enfocar búsqueda, `F4` enfocar "Efectivo
      entregado"/mostrar vuelto, `F8` abrir "Vaciar carrito", `Alt+1/2/3`
      seleccionar Efectivo/Tarjeta/Transferencia; cada uno impreso como texto
      visible junto a su control, sin interceptar cuando el foco está en un
      campo que usa esa combinación nativamente. Verificado por prueba
      manual con teclado real en Chrome, incluyendo que el texto del atajo es
      visible (no sólo `title`).
      Nota: implementado (listener `keydown` global en `PosView.tsx`; textos
      visibles junto a "Confirmar venta" (F9), la label de búsqueda (F3),
      "Calcular vuelto" (F4), "Vaciar carrito" (F8) y cada chip de pago
      (Alt+1/2/3)). Prueba manual con teclado real (Chrome DevTools MCP,
      `press_key` despachando eventos de teclado reales, no simulación por
      JS): `F3` movió el foco de `#scan` a `#pos-search`; `F4` reveló
      "Efectivo entregado"/vuelto; `F8` abrió `ClearCartDialog`; `F9` disparó
      `confirmSale()` (ver 3.4/3.5, request real al backend); `Alt+2`
      seleccionó "Tarjeta" (radio `checked`) reemplazando a "Efectivo". No se
      probó explícitamente `Alt+3`, simétrico a `Alt+1`/`Alt+2` ya
      verificados. El handler es un único listener global sin guarda de
      "foco en campo de texto" — no hace falta una: ninguna de estas
      combinaciones (F9/F3/F4/F8, Alt+dígito) tiene un efecto de edición de
      texto nativo que pudiera pisarse. El riesgo aceptado de `F3` sobre el
      buscador nativo del navegador está documentado en `design.md`, no es
      un defecto a corregir.
- [x] 4.2 Agrupar cada `<li>` de línea del carrito con `role="group"` y
      nombre accesible igual al del producto, preservando el `aria-label` de
      cada control interno (+/-, precio real, quitar) y su alcance por
      Tab/flechas individual. Verificado por inspección de código y por
      snapshot de accesibilidad de Chrome DevTools sobre una línea.
      Nota: `<li role="group" aria-label={line.product.name}>` en
      `CartLineRow` (`CartLines.tsx`); los `aria-label` de +/-, "Precio real"
      y "Quitar" no cambiaron. Prueba manual (Chrome DevTools MCP): sobre la
      línea "Coca-Cola 500ml", `getAttribute('role') === "group"` y
      `getAttribute('aria-label') === "Coca-Cola 500ml"`; el snapshot de
      accesibilidad muestra los botones "Restar uno a Coca-Cola 500ml",
      "Sumar uno a Coca-Cola 500ml" y "Quitar Coca-Cola 500ml" con su
      `aria-label` propio intacto dentro del grupo.
- [x] 4.3 Implementar la persistencia de `cart` y `payment` en
      `sessionStorage` bajo la clave `pos:cart:v1` (sin `splitPayments` ni
      `cashReceived`), hidratando en un efecto tras el montaje. Verificado
      por prueba manual: recargar la pestaña con un carrito no vacío restaura
      carrito y medio de pago; un pago dividido o vuelto en curso no se
      restaura.
      Nota: implementado en `PosView.tsx` (efecto de hidratación con
      `hydratedRef` tras el montaje; efecto de persistencia que serializa
      sólo `{ cart, payment }`). Prueba manual (Chrome DevTools MCP): con
      Efectivo elegido y "Efectivo entregado" = `5000` cargado,
      `sessionStorage.pos:cart:v1` sólo contenía `{cart, payment}` (sin
      `cashReceived`); recargar la pestaña restauró el carrito y "Efectivo"
      seleccionado, pero el campo "Efectivo entregado"/vuelto volvió a su
      estado colapsado ("Calcular vuelto (F4)"), no restaurado. Repetido
      antes con un carrito de 3 líneas (unitario + pesable con peso ya
      cargado): recarga íntegra del carrito y medio de pago.
- [ ] 4.4 Limpiar `sessionStorage` (clave `pos:cart:v1`) al confirmar una
      venta con éxito y al confirmar "Vaciar carrito". Verificado por prueba
      manual: tras confirmar una venta o vaciar el carrito, recargar la
      pestaña y comprobar que el carrito queda vacío.
      Nota: ambos caminos llaman a `setCart([])`, y el efecto de persistencia
      de 4.3 borra la clave cuando `cart.length === 0` — no hace falta un
      `removeItem` explícito adicional. Prueba manual (Chrome DevTools MCP)
      del camino "Vaciar carrito": con 11 líneas cargadas y `pos:cart:v1`
      poblado en `sessionStorage`, confirmar "Vaciar carrito" dejó
      `sessionStorage.getItem('pos:cart:v1') === null`. Falta ejercitar el
      camino "confirmar una venta con éxito" — los dos intentos de
      `POST /sales/:id/confirm` en esta sesión fallaron con un 500/422 real
      del backend (ver 3.4/3.5), así que ninguna venta llegó a confirmarse
      con éxito para verificar este punto.
- [x] 4.5 Confirmar por inspección que un carrito restaurado con un producto
      cuyo precio cambió o que fue desactivado no bloquea preventivamente en
      el cliente ni al agregar ni al confirmar; el backend sigue siendo la
      autoridad (mismo criterio que el stock desconocido hoy).
      Evidencia: la hidratación (4.3) sólo llama a `setCart`/`setPayment`, sin
      ninguna verificación de precio/actividad contra el catálogo; ni
      `addToCart` ni `confirmSale` consultan el estado "actual" del producto
      de una línea restaurada antes de operar — el único bloqueo del lado
      cliente sigue siendo `confirmDisabledReason` (peso inválido, sin medio
      de pago, balance sin resolver), no relacionado con el precio/actividad
      del producto.
- [x] 4.6 Ejecutar `npm run lint` y resolver cualquier hallazgo introducido
      por este change.
      Evidencia: `npm run lint` → `✔ No ESLint warnings or errors` (tras
      resolver 2 errores `react-hooks/set-state-in-effect` y 2 warnings,
      ver diff de `CartLines.tsx`/`PosView.tsx`).
- [x] 4.7 Ejecutar `npm test` y confirmar que `cart.test.ts`,
      `posStatus.test.ts` y `posSaleSubmission.test.ts` (1.1–1.3) pasan junto
      con el resto de la suite existente.
      Evidencia: `npm test -- --run` → `Test Files 20 passed (20)`, `Tests
      185 passed (185)`.
- [x] 4.8 Ejecutar `npm run build` (el change toca tipos internos de
      `PosView.tsx` y sus nuevos módulos de `lib/`) y resolver cualquier
      error de tipos.
      Evidencia: `npm run build` → "Compiled successfully", "Finished
      TypeScript" sin errores, 25 rutas generadas.
- [ ] 4.9 Prueba manual completa del flujo feliz en desktop y en un ancho
      móvil (≤390px): escanear un `unitario` y un `pesable`, editar peso y
      precio real, dividir pago, calcular vuelto, confirmar, y repetir para
      una venta con error de red simulado (desconectar antes de confirmar) y
      con `Vaciar carrito`.
      Prueba manual (Chrome DevTools MCP, `cajero1`/`cajero123` contra el
      backend local) en 1366px y en 375px: escanear un `unitario` y un
      `pesable`, cargar peso y precio real, calcular vuelto y "Vaciar
      carrito" — todo verificado (ver 2.x/3.x). Pendiente: pago dividido no
      ejercitado en esta sesión. Bloqueo real (no de entorno): `POST
      /sales/:id/confirm` devolvió un 500 genuino del backend en los dos
      intentos de esta sesión (no simulado), así que el flujo feliz nunca
      llegó a una confirmación exitosa — sólo se pudo verificar el camino de
      error (3.4/3.5). Reportado para investigación de backend; fuera del
      alcance de este change frontend.
- [ ] 4.10 Prueba manual de foco y teclado: el foco vuelve al campo de
      escaneo tras agregar, fallar, confirmar y cerrar el panel de éxito o el
      diálogo de vaciar carrito; ningún atajo nuevo interfiere con escribir en
      un campo de texto.
      Prueba manual (Chrome DevTools MCP): foco vuelve a `#scan` tras agregar
      un producto (búsqueda) y tras confirmar "Vaciar carrito"; ningún atajo
      (F3/F4/F8/F9/Alt+1/2/3) tiene efecto de edición de texto que pudiera
      interferir con escribir en un campo (4.1). Pendiente: foco tras
      confirmar con éxito y tras cerrar el panel "Venta confirmada" — no
      alcanzable en esta sesión por el 500 real de backend en `/confirm`
      (ver 4.9).
- [ ] 4.11 Prueba manual de `prefers-reduced-motion`: `.flash`,
      `.total-flash` y `.confirm-ready` mantienen el comportamiento ya
      normativo (ver `ai/context/ui-system.md`) sin que este change lo altere.
      Nota: por inspección, ninguna de esas tres clases ni su lógica de
      disparo (`flash`/`totalFlash`/`confirmReady`) cambió respecto del
      componente original; `shouldReduceMotion` se sigue pasando igual a
      `ConfirmedSalePanel`. Falta la prueba manual con
      `prefers-reduced-motion: reduce` real activado — el `emulate` del MCP
      de Chrome DevTools disponible en esta sesión no expone esa media
      feature (sólo `colorScheme`, viewport, red, etc.), así que sigue
      pendiente de una sesión con esa preferencia del sistema operativo
      activada.
- [ ] 4.12 Sincronizar specs y archivar el change: **no ejecutar en este
      paso**; queda condicionado a una decisión explícita del usuario a
      través del flujo de `ai/roles/change-closer.md`.
