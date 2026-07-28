---
name: validate-frontend-openspec-change
description: Validar sin corregir un change OpenSpec frontend de Mini Moni antes de implementarlo, actualizarlo o entregarlo. Usar para revisar coherencia entre proposal, design, delta specs, tasks y backend-request; verificar roles, endpoints, estados, accesibilidad, testing y rollout; y devolver PASS, PASS WITH WARNINGS o BLOCKED con hallazgos categorizados. No edita el change salvo petición explícita.
---

# Validar un change OpenSpec frontend

Procedimiento de revisión del rol `openspec-writer`. Leer primero
`ai/roles/openspec-writer.md`.

**Entrada:** nombre exacto de un change frontend.

**Salida:** informe `PASS`, `PASS WITH WARNINGS` o `BLOCKED`.

**Regla principal:** esta skill es de sólo lectura. No corregir artefactos,
checkboxes, specs vigentes ni código, salvo que el usuario lo pida
explícitamente en una acción separada.

---

## Presupuesto de contexto

Leer:

1. `AGENTS.md`.
2. Todos los artefactos existentes del change objetivo.
3. Cada spec vigente `ui-*` afectada.
4. Sólo los changes abiertos que el proposal/design declare relacionados o que
   toquen la misma capability, ruta o contrato.
5. Sólo el contexto descriptivo necesario para verificar un hallazgo:
   - alcance → `ai/context/product-scope.md`;
   - roles/nav → `ai/context/roles-and-navigation.md`;
   - API, errores, `401`/`403` → `ai/context/api-contract.md`;
   - UI, teclado, responsive, accesibilidad → `ai/context/ui-system.md`;
   - dinero, fechas, copy, capas →
     `ai/context/frontend-conventions.md`;
   - tests → `ai/context/testing.md`;
   - backend/rollout → `ai/context/backend-coordination.md`.
6. Backend real cuando el change use, modifique o declare faltante un endpoint.
7. Código frontend sólo para comprobar una afirmación de comportamiento actual,
   una ruta, un tipo, un primitive o el impacto declarado.

No leer todo `openspec/`, todo `src/` ni módulos completos del backend.

## 1. Resolver el change

Si el nombre no está claro, pedirlo; no adivinar entre varios changes.

Ejecutar:

```bash
openspec status --change "<change-name>" --json
```

Usar `changeRoot` y `artifactPaths` devueltos. Confirmar que el objetivo está
dentro de `openspec/changes/` y que es frontend.

Listar los artefactos presentes y los esperados. `backend-request.md` no es
obligatorio: su ausencia sólo es hallazgo si existe coordinación backend real;
su presencia es hallazgo si no hay una razón verificable para crearlo.

## 2. Validación estructural

Ejecutar:

```bash
openspec validate "<change-name>" --type change --strict --no-interactive
```

Registrar el resultado sin modificar archivos. Revisar además:

- proposal con `Why`, `What Changes`, `Capabilities`, `Impact`;
- design con todas las secciones aplicables;
- al menos un delta por capability afectada;
- operaciones delta válidas y requirements/scenarios bien formados;
- tasks numeradas, concretas y todas sin marcar;
- ningún artefacto inesperado o fuera del change.

Un fallo estructural que impide interpretar o validar el delta es `BLOCKED`.

## 3. Trazabilidad y contradicciones

Construir una matriz privada, sin crear archivos:

| Fuente | Debe corresponder con |
|---|---|
| Problema y alcance del proposal | goals, non-goals y user flow |
| Capabilities del proposal | carpetas de delta specs |
| Comportamientos del design | requirements y scenarios |
| Cada requirement | una o más tasks verificables |
| Contrato/API del design | delta, tasks y backend real |
| Dependencias/rollout | backend-request, prerrequisitos y migration plan |

Buscar contradicciones de ruta, rol, copy, estado, método HTTP, shape, status,
capability, out of scope y orden de despliegue.

No considerar “más detalle” como contradicción por sí solo. Sí marcar un detalle
que cambia el comportamiento o agrega alcance no aprobado.

## 4. Verificar comportamiento frontend

### Roles, autorización y navegación

- Cada ruta nueva o modificada tiene roles explícitos.
- Los roles coinciden entre spec, `requireRole`, navegación y backend.
- Gating de UI se trata como UX; no reemplaza autorización backend.
- Scopes server-side no se duplican como reglas de negocio en el cliente.
- Navegación de entrada, salida, back y direct URL está definida.
- `401` significa sesión inválida y redirección a login.
- `403` mantiene la sesión y muestra falta de permiso/retorno.
- Si el change depende de roles múltiples o `receiving`, reconoce la
  divergencia vigente y el change relacionado.

### Estados, errores y copy

- Carga, vacío, error, success y pending están definidos cuando aplican.
- Empty ofrece la acción principal.
- Error de carga es persistente y recuperable, no un toast efímero.
- Error de campo queda inline.
- Éxito usa acción y confirmación consistentes.
- Mensajes backend se muestran textualmente.
- Copy visible está en español rioplatense y sentence case.
- Fallo ambiguo de una mutación no asume éxito ni reintenta silenciosamente.

### Teclado, foco, responsive y accesibilidad

- Todo flujo es operable por teclado.
- Se define foco inicial, foco al abrir/cerrar diálogo y retorno después de
  éxito/error.
- POS conserva el scan input como camino crítico cuando corresponda.
- Diálogos tienen cancelación y retorno de foco.
- Se especifica uso móvil sin scroll/controles inaccesibles cuando aplique.
- Estado no depende sólo de color; labels y nombres accesibles existen.
- Foco visible y `prefers-reduced-motion` no se anulan.
- Las tareas separan inspección y prueba manual, porque no hay automatización
  DOM en el stack actual.

