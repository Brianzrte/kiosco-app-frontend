## 1. Pure pricing helpers (`src/lib/`)

- [x] 1.1 Agregar a `src/lib/products.ts` (o a un módulo puro equivalente
      bajo `src/lib/`) una función `computeSalePriceFromCost(cost: string,
      percent: number): string | null` que devuelva el precio de venta como
      string decimal (`cost × (1 + percent/100)`, redondeado al centavo con
      `Math.round` sobre `toCents`/`fromCents` de `lib/money.ts`), y `null`
      cuando `cost` no sea un número positivo válido o `percent` no sea un
      número finito.
- [x] 1.2 Agregar una función `computePercentFromPrices(cost: string, price:
      string): number | null` que devuelva `((price − cost) / cost) × 100`
      redondeado a un entero, y `null` cuando `cost` no sea un número
      positivo válido.
- [x] 1.3 Agregar una función `computeMarginAmount(cost: string, price:
      string): string | null` que devuelva `price − cost` como string
      decimal vía `subtractMoney`/`fromCents`/`toCents`, y `null` cuando
      `cost` o `price` no sean números válidos.
- [x] 1.4 (Prueba automatizada) Crear/extender `src/lib/products.test.ts` con
      casos: costo positivo + porcentaje entero da el precio esperado;
      costo/porcentaje producen redondeo correcto al centavo (caso que no
      cae en un múltiplo exacto); costo `0`/vacío/no numérico devuelve
      `null` en las tres funciones; precio por debajo del costo produce
      porcentaje y margen negativos; costo/precio válidos derivan el
      porcentaje esperado, incluyendo un caso que redondea a un entero
      distinto del que originó el precio.

## 2. `ProductForm` — estado y campo de porcentaje

- [x] 2.1 Agregar al estado local de `ProductForm` un campo `marginPercent`
      (string o number, a criterio de implementación) inicializado en `"30"`
      para alta, y para edición inicializado con
      `computePercentFromPrices(product.cost, product.unit_type === "pesable"
      ? product.price_per_kg : product.price)`, cayendo a `"30"` cuando esa
      función devuelva `null`. **Superada por la tarea 5.3**, que reemplaza
      el literal `"30"` por la constante configurable.
- [x] 2.2 Renderizar un `Input` de porcentaje con label "% de ganancia" en la
      misma grilla `sm:grid-cols-2` que ya usan costo y precio, sin romper el
      layout existente en mobile (320px) ni desktop.
- [x] 2.3 Al cambiar el costo: si `marginPercent` es un número válido, llamar
      a `computeSalePriceFromCost` y, si no devuelve `null`, actualizar el
      campo de precio activo (`price` o `price_per_kg` según `unit_type`); si
      devuelve `null` (costo vacío/`0`/inválido), no tocar el precio.
      **Extendida por la tarea 5.2**: cuando `marginPercent` esté vacío o sea
      inválido, usar `DEFAULT_MARGIN_PERCENT` como percent efectivo en vez de
      omitir el cálculo.
- [x] 2.4 Al cambiar `marginPercent`: mismo recálculo que 2.3, usando el
      costo actual.
- [x] 2.5 Al cambiar el precio activo directamente (edición manual): llamar a
      `computePercentFromPrices` con el costo actual y actualizar
      `marginPercent` con el resultado cuando no sea `null`; si es `null`
      (costo vacío/`0`/inválido), dejar `marginPercent` sin cambios.
      **Superada por la tarea 4.3**: el comportamiento cuando el costo es
      `null`/vacío/`0` cambia — en vez de dejar `marginPercent` sin cambios,
      se calcula el costo hacia atrás. El caso de costo ya válido no cambia.
- [x] 2.6 Confirmar por inspección que el payload construido en `submit`
      sigue siendo exactamente `{ sku, barcode, name, category_id, unit_type,
      price, price_per_kg, cost }` y que `marginPercent` nunca se agrega al
      objeto enviado.

## 3. `ProductForm` — texto de margen derivado

- [x] 3.1 Renderizar, junto al campo de precio activo, un texto derivado con
      el resultado de `computeMarginAmount` y `computePercentFromPrices`
      (formateados con `formatMoney`), por ejemplo
      `Margen: $ 375,00 (30%)`, sólo cuando ambas funciones devuelvan un
      valor no nulo; omitir el texto por completo en caso contrario (costo
      vacío/`0`/inválido). El ejemplo numérico queda desactualizado (pasa a
      35% por defecto, ver sección 5) pero el mecanismo no cambia.
