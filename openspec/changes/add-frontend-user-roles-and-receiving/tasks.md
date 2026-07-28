## 0. Bloqueo por backend

- [ ] 0.1 Confirmar que `add-multi-role-and-receiving` está mergeado y desplegado; sin eso ninguna tarea de la 2 en adelante se puede verificar contra datos reales
- [ ] 0.2 Verificar contra `../backend/internal/bootstrap/router.go` que existen `GET /users/{id}`, `PUT /users/{id}/roles`, `GET /purchase-orders/{id}`, `POST /purchase-orders/{id}/items` y `DELETE /purchase-orders/{id}/items/{item_id}`
- [ ] 0.3 Confirmar el nombre literal del rol nuevo (`receiving`) y los cuatro valores que devuelve el backend en `roles`
- [ ] 0.4 Confirmar que los ítems del pedido llegan con `product_name` resuelto (si no, escalar antes de construir el detalle: sin eso la pantalla es un N+1)

## 1. Roles como conjunto

- [ ] 1.1 `src/lib/types.ts`: sumar `"receiving"` a `Role` y cambiar `User.role` por `User.roles: Role[]`
- [ ] 1.2 `src/lib/roles.ts`: agregar `hasAnyRole(userRoles, allowed)` y `parseRoles(raw)` tolerante a roles desconocidos, con `roles.test.ts` cubriendo conjunto vacío, rol desconocido y unión
- [ ] 1.3 `src/lib/roles.ts`: `requireRole(allowed)` pasa a leer la cookie `roles` y evaluar intersección
- [ ] 1.4 `src/app/api/session/route.ts`: escribir la cookie `roles` (CSV) en lugar de `role`, y limpiarla en logout
- [ ] 1.5 `src/lib/nav.ts`: filtrar `NAV_ITEMS` por intersección y convertir `homeFor` en prioridad sobre el conjunto (`admin`, `cashier`, `receiving`, `inventory`), con test
- [ ] 1.6 Recorrer las pantallas que hoy leen el rol de la sesión y adaptarlas al conjunto; `npm run lint` y `npm test` en verde antes de seguir

## 2. Vocabulario del rol Recepción

- [ ] 2.1 Centralizar etiquetas y descripciones de rol (incluida "Recepción": carga stock y recibe pedidos, no edita el catálogo) en un único módulo consumido por Usuarios y por la navegación
- [ ] 2.2 `NAV_ITEMS`: agregar la sección de recepción para `receiving` y `admin`

## 3. Detalle de usuario

- [ ] 3.1 `src/app/(app)/users/[id]/page.tsx`: server component con `requireRole(["admin"])` que renderiza `UserDetailView`
- [ ] 3.2 `src/components/users/UserDetailView.tsx`: carga con `useLoad` desde `GET /users/{id}`, con estados de carga, error y usuario inexistente (`404`)
- [ ] 3.3 Mostrar username y contraseña como no editables, indicando por qué, en lugar de campos deshabilitados sin explicación
- [ ] 3.4 `UsersView`: fila clickeable por puntero y por teclado con foco visible, sin que la acción de desactivar dispare la navegación
- [ ] 3.5 `UsersView`: mostrar los roles como badges múltiples en el listado

## 4. Edición de perfil y de roles

- [ ] 4.1 Formulario de perfil (nombre, apellido, teléfono, dirección) contra `PUT /users/{id}`: campos opcionales, string vacío válido, submit deshabilitado mientras está en vuelo, error del backend inline, toast al guardar
- [ ] 4.2 `src/components/users/RolesField.tsx`: selección múltiple con etiqueta y descripción por rol, accesible por teclado
- [ ] 4.3 Guardado de roles contra `PUT /users/{id}/roles`, con su propio botón y su propio error inline, separado del guardado de perfil
- [ ] 4.4 Bloquear el guardado con conjunto vacío, explicando que hace falta al menos un rol
- [ ] 4.5 Advertir antes de confirmar cuando un Admin se quita a sí mismo el rol `admin`
- [ ] 4.6 Verificar que el rechazo del backend (por ejemplo, último Admin activo) se muestra inline y no altera los roles mostrados

## 5. Listado de recepción

- [ ] 5.1 `src/lib/receiving.ts` + `receiving.test.ts`: orden con pendientes primero, etiqueta de estado, y detección de pedido con ítems no catalogados. Sin aritmética de dinero
- [ ] 5.2 `src/app/(app)/receiving/page.tsx`: `requireRole(["receiving","admin"])` renderizando `ReceivingListView`
- [ ] 5.3 `ReceivingListView`: listado desde `GET /purchase-orders` con proveedor, fecha, total y estado; `formatMoney()` y fechas `es-AR`
- [ ] 5.4 Filtros por proveedor (desde `GET /suppliers`) y por rango de fechas, y paginación sobre el total del backend
- [ ] 5.5 Estados de carga, vacío (invitando a limpiar filtros) y error con `message` y reintento
- [ ] 5.6 Fila que navega al detalle, por puntero y por teclado; badge en las filas con ítems pendientes de alta
- [ ] 5.7 Verificar que no se renderiza ninguna acción de crear pedido ni proveedor

