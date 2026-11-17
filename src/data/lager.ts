// Estado de la app y acciones. Los cambios se aplican al momento en memoria y se guardan en el
// backend por detrás (una cola por entidad, para que no se adelanten). Si un guardado falla,
// se muestra el error y "Försök igen" repite lo pendiente.

import { useSyncExternalStore } from "react";
import {
  gjordesDet as gjordesDetRen,
  nastaEfter,
  overforTillBefintlig,
  senasteFore,
  skapaDag,
  stangDag as stangDagRen,
  type SparadDag,
  type Status,
} from "../dag/dagar";
import { sv } from "../i18n/sv";
import { synka, type Grundrecept } from "../katalog/koppling";
import { utanForberedelse } from "../katalog/katalog";
import { STANDARD_INSTALLNINGAR, type Dagsplan, type Forberedelse, type Installningar, type PlanResultat } from "../scheduler/types";
import { VisbartFel, type Anvandare, type Backend } from "./backend";
import { DATALAGE } from "./konfig";
import { lokaltBackend } from "./lokaltBackend";
import { supabaseBackend } from "./supabaseBackend";

export interface Lager {
  status: "laddar" | "utloggad" | "klar" | "fel";
  fel?: string;
  anvandare?: Anvandare;
  /** Chef puede cambiar; Kock y Service solo consultan. */
  kanAndra: boolean;
  lage: Backend["lage"];
  /** Catálogo con nombres y categorías de las grundrecept enlazadas ya sincronizados. */
  katalog: Forberedelse[];
  grundrecept: Grundrecept[];
  dagar: Record<string, SparadDag>;
  installningar: Installningar;
  /** Guardados en curso. */
  sparar: number;
  sparfel?: string;
}

const backend: Backend = DATALAGE === "lokal" ? lokaltBackend : supabaseBackend;

let lager: Lager = {
  status: "laddar",
  kanAndra: false,
  lage: backend.lage,
  katalog: [],
  grundrecept: [],
  dagar: {},
  installningar: STANDARD_INSTALLNINGAR,
  sparar: 0,
};
/** Catálogo tal como está guardado (sin sincronizar), para no escribir nombres de la app de recetas sin querer. */
let ravKatalog: Forberedelse[] = [];
const lyssnare = new Set<() => void>();

function satt(andring: Partial<Lager>) {
  lager = { ...lager, ...andring };
  for (const l of lyssnare) l();
}

