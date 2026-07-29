# Formularios y validación

Un formulario es el lugar donde el usuario **puede perder trabajo**. Todo lo de
acá se ordena por ese riesgo.

## Estructura de un campo

```text
Label visible          ← siempre, arriba del campo, clickeable
[ input             ]
Hint / formato         ← opcional, debajo, gris
Mensaje de error       ← reemplaza o acompaña al hint, en el mismo lugar
```

- **Label arriba**, no a la izquierda: sobrevive a cualquier ancho, no necesita
  alinear dos columnas y no se rompe en móvil.
- El label es clickeable y enfoca el campo. `Input` y `Select` de este repo lo
  resuelven con `useId` + `htmlFor`.
- El **hint va separado del label**, no dentro de él. Un label de tres renglones
  deja de funcionar como etiqueta.
- El error aparece **debajo del campo**, no arriba, no en un panel lejano.

## El placeholder no es un label

Nunca. Razones concretas:

1. Desaparece al empezar a escribir: el usuario deja de saber qué campo es.
2. No se puede revisar el formulario completo antes de enviarlo.
3. El contraste de un placeholder suele estar por debajo de 4.5:1.
4. Algunos lectores no lo anuncian de forma consistente.
5. Un campo con placeholder parece ya completado.

El placeholder sirve **sólo** para un ejemplo de formato, y aún así el hint es
mejor porque no desaparece:

```text
Label:       Código de barras
Hint:        13 dígitos, sin espacios
Placeholder: 7791234567890        ← aceptable, pero redundante con el hint
```

## Agrupación

- **Una columna.** Salvo pares cortos y genuinamente relacionados (ciudad +
  código postal, cantidad + unidad). Dos columnas de campos largos duplican los
  errores de recorrido y rompen el orden de foco al angostar.
- Los grupos se separan por espacio (`gap-8`), con un encabezado si tienen
  nombre propio. No hace falta una `Card` por grupo
  (`spacing-layout.md`).
- El orden es el orden mental de la tarea, no el orden de la tabla de la base de
  datos.
- Los campos relacionados van juntos: precio de costo y precio de venta,
  contraseña y confirmación.
- El ancho del campo sugiere el largo del dato: un campo de cantidad de 600 px
  miente sobre lo que se espera.
- Un `<fieldset>` + `<legend>` para grupos de radios o checkboxes.

## Cuándo validar

| Momento | Qué validar |
|---|---|
| Mientras escribe | **Nada.** Marcar en rojo un email a medio tipear es hostil |
| Al salir del campo (`blur`) | Formato y obligatoriedad de **ese** campo |
| Mientras corrige un campo ya marcado | Sí: quitar el error apenas se vuelve válido |
| Al enviar | Todo, y enfocar el primer error |
| Después de la respuesta del servidor | Errores que sólo el backend conoce |

La asimetría importa: **se marca tarde y se desmarca temprano.** Se avisa al
salir del campo, y se quita el error apenas el valor es válido, sin esperar a
otro blur.

Excepción: un campo con restricción dura y visible (largo máximo, cantidad
contra stock) puede avisar mientras se escribe, porque el aviso es informativo,
no un reproche.

## Mensajes de error

Un mensaje útil dice tres cosas:

1. **Qué pasó.**
2. **Qué se esperaba.**
3. **Cómo resolverlo.**

Prohibidos:

```text
Valor inválido
Ha ocurrido un error
Campo incorrecto
Error de validación
Datos incorrectos
```

Ejemplos correctos en el dominio de Mini Moni:

| Mal | Bien |
|---|---|
| "Valor inválido" | "El precio tiene que ser mayor que 0. Ingresá el precio de venta, por ejemplo 1200.50." |
| "Campo incorrecto" | "El código de barras tiene 11 dígitos y necesita 13. Revisá el código del envase." |
| "Error" | "Ya existe un producto con ese código de barras. Buscalo en Productos o usá otro código." |
| "Cantidad inválida" | "Sólo hay 3 unidades disponibles de \"Alfajor Jorgito\"." |

