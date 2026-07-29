## 0. Bloqueo por backend

- [x] 0.1 Confirmar que `add-multi-role-and-receiving` está mergeado y desplegado; sin eso ninguna tarea de la 2 en adelante se puede verificar contra datos reales (evidencia: commit backend `03b3df5`; `backend-api-1` en ejecución y `GET /health` responde OK, 2026-07-28)
- [x] 0.2 Verificar contra `../backend/internal/bootstrap/router.go` que existen `GET /users/{id}`, `PUT /users/{id}/roles`, `GET /purchase-orders/{id}`, `POST /purchase-orders/{id}/items` y `DELETE /purchase-orders/{id}/items/{item_id}` (verificado en `registerUserRoutes` y `registerPurchasingRoutes`, 2026-07-28)
- [x] 0.3 Confirmar el nombre literal del rol nuevo (`receiving`) y los cuatro valores que devuelve el backend en `roles` (verificado en `identity/spec.md`; instancia: `cajero1` devuelve `["cashier","receiving"]`, 2026-07-28)
- [x] 0.4 Confirmar que los ítems del pedido llegan con `product_name` resuelto (si no, escalar antes de construir el detalle: sin eso la pantalla es un N+1) (instancia: `GET /purchase-orders/{id}` devolvió `product_name` para un ítem catalogado, 2026-07-28)
- [x] 0.5 Verificar contra una instancia real `GET /sales/today-summary` como cajero: `200`, sólo ventas confirmadas propias del día de negocio, decimales string y desglose por medio; confirmar `403` sin `cashier` antes de integrar las cards (2026-07-29: `cajero1` obtuvo 200 con 2 ventas confirmadas propias y `2500.00`; el listado propio del día coincidió en conteo y total; `inventario1` obtuvo 403; los parámetros de fecha/cajero no ampliaron el scope.)

## 1. Roles como conjunto

- [x] 1.1 `src/lib/types.ts`: sumar `"receiving"` a `Role` y cambiar `User.role` por `User.roles: Role[]`
- [x] 1.2 `src/lib/roles.ts`: agregar `hasAnyRole(userRoles, allowed)` y `parseRoles(raw)` tolerante a roles desconocidos, con `roles.test.ts` cubriendo conjunto vacío, rol desconocido y unión
- [x] 1.3 `src/lib/roles.ts`: `requireRole(allowed)` pasa a leer la cookie `roles` y evaluar intersección
- [x] 1.4 `src/app/api/session/route.ts`: escribir la cookie `roles` (CSV) en lugar de `role`, y limpiarla en logout
- [x] 1.5 `src/lib/nav.ts`: filtrar `NAV_ITEMS` por intersección y convertir `homeFor` en prioridad sobre el conjunto (`admin`, `cashier`, `receiving`, `inventory`), con test
- [x] 1.6 Recorrer las pantallas que hoy leen el rol de la sesión y adaptarlas al conjunto; `npm run lint` y `npm test` en verde antes de seguir (evidencia: lint, 72 tests y build exitosos, 2026-07-28)

## 2. Vocabulario del rol Recepción

- [x] 2.1 Centralizar etiquetas y descripciones de rol (incluida "Recepción": carga stock y recibe pedidos, no edita el catálogo) en un único módulo consumido por Usuarios y por la navegación
- [x] 2.2 `NAV_ITEMS`: agregar la sección de recepción para `receiving` y `admin`

## 3. Detalle de usuario

- [x] 3.1 `src/app/(app)/users/[id]/page.tsx`: server component con `requireRole(["admin"])` que renderiza `UserDetailView`
- [x] 3.2 `src/components/users/UserDetailView.tsx`: carga con `useLoad` desde `GET /users/{id}`, con estados de carga, error y usuario inexistente (`404`)
- [x] 3.3 Mostrar username y contraseña como no editables, indicando por qué, en lugar de campos deshabilitados sin explicación
- [x] 3.4 `UsersView`: fila clickeable por puntero y por teclado con foco visible, sin que la acción de desactivar dispare la navegación
- [x] 3.5 `UsersView`: mostrar los roles como badges múltiples en el listado

