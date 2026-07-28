# Tasks: add-frontend-sales-returns

> Trabajo visual según la skill `frontend-design` (`CLAUDE.md` §1). Implementación completa: Admin y Cajero.

## 0. Prerrequisitos

- [x] 0.1 Verificado: los tres endpoints de devolución están desplegados (`POST/GET /api/v1/sales/{id}/returns`, `GET /api/v1/returns/{id}` en `../backend/internal/sales/transport/http/routes.go`) — accesibles hoy sólo a Admin
- [x] 0.2 Verificado: `add-frontend-sales-v15` está implementado, incluida su página `/sales/[id]` (sección "3b. Detalle de venta") — es de ahí que cuelga esta acción
- [x] 0.3 Ampliación de backend desplegada y verificada en esta sesión. **Nota:** el código ya estaba escrito en `../backend` pero sin commitear ni reconstruido en el contenedor Docker corriendo; `GET /sales`, `POST/GET /sales/{id}/returns` devolvían `403` para `cashier` hasta reconstruir. Al reconstruir (`docker compose up -d --build`), el contenedor entró en crash-loop: `internal/sales/domain/businessday.go` carga el timezone `America/Argentina/Buenos_Aires` con `time.LoadLocation`, y la imagen base `alpine:3.19` no trae `tzdata` — panic en el `init()` del paquete, backend completamente caído (no sólo la parte de Cajero). Se corrigió agregando `RUN apk add --no-cache tzdata` a la etapa final de `../backend/Dockerfile` y se reconstruyó; confirmado con el backend arriba y los endpoints respondiendo. Este fix de Dockerfile queda sin commitear, igual que el resto del trabajo de backend de esta sesión — es responsabilidad de la sesión de backend confirmarlo y commitearlo.

## 1. Acceso y tipos

- [x] 1.1 Tipos `Return` y `ReturnItem` en `lib/types.ts`
- [x] 1.2 Acción de devolución ("Registrar devolución") agregada a `src/app/(app)/sales/[id]/page.tsx` / `SaleDetail.tsx`, visible sólo si la venta está confirmada. Para Admin: siempre visible. Para Cajero: visible siempre que la venta cargó (si no es propia, `GET /sales/{id}` ya la rechaza antes de que haya nada que renderizar) — la fecha no se filtra en el cliente, se deja que el backend rechace al confirmar
- [x] 1.3 Inventory Manager no llega a la página: el guard de ruta (`requireRole(["admin", "cashier"])`) lo excluye antes de que exista ningún dato que ocultar. Verificado por lectura de código; no hay una tercera sesión de rol inventory en este entorno para probarlo interactivamente

## 2. Formulario de devolución

- [x] 2.1 Listar todos los ítems de la venta con vendido / ya devuelto / disponible — probado en navegador (Admin y Cajero)
- [x] 2.2 Mostrar los ítems agotados marcados como ya devueltos, no ocultarlos — probado (badge "Ya devuelto", controles deshabilitados)
- [x] 2.3 Acotar el control de cantidad al disponible que informa el backend, sin derivar la regla en el cliente — probado, y cubierto por `src/lib/returns.test.ts`
- [x] 2.4 Ante rechazo por concurrencia, mostrar el mensaje del backend y recargar disponibilidades — probado con el caso real de rechazo por ventana de día (Cajero, sección 7): mensaje del backend mostrado tal cual, formulario vuelve a la selección con las disponibilidades recargadas
- [x] 2.5 Campo de motivo obligatorio, validado tras recortar espacios, con la línea que explica que queda en la traza permanente — probado

## 3. Redacción del alcance monetario

- [x] 3.1 Rotular el monto como valor de la mercadería devuelta — **nunca** "a reintegrar" ni "devuelto" — probado ("Valor de la mercadería devuelta")
- [x] 3.2 Texto en la confirmación: el sistema registra y reintegra stock; la entrega del dinero es del mostrador — probado
- [ ] 3.3 **No hecho.** Validar la redacción con quien opera el kiosco requiere una persona real operando, fuera del alcance de esta sesión de implementación

## 4. Irreversibilidad

- [x] 4.1 Diálogo que diga que no se puede deshacer desde la aplicación y que la única corrección es un ajuste manual que no borra el registro — probado
- [x] 4.2 Sin control de deshacer en la realimentación de éxito — el toast de éxito no ofrece ninguna acción
- [x] 4.3 Revisado todo el texto de `ReturnForm.tsx`/`ReturnHistory.tsx`: nada sugiere que la devolución se puede editar o cancelar después

## 5. Historial

