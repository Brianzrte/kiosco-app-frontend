# Checklist — Revisión de navegación con teclado

Referencia: `../references/navigation-keyboard.md`.

**Método: guardar el mouse.** Literalmente. Recorrer el flujo completo sólo con
teclado y anotar cada punto de fricción. No hay tests automáticos de teclado en
este repo; todo esto es manual.

## Recorrido base

- [ ] El flujo principal se completa entero sin mouse.
- [ ] `Tab` recorre todos los controles interactivos.
- [ ] `Shift+Tab` recorre en orden inverso exacto.
- [ ] El orden de tabulación coincide con el orden visual y funcional.
- [ ] No hay ningún `tabindex` positivo.
- [ ] No hay controles inalcanzables por teclado.
- [ ] No hay tab stops sobre elementos no interactivos.
- [ ] Ninguna lista larga tiene un tab stop por ítem.

## Foco visible

- [ ] El foco es visible en **todos** los controles.
- [ ] Ningún `outline: none` sin reemplazo equivalente.
- [ ] El outline no queda recortado por un `overflow: hidden` del padre.
- [ ] El elemento enfocado no queda tapado por header sticky ni footer fijo.
- [ ] El foco no tiene animación de entrada.

## Foco inicial

- [ ] El foco inicial es deliberado en las pantallas de trabajo.
- [ ] En el POS, el foco arranca en el campo de escaneo.
- [ ] En un formulario de alta, el foco arranca en el primer campo.
- [ ] En una pantalla de consulta, **no** se roba el foco.
- [ ] Al abrir un diálogo de confirmación, el foco va a la opción menos
      destructiva.
- [ ] Al abrir un diálogo con formulario, el foco va al primer campo.

## Restauración del foco

El defecto más frecuente. Verificar **uno por uno**:

- [ ] Al cerrar un modal, el foco vuelve al elemento que lo abrió.
- [ ] Al cerrar un drawer o popover, el foco vuelve al disparador.
- [ ] Al agregar un ítem a una lista, el foco vuelve al campo de entrada.
- [ ] Al eliminar una fila, el foco va a la siguiente (o la anterior si era la
      última).
- [ ] Al enviar un formulario con error, el foco va al primer campo con error.
- [ ] Al completar una acción y quedarse en la pantalla, el foco es deliberado.
- [ ] **El foco nunca cae en `<body>`** después de ninguna acción.

Cómo comprobar que cayó en `<body>`: después de la acción, presionar `Tab` una
vez. Si el foco aparece en el primer control de la página, cayó en `<body>`.

## Teclas

- [ ] `Enter` activa el control por defecto / envía el formulario.
- [ ] `Space` activa botones y marca checkboxes; **no** envía el formulario.
- [ ] `Escape` cierra todo overlay: modal, drawer, dropdown, sugerencias.
- [ ] Los overlays anidados cierran de a uno con Escape, no todos juntos.
- [ ] Las flechas navegan **dentro** de listas, menús y grupos de radios.
- [ ] `Home` / `End` van al primero / último cuando la lista es larga.

## Modales y overlays

- [ ] El foco queda atrapado dentro del modal abierto.
- [ ] `Tab` en el último control vuelve al primero.
- [ ] Escape cierra el modal.
- [ ] El foco vuelve al disparador al cerrar.
- [ ] Con `dismissible={false}`, existe una salida cuando la acción termina.
- [ ] El fondo es inerte para el lector mientras el modal está abierto.

## Combobox y autocompletado

- [ ] `ArrowDown` abre la lista y va a la siguiente opción.
- [ ] `ArrowUp` va a la anterior.
- [ ] `Enter` selecciona la opción resaltada.
- [ ] `Escape` cierra la lista **y conserva** lo tipeado.
- [ ] `Home` / `End` van a la primera / última opción.
- [ ] `Tab` cierra la lista y sale del campo.
- [ ] Al abrir, ninguna opción del medio queda resaltada.
- [ ] Navegar con flechas **no** modifica el texto del input.
- [ ] La opción resaltada scrollea a la vista.
- [ ] El conteo de resultados se anuncia (`aria-live="polite"`).
- [ ] Si el foco del DOM se queda en el input, se usa `aria-activedescendant`.
- [ ] Al cerrar, el foco vuelve al campo de origen.

## Otros componentes

- [ ] Tabs: flechas entre tabs, un solo tab stop, `Tab` sale al panel.
- [ ] Menús: flechas entre ítems, Escape cierra y devuelve el foco al botón.
- [ ] Radios: flechas eligen; el grupo es un solo tab stop.
- [ ] Checkboxes: `Tab` entre ellos, `Space` marca.
- [ ] Toggles: `Space`/`Enter`, con `aria-pressed` o `aria-checked`.
- [ ] Paginación: botones normales con `aria-current="page"`.
- [ ] Tabla: los encabezados ordenables son `<button>` tabulables.
- [ ] El contenedor con scroll de la tabla es tabulable y tiene nombre accesible.

## Atajos

- [ ] Todo atajo disponible está visible en la pantalla.
- [ ] Ningún atajo pisa al navegador (`Ctrl+T/W/N/L/R/F`, `F5`, `F6`, `F11`,
      `F12`, `Alt+←`).
- [ ] Ningún atajo es una letra sola global (pisa a NVDA/JAWS).
- [ ] Un atajo de una sola tecla se puede desactivar o está acotado a un
      componente (WCAG 2.1.4).
- [ ] El atajo acelera un control visible; no lo reemplaza.

## Trampas

- [ ] No hay ningún lugar del que no se pueda salir con teclado (WCAG 2.1.2).
- [ ] Ningún widget captura las flechas sin liberar el `Tab`.
- [ ] No hay `preventDefault()` incondicional en `keydown`.

## Específico de POS

- [ ] El foco arranca en el campo de escaneo.
- [ ] Después de cada escaneo el foco vuelve al campo y el campo se limpia.
- [ ] La búsqueda manual se alcanza sin mouse.
- [ ] Los resultados se navegan con flechas y se confirman con Enter.
- [ ] Escape cierra la búsqueda y devuelve el foco al escaneo.
- [ ] Las cantidades se editan sin mouse.
- [ ] Anular una línea es alcanzable con teclado y mueve el foco deliberadamente.
- [ ] El medio de pago se elige con teclado.
- [ ] Se puede confirmar la venta sin mouse.
- [ ] Después de confirmar, el foco vuelve al campo de escaneo.
- [ ] **El flujo completo —escanear, ajustar, cobrar, confirmar, siguiente
      venta— se hace sin tocar el mouse ni una vez.**

## Cómo reportar

Registrar el recorrido real, no una conclusión:

```markdown
Recorrido con teclado en 1280 × 720 (Chrome, sin mouse):
1. Carga → foco en campo de escaneo. OK.
2. Escaneo → línea agregada, foco vuelve al campo. OK.
3. Tab → botón de búsqueda manual → Enter → abre. OK.
4. ArrowDown → resalta primera opción. OK.
5. Escape → cierra, foco vuelve al escaneo. OK.
6. Anular línea con Enter → el foco cae en <body>. **KBD-01 (HIGH)**.

Not evaluated: confirmación de venta (requiere backend disponible).
```

Un flujo que no se puede completar sin mouse es `BLOCKER` en el POS y `HIGH` en
el resto.
