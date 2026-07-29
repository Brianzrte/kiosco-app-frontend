# Mini Moni Frontend — Claude Code adapter

`AGENTS.md` es el punto de entrada compartido y debe leerse primero. El núcleo
canónico y neutral vive en `ai/`:

- `ai/README.md`: mapa de roles, skills, fuentes y presupuestos de contexto;
- `ai/context/`: conocimiento descriptivo del proyecto;
- `ai/roles/`: responsabilidades y límites;
- `ai/skills/`: procedimientos ejecutables compartidos.

## Adaptación para Claude Code

- Elegí el agente fino de `.claude/agents/` que corresponda al trabajo.
- Las copias bajo `.claude/skills/` que contienen `.ai-generated` se generan
  desde `ai/skills/`; no se editan directamente.
- `frontend-kiosco-app` es un alias de compatibilidad. Para implementar usa
  `ai/roles/frontend-implementer.md` y
  `ai/skills/implement-nextjs-change/SKILL.md`.
- Las skills y comandos `openspec-*` / `/opsx:*` son integración específica de
  Claude Code con el CLI de OpenSpec. No redefinen el núcleo del frontend.
- Usá sólo las herramientas declaradas por el agente elegido. Las restricciones
  de edición del rol siguen aplicando aunque una herramienta esté disponible.
- `/ux-ui-supervisor` expone la skill de supervisión UX/UI para design
  discovery, auditorías y revisión previa al cierre. La regla de cuándo usarla
  vive en `AGENTS.md`; acá no se repite.
- El agente `ux-ui-reviewer` (`.claude/agents/ux-ui-reviewer.md`, generado
  desde `agent-definitions/ux-ui-reviewer/AGENT.md`) convierte esa skill en un
  workflow ejecutable: discover, design, audit, fix, verify y pre-merge. La
  regla de cuándo usarlo vive en `AGENTS.md`; el detalle de modos y límites
  vive en `agent-definitions/ux-ui-reviewer/README.md`.

## Reglas de plataforma

- No cargues todo `ai/context/`; seguí el presupuesto del rol.
- No lances agentes que editen los mismos archivos en paralelo.
- No uses una skill de `.claude/` como fuente de conocimiento cuando exista su
  equivalente canónico en `ai/`.
- No sincronices specs, archives changes, agregues dependencias ni hagas commit
  sin una petición explícita que autorice esa acción.

Toda conducta de producto, arquitectura, contrato, testing y UI se consulta en
OpenSpec, código y `ai/context/`, no en este adaptador.
