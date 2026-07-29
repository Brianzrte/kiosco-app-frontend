# Checklist — Revisión responsive

Referencia: `../references/responsive-design.md`.

Se declara **qué viewports se miraron**. Los que no se miraron van como
`Not evaluated`, no como aprobados.

## Viewports

```text
[ ] 360 × 800     móvil chico
[ ] 768 × 1024    tablet vertical
[ ] 1024 × 768    ← prioritario en POS
[ ] 1280 × 720    ← prioritario en POS
[ ] 1366 × 768    ← prioritario en POS
[ ] 1440 × 900
[ ] 1920 × 1080
```

Mínimo aceptable para una revisión: **360 × 800, 1024 × 768 y 1280 × 720**.
En POS, además **1366 × 768**.

DevTools → device toolbar → *Responsive* → escribir las dimensiones.

## En todos los viewports

- [ ] La **página** no scrollea horizontalmente.
- [ ] Ningún contenido queda cortado ni superpuesto.
- [ ] La acción primaria es alcanzable sin scroll horizontal.
- [ ] Ninguna acción necesaria está oculta.
- [ ] Ningún texto se solapa con otro elemento.
- [ ] Los targets táctiles son ≥ 44 px con ≥ 8 px de separación.
- [ ] El orden de foco sigue coincidiendo con el orden visual después del reflow.

## Reflow antes que ocultamiento

- [ ] Las grillas pasan a menos columnas, no se recortan.
- [ ] Los formularios de dos columnas pasan a una.
- [ ] Nada esencial se resuelve con `hidden md:block`.
- [ ] Si algo se oculta, es genuinamente redundante.
- [ ] Las acciones secundarias se agrupan; no desaparecen.

## Tablas

- [ ] El scroll horizontal está en el contenedor, no en la página.
- [ ] La primera columna sigue siendo identificable al scrollear.
- [ ] Las columnas prioritarias son las visibles sin scroll.
- [ ] Ninguna fila se convirtió en card con borde y sombra.
- [ ] El encabezado sticky no tapa el elemento enfocado.
- [ ] La paginación es alcanzable sin recorrer toda la tabla.

## Formularios

- [ ] Una sola columna en anchos chicos.
- [ ] El ancho del campo sugiere el largo del dato.
- [ ] Las acciones no quedan tapadas por el teclado virtual.
- [ ] `inputmode` correcto en montos y cantidades.
- [ ] Los labels no se truncan.

## Navegación

- [ ] El `Nav` funciona en móvil sin tapar la acción primaria.
- [ ] El ítem activo se distingue en todos los anchos.
- [ ] No se inventó una navegación paralela para esta pantalla.

## Overlays

- [ ] Los diálogos scrollean por dentro; la página no.
- [ ] El título y las acciones del diálogo quedan visibles al scrollear.
- [ ] El diálogo entra en 1024 × 768 y en móvil apaisado (~340 px de alto útil).
- [ ] El drawer cierra con Escape y con un botón visible.

## Altura limitada

- [ ] Verificado en 1366 × 768 con la barra del navegador (~600 px útiles).
- [ ] Verificado en móvil apaisado (~340 px útiles).
- [ ] El header sticky no se come una porción desproporcionada del viewport.
- [ ] Tabulando con la página scrolleada, el foco nunca queda bajo el header.

## Zoom

- [ ] Zoom del navegador al 200 % sin pérdida de contenido ni funcionalidad.
- [ ] No hay `user-scalable=no` ni `maximum-scale=1`.
- [ ] El layout no depende de `vw` puro para su estructura.

## Breakpoints

- [ ] Se usan los breakpoints de Tailwind (`sm`/`md`/`lg`/`xl`/`2xl`).
- [ ] No hay breakpoints arbitrarios (`min-[912px]:`) sin justificación anotada.
- [ ] Los `clamp()` tienen mínimo y máximo explícitos.
- [ ] No hay `clamp()` en texto de cuerpo.

## Específico de POS

- [ ] El total está visible sin scrollear en 1024 × 768.
- [ ] El botón de cobro está visible sin scrollear en 1024 × 768.
- [ ] La región de cobro no scrollea; sólo scrollea el carrito.
- [ ] El campo de escaneo está visible en todos los viewports de POS.
- [ ] Verificado en 1024 × 768, 1280 × 720 y 1366 × 768.

## Cómo reportar

```markdown
Verificado en: 360 × 800, 1024 × 768, 1280 × 720.
Not evaluated: 768 × 1024, 1366 × 768, 1440 × 900, 1920 × 1080, zoom 200 %.

Hallazgos:
- RESP-01 (HIGH) — en 1024 × 768 el total queda debajo del fold.
```
