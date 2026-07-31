## 1. Pure pricing helpers (`src/lib/`)

- [ ] 1.1 Agregar a `src/lib/products.ts` (o a un módulo puro equivalente
      bajo `src/lib/`) una función `computeSalePriceFromCost(cost: string,
      percent: number): string | null` que devuelva el precio de venta como
      string decimal (`cost × (1 + percent/100)`, redondeado al centavo con
      `Math.round` sobre `toCents`/`fromCents` de `lib/money.ts`), y `null`
      cuando `cost` no sea un número positivo válido o `percent` no sea un
      número finito.
- [ ] 1.2 Agregar una función `computePercentFromPrices(cost: string, price:
      string): number | null` que devuelva `((price − cost) / cost) × 100`
      redondeado a un entero, y `null` cuando `cost` no sea un número
      positivo válido.
- [ ] 1.3 Agregar una función `computeMarginAmount(cost: string, price:
      string): string | null` que devuelva `price − cost` como string
      decimal vía `subtractMoney`/`fromCents`/`toCents`, y `null` cuando
      `cost` o `price` no sean números válidos.
- [ ] 1.4 (Prueba automatizada) Crear/extender `src/lib/products.test.ts` con
      casos: costo positivo + porcentaje entero da el precio esperado;
      costo/porcentaje producen redondeo correcto al centavo (caso que no
      cae en un múltiplo exacto); costo `0`/vacío/no numérico devuelve
      `null` en las tres funciones; precio por debajo del costo produce
      porcentaje y margen negativos; costo/precio válidos derivan el
      porcentaje esperado, incluyendo un caso que redondea a un entero
      distinto del que originó el precio.

## 2. `ProductForm` — estado y campo de porcentaje

- [ ] 2.1 Agregar al estado local de `ProductForm` un campo `marginPercent`
      (string o number, a criterio de implementación) inicializado en `"30"`
      para alta, y para edición inicializado con
      `computePercentFromPrices(product.cost, product.unit_type === "pesable"
      ? product.price_per_kg : product.price)`, cayendo a `"30"` cuando esa
      función devuelva `null`.
- [ ] 2.2 Renderizar un `Input` de porcentaje con label "% de ganancia" en la
      misma grilla `sm:grid-cols-2` que ya usan costo y precio, sin romper el
      layout existente en mobile (320px) ni desktop.
- [ ] 2.3 Al cambiar el costo: si `marginPercent` es un número válido, llamar
      a `computeSalePriceFromCost` y, si no devuelve `null`, actualizar el
      campo de precio activo (`price` o `price_per_kg` según `unit_type`); si
      devuelve `null` (costo vacío/`0`/inválido), no tocar el precio.
- [ ] 2.4 Al cambiar `marginPercent`: mismo recálculo que 2.3, usando el
      costo actual.
- [ ] 2.5 Al cambiar el precio activo directamente (edición manual): llamar a
      `computePercentFromPrices` con el costo actual y actualizar
      `marginPercent` con el resultado cuando no sea `null`; si es `null`
      (costo vacío/`0`/inválido), dejar `marginPercent` sin cambios.
- [ ] 2.6 Confirmar por inspección que el payload construido en `submit`
      sigue siendo exactamente `{ sku, barcode, name, category_id, unit_type,
      price, price_per_kg, cost }` y que `marginPercent` nunca se agrega al
      objeto enviado.

## 3. `ProductForm` — texto de margen derivado

- [ ] 3.1 Renderizar, junto al campo de precio activo, un texto derivado con
      el resultado de `computeMarginAmount` y `computePercentFromPrices`
      (formateados con `formatMoney`), por ejemplo
      `Margen: $ 375,00 (30%)`, sólo cuando ambas funciones devuelvan un
      valor no nulo; omitir el texto por completo en caso contrario (costo
      vacío/`0`/inválido).
- [ ] 3.2 Asociar el texto de margen al campo de precio con
      `aria-describedby`, siguiendo el mismo patrón que
      `product-sku-help`/`aria-describedby="product-sku-help"` ya usado para
      el SKU.
- [ ] 3.3 Marcar el contenedor del texto de margen con `role="status"` y
      `aria-live="polite"`, igual que el bloque de ayuda de SKU, para que los
      lectores de pantalla anuncien los recálculos sin robar el foco.
- [ ] 3.4 Confirmar por inspección que un margen negativo se muestra con el
      signo `-` como parte del texto (monto y porcentaje), sin depender
      únicamente de una clase de color para comunicarlo.

## 4. Verificación

- [ ] 4.1 `npm run lint`
- [ ] 4.2 `npm test`
- [ ] 4.3 `npm run build` (el change no toca `page.tsx` ni `route.ts`, pero sí
      tipos y un componente compartido; correr build igual para detectar
      errores de tipos no visibles en lint)
- [ ] 4.4 (Prueba manual) Alta de producto `unitario`: cargar costo, ver que
      el precio se autocompleta con 30% por defecto y que el texto de margen
      aparece; editar el porcentaje y confirmar que el precio y el margen se
      recalculan; editar el precio a mano y confirmar que el porcentaje
      mostrado cambia para reflejarlo.
- [ ] 4.5 (Prueba manual) Repetir 4.4 con un producto `pesable`, verificando
      que el cálculo actúa sobre `price_per_kg` en vez de `price`.
- [ ] 4.6 (Prueba manual) Editar un producto existente con costo y precio
      guardados: confirmar que el porcentaje inicial refleja esos valores en
      vez de mostrar 30% por defecto.
- [ ] 4.7 (Prueba manual) Editar un producto existente con costo `0` o vacío:
      confirmar que el porcentaje inicial cae a 30% por defecto.
- [ ] 4.8 (Prueba manual) Dejar el costo vacío o en `0` y confirmar que ni el
      precio ni el texto de margen se autocompletan ni muestran un valor
      engañoso.
- [ ] 4.9 (Prueba manual) Editar el precio por debajo del costo y confirmar
      que el porcentaje y el margen se muestran en negativo sin bloquear el
      submit.
- [ ] 4.10 (Prueba manual) Operar los tres campos (costo, porcentaje, precio)
      sólo con teclado, confirmando que el foco nunca se mueve por un
      recálculo automático.
- [ ] 4.11 (Prueba manual) Confirmar en 320px de ancho que el nuevo campo y
      el texto de margen no producen scroll horizontal ni recortan el
      layout existente.
- [ ] 4.12 (Inspección) Revisar el payload real enviado (Network tab o log)
      al crear y al editar un producto, confirmando que no incluye ningún
      campo de porcentaje.

## 5. Cierre (sujeto a decisión del usuario)

- [ ] 5.1 Sincronizar specs (`openspec archive` o equivalente) sólo cuando el
      usuario lo pida explícitamente después de implementar y verificar.
