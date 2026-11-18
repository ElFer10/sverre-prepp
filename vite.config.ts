import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'

/** Genera dist/sw.js con la lista de ficheros de esta compilación (todos, también el PDF y las fuentes). */
function serviceWorker(): Plugin {
  return {
    name: 'planner-sw',
    apply: 'build',
    generateBundle(_, bundle) {
      const publika = ['manifest.webmanifest', ...readdirSync('public/ikoner').map((f) => `ikoner/${f}`)]
      const filer = ['/', ...[...Object.keys(bundle), ...publika].filter((f) => f !== 'index.html').map((f) => `/${f}`)].sort()
      // La versión cambia si cambia cualquier fichero (también index.html y los iconos)
      const h = createHash('sha256')
      for (const [namn, f] of Object.entries(bundle)) h.update(namn).update(f.type === 'chunk' ? f.code : f.source)
      h.update(readFileSync('index.html'))
      for (const f of publika) h.update(f).update(readFileSync(`public/${f}`))
      const version = h.digest('hex').slice(0, 12)
      const kod = readFileSync('scripts/sw-mall.js', 'utf8')
        .replace('"planner-__VERSION__"', `"planner-${version}"`)
        .replace('const FILER = __FILER__;', `const FILER = ${JSON.stringify(filer, null, 2)};`)
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: kod })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), serviceWorker()],
})
