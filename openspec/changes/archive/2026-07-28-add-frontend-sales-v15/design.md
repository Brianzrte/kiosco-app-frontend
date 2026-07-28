# Design: add-frontend-sales-v15

## Context

`add-sales-v15` agrega:

- `sale_number BIGINT` nullable, asignado con `nextval()` **al confirmar**, dentro de la transacción. Los drafts no tienen número.
- `GET /api/v1/sales` (Admin) con filtros `status`, `cashier_id`, `from`/`to`, `sale_number` y paginación. Por defecto: confirmadas, `confirmed_at` descendente, 20 por página.

Dos propiedades del número que la UI debe respetar y que son fáciles de romper:

1. **Puede faltar.** Las ventas confirmadas antes de la migración tienen `NULL` y no hay backfill: el backend decidió no fabricar números que nunca se le dieron a nadie.
2. **Puede tener huecos.** `nextval` no es transaccional: si una confirmación hace rollback, el número se consume igual. El backend lo especificó como escenario explícito para que un hueco no se reporte como venta perdida.

## Goals / Non-Goals

**Goals:**
- Que el número sea legible y dictable en el momento exacto en que hace falta: al terminar la venta.
- Hacer visibles los drafts, hoy invisibles.
- No romper con las ventas históricas sin número.

**Non-Goals:**
- Impresión de ticket: no hay integración de hardware y `CLAUDE.md` §3 la deja fuera.
- Acciones sobre drafts desde el listado (retomar, descartar): no hay endpoints y descartar sería un borrado que el sistema no ofrece.
- Guardar ventas recientes en el cliente para darle historial al Cajero. Ver la contradicción de rol en el proposal: se resuelve decidiendo, no con estado local.
- Búsqueda por rango o prefijo de número: el backend implementa igualdad exacta.

## Decisions

**El número se muestra al confirmar, grande y seleccionable.**
Es el momento en que se usa: el cajero se lo dicta al cliente o lo anota. La confirmación pasa de "Venta confirmada" a mostrar además el número con jerarquía tipográfica alta.

Debe ser **seleccionable con el mouse** — no un elemento decorativo — porque la forma más común de pasarlo a otro lado es copiarlo. Y el toast no alcanza: se va solo, y el número tiene que quedar hasta que el cajero arranque la venta siguiente. Va en el área de confirmación de la venta, no en una notificación efímera.

**El foco no se mueve al número.** La prioridad #1 del POS es que el input de escaneo tenga el foco. Mostrar el número no puede robarlo: el cajero tiene que poder escanear el primer producto de la venta siguiente sin tocar nada.

**Ausencia de número se muestra como ausencia, no como cero ni como error.**
Una venta histórica sin número muestra un guion, igual que el barcode nulo en el listado de productos — patrón ya establecido en el MVP. Nunca `#0`, nunca `#null`, nunca vacío sin marca.

Si el listado permite ordenar por número, las filas sin número van al final en ambas direcciones de orden: no son "el más chico".

**El estado del draft se muestra con insignia y con la diferencia que importa: no tiene número ni total.**
Un draft es un carrito a medio armar. Mostrarlo junto a confirmadas en la misma tabla exige que la diferencia sea obvia de un vistazo, porque confundirlos al leer un listado de ventas del día lleva a contar ventas que no ocurrieron. Insignia con texto, número ausente, y el total del draft claramente distinguido del de una venta cerrada.

**La fecha mostrada depende del estado.**
El backend ordena drafts por `created_at` y confirmadas por `confirmed_at`, deliberadamente, para no mezclar dos relojes en un solo criterio. El frontend hace lo mismo al mostrar: una columna de fecha cuyo significado cambia según el estado sería ilegible. La columna se rotula según el filtro activo, y con estados mezclados se muestran ambas fechas explícitamente rotuladas.

Es feo, y es preferible a una columna "Fecha" que a veces significa una cosa y a veces otra.

**El filtro por número es una búsqueda directa, no un filtro más.**
Su caso de uso es "el cliente dicta el número del ticket": se escribe, se busca, aparece una venta o ninguna. Se presenta como campo de búsqueda destacado, separado de los filtros de rango, y al usarse los demás filtros se limpian — buscar un número exacto dentro de un rango de fechas es una forma silenciosa de no encontrar la venta que se busca.

El backend devuelve una lista de cero o un elemento, así que el resultado se renderiza como el listado normal, sin caso especial.

