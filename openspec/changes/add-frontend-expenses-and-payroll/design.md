# Design — Egresos, sueldos por hora y autoconsumo

## Context

El sistema hoy es asimétrico: mide con precisión todo lo que entra y no registra
nada de lo que sale, salvo el pago de una orden de compra
(`POST /api/v1/purchase-orders/{id}/payment`). Verificado contra
`../backend/internal/bootstrap/router.go` el 2026-08-05: no existe una sola ruta
de egresos, gastos, rubros, horas trabajadas ni sueldos, y `grep` sobre
`../backend/openspec/specs/` no devuelve ninguna capability del dominio. Las
capabilities existentes son catalog, database-platform, identity, inventory,
purchasing, reporting y sales.

Consecuencias operativas que este change ataca:

- `expected_cash` del cierre de caja se computa contra ventas y fondo de
  apertura. Cualquier plata que salga del cajón por otro motivo aparece como
  diferencia sin causa, y la operadora la explica de memoria.
- El stock cree que la mercadería que la dueña se llevó sigue en la góndola.
- Los sueldos por hora se calculan a mano y no hay historial conciliable.
- No hay ninguna pantalla que responda "en qué se me fue la plata".

El change es **enteramente frontend** en cuanto a implementación, y **bloqueado
por backend salvo su capa pura**: sin el contrato de `backend-request.md` no hay
pantalla que construir que no sea una mentira. Los tipos, la navegación y las
librerías puras (`src/lib/expenses.ts`, `src/lib/payroll.ts`) sí se implementan
antes, porque no dependen de ningún endpoint y fijan las reglas que después
consumen las pantallas.

**Fuente de diseño.** Las seis pantallas están diseñadas en el proyecto Claude
Design `b82eadaf-cc04-4abf-8bfb-a96cc2cb1b24` (`Egresos.dc.html`), bajado con
DesignSync el 2026-08-05. Ese mockup es normativo para layout, copy, jerarquía y
comportamiento responsive; sus decisiones y los dos puntos donde contradice el
contrato están resueltos en D5 y D11–D14. Las capturas de las seis pantallas y
de nueve estados adicionales están en `design/`, con su índice y su lectura en
`design/README.md`, para que la implementación no se haga a ciegas.

## Goals / Non-Goals

**Goals**

- Que todo egreso quede registrado con los tres ejes que lo hacen contable: qué
  tipo de movimiento es, a qué rubro imputa y de dónde salió la plata.
- Que el cierre de caja deje de tener diferencias inexplicables por egresos en
  efectivo.
- Que el stock refleje la mercadería que sale por autoconsumo.
- Que la liquidación de sueldos por hora sea reconstruible: qué horas, a qué
  tarifa, qué se ajustó y qué se pagó.
- Que agregar un motivo de gasto nuevo sea una acción de la dueña, no un deploy.

**Non-Goals**

- No se modela contabilidad de partida doble ni plan de cuentas. Esto es un
  registro de caja de un kiosco, no un ERP contable.
- No se automatizan gastos recurrentes ni se modelan vencimientos.
- No se adjuntan comprobantes: el sistema no tiene almacenamiento de archivos.
- No se implementa fichaje de entrada/salida.
- No se cruza egreso con margen en `/reports`.
- El frontend no computa el efectivo esperado del cierre, ni antes ni ahora.

## Relación con las specs vigentes

`ui-expenses` es una capability **nueva**: no hay spec de egresos que rebasear.

Tres specs vigentes se tocan, y las tres de forma acotada:

- `ui-foundation` → `Role-gated navigation shell`: la enumeración de secciones
  por rol suma Egresos para Admin. Es la única requirement de esa spec que
  cambia.
- `ui-cashier-shift-closing` → `Shift closing modal shows backend-computed
  expected cash`: se agrega el desglose de egresos en efectivo, **manteniendo
  intacta** la regla de que el frontend no calcula el esperado.
