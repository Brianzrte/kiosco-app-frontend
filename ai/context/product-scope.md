# Alcance del producto frontend

Describe el límite operativo vigente. La conducta normativa vive en
`openspec/specs/ui-*/spec.md`; el mapa de rutas, componentes y endpoints vive
en `module-map.md`.

## Objetivo

Mini Moni es el frontend operativo de un kiosco de una sola sucursal, usado por
1 a 5 personas. Prioriza velocidad en caja, claridad y recuperación explícita
ante errores. No es un sitio de marketing ni decide reglas de negocio: el
backend es autoritativo.

## Superficie vigente

El producto cubre autenticación, POS, catálogo, inventario, categorías,
usuarios, historial y detalle de ventas, devoluciones, cierre de caja y
reportes. Consultar `module-map.md` para las rutas y roles implementados.

Suppliers y purchase orders se consumen hoy sólo para reportes. No existe una
UI vigente para crear o editar proveedores o pedidos. El change abierto
`add-frontend-user-roles-and-receiving` propone recepción operativa y roles
múltiples; no describe comportamiento implementado hasta que sus tareas tengan
evidencia.

## Fuera del alcance vigente

- descuentos;
- clientes;
- exportación CSV;
- notificaciones;
- modo offline;
- tema oscuro;
- gestión frontend de proveedores y creación de pedidos;
- reembolsos aislados: una devolución siempre parte de una venta confirmada.

El POS vigente ofrece un único medio por venta, efectivo o tarjeta, aunque el
backend modele `payments[]`. Transferencia en ventas y split payment requieren
un change frontend normativo; no se habilitan por detectar soporte en el
backend. Los métodos de recepción (`cash`, `transfer`, `account`) pertenecen al
change abierto de receiving y no al POS actual.

## Camino crítico

El POS es keyboard-first: escaneo como entrada de teclado, foco persistente,
repetición que incrementa cantidad, rechazo visible sin agregar el producto y
confirmación contra el backend. Un fallo de red nunca se interpreta como éxito.

## Cómo cambia este alcance

Una idea futura no se agrega acá primero. Debe pasar por Requirement Context y
un change OpenSpec aprobado. Después de implementarse y sincronizarse la spec,
este documento se actualiza para describir el nuevo estado.
