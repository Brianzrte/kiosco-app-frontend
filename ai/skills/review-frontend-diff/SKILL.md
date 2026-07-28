---
name: review-frontend-diff
description: Revisar en modo read-only el diff de un change OpenSpec implementado en el frontend de Mini Moni. Usar cuando el usuario da el nombre del change y pide code review, revisión de PR/commit/working tree, verificación contra proposal/design/specs/tasks, evaluación de tests, accesibilidad, backend o alcance, y un verdict APPROVE, REQUEST CHANGES o BLOCKED. No corrige archivos, no marca tasks, no implementa y no lanza implementadores.
---

# Revisar el diff de un change frontend

Seguir `ai/roles/frontend-reviewer.md`, que define áreas, severidades, verdict,
formato y límites. Esta skill describe el recorrido mínimo y read-only.

**Entrada:** nombre exacto del change + diff/rango + archivos modificados +
resultados de validación.

**Salida:** `Review Result`. Ningún archivo editado.

## 1. Aislar la revisión

Confirmar el nombre exacto y que exista
`openspec/changes/<change-name>/`. Ejecutar `git status --short` para entender
el baseline sin modificarlo.

Identificar la fuente exacta del diff:

- working tree: `git diff` y, si aplica, `git diff --cached`;
- commit: `git show <sha>`;
- rango: `git diff <base>...<head>`;
- patch provisto: usarlo como fuente primaria.

Comparar `--name-status` con la lista de archivos declarada. Si hay cambios
mezclados y no pueden aislarse con certeza, devolver `BLOCKED`; no adivinar qué
pertenece al change.

## 2. Leer OpenSpec

Leer, en este orden:

1. `proposal.md`;
2. `design.md`;
3. todos los delta specs y las specs vigentes afectadas;
4. `tasks.md`;
5. `backend-request.md`, sólo si existe.

Construir una lista privada de requirements/scenarios y decisiones que el diff
debe demostrar. No crear un archivo ni modificar checkboxes.

## 3. Leer primero el diff

Ejecutar el equivalente al rango elegido:

```bash
git diff --stat <rango>
git diff <rango>
```

Leer el patch completo antes de abrir archivos enteros. Usar `git diff
--check` como evidencia de whitespace cuando corresponda. Registrar altas,
bajas, renames, dependencias/configuración y archivos fuera del impacto del
proposal.

No volver a explorar todo `src/`.

## 4. Abrir contexto mínimo

Abrir archivos adicionales sólo para:

- seguir un tipo, helper, consumer o primitive mencionado por el diff;
- confirmar comportamiento previo que el patch no muestra;
- comprobar una línea aproximada;
- verificar endpoint/rol/shape en backend;
- entender un test o resultado reportado.

Cargar contexto por tema, sin duplicarlo:

- capas/estado → `ai/context/architecture.md`;
- convenciones/dinero/fechas/copy → `ai/context/frontend-conventions.md`;
- UI/accesibilidad → `ai/context/ui-system.md`;
- tests → `ai/context/testing.md`;
- API/errores → `ai/context/api-contract.md`;
- roles/nav → `ai/context/roles-and-navigation.md`;
- backend/rollout → `ai/context/backend-coordination.md`.

Usar `rg -n` o salida numerada para ubicar findings. Consultar historia reciente
de un archivo sólo si el diff y el código actual no explican la intención.

## 5. Verificar backend y evidencia

Si el diff consume o cambia contrato:

1. verificar método/path en el router;
2. verificar roles/scopes;
3. verificar request/response/nullability/status en el recurso mínimo;
4. comparar con `backend-request.md` y rollout;
5. comprobar que no haya mocks o datos inventados.

Revisar los resultados de tests aportados y las tasks marcadas. No asumir que
“pasó CI” cubre tests manuales. Si falta una validación necesaria, reportarla en
`Missing tests` o en la sección temática correspondiente; no ejecutarla salvo
que el usuario pida explícitamente repetir comandos.

## 6. Formular findings

Para cada posible problema:

1. probarlo contra spec, design, contexto, backend o test;
2. asignar Critical, Major o Minor;
3. ubicar archivo y línea aproximada;
4. describir problema y consecuencia;
5. pedir el resultado esperado, no un patch.

Agruparlo en la sección de salida que mejor corresponda. No duplicar el mismo
finding en dos secciones: en la otra, referenciarlo brevemente si hace falta.

Priorizar correctitud y riesgo. No producir comentarios de estilo sin impacto
real.

## 7. Emitir verdict

Aplicar literalmente los criterios del rol:

- `APPROVE`: sin Critical/Major y evidencia suficiente;
- `REQUEST CHANGES`: al menos un Critical/Major corregible sin decisión nueva;
- `BLOCKED`: diff, contrato o decisión insuficiente para concluir.

Mantener todos los encabezados requeridos y `Ninguno` en secciones vacías.
Listar en `Evidence reviewed`:

- artefactos OpenSpec;
- rango/commit y diff stat;
- archivos adicionales;
- backend consultado;
- resultados de tests/lint/build/manuales recibidos.

No editar, corregir, marcar tasks, lanzar implementadores ni hacer commit.