- `ui-inventory` → `Stock movement history`: la lista cerrada de tipos suma el
  autoconsumo. El filtro por tipo sigue siendo una lista cerrada.

## User flow

**Registrar un gasto (el caso dominante: "saqué plata para cargar combustible")**

1. Admin abre `/expenses` y elige `Registrar egreso`.
2. Elige el **tipo**. Por defecto `Gasto operativo`, que es el 80 % de los casos.
3. El formulario pide monto, rubro, medio de pago, fecha y descripción. Con
   `Gasto operativo` no pide nada más.
4. Confirma. El egreso aparece en el listado; si el medio fue `Efectivo de caja`,
   queda marcado como que afecta la caja del día.

**Liquidar sueldos**

1. Admin abre `/expenses/payroll`, que muestra por empleado las horas cargadas
   sin pagar y el monto acumulado.
2. Carga las horas del día: empleado, fecha, horas. El monto se calcula solo con
   la tarifa vigente y se puede pisar dejando el motivo.
3. Elige un empleado y un período, revisa el detalle día por día, confirma la
   liquidación y elige el medio de pago.
4. La liquidación genera un egreso de tipo `Sueldo` y los días quedan marcados
   como pagados, referenciando esa liquidación.

**Registrar autoconsumo**

1. Admin elige tipo `Autoconsumo` y agrega productos con cantidad.
2. La pantalla muestra la valorización al costo, que no se edita.
3. Confirma. Se descuenta stock y queda un egreso valorizado.

## Decisions

### D1 — Tres ejes independientes, no una sola categoría

Un único campo "categoría" mezcla dos preguntas incompatibles: *qué hace el
sistema con esto* y *en qué se gastó la plata*. La primera necesita una lista
cerrada —el formulario y los efectos secundarios dependen de ella—; la segunda
necesita una lista abierta, porque los motivos son infinitos y aparecen solos.

- **Tipo** (`expense_type`, cerrado): `OPERATING`, `PURCHASE`, `PAYROLL`,
  `SELF_CONSUMPTION`, `OWNER_DRAW`. Define qué campos exige el formulario y qué
  toca el egreso fuera de su propia tabla.
- **Rubro** (`expense_category_id`, abierto y administrable): combustible,
  servicios, alquiler, fletes, mantenimiento, impuestos, limpieza…
- **Medio de pago** (`payment_method`, cerrado): `CASH_REGISTER`, `OWNER_FUNDS`,
  `TRANSFER`, `CARD`.

Los tres son ortogonales: "combustible pagado con plata propia" y "combustible
pagado del cajón" son el mismo rubro y el mismo tipo, y sin embargo uno afecta el
cierre de caja y el otro no. Colapsarlos en un campo obliga a inventar valores
compuestos que envejecen mal.

Alternativa descartada: tipo cerrado únicamente, ampliándolo cuando aparece un
motivo nuevo. Cada motivo nuevo sería un cambio de contrato, un deploy de backend
y otro de frontend, para algo que la dueña resuelve en diez segundos si tiene un
ABM.

### D2 — Sólo el medio de pago decide si el egreso toca la caja

`CASH_REGISTER` significa que la plata salió físicamente del cajón: resta del
efectivo esperado del día. `OWNER_FUNDS`, `TRANSFER` y `CARD` no tocan el cajón y
por lo tanto no participan del arqueo, aunque sí del resultado del negocio.

El frontend **no computa esa resta**. `expected_cash` lo sigue calculando el
backend —regla vigente de `ui-cashier-shift-closing`, que no se relaja—; el
frontend sólo muestra el total de egresos en efectivo que el backend informa en
el desglose, para que la operadora entienda de dónde sale el número. Si el
frontend hiciera la resta, tendríamos dos fuentes de verdad para la misma cifra y
la que se ve en pantalla dejaría de coincidir con la persistida.

