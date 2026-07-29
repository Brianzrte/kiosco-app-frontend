# `ai/` — Núcleo compartido de contexto para agentes

Este directorio es el contexto que **Claude Code y Codex comparten** cuando
trabajan sobre el frontend de Mini Moni. Existe para que ambos agentes lean la
misma descripción del sistema, en vez de que cada herramienta mantenga su
propia versión divergente.

Es el espejo del mismo núcleo que ya existe en `../backend/ai/`. Los dos repos
son independientes: este directorio describe **sólo** el frontend.

## Qué hay acá hoy

| Ruta | Qué es |
|---|---|
| `ai/context/` | Documentos descriptivos del frontend tal como está hoy. Compartidos por todos los agentes. |
| `ai/roles/` | Definiciones de rol: responsabilidad única, límites y etapas de cada agente. |
| `ai/skills/` | Procedimientos compartidos entre Claude y Codex: qué leer, en qué orden, con qué presupuesto de contexto. |

Roles y skills vigentes:

| Rol | Skill | Para qué |
|---|---|---|
| `roles/requirement-analyst.md` | `skills/analyze-frontend-requirement/SKILL.md` | Convertir una idea incompleta de frontend en un `Requirement Context` listo para crear un change de OpenSpec. |
| `roles/openspec-writer.md` | `skills/write-frontend-openspec-change/SKILL.md` + `skills/validate-frontend-openspec-change/SKILL.md` | Escribir y validar changes OpenSpec frontend. |
| `roles/frontend-implementer.md` | `skills/implement-nextjs-change/SKILL.md` | Implementar una sección pendiente de un change aprobado. |
| `roles/frontend-reviewer.md` | `skills/review-frontend-diff/SKILL.md` | Revisar el diff implementado sin corregirlo. |
| `roles/frontend-test-verifier.md` | `skills/verify-frontend-change/SKILL.md` | Ejecutar checks y contrastar tasks con evidencia. |
| `roles/change-closer.md` | `skills/close-openspec-change/SKILL.md` | Cerrar un change verificado: sync de specs, archivado, commit de cierre y recomendación de integración. |
| — (transversal, sin rol propio) | `skills/ux-ui-supervisor/SKILL.md` | Supervisar UX/UI: design discovery, propuesta visual, auditoría de pantallas y revisión previa al cierre. Asesora; no implementa ni archiva. |

El procedimiento de implementación ya está migrado. La skill
`.claude/skills/frontend-kiosco-app/SKILL.md` se conserva únicamente como alias
de compatibilidad para invocaciones antiguas de Claude Code.

## Diferencia entre `context`, `roles` y `skills`

- **`ai/context/`** — *qué es* el sistema. Descriptivo, estable, compartido,
  sin instrucciones de proceso paso a paso.
- **`ai/roles/`** — *quién* actúa: responsabilidad única del agente, sus
  límites, sus etapas y el formato de su salida. Sin pasos de herramienta.
- **`ai/skills/`** — *cómo* se ejecuta el procedimiento de un rol, de forma
  agnóstica de herramienta: orden de lectura, presupuesto de contexto,
  chequeos. Es la fuente canónica del procedimiento.
- **`.claude/`** — adaptador específico de Claude Code: `CLAUDE.md` como punto
  de entrada, `.claude/agents/`, `.claude/skills/` y `.claude/commands/`. Los
  agentes de `.claude/agents/` deben ser finos: nombre, descripción,
  herramientas mínimas y un puntero a `ai/roles/` + `ai/skills/`, sin duplicar
  el contenido. **Es una capa de adaptación, no la fuente.** A medida que la
  migración avance, el resto de esos archivos va a quedar también como puntero
  fino hacia `ai/`.

Un skill o un rol puede referenciar `ai/context/`; no debe duplicarlo.

Las skills compartidas se sincronizan hacia `.claude/skills/` mediante
`scripts/ai/sync-skills.sh`. Las copias llevan `.ai-generated`; se editan sólo
en `ai/skills/`. Codex consume directamente el núcleo por `AGENTS.md` y no
necesita otra copia.

## Documentos compartidos

