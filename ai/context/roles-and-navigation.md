# Roles y navegación

Documentado desde el código vigente. Este documento **no corrige** las
divergencias que lista: sólo las hace visibles.

## `Role`

`src/lib/types.ts`:

```ts
export type Role = "admin" | "cashier" | "inventory";
```

Un rol **escalar** por sesión. La sesión (`lib/session.ts`) lo guarda en la
cookie httpOnly `kiosco_role`, escrita a partir del `role` que devuelve
`POST /auth/login`.

## `requireRole`

`src/lib/roles.ts`:

```ts
export async function requireRole(roles: Role[]): Promise<Session>
```

Guard **de servidor**, llamado como primera línea de cada `page.tsx`:

- sin sesión → `redirect("/login")`;
- rol no incluido → `redirect(homeFor(session.role))`;
- si pasa, devuelve la `Session` (`token`, `role`, `username?`), que la página
  usa para pasar `role` o `username` por props.

El guard de **sesión** (no de rol) está además en `(app)/layout.tsx`.

## `NAV_ITEMS` y `homeFor`

`src/lib/nav.ts` es la lista única de secciones:

| `href` | Etiqueta | Roles |
|---|---|---|
| `/` | Ventas | `cashier`, `admin` |
| `/sales` | Historial | `admin`, `cashier` |
| `/products` | Productos | `inventory`, `admin` |
| `/inventory` | Inventario | `inventory`, `admin` |
| `/categories` | Categorías | `admin` |
| `/users` | Usuarios | `admin` |
| `/reports` | Reportes | `admin` |

`homeFor(role)` → `/products` para `inventory`, `/` para el resto. Es el
destino de un redirect por rol y del post-login.

`Nav.tsx` filtra `NAV_ITEMS` por el rol recibido por prop y tiene su propio
`roleLabels: Record<Role, string>` (`admin` → "Administración", `cashier` →
"Caja", `inventory` → "Inventario").

**Agregar una ruta ⇒ agregar su entrada en `NAV_ITEMS`.** Agregar un rol ⇒
además tocar el tipo `Role` y `roleLabels`, que es exhaustivo por tipo.

## Páginas por rol (estado real del código)

| Ruta | `requireRole` |
|---|---|
| `/` (POS) | `cashier`, `admin` |
| `/sales`, `/sales/[id]` | `admin`, `cashier` |
| `/products`, `/products/new`, `/products/[id]` | `inventory`, `admin` |
| `/inventory` | `inventory`, `admin` |
| `/categories` | `admin` |
| `/users`, `/users/new`, `/users/[id]` | `admin` |
| `/reports` y las cuatro subrutas | `admin` |

Las rutas de subnivel repiten el guard de su sección; ninguna hereda protección
de una ruta padre.

## El gating es UX

`requireRole()` y `NAV_ITEMS` mejoran la experiencia: evitan mostrar una
sección inalcanzable y evitan un `403` predecible. **La autoridad es el
backend**, que valida el rol en cada request (`middleware.RequireRole` en
`../backend/internal/bootstrap/router.go`) y además fuerza scopes que la UI no
puede replicar:

- `GET /sales` fuerza el `cashier_id` del cajero server-side, ignorando el que
  venga en la query.
- Las devoluciones de un `cashier` se limitan a ventas propias confirmadas el
  mismo día calendario; Admin no tiene esa restricción.
- Todo `/reports/*` es admin-only.

La UI **nunca** decide una regla de negocio que el backend posee, y nunca
oculta algo como sustituto de una restricción del servidor.

## Divergencias vigentes (no resueltas acá)

1. **El frontend vigente tiene tres roles escalares.**
   `src/lib/types.ts`, `session.ts`, `roles.ts` y `nav.ts` siguen usando
   `admin · cashier · inventory`. Eso coincide con los specs frontend vigentes,
   pero no con el trabajo futuro descrito abajo.

2. **El working tree del backend tiene cuatro roles y roles múltiples.**
   `../backend/internal/identity/domain/role.go` y el router contienen
   `receiving`, `roles[]` y `PUT /users/{id}/roles` dentro del change abierto
   `add-multi-role-and-receiving`. Sus tasks siguen sin marcar y los specs
   vigentes del backend todavía describen tres roles escalares. Por lo tanto es
   evidencia de implementación en curso, no de contrato desplegado.

3. **El change frontend relacionado todavía no está implementado.**
   `openspec/changes/add-frontend-user-roles-and-receiving` propone pasar a
   conjunto, sumar `receiving` y usar intersección. Ninguna task está marcada.
   No actualizar `Role`, cookies o navegación por anticipación ni tratarlos
   como comportamiento actual.

4. **`openspec/specs/ui-foundation/spec.md`** ("Role-gated navigation shell")
   enumera Cajero / Inventario / Admin. Coincide con `nav.ts`, pero no cubre
   `receiving`: el delta abierto debe sincronizarse cuando el change se
   implemente y archive.

5. **Rutas gateadas a `admin` en el frontend que el backend abre más.**
   `/reports/purchases` pide `admin` en `page.tsx`, pero `GET /suppliers` y
   `GET /purchase-orders` los permite el backend a `admin`, `inventory` y
   `receiving`. Es más restrictivo, no menos, así que no es un agujero — pero es
   una diferencia deliberada que conviene conocer antes de "arreglarla".

6. **`ui-cash-closing` conserva una frase admin-only desactualizada.**
   El spec vigente dice que el resto de `/sales` es Admin-only, mientras el
   código y el change `add-frontend-sales-v15` permiten `admin` y `cashier` con
   scope server-side. Es una contradicción normativa pendiente de
   sincronización; no se corrige desde documentación descriptiva.
