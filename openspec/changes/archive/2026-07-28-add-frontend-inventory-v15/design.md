# Design: add-frontend-inventory-v15

## Context

Endpoints después de `add-inventory-v15`:

| Método | Ruta | Rol | Nota |
|---|---|---|---|
| `GET` | `/inventory/stock?search=&category_id=&low_stock_only=&page=&limit=` | todos | `page` reemplaza a `offset` |
| `PATCH` | `/inventory/stock/{product_id}/minimum` | admin, inventory | fijar umbral |
| `GET` | `/inventory/stock/low` | admin, inventory | azúcar sobre `low_stock_only=true` |
| `GET` | `/inventory/movements?product_id=&type=&from=&to=&performed_by=&page=` | admin, inventory | reemplaza `/reports/stock/history` |
| ~~`GET`~~ | ~~`/reports/stock/history`~~ | — | **eliminado** |

La definición de stock bajo es del backend: `minimum_quantity > 0 AND quantity < minimum_quantity`. Dos consecuencias que el frontend debe respetar y hoy no respeta:

1. Es `<`, **no** `<=`. `InventoryView.tsx:85` usa `<=`, así que hoy marca como bajo un producto que está exactamente en su mínimo. Diverge del backend.
2. `minimum_quantity = 0` significa **alerta desactivada**, no "alertar siempre". Un producto en 0 con mínimo 0 no es stock bajo.

## Goals / Non-Goals

**Goals:**
- Sacar la regla de stock bajo del cliente y ponerla donde pertenece.
- Que el umbral sea configurable, que es lo que vuelve útil la función.
- Mover el historial al módulo donde el operador lo busca, ganando lo que el endpoint viejo descartaba.

**Non-Goals:**
- Alertas activas (notificaciones, badges de conteo en la navegación, sonidos). El backend dice explícitamente que el stock bajo es informativo. Un contador en la navegación exigiría poll permanente para un dato que nadie mira entre reposiciones.
- Fijar el mínimo en lote o al inicializar stock: el backend no lo soporta.
- Detalle de un movimiento (`/movements/{id}`): el backend lo omitió deliberadamente.
- Gráficos de evolución de stock: no hay serie temporal de cantidades, sólo el log de movimientos.

## Decisions

**La marca de stock bajo viene del backend; el frontend no la calcula.**
Es el corazón del change. El listado usa la marca de la respuesta. Si el backend no la expone como campo, el frontend usa `low_stock_only=true` como consulta separada en vez de reimplementar la condición. **Verificar al implementar**: si la respuesta trae `low_stock: bool`, se usa; si no, se pide al backend que lo agregue, porque la alternativa es volver a calcular la regla en el cliente y este change existe justamente para eliminar eso.

Bajo ninguna circunstancia se reintroduce `quantity <= minimum_quantity` en el frontend.

**Un producto sin stock inicializado no es stock bajo — y no es lo mismo que uno en cero.**
El listado parte de `products` con `LEFT JOIN stock`, así que conviven tres estados que el operador debe poder distinguir:

```
  sin inicializar   →  "Sin inicializar"   acción: Inicializar
  en cero           →  0 unidades          acción: Ajustar
  bajo el mínimo    →  3 (mín. 10) ⚠       acción: Ajustar
```

Colapsar el primero en "0" es el error clásico: hace ver como agotado algo que simplemente nunca se cargó, y manda al operador a buscar mercadería que sí está en el depósito. Los tres estados se distinguen con texto, no sólo con color.

**El mínimo se fija donde se ve la cantidad, no en una pantalla de configuración.**
Fijar el umbral es una decisión que se toma mirando el nivel real ("de esto quiero tener siempre 10"). Vive en el mismo diálogo que el ajuste de stock, en una pestaña separada, porque son operaciones distintas y confundirlas es caro: escribir la cantidad real donde va el mínimo cambia el inventario.

Por eso el diálogo **nombra el efecto de forma explícita** y el `0` tiene texto propio: "0 desactiva la alerta". Es un valor válido cuyo significado no es adivinable.

