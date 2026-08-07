# Egresos, sueldos por hora y autoconsumo

> **Este change está BLOQUEADO por backend en su totalidad.** No existe hoy en
> `../backend` ninguna capability de egresos, rubros de gasto, horas trabajadas
> ni liquidación de sueldos: el router no registra una sola ruta de este dominio.
> No se implementa —ni parcialmente, ni con datos simulados, ni con un store
> local— hasta que el contrato de `backend-request.md` esté desplegado y
> verificado contra una instancia real. Ver `design.md` → `Migration Plan`.

## Why

El sistema sabe todo lo que entra y nada de lo que sale. Registra ventas, cierres
de caja, fondo de apertura y hasta el pago de una orden de compra, pero la plata
que sale del cajón por cualquier otro motivo no existe para el sistema. En un
kiosco de una sucursal eso es la mitad de la contabilidad:

- La dueña saca plata para cargar combustible, pagar el flete, el arreglo de la
  heladera o la boleta de luz. Nada de eso se anota en ningún lado, así que el
  cierre de caja "no da" y la diferencia se explica de memoria.
- Compra mercadería fuera del circuito de pedidos a proveedores —en el mayorista,
  al contado— y esa compra no aparece como egreso ni como costo.
- Les paga a los empleados por hora trabajada. Las horas se anotan en un papel,
  el cálculo se hace a mano y no hay forma de reconstruir qué se le pagó a quién
  ni por qué período. La conciliación con el empleado es una discusión, no una
  consulta.
- Saca mercadería del negocio para uso personal. El stock queda inflado —el
  sistema cree que esos productos siguen en la góndola— y el consumo no aparece
  en ningún reporte.
- Cuando retira plata para ella misma, no hay manera de distinguir eso de un
  gasto del negocio, así que cualquier medida de rentabilidad queda distorsionada.

El resultado es que el cierre de caja mide una expectativa que ignora la mitad de
los movimientos, y no hay una sola pantalla que responda "¿en qué se me fue la
plata este mes?".

## What Changes

Se agrega una sección **Egresos**, sólo para el rol `admin`, con cinco bloques.

**A. Modelo de egreso de tres ejes.** Todo egreso se clasifica por tres ejes
independientes, y esa separación es la decisión central del change (`design.md`
→ D1):

- **Tipo** — lista cerrada que define el *comportamiento* del formulario y qué
  toca el egreso en el resto del sistema: `Gasto operativo`, `Compra`, `Sueldo`,
  `Autoconsumo`, `Retiro`.
- **Rubro** — lista abierta que administra la dueña (combustible, servicios,
  alquiler, fletes, mantenimiento, impuestos…). Es el eje de análisis y responde
  "en qué se va la plata" sin que un rubro nuevo requiera un deploy.
- **Medio de pago** — `Efectivo de caja`, `Plata propia`, `Transferencia`,
  `Tarjeta`. Es el eje de tesorería y el único que decide si el egreso resta del
  cierre de caja.

**B. Registro de egresos.** Ruta `/expenses` como hub —listado filtrable por
período, tipo, rubro y medio de pago, con totales del período desglosados por los
tres ejes— y `/expenses/new` como formulario cuyos campos dependen del tipo
elegido. Un egreso no se borra: se **anula**, dejando rastro, y no se puede
anular si el cierre de caja del día ya está sellado.

**C. Rubros de gasto.** Ruta `/expenses/categories`: alta, renombrado y archivado
de rubros, con el mismo criterio que las categorías de producto —un rubro
archivado sigue apareciendo en los egresos históricos pero no se puede elegir en
uno nuevo—.

**D. Sueldos por hora.** Ruta `/expenses/payroll`. El empleado es el usuario del
sistema (`design.md` → D4): el usuario suma una **tarifa horaria** opcional,
editable desde `/users`. Se registran las **horas trabajadas por empleado y por
día**; el sistema calcula `horas × tarifa vigente` y **permite pisar el monto**
—adelantos, feriados, extras— dejando registrado que fue ajustado y por qué. La
liquidación toma los días no pagados de un empleado en un período, muestra el
total y, al confirmarse, **genera un egreso de tipo `Sueldo`** con su medio de
pago. `/expenses/payroll/[userId]` es el reporte por empleado: horas, montos,
pagos y saldo pendiente — la pantalla para conciliar con la persona.

**E. Autoconsumo con impacto en stock.** El egreso de tipo `Autoconsumo` se carga
eligiendo **productos y cantidades**, no un monto libre: descuenta stock y se
valoriza al costo, de modo que inventario y finanzas dejen de contradecirse. El
historial de movimientos de stock suma ese tipo de movimiento a su lista cerrada.

**Impacto en el cierre de caja.** Un egreso con medio `Efectivo de caja` resta
del efectivo esperado del día. El frontend **no lo calcula**: sigue mostrando el
esperado que computa el backend, y sólo agrega la línea de egresos al desglose
para que la diferencia sea explicable.