## 4. Edición de perfil y de roles

- [x] 4.1 Formulario de perfil (nombre, apellido, teléfono, dirección) contra `PUT /users/{id}`: campos opcionales, string vacío válido, submit deshabilitado mientras está en vuelo, error del backend inline, toast al guardar
- [x] 4.2 `src/components/users/RolesField.tsx`: selección múltiple con etiqueta y descripción por rol, accesible por teclado
- [x] 4.3 Guardado de roles contra `PUT /users/{id}/roles`, con su propio botón y su propio error inline, separado del guardado de perfil
- [x] 4.4 Bloquear el guardado con conjunto vacío, explicando que hace falta al menos un rol
- [x] 4.5 Advertir antes de confirmar cuando un Admin se quita a sí mismo el rol `admin`
- [x] 4.6 Verificar que el rechazo del backend (por ejemplo, último Admin activo) se muestra inline y no altera los roles mostrados (verificación manual confirmada por el usuario, 2026-07-29)

## 5. Listado de recepción

- [x] 5.1 `src/lib/receiving.ts` + `receiving.test.ts`: orden con pendientes primero, etiqueta de estado, y detección de pedido con ítems no catalogados. Sin aritmética de dinero
- [x] 5.2 `src/app/(app)/receiving/page.tsx`: `requireRole(["receiving","admin"])` renderizando `ReceivingListView`
- [x] 5.3 `ReceivingListView`: listado desde `GET /purchase-orders` con proveedor, fecha, total y estado; `formatMoney()` y fechas `es-AR`
- [x] 5.4 Filtros por proveedor (desde `GET /suppliers`) y por rango de fechas, y paginación sobre el total del backend
- [x] 5.5 Estados de carga, vacío (invitando a limpiar filtros) y error con `message` y reintento
- [x] 5.6 Fila que navega al detalle, por puntero y por teclado; badge en las filas con ítems pendientes de alta
- [x] 5.7 Verificar que no se renderiza ninguna acción de crear pedido ni proveedor

## 6. Detalle del pedido

- [x] 6.1 `src/app/(app)/receiving/[id]/page.tsx` con el mismo gating, renderizando `ReceivingDetailView`
- [x] 6.2 `ReceivingDetailView`: carga desde `GET /purchase-orders/{id}` con cabecera (proveedor, fecha, estado, total) e ítems (nombre o descripción, cantidad, costo unitario, subtotal)
- [x] 6.3 Ítems removidos visibles, tachados y con su motivo, excluidos del total
- [x] 6.4 Ítems de texto libre marcados como pendientes de alta por un Admin, sin ofrecer crear el producto
- [x] 6.5 Pedido recibido: mostrar usuario, fecha y hora de recepción y método de pago, y no renderizar ninguna acción de recepción ni de edición de ítems

## 7. Confirmar recepción

- [x] 7.1 Diálogo de confirmación con selección de método de pago (efectivo, transferencia, cuenta corriente)
- [x] 7.2 Enunciar en el diálogo, antes de confirmar, que se registran el usuario y la fecha y hora
- [x] 7.3 Confirmación deshabilitada sin método elegido y mientras el request está en vuelo
- [x] 7.4 `POST /purchase-orders/{id}/receive`, y al volver **re-leer** el pedido en lugar de asumir el estado resultante; toast de éxito
- [x] 7.5 Error del backend inline en el diálogo, dejándolo abierto con el método elegido; en `409` re-leer el pedido para mostrar su estado real

## 8. Ítem fuera del pedido

- [x] 8.1 Formulario único con selector de modo: buscar en el catálogo (`GET /products?search=`) o describir en texto libre
- [x] 8.2 Cambiar de modo limpia el otro campo, de modo que el request nunca lleve `product_id` y `description` a la vez
- [x] 8.3 Cantidad y costo unitario obligatorios, con el costo enviado como string decimal; errores inline junto al campo, sin request
- [x] 8.4 `POST /purchase-orders/{id}/items` y re-lectura del pedido; verificar que el total mostrado viene del backend y no de una suma en el cliente
- [x] 8.5 Verificar que sobre un pedido `RECEIVED` no se renderiza la acción

