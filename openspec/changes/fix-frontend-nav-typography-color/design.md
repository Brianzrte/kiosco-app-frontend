## Context

Tres hallazgos de una auditoría UX/UI ya hecha (mediciones en vivo + barrido estático de código), agrupados en un solo change porque comparten superficie de auditoría, no tienen dependencias entre sí y ninguno depende de backend.

- **Nav**: `src/components/shell/Nav.tsx:80-139` renderiza logo, hasta 8 ítems (`items.map`, 93-111), chip de rol (113-115) y — para roles sin `admin` — un botón "Cerrar sesión" con texto (129-137) en una única fila `md:flex` (desde 768px). Para `admin` (8 ítems completos), ese botón se reemplaza por el trigger del menú móvil sólo bajo `md:hidden` (116-128), así que en `md:` sigue siendo el logout de texto el que compite por espacio. Medido en vivo (`scrollWidth` vs. `clientWidth`): overflow de 513px (768×1024), 257px (1024×768), 65px (1280×800), 22px (1366×768), 0 (1440×900). `MobileNavDrawer.tsx` sólo se renderiza bajo `md:hidden` y no participa del problema.
- **Tipografía/densidad**: `StatCard.tsx` `size="compact"` resuelve a `text-lg sm:text-2xl` (24px/600 en desktop), igual peso que el `<h1>` de `PageHeader.tsx:35`. El mismo patrón "tile KPI" está implementado 4 veces con markup distinto (`StatCard size="compact"` en `ReportsView.tsx`/`SalesView.tsx` vs. markup ad hoc en `SalesReportView.SummaryTiles` e `InventoryValuationView`). El "total destacado" es `text-lg font-semibold` en 5 lugares y `text-sm font-semibold` sólo en `ReturnHistory.tsx:76`. El `<h2>` de sección tiene 3 estilos sin criterio documentado. `LineChart.tsx:209` usa `text-[15px]` mientras su tooltip (~257) usa `text-xs`. `InventoryView.tsx:211` y `CategoriesView.tsx:189` no fijan tamaño de texto explícito en el nombre/label principal de fila (heredan el tamaño base del navegador, ≈16px), mientras `ProductsView.tsx`/`SalesView.tsx` lo heredan de `text-sm` en `<table>` (`Table.tsx:11`).
- **Color**: `SalesView.tsx` función `SummaryCards` (467-509) renderiza 5 `StatCard` sin prop `tone`, cayendo todas en el default `neutral` (`bg-primary-light text-primary`). `StatCard` ya tiene un sistema de 5 tonos (`neutral | success | warning | error | info`), ninguno usado hoy con `tone=` explícito por ningún consumidor. Existe además un mapeo de color por método de pago ya validado y en uso, pero deliberadamente acotado al selector de pago de POS (`PosView.tsx:34-61`, tokens `--color-payment-cash/card/transfer`, `globals.css`) y fijado como tal por el requirement normativo vigente `ui-sales/spec.md` "Payment breakdown display", que hoy prohíbe cualquier color en la visualización de pago sin distinguir "por venta" de "resumen agregado".

## Goals / Non-Goals

**Goals:**
- Cero overflow horizontal del header para `admin` en los 5 anchos medidos, sin ocultar ninguno de los 8 ítems de navegación.
- Un único criterio documentado y aplicado para cada rol tipográfico repetido (tile KPI, total destacado, `<h2>` de sección, label de dato en gráfico, densidad de fila lista vs. tabla).
- Que las cinco cards del resumen diario de Historial de ventas comuniquen sus métricas mediante ícono, texto y un acento de color coherente con el resto del sistema, sin inventar tokens ni reinterpretar los existentes.
- Que el selector de medio de pago del POS use las mismas familias de color que Historial como feedback visual, preservando la velocidad de la caja.

**Non-Goals:**
- Rediseñar la escala tipográfica completa o el design system más allá de los puntos concretos auditados.
- Tocar `ui/Table.tsx` o `ui/Badge.tsx` (ya confirmados consistentes).
- Extender el tratamiento de color a `ReportsView.tsx` (dashboard admin) — señalado como extensión opcional, no incluida salvo pedido explícito.
- Normalizar `LineChart.tsx:159,173` (`text-[14px]` → `text-sm`, mismo valor visual) — higiene de código sin impacto visual, fuera de alcance obligatorio.
- Rediseñar `MobileNavDrawer.tsx` o el bottom tab bar mobile.
- Cualquier cambio de permisos, roles, endpoints o tipos de dominio.
- Sincronizar `ui-pos/spec.md` con el estado real de pago dividido (desincronización preexistente, señalada pero no resuelta acá).

