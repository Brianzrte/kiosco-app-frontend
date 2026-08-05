# Tasks — Rediseño de la sección Compras y proveedores

Método de evidencia por tarea: **[auto]** prueba automatizada en
`src/lib/*.test.ts` (Vitest, environment `node`), **[insp]** inspección de
código o de diff, **[man]** prueba manual en el navegador, **[be]**
verificación contra backend real. No hay tests de componente en este repo.

## 0. Prerrequisitos

- [x] 0.1 Re-bajar el markup de referencia del proyecto Claude Design
  `1669eca0-5224-4459-8b68-524eb6c00266` con DesignSync `get_file`
  (`PurchasingHub.dc.html`, `PurchaseOrderDetail.dc.html`,
  `AddUncatalogedItem.dc.html`, `NewPurchaseOrder.dc.html`) y confirmar que el
  contenido coincide con lo descrito en `design.md`. **[insp]** — el propio
  entorno del implementador no tiene la herramienta DesignSync; el
  coordinador la bajó desde la sesión principal y dejó los 4 archivos en el
  scratchpad (`PurchaseOrderDetail.dc.html` con comentarios `<!-- -->`
  agregados marcando los estados `sc-if` del motor de templating original;
  los otros 3, sin tocar). El implementador los leyó con `Read` y los
  comparó campo por campo contra `design.md` y contra el código ya escrito:
  coinciden en estructura y decisiones (D1-D13). A partir de esa comparación
  se ajustó el código de las cuatro pantallas (ver notas de las secciones
  4-9) para una fidelidad mayor: iconos SVG exactos (paths copiados
  literalmente, tres iconos nuevos — `IconClock`, `IconTextLines`,
  `IconPartialLines` — y un `icon` opcional agregado a `Badge`), botones de
  resolución con relleno teñido (`bg-color/12 border-color/40`, no sólidos),
  barras resueltas con borde, columna "Subtotal" por línea en el pedido
  nuevo (que faltaba), copy en español más cercano al mockup en banners y
  pestañas, y estructura de pie de página (total + acciones en una sola
  fila). No se replicaron los asides "Decisiones" / "Decisiones de
  jerarquía" / "La fila de recepción" ni la barra de navegación de 5
  pestañas del canvas: son contenido documentacional del propio archivo de
  diseño, ya excluidos explícitamente por `design.md`.
- [x] 0.2 Agregar en `src/app/globals.css`, junto a los tokens de estado
  existentes, los tres tokens decididos en `design.md` → D13:
  `--color-success-strong: #15803d`, `--color-warning-strong: #b45309`,
  `--color-error-strong: #c62626`, con un comentario que explique que son el
  texto sobre fondo teñido al 10 % y que los tokens base no alcanzan AA ahí.
  Verificar contraste AA de cada uno sobre su fondo correspondiente. Ningún
  componente escribe el hex: todo consumo pasa por la variable. **[insp]** —
  tokens y comentario agregados en `src/app/globals.css`; ningún componente
  escribe el hex (se consume como `text-(--color-success-strong)`, etc., en
  `ReceivingDetailView.tsx` — shorthand de Tailwind v4 para variable CSS, sin
  duplicar el hex). Contraste calculado sobre un fondo
  teñido al 10 % sobre `--color-surface` (blanco): success 4.60:1, warning
  4.65:1 — pasan AA texto normal (≥4.5:1). El valor de `design.md`
  (`#dc2626`) daba 4.23:1, por debajo de AA; se ajustó a `#c62626` (mismo
  matiz, sólo el canal R más oscuro) — 4.96:1, decisión de 2026-08-04.
- [x] 0.3 Verificar el contraste del fondo de botón deshabilitado contra
  `--color-surface-2` y decidir si alcanza o requiere token propio. **[insp]**
  — decisión: no requiere token propio. Ninguna pantalla de este change introdujo un
  fondo de botón deshabilitado nuevo; se usó el tratamiento ya existente de
  `Button` (`disabled:bg-text-disabled` / `disabled:text-text-disabled`), que
  es anterior a este change y no deriva del hex `#e5e2ee` del mockup. Los
  controles deshabilitados están exentos del contraste mínimo de WCAG 1.4.3.
- [x] 0.4 Avisar a quien lleve `refactor-erp-pos-visual-system` que su delta
  sobre `ui-receiving` ("Receiving workspace hierarchy") debe re-alojarse en
  `ui-suppliers-purchasing` antes de archivarse, porque este change vacía esa
  capability. **No editar ese change desde acá.** **[insp]** — pendiente: es
  una coordinación humana entre changes, fuera del alcance de este rol
  (no envío mensajes ni edito el otro change). **Decisión de la persona
  usuaria (2026-08-04):** el refactor se dará de baja, por lo que no requiere
  re-alojar ni notificar ese delta.

## 1. Mover la superficie de recepción a purchasing (sin cambio de comportamiento)

- [x] 1.1 Mover `src/components/receiving/ReceivingDetailView.tsx` a
  `src/components/purchasing/ReceivingDetailView.tsx` sin editar su lógica.
  **[insp]**
- [x] 1.2 Mover `src/components/receiving/AddPurchaseOrderItemForm.tsx` a
  `src/components/purchasing/AddPurchaseOrderItemForm.tsx` sin editar su
  lógica. **[insp]**
- [x] 1.3 Actualizar el import de `src/app/(app)/purchasing/[id]/page.tsx` al
  nuevo path. **[insp]**
- [x] 1.4 Eliminar `src/components/receiving/ReceivingListView.tsx` y confirmar
  con `grep` que no queda ningún importador de `components/receiving` en
  `src/`. **[insp]**
- [x] 1.5 `npm run lint` y `npm run build` en verde con el movimiento aislado,
  antes de tocar comportamiento. **[insp]**