## 6. Detalle del pedido

- [ ] 6.1 `src/app/(app)/receiving/[id]/page.tsx` con el mismo gating, renderizando `ReceivingDetailView`
- [ ] 6.2 `ReceivingDetailView`: carga desde `GET /purchase-orders/{id}` con cabecera (proveedor, fecha, estado, total) e ítems (nombre o descripción, cantidad, costo unitario, subtotal)
- [ ] 6.3 Ítems removidos visibles, tachados y con su motivo, excluidos del total
- [ ] 6.4 Ítems de texto libre marcados como pendientes de alta por un Admin, sin ofrecer crear el producto
- [ ] 6.5 Pedido recibido: mostrar usuario, fecha y hora de recepción y método de pago, y no renderizar ninguna acción de recepción ni de edición de ítems

## 7. Confirmar recepción

- [ ] 7.1 Diálogo de confirmación con selección de método de pago (efectivo, transferencia, cuenta corriente)
- [ ] 7.2 Enunciar en el diálogo, antes de confirmar, que se registran el usuario y la fecha y hora
- [ ] 7.3 Confirmación deshabilitada sin método elegido y mientras el request está en vuelo
- [ ] 7.4 `POST /purchase-orders/{id}/receive`, y al volver **re-leer** el pedido en lugar de asumir el estado resultante; toast de éxito
- [ ] 7.5 Error del backend inline en el diálogo, dejándolo abierto con el método elegido; en `409` re-leer el pedido para mostrar su estado real

## 8. Ítem fuera del pedido

- [ ] 8.1 Formulario único con selector de modo: buscar en el catálogo (`GET /products?search=`) o describir en texto libre
- [ ] 8.2 Cambiar de modo limpia el otro campo, de modo que el request nunca lleve `product_id` y `description` a la vez
- [ ] 8.3 Cantidad y costo unitario obligatorios, con el costo enviado como string decimal; errores inline junto al campo, sin request
- [ ] 8.4 `POST /purchase-orders/{id}/items` y re-lectura del pedido; verificar que el total mostrado viene del backend y no de una suma en el cliente
- [ ] 8.5 Verificar que sobre un pedido `RECEIVED` no se renderiza la acción

## 9. Baja de ítem con motivo

- [ ] 9.1 Diálogo con motivo obligatorio, reusando el patrón de anulación de ítem en venta
- [ ] 9.2 Confirmación deshabilitada con motivo en blanco y mientras el request está en vuelo
- [ ] 9.3 `DELETE /purchase-orders/{id}/items/{item_id}` con el motivo, re-lectura del pedido y toast de éxito
- [ ] 9.4 Fallo del backend: diálogo abierto con el `message`, ítem todavía activo
- [ ] 9.5 Verificar que sobre un pedido `RECEIVED` no se renderiza la acción

## 10. Historial del cajero acotado al día

- [ ] 10.1 Resolver la vista por `hasAnyRole(roles, ["admin"])`: con `admin` en el conjunto se renderiza la vista de Admin completa
- [ ] 10.2 Para el cajero sin `admin`: quitar el selector de rango y mostrar la fecha de hoy como etiqueta estática en `es-AR`
- [ ] 10.3 Verificar que no se renderiza filtro por cajero y que no hay filtrado de propiedad en el cliente
- [ ] 10.4 Verificar que el filtro por borrador sigue funcionando dentro del día

## 11. Cierre

- [ ] 11.1 Probar con los cuatro roles y con al menos dos combinaciones (`["cashier","receiving"]`, `["admin","cashier"]`) que la navegación y el acceso por URL directa coinciden con el spec
- [ ] 11.2 Recorrido completo por teclado con foco visible en usuarios y en recepción, incluidos los tres diálogos
- [ ] 11.3 Verificar responsive hasta mobile y `prefers-reduced-motion` en las pantallas nuevas; duraciones desde `lib/motion.ts`
- [ ] 11.4 Verificar que no hay literales hex ni `rounded-xl` en los componentes nuevos, sólo tokens
- [ ] 11.5 `npm run lint` y `npm test` en verde
- [ ] 11.6 Actualizar `CLAUDE.md` (§2 roles, §3 rutas, §5 endpoints) con el rol Recepción, `/receiving` y los endpoints nuevos
