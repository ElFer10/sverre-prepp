# Planner — mise en place

App React para planificar la mise en place diaria del restaurante de Fer. **Leer `SPEC.md` antes de nada**: es la fuente de verdad. `KATALOG-UTKAST.md` es el catálogo inicial (fixture de tests y datos semilla).

## Reglas

- **Interfaz y PDF en sueco.** Todos los textos visibles van en `src/i18n/sv.ts`, nunca escritos directamente en los componentes. Usar el glosario de `SPEC.md` §12. Comunicación con Fer y comentarios del código: en español.
- El planificador (`src/scheduler/`) es TypeScript puro: sin React, sin Supabase, sin `Date.now()`. Entrada → salida, determinista con semilla.
- Escribir o actualizar tests (Vitest) del planificador **antes** de cambiar su lógica. Los casos mínimos están en `SPEC.md` §10.
- Esta app **nunca escribe** en las tablas de la app de recetas (grundrecept, maträtter, etc.). Solo lectura. Las tablas propias llevan prefijo `planner_`.
- No guardar recetas aquí: solo datos de tiempo y recursos enlazados por `receptId`.
- Mobile-first: todo debe usarse cómodamente en el teléfono.
- Estilo visual igual al de la app de recetas (`sverre-recepter/src/style.css`): DM Sans, títulos en Libre Caslon Display, verde #455e49, fondo #f7f8f5, logo de Sverre, iconos lucide. Es una suite: cualquier cambio visual debe seguir ese estilo.
- Ante cualquier punto marcado [PENDIENTE] en `SPEC.md`, preguntar a Fer en lugar de suponer.
- Seguir el orden de desarrollo de `SPEC.md` §13.

## Stack

Vite · React · TypeScript · Supabase · Cloudflare Pages · @react-pdf/renderer · Vitest
