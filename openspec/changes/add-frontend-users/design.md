# Design: add-frontend-users

## Context

El backend (`add-identity-v15`) expone tres operaciones, todas `admin`:

| Método | Ruta | Respuesta |
|---|---|---|
| `GET` | `/api/v1/users` | `{ users: [{ id, username, role, active, created_at }] }` — sin paginar |
| `POST` | `/api/v1/users` | `201` con el usuario creado; `409` si el username existe |
| `PATCH` | `/api/v1/users/{id}/deactivate` | `204`, idempotente; `404` si no existe |

El hash de contraseña nunca viaja. No hay endpoint de reactivación, ni de cambio de contraseña, ni de edición de usuario: **el único cambio posible sobre un usuario existente es desactivarlo.**

## Goals / Non-Goals

**Goals:**
- Dar de alta y revocar acceso sin tocar la base.
- Que la irreversibilidad de la desactivación sea evidente **antes** de confirmarla, no después.

**Non-Goals:**
- Edición de usuario, cambio de rol, cambio o reset de contraseña, reactivación: no existen endpoints y no se simulan.
- Paginación, búsqueda o filtros: el backend devuelve todo y son decenas de usuarios. Agregar controles sobre un conjunto que entra en pantalla es ruido.
- Mostrar u ocultar la propia sesión del listado.
- Cualquier indicador de "última conexión" o actividad: no existe el dato.

## Decisions

**La desactivación se confirma en un diálogo que nombra la consecuencia real.**
El patrón habitual ("¿Estás seguro?") no informa nada. Acá la consecuencia concreta es que **no hay vuelta atrás por la interfaz**, y el usuario que la ejecuta no tiene forma de saberlo mirando la pantalla. El diálogo nombra al usuario afectado y dice explícitamente que la acción no se puede deshacer desde la aplicación.

Se rechaza el patrón de "deshacer" por toast: sugeriría una reversión que el backend no ofrece.

**Advertencia extra al desactivarse a uno mismo.**
El frontend conoce el usuario de la sesión, así que puede detectar este caso sin inventar reglas: el diálogo advierte que perderá el acceso inmediatamente. No se **bloquea** la acción — el backend la permite y el spec no la prohíbe; bloquearla sería el frontend imponiendo una regla de negocio, que `CLAUDE.md` §1 prohíbe.

Lo que **no** se hace es advertir sobre "el último Admin": requeriría contar Admins activos y decidir que eso es peligroso, que es exactamente una regla inventada. Queda anotado como pregunta al backend.

**El rol se elige entre tres opciones visibles, no se escribe.**
`cashier`, `inventory`, `admin` como opciones excluyentes con etiqueta en español y una línea que explica qué puede hacer cada uno. El rol determina todo lo que la persona podrá hacer y quien da de alta no necesariamente recuerda la matriz de permisos; ponerla al lado de la decisión evita el alta mal rolada, que sólo se corrige borrando y recreando (no hay edición).

**La contraseña se escribe una sola vez, con opción de verla.**
No hay campo de confirmación. La doble escritura existe para evitar el error de tipeo cuando el usuario elige su propia contraseña y nadie más la conoce — pero acá un Admin le está fijando la contraseña a otra persona y se la va a comunicar. El control que sirve es **poder ver lo que se escribió**; repetirlo a ciegas no agrega nada. Si queda mal, la persona no puede entrar y el Admin lo sabe enseguida.

Consecuencia asumida y anotada: sin endpoint de cambio de contraseña, una contraseña mal comunicada obliga a desactivar la cuenta y crear otra con distinto username.

**El estado es una insignia, no una columna de "sí/no".**
Activo e inactivo se distinguen por insignia con texto, nunca por color solo. Las filas inactivas además bajan la jerarquía del texto a `--text-secondary`: siguen legibles pero no compiten con las activas, que son las que importan en el uso diario.

**El `409` se muestra en el campo, no como error de formulario.**
Username duplicado es el único error esperable del alta, y su causa es un campo puntual. El mensaje del backend se muestra bajo el campo de username con el foco puesto ahí, con los demás valores preservados. Un error a nivel formulario obligaría a buscar cuál de los tres campos falló.

## Risks / Trade-offs

- **No hay reactivación: una desactivación por error es permanente desde la UI** → Mitigado con el diálogo que lo dice explícitamente. Es una limitación del backend, no del frontend, y está anotada como pregunta abierta.
- **Un Admin puede dejar al sistema sin acceso administrativo** → El frontend advierte el caso propio, no el del último Admin. Riesgo residual real, aceptado y elevado al backend.
- **La contraseña queda en memoria del formulario hasta el envío** → Inevitable en un formulario controlado. Se limpia al desmontar y el campo nace enmascarado.
- **El listado sin paginar degrada si la tabla crece** → El backend lo aceptó explícitamente a escala kiosco. Si algún día lista cientos, hace falta paginación de ambos lados.

## Migration Plan

No hay migración: pantalla nueva sobre endpoints nuevos. No se despliega antes que `add-identity-v15` — sin él la pantalla sólo puede mostrar un error.

## Open Questions

- **¿Debe existir reactivación de usuario?** Es el espejo de `Reactivate Product` en Catalog. Sin ella, todo error de desactivación es permanente.
- **¿Debe protegerse el último Admin activo?** Si la respuesta es sí, la regla va en el backend; el frontend sólo reflejaría el error.
- **¿Cambio de contraseña?** Sin él, una contraseña comprometida obliga a descartar el username, que es único y no se puede renombrar.
