# Coordinación con el backend

## Dos repos separados

`kiosco-app/frontend` (este) y `kiosco-app/backend` son repositorios
independientes, con su propio `openspec/`, su propio `AGENTS.md` y su propio
núcleo `ai/`. No comparten build, ni versionado, ni despliegue.

Lo único que los une es el contrato HTTP de `/api/v1`.

## El backend es la fuente de las reglas de negocio

El frontend **refleja** decisiones; no las toma. Todo lo que sea una regla —
qué transiciones de estado son válidas, quién puede devolver qué, cómo se
calcula un total, qué cuenta como "hoy"— pertenece al backend, se valida ahí y
llega a la UI como datos o como un `{ message }` de error.

Consecuencias prácticas:

- El error se muestra tal como vino. No se traduce, no se reinterpreta.
- No se agregan validaciones de cliente que el backend no impone. Sí se pueden
  evitar llamadas obviamente inválidas (campo vacío) como ayuda de UX.
- No se recalculan agregados en el navegador (ver `module-map.md`, sección
  Reports).

## Cuándo leer `../backend`

| Situación | Qué abrir |
|---|---|
| ¿Existe esta ruta? ¿Con qué método? ¿Qué roles? | `../backend/internal/bootstrap/router.go` — es la lista autoritativa, y los comentarios explican el reparto de roles |
| Detalle de las rutas de un módulo | `../backend/internal/<módulo>/transport/http/routes.go` |
| ¿Qué debe hacer el sistema? | `../backend/openspec/specs/<capability>/spec.md` — **normativo** |
| ¿Qué está por cambiar del lado del backend? | `../backend/openspec/changes/<id>/` |
| Forma exacta de request/response | los DTOs del módulo, y `../backend/kiosco-insomnia.json` como ejemplos |
| Contexto narrativo de fondo | `../backend/docs/specs/` — **no normativo**, puede estar desactualizado |

Regla de lectura: primero el router (barato y decisivo), después el spec, y sólo
si hace falta el caso de uso concreto. No abrir un módulo entero para responder
"¿existe este endpoint?".

## Si un endpoint no existe

En este orden, sin saltear pasos:

1. **Verificar de verdad.** Buscarlo en el router del backend antes de
   declararlo faltante. Varias notas de este repo dieron por inexistente algo
   que ya estaba implementado (ver la lista de divergencias en
   `api-contract.md`).
2. **Documentarlo en `openspec/changes/<id>/backend-request.md`**, con el
   formato que ya usa el repo: contexto, qué se verificó y contra qué archivos,
   fecha, y el contrato mínimo por endpoint (método, path, request, response,
   errores, rol). Está escrito para poder pegarse como prompt en la sesión de
   backend.
3. **Especificar la pantalla completa igual** en las delta specs del change. La
   especificación completa es lo que hace preciso al `backend-request.md`.
4. **No implementar** esa parte. Dejar la tarea sin marcar, con el bloqueo
   escrito en la línea (`- [ ] 6.5 Bloqueado por backend (ver backend-request.md §7): …`).
5. Si la pantalla debe existir igual, mostrar el hueco explícitamente —una card
   deshabilitada con la razón visible— en vez de omitirlo en silencio.

## Prohibición de mocks silenciosos

**Nunca** se fabrican datos, se stubbea una respuesta ni se escribe una ruta
falsa en `/api/` para "poder seguir". Una UI construida contra un contrato que
el backend todavía puede rechazar se reescribe entera, y mientras tanto miente
sobre su propio estado de avance.

Lo que sí se puede: implementar todo lo que **no** depende del endpoint
faltante y entregar el resto especificado y bloqueado.

## Dependencia de despliegue

Que una ruta esté en el código del backend no significa que esté disponible.
Señales de que un change del frontend depende de un despliegue:

- el endpoint aparece en `router.go` pero pertenece a un change del backend que
  sigue abierto en `../backend/openspec/changes/`;
- el `backend-request.md` del change está respondido pero la instancia local
  devuelve `404` o un shape viejo;
- el frontend necesita un campo nuevo en una respuesta existente (un `roles[]`
  donde hoy viene `role`): compila igual, y falla en runtime.

Cómo se maneja: la sección 0 del `tasks.md` es un prerrequisito explícito
("Verificar que X esté desplegado"), se marca sólo con evidencia —confirmado
contra una instancia en ejecución, no contra el código— y las secciones que
dependen de él quedan bloqueadas hasta entonces. Cuando el backend mantiene un
campo deprecado durante una versión para permitir el rollback, eso se anota en
el `design.md` del change.
