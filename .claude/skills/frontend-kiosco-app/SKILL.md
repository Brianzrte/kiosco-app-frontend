---
name: frontend-kiosco-app
description: Alias de compatibilidad de Claude Code para implementar un change OpenSpec en el frontend de Mini Moni. Usar cuando una integración antigua invoque esta skill al tocar src; delega todas las reglas y el procedimiento al núcleo compartido y no contiene conocimiento propio.
---

# Adaptador legacy del frontend

Esta skill se mantiene para no romper invocaciones existentes de Claude Code.
No es fuente canónica y no debe crecer.

Para implementar:

1. leer `AGENTS.md`;
2. seguir `ai/roles/frontend-implementer.md`;
3. ejecutar `ai/skills/implement-nextjs-change/SKILL.md`;
4. cargar sólo el contexto indicado por ese rol y esa skill.

Para otros trabajos, elegir el par rol/skill de `ai/README.md`.

No copiar reglas de arquitectura, API, UI, testing, producto u OpenSpec acá.
No agregar comportamiento específico de Claude salvo adaptación de
herramientas; las decisiones compartidas pertenecen a `ai/`.