function sattKatalog(k: Forberedelse[]) {
  ravKatalog = k;
  satt({ katalog: synka(k, lager.grundrecept) });
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

const meddelande = (e: unknown) => (e instanceof VisbartFel ? e.message : e instanceof Error ? e.message : String(e));

// --- Guardado en segundo plano ---------------------------------------------------

const koer = new Map<string, Promise<void>>();
const misslyckade = new Map<string, () => Promise<void>>();

/** Encola un guardado; los de la misma clave van en orden. */
function spara(nyckel: string, jobb: () => Promise<void>) {
  misslyckade.delete(nyckel);
  satt({ sparar: lager.sparar + 1 });
  const forra = koer.get(nyckel) ?? Promise.resolve();
  const nasta = forra.then(jobb).then(
    () => {
      satt({ sparar: lager.sparar - 1, sparfel: misslyckade.size ? lager.sparfel : undefined });
    },
    (e) => {
      misslyckade.set(nyckel, jobb);
      satt({ sparar: lager.sparar - 1, sparfel: sv.fel.sparfel(meddelande(e)) });
    },
  );
  koer.set(nyckel, nasta);
}

export function forsokIgen() {
  const jobb = [...misslyckade.entries()];
  misslyckade.clear();
  satt({ sparfel: undefined });
  for (const [nyckel, j] of jobb) spara(nyckel, j);
}

function kravChef() {
  if (!lager.kanAndra) throw new VisbartFel(sv.fel.bara_chef);
}

// --- Sesión y carga -----------------------------------------------------------------

async function ladda(anvandare: Anvandare) {
  satt({ status: "laddar", anvandare, kanAndra: anvandare.roll === "Chef", fel: undefined });
  const [data, grundrecept] = await Promise.all([backend.hamta(), backend.hamtaGrundrecept()]);
  ravKatalog = data.katalog;
  satt({
    status: "klar",
    grundrecept,
    katalog: synka(data.katalog, grundrecept),
    dagar: data.dagar,
    installningar: data.installningar,
  });
}

export async function starta() {
  try {
    const a = await backend.aktuellAnvandare();
    if (!a) satt({ status: "utloggad" });
    else await ladda(a);
  } catch (e) {
    satt({ status: "fel", fel: meddelande(e) });
  }
}

/** Devuelve el mensaje de error, o null si fue bien. */
export async function loggaIn(epost: string, losenord: string): Promise<string | null> {
  try {
    await ladda(await backend.loggaIn(epost, losenord));
    return null;
  } catch (e) {
    satt({ status: "utloggad" });
    return meddelande(e);
  }
}

/** Vuelve a leer todo del servidor (p. ej. para ver el plan que acaba de guardar Chef). */
export async function uppdatera() {
  if (!lager.anvandare) return starta();
  try {
    await ladda(lager.anvandare);
  } catch (e) {
    satt({ status: "fel", fel: meddelande(e) });
  }
}

export async function loggaUt() {
  await backend.loggaUt();
  ravKatalog = [];
  satt({ status: "utloggad", anvandare: undefined, kanAndra: false, katalog: [], grundrecept: [], dagar: {}, sparfel: undefined });
}

// --- Fecha local --------------------------------------------------------------------

export function idagDatum(nu = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${nu.getFullYear()}-${p(nu.getMonth() + 1)}-${p(nu.getDate())}`;
}

export function tomDag(datum: string): SparadDag {
  return { datum, kockar: 2, poster: [], stangd: false };
}

// --- Catálogo -------------------------------------------------------------------------

export function sparaForberedelse(f: Forberedelse) {
  kravChef();
  const finns = ravKatalog.some((k) => k.id === f.id);
  sattKatalog(finns ? ravKatalog.map((k) => (k.id === f.id ? f : k)) : [...ravKatalog, f]);
  spara(`f:${f.id}`, () => backend.sparaForberedelser([f]));
}

export const laggTillForberedelse = sparaForberedelse;

/** Varias a la vez (importar el catálogo, enlazar con grundrecept). */
export function sparaForberedelser(lista: Forberedelse[]) {
  kravChef();
  const ids = new Set(lista.map((f) => f.id));
  sattKatalog([...ravKatalog.filter((k) => !ids.has(k.id)), ...lista]);
  spara(`f:bulk:${[...ids].join(",")}`, () => backend.sparaForberedelser(lista));
}

/** Borra una preparación, sus referencias en el catálogo y en los días abiertos. */
export function taBortForberedelse(id: string) {
  kravChef();
  const fore = ravKatalog;
  const efter = utanForberedelse(fore, id);
  const andrade = efter.filter((f) => !fore.includes(f));
  sattKatalog(efter);
  spara(`f:${id}`, () => backend.taBortForberedelse(id));
  if (andrade.length) spara(`f:ref:${id}`, () => backend.sparaForberedelser(andrade));
  const dagar = Object.values(lager.dagar).filter((d) => !d.stangd && d.poster.some((p) => p.forberedelseId === id));
  for (const d of dagar) sparaDag({ ...d, poster: d.poster.filter((p) => p.forberedelseId !== id) });
}

/** La preparación tal como está guardada (sin nombres sincronizados), para editarla. */
export function ravForberedelse(id: string): Forberedelse | undefined {
  return ravKatalog.find((f) => f.id === id);
}

// --- Días ----------------------------------------------------------------------------------

function sparaDag(d: SparadDag) {
  satt({ dagar: { ...lager.dagar, [d.datum]: d } });
  spara(`d:${d.datum}`, () => backend.sparaDagar([d]));
}

/** Crea el día si no existe (Chef): cierra el anterior si nadie lo cerró y trae lo pendiente. */
export function oppnaDag(datum: string) {
  if (lager.dagar[datum] || !lager.kanAndra) return;
  const { dag, tidigare } = skapaDag(datum, senasteFore(lager.dagar, datum), ravKatalog);
  if (tidigare) sparaDag(tidigare);
  sparaDag(dag);
}

export function andraDag(datum: string, fn: (d: Dagsplan) => Dagsplan) {
  kravChef();
  const d = lager.dagar[datum] ?? tomDag(datum);
  sparaDag({ ...d, ...fn(d) });
}

export function sparaPlan(datum: string, resultat: PlanResultat, planNyckel: string) {
  kravChef();
  const d = lager.dagar[datum] ?? tomDag(datum);
  sparaDag({ ...d, resultat, planNyckel });
}

export function gjordesDet(datum: string, forberedelseId: string) {
  kravChef();
  const d = lager.dagar[datum];
  if (d) sparaDag(gjordesDetRen(d, forberedelseId, ravKatalog));
}

export function stangDag(datum: string, status: Record<string, Status>) {
  kravChef();
  const d = lager.dagar[datum];
  if (!d) return;
  const stangd = stangDagRen(d, ravKatalog, status);
  // Si el día siguiente ya existe, el arrastre va directamente allí
  const flytt = overforTillBefintlig(stangd, nastaEfter(lager.dagar, datum));
  if (flytt) {
    sparaDag(flytt.stangd);
    sparaDag(flytt.nasta);
  } else sparaDag(stangd);
}

// --- Configuración -------------------------------------------------------------------------

export function sparaInstallningar(i: Installningar) {
  kravChef();
  satt({ installningar: i });
  spara("installningar", () => backend.sparaInstallningar(i));
}

/** Huella de todo lo que influye en el plan: si cambia, el plan guardado está desactualizado. */
export function planNyckel(dag: Dagsplan, katalog: Forberedelse[], inst: Installningar): string {
  const ids = new Set(dag.poster.map((p) => p.forberedelseId));
  return JSON.stringify({
    kockar: dag.kockar,
    poster: dag.poster.map((p) => [p.forberedelseId, p.prioritet, p.ordning]),
    katalog: katalog.filter((f) => ids.has(f.id)),
    inst,
  });
}
