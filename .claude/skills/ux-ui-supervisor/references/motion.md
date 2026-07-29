# Motion

## Motion funcional vs decorativo

**Funcional** — hace uno de estos cuatro trabajos, y sólo se justifica si hace
alguno:

| Trabajo | Ejemplo en este producto |
|---|---|
| **Explicar** un cambio de estado | El botón pasa a `pending` con su spinner |
| **Conectar** dos posiciones | El diálogo entra desde donde se lo abrió |
| **Confirmar** que algo pasó | `.flash` en la línea del carrito recién escaneada |
| **Dar feedback** de una entrada | El botón se hunde levemente al presionarlo |

**Decorativo** — parallax, entradas escalonadas, contadores que suben número por
número, hover que escala, elementos que flotan. En una pantalla operativa es un
costo sin beneficio: agrega latencia percibida a algo que el usuario ya sabe que
pasó.

Regla de decisión: **si al quitar la animación el usuario no pierde ninguna
información, la animación sobra.**

En un POS el techo es todavía más bajo. Una animación de 300 ms en una acción
que se repite 200 veces por turno son 60 segundos de espera por turno,
introducidos a propósito.

## Duraciones de referencia

```text
Press                     80–120 ms
Hover / focus            120–180 ms
Tooltip / dropdown       150–220 ms
Panel                    180–280 ms
Modal / drawer           220–320 ms
Transición grande        300–450 ms
```

Este proyecto **ya tiene tres duraciones** y no se agregan más
(`ui-system.md`):

```text
--motion-fast   120ms   feedback puntual: hover, resaltado de línea
--motion-base   200ms   transición de sección, entrada de diálogo
--motion-slow   320ms   sólo cuando algo recorre mucha distancia
```

Espejadas en `src/lib/motion.ts` como `MOTION.fast/base/slow`. **Ningún valor
literal de ms fuera de ahí** — un `duration-[250ms]` en un componente es un
hallazgo `MEDIUM`.

`MOTION.spinnerDelay` (400 ms) no es una duración de animación: es el umbral
antes de mostrar el spinner de un botón pendiente, para no parpadear en
respuestas rápidas. Se saltea sólo con `pendingImmediate`, reservado a la
confirmación de venta — donde el cajero necesita saber **de inmediato** que el
clic entró.

## Easing

Dos curvas, ya declaradas:

```text
--ease-out        cubic-bezier(0.16, 1, 0.3, 1)     entradas: rápido y frena
--ease-standard   cubic-bezier(0.4, 0, 0.2, 1)      movimiento entre dos estados
```

- **Entrada**: `ease-out`. Arranca rápido, desacelera. Se siente responsivo.
- **Salida**: `ease-in` o directamente sin animación. Lo que se va no merece
  atención.
- **Cambio de estado** (color, tamaño): `ease-standard`.
- **`linear`**: sólo para rotación continua (un spinner) y para el degradado de
  reduced motion.

Nunca un `ease-in` en una entrada: parece que la interfaz tarda en reaccionar.

## Entrada y salida

Asimetría deliberada: **la entrada se anima, la salida no** (o es la mitad de
larga).

Al abrir, la animación explica de dónde viene el elemento. Al cerrar, el usuario
ya decidió y quiere el resultado: animar la salida es hacerlo esperar por algo
que ya no le interesa. `.section-enter` de este repo hace exactamente eso — la
salida nunca se anima.

## Propiedades que se animan

**Preferir:**

```text
transform   (translate, scale, rotate)
opacity
```

Se resuelven en el compositor, sin recalcular layout ni repintar. Sostienen
60 fps incluso en la PC modesta de un mostrador.

**Evitar animar:**

```text
width  height  top  left  right  bottom  margin  padding
```

Cada frame dispara layout de todo el subárbol. En una tabla de 200 filas eso son
caídas visibles de framerate.

Alternativas: en vez de `width`, `transform: scaleX()`; en vez de `top/left`,
`transform: translate()`; en vez de animar `height` para un acordeón,
`grid-template-rows: 0fr → 1fr` (que sí es animable y no dispara layout del
subárbol) o directamente sin animación.

