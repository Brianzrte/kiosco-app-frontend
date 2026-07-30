## 1. Tokens y extensión de `StatCard` (base para los acentos del resumen)

- [x] 1.1 Extender el `type Tone` local de `src/components/ui/StatCard.tsx` con tres valores nuevos, uno por método de pago (p. ej. `payment-cash | payment-card | payment-transfer`), y agregar su entrada al mapa `tileTones` como `bg-payment-<method> text-text-primary` — **no** el patrón `bg-<token>/15 text-<token>` de los tonos existentes (ver `design.md`, Decisión 9). Inspección de código: el mapa cubre los 3 métodos, sin tocar las entradas `neutral/success/warning/error/info` existentes.
- [x] 1.2 Verificar por inspección que ningún consumidor existente de `StatCard` (`ReportsView.tsx`, y las instancias de `SalesView.tsx` que no pasan `tone`) cambia de aspecto: siguen resolviendo a `neutral` por default.
- [x] 1.3 Prueba manual: medir el contraste ícono-vs-fondo de cada uno de los 3 tonos nuevos (`bg-payment-cash/card/transfer` + `text-text-primary`) en el tamaño de ícono real (`size-4.5`, 18px) contra el piso de 3:1 (WCAG 1.4.11). Si algún par no alcanza, aplicar el respaldo descrito en `design.md` (`Accessibility`) antes de continuar a la sección 4.

  Evidencia: MCP Chrome, ícono SVG de 18px con las clases reales. Contraste contra `text-text-primary`: efectivo 10.10:1, tarjeta 9.91:1, transferencia 10.02:1 (mínimo requerido 3:1).

- [x] 1.4 Extender el `type Tone` local de `src/components/ui/StatCard.tsx` con `summary-sales` y `summary-total`, mapeando sus tiles a `bg-pastel-pink text-text-primary` y `bg-pastel-yellow text-text-primary`, respectivamente; extender el primitive para aplicar el token correspondiente al borde exterior de los cinco tonos de resumen, sin cambiar el fondo, labels o valores de la card.
- [x] 1.5 Prueba manual: medir el contraste ícono-vs-fondo de `summary-sales` y `summary-total` en el ícono real de 18px contra el piso de 3:1; confirmar además que los bordes de los cinco tonos no son el único indicador de cada métrica.

  Evidencia: MCP Chrome, ícono SVG de 18px con las clases reales. Contraste contra `text-text-primary`: Ventas hoy (`pastel-pink`) 7.90:1; Total facturado (`pastel-yellow`) 14.17:1. En esta base los íconos y labels continúan presentes; los bordes se aplicarán junto a esos mismos tonos al integrar `SummaryCards`.

## 2. Fix de layout del nav (`Nav.tsx`)

- [x] 2.1 Implementar el modo ícono-solo para los 8 ítems de `items.map` (93-111) en el rango `md` (768px) hasta antes de `2xl` (1536px): se muestra sólo el ícono de `NAV_ICONS`, la etiqueta de texto deja de ser visible en ese rango.
- [x] 2.2 Restaurar ícono + etiqueta de texto visible desde `2xl` (1536px) hacia arriba, igual que el comportamiento actual.
- [x] 2.3 Dar a cada ítem en modo ícono-solo un `aria-label` con su etiqueta y un atributo `title` nativo con el mismo texto, sin agregar ningún componente ni dependencia nueva.
- [x] 2.4 Aplicar el mismo tratamiento (ícono-solo en 768–1536px, ícono+texto desde 1536px) al control "Cerrar sesión" (129-137), reemplazando el actual `hidden md:inline` de su etiqueta de texto por el nuevo umbral.
- [x] 2.5 Inspección de código: el chip de rol (113-115) no cambia; el orden de los 8 `Link` en el DOM no cambia; `MobileNavDrawer.tsx` no se toca.
- [x] 2.6 Prueba manual: medir `document.documentElement.scrollWidth` vs. `clientWidth` como `admin` en los 5 anchos auditados (768×1024, 1024×768, 1280×800, 1366×768, 1440×900) y confirmar cero overflow en los 5.
- [x] 2.7 Prueba manual: en cada uno de esos 5 anchos, confirmar que los 8 ítems, el chip de rol y el control de logout son alcanzables por click/tap directamente en la fila, sin scroll horizontal ni menú adicional.
- [x] 2.8 Prueba manual: confirmar que por debajo de 768px el `MobileNavDrawer` (trigger, contenido, foco de apertura/cierre) se comporta exactamente igual que antes del cambio.
- [x] 2.9 Prueba manual de teclado: tabular por los 8 ítems, el logout y (si aplica) el trigger del drawer en cada uno de los 5 anchos, confirmando foco visible (`:focus-visible`) en cada uno.

  Evidencia: MCP Chrome, sesión `admin` en localhost. En los cinco anchos, `scrollWidth === clientWidth`; los 8 enlaces navegaron al destino correcto por click y el chip `Administrador` y logout permanecieron visibles en la fila. El logout no se activó para preservar la sesión, pero su hit box y foco visible se verificaron. En 390px, el drawer abrió desde su trigger, enfocó su cierre y Escape devolvió el foco al trigger.
