---
name: close-openspec-change
description: Cerrar formalmente un change OpenSpec del frontend de Mini Moni cuando ya está implementado, revisado y verificado. Usar cuando el usuario da el nombre exacto de un change y pide cerrarlo, archivarlo, sincronizar specs o preparar su integración; comprueba evidencia de tasks, review, tests y dependencias, sincroniza specs, archiva con el CLI de OpenSpec, crea un único commit de cierre y recomienda PR o merge directo. No implementa, no corrige tests, no edita código de producción y no hace push, merge ni PR.
---
<!-- GENERADO por scripts/ai/sync-skills.sh desde ai/skills/ — NO EDITAR. -->

# Cerrar un change OpenSpec

Seguir `ai/roles/change-closer.md`, que define entrada, evidencia, estados de
salida, límites y formato del reporte. Esta skill es sólo el orden operativo.

**Entrada obligatoria:** nombre exacto del change. Opcional: confirmación de
verificaciones manuales y `strategy` (`auto` por defecto, `pull-request`,
`direct-merge`).

**Fail closed:** ante incertidumbre sobre evidencia, alcance, specs, Git o
dependencias, no cerrar. Devolver el `BLOCKED_BY_*` correspondiente con la
condición concreta que falta.

## 1. Preflight de Git

```bash
git status
git branch --show-current
git rev-parse --abbrev-ref --symbolic-full-name @{u}   # puede no existir
git rev-parse HEAD                                      # commit base, registrarlo
git status --short
```

Comprobar que no hay merge, rebase ni cherry-pick en curso (`.git/MERGE_HEAD`,
`rebase-merge/`, `rebase-apply/`, `CHERRY_PICK_HEAD`). Separar los archivos del
change de los cambios ajenos; si no puede hacerse con seguridad →
`BLOCKED_BY_GIT_STATE`. No usar `reset --hard`, `clean`, stash automático,
`amend` ni `add .`.

## 2. Preflight del change

```bash
openspec list
openspec status --change "<change-name>" --json
openspec validate "<change-name>" --type change --strict
```

`status --json` da `changeRoot`, `artifactPaths` y `existingOutputPaths` de los
delta specs: usarlos en vez de adivinar rutas. Si el change no está abierto, si
falta un artefacto o si la validación falla, detenerse.

## 3. Evidencia del change

Leer `proposal.md`, `design.md`, `tasks.md`, los delta specs, `backend-request.md`
si existe y las specs vigentes afectadas. Después:

- contar `- [ ]` vs `- [x]` y localizar la evidencia de cada task marcada;
- comprobar que proposal, design, specs y tasks no se contradicen y que las
  decisiones bloqueantes están resueltas;
- comprobar con `git diff --stat` que no hay cambios fuera de alcance.

Sin evidencia → `BLOCKED_BY_TASKS`.

## 4. Reviewer y verifier

Exigir verdict de `frontend-reviewer` (`APPROVE`, sin Critical ni Major
abiertos) y de `frontend-test-verifier` (`PASS` o `PASS WITH LIMITATIONS` con
limitaciones que no contradigan tasks marcadas). Si no hay verdicts, reejecutar
los comandos reales del repositorio antes de decidir:

```bash
npm test
npm run lint
npm run build      # si el diff toca tipos, page.tsx o route.ts
git diff --check
```

No hay script de typecheck: el chequeo de tipos llega por `build`. Ver
`ai/context/testing.md` para el alcance real del stack. Comando fallado →
`BLOCKED_BY_TESTS`; review faltante o con hallazgos abiertos →
`BLOCKED_BY_REVIEW`; teclado, foco, responsive, accesibilidad o flujo real sin
evidencia manual registrada → `BLOCKED_BY_MANUAL_VERIFICATION`.

Este rol no corrige lo que falla: devuelve el change al implementador.

## 5. Dependencias entre repositorios

Con `backend-request.md` o dependencia declarada, verificar existencia,
implementación, contrato final y orden de despliegue contra `../backend` (ver
`ai/context/backend-coordination.md`). Cerrar con dependencia no desplegada sólo
si `design.md` permite despliegues separados y la dependencia queda registrada
como condición de release. Si no puede verificarse y el design no lo resuelve →
`BLOCKED_BY_BACKEND_OR_FRONTEND_DEPENDENCY`.

## 6. Sincronizar specs

Determinar qué delta specs deben aplicarse a `openspec/specs/<capability>/`.
Usar el mecanismo oficial: `openspec archive` actualiza las specs principales,
y existe la skill `openspec-sync-specs` para sincronizar sin archivar. No copiar
requisitos a mano ni mover carpetas. Revisar el diff de las specs normativas y
confirmar que no desapareció comportamiento vigente. Mecanismo ausente o
fallido → `BLOCKED_BY_SPEC_SYNC`.

## 7. Archivar

Confirmar el comando disponible (`openspec archive --help`) antes de usarlo:

```bash
openspec archive "<change-name>" --yes
```

`--skip-specs` sólo para changes de tooling o documentación sin delta specs.

## 8. Validación posterior

```bash
openspec list
ls openspec/changes/archive/
openspec validate --specs
git diff --stat
git diff
```

Comprobar: el change ya no está abierto, aparece en `archive/<fecha>-<id>/`, las
specs normativas quedaron correctas y **no** se archivó ningún otro change.

## 9. Staging selectivo

Listar los archivos exactos del cierre y agregarlos por ruta —nunca `git add .`—
incluyendo los renames del archivado y los untracked del directorio archivado.
Después:

```bash
git status --short
git diff --cached
```

Si aparece algo ajeno, sacarlo del stage antes de seguir.

## 10. Commit

Un único commit, con el mensaje mostrado antes de crearlo:

- `docs(openspec): archive <change-name>` — sólo sync + archive;
- `chore(<scope>): close <change-name>` — incluye correcciones finales de cierre.

Sin `feat`/`fix` si el código funcional ya estaba commiteado, sin commit vacío,
sin `--amend`, sin `push`.

## 11. Recomendación de integración

Clasificar el riesgo según la matriz del rol y emitir exactamente uno de
`CREATE_PULL_REQUEST`, `DIRECT_MERGE_TO_DEVELOP_ALLOWED`, `DO_NOT_INTEGRATE`,
`HUMAN_DECISION_REQUIRED`. Ante duda, PR. `Next command` se muestra, no se
ejecuta:

```bash
# PR
git push -u origin <branch>
# luego crear el PR hacia develop

# merge directo (sólo si el historial lo permite y el repo lo autoriza)
git checkout develop
git pull --ff-only
git merge --ff-only <branch>
```

Entregar el `Change Closure Report` completo definido por el rol, con el estado
de salida final.