**Resuelto.** Confirmado contra `../backend/openspec/specs/expenses/spec.md` →
Requirement "Create Expense" y verificado en vivo el 2026-08-06 contra
`localhost:8080`: la imputación es **automática y no configurable** por el
Admin. Al crear un egreso `CASH_REGISTER`, el backend lo asocia al único turno
de caja activo en ese momento. Si hay cero turnos activos o más de uno, el
egreso se crea igual pero **sin asociación**, y no participa de ningún cálculo
de cierre. Verificado en vivo: un `POST /expenses` con `CASH_REGISTER` creado
mientras había exactamente un turno abierto devolvió `cash_shift_id` poblado
sin que el request lo especificara. Los casos de cero/múltiples turnos activos
se confirman por spec, no se reprodujeron en vivo.

La copy del formulario y del listado debe reflejar esta regla tal cual —no
hay elección de turno ni de cierre en el formulario de egreso— y, cuando el
egreso no tiene turno asociado, la UI debe dejar claro que ese egreso no
afecta ningún arqueo (ni el actual ni uno pasado), en vez de asumir
silenciosamente que sí.

### D3 — Horas cargadas a mano, monto calculado y pisable

Se cargan `empleado + fecha + horas`, y el sistema calcula
`horas × tarifa horaria vigente`. El monto resultante **se puede editar**, porque
la realidad del kiosco tiene adelantos, feriados que se pagan distinto y arreglos
puntuales, y un sistema que no los admite se abandona el primer día que no
coincide.

El costo de esa flexibilidad es que el reporte deja de ser reconstruible con sólo
`horas × tarifa`. Se mitiga persistiendo las tres cosas: las horas, el monto
calculado y el monto final; y exigiendo un motivo cuando difieren. Una fila
ajustada se identifica como tal **por texto**, no sólo por color, y el reporte
por empleado muestra ambos totales.

Alternativa descartada: fichaje de entrada/salida. Es más preciso y más
auditable, pero requiere que alguien fiche —nadie va a fichar en un kiosco de
tres personas— y multiplica el backend.

### D4 — El empleado es el usuario del sistema

La tarifa horaria (`hourly_rate`, nullable) se agrega al usuario existente. No se
crea una entidad Empleado.

Ventajas: cero entidad nueva, el nombre y el estado ya existen, y las horas se
atribuyen a la misma identidad que registra ventas.

**Riesgo asumido, y es real:** alguien que cobra pero no usa el sistema no se
puede liquidar, y un empleado que se va no se puede desactivar como usuario sin
perder el acceso a su historial de pagos si la desactivación filtra. Mitigación
en el frontend: la pantalla de sueldos lista usuarios **activos e inactivos** con
tarifa horaria o con horas cargadas, y un usuario inactivo se puede consultar y
liquidar pero no recibe horas nuevas. Si aparece el caso de alguien que cobra sin
login, la salida es un change que introduzca la entidad Empleado, no un parche.

### D5 — El autoconsumo se carga por producto; el costo unitario lo trae el catálogo

> **Conflicto con el diseño aprobado, resuelto acá.** El mockup
> `Egresos.dc.html` renderiza el costo unitario de cada línea como un **input
> editable**, tanto en `Compra` como en `Autoconsumo`. Para `Compra` eso es
> correcto: la dueña pagó lo que pagó, y ese precio es dato de entrada. Para
> `Autoconsumo` **no**: el negocio no se vendió nada a sí mismo, perdió
> mercadería a su costo de reposición, y ese costo es dato del catálogo. Si la
> dueña lo tipea, dos autoconsumos del mismo producto el mismo día pueden
> valorizarse distinto y el egreso deja de ser conciliable con inventario.
>
> **Resolución:** en `Autoconsumo` el costo unitario se muestra **de sólo
> lectura**, precargado desde el catálogo, con la misma tipografía y posición que
> el mockup — cambia el estado del control, no el layout. En `Compra` queda
> editable tal como lo diseñó el mockup. El monto total sigue siendo de sólo
> lectura en ambos casos cuando hay líneas.


