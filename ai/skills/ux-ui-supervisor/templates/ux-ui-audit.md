# Template — UX/UI Audit

Salida del modo `audit`. Se mantienen **todos** los encabezados; una sección
vacía se escribe `Ninguno` o `Not evaluated`, no se borra.

Ejemplos completos: `../examples/pos-sale-screen-review.md`,
`../examples/form-review.md`, `../examples/dashboard-review.md`.

---

```markdown
# UX/UI Review

## Context
- Screen: <ruta y componente>
- Product type: <clasificación + perfil aplicado>
- Primary user: <rol>
- Main task: <una frase>
- Main input method: <teclado | lector | mouse | táctil>
- Evidence reviewed: <archivos leídos, screenshots, viewports, specs, ejecución>

## Result
- Score: <n>/100  (o <n>/<peso efectivo> si hay categorías no evaluadas)
- Status: PASS | PASS WITH OBSERVATIONS | FAIL
- Confidence: alta | media | baja

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

## Executive summary

Tres a cinco frases: qué hace bien la pantalla, qué la frena, y qué habría que
resolver primero. Sin adjetivos sin evidencia.

## Blockers

Los hallazgos `BLOCKER`, en orden. `Ninguno` si no hay.

## Findings

| ID | Severity | Area | Location | Problem | Impact | Recommendation | Validation |
|---|---|---|---|---|---|---|---|

Detalle de cada hallazgo debajo de la tabla, con los nueve campos:

### <ID> — <título corto>

- **Severidad:** BLOCKER | HIGH | MEDIUM | LOW | SUGGESTION
- **Área:** jerarquía | interacción | accesibilidad | responsive | teclado |
  estados | motion | performance | consistencia
- **Ubicación:** `archivo:línea` o región
- **Problema:**
- **Evidencia:**
- **Impacto:**
- **Recomendación:**
- **Criterio de validación:**

## Visual hierarchy
## Interaction and feedback
## Accessibility
## Responsive behavior
## Keyboard navigation
## States
## Performance and motion

En cada una: qué se revisó, qué se encontró, y qué quedó sin evaluar.

## Positive findings

Específicos y respaldados por evidencia. **No compensan ni rebajan hallazgos.**
Si la pantalla resuelve bien algo difícil, se dice — el supervisor no busca
problemas artificialmente.

## Acceptance criteria

Los criterios que la pantalla debería cumplir para cerrar los hallazgos.
Verificables sí/no, redactados para que un implementador los ejecute y un
revisor los compruebe.

- [ ] …

## Deferred suggestions

Mejoras válidas que **no** corresponden a este cambio, con el motivo. Sirven
para que no se pierdan y para dejar claro que no bloquean.
```

## Reglas de llenado

- **Sin evidencia no hay hallazgo.** Una sospecha se investiga o se declara
  `Not evaluated`.
- Sin evidencia para una categoría del puntaje, se marca `Not evaluated`, se
  excluye del total y el total se reporta sobre el peso efectivo.
- El `Status` sale del *Scoring system* del `SKILL.md`, no del criterio del
  momento.
- Los hallazgos van ordenados por severidad descendente.
- Las recomendaciones son proporcionales al problema (constitución §23).
- Ninguna recomendación agrega dependencias.
- Ninguna recomendación cambia comportamiento de negocio.
