// Del resultado del planificador a filas para mostrar (lista por cocinero, Gantt, avisos).
// Puro: lo usan la pantalla Plan y, en la fase 3, el PDF.

import { sv } from "../i18n/sv";
import type {
  Fas,
  Forberedelse,
  Ingrepp,
  Intervall,
  PlanResultat,
  PlaneradFas,
  Varning,
} from "../scheduler/types";

export function tillMinuter(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Minuto del plan (0 = inicio) → "14:05". */
export function klockslag(min: number, start: string): string {
  const t = tillMinuter(start) + min;
  const h = Math.floor(t / 60) % 24;
  const m = t % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "2026-11-17" → "Tisdag 17 november". */
export function datumText(datum: string): string {
  const [y, m, d] = datum.split("-").map(Number);
  const s = new Date(y, m - 1, d).toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "2026-11-18" → "18 nov". */
export function kortDatum(datum: string): string {
  const [y, m, d] = datum.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("sv-SE", { day: "numeric", month: "short" }).replace(".", "");
}

export interface Uppslag {
  forb: (id: string) => Forberedelse | undefined;
  fas: (id: string) => { forb: Forberedelse; fas: Fas; index: number } | undefined;
  namn: (id: string) => string;
}

export function uppslag(katalog: Forberedelse[]): Uppslag {
  const forb = new Map(katalog.map((f) => [f.id, f]));
  const fas = new Map(katalog.flatMap((f) => f.faser.map((x, index) => [x.id, { forb: f, fas: x, index }] as const)));
  return {
    forb: (id) => forb.get(id),
    fas: (id) => fas.get(id),
    namn: (id) => forb.get(id)?.namn ?? id,
  };
}

// ---------------------------------------------------------------------------
// Lista por cocinero

export interface Rad {
  start: number;
  slut: number;
  /** Qué se hace ("Skala och tärna", "Rengör Thermomix"…). */
  text: string;
  forberedelseId: string;
  forberedelse: string;
  /** "fas" o el tipo de intervención. */
  slag: "fas" | Ingrepp["typ"];
  /** Líneas secundarias: lo que sigue, notas, pausas. */
  detaljer: string[];
}

function ingreppText(g: Ingrepp, res: PlanResultat, u: Uppslag): string {
  switch (g.typ) {
    case "tillsyn":
      return `${sv.ingrepp.tillsyn}: ${u.fas(g.fasId)?.fas.namn ?? ""}`;
    case "rengoring":
      return sv.rad.rengor(g.resurs ? sv.resurs[g.resurs] : "");
    case "ugn-installning": {
      const b = res.ugn.find((x) => x.start === g.start);
      if (!b) return sv.ingrepp["ugn-installning"];
      return b.forvarmning ? sv.rad.forvarm(sv.lage[b.lage], b.temp) : sv.rad.byt(sv.lage[b.lage], b.temp);
    }
    case "flytta-av":
      return sv.rad.flyttaAv((g.enhet ?? 0) + 1);
    case "flytta-pa":
      return sv.rad.flyttaPa((g.enhet ?? 0) + 1);
  }
}

function fasDetaljer(f: PlaneradFas, res: PlanResultat, u: Uppslag, start: string): string[] {
  const d: string[] = [];
  const info = u.fas(f.fasId);
  if (!info) return d;
  if (info.fas.notering) d.push(info.fas.notering);
  if (f.pauser.length && f.typ === "aktiv") d.push(sv.rad.pausad);
  // Lo que sigue sin el cocinero: "→ ugn till 14:55"
  const nasta = res.faser.find((x) => x.fasId === info.forb.faser[info.index + 1]?.id);
  if (nasta && nasta.typ !== "aktiv") {
    const nf = u.fas(nasta.fasId)!.fas;
    const hasta = klockslag(nasta.slut, start);
    d.push(nf.resurs ? sv.rad.sedan(nf.resurs, hasta) : sv.rad.sedanVanta(hasta));
    if (nf.maxMinuter !== undefined) d.push(sv.rad.kontrolleraEfter(nf.minuter));
  }
  return d;
}

function fasRad(f: PlaneradFas, res: PlanResultat, u: Uppslag, start: string): Rad {
  return {
    start: f.start,
    slut: f.slut,
    text: u.fas(f.fasId)?.fas.namn ?? f.fasId,
    forberedelseId: f.forberedelseId,
    forberedelse: u.namn(f.forberedelseId),
    slag: "fas",
    detaljer: fasDetaljer(f, res, u, start),
  };
}

function ingreppRad(g: Ingrepp, res: PlanResultat, u: Uppslag): Rad {
  return {
    start: g.start,
    slut: g.slut,
    text: ingreppText(g, res, u),
    forberedelseId: g.forberedelseId,
    forberedelse: u.namn(g.forberedelseId),
    slag: g.typ,
    detaljer: [],
  };
}

const ordna = (a: Rad, b: Rad) => a.start - b.start || a.slut - b.slut || a.text.localeCompare(b.text, "sv");

/** Todo lo que hace un cocinero (fases activas e intervenciones), en orden. */
export function kockRader(res: PlanResultat, katalog: Forberedelse[], kock: number, start: string): Rad[] {
  const u = uppslag(katalog);
  return [
    ...res.faser.filter((f) => f.kock === kock).map((f) => fasRad(f, res, u, start)),
    ...res.ingrepp.filter((g) => g.kock === kock).map((g) => ingreppRad(g, res, u)),
  ].sort(ordna);
}

/** "Efter 16:00": lo que sigue durante el servicio (sin cocinero asignado). */
export function efterOppningRader(res: PlanResultat, katalog: Forberedelse[], start: string): Rad[] {
  const u = uppslag(katalog);
  return [
    ...res.faser.filter((f) => f.efterOppning && f.kock === undefined).map((f) => fasRad(f, res, u, start)),
    ...res.ingrepp.filter((g) => g.kock === undefined).map((g) => ingreppRad(g, res, u)),
  ].sort(ordna);
}

// ---------------------------------------------------------------------------
// Avisos y "Kontrollera före start"

export function varningsText(v: Varning, u: Uppslag): string {
  switch (v.typ) {
    case "sen":
      return sv.varning.sen(u.namn(v.forberedelseId), v.minuterSent, v.flaskhalsar.map((f) => sv.flaskhals[f]).join(", "));
    case "ej-konfigurerad":
      return sv.varning.ejKonfigurerad(u.namn(v.forberedelseId));
    case "okand":
      return sv.varning.okand(v.forberedelseId);
  }
}

export function kontrollRader(res: PlanResultat, u: Uppslag): string[] {
  const r: string[] = [];
  for (const k of res.kontrolleraFore) {
    const t = k.krav ? `${k.krav} (${u.namn(k.forberedelseId)})` : sv.plan.redanGjord(u.namn(k.beroendeAv!));
    if (!r.includes(t)) r.push(t);
  }
  return r;
}

// ---------------------------------------------------------------------------
// Gantt

export interface Stapel {
  start: number;
  slut: number;
  etikett: string;
  forberedelseId?: string;
  slag: "aktiv" | "vantan" | "tillsyn" | "ingrepp" | "uppvarmning";
  pauser: Intervall[];
  /** Carril dentro de la fila cuando hay solapes (horno). */
  bana: number;
}

export interface GanttRad {
  namn: string;
  staplar: Stapel[];
  banor: number;
}

/** Reparte barras solapadas en carriles (coloreado de intervalos voraz). */
function tilldelaBanor(staplar: Omit<Stapel, "bana">[]): { staplar: Stapel[]; banor: number } {
  const ordnade = [...staplar].sort((a, b) => a.start - b.start || b.slut - a.slut);
  const slutPerBana: number[] = [];
  const r = ordnade.map((s) => {
    let bana = slutPerBana.findIndex((e) => e <= s.start);
    if (bana < 0) {
      bana = slutPerBana.length;
      slutPerBana.push(0);
    }
    slutPerBana[bana] = s.slut;
    return { ...s, bana };
  });
  return { staplar: r, banor: Math.max(1, slutPerBana.length) };
}

export function ganttRader(res: PlanResultat, katalog: Forberedelse[], plattor: number): GanttRad[] {
  const u = uppslag(katalog);
  const fasStapel = (f: PlaneradFas): Omit<Stapel, "bana"> => ({
    start: f.start,
    slut: f.slut,
    etikett: u.namn(f.forberedelseId),
    forberedelseId: f.forberedelseId,
    slag: f.typ,
    pauser: f.pauser,
  });
  const ingStapel = (g: Ingrepp): Omit<Stapel, "bana"> => ({
    start: g.start,
    slut: g.slut,
    etikett: ingreppText(g, res, u),
    forberedelseId: g.forberedelseId,
    slag: "ingrepp",
    pauser: [],
  });
  const rad = (namn: string, s: Omit<Stapel, "bana">[]): GanttRad => ({ namn, ...tilldelaBanor(s) });

  const rader: GanttRad[] = [];
  for (let k = 1; k <= res.kockar; k++) {
    rader.push(
      rad(sv.plan.kock(k), [
        ...res.faser.filter((f) => f.kock === k).map(fasStapel),
        ...res.ingrepp.filter((g) => g.kock === k).map(ingStapel),
      ]),
    );
  }
  rader.push(
    rad(sv.gantt.rad.ugn, [
      ...res.ugn.map((b) => ({
        start: b.start,
        slut: b.klar,
        etikett: b.forvarmning ? sv.rad.forvarm(sv.lage[b.lage], b.temp) : sv.rad.byt(sv.lage[b.lage], b.temp),
        slag: "uppvarmning" as const,
        pauser: [],
      })),
      ...res.faser.filter((f) => f.resurs === "ugn").map(fasStapel),
    ]),
  );
  for (let p = 0; p < plattor; p++) {
    rader.push(rad(sv.gantt.rad.platta(p + 1), res.faser.filter((f) => f.resurs === "spisplatta" && f.enhet === p).map(fasStapel)));
  }
  for (const m of ["thermomix", "pacojet"] as const) {
    rader.push(
      rad(sv.gantt.rad[m], [
        ...res.faser.filter((f) => f.resurs === m).map(fasStapel),
        ...res.ingrepp.filter((g) => g.typ === "rengoring" && g.resurs === m).map(ingStapel),
      ]),
    );
  }
  return rader;
}

/** Último minuto con algo planificado (para la escala del Gantt). */
export function sistaMinut(res: PlanResultat): number {
  return Math.max(res.oppning, ...res.faser.map((f) => f.slut), ...res.ingrepp.map((g) => g.slut));
}

// ---------------------------------------------------------------------------
// Recursos (PDF): línea de tiempo del horno y ocupación de hornillas y máquinas

export interface Handelse {
  tid: number;
  text: string;
}

/** "14:00 Förvärm varmluft 180 °C (klar 14:10)", "14:10 In: Rotsellerikräm (2 bleck)", "14:40 Ut: …". */
export function ugnHandelser(res: PlanResultat, katalog: Forberedelse[], start: string): Handelse[] {
  const u = uppslag(katalog);
  const h: Array<Handelse & { prio: number }> = [];
  for (const b of res.ugn) {
    const inst = b.forvarmning ? sv.rad.forvarm(sv.lage[b.lage], b.temp) : sv.rad.byt(sv.lage[b.lage], b.temp);
    h.push({ tid: b.start, prio: 1, text: `${inst} (${sv.pdf.klar(klockslag(b.klar, start))})` });
  }
  for (const f of res.faser.filter((x) => x.resurs === "ugn")) {
    const bleck = u.fas(f.fasId)?.fas.ugn?.bleck ?? 1;
    const namn = u.namn(f.forberedelseId);
    h.push({ tid: f.start, prio: 2, text: sv.pdf.in(namn, bleck) });
    h.push({ tid: f.slut, prio: 0, text: sv.pdf.ut(namn) });
  }
  // A la misma hora: primero sale, luego se cambia, luego entra
  return h.sort((a, b) => a.tid - b.tid || a.prio - b.prio || a.text.localeCompare(b.text, "sv")).map(({ tid, text }) => ({ tid, text }));
}

/** Ocupación de una hornilla, Thermomix o Pacojet, con interrupciones y limpiezas. */
export function resursRader(
  res: PlanResultat,
  katalog: Forberedelse[],
  resurs: "spisplatta" | "thermomix" | "pacojet",
  enhet: number,
  start: string,
): Rad[] {
  const u = uppslag(katalog);
  const tid = (m: number) => klockslag(m, start);
  const rader: Rad[] = res.faser
    .filter((f) => f.resurs === resurs && f.enhet === enhet)
    .map((f) => ({
      start: f.start,
      slut: f.slut,
      text: u.fas(f.fasId)?.fas.namn ?? f.fasId,
      forberedelseId: f.forberedelseId,
      forberedelse: u.namn(f.forberedelseId),
      slag: "fas" as const,
      detaljer: res.avbrott
        .filter((a) => a.fasId === f.fasId)
        .map((a) => `${tid(a.start)}–${tid(a.slut)} ${sv.pdf.avbrott(u.namn(a.avForberedelseId))}`),
    }));
  for (const g of res.ingrepp.filter((x) => x.typ === "rengoring" && x.resurs === resurs && x.enhet === enhet)) {
    rader.push(ingreppRad(g, res, u));
  }
  return rader.sort(ordna);
}
