# Proposal: add-frontend-users

## Why

Hoy la única forma de dar de alta un cajero o revocarle el acceso es escribir SQL contra la base. El backend cierra ese hueco en `add-identity-v15` exponiendo `POST /api/v1/users`, `GET /api/v1/users` y `PATCH /api/v1/users/{id}/deactivate`, todos restringidos a rol `admin`. Falta la pantalla.

Es además el cimiento de otras dos partes de V1.5: el reporte por cajero necesita nombres de usuario, y el listado operativo de ventas filtra por `cashier_id`. Sin gestión de usuarios, ambos muestran identificadores opacos.

## What Changes

- Nueva pantalla `/users` (Admin exclusivamente): listado de usuarios con username, rol, estado y fecha de alta.
- Alta de usuario con username, contraseña y rol. El rol es una elección de tres valores excluyentes, no texto libre.
- Desactivación de usuario, con confirmación explícita por ser una acción destructiva de acceso.
- La navegación suma la sección para Admin.

## Capabilities

### New Capabilities

- `ui-users`: listado, alta y desactivación de usuarios, exclusivo de Admin.

### Modified Capabilities

- `ui-foundation`: `Role-gated navigation shell` incorpora la sección de usuarios para Admin y confirma que ningún otro rol la ve ni puede alcanzarla por URL.

## Impact

- Nuevos: `src/app/(app)/users/page.tsx`, `src/app/(app)/users/new/page.tsx`, `src/components/users/UsersView.tsx`, `src/components/users/UserForm.tsx`.
- Modificados: `src/lib/nav.ts`, `src/lib/roles.ts`, `src/lib/types.ts`.
- **Depende de `add-identity-v15` (backend).** Sin esos endpoints la pantalla no tiene datos; no se mockea.
- Habilita el reporte por cajero (`add-frontend-reports-v15`) y el filtro por cajero del listado de ventas (`add-frontend-sales-v15`).

## Notas para el backend

`add-identity-v15/design.md` deja abiertas dos preguntas que impactan directo en esta pantalla:

- **No existe reactivación de usuario.** Un usuario desactivado por error sólo vuelve por SQL. La UI debe dejarlo explícito antes de confirmar, porque desde la pantalla la acción se ve reversible y no lo es.
- **Nada impide que un Admin se desactive a sí mismo** ni que desactive al último Admin activo. El frontend puede advertir el primer caso (conoce al usuario de la sesión) pero **no** el segundo sin contar Admins activos, lo que sería una regla de negocio inventada. Queda como advertencia parcial y pregunta abierta hacia el backend.