- [x] 3.2 Asociar el texto de margen al campo de precio con
      `aria-describedby`, siguiendo el mismo patrón que
      `product-sku-help`/`aria-describedby="product-sku-help"` ya usado para
      el SKU.
- [x] 3.3 Marcar el contenedor del texto de margen con `role="status"` y
      `aria-live="polite"`, igual que el bloque de ayuda de SKU, para que los
      lectores de pantalla anuncien los recálculos sin robar el foco.
- [x] 3.4 Confirmar por inspección que un margen negativo se muestra con el
      signo `-` como parte del texto (monto y porcentaje), sin depender
      únicamente de una clase de color para comunicarlo.

## 4. Costo inverso desde el precio de venta (reemplaza el comportamiento de la tarea 2.5 cuando el costo está vacío)

- [x] 4.1 Agregar a `src/lib/products.ts` una función
      `computeCostFromSalePrice(price: string, percent: number): string |
      null` que devuelva el costo como string decimal
      (`price / (1 + percent/100)`, redondeado al centavo más cercano con el
      mismo patrón `Math.round` sobre `toCents`/`fromCents` que
      `computeSalePriceFromCost`), y `null` cuando `price` no sea un número
      positivo válido o `percent` no sea un número finito.
- [x] 4.2 (Prueba automatizada) Extender `src/lib/products.test.ts` con casos
      para `computeCostFromSalePrice`: precio positivo + porcentaje entero da
      el costo esperado; redondeo correcto al centavo en un caso que no cae
      en un múltiplo exacto; precio `0`/vacío/no numérico devuelve `null`;
      caso de ida y vuelta (costo → precio con `computeSalePriceFromCost`,
      después precio → costo con `computeCostFromSalePrice`) que confirma que
      ambas funciones son inversas dentro del margen de redondeo a centavo.
- [x] 4.3 Modificar el handler de cambio del precio activo en `ProductForm`
      (el que hoy implementa la tarea 2.5) para bifurcar según el costo
      actual:
      - Si el costo es un número positivo válido: comportamiento sin cambios
        (llama `computePercentFromPrices`, actualiza sólo `marginPercent`, no
        toca el costo).
      - Si el costo está vacío, es `"0"` o inválido: llamar a
        `computeCostFromSalePrice(nuevoPrecio, percentEfectivo)` (el percent
        efectivo definido en la tarea 5.2) y, si no devuelve `null`,
        actualizar el campo de costo con ese valor.
- [x] 4.4 Confirmar por inspección que, tras un cálculo inverso que llena el
      campo de costo, una edición posterior del precio activo sigue el primer
      caso de 4.3 (costo ya no está vacío) — es decir, que el costo estimado
      queda protegido igual que uno tipeado a mano, sin necesidad de lógica
      adicional más allá de leer el valor actual del campo.

## 5. Margen por defecto configurable por variable de entorno

- [x] 5.1 Definir en `src/lib/products.ts` (o un módulo de configuración
      equivalente bajo `src/lib/`) una constante `DEFAULT_MARGIN_PERCENT`
      leída de `process.env.NEXT_PUBLIC_DEFAULT_MARGIN_PERCENT` una sola vez
      a nivel de módulo, con fallback a `35` cuando la variable no esté
      seteada o `Number(...)` no sea finito.
- [x] 5.2 En `ProductForm`, reemplazar todo uso del literal `"30"`/`30` por
      `DEFAULT_MARGIN_PERCENT`: el estado inicial de `marginPercent` (alta,
      tarea 2.1), `resetCreationForm`, y el `placeholder` del input de
      porcentaje. Además, dondequiera que un cálculo (costo→precio en 2.3, o
      precio→costo en 4.3) use el valor de `marginPercent` y ese campo esté
      vacío o sea inválido, usar `DEFAULT_MARGIN_PERCENT` como percent
      efectivo en su lugar.
- [x] 5.3 En la edición de un producto existente cuyo costo guardado sea `0`
      o esté vacío, usar `DEFAULT_MARGIN_PERCENT` como valor inicial de
      `marginPercent` (reemplaza el `"30"` hardcodeado de la tarea 2.1).
- [x] 5.4 (Prueba automatizada) Test en `src/lib/products.test.ts` para el
      fallback de `DEFAULT_MARGIN_PERCENT`: variable no seteada → 35; variable
      seteada con un número válido → ese número; variable seteada con un
      valor no numérico → 35.
