# Template — Component Spec

Se usa cuando el modo `design` concluye que hace falta un componente nuevo, o
que hay que extender un primitive existente.

**Antes de completarlo**, responder honestamente: ¿algún primitive de
`src/components/ui/` resuelve esto con una variante más? Si la respuesta es sí,
la salida correcta es una extensión, no un componente nuevo
(`../references/product-context.md`).

---

```markdown
# Component Spec — <Nombre>

## Decision

- [ ] Extensión de un primitive existente → cuál, qué variante, por qué
- [ ] Composición en `components/<feature>/` → por qué se repite
- [ ] Primitive nuevo en `ui/` → por qué es genérico y sin dominio

Justificación en una o dos frases. Un primitive nuevo requiere que sea genérico,
que no conozca ningún dominio, y que tenga al menos dos consumidores reales.

## Purpose

Qué problema resuelve. Qué componente existente **no** lo resuelve y por qué.

## Location

`src/components/ui/<Nombre>.tsx` — sólo si es genérico y sin dominio.
`src/components/<feature>/<Nombre>.tsx` — si conoce el dominio.

Regla: `ui/` no importa de `components/<feature>/` ni conoce ningún dominio.

## API

​```ts
type <Nombre>Props = {
  // props mínimas — cada una justificada abajo
  className?: string;  // todos los primitives lo aceptan y lo concatenan al final
};
​```

| Prop | Tipo | Requerida | Para qué |
|---|---|---|---|

Una API con más de ~6 props para un caso de uso indica que el componente está
haciendo dos cosas.

## Variants

| Variante | Cuándo | Tokens |
|---|---|---|

## Anatomy

​```text
┌─────────────────────────────┐
│ [icono] Texto      [acción] │
└─────────────────────────────┘
​```

Qué elemento HTML es cada parte, y por qué (semántica nativa antes que ARIA).

## Tokens

Sólo tokens existentes de `globals.css`.

| Propiedad | Token |
|---|---|
| Fondo | |
| Texto | |
| Borde | |
| Radio | `rounded-app` |
| Sombra | `shadow-soft` |
| Espaciado interno | |

## States

| Estado | Apariencia | Notas |
|---|---|---|
| default | | |
| hover | | |
| focus | | usa el `:focus-visible` global; no se redefine |
| active | | |
| selected | | distinguible de hover y de focus |
| disabled | | debe explicar qué falta |
| loading | | |
| error | | |

Los estados que no apliquen se escriben `No aplica`, no se borran.

## Keyboard

| Tecla | Efecto |
|---|---|

Foco inicial, restauración del foco y comportamiento de Escape si es un overlay.

## Accessibility

- Elemento nativo usado y por qué.
- Nombre accesible: de dónde sale.
- Atributos ARIA necesarios, y **por qué el HTML nativo no alcanza**.
- Contraste de los pares de color usados, medido.
- Tamaño del área interactiva.

## Responsive

Qué hace en anchos chicos. Si es un componente reutilizable montado en
contenedores de ancho distinto, considerar container queries en vez de
breakpoints de viewport.

## Motion

Duraciones desde `lib/motion.ts`. Qué trabajo hace la animación. Qué pasa con
`prefers-reduced-motion`.

## Usage

​```tsx
<Nombre prop="valor" />
​```

Consumidores previstos. Si hay uno solo, revisar si corresponde un componente.

## Non-goals

Qué **no** hace este componente. Evita que crezca hasta ser un framework.

## Acceptance criteria

- [ ] Verificables sí/no, ejecutables a mano.

## Testing notes

En este repo **no hay tests de componente** (no hay jsdom ni Testing Library).
Entonces:

- Qué lógica pura se puede extraer a `lib/` y testear con Vitest.
- Qué queda como verificación **manual**, enumerada explícitamente.

No se propone agregar un runner de tests: es una decisión de dependencia que se
levanta al usuario.
```
