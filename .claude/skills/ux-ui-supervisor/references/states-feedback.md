# Estados y feedback

## Catálogo de estados

Todo control interactivo y toda región de datos tiene que tener resuelto el
subconjunto de estos que le aplica. Un estado sin diseñar aparece igual: como el
default del navegador, o como nada.

| Estado | Qué significa | Cómo se ve en este proyecto |
|---|---|---|
| `default` | Disponible, sin interacción | Token base del componente |
| `hover` | El puntero está encima | `bg-primary-hover`; **nunca la única señal** |
| `focus` | Tiene el foco de teclado | `outline: 2px solid var(--color-primary)`, global |
| `active` | Se está presionando | Más oscuro que hover, feedback inmediato |
| `selected` | Elegido dentro de un conjunto | Distinguible de hover **y** de focus |
| `disabled` | No disponible ahora | `text-text-disabled`; **debe explicar por qué** |
| `readonly` | Existe, no se edita acá | Legible, copiable, tabulable |
| `loading` | Se está resolviendo | `ListSkeleton` / `Skeleton` / `LoadingState` / `Button pending` |
| `success` | Terminó bien | Toast + estado actualizado en pantalla |
| `warning` | Requiere atención, no bloquea | `Badge tone="warning"` con texto |
| `error` | Falló | `ErrorState` o error inline, con `role="alert"` |
| `empty` | No hay datos | `EmptyState` que invita a la acción principal |
| `offline` | Sin conexión | Banner persistente + deshabilitar mutaciones |
| `permission denied` | El rol no alcanza | `ErrorState` con acción "Volver" (`error.kind === "forbidden"`) |
| `partial data` | Llegó una parte | Mostrar lo que llegó + aviso de lo que falta |

### Los tres que más se olvidan

**`empty` por filtro ≠ `empty` real.** "No hay productos" cuando en realidad hay
340 pero ninguno coincide con el filtro es un mensaje falso. El estado por filtro
dice qué filtro está aplicado y ofrece limpiarlo.

**`partial data`.** Cuando una pantalla pide varias cosas en paralelo y una
falla, mostrar un error total es tirar los datos que sí llegaron. Se muestra lo
disponible y se acota el aviso a lo que falta.

**`offline`.** Una acción disparada sin conexión no puede fallar en silencio ni
quedar en "pendiente" para siempre. Se avisa y no se pierde lo cargado.

## El triángulo obligatorio

Toda pantalla con datos resuelve **carga → vacío → error** para su dato
principal, en este orden de render (`ai/context/frontend-conventions.md`):

```tsx
if (error) return <ErrorState error={error} onRetry={reload} />;
if (!data) return <ListSkeleton />;
if (data.items.length === 0) return <EmptyState message="…" action={…} />;
```

El orden importa: si se chequea `!data` primero, un error deja la pantalla en
skeleton para siempre.

Los tres son obligatorios para el dato **principal**. Cargas secundarias que sólo
alimentan un selector pueden desestructurar sólo `data` — es la excepción
documentada del repo, no la regla.

## Empty state

Un empty state no informa: **habilita**.

```text
Mal:   "No hay productos."
Bien:  "Todavía no cargaste ningún producto."  [ Crear producto ]
```

Estructura: qué falta → por qué (si no es obvio) → **la acción primaria**.

`EmptyState({ message, action })` de este repo recibe `action` justamente para
eso. Un empty state sin `action` en una pantalla donde la acción existe es un
hallazgo `MEDIUM`.

Casos distintos, mensajes distintos:

| Caso | Mensaje |
|---|---|
| Nunca hubo datos | "Todavía no cargaste ningún producto." + Crear |
| Filtro sin resultados | "Ningún producto coincide con esos filtros." + Limpiar filtros |
| Búsqueda sin resultados | "No encontramos \"xyz\"." + sugerencia |
| Permiso insuficiente | "No tenés permiso para ver esto." + Volver |

## Error

- El mensaje del backend se muestra **tal cual** (`(e as ApiError).message`).
- La acción de recuperación se elige por `error.kind`: `forbidden` → "Volver",
  `unauthorized` → "Iniciar sesión", el resto → "Reintentar" si hay `onRetry`.
