## Context

Tres cosas cambian a la vez y se apoyan una en otra.

1. **El rol deja de ser un escalar.** Hoy `src/lib/types.ts` define `Role = "admin" | "cashier" | "inventory"`, la cookie de sesión guarda un valor, `requireRole()` compara igualdad y `NAV_ITEMS` filtra por pertenencia de ese único valor. Todo eso pasa a razonar sobre un conjunto.
2. **Aparece un cuarto rol, `receiving`.** Existe porque la unión de roles sola no alcanza: darle `inventory` a un cajero para que pueda cargar stock le daría también escritura sobre el catálogo y los precios, que es justamente lo que no queremos. `receiving` es el permiso mínimo que faltaba: stock y recepción, sin Catalog.
3. **Aparece una pantalla nueva de recepción**, que es la primera del frontend que escribe sobre Purchasing. Hasta ahora Purchasing sólo se leía desde `/reports/purchases`.

Restricción dura: **nada de esto existe en el backend hoy**. `User.Role` es un campo único, `POST /purchase-orders/{id}/receive` recibe sólo el id del pedido y el del usuario, no hay `GET /purchase-orders/{id}`, no hay edición de ítems, y Purchasing e Inventory están gateados a `admin` + `inventory`. El cambio espejo `add-multi-role-and-receiving` en `../backend` define los contratos; este cambio no arranca antes que ese, y no mockea nada (ver `backend-request.md`).

## Goals / Non-Goals

**Goals:**

- Que un usuario se pueda abrir, editar y re-rolar desde la UI, sin SQL.
- Que el gating por rol sea de conjuntos en un único lugar, no una comparación repetida por pantalla.
- Que la recepción de un pedido registre lo que efectivamente pasó: método de pago, ítems que no vinieron (con motivo) e ítems que vinieron de más (aunque no estén en el catálogo).
- Que el historial del cajero deje de prometer un rango que el backend recorta.

**Non-Goals:**

- Crear pedidos de compra o proveedores desde el frontend. Sigue sin haber UI de gestión de compras (CLAUDE.md §3).
- Cambiar username o contraseña de un usuario, y reactivar usuarios: el backend no lo expone.
- Dar de alta el producto no catalogado desde la recepción. El circuito se cierra en Productos, por un Admin.
- Permisos granulares por operación. La unidad de autorización sigue siendo el rol.
- Que recibir un pedido mueva stock. El backend mantiene esa decisión; cargar stock es un paso aparte y explícito.

## Decisions

### 1. `Role` sigue siendo el tipo del elemento; el conjunto vive en el borde

`Role` se mantiene como union de literales y se le suma `"receiving"`. Lo que cambia es que `User.roles: Role[]` y la sesión guarda `roles`. Se agrega en `src/lib/roles.ts` un único predicado:

```ts
export function hasAnyRole(userRoles: Role[], allowed: Role[]): boolean
```

y `requireRole(allowed)` pasa a leer `roles` de la cookie y aplicarlo. `NAV_ITEMS` no cambia de forma —ya declara `roles: Role[]` por sección— sólo cambia el lado del filtro.

*Alternativa descartada:* un tipo `RoleSet` con `Set<Role>`. No aporta nada sobre un array de a lo sumo cuatro elementos y complica la serialización a cookie.

### 2. La cookie de sesión guarda `roles` como CSV, y se lee siempre por el mismo helper

`/api/session/route.ts` pasa a escribir la cookie `roles` con los roles separados por coma, en vez de `role`. Un solo parser (`parseRoles`) la lee y descarta valores desconocidos, así un rol nuevo agregado en el backend no rompe la sesión: degrada a "esa sección no se ve". No se mantiene la cookie `role` vieja en paralelo — un sistema con dos fuentes de verdad para el permiso es peor que una migración forzada de sesión.

