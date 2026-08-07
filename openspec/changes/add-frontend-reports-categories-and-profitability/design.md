## Context

Este change reúne ventas por categoría y un centro de reportes para una sola
sucursal. El cambio `add-frontend-expenses-and-payroll` modela egresos y deja
explícito que `OWNER_DRAW` no es gasto de negocio. El cambio
`add-frontend-purchasing-optional-supplier` habilitará pedidos sin proveedor,
por lo que una compra no puede depender de que haya un proveedor asociado para
ser visible como movimiento de stock o de dinero.

La consulta previa de compras por proveedor no sirve para calcular margen:
comprar stock en un período y venderlo son hechos con fechas y montos distintos.
El backend actual tampoco expone costo histórico de la mercadería vendida ni
un agregado que combine el futuro dominio de Egresos con compras. Este diseño
los solicita como un resumen backend nuevo; el frontend no intenta inferirlos.

## Goals / Non-Goals

**Goals:**

- Dar a Admin una lectura clara de resultado: ingresos, costo de ventas,
  margen bruto, gastos operativos y resultado operativo.
- Mostrar las salidas de dinero que ayudan a conciliar caja e inventario sin
  descontarlas otra vez de la rentabilidad.
- Mantener los retiros personales separados de cualquier ganancia o gasto.
- Preservar categorías más vendidas y el acceso a análisis comerciales ya
  previsto.

**Non-Goals:**

- No es contabilidad formal, balance, impuesto ni conciliación bancaria.
- No se calcula costo de ventas, resultado, ni clasificación de un egreso en
  el navegador.
- No se configura todavía una política contable ni se modifica Egresos,
  Compras o el cierre de caja desde Reportes.
- No se muestra una serie diaria de compras o gastos en este change.

## User flow

1. Admin abre `/reports` y selecciona el rango de fechas del dashboard.
2. Desde la card `Resultado y caja` abre `/reports/profitability`, que por
   defecto usa el primer día del mes actual hasta hoy.
3. Elige un rango y lee primero los cinco indicadores de resultado del
   período: ingresos, costo de ventas, margen bruto, gastos operativos y
   resultado operativo.
4. Debajo consulta `Movimientos de dinero`: compras de stock, egresos por tipo
   y medio de pago y `Retiros personales`, siempre identificados como una
   lectura de caja y no como un descuento adicional al resultado.
5. Si necesita entender qué impulsa ventas, vuelve al dashboard para categorías
   o usa los enlaces a los reportes de producto y compras. La sección
   `Producto revelación` queda deshabilitada hasta contar con su endpoint.

## UI states

### Centro de reportes

- **Loading:** skeleton que conserva las dos regiones principales (resultado y
  movimientos) para evitar una página vacía.
- **Empty:** rango sin actividad muestra cero en los indicadores y un texto
  que aclara que no hubo movimientos registrados; no oculta la estructura.
- **Error:** el resumen completo muestra `ErrorState` persistente con reintento
  porque sus cifras deben provenir de una única fotografía coherente. Un error
  en categorías no oculta el resto del dashboard.
- **Success:** primero resultado, luego movimientos de dinero y por último los
  enlaces/análisis secundarios. Ningún estado se expresa sólo por color.
- **Producto revelación:** bloque no interactivo que explica la dependencia
  backend; no hace fetch ni muestra datos parciales.

### Categorías más vendidas

- Loading: `ListSkeleton`, igual que `TopProductsCard`.
- Empty: `EmptyState` con `No hay ventas en el período seleccionado.`
- Error: `ErrorState` persistente con reintento.
- Success: ranking por ingreso descendente con unidades vendidas como dato
  complementario.

## Decisions

1. **Resultado y caja son regiones distintas.** La primera responde si la
   operación dejó resultado; la segunda responde por dónde salió el dinero.
   Alternativa descartada: un único tile de "egresos", porque suma hechos de
   naturaleza distinta y lleva a descontar compras dos veces.
2. **El margen bruto es `ingresos − costo de ventas`, no `ventas − compras`.**
   El costo de ventas corresponde a los productos efectivamente vendidos y lo
   resuelve backend con costo histórico. Las compras de stock quedan visibles
   como flujo de caja/inventario. Es la distinción indispensable para que el
   número sea útil para decidir.
3. **Resultado operativo = margen bruto − gastos operativos.** Backend define
   qué tipos activos de Egresos lo integran y devuelve la cifra; compras de
   stock ya reflejadas en costo de ventas no se vuelven a restar. La alternativa
   de consumir `total_business_expenses` se descarta porque incluye `PURCHASE`.
4. **`Retiros personales` quedan fuera del resultado.** Se muestran en
   movimientos de dinero por su impacto en caja, con copy explícito: no son
   gasto del negocio ni reducen el resultado operativo.
5. **Un único endpoint de resumen para los indicadores financieros.** El
   backend entrega una fotografía consistente del rango; evita que el cliente
   combine ventas, egresos y pagos con reglas o cortes temporales diferentes.
6. **Compras de stock incluyen pedidos pagados y compras directas según la
   clasificación backend.** Cada operación aparece una vez mediante una
   referencia de origen; el frontend no deduplica ni supone que un pedido sea
   gasto al crearlo.
