# Template — Design Proposal

Salida del modo `design`. Se mantienen **todos** los encabezados; una sección
vacía se escribe `Ninguno` o `No aplica`, no se borra.

Recordatorio: una propuesta **no está completa** sin loading, empty, error y
responsive (constitución §19). Y no implementa código salvo pedido explícito.

---

```markdown
# Design Proposal — <pantalla>

Modo: design
Tipo de producto: <landing | dashboard | SaaS admin | formulario | e-commerce |
                   POS | configuración | reporte | tabla | móvil | híbrido>
Perfil aplicado: <p. ej. operational-pos>
Change de OpenSpec: <id o "ninguno">

## Problem

Qué problema del usuario resuelve esta pantalla. Una o dos frases. Si no se
puede enunciar sin hablar de la solución, todavía no está entendido.

## User and context

Rol, entrenamiento, frecuencia de uso, lugar físico, qué está haciendo con las
manos, si hay alguien esperando.

## Primary task

Una sola frase con un solo verbo. Debajo, los pasos del camino feliz numerados.

## Information hierarchy

Ordenado de mayor a menor importancia. Para cada nivel: qué dato, por qué está
en ese nivel, y con qué se lo distingue (posición, tamaño, peso, color).

1. …
2. …
3. …

## Layout

Diagrama ASCII de las regiones. Para cada región: qué contiene, si scrollea,
cuál es su acción primaria.

​```text
┌──────────────────────────┬─────────────────┐
│ Región A                 │ Región B        │
└──────────────────────────┴─────────────────┘
​```

## Components

Tabla de todo lo que compone la pantalla:

| Región | Componente | Origen | Variante / props |
|---|---|---|---|
| … | `Button` | `ui/Button.tsx` | `variant="primary"` |

## Design tokens

Sólo tokens existentes de `globals.css`. Si falta alguno, va en
`## Open questions and assumptions` con al menos dos usos reales que lo
justifiquen — **no** se inventa acá.

| Uso | Token |
|---|---|
| Fondo de la pantalla | `bg-background` |
| … | … |

Tipografía: qué escalón para cada nivel de la jerarquía.
Espaciado: qué valores dentro de grupo y entre grupos.

## Interaction model

Para cada acción: qué la dispara, qué pasa, qué se ve mientras pasa, y qué queda
después.

| Acción | Disparador | Durante | Resultado |
|---|---|---|---|

## Keyboard behavior

| Tecla | Contexto | Efecto |
|---|---|---|
| Tab | … | … |
| Enter | … | … |
| Escape | … | … |

- Foco inicial: …
- Restauración del foco después de cada acción: …
- Atajos visibles: …

## Responsive behavior

Qué pasa en cada corte, con reflow explícito (no ocultamiento):

| Viewport | Comportamiento |
|---|---|
| 360 × 800 | … |
| 1024 × 768 | … |
| 1280 × 720 | … |
| 1920 × 1080 | … |

## States

Los cinco obligatorios, más los que apliquen:

| Estado | Qué se ve | Componente |
|---|---|---|
| Loading | … | `ListSkeleton` |
| Empty | … | `EmptyState` + acción |
| Empty por filtro | … | … |
| Error | … | `ErrorState` |
| Pending | … | `Button pending` |
| Disabled | … + explicación de qué falta | … |

## Errors and recovery

| Error | Mensaje | Dónde | Recuperación |
|---|---|---|---|

Cada mensaje dice qué pasó, qué se esperaba y cómo resolverlo. Los mensajes del
backend se muestran tal cual.

Qué se conserva ante un fallo: (regla dura: **todo** lo que el usuario cargó).

## Motion

| Qué | Mecanismo | Duración | Curva | Qué trabajo hace | Reduced motion |
|---|---|---|---|---|---|

`Mecanismo` es `CSS`, `Motion` o `AutoAnimate`, elegido con el árbol de
decisión de `../references/motion.md`. Si no es `CSS`, la fila justifica por
qué el nivel anterior no alcanza. Ninguna fila queda en `Motion` o
`AutoAnimate` "porque sí" — ese es un hallazgo del propio `design`, no sólo de
un `audit` posterior.

Estrategia de `prefers-reduced-motion`: qué se degrada y qué se conserva, con
el motivo. Una fila sin degradación declarada asume que se degrada a fade
corto salvo que la propuesta diga lo contrario.

## Accessibility

- Landmarks y headings: …
- Nombres accesibles: …
- Regiones vivas (`aria-live`, `role="alert"`): …
- Contraste de los pares nuevos: …
- Targets: …
- Qué **no** se puede verificar sin implementar: …

## Reused components

Lista explícita. Si es corta, hay que justificar por qué.

## New components

Para cada uno: por qué ningún primitive existente sirve, dónde vive
(`ui/` sólo si es genérico y sin dominio; si no, `components/<feature>/`), y su
API mínima. Ver `../templates/component-spec.md`.

Si no hay ninguno: `Ninguno` — que suele ser la mejor respuesta.

## Acceptance criteria

Verificables por una persona, en formato `Requirement` / `Scenario` compatible
con los delta specs del change. Cada uno tiene que poder responderse sí/no sin
interpretar.

- [ ] …
- [ ] …

Malos: "el layout es claro", "se ve consistente".
Buenos: "el total sigue visible sin scrollear en 1024 × 768", "al cerrar el
modal el foco vuelve al botón que lo abrió".

## Open questions and assumptions

**Preguntas abiertas** — lo que hay que decidir antes de implementar, con quién
decide.

**Supuestos** — lo que se asumió para poder completar la propuesta. Si un
supuesto resulta falso, qué parte de la propuesta cambia.

Ninguna de las dos secciones se omite. Una propuesta sin preguntas abiertas casi
siempre significa que no se buscaron.
```
