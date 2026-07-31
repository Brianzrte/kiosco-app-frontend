## 0. Prerrequisitos y coordinación

- [ ] 0.1 Verificar en backend real que exista `GET /api/v1/products/sku-suggestion?category_id={id}`, que responda `{ "sku": "SKU-123" }` y que confirme el formato `SKU-` más tres cifras.
- [ ] 0.2 Verificar contra backend real autenticación, `401`, `403`, `422`, `409` y la respuesta efectiva de `POST /api/v1/products`; no implementar mocks.

## 1. Tipos e integración API

- [x] 1.1 Definir el tipo de respuesta de propuesta `{ sku: string }` y consumir la ruta exclusivamente mediante `api<T>()`; inspección de código para confirmar que el token no llega al navegador. Evidencia: `ProductSkuSuggestion`, `ProductForm` y `api()`.
- [x] 1.2 Integrar la consulta al cambio de categoría, asociando la respuesta a la selección vigente y descartando respuestas tardías obsoletas. Evidencia: `skuRequestId` y comprobación del SKU vigente en `ProductForm`.

## 2. Formulario y estados

- [ ] 2.1 Mostrar la propuesta en el campo SKU editable, con formato validado por backend y sin incluir la categoría; prueba manual de selección de categoría.
- [ ] 2.2 Preservar un SKU editado manualmente frente a nuevas categorías y respuestas tardías; prueba manual con teclado.
- [ ] 2.3 Implementar estados pendiente, éxito y error de propuesta sin borrar datos ni impedir el ingreso manual; inspección y prueba manual.
- [ ] 2.4 Manejar `409` de creación mostrando el mensaje backend, manteniendo todos los valores y devolviendo el foco al campo SKU o acción de corrección; prueba manual.
- [ ] 2.5 Mostrar el SKU efectivo de la respuesta de creación exitosa junto con la confirmación; prueba manual.

## 3. Accesibilidad y responsive

- [ ] 3.1 Verificar etiqueta, descripción, anuncio de carga/error, foco visible y operación completa con teclado sin depender sólo del color; inspección y prueba manual.
- [ ] 3.2 Verificar en viewport móvil que los campos y mensajes se apilen sin scroll horizontal ni controles inaccesibles; prueba manual.

## 4. Pruebas y validación

- [x] 4.1 Agregar tests automatizados `*.test.ts` sólo para helpers puros de protección de edición/formato, usando el environment `node`; no crear tests DOM ni agregar dependencias. Evidencia: `src/lib/productSku.test.ts`.
- [ ] 4.2 Ejecutar `npm run lint` y corregir hallazgos; evidencia: salida limpia.
- [x] 4.3 Ejecutar `npm test` y corregir fallos; evidencia: 15 archivos y 129 tests exitosos.
- [x] 4.4 Ejecutar `npm run build` por el impacto en tipos y `page.tsx`; evidencia: build Next.js y TypeScript exitoso.
- [ ] 4.5 Validar contra backend real propuesta, creación, respuesta efectiva y conflictos; evidencia: requests/responses verificadas.
- [ ] 4.6 Ejecutar revisión UX/UI siguiendo `ai/skills/ux-ui-supervisor/SKILL.md` y resolver hallazgos aplicables antes del cierre.

## 5. Cierre condicionado

- [x] 5.1 Revisar que el diff sólo contenga el alcance implementado y que no se hayan agregado dependencias ni llamadas directas al backend; inspección de código. Evidencia: diff limitado a formulario, tipos, helper/test y tasks; consulta mediante `api()`.
- [ ] 5.2 Sincronizar el delta con `openspec/specs/ui-catalog/spec.md` y archivar el change sólo con decisión explícita del usuario y después de completar las verificaciones anteriores.