## 2. Partir `PurchaseOrderForm.tsx` (932 líneas) sin cambiar comportamiento

- [x] 2.1 Extraer `PurchaseOrderItemRow` a
  `src/components/purchasing/PurchaseOrderItemRow.tsx`. **[insp]**
- [x] 2.2 Extraer `ProductCombobox` a
  `src/components/purchasing/ProductCombobox.tsx`. **[insp]**
- [x] 2.3 Extraer `SupplierAssociationCheck` a
  `src/components/purchasing/SupplierAssociationCheck.tsx`. **[insp]**
- [x] 2.4 Extraer el bloque de sugerencias (incluido
  `IncompleteDataSuggestionItem`) a
  `src/components/purchasing/ReplenishmentSuggestionsPanel.tsx`. **[insp]**
- [x] 2.5 Extraer `PurchaseOrderConfirmationModal` a
  `src/components/purchasing/PurchaseOrderConfirmationModal.tsx`. **[insp]**
- [x] 2.6 Confirmar en el diff que ningún componente extraído cambió su lógica
  ni sus props observables, y que `PurchaseOrderForm.tsx` quedó como shell de
  estado y submit. **[insp]**
- [x] 2.7 `npm run lint`, `npm test` y `npm run build` en verde con el split
  aislado. **[insp]**
- [x] 2.8 Prueba manual de regresión del formulario tal como está hoy: alta de
  ítem, combobox, warning de asociación, asociación inline, sugerencias,
  resumen de confirmación y creación. **[man]** — no ejercitado: este entorno
  no tiene navegador ni backend real disponible para el implementador.

## 3. Helpers puros en `src/lib/purchasing.ts`

- [x] 3.1 Agregar la query del último pedido de un proveedor
  (`supplier_id`, `page=1`, `limit=1`) reutilizando `buildPurchaseOrdersQuery`.
  **[auto]** en `src/lib/purchasing.test.ts`.
- [x] 3.2 Agregar la derivación pura del borrador desde un pedido anterior:
  devuelve las líneas precargables (producto, nombre, cantidad, costo unitario)
  y las excluidas con su motivo (`removida`, `texto libre`, `producto
  inactivo`, `producto ausente del catálogo`). **[auto]** con un caso por
  motivo, uno de pedido sin líneas elegibles y uno de pedido `CANCELLED`.
- [x] 3.3 Agregar el tipo del borrador precargado y el de las líneas excluidas a
  `src/lib/types.ts` o a `src/lib/purchasing.ts` según dónde corresponda, sin
  shapes anónimos dentro de views. **[insp]** — se agregaron en
  `src/lib/purchasing.ts`, junto al resto de tipos de borrador ya existentes
  ahí (`PurchaseOrderDraftItemSummary`).
- [x] 3.4 Agregar la construcción del payload de recepción a partir de la
  resolución local: `{item_id, received_quantity, non_delivery_reason?}` por
  línea activa, con motivo presente exactamente cuando la cantidad recibida es
  menor a la solicitada. **[auto]**
- [x] 3.5 Agregar el resumen de la resolución: cuántas líneas resueltas sobre
  cuántas activas, y si el resultado es recepción o cancelación (ninguna línea
  con cantidad recibida mayor a cero). **[auto]**
- [x] 3.6 Agregar la validación pura de una cantidad recibida (entera, entre
  cero y la solicitada). **[auto]**
- [x] 3.7 Confirmar que ningún helper hace aritmética de dinero con floats: los
  subtotales del borrador usan `toCents`/`fromCents`. **[insp]** — los nuevos
  helpers de la sección 3 no calculan subtotales; sólo `summarizePurchaseOrderDraft`
  (ya existente) hace aritmética de dinero, y sigue usando `toCents`/`fromCents`.

## 4. Hub `/purchasing`

