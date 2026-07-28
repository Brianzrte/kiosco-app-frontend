# Proposal: add-frontend-ux-polish

## Why

El MVP resolvió los estados de carga, vacío y error de forma correcta pero literal: cuando algo falla se muestra el `message` del backend tal cual, y cuando algo carga se muestra un esqueleto o nada. Eso cumple el contrato pero deja tres huecos que se sienten a diario en el mostrador:

- **Los errores de transporte no tienen mensaje del backend.** Un `fetch` que falla por red caída, un `500`, un timeout o un `401` no traen `{ message }`. Hoy el usuario ve el texto crudo de la excepción o un mensaje genérico que no dice qué hacer. Es el caso más frecuente en un kiosco con conexión inestable y es justamente el peor cubierto.
- **Las acciones no confirman que están en curso.** Los formularios deshabilitan el submit mientras esperan, pero sin indicador visible: en una confirmación de venta que tarda, el cajero no distingue "está procesando" de "no registró el click" y vuelve a apretar.
- **Los cambios de sección son cortes secos** y el agregado de un ítem al carrito no tiene ninguna señal visual: la única confirmación de que el escaneo entró es que aparece una fila más en una tabla, algo fácil de no ver cuando se escanea rápido mirando la mercadería y no la pantalla.

Este change es el único de la fase V1.5 que **no depende de ningún endpoint nuevo**: puede implementarse y desplegarse hoy, en paralelo con el trabajo de backend.

## What Changes

- **Mensajes de error comprensibles sin inventar reglas de negocio.** El `message` del backend sigue siendo la fuente de verdad y se muestra textualmente cuando existe. Lo que se agrega es la capa que hoy no existe: traducción al español de los fallos de transporte (sin conexión, servidor caído, tiempo agotado, sesión vencida, sin permisos), y una acción de recuperación explícita en cada estado de error.
- **Indicador de carga diferido.** Spinner en botones para acciones que el usuario dispara, y esqueleto para carga inicial de listas. El spinner aparece recién a los 400 ms para no producir un parpadeo en respuestas rápidas.
- **Transiciones suaves entre secciones**, con tokens de movimiento propios y respeto estricto de `prefers-reduced-motion`.
- **Realimentación visual al agregar un producto al carrito**: la línea afectada se resalta brevemente y el total se anima, para que el cajero confirme el escaneo por el rabillo del ojo sin dejar de mirar la mercadería.
- **Corrección de un token obsoleto en el spec**: `ui-foundation` cita `Primary (#2563EB)`, un azul anterior al rebranding Mini Moni que contradice el `#9C566C` vigente en `CLAUDE.md` §4.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `ui-foundation`: se agregan los requirements `Motion system`, `Deferred loading feedback` y `Transport error vocabulary`. `Explicit loading, empty, and error states` se amplía para exigir acción de recuperación. `Design system tokens` corrige el hex obsoleto e incorpora los tokens de movimiento.
- `ui-pos`: se agrega `Cart feedback on scan`, que fija la realimentación visual del agregado al carrito sin alterar el flujo de escaneo ni el foco.

## Impact

- Modificados: `src/components/ui/states.tsx`, `src/components/ui/Button.tsx`, `src/lib/api.ts` (clasificación de fallos de transporte), `src/app/(app)/layout.tsx` (transiciones), `src/components/pos/PosView.tsx` (realimentación de carrito), configuración de Tailwind (tokens de movimiento).
- **Sin dependencias de backend.** Ningún endpoint nuevo, ningún contrato modificado.
- Sin impacto en los otros changes de V1.5; puede implementarse antes, después o en paralelo.
