# Motion

## Terminología

**`FormKit AutoAnimate`** (paquete `@formkit/auto-animate`) es un proyecto de
FormKit. **No tiene relación con Formik** (la librería de formularios de
React). No escribir "Formik AutoAnimate" ni `formik/auto-animate` en ningún
hallazgo, propuesta o commit — es un error de nombre, no una variante válida.

## Estado de dependencias en este proyecto

`motion` (`^12.43.0`) y `@formkit/auto-animate` (`^0.10.0`) **ya están
instaladas** (`package.json`, verificado también contra `node_modules`). No es
necesario proponer instalarlas ni levantar la decisión al usuario — la decisión
de adoptarlas ya está tomada a nivel de dependencias.

`framer-motion` aparece en el lockfile **sólo como dependencia interna de
`motion`** (el paquete `motion` está construido sobre `framer-motion` y ambos
se versionan juntos). No es una dependencia directa del proyecto y ningún
archivo de `src/` importa desde `framer-motion`. Por eso: **todo import nuevo
se hace desde `motion/react`, nunca desde `framer-motion` directamente** — no
hay una migración pendiente, hay una única forma correcta desde el principio.

```tsx
// Correcto
import { motion, AnimatePresence, useReducedMotion } from "motion/react";

// Incorrecto en este proyecto: no hay uso directo de framer-motion que
// migrar, y agregar uno nuevo crearía la inconsistencia que se quiere evitar.
import { motion } from "framer-motion";
```

Si en algún momento apareciera un import directo de `framer-motion` en el
código, es un hallazgo (`MEDIUM`): dos formas de llegar a la misma librería
duplican la superficie de import sin necesidad.

Esto **no cambia** la regla general del proyecto de no agregar dependencias
por iniciativa propia (`AGENTS.md` §5): motion y AutoAnimate son las únicas dos
excepciones ya resueltas. Cualquier otra librería de animación (GSAP, React
Spring, etc.) sigue siendo una decisión que se levanta al usuario — ver
*Nivel 4* más abajo.

## Jerarquía de mecanismos

```text
Nivel 1 — CSS / Tailwind transitions
Nivel 2 — Motion for React (motion/react)
Nivel 3 — FormKit AutoAnimate (@formkit/auto-animate)
Nivel 4 — Excepcional: se levanta al usuario, no se decide en este skill
```

El orden **no** representa potencia ni preferencia estética. Representa
adecuación: cada nivel resuelve un problema que el anterior no puede resolver
bien, y usar un nivel más alto para un problema que el anterior ya resuelve es
en sí mismo un hallazgo.

> **Regla central: se usa el mecanismo más chico, claro y eficiente que
> resuelva correctamente la interacción.** No Motion para un hover trivial. No
> AutoAnimate para una interacción que necesita control preciso de entrada y
> salida. No CSS para una animación de presencia que de verdad necesita
> coordinar montaje, desmontaje y layout.

Ver también constitución §26 y §27 en `SKILL.md`.

## Motion funcional vs decorativo

**Funcional** — hace uno de estos cuatro trabajos, y sólo se justifica si hace
alguno:

| Trabajo | Ejemplo en este producto |
|---|---|
| **Explicar** un cambio de estado | El botón pasa a `pending` con su spinner |
| **Conectar** dos posiciones | El diálogo entra desde donde se lo abrió |
| **Confirmar** que algo pasó | `.flash` en la línea del carrito recién escaneada |
| **Dar feedback** de una entrada | El botón se hunde levemente al presionarlo |

**Decorativo** — parallax, entradas escalonadas, contadores que suben número
por número, hover que escala, elementos que flotan. En una pantalla operativa
es un costo sin beneficio: agrega latencia percibida a algo que el usuario ya
sabe que pasó. Esto aplica **igual** si la animación decorativa se implementa
en CSS, en Motion o en AutoAnimate — el mecanismo no vuelve funcional algo que
no lo es.

Regla de decisión: **si al quitar la animación el usuario no pierde ninguna
información, la animación sobra.**

En un POS el techo es todavía más bajo. Una animación de 300 ms en una acción
que se repite 200 veces por turno son 60 segundos de espera por turno,
introducidos a propósito.

## Árbol de decisión

Recorrer en orden. El primer paso que se cumple decide el mecanismo.

### Paso 1 — ¿Es una transición simple de estado?

Usar **CSS o Tailwind** cuando sólo se necesita: cambiar color, cambiar
background, cambiar borde, cambiar sombra, mostrar el focus ring, feedback de
press, un cambio simple de opacidad o de `transform`, hover, active, disabled,
o una transición sin montaje ni desmontaje complejo.

