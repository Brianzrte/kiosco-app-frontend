# Tasks: add-frontend-users

> Trabajo visual según la skill `frontend-design` (`CLAUDE.md` §1). Las rutas ya están implementadas en el código del backend; falta verificarlas contra una instancia en ejecución.

## 0. Prerrequisito

- [x] 0.1 Verificar que `POST/GET /api/v1/users` y `PATCH /api/v1/users/{id}/deactivate` estén desplegados — confirmado, implementados en `internal/identity`
- [x] 0.2 Backend desplegado: perfil editable (`first_name`, `last_name`, `phone`, `address`), `PUT /api/v1/users/{id}` y paginación `limit`/`offset` en `GET /users` y `GET /categories` — confirmado en `internal/bootstrap/router.go` y `internal/identity/transport/http/`. Secciones 6 y 7 desbloqueadas e implementadas

## 1. Tipos y acceso

- [x] 1.1 Agregar el tipo `User` (`id`, `username`, `role`, `active`, `created_at`) en `lib/types.ts` — sin campo de contraseña
- [x] 1.2 Agregar la sección de usuarios a `lib/nav.ts` sólo para Admin
- [x] 1.3 Agregar el guard de ruta en `lib/roles.ts`: cualquier rol distinto de `admin` se redirige sin disparar request

## 2. Listado

- [x] 2.1 Construir `/users` con la tabla del UI kit (username, rol, estado, alta)
- [x] 2.2 Insignia de estado con texto, nunca sólo color; filas inactivas con jerarquía de texto reducida
- [x] 2.3 Estados de carga, vacío y error explícitos

## 3. Alta

- [x] 3.1 Formulario con username, contraseña y rol
- [x] 3.2 Selector de rol de tres opciones con etiqueta en español y descripción de una línea de lo que permite
- [x] 3.3 Campo de contraseña enmascarado con control para revelarla; sin campo de confirmación
- [x] 3.4 Deshabilitar el envío mientras está pendiente
- [x] 3.5 Mapear el `409` al campo de username: mensaje del backend debajo, foco ahí, resto de valores preservado
- [x] 3.6 Limpiar el valor de contraseña al desmontar el formulario

## 4. Desactivación

- [x] 4.1 Diálogo de confirmación que nombre al usuario y diga que no se puede deshacer desde la aplicación
- [x] 4.2 Detectar el caso de auto-desactivación y agregar la advertencia de pérdida inmediata de acceso, sin bloquear la acción
- [x] 4.3 No ofrecer ningún control de deshacer en la realimentación de éxito
- [x] 4.4 Mostrar el mensaje del backend ante error, dejando la fila como activa

## 5. Verificación

- [ ] 5.1 Probar con los tres roles que sólo Admin llega a la sección, por navegación y por URL directa
- [ ] 5.2 Verificar que ninguna respuesta ni ningún log del cliente exponga material de contraseña
- [ ] 5.3 Recorrido completo por teclado con foco visible, incluido el diálogo de confirmación

## 6. Perfil editable

- [x] 6.1 Agregar `first_name`, `last_name`, `phone`, `address` a `User` en `lib/types.ts`
- [x] 6.2 Página dedicada `/users/{id}` (no modal — se decidió así porque la edición de rol/permisos se suma más adelante y un modal no escala): username, rol, estado, alta y los 4 campos de perfil. `/users/new` reutiliza el mismo `UserForm` para el alta, igual que `products/new` + `products/[id]` con `ProductForm`
- [x] 6.3 Formulario de edición del perfil en la página de detalle (no username/rol/password/active): `PUT /users/{id}`, deshabilitar envío mientras está pendiente, mostrar `message` del backend ante error
- [x] 6.4 La acción de desactivar se mueve a la página de detalle (ya no vive en la fila de la tabla)
- [ ] 6.5 Bloqueado por backend (ver `backend-request.md` §7): `GET /users/{id}` — hoy `UserDetailView` resuelve el detalle escaneando `GET /users?limit=100` client-side; cambiar a pedir por id cuando el endpoint exista

## 7. Paginación 20

- [x] 7.1 `/users`: consumir `GET /users?limit=20&page=`, parsear `{ users, total }`, control Anterior/Siguiente (mismo patrón que `SalesView`)
- [x] 7.2 `/categories`: mismo criterio con `GET /categories?limit=20&page=` → `{ categories, total }`