`background-color` y `color` son aceptables: repintan pero no relayoutean. Es
exactamente lo que hacen `.flash` y `.total-flash` acá.

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
vestibular.

## Relación espacial

Cuando algo aparece, debería quedar claro de dónde vino:

- Un dropdown crece desde su disparador (`transform-origin` en ese borde).
- Un drawer entra desde el lado en el que va a quedar.
- Un modal centrado entra con un `scale` corto (0.96 → 1) + fade: no viene de
  ningún lado en particular, y eso está bien.
- Un ítem nuevo en una lista aparece **en su lugar final**, con un resaltado. No
  se desliza desde afuera: mover las filas de abajo obliga a re-encontrar la
  posición.

## Skeletons y loading

- **< 300 ms**: nada. Un skeleton que parpadea es peor que la espera.
- **300 ms – 1 s**: skeleton o spinner.
- **\> 1 s**: skeleton con la forma real del contenido, para que el layout no
  salte al llegar los datos.

El skeleton **imita la geometría del contenido final**: mismo alto de fila,
mismo número aproximado de columnas. Un skeleton genérico que no coincide
produce un salto de layout al resolverse, que es exactamente lo que venía a
evitar (`performance-ux.md`).

En este repo: `ListSkeleton({ rows })` para listas y tablas, `Skeleton` para
bloques puntuales, `LoadingState` para una espera centrada.

El pulso del skeleton es lento (1.5–2 s) y de baja amplitud. Un pulso rápido
lee como error.

## Reduced motion

```css
@media (prefers-reduced-motion: reduce) { … }
```

La estrategia **no es apagar todo**. Es quitar lo que causa malestar vestibular
y conservar la información:

| Se elimina o reduce a fade | Se conserva |
|---|---|
| Parallax | Cambios de color |
| Zoom y escala grande | Aparición/desaparición (como fade corto) |
| Desplazamientos largos | Feedback de estado |
| Entradas escalonadas | Spinners de carga |
| Auto-scroll y carruseles | Indicadores de progreso |
| Rotaciones decorativas | Transiciones ≤ 120 ms |

Este proyecto ya lo implementa así: `.pop-in` y `.section-enter` degradan a un
fade corto, y **`.flash` sobrevive sin cambios a propósito** — es color, no
movimiento, y es la señal con la que el cajero confirma que el escaneo entró.
Apagarla sería quitar información, no reducir movimiento.

Al revisar: si una regla de reduced motion elimina la **única** señal de que algo
pasó, está mal escrita. La señal se reemplaza, no se borra.

Verificación: DevTools → Rendering → *Emulate CSS media feature
prefers-reduced-motion* → recorrer el flujo completo.

## Performance

- Objetivo: **60 fps**. Un frame son 16,7 ms.
- Verificar con DevTools → Performance, o activando *Frame Rendering Stats*.
- No animar más de ~5 elementos a la vez.
- `will-change` sólo sobre un elemento que realmente está por animarse, y se
  quita después: dejarlo permanente reserva memoria de GPU sin motivo.
- Ninguna animación bloquea una interacción. Si el usuario puede hacer clic
  durante la transición, el clic tiene que entrar.
- Nada se anima en la carga inicial de una pantalla de trabajo: retrasa el
  momento en que se puede empezar a trabajar.

## Checklist de motion para una revisión

- [ ] Toda animación explica, conecta, confirma o da feedback.
- [ ] Ninguna duración literal fuera de `lib/motion.ts` / `--motion-*`.
- [ ] Sólo se animan `transform`, `opacity`, `color` y `background-color`.
- [ ] Las entradas usan `ease-out`; las salidas no se animan o son más cortas.
- [ ] El foco no tiene transición.
- [ ] El error no se anima con shake.
- [ ] Los skeletons imitan la geometría del contenido final.
- [ ] No aparece spinner antes de `MOTION.spinnerDelay`, salvo en la
      confirmación de venta.
- [ ] `prefers-reduced-motion` verificado con emulación en DevTools.
- [ ] Ninguna regla de reduced motion elimina la única señal de un evento.
- [ ] Ninguna animación bloquea una interacción.
- [ ] En pantallas operativas, ninguna animación supera 200 ms.
