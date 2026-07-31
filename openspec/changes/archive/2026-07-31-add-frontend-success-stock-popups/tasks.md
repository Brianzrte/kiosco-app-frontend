## 1. Helpers puros

- [x] 1.1 En `src/lib/inventory.ts` (o un nuevo módulo si corresponde), agregar
      una función pura que, dado un query param crudo (`string | null`),
      determine si representa un `product_id` a deep-linkear (no vacío, sin
      normalización de UUID adicional — el backend valida el formato).
      Evidencia: `src/lib/inventory.test.ts`; tests focalizados y suite completa pasan.
- [x] 1.2 Agregar en `src/lib/products.ts` (o módulo equivalente) una función
      pura que, a partir del `cart` de POS en el momento de confirmar,
      devuelva el `product_id` de la última línea agregada (o `null` si el
      carrito está vacío), sin depender de ningún estado de React. Evidencia:
      `src/lib/products.test.ts`; tests focalizados y suite completa pasan.
- [x] 1.3 Agregar una función pura que decida si el botón "Inicializar stock"
      de POS debe mostrarse, a partir del listado de roles de la sesión (usa
      el mismo criterio que ya exista para roles múltiples/intersección, o
      una comparación simple contra `["admin"]` si no existe todavía un
      helper compartido — ver Decisión 4 de `design.md`). Evidencia: prueba
      Evidencia: `src/lib/products.test.ts`; tests focalizados y suite completa pasan.

## 2. Alta de producto: popup de éxito

- [x] 2.1 En `ProductForm.tsx`, agregar el estado necesario para el popup de
      éxito de creación (producto creado: `id`, `name`, `sku` efectivo).
- [x] 2.2 Reemplazar, sólo en la rama de creación (`!product`) de `submit`,
      el `toast` + `router.push("/products")` + `router.refresh()` actuales
      por la apertura del popup de éxito. La rama de edición no cambia.
- [x] 2.3 Construir el popup con el `Dialog` del kit: título/mensaje con
      nombre y SKU efectivo, botón primario "Inicializar stock" (navega a
      `/inventory?product_id={id}`), botón secundario "Ahora no" (navega a
      `/products/new`). Cualquier cierre del `Dialog` (×, `Escape`, click
      afuera) navega igual que "Ahora no".
      Evidencia: inspección de código + prueba manual (apertura, ambos
      botones, `Escape`, click afuera, foco inicial en `/products/new` tras
      cerrar). Confirmado por el usuario en entorno real.
- [x] 2.4 Verificar que el popup no bloquea ni cambia el manejo de errores de
      creación existente (incluyendo el flujo `409` de SKU/código de barras
      duplicado ya normado). Evidencia: inspección de `ProductForm.tsx`; lint/build pasan.

## 3. Alta de producto: reordenar y validar código de barras

- [x] 3.1 Reordenar los campos de `ProductForm` **sólo quando `!product`**:
      código de barras primero (con `autoFocus`, en reemplazo del
      `autoFocus` actual en "Nombre"), seguido de nombre, categoría, SKU
      automático y el resto sin cambios. La rama de edición conserva el
      orden y el `autoFocus` actuales.
      Evidencia: inspección de código + prueba manual (foco inicial, orden
      visual, `Tab` order en creación vs. edición). Confirmado por el usuario en entorno real.
- [x] 3.2 Agregar un handler de `Enter` (`onKeyDown`, con
      `event.preventDefault()`) específico del campo de código de barras,
      activo sólo en creación, que dispare la consulta a
      `GET /api/v1/products/barcode/{barcode}` a través de `api<Product>()`
      sin enviar el resto del formulario.
      Evidencia: inspección de código (confirmar que `preventDefault` evita
      el `submit` nativo) + prueba manual con `Enter` real del teclado. Confirmado por el usuario en entorno real.
- [x] 3.3 Manejar la respuesta: `404` limpia cualquier advertencia previa sin
      mostrar nada; `200` guarda el producto encontrado en estado y muestra
      la advertencia inline (nombre, SKU, enlace a `/products/{id}`) con
      `role="alert"`; cualquier otro error (red, `5xx`, `401`) no bloquea el
      alta y sólo muestra un aviso breve no bloqueante.
      Evidencia: inspección de código + prueba manual de los tres casos
      (usando productos ya cargados por seed/datos existentes para el caso
      "existe"). Confirmado por el usuario en entorno real.
- [x] 3.4 Deshabilitar el botón de envío del formulario mientras la
      advertencia de duplicado esté activa; limpiar la advertencia y volver a
      habilitar el envío en cuanto el valor del campo de código de barras
      cambie. Evidencia: prueba manual confirmada por el usuario en entorno real.
- [x] 3.5 Confirmar que escribir código de barras a mano tecla por tecla (sin
      `Enter`) no dispara ninguna consulta, y que un alta sin código de
      barras nunca ejecuta esta validación. Evidencia de implementación: el lookup sólo está conectado a `onKeyDown` de Enter y retorna para un valor vacío; prueba manual confirmada por el usuario en entorno real.

## 4. POS: acciones en el panel de confirmación