```css
transition:
  color 150ms var(--ease-standard),
  background-color 150ms var(--ease-standard),
  border-color 150ms var(--ease-standard),
  box-shadow 150ms var(--ease-standard),
  transform 100ms var(--ease-out);
```

```tsx
className="
  transition-[color,background-color,border-color,box-shadow,transform]
  duration-150
  ease-out
  active:scale-[0.98]
"
```

**Nunca `transition-all` como valor por defecto.** `transition-all` anima
cualquier propiedad que cambie, incluidas las que nadie previó — un cambio de
`width` por reflow del contenido, por ejemplo — y hace imposible razonar sobre
qué se está animando o su costo de layout. Enumerar las propiedades es más
texto pero es la única forma de controlar qué se anima y a qué costo.

Este es el nivel que **ya cubre casi todo el motion actual de este
proyecto**: `.flash`, `.total-flash`, `.pop-in` y `.section-enter` en
`src/app/globals.css` son CSS puro, y siguen siendo la elección correcta para
lo que resuelven. Adoptar Motion o AutoAnimate no los reemplaza.

### Paso 2 — ¿Necesita control de presencia o de layout?

Usar **Motion** (`motion/react`) cuando se necesita: animación de montaje,
animación de desmontaje, `AnimatePresence`, layout animations, reordenamiento
controlado, modal, drawer, popover complejo, panel expandible, shared layout,
secuencia coordinada, gestos, arrastre, feedback visual con estados
coordinados, control programático, variants, interrupción o reemplazo de una
animación en curso, o una animación cuyo estado depende de React.

### Paso 3 — ¿Sólo cambian los hijos directos de una lista?

Usar **AutoAnimate** cuando: se agregan hijos, se eliminan hijos, se
reordenan hijos, la animación no necesita una secuencia personalizada, no hace
falta controlar entrada y salida por separado, no hacen falta variants, y no
hace falta coordinar la animación con otro componente.

Casos adecuados: lista simple de filtros, chips, mensajes de validación,
campos condicionales sencillos, una lista administrativa, un reordenamiento
sencillo, elementos auxiliares que aparecen o desaparecen.

### Paso 4 — ¿Es una animación excepcional?

Si la necesidad es una timeline compleja, animación basada en scroll, SVG
avanzado, storytelling, canvas, física personalizada o una experiencia de
marketing: **no se resuelve dentro de este skill con GSAP, React Spring u
otra librería por defecto.** Se marca:

```text
Animation architecture decision required
```

y se reporta como una decisión de arquitectura pendiente, igual que una
dependencia nueva o un cambio de contrato — no se decide en modo `audit` ni
`fix` sin autorización.

## Tabla de decisión

Orientativa, no una regla ciega. Ante un caso que no encaja, se resuelve por
el árbol de arriba, no por la tabla.

| Caso | CSS | Motion | AutoAnimate |
|---|---:|---:|---:|
| Hover de botón | Preferido | No | No |
| Focus ring | Preferido | No | No |
| Press scale | Preferido | Opcional | No |
| Modal | No | Preferido | No |
| Drawer | No | Preferido | No |
| Dropdown sencillo | CSS o Motion | Sí | No |
| Lista con inserción sencilla | Posible | Sí | Preferido |
| Lista con salida personalizada | No | Preferido | No |
| Reordenamiento complejo | No | Preferido | Limitado |
| Mensajes de validación | CSS | Sí | Preferido |
| Confirmación de venta | Limitado | Preferido | No |
| Actualización de cantidad | CSS o Motion | Preferido | No |
| Cambio completo de página | Evaluar | Evaluar | No |
| Animación de marketing | Limitado | Posible | No |

Este proyecto no tiene pantallas de marketing (`product-context.md`); esa fila
queda como referencia si alguna vez aparece una (p. ej. una pantalla pública de
onboarding).

## Duraciones de referencia

```text
Press                     80–120 ms
Hover / focus            120–180 ms
Cambio de cantidad       100–160 ms
Entrada de fila          150–200 ms
Salida de fila           120–180 ms
Tooltip / dropdown       150–220 ms
Panel                    180–280 ms
Modal / drawer           220–320 ms
Confirmación de venta    250–400 ms
Transición grande        300–450 ms
```

**Este proyecto ya tiene tres duraciones y no se agrega una escala paralela**
(`ui-system.md`):

```text
--motion-fast   120ms   feedback puntual: hover, resaltado de línea
--motion-base   200ms   transición de sección, entrada de diálogo
--motion-slow   320ms   sólo cuando algo recorre mucha distancia
```

Espejadas en `src/lib/motion.ts` como `MOTION.fast/base/slow`. **Ningún valor
literal de ms fuera de ahí**, tanto en CSS como en props de Motion — un
`duration-[250ms]` en Tailwind o un `transition={{ duration: 0.25 }}` suelto
en un componente de Motion son el mismo hallazgo `MEDIUM`.

