---
name: openspec-propose
description: Adaptador de compatibilidad de Claude Code para escribir un change OpenSpec de Mini Moni frontend desde un Requirement Context aprobado. Delega al rol openspec-writer y sus skills compartidas; no convierte una idea vaga directamente en artifacts ni implementa.
---

# Proponer un change frontend

Esta integración conserva el nombre histórico `openspec-propose`, pero no
define un procedimiento paralelo.

1. Si falta un `Requirement Context` aprobado, usar primero
   `.claude/agents/requirement-analyst.md`.
2. Leer `ai/roles/openspec-writer.md`.
3. Seguir `ai/skills/write-frontend-openspec-change/SKILL.md`.
4. Validar con
   `ai/skills/validate-frontend-openspec-change/SKILL.md`.
5. Aplicar los permisos del agente `.claude/agents/openspec-writer.md`.

No derivar decisiones bloqueantes desde una idea vaga, implementar, marcar
tasks, sincronizar specs ni archivar.
