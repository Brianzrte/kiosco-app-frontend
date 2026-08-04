## Why

El buscador manual del POS (nombre/SKU, dentro de `ScanOmnibox`) carga una
sola vez el catálogo completo con `GET /products?limit=100` y busca sobre esa
copia cacheada en el cliente. El backend fuerza `maxLimit = 100` por página, y
`ORDER BY name` es el orden usado tanto por el backend como por el filtro
local. En un kiosco con más de 100 productos activos, cualquier producto a
partir del puesto 101 en orden alfabético queda permanentemente invisible
para ese buscador — sin ningún aviso al cajero de que la lista está
incompleta — mientras el escaneo por código de barras (que no depende de este
catálogo cacheado) sigue funcionando bien. Esto puede llevar a que un cajero
no encuentre un producto que sí existe y está activo, y tenga que recurrir a
otro flujo o abandonar la venta de ese ítem.

## What Changes

- El buscador manual del POS deja de depender del catálogo cacheado con
  `limit=100` y pasa a resolver cada término contra el backend con
  `GET /products?q=<término>&active=true&limit=<n>`, el mismo endpoint que ya
  usan `ProductsView.tsx` e `InventoryView.tsx` para búsqueda server-side.
- Se agrega debounce a la búsqueda manual del POS (siguiendo el precedente de
  `InventoryView.tsx`, ~300 ms) para no disparar una consulta por cada tecla.
- Se preserva el comportamiento observable actual: mismos textos de "Buscando…"
  y "Ningún producto activo coincide con…", mismo máximo de 8 resultados
  visibles, misma navegación por teclado, mismo retorno de foco al input de
  escaneo tras elegir un resultado, y misma prioridad de mensajes de estado en
  la región de entrada (`resolveEntryStatus`).
- Se agrega manejo explícito de respuestas fuera de orden: si el cajero sigue
  tipeando mientras una consulta anterior sigue en vuelo, una respuesta tardía
  de un término viejo no debe reemplazar los resultados de un término más
  nuevo (condición de carrera que hoy no existe porque el filtro es
  client-side e instantáneo).
- Se elimina la carga completa del catálogo (`loadCatalog()` con
  `?limit=100` sin `q`) y el estado `catalog`/`catalogRequested` asociado,
  ya sin otro consumidor.
- **Fuera de alcance:** el flujo de escaneo por código de barras (`scan()`,
  `GET /products/barcode/{barcode}`) no cambia. No se sube ni cambia el
  límite visible de 8 resultados. No se agregan filtros nuevos (categoría,
  etc.) al buscador del POS. No hay cambios de contrato ni de reglas de
  negocio en el backend.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `ui-pos`: se agrega un requirement nuevo sobre el origen de datos del
  buscador manual de productos (hoy la spec no cubre de dónde salen los
  resultados de ese buscador, sólo el escaneo, el carrito, el pago y la
  confirmación).

## Impact

- Affected code: `src/components/pos/PosView.tsx` (`loadCatalog`,
  `searchResults`, `catalog`/`catalogRequested`, el callback
  `onSearchTermChange` que hoy dispara `loadCatalog()`).
- Posiblemente `src/components/pos/ScanOmnibox.tsx`, sólo si el debounce o el
  disparo de la consulta terminan viviendo ahí en vez de en `PosView.tsx`; su
  contrato de props (`searchTerm`, `searchResults: Product[]`,
  `onSearchTermChange`) no necesita cambiar.
- Posible módulo nuevo o extensión de `src/lib/` para armar el query string
  de búsqueda (`q`, `active`, `limit`) y para decidir si una respuesta en
  vuelo debe descartarse por pertenecer a un término ya superado — ambas
  cosas puras y testeables, siguiendo el patrón de `lib/inventory.ts`
  (`buildStockQuery`) y `lib/salesSummary.ts` (`buildSummaryQuery`).
- No afecta rutas, roles, ni el escaneo por código de barras.
- No afecta backend: `GET /products` ya soporta `q`, `active` y paginación en
  producción; no se requiere `backend-request.md`.
- Secuenciación: `PosView.tsx` tiene trabajo en curso no relacionado
  (`add-frontend-weighable-stock-tracking`,
  `remove-frontend-pos-stock-shortcut`) cerca de la región tocada por este
  change, sin solaparse literalmente hoy. La implementación de este change
  debería ubicarse después de que ese otro trabajo se consolide, para evitar
  conflictos de merge innecesarios; el orden exacto es una decisión de
  planificación fuera del alcance de este documento.
