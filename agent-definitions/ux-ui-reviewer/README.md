# `ux-ui-reviewer`

Agente operativo de UX/UI para el frontend de Mini Moni. Compatible con
**Claude Code** y **Codex**, generado desde una única fuente canónica.

## Qué hace

Convierte el conocimiento de la skill `ux-ui-supervisor` en un workflow
ejecutable de punta a punta: reúne contexto, decide qué es correcto desde
UX/UI, implementa la corrección cuando corresponde, y vuelve a validar el
resultado de forma independiente. Actúa como diseñador de interacción, revisor
UX/UI, auditor de accesibilidad, supervisor de consistencia visual,
implementador de mejoras frontend acotadas, y validador posterior a la
implementación.

## Agente vs. skill

```text
ux-ui-supervisor (skill)
    Conocimiento: principios, clasificación de producto, checklists, modelo de
    severidad, scoring, plantillas de salida. No actúa por sí sola.

ux-ui-reviewer (agente)
    Reúne contexto, aplica las reglas de ux-ui-supervisor, coordina la
    implementación con la skill técnica del frontend cuando el modo lo
    permite, y valida el resultado. La skill es el conocimiento; el agente es
    quien lo ejecuta.
```

`ux-ui-reviewer` **no** reemplaza a `ux-ui-supervisor`: la carga siempre antes
de producir un hallazgo o una propuesta. Si la skill no puede localizarse, el
agente se detiene y lo reporta en vez de improvisar un modelo de severidad
propio.

## Modos

| Modo | Cuándo usarlo | Puede editar código |
|---|---|---|
| `discover` | Antes de diseñar; entender usuario, tarea, riesgos y estados necesarios | No |
| `design` | Convertir un requerimiento entendido en una especificación UX/UI implementable | No (salvo pedido explícito) |
| `audit` | Revisar una pantalla, componente o change ya implementado | No |
| `fix` | Implementar hallazgos o requerimientos UX/UI ya acordados | Sí, dentro del alcance |
| `verify` | Comprobar de forma independiente que un `fix` resolvió lo que decía resolver | No |
| `pre-merge` | Revisión UX/UI final antes de que `change-closer` cierre el change | No |

Un cambio chico e inequívoco puede recorrer `audit → fix → verify` en la misma
invocación, como fases separadas. Un rediseño grande siempre pasa por
`discover → design → aprobación humana` antes de tocar código.

### `Mobile & Responsive` es obligatoria

`audit`, `verify` y `pre-merge` siempre incluyen la sección
`Mobile & Responsive`, con la matriz mínima de viewports (320 × 568, 360 × 640,
360 × 800, 390 × 844, 414 × 896, 430 × 932, 844 × 390, 768 × 1024, 1280 × 720;
más 1024 × 768 y 1366 × 768 en POS), la tabla de resultados por viewport y la
separación entre lo **probado** y lo revisado de forma **estática**. Como este
repo no tiene E2E ni tests de componente, lo habitual es revisión estática: el
agente lo declara así en vez de afirmar que un viewport fue validado. La regla
de fondo —mobile-first, funcional desde 320 px, sin scroll horizontal
accidental— vive en `ai/skills/ux-ui-supervisor/references/responsive-design.md`
y no se duplica acá.

### Cuándo NO usarlo

- Trabajo puramente de backend, contratos de API o reglas de negocio.
- Decidir si una feature entra en el producto (`requirement-analyst`).
- Escribir un change de OpenSpec (`openspec-writer`).
- Code review general de un diff sin foco UX/UI (`frontend-reviewer` — este
  agente profundiza su sección de UI, no la reemplaza).
- Ejecutar la verificación completa de un change o cerrarlo
  (`frontend-test-verifier`, `change-closer`).
- Cambios de refactor sin impacto visual ni de interacción.

## Compatibilidad Claude Code / Codex

Los dos formatos de agente son incompatibles entre sí (Markdown + YAML
frontmatter vs. TOML), así que no se comparte un archivo por symlink. En su
lugar:

```text
agent-definitions/ux-ui-reviewer/AGENT.md   ← fuente canónica, neutral
        │
        ├─→ .claude/agents/ux-ui-reviewer.md    (generado)
        └─→ .codex/agents/ux-ui-reviewer.toml   (generado)
```

