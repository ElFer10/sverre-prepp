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
      if (r.fortsattning === id) {
        delete r.fortsattning;
        // Sin su steg 2, el steg 1 vuelve a ser una preparación normal
        if (katalog.find((k) => k.id === id)?.steg) delete r.steg;
      }
      return r;
    });
}

/** "Vinägersky" + 2 → "Vinägersky · steg 2". */
export function stegNamn(bas: string, steg?: number): string {
  return steg ? `${bas} · steg ${steg}` : bas;
}

export interface Uppdelning {
  steg1: Forberedelse;
  steg2: Forberedelse;
  /** Otras preparaciones que dependían del producto terminado: ahora dependen del steg 2. */
  andrade: Forberedelse[];
}

/**
 * Reparte una preparación enlazada a una grundrecept en dos días: crea el steg 2 enlazado a la misma
 * receta y los une con följdsteg. `dag2FranMoment` (índice) mueve ese momento y los siguientes al día 2;
 * sin él, el día 2 queda sin momentos para configurarlo después.
 * Devuelve null si no está enlazada o ya está repartida.
 */
export function delaUpp(f: Forberedelse, katalog: Forberedelse[], dag2FranMoment?: number): Uppdelning | null {
  if (!f.receptId || f.steg || f.fortsattning) return null;
  const k = dag2FranMoment !== undefined && dag2FranMoment > 0 && dag2FranMoment < f.faser.length ? dag2FranMoment : f.faser.length;
  const id2 = nyttForberedelseId(`${f.namn} steg 2`, katalog);
  const dag2 = f.faser.slice(k).map((x, i) => {
    const fas = { ...x, id: `${id2}-${i + 1}` };
    if (i === 0) delete fas.maxVantanFore;
    return fas;
  });
  const steg2: Forberedelse = {
    id: id2,
    receptId: f.receptId,
    steg: 2,
    namn: stegNamn(f.namn, 2),
    faser: dag2,
    beroendeAv: [],
    farskhet: f.farskhet,
    kanAvslutasEfterOppning: f.kanAvslutasEfterOppning,
    aktiv: f.aktiv,
  };
  if (f.kategori) steg2.kategori = f.kategori;
  const steg1: Forberedelse = { ...f, steg: 1, namn: stegNamn(f.namn, 1), faser: f.faser.slice(0, k), fortsattning: id2 };
  const andrade = katalog
    .filter((x) => x.id !== f.id && x.beroendeAv.includes(f.id))
    .map((x) => ({ ...x, beroendeAv: x.beroendeAv.map((d) => (d === f.id ? id2 : d)) }));
  return { steg1, steg2, andrade };
}

export const arEgen = (f: Forberedelse) => !f.receptId;