- [x] 5.5 Documentar la variable en `.env.example` (crearlo si no existe, ya
      que hoy no hay ninguno en el repo) con un comentario breve y el valor
      por defecto.

## 6. Verificación

- [x] 6.1 `npm run lint`
- [x] 6.2 `npm test`
- [x] 6.3 `npm run build` (el change no toca `page.tsx` ni `route.ts`, pero sí
      tipos y un componente compartido; correr build igual para detectar
      errores de tipos no visibles en lint)
- [x] 6.4 `npm run lint`, `npm test` y `npm run build` de nuevo después de
      completar las secciones 4 y 5, para cubrir el código agregado desde la
      primera pasada de verificación.
- [x] 6.5 (Prueba manual) Alta de producto `unitario`: cargar costo, ver que
      el precio se autocompleta con 35% por defecto (o el valor de
      `NEXT_PUBLIC_DEFAULT_MARGIN_PERCENT` si está seteado) y que el texto de
      margen aparece; editar el porcentaje y confirmar que el precio y el
      margen se recalculan; con costo ya cargado, editar el precio a mano y
      confirmar que el porcentaje mostrado cambia para reflejarlo **sin que
      el costo se modifique**.
- [x] 6.6 (Prueba manual) Alta de producto `unitario` sin costo a mano:
      dejar el costo vacío y tipear directamente el precio de venta;
      confirmar que, luego de una pausa de 500 ms con al menos tres dígitos,
      el campo de costo se autocompleta con el valor estimado
      (`precio / (1 + %/100)`) y que el texto de margen aparece. Editar el
      precio de nuevo y confirmar que, esta vez, el costo estimado **no** se
      vuelve a recalcular (sólo cambia el porcentaje mostrado).
- [x] 6.7 (Prueba manual) Repetir 6.5 y 6.6 con un producto `pesable`,
      verificando que el cálculo actúa sobre `price_per_kg` en vez de
      `price`.
- [x] 6.8 (Prueba manual) Editar un producto existente con costo y precio
      guardados: confirmar que el porcentaje inicial refleja esos valores en
      vez de mostrar el default; editar el precio y confirmar que el costo
      guardado no se toca (ya es no-cero).
- [x] 6.9 (Prueba manual) Editar un producto existente con costo `0` o vacío:
      confirmar que el porcentaje inicial cae al default (35% salvo
      override), y que editar el precio ahí sí dispara el cálculo inverso de
      costo (mismo comportamiento que en alta).
- [x] 6.10 (Prueba manual) Dejar el costo vacío o en `0` sin tocar el precio y
      confirmar que ni el precio ni el texto de margen se autocompletan ni
      muestran un valor engañoso.
- [x] 6.11 (Prueba manual) Editar el precio por debajo del costo (con costo ya
      cargado) y confirmar que el porcentaje y el margen se muestran en
      negativo sin bloquear el submit.
- [x] 6.12 (Prueba manual) Con el campo de porcentaje vacío, tipear un precio
      de venta sin costo cargado y confirmar que el costo se calcula usando
      el default (35% u override) en vez de no calcular nada.
- [x] 6.13 (Prueba manual) Operar los campos de costo, porcentaje y precio
      sólo con teclado, incluyendo el caso de cálculo inverso, confirmando
      que el foco nunca se mueve por un recálculo automático.
- [x] 6.14 (Prueba manual) Confirmar en 320px de ancho que el formulario no
      produce scroll horizontal ni recorta el layout existente (sin campos
      nuevos agregados por esta extensión).
- [x] 6.15 (Inspección) Revisar el payload real enviado (Network tab o log)
      al crear y al editar un producto, confirmando que no incluye ningún
      campo de porcentaje, incluyendo el caso donde el costo se estimó hacia
      atrás (el costo sí viaja en el payload, como cualquier costo tipeado a
      mano; sólo el porcentaje queda fuera).
- [x] 6.16 (Prueba manual) Con `NEXT_PUBLIC_DEFAULT_MARGIN_PERCENT` seteada en
      `.env.local` a un valor distinto de 35 (por ejemplo `40`), confirmar
      que el formulario usa ese valor como default en alta, en el fallback de
      edición con costo vacío, y como percent efectivo del cálculo inverso.

## 7. Cierre (sujeto a decisión del usuario)

- [ ] 7.1 Sincronizar specs (`openspec archive` o equivalente) sólo cuando el
      usuario lo pida explícitamente después de implementar y verificar.
