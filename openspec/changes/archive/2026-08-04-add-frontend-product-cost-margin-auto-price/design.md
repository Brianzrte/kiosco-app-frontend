## Context

`ProductForm` (`src/components/products/ProductForm.tsx`) es un único
formulario de alta y edición de producto, usado con y sin la prop `product`.
Hoy tiene tres campos de dinero independientes — `cost`, `price` (unitario) y
`price_per_kg` (pesable) — cada uno cargado a mano, sin relación entre sí en
el cliente. El payload que se envía a `POST /api/v1/products` y
`PUT /api/v1/products/{id}` es `sku`, `barcode`, `name`, `category_id`,
`unit_type`, `price`, `price_per_kg`, `cost`; el backend no tiene ni va a
tener un campo de porcentaje de ganancia (confirmado por grep en el modelo y
por la decisión de negocio ya validada con el usuario).

El patrón de referencia más cercano es el change archivado
`add-frontend-estimated-product-margins`, que muestra en `/reports/products`
un margen calculado **por el backend** (`margin`, `margin_estimated`). Este
change es distinto: el margen que se muestra en `ProductForm` es enteramente
derivado en el cliente a partir de `cost` y `price`/`price_per_kg`, nunca leído
ni enviado al backend, y vive sólo mientras el formulario está abierto.

## Goals / Non-Goals

**Goals:**

- Reducir el trabajo manual de calcular el precio de venta a partir del costo
  y un margen deseado, con un porcentaje editable que arranca en 35%.
- Cubrir también el caso inverso: cuando se conoce el precio de venta pero no
  el costo (alta rápida de stock de kiosco), estimar el costo hacia atrás a
  partir del precio y el margen vigente.
- Mantener costo, precio y porcentaje consistentes entre sí, con una única
  excepción intencional: un costo ya cargado (no-cero) nunca se pisa desde el
  precio (ver Decisions, punto 2).
- Mostrar el margen resultante (monto y porcentaje) de forma legible junto al
  precio, como texto derivado no editable.
- Que el porcentaje inicial al editar un producto existente refleje su
  costo/precio ya guardados, en vez de resetear siempre al default.
- Que el porcentaje por defecto sea configurable por variable de entorno, sin
  volver a hardcodear un valor fijo si la operación del kiosco cambia.
- No cambiar el contrato con el backend ni el payload enviado hoy.

**Non-Goals:**

- Persistir el porcentaje de ganancia en el backend.
- Cambiar `/reports/products` o cualquier cálculo de margen server-side.
- Aplicar este cálculo en POS, compras o cualquier otra pantalla.
- Agregar una configuración de porcentaje por categoría, por usuario o por
  producto — sólo una variable de entorno global.
- Ofrecer una forma de forzar el recálculo de un costo ya cargado desde el
  precio; si el costo es real, prevalece.
- Validar reglas de negocio de pricing (mínimos, máximos, políticas de
  descuento); esto es sólo una calculadora de conveniencia en el formulario.

## User flow

1. La persona abre el formulario (alta o edición).
   - **Alta:** el porcentaje arranca en el default configurado (35% salvo
     override por variable de entorno), costo y precio están vacíos.
   - **Edición:** el porcentaje inicial se deriva de `cost`/`price` (o
     `price_per_kg` si `unit_type` es `pesable`) ya guardados con
     `% = ((precio − costo) / costo) × 100`, redondeado a un entero visible.
     Si `cost` es `0` o está vacío, se usa el default como valor inicial.
2. La persona escribe o modifica el costo.
   - Si el porcentaje tiene un valor válido, el precio de venta se recalcula
     automáticamente: `precio = costo × (1 + %/100)`.
   - Si el costo queda vacío o es `0`, el precio de venta **no** se
     autocompleta ni se sobrescribe con un cálculo inválido; el margen
     derivado no se muestra (ver UI states).
