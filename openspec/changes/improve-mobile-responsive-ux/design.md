## Context

Esta auditoría se hizo navegando la app real (Chrome DevTools MCP, credenciales `admin`/`admin`, backend local con datos de prueba) además de revisar código, con foco explícito en mobile y en notebooks 14"/15"/17" con distintos anchos CSS efectivos (1366×768 nativo, y anchos menores producidos por el escalado 125–150% que Windows aplica por defecto). Los breakpoints Tailwind del proyecto, confirmados en `src/app/globals.css` (`@theme`), son: base 0, `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536, sin overrides. El corte real del shell del proyecto (`ai/skills/ux-ui-supervisor/references/responsive-design.md`) es `md` (768px); el header actual, con labels detrás de `2xl`, es una desviación de esa convención, no una excepción documentada.

Varias de las capabilities tocadas (`ui-suppliers-purchasing`, `ui-cashier-closing-status`) tienen su spec normativa en changes abiertos todavía no archivados, pero el código correspondiente ya está desplegado (confirmado navegando `/purchasing`, `/suppliers`, `/reports/cash-closings` con datos reales). Este change trata esos deltas abiertos como la fuente de comportamiento vigente para esas pantallas, siguiendo el orden de fuentes del rol (código real por encima de specs no sincronizadas cuando divergen).

## Goals / Non-Goals