7. **Jerarquía de reporte, no dashboard decorativo.** Indicadores de resultado
   primero; detalle de caja segundo; análisis comercial tercero. No se usan
   gráficos para los cinco totales: se muestran como stat tiles legibles.
8. **Categorías en el dashboard.** El ranking es corto y operativo; una página
   aparte agregaría navegación sin mejorar la decisión.
9. **Producto revelación sigue bloqueado de forma honesta.** El endpoint de
   comparación aún no existe; no se simula ni se compone en cliente.

## Accessibility

- Todos los valores tienen etiqueta textual y la semántica de resultado
  positivo/negativo no depende sólo de color.
- Las aclaraciones de `Margen bruto`, `Resultado operativo` y `Retiros
  personales` son texto visible, no tooltips ni íconos.
- El bloque de producto revelación usa `aria-disabled="true"`, no recibe foco
  como control y explica su indisponibilidad.
- `ErrorState`, skeleton y estado vacío conservan encabezados/regiones
  reconocibles por lector de pantalla.

## Keyboard and focus behavior

- La card `Resultado y caja` es un enlace estándar, alcanzable con Tab y
  activable con Enter.
- Los inputs de fecha mantienen foco visible y no introducen foco custom.
- El reintento de error mantiene el foco en el control activado hasta que el
  contenido actualizado toma su lugar; no hay diálogo ni trampa de foco.

## Responsive behavior

- Diseño mobile-first: en 320–430 px los cinco indicadores de resultado se
  apilan en una columna y los desgloses de movimiento usan filas/cards, nunca
  una tabla ancha.
- Desde un ancho donde los importes sigan legibles, los indicadores pueden
  organizarse en dos o más columnas; ningún importe se trunca ni provoca scroll
  horizontal de página.
- Los filtros permanecen antes de los datos y sus controles táctiles tienen al
  menos 44 px. Desktop muestra regiones lado a lado sólo cuando no reduce la
  lectura de los montos.

## API contract

Existentes:

- `GET /api/v1/reports/sales/summary?from=&to=` para el dashboard existente.
- `GET /api/v1/reports/products?sort=worst_selling&from=&to=` como destino del
  enlace de productos sin venta.

Pendientes de backend, detallados en `backend-request.md`:

- `GET /api/v1/reports/sales/by-category?from=&to=`.
- `GET /api/v1/reports/profitability?from=&to=`: resumen consistente con
  strings decimales para `revenue`, `cost_of_goods_sold`, `gross_margin`,
  `operating_expenses`, `operating_result`, `stock_purchases`,
  `owner_draws`, más desgloses por tipo y medio de pago. Cada desglose incluye
  un total, una etiqueta y una referencia de clasificación definida por backend.
- `GET /api/v1/reports/sales/by-product/growth?from=&to=&window_days=14`.

Todos son admin-only. `from` y `to` son `YYYY-MM-DD`; dinero llega y se
formatea como string decimal. El frontend sólo puede comprobar identidades
devueltas por backend, nunca recalcular importes de negocio.

## Error handling

- `401`: `api()` redirige a `/login` como hoy.
- `403`: conserva sesión y muestra falta de permiso con una acción `Volver`;
  no se solicitan datos tras el gate admin.
- `400`: muestra el mensaje backend junto al rango para que se pueda corregir.
- `ErrorState` muestra el mensaje backend sin reescribirlo y permite reintento
  explícito; no hay retry automático ni cifras stale como si fueran actuales.

## Backend coordination

El centro de reportes queda bloqueado hasta que exista el resumen de
rentabilidad. También depende funcionalmente de que Egresos esté desplegado y
de que pagos de pedidos/compras directas tengan una clasificación única. Las
categorías y producto revelación conservan sus bloqueos independientes. Ver
`backend-request.md` para contrato, compatibilidad y criterio de desbloqueo.

## Risks / Trade-offs

- El resumen agrega un contrato backend más rico, pero evita cifras
  financieramente engañosas y dobles conteos.
- `Resultado operativo` será un control mínimo de negocio, no una ganancia
  contable final; impuestos, amortizaciones y conciliación bancaria siguen
  fuera de alcance.
- Si una compra o pago no tiene una referencia de origen consistente, backend
  debe excluirla del resultado hasta poder clasificarla, en vez de duplicarla.

## Migration Plan

La nueva ruta es aditiva, pero reemplaza la definición prevista de sus métricas.
Primero backend despliega y verifica Egresos, costo histórico de ventas y el
resumen de rentabilidad; después frontend consume sólo ese resumen. Un frontend
anterior no consume el endpoint nuevo. No hay migración de datos frontend.

## Rollback

Revertir la ruta y la card retira el centro sin afectar el dashboard existente.
Si el resumen backend se revierte o no devuelve el contrato completo, frontend
no muestra una sustitución calculada localmente: conserva `ErrorState` y evita
presentar rentabilidad incompleta como resultado.

## Open Questions

- El backend debe confirmar los nombres finales y el criterio histórico de
  costo de ventas; el frontend no fija una política de valoración.
- Las reglas de umbral/antigüedad de `Producto revelación` siguen pendientes y
  no bloquean resultado ni movimientos de dinero.