Un monto libre sería más rápido de construir y dejaría el stock mintiendo, que es
exactamente el problema que el bloque viene a resolver. Entonces: líneas de
producto con cantidad, descuento de stock y valorización **al costo**, no al
precio de venta — el negocio no se vendió nada a sí mismo, perdió mercadería a
valor de reposición.

La valorización la calcula el backend y el frontend la muestra **de sólo
lectura**: el costo vigente de un producto es dato del backend y calcularlo en el
cliente lo desincronizaría. Las cantidades siguen la misma regla que compras:
string decimal con la unidad del producto como sufijo, `unitario` o `pesable`.

Un autoconsumo no se puede cargar si algún producto quedaría con stock negativo;
el error se muestra por línea, no como un error global del formulario.

### D6 — Egresos es sólo de Admin

La sección completa —incluido el registro de un gasto de caja chica— es del rol
`admin`. El requerimiento habla de "gastos de la dueña del negocio", y la dueña
es Admin.

La consecuencia incómoda, y hay que decirla: un egreso en efectivo cargado por
Admin afecta el arqueo de un cajero que no lo cargó ni lo ve. Por eso el desglose
del cierre expone la línea de egresos en efectivo — sin esa línea, el cajero ve
una diferencia que no puede explicar y el sistema pierde credibilidad.

Habilitar al cajero a registrar retiros de caja es la extensión natural, y queda
fuera de alcance a propósito: cambia el modelo de permisos y necesita una
conversación de producto sobre autorización que hoy no está tenida.

### D7 — Un egreso se anula, no se borra

Borrar un egreso que ya afectó un cierre de caja o descontó stock reescribe la
historia. Un egreso se **anula**: queda listado, marcado como anulado por texto,
con quién y cuándo, y revierte sus efectos (devuelve el stock del autoconsumo,
libera los días de la liquidación).

Un egreso **no se puede anular si el cierre de caja de su día ya está sellado**.
El frontend deshabilita la acción con la razón visible, y aun así trata el `409`
del backend como el resultado autoritativo: dos pestañas abiertas no pueden
producir una anulación que el backend rechaza.

Editar un egreso no existe en este change. Se anula y se carga de nuevo — una
operación menos, un modelo de auditoría más simple.

### D8 — El retiro personal no es un gasto

`OWNER_DRAW` resta de la caja igual que cualquier otro egreso, pero **no cuenta
como gasto del negocio** en ningún total de resultado. Si la plata que la dueña
se lleva se suma a los gastos, el kiosco parece menos rentable de lo que es y la
métrica pierde sentido.

En el frontend eso se traduce en que los totales del período muestran **dos
cifras separadas y rotuladas**: gastos del negocio y **Retiros personales**.
Nunca una sola suma que las mezcle. `Retiros personales` es el único copy visible
para el agregado y las filas de tipo `OWNER_DRAW`; el identificador técnico no
cambia. Se descarta “Retiros de la dueña” porque atribuye una operación contable
a una persona y género específicos sin aportar información operativa.

### D9 — El tipo elige el formulario, no lo esconde

El formulario de egreso es uno solo, y el tipo determina qué campos exige:

| Tipo | Campos propios |
|---|---|
| `OPERATING` | ninguno más allá del núcleo |
| `PURCHASE` | proveedor opcional; líneas de producto opcionales que ingresan stock |
| `PAYROLL` | **no se carga a mano**: lo genera la liquidación |
| `SELF_CONSUMPTION` | líneas de producto obligatorias; monto de sólo lectura |
| `OWNER_DRAW` | sin rubro; el rubro no aplica |

El núcleo común es fecha, monto, medio de pago, rubro y descripción. El cambio de
tipo **no borra** lo ya escrito en los campos que ambos tipos comparten: se
descarta sólo lo que el tipo nuevo no admite, y se avisa antes de descartarlo.

`PAYROLL` no aparece como opción elegible en `/expenses/new`. Aparece en el
listado y en los filtros, porque existe como egreso, pero se origina únicamente
en `/expenses/payroll`. Un tipo que se puede filtrar pero no crear a mano es
deliberado: evita que existan dos caminos para el mismo hecho con reglas
distintas.