## Decisions

### 1. Nav: ítems en modo ícono-solo en el rango 768–1536px, ícono+etiqueta sólo desde `2xl` (1536px)

El overflow medido (hasta 513px en 768×1024) es demasiado grande para cerrarse con ajustes de padding/gap/tamaño de fuente — esos ajustes recuperan como mucho un centenar de píxeles, no varios cientos. La causa estructural es que los 8 ítems muestran ícono **y** etiqueta de texto siempre desde `md:flex` (768px), sin ningún paso intermedio.

Se decide: entre 768px (`md`) y 1536px (`2xl`, exclusive), los 8 ítems de nav y el control "Cerrar sesión" se renderizan en modo compacto — sólo el ícono ya existente por ítem (`NAV_ICONS`), sin la etiqueta de texto visible. Desde `2xl` (1536px) hacia arriba, se restaura el ícono + etiqueta de texto, igual que hoy. El chip de rol no cambia — su ancho ya es acotado y no es el principal responsable del overflow medido.

- **Por qué `2xl` (1536px) y no un valor más ajustado como 1440px**: 1440×900 es el único ancho medido que hoy pasa con etiquetas completas, así que 1536px es un superconjunto seguro que no reintroduce overflow en ningún ancho medido. Es además un breakpoint estándar de Tailwind (no una magic number nueva), evitando declarar un breakpoint arbitrario adicional al sistema de tokens. La verificación final (`Tasks`, sección Nav) exige volver a medir los 5 anchos con la implementación real; si al hacerlo el layout compacto deja margen de sobra, un umbral más bajo (p. ej. `xl`, 1280px) es una optimización aceptable siempre que seguir cumpliendo cero overflow en los 5 anchos medidos.
- **Alternativa descartada — nav horizontal scrolleable**: el propio Requirement Context exige que los 8 ítems, el chip y el logout sean "alcanzables sin scroll horizontal", no sólo que no rompan el layout de la página. Un `overflow-x-auto` interno cumpliría el primer criterio (`scrollWidth === clientWidth` del documento) pero no el segundo.
- **Alternativa descartada — menú "más" que agrupe ítems sobrantes**: reintroduce el mismo patrón que el drawer mobile (contenido detrás de un paso extra), algo que el Requirement Context pide evitar explícitamente para el rango desktop/tablet ("la solución vive en layout/espaciado/disposición... no en quitar ítems"); un ítem detrás de un menú desplegable dejaría de estar directamente alcanzable en la fila.
- **Accesibilidad del modo ícono-solo**: cada ítem y el control de logout conservan su etiqueta como nombre accesible (`aria-label`) para lectores de pantalla, y además exponen la etiqueta vía el atributo nativo `title` (tooltip del navegador en hover/foco) — sin agregar ningún primitive ni dependencia nueva, ya que no existe un componente `Tooltip` en el UI kit y no corresponde crearlo sólo para esto. El foco visible existente (`:focus-visible` global) no cambia.
- **`MobileNavDrawer.tsx` no se toca**: sigue siendo icon+label siempre, sin relación con este rango de anchos (sólo se renderiza `md:hidden`, <768px).

### 2. `StatCard` compact deja de competir con el `<h1>`

`valueSizes.compact` baja de `text-lg sm:text-2xl` (24px en desktop) a un paso menor que el `text-2xl font-semibold` (24px/600) del `<h1>` de `PageHeader`. Se decide bajar el paso de desktop de `compact` un nivel en la escala (de `text-2xl` a `text-xl`), conservando el step-down existente en mobile (`text-lg`) sin cambios, porque el problema auditado es específicamente que el valor iguala al `<h1>` a partir de `sm:` (640px) — la escala completa (`default` en `text-3xl` para dashboard, `compact` un paso menor que el `<h1>`) queda: `<h1>` (24px) > `StatCard default` (30px, sin cambios — es mayor a propósito, es el número más grande del dashboard) — nota: `default` ya es mayor que el `<h1>` hoy y eso no es lo auditado como problema (el hallazgo es específicamente sobre `compact`); se conserva `default` sin cambios. `compact` pasa a ser estrictamente menor que el `<h1>` en todos los breakpoints.

