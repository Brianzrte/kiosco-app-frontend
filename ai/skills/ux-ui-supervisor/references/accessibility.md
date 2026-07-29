# Accesibilidad

Referencia normativa: **WCAG 2.2 nivel AA** + WAI-ARIA Authoring Practices Guide
(`sources.md`).

Los requisitos están separados en tres niveles. Un hallazgo de nivel
**obligatorio** es como mínimo `HIGH`; si impide completar la tarea, `BLOCKER`.

---

## Nivel 1 — Obligatorio (WCAG 2.2 AA)

### Contraste de texto (1.4.3)

| Caso | Ratio mínimo |
|---|---|
| Texto normal (< 18.66 px, o < 24 px si no es bold) | **4.5:1** |
| Texto grande (≥ 24 px, o ≥ 18.66 px bold) | **3:1** |
| Iconos y bordes que transmiten información (1.4.11) | **3:1** |
| Indicador de foco contra el fondo adyacente | **3:1** |
| Texto deshabilitado | Exento, pero debe seguir siendo identificable |

Cómo medir: DevTools → Elements → Accessibility → *Contrast*, o el color picker
de Chrome, que reporta el ratio y marca AA/AAA. Un hallazgo de contraste **cita
el ratio medido**, no la impresión.

En este repo: `text-text-secondary` (`#6b7280`) sobre `surface` (`#ffffff`) da
≈ 4.8:1 → válido para body. Sobre `surface-2` (`#f0d9e3`) baja a ≈ 4.1:1 → **no
válido** para texto normal. Ese es el error de contraste más frecuente acá:
texto secundario sobre superficie pastel.

### Foco visible (2.4.7 / 2.4.11 Focus Not Obscured)

- El foco es visible en **todo** control interactivo. `globals.css` define
  `:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px }`.
- **Nunca** `outline: none` sin reemplazo equivalente. Si un componente lo
  quita, es un hallazgo `HIGH` por sí solo.
- El elemento enfocado no queda tapado por un header sticky, un footer fijo ni
  un dialog. Verificación: tabular hasta el último control con la página
  scrolleada.

### Orden de foco (2.4.3)

El orden de tabulación coincide con el orden visual y lógico. Se rompe cuando:

- se reordena visualmente con `order`, `flex-direction: row-reverse` o `grid`
  sin reordenar el DOM;
- se inserta un control al final del DOM y se posiciona arriba;
- se usa `tabindex` positivo (**nunca** usar `tabindex > 0`).

`tabindex="0"` para hacer focusable algo que no lo es, `tabindex="-1"` para
enfocar por script. Nada más.

### Nombre accesible (4.1.2) y etiquetas (3.3.2)

- Todo control tiene nombre accesible. En orden de preferencia:
  1. `<label for>` visible — el default;
  2. contenido de texto del propio elemento (un `<button>Guardar</button>`);
  3. `aria-labelledby` apuntando a un texto visible;
  4. `aria-label` — **último recurso**, sólo cuando no hay texto visible posible
     (un botón que es sólo un icono).
- `Input` y `Select` de este repo ya asocian `label` por `id`/`htmlFor` con
  `useId`. El defecto aparece cuando alguien escribe un `<input>` suelto.
- **Label visible en el que se puede clickear.** Un placeholder no es un label
  (`forms-validation.md`).
- 2.5.3 *Label in Name*: el nombre accesible **contiene** el texto visible. Un
  botón que dice "Confirmar venta" no puede tener `aria-label="Enviar"`: rompe
  el control por voz.

### Navegación por teclado (2.1.1 / 2.1.2)

Toda funcionalidad se opera con teclado, y no existe trampa de foco fuera de un
modal legítimo. Detalle completo en `navigation-keyboard.md`.

### Semántica: landmarks y headings (1.3.1)

- Un `<main>` por página. `<nav>` para la navegación, `<header>`, `<footer>`.
  Si hay dos `<nav>`, se distinguen con `aria-label`.
- Un solo `<h1>` por página: el título de la pantalla. Los niveles no se saltan
  (`h1 → h2 → h3`); el nivel se elige por estructura, el tamaño por token.
- Una tabla de datos es `<table>` con `<th scope="col">`. Un `<div>` con
  `role="table"` es un downgrade sin motivo.

### Mensajes de error (3.3.1 / 3.3.3)

- El error se identifica **en texto**, junto al campo, y dice cómo resolverlo.
- El campo lleva `aria-invalid="true"` y `aria-describedby` apuntando al mensaje.
- El error nunca se comunica sólo por borde rojo.

### Regiones vivas (4.1.3)

Un cambio de estado que no recibe el foco se anuncia:

| Caso | Marcado |
|---|---|
| Confirmación de éxito (toast) | `role="status"` / `aria-live="polite"` |
| Error que interrumpe | `role="alert"` (implica `assertive`) |
| Resultado de búsqueda / conteo | `aria-live="polite"` en el contenedor del conteo |
| Total actualizado | `aria-live="polite"` |

`ErrorState` ya lleva `role="alert"`. El contenedor de la región viva debe estar
en el DOM **antes** de que llegue el contenido; si se monta junto con el
mensaje, muchos lectores no lo anuncian.

Nunca `aria-live="assertive"` para algo no urgente: interrumpe la lectura en
curso.

### Zoom y reflow (1.4.4 / 1.4.10)

- Zoom del navegador al **200 %** sin pérdida de contenido ni funcionalidad.
- Reflow a **320 px CSS** de ancho sin scroll horizontal de página (una tabla
  puede scrollear dentro de su contenedor; la página no).
