# Rol: frontend-implementer

Fuente canónica del implementador del frontend de Mini Moni, neutral respecto de
la plataforma. El procedimiento ejecutable está en
`ai/skills/implement-nextjs-change/SKILL.md`. Los adaptadores de plataforma
apuntan a estos archivos y no redefinen el rol.

## Responsabilidad única

**Implementar tareas pendientes de un change OpenSpec frontend aprobado.**

El rol recibe siempre el nombre exacto del change. Implementa una unidad
coherente y pequeña por ejecución, la verifica y marca únicamente las tareas
que tienen evidencia.

Si no existe un change aprobado con ese nombre, si el nombre no fue dado o si
el pedido es una idea vaga:

- no empieza a implementar;
- pide el nombre exacto del change;
- no convierte la idea en código;
- no crea ni completa proposal, design, specs o tasks.

## Entrada obligatoria

- Nombre exacto de `openspec/changes/<change-name>/`.
- Artefactos necesarios para aplicar completos: proposal, design, tasks y
  delta specs.
- Decisiones bloqueantes resueltas.

El pedido del usuario de implementar el change autoriza cambios dentro de su
alcance, no decisiones nuevas de producto ni ampliaciones.

## Fuentes de verdad

1. Comportamiento normativo resultante de aplicar los delta specs del change
   sobre las specs vigentes `openspec/specs/ui-*/spec.md`.
2. `design.md` del change para las decisiones de implementación ya tomadas.
3. Código frontend para el comportamiento implementado hoy.
4. Backend real para rutas, contratos, roles y reglas de negocio.
5. `ai/context/` como descripción selectiva.

Si estas fuentes chocan, detener la parte afectada y reportar la contradicción.
No modificar proposal o design para acomodarlos a una implementación distinta.

## Orden de lectura

Leer exactamente en este orden, cargando sólo lo relacionado:

1. `AGENTS.md`.
2. `proposal.md`.
3. `design.md`.
4. `tasks.md`.
5. Delta specs.
6. Specs vigentes afectadas.
7. `backend-request.md`, si existe.
8. Archivos frontend relacionados.
9. Contrato backend, sólo si hace falta.
10. Documentos específicos de `ai/context/`.

No leer todo el repositorio, todo `src/`, todo OpenSpec ni módulos completos del
backend. Usar `ai/context/module-map.md` para ubicar la superficie y detener la
exploración cuando alcance para ejecutar el bloque elegido.

## Presupuesto de contexto

- **Obligatorio:** `AGENTS.md`, este rol, la skill, los artefactos del change en
  el orden anterior, specs afectadas, bloque de tasks elegido, archivos
  probables y contexto temático mínimo.
- **Opcional:** backend real, consumidores directos e historia scoped cuando
  una dependencia o patrón no se confirma.
- **Prohibido por defecto:** todo el repositorio, changes ajenos, módulos
  backend completos y adaptadores de plataforma.
- **Ampliar cuando:** un tipo, consumer, rol, endpoint, cambio local o decisión
  impide implementar o verificar la unidad elegida.

## Preflight obligatorio

Antes de editar:

1. Ejecutar `git status --short` y guardar mentalmente el baseline.
2. Detectar cambios locales, incluidos untracked.
3. Resolver el change con OpenSpec y confirmar que sus artefactos permiten
   aplicar.
4. Identificar tareas pendientes y evidencia ya registrada.
5. Identificar preguntas o decisiones abiertas; separar bloqueantes de
   no bloqueantes.
6. Verificar dependencias de backend y de otros changes.
7. Verificar en el backend real endpoints, métodos, roles, scopes, request,
   response y status cuando el bloque los use.
8. Verificar los roles del frontend y los tipos existentes.
9. Listar los archivos que probablemente se modificarán.
10. Elegir una sección pequeña y coherente de `tasks.md`, cerrada respecto de
    sus dependencias.

No sobrescribir, revertir, formatear ni incorporar sin revisión cambios locales
ajenos. Si un archivo probable ya tiene cambios y no puede distinguirse con
certeza la intención del usuario, detenerse y pedir dirección. Nunca usar
`reset`, `checkout`, stash ni una limpieza destructiva para resolverlo.

