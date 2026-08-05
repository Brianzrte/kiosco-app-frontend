## Context

El backend usa strings decimales con punto y los formularios controlados hoy
editan ese valor directamente. La UI ya muestra dinero con `formatMoney`, pero
no tiene un primitive de edición.

## Goals / Non-Goals

**Goals:** mostrar `$ 20.000,00` al editar dinero y preservar `"20000.00"`
como valor canónico; reutilizar el UI kit sin dependencias.

**Non-Goals:** cambiar contratos, validar reglas monetarias del backend,
formatear peso, cantidad, porcentajes o campos de fecha.

## Decisions

1. Un `MoneyInput` propio del UI kit recibe/entrega el decimal canónico. La
   alternativa de guardar el valor localizado en cada formulario duplicaría
   conversiones y rompería los payloads existentes.
2. El input acepta dígitos, `.` o `,` durante edición y presenta el formato
   argentino con símbolo y miles. La selección/caret se conserva de forma
   predecible al insertar o borrar, y el teclado numérico usa `inputMode`.
3. La normalización y el formato viven en `lib/money.ts` con tests Node; el
   componente no hace aritmética de negocio.

## Accessibility

Conserva label, error, foco visible, nombre accesible y mensajes inline del
`Input` existente. El símbolo visible no reemplaza la etiqueta.

## Keyboard and focus behavior

Tab y Shift+Tab siguen el orden del formulario. Pegar `20000`, `20000.0` o
`20.000,00` produce el mismo valor canónico; borrar permite vaciar el campo.

## Responsive behavior

El primitive ocupa el ancho disponible, no genera overflow desde 320 px y
mantiene el tamaño táctil del Input actual.

## API contract

Ninguno. Los consumidores continúan enviando strings decimales existentes.

## Risks / Trade-offs

- [Riesgo] el formateo en vivo puede mover el cursor → mitigación: tests de
  normalización y prueba manual de insertar, borrar, pegar y teclado móvil.
- [Riesgo] aplicar el primitive a un peso o porcentaje alteraría su semántica
  → mitigación: migración con inventario explícito de campos monetarios.

## Migration Plan

Agregar helpers y primitive, migrar campos de dinero, validar payloads y
revertir sustituyendo el primitive por `Input` si aparece una regresión.

## Open Questions

Ninguna bloqueante.