### 3. Migración de `SummaryTiles` e `InventoryValuationView` a `StatCard size="compact"`

- `SalesReportView.SummaryTiles` (markup `Card` + `text-sm` + `text-2xl font-semibold`, sin ícono) se reemplaza por 5 instancias de `StatCard size="compact"` con el mismo dato (`Ventas`, `Total facturado`, `Efectivo`, `Tarjeta`, `Transferencia`) y un ícono por tile, consistente con `SalesView.SummaryCards`. No se le asigna color de método de pago — el Requirement Context deja la extensión de color a `ReportsView`/reportes fuera de alcance obligatorio, y `SalesReportView` es parte de esa misma familia de pantallas de reporte, no del Historial de ventas.
- `InventoryValuationView` (3 `Card` con 3 valores apilados cada uno: costo, valor de venta, cantidad de productos) migra cada valor mostrado a un `StatCard size="compact"` propio con su ícono, conservando los 3 grupos (Activos / Inactivos / Total) y sus 3 métricas cada uno — la agrupación visual por grupo se resuelve en la disposición del grid, no en volver a un markup ad hoc por grupo.

### 4. `ReturnHistory.tsx` total a `text-lg`

Sube de `text-sm font-semibold` a `text-lg font-semibold`, alineando con `ProductsView`, `ReceivingListView`, `ReceivingDetailView`, `InventoryView` y `PosView`, que ya usan ese tamaño para el mismo rol ("total destacado" de una fila/card). El contenedor (`flex flex-wrap items-baseline justify-between`, `ReturnHistory.tsx:64`) ya usa `flex-wrap`, así que un monto largo en `text-lg` no debería romper el layout del header de cada devolución — se verifica manualmente con un monto de varios dígitos.

### 5. Jerarquía de 3 niveles para `<h2>` de sección

Se documenta y aplica el criterio según el rol real de cada instancia:

| Nivel | Clase | Uso |
|---|---|---|
| Eyebrow — sección de un dashboard denso en datos | `text-xs font-semibold uppercase tracking-wide text-text-muted` | `PageHeader` (eyebrow), `ReportsView.tsx` (100, 222, 279, 319) — sin cambios |
| Subsección de una pantalla de detalle | `text-sm font-medium text-text-secondary` | `ReturnHistory.tsx:46`, `SaleDetail.tsx:138,203` — sin cambios; `UserDetailView.tsx:142,269` ("Credenciales", "Datos de perfil") baja de `text-lg font-semibold` a este nivel |
| Título de diálogo modal | `text-lg font-semibold` | `Dialog.tsx:50` — sin cambios, es el `<h1>` de su propio contexto modal |

No se introduce un primitive `SectionHeader` nuevo: la convención queda documentada (en un comentario junto a cada uso relevante, o en `ai/context/ui-system.md` al implementar) y aplicada ad hoc, siguiendo el mismo patrón que ya usa el resto del código para variantes sin primitive dedicado. Introducir un primitive es una opción igualmente válida que no cambia el resultado visual; se deja a criterio de implementación.

### 6. `LineChart.tsx:209` a `text-xs`

El label del punto marcado pasa de `text-[15px]` a `text-xs` (12px), igualando al tooltip del mismo componente (~línea 257). Se elige bajar el label en vez de subir el tooltip a 15px porque 15px no es un paso de la escala Tailwind — usar `text-xs` establece el mismo tamaño con una clase de la escala en ambos lugares del mismo componente, para el mismo tipo de dato.

### 7. Densidad de lista unificada a `text-sm`

`InventoryView.tsx:211` (`<p className="truncate font-medium">{item.name}</p>`) y `CategoriesView.tsx` (`<span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>`, ~línea 189) no fijan tamaño de texto explícito en el nombre/label principal de fila, heredando el tamaño base del navegador (≈16px, equivalente visual a `text-base`). Se agrega la clase explícita `text-sm` en ambos, igualando el tamaño ya usado (heredado de `<table className="text-left text-sm">`, `Table.tsx:11`) por `ProductsView.tsx` y `SalesView.tsx` para el mismo rol de dato. No hay ningún requirement ni nota en `ui-system.md` que documente "vista lista" como densidad intencional distinta de una tabla — es el único caso divergente del grupo, y el resto del hallazgo empuja el sistema hacia más densidad, no menos.