3. La persona edita el porcentaje directamente.
   - El precio de venta se recalcula con la misma fórmula, usando el costo
     actual.
4. La persona edita el precio de venta a mano (en vez de tocar el costo o el
   porcentaje). El comportamiento depende de si ya hay un costo cargado:
   - **Costo ya tiene un valor no-cero:** el costo no se toca. El porcentaje
     mostrado se recalcula para reflejar ese precio manual:
     `% = ((precio − costo) / costo) × 100`, redondeado para mostrarse. Mismo
     comportamiento que hoy.
   - **Costo está vacío o en `0` (alta rápida sin costo a mano — ver Context):**
     luego de una pausa de 500 ms sin nuevas teclas y sólo cuando el precio
     tenga al menos tres dígitos, el costo se calcula hacia atrás como
     `costo = precio / (1 + %/100)`, usando el porcentaje vigente (el default
     configurado si el campo de porcentaje también está vacío o inválido),
     redondeado al centavo más cercano igual que el resto del dinero.
   - Este es el único caso en que un campo tiene "prioridad" sobre otro: un
     costo real ya tipeado nunca se pisa desde el precio (ver Decisions,
     punto 2, para el porqué).
5. El texto de margen (monto y porcentaje) se actualiza en cada uno de los
   pasos anteriores, como texto derivado.
6. Al enviar el formulario, el payload sigue siendo exactamente el de hoy; el
   porcentaje nunca se agrega al body de la request.

Este mismo flujo aplica igual para `unit_type === "unitario"` (campo `price`)
y `"pesable"` (campo `price_per_kg"`): el porcentaje y el margen se calculan
contra cualquiera de los dos que esté activo según el tipo elegido.

## UI states

- **Costo vacío o `0`, sin editar el precio todavía:** el campo de porcentaje
  se muestra editable (con su valor actual, el default por defecto), pero no
  dispara ningún recálculo de precio ni de margen. El texto de margen no se
  muestra (se omite en vez de mostrar `$ 0,00 (35%)`, que sería engañoso
  porque no hay costo real).
- **Costo vacío o `0`, y se edita el precio de venta:** al llegar a tres
  dígitos y pausar 500 ms, el costo se calcula hacia atrás (ver User flow,
  paso 4) y deja de estar vacío; a partir de ahí
  el campo de costo muestra ese valor estimado como cualquier costo tipeado a
  mano — la persona puede corregirlo si lo conoce con más precisión, y esa
  corrección vuelve a comportarse como "costo ya cargado" (prevalece).
- **Costo no numérico / inválido según el `pattern` existente
  (`\d+(\.\d{1,2})?`):** mismo tratamiento que hoy — el campo nativo bloquea
  el submit por validación HTML5; mientras el valor no matchea el patrón, no
  se dispara recálculo (se trata igual que "costo vacío" a los fines del
  cálculo derivado).
- **Costo válido y positivo, porcentaje válido:** el precio de venta se
  autocompleta o recalcula, y el texto de margen aparece con monto y
  porcentaje, p. ej. `Margen: $ 375,00 (30%)`.
- **Precio de venta editado manualmente por debajo del costo:** el porcentaje
  y el margen pueden resultar negativos; se muestran tal cual (p. ej.
  `Margen: -$ 50,00 (-5%)`), sin bloquear el campo ni el submit — esto no es
  peor que la situación actual, donde ya es posible guardar un precio menor
  al costo sin ninguna advertencia.
- **Porcentaje vacío o no numérico:** a diferencia del campo de porcentaje
  mostrado (que puede estar en blanco mientras se edita), todo cálculo que
  necesite un `%` — costo→precio o precio→costo — usa el default configurado
  (35% salvo override por variable de entorno) en su lugar; el porcentaje
  nunca es tratado como "ausente" a los fines del cálculo. El texto de margen
  se sigue mostrando en base al costo/precio actuales si ambos son válidos.

## Decisions

