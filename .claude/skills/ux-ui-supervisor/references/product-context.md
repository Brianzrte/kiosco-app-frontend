# Contexto de producto — Mini Moni

Lo que este skill necesita saber del proyecto para no recomendar en el vacío.
Es **descriptivo**: si contradice el código, gana el código
(`ai/README.md`). Los valores exactos viven en `src/app/globals.css` y
`src/components/ui/`; acá se documenta cómo se usan desde una decisión de
diseño.

## Qué es el producto

Punto de venta e inventario de un kiosco de **una sola sucursal**, operado por
1 a 5 personas. No es un SaaS multi-tenant, no hay onboarding, no hay
marketing dentro de la app. Todos los usuarios están entrenados y usan la misma
pantalla decenas o cientos de veces por día.

Consecuencia de diseño: **el producto se optimiza para el uso número 500, no
para el primero.** Nada de tours, nada de tooltips explicando lo obvio, nada de
expresividad visual que se vuelva ruido con la repetición.

## Stack y límites duros

- Next.js 16 App Router + React 19, TypeScript strict, Tailwind v4, Vitest.
- **Dependencias de runtime: `next`, `react`, `react-dom`. Nada más.** Agregar
  una es una decisión que se levanta al usuario y se registra en el `design.md`
  de un change (`AGENTS.md` §5). Este skill **nunca** recomienda instalar una
  librería de UI, de formularios, de iconos, de gráficos ni de animación.
- **No hay librería de iconos.** Los únicos SVG del repo son los gráficos de
  `components/reports/charts/`. Ver `iconography.md`.
- **No hay tests de componente**: no hay jsdom, ni Testing Library, ni
  Playwright. Todo lo visual, de foco, de teclado y de responsive se verifica
  **manualmente** y se reporta como tal. Un criterio de aceptación visual se
  redacta para que una persona lo ejecute a mano.
- **Tema claro únicamente.** Las reglas de dark mode de `color-system.md` son
  referencia para no cerrarse la puerta, no trabajo pendiente.

## Arquitectura que condiciona el diseño

Tres capas sin excepción (`ai/context/architecture.md`):

```
page.tsx (server, requireRole)  →  XView.tsx (client: fetch, estado, layout)  →  lib/*.ts (puro, testeado)
```

Para el supervisor esto significa:

- **La matemática de un total, un subtotal o un agregado no vive en la view.**
  Si un hallazgo pide calcular algo, el cálculo va a `lib/` con su test. Eso lo
  vuelve verificable automáticamente aunque la UI no lo sea.
- Los estados de pantalla tienen **orden de render fijo**:
  `error → loading → empty → datos`. Un hallazgo de estados se redacta contra
  ese orden.
- El gating por rol (`requireRole`, `NAV_ITEMS`) es **UX**, no seguridad. Nunca
  recomendar ocultar algo "por seguridad": la autoridad es el backend.

## Design system vigente

Autoridad: `src/app/globals.css` (`@theme`) + `src/components/ui/`.
Detalle en `ai/context/ui-system.md`. Resumen para decidir:

- **Paleta de marca**: mauve/rose. `primary #9c566c` y `primary-hover #85485c`
  son derivados oscurecidos de `secondary #c08497` justamente para sostener
  texto blanco en AA.
- **Pasteles** (`pastel-pink/peach/yellow/green/blue`): decorativos. Categorías,
  badges, cards. **Nunca** un botón primario, **nunca** para codificar un dato
  en un gráfico.
- **Paleta de datos** `chart-1..4`: orden fijo, sin ciclar, validada para
  contraste y CVD. Una sola serie usa `primary`.
- **Estado**: `success` sólo para confirmar éxito, `error` sólo para
  borrar/cancelar/errores, `warning` para alertas (stock bajo), `info` para
  neutro.
- **Forma**: un solo radio, `rounded-app` (12 px). Dos sombras: `shadow-soft`,
  `shadow-soft-lg`. Sin hex sueltos, sin `rounded-xl`, sin sombras arbitrarias.
- **Tipografía**: Geist Sans + Geist Mono, ya configuradas en `app/layout.tsx`.
  Dos utilidades propias: `.data` (mono tabular: SKU, códigos, cantidades) y
  `.num` (cifras tabulares en la tipografía del cuerpo: dinero y conteos).