Reglas de este proyecto:

- **El mensaje del backend se muestra tal cual** (`(e as ApiError).message`). No
  se reescribe, no se traduce, no se le inventa copy encima
  (`ai/context/frontend-conventions.md`).
- **No se agregan reglas de validación en el cliente que el backend no impone.**
  Una validación de más rechaza un dato que el sistema aceptaría.
- Español rioplatense, sentence case, voz activa: "Revisá el código", no
  "Verifique el código".
- Nunca se culpa al usuario: "El código no coincide con ningún producto", no
  "Ingresaste mal el código".

## Dónde va el error

| Tipo | Lugar |
|---|---|
| Error de un campo | **Inline, debajo del campo**, con `aria-invalid` + `aria-describedby` |
| Error del formulario completo | Banner arriba de las acciones (`formError` local) |
| Error de red o del servidor | Banner del formulario, con la acción de reintentar |
| Confirmación de éxito | Toast |

**El toast no reporta errores de campo** (`ai/context/frontend-conventions.md`).
Un toast se autodescarta a los 4 s y no está donde hay que corregir: el usuario
lee el error, se va, y ya no lo tiene. Los toasts confirman éxito.

## Resumen de errores

Cuando el formulario es largo (> 8 campos) o el envío falla con varios errores,
además del error inline conviene un resumen arriba de las acciones:

- Encabezado: "No se pudo guardar. Revisá 2 campos."
- Lista de enlaces al `id` de cada campo con error.
- El foco va al resumen al aparecer, y lleva `role="alert"`.

Con formularios cortos —los de este repo— el resumen sobra: alcanza con enfocar
el primer campo con error.

## Preservación de valores

**Regla dura: un fallo nunca borra lo que el usuario escribió.**

- Un error de validación conserva todos los valores.
- Un error de red conserva todos los valores.
- Un `403`/`401` conserva todos los valores. Si hay que reautenticar, al volver
  el formulario sigue completo.
- Un campo que falla no se limpia "para que lo escriba de nuevo".
- El reset sólo ocurre después de un **éxito confirmado**.

Excepción legítima: después de confirmar una venta, el POS limpia el carrito
para empezar la siguiente — es el resultado deseado de un éxito.

Perder un formulario cargado es `BLOCKER`: es pérdida de trabajo del usuario.

## Estados de carga y envío

- El submit se deshabilita mientras hay una petición en vuelo
  (`<Button pending={pending}>`).
- El spinner aparece después de `MOTION.spinnerDelay` (400 ms) para no
  parpadear.
- Los campos **no** se deshabilitan durante el envío: si falla, el usuario ya
  puede estar corrigiendo.
- El texto del botón puede cambiar ("Guardando…"), pero el ancho no debería
  saltar.

## Prevención de doble submit

Un doble clic en "Confirmar venta" puede generar dos ventas. En orden de
robustez:

1. **Deshabilitar el botón** apenas empieza el envío — `pending` lo hace.
2. **Guardar el estado en vuelo** (`pending`) y devolver temprano en el handler:
   `if (pending) return;`. Cubre el Enter repetido, que no pasa por el clic.
3. **Bloquear el diálogo** con `dismissible={false}` mientras la acción está
   pendiente, para que no se cierre a medias.
4. Idempotencia del lado del backend cuando la operación es crítica — no es
   decisión de UI, pero se reporta como riesgo si no existe.

Sólo (1) es insuficiente: entre el clic y el re-render hay una ventana real.

## Disabled vs readonly

| | `disabled` | `readonly` |
|---|---|---|
| Recibe foco | No | Sí |
| Se copia | No | Sí |
| Se envía en el form | **No** | Sí |
| Lo lee el lector al tabular | No (se saltea) | Sí |
| Cuándo | La acción no está disponible | El valor existe pero no se edita acá |

