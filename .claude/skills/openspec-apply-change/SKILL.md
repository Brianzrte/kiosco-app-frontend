---
name: openspec-apply-change
description: Adaptador de compatibilidad de Claude Code para aplicar un change OpenSpec en Mini Moni frontend. Requiere el nombre exacto del change y delega al rol frontend-implementer y a implement-nextjs-change; trabaja una sola sección coherente, verifica evidencia y no archiva.
---

# Aplicar un change frontend

Esta integración conserva el nombre histórico `openspec-apply-change`, pero no
define un procedimiento paralelo.

1. Exigir el nombre exacto del change.
2. Leer `ai/roles/frontend-implementer.md`.
3. Seguir `ai/skills/implement-nextjs-change/SKILL.md`.
4. Aplicar los permisos y límites del agente
   `.claude/agents/frontend-implementer.md`.

No auto-seleccionar un change, recorrer todas las tasks, corregir planning para
acomodar el código, agregar dependencias, sincronizar specs ni archivar.
