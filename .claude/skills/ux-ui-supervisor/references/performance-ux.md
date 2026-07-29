# Performance y UX

La performance es una propiedad de la experiencia, no del build. Lo que importa
no es cuánto tarda: es **cuánto parece que tarda** y si el usuario puede seguir
trabajando mientras tanto.

## Feedback inmediato

La regla que ordena todo lo demás:

> **Toda interacción da una señal en menos de 100 ms, aunque el resultado tarde
> más.**

El clic cambia de estado, el campo muestra lo tipeado, el botón se hunde. Si
entre el clic y cualquier señal pasan 400 ms, el usuario vuelve a hacer clic — y
en un POS eso puede significar dos ventas.

| Latencia | Percepción | Qué hace falta |
|---|---|---|
| < 100 ms | Instantáneo | Nada |
| 100–300 ms | Rápido, se nota | Cambio de estado del control |
| 300 ms – 1 s | Espera perceptible | Spinner o skeleton |
| 1–3 s | Espera molesta | Skeleton con forma real + contexto |
| > 3 s | Interrumpe la tarea | Progreso, contexto y, si se puede, cancelar |

## Latencia percibida

Se puede mejorar sin tocar el backend:

- **Mostrar la estructura antes que los datos.** El header, los filtros y la
  forma de la tabla se renderizan de inmediato; sólo el cuerpo espera.
- **Skeleton con la geometría final** — evita el salto de layout al llegar los
  datos.
- **Prefetch** de lo que casi seguro se va a pedir. `next/link` ya prefetchea en
  viewport.
- **Conservar lo válido** durante un refetch, en vez de volver a skeleton: si el
  usuario ya está leyendo la tabla, vaciarla para recargar la misma tabla es una
  regresión.
- **No bloquear la pantalla entera** por una carga secundaria.

## Optimistic UI

Ver `states-feedback.md`. Resumen: sirve para operaciones que casi nunca fallan y
son reversibles. **Nunca para dinero.** Confirmar una venta espera la respuesta
del backend, que es la autoridad.

## Debounce y throttle

| Técnica | Qué hace | Cuándo | Valor |
|---|---|---|---|
| **Debounce** | Espera a que pare la actividad | Búsqueda que pega al servidor | 250–350 ms |
| **Debounce** | | Validación asíncrona | 400–600 ms |
| **Debounce** | | Autoguardado | 1–2 s |
| **Throttle** | Ejecuta como mucho cada N ms | Scroll, resize | 100–200 ms |
| **Ninguno** | Inmediato | Filtro **local** sobre datos ya cargados | 0 |

Error frecuente: poner debounce a un filtro local. El dato ya está en memoria;
esperar 300 ms para filtrarlo agrega latencia inventada. El filtro local se
aplica en el `onChange`.

Otro: debounce demasiado largo en una búsqueda. Por encima de ~400 ms se siente
roto — el usuario deja de escribir y no pasa nada.

**El input siempre responde de inmediato.** Lo que se debouncea es la petición,
nunca el renderizado de lo que se tipeó.

## Carga progresiva

- Lo que está arriba y es crítico se pide primero.
- Cargas paralelas con un solo `Promise.all` en un fetcher estable, no dos
  `useLoad` (`ai/context/frontend-conventions.md`).
- Los datos secundarios (opciones de un selector) se piden aparte y no bloquean
  el dato principal.
- Un panel que no está a la vista se carga cuando se abre.
- `limit=100` para poblar un selector es un patrón aceptado a escala de kiosco, y
  está anotado como tal.

## Layout shift

El salto de layout es de los problemas más molestos y menos reportados: el
usuario va a hacer clic y el botón se mueve.

Causas y solución:

| Causa | Solución |
|---|---|
| Imagen sin dimensiones | `width`/`height` o `aspect-ratio` |
| Skeleton con otra geometría | Skeleton con el alto real |
| Banner que se inserta arriba | Reservar el espacio, o insertarlo abajo |
| Fuente que cambia de métricas | `font-display: swap` + fallback ajustado |
| Contenido que se expande al cargar | `min-height` en el contenedor |
| Número que cambia de ancho | `tabular-nums` (`.num` / `.data`) |

Ese último es directamente relevante acá: **un total sin cifras tabulares
"salta" al actualizarse** porque `1` y `8` tienen anchos distintos. En el POS eso
ocurre en cada escaneo.

Objetivo: **CLS ≤ 0,1**.

## Fuentes

- `next/font` (ya en uso con Geist) hace self-hosting, precarga y aplica
  `size-adjust` para que el fallback tenga métricas parecidas. Es la mitad del
  problema de CLS resuelta de arranque.
