# Design: add-frontend-catalog-v15

## Context

`add-catalog-v15` en backend resuelve dos divergencias entre spec e implementación en direcciones opuestas, y el razonamiento importa acá:

- **La ruta cede al código**: se queda `POST /products/{id}/activate` (no `/reactivate`), simétrica con `/deactivate`. Para el frontend no cambia nada — ya usa esa ruta.
- **El rol cede al spec**: `/activate` pasa de `admin` + `inventory` a `admin` solo. Para el frontend **sí** cambia: hay que retirar la acción de la vista del Inventory Manager.

La asimetría resultante es deliberada: retirar un producto de la venta es operativo y reversible; devolverlo revierte una decisión administrativa.

```
  Inventory Manager           Admin
  ─────────────────           ─────
  ✓ ver producto              ✓ ver producto
  ✓ editar                    ✓ editar
  ✓ DESACTIVAR                ✓ desactivar
  ✗ reactivar                 ✓ REACTIVAR
                              ✓ renombrar categoría
```

## Goals / Non-Goals

**Goals:**
- Que el Inventory Manager nunca vea una acción que le va a devolver `403`.
- Que la asimetría de permisos quede escrita como intencional.
- Renombrar categorías sin romper la asignación de color de sus insignias.

**Non-Goals:**
- Borrado de categorías: el backend describe la regla de protección pero no expone endpoint.
- Filtro por `category_id` en el listado de productos: sigue siendo filtro de cliente.
- Cambiar la ruta `/activate`: el backend confirmó que se queda.

## Decisions

**La acción se oculta, no se deshabilita.**
Un botón deshabilitado comunica "podrías, pero ahora no" e invita a averiguar qué falta. Acá la respuesta es "nunca, con tu rol", y eso se comunica mejor con la ausencia. El Inventory Manager sigue viendo la insignia de producto inactivo — la información está, la acción no.

Esto es gating cosmético: el backend sigue siendo la autoridad y devuelve `403` igual. Que además exista `add-frontend-ux-polish` con su manejo distinguido de `403` es la red de seguridad para el caso de que el gating de UI falle.

**El color de la insignia de categoría se deriva del `id`, no del nombre.**
El MVP asigna uno de los cinco pastel por hash determinístico de la categoría. Si ese hash tomara el **nombre**, renombrar cambiaría el color y el operador percibiría que "se movió de categoría". Debe derivarse del `id`, que es estable. **Verificar la implementación actual al empezar**: si hoy hashea el nombre, es un defecto latente que este change destapa y hay que corregirlo aquí.

**El renombrado se edita en la fila, no en una pantalla aparte.**
Una categoría es un solo campo. Navegar a un detalle para editar un campo y volver es tres cambios de contexto para una palabra. La fila pasa a modo edición con el nombre seleccionado, `Enter` confirma y `Escape` cancela.

**Renombrar al mismo nombre es un no-op exitoso, no un conflicto.**
El backend compara excluyendo el propio id, así que guardar sin cambios devuelve éxito. El frontend no debe adelantarse validando "no cambiaste nada": simplemente sale del modo edición.

**El `409` se muestra junto al campo en edición.**
Nombre duplicado es el único error esperable. El mensaje del backend aparece bajo el campo, la fila queda en modo edición con el texto escrito, y el foco se mantiene ahí.

## Risks / Trade-offs

- **Si el backend se despliega antes que este frontend, el Inventory Manager ve un botón que devuelve `403`** → Preferir el orden inverso: desplegar primero el frontend. Pierde temporalmente una acción que todavía funcionaría, lo que es mejor que ofrecer una que falla.
- **Ocultar la acción puede leerse como un bug** ("desapareció el botón de activar") → Es un cambio de permisos intencional y hay que comunicarlo a quien opera, no sólo desplegarlo.
- **Si el hash de color usa el nombre, renombrar remapea colores** → Verificado y corregido dentro de este change; está en las tasks.
- **La edición en fila es más difícil de hacer accesible que un formulario** → Exige gestión explícita de foco al entrar y salir del modo edición, y anuncio del error. Está en las tasks de verificación.

## Migration Plan

1. Desplegar este frontend (el Inventory Manager pierde la acción de reactivar, que aún funcionaría en backend).
2. Desplegar `add-catalog-v15` en backend (el permiso se restringe de verdad; el renombrado empieza a funcionar).

Entre ambos pasos el sistema es coherente desde la perspectiva del usuario. Rollback: revertir el frontend devuelve el botón, que sólo fallará si el backend ya se desplegó.

## Open Questions

- ¿Se comunicó a los operadores que el Inventory Manager deja de poder reactivar productos? No es un cambio técnico invisible: alguien que lo hacía a diario va a notarlo.
- `Category Deletion Protection` está especificado en backend pero no hay endpoint de borrado. ¿Falta el endpoint o sobra el requirement? Fuera de alcance, pero la UI de categorías es donde se nota.
