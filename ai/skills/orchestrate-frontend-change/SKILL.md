---
name: orchestrate-frontend-change
description: "Orquestar un change OpenSpec aprobado del frontend Next.js hasta dejarlo implementado y validado: delega bloques al frontend-implementer, valida evidencia, exige una auditoría UX/UI con ux-ui-reviewer, encadena reviewer y test-verifier, informa el progreso y se detiene ante decisiones materiales. Usar cuando el usuario pide implementar un feature frontend completo con supervisión. No decide producto, no commitea ni archiva."
---

# Orquestar un feature frontend

Seguir `ai/roles/frontend-feature-orchestrator.md`. Ese rol define estados, comunicación, límites y puertas de calidad; esta skill define la secuencia.

## Ciclo

```text
preflight → implementar etapa → validar evidencia → validar UX/UI de la etapa
          → siguiente etapa → review técnico → verificación → feature validada
```

1. Exigir el nombre exacto de un change abierto y sus artefactos aplicables.
2. Antes de cada etapa, clasificar cambios locales, decisiones abiertas, dependencias backend y tareas pendientes. Delegar una única etapa al `frontend-implementer`; nunca dos escrituras en paralelo.
3. Validar su cierre: tareas exactas, archivos, comandos y resultados, tasks marcadas sólo con evidencia, pendientes, bloqueos, limitaciones y diff. Un skipped, una comprobación manual no ejecutada o un backend no disponible no cuenta como evidencia aprobada.
4. Sin iniciar otra etapa, delegar a `ux-ui-reviewer` una auditoría independiente en modo `audit` de la etapa recién implementada. Debe contrastar sus pantallas y componentes contra `ux-ui-supervisor`, el UI kit, tokens, responsive, estados, accesibilidad, teclado y foco. `PASS` o `PASS WITH OBSERVATIONS` sin hallazgos bloqueantes cierra la etapa y permite delegar la siguiente.
5. Ante `FAIL`, `BLOCKED`, `BLOCKER` o `HIGH`, devolver sólo esos hallazgos como bloque de corrección al implementador. Después, solicitar `ux-ui-reviewer` en modo `verify` para la misma etapa. Repetir hasta que valide o necesite una decisión; no adelantar tareas posteriores.
6. Repetir los pasos 2–5 por cada etapa pendiente. Sólo cuando todas estén cerradas por UX/UI, delegar `frontend-reviewer` y después `frontend-test-verifier`. Sus veredictos admisibles y tareas respaldadas permiten `FEATURE_VALIDADA`.

## Avisos de avance

Aplicar literalmente en cada transición, antes de delegar y al validar el resultado:

```text
Estamos en la etapa: <ESTADO> — <descripción breve>
El implementador hizo: <último bloque validado, o "todavía no inició">
Ahora empieza a hacer: <próxima etapa, auditoría UX/UI de la etapa actual, revisión o verificación>
Tareas completas: <N>/<total> (<tareas con evidencia validada>)
Tareas restantes: <M> (<tareas abiertas o bloqueadas>)
```

Contar una tarea completa sólo cuando su evidencia sea válida. En `ESPERANDO_DECISIÓN`, reemplazar la tercera línea por `esperar tu decisión: <decisión concreta>` y explicar el motivo e impacto debajo.

## Delegación UX/UI

Encargar a `ux-ui-reviewer` algo equivalente a:

```text
Auditá el change <change> en modo audit. Revisá sólo las pantallas y componentes modificados contra ux-ui-supervisor, el UI kit y las specs. Informá el veredicto, hallazgos con severidad, evidencia, viewports/estados no verificados y correcciones esperadas. No implementes ni archives.
```

Los hallazgos `BLOCKER`, `HIGH`, `FAIL` o `BLOCKED` son un bloque de corrección para el implementador de la misma etapa. No ocultar limitaciones de verificación visual manual ni iniciar la etapa siguiente antes del `verify` exitoso.

## Límites

No implementar, editar specs/ADRs, marcar tasks, commitear, archivar, hacer push ni decidir Open Questions. Detenerse y pedir decisión ante contradicción, cambio local solapado, dependencia backend no resuelta, verificación manual o entorno requerido no autorizado, o corrección que amplíe el scope.
