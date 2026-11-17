# Supabase del planner

El planner usa **el mismo proyecto Supabase que la app de recetas** (`sverre-recepter`). Solo añade tablas propias con prefijo `planner_`; nunca escribe en `kitchen_workspace` ni en `kitchen_members`, ni llama a `save_kitchen`.

## Instalar (una sola vez)

1. Abrir el proyecto en Supabase → **SQL Editor** → **New query**.
2. Pegar todo el contenido de `001_planner.sql` y pulsar **Run**. Debe terminar sin errores.
3. No volver a ejecutarlo: si las tablas ya existen, fallará sin cambiar nada.

El SQL se prueba antes en un Postgres embebido (`npm test`, fichero `src/data/sql.test.ts`): roles, permisos, datos incoherentes y que no toca nada de la app de recetas.

## Quién puede hacer qué

Se usan los mismos usuarios y roles que en la app de recetas (`kitchen_members`):

| Rol | Ver catálogo y plan, descargar PDF | Cambiar catálogo, planificar, cerrar el día, configuración |
|---|---|---|
| Chef | Sí | Sí |
| Kock, Service | Sí | No |
| Sin rol | No | No |

Hay un único catálogo y un único plan por día para toda la cocina.

## Primera vez en la app

1. Entrar con el correo y la contraseña de la app de recetas (cuenta Chef).
2. **Katalog** → "Katalogen i molnet är tom" → importar el catálogo de este navegador (si se usó la versión local) o el borrador.
3. **Katalog** → "Koppla till grundrecept": revisar los enlaces propuestos (las coincidencias exactas vienen marcadas) y guardar.

## Desarrollo sin tocar Supabase

`npm run dev:lokal` guarda todo en el navegador, siempre como Chef y sin grundrecept.