### 8. Cards de resumen mobile de Historial de ventas: grid de 3 columnas en vez de 2 en el ancho base

De las tres opciones planteadas (fila horizontal scrolleable, 3 columnas en vez de 2, padding/alto reducido), se elige pasar el grid base (< `md`, hoy `grid-cols-2`) a 3 columnas. Con 5 tiles, un grid de 3 columnas resuelve naturalmente en 2 filas (3 + 2) en vez de las 3 actuales (2 + 2 + 1 con el 5º ocupando fila propia), cumpliendo el criterio cuantitativo sin ocultar ninguna de las 5 métricas ni requerir scroll.

- **Por qué no la fila horizontal scrolleable**: oculta contenido detrás de un swipe, lo que va contra el mismo criterio de "todo alcanzable sin gesto adicional" que ya aplica al hallazgo del nav (Decisión 1) — 5 cards son pocas como para justificar ese costo cuando una reflow de columnas alcanza el criterio sin ocultar nada.
- **Por qué no sólo padding/alto reducido**: el criterio de éxito es la cantidad de filas, no la altura total; reducir padding no cambia cuántas filas ocupa una disposición 2+2+1 a menos que se combine con un cambio de columnas — en cuyo caso la variable relevante vuelve a ser el número de columnas, no el padding.
- El 5º tile sigue ocupando el ancho sobrante de su fila (hoy resuelto con `col-span`) para que la segunda fila quede completa en vez de dejar una celda vacía, igual que el mecanismo ya usado hoy para el caso de 2 columnas.
- Se verifica manualmente en 390px que ningún valor de moneda (hasta 6-7 dígitos) se corte o desborde su tile a 3 columnas — si el ancho resultante es insuficiente para algún valor, la opción de respaldo es mantener 3 columnas para las primeras 4 cards y dejar la 5ª en su propia fila completa (3+1+1 lógico, siempre ≤ 2 filas), documentado como ajuste de implementación sin volver a 2 columnas.

### 9. Cinco acentos de `SummaryCards`: color sólo en ícono y borde

Las cinco cards de `SalesView.SummaryCards` (usada tanto por `DailySummaryCards` admin como por `CashierTodaySummaryCards`, mismo componente) reciben un acento propio limitado al tile del ícono y al borde de la card. "Efectivo", "Tarjeta" y "Transferencia" reutilizan los tokens de POS (`--color-payment-cash/card/transfer`); "Ventas hoy" usa `pastel-pink` y "Total facturado" usa `pastel-yellow`. No se usan `chart-1..4` (reservada a series de gráfico) ni `success/warning/error/info` (reservados a estado/evento). Esto requiere resolver el choque con el requirement vigente `ui-sales` "Payment breakdown display" — ver `specs/ui-sales/spec.md` de este change: el "sin color" se acota a la visualización *por venta individual*, y se agrega una excepción nombrada para el resumen agregado del día.

- **Mecanismo**: el `type Tone` local de `StatCard.tsx` (no un tipo de dominio) representa los cinco acentos y aplica el mismo token al fondo del tile de ícono, con `text-text-primary`, y al borde exterior de la card. El fondo de la card se conserva en `bg-surface`; labels y valores conservan sus tokens de texto actuales. Los cinco tonos son: `payment-cash`, `payment-card`, `payment-transfer`, `summary-sales` (`pastel-pink`) y `summary-total` (`pastel-yellow`).
  - **Por qué se aparta del patrón existente**: los tokens de pago y los pasteles son tonos claros para fondos con texto oscuro. Aplicarlos como color de ícono sobre blanco produciría contraste insuficiente. El uso opaco como fondo del tile, junto a `text-text-primary`, mantiene el contraste; el borde es un refuerzo visual, no el único indicador.
  - **Por qué `pastel-pink` y `pastel-yellow`**: ambos son tokens existentes permitidos para cards y categorías, quedan visualmente separados de los tonos verde, arena y azul de los métodos de pago, y no sobrecargan los colores semánticos ni la paleta de gráficos. No se agrega ningún token ni dependencia.
  - Se verifica manualmente el contraste ícono-vs-tile de los cinco tonos contra el piso de 3:1 antes de dar por cerrado el hallazgo — ver `Accessibility`.