**`PURCHASE` con `items` opcional: resuelto.** Confirmado contra
`../backend/openspec/specs/expenses/spec.md` → Requirement "Create Expense" y
verificado en vivo el 2026-08-06 contra `localhost:8080`: `items` es
**opcional** en `PURCHASE`. Sin `items`, el egreso persiste el `amount` libre
enviado por el cliente y no toca stock (`201`, sin movimiento de inventario).
Con `items`, el backend **ignora** el `amount` del cliente, calcula
`amount = Σ (quantity × unit_cost)` por línea, incrementa stock por producto
—inicializándolo si no existía— y registra un movimiento `EXPENSE_PURCHASE`
por línea referenciando el egreso. Ambos caminos se ejercitaron en vivo con
resultado `201` y el `amount`/stock esperados.

**Detalle de implementación no documentado en `backend-request.md`, verificado
en vivo:** aunque `items` esté presente (y por lo tanto el `amount` del
cliente se ignore), el backend igual exige un `amount` parseable como decimal
en el body — un `POST` con `items` y sin `amount` responde `400` antes de
llegar a la validación de negocio. El formulario debe enviar siempre un
`amount` (por ejemplo `"0"`) cuando hay líneas, aunque el valor se descarte.

### D10 — Un rubro se archiva, no se borra

Igual que las categorías de producto: un rubro archivado sigue rotulando los
egresos históricos y desaparece de las opciones de un egreso nuevo. Borrarlo
dejaría egresos huérfanos y rompería los totales por rubro hacia atrás.

### D11 — Acciones contextuales en el encabezado, no pestañas persistentes

Egresos conserva **una sola entrada** en la navegación principal (`/expenses`),
pero deja de mostrar la barra interna de pestañas `Hub`, `Registrar`, `Rubros`
y `Sueldos`. Esa barra hace que cada cambio de tarea se perciba como navegación
de una página independiente y separa visualmente acciones que pertenecen al
mismo trabajo administrativo.

El hub adopta el patrón de Compras: el encabezado concentra `Registrar egreso`
como acción primaria y `Sueldos` y `Rubros` como accesos secundarios. En las
pantallas de tarea no se repite una navegación global: cada encabezado muestra
los accesos mínimos para continuar el trabajo o volver al hub. Las pantallas de
profundidad (`Detalle` y `Reporte por empleado`) mantienen su barra de volver.

Las rutas de `proposal.md` no cambian y `nav.ts` declara sólo `/expenses`. La
referencia visual bajada en `design/` sigue siendo normativa salvo por la barra
de pestañas que aparece en sus capturas; esta decisión la reemplaza.

Alternativa descartada: conservar las pestañas y agregarles una animación. No
resuelve la jerarquía redundante ni la percepción de recarga al cambiar de
sección; el feedback debe acompañar una navegación más clara, no maquillar el
patrón anterior.

### D11a — La navegación comunica progreso sin animación decorativa

Las acciones contextuales dan feedback al activarse: conservan foco, quedan
indisponibles frente a una segunda activación y exponen su estado de carga. Si
la navegación o los datos tardan lo suficiente para ser perceptibles, se muestra
un indicador de progreso en la acción y un skeleton que conserva la geometría
principal de la ruta de destino. La ruta nunca debe quedar como una región en
blanco mientras cambia de sección.

El movimiento se limita a la transición breve ya tokenizada para feedback y
aparición de contenido; no hay transiciones de página largas, animaciones
decorativas ni una espera artificial. Con `prefers-reduced-motion`, el cambio
de contenido sigue informando el estado de carga pero no desplaza ni desvanece
la interfaz de forma animada.

### D12 — Fidelidad al diseño por traducción a tokens, nunca copiando hex

El mockup está escrito con hex literales. Toda la implementación usa **tokens de
`src/app/globals.css`**. Mapeo fijado, verificado uno a uno contra el mockup:

