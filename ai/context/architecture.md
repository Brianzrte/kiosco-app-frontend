# Arquitectura del frontend

Describe la arquitectura **vigente**. Autoridad: el código en `src/`.

## Stack

| Pieza | Versión / config | Dónde se ve |
|---|---|---|
| Next.js App Router | `next@16.2.12` | `src/app/` |
| React | `react@19.2.4` | — |
| TypeScript | `strict: true`, alias `@/*` → `./src/*` | `tsconfig.json` |
| Tailwind CSS | v4, tokens en `@theme` | `src/app/globals.css`, `postcss.config.mjs` |
| Vitest | `environment: node`, `include: src/**/*.test.ts` | `vitest.config.ts` |
| ESLint | `eslint-config-next` (core-web-vitals + typescript) | `eslint.config.mjs` |

**Dependencias de runtime: `next`, `react`, `react-dom`. Nada más.** Todo lo
demás es `devDependencies`. No hay query library, ni state library, ni UI
library, ni chart library, ni date library, ni librería de formularios. Los
gráficos son SVG escrito a mano en `src/components/reports/charts/`.

Agregar una dependencia de runtime es **una decisión que se levanta al usuario
y se registra en el `design.md` de un change**, no algo que se resuelve al paso.

## Mapa de `src/`

```
src/
  app/
    layout.tsx               root: fuentes, <html lang="es">, globals.css
    globals.css              @theme (tokens) + keyframes + utilidades .data/.num
    login/                   ruta pública: page.tsx + LoginForm.tsx
    (app)/                   grupo de rutas autenticadas
      layout.tsx             getSession() → redirect /login; Nav + ToastProvider + SectionTransition
      page.tsx               POS (/)
      products/ inventory/ categories/ users/ sales/ reports/
    api/
      session/route.ts       POST login → cookies httpOnly · DELETE logout
      backend/[...path]/     proxy autenticado al backend Go
  components/
    ui/                      UI kit (ver ui-system.md)
    shell/                   Nav, SectionTransition
    <feature>/               PosView, ProductsView, InventoryView, SalesView,
                             CategoriesView, UsersView, reports/*, returns/*
  lib/                       api, session, roles, nav, types, money, useLoad,
                             reports, inventory, returns, salesSummary,
                             pagination, motion (+ *.test.ts colocados)
```

## Grupo de rutas autenticadas

Todo lo que requiere sesión vive bajo `src/app/(app)/`. Su `layout.tsx` hace
una única cosa antes de renderizar: `getSession()` y `redirect("/login")` si no
hay sesión. Envuelve el árbol en `ToastProvider`, dibuja `Nav` con el rol de la
sesión y pasa los hijos por `SectionTransition`.

`/login` queda fuera del grupo, por eso no pasa por ese guard.

El guard del layout es de sesión; el guard de **rol** se hace por página con
`requireRole()` (ver `roles-and-navigation.md`).

## Proxy del backend y cookies httpOnly

El frontend **nunca llama al backend directo desde el navegador**.

```
componente cliente
  → api<T>("/products")                    src/lib/api.ts
  → fetch("/api/backend/products")
  → src/app/api/backend/[...path]/route.ts adjunta Authorization: Bearer <cookie>
  → ${BACKEND_URL}/api/v1/products         backend Go
```

- El token vive en la cookie httpOnly `kiosco_token`, junto a `kiosco_role` y
  `kiosco_username` (`src/lib/session.ts`). **Nunca llega a JS del navegador**,
  y no está en `localStorage`. Decisión cerrada.
- Las cookies las escribe `POST /api/session`, que es lo único que habla con
  `POST /api/v1/auth/login`. `DELETE /api/session` cierra sesión y las borra.
- `BACKEND_URL` = `process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"`.
- El proxy reenvía método, query string y body tal cual, y devuelve el status y
  el cuerpo del backend sin reinterpretarlos; sólo traduce el fallo de conexión
  a un `502` con `{ message }` en español.

Detalles de errores, timeouts y forma de respuesta: `api-contract.md`.

## Arquitectura de tres capas

Es la regla estructural del repo y no tiene excepciones hoy.

1. **`app/**/page.tsx` — server component, fino.** Llama a `requireRole([...])`,
   resuelve `params` si los hay, y renderiza **un** componente de feature. Nada
   más. Puede pasarle datos de sesión ya resueltos (`role`, `username`) como
   props para no volver a pedirlos desde el cliente.

   Excepción observada y acotada: `products/new/page.tsx` y `users/new/page.tsx`
   agregan un título y un link de vuelta alrededor del formulario. Es layout
   estático, no lógica.

2. **`components/<feature>/XView.tsx` — client component, la pantalla.**
   Lleva `"use client"`. Es dueño del fetching, del estado local y del layout.
   Compone el UI kit.

3. **`lib/*.ts` — funciones puras.** Todo lo computable sin React vive acá, con
   su test colocado. **La matemática de negocio nunca vive en una view**:
   dinero, series de fechas, agregaciones de display, reglas de devolución,
   armado de query strings, paginación.

Regla práctica para ubicar código nuevo: si se puede probar sin renderizar,
va a `lib/`.

## Estado

- **No hay librería de estado global.** El estado de servidor vive en el
  backend; el estado de UI vive en `useState` dentro de la view que lo usa.
- **No hay caché de datos ni invalidación.** `useLoad()` (`src/lib/useLoad.ts`)
  hace una petición y expone `{ data, error, reload }`. Después de una mutación
  exitosa se llama `reload()`.
- Lo único que atraviesa el árbol es el `ToastProvider` (contexto de React en
  `components/ui/Toast.tsx`) y el rol de sesión, que baja por props desde el
  server component.

## Qué NO hay (y es deliberado)

| Ausencia | Qué se usa en su lugar |
|---|---|
| React Query / SWR | `useLoad()` + `reload()` |
| Redux / Zustand / Context global de datos | `useState` local |
| MUI / shadcn / Radix | `src/components/ui/` |
| Recharts / Chart.js | SVG a mano en `components/reports/charts/` |
| date-fns / dayjs | helpers de `lib/reports.ts` sobre strings `"YYYY-MM-DD"` |
| react-hook-form / zod | formularios controlados + validación del backend |
| jsdom / Testing Library | ver `testing.md` |
| Tema oscuro | light-only, por decisión de producto |
