---
name: implement-nextjs-change
description: Implementar una unidad coherente de tareas pendientes de un change OpenSpec aprobado en el frontend Next.js de Mini Moni. Usar cuando el usuario da el nombre exacto de un change y pide empezar o continuar su implementación, ejecutar una sección de tasks.md, verificar el resultado y marcar sólo tareas con evidencia. No usar para ideas vagas, escritura de changes, backend, archivado, commits ni cambios sin un change identificable.
---
<!-- GENERADO por scripts/ai/sync-skills.sh desde ai/skills/ — NO EDITAR. -->

# Implementar el siguiente bloque de un change Next.js

Seguir el rol canónico en `ai/roles/frontend-implementer.md`. Esta skill mantiene
el flujo corto; las reglas técnicas viven en `ai/context/`.

**Entrada obligatoria:** nombre exacto del change.

**Salida:** una sección pequeña implementada y verificada, con evidencia en
`tasks.md`, o un bloqueo preciso sin mocks ni trabajo especulativo.

## 1. Detectar el change

No inferir ni auto-seleccionar. Si el usuario no dio el nombre exacto, pedirlo y
detenerse.

Confirmar que `openspec/changes/<change-name>/` existe. Ejecutar:

```bash
openspec status --change "<change-name>" --json
openspec instructions apply --change "<change-name>" --json
openspec validate "<change-name>" --type change --strict --no-interactive
```

Si faltan artefactos, falla la validación strict, el change no está apply-ready
o no hay tareas pendientes, informar el estado y no editar.

## 2. Preparar contexto

Ejecutar `git status --short` antes de leer código. Registrar archivos
modificados/untracked y detenerse ante un solapamiento ambiguo con el bloque.

Leer en el orden del rol:

1. proposal;
2. design;
3. tasks;
4. delta specs;
5. specs vigentes;
6. backend request, si existe;
7. archivos frontend relacionados.

Usar `ai/context/module-map.md` para ubicar la superficie. Cargar después sólo:

- alcance/POS → `ai/context/product-scope.md`;
- capas/estado → `ai/context/architecture.md`;
- convenciones/copy/dinero/fechas →
  `ai/context/frontend-conventions.md`;
- UI/estados/accesibilidad → `ai/context/ui-system.md`;
- tests → `ai/context/testing.md`;
- API/errores → `ai/context/api-contract.md`;
- roles/nav → `ai/context/roles-and-navigation.md`;
- backend/rollout → `ai/context/backend-coordination.md`.

No leer todo el repositorio. Usar historial reciente y scoped a un archivo
sólo si el código actual no alcanza para confirmar un patrón.

## 3. Verificar backend

Para cada endpoint del bloque, verificar método y roles primero en
`../backend/internal/bootstrap/router.go`; abrir sólo el spec, route o DTO
necesario para confirmar shape, errores y scopes. Si el change exige despliegue,
verificarlo contra una instancia real antes de marcar el prerrequisito.

Si falta contrato o despliegue:

- detener la parte dependiente;
- no inventar ni mockear;
- registrar evidencia del bloqueo;
- tocar `backend-request.md` sólo si el design/tasks lo autoriza;
- elegir otro bloque únicamente si es independiente.

## 4. Elegir un bloque

Listar tareas pendientes, dependencias y archivos probables. Elegir la sección
más pequeña que produzca un resultado coherente y verificable. Anunciar:

- change exacto;
- sección/tareas;
- archivos probables;
- dependencias verificadas;
- cambios locales que se preservarán.

No implementar dos secciones independientes “porque ya estamos”.

## 5. Implementar

Seguir `design.md` aunque otra opción parezca preferible. Aplicar la arquitectura
y convenciones referenciadas, en el orden que requiera el bloque:

1. tipos;
2. helper puro + test;
3. integración API;
4. view/page/nav/primitive estrictamente necesarios;
5. estados, copy, responsive y accesibilidad.

No modificar proposal/design para justificar una desviación. Si la decisión es
inviable, detenerse y pedir actualización del change.

Si toca POS, aplicar las reglas especiales del rol y preservar foco/estado ante
errores o confirmaciones ambiguas.

## 6. Testear

Ejecutar primero los tests focalizados del helper o borde modificado. Después:

```bash
npm test
npm run lint
```

Ejecutar `npm run build` si el bloque toca tipos, `page.tsx` o `route.ts`.

Hacer las pruebas manuales concretas de `tasks.md` que el entorno permita:
loading/empty/error, teclado/foco, móvil, accesibilidad, roles y backend real.
No sustituir una prueba manual con “se ve correcto por código”.

No agregar stack de componentes. Lo testeable sin React debe vivir en `lib/`
con `*.test.ts`; lo demás se reporta como manual o pendiente.

## 7. Revisar diff

Ejecutar:

```bash
git status --short
git diff --check
git diff --stat
```

Leer el diff de cada archivo tocado. Compararlo con el baseline y separar
cambios propios de los preexistentes. Confirmar que no hay refactor, formato o
archivos fuera del bloque.

## 8. Actualizar tasks

Marcar sólo tareas completamente demostradas por archivo, test, comando,
endpoint o prueba manual. Añadir una nota breve cuando la evidencia o limitación
necesite quedar registrada.

Dejar pendiente toda tarea parcial, skipped, no desplegada o no ejercitada.
Volver a revisar el diff de `tasks.md`.

## 9. Entregar evidencia

Reportar, en este orden:

1. tareas trabajadas;
2. archivos modificados;
3. comandos y resultados;
4. tareas marcadas;
5. tareas pendientes;
6. bloqueos;
7. limitaciones y verificaciones manuales no realizadas;
8. `git diff --stat`.

No hacer commit, sync ni archive. No continuar con otra sección sin una nueva
ejecución.
