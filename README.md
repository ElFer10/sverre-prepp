# Planner · mise en place

App para planificar la mise en place diaria del restaurante. La especificación completa está en `SPEC.md`; las reglas de trabajo, en `CLAUDE.md`.

## Desarrollo

Node 22 o posterior.

```sh
npm ci
npm run dev        # con Supabase (inicia sesión con la cuenta de la app de recetas)
npm run dev:lokal  # sin Supabase: todo se guarda en el navegador, siempre como Chef
npm test
npm run build      # resultado en dist/
```

La base de datos se instala una sola vez: ver `supabase/README.md`.

## Publicar en Cloudflare Pages

Igual que la app de recetas: un proyecto Pages conectado al repositorio de GitHub, que despliega con cada push a `main`.

1. Crear en GitHub un repositorio vacío (privado) y subir este código a la rama `main`.
2. Cloudflare → Workers & Pages → Create → Pages → **Connect to Git** → elegir el repositorio.
3. Configuración de compilación:
   - Rama de producción: `main`.
   - Framework: React (Vite).
   - Comando de compilación: `npm run build`.
   - Directorio de salida: `dist`.
   - Directorio raíz: vacío.
   - Node: 22 (lo toma de `.node-version`).
4. No hace falta ninguna variable de entorno: la URL de Supabase y la clave *publishable* (pública) ya están en `src/data/konfig.ts`. Nunca poner aquí la clave `service_role` ni `sb_secret`.

Después de cada despliegue, comprobar que se puede entrar como Chef y como Kock, ver el plan y descargar el PDF.

## Instalar en el teléfono

Abrir la URL de Pages en el teléfono, iniciar sesión y:

- **iPhone (Safari):** Compartir → *Lägg till på hemskärmen*.
- **Android (Chrome):** menú ⋮ → *Installera app*.

La app instalada:

- Abre sin conexión. Muestra el último plan cargado en ese teléfono (solo lectura) y se actualiza sola al volver la conexión.
- Cuando hay una versión nueva aparece "En ny version av appen finns" → **Uppdatera**.
- Al cerrar sesión se borra la copia guardada en el teléfono.
