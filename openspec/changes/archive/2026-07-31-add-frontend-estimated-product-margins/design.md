## Context

`/reports/products` consume el reporte paginado de productos y muestra el margen que calcula el backend. El backend ya está mergeado en `develop` y `origin/develop` en el commit `b301470`; su DTO serializa `margin_estimated` como booleano. Las contribuciones sin costo histórico usan el costo actual del catálogo y vuelven el margen estimado.

La pantalla es un reporte denso con tabla desktop y tarjetas mobile. El cambio debe preservar el patrón existente de carga, vacío, error, filtros y paginación, y no debe calcular dinero en el cliente.

## Goals / Non-Goals

**Goals:**

- Tipar y consumir `margin_estimated` por fila.
- Hacer que una fila estimada sea distinguible sin depender únicamente del color.
- Exponer siempre una explicación accesible: `Margen estimado — incluye ventas sin costo histórico registrado, calculado con el costo actual del catálogo`.
- Mantener la información disponible y legible desde 320 px.

**Non-Goals:**

- Cambiar el margen, costo, precio, cantidad, orden o paginación recibidos del backend.
- Recalcular o validar el margen en el frontend.
- Modificar `GET /api/v1/reports/sales/by-product`, su filtro por categoría o el dashboard.
- Agregar tooltips, librerías, endpoints o cambios de UI kit.

## Decisions

1. **Usar un Badge visible con texto “Margen estimado” junto al monto.**
   Esto crea una diferencia visual y textual, por lo que la condición no depende del color. Se reutiliza `src/components/ui/Badge.tsx` con el tono semántico `warning`, en vez de crear estilos ad-hoc o un ícono nuevo. Alternativa descartada: sólo un ícono, porque es menos escaneable y puede perderse en una tabla densa.

2. **Incluir la explicación completa como texto accesible en la misma celda, además del texto corto visible.**
   La celda tendrá un texto `sr-only` con la explicación exacta, asociado al indicador con `aria-label`; de esta forma lector de pantalla y teclado no dependen del atributo `title` ni del hover. Alternativa descartada: tooltip exclusivamente hover/focus, porque oculta una aclaración importante y exige una interacción adicional.

3. **Renderizar el margen y el indicador también en la tarjeta mobile.**
   La vista mobile actual no muestra la columna Margen; agregar este dato dentro de la tarjeta mantiene el criterio de aceptación en todos los anchos sin introducir scroll horizontal. En filas `false` se muestra sólo el margen, sin badge ni disclaimer.

4. **Mantener el shape de transporte local a la view existente.**
   El cambio sólo agrega un campo a `ProductReportItem`, siguiendo la excepción heredada de DTOs inline en reportes; no justifica una migración de tipos no relacionados ni un archivo nuevo.

## Risks / Trade-offs

- [Backend viejo durante un rollout] Un backend anterior puede no devolver el campo. → El despliegue del frontend debe ocurrir después del backend mergeado; el contrato actual ya es aditivo y el frontend sólo activa el indicador cuando el booleano es `true`.
- [Densidad mobile] Agregar una fila de margen aumenta ligeramente la altura de cada tarjeta. → Se conserva la grilla de dos columnas y se agrega sólo el dato que antes faltaba para que el margen sea distinguible en mobile.
- [Explicación repetida] El texto accesible se repite por cada fila estimada. → Es intencional: la relación entre el monto y su estado queda clara por fila y no depende de una leyenda global.

## Migration Plan

1. Mantener el backend desplegado con el DTO aditivo antes de publicar el frontend.
2. Publicar el cambio frontend; las filas exactas siguen iguales y las estimadas agregan la señal.
3. Rollback: revertir el frontend elimina sólo el indicador; no hay datos persistidos ni migración frontend que deshacer.

## Open Questions

Ninguna.
