# Flujo de OpenSpec en el frontend

## Dónde vive

```
openspec/
  config.yaml                    schema: spec-driven + contexto del proyecto
  specs/<capability>/spec.md     requisitos vigentes (ui-auth, ui-catalog,
                                 ui-cash-closing, ui-foundation, ui-inventory,
                                 ui-pos, ui-reports)
  changes/<id>/                  trabajo en curso
    proposal.md                  qué y por qué
    design.md                    cómo, y qué se decidió (con alternativas descartadas)
    specs/<capability>/spec.md   delta: ADDED / MODIFIED / REMOVED / RENAMED
    tasks.md                     pasos con checkboxes
    backend-request.md           (cuando aplica) contrato pedido al backend
  changes/archive/<fecha>-<id>/  changes cerrados
```

Las capabilities del frontend se llaman `ui-*`. Una capability puede existir
sólo como delta dentro de un change y todavía no tener carpeta en
`openspec/specs/` — es el caso hoy de `ui-users`, `ui-sales` y `ui-receiving`.

## El ciclo

```
idea
 → aclaración        (explorar, preguntar, mirar el código y el backend)
 → proposal.md       qué cambia, por qué, qué capabilities toca, impacto
 → design.md         decisiones, alternativas descartadas, casos borde
 → delta specs       requisitos en formato Requirement/Scenario
 → tasks.md          pasos verificables, agrupados por sección
 → implementación    una sección por vez
 → verificación      lint + test + prueba manual de lo que no se testea
 → archivo           lo decide el usuario, nunca el agente
```

El núcleo compartido opera este ciclo con los roles y skills listados en
`ai/README.md`. Cada plataforma puede exponer adaptadores propios fuera de
`ai/`; no son normativos y ningún eslabón encadena al siguiente por su cuenta.

## Reglas

**OpenSpec es normativo.** `openspec/specs/ui-*/spec.md` dice qué debe hacer el
frontend. `ai/context/` es descriptivo: si contradice un spec, gana el spec. Si
el **código** contradice un spec, eso es una inconsistencia real que se
**reporta**, no se resuelve en silencio.

**`design.md` contiene las decisiones, y ganan sobre la preferencia propia.**
Antes de implementar se leen `tasks.md` y `design.md` del change: llevan
decisiones ya tomadas, con el razonamiento y las alternativas que se
descartaron. Volver a discutirlas es reabrir algo cerrado. Si una decisión es
inviable, se dice y se actualiza el change — no se implementa otra cosa.

**Las tareas requieren evidencia.** Una tarea se marca `[x]` cuando existe algo
que lo demuestra: el archivo con el símbolo, el test que pasa, la corrida del
comando. Una tarea que no se pudo verificar queda sin marcar, y si está
bloqueada se dice por qué y por quién, en la propia línea — el estilo del repo
es explícito (`- [ ] 6.5 Bloqueado por backend (ver backend-request.md §7): …`).
Nunca se marca una tarea "por adelantado".

**`backend-request.md` es coordinación real, no una nota.** Se escribe como el
contrato mínimo que la pantalla necesita, verificado contra el código del
backend y fechado, y sirve de prompt para la sesión de backend. Detalle en
`backend-coordination.md`.

**No se mockean endpoints faltantes.** Si el endpoint no existe: se documenta
en `backend-request.md`, se especifica la pantalla completa en las delta specs,
y **no se implementa** hasta que el contrato exista. Es el patrón que ya usaron
`add-frontend-cash-closing` y `add-frontend-users` §6/§7. Construir UI contra un
contrato que el backend todavía puede rechazar garantiza reescribirla.

**El archivado no es automático.** Archivar un change es una decisión del
usuario, después de que la implementación esté verificada y las specs
sincronizadas (`openspec-sync-specs` mueve el delta a `openspec/specs/`).
Un agente no archiva por su cuenta ni "limpia" changes.

**Un change implementado no queda abierto indefinidamente.** Si está terminado
y verificado, corresponde proponer sincronizar specs y archivar. Lo contrario
—una carpeta de changes que acumula trabajo ya hecho— hace que `openspec/specs/`
deje de describir el sistema, que es exactamente lo que lo vuelve inútil.

## Al empezar un change

1. Leé `openspec/changes/<id>/proposal.md`, `design.md` y `tasks.md`.
2. Leé el spec vigente de cada capability afectada.
3. Confirmá que cada endpoint que necesitás existe (`api-contract.md`, después
   el backend real).
4. Implementá en las tres capas de `architecture.md`, reutilizando `api()`,
   `useLoad()`, `requireRole()`, el UI kit y `lib/money.ts`.
5. Cerrá con `npm run lint` y `npm test`, y reportá qué quedó sin verificar.

## Al cerrar un change

El cierre formal es un paso propio, con su rol (`ai/roles/change-closer.md`) y
su procedimiento (`ai/skills/close-openspec-change/SKILL.md`):

```
verification
 → manual evidence
 → change closer preflight
 → spec synchronization
 → OpenSpec archive
 → closure commit
 → PR or direct-merge recommendation
```

El closer es el único rol que sincroniza specs, archiva y crea el commit de
cierre, siempre sobre un change pedido por su nombre exacto. La integración
—`push`, PR o `merge`— sólo se recomienda; ejecutarla requiere una acción
explícita posterior del usuario.
