## Context

`add-frontend-cashier-shift-closing` registra cierres inmutables por cajero e
intervalo. Su contrato permite ventas y cierres repetidos después de guardar,
por lo que la mera existencia de un cierre no significa que todo el efectivo
actual esté conciliado. El backend sólo permite a Cashier crear cierres; la
lectura de registros es Admin-only y no expone un estado diario derivado.

## Goals / Non-Goals

**Goals:**

- Informar al cajero el estado de conciliación de su día de negocio sin sacar
  el foco de la operación de ventas.
- Permitir a Admin revisar, por día y cajero, qué cajas siguen sin cerrar o
  requieren una actualización.
- Mantener el cálculo de cobertura y ventas posteriores exclusivamente en
  backend.

**Non-Goals:**

- Bloquear ventas, abrir/cerrar sesiones de caja o requerir una reapertura.
- Editar, borrar o revertir cierres ya registrados.
- Mostrar un estado de caja en cada fila individual de venta.
- Crear una impresión de comprobante, alertas automáticas o traspasos de turno.

## User flow

1. Durante el día, Cashier ve "Caja en curso" en el encabezado.
2. Al registrar un cierre que cubre las ventas confirmadas hasta ese momento,
   el indicador pasa a "Cierre registrado" e informa la hora.
3. Si se confirma una venta después, el indicador pasa a "Pendiente de
   actualizar" y ofrece registrar otro cierre sin impedir la venta.
4. Admin consulta el reporte de cierres por rango de días, con una fila por
   cajero y día de negocio, y puede identificar estados sin cierre o pendientes.

## UI states

- Carga: el indicador conserva una etiqueta neutral no interactiva; el reporte
  usa skeleton que preserva la tabla.
- Vacío: un día sin ventas ni cierres se identifica como "Sin actividad", no
  como caja sin cerrar.
- Error: el indicador informa que no pudo actualizarse sin impedir el POS; el
  reporte muestra el error del backend con acción de reintento.
- Éxito: después de guardar un cierre, el indicador se refresca y confirma el
  nuevo estado; una venta posterior también lo actualiza.
- Pending: el guardado de cierre conserva el bloqueo local que ya tiene el
  diálogo; ninguna consulta reintenta automáticamente.

## Decisions

### Estado de conciliación, no estado permanente de caja

El vocabulario visible será "Caja en curso", "Cierre registrado" y "Pendiente
de actualizar". "Caja cerrada" se reserva para una futura sesión de caja que
realmente bloquee o finalice la operatoria. Esto evita declarar cerrada una
caja que recibió ventas después del último corte.

### Backend es dueño de la derivación

El estado se deriva de ventas confirmadas, intervalos de cierre y zona horaria
de negocio. El frontend consume un agregado por cajero/día y un reporte diario;
no compara timestamps ni calcula montos de ventas por su cuenta.

### Reporte separado de las filas de ventas

El reporte administrativo presenta una fila por cajero y día, porque un cierre
abarca un intervalo y no pertenece a una venta individual. Una señal agregada
puede enlazar desde reportes de ventas, pero no duplica el estado en cada venta.

### El indicador es visible, textual y no bloqueante

El encabezado del cajero muestra texto, icono y tono semántico; nunca sólo
color. Es alcanzable por teclado y abre el flujo de cierre o detalle disponible
sin capturar el foco del escáner fuera de una interacción explícita.

## Accessibility

El indicador tiene nombre accesible completo, comunica estado mediante texto y
color, conserva foco visible y no introduce motion adicional. El reporte usa
encabezados de tabla, estados con `role="alert"` cuando corresponde y controles
de filtro alcanzables por teclado.

## Keyboard and focus behavior

Tab lleva al indicador desde el encabezado. Activarlo abre el flujo disponible
y el diálogo devuelve foco al trigger al cerrar. En el POS, el foco del escáner
no cambia por refrescos de estado ni por ventas confirmadas.

## Responsive behavior

El encabezado conserva una etiqueta abreviada con nombre accesible en móvil. El
reporte mantiene las columnas esenciales mediante el contenedor responsive del
UI kit; los importes usan cifras tabulares y no dependen del color.

## API contract

Los endpoints necesarios no existen hoy y están solicitados en
`backend-request.md`. Los montos serán strings decimales, las fechas de negocio
`YYYY-MM-DD` y los timestamps RFC3339. `401` mantiene la redirección de sesión
existente; `403` no cierra sesión y muestra recuperación explícita.

## Error handling

Los mensajes `{ message }` del backend se muestran sin reformular. Un error de
estado en el encabezado no bloquea ventas. Un error del reporte es persistente
y permite reintentar. Ningún error trata un cierre como guardado si el POST no
lo confirmó.

## Backend coordination

La implementación frontend queda bloqueada hasta que los dos endpoints nuevos
estén desplegados y sus contratos se verifiquen contra una instancia real.

## Risks / Trade-offs

- Un estado calculado puede quedar obsoleto tras una venta concurrente → el
  backend devuelve el corte evaluado y el cliente refresca tras sus acciones.
- Cierres históricos solapados existen por contrato → backend define una única
  clasificación diaria; el frontend no elige cuál registro prevalece.
- El reporte añade otra superficie administrativa → se limita a conciliación;
  no sustituye el historial ni el reporte de ventas.

## Migration Plan

1. Backend despliega los agregados de estado y reporte.
2. Frontend consume los nuevos contratos detrás de los roles definidos.
3. Se verifica una venta posterior a un cierre y los cuatro estados diarios.

## Rollback

El frontend puede dejar de mostrar el indicador y el reporte sin modificar los
registros de cierre existentes. El backend conserva los cierres inmutables.

## Open Questions

Ninguna.