*Consecuencia:* al desplegar, las sesiones vivas no tienen cookie `roles`. `parseRoles` devuelve conjunto vacío, `requireRole` redirige a `/login`, y el usuario vuelve a entrar. Es aceptable en un kiosco de 5 personas y es el único punto donde este cambio expulsa gente.

### 3. `homeFor` pasa a ser prioridad sobre el conjunto

Un usuario con `["cashier","receiving"]` necesita una pantalla de inicio determinística. Se fija un orden: `admin → /`, `cashier → /`, `receiving → /receiving`, `inventory → /products`. Se toma el primero que el usuario tenga. El orden es dato, no `if` encadenados.

### 4. Cajero + Admin resuelve a Admin, en el historial y en todos lados

La regla de la unión tiene un caso donde chocaría: `/sales` es más restrictivo para `cashier` que para `admin`. La regla es explícita: **si el usuario tiene `admin`, ve la vista de Admin.** El acotamiento al día sólo aplica cuando el acceso viene de `cashier` y no hay `admin` en el conjunto. Se resuelve con `hasAnyRole(roles, ["admin"])` en la vista, no con un `roles.length === 1`.

### 5. El historial del cajero pierde el selector de rango, no lo deshabilita

El backend va a recortar cualquier rango del cajero al día en curso. Un selector deshabilitado o un rango que devuelve resultados distintos a los pedidos es peor que no tener selector. Se reemplaza por una etiqueta estática con la fecha de hoy en `es-AR`. Esto **modifica** el spec `ui-sales` de `add-frontend-sales-v15`, que hoy dice "por defecto hoy, ajustable".

### 5.1 El cajero ve sus cards del día desde Sales, no desde Reporting

El cajero necesita el mismo pantallazo operativo de cantidad, total facturado,
efectivo y tarjeta, pero no puede llamar al resumen de Reporting: acepta rangos
arbitrarios y agrega las ventas de todas las personas. Para ese caso se consume
`GET /sales/today-summary`, que el backend scopea al cajero autenticado y al día
de negocio actual, sin parámetros de fecha ni de usuario.

La vista de cajero reutiliza las cards existentes y muestra explícitamente sus
estados de carga, error con reintento y día vacío (ceros que vienen del backend).
No muestra el cierre de caja ni ningún control de rango. Un usuario que también
es Admin conserva la vista Admin y su resumen de Reporting; no pide el endpoint
operativo del cajero.

*Alternativa descartada:* sumar las ventas recibidas por `GET /sales` en el
cliente. El listado es paginado, incluye borradores y no es una fuente válida
para recalcular agregados de negocio.

### 6. La recepción re-lee el pedido después de cada escritura; nunca recalcula el total

Confirmar recepción, agregar ítem y quitar ítem son las tres escrituras. Ninguna actualiza el estado local por optimismo: todas hacen `reload()` del detalle. Dos razones: el total lo recalcula el backend (CLAUDE.md §5 prohíbe recomputar agregados en el cliente) y la recepción es la operación menos idempotente de la pantalla — si la red falla no se asume éxito, se re-lee, igual que la confirmación de venta en POS.

`src/lib/receiving.ts` queda con lo único que sí es cliente puro y testeable: ordenar el listado con pendientes primero, derivar la etiqueta de estado, y decidir si un pedido tiene ítems no catalogados. Nada de aritmética de dinero.

### 7. Producto del catálogo vs. texto libre: un toggle, no dos formularios

El alta de ítem fuera del pedido es un solo formulario con un selector de modo ("Buscar en el catálogo" / "Describir el producto"). Cambiar de modo limpia el otro campo, así el request nunca lleva `product_id` y `description` a la vez. La búsqueda de catálogo reusa `GET /products?search=`, ya usada por POS e Inventario.

*Alternativa descartada:* ofrecer el texto libre sólo cuando la búsqueda no encuentra nada. Suena más guiado pero obliga al usuario a buscar algo que sabe que no existe antes de poder escribirlo, y con un repartidor esperando eso es fricción pura.

