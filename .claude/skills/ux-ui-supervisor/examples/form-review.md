# Ejemplo — Auditoría de un formulario

> **Ejemplo didáctico, no una auditoría del código actual.** Describe una versión
> hipotética de un formulario de alta de producto con defectos deliberados, para
> mostrar el formato y el nivel de detalle esperado. Los `archivo:línea` son
> ilustrativos. No debe citarse como evidencia sobre
> `src/components/products/ProductForm.tsx`.

---

# UX/UI Review

## Context
- Screen: `/products/new` — `src/components/products/ProductForm.tsx`
- Product type: formulario dentro de un SaaS administrativo
- Primary user: administrador (rol `admin`), entrenado, uso ocasional (varias
  altas seguidas al recibir mercadería, después nada por días)
- Main task: dar de alta un producto con sus precios y su código
- Main input method: teclado
- Evidence reviewed: `ProductForm.tsx` completo; recorrido manual con teclado en
  1280 × 720 y 360 × 800; envío con errores forzados; contraste medido en 4
  pares. **No revisado:** lector de pantalla, zoom 200 %, envío contra backend
  real (se simuló el fallo).

## Result
- Score: **58/100**
- Status: **FAIL**
- Confidence: alta (código + prueba manual completa)

| Categoría | Peso | Puntaje | Por qué |
|---|---:|---:|---|
| Eficiencia de la tarea | 25 | 10 | Se pierden los datos ante un fallo y el foco no va al error |
| Accesibilidad | 20 | 10 | Placeholders como labels y errores sin `aria-invalid`/`aria-describedby` |
| Jerarquía y claridad | 15 | 10 | Los campos no están agrupados por significado |
| Consistencia | 15 | 13 | Usa `Input` y `Button`; coherente con el resto del ABM |
| Feedback y prevención de errores | 10 | 2 | Mensajes ambiguos y submit duplicable |
| Responsive | 5 | 4 | Funciona; la segunda columna aprieta en 360 px |
| Performance y motion | 5 | 5 | Sin animaciones, sin peticiones duplicadas |
| Pulido visual | 5 | 4 | Espaciado y tokens correctos |

## Executive summary

El formulario está construido con los primitives correctos y es coherente con el
resto del ABM, pero **falla en el eje que más importa en un formulario: no
proteger el trabajo del usuario.** Un fallo de red borra todo lo cargado
(FORM-01), los mensajes no dicen cómo corregir (FORM-03), y el doble Enter puede
crear dos productos (FORM-05).

Prioridad: FORM-01 antes que nada. Después FORM-05, FORM-02 y FORM-03, que son
los que convierten un error trivial en una recarga completa del formulario.

## Blockers

- **FORM-01** — Un fallo de envío borra todos los valores cargados.

## Findings

| ID | Severity | Area | Location | Problem | Impact | Recommendation | Validation |
|---|---|---|---|---|---|---|---|
| FORM-01 | BLOCKER | estados | `ProductForm.tsx:142` | El `catch` llama a `resetForm()` | Se pierden 8 campos cargados por un error de red | No resetear nunca en el `catch`; sólo tras éxito confirmado | Forzar un fallo de red: todos los valores siguen ahí |
| FORM-02 | HIGH | accesibilidad | `ProductForm.tsx:61-88` | Cuatro campos usan `placeholder` en vez de `label` | Al escribir se pierde la referencia; el lector no anuncia de forma fiable | `label` visible en los cuatro, vía la prop `label` de `Input` | Con los 4 campos completos se puede identificar cada uno sin borrarlo |
| FORM-03 | HIGH | feedback | `ProductForm.tsx:104` | Los errores dicen "Valor inválido" | El usuario no sabe qué corregir ni con qué formato | Mensaje con qué pasó, qué se esperaba y cómo resolverlo | Ningún mensaje dice sólo "valor inválido" |
| FORM-04 | HIGH | teclado | `ProductForm.tsx:150` | Al fallar la validación el foco no se mueve | En 8 campos hay que buscar el error a ojo | Enfocar el primer campo con error al enviar | Enviar con el 5.º campo mal: el foco va al 5.º campo |
| FORM-05 | HIGH | prevención | `ProductForm.tsx:131` | Sólo se deshabilita el botón; el Enter repetido no está cubierto | Dos productos creados con el mismo código | `if (pending) return;` al inicio del handler | Enter dos veces rápido: una sola petición en Network |
| FORM-06 | MEDIUM | jerarquía | `ProductForm.tsx:55-120` | Los 8 campos van en una lista plana, con `gap-4` uniforme | No se ve qué campos se relacionan; se leen de a uno | Agrupar en Identificación / Precios / Inventario, con `gap-8` entre grupos | El espacio entre grupos es ≥ 2× el de dentro del grupo |
| FORM-07 | MEDIUM | accesibilidad | `ProductForm.tsx:112` | Los campos con error no llevan `aria-invalid` ni `aria-describedby` | El lector no asocia el mensaje con el campo | Agregar ambos en la prop `error` del primitive | El lector anuncia el error al enfocar el campo |
| FORM-08 | MEDIUM | consistencia | `ProductForm.tsx:158` | El error del backend se muestra en un toast | Se autodescarta a los 4 s y no está donde hay que corregir | Error de formulario en banner inline sobre las acciones | El error persiste hasta el próximo envío |
| FORM-09 | LOW | responsive | `ProductForm.tsx:70` | Precio de costo y de venta en dos columnas hasta 360 px | Los campos quedan de ~140 px y el label se trunca | Una columna por debajo de `sm` | En 360 × 800 los labels no se truncan |
| FORM-10 | LOW | eficiencia | `ProductForm.tsx:82` | El campo de código es `type="number"` | Trae spinners y cambia el valor con la rueda del mouse | `type="text"` + `inputmode="numeric"` | La rueda del mouse sobre el campo no cambia el valor |