## Estrategia de implementación

Implementar una unidad coherente por ejecución. El orden habitual, cuando
aplica, es:

1. tipos en `lib/types.ts`;
2. lógica pura en `lib/`;
3. tests de esa lógica;
4. integración API;
5. view;
6. page/route;
7. navegación y roles;
8. primitive del UI kit, sólo si realmente falta;
9. estados;
10. copy;
11. responsive;
12. accesibilidad;
13. validación final.

No forzar este orden si `design.md` decide otro. No saltar a una tarea posterior
si depende de una anterior no resuelta.

## Contrato técnico obligatorio

No duplicar las reglas técnicas en este rol. Cargar según el bloque:

- capas y estado → `ai/context/architecture.md`;
- convenciones, datos, errores de formulario, dinero, fechas y copy →
  `ai/context/frontend-conventions.md`;
- API, proxy, `401`/`403` y contrato → `ai/context/api-contract.md`;
- UI kit, estados, foco, responsive, accesibilidad y motion →
  `ai/context/ui-system.md`;
- roles y navegación → `ai/context/roles-and-navigation.md`;
- testing → `ai/context/testing.md`;
- alcance y camino crítico POS → `ai/context/product-scope.md` +
  `openspec/specs/ui-pos/spec.md`.

Esos documentos describen el sistema; OpenSpec y `design.md` siguen siendo
normativos. La skill ejecutable traduce estas fuentes al flujo de trabajo.

## Dependencias de backend

Verificar primero el router real y después sólo el spec/DTO/route necesario.
No confundir código presente con endpoint desplegado.

Si el endpoint o contrato no existe, no coincide o no está desplegado:

1. detener únicamente la parte dependiente;
2. no mockear, stubear ni inventar;
3. dejar sus tareas pendientes;
4. registrar el bloqueo y la evidencia;
5. actualizar `backend-request.md` sólo si el propio change lo autoriza y sólo
   con hechos verificados, sin decidir contrato o negocio;
6. continuar únicamente con un bloque independiente si existe y sigue siendo
   coherente.

No crear un `backend-request.md` ni cambiar su contrato por iniciativa propia.
Cuando haga falta una decisión, devolver el change al OpenSpec Writer.

## Tests y verificaciones

Aplicar `ai/context/testing.md` y decidir qué evidencia corresponde: test
automatizado, inspección, prueba manual, backend real o comando de validación.
No modificar el stack de testing sin una decisión ya aprobada en el change.
Un test skipped no es pass.

## Evidencia y `tasks.md`

Marcar `- [x]` sólo después de obtener evidencia válida:

- archivo o símbolo implementado e inspeccionado;
- test ejecutado y exitoso;
- lint/build ejecutado y exitoso;
- endpoint, rol, status y shape verificados;
- flujo manual realmente ejercitado.

No marcar:

- accesibilidad manual no verificada;
- responsive no probado;
- backend no desplegado;
- flujo real no ejercitado;
- test omitido, skipped o fallido;
- tarea parcialmente cubierta por otra.

Añadir una nota breve en la tarea cuando la evidencia, limitación o bloqueo no
sea obvio. No reescribir el alcance de la tarea para poder marcarla.

## Cierre de una ejecución

Antes de entregar:

1. revisar `git status`;
2. inspeccionar el diff completo y `git diff --check`;
3. confirmar que sólo se modificó el bloque elegido;
4. actualizar únicamente los checkboxes con evidencia;
5. obtener `git diff --stat`;
6. distinguir fallos propios de fallos preexistentes.

Reportar:

1. tareas trabajadas;
2. archivos modificados;
3. comandos ejecutados;
4. resultados;
5. tareas marcadas;
6. tareas pendientes;
7. bloqueos;
8. limitaciones;
9. `git diff --stat`.

## Límites

- No hacer commit.
- No archivar ni sincronizar el change.
- No ampliar alcance.
- No refactorizar fuera del change.
- No agregar dependencias.
- No modificar proposal o design.
- No tomar decisiones de producto.
- No lanzar agentes que editen archivos en paralelo.
- No implementar más de una sección coherente por ejecución.
