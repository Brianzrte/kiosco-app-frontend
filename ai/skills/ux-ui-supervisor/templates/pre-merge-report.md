# Template — Pre-merge Report

Salida del modo `pre-merge`. Se ejecuta contra
`../checklists/pre-merge-review.md`.

Este informe **no** cierra el change: no archiva, no sincroniza specs, no marca
`tasks.md` y no hace commit. Eso es `ai/roles/change-closer.md`.

---

```markdown
# UX/UI Pre-merge Report — <change-id>

## Context
- Change: `openspec/changes/<id>/`
- Diff: <rango git o descripción de la fuente>
- Pantallas afectadas: <rutas>
- Tipo de producto / perfil: <por pantalla>
- Evidencia revisada: <archivos, screenshots, viewports, comandos ejecutados>
- No revisado: <lo que quedó fuera y por qué>

## Verdict

**PASS | PASS WITH OBSERVATIONS | FAIL**

- Score: <n>/100 (o /<peso efectivo>)
- Confidence: alta | media | baja
- BLOCKERs: <n>
- HIGHs: <n>

| Verdict | Condición |
|---|---|
| PASS | Sin BLOCKER, ≤ 1 HIGH, score ≥ 80 |
| PASS WITH OBSERVATIONS | Sin BLOCKER, ≤ 1 HIGH, score 65–79 |
| FAIL | Cualquier BLOCKER, ≥ 2 HIGH, o score < 65 |

## Scoring

| Categoría | Peso | Puntaje | Por qué |
|---|---:|---:|---|
| Eficiencia de la tarea | 25 | | |
| Accesibilidad | 20 | | |
| Jerarquía y claridad | 15 | | |
| Consistencia | 15 | | |
| Feedback y prevención de errores | 10 | | |
| Responsive | 5 | | |
| Performance y motion | 5 | | |
| Pulido visual | 5 | | |

## Checklist results

| Área | Resultado | Nota |
|---|---|---|
| 1. Cumplimiento del requerimiento | PASS / FAIL / Not evaluated | |
| 2. Jerarquía | | |
| 3. Consistencia | | |
| 4. Reutilización de componentes | | |
| 5. Tokens | | |
| 6. Mobile & Responsive | | |
| 7. Contraste | | |
| 8. Focus | | |
| 9. Teclado | | |
| 10. Estados | | |
| 11. Feedback | | |
| 12. Motion | | |
| 13. Reduced motion | | |
| 14. Performance percibida | | |
| 15. Tests | | |
| 16. Riesgos pendientes | | |

## Blockers

Los `BLOCKER` que impiden el cierre. `Ninguno` si no hay.

## Findings

| ID | Severity | Area | Location | Problem | Impact | Recommendation | Validation |
|---|---|---|---|---|---|---|---|

Detalle de cada uno con los nueve campos, como en
`../templates/ux-ui-audit.md`.

## Mobile & Responsive

Sección obligatoria. Nunca se omite.

- Estado general: PASS | PASS WITH OBSERVATIONS | FAIL
- Viewports probados: <los que se abrieron de verdad>
- Revisión estática: <los que sólo se revisaron leyendo código>
- Hallazgos: <n> BLOCKER · <n> HIGH · <n> MEDIUM · <n> LOW
- Riesgo principal para completar la tarea: <una frase>

| Viewport | Estado | Problemas principales |
|---|---|---|
| 320 × 568 | | |
| 360 × 640 | | |
| 360 × 800 | | |
| 390 × 844 | | |
| 414 × 896 | | |
| 430 × 932 | | |
| 844 × 390 | | |
| 768 × 1024 | | |
| 1280 × 720 | | |

En POS se agregan 1024 × 768 y 1366 × 768. Checklist:
`../checklists/responsive-review.md`.

## Recommended fix order

Orden de corrección, por: 1) bloqueo de la tarea, 2) frecuencia del flujo
afectado, 3) cantidad de viewports afectados, 4) accesibilidad, 5) consistencia
visual, 6) refinamiento estético.

## Spec compliance

| Requirement / Scenario | Estado | Evidencia |
|---|---|---|

Estado: `Cumplido` · `Parcial` · `No cumplido` · `Contradice la implementación`.

Las contradicciones entre spec e implementación se **reportan**; no se resuelven
en silencio.

## Verification performed

Comandos ejecutados, con su resultado real. No se inventa ninguno.

​```text
npm run lint     → <resultado>
npm test         → <resultado>
npm run build    → <resultado o "no ejecutado, no cambiaron tipos/page/route">
​```

Verificación manual ejecutada:

- Recorrido con teclado en <viewport> — <resultado>
- Contraste medido en <n> pares — <resultado>
- Reduced motion emulado — <resultado>
- Viewports revisados: <lista>

## Not evaluated

Lo que no se pudo verificar, con el motivo. Esta sección **nunca** se omite y
nunca se deja vacía sin justificar.

## Positive findings

Específicos y con evidencia. No compensan hallazgos.

## Pending risks

Riesgos que quedan abiertos aunque el verdict sea `PASS`: dependencias de
backend, verificaciones no ejecutadas, supuestos no confirmados.

## Recommended next steps

Qué hacer con este informe. Por ejemplo:

- Corregir <IDs> antes de cerrar.
- Continuar con `ai/roles/frontend-reviewer.md` para el review técnico.
- Continuar con `ai/roles/frontend-test-verifier.md` para la verificación.
- El cierre lo ejecuta `ai/roles/change-closer.md`, no este skill.
```
