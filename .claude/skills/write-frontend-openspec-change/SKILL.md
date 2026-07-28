---
name: write-frontend-openspec-change
description: Escribir un change OpenSpec completo y exclusivamente frontend de Mini Moni a partir de un Requirement Context aprobado. Usar cuando haya que crear proposal, design, delta specs, tasks y, sólo si existe coordinación real con backend, backend-request; también cuando se pida convertir un análisis aprobado en planificación lista para implementar. No implementa código, no marca tareas, no sincroniza specs y no archiva.
---
<!-- GENERADO por scripts/ai/sync-skills.sh desde ai/skills/ — NO EDITAR. -->

# Escribir un change OpenSpec frontend

Procedimiento del rol `openspec-writer`. Leer primero
`ai/roles/openspec-writer.md`, que define los artefactos, sus contenidos y los
límites. Esta skill define cómo investigar y escribir con contexto mínimo.

**Entrada:** `Requirement Context` aprobado + nombre del change.

**Salida:** un único `openspec/changes/<change-name>/` completo y validado.

---

## Presupuesto de contexto

Leer en este orden y detener la exploración cuando haya evidencia suficiente
para escribir cada afirmación:

| # | Fuente | Cuándo |
|---|---|---|
| 1 | `AGENTS.md` | siempre |
| 2 | `ai/roles/openspec-writer.md` y el `Requirement Context` | siempre |
| 3 | `openspec/specs/<ui-capability>/spec.md` | siempre que exista |
| 4 | `openspec/changes/<id>/` relacionado | sólo si pisa la misma ruta, capability o contrato |
| 5 | vista/ruta actual afectada | sólo para confirmar comportamiento o impacto que el Requirement Context no pruebe |
| 6 | contrato backend real | sólo si hay endpoint, autorización, shape, regla o rollout involucrado |

Contexto descriptivo selectivo:

- ciclo y formato OpenSpec → `ai/context/openspec-workflow.md`;
- alcance vigente → `ai/context/product-scope.md`;
- estructura, dinero, fechas, copy →
  `ai/context/frontend-conventions.md`;
- estados, primitives, teclado, responsive, accesibilidad →
  `ai/context/ui-system.md`;
- endpoints y `401`/`403` → `ai/context/api-contract.md`;
- roles y navegación → `ai/context/roles-and-navigation.md`;
- tests y environment `node` → `ai/context/testing.md`;
- faltantes, rollout o deploy → `ai/context/backend-coordination.md`.

No leer todo `openspec/`, todo `src/` ni todo `../backend`. No cargar una view
que no esté en la superficie afectada. Para verificar una ruta backend, empezar
por `../backend/internal/bootstrap/router.go`; abrir después sólo el spec, DTO o
route del módulo necesario.

## 1. Comprobar la entrada

1. Confirmar que el Requirement Context está aprobado y no contiene preguntas
   bloqueantes.
2. Confirmar objetivo, actor, roles, flujo, estados, capability, rutas, contrato,
   out of scope y testing.
3. Derivar o validar el nombre kebab-case.
4. Buscar sólo changes abiertos relacionados y decidir si el pedido:
   - crea un change nuevo;
   - debe continuar uno existente;
   - contradice una decisión ya registrada.

Si el change objetivo ya existe, no sobrescribirlo. Pedir confirmación para
continuarlo o elegir otro nombre. Si la intención cambia un change existente,
tratarlo como actualización explícita, no como creación silenciosa.

Detenerse y preguntar si falta una decisión que altere alcance, contrato,
autorización, navegación, comportamiento observable, migración o rollout.

## 2. Resolver el contexto OpenSpec

Crear el scaffold con la CLI local:

```bash
openspec new change "<change-name>"
openspec status --change "<change-name>" --json
```

Usar `changeRoot`, `artifactPaths` y el orden de artefactos que devuelve la CLI;
no asumir otra raíz. Para cada artefacto estándar, consultar sus instrucciones:

```bash
openspec instructions <artifact-id> --change "<change-name>" --json
```

Aplicar `context`, `rules`, `template` e `instruction` como restricciones, sin
copiarlos literalmente al artefacto.

Editar exclusivamente dentro de `changeRoot`.

## 3. Construir una matriz privada de cobertura

Antes de escribir, relacionar cada punto del Requirement Context con:

- proposal: problema, alcance, capabilities e impacto;
- design: decisiones y porqués;
- spec: comportamiento observable y escenarios;
- tasks: unidad de trabajo + tipo de evidencia;
- backend request: sólo la coordinación real verificada.

Usar la matriz como control de trabajo; no crear un archivo adicional. Cada
comportamiento requerido debe aparecer en el delta y tener al menos una tarea.
Cada tarea debe rastrear a un requirement o a una decisión de diseño.

## 4. Verificar contrato y coordinación backend

Para cada endpoint relevante:

1. Verificar método y path en el router real.
2. Verificar roles y scopes.
3. Verificar request, response, nullabilidad, errores y status en specs/DTOs.
4. Distinguir código existente de endpoint realmente desplegado.
5. Registrar si el frontend viejo y nuevo son compatibles con el backend viejo
   y nuevo.