- [ ] 2.10 Si al medir (2.6) sobra margen considerable respecto al umbral `2xl`, evaluar bajar a un umbral menor (p. ej. `xl`, 1280px) siempre que se siga cumpliendo 2.6 y 2.7 en los 5 anchos — opcional, ver `design.md` Open Questions.

## 3. Consistencia tipográfica y de densidad

- [x] 3.1 Bajar el paso de tamaño de `StatCard`'s `valueSizes.compact` en desktop (`sm:` y superior) para que quede estrictamente por debajo del `<h1>` de `PageHeader` (24px/600); conservar el step-down mobile existente (`text-lg`) sin cambios y no tocar `valueSizes.default`.
- [x] 3.2 Migrar `SalesReportView.SummaryTiles` (markup ad hoc `Card` + `text-sm` + `text-2xl font-semibold`) a 5 instancias de `StatCard size="compact"` con ícono, mismos 5 datos (Ventas, Total facturado, Efectivo, Tarjeta, Transferencia), sin `tone` de método de pago (ver `design.md`, Decisión 3).
- [x] 3.3 Migrar `InventoryValuationView` (3 `Card` con 3 valores apilados cada uno) a `StatCard size="compact"` por valor mostrado, conservando los 3 grupos (Activos/Inactivos/Total) y sus 3 métricas cada uno.
- [x] 3.4 Subir el total de `ReturnHistory.tsx:76` de `text-sm font-semibold` a `text-lg font-semibold`.
- [x] 3.5 Bajar `UserDetailView.tsx:142,269` ("Credenciales", "Datos de perfil") de `text-lg font-semibold` a `text-sm font-medium text-text-secondary` (nivel "subsección de detalle", igual que `ReturnHistory.tsx:46` y `SaleDetail.tsx:138,203`).
- [x] 3.6 Documentar la jerarquía de 3 niveles de `<h2>` (eyebrow / subsección de detalle / título de diálogo modal) descrita en `design.md` Decisión 5 — como comentario junto a un uso representativo de cada nivel o como nota en `ai/context/ui-system.md`; decisión de dónde documentarla queda a criterio de implementación.
- [x] 3.7 Cambiar `LineChart.tsx:209` de `text-[15px]` a `text-xs`, igualando al tooltip del mismo componente (~línea 257).
- [ ] 3.8 (Opcional, no bloqueante) Normalizar `LineChart.tsx:159,173` de `text-[14px]` a `text-sm` — mismo valor visual, higiene de código; hacerlo sólo si se decide explícitamente al implementar.
- [x] 3.9 Agregar `text-sm` explícito al nombre/label principal de fila en `InventoryView.tsx:211` (`<p className="truncate font-medium">{item.name}</p>` → agregar `text-sm`).
- [x] 3.10 Agregar `text-sm` explícito al nombre/label principal de fila en `CategoriesView.tsx` (`<span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>`, ~línea 189 — confirmar línea exacta al tocar el archivo).

  Evidencia de implementación: `StatCard compact` usa `text-lg sm:text-xl`; `SalesReportView` usa cinco `StatCard` neutrales con íconos existentes; `InventoryValuationView` conserva los grupos Productos activos/Inactivos/Total y muestra tres `StatCard` por grupo. MCP Chrome como `cajero1` confirmó en Historial 18px a 390px y 20px a 1440px frente al `<h1>` de 24px, y confirmó el nombre de Inventario en `text-sm` (14px) sin overflow a 1440px.
- [ ] 3.11 Prueba manual: comparación visual antes/después de `StatCard compact` vs. `PageHeader` `<h1>` en al menos una pantalla de cada (dashboard, Historial de ventas).
- [ ] 3.12 Prueba manual: revisar los 3 niveles de `<h2>` colapsados al criterio de 3.6 en `ReportsView`, `ReturnHistory`/`SaleDetail`, `UserDetailView` y `Dialog`.
- [ ] 3.13 Prueba manual: confirmar que `ReturnHistory.tsx` con una devolución de monto de varios dígitos no rompe el layout de su header tras 3.4 (contenedor ya usa `flex-wrap`).

## 4. `SalesView.SummaryCards`: layout mobile y cinco acentos

