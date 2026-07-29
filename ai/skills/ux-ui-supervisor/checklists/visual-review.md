# Checklist — Revisión visual

Modo `audit`, capa visual. Complementar con `accessibility-review.md`,
`responsive-review.md` y `keyboard-review.md`.

Cada ítem se marca sólo con evidencia. Lo no verificado va como
`Not evaluated`, no como aprobado.

## Jerarquía

- [ ] Hay una acción primaria visualmente identificable por región.
- [ ] Hay un solo elemento dominante por región.
- [ ] Tapando el texto de los botones se puede señalar la acción esperada.
- [ ] Entrecerrando los ojos se distingue qué bloque manda.
- [ ] El dato más importante de la pantalla es el más prominente.
- [ ] Hay como máximo tres niveles de énfasis.
- [ ] No hay dos botones `primary` compitiendo en la misma región.
- [ ] El título de la pantalla es un `<h1>` y el más grande de la jerarquía.

## Tipografía

- [ ] Los escalones de tamaño se distinguen a simple vista.
- [ ] Ningún texto de lectura por debajo de 14 px; ninguno por debajo de 12 px.
- [ ] Line-height ≈ 1.5 en cuerpo, 1.2–1.3 en títulos.
- [ ] El texto de lectura tiene ancho máximo (45–75 caracteres).
- [ ] Todo el texto está alineado a la izquierda; nada justificado.
- [ ] Todos los montos usan `formatMoney` y `.num`.
- [ ] Todos los códigos, SKU y cantidades usan `.data`.
- [ ] Los números en columna son tabulares.
- [ ] No se agregó ninguna familia tipográfica.
- [ ] No hay texto en `font-semibold` de forma indiscriminada.

## Color

- [ ] No hay ningún literal hex en `src/components/` ni en `page.tsx`.
- [ ] Todos los colores salen de tokens de `@theme`.
- [ ] Contraste de texto medido ≥ 4.5:1 (≥ 3:1 texto grande).
- [ ] El texto secundario sobre `surface-2` o pasteles fue medido explícitamente.
- [ ] Ningún pastel lleva texto blanco.
- [ ] `success` sólo confirma una operación; `error` sólo error o destrucción;
      `warning` sólo alerta.
- [ ] Ningún estado permanente se pinta con `success` / `error`.
- [ ] Ninguna información depende sólo del color (probado en escala de grises).
- [ ] Serie única de gráfico en `primary`; 2+ categorías en `chart-1..4` en orden
      fijo.
- [ ] Ningún pastel codifica un dato en un gráfico.

## Espaciado y layout

- [ ] No hay valores arbitrarios (`p-[13px]`, `gap-[22px]`).
- [ ] El espacio entre grupos es ≥ 2× el espacio dentro de un grupo.
- [ ] El ritmo vertical es constante entre elementos del mismo tipo.
- [ ] La densidad es coherente dentro de cada región.
- [ ] La densidad corresponde al perfil de la pantalla.
- [ ] Los bordes izquierdos de una columna están alineados.
- [ ] El formulario tiene ancho máximo; no ocupa todo el viewport.
- [ ] Cada `Card` agrupa algo que el espacio no podía agrupar.
- [ ] No hay cards anidadas.
- [ ] La pantalla no es una grilla de cards iguales sin jerarquía.
- [ ] El radio es `rounded-app`; no hay radios sueltos.
- [ ] Las sombras son `shadow-soft` o `shadow-soft-lg`.

## Consistencia

- [ ] Se usan los primitives de `src/components/ui/`, no elementos reestilizados.
- [ ] No hay estilo ad-hoc que debería ser una variante del primitive.
- [ ] La misma acción se llama igual en todas las pantallas.
- [ ] Copy en español rioplatense, sentence case, voz activa.
- [ ] El nombre de la acción coincide con su confirmación.
- [ ] El mensaje de error del backend se muestra tal cual.
- [ ] Los patrones coinciden con la pantalla equivalente ya existente.
- [ ] Ningún componente nuevo duplica un primitive existente.

## Estados visibles

- [ ] `hover`, `focus`, `active` y `disabled` resueltos en todos los controles.
- [ ] `hover`, `focus` y `selected` son distinguibles entre sí.
- [ ] Todo botón deshabilitado explica qué falta.
- [ ] El loading usa `ListSkeleton` / `Skeleton` / `LoadingState`.
- [ ] El skeleton imita la geometría del contenido final.
- [ ] El empty state invita a la acción principal.
- [ ] El empty por filtro es distinto del empty real.
- [ ] El error muestra el mensaje del backend y una acción de recuperación.
- [ ] El orden de render es `error → loading → empty → datos`.

## Iconos

- [ ] No se agregó ninguna librería de iconos.
- [ ] Los iconos decorativos llevan `aria-hidden="true"` y `focusable="false"`.
- [ ] Los botones sólo-icono tienen nombre accesible y tooltip.
- [ ] El tooltip aparece con hover **y** con focus.
- [ ] El área interactiva es mayor que el dibujo del icono.
- [ ] Ninguna acción destructiva se comunica sólo con un icono.

## Motion

- [ ] Toda animación explica, conecta, confirma o da feedback.
- [ ] No hay duraciones literales fuera de `lib/motion.ts` / `--motion-*`.
- [ ] Sólo se animan `transform`, `opacity`, `color`, `background-color`.
- [ ] Las entradas usan `ease-out`; las salidas no se animan.
- [ ] El foco no tiene transición.
- [ ] `prefers-reduced-motion` verificado con emulación en DevTools.
- [ ] Ninguna regla de reduced motion elimina la única señal de un evento.
- [ ] En pantallas operativas ninguna animación supera 200 ms.

## Cómo verificar

```text
Contraste          DevTools → Elements → Accessibility → Contrast
Sin color          DevTools → Rendering → Emulate vision deficiencies → Achromatopsia
Reduced motion     DevTools → Rendering → prefers-reduced-motion: reduce
Layout shift       DevTools → Rendering → Layout Shift Regions
Hex sueltos        grep -rn '#[0-9a-fA-F]\{3,8\}' src/components src/app --include='*.tsx'
Ms literales       grep -rn 'duration-\[' src/components src/app
Valores arbitrarios grep -rnE '(p|m|gap|w|h)-\[' src/components src/app
```

Las tres búsquedas de `grep` dan falsos positivos legítimos (un SVG de gráfico,
un ancho calculado). Se revisa cada resultado antes de reportarlo.