`AGENT.md` no contiene YAML de Claude, TOML de Codex, nombres de herramientas
exclusivos de una plataforma, rutas absolutas ni un modelo fijo. Empieza con un
encabezado neutral de dos o tres líneas (`Agent:`, `Description:`,
`Skills:` opcional) que el script de sincronización usa para completar los
campos de identidad de cada adaptador; el resto es el cuerpo canónico, igual
en ambas plataformas.

### Claude Code

- Ubicación: `.claude/agents/ux-ui-reviewer.md`.
- Frontmatter mínimo: `name`, `description`, `model: inherit` y
  `skills: [ux-ui-supervisor]` para precargar la skill.
- **Sin lista de `tools:` explícita.** El resto de los agentes de este repo sí
  restringen `tools:`, pero ninguno necesita herramientas de navegador o
  captura de pantalla; `ux-ui-reviewer` sí las necesita cuando están
  disponibles en la sesión (modo `audit`/`verify`/`pre-merge`, sección 18 del
  encargo original). Restringir `tools:` a un set fijo le impediría usarlas.
  Es una decisión explícita, no un olvido — ver *Decisiones importantes* más
  abajo.
- Sin `permissionMode: bypassPermissions`.
- Invocación (adaptar a la sintaxis real disponible en la instalación):
  ```text
  Usá el agente ux-ui-reviewer en modo audit para revisar el change activo.
  ```
  ```text
  @ux-ui-reviewer corregí los hallazgos HIGH del reporte actual.
  ```

### Codex

- Ubicación: `.codex/agents/ux-ui-reviewer.toml`.
- Campos: `name = "ux_ui_reviewer"` (guion bajo — el nombre conceptual sigue
  siendo `ux-ui-reviewer` en toda la documentación), `description`, y
  `developer_instructions` con el contenido canónico completo.
- **No se usó `skills.config`.** La versión de Codex instalada en este entorno
  (`codex-cli 0.145.0`, ver `codex doctor`) descubre skills desde
  `$CODEX_HOME/skills` (global) y no expone un campo de configuración de
  skills por proyecto que se pueda validar de forma confiable ni portable
  entre máquinas. En su lugar, `developer_instructions` empieza con una
  instrucción explícita: localizar y cargar
  `ai/skills/ux-ui-supervisor/SKILL.md` antes de trabajar, buscarlo si no está
  en esa ruta, y detenerse con un reporte explícito si no puede encontrarse —
  nunca improvisar sus reglas.
- **No se fijó `model_reasoning_effort`.** El repositorio no tiene una
  convención establecida para ese campo (no hay otro `.codex/agents/*.toml`
  previo); agregarlo sin esa convención sería una decisión de plataforma no
  pedida.
- No se pudo confirmar en este entorno que la versión instalada de Codex
  **descubra automáticamente** `.codex/agents/*.toml` como un mecanismo nativo
  de subagentes (no aparece un subcomando ni una opción de `codex --help`
  relacionada). El archivo es la implementación exacta pedida y queda listo
  para cuando esa integración exista o para invocarlo manualmente. Ver
  *Riesgos o pendientes* en el resumen de entrega.
- Invocación conceptual, a adaptar según la integración real disponible:
  ```text
  Usá el subagente ux_ui_reviewer para auditar el change activo.
  ```
  ```text
  Delegá a ux_ui_reviewer la implementación y verificación de los hallazgos UX/UI.
  ```

## Fuente canónica

`AGENT.md` es la única fuente editable. No se editan directamente
`.claude/agents/ux-ui-reviewer.md` ni `.codex/agents/ux-ui-reviewer.toml` —
ambos llevan una advertencia de archivo generado en su encabezado.

## Sincronización

```bash
python scripts/sync-agent-definitions.py --sync ux-ui-reviewer   # un agente
python scripts/sync-agent-definitions.py --sync                  # todos
python scripts/sync-agent-definitions.py --check ux-ui-reviewer  # verificar, no escribe
python scripts/sync-agent-definitions.py --check                 # verificar todos
```

