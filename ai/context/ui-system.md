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

Familias declaradas: base (`primary`, `primary-hover`, `primary-active`,
`primary-light`, `secondary`, `secondary-hover`) · pasteles · paleta de pago
(`payment-cash`, `payment-card`, `payment-transfer`, `confirm-sale`) · estado
(`success`, `warning`, `error`, `info`) · fondos (`background`, `surface`,
`surface-subtle`, `surface-2`, `surface-hover`, `surface-raised`) · texto
(`text-primary`, `text-secondary`, `text-muted`, `text-disabled`,
`text-inverse`) · bordes (`border`, `border-hover`, `border-strong`) · datos
(`chart-1..4`) · forma (`--radius-app`, `--radius-tight`) · sombras.

Marca: acento violeta (`primary #7c3aed`), no la paleta rose/mauve anterior —
si un documento o memoria menciona `#9c566c`/`#85485c`/mauve, está
desactualizado, gana este archivo y el código.

Reglas:

- **Sin literales hex en componentes.** Sin `rounded-xl` ni radios sueltos: el
  radio es `rounded-app` (12px), o `--radius-tight` (8px) sólo para chips/tiles
  inline compactos, nunca para un control primario clickeable. Sin sombras
  arbitrarias: `shadow-soft` o `shadow-soft-lg`.
- `primary` para acciones principales y links, con `primary-hover`/
  `primary-active` en sus estados de interacción; `secondary` para acentos de
  apoyo.
- `success` **sólo** para confirmar una operación exitosa; `error` **sólo** para
  borrar/cancelar/errores; `warning` para alertas (p. ej. stock bajo).
- **Pasteles sólo decorativos**: categorías, badges, cards. Nunca un botón
  primario, y **nunca para codificar un dato en un gráfico**.
- **Paleta de pago** (`payment-cash`, `payment-card`, `payment-transfer`,
  `confirm-sale`): tonos mudos/desaturados, exclusivos de los chips de método
  de pago y la acción de confirmar venta en `PosView`. No es intercambiable con
  `success` (confirmación genérica de operación) ni con los pasteles
  decorativos (categorías/badges) — son tres sistemas de color distintos con
  roles distintos, aunque compartan familia de tono.
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
| `Button` | `ui/Button.tsx` | `variant: primary \| secondary \| danger \| ghost`; `pending` (deshabilita y muestra spinner **después** de `MOTION.spinnerDelay`); `pendingImmediate` (spinner sin umbral, reservado a la confirmación de venta); reenvía `ref` (`forwardRef`) para foco programático |
| `Input` | `ui/Input.tsx` | `label`, `error`, `icon` (decorativo, `aria-hidden`, prefijo), `endAdornment` (control interactivo real al final del campo, p. ej. el toggle mostrar/ocultar contraseña — a diferencia de `icon` no lleva `aria-hidden`); reenvía `ref` para manejo de foco (el POS lo necesita); `id` autogenerado con `useId` y asociado al `<label>` |
| `Select` | `ui/Input.tsx` | `label`, `error`; mismo `fieldClass` que `Input` |
| `Card` | `ui/Card.tsx` | `rounded-app border border-border bg-surface p-6 shadow-soft` |
| `Badge` + `pastelFor(id)` | `ui/Badge.tsx` | `tone: pastel-* \| success \| warning \| error \| info \| neutral`; `pastelFor` da un pastel estable por id de entidad; el tipo `Tone` está exportado para tipar props de consumidores |
| `Table`, `Th`, `Td` | `ui/Table.tsx` | contenedor con scroll + estilo de encabezado y celda |
| `Dialog` | `ui/Dialog.tsx` | `<dialog>` nativo + `showModal()`; cierra por Esc (`onCancel`) y por click en el backdrop; recibe `open`, `title`, `onClose` y `dismissible` (por defecto `true`) para bloquear ambos cierres mientras una acción está pendiente |
| `Toast` | `ui/Toast.tsx` | `ToastProvider` (montado en `(app)/layout.tsx`) + `useToast()` → `toast("success" \| "error" \| "warning" \| "info", "…")`, autodescarte a los 4s |
| `Spinner` | `ui/Spinner.tsx` | `className` para color/tamaño |
| Estados | `ui/states.tsx` | `LoadingState`, `Skeleton`, `ListSkeleton({ rows })`, `EmptyState({ message, action })`, `ErrorState({ error, onRetry })` |
| Iconos | `ui/icons.tsx` | Set propio de ~28 SVG inline (`IconCart`, `IconHistory`, `IconBox`, `IconSearch`, `IconCash`, `IconTrash`, `IconEye`/`IconEyeOff`, etc.), un único wrapper `Icon` interno: `viewBox 0 0 24 24`, `stroke 1.75`, `round` caps/joins, `aria-hidden` + `focusable="false"` por defecto. No se agregó (ni se agrega) una librería de iconos: este archivo **es** el sistema de iconos del proyecto — antes de dibujar un SVG nuevo en una pantalla, revisar si ya existe acá. Ver `ai/skills/ux-ui-supervisor/references/iconography.md`. |

## Jerarquía de subtítulos

Los `<h2>` siguen tres niveles según su contexto: un dashboard o reporte denso
usa `text-xs font-semibold uppercase tracking-wide text-text-muted` como
eyebrow; una subsección de detalle usa `text-sm font-medium text-text-secondary`;
el título principal de un diálogo modal usa `text-lg font-semibold`.

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
  `.pop-in` (splash de confirmación de venta), `.section-enter`,
  `.confirm-ready` (pulso cuando el botón de confirmar venta pasa de
  deshabilitado a habilitado), `.check-draw` (tilde de venta confirmada,
  `stroke-dashoffset` sobre un `<path pathLength="1">`), `.aurora-blob`
  (ambiente decorativo, **único uso permitido fuera de `/login`: no**; ver
  nota en `globals.css`).
- **`prefers-reduced-motion`**: `.pop-in` y `.section-enter` degradan a un fade
  corto; `.confirm-ready`, `.check-draw` y `.aurora-blob` se eliminan por
  completo (la señal ya no depende del movimiento — color de botón / texto
  `aria-live` en cada caso). `.flash` sobrevive sin cambios **a propósito** —
  es color, no movimiento, y es la señal con la que el cajero confirma un
  escaneo.

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
