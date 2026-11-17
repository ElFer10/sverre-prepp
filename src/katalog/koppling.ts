// Enlace entre el catálogo del planner y las grundrecept de la app de recetas (SPEC §7).

import type { Forberedelse } from "../scheduler/types";

/** Lo que el planner lee de una receta `type: "prep"` de la app de recetas (solo lectura). */
export interface Grundrecept {
  id: string;
  namn: string;
  kategori: string;
  status: "draft" | "active" | "archived";
  /** Pasos de la receta, uno por línea. */
  steg: string[];
}

/** Normaliza un nombre para comparar: minúsculas, sin "— steg N", sin signos. */
export function normalisera(namn: string, utanParentes = false): string {
  let s = namn.normalize("NFC").toLocaleLowerCase("sv");
  s = s.replace(/\s*[—–-]\s*steg\s*\d+\s*$/u, "");
  if (utanParentes) s = s.replace(/\([^)]*\)/g, " ");
  return s
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const ihop = (s: string) => s.replace(/ /g, "");

export interface Forslag {
  forberedelseId: string;
  /** Coincidencia exacta y única: se propone enlazar directamente. */
  exakt?: string;
  /** Parecidas: Fer decide. Ordenadas de más a menos parecida. */
  kandidater: string[];
}

/** Propuestas de enlace para las preparaciones que aún no tienen grundrecept. */
export function kopplingsforslag(katalog: Forberedelse[], grundrecept: Grundrecept[]): Forslag[] {
  const aktuella = grundrecept.filter((g) => g.status !== "archived");
  return katalog
    .filter((f) => !f.receptId)
    .map((f) => {
      const n = normalisera(f.namn);
      const exakta = aktuella.filter((g) => normalisera(g.namn) === n);
      if (exakta.length === 1) return { forberedelseId: f.id, exakt: exakta[0].id, kandidater: [] };

      // Parecidas: mismo nombre sin paréntesis o sin espacios, o un nombre contiene al otro
      const np = normalisera(f.namn, true);
      const poang = (g: Grundrecept): number => {
        const gn = normalisera(g.namn);
        const gp = normalisera(g.namn, true);
        if (gn === n) return 4; // exacta pero repetida
        if (gp === np || ihop(gp) === ihop(np)) return 3;
        const ord = (s: string) => s.split(" ").filter((w) => w.length > 2);
        if ((` ${gp} `.includes(` ${np} `) || ` ${np} `.includes(` ${gp} `)) && gp && np) return 2;
        const gemensamma = ord(np).filter((w) => ord(gp).includes(w)).length;
        return gemensamma > 0 && gemensamma >= Math.min(ord(np).length, ord(gp).length) ? 1 : 0;
      };
      const kandidater = aktuella
        .map((g) => ({ g, p: poang(g) }))
        .filter((x) => x.p > 0)
        .sort((a, b) => b.p - a.p || a.g.namn.localeCompare(b.g.namn, "sv", { sensitivity: "base" }) || a.g.id.localeCompare(b.g.id))
        .map((x) => x.g.id);
      return { forberedelseId: f.id, kandidater };
    });
}

/** Para las enlazadas, el nombre y la categoría vienen de la app de recetas (fuente de verdad). */
export function synka(katalog: Forberedelse[], grundrecept: Grundrecept[]): Forberedelse[] {
  const porId = new Map(grundrecept.map((g) => [g.id, g]));
  return katalog.map((f) => {
    const g = f.receptId ? porId.get(f.receptId) : undefined;
    if (!g || (g.namn === f.namn && g.kategori === f.kategori)) return f;
    return { ...f, namn: g.namn, kategori: g.kategori || f.kategori };
  });
}

export type KopplingsLage = "kopplad" | "egen" | "saknas";

export function kopplingsLage(f: Forberedelse, grundrecept: Grundrecept[]): KopplingsLage {
  if (!f.receptId) return "egen";
  return grundrecept.some((g) => g.id === f.receptId) ? "kopplad" : "saknas";
}

/** Grundrecept sin preparación en el planner (se muestran como "Ej konfigurerad"). Las archivadas no. */
export function okonfigurerade(katalog: Forberedelse[], grundrecept: Grundrecept[]): Grundrecept[] {
  const kopplade = new Set(katalog.map((f) => f.receptId).filter(Boolean));
  return grundrecept.filter((g) => g.status !== "archived" && !kopplade.has(g.id));
}

/** Convierte una receta del JSON de kitchen_workspace en Grundrecept. Devuelve null si no es una grundrecept. */
export function lasGrundrecept(r: unknown): Grundrecept | null {
  if (!r || typeof r !== "object") return null;
  const x = r as Record<string, unknown>;
  if (x.type !== "prep" || typeof x.id !== "string" || typeof x.name !== "string") return null;
  const status = x.status === "draft" || x.status === "archived" ? x.status : "active";
  const steg =
    typeof x.steps === "string"
      ? x.steps
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  return { id: x.id, namn: x.name.trim(), kategori: typeof x.category === "string" ? x.category : "", status, steg };
}