`--check` termina con código de salida distinto de cero si algún adaptador
está desactualizado o falta. El script es idempotente (correr `--sync` dos
veces seguidas no vuelve a tocar los archivos si no cambió la fuente), no usa
dependencias externas y funciona igual en Windows, macOS y Linux (usa
`pathlib`, sin comandos de shell).

Es un mecanismo nuevo, separado de `scripts/ai/sync-skills.sh`: ese script
sincroniza **skills** (`ai/skills/` → `.claude/skills/`), de una sola
plataforma a otra, copiando archivos casi sin transformar. Este script
sincroniza **agentes** hacia **dos** plataformas con formatos incompatibles
entre sí (Markdown+YAML vs. TOML), por lo que necesita generar contenido, no
sólo copiarlo. Extender `sync-skills.sh` para eso habría mezclado dos
artefactos distintos (skill vs. agente) en un mismo mecanismo.

## Validación

Antes de dar por buena una sincronización:

```bash
python scripts/sync-agent-definitions.py --check
python3 -c "import tomllib; tomllib.load(open('.codex/agents/ux-ui-reviewer.toml','rb'))"
```

No hay un validador de agentes de Claude Code disponible desde línea de
comandos en este entorno más allá de que la sesión lo descubra al arrancar; si
hace falta confirmar el descubrimiento, reiniciar Claude Code y comprobar que
`ux-ui-reviewer` aparece entre los agentes disponibles.

## Integración con OpenSpec

`ux-ui-reviewer` lee `proposal.md`, `design.md`, delta specs y `tasks.md` del
change activo, compara spec esperado contra implementación en `audit`, y
puede proponer criterios UX/UI en `discover`/`design`. Nunca marca tasks,
nunca sincroniza specs y nunca archiva — eso es exclusivamente
`change-closer`. Su salida de `pre-merge` es un insumo para `change-closer`,
no un reemplazo de su reporte de cierre.

## Motion

`ux-ui-reviewer` aplica la estrategia de motion de `ux-ui-supervisor`
(`ai/skills/ux-ui-supervisor/references/motion.md`): una jerarquía CSS →
Motion for React (`motion/react`) → FormKit AutoAnimate (`@formkit/auto-animate`)
→ excepcional, elegida por adecuación, no por preferencia. Las dos
dependencias ya están instaladas en este proyecto; el agente no las propone
como instalación, sólo decide cuándo usarlas.

```text
Usá ux-ui-reviewer en modo design y definí qué animaciones necesita
la pantalla sin instalar dependencias todavía.
```

```text
Usá ux-ui-reviewer en modo audit para detectar animaciones excesivas,
problemas de reduced motion y límites Client Component innecesarios.
```

```text
Usá ux-ui-reviewer en modo fix para implementar los hallazgos de motion
aprobados usando CSS, Motion o AutoAnimate según corresponda.
```

## Integración con el frontend

La skill técnica detectada es `ai/skills/implement-nextjs-change/SKILL.md`
(rol `ai/roles/frontend-implementer.md`). `.claude/skills/frontend-kiosco-app`
es sólo un alias de compatibilidad, no la fuente. En modo `fix`,
`ux-ui-reviewer` combina `ux-ui-supervisor` (qué es correcto) con esa skill
técnica (cómo implementarlo respetando arquitectura, componentes, tokens y
tests). Si la skill técnica no puede cargarse, el agente puede seguir en
modos de solo análisis pero no debe implementar.

## Límites

- No hace `git commit`, `push`, `merge`, `rebase`, ni crea PR.
- No archiva changes de OpenSpec — eso es `change-closer`.
- No marca checkboxes en `tasks.md`.
- No agrega dependencias (este repo no tiene Playwright, jsdom ni Testing
  Library; no los instala para "poder verificar mejor" — eso es una decisión
  de dependencias que se levanta al usuario).
- No cambia contratos de backend, reglas de negocio, permisos ni esquemas de
  datos sin autorización explícita.
- No inicia un rediseño grande sin una propuesta `design` aprobada.
- No se auto-aprueba: `audit`, `fix` y `verify` son siempre fases separadas.

## Ejemplos

Ver `examples.md` en este mismo directorio.
