# Checklist — Revisión pre-merge

Modo `pre-merge`. Se ejecuta **antes** de cerrar un change frontend con impacto
visible, y **antes** de que intervenga `ai/roles/change-closer.md`.

Salida: `../templates/pre-merge-report.md` con verdict `PASS`,
`PASS WITH OBSERVATIONS` o `FAIL`.

Este skill **no** archiva, no sincroniza specs, no marca `tasks.md` y no hace
commit.

## 0. Encuadre

- [ ] Nombre exacto del change identificado.
- [ ] `openspec/changes/<id>/` existe.
- [ ] El diff está aislado (`git diff --stat` sobre el rango correcto).
- [ ] Tipo de producto de cada pantalla afectada, clasificado.
- [ ] Evidencia disponible enumerada (código, screenshots, ejecución local).
- [ ] Lo **no** disponible declarado como `Not evaluated`.

Si el diff no puede aislarse, el verdict es `FAIL` por falta de base, no por el
código.

## 1. Cumplimiento del requerimiento

- [ ] Cada `Requirement` / `Scenario` de los delta specs tiene su
      correspondencia visible en la UI.
- [ ] Las decisiones de `design.md` se respetaron.
- [ ] Ninguna decisión de `design.md` se cambió en silencio.
- [ ] No hay pantallas o estados especificados que falten.
- [ ] No hay comportamiento implementado que el spec no pida.
- [ ] Las contradicciones entre spec e implementación están **reportadas**.

## 2. Jerarquía

- [ ] Hay una acción primaria identificable por región.
- [ ] El dato más importante es el más prominente.
- [ ] Máximo tres niveles de énfasis.
- [ ] Un solo `<h1>` por página, y es el título de la pantalla.
- [ ] No hay dos `variant="primary"` compitiendo en la misma región.

## 3. Consistencia

- [ ] Los patrones coinciden con la pantalla equivalente existente.
- [ ] Copy en español rioplatense, sentence case, voz activa.
- [ ] El nombre de la acción coincide con su confirmación.
- [ ] El mensaje de error del backend se muestra tal cual.
- [ ] No se agregaron reglas de validación que el backend no imponga.

## 4. Reutilización de componentes

- [ ] Se usan los primitives de `src/components/ui/`.
- [ ] No hay estilo ad-hoc que debería ser una variante del primitive.
- [ ] Ningún componente nuevo duplica un primitive existente.
- [ ] Toda extensión de primitive es reutilizable, no un caso único.
- [ ] `ui/` no importa de `components/<feature>/`.
- [ ] Las composiciones repetidas viven en `components/<feature>/`.

## 5. Tokens

- [ ] Ningún literal hex en `src/components/` ni en `page.tsx`.
- [ ] Ningún radio suelto: sólo `rounded-app`.
- [ ] Ninguna sombra arbitraria: sólo `shadow-soft` / `shadow-soft-lg`.
- [ ] Ninguna duración literal de ms fuera de `lib/motion.ts` / `--motion-*`.
- [ ] Ningún valor de espaciado arbitrario sin justificación.
- [ ] No se agregó ningún token nuevo sin al menos dos usos reales.

## 6. Mobile & Responsive

Área **obligatoria**: nunca se marca `Not evaluated` sin decir qué impidió
revisarla.

- [ ] Recorrida la matriz mínima: 320 × 568, 360 × 640, 360 × 800, 390 × 844,
      414 × 896, 430 × 932, 844 × 390, 768 × 1024, 1280 × 720.
- [ ] En POS, además 1024 × 768 y 1366 × 768.
- [ ] Declarado qué viewports se **probaron** y cuáles se revisaron sólo de
      forma **estática**.
- [ ] La pantalla está escrita mobile-first y funciona desde 320 px.
- [ ] La página no scrollea horizontalmente en ningún viewport.
- [ ] Ninguna acción necesaria está oculta ni fuera de pantalla en móvil.
- [ ] Cada tabla tiene una estrategia móvil explícita y coherente con la tarea.
- [ ] Overlays y diálogos usan altura dinámica y entran en apaisado.
- [ ] Las barras fijas respetan `env(safe-area-inset-*)`.
- [ ] Los targets táctiles son ≥ 44 px con ≥ 8 px de separación.
- [ ] Las correcciones de móvil no rompieron tablet ni escritorio.
- [ ] Detalle: `responsive-review.md`.

## 7. Contraste

- [ ] Los pares de color nuevos fueron **medidos**, no estimados.
- [ ] Texto normal ≥ 4.5:1; texto grande ≥ 3:1.
- [ ] Texto sobre `surface-2` y pasteles medido explícitamente.
- [ ] Ningún pastel con texto blanco.

## 8. Focus

- [ ] Foco visible en todos los controles nuevos.
- [ ] Ningún `outline: none` sin reemplazo.
- [ ] El foco inicial es deliberado donde corresponde.
- [ ] El foco vuelve al disparador al cerrar cada overlay.
- [ ] El foco no cae en `<body>` después de ninguna acción.

## 9. Teclado

