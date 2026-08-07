## Why

Mini Moni ya cubre las operaciones del kiosco, pero sus vistas evolucionaron por
módulo y no expresan un sistema visual único. Esto hace que una persona que
alterna entre caja, stock y administración tenga que reubicar acciones y datos
en cada pantalla. La referencia ERP/POS elegida muestra una dirección más
calma y ordenada que puede mejorar la lectura sin sacrificar la velocidad de
una operación de caja.

## What Changes

- Definir un lenguaje visual ERP/POS común: shell lateral persistente en
  escritorio, encabezado contextual, superficies luminosas, jerarquía de datos
  y acentos de color restringidos a agrupación y estado.
- Extender el UI kit y sus tokens para que cards, tablas, filtros, formularios,
  estados y métricas adopten esa dirección sin estilos ad-hoc por pantalla.
- Reordenar visualmente las superficies existentes de caja, catálogo, stock,
  ventas, reportes, recepción y usuarios, preservando rutas, permisos,
  endpoints y reglas de negocio.
- Mantener una variante móvil centrada en una tarea por vista y conservar el
  flujo scan-first del POS como la excepción operacional al layout
  administrativo.
- Mostrar un indicador de carga de navegación durante el cambio entre rutas,
  preservando el espacio del shell para evitar reajustes perceptibles y dar
  feedback inmediato sin bloquear la interacción más de lo necesario.
- Documentar mockups de referencia y criterios de teclado, foco, estados y
  accesibilidad para revisión antes de implementar.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `ui-foundation`: el shell, tokens y primitives pasan a expresar el sistema
  visual ERP/POS común.
- `ui-pos`: la composición visual de caja prioriza escaneo, carrito, total y
  cobro dentro de la nueva dirección sin alterar el flujo de venta.
- `ui-catalog`: catálogo y categorías adoptan jerarquía de workspace, filtros
  y tablas consistentes.
- `ui-inventory`: stock y movimientos adoptan lectura operacional más clara.
- `ui-sales`: historial, detalle y devoluciones adoptan la jerarquía común.
- `ui-reports`, `ui-reports-dashboard`, `ui-reports-detail`: dashboard y
  reportes priorizan período, métricas y datos comparables.
- `ui-receiving`: listas, detalle y diálogos de recepción adoptan el sistema
  compartido sin alterar el flujo pendiente/recibido.
- `ui-users`: administración de usuarios adopta el mismo patrón de listado,
  detalle y formularios.

## Impact

- Afecta `src/app/globals.css`, el shell y el UI kit, más las views existentes
  bajo `src/components/`. No modifica `lib/api.ts`, tipos de transporte,
  rutas, `requireRole()`, `NAV_ITEMS` ni el backend.
- No agrega dependencias ni introduce dark mode, nuevas entidades, analytics,
  cambios de permisos o reglas de negocio.
- Se coordina con los changes abiertos `add-frontend-suppliers-purchasing` y
  `add-frontend-cashier-shift-closing`: sus superficies nuevas deberán
  componer los primitives resultantes, pero no se modifica su alcance ni sus
  artefactos.