Un campo calculado (un subtotal) va `readonly`, no `disabled`: el usuario tiene
que poder leerlo, copiarlo y que el lector lo anuncie.

**Un botón deshabilitado debe explicar por qué.** Un "Confirmar venta" gris sin
explicación deja al usuario sin saber qué falta. Alternativas, mejores que
deshabilitar: dejarlo habilitado y mostrar el error al intentar, o poner un
texto adyacente ("Agregá al menos un producto").

## Formatos, máscaras y autocomplete

- **Aceptar el formato que la gente escribe**, y normalizar en el cliente:
  espacios de más, guiones en un código, coma o punto decimal.
- Una máscara que impide escribir es peor que una que formatea al salir.
- El dinero en este proyecto es **string decimal** de punta a punta
  (`"1200.50"`); nunca `parseFloat`, nunca sumar con `+`. El display siempre por
  `formatMoney`. Un campo de monto acepta lo tipeado y normaliza al salir.
- `inputmode="decimal"` para montos, `inputmode="numeric"` para cantidades.
  `type="number"` trae spinners y un comportamiento de rueda del mouse
  indeseable en un campo de dinero.
- `autocomplete` en campos de identidad: `username`, `current-password`,
  `new-password`. Bloquear el autocompletado del navegador en un login es
  hostilidad, no seguridad.
- Los campos obligatorios se marcan **en el label**, de forma consistente. Si
  casi todos son obligatorios, marcar los **opcionales** es más corto y más
  claro. `required` en el input, y que la marca visual no sea sólo un asterisco
  rojo sin leyenda.

## Ayuda contextual

- El hint va **antes** de que el usuario se equivoque, no después.
- Cerca del campo, no en un tooltip que hay que descubrir.
- Corto: una línea. Si necesita un párrafo, el campo está mal diseñado o mal
  nombrado.
- Un ejemplo del valor esperado rinde más que una descripción de la regla.

## Recuperación de errores

Después de un error, el usuario tiene que poder terminar la tarea:

- El primer campo con error recibe el foco al enviar.
- Los valores se conservan (arriba).
- El error del campo se limpia apenas el valor es válido.
- Un error de red ofrece reintentar sin recargar la página.
- Un error irrecuperable ofrece una salida clara (volver, cancelar) — no deja al
  usuario en un callejón.

## Checklist de formularios para una revisión

- [ ] Todos los campos tienen label visible y clickeable.
- [ ] Ningún placeholder hace de label.
- [ ] Una sola columna, salvo pares cortos y relacionados.
- [ ] El ancho del campo sugiere el largo del dato.
- [ ] No hay validación agresiva mientras se escribe.
- [ ] El error se quita apenas el valor es válido.
- [ ] Cada mensaje dice qué pasó, qué se esperaba y cómo resolverlo.
- [ ] Ningún mensaje dice sólo "valor inválido" o "ha ocurrido un error".
- [ ] El error del backend se muestra tal cual.
- [ ] No hay validaciones de cliente que el backend no imponga.
- [ ] El error de campo va inline; el toast queda para el éxito.
- [ ] `aria-invalid` + `aria-describedby` en los campos con error.
- [ ] Los valores se conservan ante cualquier fallo.
- [ ] El submit se deshabilita durante el envío.
- [ ] Hay guarda contra doble submit además del botón deshabilitado.
- [ ] Los campos no se deshabilitan durante el envío.
- [ ] `readonly` (no `disabled`) en campos calculados que hay que leer.
- [ ] Todo botón deshabilitado explica qué falta.
- [ ] `inputmode` correcto en montos y cantidades.
- [ ] `autocomplete` presente en los campos de identidad.
- [ ] Los obligatorios están marcados de forma consistente.
- [ ] Al enviar con errores, el foco va al primer campo con error.
