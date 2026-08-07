# Capturas del diseño aprobado — Egresos

Renderizadas el 2026-08-05 desde el proyecto Claude Design
`b82eadaf-cc04-4abf-8bfb-a96cc2cb1b24` (`Egresos.dc.html`), bajado con
DesignSync. **Son la referencia visual normativa del change**: layout, copy,
jerarquía y comportamiento responsive se implementan como se ven acá.

Móvil a 390 px y escritorio a 1280 px, que son los dos anchos que el prototipo
ejercita. **No prueban 320 px**, que sigue siendo obligatorio — ver
`tasks.md` → 0.13.

## Cómo leerlas

Los colores del prototipo son hex literales. **No se copian**: la traducción a
tokens de `src/app/globals.css` está fijada en `design.md` → D12, y es
obligatoria. Si un valor de una captura no aparece en esa tabla, se levanta la
duda antes de escribirlo a mano.

Los datos son de demo. Los importantes de mirar son la estructura y el copy, no
los montos.

## Índice

| Archivo | Qué muestra | Decisión que lo gobierna |
|---|---|---|
| `01-hub-*` | Hub con datos: dos totales separados, desglose por medio de pago / rubro / tipo, filtros y listado | D8, D13 |
| `02-registrar-egreso-*` | Formulario con el tipo por defecto `Gasto operativo` | D9 |
| `03-rubros-*` | ABM de rubros con alta, renombrado, archivado y un rubro ya archivado | D10 |
| `04-sueldos-*` | Tarjeta por empleado con horas sin pagar, acumulado y días pendientes | D3 |
| `05-reporte-empleado-*` | Reporte de conciliación: días, calculado, final, motivo y liquidaciones | D3 |
| `06-detalle-egreso-*` | Detalle de un egreso **de un día ya sellado**: la anulación no se ofrece y se enuncia por qué | D7 |
| `07-hub-vacio-inicial-*` | Vacío real, distinto del vacío por filtros | — |
| `08-hub-error-*` | Error de carga con reintento | — |
| `09-sueldos-sin-tarifas-*` | El estado del día 1: ningún empleado tiene tarifa. No puede parecer un error | D4 |
| `10-sueldos-panel-horas-mobile` | Panel de carga de horas con monto calculado y el toggle de pisar el monto | D3 |
| `11-sueldos-liquidar-mobile` | Confirmación de liquidación: día por día, calculado vs. final, día ajustado rotulado por texto, medio de pago | D3 |
| `12-detalle-anular-confirmacion-mobile` | Confirmación de anulación de un gasto operativo | D14 |
| `13-detalle-autoconsumo-anular-mobile` | La misma confirmación en autoconsumo: enuncia que devuelve stock | D14 |
| `14-registrar-autoconsumo-mobile` | Tipo `Autoconsumo`: monto de sólo lectura y líneas obligatorias | D5 |
| `15-registrar-compra-mobile` | Tipo `Compra`: proveedor y líneas opcionales | D9 |

## Lo que las capturas NO son

- **No son contrato.** Los endpoints están en `backend-request.md` y ninguno
  existe todavía; el change está bloqueado.
- **El costo unitario editable en autoconsumo del mockup no se implementa.** En
  autoconsumo va de sólo lectura, precargado del catálogo. El motivo está en
  `design.md` → D5, y es la única contradicción abierta del diseño.
- **No cubren todos los estados.** Faltan el envío en curso, los errores por
  línea de producto y el foco. Están descritos en `design.md` → UI states,
  Keyboard and focus behavior.

## Cómo regenerarlas

El prototipo necesita el runtime `support.js` del proyecto de diseño y React 18
UMD desde unpkg. Bajar ambos archivos con DesignSync, servirlos por HTTP y
renderizar cada pantalla forzando `initialScreen` / `initialDevice` en el
atributo `data-props`.
