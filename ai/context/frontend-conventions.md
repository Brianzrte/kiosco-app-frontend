# Convenciones del frontend

Reglas extraídas del código actual. Están separadas en tres niveles: lo que el
código cumple **sin excepciones** (o exige una fuente normativa), lo que es
**patrón habitual** (mayoritario pero no universal — seguilo salvo motivo), y
las **excepciones documentadas**. Un ejemplo aislado no es una regla.

Tokens y primitives: `ui-system.md`. Fetching y errores: `api-contract.md`.

---

## 1. Reglas obligatorias

### Estructura y nombres

- Tres capas sin excepción: `page.tsx` fino → `XView.tsx` cliente → `lib/*.ts`
  puro (ver `architecture.md`).
- **Archivos e identificadores en inglés.** Componentes en `PascalCase.tsx`,
  libs en `camelCase.ts`, tests colocados como `<lib>.test.ts`.
- Sufijos de componente: `XView.tsx` para una pantalla, `XForm.tsx` para un
  formulario reutilizado en alta y edición, `XDetail.tsx` / `XDetailView.tsx`
  para un detalle. Los subcomponentes de un área viven en
  `src/components/<feature>/`, y los gráficos en `components/reports/charts/`.
- Cada `page.tsx` empieza con `await requireRole([...])`. Si la página necesita
  el rol o el usuario, usa el `Session` que devuelve y lo pasa por props
  (`<ProductDetail id={id} role={session.role} />`).
- Toda ruta nueva agrega su entrada en `NAV_ITEMS` (`lib/nav.ts`).
- **Todo tipo nuevo de respuesta del backend debe vivir en `lib/types.ts`.** No
  se declaran shapes de transporte dentro de un componente. Es contrato para
  trabajo nuevo aunque el código tenga divergencias heredadas listadas abajo.
- La matemática de negocio no vive en una view. Si se puede calcular sin React,
  va a `lib/` con su test.

### Datos

- El cliente nunca llama al backend directo: siempre `api<T>()`.
- El fetcher de `useLoad()` **debe ser referencialmente estable** (`useCallback`).
  Peticiones paralelas: un solo fetcher con `Promise.all`, no dos `useLoad`.
- Después de una mutación exitosa se llama `reload()`. No hay caché que
  invalidar.
- Toda pantalla con datos maneja **carga, vacío y error** de forma explícita.
  El orden de render es fijo:

  ```tsx
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <ListSkeleton />;
  if (data.items.length === 0) return <EmptyState message="…" action={…} />;
  ```

- Los agregados los calcula el backend. En el cliente sólo se permite *display
  shaping*, y vive en `lib/reports.ts`.

### Dinero

- El dinero es **string decimal** (`"12.50"`) de punta a punta. Nunca
  `parseFloat`, nunca sumar con `+`.
- Aritmética por `toCents` / `fromCents`; display **siempre** por `formatMoney`
  (`lib/money.ts`), que emite formato argentino: `"1200.50"` → `$ 1.200,50`.
  No se interpola un monto crudo en la UI.

### Fechas

- Los rangos de reporte son strings `"YYYY-MM-DD"`. Se manipulan con `addDays`
  y los helpers de `lib/reports.ts`, que usan `Date.UTC` como calculadora de
  calendario, nunca como conversión de zona horaria.
- No se construye `new Date("YYYY-MM-DD")` dentro de una view.
- Los timestamps RFC3339 se muestran con `Intl.DateTimeFormat("es-AR", …)`.

### Copy

