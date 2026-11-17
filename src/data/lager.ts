// Datos locales (fase 2): catálogo, planes del día y configuración en localStorage.
// En la fase 4 esto se sustituye por Supabase (tablas planner_*), con la misma interfaz.

import { useSyncExternalStore } from "react";
import katalogUtkast from "../scheduler/__fixtures__/katalog.json";
import {
  STANDARD_INSTALLNINGAR,
  type Dagsplan,
  type Forberedelse,
  type Installningar,
  type PlanResultat,
} from "../scheduler/types";

export interface Lager {
  katalog: Forberedelse[];
  dagar: Record<string, Dagsplan>;
  installningar: Installningar;
  /** Huella de la entrada con la que se calculó el plan de cada día (para saber si está desactualizado). */
  planNycklar: Record<string, string>;
}

const NYCKEL = "planner.lager.v1";

const utkast = () => structuredClone(katalogUtkast as Forberedelse[]);

function lasa(): Lager {
  const tomt: Lager = { katalog: utkast(), dagar: {}, installningar: STANDARD_INSTALLNINGAR, planNycklar: {} };
  try {
    const raw = localStorage.getItem(NYCKEL);
    if (!raw) return tomt;
    const l = JSON.parse(raw) as Partial<Lager>;
    return {
      katalog: l.katalog ?? tomt.katalog,
      dagar: l.dagar ?? {},
      installningar: { ...STANDARD_INSTALLNINGAR, ...l.installningar },
      planNycklar: l.planNycklar ?? {},
    };
  } catch {
    return tomt;
  }
}

let lager: Lager = lasa();
const lyssnare = new Set<() => void>();

function satt(nytt: Lager) {
  lager = nytt;
  try {
    localStorage.setItem(NYCKEL, JSON.stringify(nytt));
  } catch {
    // Sin almacenamiento (modo privado): la app funciona igual durante la sesión
  }
  for (const l of lyssnare) l();
}

export function useLager(): Lager {
  return useSyncExternalStore(
    (l) => {
      lyssnare.add(l);
      return () => lyssnare.delete(l);
    },
    () => lager,
  );
}

export function hamtaLager(): Lager {
  return lager;
}

// --- Fecha local ------------------------------------------------------------

export function idagDatum(nu = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${nu.getFullYear()}-${p(nu.getMonth() + 1)}-${p(nu.getDate())}`;
}

export function tomDag(datum: string): Dagsplan {
  return { datum, kockar: 2, poster: [], stangd: false };
}

// --- Acciones ----------------------------------------------------------------

export function sparaForberedelse(f: Forberedelse) {
  satt({ ...lager, katalog: lager.katalog.map((k) => (k.id === f.id ? f : k)) });
}

export function aterstallKatalog() {
  satt({ ...lager, katalog: utkast() });
}

export function andraDag(datum: string, fn: (d: Dagsplan) => Dagsplan) {
  const d = fn(lager.dagar[datum] ?? tomDag(datum));
  satt({ ...lager, dagar: { ...lager.dagar, [datum]: d } });
}

export function sparaPlan(datum: string, resultat: PlanResultat, nyckel: string) {
  const d = lager.dagar[datum] ?? tomDag(datum);
  satt({
    ...lager,
    dagar: { ...lager.dagar, [datum]: { ...d, resultat } },
    planNycklar: { ...lager.planNycklar, [datum]: nyckel },
  });
}

/** Huella de todo lo que influye en el plan: si cambia, el plan guardado está desactualizado. */
export function planNyckel(dag: Dagsplan, katalog: Forberedelse[], inst: Installningar): string {
  const ids = new Set(dag.poster.map((p) => p.forberedelseId));
  const relevantes = katalog.filter((f) => ids.has(f.id));
  return JSON.stringify({
    kockar: dag.kockar,
    poster: dag.poster.map((p) => [p.forberedelseId, p.prioritet, p.ordning]),
    katalog: relevantes,
    inst,
  });
}
