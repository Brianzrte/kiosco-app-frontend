# Tasks: add-frontend-ux-polish

> Todo el trabajo visual sigue el proceso de la skill `frontend-design` (planificar tokens → criticar → construir), según `CLAUDE.md` §1.

## 1. Vocabulario de error

- [x] 1.1 Extender `lib/api.ts` para clasificar fallos sin cuerpo parseable en un tipo discriminado (`network` | `timeout` | `server` | `unauthorized` | `forbidden`), preservando el `message` del backend cuando exista
- [x] 1.2 Verificar el orden de precedencia: si hay `{ message }`, gana siempre sobre la clasificación de transporte
- [x] 1.3 Dejar de tratar `403` como `401`: no limpiar sesión ni redirigir a `/login`
- [x] 1.4 Mapear cada caso al texto y la acción de recuperación de la tabla de `design.md`
- [x] 1.5 Extender `ErrorState` para recibir la acción de recuperación y garantizar que sea alcanzable por teclado
- [x] 1.6 Auditar las pantallas existentes: ninguna debe poder mostrar texto de excepción crudo

## 2. Realimentación de carga

- [x] 2.1 Agregar el token `MOTION.spinnerDelay` (400 ms) en un único lugar
- [x] 2.2 Construir el spinner del UI kit sobre los tokens del design system
- [x] 2.3 Integrar el estado de carga diferido en `Button` (spinner interno, control deshabilitado, resto de la página usable)
- [x] 2.4 Exceptuar la confirmación de venta: estado inmediato, sin umbral
- [x] 2.5 Revisar que ningún flujo use overlay bloqueante de página completa
- [x] 2.6 Verificar que ninguna falla dispare reintento automático

## 3. Sistema de movimiento

- [x] 3.1 Agregar los tokens de movimiento (3 duraciones + 2 curvas) al tema de Tailwind
- [x] 3.2 Implementar la transición de entrada de sección en `app/(app)/layout.tsx` (opacidad + 4px, sin animación de salida)
- [x] 3.3 Implementar la estrategia de `prefers-reduced-motion`: quitar traslación y escala, conservar la señal como cambio de color
- [x] 3.4 Verificar que sólo se animen `opacity` y `transform` (excepto el resalte del carrito y el total, que por diseño son cambios de color puro — ver `design.md`)

## 4. Realimentación del carrito (ui-pos)

- [x] 4.1 Resaltar in situ la línea agregada o incrementada, sin desplazar filas vecinas
- [x] 4.2 Acusar el cambio del total sin conteo numérico progresivo
- [x] 4.3 Verificar que el resalte no retrase el foco ni la aceptación del siguiente escaneo
- [x] 4.4 Probar escaneo rápido en sucesión: la lista debe seguir legible
- [x] 4.5 Verificar que la cantidad cambie de valor con independencia del color

## 5. Corrección de spec

- [x] 5.1 Corregir el hex obsoleto `#2563EB` → `#9C566C` en `ui-foundation` (residuo previo al rebranding Mini Moni)

## 6. Verificación

- [x] 6.1 Probar con la red cortada a propósito: cubierto por tests unitarios de `lib/api.ts` (clasificación de errores de transporte) — no se ejercitó con hardware de kiosco real
- [x] 6.2 Probar con `prefers-reduced-motion: reduce` activo en todo el recorrido: verificado por revisión de código (animaciones de traslación/escala sustituidas por fade-only); no ejercitado en navegador real
- [x] 6.3 Verificar foco visible de teclado en todos los controles de recuperación nuevos: son `<button>` nativos del kit, heredan `:focus-visible`
- [ ] 6.4 Medir el rendimiento de la animación del carrito en hardware equivalente al del kiosco — no disponible en este entorno; queda pendiente de verificación en el hardware real