- `role="alert"` para que el lector lo anuncie — `ErrorState` ya lo lleva.
- Un error **nunca** deja al usuario sin salida.
- Un error de carga no borra lo que ya estaba en pantalla si sigue siendo válido.

## Loading

| Duración esperada | Qué mostrar |
|---|---|
| < 300 ms | Nada |
| 300 ms – 1 s | Spinner o skeleton |
| 1 s – 3 s | Skeleton con la forma del contenido |
| > 3 s | Skeleton + texto de contexto ("Generando el reporte…") |

- El skeleton imita la geometría final para que el layout no salte
  (`motion.md`).
- Un botón en vuelo usa `pending`, que muestra el spinner después de
  `MOTION.spinnerDelay` (400 ms). `pendingImmediate` está reservado a la
  confirmación de venta.
- Durante una carga, lo que ya es válido en pantalla se conserva.
- `aria-busy="true"` en la región que se está cargando.

## Cuándo usar cada canal de feedback

| Canal | Cuándo | Cuándo **no** |
|---|---|---|
| **Toast** | Confirmar un éxito. Efímero, no requiere acción | Errores que hay que corregir; información que hay que releer |
| **Inline** | Error o ayuda de un campo, junto al campo | Eventos globales |
| **Banner** | Estado persistente de la pantalla: offline, datos parciales, aviso de sistema | Confirmaciones puntuales |
| **Modal** | Decisión que debe tomarse antes de seguir, o acción destructiva | Información que no requiere decisión |
| **Estado en la propia UI** | El resultado se ve en el dato: la fila cambió, el total subió | — |

### Motion para cada canal

El mecanismo sigue el árbol de decisión de `motion.md`, no la preferencia del
momento:

| Canal | Mecanismo típico |
|---|---|
| Toast (entrada/salida) | Motion (`AnimatePresence`) si necesita salida propia; CSS si sólo entra |
| Mensajes de validación que aparecen/desaparecen en una lista de campos | AutoAnimate |
| Resaltado de fila (`.flash`, `.total-flash`) | CSS — ya resuelto, no se migra |
| Banner persistente | CSS simple o ninguna animación — es un estado, no un evento |
| Modal de confirmación | Motion (`AnimatePresence` + foco gestionado por el cierre del diálogo) |

### La regla del toast

**Un toast nunca es el único lugar donde aparece un error que hay que
corregir.** Se autodescarta a los 4 s, no está donde está el problema, y si el
usuario mira para otro lado se lo pierde sin forma de recuperarlo.

En este proyecto: **los toasts confirman éxito**. Un error de campo va inline
bajo el campo (`ai/context/frontend-conventions.md`).

Un toast también debe:

- Llevar `role="status"` / `aria-live="polite"`.
- Ser suficiente por sí mismo ("Venta confirmada", no "Listo").
- Coincidir con el nombre de la acción: "Confirmar venta" → "Venta confirmada".

## Feedback óptimista

Actualizar la UI antes de que el servidor confirme.

**Se justifica cuando:** la operación casi nunca falla, el fallo es reversible, y
la latencia es visible (marcar un ítem, reordenar, un toggle).

**No se justifica cuando:** hay dinero de por medio, la operación es
irreversible, o el fallo obliga a deshacer algo que el usuario ya dio por hecho.
**Confirmar una venta nunca es optimista**: se espera la respuesta del backend,
que es la autoridad.

Si se usa, el rollback tiene que ser visible y explicado, no un cambio silencioso
de vuelta.

## Undo

Cuando la acción es reversible, **deshacer es mejor que confirmar**:

- Confirmar interrumpe siempre, incluso cuando el usuario acertó (que es el 98 %
  de las veces).
- Deshacer no interrumpe a nadie y resuelve el 2 %.
- Ventana razonable: 5–10 s en un toast con acción.
- Sólo si el backend lo soporta de verdad. Ofrecer un "Deshacer" que no deshace
  es peor que no ofrecerlo — y hoy no hay endpoints de undo en este producto.

## Persistencia de mensajes

