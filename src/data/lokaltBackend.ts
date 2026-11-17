// Backend local (VITE_DATA_MODE=lokal): todo en localStorage, siempre como Chef y sin grundrecept.
// Sirve para desarrollar y probar sin tocar Supabase.

import type { SparadDag } from "../dag/dagar";
import { STANDARD_INSTALLNINGAR, type Forberedelse, type Installningar } from "../scheduler/types";
import type { Backend, Data } from "./backend";

const NYCKEL = "planner.lokal.v2";

function lasa(): Data {
  try {
    const raw = localStorage.getItem(NYCKEL);
    if (raw) {
      const d = JSON.parse(raw) as Partial<Data>;
      return { katalog: d.katalog ?? [], dagar: d.dagar ?? {}, installningar: { ...STANDARD_INSTALLNINGAR, ...d.installningar } };
    }
  } catch {
    // datos corruptos o sin acceso: empezar vacío
  }
  return { katalog: [], dagar: {}, installningar: STANDARD_INSTALLNINGAR };
}

function skriva(fn: (d: Data) => Data) {
  const d = fn(lasa());
  try {
    localStorage.setItem(NYCKEL, JSON.stringify(d));
  } catch {
    // sin almacenamiento: la sesión sigue funcionando en memoria
  }
}

export const lokaltBackend: Backend = {
  lage: "lokal",
  async aktuellAnvandare() {
    return { epost: "lokal", roll: "Chef" };
  },
  async loggaIn() {
    return { epost: "lokal", roll: "Chef" };
  },
  async loggaUt() {},
  async hamta() {
    return lasa();
  },
  async hamtaGrundrecept() {
    return [];
  },
  async sparaForberedelser(lista: Forberedelse[]) {
    skriva((d) => {
      const ids = new Set(lista.map((f) => f.id));
      return { ...d, katalog: [...d.katalog.filter((f) => !ids.has(f.id)), ...lista] };
    });
  },
  async taBortForberedelse(id: string) {
    skriva((d) => ({ ...d, katalog: d.katalog.filter((f) => f.id !== id) }));
  },
  async sparaDagar(lista: SparadDag[]) {
    skriva((d) => ({ ...d, dagar: { ...d.dagar, ...Object.fromEntries(lista.map((x) => [x.datum, x])) } }));
  },
  async sparaInstallningar(i: Installningar) {
    skriva((d) => ({ ...d, installningar: i }));
  },
};

/** Catálogo que quedó en este navegador de la versión anterior (fase 2), para importarlo a la nube. */
export function tidigareLokalKatalog(): Forberedelse[] {
  try {
    const raw = localStorage.getItem("planner.lager.v1");
    const k = raw ? (JSON.parse(raw) as { katalog?: Forberedelse[] }).katalog : undefined;
    return Array.isArray(k) ? k : [];
  } catch {
    return [];
  }
}