Crear `backend-request.md` únicamente si aparece una condición de las definidas
en el rol. Si no aparece ninguna, no crear el archivo y dejar explícito en
`design.md` que no hay coordinación backend cuando esa aclaración sea útil.

Un endpoint faltante no se inventa ni se mockea. Especificar el comportamiento
completo, documentar el bloqueo y dejar las tareas dependientes sin marcar.

## 5. Escribir los artefactos

### 5.1 Proposal

Escribir `Why`, `What Changes`, `Capabilities` e `Impact`.

- Abrir con el problema operativo y el efecto sobre la persona usuaria.
- Separar alcance nuevo, comportamiento modificado y fuera de alcance.
- Nombrar capabilities `ui-*` nuevas y modificadas.
- Reservar paths y archivos concretos para `Impact`.
- Evitar JSX, hooks, clases, shapes internos y decisiones de implementación.

### 5.2 Design

Usar las secciones aplicables definidas por el rol. Para cada decisión:

1. declarar la opción;
2. explicar por qué satisface el objetivo y las restricciones;
3. nombrar alternativa descartada cuando exista una opción real;
4. registrar trade-off y evidencia.

Describir el flujo feliz y todos los estados relevantes. Precisar foco inicial,
retorno de foco, operación por teclado, comportamiento de diálogos, móvil,
etiquetas, anuncios y uso no exclusivo del color.

En API y errores, separar `401` (sesión inválida/redirección) de `403` (sesión
válida/sin permiso). En dinero, exigir string decimal y helpers existentes. En
fechas, usar el contrato del backend y no introducir conversión local implícita.

`Migration Plan` y `Rollback` son obligatorios cuando hay cambio de contrato,
estado persistido, reemplazo de comportamiento o coordinación de despliegue.
`Open Questions` no contiene bloqueantes.

### 5.3 Delta specs

Crear un delta por capability afectada:

`specs/<ui-capability>/spec.md`.

- Usar `ADDED`, `MODIFIED`, `REMOVED` o `RENAMED` correctamente.
- Escribir requirements con `SHALL`.
- Escribir escenarios con `#### Scenario`, `WHEN` y `THEN`.
- Cubrir camino feliz, vacío, error, permiso, pending, teclado/foco, responsive
  y accesibilidad cuando cambien el comportamiento.
- Para `MODIFIED`, conservar todo el requirement vigente que sigue aplicando y
  cambiar sólo lo aprobado.
- Para `REMOVED`, incluir razón y migración.
- No copiar decisiones internas del design dentro del contrato observable.

Comprobar que rutas, roles, copy, endpoints, status, campos, dinero y fechas
coinciden con proposal y design.

### 5.4 Backend request condicional

Cuando corresponda, escribir:

- contexto y necesidad de usuario;
- fecha y evidencia de verificación;
- estado actual;
- contrato mínimo solicitado por endpoint;
- roles, scopes, errores y status;
- compatibilidad y rollout;
- impacto/bloqueo frontend;
- criterio verificable de desbloqueo;
- fuera de alcance.

No pedir endpoints “por si acaso” ni ampliar el dominio más allá de lo que la
UI especificada necesita.

### 5.5 Tasks

Ordenar tareas por dependencias. Usar sección `0` para prerrequisitos
bloqueantes. Cubrir sólo las categorías que apliquen, sin omitir verificación.

Cada línea debe:

- comenzar en `- [ ]`;
- nombrar un resultado concreto;
- permitir reconocer su evidencia;
- declarar el método cuando no sea obvio: test automatizado, inspección, prueba
  manual o backend real.

No crear `.test.tsx` ni prometer tests de componentes: Vitest corre en
environment `node` y sólo incluye `*.test.ts`. Extraer a helpers puros la lógica
testeable. Reservar render, foco, teclado, responsive y accesibilidad para
prueba manual e inspección.

Cerrar con:

- `npm run lint`;
- `npm test`;
- `npm run build` si toca tipos, `page.tsx` o `route.ts`;
- pruebas manuales concretas;
- validación contra backend real cuando aplique;
- tareas finales de sync y archivo, sin ejecutarlas y condicionadas a decisión
  del usuario.

No marcar ninguna tarea.

## 6. Validar antes de entregar

Aplicar `ai/skills/validate-frontend-openspec-change/SKILL.md` al change.
Además ejecutar:

```bash
openspec validate "<change-name>" --type change --strict --no-interactive
```

Corregir hallazgos no bloqueantes del borrador y repetir la validación. Si una
corrección requiere decidir producto, rol, contrato, flujo o rollout,
detenerse y preguntar.

Comprobar finalmente que el diff sólo contiene el change objetivo, todas las
tareas siguen sin marcar, no se creó un `backend-request.md` innecesario y no
se tocó `src/`.

## 7. Entregar

Informar:

- ruta del change;
- archivos creados;
- capabilities;
- motivo para incluir o no `backend-request.md`;
- resultado de validación;
- warnings y bloqueos;
- que queda listo para implementar cuando sus prerrequisitos se cumplan.

No implementar, sincronizar, archivar ni hacer commit.
