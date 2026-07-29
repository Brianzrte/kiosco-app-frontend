# Agent Instructions — Mini Moni Frontend

Punto de entrada para cualquier agente (Claude Code, Codex, otros). **Leé esto
primero.** Es corto a propósito: el detalle vive en `ai/context/`, y se carga
bajo demanda.

## Qué es esto

Frontend del punto de venta e inventario de un kiosco de una sola sucursal
operado por 1 a 5 personas. Next.js 16 (App Router) + React 19, TypeScript
strict, Tailwind v4, Vitest. Repositorio separado del backend Go en
`../backend`, que es la fuente de toda regla de negocio.

## Reglas

1. **Leé `AGENTS.md` primero.** Después, el spec de OpenSpec de la capability
   afectada.
2. **OpenSpec es normativo.** `openspec/specs/ui-*/spec.md` dice qué debe hacer
   el frontend; `openspec/changes/<id>/` es trabajo en curso, y su `design.md`
   contiene decisiones ya tomadas que ganan sobre la preferencia propia. Los
   documentos de `ai/context/` son descriptivos, no normativos: ante un
   conflicto, gana el spec; ante un conflicto con el código, gana el código y
   el documento está desactualizado. Los adaptadores de plataforma no son
   fuentes de conocimiento.
3. **Usá `ai/context/` de forma selectiva.** No cargues el directorio completo.
   La tabla de qué leer según la tarea está en `ai/README.md`.
4. **Para cambios de código, usá el núcleo compartido:** leé
   `ai/roles/frontend-implementer.md` y seguí
   `ai/skills/implement-nextjs-change/SKILL.md`. La skill
   `.claude/skills/frontend-kiosco-app/SKILL.md` es sólo un alias de
   compatibilidad para Claude Code y no es fuente canónica.
5. **No agregues dependencias.** El runtime es `next`, `react`, `react-dom` y
   nada más. Agregar una —incluida cualquier herramienta de testing— es una
   decisión que se levanta al usuario y se registra en el `design.md` de un
   change.
6. **No llames al backend directamente.** Todo pasa por `api<T>()` →
   `/api/backend/[...path]` → backend. El token vive en una cookie httpOnly y
   nunca llega a JS del navegador.
7. **Usá el UI kit** (`src/components/ui/`) y sólo tokens del design system.
   Estilo ad-hoc por pantalla es un defecto; si falta una variante, extendé el
   primitive.
8. **Corré las validaciones**: `npm run lint` y `npm test`, más `npm run build`
   cuando el cambio toca tipos, `page.tsx` o `route.ts`. Reportá qué corriste y
   qué quedó sin verificar — no hay tests de componente en este repo.
9. **Implementá sólo el alcance pedido.** No rediseñes la arquitectura, no
   agregues features especulativas, no toques código fuera del alcance, no
   archives changes por tu cuenta y no marques una tarea sin evidencia.
10. **Si el contrato no está claro, revisá el backend real**:
    `../backend/internal/bootstrap/router.go` y `../backend/openspec/specs/`.
    Si un endpoint no existe, documentalo en el `backend-request.md` del change
    — **nunca lo mockees**.

## Dónde está cada cosa

| Documento | Para qué |
|---|---|
| `ai/README.md` | Qué es el núcleo compartido, qué es canónico, política de contexto mínimo. |
| `ai/context/` | Documentos descriptivos compartidos: alcance, arquitectura, mapa de áreas, convenciones, UI, testing, OpenSpec, API, roles y coordinación backend. |
| `ai/roles/` | Responsabilidad, límites y salida de cada agente. |
| `ai/skills/` | Procedimientos neutrales compartidos por Claude Code y Codex. |
| `CLAUDE.md` | Adaptador fino de entrada para Claude Code. |
| `.claude/` | Capa específica de Claude Code: agentes, skills generadas/compatibles y comandos. Codex puede ignorarla. |
| `scripts/ai/` | Automatización neutral y reproducible del sistema de agentes; `sync-skills.sh` publica las skills compartidas para Claude Code. |

Para analizar un requerimiento antes de crear un change: leé
`ai/roles/requirement-analyst.md` y seguí
`ai/skills/analyze-frontend-requirement/SKILL.md`.

## Supervisión UX/UI

Usá la skill `ai/skills/ux-ui-supervisor/SKILL.md` cuando una tarea crea o
cambia layouts, componentes, formularios, tablas, navegación, interacciones,
comportamiento responsive o estados visuales de cara al usuario, y antes de
cerrar un change frontend con impacto visible. Es supervisora: no implementa,
no agrega dependencias, no marca tasks y no archiva.

Para ejecutar ese conocimiento de punta a punta —discovery, diseño, auditoría,
corrección acotada e implementada, y verificación independiente— usá el agente
`ux-ui-reviewer` (`agent-definitions/ux-ui-reviewer/`, con adaptadores para
Claude Code y Codex). Usa siempre `ux-ui-supervisor`; en modo `fix` combina
además `ai/roles/frontend-implementer.md` +
`ai/skills/implement-nextjs-change/SKILL.md`. No se usa para trabajo
puramente backend, y no cierra changes, no hace commit ni merge: el resultado
de su modo `pre-merge` se entrega a `ai/roles/change-closer.md`.

Para cerrar un change: leé `ai/roles/change-closer.md` y seguí
`ai/skills/close-openspec-change/SKILL.md`. Implementar no es cerrar; el
reviewer y el verifier no archivan. El closer es el único rol que sincroniza
specs, archiva y crea el commit de cierre — y sólo recomienda la integración:
`push`, PR y `merge` requieren una acción explícita posterior.

La matriz completa de roles, skills y presupuestos de contexto está en
`ai/README.md`.
