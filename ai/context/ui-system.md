# Sistema de UI

Autoridad de los valores: **`src/app/globals.css`** (bloque `@theme` y las
reglas globales) y los componentes de `src/components/ui/`. Este documento no
copia los tokens: dice cómo se usan y qué está permitido.

Requisitos normativos: `openspec/specs/ui-foundation/spec.md`.

## Tokens

Todos los colores, radios y sombras se declaran en `globals.css` bajo `@theme`
y se consumen como clases de Tailwind: `bg-primary`, `text-text-secondary`,
`border-border`, `bg-surface-2`, `rounded-app`, `shadow-soft`,
`shadow-soft-lg`, los pasteles, `chart-1..4`.

Familias declaradas: base (`primary`, `primary-hover`, `primary-light`,
`secondary`, `secondary-hover`) · pasteles · rampa rose · estado (`success`,
`warning`, `error`, `info`) · fondos (`background`, `surface`, `surface-2`) ·
texto · bordes · datos (`chart-1..4`) · forma (`--radius-app`) · sombras.

Reglas:

- **Sin literales hex en componentes.** Sin `rounded-xl` ni radios sueltos: el
  radio es `rounded-app` (12px). Sin sombras arbitrarias: `shadow-soft` o
  `shadow-soft-lg`.
- `primary` para acciones principales y links; `secondary` para acentos de
  apoyo.
- `success` **sólo** para confirmar una operación exitosa; `error` **sólo** para
  borrar/cancelar/errores; `warning` para alertas (p. ej. stock bajo).
- **Pasteles sólo decorativos**: categorías, badges, cards. Nunca un botón
  primario, y **nunca para codificar un dato en un gráfico**.
- Paleta de datos: una sola serie → `primary`. Dos o más categorías →
  `chart-1..4` en **orden fijo, sin ciclar**. Están validados para contraste y
  para deficiencia de visión de color; no se reemplazan por gusto.
- Tema claro únicamente.
- Dos utilidades tipográficas propias: `.data` (mono tabular: SKU, códigos,
  cantidades) y `.num` (cifras tabulares en la tipografía del cuerpo: dinero y
  conteos).

## Primitives existentes

| Primitive | Archivo | Variantes / API |
|---|---|---|
| `Button` | `ui/Button.tsx` | `variant: primary \| secondary \| danger \| ghost`; `pending` (deshabilita y muestra spinner **después** de `MOTION.spinnerDelay`); `pendingImmediate` (spinner sin umbral, reservado a la confirmación de venta) |
| `Input` | `ui/Input.tsx` | `label`, `error`; reenvía `ref` para manejo de foco (el POS lo necesita); `id` autogenerado con `useId` y asociado al `<label>` |
| `Select` | `ui/Input.tsx` | `label`, `error`; mismo `fieldClass` que `Input` |
| `Card` | `ui/Card.tsx` | `rounded-app border border-border bg-surface p-6 shadow-soft` |
| `Badge` + `pastelFor(id)` | `ui/Badge.tsx` | `tone: pastel-* \| success \| warning \| error \| info \| neutral`; `pastelFor` da un pastel estable por id de entidad |
| `Table`, `Th`, `Td` | `ui/Table.tsx` | contenedor con scroll + estilo de encabezado y celda |
| `Dialog` | `ui/Dialog.tsx` | `<dialog>` nativo + `showModal()`; cierra por Esc (`onCancel`) y por click en el backdrop; recibe `open`, `title`, `onClose` y `dismissible` (por defecto `true`) para bloquear ambos cierres mientras una acción está pendiente |
| `Toast` | `ui/Toast.tsx` | `ToastProvider` (montado en `(app)/layout.tsx`) + `useToast()` → `toast("success" \| "error" \| "warning" \| "info", "…")`, autodescarte a los 4s |
| `Spinner` | `ui/Spinner.tsx` | `className` para color/tamaño |
| Estados | `ui/states.tsx` | `LoadingState`, `Skeleton`, `ListSkeleton({ rows })`, `EmptyState({ message, action })`, `ErrorState({ error, onRetry })` |

