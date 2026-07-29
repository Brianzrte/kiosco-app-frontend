# Checklist — Revisión de accesibilidad

Referencia: WCAG 2.2 AA + ARIA APG (`../references/accessibility.md`).

**No hay tests automáticos de accesibilidad en este repo.** Todo lo de acá es
verificación manual y se reporta como tal. Un ítem sin verificar es
`Not evaluated`, nunca aprobado.

Severidad por defecto: los ítems de **Obligatorio** son `HIGH`; si impiden
completar la tarea, `BLOCKER`.

---

## Obligatorio — WCAG 2.2 AA

### Contraste

- [ ] Texto normal ≥ 4.5:1 contra su fondo real (medido, no estimado).
- [ ] Texto grande (≥ 24 px, o ≥ 18.66 px bold) ≥ 3:1.
- [ ] Iconos y bordes que transmiten información ≥ 3:1.
- [ ] El indicador de foco ≥ 3:1 contra el fondo adyacente.
- [ ] Texto secundario sobre `surface-2` y pasteles: medido explícitamente.
- [ ] Ningún color de estado (`success`, `warning`) usado como color de texto
      sobre blanco.

### Foco

- [ ] Todo control interactivo muestra foco visible.
- [ ] No hay ningún `outline: none` sin reemplazo equivalente.
- [ ] El elemento enfocado no queda tapado por header sticky, footer fijo ni
      overlay (2.4.11).
- [ ] El orden de foco coincide con el orden visual y funcional (2.4.3).
- [ ] No hay ningún `tabindex` positivo.

### Nombres y etiquetas

- [ ] Todo control tiene nombre accesible (4.1.2).
- [ ] Todo campo tiene `<label>` visible y clickeable (3.3.2).
- [ ] Ningún placeholder hace de label.
- [ ] El nombre accesible contiene el texto visible (2.5.3).
- [ ] `aria-label` sólo donde no hay texto visible posible.
- [ ] Los botones sólo-icono tienen nombre accesible en el botón.

### Semántica

- [ ] Un `<main>` por página.
- [ ] Un solo `<h1>`: el título de la pantalla.
- [ ] Los niveles de heading no se saltan.
- [ ] Las tablas de datos son `<table>` con `<th scope="col">`.
- [ ] `<nav>`, `<header>`, `<footer>` usados donde corresponde.
- [ ] Ningún `<div role="button|table|dialog|link">` donde hay elemento nativo.
- [ ] Ningún ARIA que contradiga la semántica nativa.

### Teclado

- [ ] Toda funcionalidad se opera con teclado (2.1.1).
- [ ] No hay trampas de foco fuera de un modal legítimo (2.1.2).
- [ ] Detalle completo: `keyboard-review.md`.

### Errores y formularios

- [ ] El error se identifica en texto, junto al campo (3.3.1).
- [ ] El mensaje dice cómo resolver el problema (3.3.3).
- [ ] El campo con error lleva `aria-invalid="true"`.
- [ ] El campo con error lleva `aria-describedby` apuntando al mensaje.
- [ ] Ningún error se comunica sólo con borde rojo.
- [ ] Los campos obligatorios están marcados de forma consistente.

### Regiones vivas

- [ ] Los errores llevan `role="alert"`.
- [ ] Las confirmaciones llevan `role="status"` / `aria-live="polite"`.
- [ ] El total y los conteos que cambian llevan `aria-live="polite"`.
- [ ] El contenedor de la región viva existe en el DOM antes que el contenido.
- [ ] No se usa `aria-live="assertive"` para algo no urgente.

### Zoom y reflow

- [ ] Zoom del navegador al 200 % sin pérdida de contenido ni funcionalidad
      (1.4.4).
- [ ] Reflow a 320 px sin scroll horizontal de página (1.4.10).
- [ ] No hay `user-scalable=no` ni `maximum-scale=1`.

### Targets

- [ ] Todo target ≥ 24 × 24 px, o con separación equivalente (2.5.8).
- [ ] Acciones frecuentes de POS ≥ 44 px.
- [ ] Acciones táctiles ≥ 44 px con ≥ 8 px de separación.

### Color y movimiento

- [ ] Ninguna información esencial depende sólo del color (1.4.1).
- [ ] Verificado con filtro de escala de grises.
- [ ] `prefers-reduced-motion` respetado (2.3.3).
- [ ] Nada parpadea más de 3 veces por segundo.
- [ ] Nada se mueve o auto-actualiza > 5 s sin poder pausarse (2.2.2).
- [ ] Ninguna funcionalidad depende sólo de hover.

---

## Recomendado

- [ ] Foco inicial deliberado en las pantallas de trabajo.
- [ ] Foco devuelto al disparador al cerrar cada overlay.
- [ ] `autocomplete` en los campos de identidad.
- [ ] `lang="es"` en `<html>`.
- [ ] El `<title>` de la página nombra la pantalla.
- [ ] `alt=""` explícito en imágenes decorativas.
- [ ] `<fieldset>` + `<legend>` en grupos de radios o checkboxes.
- [ ] `aria-current="page"` en el ítem de navegación activo.
- [ ] Los skeletons llevan `role="status"` o `aria-hidden` según corresponda.
- [ ] `aria-busy="true"` en la región que se está cargando.
- [ ] Skip link cuando la navegación es larga.

## Avanzado

- [ ] Probado con NVDA + Firefox o VoiceOver + Safari.
- [ ] Navegación por landmarks y por headings con el rotor del lector.
- [ ] Verificado en modo de alto contraste (`forced-colors`).
- [ ] Contraste AAA (7:1) en texto denso de lectura sostenida.

---

## Procedimiento de verificación

Ejecutar en este orden y anotar el resultado de cada paso:

1. **Teclado** — guardar el mouse; recorrer el flujo completo. Anotar cada punto
   donde el foco se pierde, salta o se vuelve invisible.
2. **Zoom 200 %** en 1280 × 720; después reflow a 360 px.
3. **Contraste** — medir con DevTools cada par dudoso; anotar los ratios.
4. **Sin color** — DevTools → Rendering → *Emulate vision deficiencies* →
   Achromatopsia. Recorrer la pantalla y comprobar que todo estado siga legible.
5. **Reduced motion** — DevTools → Rendering → `prefers-reduced-motion: reduce`.
   Repetir el flujo.
6. **Lector** — sólo si se va a afirmar algo sobre lectores.

## Cómo reportar

**Nunca** escribir "la pantalla es accesible". Escribir qué se probó y con qué
resultado:

```markdown
Verificado manualmente:
- Recorrido completo con teclado (Tab/Enter/Escape) en 1280 × 720 — OK salvo A11Y-02.
- Contraste medido en 6 pares de color — 1 falla (A11Y-01: 3.1:1 en el hint).
- Escala de grises — OK.
- Reduced motion emulado — OK.

Not evaluated:
- Lector de pantalla (no se ejecutó).
- Zoom 200 % (no se ejecutó).
```