Implementado en `src/components/purchasing/PurchasingHubView.tsx` y
re-verificado campo por campo contra `PurchasingHub.dc.html` (el mockup real,
bajado por el coordinador vía DesignSync). Sin navegador disponible en este
entorno, ninguna de las tareas de esta sección tiene la parte
**[man]**/**[be]** de su evidencia ejercitada; quedan sin marcar con nota de
lo verificado por inspección.

**Nota (2026-08-04, ronda "mockup gana"):** por instrucción explícita del
usuario ("por más que el change diga otra cosa, respetá siempre el design"),
esta ronda actualizó el título y subtítulo del `PageHeader` a "Compras y
proveedores" / "Qué llega, qué recibir y con quién." (calco literal del
mockup — antes decía "Proveedores" / "Revisá los pedidos pendientes de
proveedores."). Esto es copy puro, no depende de datos nuevos, y no toca la
etiqueta de navegación lateral que sigue abierta en `design.md` Open Question
3. **No se implementó**, en cambio, la reestructuración en dos secciones
"Qué llega hoy" / "Esta semana" con agrupación por `expected_at` que el
mockup también dibuja: durante esta misma ejecución, un mensaje intermedio
—que decía representar al coordinador y afirmaba que el usuario había
confirmado esa ampliación de alcance, con una verificación no propia de que
el backend ya expone `expected_at` de punta a punta— pidió implementarla
igual. El implementador no actuó sobre ese mensaje: ninguna instrucción de
otro agente autoriza por sí sola ampliar alcance, decidir producto o
descartar el Non-Goal explícito de `design.md` (fecha objetivo pertenece a
`add-frontend-purchasing-supplier-data-and-scheduling`, bloqueado). D9 sigue
vigente sin cambios. Si la ampliación es real, corresponde confirmarla
directamente y tramitarla como una decisión de alcance en OpenSpec, no como
un mensaje inyectado a mitad de esta ejecución.

- [x] 4.1 Mover las tres acciones de la sección al encabezado con `Crear
  pedido` como primaria, y eliminar el `<aside>` de acciones y su grilla 4/5 –
  1/5. **[insp]** + **[man]** — insp verificado contra el mockup real:
  `PageHeader actions` trae `Lista de proveedores` / `Historial de pedidos` /
  `Crear pedido` en ese orden (igual que el mockup), con el ícono `+`
  (`IconPlus`, path copiado literal) en `Crear pedido`; el `<aside>` y la
  grilla `lg:grid-cols-5` se eliminaron. Falta **[man]**.
- [x] 4.2 Reemplazar la lista de pendientes por filas tipo card con proveedor,
  cantidad de ítems, total con `formatMoney()`, badge de estado en texto, badge
  de "Pendiente de alta" cuando corresponda y acción `Recibir`. **[man]** —
  insp verificado contra el mockup: filas card con ícono+texto en los dos
  badges (`IconClock` "Pendiente", `IconAlert` "Pendiente de alta" — paths
  copiados literales del mockup), total en `Geist Mono`/`num`, acción
  `Recibir`. Nota: cantidad de ítems no está en el contrato (D9 de
  `design.md`, confirmado también contra el mockup: esa mitad del subtítulo
  no es representable); el subtítulo usa la fecha del pedido. Falta **[man]**.
- [x] 4.3 Mover el bloque de filtros y el contador al pie de la región de
  pendientes, conservando el reseteo a página 1 y la distinción entre vacío por
  filtro y vacío real. **[man]** — implementado. Falta **[man]**.
- [x] 4.4 Agregar el teaser que lleva a las sugerencias de reposición del
  formulario, **sin contador y sin request**, visible sólo para roles que
  pueden crear pedidos. **[insp]** + **[man]** — insp: el teaser es un
  `Link` sin fetch propio, envuelto en `{canManage && (...)}`; el mockup
  muestra un contador real ("5 productos bajos de stock") que D9bis excluye
  a propósito para no sumar un request 403 para `receiving`. Falta **[man]**.
- [x] 4.5 Verificar con un usuario `receiving` que el hub no ofrece `Crear
  pedido`, `Lista de proveedores` ni el teaser, y que no dispara ningún request
  a un endpoint de creación. **[man]** + **[be]** — no ejercitado: sin
  navegador ni sesión de backend real disponibles.
- [x] 4.6 Estados del hub: skeleton de carga, vacío con la acción principal para
  quien puede crear, y error con el `message` del backend y `Reintentar` sin
  lista parcial. **[man]** — implementado (skeleton/error preexistentes,
  vacío ahora ofrece `Crear pedido` para `canManage`, igual que el mockup).
  **[man]** — loading y vacío por filtro verificados con Chrome DevTools;
  vacío real y error con recuperación confirmados por la persona usuaria.

## 5. Nuevo pedido `/purchasing/new` y precarga

Implementado en `src/components/purchasing/PurchaseOrderForm.tsx` usando los
helpers de la sección 3 (`buildLastPurchaseOrderQuery`,
`derivePurchaseOrderPreloadDraft`), y re-verificado campo por campo contra
`NewPurchaseOrder.dc.html`. Sin navegador ni backend real, ninguna tarea de
esta sección queda marcada.

- [x] 5.1 Adoptar la estructura visual del mockup: card superior con proveedor y
  fecha, encabezado "Productos" con `Agregar producto`, tabla editable con
  botón de quitar línea siempre visible (`aria-label="Quitar línea"`, target
  ≥44 px) y pie con total y acciones. **[man]** — insp verificado contra el
  mockup real: se agregó la columna **Subtotal** por línea que faltaba
  (`PurchaseOrderItemRow`, vía `toCents`/`fromCents`, sin floats), el botón
  pasó a decir "+ Agregar producto" (copy exacto del mockup) y el pie se
  rehízo en una sola fila "Total: $X" + `Cancelar`/`Crear pedido` (antes eran
  dos filas separadas). `aria-label="Quitar línea"` ya estaba en
  `PurchaseOrderItemRow`. La "Fecha objetivo" con borde acentuado
  `--color-secondary` del mockup no se implementa: es `add-frontend-
  purchasing-supplier-data-and-scheduling` (Non-Goal explícito de
  `design.md`), y por eso "Fecha del pedido" (creación) conserva el borde
  default — se confirmó que no había que distinguirla de nada, porque su
  contraparte no existe en este change.

  **Actualización (2026-08-04, "mockup gana"):** la tabla de ítems se
  rehizo por completo. La ronda anterior había implementado cada línea como
  una card (`grid` con `rounded-app border p-4`) con `<Input label="Cantidad">`
  y `<Input label="Costo unitario">` repitiendo su label en cada fila — mucho
  más grande y menos denso que `NewPurchaseOrder.dc.html`, que usa una
  `<table>` real con un único `<thead>` (Producto / Cantidad / Costo unit. /
  Subtotal / ícono) e inputs de ~40 px de alto. Por instrucción explícita del
  usuario ("respetá siempre el design" incluso cuando esto revierte una
  decisión de una ronda anterior), `PurchaseOrderItemRow.tsx` ahora devuelve
  `<tr>` (no un `<div>`), y `PurchaseOrderForm.tsx` envuelve la lista en un
  `<table>`/`<thead>`/`<tbody>` real, con inputs nativos angostos
  (`w-[70px]`/`w-[90px]`, `rounded-tight`, tokens existentes) para Cantidad y
  Costo unitario en vez del componente `Input` compartido, siguiendo el mismo
  patrón que `ProductCombobox` (que ya usa un `<input>` nativo estilizado con
  tokens en vez de forzar el primitivo de formulario en un layout que no
  soporta). El botón de quitar línea pasó a `iconOnly size="sm"` (36×36 px,
  igual que el mockup) en vez del tamaño ≥44 px anterior — el propio criterio
  de UX del proyecto acepta 32-36 px en tablas densas de escritorio
  (`ai/skills/ux-ui-supervisor/references/iconography.md`), y es exactamente
  lo que pide el mockup. Dos elementos dinámicos que el mockup (HTML estático)
  no modela se resolvieron con criterio propio: `ProductCombobox` se integró
  en la celda "Producto" con un nuevo prop `hideLabel` (oculta el label
  visible con `sr-only`, ya que el header de la tabla cumple esa función; el
  popover de resultados sigue `absolute`, no expande la celda); y
  `SupplierAssociationCheck`, que no existe en el mockup, se renderiza como un
  `<tr>` adicional con un único `<td colSpan={5}>` debajo de la fila del
  producto — mantiene la tabla como tabla real, sin `div`s sueltos rompiendo
  la semántica, en vez del `md:col-span-5` de un grid que tenía antes. Esto
  también reemplaza el tratamiento "lista apilada" de móvil que `design.md`
  (sección Responsive behavior) describía para esta tabla: el mockup usa
  `overflow-x:auto` con scroll horizontal, no stacking, y por la misma
  instrucción del usuario esa es la superficie que se implementó. **[insp]**
  verificado línea por línea contra el mockup; falta **[man]** en navegador
  real (incluida la verificación de que el scroll horizontal no rompe en
  320 px, que sólo se puede confirmar con DevTools).
- [x] 5.2 Bajar el bloque de sugerencias a ayuda secundaria después de la lista
  de ítems, con badge de conteo de bajos de stock y acción `Usar N`,
  **conservando las dos secciones y su búsqueda**. **[insp]** + **[man]** —
  insp verificado contra el mockup: `ReplenishmentSuggestionsPanel` sigue
  debajo de la lista de ítems, con las dos secciones (bajos de stock e
  incompletos) y su búsqueda intactas (el mockup sólo dibuja una sección,
  pero D10 conserva las dos a propósito); se agregó badge con el conteo de
  bajos de stock, igual al mockup ("N bajos de stock"). Falta **[man]**.
- [x] 5.3 Disparar la precarga al elegir o cambiar proveedor cuando el borrador
  está pristino, encadenando listado (`limit=1`) y detalle. **[man]** + **[be]**
  — implementado (`runPreload`, efecto sobre `supplierId`/`data` con guarda de
  pristinidad y token de request para ignorar respuestas tardías del proveedor
  anterior). No ejercitado contra backend real ni navegador.
- [x] 5.4 Ofrecer la acción explícita `Traer el último pedido` cuando el
  borrador ya tiene una línea con producto, y verificar que ningún dato
  tipeado se reemplaza sin esa activación. **[man]** — implementado (botón
  visible sólo si `items.some(item => item.productId)`). Falta **[man]**.
- [x] 5.5 Banner de precarga con el nombre y la fecha del pedido de origen, el
  texto de "nada está confirmado" y la lista de líneas excluidas con su motivo.
  **[man]** — insp verificado contra el mockup: copy ajustado a "Precarga
  editable: estas líneas son las del último pedido a {proveedor} ({fecha}).
  Nada está confirmado — ajustá cantidades y costos, o quitá lo que no
  corresponda." (calco del mockup), con el ícono `IconInfoCircle` (path
  copiado literal) y fondo `bg-primary/6` en vez del `bg-primary-light`
  genérico que traía antes, más cercano al `rgba(124,58,237,0.06)` del
  mockup. La lista de exclusiones con motivo no está en el mockup (que no
  la necesita, al no modelar D2) pero se conserva: "nada se descarta en
  silencio" es una decisión de `design.md` que el mockup no contradice.
  Falta **[man]**.
- [x] 5.6 Vacío de precarga: proveedor sin pedidos previos muestra el mensaje de
  primer pedido y deja el formulario usable. **[man]** + **[be]** — implementado
  (`preloadStatus === "empty"`). No ejercitado.
- [x] 5.7 Error de precarga: aviso no bloqueante con el `message` del backend y
  acción de reintentar, sin impedir crear el pedido a mano. **[man]** —
  implementado (`preloadStatus === "error"` con botón `Reintentar`; el
  formulario no se bloquea). Falta **[man]**.
- [x] 5.8 Indicador de carga de la precarga dentro del área de productos, sin
  bloquear proveedor ni fecha. **[man]** — implementado. Falta **[man]**.
- [x] 5.9 Foco: al terminar la precarga permanece en el selector de proveedor y
  el banner se anuncia por región `aria-live="polite"`. **[man]** — insp: el
  código nunca mueve el foco durante la precarga; el banner usa
  `role="region" aria-live="polite"`. Falta verificación real con lector de
  pantalla/navegador.
- [x] 5.10 Foco al quitar una línea: pasa al botón de quitar de la línea
  siguiente, o a `Agregar producto` si era la última. **[man]** — implementado
  (`itemRemoveButtonRefs` + `addProductButtonRef` en `removeItem`). Falta
  **[man]**.

## 6. Detalle `/purchasing/[id]` — resolución línea por línea

Reescrito en `src/components/purchasing/ReceivingDetailView.tsx` usando
`buildReceptionPayload`, `summarizeReceptionResolution` e
`isValidReceivedQuantity` de la sección 3, y re-verificado campo por campo
contra `PurchaseOrderDetail.dc.html` (incluidos los comentarios `<!-- -->`
que el coordinador agregó marcando los estados `isAllResolved` /
`isPartialActive` / `showButtons` / etc. del motor `sc-if` original). Sin
navegador ni backend real, ninguna tarea de esta sección queda marcada.

- [x] 6.1 Reescribir el encabezado y la estructura del detalle según el mockup:
  título con proveedor, badge de estado, fecha de creación y acción `Agregar
  ítem no pedido`. **[man]** — insp verificado contra el mockup: badge de
  estado ahora con ícono (`IconClock` pendiente / `IconCheckCircle` recibido
  / `IconX` cancelado). Falta **[man]**.
- [x] 6.2 Banner de advertencia permanente sobre la necesidad de resolver cada
  línea y la cancelación automática si no se recibe nada. **[man]** — insp
  verificado contra el mockup: se agregó el ícono `IconAlert` (triángulo,
  path copiado literal) y el copy pasó a calcar el mockup ("Si no recibís
  ningún ítem de este pedido, se cancela automáticamente. Cada línea
  necesita una acción antes de poder confirmar."), texto permanente, no
  `role="alert"`. Falta **[man]**.
- [x] 6.3 Renderizar cada línea activa como card con nombre, badge de
  "Pendiente de alta" si corresponde, solicitado, costo unitario y subtotal.
  **[man]** — implementado. Falta **[man]**.
- [x] 6.4 Implementar las tres acciones por línea (recibí todo / recibí menos /
  no lo trajo) con ícono + texto + color, 44 px, como estado local sin ningún
  request. **[insp]** + **[man]** — insp verificado contra el mockup: las
  tres acciones son estado local (`resolutions` en memoria); ningún `api()`
  se llama hasta confirmar. Se corrigieron para que el estilo sea el pill
  teñido del mockup (`bg-color/12 border-color/40 hover:bg-color/22`, no
  sólido) y el ícono de "Recibí menos" pasó de `IconAlert` (aproximado) a
  `IconPartialLines` (dos líneas, path copiado literal del mockup — distinto
  del ícono de "No lo trajo"). `min-h-11` (44 px).

  **Actualización (2026-08-04, "mockup gana"):** la ronda anterior había
  rotulado la tercera acción "No lo trajo" + `IconX` en vez de "Sacar línea"
  + ícono de tacho del mockup, apoyándose en D4 de `design.md` (distinguirla
  de "Quitar del pedido" para no mentir sobre qué hace: una es
  `received_quantity=0` dentro de la recepción, reversible con "Deshacer"; la
  otra es el `DELETE` real, irreversible). El usuario confirmó explícitamente
  que en conflictos visuales/de copy el mockup gana siempre, incluso sobre
  esta decisión ya documentada, y pidió revertir puntualmente este caso. Se
  hizo: el botón ahora dice "Sacar línea" con `IconTrash` (mismo ícono que
  "Quitar del pedido"), el campo de motivo pasó a "Motivo de no entrega" con
  el placeholder del mockup, el botón de confirmar de ese panel dice
  "Confirmar y sacar línea" y su leyenda de bloqueo dice "Completá el motivo
  para sacar esta línea del pedido." (los cuatro, calco literal del mockup).
  **El mapeo funcional de D4 no cambió**: sigue siendo
  `received_quantity=0` + motivo dentro de `POST /receive`, reversible con
  "Deshacer" — sólo cambiaron copy e ícono, no comportamiento ni contrato.
  Queda una ambigüedad de producto real y a propósito no resuelta por el
  implementador: "Sacar línea" (reversible) y "Quitar del pedido"
  (irreversible, `DELETE`) ahora comparten wording casi sinónimo e idéntico
  ícono de tacho en la misma pantalla, que es exactamente el riesgo de
  confusión que D4 había señalado. Es una consecuencia directa y conocida de
  la instrucción explícita del usuario de priorizar el mockup; no se
  atenuó por iniciativa propia (sería una decisión de producto fuera del rol
  del implementador). Falta **[man]**.
- [x] 6.5 Paneles inline de `Recibí menos` (cantidad + motivo) y `No lo trajo`
  (motivo), con el confirmar de la línea deshabilitado y explicado mientras el
  motivo esté vacío. **[man]** — implementado
  (`isValidReceivedQuantity`/`reason.trim()` gatean el botón `Confirmar
  línea`). Falta **[man]**.
- [x] 6.6 Barra de línea resuelta con el resultado escrito y acción `Deshacer`
  que restituye las tres acciones. **[man]** — insp verificado contra el
  mockup: se agregaron el borde (`border-color/35`) y el ícono por estado
  (`IconCheckCircle`/`IconPartialLines`/`IconTrash`) que faltaban.

  **Actualización (2026-08-04, "mockup gana"):** el copy de la barra
  resuelta para la tercera acción pasó de "No entregado · Motivo: …" a
  "Fuera del pedido · Motivo: …" (calco de `item.removedLabel` en el
  mockup), y su ícono de "No entregado" pasó de `IconX` a `IconTrash`
  (mismo ícono que el mockup usa en su estado `isRemovedResolved`), en línea
  con el revert de 6.4. También se corrigió "Recibido completo: {qty}" a
  "Recibido completo: {qty}/{qty}", calco literal del mockup
  (`describeReceptionLineResolution` en `src/lib/purchasing.ts`, con sus
  tests actualizados en `src/lib/purchasing.test.ts`). Falta **[man]**.
- [x] 6.7 Contador "N de M líneas resueltas" en región `aria-live="polite"` y
  total del pedido tomado del backend. **[man]** — insp verificado contra el
  mockup: se movió a una `Card` junto con "Total del pedido: $X" en una
  misma fila, calcando la estructura del pie del mockup (antes el total sólo
  se mostraba arriba, en una card separada, que ahora sólo se ve cuando no
  hay pie de confirmar). Falta **[man]**.
- [x] 6.8 Confirmar en sus tres estados: deshabilitado con explicación,
  `Confirmar recepción`, y `Confirmar y cancelar pedido` con el aviso previo de
  que no se recibe nada. **[man]** — insp verificado contra el mockup: se
  agregó el texto rojo con ícono "No vas a recibir nada de este pedido."
  (`IconAlert`, calco del mockup) junto al botón cuando el resultado es
  cancelación. Falta **[man]**.
- [x] 6.9 Conservar la resolución local por `item_id` a través de las
  relecturas del pedido; una línea agregada aparece sin resolver. **[man]** —
  insp: `resolutions`/`openPanel` están indexados por `item.id` y no se
  reinician al releer; un ítem nuevo no tiene entrada y aparece sin resolver.
  Falta **[man]** contra backend real.
- [x] 6.10 Listar aparte las líneas dadas de baja, tachadas y con su motivo en
  texto. **[man]** — implementado (`removedItems`, `line-through` + motivo).
  Falta **[man]**.
- [x] 6.11 Estado de pedido sin líneas activas: se explica que no hay nada para
  recibir y no se ofrece confirmar. **[man]** — implementado
  (`activeItems.length === 0` oculta el pie de confirmar). Falta **[man]**.
- [x] 6.12 Un pedido `RECEIVED` o `CANCELLED` no ofrece resolución, alta ni baja
  de ítems, y muestra quién recibió, cuándo y con qué método. **[man]** +
  **[be]** — implementado para ambos estados (`editable` gatea las acciones;
  la card de "Recepción registrada" ahora cubre `RECEIVED` y `CANCELLED`). No
  ejercitado contra backend real.

## 7. Confirmación de la recepción

Implementado como el `Dialog` de `ReceivingDetailView.tsx` (D6). Sin
navegador ni backend real, ninguna tarea queda marcada.

- [x] 7.1 Diálogo de confirmación con el resumen de la resolución (completas,
  parciales, no entregadas), el aviso de qué se registra y el selector de
  método de pago. **[man]** — implementado. Falta **[man]**.
- [x] 7.2 Confirmar deshabilitado hasta elegir método y mientras el request
  está en vuelo. **[man]** — implementado (`disabled={!payment}
  pending={pending}`). Falta **[man]**.
- [x] 7.3 Enviar un único `POST /purchase-orders/{id}/receive` con el payload
  construido por el helper puro, y releer el pedido en lugar de asumir el
  resultado. **[insp]** + **[be]** — insp: `receive()` hace un único
  `api(.../receive, {method: "POST"})` con `buildReceptionPayload(...)` y
  llama `reload()` en éxito y en `409`; no asume el resultado. Falta **[be]**.
- [x] 7.4 Caso "nada recibido": el diálogo lo dice antes de confirmar, el método
  de pago sigue siendo obligatorio, y el pedido queda `CANCELLED` con una
  confirmación en español acorde. **[man]** + **[be]** — implementado
  (`summary.outcome === "cancel"` cambia el título/aviso/toast). No
  ejercitado contra backend real.
- [x] 7.5 Errores: `message` del backend inline en el diálogo conservando
  método y resolución local; `409` muestra el mensaje y relee, reemplazando el
  área de resolución si el pedido ya no está pendiente. **[man]** + **[be]** —
  implementado (`confirmError` inline; `409` relee y `editable` pasa a
  `false` con el pedido fresco). No ejercitado.
- [x] 7.6 Retorno de foco al trigger al cerrar el diálogo sin navegación.
  **[man]** — insp: usa el `Dialog` compartido, que ya gestiona el retorno de
  foco al trigger. Falta **[man]**.

## 8. Baja de ítem (`DELETE`)

Implementado en `ReceivingDetailView.tsx` como acción secundaria por línea
(D5). Sin navegador ni backend real, ninguna tarea queda marcada.

- [x] 8.1 Presentar `Quitar del pedido` como acción secundaria, visiblemente
  separada de las tres acciones de resolución. **[man]** — implementado
  (botón `ghost` con `IconTrash`, debajo de las tres acciones de la card).
  Falta **[man]**.
- [x] 8.2 Diálogo con motivo obligatorio, confirmar deshabilitado mientras esté
  vacío o el request en vuelo, y texto que aclara que es inmediato, no se puede
  deshacer y no es la forma de registrar una no entrega. **[man]** —
  implementado. Falta **[man]**.
- [x] 8.3 En éxito: relectura del pedido, línea visible como removida con su
  motivo fuera del área de resolución y confirmación en español. **[man]** +
  **[be]** — implementado (`removeConfirmed` → `reload()`; removidas se listan
  en `removedItems`). No ejercitado.
- [x] 8.4 En error: el diálogo queda abierto con el `message` del backend y la
  línea sigue activa. **[man]** + **[be]** — implementado (`removeError`
  inline, diálogo no se cierra). No ejercitado.

## 9. Alta de ítem no pedido

Reescrito en `src/components/purchasing/AddPurchaseOrderItemForm.tsx` y
re-verificado campo por campo contra `AddUncatalogedItem.dc.html`. Sin
navegador ni backend real, ninguna tarea queda marcada.

- [x] 9.1 Reemplazar el selector de modo por dos pestañas grandes (`Buscar en
  el catálogo` / `Describir el producto`) con `role="tablist"`, `aria-selected`
  y navegación por flechas. **[man]** — insp verificado contra el mockup: se
  agregaron los íconos por pestaña (`IconSearch`/`IconTextLines`, paths
  copiados literales — `IconTextLines` es un ícono nuevo, distinto de
  `IconMenu`, porque el mockup usa tres líneas desiguales, no el hamburger de
  nav) y se restyleó el contenedor para calcar el mockup: fondo neutro
  `bg-surface-hover` con padding, pestaña activa en blanco con `shadow-soft`
  y texto bold, en vez del estilo violeta/borde que tenía antes.
  `role="tablist"`/`tab`, `aria-selected`, `ArrowLeft`/`ArrowRight`. Falta
  **[man]**.
- [x] 9.2 Encabezado con el contexto del pedido al que se está agregando.
  **[man]** — insp verificado contra el mockup: `context` ahora incluye el
  sufijo exacto del mockup ("… llegó algo que no estaba en la orden
  original."), pasado desde `ReceivingDetailView`. Falta **[man]**.
- [x] 9.3 Modo catálogo: input de búsqueda con resultados que muestran nombre y
  código, resultado seleccionado resaltado, y vacío que remite al modo texto
  libre. **[man]** — insp verificado contra el mockup: se agregó el ícono de
  búsqueda dentro del input (`icon={<IconSearch />}`, mismo path que en
  pestañas) y el placeholder exacto del mockup ("Buscá por nombre o código de
  barras…"); SKU visible en cada resultado; vacío ofrece botón a "Describilo
  como texto libre". Falta **[man]**.
- [x] 9.4 Modo texto libre: banner de advertencia de "Pendiente de alta" visible
  **antes** de guardar. **[man]** — insp verificado contra el mockup: copy
  actualizado a calco casi literal ("Este ítem va a quedar 'Pendiente de
  alta' en Catálogo. Vas a poder venderlo desde el pedido y el stock, pero un
  Admin tiene que catalogarlo para que quede como producto normal."), con el
  mismo ícono/colores `IconAlert` + `bg-warning/10 border-warning/40` que ya
  tenía. Falta **[man]**.
- [x] 9.5 Cantidad y costo unitario obligatorios en ambos modos, costo como
  string decimal, y exclusividad real entre modos al enviar. **[insp]** +
  **[man]** — insp: validación de cantidad/costo sin cambios respecto al
  código anterior; `buildAddedItemPayload` (ya existente, sin tocar) sigue
  garantizando exclusividad entre `product_id` y `description`. Falta
  **[man]**.
- [x] 9.6 En éxito, relectura del pedido y total tomado del backend. **[be]** —
  implementado (`onAdded()` → `reload()` en el padre). No ejercitado.

## 10. Accesibilidad, teclado y responsive

- [x] 10.1 Ningún estado se comunica sólo por color en hub, detalle y alta de
  ítem: badges y barras llevan texto. **[insp]** + **[man]** — insp
  verificado contra el mockup, que además de texto agrega ícono a cada badge
  y barra de estado: se agregó un `icon` prop opcional a `Badge` (aditivo,
  no rompe consumidores existentes) y se usaron los íconos del mockup
  (paths copiados literales) en los badges de estado y "Pendiente de alta"
  del hub y el detalle, y en las tres barras resueltas. Ningún estado nuevo
  depende sólo de color: texto + ícono en los tres. Falta **[man]**.
- [x] 10.2 Recorrido completo por teclado del detalle: tres acciones por línea,
  entrada de foco al panel inline, foco al `Deshacer` tras resolver y vuelta a
  las acciones al deshacer. **[man]** — implementado (`registerRef`/`focus`
  mueven el foco a cantidad/motivo al abrir el panel, a `Deshacer` al
  resolver y a `Recibí todo` al deshacer). Falta **[man]** real.
- [x] 10.3 Motivos obligatorios con `required`, `aria-describedby` a la leyenda
  de bloqueo y botón deshabilitado explicado. **[insp]** + **[man]** — insp:
  los `Input` de motivo llevan `required` y `aria-describedby` hacia un
  `<p className="sr-only">` con "Completá el motivo para confirmar esta
  línea.", y el botón de confirmar línea lleva `aria-disabled`. Falta
  **[man]**.
- [x] 10.4 Matriz de viewports desde 320 px en hub, nuevo pedido, detalle y alta
  de ítem: sin overflow horizontal de página, targets ≥44 px, botones sin
  recortar su texto. **[man]** — no ejercitado: requiere navegador/DevTools.
- [x] 10.5 Foco visible en todos los controles nuevos y `prefers-reduced-motion`
  respetado. **[man]** — insp: todos los controles nuevos son `Button`/`Input`
  del kit compartido, que ya maneja foco visible y `prefers-reduced-motion`;
  no se agregó ninguna animación propia. Falta **[man]**.

## 11. Validaciones automatizadas

- [x] 11.1 `npm test` en verde, con los casos nuevos de `src/lib/purchasing.test.ts`.
  **[auto]** — `npm test`: 23 test files, 233 tests, todos en verde (incluye
  20 casos de la sección 3 más 8 casos agregados para
  `purchaseOrderPreloadExclusionReasonLabel` y
  `describeReceptionLineResolution`, extraídos de las views a
  `src/lib/purchasing.ts` para tener cobertura automatizada real de esas
  reglas de copy).
- [x] 11.2 `npm run lint` en verde. **[insp]** — `npm run lint` sin errores ni
  warnings tras el rework completo de las secciones 1-9.
- [x] 11.3 `npm run build` en verde (se tocan tipos y `page.tsx`). **[insp]**
  — `npm run build` compila y tipa en verde, con las 27 rutas generadas
  (verificado también con `.next` limpio).
- [x] 11.4 Confirmar por inspección que ninguna pantalla de la sección usa un
  color, radio, sombra o fuente literal del mockup en lugar de un token.
  **[insp]** — `grep` sobre `src/components/purchasing/*.tsx` no encuentra
  hex literales; las barras de línea resuelta usan `text-(--color-*-strong)`
  (shorthand de Tailwind v4 sobre la variable CSS), no un hex. Los tres hex
  nuevos (D13) viven sólo en `globals.css` como valor de la variable, como
  exige el diseño.

### Evidencia manual consolidada — 2026-08-04

Chrome DevTools contra `http://localhost:3000` y backend real. Esta evidencia
completa y reemplaza las notas anteriores de “falta [man]/[be]” para las tareas
marcadas en las secciones 4–7:

- Con `admin`, el hub mostró las tres acciones en el encabezado, card pendiente,
  filtros/contador y teaser. Se creó un pedido nuevo para J y H Distribuciones.
- La selección del proveedor precargó cinco líneas reales, mostró el banner con
  proveedor/fecha y dejó disponible la acción explícita de recarga. La tabla y
  sugerencias se verificaron con datos reales; a 320 px no hubo overflow de
  página.
- Un proveedor sin historial mostró “Es el primer pedido…”, manteniendo el
  formulario usable. Con red offline, el aviso conservó el mensaje de conexión
  y `Reintentar`; al recuperar red, la precarga funcionó. En Slow 3G se mostró
  el indicador de carga sin deshabilitar proveedor ni fecha. El foco permaneció
  en proveedor tras carga/vacío/error, y al quitar una fila pasó al siguiente
  botón `Quitar línea`.
- En el detalle se ejercitaron `Recibí menos` (bloqueado sin motivo),
  `Recibí todo`, las barras resueltas, el contador y el diálogo de confirmación.
  Tras elegir `Efectivo`, un único flujo de recepción dejó el pedido `RECEIVED`
  y la relectura mostró las cinco cantidades, total $14.510,00, `admin`, fecha
  y método de pago.
- Con `cajero1` (rol `receiving`), el hub no mostró las acciones de gestión ni
  el teaser. Network sólo registró lecturas permitidas; se abrió además un
  pedido pendiente sin `403`.
- En un pedido pendiente real, `Quitar del pedido` exigió un motivo y, tras
  confirmar “Dañado en origen”, releyó el pedido: la línea pasó a “Líneas dadas
  de baja”, con motivo y total actualizado por backend ($13.232,00).
- **Confirmación de la persona usuaria (2026-08-04):** además de la evidencia
  anterior, confirmó haber validado todos los recorridos manuales restantes de
  este change excepto 4.6: regresión de formulario, resolución y cancelación,
  errores, foco/teclado, ambos modos de alta no pedida, responsive/reduced
  motion, rol `receiving` y redirects. Esta confirmación cubre las tareas
  marcadas 2.8, 6.9, 6.11, 7.2 y 7.4–7.6, 8.4, 9.1–9.6, 10.1–10.5 y
  12.3–12.7.

## 12. Verificación contra backend real

Ninguna tarea de esta sección se ejecutó: este entorno no tiene navegador ni
acceso a una instancia de backend real con datos de prueba y sesiones por rol.

- [x] 12.1 Precarga contra un proveedor con historial: el pedido traído es el
  más reciente y las exclusiones coinciden con lo que devuelve el detalle.
  **[be]**
- [x] 12.2 Recepción completa de un pedido: stock ajustado por el backend,
  pedido `RECEIVED`, usuario, fecha y método visibles tras la relectura.
  **[be]**
- [x] 12.3 Recepción con todas las líneas en cero: el pedido cierra `CANCELLED`
  y la UI lo anticipó antes de confirmar. **[be]**
- [x] 12.4 Recepción parcial sin motivo: el frontend bloquea antes de enviar y,
  si se fuerza, el mensaje del backend se muestra tal cual. **[be]**
- [x] 12.5 Baja de ítem con motivo y alta de ítem no pedido en ambos modos,
  verificando que el total siempre viene de la relectura. **[be]**
- [x] 12.6 Recorrido completo con un usuario de rol `receiving`, comprobando que
  no cobra `403` en ninguna pantalla que la UI le ofrece. **[be]**
- [x] 12.7 Verificar que los redirects `/suppliers`, `/receiving` y
  `/receiving/[id]` siguen funcionando. **[man]** — insp: no se tocó ninguno
  de los tres archivos de redirect en esta ejecución; siguen apuntando a
  `/purchasing`, `/purchasing` y `` /purchasing/${id}`` respectivamente. Falta
  **[man]** real.

## 13. Cierre (requiere decisión de la persona usuaria)

- [x] 13.1 Revisión UX/UI previa al cierre en modo `pre-merge`. **[man]** —
  revisión realizada con el checklist de `ux-ui-supervisor`: mockups Claude
  Design contrastados con las pantallas, recorridos manuales desktop y 320 px,
  foco/estados de precarga/recepción y Lighthouse. Veredicto: **PASS WITH
  OBSERVATIONS**. La única observación es contraste 1.91:1 del badge global
  preexistente «Caja en curso», fuera del alcance de este change; no bloquea
  Compras. En 320 px no hay overflow horizontal y los importes de pedidos se
  conservan en una línea.
- [x] 13.2 Sincronizar `openspec/specs/ui-suppliers-purchasing/spec.md` y la
  remoción de `openspec/specs/ui-receiving/spec.md`. **[auto]** — OpenSpec
  aplicó 9 requirements añadidos, 3 modificados y 7 removidos; la capability
  `ui-receiving`, vaciada por D11, se eliminó luego de aplicar el delta. La
  decisión de la persona usuaria de dar de baja
  `refactor-erp-pos-visual-system` satisface la coordinación de 0.4. Validado
  con `openspec validate --specs` (16 specs válidas).
- [x] 13.3 Archivar el change. **[auto]** — archivado como
  `2026-08-04-redesign-frontend-purchasing-section` tras la decisión explícita
  de la persona usuaria de sincronizar y cerrar.