- **Todo texto de usuario en español rioplatense** ("Revisá", "Volvé a
  intentar"), sentence case, voz activa. Código, comentarios e identificadores
  en inglés.
- El nombre de la acción y su confirmación coinciden: botón "Confirmar venta" →
  toast "Venta confirmada"; "Crear usuario" → "Usuario creado".
- El mensaje de error del backend se muestra tal cual
  (`(e as ApiError).message`). No se reescribe ni se inventa copy para un fallo
  que el backend ya explicó, ni se agregan reglas de validación que el backend
  no impone.

### Errores en formularios

- Error de campo → **inline, cerca del campo** (`Input error={…}` o un
  `formError` local). Los toasts confirman éxito; **no** reportan errores de
  campo.
- El submit se deshabilita mientras hay una petición en vuelo
  (`<Button pending={pending}>`).

### Gating por rol

- `requireRole()` en la página y `NAV_ITEMS` en la navegación son **UX**. La
  autoridad es el backend. La UI nunca decide una regla de negocio que el
  backend posee. Detalle: `roles-and-navigation.md`.

### Motion y estilo

- Las duraciones salen de `lib/motion.ts` o de las variables `--motion-*`.
  **Ningún valor literal de ms fuera de ahí.**
- Sin literales hex, sin `rounded-xl`, sin sombras arbitrarias: sólo tokens.

---

## 2. Patrones habituales

Mayoritarios en el código. Seguilos salvo que la pantalla pida otra cosa, y
en ese caso dejá el motivo en un comentario.

- **Formularios controlados**: un `useState` por campo, más `pending` y
  `formError` locales. Sin librería de formularios, sin `useReducer`.
  El `try/catch` alrededor de `api()` hace, en éxito, `toast("success", …)` y
  después `reload()` o `router.push(...)`; en fallo,
  `setFormError((e as ApiError).message)`.
- **Navegación después de una mutación que cambia de pantalla**:
  `router.push("/destino")` seguido de `router.refresh()`. El `refresh()` está
  porque el layout y los guards son server components y hay que revalidarlos
  (`ProductForm`, `UserForm`, `ProductDetail`, `UserDetailView`, `LoginForm`,
  `Nav.logout`). Una mutación que se queda en la misma pantalla usa `reload()`
  y no toca el router.
- **Filtros**: estado local + `useCallback` con esos filtros como deps para
  refetchear. Al cambiar un filtro se vuelve `page` a 1.
- Los query strings se arman en `lib/` (`buildStockQuery`,
  `buildMovementsQuery`, `buildSummaryQuery`) o con `URLSearchParams` en la
  view cuando los parámetros son opcionales.
- **Paginación de servidor** con `computeTotalPages` (`lib/pagination.ts`);
  filtrado en cliente con `useMemo` es aceptable a escala de kiosco.
- `limit=100` para poblar un selector (categorías, cajeros): no es una lista
  paginada y a escala de kiosco entra en una página. Se deja anotado.
- **Confirmación de acciones destructivas** con `Dialog`, nombrando la entidad
  y diciendo si es reversible.
- Comentarios escasos y explicando el *porqué* (una elección de `limit`, una
  decisión de zona horaria, un `403` esperado), a menudo citando el id del
  change. Algunos comentarios existentes están en español; el default para
  código nuevo es inglés.

---

## 3. Excepciones documentadas

- **`page.tsx` con maquetado**: `products/new/page.tsx` y `users/new/page.tsx`
  agregan título y link de vuelta alrededor del formulario. Es layout estático,
  no lógica ni fetching. No amplía el permiso de la capa.
- **`fetch` directo fuera de `api()`**: sólo contra las rutas propias del
  frontend — `LoginForm` y `Nav.logout` contra `/api/session`. Nunca contra el
  backend.
- **`SalesView` no pide `/users` cuando el rol es `cashier`**: el fetcher
  devuelve `Promise.resolve([])`. Es evitar un `403` esperado, no un gating de
  negocio.
- **`useLoad` sin `error`/`reload`**: algunas cargas secundarias que sólo
  alimentan un selector desestructuran únicamente `data` (`suppliers` en
  `PurchasesReportView`, `users` en `SalesView`, `products` en el panel de
  movimientos). El triángulo carga/vacío/error sigue siendo obligatorio para el
  dato **principal** de la pantalla.
- **`InventoryView.tsx` concentra varias sub-pantallas** (listado, ajuste,
  mínimo, movimientos) en un archivo. Es tamaño heredado, no un patrón a
  imitar: lo nuevo se saca a `lib/` o a un componente aparte.
- **`api.test.ts` testea un módulo no puro**: `lib/api.ts` se prueba con un
  `fetch` fakeado. Es la excepción a "sólo funciones puras se testean" — ver
  `testing.md`.
- **DTOs inline en reportes**: `ReportsView`, `SalesReportView`,
  `ProductsReportView`, `PurchasesReportView` e `InventoryValuationView`
  declaran hoy varios response shapes dentro del componente. Contradice la
  regla de tipos centralizados y no es un patrón a copiar; corregirlo requiere
  un change de producto/arquitectura acotado, no una edición documental.
