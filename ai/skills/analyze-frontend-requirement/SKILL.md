---
name: analyze-frontend-requirement
description: Analizar un requerimiento de frontend incompleto antes de crear un change de OpenSpec — descubrir el comportamiento actual de la pantalla, detectar rutas, componentes, libs y capabilities afectadas, verificar los endpoints contra el backend, hacer las preguntas bloqueantes y producir un Requirement Context. Usar cuando el usuario pide analizar una feature de frontend, preparar un cambio para OpenSpec, aclarar una pantalla, hacer preguntas antes de implementar, o evaluar el impacto en la UI. No implementa, no diseña la pantalla final y no crea el proposal.
---

# Analizar un requerimiento de frontend

Procedimiento del rol **requirement-analyst**. El rol —qué debe y qué no debe
hacer, la lista de ejes a analizar, las categorías de incertidumbre y el formato
de salida— está en `ai/roles/requirement-analyst.md`; **leelo antes de
empezar**. Este documento dice *cómo ejecutarlo*: qué leer, en qué orden y
cuándo parar.

**Salida:** un documento `Requirement Context` (formato en el rol, §Etapa 4).
**No** se crea `proposal.md`, no se toca `openspec/`, no se escribe código en
`src/`, no se elige la UI final.

---

## Presupuesto de contexto

Leé en este orden y **pará apenas puedas describir el comportamiento actual con
evidencia**. Cada nivel se abre sólo si el anterior no alcanzó.

| # | Qué | Cuándo |
|---|---|---|
| 1 | `AGENTS.md` | siempre — reglas y fuentes de verdad |
| 2 | `ai/context/module-map.md` | siempre — ubicar ruta, componentes, libs, roles, endpoints y specs del área |
| 3 | `openspec/specs/ui-<capability>/spec.md` relacionada | siempre que exista una relacionada |
| 4 | `openspec/changes/<id>/` relacionados (`proposal.md`, después `design.md`) | si hay changes abiertos sobre el mismo terreno |
| 5 | la view actual en `src/components/<feature>/` | sólo si el spec no alcanza para saber qué hace hoy |
| 6 | el backend (`../backend/internal/bootstrap/router.go`, `../backend/openspec/specs/`) | sólo si queda incertidumbre sobre el contrato |

Documentos de `ai/context/` según lo que el requerimiento toque, **no todos**:

- toca alcance vigente → `ai/context/product-scope.md`
- toca estados, tokens o primitives → `ai/context/ui-system.md`
- toca endpoints o errores → `ai/context/api-contract.md`
- toca permisos o navegación → `ai/context/roles-and-navigation.md`
- falta algo del backend → `ai/context/backend-coordination.md`
- hay que decidir dónde vive la lógica →
  `ai/context/frontend-conventions.md`

No cargar adaptadores de plataforma: no contienen conocimiento canónico.

**No cargues todo `src/`.** Señal de que te fuiste de presupuesto: estás
leyendo un componente que no aparece en tu lista de componentes afectados, o
abriste tres views para responder una pregunta sobre una.

`ai/context/architecture.md` y `testing.md` casi nunca hacen falta acá: el
primero es para decidir dónde vive el código (no es tarea de este rol), el
segundo sólo si el requerimiento discute qué se va a testear.

---

## Etapa 1 — Descubrimiento mínimo

### 1.1 Ubicar la capability

Capabilities con spec vigente: `ui-auth`, `ui-catalog`, `ui-cash-closing`,
`ui-foundation`, `ui-inventory`, `ui-pos`, `ui-reports`.

**Ojo:** `ui-users`, `ui-sales` y `ui-receiving` **existen sólo como delta
dentro de changes** (`openspec/changes/*/specs/`), no en `openspec/specs/`.
Para ese terreno, la fuente son los deltas — buscarlos ahí antes de concluir
que no hay spec.

```
rg -l "<término del dominio>" openspec/specs/
```

Leé la capability entera si es corta, o los `### Requirement:` relevantes. El
formato es SHALL + `#### Scenario:` WHEN/THEN: ése es el nivel de precisión al
que tenés que llegar con el comportamiento deseado.

### 1.2 Buscar changes abiertos relacionados

