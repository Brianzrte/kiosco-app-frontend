## Context

La referencia [ERP/POS System de Yeakub Rahaman](https://www.behance.net/gallery/205111609/ERPPOS-System)
combina una navegación lateral tranquila, un saludo/contexto de espacio de
trabajo, cards con color pastel y tablas de alta legibilidad. Mini Moni es una
aplicación operacional: POS es teclado + lector y las demás áreas son SaaS
administrativo, tablas y reportes. La referencia se toma como lenguaje visual,
no como comportamiento de producto ni como copia de interfaz.

## Goals / Non-Goals

**Goals:**

- Dar a las rutas existentes una identidad ERP/POS cohesiva y reconocible.
- Hacer que la tarea, la acción primaria y los datos importantes se escaneen
  antes que los elementos decorativos.
- Conservar la velocidad de caja, todos los contratos vigentes y los estados
  loading, empty, error, success y pending.
- Hacer que el sistema sea usable con teclado, lector y móvil.

**Non-Goals:**

- Cambiar procesos de venta, inventario, recepción, pagos, permisos o API.
- Copiar ilustraciones, marcas, nombres, datos ficticios o assets de Behance.
- Introducir una dependencia, tema oscuro, animación decorativa o dashboard
  genérico con métricas inventadas.
- Rediseñar las superficies nuevas de `add-frontend-suppliers-purchasing` o
  `add-frontend-cashier-shift-closing` antes de que sus owners las integren.

## User flow

1. La persona autenticada entra en su ruta de inicio vigente; reconoce el
   módulo activo en el shell y el objetivo de la pantalla en el encabezado.
2. En una pantalla administrativa encuentra contexto, acción primaria, filtros
   y datos en ese orden; al abrir una fila conserva la navegación y puede
   volver al listado.
3. En POS el foco entra y vuelve siempre al escáner; catálogo, carrito, total y
   pago se leen en una composición de dos regiones sin que la estética demore
   el siguiente escaneo.
4. En móvil la navegación existente conserva su comportamiento y cada área se
   apila en orden de tarea, sin ocultar la acción primaria ni el total.

## UI states

- **Loading:** skeletons reproducen la estructura final de shell, encabezado,
  cards y tabla; no se presenta una página que salte cuando llega el dato.
- **Navigation pending:** al activar una navegación entre rutas se muestra un
  spinner compacto y accesible dentro de una capa de progreso del workspace.
  El shell conserva su geometría, el indicador no cambia el ancho ni la altura
  del contenido y desaparece cuando la ruta termina de cargar. No se agrega
  una dependencia ni se bloquea el POS durante operaciones internas; respeta
  `prefers-reduced-motion` y expone el estado como `aria-busy`/texto para
  tecnologías asistivas.
- **Empty:** conserva el encabezado y explica la ausencia junto a la acción
  primaria que corresponda.
- **Error:** conserva navegación y contexto, muestra el mensaje de backend o
  de transporte y una recuperación accesible; no usa un toast efímero.
- **Success/pending:** los botones usan el pending existente; los éxitos se
  confirman con el copy ya normativo y no mueven el foco crítico del POS.

## Decisions

### 1. Sistema visual derivado, no réplica

Se adopta una composición de superficies blancas, fondo luminoso neutral,
bordes sutiles, sombra baja y un acento cálido de marca. Los pasteles sólo
agrupan módulos, métricas o categorías; nunca reemplazan el color de una acción
primaria ni comunican estado por sí solos. Esto toma de la referencia su calma
y segmentación, pero mantiene los tokens, contraste y significado semántico de
Mini Moni.

Alternativa descartada: clonar la paleta, copy, iconografía o densidad de la
referencia. Sería inconsistente con el producto y puede degradar contraste.

### 2. Shell de workspace por tarea y breakpoint

En escritorio, el shell presenta marca, navegación de secciones y sesión como
un rail lateral persistente; el contenido usa un workspace ancho con
encabezado. En tablet el rail puede condensar etiquetas con nombres accesibles
sin ocultar rutas autorizadas. En móvil conserva el patrón de drawer/bottom-nav
vigente, porque un rail lateral reduciría demasiado el área de operación.

La ruta activa se identifica por etiqueta, icono, tratamiento visual y
`aria-current`, nunca sólo por color. No se introducen submenús ni una nueva
jerarquía de navegación.

### 3. Patrón administrativo uniforme

Catálogo, inventario, ventas, recepción, usuarios y reportes usan: `PageHeader`
con una acción primaria por región; métricas sólo cuando responden una pregunta
operativa; una banda de filtros; tabla/lista como área dominante; y paneles o
diálogos para edición. El UI kit absorbe las variaciones repetibles de panel,
toolbar, KPI y tabla; las views sólo componen.

Alternativa descartada: convertir cada listado en una grilla de cards. Las
tablas son más eficientes para comparar stock, importes, fechas y estados.

### 4. POS conserva prioridad operacional

POS no recibe título, saludo ni cards de dashboard antes del escáner. En ancho
de escritorio, catálogo/entrada ocupan la región principal y el carrito,
total, balance y cobro permanecen visibles en un panel lateral. En móvil las
regiones se apilan, manteniendo escáner y total al alcance; la confirmación no
requiere desplazar el foco del input. Filas agregadas se reconocen in situ por
cantidad/copy y feedback breve sin desplazamiento.

Alternativa descartada: aplicar el dashboard de la referencia a la caja. Haría
menos eficiente el camino lector → carrito → cobro.

### 5. Tipografía, densidad y color de datos

Títulos de workspace, rótulos de sección, etiquetas de tabla, valores monetarios
y copy auxiliar usan una escala consistente. Los montos y cantidades preservan
las utilidades tabulares existentes; las filas compactas se reservan para datos
comparables. Estado y prioridad combinan texto, badge/icono y color. Los
gráficos conservan la paleta de datos existente y no se recolorean a pasteles.

### 6. Motion contenido

Sólo se conserva motion que conecte navegación, confirme una acción o preserve
orientación. Usa tokens y propiedades compuestas, dura menos de 200 ms en POS
y respeta `prefers-reduced-motion`. No se usan contadores animados, cards que
flotan ni transiciones de salida que retrasen el contenido.

## Mockups for approval

### A. Workspace administrativo (dirección recomendada)

```text
┌──────────── rail ────────────┬──────────────── workspace ───────────────┐
│ Mini Moni                    │ Inventario                 [+ Ajustar]   │
│                              │ Revisá niveles, mínimos y movimientos.   │
│ ● Inventario                 ├───────────┬───────────┬──────────────────┤
│   Productos                  │ Bajo mín. │ Sin inic. │ Total productos  │
│   Compras                    │     8     │     3     │       428        │
│   Ventas                     ├──────────────────────────────────────────┤
│   Reportes                   │ [Buscar producto] [Categoría] [Estado]   │
│                              ├──────────────────────────────────────────┤
│ Perfil · Cerrar sesión       │ Producto     Stock     Mínimo    Estado  │
│                              │ Yerba         6         10      Bajo mín.│
│                              │ Gaseosa       0          0      En cero  │
└──────────────────────────────┴──────────────────────────────────────────┘
```

### B. Caja scan-first (dirección recomendada)

```text
┌──────────── rail ────────────┬──────────── venta ──────────┬─────────────┐
│ Mini Moni                    │ [ Escaneá o buscá producto ] │ Carrito     │
│ ● Caja                       │ Categorías / productos        │ 2 productos │
│   Ventas                     │ ┌──────┐ ┌──────┐ ┌──────┐  │ Gaseosa ×2  │
│                              │ │ item │ │ item │ │ item │  │ $ 3.000,00 │
│                              │ └──────┘ └──────┘ └──────┘  │             │
│                              │                              │ Total       │
│                              │                              │ $ 4.250,00 │
│                              │                              │ [Cobrar]    │
└──────────────────────────────┴──────────────────────────────┴─────────────┘
```

### C. Móvil administrativo

```text
┌──────────────────────────────┐
│ Inventario           [Ajustar]│
│ Revisá niveles y mínimos      │
│ [Bajo mín. 8] [Sin inic. 3]   │
│ [Buscar…]                     │
│ Producto      Stock   Estado  │
│ Yerba           6    Bajo mín.│
│ Gaseosa         0    En cero  │
├──────────────────────────────┤
│  Caja   Stock   Compras  Más  │
└──────────────────────────────┘
```

## Accessibility

- Todo control mantiene nombre accesible, foco visible y objetivo táctil
  suficiente; iconos sin etiqueta visible reciben nombre programático.
- El rail y la navegación móvil preservan el orden de tabulación, el foco de
  apertura/cierre y `aria-current`.
- Tablas mantienen encabezados semánticos, labels explícitos en filtros y una
  alternativa textual a color, iconos y gráficos.
- La interfaz soporta zoom, reflow y `prefers-reduced-motion`; no fija alturas
  que oculten texto, total o controles críticos.

## Keyboard and focus behavior

- POS conserva foco inicial y de retorno en el escáner después de agregar,
  fallar, confirmar o cerrar un diálogo; Tab llega al carrito y cobro sin
  alterar el orden de lectura.
- Listas y tablas preservan activación por Enter cuando ya existe; controles
  secundarios no disparan la fila padre.
- Diálogos mantienen trampa de foco, Esc cuando sean dismissible y retorno al
  trigger; errores de campo llevan el foco al primer campo inválido cuando la
  especificación vigente ya lo exige.

## Responsive behavior

- ≥1280px: rail y workspace; POS en dos regiones principales más carrito.
- 768–1279px: navegación condensada sin overflow y grids reducidos; ningún
  control autorizado queda detrás de scroll horizontal.
- <768px: navegación actual; headers, filtros, KPIs y formularios se apilan;
  tablas conservan acceso mediante su contenedor responsive; POS conserva
  escáner y total visibles/alcanzables sin mouse.

## API contract

Ninguno nuevo ni modificado. Las mismas rutas, roles, mensajes `{ message }`,
tipos, dinero decimal y fechas continúan siendo autoridad.

## Error handling

No cambia la clasificación de errores. `401` redirige según el manejo vigente;
`403` conserva sesión y ofrece retorno; mensajes del backend se muestran
verbatim; fallas de transporte usan el copy normativo. No hay reintentos
automáticos ni éxito asumido.

## Backend coordination

Ninguna. El refactor consume los mismos datos y contratos existentes, por lo
que no requiere `backend-request.md`.

## Risks / Trade-offs

- [Un rail consume ancho] → se usa sólo desde escritorio y se condensa antes
  de generar overflow; móvil conserva navegación actual.
- [Pasteles reducen contraste si se abusan] → se limitan a fondos suaves y se
  verifica contraste de texto/ícono; ninguna señal depende sólo del color.
- [Uniformidad puede borrar prioridades POS] → POS queda explícitamente fuera
  del patrón de dashboard y conserva su foco scan-first.
- [Changes abiertos pueden divergir] → se limita esta planificación a
  primitives y superficies estables; la integración de compras/cierre se
  coordina con sus owners.

## Migration Plan

1. Aprobar esta dirección visual y los mockups.
2. Implementar primero tokens y primitives compatibles, luego shell y por
   último las views por familia, sin cambiar contrato ni ruta.
3. Verificar manualmente cada rol y breakpoint; desplegar como una actualización
   de frontend reversible.

## Rollback

Revertir el deploy/commit de frontend. No hay migración, datos persistidos ni
compatibilidad de backend que revertir.

## Open Questions

Ninguna bloqueante. La única elección visual que queda para la revisión es si
el rail usa el acento actual de Mini Moni o un neutral más marcado; ambas
mantienen tokens y el mismo comportamiento. La recomendación es conservar el
acento actual para mantener continuidad de marca.
