## Context

Chrome DevTools MCP validó el POS autenticado con datos reales a 1366×768. El campo de escaneo mide 64px de alto; las filas unitarias del carrito miden 68px; en 320×568 llegan a 166px por el `flex-wrap`; y en 844×390 llegan a 108px. En 1280×720 y 1366×768 el documento también presenta overflow horizontal causado por el header, no por el POS. El total y el panel de pagos se ven correctamente proporcionados y quedan fuera de la reducción de densidad.

## Goals / Non-Goals

**Goals:**

- Recuperar altura útil para el carrito y mantener visible la acción de cobro.
- Conservar targets táctiles, legibilidad, foco scan-first y operación por teclado.
- Evitar que las filas unitarias se envuelvan en desktop o se vuelvan innecesariamente altas en móvil.
- Eliminar el scroll horizontal del documento entre 768px y 1366px.

**Non-Goals:**

- No cambiar matemática de precios, stock, pagos, confirmación ni contratos de API.
- No reducir el total, métodos de pago ni `Confirmar venta`.
- No rediseñar el shell completo ni cambiar qué rutas aparecen por rol.
- No agregar dependencias, breakpoints globales nuevos ni una barra de navegación alternativa.

## User flow

El cajero sigue entrando por el campo de escaneo, puede buscar manualmente, revisa el carrito y cobra desde el panel existente. La única diferencia visible es que la entrada ocupa menos altura y las líneas del carrito se leen como una tabla operacional estable. En móvil las líneas pueden usar más de una línea cuando el ancho lo exige, pero no deben generar overflow horizontal ni ocultar cantidad, subtotal o quitar.

## UI states

- Entrada vacía, con foco, con código y con error conservan sus mensajes y foco actuales.
- Resultados de búsqueda, carga, vacío y error conservan su comportamiento actual.
- Carrito vacío y carrito con líneas conservan sus estados actuales.
- Hover, focus-visible, disabled, flash de línea y total-flash no se eliminan ni dependen de la nueva densidad.

## Decisions

### 1. Compactar el escaneo, no convertirlo en un control pequeño

El campo conserva un alto operativo de aproximadamente 48px, fuente mínima de 16px, foco visible y un icono legible. Se reduce el padding y el peso visual del borde; no se usa una variante de 32–36px porque el POS requiere lector, teclado y eventual uso táctil.

Alternativa descartada: mantener 64px y reducir la tipografía. Eso conserva el desperdicio vertical y empeora la legibilidad.

### 2. Compartir fila para escaneo y búsqueda sólo cuando el contenido entra

Desde `lg`, la entrada principal y la búsqueda manual se muestran en dos columnas con el escaneo dominante. En base y tablet angosta permanecen apilados. El campo de escaneo mantiene prioridad visual y el foco no cambia por la composición.

Alternativa descartada: poner siempre ambos controles en una fila. A 320–1024px produciría campos demasiado estrechos y afectaría la búsqueda manual.

### 3. Usar grid estable para las filas del carrito

En desktop cada fila reserva columnas para producto, cantidad, subtotal y quitar. El nombre puede encogerse con `min-w-0`; el subtotal queda alineado; la acción de quitar no se pega a los steppers. En móvil se permite una composición de dos niveles, pero cada control frecuente conserva un área mínima de 44×44px.

Alternativa descartada: bajar los botones +/- por debajo de 44px. La auditoría busca densidad, no targets difíciles de acertar.

### 4. Corregir el header sin ocultar accesos autorizados

El header debe repartir el espacio disponible de forma que no exceda el viewport. Se prioriza ajustar gaps y padding y permitir una presentación compacta de labels en los anchos donde sea necesario, manteniendo nombres accesibles y todos los enlaces/controles directamente activables. No se agrega un menú “Más” para escritorio porque el contrato vigente exige accesos directos.

### 5. Validar con evidencia de layout, no sólo por inspección visual

La implementación se verifica con Chrome DevTools MCP en 320×568, 844×390, 768×1024, 1024×768, 1280×720 y 1366×768. Se mide que `document.documentElement.scrollWidth === innerWidth`, que el escáner tenga entre 44 y 52px de alto y que las filas no envuelvan en desktop.

## Accessibility

Se preservan labels asociados, nombres accesibles de controles sólo-icono, foco visible, navegación por teclado y estados no dependientes exclusivamente del color. La reducción no puede usar fuente de entrada menor a 16px ni targets menores a 44×44px.

## Keyboard and focus behavior

No se cambia el orden lógico: escáner, búsqueda, carrito, pagos y confirmación. Después de escanear, agregar, fallar o cerrar un estado auxiliar, el foco vuelve al escáner según el comportamiento vigente. Los resultados de búsqueda siguen siendo navegables con teclado.

## Responsive behavior

- `base`/móvil: entrada apilada, carrito sin overflow horizontal, barra inferior existente intacta.
- `lg` y superiores: escaneo y búsqueda pueden compartir fila; filas unitarias del carrito no deben envolverse.
- 768px en adelante: header sin overflow horizontal.
- 1366×768: el panel de total/pago mantiene su tamaño y posición; el espacio recuperado se usa para el carrito.
- 320×568 y 844×390: la venta sigue siendo operable con scroll vertical deliberado y sin scroll horizontal.

## API contract

Ningún cambio. Se conservan `api<T>()`, las rutas actuales de productos y ventas, y todos los payloads existentes.

## Error handling

Ningún cambio. Se preservan errores inline de escaneo, búsqueda, stock, peso y confirmación; el carrito nunca se limpia por un error.

## Backend coordination

No aplica. El cambio es exclusivamente visual y responsive, sin endpoint, rol, contrato o despliegue backend nuevo.

## Risks / Trade-offs

- [El header puede quedar demasiado comprimido] → validar con el set completo de accesos admin y medir overflow en cada viewport.
- [Una fila de carrito puede ser alta para productos pesables] → conservar layout de dos niveles sólo donde los campos adicionales lo exijan.
- [Compactar el escáner puede reducir comodidad táctil] → mantener alto mínimo de 44px y fuente de 16px.
- [Un fix desktop puede afectar móvil] → verificar la matriz mobile-first después de cada ajuste.

## Migration Plan

1. Ajustar sólo `PosView` y `Nav` usando tokens y primitives existentes.
2. Ejecutar lint y tests.
3. Validar manualmente layout, foco, teclado y responsive con Chrome DevTools MCP.
4. Dejar la sincronización de specs y el archivado para el closer, con aprobación explícita posterior.

## Rollback

Revertir el commit del change de frontend. No hay migración de datos ni rollback backend.

## Open Questions

Ninguna bloqueante.
