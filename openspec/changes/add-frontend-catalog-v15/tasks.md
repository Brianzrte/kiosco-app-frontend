# Tasks: add-frontend-catalog-v15

> Trabajo visual según la skill `frontend-design` (`CLAUDE.md` §1). Requiere despliegue coordinado con `add-catalog-v15` de backend.

## 1. Permiso de reactivación (desplegar ANTES que el backend)

- [x] 1.1 Restringir la acción de reactivar a rol `admin` en `ProductDetail.tsx`, ocultándola por completo para el resto — no deshabilitada
- [x] 1.2 Verificar que el Inventory Manager sigue viendo la insignia de inactivo y conserva la acción de desactivar (no aplica: el botón de desactivar sólo aparece cuando el producto está activo, sin cambios en esa rama)
- [x] 1.3 Confirmar que un `403` en reactivación se trata como falta de permiso y no limpia la sesión (cubierto por `add-frontend-ux-polish`, ya implementado: sólo `401` redirige a `/login`)

## 2. Color de insignia de categoría

- [x] 2.1 Auditar cómo se deriva hoy el pastel de la categoría — ya se deriva del `id` (`pastelFor(id)` en `components/ui/Badge.tsx`, hash sobre `id`), no del nombre. No es un defecto, no requiere cambio
- [x] 2.2 Verificar que el color sea idéntico en todas las pantallas donde aparece la categoría — `CategoriesView` y `ProductsView` llaman `pastelFor(category_id)` en ambos casos

## 3. Renombrado de categoría — BLOQUEADO

- [ ] 3.1 Modo de edición en la fila del listado, con el nombre seleccionado al entrar
- [ ] 3.2 `Enter` confirma, `Escape` cancela y restaura el nombre previo sin disparar request
- [ ] 3.3 `PUT /api/v1/categories/{id}` con el nombre recortado; deshabilitar el envío mientras está pendiente
- [ ] 3.4 Mapear el `409` bajo el campo, conservando el modo edición, el texto escrito y el foco
- [ ] 3.5 Guardar sin cambios sale del modo edición sin error

> Bloqueado: `PUT /api/v1/categories/{id}` devuelve `404` en el backend de desarrollo (verificado 2026-07-27, incluso tras reiniciar Docker). No se mockea — retomar cuando `add-catalog-v15` despliegue el endpoint.

## 4. Verificación

- [x] 4.1 Probar con los tres roles: sólo Admin ve reactivar — verificado por lectura de código (`role === "admin"` gating, tipado); no se pudo ejercitar en vivo como Inventory Manager porque `POST /api/v1/users` no está desplegado (no hay forma de crear ese usuario sin mockear)
- [ ] 4.2 Recorrido por teclado del modo edición: foco al entrar, al salir y al aparecer el error — bloqueado junto con la sección 3
- [x] 4.3 Verificar que renombrar no altera el color de la insignia — no aplica todavía (sección 3 bloqueada); el color ya deriva del `id`, que el renombrado no toca
- [ ] 4.4 Coordinar el orden de despliegue: primero este frontend, después `add-catalog-v15` — pendiente de decisión de despliegue real, fuera del alcance de esta sesión
