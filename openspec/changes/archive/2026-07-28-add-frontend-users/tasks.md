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

- [x] 5.1 Probar con los tres roles que sólo Admin llega a la sección, por navegación y por URL directa — ejercitado contra el dev server (`localhost:3000`) con sesión por cookie de rol: URL directa a `/users`, `/users/new` y `/users/{id}` da `307 → /` con `cashier` y `307 → /products` con `inventory` (guard `requireRole(["admin"])` en las tres pages), y `200` con `admin`; el cuerpo del 307 no contiene markup ni datos de usuario, y el redirect ocurre antes de montar `UsersView`, así que no se emite `GET /users`. Navegación: el shell renderizado no incluye `href="/users"` para `cashier` (sólo `/` y `/sales`) ni para `inventory`, y sí para `admin` (`lib/nav.ts:9`). Límite: las sesiones se montaron a nivel de cookie (`kiosco_role`), no logueándose con usuarios reales de cada rol — no se pudo obtener/crear credenciales de `cashier`/`inventory` en este entorno; la denegación `403` del backend queda sin ejercitar (el guard del frontend, que es lo que cubre esta tarea, sí)
- [x] 5.2 Verificar que ninguna respuesta ni ningún log del cliente exponga material de contraseña — por inspección: ninguna respuesta de usuario incluye password (backend serializa siempre `toUserResponse` → `userResponse`, sin `password_hash`: `internal/identity/transport/http/dto.go:34-47` y `user_handler.go:143-157`) y `User` en `lib/types.ts:3-13` no tiene campo de contraseña; no hay ningún `console.*` en `src/` (grep, 0 coincidencias); la contraseña sólo existe como campo del body de `POST /users` (`UserForm.tsx:69`), nunca en URL/query (el proxy arma la URL con path + `search`, `app/api/backend/[...path]/route.ts:19-21`, y no loguea nada); los inputs del form no llevan `name`, así que un submit nativo sin JS tampoco la pondría en el query string; `api()` no reexpone el body enviado en los errores (`lib/api.ts:71-86`)
- [x] 5.3 Recorrido completo por teclado con foco visible, incluido el diálogo de confirmación — ejercitado manualmente y confirmado por la persona usuaria. Los radios de rol muestran foco mediante `has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary` en `UserForm.tsx`; durante la desactivación pendiente, `Dialog` recibe `dismissible={false}`, por lo que Escape y el backdrop no lo cierran hasta recibir la respuesta del backend.

## 6. Perfil editable

- [x] 6.1 Agregar `first_name`, `last_name`, `phone`, `address` a `User` en `lib/types.ts`
- [x] 6.2 Página dedicada `/users/{id}` (no modal — se decidió así porque la edición de rol/permisos se suma más adelante y un modal no escala): username, rol, estado, alta y los 4 campos de perfil. `/users/new` reutiliza el mismo `UserForm` para el alta, igual que `products/new` + `products/[id]` con `ProductForm`
- [x] 6.3 Formulario de edición del perfil en la página de detalle (no username/rol/password/active): `PUT /users/{id}`, deshabilitar envío mientras está pendiente, mostrar `message` del backend ante error
- [x] 6.4 La acción de desactivar se mueve a la página de detalle (ya no vive en la fila de la tabla)
- [x] 6.5 `GET /users/{id}`: `UserDetailView` pide el detalle directamente con `api<User>(\`/users/${id}\`)`, sin escanear el listado paginado. Contrato confirmado en `../backend/internal/bootstrap/router.go` y `internal/identity/transport/http/` (GET admin-only; `200` con `userResponse`, `404` si no existe). No hubo instancia local disponible en `localhost:8080` ni `localhost:8082` para ejercitarlo contra runtime.

## 7. Paginación 20

- [x] 7.1 `/users`: consumir `GET /users?limit=20&page=`, parsear `{ users, total }`, control Anterior/Siguiente (mismo patrón que `SalesView`)
- [x] 7.2 `/categories`: mismo criterio con `GET /categories?limit=20&page=` → `{ categories, total }`