- [x] 4.1 En `src/app/(app)/page.tsx`, pasar el rol de la sesión (o el
      resultado del helper de la tarea 1.3) como prop nueva a `PosView`,
      siguiendo el mismo patrón que `canPlanStock` en `InventoryPage`.
- [x] 4.2 En `PosView.tsx`, capturar el `product_id` de la última línea del
      `cart` (helper de la tarea 1.2) antes de que `confirmSale()` vacíe el
      carrito, y guardarlo junto al resto del estado de `confirmedSale`.
- [x] 4.3 Renombrar el botón "Nueva venta" del panel `confirmedSale` a "Ahora
      no", conservando exactamente su `onClick` (`dismissConfirmedSale`) y
      estilo actuales.
- [x] 4.4 Agregar el botón "Inicializar stock" al panel, visible sólo si la
      prop de rol/acceso (tarea 4.1) lo habilita, que navegue a
      `/inventory?product_id={último producto}` sin alterar el auto-descarte
      ni el resto del panel.
      Evidencia: inspección de código + prueba manual (con y sin acceso a
      Inventario, carrito de una línea y de varias líneas distintas). Confirmado por el usuario en entorno real.
- [x] 4.5 Confirmar que ninguna de las dos acciones nuevas mueve el foco del
      input de escaneo ni bloquea escanear el siguiente código, y que
      auto-descarte (6 s), click afuera y el próximo escaneo siguen cerrando
      el panel igual que hoy. Evidencia: prueba manual confirmada por el usuario en entorno real.

## 5. Inventario: apertura directa por `product_id`

- [x] 5.1 En `src/app/(app)/inventory/page.tsx` o `InventoryView.tsx`, leer
      el query param `product_id` de la URL (`useSearchParams` — primer uso
      en este repo; confirmar que no rompe el render estático/SSR de la
      página, ya que `page.tsx` es un server component que hoy no usa
      `searchParams`).
- [x] 5.2 Cuando `product_id` esté presente y sea no vacío (helper de la
      tarea 1.1), pedir `GET /products/{id}` para ese producto en paralelo a
      la carga normal de la lista paginada, sin alterar el fetch existente.
- [x] 5.3 Si el producto resuelve, abrir el `Dialog` "Gestionar stock" para
      ese `product_id` de inmediato (reusando `StockPanel` sin cambios), con
      el mismo comportamiento de `selectedItem` que ya dispara un clic en una
      fila.
- [x] 5.4 Si el producto no resuelve (404 u otro error), no abrir ningún
      diálogo y mostrar un mensaje corto no bloqueante, dejando la lista
      utilizable.
      Evidencia de implementación: lookup independiente, estado de error no bloqueante y lista intacta; prueba manual confirmada por el usuario en entorno real.
- [x] 5.5 Confirmar que cargar `/inventory` sin `product_id` se comporta
      exactamente igual que antes de este change. Evidencia: prueba manual confirmada por el usuario en entorno real.

## 6. Verificación general

- [x] 6.1 `npm run lint`.
- [x] 6.2 `npm test` (incluye los helpers nuevos de la sección 1).
- [x] 6.3 `npm run build` (el change toca `page.tsx` de `/inventory` y de
      `/` además de tipos/estado nuevo en varios componentes).
- [x] 6.4 Prueba manual end-to-end: crear un producto → popup → "Inicializar
      stock" → cargar stock inicial → volver a Productos y confirmar que el
      producto quedó con stock. Repetir eligiendo "Ahora no" y confirmar que
      cae en un alta en blanco. Confirmado por el usuario en entorno real.
- [x] 6.5 Prueba manual end-to-end: confirmar una venta con acceso a
      Inventario → "Inicializar stock" → confirmar que abre el producto
      correcto (último agregado); repetir sin acceso a Inventario y
      confirmar que el botón no aparece. Confirmado por el usuario en entorno real.
- [x] 6.6 Prueba manual de accesibilidad: recorrido completo por teclado del
      popup de alta, del panel de POS con sus dos acciones, y del alta
      reordenada con el código de barras primero (incluyendo `Enter` para
      disparar la validación). Confirmado por el usuario en entorno real.
- [x] 6.7 Prueba manual responsive a 320px de las tres superficies tocadas
      (popup de alta, panel de POS con dos botones, diálogo de Inventario
      abierto por `product_id`). Confirmado por el usuario en entorno real.
- [x] 6.8 Validar contra backend real: confirmar que
      `GET /api/v1/products/barcode/{barcode}` y `GET /api/v1/products/{id}`
      responden como se documenta (200/404) contra una instancia real antes
      de dar por cerrada la sección 3 y la sección 5. Confirmado por el usuario en entorno real.

## 7. Cierre (sujeto a decisión del usuario)

- [ ] 7.1 Sincronizar specs (`openspec/specs/ui-catalog`,
      `openspec/specs/ui-pos`, `openspec/specs/ui-inventory`) — no ejecutar
      sin decisión explícita del usuario.
- [ ] 7.2 Archivar el change — no ejecutar sin decisión explícita del
      usuario.