En Motion, la duración se expresa en segundos: usar `MOTION.fast / 1000`, no
un número mágico.

```tsx
import { MOTION } from "@/lib/motion";

<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: MOTION.base / 1000, ease: [0.16, 1, 0.3, 1] }}
/>
```

Mapa entre los rangos de referencia de arriba y los tres tokens existentes:

| Rango | Token más cercano |
|---|---|
| Press, hover/focus, cambio de cantidad, salida de fila | `MOTION.fast` (120 ms) |
| Entrada de fila, tooltip/dropdown | `MOTION.fast`–`MOTION.base` según distancia recorrida |
| Panel, modal/drawer | `MOTION.base` (200 ms) |
| Confirmación de venta, transición grande | `MOTION.slow` (320 ms) |

`MOTION.spinnerDelay` (400 ms) no es una duración de animación: es el umbral
antes de mostrar el spinner de un botón pendiente, para no parpadear en
respuestas rápidas. Se saltea sólo con `pendingImmediate`, reservado a la
confirmación de venta.

**No obligar a usar los tres tokens en cada componente** — un token que no
aplica no se fuerza. Y **no se agrega un cuarto token** (por ejemplo un
`MOTION.instant` para separar "press" de "fast") salvo que exista una
necesidad real repetida al menos dos veces y ningún token existente la cubra;
en ese caso se propone como cambio a `src/lib/motion.ts` y `globals.css`
**junto al que ya existe**, no en un archivo nuevo — sigue la misma regla que
cualquier otro token del design system (`pre-merge-review.md` ítem 5, "no se
agregó ningún token nuevo sin al menos dos usos reales").

## Easing

Dos curvas, ya declaradas en `globals.css`:

```text
--ease-out        cubic-bezier(0.16, 1, 0.3, 1)     entradas: rápido y frena
--ease-standard   cubic-bezier(0.4, 0, 0.2, 1)      movimiento entre dos estados
```

- **Entrada**: `ease-out` — `[0.16, 1, 0.3, 1]` en notación de array para
  Motion. Arranca rápido, desacelera. Se siente responsivo.
- **Salida**: no se anima, o es la mitad de larga que la entrada, con una
  curva de salida simple (`[0.4, 0, 1, 1]`) si de verdad hace falta animarla.
- **Cambio de estado** (color, tamaño): `ease-standard` — `[0.4, 0, 0.2, 1]`.
- **`linear`**: sólo para rotación continua (un spinner) y para el degradado
  de reduced motion.

Nunca un `ease-in` en una entrada: parece que la interfaz tarda en reaccionar.

### Spring

Usar spring (Motion soporta `type: "spring"`) sólo cuando: mejora una relación
espacial real, existe drag, el elemento cambia de posición dentro de un
layout, el rebote es mínimo o inexistente, y no afecta una operación
repetitiva.

**Evitar springs con rebote visible en**: importes, mensajes de error, filas
de venta, el botón de cobro, modales críticos, confirmaciones repetitivas. Un
rebote es expresivo; en una tarea que se repite 300 veces por turno, la
expresividad es fricción.

No convertir toda animación de Motion en spring por defecto — un `tween` con
las curvas de arriba sigue siendo la opción por defecto.

## Entrada y salida

Asimetría deliberada: **la entrada se anima, la salida no** (o es la mitad de
larga).

Al abrir, la animación explica de dónde viene el elemento. Al cerrar, el
usuario ya decidió y quiere el resultado: animar la salida es hacerlo esperar
por algo que ya no le interesa. `.section-enter` de este repo hace exactamente
eso — la salida nunca se anima. Lo mismo aplica dentro de `AnimatePresence`:
un `exit` más corto que el `initial`/`animate` correspondiente, o ausente.

## Propiedades que se animan

**Preferir:**

```text
transform   (translate, scale, rotate)
opacity
```

Se resuelven en el compositor, sin recalcular layout ni repintar. Sostienen
60 fps incluso en la PC modesta de un mostrador. Esto es válido tanto para CSS
como para Motion: las props `x`, `y`, `scale`, `rotate` y `opacity` de Motion
se traducen a `transform`/`opacity` internamente.

**Evitar animar:**

```text
width  height  top  left  right  bottom  margin  padding  grid-template-columns
```

Cada frame dispara layout de todo el subárbol. En una tabla de 200 filas eso
son caídas visibles de framerate.

Alternativas: en vez de `width`, `transform: scaleX()`; en vez de `top/left`,
`transform: translate()`; en vez de animar `height` para un acordeón,
`grid-template-rows: 0fr → 1fr` (animable, sin disparar layout del subárbol),
la prop `layout` de Motion (mide con `FLIP` y anima con `transform`, no con
`height` real), o directamente sin animación.

**No asumir que toda animación de `height: auto` es gratis** — incluso con
`layout` de Motion o con `grid-template-rows`, hay que verificar: layout,
paint, compositing, scroll, CLS, CPU y qué pasa con repeticiones rápidas. Ver
*Performance* más abajo y `performance-ux.md`.

`background-color` y `color` son aceptables: repintan pero no relayoutean. Es
exactamente lo que hacen `.flash` y `.total-flash` acá. `filter`, `clip-path` y
`box-shadow` se usan con cuidado — son más costosos que `transform`/`opacity`
pero no disparan layout; medir antes de usarlos en un elemento que se repite.

## Next.js: Server y Client Components

Next.js usa Server Components por defecto. Motion y AutoAnimate son
librerías de React con estado y efectos: **necesitan ejecutarse dentro de un
límite de Client Component** (`"use client"`).

Reglas:

1. **No convertir una página completa en Client Component sólo para
   animarla.** `app/(app)/<ruta>/page.tsx` sigue siendo un Server Component
   delgado (`ai/context/architecture.md`): hace `requireRole()` y renderiza un
   componente de `components/<feature>/`.
2. Mantener Server Components para data fetching, composición, contenido
   estático y estructura no interactiva.
3. Crear (o usar) un Client Component **pequeño** alrededor de la región
   animada, no alrededor de toda la pantalla.
4. `"use client"` va en el archivo más chico que de verdad necesita estado,
   efectos, refs, Motion o AutoAnimate. En este repo eso ya suele ser
   `components/<feature>/XView.tsx` (`frontend-conventions.md`) — la región
   animada puede ser un componente más chico todavía dentro de esa view.
5. Pasar contenido de Server Components mediante `children` cuando sea
   apropiado, para que el árbol estático no entre al bundle de cliente.
6. **No animar un componente si obliga a hidratar una región grande que no
   necesita interacción.** Un badge, un ícono de estado o una fila puntual no
   justifican convertir la tabla entera en cliente.

```tsx
// Server Component — sigue el patrón existente de app/(app)/<ruta>/page.tsx
export default async function SalesPage() {
  const products = await getProducts();

  return (
    <SalesLayout>
      <AnimatedSaleItems products={products} />
    </SalesLayout>
  );
}
```

```tsx
"use client";

import { motion } from "motion/react";

export function AnimatedSaleItems({ products }: Props) {
  return <motion.ul layout>{/* ... */}</motion.ul>;
}
```

En este repo, la mayoría de las vistas (`PosView`, `SalesView`, etc.) ya son
`"use client"` completas porque manejan estado propio (`frontend-conventions.md`).
Ahí la pregunta no es "Server o Client" — ya es Client — sino **cuánto del
árbol necesita re-renderizar** cuando la animación corre: aislar la región
animada en un subcomponente sigue siendo válido para no forzar renders
innecesarios en el resto de la view.

## `MotionConfig`

Un provider de Motion a nivel de proyecto **sólo se justifica si hay uso
repetido** — hoy este repo no lo tiene, y no se crea preventivamente.

```tsx
"use client";

import { MotionConfig } from "motion/react";

export function AppMotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: MOTION.base / 1000, ease: [0.2, 0, 0, 1] }}
    >
      {children}
    </MotionConfig>
  );
}
```

Reglas:

- No crear el provider para una única animación.
- No imponer la misma transición a todo si eso cambia la semántica de un caso
  puntual (p. ej. `.total-flash` necesita `MOTION.fast`, no la duración
  default del provider) — permitir overrides locales justificados.
- `reducedMotion="user"` como comportamiento preferido cuando exista el
  provider: delega en la preferencia del sistema sin lógica manual repetida.
- No envolver toda la aplicación si sólo una ruta usa Motion — envolver esa
  ruta o esa región.
- Evaluar el impacto de convertir un layout global en Client Component antes
  de proponerlo: preferir un provider cliente chico compuesto desde un Server
  Layout, no el `layout.tsx` raíz completo pasando a cliente.

## `LazyMotion`

Evaluar cuándo Motion se usa en múltiples componentes, se quiere controlar el
bundle inicial, sólo se necesitan funcionalidades DOM estándar, el proyecto
tiene objetivos estrictos de rendimiento, o un análisis de bundle muestra un
costo relevante de Motion.

```tsx
"use client";

import { LazyMotion, domAnimation, m } from "motion/react";

export function MotionBoundary({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}
```

Dentro del boundary se usa `m` en vez de `motion`:

```tsx
import { m } from "motion/react";

<m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} />;
```

Reglas:

- `m` sólo dentro de un `LazyMotion`; no mezclar `motion` y `m` en el mismo
  árbol sin necesidad.
- No agregar `LazyMotion` sin medir o justificar — no es gratis en
  complejidad y este proyecto hoy no tiene evidencia de que el bundle de
  Motion sea un problema.
- No optimizar prematuramente una única animación pequeña.
- Para un componente pesado o poco frecuente (un modal especial, un panel que
  casi nadie abre), considerar `next/dynamic` en vez de o además de
  `LazyMotion`.
- El beneficio tiene que superar la complejidad que agrega — si no está claro,
  no se agrega.

## Variants reutilizables

Patrones orientativos. **No se crean como archivo de producto durante una
auditoría o un `design`** — sólo en `fix`, y sólo cuando ya hay Motion
adoptado con uso repetido real (ver *Diseño de API interna* más abajo).

```ts
export const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 4 },
};

export const popIn = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
};
```

Lineamientos:

- No crear decenas de variants casi iguales.
- Centralizar sólo patrones que de verdad se repiten (2+ usos reales).
- Un variant que sólo se usa una vez vive cerca del componente, no en un
  archivo compartido.
- Nombres semánticos (`fadeUp`, `popIn`) antes que nombres visuales
  (`slideAnimation2`).
- Los variants no ocultan lógica compleja — si un variant necesita una
  función para calcularse, esa función vive en `lib/` con su test, no dentro
  del objeto de variant.
- Sin desplazamientos grandes en pantallas operativas: `y: 4` a `y: 8`, no
  `y: 40`.
- Sin `scale` agresivo: `0.96`–`0.98` de entrada, nunca por debajo de `0.9` en
  una interacción frecuente.

## Layout animations con Motion

```tsx
<motion.ul layout>
  <AnimatePresence initial={false}>
    {items.map((item) => (
      <motion.li
        key={item.id}
        layout
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
      >
        {/* ... */}
      </motion.li>
    ))}
  </AnimatePresence>
</motion.ul>
```

Buenas prácticas:

- Keys estables y derivadas del dato (`item.id`), **nunca el índice** — con
  `layout` un key inestable produce animaciones de entrada/salida falsas en
  cada reordenamiento.
- No animar listas enormes sin virtualización; este repo no tiene
  virtualización hoy, así que una lista larga con `layout` se mide antes de
  aceptarse (`performance-ux.md`).
- Verificar scroll position al insertar/eliminar, eliminación rápida de varios
  elementos, y reordenamiento.
- No usar `layout` en árboles grandes sin medir con DevTools → Performance.
- La animación de layout no puede mover la posición del input activo — si el
  campo de escaneo o un input con foco está dentro del árbol animado, verificar
  que no salte (`pos-patterns.md`).
- El total u otro dato agregado se mantiene visualmente estable: no se
  recalcula en el medio de la animación de una forma que lo haga "temblar".
- **No retrasar cálculos de negocio hasta que termine la animación.** El
  estado (carrito, total) se actualiza de inmediato; la animación es
  cosmética y corre en paralelo, nunca gatea la lógica.

## `AnimatePresence`

Cuándo usarlo: modales, drawers, alertas persistentes, elementos removidos de
una lista, mensajes, fases de un flujo.

Reglas:

- Los hijos llevan keys estables.
- **La actualización de estado ocurre de inmediato**, no se espera a que
  termine la animación de salida.
- No esperar `onExitComplete` para ejecutar lógica de negocio salvo necesidad
  real (por ejemplo, liberar un slot de foco). No usarlo para retrasar una
  navegación ni una mutación.
- No usarlo para ocultar un delay de datos — eso es un estado de loading, no
  una animación de presencia.
- El componente sigue siendo accesible durante toda su vida visible: foco
  alcanzable, texto legible, controles operables mientras anima.
- **Al cerrar un modal, el foco se restaura como parte del cierre del
  diálogo, no de la animación.** Si la animación se interrumpe o el usuario
  tiene reduced motion, el foco igual vuelve a su lugar.
- Con reduced motion activo, se mantiene la semántica (el elemento
  aparece/desaparece) y se reduce o elimina el desplazamiento espacial — ver
  *Reduced motion*.

## AutoAnimate

```bash
npm install @formkit/auto-animate
```

(Ya instalado en este proyecto — comando de referencia, no ejecutarlo de
nuevo. Adaptar al package manager real si se documenta para otro proyecto:
`pnpm add`, `yarn add` o `bun add @formkit/auto-animate`.)

```tsx
"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";

export function FilterList({ filters }: { filters: Filter[] }) {
  const [parent] = useAutoAnimate();

  return (
    <ul ref={parent}>
      {filters.map((filter) => (
        <li key={filter.id}>{filter.label}</li>
      ))}
    </ul>
  );
}
```

AutoAnimate anima los **hijos directos** del elemento con el `ref` cuando se
insertan, se eliminan o cambian de posición. No hay variants, no hay control
de entrada/salida por separado: es una mejora progresiva de "zero config" para
ese caso puntual.

### Cuándo usar

Chips, filtros activos, mensajes de validación, campos condicionales simples,
filas de una lista sencilla, tags, badges, elementos auxiliares,
reordenamiento sencillo, listas donde el comportamiento por defecto alcanza.

Especialmente adecuado cuando: no hace falta una animación personalizada, se
busca una mejora progresiva de bajo costo, la lista ya tiene keys estables, la
animación no controla lógica, y la transición puede degradarse sin afectar la
tarea (si AutoAnimate no corriera, la lista seguiría siendo funcional).

### Cuándo no usar

Modales, drawers, animaciones de página, secuencias, gestos, drag complejo,
interacciones con control exacto, entrada y salida con estilos distintos,
listas virtualizadas sin validación explícita, tablas grandes, árboles
complejos, elementos cuyo cambio de layout debe coordinarse con otro
componente, elementos que necesitan callbacks de finalización, flujos donde la
animación debe poder interrumpirse programáticamente.

> **Regla dura: AutoAnimate y una layout animation de Motion nunca controlan
> el mismo contenedor ni el mismo conjunto de hijos directos.** Los dos
> observan y mueven el DOM por su cuenta; combinarlos sobre el mismo árbol
> produce transforms compitiendo, con movimiento impredecible. Se elige un
> único dueño de esa lista.

### Limitaciones (verificar, no asumir)

- Opera sólo sobre hijos directos; necesita un elemento padre real en el DOM.
- Puede alterar el posicionamiento del padre si éste es `position: static`
  (la librería lo fuerza a `relative` — confirmado en
  `node_modules/@formkit/auto-animate/index.mjs` de la versión instalada).
- Elementos flex con `flex-grow: 1` pueden dar mediciones tardías.
- Su configuración por defecto prioriza simplicidad, no control fino.
- Puede ser inadecuado para listas muy grandes — no hay virtualización interna.
- No sustituye una estrategia de estados (loading/empty/error siguen siendo
  responsabilidad del componente, no de la animación).
- No controla foco.
- No anuncia cambios a lectores de pantalla — no reemplaza `aria-live`
  (`accessibility.md`).
- No debe coordinar lógica de negocio: es puramente visual.

"Zero configuration" no significa "zero verification": cada uso se revisa
igual que cualquier otro mecanismo de motion.

## Reduced motion

### Motion

Preferir configuración global cuando exista un `MotionConfig`:

```tsx
<MotionConfig reducedMotion="user">{children}</MotionConfig>
```

Para decisiones locales sin provider:

```tsx
const shouldReduceMotion = useReducedMotion();

const variants = {
  hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 8 },
  visible: { opacity: 1, y: 0 },
};
```

### AutoAnimate

**Verificado en la versión instalada (`@formkit/auto-animate@0.10.0`,
`node_modules/@formkit/auto-animate/index.mjs`): respeta
`prefers-reduced-motion: reduce` automáticamente.** Cuando el media query
matchea, la librería no habilita la animación en ese elemento, salvo que se
pase explícitamente `disrespectUserMotionPreference: true` a la config del
hook — algo que este proyecto no debe hacer sin una razón documentada.

Por eso: **no duplicar una implementación manual de reduced motion alrededor
de `useAutoAnimate`**; ya lo hace la librería. Si en el futuro se actualiza la
versión instalada, este comportamiento se vuelve a verificar contra el código
fuente antes de seguir asumiéndolo — no contra la documentación pública, que
puede describir una versión distinta.

### Política general

Cuando `prefers-reduced-motion: reduce` está activo:

| Se elimina o reduce a fade | Se conserva |
|---|---|
| Parallax | Cambios de color |
| Zoom y escala grande | Aparición/desaparición (fade corto) |
| Desplazamientos largos | Feedback de estado |
| Entradas escalonadas | Spinners de carga |
| Auto-scroll y carruseles | Indicadores de progreso |
| Rotaciones decorativas | Transiciones ≤ 120 ms |
| Springs con rebote | Anuncios accesibles (`aria-live`) |

Este proyecto ya lo implementa así en CSS: `.pop-in` y `.section-enter`
degradan a un fade corto, y **`.flash` sobrevive sin cambios a propósito** —
es color, no movimiento, y es la señal con la que el cajero confirma que el
escaneo entró. La misma lógica se aplica a cualquier animación nueva en Motion
o AutoAnimate: **no se elimina la única señal de que algo pasó, se reemplaza
por una que no dependa de movimiento espacial.**

Al revisar: si una regla de reduced motion elimina la **única** señal de un
evento, está mal escrita — la señal se reemplaza, no se borra.

Verificación: DevTools → Rendering → *Emulate CSS media feature
prefers-reduced-motion* → recorrer el flujo completo, incluidas las
interacciones que usan Motion y AutoAnimate.

## Accesibilidad

Ver también `accessibility.md`. Reglas específicas de motion:

- La animación **no mueve el foco, no lo roba, y no retrasa su
  restauración** — un modal que cierra restaura el foco como parte del cierre,
  no cuando termina la animación de salida.
- La animación no oculta un error antes de que se pueda leer, ni reemplaza un
  mensaje accesible: el anuncio (`aria-live`, `role="alert"`) y la animación
  visual son responsabilidades **separadas**. Un cambio importante (producto
  agregado, error de stock, venta confirmada, fallo de cobro) se anuncia
  aunque la animación esté desactivada por `prefers-reduced-motion`.
- La animación no es el único indicador de estado — ver *Feedback* abajo.
- Ninguna animación impide la navegación por teclado ni bloquea el lector de
  código de barras mientras corre.
- Nada destella más de 3 veces por segundo ni se repite indefinidamente sin
  poder pausarse.
- Nada se activa únicamente con `hover` — todo lo que anima con hover tiene un
  equivalente por foco/teclado.
- Reduced motion nunca impide completar una tarea.

## Feedback

| Interacción | Respuesta | Duración |
|---|---|---|
| Press | Cambio de estado inmediato | 80–120 ms |
| Hover | Cambio de fondo | 120 ms |
| Focus | **Sin transición** — el outline aparece de una | 0 |
| Acción exitosa | Toast + estado actualizado | entrada 200 ms |
| Acción fallida | Mensaje inline, **sin sacudida** | 0 |
| Ítem agregado a una lista | Resaltado que se desvanece | 200 ms |

El foco **nunca** se anima: un outline con fade de 150 ms se siente lento
justo cuando el usuario está tabulando rápido.

Un error no se anima con "shake". Es una convención llamativa que no aporta
información y que puede disparar molestia en personas con sensibilidad
vestibular — aplica igual si el shake se implementara con un spring de Motion.

## Relación espacial

Cuando algo aparece, debería quedar claro de dónde vino:

- Un dropdown crece desde su disparador (`transform-origin` en ese borde).
- Un drawer entra desde el lado en el que va a quedar.
- Un modal centrado entra con un `scale` corto (0.96 → 1) + fade: no viene de
  ningún lado en particular, y eso está bien.
- Un ítem nuevo en una lista aparece **en su lugar final**, con un resaltado.
  No se desliza desde afuera: mover las filas de abajo obliga a re-encontrar
  la posición.

## Skeletons y loading

- **< 300 ms**: nada. Un skeleton que parpadea es peor que la espera.
- **300 ms – 1 s**: skeleton o spinner.
- **> 1 s**: skeleton con la forma real del contenido, para que el layout no
  salte al llegar los datos.

El skeleton **imita la geometría del contenido final**: mismo alto de fila,
mismo número aproximado de columnas. Un skeleton genérico que no coincide
produce un salto de layout al resolverse, que es exactamente lo que venía a
evitar (`performance-ux.md`).

En este repo: `ListSkeleton({ rows })` para listas y tablas, `Skeleton` para
bloques puntuales, `LoadingState` para una espera centrada. Estos componentes
son CSS puro (Nivel 1) — no hay razón para llevarlos a Motion.

El pulso del skeleton es lento (1.5–2 s) y de baja amplitud. Un pulso rápido
lee como error.

## Performance

- Objetivo: **60 fps**. Un frame son 16,7 ms.
- Verificar con DevTools → Performance, o activando *Frame Rendering Stats*.
- No animar más de ~5 elementos a la vez.
- `will-change` sólo sobre un elemento que realmente está por animarse, y se
  quita después: dejarlo permanente reserva memoria de GPU sin motivo. Motion
  ya gestiona esto internamente para las props que anima — no agregar
  `will-change` manual sobre un `motion.*` salvo un caso medido.
- Ninguna animación bloquea una interacción. Si el usuario puede hacer clic
  durante la transición, el clic tiene que entrar — esto aplica igual a un
  `AnimatePresence` en curso.
- Nada se anima en la carga inicial de una pantalla de trabajo: retrasa el
  momento en que se puede empezar a trabajar.
- Ver `performance-ux.md` para bundle (`LazyMotion`, `next/dynamic`) y para el
  resto de los objetivos de performance percibida que no son específicos de
  motion.

## Diseño de API interna (sólo si ya hay repetición)

Centralizar utilidades de Motion **sólo cuando exista repetición real**, no
preventivamente:

```text
src/
└── shared/
    └── motion/
        ├── motion-tokens.ts     (reexporta/extiende MOTION, no lo duplica)
        ├── motion-variants.ts
        ├── motion-provider.tsx
        └── index.ts
```

**No se crea esta estructura durante una auditoría, un `design` o como parte
de esta actualización del skill.** En modo `fix`, el agente puede proponerla o
crearla sólo cuando: Motion ya está adoptado en el código (no sólo instalado),
hay varios usos repetidos reales, evita valores duplicados, respeta la
arquitectura existente (`lib/` para lógica pura, `components/ui/` para
primitives, nada de lógica de negocio ahí), y no existe ya una ubicación
equivalente.

Para un único componente: la configuración de Motion vive cerca del
componente. No se crea una abstracción global para un solo uso.

## Política de abstracción

No crear componentes genéricos sin propósito semántico:

```text
AnimatedDiv
AnimatedContainer
MotionBox
UniversalAnimation
```

Preferir componentes semánticos, y sólo cuando encapsulan comportamiento real
(no sólo estilo), encapsulan accesibilidad (foco, `aria-live`), reducen
duplicación real, tienen una API clara, y aparecen más de una vez:

```text
AnimatedDialog
CollapsiblePanel
SaleItemTransition
FeedbackMessage
```

No envolver cada elemento en un componente animado genérico "por si se
necesita después".

## Tests

Este repo no tiene jsdom, Testing Library, Playwright ni ningún runner de
componentes o E2E (`ai/context/testing.md`) — eso no cambia con la adopción de
Motion y AutoAnimate, y **no se propone agregar ninguno de estos para poder
testear motion**: es una decisión de dependencias que se levanta al usuario,
igual que cualquier otra.

Lo que sí es testeable hoy, en `lib/*.test.ts`, con Vitest:

- Selección de variant o de mecanismo cuando esa decisión es una función pura
  (por ejemplo, "qué variant corresponde a este estado" si esa lógica sale de
  la vista).
- Lógica de reduced-motion cuando se expresa como una función pura (no el
  hook de React en sí, sino cualquier cálculo derivado de su valor).
- Helpers de motion que devuelven duraciones, easings o configuraciones a
  partir de `MOTION`, si esa lógica se separa de la vista.

Lo que **no** se testea en este repo: presencia/ausencia de un elemento
animado, timing exacto de una animación, comportamiento de `AnimatePresence`
o `useAutoAnimate` en sí — eso requeriría un entorno DOM y un runner de
componentes que hoy no existen. La verificación de interacción, foco y
comportamiento visual de motion es **manual**, y se reporta como tal
(`accessibility.md`, sección *Cómo verificar*).

## Checklist de motion para una revisión

- [ ] Toda animación explica, conecta, confirma o da feedback.
- [ ] Se aplicó el árbol de decisión: CSS antes que Motion, Motion antes que
      AutoAnimate, salvo que el nivel de control lo exija.
- [ ] Ninguna duración literal fuera de `lib/motion.ts` / `--motion-*`, ni en
      CSS ni en props de Motion.
- [ ] No hay `transition-all` como valor por defecto.
- [ ] Sólo se animan `transform`, `opacity`, `color` y `background-color`
      (o `filter`/`clip-path`/`box-shadow` medidos explícitamente).
- [ ] Las entradas usan `ease-out`; las salidas no se animan o son más cortas.
- [ ] Los springs con rebote no aparecen en importes, filas de venta, botones
      de cobro ni confirmaciones repetitivas.
- [ ] El foco no tiene transición.
- [ ] El error no se anima con shake.
- [ ] Todo import de Motion es desde `motion/react`, no `framer-motion`.
- [ ] Ningún Client Component boundary creado sólo para animar es más grande
      de lo necesario.
- [ ] `AnimatePresence` tiene keys estables (nunca el índice).
- [ ] La actualización de estado/lógica de negocio no espera a que termine
      una animación.
- [ ] Al cerrar un overlay, el foco se restaura como parte del cierre, no de
      la animación.
- [ ] AutoAnimate y una layout animation de Motion no controlan el mismo
      contenedor.
- [ ] Los skeletons imitan la geometría del contenido final.
- [ ] No aparece spinner antes de `MOTION.spinnerDelay`, salvo en la
      confirmación de venta.
- [ ] `prefers-reduced-motion` verificado con emulación en DevTools, incluidas
      las interacciones con Motion y AutoAnimate.
- [ ] Ninguna regla de reduced motion elimina la única señal de un evento.
- [ ] Ninguna animación bloquea una interacción.
- [ ] En pantallas operativas, ninguna animación supera 400 ms, y la mayoría
      se mantiene en la mitad inferior de su rango de referencia.
