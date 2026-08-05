## Context

La confirmación de venta del POS incorporó un atajo de inventario en el
change `add-frontend-success-stock-popups`: ofrecía "Inicializar stock" a
sesiones con acceso a inventario y cambiaba la acción histórica "Nueva venta"
por "Ahora no". El atajo aparece después de cualquier venta confirmada, no
sólo ante stock pendiente, y desvía la atención del cobro —el flujo crítico
del POS— hacia una tarea de inventario.

El backend y los contratos API no participan en ese comportamiento. La
confirmación ya mantiene el foco del lector y su enlace "Ver detalle"; este
change sólo simplifica las acciones presentadas al usuario.

## Goals / Non-Goals

**Goals:**

- Dejar la confirmación exitosa con sólo "Nueva venta" y "Ver detalle".
- Restaurar "Nueva venta" como acción primaria de cierre, conservando el
  comportamiento de foco y lectura de códigos existente.
- Retirar los datos, props, helpers y tests que sólo sostenían el atajo de
  stock, para que el flujo no conserve una vía accidental hacia inventario.
- Actualizar el requisito normativo `Atomic sale confirmation` de `ui-pos`.

**Non-Goals:**

- Inicializar, ajustar o consultar stock desde el POS.
- Cambiar los permisos reales de inventario, los endpoints o el backend.
- Cambiar cómo se confirma una venta, cómo se compone el carrito o cómo se
  navega a "Ver detalle".
- Rediseñar la presentación general de la confirmación.

## Decisions

1. **La confirmación no mostrará ninguna acción de stock, sin depender del
   rol.** La utilidad del atajo no está ligada al estado real del inventario y
   confunde aun a quien tiene permiso. Se elige eliminarlo para todos, en vez
   de añadir una nueva condición de stock, porque el stock se gestiona siempre
   desde inventario o durante la creación inicial del producto.

2. **"Nueva venta" vuelve a ser la acción primaria de cierre.** "Ahora no"
   sólo expresaba el rechazo de la propuesta de inicializar stock. Restaurar el
   texto anterior hace explícito el siguiente paso normal del cajero y conserva
   la semántica actual de cerrar la confirmación sin alterar el foco. La
   alternativa de dejar "Ahora no" se descarta por no describir la acción que
   queda disponible.

3. **Se eliminará el estado y las props exclusivos del atajo.** `productId`
   de la venta confirmada, las props de roles del POS/panel y los helpers que
   determinan el último producto no representan información necesaria para
   mostrar la confirmación una vez quitado el enlace. Mantenerlos sería código
   muerto y haría más fácil reintroducir un comportamiento no deseado.

4. **El requisito de `ui-pos` se sincroniza mediante el archivado oficial de
   OpenSpec.** La especificación pasa a afirmar las dos únicas acciones y
   elimina escenarios de navegación a stock; no se mantiene compatibilidad
   normativa con el atajo retirado.

## Risks / Trade-offs

- [Un usuario con acceso a inventario pierde un atajo posterior a la venta] →
  La gestión de stock sigue disponible en Inventario y la inicialización al
  crear un producto, que son los puntos de trabajo previstos.
- [La eliminación de props podría afectar el foco del lector] → Se conserva
  sin cambios el manejador de cierre y se verifica que la confirmación no
  desplaza el foco ni bloquea el próximo escaneo.
- [La spec vigente todavía describe el atajo] → El archivo actualiza
  `ui-pos` a partir del delta, y su validación se ejecuta después del sync.

## Migration Plan

No requiere migración de datos ni orden de despliegue con backend. Desplegar el
frontend elimina el atajo inmediatamente; revertir el commit restaura el
comportamiento anterior si fuera necesario.

## Open Questions

Ninguna.