### Tipos, dinero y fechas

- Responses nuevas/modificadas identifican tipos y nullabilidad.
- No hay shapes anónimos planificados dentro de views.
- Dinero permanece string decimal; display y aritmética usan helpers, nunca
  floats.
- Agregados de negocio vienen del backend.
- Rangos de días usan `YYYY-MM-DD`; timestamps usan RFC3339.
- Zonas horarias y días calendario no se derivan implícitamente en la view.

## 5. Verificar backend y despliegue

Por cada endpoint:

1. Confirmar método/path en `../backend/internal/bootstrap/router.go`.
2. Confirmar rol y scope.
3. Confirmar request/response, campos, nullabilidad, errores y status en el
   spec/DTO/route mínimo necesario.
4. Distinguir `401`, `403`, `404`, `409`, `422` u otros status relevantes.
5. Si depende de un change backend abierto, comprobar su estado.
6. Si hace falta despliegue, exigir una tarea de verificación contra instancia
   real antes de desbloquear implementación dependiente.

### Evaluar `backend-request.md`

Debe existir si hay endpoint faltante, cambio de contrato/autorización,
dependencia de despliegue, rollout coordinado o incompatibilidad real. Debe
estar ausente en los demás casos.

Cuando existe, revisar fecha/evidencia, contrato mínimo, roles, errores,
compatibilidad, rollout, bloqueo y criterio de desbloqueo. El pedido no puede
inventar reglas de negocio ni ampliar el backend más allá del requisito.

Una dependencia correctamente documentada no vuelve inválido al change. Puede
dejarlo `PASS WITH WARNINGS` por no estar listo para implementación.

## 6. Verificar tasks y testing

Cada tarea debe ser específica, pequeña y reconocible por evidencia. Revisar
que el plan cubra, según corresponda:

- tipos y helpers puros;
- route/page, view y primitives;
- API, roles y nav;
- estados, teclado/foco, responsive y accesibilidad;
- tests, lint y build;
- prueba manual;
- backend real y rollout;
- sync y archivo final condicionados a decisión del usuario.

Clasificar el método de prueba de cada resultado:

- **automatizada:** `lib/*.test.ts`, lógica pura o borde soportado en Node;
- **inspección:** tipos, paths, guards, ausencia de APIs prohibidas;
- **manual:** render, DOM, copy, foco, teclado, responsive, accesibilidad;
- **backend real:** endpoint, roles, status, shape y despliegue.

Marcar como imposible cualquier tarea que proponga `.test.tsx`, DOM, jsdom,
Testing Library, Playwright u otro runner no instalado, salvo que el change
incluya una decisión explícita y aprobada de dependencia. No recomendar una
dependencia nueva como corrección automática.

Exigir `npm run lint` y `npm test`; exigir `npm run build` cuando se planifiquen
cambios de tipos, `page.tsx` o `route.ts`. Todas las tareas deben seguir
`- [ ]`.

## 7. Clasificar hallazgos

Usar exclusivamente estas categorías:

- `contradicción normativa`
- `requisito ambiguo`
- `endpoint no verificado`
- `dependencia backend`
- `rol inconsistente`
- `estado de UI faltante`
- `accesibilidad faltante`
- `tarea no verificable`
- `prueba imposible con stack actual`
- `riesgo de despliegue`
- `alcance inflado`

Cada hallazgo incluye:

- severidad: `BLOCKER` o `WARNING`;
- ubicación exacta: archivo y sección/requisito/tarea;
- evidencia;
- impacto;
- decisión o aclaración necesaria, sin editar ni proponer código.

No reportar preferencias personales ni estilo que no afecte el contrato,
verificabilidad o alcance.

## 8. Determinar el resultado

### `PASS`

- CLI strict pasa.
- No hay blockers ni warnings materiales.
- El change es coherente, verificable y no depende de una coordinación
  pendiente.

### `PASS WITH WARNINGS`

- No hay decisión bloqueante ni contradicción normativa.
- El change es válido, pero quedan riesgos/dependencias explícitas y bien
  documentadas, preguntas no bloqueantes o verificaciones manuales relevantes.
- Una dependencia backend pendiente y correctamente modelada normalmente cae
  aquí: el documento puede estar listo aunque la implementación no.

### `BLOCKED`

Al menos uno:

- contradicción normativa o entre artefactos que cambia el comportamiento;
- decisión de producto/rol/contrato/rollout pendiente;
- endpoint relevante no pudo verificarse;
- dependency real falta y no está documentada;
- delta inválido o sin comportamiento suficiente para implementar;
- task plan no permite demostrar requisitos críticos;
- alcance no puede reconciliarse sin decisión del usuario.

No bajar un blocker a warning para poder terminar.

## 9. Formato de salida

```markdown
# Validation: <change-name>

## Result
PASS | PASS WITH WARNINGS | BLOCKED

## Scope reviewed
- <artefactos, specs, backend y código consultados>

## Findings
### <categoría>
- **<BLOCKER|WARNING> — <ubicación>:** <hallazgo>
  - Evidence: <fuente>
  - Impact: <por qué importa>
  - Needed: <decisión o aclaración>

## Checks passed
- <controles relevantes que sí pasaron>

## Open dependencies
- <dependencias y criterio de desbloqueo, o Ninguna>

## Validation commands
- `<comando>` — <resultado>

## Next step
<acción recomendada sin corregir, implementar, marcar, sincronizar ni archivar>
```

Si no hay hallazgos, escribir `Ninguno`. No ocultar warnings dentro de
`Checks passed`.
