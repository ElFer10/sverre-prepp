// Operaciones puras sobre el catálogo (crear y borrar preparaciones propias del planner).
// Sin imports relativos: también lo usa scripts/katalog-md-a-json.ts con Node.

import type { Forberedelse } from "../scheduler/types.ts";

/** "Brynt smör (3 l)" → "brynt-smor-3-l". */
export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/é/g, "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Id legible y único para una preparación nueva. */
export function nyttForberedelseId(namn: string, katalog: Forberedelse[]): string {
  const bas = slug(namn) || "forberedelse";
  const ids = new Set(katalog.map((f) => f.id));
  if (!ids.has(bas)) return bas;
  let n = 2;
  while (ids.has(`${bas}-${n}`)) n++;
  return `${bas}-${n}`;
}

/** Asigna id definitivo a una preparación nueva y renumera sus fases. */
export function medId(f: Forberedelse, id: string): Forberedelse {
  return { ...f, id, faser: f.faser.map((x, i) => ({ ...x, id: `${id}-${i + 1}` })) };
}

/** Quita una preparación y las referencias a ella (dependencias y följdsteg). */
export function utanForberedelse(katalog: Forberedelse[], id: string): Forberedelse[] {
  return katalog
    .filter((f) => f.id !== id)
    .map((f) => {
      if (!f.beroendeAv.includes(id) && f.fortsattning !== id) return f;
      const r: Forberedelse = { ...f, beroendeAv: f.beroendeAv.filter((d) => d !== id) };
      if (r.fortsattning === id) delete r.fortsattning;
      return r;
    });
}

export const arEgen = (f: Forberedelse) => !f.receptId;
