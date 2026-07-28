# Proposal: add-frontend-catalog-v15

## Why

Dos cosas, una de ellas urgente.

**La urgente es un cambio de autorización que rompe la UI actual.** `add-catalog-v15` restringe `POST /api/v1/products/{id}/activate` a rol `admin` exclusivamente. Hoy `ProductDetail.tsx:39-42` muestra el botón "Activar" a cualquiera que llegue a la pantalla, incluido el Inventory Manager — que a partir del despliegue del backend va a recibir `403` al apretarlo. El design del backend pregunta explícitamente si existe ese consumidor: **existe, y es este**. Requiere despliegue coordinado.

**La otra es una función faltante:** renombrar categorías. Hoy el nombre de una categoría es inmutable salvo por SQL. El backend agrega `PUT /api/v1/categories/{id}`, también sólo Admin.

## What Changes

- Ocultar la acción de reactivar producto a todo rol que no sea Admin. Un Inventory Manager sigue viendo el estado del producto y sigue pudiendo desactivarlo; lo que no ve es la acción de devolverlo a la venta.
- Agregar el renombrado de categoría en `/categories` (Admin), con manejo del `409` por nombre duplicado.
- Reflejar en el spec que la asimetría de permisos entre desactivar (Admin + Inventory) y reactivar (sólo Admin) es deliberada, para que no se "corrija" por simetría estética más adelante.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `ui-catalog`: `Product deactivation` se amplía para separar los permisos de desactivar y reactivar. Se agrega `Rename category`.

## Impact

- Modificados: `src/components/products/ProductDetail.tsx`, `src/app/(app)/categories/page.tsx`, `src/lib/roles.ts`.
- **Depende de `add-catalog-v15` (backend)** y exige despliegue coordinado: si el backend sale primero, el Inventory Manager ve un botón que falla; si sale el frontend primero, pierde una acción que todavía funcionaría. Preferible el segundo orden — degrada una capacidad en vez de mostrar un error.
- El renombrado de categoría no rompe nada: es puramente aditivo.
