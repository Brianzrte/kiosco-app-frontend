# Checklist — Design Discovery

Modo `discover`. Se completa **antes** de proponer layout. Lo que no se sabe se
anota como pregunta abierta; **no se inventa**.

## 1. Usuario y contexto

- [ ] ¿Quién usa esta pantalla? (rol concreto: `admin`, `cashier`, ambos)
- [ ] ¿Está entrenado o es su primera vez?
- [ ] ¿La usa una vez por semana o cien veces por día?
- [ ] ¿Dónde está físicamente? (mostrador, depósito, oficina, celular)
- [ ] ¿Hay alguien esperando mientras la usa?
- [ ] ¿Puede mirar la pantalla fijo o la consulta de reojo?
- [ ] ¿Qué está haciendo con las manos? (lector, producto, dinero, nada)

## 2. Tarea

- [ ] ¿Cuál es **la** tarea principal? (una sola frase, un solo verbo)
- [ ] ¿Cuál es la acción primaria de la pantalla?
- [ ] ¿Cuáles son las acciones secundarias?
- [ ] ¿Cuántos pasos tiene el camino feliz?
- [ ] ¿Cuál es el paso más frecuente dentro de la tarea?
- [ ] ¿La tarea se completa en una pantalla o cruza varias?
- [ ] ¿Qué pasa inmediatamente después de completarla?
- [ ] ¿La tarea se repite en cadena? (una venta tras otra)

## 3. Dispositivo y entrada

- [ ] ¿Qué resolución real se usa? (medirla, no suponerla)
- [ ] ¿Método de entrada primario: teclado, mouse, táctil, lector?
- [ ] ¿El flujo principal tiene que poder hacerse sin mouse?
- [ ] ¿Hay hardware involucrado? (lector, impresora, cajón)
- [ ] ¿Se usa en móvil de verdad, o eso es una suposición?

## 4. Datos

- [ ] ¿Cuál es el dato **más** importante de la pantalla?
- [ ] ¿Qué datos se consultan siempre? ¿Cuáles casi nunca?
- [ ] ¿Cuántos registros típicos? ¿Y en el peor caso?
- [ ] ¿El usuario **compara** registros o **busca** uno? (decide tabla vs lista)
- [ ] ¿Hay dinero? → `formatMoney` + `.num` obligatorios
- [ ] ¿Hay fechas o rangos? → formato `YYYY-MM-DD` + `Intl.DateTimeFormat`
- [ ] ¿Hay algún dato que pueda faltar o venir nulo?
- [ ] ¿Los agregados los calcula el backend? (deben)

## 5. Riesgos

- [ ] ¿Cuál es el error más costoso que se puede cometer acá?
- [ ] ¿Es reversible? ¿Cómo se revierte?
- [ ] ¿Hay una acción destructiva? ¿Es irreversible desde la app?
- [ ] ¿Se puede perder trabajo cargado?
- [ ] ¿Se puede ejecutar dos veces por accidente?
- [ ] ¿Qué pasa si el backend responde de forma ambigua?
- [ ] ¿Qué error va a ocurrir todos los días? (ese se previene, no se mensajea)

## 6. Estados necesarios

- [ ] Loading — ¿de qué dato principal?
- [ ] Empty — ¿qué texto y qué acción?
- [ ] Empty por filtro — ¿es distinto del vacío real?
- [ ] Error — ¿qué acción de recuperación según `error.kind`?
- [ ] Permiso denegado — ¿el rol puede entrar por URL directa?
- [ ] Datos parciales — ¿alguna carga puede fallar sola?
- [ ] Pending — ¿qué controles se bloquean durante una mutación?
- [ ] Disabled — ¿qué se deshabilita y cómo se explica?

## 7. Restricciones técnicas

- [ ] ¿Los endpoints que necesita **existen**? (verificar, no suponer)
- [ ] Si falta alguno → `backend-request.md`, y **no se implementa**
- [ ] ¿Qué roles pueden entrar? (`requireRole`)
- [ ] ¿La ruta entra en `NAV_ITEMS`?
- [ ] ¿Hay lógica pura que deba vivir en `lib/` con su test?
- [ ] ¿Algo de esto pediría una dependencia nueva? → se levanta al usuario

## 8. Reutilización

- [ ] ¿Qué primitives de `src/components/ui/` cubren esto?
- [ ] ¿Existe una pantalla parecida ya resuelta? ¿Cuál?
- [ ] ¿Hay una composición de `components/<feature>/` reutilizable?
- [ ] ¿Falta alguna **variante** de un primitive? (extender el primitive, no
      estilizar ad hoc)
- [ ] ¿Se necesita algún token que no exista? (justificar con 2 usos reales)
- [ ] ¿Hay algún componente nuevo genuinamente necesario? ¿Por qué ninguno
      existente sirve?

## 9. OpenSpec

- [ ] ¿Hay un change activo para esto?
- [ ] ¿Leí `proposal.md`, `design.md` y los delta specs?
- [ ] ¿`design.md` ya decidió algo que condiciona el diseño?
- [ ] ¿Los `Scenario` cubren loading, vacío, error y responsive?
- [ ] ¿Hay contradicción entre el spec y el código actual? → se **reporta**

## Salida — `Design Discovery`

```markdown
# Design Discovery — <pantalla>

## Clasificación
Tipo de producto:
Perfil aplicable:
Por qué:

## Usuario y contexto
## Tarea principal
## Acción primaria
## Acciones secundarias
## Dispositivo y método de entrada
## Datos clave
## Riesgos y errores costosos
## Estados necesarios
## Restricciones técnicas
## Componentes reutilizables
## Preguntas abiertas
## Supuestos declarados
```

Las dos últimas secciones nunca se omiten. Un discovery sin preguntas abiertas
casi siempre significa que no se buscaron.