- **Motion**: tres duraciones (`--motion-fast` 120, `--motion-base` 200,
  `--motion-slow` 320) y dos curvas, espejadas en `lib/motion.ts`. **Ningún ms
  literal fuera de ahí.**

## Primitives disponibles

`Button` (primary/secondary/danger/ghost, `pending`, `pendingImmediate`) ·
`Input` y `Select` (`label`, `error`, reenvían `ref`) · `Card` · `Badge` +
`pastelFor(id)` · `Table`/`Th`/`Td` · `Dialog` (`<dialog>` nativo, Esc y
backdrop, `dismissible`) · `Toast` + `useToast()` · `Spinner` ·
`LoadingState`, `Skeleton`, `ListSkeleton`, `EmptyState`, `ErrorState`.

**Regla de reutilización** (`ui-system.md`): estilo ad-hoc en una pantalla es un
defecto. Si falta una variante, se agrega **en el primitive**. Un layout único
se pasa por `className`. Una composición que se repite vive en
`components/<feature>/`, no en `ui/`.

Antes de proponer un componente nuevo, el supervisor comprueba que ninguno de
los de arriba resuelve el caso, y lo dice explícitamente en
`## New components`.

## Copy

Español rioplatense, sentence case, voz activa. El nombre de la acción y su
confirmación coinciden. El mensaje de error del backend se muestra **tal cual**;
no se reescribe ni se inventan reglas de validación que el backend no impone.

Un hallazgo de copy nunca propone reescribir un mensaje que vino del backend:
propone dónde y cómo mostrarlo.

## Superficie de pantallas y su perfil

| Ruta | Perfil | Notas de diseño |
|---|---|---|
| `/pos` | `operational-pos` | Perfil más exigente. Ver `pos-patterns.md`. |
| `/sales`, `/sales/[id]` | SaaS admin + tabla | Consulta, no operación. |
| `/products`, `/products/[id]`, `/products/new` | SaaS admin + formulario | |
| `/categories` | SaaS admin | |
| `/inventory` | SaaS admin + tabla | Concentra sub-pantallas; tamaño heredado. |
| `/receiving`, `/receiving/[id]` | SaaS admin + formulario | |
| `/reports`, `/reports/*` | Reporte / dashboard | Densidad alta, motion nulo. |
| `/users`, `/users/[id]`, `/users/new` | SaaS admin + formulario | |
| `/login` | Formulario | Única pantalla sin shell. |

## Integración con OpenSpec

OpenSpec es normativo (`ai/context/openspec-workflow.md`). Cuando este skill
trabaja sobre una feature con change activo:

1. **Leer** `openspec/changes/<id>/proposal.md`, `design.md`, los delta specs de
   las capabilities `ui-*` afectadas y `tasks.md`.
2. **Respetar `design.md`.** Contiene decisiones ya tomadas con sus alternativas
   descartadas. Reabrirlas es reabrir algo cerrado. Si una decisión es inviable
   desde UX, se dice explícitamente y se propone actualizar el change — no se
   propone otra cosa en silencio.
3. **Identificar criterios visuales incompletos** en los delta specs: un
   `Scenario` que describe el happy path pero no dice qué se ve en loading,
   vacío, error o en 1024 × 768.
4. **Proponer criterios de aceptación verificables**, redactados en el mismo
   formato `Requirement` / `Scenario` que ya usa el change, para que el writer
   los incorpore.
5. **Reportar contradicciones** entre spec e implementación. No resolverlas en
   silencio: es una inconsistencia real que se reporta
   (`ai/context/openspec-workflow.md`).

### Dónde escribir

Dentro de la carpeta del change, con el resto de sus artefactos:

```
openspec/changes/<id>/ux-ui-review.md      # salida de audit o pre-merge
openspec/changes/<id>/design-spec.md       # salida de design, si el usuario la pide persistida
```

Sólo se escribe un archivo si el usuario lo pide. Por defecto la salida va en la
respuesta. **No** se crea una estructura paralela: los artefactos del change son
`proposal.md`, `design.md`, `specs/`, `tasks.md` y `backend-request.md`, y estos
dos documentos se suman a esa carpeta, no a otra.

### Lo que este skill no hace en OpenSpec

No escribe `proposal.md` ni delta specs (eso es `openspec-writer`), no marca
checkboxes en `tasks.md`, no sincroniza specs, no archiva changes y no hace
commit. El cierre es de `ai/roles/change-closer.md`.