### 8. Quitar un ítem se ve como una anulación, no como un delete

Se reusa el patrón de anulación de ítem en venta: diálogo, motivo obligatorio no vacío, confirmación deshabilitada mientras el motivo esté en blanco. El ítem removido **sigue en la tabla**, tachado, con su motivo. Un ítem que desaparece deja al operador sin forma de ver que efectivamente registró la baja.

### 9. La edición de roles va por su propio endpoint y su propio submit

`PUT /users/{id}` (perfil) y `PUT /users/{id}/roles` son dos guardados independientes en la misma pantalla, cada uno con su botón y su error inline. Mezclarlos en un submit único obligaría a razonar sobre éxito parcial cuando uno de los dos falla.

La única validación de roles en el cliente es "al menos uno" — no es una regla de negocio inventada, es lo que impide mandar un request que el backend va a rechazar siempre. La regla del último Admin **no** se valida en el cliente: el frontend no puede contar Admins activos sin inventarse la consulta. Se muestra el `message` del backend.

## Risks / Trade-offs

- **Toda respuesta que trae un usuario cambia de forma** → El frontend no despliega hasta que el backend lo haga. `roles` se lee con un parser tolerante, así que un backend que además siga mandando `role` no rompe nada.
- **Las sesiones vivas se invalidan al desplegar** (decisión 2) → Aceptado; se avisa en el rollout. La alternativa (leer las dos cookies) deja dos fuentes de verdad para el permiso.
- **`receiving` es un rol nuevo que el frontend no controla** → Si el backend lo nombra distinto, la UI lo descarta silenciosamente y la sección desaparece para todos. Mitigación: el nombre del rol se fija en el spec del backend antes de implementar acá, y hay una tarea de verificación cruzada con los cuatro roles.
- **`/receiving` y `/reports/purchases` leen los mismos pedidos con dos pantallas distintas** → Es deliberado: una es operativa y escribe, la otra es reporte y es de Admin. El riesgo es divergencia de formato; se mitiga compartiendo el formateo de estado desde `lib/receiving.ts`.
- **Con dos roles, la navegación se alarga** → Un usuario `["cashier","receiving"]` ve cuatro secciones donde antes veía dos. Aceptable; es exactamente lo que se pidió.

## Migration Plan

1. Se mergea y despliega el backend (`add-multi-role-and-receiving`). Sin eso, este cambio no compila contra datos reales.
2. Tipos y gating primero (`types.ts`, `roles.ts`, `nav.ts`, `/api/session`), en un paso: es el cambio que toca todas las pantallas y conviene tenerlo verde antes de agregar UI.
3. Usuarios: detalle, perfil, roles.
4. Recepción: listado, detalle, y recién después las tres escrituras.
5. Historial y resumen diario del cajero.
6. Rollback: revertir el paso 2 restaura el gating por rol único, siempre que el backend siga mandando `role`. Por eso el backend lo mantiene deprecado una versión en vez de eliminarlo de una.

## Open Questions

- **¿El backend devuelve el nombre del producto en los ítems del pedido, o sólo `product_id`?** Si es lo segundo, el detalle necesita una segunda vuelta contra Catalog por ítem, que es exactamente el N+1 que no queremos en una pantalla que se usa con un repartidor esperando. Pedido explícito en `backend-request.md`.
- **¿Un pedido recibido se puede corregir?** Hoy se asume que no: recibido es terminal y la pantalla no ofrece edición. Si en el kiosco real se equivocan de método de pago, hace falta un flujo de corrección que este cambio no cubre.
- **¿Cuenta corriente es realmente un método de pago o es "todavía no se pagó"?** Se modela como un método más porque así lo expone el backend, pero si el kiosco necesita saber qué le debe a cada proveedor, eso es un reporte que no existe.
- **¿El ítem no catalogado tiene que poder convertirse en producto de un click desde Productos?** Fuera de alcance acá, pero sin ese puente el Admin tiene que copiar la descripción a mano.
