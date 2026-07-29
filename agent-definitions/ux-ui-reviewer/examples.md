# Ejemplos — `ux-ui-reviewer`

Casos de referencia para probar activación, selección de modo y límites del
agente. No son transcripciones reales; muestran la forma esperada de la
interacción.

## Caso 1 — Fix visual chico

**Problema:** "El total de la venta aparece desplazado verticalmente en
`/pos`."

**Flujo esperado:**

```text
audit  → localizar el componente (SaleSummary o similar dentro de PosView),
         confirmar la causa con evidencia (código + captura si hay servidor
         corriendo), un finding LOW o MEDIUM según el impacto real
fix    → cambio mínimo de espaciado/alineación con tokens existentes, sin
         tocar layout general del POS
verify → confirmar en los tres viewports de referencia del POS
         (1024×768, 1280×720, 1366×768), reportar RESOLVED con evidencia
```

Si el cambio es tan chico y su alcance tan inequívoco como para no ameritar
tres reportes separados, igual se declaran las tres fases — no se colapsan en
un solo párrafo sin evidencia por fase.

## Caso 2 — Combobox accesible

**Problema:** "El buscador manual del POS no permite seleccionar productos
con flechas."

**`audit` debe verificar concretamente:**

- `ArrowDown` / `ArrowUp` mueven la opción activa.
- `Enter` selecciona la opción activa.
- `Escape` cierra sin seleccionar y no pierde el texto tipeado si corresponde.
- La opción activa es visible (no sólo por color) y accesible por
  `aria-activedescendant` o el patrón equivalente que ya use el UI kit.
- El foco vuelve a un lugar sensato después de seleccionar (no se pierde en
  el documento).
- Compatibilidad con el lector de código de barras: un scan no debe abrir el
  combobox en un estado inconsistente.

**`fix`** implementa el patrón de teclado sobre el primitive existente del UI
kit si ya soporta un combobox — no crea uno nuevo sin antes comprobar que no
existe. **`verify`** repite cada interacción de la lista de arriba de forma
independiente, no confía en el resumen del fix.

## Caso 3 — Stock

**Problema:** "La cantidad puede superar el inventario disponible."

Este caso obliga a diferenciar capas antes de tocar código:

| Capa | Responsabilidad |
|---|---|
| Restricción visual | Deshabilitar/limitar el input cuando se conoce el stock |
| Validación frontend | Mensaje inmediato si se supera — UX, no la fuente de verdad |
| Validación backend | La real; el frontend nunca la reemplaza |
| Caso concurrente | Dos cajeros vendiendo el mismo ítem al mismo tiempo — el backend decide, el frontend maneja el error `409`/`422` que vuelva |

`ux-ui-reviewer` implementa la restricción visual y el mensaje si están dentro
del alcance UX, pero si la validación real no existe en el backend, no la
simula como si bastara: lo documenta como `Backend dependency`, usa
`backend-request.md` si el change lo permite, y deja ese punto como pendiente
explícito en el `Fix Report`, no como resuelto.

## Caso 4 — Rediseño grande

**Problema:** "Rediseñar completamente la pantalla de ventas."

```text
discover → clasificar como operational-pos, usuario cajero, tarea principal
           "cobrar rápido sin error", riesgos, restricciones técnicas,
           componentes existentes reutilizables
design   → Design Proposal completa (layout, jerarquía, estados, teclado,
           responsive, accesibilidad, criterios de aceptación)
         → SE DETIENE. No implementa sin aprobación humana explícita.
```

Sólo después de que una persona apruebe la propuesta, el trabajo continúa con
`frontend-implementer` (o con este agente en modo `fix`, si la aprobación
autoriza explícitamente que lo implemente).

## Caso 5 — Pre-merge

**Pedido:** "Cerramos el change `add-frontend-user-roles-and-receiving`,
hacé la revisión UX/UI."

**Debe mostrarse en la salida:**