1. **El porcentaje vive únicamente en el estado local de `ProductForm`, no en
   `Product` ni en el payload.**
   Es la decisión de producto ya validada: el backend no tiene ni tendrá un
   campo de "porcentaje objetivo". Alternativa descartada: agregarlo al tipo
   `Product` como campo opcional sólo-frontend, descartada porque mezclaría
   un dato derivado con el modelo de dominio y podría filtrarse por error al
   payload en un refactor futuro.

2. **La relación entre costo, precio y porcentaje es bidireccional, con una
   única excepción intencional para el costo (ver Decision 7).**
   En vez de marcar un campo como fuente de verdad y freezar el porcentaje
   tras la primera edición manual del precio, cada cambio de costo o
   porcentaje recalcula el precio, y cada cambio de precio recalcula el
   porcentaje. Esto evita el caso confuso de un porcentaje mostrado que ya no
   corresponde al precio/costo visibles. Alternativa descartada: congelar el
   porcentaje una vez que el precio se edita a mano, descartada
   explícitamente por el pedido del usuario ("evitando que quede
   desincronizado"). El costo es la única excepción a esta simetría: una vez
   cargado, editar el precio no lo recalcula (Decision 7).

3. **Extraer el cálculo a funciones puras en `src/lib/`, testeadas con
   Vitest, en vez de calcular inline en el componente.**
   Sigue la convención del repo (`lib/money.ts`, `lib/reports.ts`): toda
   aritmética de dinero vive en `lib/` con tests en `environment: node`. Se
   agregan funciones puras (nombre final a definir en tasks, p. ej. en
   `src/lib/products.ts`, que ya existe como módulo de helpers de producto) que:
   - calculan el precio de venta a partir de costo + porcentaje;
   - calculan el porcentaje a partir de costo + precio;
   - calculan el monto de margen (`price − cost`) como string decimal.
   Todas usan `toCents`/`fromCents` de `lib/money.ts` para la aritmética de
   dinero, evitando floats en cualquier valor que se muestre o envíe como
   dinero. El porcentaje en sí (no es dinero) se maneja como número simple,
   redondeado sólo para mostrarse.

4. **El redondeo de precio autocalculado se hace en centavos con
   `Math.round`, igual criterio que el resto del dinero mostrado en la
   UI.**
   `precioCentavos = Math.round(costoCentavos × (1 + %/100))`. Esto es
   consistente con `formatMoney`/`fromCents`, que siempre trabajan en enteros
   de centavos, y evita acumulación de error de punto flotante en el valor
   que efectivamente se envía al backend.

5. **El porcentaje derivado de costo/precio se redondea a entero para
   mostrarse, pero el campo de porcentaje admite números enteros o con hasta
   un decimal al editarlo.**
   Mostrar un entero (`30%` en vez de `30.4%`) es más legible en un campo de
   ganancia de kiosco; permitir un decimal al editar da margen fino sin
   complejizar el input. Alternativa descartada: réplica exacta del `pattern`
   de dinero con dos decimales, descartada por ser precisión innecesaria para
   un porcentaje de conveniencia que no se persiste.

6. **Costo `0` o vacío deshabilita el auto-cálculo costo→precio en vez de
   mostrar un margen `0%`/`100%` engañoso, pero sí habilita el cálculo
   inverso precio→costo.**
   Dividir por costo `0` para obtener un porcentaje no tiene un resultado
   significativo; mostrar `100%` (o `Infinity`) sería incorrecto y confuso.
   Mientras el costo no sea un número positivo válido, el porcentaje conserva
   el último valor editado (o el default por defecto) sin disparar ningún
   recálculo de precio, y el texto de margen no se muestra — pero ese mismo
   estado ("sin costo real todavía") es exactamente el que dispara el cálculo
   inverso cuando se edita el precio (punto 7).

7. **El costo tiene prioridad sobre el precio una vez cargado: nunca se
   recalcula hacia atrás si ya tiene un valor no-cero.**
   El pedido original es específico: "no siempre se tiene a mano el precio de
   costo" al cargar productos de kiosco, lo que describe el caso costo vacío,
   no un reemplazo general de un dato ya tipeado. Alternativa descartada:
   recalcular el costo desde el precio en cualquier edición del precio
   (bidireccional total, como ya ocurre entre precio y porcentaje) —
   descartada explícitamente por el usuario porque un ajuste menor al precio
   sugerido (para redondear o afinar el margen) no debe pisar silenciosamente
   un costo real ya cargado, que además alimenta reportes de margen
   (`add-frontend-estimated-product-margins`). Esta es la única relación no
   simétrica entre los tres campos; todo el resto (costo↔precio,
   porcentaje↔precio) sigue siendo bidireccional como ya describe la
   Decision 2.

8. **El default de margen es una constante configurable por
   `NEXT_PUBLIC_DEFAULT_MARGIN_PERCENT` (o nombre equivalente final), con
   fallback a 35 si la variable no existe o no es un número finito.**
   El pedido explícito es no volver a hardcodear el valor si la operación del
   kiosco cambia de margen objetivo. Es la primera variable de entorno
   `NEXT_PUBLIC_*` del repo (sin precedente); se declara pública porque
   `ProductForm` es un client component y el valor no es sensible. Se lee una
   sola vez como constante de módulo en `lib/products.ts`, no en cada
   render. Alternativa descartada: exponerlo como configuración editable en
   la UI (por tienda o por usuario) — fuera de alcance, este kiosco es de una
   sola sucursal y el pedido fue explícitamente "variable de entorno", no una
   pantalla de configuración.

9. **El cálculo inverso espera una pausa breve y un precio mínimamente
   completo.** Se demora 500 ms desde la última tecla y requiere al menos tres
   dígitos para no completar visualmente el costo mientras la persona sigue
   ingresando el precio. Cada nueva tecla cancela el cálculo pendiente.

## Accessibility

- El campo de porcentaje es un `Input` del kit existente, con su propio
  `label` visible ("% de ganancia"), igual que los campos de dinero
  contiguos; no depende de color ni de un ícono para comunicar su propósito.
- El texto de margen derivado se asocia al campo de precio con
  `aria-describedby`, de forma que un lector de pantalla lo anuncie al llegar
  al campo de precio, igual que hace hoy `product-sku-help` con el campo de
  SKU.
- El texto de margen usa `aria-live="polite"` para que los cambios por
  recálculo (al escribir costo o porcentaje) se anuncien sin interrumpir a
  quien está tipeando, siguiendo el mismo patrón que la ayuda de SKU
  (`role="status"`, `aria-live="polite"`).
- Un margen negativo no se comunica sólo con color: el signo `-` en el monto
  y en el porcentaje es parte del texto, no un estilo aplicado
  condicionalmente.

## Keyboard and focus behavior

- El campo de porcentaje es un input de texto estándar, completamente
  operable por teclado (tab order natural entre costo, porcentaje y precio,
  sin trampas de foco).
- Ningún recálculo mueve el foco: escribir en costo, porcentaje o precio
  actualiza los otros valores sin robarle el foco al campo que la persona
  está editando.
- No se agrega ningún diálogo ni control nuevo que requiera manejo de foco
  inicial/retorno; el formulario sigue teniendo el mismo `autoFocus` inicial
  en "Nombre".

## Responsive behavior

- El nuevo campo de porcentaje se ubica en la misma grilla
  `grid-cols-1 sm:grid-cols-2` que ya usan costo y precio, sin introducir un
  layout nuevo ni scroll horizontal en 320px.
- El texto de margen es una línea de texto corta (similar a la ayuda de SKU)
  que no requiere tratamiento responsive especial: se apila igual que el
  resto del formulario en mobile.

## API contract

Sin cambios. El payload de `POST /api/v1/products` y
`PUT /api/v1/products/{id}` sigue siendo exactamente
`{ sku, barcode?, name, category_id, unit_type, price, price_per_kg?, cost }`,
como hoy en `ProductForm.submit`. El porcentaje de ganancia y el texto de
margen son puramente derivados en el cliente y nunca se agregan al body de la
request ni se leen de la response más allá de los campos `cost`/`price`/
`price_per_kg` que `Product` ya expone.

## Error handling

No se introduce ningún error nuevo de red ni de validación de servidor. Los
únicos "errores" relevantes son de entrada inválida en el cliente:

- Costo vacío/`0`/no numérico: no es un error bloqueante; el formulario sigue
  aceptando que la persona complete el costo más tarde. El `required` y el
  `pattern` existentes en el campo de costo siguen validando el submit igual
  que hoy; este change no los relaja ni los endurece.
- Porcentaje vacío/no numérico: no bloquea el submit (el porcentaje no viaja
  al backend), sólo deja de disparar recálculos hasta que vuelva a ser un
  número válido.
- Precio de venta editado por debajo del costo: no es un error, se refleja
  como margen negativo (ver UI states).

## Backend coordination

Ninguna. No hay endpoint nuevo, cambio de contrato, cambio de autorización ni
dependencia de despliegue. El backend no participa de este cálculo; por eso
no existe `backend-request.md` en este change.

## Risks / Trade-offs

- [Confusión sobre qué campo "manda"] Al ser una relación siempre
  bidireccional, alguien que edite costo y precio muy rápido en sucesión
  podría no notar en qué momento el porcentaje cambió. → El texto de margen
  se actualiza en cada cambio con `aria-live="polite"` y queda siempre
  visible junto al precio, así el estado final es verificable de un vistazo
  antes de guardar.
- [Precisión del porcentaje editado a mano] Redondear el porcentaje derivado
  a entero para mostrarlo puede no reproducir exactamente el precio si la
  persona vuelve a escribir ese porcentaje redondeado como si fuera el
  original. → Es un trade-off aceptado explícitamente: el porcentaje es una
  ayuda de conveniencia, no un dato de precisión contable; el valor que
  importa y se persiste siempre es el precio en dinero, no el porcentaje.
- [Costo `0` en productos existentes] Un producto ya guardado con `cost`
  `"0.00"` o vacío no tiene de dónde derivar un porcentaje real al abrir la
  edición. → Se usa el default como valor en ese caso, igual que en alta, en
  vez de mostrar un porcentaje sin sentido (indefinido o `100%`).
- [Costo estimado, no real] El costo calculado hacia atrás desde el precio de
  venta es una estimación basada en el margen vigente, no el costo real de
  compra — puede quedar guardado como tal si la persona nunca lo corrige. →
  Es un trade-off aceptado explícitamente por el pedido del usuario: sirve
  para altas rápidas de kiosco sin factura a mano, y el costo sigue siendo
  100% editable después; una vez editado a mano, ese valor pasa a prevalecer
  (Decision 7) y ya no se recalcula.

## Migration Plan

No aplica migración de datos ni de contrato: no hay estado persistido nuevo
y el payload no cambia. El cambio se puede desplegar de forma independiente,
sin coordinar con el backend ni con otro change frontend. La variable de
entorno es opcional: si no se setea en Vercel, el default (35) aplica sin
requerir ninguna acción de despliegue adicional.

## Rollback

Revertir el cambio en `ProductForm.tsx` (y los helpers puros agregados en
`src/lib/`) restaura el comportamiento actual de tres campos de dinero
independientes, sin ningún dato persistido que deshacer, porque el
porcentaje nunca se guardó en ningún lado. La variable de entorno, si quedó
seteada en Vercel tras un rollback, no rompe nada — simplemente deja de
leerse.

## Open Questions

Ninguna.