- El color sigue siendo siempre un refuerzo: cada card conserva su ícono y su texto de label ("Ventas hoy", "Total facturado", "Efectivo", "Tarjeta", "Transferencia") sin cambios de copy.

### 10. Selector de medios de pago POS: reposo suave, formato de Historial al hover e inversión al seleccionar

Efectivo, Tarjeta y Transferencia conservan sus botones de radio nativos y su comportamiento de selección. En reposo, cada opción recupera el borde y texto secundarios del selector original. Al hover de una opción no seleccionada, toda su superficie toma una versión translúcida del tono de la card homónima de Historial y su borde toma el tono pleno; ícono y texto conservan el tono secundario. Al seleccionar, el fondo y borde de la opción usan su tono pastel pleno y el ícono y texto permanecen negros. La selección queda visualmente distinta de hover y foco.

- **Por qué el reposo recupera el tono secundario**: el negro pleno compite visualmente con el total y la acción de confirmar venta. El tono original reduce ese peso, mientras el pastel se reserva para el borde/tile de hover y para el fondo/borde de la selección.
- **Alternativa descartada — colorear toda la opción en hover**: diluye la distinción entre hover y selección. El tile + borde reutiliza el lenguaje de Historial y deja la selección existente inequívoca.

## Accessibility

- Cada ítem de nav en modo ícono-solo (Decisión 1) conserva su etiqueta como `aria-label` y como `title` nativo — nunca queda sin nombre accesible ni sin forma de descubrir su significado en hover/foco.
- El foco visible existente (`:focus-visible` global, `ui-system.md`) no se degrada en ningún ítem, el chip ni el logout.
- Los cinco acentos de las cards (Decisión 9) son siempre un refuerzo junto a ícono y texto — nunca el único canal, consistente con "no usar el color como único indicador". Sólo el tile y borde reciben color; el fondo y texto de la card no cambian.
- Contraste ícono-vs-tile de los cinco tonos ≥3:1 (WCAG 1.4.11, tratado como información) — se verifica manualmente contra los fondos `payment-*` y `pastel-pink/yellow` con `text-text-primary` antes de cerrar el hallazgo; si algún par no alcanza el piso, la alternativa de respaldo es oscurecer sólo el ícono, no el fondo ni los tokens existentes.
- `ReturnHistory.tsx` a `text-lg` (Decisión 4) no cambia el color de texto, sólo el tamaño — se verifica que el contraste de texto siga ≥4.5:1 (o ≥3:1 al ser texto grande, lo cual además mejora el piso aplicable).
- El selector POS mantiene texto negro y su método se identifica además por etiqueta e ícono; el tile de hover usa `text-text-primary` para el ícono. No depende sólo del color.
- Ningún cambio de este change agrega o quita un elemento interactivo tabulable, salvo el modo ícono-solo del nav (Decisión 1), que preserva exactamente los mismos 8 `Link` + control de logout, sólo cambia su presentación visual.

## Keyboard and focus behavior

Sin cambios de foco ni de orden de tabulación en ninguno de los hallazgos. El nav conserva el mismo orden de `Link` en el DOM (Decisión 1 sólo cambia presentación, no estructura ni orden). El selector POS conserva sus mismos radio buttons; hover no captura foco y `:focus-visible` sigue siendo distinguible tanto de hover como de selección.

## Responsive behavior

- Nav: el fix (Decisión 1) se sostiene en los 5 anchos medidos por la auditoría; el comportamiento por debajo de 768px (`MobileNavDrawer`) no cambia.
- `SalesView` mobile (Decisión 8): 390px pasa de 3 a 2 filas de cards de resumen sin perder ninguna de las 5 métricas.
- El resto de los ajustes (Decisiones 2, 4, 5, 6, 7, 9, 10) no cambian el comportamiento responsive existente de cada pantalla — mismos breakpoints `sm`/`md`/`xl` que ya usa cada componente.

## API contract

Ninguno nuevo ni modificado. Todos los datos ya llegan por props/fetch existentes:
- `SummaryCards` recibe `SalesSummaryByPaymentMethod`, con `by_payment_method.{CASH,CARD,TRANSFER}` ya consumido (`lib/salesSummary.ts`).
- `Nav` recibe `roles: Role[]` por prop, sin fetch propio.
- El selector POS ya recibe sus opciones y estado local; no requiere datos nuevos.
- El resto de las pantallas tocadas usan exactamente los mismos endpoints y shapes que hoy.