| Tipo | Duración |
|---|---|
| Éxito | 4 s (el `Toast` de este repo ya lo hace) |
| Error de campo | Hasta que el valor sea válido |
| Error de formulario | Hasta el próximo envío |
| Estado del sistema (offline) | Mientras dure la condición |
| Aviso informativo | Hasta que el usuario lo cierre |

Un mensaje que desaparece antes de poder leerse es un mensaje que no existió.
Regla práctica: ~50 ms por palabra, con 4 s de piso.

## Errores recuperables e irrecuperables

**Recuperable** — el usuario puede seguir: error de validación, timeout, error
de red, conflicto de datos. Requiere: qué pasó, cómo resolverlo, y la acción
para hacerlo.

**Irrecuperable** — no puede seguir desde acá: sesión expirada, permiso
denegado, recurso inexistente. Requiere: qué pasó, y **una salida** — volver,
iniciar sesión, ir al inicio. Nunca un callejón sin salida.

## Confirmaciones

La confirmación es **proporcional al riesgo**:

| Riesgo | Confirmación |
|---|---|
| Reversible, bajo impacto | Ninguna. Undo si existe |
| Irreversible, bajo impacto | `Dialog` simple con la acción nombrada |
| Irreversible, alto impacto | `Dialog` nombrando la entidad y diciendo que no se puede deshacer |
| Destructivo en masa | `Dialog` + conteo explícito de lo afectado |
| Catastrófico | Escribir un texto de confirmación. Rara vez justificado en este producto |

Un `Dialog` de confirmación debe:

- Nombrar la **entidad concreta**: «¿Desactivar a "María González"?», no
  «¿Confirmar?».
- Decir si es reversible. En este proyecto, por ejemplo, la desactivación de un
  usuario no se puede deshacer desde la app, **y hay que decirlo**.
- Etiquetar los botones con el verbo, no con "Sí"/"No": "Desactivar" /
  "Cancelar".
- Enfocar inicialmente la opción **menos** destructiva.
- Cerrar con Escape y con el botón de cancelar.
- Con `dismissible={false}` durante una acción en curso, garantizar que haya
  salida cuando termina.

**Confirmar todo entrena a aceptar sin leer**, y entonces deja de proteger. Cada
confirmación de más devalúa las que importan.

## Acciones destructivas

- `variant="danger"`, separadas físicamente de las frecuentes.
- Texto, no sólo icono (`iconography.md`).
- Confirmación proporcional (arriba).
- Nunca como acción por defecto de un formulario ni como destino de un Enter.
- Después de ejecutarse: confirmación explícita de qué se eliminó y foco movido
  a un lugar deliberado (`navigation-keyboard.md`).

## Checklist de estados para una revisión

- [ ] Loading, empty y error resueltos para el dato principal.
- [ ] El orden de render es `error → loading → empty → datos`.
- [ ] El empty por filtro es distinto del empty real.
- [ ] El empty state invita a la acción principal.
- [ ] El error muestra el mensaje del backend tal cual.
- [ ] El error ofrece la acción de recuperación según `error.kind`.
- [ ] Ningún error deja al usuario sin salida.
- [ ] `role="alert"` en los errores; `role="status"` en las confirmaciones.
- [ ] Todo control tiene hover, focus, active y disabled resueltos.
- [ ] `hover`, `focus` y `selected` son distinguibles entre sí.
- [ ] Todo botón deshabilitado explica qué falta.
- [ ] El skeleton imita la geometría del contenido final.
- [ ] Ningún error que requiere corrección vive sólo en un toast.
- [ ] El texto del toast coincide con el nombre de la acción.
- [ ] Cada confirmación nombra la entidad y dice si es reversible.
- [ ] Los botones del diálogo llevan verbo, no "Sí"/"No".
- [ ] Ninguna confirmación sobra por una acción reversible de bajo impacto.
- [ ] Ninguna operación con dinero se actualiza de forma optimista.
- [ ] El mecanismo de motion de cada canal sigue el árbol de decisión de
      `motion.md` (CSS / Motion / AutoAnimate), no una preferencia puntual.
