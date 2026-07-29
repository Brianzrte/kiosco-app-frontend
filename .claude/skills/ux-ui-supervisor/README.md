# `ux-ui-supervisor`

Skill de supervisión UX/UI para el frontend de Mini Moni. Analiza requerimientos
antes de diseñar, propone layouts, audita pantallas existentes y revisa un
change frontend antes de cerrarlo.

## Propósito

Producir hallazgos y especificaciones **verificables**, no opiniones estéticas.
Toda recomendación responde cinco preguntas: qué problema hay, qué impacto tiene
sobre el usuario, qué principio se aplica, qué cambio concreto se hace, y cómo
se comprueba que quedó resuelto.

Está pensado para potenciar a alguien con buena capacidad técnica y poca
experiencia formal en diseño: en vez de decir "se ve mejor", dice qué medir y
contra qué umbral.

## Estructura

```text
ai/skills/ux-ui-supervisor/
├── SKILL.md                  coordinador: modos, constitución, workflow, contratos
├── README.md                 este archivo
├── references/               conocimiento por área, cargado bajo demanda
│   ├── design-principles.md
│   ├── product-context.md
│   ├── accessibility.md
│   ├── color-system.md
│   ├── typography.md
│   ├── spacing-layout.md
│   ├── responsive-design.md
│   ├── iconography.md
│   ├── motion.md
│   ├── forms-validation.md
│   ├── tables-data-visualization.md
│   ├── navigation-keyboard.md
│   ├── states-feedback.md
│   ├── performance-ux.md
│   ├── pos-patterns.md
│   └── sources.md
├── checklists/               criterios verificables por área
│   ├── design-discovery.md
│   ├── visual-review.md
│   ├── accessibility-review.md
│   ├── responsive-review.md
│   ├── keyboard-review.md
│   └── pre-merge-review.md
├── templates/                formatos de salida
│   ├── design-proposal.md
│   ├── ux-ui-audit.md
│   ├── component-spec.md
│   └── pre-merge-report.md
└── examples/                 auditorías completas de referencia
    ├── pos-sale-screen-review.md
    ├── form-review.md
    └── dashboard-review.md
```

`SKILL.md` **no** duplica el contenido de las referencias: contiene el mapa de
qué leer según la tarea (*Reference loading map*). Es progressive disclosure
deliberado — cargar las 16 referencias en cada invocación desperdicia contexto.

## Compatibilidad y ubicación canónica

**Fuente canónica: `ai/skills/ux-ui-supervisor/`.** Es la estrategia que este
repositorio ya usa para todas sus skills compartidas (`ai/README.md`), y esta se
integra a ella en vez de crear una estructura paralela.

| Herramienta | Cómo la descubre |
|---|---|
| **Codex** (y cualquier agente que lea `AGENTS.md`) | Directamente desde `ai/skills/ux-ui-supervisor/`. `AGENTS.md` es el punto de entrada compartido y apunta acá |
| **Claude Code** | Desde la copia generada en `.claude/skills/ux-ui-supervisor/`, publicada por `scripts/ai/sync-skills.sh` |

La copia bajo `.claude/skills/` lleva un archivo `.ai-generated` y un comentario
`NO EDITAR` insertado tras el frontmatter. **No se edita ahí**: se edita en
`ai/skills/` y se vuelve a sincronizar.

### Portabilidad del `SKILL.md`

El frontmatter es deliberadamente mínimo — sólo `name` y `description` — y el
contenido no usa nada específico de una herramienta:

- sin `allowed-tools`, `context`, `agent`, `model`, `disable-model-invocation`;
- sin inyección dinámica con comandos shell;
- sin variables propias de Claude ni de Codex;
- sin rutas absolutas: todas las rutas son relativas a la raíz del frontend o al
  propio directorio de la skill;
- sin dependencia de ningún MCP.

## Cómo actualizarlo

1. Editar los archivos en `ai/skills/ux-ui-supervisor/`.
2. Sincronizar la copia de Claude Code:

   ```bash
   scripts/ai/sync-skills.sh --dry-run   # ver qué se va a hacer
   scripts/ai/sync-skills.sh             # sincronizar
   ```

3. Verificar el resultado (abajo).

Codex no requiere ningún paso adicional: lee la fuente canónica.

## Cómo verificarlo

```bash
# La copia de Claude existe y está marcada como generada
ls .claude/skills/ux-ui-supervisor/.ai-generated

# La copia coincide con la fuente (salvo la línea de marca en SKILL.md)
diff -r ai/skills/ux-ui-supervisor .claude/skills/ux-ui-supervisor

# El frontmatter tiene sólo name y description
head -5 ai/skills/ux-ui-supervisor/SKILL.md

# Ningún archivo vacío
find ai/skills/ux-ui-supervisor -type f -empty
```