### FORM-01 — Un fallo de envío borra los valores cargados

- **Severidad:** BLOCKER
- **Área:** estados
- **Ubicación:** `ProductForm.tsx:142`, dentro del `catch`
- **Problema:** el bloque `catch` llama a `resetForm()` antes de mostrar el
  error, con lo que se pierden los 8 campos cargados.
- **Evidencia:** con DevTools en modo offline, completar los 8 campos y enviar.
  El formulario queda vacío y aparece un toast con el error.
- **Impacto:** el usuario pierde entre 1 y 3 minutos de carga por un error que
  no es suyo y que se resolvía con un reintento. Al dar de alta 15 productos
  seguidos al recibir mercadería, un corte de red cuesta la sesión entera.
- **Principio:** un fallo nunca borra lo que el usuario escribió
  (`../references/forms-validation.md`).
- **Recomendación:** eliminar el reset del `catch`. El reset ocurre **sólo**
  después de un éxito confirmado. El error se muestra en un banner inline y el
  formulario queda listo para reintentar.
- **Criterio de validación:** con la red en offline, completar los 8 campos y
  enviar. Todos los valores siguen presentes y editables, y el error se ve sobre
  las acciones.

### FORM-03 — Mensajes de error ambiguos

- **Severidad:** HIGH
- **Área:** feedback
- **Ubicación:** `ProductForm.tsx:104`
- **Problema:** la validación local devuelve `"Valor inválido"` para cualquier
  campo, sin decir qué se esperaba ni cómo corregirlo.
- **Evidencia:** enviar con el precio en `0` y con el código de 11 dígitos
  produce el mismo texto en ambos campos.
- **Impacto:** el usuario prueba variantes hasta acertar. En el campo de código
  el formato no es adivinable — el error se vuelve un callejón.
- **Recomendación:** un mensaje por caso, con las tres partes:
  - precio: «El precio tiene que ser mayor que 0. Ingresá el precio de venta,
    por ejemplo 1200.50.»
  - código: «El código de barras tiene 11 dígitos y necesita 13. Revisá el
    código del envase.»

  Además: **verificar que estas validaciones existan en el backend.** Si el
  backend no las impone, hay que quitarlas del cliente, no reescribirlas — el
  cliente no agrega reglas que el backend no tiene
  (`ai/context/frontend-conventions.md`).
- **Criterio de validación:** ningún mensaje dice sólo "valor inválido"; cada
  uno nombra el valor esperado. Ninguna regla del cliente rechaza algo que el
  backend acepta.

### FORM-06 — Campos mal agrupados

- **Severidad:** MEDIUM
- **Área:** jerarquía
- **Ubicación:** `ProductForm.tsx:55-120`
- **Problema:** los 8 campos van en una lista plana con `gap-4` uniforme. No hay
  agrupación visible entre los que se relacionan.
- **Evidencia:** entre "Precio de costo" y "Precio de venta" hay el mismo
  espacio que entre "Categoría" y "Precio de costo".
- **Impacto:** el usuario lee los 8 labels en cada alta porque no puede saltar
  por bloques. En una carga de 15 productos, eso se multiplica.
- **Principio:** proximidad y agrupación; el espacio entre grupos ≥ 2× el
  espacio dentro del grupo (`../references/spacing-layout.md`).