## Error handling

Sin cambios. `ErrorState`/`onRetry` de todas las pantallas tocadas (`SummaryCards`, `SalesReportView`, `InventoryValuationView`, etc.) permanece igual — este change es puramente de presentación sobre datos que ya se cargan. El selector POS no crea un estado de error nuevo.

## Backend coordination

Ninguna. Sin endpoints nuevos, sin cambio de contrato, sin dependencia de despliegue backend. Confirmado contra `lib/salesSummary.ts` y los fetchers existentes de cada pantalla tocada: ningún dato nuevo requerido.

## Risks / Trade-offs

- **El modo ícono-solo del nav (Decisión 1) reduce la legibilidad inmediata de las secciones en el rango 768–1536px** → Mitigado por el `aria-label` + `title` nativo en cada ítem, y porque los íconos ya existen y son razonablemente distinguibles entre sí (carrito, historial, caja, capas, camión, etiqueta, usuarios, gráfico); es el mismo trade-off que ya acepta `MobileNavDrawer` con ícono+label en una superficie más angosta, sólo que acá se prioriza que quepan los 8 sin ocultar ninguno.
- **El breakpoint `2xl` (1536px) puede ser más conservador de lo necesario** → Aceptado a propósito: es un superconjunto seguro del único ancho medido que hoy pasa (1440×900). Bajarlo es una optimización de implementación sujeta a re-medir los 5 anchos, no un requisito de este change.
- **Los tonos de pago y los dos pasteles usados en un tile pequeño (32px) pueden no alcanzar el mismo contraste que en sus usos previos** → Mitigado por la verificación manual explícita de contraste ≥3:1 antes de cerrar el hallazgo (ver `Accessibility`), con una alternativa de respaldo acotada si no alcanza.
- **Migrar `InventoryValuationView` de 3 `Card` con 3 valores apilados a `StatCard`s individuales cambia la agrupación visual** → Mitigado dejando la agrupación por grupo (Activos/Inactivos/Total) resuelta en el grid, no en el markup del tile; se verifica manualmente que los 3 grupos sigan siendo distinguibles.
- **Extender `type Tone` de `StatCard.tsx` con 5 acentos es una extensión sólo consumida por `SalesView`** → Aceptado: es la misma extensibilidad que ya documenta el comentario de `StatCard.tsx` sobre agregar tonos sin romper consumidores existentes; no se agrega complejidad a los otros consumidores (`ReportsView`), que no pasan `tone`.
- **El borde claro de reposo puede ser sutil sobre `surface`** → Aceptado: es un refuerzo visual junto al ícono y label; el hover hace visible el mismo tile + borde de Historial y se verifica manualmente.

## Migration Plan

Ninguno. Cambio puramente de presentación (clases, props de componentes existentes, un delta de spec que acota un requirement vigente sin cambiar contrato ni datos persistidos). Se despliega solo, sin coordinación con otro change de frontend en curso (`add-frontend-cashier-shift-closing`, `add-frontend-suppliers-purchasing`, `add-frontend-user-roles-and-receiving` no tocan estas superficies) ni con el backend.

## Rollback

Revertir el commit/deploy del frontend. No hay estado persistido ni migración de datos que revertir.

## Open Questions

- ¿Conviene crear un primitive `SectionHeader` compartido para los `<h2>` de sección (Decisión 5), o alcanza con documentar la convención y aplicarla ad hoc? No bloquea: ambas opciones producen el mismo resultado visual observable.
- ¿Se limpia también `LineChart.tsx:159,173` (`text-[14px]` → `text-sm`, mismo valor visual) en la misma pasada, ya que se toca el mismo archivo por la Decisión 6? No bloquea: es opcional, cero impacto visual, y queda fuera del alcance obligatorio salvo pedido explícito al implementar.
- Si al re-medir los 5 anchos con el modo ícono-solo implementado sobra margen considerable, ¿vale la pena bajar el umbral de `2xl` a `xl` (1280px) para restaurar etiquetas de texto antes? No bloquea: es una optimización de implementación, no un requisito — cualquier umbral que siga cumpliendo cero overflow en los 5 anchos medidos es válido.