| Valor del mockup | Token |
|---|---|
| `#7c3aed`, `#ede9fe` | `primary`, `primary-light` |
| `#f8f8fb`, `#fff`, `#fcfbfd`, `#ece9f7` | `background`, `surface`, `surface-subtle`, `surface-2` |
| `#211f2b`, `#615e6e`, `#736f85`, `#a6a2b3` | `text-primary`, `text-secondary`, `text-muted`, `text-disabled` |
| `#dcd9e6`, `#c9c5db`, `#b3aec9` | `border`, `border-hover`, `border-strong` |
| `#b45309` (todo lo de "Afecta caja" y ajustes) | `warning-strong` |
| `#c62626`, `rgba(239,68,68,.08 / .12 / .3 / .4)` | `error-strong`, `error` con opacidad |
| `#15803d`, `rgba(34,197,94,.15)` | `success-strong`, `success` con opacidad |
| `#c3ddc2`, `#b5dbee`, `#e5d2b0` | `payment-cash`, `payment-transfer`, `payment-card` |
| `#ece9f7` como fondo del medio "Plata propia" | `surface-2` |
| `12px` / `16px` / `999px` | `radius-app` / radio de panel / pill |
| `240ms cubic-bezier(.4,0,.2,1)` | `--motion-base` + `--ease-standard` |
| `220ms ease` del frame | no se implementa: es cromo del prototipo |

**"Plata propia" no tiene color de medio de pago propio** en el design system —
el mockup le da `surface-2`, que es un gris neutro. Se adopta: es correcto que el
único medio que no mueve dinero real de un canal identificable no tenga color de
canal. Igual que los otros tres, va **siempre acompañado de su etiqueta de
texto**.

Los breakpoints del prototipo son `390px` (móvil) y `1280px` (escritorio). Son
los anchos de encuadre del mockup, **no** los breakpoints de la app: la
implementación usa la matriz de viewports de `ux-ui-supervisor` y sigue siendo
funcional desde 320 px, que el prototipo no ejercita.

### D13 — Las barras del desglose son decoración, no el dato

El hub muestra el desglose por rubro y por tipo como barras horizontales. Cada
barra va **siempre acompañada de su etiqueta y su cifra en texto**, en la misma
fila. La barra es proporción relativa al mayor del grupo; no lleva eje, ni
leyenda, ni porcentaje. Si la barra no se renderiza, la información sigue
completa — que es la condición para que no cuente como gráfico sin alternativa.

En móvil el desglose por medio de pago es un **carrusel horizontal con
scroll-snap** que sangra hasta los bordes; los desgloses por rubro y por tipo se
apilan en una columna. Ese scroll vive dentro de su contenedor y no produce
overflow de página.

### D14 — La anulación lleva motivo y enuncia su efecto

El mockup agrega dos cosas que el contrato no tenía y que se adoptan:

- La confirmación **enuncia el efecto concreto según el tipo**: el autoconsumo
  devuelve productos al stock, el sueldo libera los días para volver a
  liquidarlos, la compra avisa que hay que revisar inventario. No es un texto
  genérico.
- El egreso anulado guarda y muestra un **motivo de anulación**, además de quién
  y cuándo.

El motivo pasa a ser campo del contrato (`backend-request.md` → B) y requisito
del delta spec. Sin él, un egreso anulado no se puede auditar seis meses después.

## UI states

**`/expenses` (hub)**

- *Loading*: skeleton de las tarjetas de total y de las filas del listado.
- *Vacío sin filtros*: "Todavía no registraste ningún egreso", con la acción de
  registrar el primero y una explicación de una línea de para qué sirve.
- *Vacío con filtros*: mensaje distinto, que nombra los filtros aplicados y
  ofrece limpiarlos. Nunca el mismo texto que el vacío real.
- *Error*: mensaje de la capability transversal, con reintento, sin perder los
  filtros.
- *Con datos*: totales del período arriba —total de gastos del negocio, retiros
  por separado (D8), y desglose por medio de pago—, listado debajo.