- [ ] El flujo nuevo se completa sin mouse.
- [ ] El orden de foco coincide con el orden visual.
- [ ] Escape cierra los overlays nuevos.
- [ ] Ningún `tabindex` positivo.
- [ ] Detalle: `keyboard-review.md`.

## 10. Estados

- [ ] **Loading** resuelto para el dato principal.
- [ ] **Empty** resuelto, e invita a la acción principal.
- [ ] **Empty por filtro** distinto del empty real.
- [ ] **Error** resuelto, con mensaje del backend y acción de recuperación.
- [ ] **Disabled** resuelto, y explica qué falta.
- [ ] El orden de render es `error → loading → empty → datos`.
- [ ] `hover`, `focus`, `active`, `selected` distinguibles entre sí.

## 11. Feedback

- [ ] Toda mutación tiene confirmación visible.
- [ ] Los toasts confirman éxito; no reportan errores de campo.
- [ ] Los errores de campo van inline.
- [ ] `role="alert"` en errores, `role="status"` en confirmaciones.
- [ ] Toda acción destructiva tiene confirmación proporcional.
- [ ] Las confirmaciones nombran la entidad y dicen si es reversible.
- [ ] Hay guarda contra doble submit además del botón deshabilitado.

## 12. Motion

- [ ] Toda animación nueva explica, conecta, confirma o da feedback.
- [ ] El mecanismo elegido (CSS / Motion / AutoAnimate) sigue el árbol de
      decisión de `../references/motion.md`, y está justificado si no es CSS.
- [ ] Sólo se animan `transform`, `opacity`, `color`, `background-color`.
- [ ] Las duraciones salen de los tokens (`lib/motion.ts` / `--motion-*`), en
      CSS y en props de Motion por igual.
- [ ] Ningún import nuevo de `framer-motion`; todo import de Motion es desde
      `motion/react`.
- [ ] AutoAnimate y una layout animation de Motion no controlan el mismo
      contenedor.
- [ ] Ninguna dependencia de animación nueva se agregó sin autorización
      (`motion` y `@formkit/auto-animate` ya están disponibles; cualquier otra
      no).
- [ ] El Client Component boundary de cualquier región animada nueva es
      mínimo — no se convirtió una página completa en cliente sólo por motion.
- [ ] En pantallas operativas ninguna animación supera 400 ms.

## 13. Reduced motion

- [ ] Verificado con emulación en DevTools, incluidas las interacciones con
      Motion y AutoAnimate.
- [ ] Ninguna regla de reduced motion elimina la única señal de un evento.
- [ ] Las animaciones nuevas están cubiertas por la estrategia existente o
      declaran la suya.
- [ ] El foco se restaura al cerrar cualquier overlay animado nuevo como
      parte del cierre, no de la animación.

## 14. Performance percibida

- [ ] Toda interacción da señal en < 100 ms.
- [ ] El skeleton imita la geometría del contenido final.
- [ ] No hay peticiones duplicadas (verificado en Network).
- [ ] Los filtros locales no tienen debounce.
- [ ] Todos los números que se actualizan usan cifras tabulares.
- [ ] Nada salta de posición al cargar.

## 15. Tests

- [ ] Toda lógica pura nueva tiene test en `lib/*.test.ts`.
- [ ] La matemática de dinero está en `lib/` con su test, no en la view.
- [ ] `npm run lint` y `npm test` fueron ejecutados, con su resultado real.
- [ ] `npm run build` ejecutado si cambiaron tipos, `page.tsx` o `route.ts`.
- [ ] Las verificaciones visuales, de foco, de teclado y de responsive están
      identificadas como **manuales**.
- [ ] No se inventó ningún resultado de test.
- [ ] No se agregó jsdom, Testing Library, Playwright ni ningún runner.

## 16. Riesgos pendientes

- [ ] Todo hallazgo no resuelto está listado con su severidad.
- [ ] Toda dependencia de backend pendiente sigue visible.
- [ ] Todo supuesto no verificado está declarado.
- [ ] Toda categoría sin evidencia está marcada `Not evaluated`.
- [ ] Ninguna tarea de `tasks.md` quedó marcada sin evidencia.

## Verdict

| Verdict | Condición |
|---|---|
| `PASS` | Sin BLOCKER, ≤ 1 HIGH, score ≥ 80 |
| `PASS WITH OBSERVATIONS` | Sin BLOCKER, ≤ 1 HIGH, score 65–79 |
| `FAIL` | Cualquier BLOCKER, ≥ 2 HIGH, o score < 65 |

Un BLOCKER de móvil —no se puede cobrar, un botón principal fuera de pantalla,
un modal que no cierra, el teclado tapando la acción requerida— produce `FAIL`
igual que cualquier otro BLOCKER: no existe un "PASS salvo en móvil".

Un `PASS` no autoriza el cierre por sí solo: el change todavía necesita el
review técnico (`ai/roles/frontend-reviewer.md`), la verificación
(`ai/roles/frontend-test-verifier.md`) y el cierre
(`ai/roles/change-closer.md`).