- [x] 5.1 Sección de devoluciones en `/sales/[id]`, sobre `GET /sales/{id}/returns`
- [x] 5.2 Fecha, usuario, motivo, ítems con cantidades y valor. El usuario actuante se resuelve a username sólo cuando el rol puede pedir `/users` (Admin); para Cajero, que no tiene acceso a ese endpoint, se muestra un identificador corto (`Usuario xxxxxxxx`) en vez de inventar un nombre
- [x] 5.3 Verificado: la venta original sigue mostrando sus ítems y total sin alterar después de registrar una devolución
- [x] 5.4 Estado vacío para venta sin devoluciones — probado

## 6. Verificación (parte Admin)

- [x] 6.1 Probado en navegador: una devolución parcial (1 de 1 unidad) deja el ítem en "disponibles 0 · ya devuelto". El decremento a través de *varias* devoluciones parciales sobre el mismo ítem está cubierto por `src/lib/returns.test.ts` (`sumReturnedByItem`, `computeAvailability`) pero no se ejecutó una segunda devolución real sobre el mismo ítem en este entorno
- [x] 6.2 Verificado: el movimiento `RETURN` aparece en el historial de Inventory (`Coca-Cola 500ml · Devolución · 45 → 46 (+1)`, motivo y usuario correctos)
- [x] 6.3 Admin siempre llega (probado); Inventory Manager nunca llega a la página (guard de ruta, verificado por lectura de código — sin una sesión de rol inventory real en este entorno)
- [ ] 6.4 **No probado explícitamente.** El recorrido se hizo con clics/fills automatizados, no con navegación por teclado (Tab) real a través de todo el flujo incluido el diálogo de confirmación

## 7. Cajero: historial del día y devolución acotada

- [x] 7.1 `lib/nav.ts`: sección de ventas visible para Cajero — probado, aparece "Historial" en la navegación de `cajero1`
- [x] 7.2 `/sales` para Cajero: filtro de fecha por defecto en "hoy" (probado, campos Desde/Hasta llegan precargados con la fecha del día), listado forzado por el backend a sus propias ventas — verificado con `curl` pasando `cashier_id` de otro usuario en la query: el backend lo ignora y sólo devuelve las ventas de `cajero1`. Sin filtro de cajero visible ni columna "Cajero" en la tabla para ese rol
- [x] 7.3 Acción "Registrar devolución" visible en `/sales/[id]` para Cajero en su propia venta — probado
- [x] 7.4 Ante `403` al intentar la devolución (venta de un día anterior), se muestra el mensaje del backend tal cual (`"forbidden"`) — probado con una venta propia de `cajero1` confirmada el día calendario anterior (Buenos Aires); no se inventó ningún texto explicativo adicional
- [x] 7.5 Verificado con `curl`: a un Cajero nunca le llegan ventas de otro cajero, incluso forzando `cashier_id` de otro usuario en la query — el alcance está aplicado en el backend, el frontend no filtra ni compensa nada
- [x] 7.6 Probado de punta a punta: `cajero1` confirma una venta nueva por POS, la encuentra en `/sales` (con el filtro "hoy" ya aplicado), registra una devolución con motivo — éxito, misma redacción y advertencias que el flujo de Admin, historial actualizado con el usuario, motivo, producto y valor correctos
- [x] 7.7 Probado: `cajero1` intenta una devolución sobre una venta propia confirmada el día calendario anterior → rechazado con el mensaje del backend, sin reintento automático
- [x] 7.8 `CLAUDE.md` §2, §3 y §5 actualizados: el Cajero ahora tiene `GET /sales` (propias) y devoluciones (propias, mismo día) documentados; se corrigió también la lista de "out of scope" de §3, que todavía marcaba devoluciones como no construidas

## Verificación técnica

- `npx tsc --noEmit` — sin errores
- `npx eslint .` — sin errores nuevos (1 warning preexistente en `PosView.tsx`, no relacionado con este change)
- `npx vitest run` — 39 tests, todos pasan (13 nuevos en `src/lib/returns.test.ts`)
- `npm run build` — build de producción exitoso, `/sales` y `/sales/[id]` aparecen como rutas dinámicas
- Probado en navegador contra backend real, ambos roles:
  - **Admin**: devolución parcial sobre una venta confirmada de `cajero1`, historial con fecha/usuario ("admin")/motivo/ítems/valor, venta original sin cambios, movimiento `RETURN` visible en Inventory con el delta correcto
  - **Cajero (`cajero1`)**: `/sales` con default "hoy" y sin fuga de ventas de otros cajeros, devolución exitosa sobre venta propia de hoy, rechazo correcto (mensaje del backend) sobre venta propia de un día anterior
  - Sin errores de consola en ninguna de las pantallas tocadas (se corrigió un `403` de consola: `SaleDetail` pedía `/users` — admin-only — incluso para Cajero; ahora ese fetch se omite por completo para roles no admin, igual que ya hacía `SalesView`)