**Goals:**
- Que la app sea operable en el rango de anchos que el negocio realmente usa (mobile 360–430px, y notebooks 14"/15"/17" en sus anchos CSS efectivos, no sólo en su resolución nativa nominal).
- Resolver el bug P0 del historial de movimientos (interacción sin feedback visible) con el mismo patrón de diálogo ya usado en el resto de la app.
- Reemplazar el patrón repetido de "tabla cruda que corta columnas en mobile" por un único patrón de card ya validado en `ProductsView.tsx`, aplicado consistentemente.
- Reemplazar el patrón repetido de "filtros siempre expandidos" por un único primitive colapsable reutilizable, extraído del patrón ya usado (y ya probado en producción) en `PurchaseOrderForm.tsx`.
- Que el POS mobile permita completar una venta con un solo ítem sin scroll, y que sus controles de cantidad cumplan el piso táctil de 44px ya documentado en el proyecto.
- Que ningún listado renderice miles de filas de una sola vez cuando existe una alternativa de paginación razonable.

**Non-Goals:**
- No se cambia ningún layout ya verificado en `md:`/`lg:`/`xl:`/`2xl:`, salvo el propio breakpoint del header (el único hallazgo que vive exactamente en ese rango).
- No se toca el layout de POS en tablet/desktop (≥768px): la auditoría confirmó que el layout de 2 columnas ya resuelve el problema de scroll ahí.
- No se agrega ninguna dependencia nueva. El primitive de filtros colapsables se construye sobre los primitives existentes (`Button`, `Input`, `Select`) y sobre el patrón inline ya usado en `PurchaseOrderForm.tsx`, no sobre una librería de disclosure/accordion externa.
- No se reubica ni se preserva la funcionalidad de `CashClosingTool`; su eliminación es una decisión de producto ya tomada, no una migración a diseñar.
- No se audita ni se modifica ningún flujo exclusivo de rol cajero (`CashierShiftClosingModal`), `/login` ni `/categories`.
- No se resuelve el combobox de categorías de Inventario con más de 100 opciones: es una sugerencia a futuro fuera de este change.

## User flow

No hay un flujo nuevo de punta a punta: este change modifica el comportamiento responsive y de rendimiento de flujos ya existentes (navegación, POS, listados, reportes, compras), sin cambiar su secuencia de pasos ni sus reglas de negocio. El único flujo que cambia de forma observable en su secuencia es el historial de movimientos de Inventario, que pasa de "inyectarse en el documento sin feedback" a "abrir un diálogo modal, foco dentro, cerrar con Esc/backdrop/botón, foco vuelve al disparador" — el mismo patrón que "Ajustar" ya sigue en la misma pantalla.

## UI states

- **Diálogo de historial de movimientos**: abierto (con su propio triángulo carga → vacío → error para las filas de movimientos, como ya lo tiene `MovementHistorySection`) y cerrado. No se agregan estados nuevos; se corrige cómo se monta el existente.
- **Filtros colapsables**: colapsado (default en mobile) y expandido, con un contador de filtros activos visible en el disparador cuando el colapso oculta un filtro aplicado, para que aplicar un filtro y volver a colapsar no lo vuelva invisible.
- **Cards mobile de tablas**: mismos estados de carga/vacío/error que la tabla que reemplazan; no se duplica lógica de datos, sólo la presentación cambia por breakpoint.
- **Carrusel de `SummaryCards`**: mismos cinco valores y mismos estados (incluida la ausencia de ventas por un método) que hoy; sólo cambia el contenedor a scroll horizontal con snap en mobile.
- **Barra de acción fija del POS**: visible sólo cuando el carrito tiene al menos un ítem y el viewport está por debajo de 768px; no introduce un estado de carga o error propio, refleja el mismo total y el mismo botón "Confirmar venta" que ya existen en el flujo.

## Decisions

### 1. Diálogo del historial de movimientos reutiliza `Dialog`, no un patrón nuevo
`InventoryView.tsx` ya usa `<Dialog open={!!selectedItem} title="Gestionar stock" onClose={...}>` para "Ajustar" (líneas ~329–344), con foco gestionado por el `<dialog>` nativo que `Dialog` envuelve. `MovementHistorySection` (invocada ~346–352) hoy se renderiza como hermano directo fuera de ese `Dialog`, sin overlay, sin trampa de foco y sin scroll automático al punto donde aparece — de ahí que un click no produzca ningún cambio visible para quien lo prueba. La corrección es envolver `MovementHistorySection` en el mismo primitive `Dialog`, con su propio `open`/`title`/`onClose`, en vez de inventar un mecanismo de scroll-into-view o un overlay ad hoc. Alternativa descartada: hacer scroll automático hasta la sección inyectada sin convertirla en diálogo — se descarta porque no resuelve la falta de trampa de foco ni de retorno de foco, y porque introduce un segundo patrón de "expandir contenido" distinto del que ya usa "Ajustar" en la misma pantalla, dificultando el mantenimiento.

### 2. Fallback de cards en mobile sigue el patrón ya validado en `ProductsView.tsx`
`ProductsView.tsx` ya resuelve este problema con `<ul className="md:hidden">` (una card por fila) más `<div className="hidden md:block"><Table>...</Table></div>` para desktop, sin librería adicional. Se aplica el mismo patrón a: historial de compras (`PurchaseOrdersHistoryView.tsx`), historial de movimientos de stock (`InventoryView.tsx`), reporte de productos, reporte de compras y reporte de estado de cierres de caja. Alternativa descartada: hacer la tabla horizontalmente scrolleable en mobile (`overflow-x-auto`) — se descarta porque el hallazgo original es justamente que el scroll horizontal esconde las columnas más relevantes (ESTADO, DIFERENCIA, COSTO, PRECIO) sin indicarlo, que es el problema que se busca resolver, no reproducir con una interacción adicional.

Contenido mínimo de cada card, salvo que la capability de esa pantalla ya exija más columnas explícitamente: identificador principal de la fila, estado o badge relevante, y el valor monetario más relevante — sin exigir scroll horizontal para verlos. Para el reporte de estado de cierres de caja, dado que el hallazgo original identifica ESTADO y DIFERENCIA como las columnas más críticas para detectar un cierre con problema, esas dos son obligatorias en la card además del identificador (cajero + fecha).

### 3. Primitive de filtros/búsqueda colapsable, extraído del patrón ya usado en `PurchaseOrderForm.tsx`
`PurchaseOrderForm.tsx` (~325–372) ya implementa un buscador que colapsa a un botón ícono con `aria-expanded`, expande con una transición de ancho/opacidad sobre tokens de motion, cierra con `Escape` devolviendo el foco al botón disparador, y cierra también al perder foco si quedó vacío. Se extrae esa lógica a un primitive compartido (naming sugerido: `FilterSheet` o `CollapsibleFilters`, a definir en implementación, viviendo en `src/components/ui/` porque se reutiliza across features) que además de un input de búsqueda admite un grupo de controles secundarios (selects, rango de fechas, toggles) como children, con un botón disparador que muestra un badge con la cantidad de filtros activos cuando el grupo está colapsado y tiene algo aplicado.

Comportamiento por pantalla, siguiendo el criterio ya usado en Products/Inventory (controles de alta frecuencia visibles, resto plegable):
- **Historial de ventas (`/sales`)**: el buscador por número de venta queda siempre visible; Estado, Cajero, Desde y Hasta se pliegan.
- **Productos (`/products`)**: el buscador por nombre/SKU/código queda siempre visible; categoría y estado se pliegan.
- **Inventario (`/inventory`)**: el buscador y el toggle "Stock bajo" quedan siempre visibles; el filtro de categoría se pliega. Se corrige además, en el mismo trabajo, el bug de layout donde buscador y select de categoría quedan lado a lado en mobile cortando el placeholder — pasan a apilarse (`flex-col` en mobile, fila desde `md`) independientemente del colapso.
- **Historial de compras (`/purchasing/history`)**: Proveedor, Estado, Desde y Hasta se pliegan íntegramente (no hay un buscador de alta frecuencia distinto de esos filtros en esta pantalla).
- **Los cuatro reportes con selector de fecha** (`/reports/sales`, `/reports/products`, `/reports/purchases`, `/reports/cash-closings`): los presets de período quedan visibles (son la forma primaria de elegir rango); Desde/Hasta explícitos y los selects adicionales (proveedor, orden) se pliegan.

Este primitive es un cambio al kit de UI compartido (`ui-foundation`); su uso concreto en cada pantalla es un requirement de la capability de esa pantalla. Se documenta como decisión acá porque es la unidad de reutilización que resuelve cinco hallazgos con una sola implementación — la alternativa descartada es resolver cada pantalla con su propio `useState` de expandido/colapsado sin componente compartido, que es exactamente el patrón que ya generó la inconsistencia detectada (algunas pantallas colapsan, la mayoría no).

Por debajo de `md` el grupo secundario arranca colapsado; desde `md` hacia arriba no cambia el comportamiento actual (hay espacio suficiente y no es el problema reportado).

### 4. Breakpoint del header: medir antes de fijar, con colapso progresivo como salida
El texto de sección baja de `2xl` a un breakpoint que efectivamente entre sin overflow con el set completo (8 ítems + logo + badge de rol + logout) en los anchos de notebook reales. Por la convención ya establecida (`md` = corte real del shell) y por ser el siguiente breakpoint natural hacia arriba en la escala de la navegación de escritorio, `lg` (1024px) es el candidato preferido; si en medición manual real (no sólo cálculo de anchos) el set completo no entra sin overflow en 1024–1279px, se usa `xl` (1280px). Si ninguno de los dos entra con el set completo, la salida es un colapso progresivo — los ítems de menor prioridad quedan en ícono-only primero, en vez de forzar texto truncado o reintroducir un umbral tan alto que quede fuera del rango de notebooks reales. La medición real (no sólo el cálculo de anchos de texto) queda como tarea explícita antes de fijar el valor final, porque el requirement vigente de `ui-foundation` ("Navigation shell has no horizontal overflow…") ya prohíbe el overflow y ya permite ícono-only con nombre accesible como salida — lo que cambia acá es el piso de exigencia: se deja de aceptar `2xl` como la única salida sin overflow cuando un breakpoint menor alcanza.

Alternativa descartada: fijar `lg` sin medir. Se descarta porque el propio pedido original señala que 1366×768 con escalado no siempre entra, y fijar un valor sin medición manual repetiría el mismo error que originó el hallazgo.

### 5. Barra de acción del POS: `sticky`/fija al pie, sin duplicar el total
En mobile, cuando el carrito tiene contenido, el bloque de total + método de pago + "Confirmar venta" pasa a quedar fijo al pie del viewport (`position: fixed` o `sticky` anclado al final de la pantalla, con el padding inferior del contenido ajustado para que el carrito no quede tapado detrás de la barra). No se duplica el total en dos lugares de la pantalla: la barra fija es el único lugar donde aparece el total y el botón de confirmar en mobile, reemplazando su posición actual en flujo normal, no agregándose a ella. Sin cambios en el layout de 2 columnas usado desde 768px, donde el total y la confirmación ya son visibles sin scroll.

### 6. Stepper de cantidad del carrito recupera 44px reusando la convención ya documentada en `Button.tsx`
`Button.tsx` ya define `iconOnlySizes.md` como `"size-11 !p-0 md:size-10"` (44px mobile, 40px con mouse desde `md`), y su comentario documenta explícitamente que reemplaza los overrides ad hoc que existían "at each call site (PosView's quantity steppers)". Los botones +/- del carrito en `PosView.tsx` (~655, 666) hoy usan clases sueltas `flex size-9 ...` (36px, sin diferenciar mobile de mouse) en vez de ese primitive — es la regresión que señala el propio comentario del kit. La corrección es que esos botones vuelvan a construirse con la misma convención de tamaño que `Button` ya expone (44px en mobile, con paso a un tamaño menor sólo con mouse desde `md`), en vez de mantener un tamaño fijo por debajo del piso táctil. No se cambia el ícono, el color ni el comportamiento de incrementar/decrementar cantidad, sólo el tamaño del área táctil.

### 7. Paginación: server-side donde el backend ya la soporta, render client-side donde no
- **Historial de pedidos de compra / hub de compras**: ya usa paginación server-side (`GET /purchase-orders?page=...`, con `total` devuelto) vía el helper puro `computeTotalPages` en `lib/pagination.ts`. No cambia.
- **Reporte de ventas diario (`/reports/sales`)**: `GET /api/v1/reports/sales/daily-breakdown` no acepta parámetros de paginación — devuelve todos los días del rango en una sola respuesta (verificado contra el handler real en `../backend/internal/reporting/transport/http/handler.go`). El payload está acotado por la cantidad de días del rango (no por cantidad de ventas), así que seguir pidiéndolo completo es razonable; lo que se pagina es el **render** de las filas ya recibidas, reutilizando `computeTotalPages` y el mismo patrón visual de "Página N de M" / Anterior / Siguiente que ya existe en `PurchasingHubView.tsx`, en vez de un segundo mecanismo de paginación distinto.
- **Listado de proveedores (`/suppliers`)**: `GET /suppliers` (`ListSuppliersUseCase.Execute(ctx)`) tampoco acepta parámetros de paginación — devuelve todos los proveedores en una sola respuesta (verificado en `../backend/internal/purchasing/application/list_suppliers.go`). Mismo criterio: se pagina el render del array ya obtenido, con el mismo patrón visual, reemplazando el contenedor `max-h-[calc(100vh-18rem)] overflow-y-auto` (que hoy genera un scroll anidado confuso) por páginas discretas sin scroll interno.
- **Datos de planificación incompletos en `PurchaseOrderForm.tsx`**: la lista de hasta 2447 filas interactivas ya se recibe completa desde el backend (es planificación, no un listado paginable por diseño del dominio); se pagina o se limita su render de la misma forma, para no montar miles de filas interactivas (`checkbox` + botón) simultáneamente en el DOM.

Ninguno de estos tres casos requiere un cambio de contrato ni un `backend-request.md`: no se le pide nada nuevo al backend, se ajusta cuánto de la respuesta ya recibida se monta en el DOM a la vez.

### 8. `SummaryCards` en carrusel mobile; `SummaryTiles` se elimina, no se reimplementa
`SummaryCards.tsx` ya es el componente correcto (cinco cards: Ventas hoy, Total facturado, Efectivo, Tarjeta, Transferencia) usado en `/sales`. En mobile pasa a un contenedor de scroll horizontal con `scroll-snap`, sin cambiar sus datos, colores ni el requirement ya vigente en `ui-sales` sobre los acentos de color de cada card. `SalesReportView.tsx` tiene hoy una segunda implementación (`SummaryTiles`, ~167–204) de las mismas cinco métricas con un grid en 3 filas en mobile — peor que las 2 filas de `SummaryCards`. Se elimina `SummaryTiles` y `/reports/sales` pasa a usar `<SummaryCards>` directamente, adaptando el shape de datos (`summarizeDays()` de las filas del reporte diario) a `SalesSummaryByPaymentMethod`, el shape que `SummaryCards` ya consume. Esto hace que el fix del carrusel (#15 del pedido original) se aplique gratis también en `/reports/sales`, sin mantener dos implementaciones del mismo resumen.

### 9. `CashClosingTool` se elimina sin reemplazo
Decisión de producto ya tomada por quien solicitó el change, no una decisión de diseño abierta: el botón "Cierre de caja" y el panel que abre en `/sales` (`CashClosingTool`, resumen de pagos por rango de fechas, sólo lectura) se eliminan directamente. No se reubica en otra pantalla, no se convierte en un reporte, no se preserva su cálculo en ningún otro lugar de la app. El cierre de turno real del cajero (`CashierShiftClosingModal.tsx`, disparado desde `CashierReconciliationIndicator` en `Nav.tsx`, capability `ui-cashier-shift-closing`) es un feature completamente distinto, restringido a rol `cashier`, y no se toca ni se menciona como alternativa.

### 10. Reordenamiento del hub de compras en mobile
`PurchasingHubView.tsx` (~242–257) tiene la acción primaria "Crear pedido" dentro de un `<aside aria-label="Acciones de compras">` que hoy se apila debajo de filtros + hasta 25 cards de pedidos pendientes + paginación en mobile. Con datos reales (509 pedidos en las pruebas) la acción de crear pedido queda casi indescubrible sin scroll masivo. La corrección es de orden de aparición en mobile: el panel de acciones (incluyendo "Crear pedido") pasa a aparecer antes que la lista de pedidos pendientes por debajo de `md`, sin cambiar el layout de cuatro quintos/un quinto ya vigente desde el breakpoint de escritorio (governed por el requirement "Purchasing hub prioritizes pending orders", que no cambia arriba de ese breakpoint).

## Accessibility

- El diálogo de historial de movimientos hereda la trampa de foco, cierre por `Esc` y cierre por click en backdrop que `Dialog` ya provee; el foco vuelve al control que lo abrió al cerrarse, igual que "Ajustar".
- El primitive de filtros colapsable expone `aria-expanded` en su disparador (mismo patrón que `PurchaseOrderForm.tsx` ya usa), es operable por teclado (`Enter`/`Space` para expandir, `Escape` para colapsar devolviendo el foco al disparador), y el badge de filtros activos no depende sólo de color: incluye el número como texto.
- Las cards mobile de las tablas migradas mantienen accesibilidad equivalente a la fila de tabla que reemplazan: activables por teclado si la fila original lo era, con el mismo destino de navegación.
- El carrusel de `SummaryCards` en mobile sigue siendo alcanzable por teclado (scroll horizontal por foco secuencial en cada card, sin necesidad de un control de paginación adicional) y no introduce ningún elemento nuevo dependiente sólo de color.
- La barra de acción fija del POS no oculta ningún control accesible detrás de ella: el padding inferior del carrito se ajusta para que la última línea no quede tapada, y el orden de tabulación no cambia respecto del flujo actual.
- Los botones +/- de cantidad del carrito mantienen su `aria-label` existente; sólo cambia su tamaño de área táctil.

## Keyboard and focus behavior

Cubierto punto por punto en la sección anterior. No se introduce ningún flujo nuevo de foco fuera de: (a) el diálogo de historial de movimientos, que pasa a comportarse como cualquier otro `Dialog` de la app, y (b) el primitive de filtros colapsable, que replica el comportamiento de foco que `PurchaseOrderForm.tsx` ya tiene en producción.

## Responsive behavior

Resumen cruzado de los cambios de breakpoint de este change (todos por debajo de `md` salvo el header):

| Pantalla | Qué cambia | Rango afectado |
|---|---|---|
| Header (`Nav.tsx`) | Label de texto visible desde `lg` o `xl` (medir), en vez de `2xl` | `lg`/`xl` hacia abajo hasta el breakpoint elegido |
| Historial de movimientos (Inventario) | Se abre en `Dialog` | Todos los anchos |
| Tablas → cards (5 pantallas) | Fallback de card por fila | `< md` |
| POS carrito | Barra de acción fija al pie | `< md` (sin cambios ≥768px) |
| POS stepper de cantidad | 44px de alto táctil | `< md` (paso a un tamaño menor sólo con mouse desde `md`, igual que el resto del kit) |
| Filtros colapsables (6 pantallas) | Colapsados por defecto, controles de alta frecuencia visibles | `< md` (sin cambios desde `md`) |
| Bug de layout de Inventario | Buscador y select de categoría se apilan | `< md` |
| `SummaryCards` | Carrusel horizontal con scroll-snap | `< md` (sin cambios desde `md`) |
| Reporte de ventas diario / proveedores / planificación incompleta | Paginación de render | Todos los anchos (el problema es de volumen de DOM, no de breakpoint) |
| Hub de compras | "Crear pedido" antes que la lista | `< md` |

Ningún cambio de este change altera el layout ya verificado en `md:`/`lg:`/`xl:`/`2xl:` salvo el propio ajuste del breakpoint del header.

## API contract

Ninguno de los cambios de este change modifica un endpoint, un shape de request/response, un status code ni una regla de autorización. Los tres casos de paginación de render (#7 en Decisions) consumen exactamente la misma respuesta que hoy; sólo cambia cuánto de esa respuesta se monta en el DOM a la vez. No hay `backend-request.md`.

## Error handling

Ningún estado de error nuevo. Las pantallas migradas a card mobile conservan el mismo triángulo carga → vacío → error que su tabla de origen; el diálogo de historial de movimientos conserva los mismos estados que `MovementHistorySection` ya maneja, sólo cambia cómo se monta.

## Backend coordination

No aplica. Ver "API contract" arriba y el punto correspondiente en `proposal.md` → `Impact`.

## Risks / Trade-offs

- **Extraer el primitive de filtros colapsable toca seis pantallas distintas.** El riesgo es introducir una regresión de foco o de filtro-perdido-al-colapsar en alguna de ellas. Mitigación: el primitive centraliza el comportamiento en un solo lugar (en vez de seis implementaciones separadas), y las tasks incluyen prueba manual explícita de teclado y de "aplicar filtro → colapsar → el filtro sigue activo" por pantalla.
- **El breakpoint final del header (`lg` vs `xl`) no se fija en este documento.** Es una decisión que depende de medición manual real con el set completo de accesos por rol, no de un cálculo teórico de anchos de texto. Se documenta como tarea explícita antes de considerar el trabajo de esa capability terminado.
- **Eliminar `SummaryTiles` sin reemplazo propio (usa `SummaryCards` en su lugar) cambia el shape de datos que consume ese bloque del reporte de ventas diario** (de `summarizeDays()` a `SalesSummaryByPaymentMethod`). El riesgo es una regresión de valores si la adaptación del shape no es exacta; mitigación: prueba manual comparando ambos totales antes/después con el mismo rango de datos.
- **La paginación de render sobre una respuesta ya completa (reporte de ventas diario, proveedores) no reduce el tamaño de la respuesta de red**, sólo el costo de DOM. Si el volumen de datos sigue creciendo, en algún punto el problema volverá a manifestarse como tiempo de red/parsing en vez de costo de render — eso está fuera de alcance de este change (requeriría paginación real del backend) y no se promete acá.

## Migration Plan

No aplica migración de datos ni de contrato. La única migración de comportamiento observable es la eliminación de `CashClosingTool`: quien use hoy ese botón deja de encontrarlo en `/sales`, sin redirección ni aviso — es una decisión de producto ya tomada, no una migración a diseñar ni un dato a preservar.

## Rollback

Cada uno de estos cambios es reversible de forma independiente revirtiendo el commit correspondiente, porque ninguno depende de una migración de datos, de un endpoint nuevo ni de un cambio de contrato. La eliminación de `CashClosingTool` es la única decisión que, si se revierte, requeriría restaurar el componente completo (no queda ningún resto parcial de su funcionalidad en otro lugar).

## Open Questions

- ¿`lg` (1024px) alcanza sin overflow con el set completo de 8 ítems + logo + badge de rol + logout, o hace falta `xl` (1280px)? Se resuelve con medición manual antes de cerrar la implementación de esa tarea (no bloqueante para escribir este change).
- Nombre final del primitive de filtros colapsable (`FilterSheet`, `CollapsibleFilters`, u otro) — no bloqueante, se decide en implementación siguiendo la convención de nombres ya usada en `src/components/ui/`.