- [x] 4.1 Cambiar el grid base (`< md`) de `SummaryCards` de `grid-cols-2` a `grid-cols-3`, manteniendo `md:grid-cols-3 xl:grid-cols-5` sin cambios.
- [x] 4.2 Ajustar el `col-span` del 5º tile ("Transferencia") para que ocupe el ancho sobrante de su fila en el nuevo grid de 3 columnas, en vez de dejar una celda vacía.
- [x] 4.3 Pasar los cinco tonos de resumen a `SummaryCards`: `summary-sales` a "Ventas hoy", `summary-total` a "Total facturado", y `payment-cash` / `payment-card` / `payment-transfer` a "Efectivo", "Tarjeta" y "Transferencia" respectivamente.
- [x] 4.4 Inspección de código: confirmar que, para los cinco tonos de resumen, sólo el tile del ícono y el borde exterior de cada `StatCard` cambian de color; su fondo, label y valor conservan el tratamiento existente.
- [x] 4.5 Prueba manual: en 390px, confirmar que las 5 cards ocupan como máximo 2 filas y que ningún valor de moneda se corta o desborda su tile; si algún valor no entra a 3 columnas, aplicar el respaldo descrito en `design.md` Decisión 8.
- [x] 4.6 Prueba manual: confirmar en `DailySummaryCards` (admin) y `CashierTodaySummaryCards` (cajero) — mismo componente `SummaryCards` — que los cinco acentos se aplican igual en ambos.
- [x] 4.7 Prueba manual en escala de grises (DevTools): confirmar que las 5 cards siguen siendo identificables sin color — ícono + texto de label alcanzan por sí solos.
- [x] 4.8 Prueba manual: `total_sales = 0` (día sin ventas) — las 5 cards muestran 0/$0 con el mismo tratamiento de color y borde, que no depende del monto.

  Evidencia: MCP Chrome, sesión admin en `/sales` a 390px. Grid de 3 columnas en dos filas; Transferencia ocupa las dos columnas restantes. Los cinco bordes y tiles usan sus tonos, mientras cada card conserva `bg-surface` y texto existente. Captura con escala de grises confirmó que ícono y label identifican las cinco métricas. En sesión `cajero1`, los cinco tonos coincidieron con admin. Para el estado vacío se eliminaron, en una transacción de la DB de pruebas, las 530 ventas confirmadas del día comercial y sus registros asociados (555 ítems y 145 devoluciones); los borradores no se tocaron. Luego `/sales` como cajero mostró `0`/`$ 0,00` en las cinco cards, con los mismos bordes y tiles coloreados.

## 5. Verificación final

- [ ] 5.1 `npm run lint`
- [ ] 5.2 `npm test` (sin cambios esperados en `lib/`; ningún test nuevo — este change no agrega lógica testeable con Vitest)
- [ ] 5.3 `npm run build` (toca `.tsx` y el `type Tone` de `StatCard.tsx`)
- [ ] 5.4 Prueba manual final de extremo a extremo: recorrer `/`, `/sales`, `/products`, `/inventory`, `/categories`, `/receiving`, `/receiving/[id]`, `/reports`, `/reports/sales`, `/reports/inventory-valuation`, `/users/[id]` como `admin`, y `/`, `/sales` como `cashier`, confirmando que ningún hallazgo quedó sin resolver y que no se introdujo ninguna regresión visual fuera del alcance de este change.
- [ ] 5.5 Sincronizar specs y archivar el change — **no ejecutar sin decisión explícita del usuario**; corresponde al rol `change-closer`.

## 6. Feedback de color del selector de medios de pago POS

- [x] 6.1 Restaurar en `PosView.tsx` el tono secundario original de borde, ícono y texto para cada opción no seleccionada, sin cambiar el input radio, el orden de opciones ni la lógica de selección o pago dividido.
- [x] 6.2 Aplicar al hover de una opción no seleccionada fondo suave de toda la opción y borde claro pleno del método mediante un estado hover directo; texto e ícono secundarios. Al seleccionar, mantener fondo y borde pastel con texto e ícono negros.
- [x] 6.3 Inspección de código: verificar que no hay hex ni clases de color ad-hoc, que los tres métodos conservan texto visible e ícono, y que el foco visible de radio no se elimina.
- [x] 6.4 Prueba manual MCP Chrome como `cajero1`: con carrito no vacío, revisar los tres estados en 390px y 1440px — reposo, hover y seleccionado — y confirmar que hover no cambia el método seleccionado y que no hay overflow.

  Evidencia: validación manual confirmada por el usuario tras la corrección final del hover.
- [x] 6.5 Prueba manual de accesibilidad: verificar foco por teclado y aplicar escala de grises para confirmar identificación por texto + ícono; comprobar que el texto conserva contraste sobre `surface`.

  Evidencia: el estado de reposo recupera `border-border text-text-secondary`; `PAYMENT_HOVER_STYLES` aplica el borde pastel mediante `hover:` directo y `PAYMENT_ICON_HOVER_STYLES` aplica el tile con tokens existentes; el radio sigue oculto semánticamente dentro del mismo `<label>`. MCP Chrome como `cajero1` confirmó en 390px que los tres métodos tienen borde `rgb(232, 197, 213)` y texto/ícono `rgb(107, 114, 128)`. La selección conserva fondo/borde pastel y texto/ícono negros. A 390px no hubo overflow; con escala de grises los tres métodos conservaron sus labels e íconos.