**El historial del Cajero se restringe en el servidor, nunca en el cliente.**
La decisión de producto es que el Cajero vea sus propias ventas. La implementación correcta es que el backend acepte el rol `cashier` en `GET /api/v1/sales` y fuerce `cashier_id = usuario de la sesión`, ignorando lo que venga en la query.

La tentación es resolverlo en el frontend: pedir la lista y filtrar por el id de la sesión. Eso no restringe nada — la respuesta con todas las ventas del kiosco ya viajó al navegador y está en las herramientas de desarrollo. Sería una restricción de dibujo disfrazada de permiso, y de las peores: parece que funciona.

Consecuencia en la UI: la misma pantalla sirve a los dos roles con distinta forma, porque la restricción viene del servidor.

```
   ADMIN                          CAJERO
   ─────                          ──────
   filtro por cajero    ✓         (ausente — sólo hay uno)
   filtro por estado    ✓         filtro por estado    ✓
   rango de fechas      ✓         rango de fechas      ✓
   búsqueda por número  ✓         búsqueda por número  ✓
   ve todos los drafts  ✓         ve sus propios drafts
```

El filtro por cajero **no se muestra deshabilitado** para el Cajero: se omite. Un selector con una sola opción posible no es una elección.

**El Cajero ve sus propios drafts, y ahí está el valor real.**
Para el Admin los drafts son supervisión. Para el Cajero son el carrito que dejó a medias cuando el cliente se fue a buscar la billetera. Es el caso de uso que justifica darle la pantalla, más que consultar ventas ya cerradas.

**El filtro por cajero muestra nombres si `add-frontend-users` está desplegado.**
Sin él, el backend sólo da `cashier_id` y un selector de UUIDs es inutilizable. Si este change llega primero, el filtro por cajero se omite en vez de mostrar identificadores. Se agrega cuando existan los nombres.

**El detalle de venta es su propia ruta, no un diálogo.**
`GET /api/v1/sales/{id}` ya devuelve `items[]` y `payments[]` completos — el mismo endpoint que usa el POS para leer una venta propia. La fila de la lista pasa a ser accionable (clic o Enter, con foco visible) y navega a `/sales/[id]`. Se eligió ruta propia en vez de un `Dialog` (como el usado en Reportes para el mismo dato) porque este detalle va a ser el punto de entrada de una acción de estado propio en `add-frontend-sales-returns` — un diálogo anidando otro diálogo de devolución es peor que una página que se navega.

El alcance de acceso es idéntico al de la lista: si el Cajero ve la lista restringida a sus ventas (sección "Cashier sees only their own sales" arriba), el detalle hereda la misma restricción porque pega contra el mismo endpoint con el mismo scoping de servidor. No hay chequeo de propiedad en el cliente.

## Risks / Trade-offs

- **La UI puede asumir que `sale_number` siempre está** → El backend lo advirtió explícitamente. El tipo debe ser opcional en TypeScript, no `number` a secas: que el compilador obligue a manejar la ausencia.
- **Los huecos en la numeración se van a reportar como ventas perdidas** → Consecuencia especificada de `nextval`. La UI no debe insinuar continuidad: no mostrar "venta N de M" ni nada que sugiera que la secuencia es densa.
- **Mostrar drafts junto a confirmadas invita a contarlos como ventas** → Mitigado con distinción visual fuerte y con el filtro por defecto en confirmadas. Ningún total agregado del listado debe sumar drafts.
- **El filtro por cajero depende de otro change** → Se omite antes que mostrar UUIDs.
- **El número puede robar la atención en el POS** → Se muestra sin mover el foco. Verificar con escaneo encadenado real: confirmar una venta y escanear inmediatamente la siguiente sin tocar el teclado.

## Migration Plan

Aditivo. Se despliega después de `add-sales-v15` en backend. Las ventas viejas quedan sin número, que es el comportamiento esperado y no un error a reparar.

Rollback: revertir el frontend. El campo sigue existiendo en el backend sin consumidor.

## Open Questions

- **¿Cuándo amplía el backend `GET /sales` al rol `cashier`?** La decisión de producto está tomada (el Cajero ve sus propias ventas), pero el endpoint hoy le devuelve `403` y hay un test que lo fija. Hasta que se amplíe, esa parte del requirement queda especificada y sin implementar.
- **¿Quién genera el ticket que se lleva el cliente?** Si lo genera el frontend, tiene que llevar `sale_number` y no el UUID — es la razón de existir del campo, y hoy no hay ninguna función de ticket.
- ¿Hace falta poder retomar un draft abandonado desde el listado? Hoy sólo se ven; no hay endpoint para continuarlos ni para descartarlos.
