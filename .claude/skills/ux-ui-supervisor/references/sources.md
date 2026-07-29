# Fuentes

Este skill se apoya en documentación oficial y fuentes primarias. Cuando un
hallazgo cita un principio, cita **de acá**.

## Normative standards

Obligatorio. Un incumplimiento es un defecto, no una opinión.

| Fuente | Para qué |
|---|---|
| **W3C — WCAG 2.2** · `w3.org/TR/WCAG22/` | Criterios de conformidad. Nivel AA es el objetivo |
| **W3C — Understanding WCAG 2.2** · `w3.org/WAI/WCAG22/Understanding/` | Qué significa cada criterio y cómo se prueba |
| **W3C — WAI-ARIA 1.2** · `w3.org/TR/wai-aria-1.2/` | Roles, estados y propiedades ARIA |
| **W3C — ARIA Authoring Practices Guide (APG)** · `w3.org/WAI/ARIA/apg/` | Patrones de teclado por componente: combobox, menú, tabs, grid, dialog |
| **WHATWG HTML Living Standard** · `html.spec.whatwg.org` | Semántica nativa, `<dialog>`, formularios, autocomplete |

Criterios de WCAG 2.2 más citados en este skill: 1.3.1 · 1.4.1 · 1.4.3 · 1.4.4 ·
1.4.10 · 1.4.11 · 1.4.13 · 2.1.1 · 2.1.2 · 2.1.4 · 2.2.2 · 2.3.3 · 2.4.3 ·
2.4.7 · 2.4.11 · 2.5.3 · 2.5.8 · 3.3.1 · 3.3.2 · 3.3.3 · 4.1.2 · 4.1.3.

## Design-system guidance

Orientativo. Son decisiones de otros productos con su razonamiento explícito:
sirven como referencia y comparación, **no** como norma. Se usan sobre todo en
modo `benchmark`.

| Fuente | Fuerte en |
|---|---|
| **Material Design 3** · `m3.material.io` | Tokens, escalas tipográficas, densidad, motion, sistema de color |
| **Microsoft Fluent 2** · `fluent2.microsoft.design` | Interfaces densas de productividad, tablas, teclado |
| **Apple Human Interface Guidelines** · `developer.apple.com/design/human-interface-guidelines` | Touch targets, jerarquía, claridad, plataformas |
| **Atlassian Design System** · `atlassian.design` | SaaS administrativo, patrones de formulario, mensajería de error |
| **IBM Carbon Design System** · `carbondesignsystem.com` | Tablas de datos, grids, patrones empresariales, tokens |
| **GOV.UK Design System** · `design-system.service.gov.uk` | Formularios, mensajes de error, lenguaje llano, accesibilidad probada con usuarios |
| **Shopify Polaris** · `polaris.shopify.com` | Comercio, listados de productos, cards de recurso |

**GOV.UK merece una mención aparte**: sus patrones de formulario y sus mensajes
de error están validados con investigación de usuarios publicada, incluyendo
usuarios con discapacidad. Para formularios es la referencia más fuerte de esta
lista.

## Usability research

Evidencia sobre comportamiento humano. Es lo que sostiene un "impacto" en un
hallazgo.

| Fuente | Para qué |
|---|---|
| **Nielsen Norman Group** · `nngroup.com` | Heurísticas de usabilidad, investigación de patrones, escaneo, formularios |
| **Baymard Institute** · `baymard.com/research` | Investigación de checkout y e-commerce (parcialmente de pago) |
| **10 heurísticas de Nielsen** | Marco de referencia para clasificar un problema de usabilidad |
| **Ley de Fitts, ley de Hick** | Modelos cuantitativos de tiempo de adquisición y de decisión |

## Browser and performance guidance

| Fuente | Para qué |
|---|---|
| **web.dev** · `web.dev` | Core Web Vitals (LCP, INP, CLS), patrones de performance |
| **MDN Web Docs** · `developer.mozilla.org` | Referencia de CSS, HTML, ARIA y APIs del navegador |
| **Chrome DevTools docs** · `developer.chrome.com/docs/devtools` | Cómo medir: contraste, layout shift, performance, emulación de visión |
| **Next.js docs** · `nextjs.org/docs` | `next/font`, `next/image`, App Router, prefetch, Server/Client Components, `next/dynamic` |
| **Tailwind CSS docs** · `tailwindcss.com/docs` | `@theme`, container queries, breakpoints |
| **React docs** · `react.dev` | Foco, refs, transiciones, comportamiento de render |
| **Motion for React docs** · `motion.dev/docs/react` | API de `motion/react`: `AnimatePresence`, `layout`, `MotionConfig`, variants, gestos |
| **Motion — Accessibility** · `motion.dev/docs/react-accessibility` | `useReducedMotion`, `reducedMotion="user"`, patrones de movimiento accesible |
| **Motion — `LazyMotion`** · `motion.dev/docs/react-lazy-motion` | Carga diferida, `domAnimation`, uso de `m` vs `motion` |
| **Motion — Layout animations** · `motion.dev/docs/react-layout-animations` | La prop `layout`, `layoutId`, animación de listas |
| **FormKit AutoAnimate docs** · `auto-animate.formkit.com` | API de `useAutoAnimate`, opciones de configuración, límites documentados. No confundir con Formik — son proyectos distintos |

## Fuentes que no constituyen evidencia

**No se basa una regla en:**

- Dribbble.
- Pinterest.
- Behance.
- Listas de "tendencias de diseño 2026".
- Blogs sin fuente ni metodología.
- Opiniones de influencers de diseño.
- Capturas de otro producto sin acceso a su razonamiento.

Pueden inspirar una exploración visual o mostrar que algo es posible. **No
prueban que algo funcione**, y no se citan como justificación de un hallazgo.

Motivo concreto: esas fuentes premian lo que se ve bien en una imagen estática,
no lo que funciona en el uso número 500 con datos reales, estados de error y un
usuario apurado. Es exactamente el sesgo que un supervisor tiene que corregir.

## Cómo citar en un hallazgo

Citar el criterio, no la marca:

```text
Bien:  WCAG 2.2 §1.4.3 (Contraste mínimo) — 3.1:1 medido, requiere 4.5:1.
Bien:  ARIA APG, patrón Combobox — Escape debe conservar lo tipeado.
Bien:  GOV.UK, "Error message" — el mensaje dice cómo corregir el problema.
Mal:   "Material Design lo hace así."
Mal:   "Es la tendencia actual."
```

Un design system se cita como **precedente con razonamiento**, no como
autoridad: "Carbon usa 32 px de alto de fila en tablas densas por X motivo, que
aplica acá porque Y".

## Jerarquía de la evidencia

Cuando dos fuentes se contradicen:

1. **WCAG / ARIA APG / HTML spec** — norma.
2. **Investigación de usabilidad** con metodología publicada.
3. **Design systems** — precedente razonado.
4. **Convenciones del propio proyecto** (`ai/context/`, `openspec/specs/`) —
   ganan sobre 3 dentro de este repo (constitución §22).
5. Todo lo demás — inspiración, no evidencia.

Excepción importante: **dentro de este repositorio, una decisión ya tomada en el
`design.md` de un change gana sobre 2 y 3.** Reabrirla es reabrir algo cerrado
(`product-context.md`).