1. Lectura de `proposal.md`, `design.md`, delta specs y `tasks.md` del change.
2. `git diff --stat` del change para ubicar las pantallas tocadas.
3. Validaciones relevantes ejecutadas (no la suite completa si no hace falta)
   con comando, motivo y resultado.
4. Hallazgos con los nueve campos, separados en blocking / non-blocking.
5. Cobertura de accesibilidad, responsive, teclado, estados y tests.
6. Un `Result` de `PASS`, `PASS WITH OBSERVATIONS`, `FAIL` o `BLOCKED`.
7. `Handoff to closing agent`: el resultado se entrega a `change-closer`, sin
   archivar, sin commitear y sin ejecutar el cierre.

## Caso 6 — Mecanismo de motion en una lista de filtros

**Problema:** "Los chips de filtro activos aparecen y desaparecen de golpe,
sin transición."

**`audit` debe aplicar el árbol de decisión** de
`ai/skills/ux-ui-supervisor/references/motion.md` antes de recomendar nada:
¿es sólo inserción/eliminación de hijos directos, sin variants ni
coordinación con otro componente? Si sí, el mecanismo correcto es
**AutoAnimate** (`useAutoAnimate`, Nivel 3) — no Motion, que sería más
mecanismo del necesario para este caso.

**`fix`** agrega `const [parent] = useAutoAnimate()` sobre el contenedor de
chips existente, sin crear un componente nuevo genérico. Verifica que ningún
otro mecanismo (una layout animation de Motion) esté ya controlando ese mismo
contenedor.

**`verify`** confirma con `prefers-reduced-motion` emulado (la versión
instalada de AutoAnimate lo respeta por defecto — `motion.md`, sección
*AutoAnimate*) y que la lista sigue siendo funcional si se inspecciona con la
animación desactivada.

Si el mismo pedido fuera sobre el carrito del POS, la respuesta sería otra:
`pos-patterns.md` prohíbe AutoAnimate ahí porque el orden del carrito tiene
que quedarse estable — el mecanismo correcto para el resaltado de una línea
sigue siendo `.flash` (CSS, ya implementado).

## Activación esperada

**Debe activarse para:**

- "Revisá el responsive de esta pantalla."
- "Auditá la accesibilidad del formulario de usuarios."
- "Corregí los hallazgos UX/UI del último audit."
- "Validá el teclado del buscador del POS."
- "Hacé la revisión pre-merge del frontend antes de cerrar el change."
- "Revisá si esta animación debería ser CSS, Motion o AutoAnimate."
- "Auditá el reduced motion de la pantalla de ventas."

**No debe activarse para:**

- "Optimizá esta query SQL." (backend)
- "Creá una migración." (backend)
- "Revisá la autenticación del backend." (backend)
- "Implementá un endpoint sin impacto visual." (backend, sin superficie de
  interfaz)

## Selección de modo

```text
"Analizá el requerimiento antes de implementar."      → discover
"Diseñá la pantalla de recepción de mercadería."       → design
"Revisá lo implementado en este change."               → audit
"Corregí los hallazgos HIGH y MEDIUM."                 → fix
"Comprobá que los hallazgos quedaron resueltos."       → verify
"Revisá esto antes de cerrar el change."               → pre-merge
```

## Restricciones que debe cumplir siempre

- No ejecuta `git commit`, `git push`, `git merge` ni crea una PR.
- No archiva changes de OpenSpec.
- No cambia contratos de backend en silencio: los declara como
  `Backend dependency` y usa `backend-request.md` si corresponde.
- No declara `PASS` sin evidencia — una interacción no verificable se marca
  `Not runtime verified` / `Not evaluated`, nunca se asume correcta.
- No implementa un rediseño grande sin una `Design Proposal` aprobada.
- No duplica el contenido de `ux-ui-supervisor` dentro de sus propias
  respuestas — la aplica, no la reescribe.