- *Navegando a una tarea*: la acción del encabezado informa que está abriendo su
  destino; si la carga es perceptible, el destino muestra un skeleton con su
  estructura principal y no un vacío.

**`/expenses/new`**

- *Enviando*: el botón queda deshabilitado con feedback diferido; no se permite
  doble envío.
- *Error de validación*: por campo, con el foco en el primero que falla.
- *Error del backend*: a nivel formulario, conservando todo lo cargado.
- *Autoconsumo con stock insuficiente*: error por línea, nombrando el producto y
  el stock disponible.

**`/expenses/payroll`**

- *Vacío*: "Ningún empleado tiene tarifa horaria cargada", con enlace a `/users`.
  Es el estado inicial real del sistema y no debe parecer un error.
- *Empleado sin horas en el período*: fila presente con total en cero, no
  ausente. Que alguien no haya trabajado es información.
- *Liquidación en curso*: confirmación explícita que muestra período, horas,
  monto y medio de pago antes de persistir.

**Egreso anulado**

- Fila con rótulo textual `Anulado`, atenuada, sin acciones, y contribuyendo con
  cero a todos los totales.

## Keyboard and focus behavior

- El formulario se completa entero con teclado; el orden de tabulación sigue el
  orden visual, y el selector de tipo es el primer control.
- Cambiar el tipo mueve el foco al primer campo que ese tipo agregó, y anuncia
  por región viva qué campos cambiaron.
- Agregar una línea de producto mueve el foco al campo de cantidad de la línea
  nueva; eliminarla lo devuelve al control de agregar.
- El diálogo de confirmación de liquidación y el de anulación atrapan el foco, se
  cierran con `Escape` y devuelven el foco al control que los abrió.

## Responsive behavior

Todo se escribe mobile-first y funciona desde 320 px. La dueña carga el gasto con
el teléfono en la mano, parada en el mostrador: el móvil es el caso principal, no
la degradación del escritorio.

- Los totales del período pasan a una columna en móvil, sin recortar cifras.
- El listado de egresos usa tarjetas apiladas por debajo del breakpoint de
  escritorio, no una tabla con scroll horizontal a nivel de página. Si una tabla
  se conserva, scrollea dentro de su propio contenedor.
- La grilla de horas por empleado es la superficie más densa del change: en móvil
  se resuelve como una fila por empleado con la carga de horas en un panel, nunca
  como una matriz de días con scroll en dos ejes.
- Targets táctiles de 44 px como mínimo en toda acción de fila.

## Accessibility

- Todo estado —anulado, ajustado, afecta caja— se comunica **por texto**, jamás
  sólo por color.
- El monto calculado y el monto final del sueldo son campos rotulados distintos,
  no un mismo campo que cambia de significado.
- Los errores por línea de producto se asocian a su input con `aria-describedby`.
- Los totales del período se leen como texto, no como un gráfico sin alternativa.
- La confirmación de anulación explica el efecto: qué se revierte.

## API contract

Todo pasa por `api<T>()` → `/api/backend/[...path]`. Ningún endpoint de abajo
existe hoy; el detalle y la justificación están en `backend-request.md`.

| Uso | Método y ruta |
|---|---|
| Listar egresos | `GET /api/v1/expenses` |
| Detalle | `GET /api/v1/expenses/{id}` |
| Registrar | `POST /api/v1/expenses` |
| Anular | `POST /api/v1/expenses/{id}/void` |
| Totales del período | `GET /api/v1/expenses/summary` |
| Rubros | `GET/POST /api/v1/expense-categories`, `PUT`/`PATCH .../{id}` |
| Horas | `GET/POST /api/v1/work-logs`, `PUT`/`DELETE .../{id}` |
| Pendiente por empleado | `GET /api/v1/payroll/pending` |
| Liquidaciones | `GET/POST /api/v1/payroll/payments` |
| Tarifa horaria | campo `hourly_rate` en los endpoints de `users` ya existentes |