```
rg --files openspec/changes/ -g 'proposal.md'
rg -l "<término>" openspec/changes/ -g 'proposal.md'
```

Para cada change relacionado:

- `proposal.md` → `## What Changes` e `## Impact` (qué toca, qué rompe, de qué
  depende).
- `design.md` → `## Decisions`, `## Non-Goals` y las preguntas abiertas. En este
  repo el `design.md` suele traer una tabla "lo pedido / qué hay hoy" con la
  investigación del backend ya hecha y fechada: leela antes de repetir ese
  trabajo.
- `tasks.md` → estado real. **Los checkboxes no son evidencia confiable**: hay
  tareas marcadas cuya nota quedó desactualizada y tareas sin marcar sobre
  código que ya existe. Verificá contra `src/`.
- `backend-request.md` → qué se pidió al backend, con qué contrato y en qué
  fecha.

Si el requerimiento pisa un change abierto, es un hallazgo de primer orden y va
en `Backend dependencies` o en `Affected capabilities` según corresponda.

### 1.3 Ubicar la superficie afectada

Con `ai/context/module-map.md`, para el área en cuestión: ruta, componente
principal, subcomponentes, libs auxiliares, roles, endpoints consumidos, specs
relacionadas y **qué archivos se tocan normalmente para extenderla**. Esa última
columna es la base de `Affected components` y `Affected libraries`.

### 1.4 Leer el código, quirúrgicamente

Sólo lo necesario para afirmar qué hace hoy la pantalla. El orden que casi
siempre alcanza:

1. `src/app/(app)/<ruta>/page.tsx` — qué rol la gatea y qué props baja.
2. `src/components/<feature>/XView.tsx` — el fetcher (`useCallback` + `api()`),
   el estado local, y cómo resuelve loading/empty/error.
3. `src/lib/types.ts` — la forma exacta del dato, y qué campos son nullables.
4. `src/lib/<área>.ts` — qué lógica ya existe fuera de la view.
5. `src/lib/nav.ts` — si el requerimiento toca navegación.

No abras el UI kit para saber qué se puede renderizar: el inventario de
primitives y variantes está en `ai/context/ui-system.md`.

### 1.5 Verificar los endpoints

Primero `ai/context/api-contract.md` (qué se consume hoy, y la lista de lo que
existe en el backend sin consumidor). Si el requerimiento necesita algo que no
está ahí, **verificalo en el backend antes de declararlo faltante**:

```
rg -n "<recurso>" ../backend/internal/bootstrap/router.go
```

El router es la lista autoritativa y sus comentarios explican el reparto de
roles. Varias notas de este repo dieron por inexistente algo ya implementado —
no repitas ese error, y tampoco el inverso.

Si genuinamente falta, eso es una dependencia de backend: se nombra, se
describe el contrato mínimo necesario y se marca como bloqueante. **No se
inventa el endpoint ni se asume su forma.**

---

## Etapa 2 — Clasificar incertidumbres

Listá cada incógnita, clasificala con las trece categorías del rol y marcala
como **bloqueante** o **no bloqueante**.

Antes de preguntar, recorré estas **cinco áreas críticas del frontend** y decidí
explícitamente si el requerimiento las toca. Que no apliquen es una conclusión
válida, pero se escribe.

| Área | Preguntas de control |
|---|---|
| **Estados de pantalla** | ¿qué se ve mientras carga? ¿qué dice el vacío y a qué acción invita? ¿qué error puede llegar y dónde se muestra? ¿cómo se confirma el éxito? |
| **Foco y teclado** | ¿se puede operar sin mouse? ¿dónde arranca el foco y adónde vuelve después de cada acción? ¿esto toca el POS, donde el foco **es** el requisito? |
| **Permisos** | ¿qué roles? ¿el gate de la UI coincide con el del backend? ¿hay un scope que el servidor fuerza y la UI no debe replicar? |
| **Dinero y fechas** | ¿hay montos? string decimal, `formatMoney`, nunca float. ¿hay rangos? días `"YYYY-MM-DD"`, y **el agregado lo calcula el backend** |
| **Dependencia de backend** | ¿todos los endpoints existen? ¿están desplegados? ¿hace falta un campo nuevo en una respuesta existente (rompe en runtime, no en compilación)? |

