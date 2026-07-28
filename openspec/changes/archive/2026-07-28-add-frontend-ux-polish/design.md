# Design: add-frontend-ux-polish

## Context

`src/lib/api.ts` parsea `{ message }` del backend en un `ApiError` tipado y redirige a `/login` en `401`. `src/components/ui/states.tsx` expone `ErrorState`, `EmptyState` y `ListSkeleton`. Los formularios deshabilitan el submit mientras `pending`.

El hueco está en el camino donde **no hay `message`**: si el `fetch` rechaza (red caída, DNS, CORS), si el backend devuelve `502`/`504` desde un proxy con cuerpo HTML, o si la respuesta no es JSON parseable, no existe `{ message }` que mostrar. Ese es el caso más común en operación real y hoy termina en un string técnico.

## Goals / Non-Goals

**Goals:**
- Que todo error diga qué pasó y qué hacer, sin que el frontend invente reglas de negocio.
- Que ninguna acción quede sin realimentación visible mientras está en curso.
- Que el movimiento comunique causa y efecto (de dónde salió, adónde fue), no que decore.

**Non-Goals:**
- Reintentos automáticos. Un reintento silencioso sobre `POST /sales/{id}/confirm` puede duplicar una venta. El reintento es siempre del usuario y siempre explícito.
- Reemplazar o reformular los mensajes del backend. `CLAUDE.md` §5 lo prohíbe y con razón: el backend es el dueño de las reglas.
- Modo oscuro, biblioteca de animación, transiciones de vista compartidas entre rutas (View Transitions API): el soporte todavía es desparejo y el beneficio no justifica la rama de compatibilidad.
- Toasts para errores de carga. Un error de carga pertenece al lugar donde falló la carga, no a una notificación que se va sola.

## Decisions

**El mensaje del backend manda; el frontend sólo cubre donde no hay mensaje.**
La regla operativa es una sola pregunta: *¿el backend dijo algo?*

```
        respuesta del backend
                 │
      ┌──────────┴──────────┐
      ▼                     ▼
  trae { message }     no trae nada
      │                (red, timeout, 5xx sin
      ▼                 cuerpo, JSON inválido)
  mostrarlo                 │
  TEXTUAL                   ▼
      │             vocabulario fijo del
      │             frontend en español
      └──────────┬──────────┘
                 ▼
      + acción de recuperación
        (Reintentar / Iniciar sesión / Volver)
```

Esto preserva la regla de `CLAUDE.md` §5 sin dejar al usuario frente a un `TypeError: Failed to fetch`. La alternativa —un diccionario que traduzca los mensajes del backend a texto "más amable"— se descarta: obligaría a mantener en el frontend una copia del catálogo de errores del backend, que se desincroniza en el primer cambio y termina mostrando texto inventado sobre reglas que el frontend no conoce.

**Vocabulario cerrado de fallos de transporte.** Cinco casos, cinco textos, cada uno con su acción:

| Caso | Texto | Acción |
|---|---|---|
| `fetch` rechaza | "No se pudo conectar con el servidor. Revisá tu conexión." | Reintentar |
| Timeout | "El servidor tardó demasiado en responder." | Reintentar |
| `5xx` | "El servidor tuvo un problema. Volvé a intentar en unos segundos." | Reintentar |
| `401` | "Tu sesión expiró." | Iniciar sesión |
| `403` | "No tenés permisos para esta acción." | Volver |

Es una lista cerrada a propósito. Cualquier otro estado con cuerpo JSON cae en el camino del `message` del backend.

**El spinner aparece a los 400 ms, no de inmediato.**
Un indicador que aparece y desaparece en 80 ms es un parpadeo que se lee como un glitch. Debajo de ~400 ms la respuesta se percibe como instantánea y el indicador molesta más de lo que informa. Por encima, su ausencia se lee como que la app se colgó. El umbral vive en un solo lugar (`MOTION.spinnerDelay`) para que no se replique como número mágico.

Excepción deliberada: **la confirmación de venta muestra el estado de carga inmediatamente**, sin umbral. Es la acción de mayor consecuencia del sistema y la que el cajero repite si duda; ahí el parpadeo es preferible a un doble click.

**Esqueleto para carga inicial, spinner para acciones.**
El criterio es si se conoce la forma de lo que viene. Una lista que ya sabemos que será una tabla usa esqueleto —preserva el layout y evita el salto cuando llegan los datos—. Una acción puntual (confirmar, guardar, ajustar) usa spinner dentro del botón que la disparó, porque la realimentación tiene que estar donde estuvo la atención del usuario. Nunca un overlay de página completa: bloquea todo para informar sobre una parte.