## Cuándo extender un primitive

**Estilo ad-hoc en una pantalla es un defecto.** Si a un primitive le falta una
variante:

1. Agregá la variante **en el primitive** (una entrada más en su mapa de
   variantes o tonos), no una clase suelta en la pantalla.
2. Si la necesidad es un caso único e irrepetible de layout (un ancho, un
   `grid`), pasalo por `className` — todos los primitives lo aceptan y lo
   concatenan al final. Eso es composición, no restyling.
3. Si el componente nuevo es una composición de primitives que se repite (como
   `ReportNavCard`), vive en `components/<feature>/`, no en `ui/`.
4. `ui/` no importa de `components/<feature>/` ni conoce ningún dominio.

## Estados de pantalla

El triángulo carga → vacío → error es obligatorio para el dato principal de
toda pantalla, en ese orden de render (ver `frontend-conventions.md`).

- **Carga**: `ListSkeleton` para listas y tablas, `Skeleton` para bloques
  puntuales, `LoadingState` para una espera centrada.
- **Vacío**: `EmptyState` **invita a la acción principal** (`action` con el
  botón que corresponda), no sólo informa.
- **Error**: `ErrorState` muestra el `message` del backend y elige la acción de
  recuperación según `error.kind` — `forbidden` → "Volver", `unauthorized` →
  "Iniciar sesión", el resto → "Reintentar" (si hay `onRetry`). Tiene
  `role="alert"`.

## Accesibilidad

- **Foco visible global**: `:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px }`
  en `globals.css`. No se quita en ningún componente.
- Recorrido completo por teclado, incluidos los diálogos (`<dialog>` nativo ya
  aporta trampa de foco y cierre por Esc).
- Estado nunca comunicado sólo por color: el badge lleva texto.
- Etiquetas asociadas por `id`/`htmlFor` en `Input` y `Select`; los skeletons
  llevan `role="status"` / `aria-hidden` según corresponda.
- Responsive hasta ancho de móvil: el layout autenticado y `Nav` ya tienen
  variantes `md:`; el resto de las pantallas debe seguir usable en móvil.

## Motion

- Tres duraciones y dos curvas, declaradas en `:root` (`--motion-fast`,
  `--motion-base`, `--motion-slow`, `--ease-out`, `--ease-standard`) y
  espejadas en `lib/motion.ts` (`MOTION.fast/base/slow`). **Ningún valor
  literal de ms fuera de ahí.**
- `MOTION.spinnerDelay` (400ms) es el umbral antes de mostrar el spinner de un
  botón pendiente: evita el parpadeo en respuestas rápidas. Se saltea sólo con
  `pendingImmediate`, reservado a la confirmación de venta.
- Animaciones definidas: `.flash` (línea del carrito), `.total-flash`,
  `.pop-in`, `.section-enter`.
- **`prefers-reduced-motion`**: `.pop-in` y `.section-enter` degradan a un fade
  corto. `.flash` sobrevive sin cambios **a propósito** — es color, no
  movimiento, y es la señal con la que el cajero confirma un escaneo.

## Copy de acciones y confirmaciones

- Español rioplatense, sentence case, voz activa.
- El nombre de la acción y su confirmación coinciden: "Confirmar venta" →
  "Venta confirmada"; "Crear producto" → "Producto creado"; "Registrar
  devolución" → "Devolución registrada".
- Los toasts **confirman éxito**. Un error de campo va inline bajo el campo
  (`Input error`), nunca en un toast.
- Una acción destructiva se confirma en un `Dialog` que nombra la entidad y
  dice si es reversible (p. ej. la desactivación de usuario no se puede
  deshacer desde la app, y hay que decirlo).