---

## Etapa 3 — Preguntar

**Regla de oro: preguntá sólo lo que el repositorio no contesta.** Antes de
incluir una pregunta, verificá que la respuesta no esté en el spec, en un change
abierto, en `ai/context/`, en `src/` o en el router del backend.

Primero las bloqueantes. **Máximo 7 por ronda**, todas juntas, con el formato de
cinco campos definido en el rol. Si te salen más de 7 bloqueantes, decilo:
probablemente el pedido son dos changes y conviene partirlo.

Antes de la ronda, resumí en dos o tres líneas **qué resolviste solo leyendo el
repo**.

Preguntas que este rol **sí** hace, cuando no hay respuesta en el repo: cuál es
el objetivo operativo detrás del pedido · qué rol lo usa · qué pasa en el caso
vacío · qué texto va en el error · si el alcance incluye móvil · si algo se
puede diferir a un change posterior.

Preguntas que este rol **no** hace: qué componente usar, cómo maquetar, qué
color, qué nombre de archivo, cómo se llama la función. Nada de eso es una
decisión de producto, y varias ya están respondidas por
`ai/context/frontend-conventions.md` y `ui-system.md`.

---

## Etapa 4 — Entregar el Requirement Context

Cuando no queda ninguna bloqueante, escribí el documento con la estructura
**exacta** de `ai/roles/requirement-analyst.md` §Etapa 4 — las 26 secciones, en
ese orden, y `Ninguna` donde no aplique.

Entregalo siempre en la respuesta, y guardalo además en un archivo si es largo o
el usuario lo pide. Elegí la ruta con criterio: un documento de análisis **no
va** en `src/` ni en `openspec/`. Si lo guardás, decí dónde.

Chequeo final antes de entregar:

- [ ] `Current behavior` cita archivos o requisitos concretos, no memoria.
- [ ] Cada punto de `Desired behavior` se puede expresar como WHEN/THEN.
- [ ] Los cuatro estados de UI están definidos, con qué se muestra en cada uno.
- [ ] Foco y teclado resueltos, o descartados explícitamente.
- [ ] Cada endpoint de `API contract` fue verificado; lo faltante está marcado
      como faltante y como dependencia de backend.
- [ ] No se inventó ningún endpoint ni ninguna regla de negocio.
- [ ] `Affected libraries` dice qué lógica va a `lib/` y por qué.
- [ ] `Testing implications` distingue lo testeable en `lib/` de lo que queda
      como verificación manual (no hay tests de componente en este repo).
- [ ] `Out of scope` nombra explícitamente lo que queda afuera.
- [ ] `Evidence consulted` lista todo lo leído.
- [ ] No se creó ni modificó nada en `openspec/` ni en `src/`, y no se agregó
      ninguna dependencia.

Cerrá indicando el paso siguiente sin ejecutarlo: *"listo para escribir el
change cuando lo decidas"*.

---

## Errores frecuentes

| Error | Por qué es un problema |
|---|---|
| Preguntar algo que está en el spec o en `ai/context/` | Gasta la atención del usuario y hace que descrea de las demás preguntas |
| Describir el comportamiento actual de memoria | Este repo tiene docs desactualizadas; el código es la autoridad sobre qué hay hoy |
| Fiarse de los checkboxes de `tasks.md` | Hay tareas marcadas con notas viejas y tareas sin marcar sobre código existente |
| Dar por faltante un endpoint sin abrir el router del backend | Ya pasó en este repo: se pidió algo que estaba implementado |
| Asumir la forma de una respuesta que no existe | Es inventar el contrato; la UI construida sobre eso se reescribe entera |
| Saltar a proponer la pantalla | Es diseño; viene después del proposal, y con la skill de diseño |
| Convertir "que se vea mejor" en un requisito | Una preferencia visual sin objetivo no es verificable como escenario |
| Abrir media docena de views "por las dudas" | Rompe el presupuesto de contexto y no agrega precisión |
| Entregar sin `Out of scope` | Sin límite explícito, el change crece durante la implementación |
| Replicar en la UI un scope que el backend ya fuerza | Duplica una regla de negocio en el lugar equivocado |
