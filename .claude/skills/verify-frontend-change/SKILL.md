---
name: verify-frontend-change
description: Verificar en modo read-only que un change OpenSpec del frontend de Mini Moni está listo mediante comandos reales y evidencia. Usar cuando el usuario proporciona el nombre de un change y pide ejecutar tests específicos, suite completa, lint, build, TypeScript o checks estructurales; contrastar checkboxes de tasks.md; distinguir fallos, pendientes manuales, backend no disponible y limitaciones de entorno; y devolver PASS, PASS WITH LIMITATIONS, FAIL o BLOCKED sin corregir ni editar archivos.
---
<!-- GENERADO por scripts/ai/sync-skills.sh desde ai/skills/ — NO EDITAR. -->

# Verificar un change frontend

Seguir `ai/roles/frontend-test-verifier.md`, que define evidencia, categorías,
verdict y límites.

**Entrada obligatoria:** nombre exacto del change y diff/rango identificable.

**Salida:** `Verification Result` respaldado por comandos y evidencia, sin
editar archivos ni checkboxes.

## 1. Detectar el change

Confirmar que exista `openspec/changes/<change-name>/`. Si falta el nombre
exacto, pedirlo. Ejecutar `git status --short` y aislar el diff mediante working
tree, staged diff, commit, rango o patch.

Si hay cambios mezclados y no pueden atribuirse con certeza, devolver `BLOCKED`.

## 2. Preparar evidencia

Leer:

1. `design.md` y los specs para identificar criterios de aceptación y
   verificaciones decididas;
2. `tasks.md` sin modificarlo;
3. `package.json`;
4. `vitest.config.*`, `eslint.config.*`, `tsconfig.json` y `next.config.*`
   existentes;
5. scripts estructurales versionados, si existen;
6. `git diff --name-status` y `git diff --stat` del rango;
7. sólo los archivos modificados necesarios para mapear tests y tasks.

Leer selectivamente:

- testing/stack → `ai/context/testing.md`;
- convenciones, datos y copy → `ai/context/frontend-conventions.md`;
- UI, responsive, keyboard, focus y accesibilidad →
  `ai/context/ui-system.md`.

No explorar todo `src/`.

## 3. Seleccionar comandos

Construir la lista desde scripts y configuraciones reales. Registrar antes de
ejecutar:

- comandos requeridos;
- motivo y alcance de cada uno;
- validaciones no aplicables;
- evidencia manual/backend que no puede producir el shell.

Orden habitual:

1. tests específicos de lógica o mappings tocados;
2. `npm test`, si existe;
3. `npm run lint`, si existe;
4. TypeScript check, sólo si tiene script propio;
5. `npm run build`, cuando el diff o las tasks lo requieren;
6. scripts estructurales aplicables;
7. `git diff --check` sobre el rango.

No usar comandos documentados que el repositorio actual no define. No usar
`npx` para descargar o ejecutar tooling ausente.

## 4. Ejecutar y registrar

Ejecutar los comandos uno por uno para conservar comando exacto, exit code y
salida relevante. No ocultar errores con `|| true`, pipes que alteren el exit
code ni filtros que eliminen warnings materiales.

Clasificar cada intento como:

- `passed`;
- `failed`;
- `not run`;
- `blocked`;
- `build limitation`;
- `environment limitation`.

Un timeout, cancelación, skipped test o proceso incompleto no pasa. No corregir
el fallo ni modificar configuración para lograr verde.

## 5. Contrastar tasks

Para cada checkbox relevante, vincular la evidencia exacta:

- archivo/diff para implementación o inspección;
- suite/test para comportamiento automatizado;
- comando para lint/build/check;
- verificación real para backend;
- pasos y entorno para prueba manual.

Listar bajo `Tasks without evidence` toda task marcada cuya evidencia falte o no
pruebe lo que afirma. Mantener como pendiente responsive, keyboard, focus,
accesibilidad manual, flujo real, endpoint real o backend desplegado sin prueba
observada.

No editar `tasks.md`.

## 6. Reportar limitaciones

Aplicar el stack detectado, no uno ideal:

- Vitest Node no monta componentes;
- `.test.tsx` puede quedar fuera del `include`;
- sin jsdom/Testing Library no hay component tests;
- UI compleja requiere prueba manual.

No reportar la ausencia de component tests como error salvo que el design los
exija. No convertir esa limitación en evidencia de UI.

Separar contrato backend inspeccionado de instancia desplegada y flujo
ejercitado. Usar `backend unavailable` cuando corresponda e indicar si bloquea
readiness.

## 7. Emitir resultado

Aplicar literalmente el verdict del rol:

- `PASS`: todo lo requerido pasó y tiene evidencia;
- `PASS WITH LIMITATIONS`: checks requeridos pasaron y sólo quedan limitaciones
  no bloqueantes;
- `FAIL`: un check requerido falló o la evidencia contradice readiness;
- `BLOCKED`: una condición externa o entrada insuficiente impide concluir.

Mantener todos los encabezados de `Verification Result`. En `Commands executed`
incluir comando, alcance, exit code y resultado. En `Recommended next action`,
indicar el paso mínimo siguiente sin implementarlo.

No editar, corregir, marcar tasks, agregar dependencias ni hacer commit.