`diff -r` debe reportar únicamente la línea del marcador en `SKILL.md` y el
archivo extra `.ai-generated`.

## Cómo invocarlo

**Claude Code** — se activa solo cuando la tarea coincide con la `description`,
o explícitamente:

```text
/ux-ui-supervisor
Usá ux-ui-supervisor en modo audit sobre /pos
```

**Codex** — se referencia por ruta, ya que `AGENTS.md` es el punto de entrada:

```text
Leé ai/skills/ux-ui-supervisor/SKILL.md y aplicá el modo audit sobre
src/components/pos/PosView.tsx
```

En ambos casos conviene **declarar el modo**. Si no se declara, el skill lo
infiere y lo dice en la primera línea de la salida.

## Los cinco modos

| Modo | Para qué | Salida |
|---|---|---|
| `discover` | Entender la tarea antes de diseñar | `Design Discovery` |
| `design` | Proponer una pantalla nueva | `Design Proposal` |
| `audit` | Revisar una pantalla existente | `UX/UI Review` con score y status |
| `benchmark` | Comparar patrones externos | `Pattern Benchmark` |
| `pre-merge` | Revisar antes de cerrar un change | `Pre-merge Report` con verdict |

### Ejemplos de invocación

```text
Usá ux-ui-supervisor en modo discover para analizar esta funcionalidad antes
de implementarla.
```

```text
Usá ux-ui-supervisor en modo design y generá una propuesta para la pantalla
de venta.
```

```text
Usá ux-ui-supervisor en modo audit para revisar esta página y su screenshot.
```

```text
Usá ux-ui-supervisor en modo benchmark: ¿cómo resuelven la selección de
medio de pago los sistemas de punto de venta?
```

```text
Usá ux-ui-supervisor en modo pre-merge sobre el change activo de OpenSpec.
```

## Cómo combinarlo con el skill técnico de frontend

Este skill **no implementa**. La secuencia habitual:

```text
requirement-analyst                    ← qué se necesita
  → ux-ui-supervisor (discover)        ← quién lo usa y cómo
  → openspec-writer                    ← proposal, design, delta specs, tasks
  → ux-ui-supervisor (design)          ← la especificación visual
  → frontend-implementer               ← el código
    (implement-nextjs-change)
  → ux-ui-supervisor (pre-merge)       ← la revisión visual
  → frontend-reviewer                  ← el review técnico del diff
  → frontend-test-verifier             ← lint, test, build
  → change-closer                      ← sync de specs, archive, commit
```

No es una cadena obligatoria y ningún eslabón encadena al siguiente por su
cuenta. Los modos `discover` y `design` son opcionales para un cambio menor;
`pre-merge` rinde en cualquier change con impacto visible.

Cuando el usuario pide implementar lo propuesto, el trabajo pasa a
`ai/roles/frontend-implementer.md` + `ai/skills/implement-nextjs-change/SKILL.md`
con la `Design Proposal` como entrada.

## Qué no hace

- No implementa código sin pedido explícito.
- No instala dependencias — el runtime es `next`, `react`, `react-dom` y nada
  más (`AGENTS.md` §5).
- No reemplaza el design system ni cambia la identidad visual global por una
  pantalla aislada.
- No propone rediseños masivos sin justificar el alcance.
- No cambia comportamiento de negocio: eso vive en el backend.
- No aprueba una interfaz porque compila.
- No declara accesibilidad completa sin prueba, ni inventa resultados de tests.
- No marca como resuelto algo que no verificó.
- No escribe `proposal.md` ni delta specs — eso es `openspec-writer`.
- No marca checkboxes en `tasks.md`.
- No sincroniza specs, no archiva changes, no hace commit, no crea PR y no hace
  merge — eso es `ai/roles/change-closer.md`.

## Nota sobre la estructura pedida vs. la implementada

El pedido original planteaba una carpeta `agent-skills/` con exposición por
symlinks o copias hacia `.claude/skills/` y `.agents/skills/`, y un script
`scripts/sync-agent-skills.py`. Ese pedido incluía verificar primero si el
repositorio ya tenía una estrategia de skills compartidas — y la tiene:

- `ai/skills/` es la fuente canónica de todas las skills compartidas;
- `scripts/ai/sync-skills.sh` publica las copias para Claude Code;
- `AGENTS.md` es el punto de entrada por el que Codex consume `ai/` directamente,
  sin necesitar otra copia.

Crear `agent-skills/` habría dejado dos fuentes canónicas en competencia y dos
mecanismos de sincronización, que es exactamente lo que `ai/README.md` y
`AGENTS.md` piden evitar. Por eso esta skill se integró a la estructura
existente, sin scripts nuevos.

Si en el futuro Codex incorpora descubrimiento nativo desde `.agents/skills/`,
el camino proporcional es **extender `scripts/ai/sync-skills.sh`** con un
segundo destino, no duplicar el árbol.
