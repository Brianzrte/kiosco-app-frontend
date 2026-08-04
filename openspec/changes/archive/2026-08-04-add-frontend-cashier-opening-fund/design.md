## Context

Este change se alinea con `../backend/openspec/changes/add-flexible-cash-shifts`,
que prevalece sobre la hipótesis anterior de fondo por cajero/día. Un fondo
confirmado inicia un turno de un operador (`admin` o `cashier`), que puede
cruzar medianoche; las ventas y reportes usan la fecha operativa de apertura.
El backend conserva la venta sin turno cuando no hay fondo confirmado y nunca
bloquea el POS.

El código actual no está alineado: `CashierShiftClosingModal` arma un rango
desde medianoche, pide `/sales/summary` y envía `from`; `Nav` sólo habilita el
cierre para `cashier`. El nuevo backend deriva el intervalo y efectivo
esperado al crear/corregir el cierre, por lo que el cliente no puede ni debe
previsualizar una diferencia usando el resumen diario anterior.

## Goals / Non-Goals

**Goals:**

- Declarar y confirmar fondos de apertura para operadores elegibles.
- Exponer la confirmación como aviso no bloqueante del shell.
- Adaptar el cierre a turno propio, estado provisional/sellado y respuesta
  calculada por backend.
- Mostrar el fondo nullable y la fecha operativa que devuelve el reporte.

**Non-Goals:**

- Bloquear ventas, exigir fondo, takeover de dispositivo, push, polling o
  subturnos simultáneos.
- Crear endpoints, inferir el turno localmente, recalcular efectivo esperado
  o reagrupar ventas transnoche.
- Precargar o consultar un fondo de un operador/fecha para Admin: el backend
  no expone esa lectura.

## User flow

1. Un Admin abre `/reports/cash-closings`, elige un usuario activo que tenga
   `admin` o `cashier`, fecha operativa y monto decimal, y declara el fondo.
   El mismo POST crea o actualiza un fondo `declared`; un `409` conserva los
   valores y comunica que ya fue confirmado.
2. El operador destinatario carga el shell. Sólo se consulta
   `/cashier-opening-funds/current`, sin identidad en URL/body. Si llega un
   fondo `declared`, aparece un banner no modal con monto y “Confirmar conteo”.
3. Al confirmar, el banner desaparece y el backend abre el turno. La venta
   sigue disponible antes, durante o después de este paso.
4. El operador abre “Cerrar caja”, ingresa efectivo contado y confirma. El
   POST lleva `to`, `counted_cash` y notas opcionales. La confirmación previa
   explica que el backend calculará el cierre; al responder, se muestran
   intervalo, esperado, diferencia y estado. Si el último cierre es
   `provisional`, se puede corregir con `PUT`; si es `sealed`, no.
5. El Admin ve en el reporte la fecha operativa devuelta por backend y, cuando
   la fila lo incluye, el fondo como dato independiente del estado de cierre.

## UI states

- Formulario admin: vacío/listo; cargando usuarios; submit pending; éxito con
  toast y recarga del reporte; error inline sin descartar valores.
- Banner: loading silencioso, ausente para `null`/`confirmed`, pendiente para
  `declared`, error silencioso en la consulta y error inline si falla confirmar.
- Cierre: carga del estado propio, sin turno (`422`) con mensaje backend y sin
  bloquear POS, formulario, confirmación pending, éxito con datos derivados y
  error inline recuperable. Un cierre sellado es sólo lectura.
- Reporte: conserva loading, empty y error existentes; el fondo se omite si
  el backend no lo devuelve.

## Decisions

### 1. Operador, no cajero

Copy y selector dicen “operador”. Se conservan `cashier_id` y `cashier_*` sólo
como nombres del contrato/backend actual. Admin puede autodeclararse.

### 2. Banner no modal

Se monta en `Nav` junto al estado de caja, no usa `Dialog` ni toma foco. Tiene
`role="status"` y botón normal en el orden de tabulación.

### 3. Cierre sin matemática local

No se usa `/sales/summary` para esperado o diferencia: no conoce el turno ni
incluye el fondo. Antes de guardar se confirma sólo el efectivo contado; el
resultado usa `CashClosing.expected_cash` y `difference` del POST/PUT.
El cierre muestra además el fondo inicial confirmado que devuelve el estado
del turno, con copy explícito de que ya está incluido en el esperado.

### 4. Estado autoritativo del fondo

No hay endpoint para seleccionar un fondo ajeno. El formulario no intenta
determinar si ya existe ni deshabilita por una confirmación presunta; backend
acepta la edición pendiente o responde `409`.

## Accessibility and responsive behavior

El formulario usa labels, errores inline y `Button pending`. El banner no
depende sólo de color, conserva targets de al menos 44 px, no captura foco y
al desaparecer devuelve foco sólo si su botón lo tenía. En 320 px se apila;
no crea overflow. El reporte conserva cards en móvil y tabla desde `md`; el
estado de fondo tiene texto tanto en card como tabla.

## API contract

Se consume exclusivamente vía `api<T>()` y proxy. Los endpoints, roles,
shapes, límites conocidos y criterio de despliegue están en
`backend-request.md`; no se agregan contratos locales.

## Risks / Trade-offs

- El estado del fondo declarado después de cargar el shell no se actualiza
  automáticamente: es deliberado; refresh/focus/polling es otro change.
- No hay previsualización exacta de diferencia antes del cierre: el backend no
  expone esa agregación y mostrar una calculada por día sería incorrecto.
- Una fila sin actividad puede no aparecer en el reporte aun con fondo; la UI
  no inventa datos faltantes.

## Migration Plan

Desplegar primero `add-flexible-cash-shifts`, verificarlo en instancia real y
recién entonces habilitar esta integración. Mientras tanto, el frontend actual
no debe mandar el body breaking a una instancia anterior.

## Open Questions

Ninguna bloqueante. La estrategia de refresh del banner y una vista admin de
fondos sin actividad quedan fuera de alcance.