**El mínimo no exige motivo; el ajuste sí.**
`CLAUDE.md` §1 dice que todo ajuste de stock lleva motivo, y eso se mantiene. Pero fijar un umbral no mueve mercadería: no cambia la cantidad en mano ni genera movimiento. El backend lo confirma (sin transacción, sin `StockMovement`). Pedir motivo acá diluiría la regla donde sí importa.

**El historial vive en Inventory y se llega a él desde el producto.**
El operador no piensa "quiero ver el reporte de movimientos", piensa "¿qué pasó con este producto?". El camino principal es desde la fila del producto en el listado de stock, con el filtro por producto ya aplicado. La vista sin filtrar existe, pero es la secundaria.

Esto es lo que justifica moverlo de `/reports` a Inventory más allá de la propiedad del dato: en Reportes estaba lejos del lugar donde surge la pregunta.

**Las columnas nuevas son el motivo del cambio, no un extra.**
El endpoint viejo devolvía cinco campos; el nuevo agrega `previous_quantity`, `new_quantity`, `reference_id` y `performed_by` con nombre de usuario. `previous → new` es lo que hace auditable el log: sin eso, un delta suelto no permite reconstruir cómo se llegó al número actual. Se muestran como transición (`12 → 9`), no como dos columnas sueltas.

`performed_by` es el otro dato que faltaba: un ajuste sin autor no es una traza.

**El tipo de movimiento se elige de una lista cerrada.**
El backend valida contra el enum y devuelve `400` ante un valor inválido. El filtro es un selector con los cuatro tipos, nunca texto libre. `RETURN` aparece sólo cuando `add-frontend-sales-returns` esté desplegado; antes de eso el filtro existe pero nunca devuelve filas.

**La paginación pasa a `page` y hay que buscar los usos viejos.**
El cambio de `offset` a `page` es silencioso en el peor sentido: un `offset` enviado a un backend que espera `page` no da error, devuelve la primera página. El síntoma es "la paginación no avanza", que se diagnostica mal. Hay que barrer todos los usos, no sólo el del listado de stock.

## Risks / Trade-offs

- **Despliegue acoplado a dos changes de backend a la vez** → Este frontend, `add-inventory-v15` y `add-reporting-v15` van en el mismo release. Fuera de ese orden, el historial desaparece o se duplica.
- **`offset` → `page` falla en silencio** → Es el riesgo de regresión más probable del change. Barrido explícito en las tasks.
- **Con todos los mínimos en 0, la vista de stock bajo nace vacía** → Es correcto, pero se va a leer como que no funciona. El estado vacío debe explicar que no hay umbrales configurados y llevar a configurarlos, en vez de decir "no hay productos con stock bajo".
- **Cambiar `<=` por `<` altera lo que se marca hoy** → Un producto exactamente en su mínimo deja de aparecer como bajo. Es alinearse con el backend, pero cambia el comportamiento observado.
- **Un umbral mal fijado ensucia la vista sin romper nada** → El stock bajo es informativo y nunca bloquea; el costo de equivocarse es ruido, no una operación bloqueada.

## Migration Plan

1. Verificar que la respuesta de stock exponga la marca de stock bajo; si no, pedirla al backend antes de implementar.
2. Desplegar backend (`add-inventory-v15` + `add-reporting-v15`) y este frontend **en el mismo release**.
3. Post-despliegue: la vista de stock bajo estará vacía hasta que se configuren umbrales. Es esperado.

Rollback: revertir los tres juntos. El frontend solo no puede revertirse — quedaría llamando a un endpoint eliminado.

## Open Questions

- ¿La respuesta de `GET /inventory/stock` incluye una marca de stock bajo por fila, o el frontend debe consultar dos veces? Bloqueante: de la respuesta depende que no se reintroduzca la regla en el cliente.
- ¿Debería `Initialize Stock` aceptar un `minimum_quantity` inicial? El backend lo dejó fuera de alcance, pero obliga a dos pasos para cada producto nuevo.
- ¿Hay una definición operativa de "stock bajo" por familia de producto, o el umbral es siempre manual por producto? Si es lo primero, fijar decenas de umbrales a mano no va a ocurrir y la función queda muerta igual que hoy.