Montos y cantidades viajan como **string decimal**, igual que el resto del
sistema (`CashClosing.expected_cash`, cantidades de compras). El frontend no
convierte a `number` en ningún borde de escritura.

## Error handling

- `401` / `403`: vocabulario transversal de `ui-foundation`.
- `409` al anular: el cierre del día está sellado. Mensaje específico, y la
  acción queda deshabilitada tras refrescar.
- `409` al liquidar: los días ya fueron liquidados por otra sesión. Se refresca
  el pendiente y se explica.
- `422` de stock insuficiente en autoconsumo: se mapea a la línea del producto.
- Fallo de red: se conserva lo cargado y se ofrece reintentar. Un egreso nunca se
  reintenta solo — duplicar un egreso es peor que no registrarlo.

## Backend coordination

`backend-request.md` documenta seis bloques. El orden recomendado es A → B → C,
que ya habilita el 80 % del valor (registrar y ver gastos), y después D → E
(sueldos) y F (efecto en el cierre). El bloque F contiene una decisión de
producto del lado del backend.

El frontend **no implementa nada** antes de verificar cada bloque contra una
instancia real. La sección 0 de `tasks.md` es bloqueante y no se marca sin
evidencia de respuesta HTTP real.

## Risks / Trade-offs

- **El empleado atado al usuario** (D4) rompe si alguien cobra sin login. Se
  asume; la salida documentada es un change de entidad Empleado.
- **El monto pisable** (D3) debilita la auditabilidad. Se mitiga persistiendo
  horas, calculado y final, más motivo.
- **Admin cargando egresos que afectan el arqueo de un cajero** (D6) puede
  generar desconfianza si el desglose no se ve. Por eso el desglose es parte del
  alcance y no un extra.
- **La grilla de horas es la pantalla con más riesgo de UX** del change: es
  densa, se usa a diario y en móvil. Es la que más se beneficia de pasar por
  `ux-ui-supervisor` antes de implementarse.
- **Superficie grande y bloqueada**: el change puede quedar meses esperando
  backend. Está partido en bloques entregables por separado para poder shipear
  gastos antes que sueldos.

## Migration Plan

1. Backend despliega A (rubros), B (egresos) y C (totales). Frontend implementa
   `/expenses`, `/expenses/new`, `/expenses/[id]` y `/expenses/categories` con
   los tipos `OPERATING`, `PURCHASE` y `OWNER_DRAW`. Ya es entregable.
2. Backend despliega D (tarifa horaria) y E (horas y liquidación). Frontend
   implementa `/expenses/payroll` y `/expenses/payroll/[userId]`, y el tipo
   `PAYROLL` aparece en filtros y listado.
3. Backend despliega el movimiento de autoconsumo. Frontend habilita el tipo
   `SELF_CONSUMPTION` y `ui-inventory` suma el tipo al filtro.
4. Backend despliega F. Frontend agrega la línea de egresos en efectivo al
   desglose del cierre.

Cada paso se puede shipear solo. Ningún paso posterior es prerrequisito de uno
anterior.

## Rollback

Cada bloque se revierte quitando su ruta de `nav.ts` y del gating: no hay
migración de datos del lado del frontend. Si se revierte el bloque de egresos
completo, los datos ya cargados quedan en el backend y vuelven a ser visibles al
reponer la sección.

## Open Questions

- ~~¿Un egreso de tipo `PURCHASE` debe poder ingresar stock, o eso obliga a
  pasar siempre por una orden de compra?~~ **Resuelto** (ver D9): `items` es
  opcional, y cuando está presente ingresa stock. Confirmado por spec y en
  vivo el 2026-08-06.
- ~~¿La tarifa horaria es histórica?~~ **Resuelto**: la fila de horas persiste
  `hourly_rate_snapshot` y `computed_amount` al crearse; un cambio posterior de
  `hourly_rate` del usuario no los reescribe. Confirmado por spec
  (`../backend/openspec/specs/expenses/spec.md` → Requirement "Create Work
  Log") y en vivo el 2026-08-06.
