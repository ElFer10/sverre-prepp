// Copia del último estado cargado, para ver el plan sin conexión (solo lectura).
// Solo hoy y los días siguientes: el plan de días pasados no hace falta y ocupa sitio.

import type { SparadDag } from "../dag/dagar";
import type { Grundrecept } from "../katalog/koppling";
import type { Forberedelse, Installningar } from "../scheduler/types";
import type { Anvandare } from "./backend";

const NYCKEL = "planner.offline.v1";

export interface OfflineKopia {
  /** Momento de la carga (ISO). */
  tid: string;
  anvandare: Anvandare;
  katalog: Forberedelse[];
  grundrecept: Grundrecept[];
  dagar: Record<string, SparadDag>;
  installningar: Installningar;
}

type Lagring = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function lagring(): Lagring | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function sparaKopia(k: OfflineKopia, fran: string, l = lagring()) {
  const dagar = Object.fromEntries(Object.entries(k.dagar).filter(([d]) => d >= fran));
  try {
    l?.setItem(NYCKEL, JSON.stringify({ ...k, dagar }));
  } catch {
    // Sin sitio o bloqueado: la app sigue funcionando, solo sin copia
  }
}

export function lasKopia(l = lagring()): OfflineKopia | null {
  try {
    const t = l?.getItem(NYCKEL);
    const k = t ? (JSON.parse(t) as OfflineKopia) : null;
    return k && k.tid && k.anvandare && Array.isArray(k.katalog) ? k : null;
  } catch {
    return null;
  }
}

export function raderaKopia(l = lagring()) {
  try {
    l?.removeItem(NYCKEL);
  } catch {
    // nada
  }
}