- **No agregar familias** (`typography.md`). Cada familia es un request más y una
  oportunidad más de shift.
- Sin `@import` de fuentes en CSS: bloquea el render.

## Imágenes

- `next/image` para dimensiones, formato moderno y lazy loading.
- Siempre con dimensiones explícitas o `aspect-ratio`.
- `loading="lazy"` en lo que está fuera de la vista; **eager** en lo que está
  arriba.
- Formatos modernos con fallback.
- Este producto casi no tiene imágenes: si aparece una, revisar que no sea la
  causa de un LCP alto.

## Animaciones

Sólo `transform` y `opacity` en el camino crítico (`motion.md`). Animar `width`,
`height` o `top` dispara layout en cada frame y en una tabla larga se ve.

Nada se anima durante la carga inicial de una pantalla de trabajo: retrasa el
momento en que se puede empezar.

## Requests duplicados

Síntomas frecuentes en este stack:

- Un fetcher **no estable** en `useLoad` (falta `useCallback` o con deps mal
  puestas) → refetch en cada render.
- Dos `useLoad` para datos que se piden juntos → dos ciclos de carga y dos
  skeletons.
- `reload()` llamado dos veces después de una mutación.
- Un `useEffect` sin dependencias correctas disparando la misma petición.

Verificación: DevTools → Network, filtrar por Fetch/XHR, y recorrer la pantalla.
Dos peticiones idénticas seguidas es un hallazgo.

## Estados de espera y bloqueo

- **Bloquear sólo lo necesario.** Un envío de formulario deshabilita su submit,
  no la pantalla entera.
- Los campos no se deshabilitan durante el envío (`forms-validation.md`).
- Bloquear todo se justifica cuando seguir interactuando puede corromper el
  resultado: durante la confirmación de una venta, el `Dialog` con
  `dismissible={false}` es correcto.
- Toda operación bloqueante tiene fin garantizado: éxito, error o timeout.
  **Nunca** un estado pendiente permanente.

## Core Web Vitals

Como referencia de diseño, no como garantía:

```text
LCP   hasta 2,5 s     el contenido principal es visible
INP   hasta 200 ms    la interfaz responde a la interacción
CLS   hasta 0,1       el layout no salta
```

Son objetivos de campo (usuarios reales, percentil 75). En una app interna tras
login, LCP importa menos que INP: nadie llega desde una búsqueda, pero todos
interactúan cientos de veces por turno.

## Objetivos para interacciones locales

Estos son los que más pesan en este producto:

```text
Feedback de click              inmediato (< 100 ms)
Dropdown local                 < 150 ms percibidos
Filtro local                   < 100 ms percibidos
Vista con datos cacheados      < 300 ms percibidos
```

**No son una garantía**: son objetivos de diseño. Si una interacción los supera,
es una señal para investigar, no un fallo automático. Y si no se midieron, no se
afirman: la categoría va como `Not evaluated`.

## Cómo medir

Sin herramientas nuevas — no se agregan dependencias:

1. **DevTools → Performance**: grabar la interacción, mirar tareas largas
   (> 50 ms) y frames caídos.
2. **DevTools → Network**: peticiones duplicadas, cascadas, tamaño.
3. **DevTools → Rendering**: *Frame Rendering Stats*, *Layout Shift Regions*,
   *Paint flashing*.
4. **Lighthouse** para LCP/CLS en una carga en frío.
5. **Throttling**: CPU 4× y red "Fast 3G". La PC del mostrador no es la máquina
   de desarrollo.

Lo que no se midió se declara `Not evaluated`. **Nunca** se inventa un número.

## Checklist de performance para una revisión

- [ ] Toda interacción da señal en < 100 ms.
- [ ] El spinner aparece después de `MOTION.spinnerDelay`, no antes.
- [ ] El skeleton tiene la geometría del contenido final.
- [ ] Ningún dato válido en pantalla se descarta durante un refetch.
- [ ] Los filtros locales no tienen debounce.
- [ ] Las búsquedas contra el servidor tienen debounce de 250–350 ms.
- [ ] El input responde inmediato aunque la petición esté debounceada.
- [ ] Las cargas paralelas usan un solo `Promise.all` con fetcher estable.
- [ ] No hay peticiones duplicadas (verificado en Network).
- [ ] Todos los números que se actualizan usan cifras tabulares.
- [ ] Nada salta de posición al cargar (verificado con Layout Shift Regions).
- [ ] No se agregaron familias tipográficas ni dependencias.
- [ ] Sólo se animan `transform` y `opacity` en el camino crítico.
- [ ] El bloqueo durante una operación es el mínimo necesario.
- [ ] Toda operación bloqueante termina en éxito, error o timeout.
- [ ] Verificado con throttling de CPU 4×.