- Nunca `user-scalable=no` ni `maximum-scale=1`.
- Texto en unidades relativas donde el usuario pueda escalarlo.

### Tamaño de target (2.5.8, AA)

Mínimo **24 × 24 px** CSS, o separación equivalente entre targets. Es el piso
legal; el piso de diseño en este producto es mayor:

| Contexto | Recomendado |
|---|---|
| Acción frecuente en POS | 44–48 px |
| Acción normal en escritorio | 36–44 px |
| Acción en fila de tabla densa | 32 px con 8 px de separación |

El **área interactiva** puede ser mayor que el dibujo: un icono de 20 px dentro
de un botón de 44 px cumple.

### No sólo color (1.4.1)

Ningún dato esencial se comunica únicamente por color. En este repo `Badge`
siempre lleva texto; el riesgo está en filas o celdas coloreadas sin etiqueta y
en gráficos sin etiqueta directa.

### Movimiento (2.3.3 / 2.2.2)

- `prefers-reduced-motion: reduce` respetado (`motion.md`).
- Nada parpadea más de 3 veces por segundo.
- Nada que se mueva, parpadee o auto-actualice por más de 5 s sin poder pausarse.
- La animación de un overlay (`AnimatePresence`, `Dialog`) **no retrasa la
  restauración del foco**: el foco vuelve al disparador como parte del cierre,
  no cuando termina la animación de salida (`motion.md`, sección
  `AnimatePresence`).
- El anuncio accesible (`aria-live`, `role="alert"`/`role="status"`) es una
  responsabilidad **separada** de la animación visual. Un cambio importante se
  anuncia igual con `prefers-reduced-motion: reduce` activo, aunque la
  animación no corra.
- `useAutoAnimate` no reemplaza `aria-live`: no anuncia nada por sí mismo
  (`motion.md`, sección *AutoAnimate*, *Limitaciones*).

---

## Nivel 2 — Buenas prácticas recomendadas

- **Skip link** al contenido principal cuando la navegación tiene muchos ítems.
  Con `Nav` actual (lista corta) no es obligatorio, pero suma.
- `lang="es"` en `<html>` — ya está en `app/layout.tsx`.
- `autocomplete` en campos de identidad (`username`, `current-password`).
- El `<title>` de cada página nombra la pantalla, no sólo la app.
- Foco inicial explícito al entrar a una pantalla de trabajo (el POS enfoca el
  campo de escaneo).
- Foco devuelto al disparador al cerrar un overlay
  (`navigation-keyboard.md`).
- Textos alternativos: `alt=""` para imágenes decorativas (no `alt` ausente).
- Un `<fieldset>` + `<legend>` para grupos de radios o checkboxes relacionados.
- Los skeletons llevan `role="status"` o `aria-hidden` según su función.

## Nivel 3 — Mejoras avanzadas

- Probar con lector real: NVDA + Firefox, o VoiceOver + Safari. Es la única
  forma de afirmar "funciona con lector"; sin esa prueba, no se afirma.
- Modo de alto contraste de Windows (`forced-colors`): comprobar que los bordes
  no desaparezcan.
- Navegación por landmarks y por headings con el rotor del lector.
- Contraste AAA (7:1) para texto denso de lectura sostenida.

---

## Preferir HTML nativo sobre ARIA

**Regla 1 de ARIA: no usar ARIA si hay un elemento HTML que ya lo hace.** Un
`<button>` nativo trae rol, foco, activación por Enter y Space, y estado
deshabilitado. Un `<div role="button" tabindex="0">` requiere reimplementar todo
eso y casi siempre le falta algo.

| No hagas | Hacé |
|---|---|
| `<div role="button" tabindex="0">` | `<button type="button">` |
| `<div role="dialog">` + focus trap propio | `<dialog>` + `showModal()` (ya es el `Dialog` del repo) |
| `<div role="table">` | `<table>` |
| `<span role="checkbox">` | `<input type="checkbox">` |
| `<div role="link">` | `<a href>` / `<Link>` |
| `aria-label` sobre texto visible | `<label for>` |

ARIA correcto y necesario: `aria-live`, `aria-invalid`, `aria-describedby`,
`aria-expanded`, `aria-controls`, `aria-current="page"`, `aria-activedescendant`
en un combobox, `aria-busy` durante una carga.

**ARIA mal puesto es peor que nada**: un rol equivocado le miente al lector y
oculta la semántica nativa.

---

## Cómo verificar (y cómo no)

En este repo **no hay tests automáticos de accesibilidad** — no hay jsdom,
Testing Library ni axe. Todo lo de abajo es manual, y así se reporta.

Rutina mínima antes de afirmar algo:

1. **Teclado**: recorrer la pantalla completa sólo con Tab / Shift+Tab / Enter /
   Space / Escape / flechas. Anotar dónde se pierde el foco.
2. **Zoom 200 %** en 1280 × 720 y ancho 360 px.
3. **Contraste**: medir con DevTools los pares dudosos, sobre todo texto
   secundario sobre `surface-2` y pasteles.
4. **Sin color**: filtro de escala de grises de DevTools (Rendering → Emulate
   vision deficiencies) y comprobar que todo estado sigue siendo legible.
5. **Reduced motion**: activar la emulación en DevTools (Rendering) y repetir el
   flujo.
6. **Lector** sólo si se va a afirmar algo sobre lectores.

Lo que no se probó se declara `Not evaluated`. **Nunca** se afirma "es
accesible": se afirma qué se probó y con qué resultado.