| Documento | Responde |
|---|---|
| `context/product-scope.md` | Objetivo operativo, superficie vigente y límites de producto que no conviene duplicar en adaptadores. |
| `context/architecture.md` | Cómo está partido el frontend, qué capa hace qué, qué no hay (y por qué). |
| `context/module-map.md` | Cada área de pantalla: ruta, componentes, libs, roles, endpoints, specs, archivos que se tocan al extenderla. |
| `context/frontend-conventions.md` | Cómo se escribe código acá: nombres, formularios, fetching, estados, copy, dinero, fechas, navegación. |
| `context/ui-system.md` | Tokens, primitives del UI kit, cuándo extenderlos, accesibilidad, motion, copy de acciones. |
| `context/testing.md` | Qué se testea, dónde, con qué comandos, y qué **no** se puede testear hoy. |
| `context/openspec-workflow.md` | El ciclo de vida de un change, de la idea al archivo. |
| `context/api-contract.md` | `api<T>()`, el proxy, errores, y los endpoints que el frontend consume hoy. |
| `context/roles-and-navigation.md` | `Role`, `requireRole`, `NAV_ITEMS`, `homeFor`, y las divergencias vigentes con el backend. |
| `context/backend-coordination.md` | Cómo se coordina con `../backend`: cuándo leerlo, `backend-request.md`, prohibición de mocks. |

## Qué es fuente canónica

Un documento de `ai/context/` **nunca gana** sobre las fuentes de abajo. Es un
mapa, no el territorio.

| Pregunta | Fuente canónica |
|---|---|
| ¿Qué debe hacer el frontend? | `openspec/specs/ui-*/spec.md` — **normativo**. |
| ¿Qué se está por cambiar? | `openspec/changes/<id>/` (`proposal.md`, `design.md`, `specs/`, `tasks.md`, `backend-request.md`). |
| ¿Qué hace el frontend hoy? | El código en `src/`. |
| ¿Cuál es la regla de negocio? | El backend: `../backend/openspec/specs/` y `../backend/internal/`. |
| ¿Qué rutas expone el backend? | `../backend/internal/bootstrap/router.go` + los `routes.go` de cada módulo. |
| ¿Qué dependencias se pueden usar? | `package.json`. Agregar una es una decisión, no un detalle. |

Cuando `ai/context/` y el código difieran, **gana el código** y el documento
está desactualizado: corregilo en el mismo cambio o reportá la divergencia.
Cuando el código y OpenSpec difieran, eso es una inconsistencia real que hay
que **reportar**, no resolver en silencio.

Los adaptadores de plataforma no son fuentes de conocimiento. Si contienen una
regla de producto o técnica que no existe en `ai/`, esa regla está mal ubicada
y debe migrarse antes de reducir el adaptador.

## Política de contexto mínimo

**Ningún agente debe cargar `ai/context/` completo por defecto.** Cargarlo
entero al inicio de cada sesión desperdicia contexto y diluye lo relevante.

Regla de carga:

1. Leé `AGENTS.md` primero (es corto, es el punto de entrada).
2. Leé el spec de OpenSpec de la capability afectada.
3. Cargá **sólo** los documentos que la tarea necesita:

   | Tarea | Documento |
   |---|---|
   | decidir si una idea está dentro del producto vigente | `product-scope.md` |
   | escribir una pantalla o tocar `src/components/` | `frontend-conventions.md` + el área en `module-map.md` |
   | trabajo visual, tokens, primitives | `ui-system.md` |
   | fetching, errores, un endpoint nuevo | `api-contract.md` |
   | rutas, permisos, navegación | `roles-and-navigation.md` |
   | mover lógica a `lib/` o escribir tests | `testing.md` |
   | crear o cerrar un change | `openspec-workflow.md` |
   | el contrato con el backend no está claro | `backend-coordination.md` |
   | decidir dónde vive algo, o si falta una capa | `architecture.md` |

4. Abrí el código real antes de afirmar cómo funciona algo.

## Presupuesto de contexto por rol

Cada archivo en `ai/roles/` contiene una sección `Presupuesto de contexto` con
cuatro campos obligatorios: **obligatorio**, **opcional**, **prohibido por
defecto** y **señales para ampliar**. Esa sección es canónica para el rol; la
skill correspondiente sólo define el orden operativo y no debe copiar la
matriz.

## Cómo se actualiza esta documentación

- Se actualiza **cuando cambia lo que describe**, en el mismo change: ruta o
  pantalla nueva → `module-map.md` + `roles-and-navigation.md`; endpoint nuevo
  → `api-contract.md`; primitive nuevo → `ui-system.md`.
- Es **descriptiva**: documenta lo que existe. No inventa decisiones, no
  propone arquitectura, no anticipa trabajo futuro. Una decisión nueva se toma
  en el `design.md` de un change, y recién después se refleja acá.
- Una regla se documenta como **obligatoria** sólo si el código la cumple sin
  excepciones o una fuente normativa la exige. Lo demás va como patrón habitual
  o como excepción explícita — ver la separación en `frontend-conventions.md`.
- **Sin duplicación**: cada hecho vive en un solo documento; los demás lo
  referencian por ruta.
- Los adaptadores pueden declarar herramientas/permisos de su plataforma, pero
  no repetir conocimiento ni procedimiento compartido.