En la interfaz, el agregado correspondiente a `OWNER_DRAW` se llama **Retiros
personales**. Es un nombre neutral que conserva la distinción contable: no se
suma a los gastos del negocio.

**F. Navegación operativa y fluida.** Egresos deja de usar una barra de pestañas
persistente. El hub concentra sus acciones en el encabezado, como Compras:
`Registrar egreso` es la acción primaria y `Sueldos` y `Rubros` son accesos
secundarios. Las pantallas de tarea ofrecen sólo los accesos contextuales que
permiten continuar o volver al hub, sin repetir una subnavegación. Al navegar
entre esas rutas, la acción activada da feedback inmediato y la pantalla de
destino conserva una estructura de carga reconocible en lugar de parecer una
reconstrucción en blanco.

**Fuera de alcance de este change:**

- Ingresos que no sean ventas (aportes de capital, préstamos).
- Adjuntar comprobantes o fotos de tickets: no hay almacenamiento de archivos en
  el sistema, y agregarlo es un change propio.
- Gastos recurrentes automáticos (alquiler, servicios que se repiten todos los
  meses). Se cargan a mano; la automatización es posterior.
- Cuentas por pagar, vencimientos y recordatorios.
- Fichaje de entrada/salida: las horas se cargan a mano (`design.md` → D3).
- Que un rol distinto de `admin` registre egresos (`design.md` → D6).
- Integrar los egresos al reporte de rentabilidad de `/reports`: acá se produce
  el dato y su propia pantalla de totales; cruzarlo con el margen es el change
  siguiente.
- El cambio de contrato del backend en sí: acá se documenta, no se implementa.

## Capabilities

### Added Capabilities

- `ui-expenses`: registro, listado, anulación y totalización de egresos por tipo,
  rubro y medio de pago; ABM de rubros; registro de horas trabajadas,
  liquidación de sueldos y reporte por empleado; y carga de autoconsumo por
  producto.

### Modified Capabilities

- `ui-foundation`: el shell de navegación suma la sección Egresos, visible sólo
  para `admin`.
- `ui-cashier-shift-closing`: el desglose del cierre expone los egresos en
  efectivo ya incluidos en el efectivo esperado que computa el backend.
- `ui-inventory`: la lista cerrada de tipos de movimiento suma el autoconsumo.

No se declara `ui-users`: la tarifa horaria se agrega al formulario de usuario,
pero no cambia ninguna regla de gating ni de gestión de usuarios de esa
capability. Ver `design.md` → D4 para por qué el campo vive ahí y el riesgo que
tiene.

No se declara `ui-cash-closing`: la herramienta de cierre de `/sales` muestra
totales de venta por medio de pago y no cambia con este change.

## Impact

**Rutas**

- `/expenses` — **nueva**; rol `admin`.
- `/expenses/new` — **nueva**; rol `admin`.
- `/expenses/[id]` — **nueva**; rol `admin`.
- `/expenses/categories` — **nueva**; rol `admin`.
- `/expenses/payroll` — **nueva**; rol `admin`.
- `/expenses/payroll/[userId]` — **nueva**; rol `admin`.
- `/users` — el formulario de usuario suma tarifa horaria; roles sin cambios.

**Superficies**

- `src/lib/nav.ts` — entrada `/expenses` con rol `admin`; `nav.test.ts` cubre que
  ningún otro rol la ve.
- `src/lib/types.ts` — tipos nuevos `Expense`, `ExpenseType`, `ExpenseCategory`,
  `ExpensePaymentMethod`, `ExpenseSummary`, `WorkLog`, `PayrollPayment`,
  `PayrollEmployeeSummary`; `User` suma `hourly_rate` nullable; `MovementType`
  suma el autoconsumo; el desglose del cierre suma el total de egresos en
  efectivo.
- `src/lib/expenses.ts` — **nuevo**: qué campos exige cada tipo, construcción del
  payload, totalización por eje y formato; puro y testeable en `node`.
- `src/lib/payroll.ts` — **nuevo**: cálculo `horas × tarifa`, detección de monto
  pisado, agrupación por período y saldo pendiente por empleado; puro y
  testeable en `node`.
- `src/components/expenses/` — **nuevo**: hub, formulario por tipo, ABM de
  rubros, pantalla de horas, liquidación y reporte por empleado; el encabezado
  de esas pantallas concentra acciones contextuales y sus estados de carga.
- Cierre de caja del cajero: una línea más en el desglose, sin cálculo propio.

**Backend**

Requiere los seis bloques de `backend-request.md`: rubros de gasto, egresos,
totales agregados, tarifa horaria en el usuario, horas y liquidación de sueldos,
y el efecto de los egresos en efectivo sobre el efectivo esperado del cierre.
Ninguno existe hoy, ni siquiera parcialmente.

**Dependencias**

- Convive con `add-frontend-reports-categories-and-profitability`: ese change
  mide margen sobre ventas; los egresos de acá son el otro término de la
  ecuación, y cruzarlos queda explícitamente fuera de alcance para no bloquear
  ninguno de los dos.
- No depende de ningún change en curso de compras.

No agrega dependencias de `package.json`.
