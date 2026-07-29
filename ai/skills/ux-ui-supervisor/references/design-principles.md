# Principios de diseño

Base conceptual del skill. Cada principio se enuncia como algo **comprobable**,
no como una preferencia. Fuentes en `sources.md`.

## 1. Jerarquía

La jerarquía es el orden en que el ojo encuentra la información. Se construye
con cuatro herramientas, en este orden de fuerza:

1. **Posición** — arriba y a la izquierda se lee primero en es-AR.
2. **Tamaño** — la diferencia debe ser de al menos un escalón de la escala
   tipográfica para leerse como intencional.
3. **Peso y contraste** — `text-text-primary` vs `text-text-secondary` separa
   dato de etiqueta sin agregar color.
4. **Color** — el último recurso, y nunca el único (ver principio 6).

Prueba: entrecerrando los ojos hasta perder el texto, ¿se distingue todavía qué
bloque manda? Si todos los bloques pesan igual, no hay jerarquía, hay una lista.

Regla operativa: **un nivel dominante por región**. Dos elementos compitiendo
por ser lo primero significa que ninguno lo es.

## 2. Una acción primaria por región

Toda región con acciones tiene exactamente una primaria (`variant="primary"`).
Las demás son `secondary` o `ghost`; las destructivas, `danger`.

Tres botones `primary` juntos no dan tres veces más énfasis: dan cero. Si el
flujo realmente tiene dos salidas igual de válidas, es un problema de flujo, no
de estilo — separalas en etapas o en regiones.

Prueba: en un screenshot, tapar el texto de los botones. ¿Se puede señalar cuál
es la acción esperada? Si no, falla.

## 3. Proximidad y agrupación

Lo relacionado va junto; lo no relacionado se separa. El espacio *entre* grupos
tiene que ser claramente mayor que el espacio *dentro* de un grupo — la relación
mínima usable es 2:1 (`gap-4` dentro, `gap-8` entre).

Un borde o una card resuelven una agrupación que el espacio ya no puede
sostener. No al revés: no se envuelve algo en card para agrupar lo que un `gap`
resolvía (`spacing-layout.md`).

## 4. Ley de Fitts aplicada

El tiempo para llegar a un control depende de su tamaño y su distancia. En
consecuencia:

- La acción más frecuente es la más grande y la más cercana al punto de trabajo.
- Las acciones destructivas se alejan de las frecuentes.
- Un target de 44 px es ~2× más rápido de acertar que uno de 24 px, y muchísimo
  más en un flujo repetitivo como una venta.

En un POS esto es la diferencia entre 8 y 12 segundos por venta, cientos de
veces por día.

## 5. Reconocer antes que recordar

El usuario no debería memorizar nada que la interfaz pueda mostrar: el estado
actual, el atajo disponible, el formato esperado, el valor previo. Un campo que
espera `1200.50` lo dice; no espera que el cajero adivine si acepta coma.

Corolario: los atajos de teclado se muestran, no se documentan aparte
(`navigation-keyboard.md`).

## 6. Nunca sólo color

Aproximadamente 1 de cada 12 hombres tiene alguna deficiencia de visión de
color. Además, el color se pierde en pantallas baratas, con brillo bajo y con
reflejo — condiciones normales de un mostrador.

Todo estado codificado por color lleva **también** texto, icono o forma. En este
repo, `Badge` ya lo cumple porque siempre lleva texto; el defecto aparece cuando
se colorea una fila o una celda sin etiqueta.

## 7. Feedback dentro de la ventana de atención

- < 100 ms: se percibe instantáneo. No hace falta indicador.
- 100 ms – 1 s: hace falta una señal (spinner, estado `pending`).
- \> 1 s: hace falta indicar progreso y, si aplica, permitir cancelar.

`MOTION.spinnerDelay` (400 ms) existe justamente para no parpadear un spinner en
respuestas rápidas. Ver `performance-ux.md`.

## 8. Prevención antes que corrección

Un error que no se puede cometer no necesita mensaje. En orden de preferencia:

1. **Impedirlo** — el input numérico no acepta letras; la cantidad se topa
   contra el stock disponible.
2. **Advertirlo antes** — "quedan 3 unidades" mientras el cajero escribe.
3. **Confirmarlo** — diálogo proporcional al riesgo, sólo si es destructivo o
   irreversible.
4. **Permitir deshacer** — mejor que confirmar cuando la acción es reversible.
5. **Explicar el error** — el último recurso, no el primero
   (`forms-validation.md`).

Una confirmación para todo entrena al usuario a aceptar sin leer, y entonces
deja de proteger.

## 9. Consistencia sobre originalidad

La misma acción se ve, se llama y se comporta igual en todas las pantallas. En
Mini Moni eso significa: los primitives de `src/components/ui/`, el copy
español rioplatense en sentence case, y la correspondencia acción ↔ confirmación
("Confirmar venta" → "Venta confirmada").

Romper la consistencia cuesta atención en **todas** las pantallas, no sólo en la
que se rediseñó. El beneficio tiene que ser mayor que ese costo, y hay que
poder enunciarlo.

## 10. Proporcionalidad del cambio

Una recomendación se dimensiona por el problema:

| Problema | Cambio proporcional |
|---|---|
| Un texto ambiguo | Cambiar el texto |
| Un contraste insuficiente | Cambiar el token aplicado |
| Un estado faltante | Agregar ese estado |
| Un patrón que falla en tres pantallas | Extender el primitive |
| Un modelo mental equivocado | Rediseñar la pantalla |
| Un sistema incoherente entre áreas | Un change de OpenSpec propio |

Proponer un rediseño de sistema para arreglar un botón es un defecto del
supervisor, no del diseño.

## 11. La carga cognitiva es un presupuesto

Cada elemento, color, borde y animación gasta atención. En una pantalla
operativa el presupuesto es mínimo: el cajero está mirando al cliente, no a la
pantalla.

Antes de agregar algo, preguntar qué decisión del usuario habilita. Si no
habilita ninguna, es ruido.

## 12. El estado vacío es una pantalla, no un error

Loading, empty y error se diseñan con el mismo cuidado que el estado con datos —
son los primeros que ve un usuario nuevo. El empty state invita a la acción
principal, no sólo informa (`states-feedback.md`).

## Cómo se aplica un principio en un hallazgo

Mal:

> El header se ve desbalanceado y podría tener más aire.

Bien:

> **Problema:** el título de la pantalla y el botón "Nueva venta" usan el mismo
> tamaño y peso.
> **Evidencia:** `SalesView.tsx:41-48`, ambos `text-base font-semibold`.
> **Impacto:** el cajero no encuentra la acción de un vistazo; en una tarea que
> se repite ~200 veces por turno, cada duda cuesta segundos.
> **Principio:** jerarquía por tamaño (§1) y acción primaria única (§2).
> **Recomendación:** título a `title-md` (24/32) en `text-text-primary`; el
> botón queda como único `variant="primary"` de la región.
> **Validación:** en un screenshot con el texto tapado se puede señalar el
> botón como acción esperada; el título es el elemento tipográfico más grande.