**Tokens de movimiento, no duraciones sueltas.**

```
--motion-fast:   120ms   /* realimentación puntual: hover, resalte de línea */
--motion-base:   200ms   /* transiciones de sección, entrada de diálogos */
--motion-slow:   320ms   /* sólo para lo que recorre distancia larga */
--ease-out:      cubic-bezier(0.16, 1, 0.3, 1)
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1)
```

Tres duraciones. Todo lo que entra a la vista usa `--ease-out` (arranca rápido, frena suave: se lee como algo que llega y se asienta). Nada supera los 320 ms: en una pantalla operativa que se usa cientos de veces por día, una animación que se disfruta la primera vez estorba la número cincuenta.

**`prefers-reduced-motion` elimina el desplazamiento, no la realimentación.**
La lectura ingenua de la preferencia es `animation: none`, y en una UI operativa eso rompe algo real: el resalte de la línea del carrito es *información*, no decoración — es cómo el cajero confirma que el escaneo entró. Con movimiento reducido, las transiciones de traslación y escala se eliminan, y lo que comunicaba mediante desplazamiento pasa a comunicar mediante un cambio de color de 120 ms sin movimiento. La señal sobrevive; el movimiento no.

**El carrito confirma el escaneo por resalte, no por desplazamiento.**
Al agregar o incrementar un ítem, su fila toma brevemente `--primary-light` como fondo y vuelve al normal en `--motion-base`. La fila **no** se desliza ni entra desde un costado: en escaneo rápido, varias filas animando su entrada al mismo tiempo desplazan las de abajo y hacen ilegible la lista justo cuando más se la mira. Un resalte in situ es visible con visión periférica y no mueve nada.

El total se anima como cambio de color breve, no como conteo numérico progresivo: un número que "sube" es ilegible mientras dura, y el cajero necesita leer el total, no verlo animarse.

Nota de accesibilidad: el resalte de color no puede ser la única señal —hay cajeros con daltonismo—. La cantidad de la línea cambia de valor y ese es el dato duro; el resalte lo acompaña.

**Transición de sección: opacidad y un desplazamiento mínimo.**
`opacity 0→1` más `translateY(4px→0)` en `--motion-base`. Cuatro píxeles, no dieciséis: lo suficiente para que se lea como un cambio y no como un corte, sin que la página parezca deslizarse. No se anima la salida — esperar a que la vista vieja se vaya antes de mostrar la nueva agrega latencia percibida a cada navegación.

## Risks / Trade-offs

- **El umbral de 400 ms puede dejar acciones sin realimentación en el rango 0–400 ms** → Es intencional, pero si una acción de escritura falla rápido el usuario puede no haber visto nada entre el click y el error. Mitigado porque el estado de error sí es inmediato y visible.
- **Animar en la ruta crítica del POS puede costar frames en hardware modesto** → Sólo se animan `opacity` y `transform`, que son propiedades compuestas por GPU. Nada de animar `height`, `width` ni `background-position`. Verificar en la máquina real del kiosco, que no es una laptop de desarrollo.
- **El vocabulario de transporte puede tapar un error del backend mal formado** → Si el backend devuelve `500` con un `{ message }` útil, se muestra el del backend: la clasificación por transporte sólo aplica cuando no hay cuerpo parseable. El orden de precedencia importa y debe estar cubierto por test.
- **Un `403` ahora es un estado distinto de un `401`** → Hoy ambos terminan en redirect a login. Con el cambio de rol de `/activate` que llega en `add-frontend-catalog-v15`, un Inventory Manager va a recibir `403` reales, y mandarlo a login sería desconcertante: su sesión está bien, lo que falta es permiso.

## Migration Plan

Cambio puramente de presentación, sin contrato de API. Se despliega solo. Rollback: revertir el binario del frontend; no hay estado persistido.

## Open Questions

- ¿El kiosco opera con conexión estable o intermitente? Si es intermitente, el vocabulario de transporte es lo más valioso del change y merece probarse con la red cortada a propósito, no sólo en desarrollo.
- ¿Hay cajeros con daltonismo en la operación real? Cambia cuánto peso puede cargar el resalte de color del carrito frente al cambio de cantidad.
