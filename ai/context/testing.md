# Testing

## Setup

`vitest.config.ts`:

```ts
test: { environment: "node", include: ["src/**/*.test.ts"] }
resolve.alias: { "@": "./src" }
```

Tres consecuencias que mandan sobre todo lo demás:

1. **Environment `node`**: no hay DOM. No hay `document`, no hay `window` real.
2. **`include` sólo `*.test.ts`**: un archivo `.test.tsx` **ni siquiera se
   ejecuta** — Vitest no lo levanta.
3. **No hay jsdom ni Testing Library** instalados, ni `setupFiles`.

Por lo tanto: **los componentes no se testean unitariamente en este repo.**

## Comandos

| Comando | Qué hace |
|---|---|
| `npm test` | `vitest run` — una corrida, sin watch |
| `npm run lint` | `eslint` (config `eslint-config-next`: core-web-vitals + typescript) |
| `npm run build` | `next build` — es lo que valida TypeScript de punta a punta |
| `npm run dev` / `npm start` | servidor de desarrollo / producción |

`npm run lint` y `npm test` son el piso de "listo" de una pantalla. `npm run
build` es lo que detecta un error de tipos que el lint no ve; conviene correrlo
cuando el cambio toca tipos, `page.tsx` o `route.ts`.

No hay `typecheck` como script propio: el chequeo de tipos llega vía `build`.

## Qué se testea

Suites vigentes, todas en `src/lib/`:

| Archivo | Qué cubre |
|---|---|
| `money.test.ts` | `toCents` / `fromCents` / `formatMoney` |
| `reports.test.ts` | series de fechas, rangos, comparación de períodos, plegado en "Otros" |
| `returns.test.ts` | disponibilidad por ítem, totales netos, payload y validación de motivo |
| `inventory.test.ts` | armado de query strings, regla de fila en mínimo |
| `salesSummary.test.ts` | query del resumen y normalización por medio de pago |
| `api.test.ts` | clasificación de errores de `api()` con `fetch` fakeado |

Regla: **lo que se puede calcular sin React va a `lib/` y se testea ahí.** Si
una view tiene lógica que merece test, la respuesta es mover la lógica, no
montar el componente.

## Cuándo crear un test

- **Sí**: se agrega o se cambia una función en `lib/`. Va un test colocado
  (`lib/foo.ts` → `lib/foo.test.ts`).
- **Sí**: hay un caso borde que hace mentir a un número — límites de zona
  horaria, rango vacío, redondeo, división por cero en una comparación,
  cantidad ya devuelta que agota un ítem.
- **No**: render, clases de Tailwind, orden de elementos, props que se pasan de
  un componente a otro. No hay forma de testearlo hoy y no es lo que se rompe.
- **No**: no se escribe un `.test.tsx` "para después". No corre y da falsa
  sensación de cobertura.

Se testea **comportamiento observable**, no implementación: entradas y salidas
de la función, no cómo la calcula.

## La excepción: `api.test.ts`

`lib/api.ts` no es puro, pero se testea igual porque su valor está en la
clasificación de errores (`network`, `timeout`, `server`, `forbidden`,
`message`) y en que el `{ message }` del backend siempre gane. Se prueba
fakeando `fetch` con `vi.stubGlobal` y limpiando con `vi.unstubAllGlobals()` en
`afterEach`. Es el patrón a copiar si aparece otro módulo de borde con la misma
característica; no es permiso para testear componentes.

## Prohibiciones

- **No introducir jsdom, `@testing-library/*`, Playwright ni ningún runner
  adicional en silencio.** Cambiar el environment de Vitest o agregar
  `setupFiles` cambia el contrato de testing del repo: es una decisión que se
  levanta al usuario y se registra en el `design.md` de un change, junto con la
  dependencia nueva.
- No cambiar `include` para capturar `.tsx` sin ese mismo paso previo.

## Limitaciones actuales (declaradas, no disimuladas)

- Cero cobertura de componentes, de accesibilidad automatizada y de
  interacción de teclado. El POS — el camino crítico — se verifica **a mano**,
  y las tareas de verificación de los changes lo reflejan así.
- No hay tests end-to-end ni contra el backend real. La verificación de que un
  endpoint existe y responde se hace leyendo `../backend` y probando contra una
  instancia en ejecución (ver `backend-coordination.md`).
- No hay medición de cobertura configurada.