## 9. Baja de ítem con motivo

- [x] 9.1 Diálogo con motivo obligatorio, reusando el patrón de anulación de ítem en venta
- [x] 9.2 Confirmación deshabilitada con motivo en blanco y mientras el request está en vuelo
- [x] 9.3 `DELETE /purchase-orders/{id}/items/{item_id}` con el motivo, re-lectura del pedido y toast de éxito
- [x] 9.4 Fallo del backend: diálogo abierto con el `message`, ítem todavía activo
- [x] 9.5 Verificar que sobre un pedido `RECEIVED` no se renderiza la acción

## 10. Historial del cajero acotado al día

- [x] 10.1 Resolver la vista por `hasAnyRole(roles, ["admin"])`: con `admin` en el conjunto se renderiza la vista de Admin completa
- [x] 10.2 Para el cajero sin `admin`: quitar el selector de rango y mostrar la fecha de hoy como etiqueta estática en `es-AR`
- [x] 10.3 Verificar que no se renderiza filtro por cajero y que no hay filtrado de propiedad en el cliente
- [x] 10.4 Verificar que el filtro por borrador sigue funcionando dentro del día (2026-07-29: inspección de `SalesView` confirma que el selector conserva `from`/`to` del día del cajero y envía `status=draft`; backend real respondió 200 a esa query. `npm test` 78/78 y `npm run lint` pasaron.)
- [x] 10.5 Para `cashier` sin `admin`, cargar y renderizar las cards de ventas del día desde `GET /sales/today-summary` (cantidad, total facturado, efectivo y tarjeta); loading, error con `message` y reintento, sin agregar desde el listado ni mostrar cierre de caja (inspección y lint/tests, 2026-07-29)
- [x] 10.6 Verificar manualmente que un `admin + cashier` conserva las cards de Admin y no pide `/sales/today-summary`; que un cajero ve sólo sus propios totales y que una jornada sin ventas muestra ceros (verificación manual confirmada por el usuario, 2026-07-29)

## 11. Cierre

- [x] 11.1 Probar con los cuatro roles y con al menos dos combinaciones (`["cashier","receiving"]`, `["admin","cashier"]`) que la navegación y el acceso por URL directa coinciden con el spec (2026-07-29: HTTP con sesiones reales verificó Admin, Inventory y `cashier + receiving`; la verificación manual del usuario confirmó el rol `receiving` solo y los casos restantes.)
- [x] 11.2 Recorrido completo por teclado con foco visible en usuarios y en recepción, incluidos los tres diálogos (Chrome MCP, 2026-07-29: diálogos de desactivación, pérdida de Admin y confirmación de recepción abrieron con foco inicial; `Escape` devolvió el foco al disparador, con outline sólido de 2 px.)
- [x] 11.3 Verificar responsive hasta mobile y `prefers-reduced-motion` en las pantallas nuevas; duraciones desde `lib/motion.ts` (Chrome MCP, 2026-07-29: a 500 px Usuarios se adapta a tarjetas y Recepción mantiene acciones accesibles sin overflow horizontal de página; la tabla conserva scroll propio. `globals.css` reduce entradas a fade bajo `prefers-reduced-motion` y las duraciones usan `--motion-*` alineadas con `lib/motion.ts`.)
- [x] 11.4 Verificar que no hay literales hex ni `rounded-xl` en los componentes nuevos, sólo tokens (verificado con `rg`, 2026-07-28)
- [x] 11.5 `npm run lint` y `npm test` en verde (75 tests, 2026-07-28)
- [x] 11.6 Sin cambios en `CLAUDE.md` por decisión explícita del usuario (2026-07-29): el archivo vigente es un adaptador mínimo y ya no contiene §2, §3 ni §5; roles, rutas y endpoints se documentan en OpenSpec y `ai/context/`.
