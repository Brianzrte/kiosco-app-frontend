# Pedido a backend: perfil editable de usuario + paginación en listados

> Este archivo es un **prompt para la sesión de backend** (skill `go-backend`, módulo `internal/identity` e `internal/catalog`). Pegar tal cual o adaptar. Generado desde el frontend porque `/users` y `/categories` necesitan estos cambios y hoy no existen.

## Contexto

El frontend (`/users`, admin-only) necesita mostrar y editar datos de contacto del cajero/usuario, y ambos listados (`/users`, `/categories`) devuelven **todo sin paginar**, lo que no escala. Revisé `internal/identity` e `internal/catalog` y confirmé que:

- `domain.User` sólo tiene `ID, Username, PasswordHash, Role, Active, CreatedAt` — no hay campos de contacto.
- No existe `PUT /api/v1/users/{id}` ni `GET /api/v1/users/{id}` — sólo `POST`, `GET` (list) y `PATCH .../deactivate`.
- `ListUsers` y `ListCategories` no aceptan `limit`/`offset`; no usan el paquete `pagination` que ya existe y se usa en `internal/inventory` (`pagination.FromRequest(r)`).

## 1. Nuevos campos de perfil en `User`

Agregar a `internal/identity/domain/user.go`:

```go
type User struct {
	ID           UserID
	Username     string
	PasswordHash string
	Role         Role
	Active       bool
	FirstName    string
	LastName     string
	Phone        string
	Address      string
	CreatedAt    time.Time
}
```

- Todos opcionales (`""` permitido) — no rompe altas existentes ni requiere backfill obligatorio.
- Migración: agregar columnas `first_name`, `last_name`, `phone`, `address` (`text`, `NOT NULL DEFAULT ''` o nullable, seguir el estilo de migraciones ya usado en el módulo) a la tabla de usuarios.
- `userResponse` (dto.go) debe incluir los 4 campos nuevos. Igual que hoy, **nunca** incluir `password_hash`.
- `createUserRequest` puede aceptar los 4 campos como opcionales (sin `validate:"required"`).

## 2. Endpoint de edición: `PUT /api/v1/users/{id}` *(Admin only)*

Editar sólo datos de perfil — no username, password, role ni active (esos ya tienen sus propios flujos: alta fija username/role, y `deactivate` ya existe).

**Request:**
```json
{ "first_name": "Ana", "last_name": "Pérez", "phone": "011-5555-5555", "address": "Av. Siempre Viva 123" }
```

**Response:** `200` con el `userResponse` actualizado.

**Errores:**
- Usuario no encontrado → `404`.
- Caller no admin → `403`.
- Body inválido → `400`.

Seguir el mismo patrón de `application/deactivate_user.go` (nuevo caso de uso `update_user_profile.go` con su propio input/output), no mezclar con `create_user.go`.

## 3. Paginación en `GET /api/v1/users`

Usar el mismo paquete `pagination` que ya consume `internal/inventory` (`pagination.FromRequest(r)` → `Limit`, `Offset`, default 20).

**Request:** `GET /api/v1/users?limit=20&offset=0`

**Response:** cambiar de un array plano a un objeto con total, igual que `/products` (`{ products: [], total }`):

```json
{ "users": [ /* userResponse[] */ ], "total": 37 }
```

⚠️ Esto es un **breaking change** de forma de respuesta — coordinar el despliegue con el frontend (el frontend debe actualizar su parser en el mismo release, no antes).

## 4. Paginación en `GET /api/v1/categories`

Mismo criterio que el punto 3:

**Request:** `GET /api/v1/categories?limit=20&offset=0`

**Response:**
```json
{ "categories": [ /* categoryResponse[] */ ], "total": 12 }
```

También breaking change de forma de respuesta — mismo aviso de coordinación de despliegue.

## 5. Fuera de alcance

- No tocar `POST /users`, `PATCH /users/{id}/deactivate`, login/logout.
- No agregar edición de `username`, `role` ni `password` en este endpoint.
- No agregar búsqueda/filtro (`search=`) — sólo `limit`/`offset` por ahora; se puede pedir después si hace falta.

## 6. Checklist de verificación sugerida

- [ ] Migración aplicada, columnas nuevas con default `''`.
- [ ] `POST /users` sigue funcionando sin los campos nuevos (son opcionales).
- [ ] `PUT /users/{id}` rechaza caller no-admin con `403`.
- [ ] `GET /users?limit=20&offset=0` devuelve `{ users, total }` con exactamente 20 ítems cuando hay más de 20.
- [ ] `GET /categories?limit=20&offset=0` devuelve `{ categories, total }`.
- [ ] Ningún endpoint expone `password_hash`.