- **Recomendación:** tres grupos con encabezado — Identificación (nombre,
  código, categoría) · Precios (costo, venta) · Inventario (stock inicial,
  mínimo, unidad). `gap-4` dentro, `gap-8` entre. **Sin cards**: el espacio y el
  encabezado ya agrupan.
- **Criterio de validación:** medido en DevTools, el espacio entre grupos es al
  menos el doble del espacio entre campos del mismo grupo. No se agregaron
  contenedores con borde.

## Visual hierarchy

El título de la pantalla y las acciones al pie están bien resueltos. Lo que
falta es el nivel intermedio: sin agrupación (FORM-06) el formulario es una
lista plana de 8 elementos iguales.

## Interaction and feedback

El botón de envío usa `pending` correctamente y muestra el spinner después del
umbral. El problema está en el canal de los errores: van a un toast (FORM-08)
en vez de quedarse donde hay que corregir, y no dicen qué corregir (FORM-03).

## Accessibility

Verificado manualmente: recorrido con teclado en 1280 × 720; contraste medido en
4 pares (todos ≥ 4.5:1); envío con errores forzados.

Fallas: placeholders como labels (FORM-02), falta de `aria-invalid` y
`aria-describedby` (FORM-07), y el foco que no se mueve al primer error
(FORM-04).

**Not evaluated:** lector de pantalla, zoom 200 %.

## Responsive behavior

Verificado en 1280 × 720 (OK) y 360 × 800 (FORM-09).
**Not evaluated:** 768 × 1024, 1024 × 768, 1920 × 1080.

El formulario tiene ancho máximo y no se estira, lo cual es correcto. El único
problema es el par de precios en dos columnas por debajo de `sm`.

## Keyboard navigation

```text
1. Carga → foco en el primer campo. OK.
2. Tab recorre los 8 campos en orden visual. OK.
3. Enter en un campo → envía el formulario. OK.
4. Enter dos veces rápido → dos peticiones. FORM-05.
5. Envío con error → el foco se queda donde estaba. FORM-04.
6. Shift+Tab recorre en orden inverso exacto. OK.
```

## States

Pending resuelto. Falta el estado de error del formulario en un lugar
persistente (FORM-08) y la preservación de valores ante fallo (FORM-01).

## Performance and motion

Sin animaciones, sin peticiones duplicadas (verificado en Network: un solo POST
por envío, salvo el caso de FORM-05). Sin layout shift.

## Positive findings

- **El orden de los campos coincide con el orden mental de la tarea**: primero
  qué es el producto, después cuánto cuesta, después cuánto hay. No sigue el
  orden de la tabla de la base, que es el error habitual.
- **Usa `Input` y `Button` del UI kit sin estilo ad-hoc**, con `label` asociado
  por `useId` en los cuatro campos que sí lo tienen.
- **El botón de envío usa `pending`** y respeta el umbral de spinner: no
  parpadea en respuestas rápidas.
- **El formulario tiene ancho máximo** y no se estira en 1920 px, que es un
  defecto frecuente y acá está bien resuelto.
- El dinero se maneja como string decimal en todo el formulario; no hay
  `parseFloat` ni aritmética con floats.

## Acceptance criteria

- [ ] Con la red en offline, enviar conserva los 8 valores cargados.
- [ ] El reset sólo ocurre después de un éxito confirmado.
- [ ] Los 8 campos tienen `label` visible y clickeable; ninguno usa placeholder
      como label.
- [ ] Ningún mensaje de error dice sólo "valor inválido".
- [ ] Cada mensaje dice qué pasó, qué se esperaba y cómo resolverlo.
- [ ] Ninguna validación del cliente rechaza algo que el backend acepta.
- [ ] Al enviar con errores, el foco va al primer campo con error.
- [ ] Los campos con error llevan `aria-invalid` y `aria-describedby`.
- [ ] Enter dos veces rápido genera una sola petición (verificado en Network).
- [ ] Los campos están en tres grupos, con espacio entre grupos ≥ 2× el interno.
- [ ] El error del backend se muestra en un banner inline que persiste hasta el
      próximo envío.
- [ ] En 360 × 800 los labels no se truncan.
- [ ] La rueda del mouse sobre el campo de código no cambia su valor.

## Deferred suggestions

- Autoguardado de borrador en `localStorage` para cargas largas. Resuelve el
  mismo riesgo que FORM-01 desde otro ángulo, pero agrega estado persistente y
  su propia complejidad de invalidación: corresponde a un change propio, no a
  esta corrección.
- Alta en lote de varios productos. Es una feature, no un arreglo.
- Sugerir la categoría según el nombre. Depende de un endpoint que no existe.
