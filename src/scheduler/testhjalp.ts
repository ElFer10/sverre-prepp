// Utilidades para los tests del planificador (no se usan en la app).
import katalogJson from "./__fixtures__/katalog.json";
import { planera } from "./planera";
import {
  STANDARD_INSTALLNINGAR,
  type Dagsplan,
  type DagensPost,
  type Forberedelse,
  type Installningar,
  type PlanResultat,
  type PlaneradFas,
} from "./types";

export const KATALOG = katalogJson as Forberedelse[];

export type PostKort = string | readonly [string, DagensPost["prioritet"]];

export function dag(poster: PostKort[], kockar: 1 | 2 = 2): Dagsplan {
  return {
    datum: "2026-11-17",
    kockar,
    stangd: false,
    poster: poster.map((p, i) => {
      const [id, prioritet] = typeof p === "string" ? [p, "maste" as const] : p;
      return { forberedelseId: id, prioritet, ordning: i, status: "planerad" };
    }),
  };
}

export interface KorOpts {
  kockar?: 1 | 2;
  inst?: Partial<Installningar>;
  seed?: number;
  katalog?: Forberedelse[];
}

/** Planifica y valida los invariantes generales. */
export function kor(poster: PostKort[], opts: KorOpts = {}): PlanResultat {
  const inst = { ...STANDARD_INSTALLNINGAR, iterationer: 150, ...opts.inst };
  const katalog = opts.katalog ?? KATALOG;
  const d = dag(poster, opts.kockar ?? 2);
  const res = planera(katalog, d, inst, opts.seed ?? 1);
  const fel = validera(res, katalog, d, inst);
  if (fel.length) throw new Error("Plan inválido:\n" + fel.join("\n"));
  return res;
}

export function faserAv(res: PlanResultat, prepId: string): PlaneradFas[] {
  return res.faser.filter((f) => f.forberedelseId === prepId);
}

export function fas(res: PlanResultat, prepId: string, nr: number): PlaneradFas {
  const f = res.faser.find((x) => x.fasId === `${prepId}-${nr}`);
  if (!f) throw new Error(`Fase ${prepId}-${nr} no planificada`);
  return f;
}

export function prepStart(res: PlanResultat, prepId: string): number {
  return Math.min(...faserAv(res, prepId).map((f) => f.start));
}

export function prepSlut(res: PlanResultat, prepId: string): number {
  return Math.max(...faserAv(res, prepId).map((f) => f.slut));
}

export function overlappar(a: { start: number; slut: number }, b: { start: number; slut: number }): boolean {
  return a.start < b.slut && b.start < a.slut;
}

/** Minutos efectivos de una fase (sin sus pausas). */
export function minuterAv(f: PlaneradFas): number[] {
  const m: number[] = [];
  for (let t = f.start; t < f.slut; t++) {
    if (!f.pauser.some((p) => t >= p.start && t < p.slut)) m.push(t);
  }
  return m;
}

function rango(a: number, b: number): number[] {
  const r: number[] = [];
  for (let t = a; t < b; t++) r.push(t);
  return r;
}

/** Comprueba los invariantes de cualquier plan. Devuelve la lista de errores. */
export function validera(res: PlanResultat, katalog: Forberedelse[], d: Dagsplan, inst: Installningar): string[] {
  const fel: string[] = [];
  const T = res.oppning;
  const porId = new Map(katalog.map((f) => [f.id, f]));
  const fasDef = new Map(katalog.flatMap((f) => f.faser.map((x) => [x.id, x] as const)));
  const enLista = new Set(d.poster.map((p) => p.forberedelseId));

  // 1. Secuencia, duración y maxVantanFore por preparación
  const preps = [...new Set(res.faser.map((f) => f.forberedelseId))];
  for (const id of preps) {
    const def = porId.get(id)!;
    const fs = faserAv(res, id);
    if (fs.length !== def.faser.length) fel.push(`${id}: ${fs.length}/${def.faser.length} fases planificadas`);
    fs.forEach((f, i) => {
      const fd = def.faser[i];
      if (f.fasId !== fd.id) fel.push(`${id}: orden de fases incorrecto`);
      const dur = fd.maxMinuter ?? fd.minuter;
      const pausa = f.pauser.reduce((s, p) => s + p.slut - p.start, 0);
      if (f.slut - f.start - pausa !== dur) fel.push(`${f.fasId}: duración ${f.slut - f.start - pausa} ≠ ${dur}`);
      if (f.start < 0) fel.push(`${f.fasId}: empieza antes de t=0`);
      if (f.efterOppning !== f.start >= T) fel.push(`${f.fasId}: efterOppning incorrecto`);
      if (i > 0) {
        const prev = fs[i - 1];
        if (f.start < prev.slut) fel.push(`${f.fasId}: empieza antes de que termine la fase anterior`);
        const w = fd.maxVantanFore;
        if (w != null && f.start - prev.slut > w) fel.push(`${f.fasId}: espera ${f.start - prev.slut} > maxVantanFore ${w}`);
      }
      if (fd.typ === "aktiv" && f.kock === undefined && f.start < T) fel.push(`${f.fasId}: fase activa sin cocinero`);
      if (fd.typ !== "aktiv" && f.kock !== undefined) fel.push(`${f.fasId}: fase no activa con cocinero`);
      if (f.kock !== undefined && (f.kock < 1 || f.kock > d.kockar)) fel.push(`${f.fasId}: cocinero ${f.kock} no existe`);
    });
  }

  // 2. Cocineros: nunca dos cosas a la vez
  const kockMin = new Map<string, string>();
  const ocupar = (k: number, t: number, quien: string) => {
    const clave = `${k}:${t}`;
    if (kockMin.has(clave)) fel.push(`Kock ${k} min ${t}: ${kockMin.get(clave)} y ${quien}`);
    kockMin.set(clave, quien);
  };
  for (const f of res.faser) if (f.kock !== undefined) for (const t of minuterAv(f)) ocupar(f.kock, t, f.fasId);
  for (const g of res.ingrepp) {
    if (g.kock === undefined) {
      if (g.start < T) fel.push(`${g.typ} ${g.fasId}@${g.start}: sin cocinero antes de la apertura`);
      continue;
    }
    for (const t of rango(g.start, g.slut)) ocupar(g.kock, t, `${g.typ}:${g.fasId}`);
  }
  // Las pausas de una fase activa coinciden con intervenciones del mismo cocinero
  for (const f of res.faser) {
    if (f.typ !== "aktiv") continue;
    for (const p of f.pauser)
      for (const t of rango(p.start, p.slut)) {
        const q = kockMin.get(`${f.kock}:${t}`);
        if (!q || !q.includes(":")) fel.push(`${f.fasId}: pausa en ${t} sin intervención`);
      }
  }

  // 3. Hornillas, Thermomix, Pacojet: una cosa por unidad
  const unidades: Array<[string, number]> = [
    ["spisplatta", inst.spisplattor],
    ["thermomix", inst.thermomix.antal],
    ["pacojet", inst.pacojet.antal],
  ];
  for (const [r, antal] of unidades) {
    const occ = new Map<string, string>();
    const usos: Array<{ enhet: number; start: number; slut: number }> = [];
    for (const f of res.faser) {
      if (f.resurs !== r) continue;
      if (f.enhet === undefined || f.enhet < 0 || f.enhet >= antal) fel.push(`${f.fasId}: unidad ${f.enhet} de ${r} no existe`);
      usos.push({ enhet: f.enhet!, start: f.start, slut: f.slut });
      for (const t of minuterAv(f)) {
        const c = `${f.enhet}:${t}`;
        if (occ.has(c)) fel.push(`${r} ${f.enhet} min ${t}: ${occ.get(c)} y ${f.fasId}`);
        occ.set(c, f.fasId);
      }
    }
    for (const g of res.ingrepp.filter((g) => g.typ === "rengoring" && g.resurs === r))
      for (const t of rango(g.start, g.slut)) {
        const c = `${g.enhet}:${t}`;
        if (occ.has(c)) fel.push(`${r} ${g.enhet} min ${t}: limpieza solapa con ${occ.get(c)}`);
        occ.set(c, "rengoring");
      }
    if (r !== "spisplatta") {
      // Entre dos usos seguidos hay una limpieza
      for (let e = 0; e < antal; e++) {
        const u = usos.filter((x) => x.enhet === e).sort((a, b) => a.start - b.start);
        for (let i = 1; i < u.length; i++) {
          const hay = res.ingrepp.some(
            (g) => g.typ === "rengoring" && g.resurs === r && g.enhet === e && g.start >= u[i - 1].slut && g.slut <= u[i].start,
          );
          if (!hay) fel.push(`${r} ${e}: sin limpieza entre ${u[i - 1].start} y ${u[i].start}`);
        }
      }
    }
  }

  // 4. Horno
  const bloques = res.ugn;
  const cambio = Math.max(inst.ugn.forvarmningMin, inst.ugn.bytesMin);
  bloques.forEach((b, i) => {
    if (b.klar - b.start !== cambio) fel.push(`Ugn bloque ${i}: calentar ${b.klar - b.start} min`);
    if (b.start < 0) fel.push(`Ugn bloque ${i}: empieza antes de t=0`);
    if (i > 0 && b.start < bloques[i - 1].slut) fel.push(`Ugn bloque ${i}: solapa con el anterior`);
    if (b.forvarmning !== (i === 0)) fel.push(`Ugn bloque ${i}: forvarmning incorrecto`);
  });
  const bleckMin = new Map<number, number>();
  for (const f of res.faser) {
    if (f.resurs !== "ugn") continue;
    const u = fasDef.get(f.fasId)!.ugn!;
    const b = bloques[f.ugnBlock ?? -1];
    if (!b) {
      fel.push(`${f.fasId}: sin bloque de horno`);
      continue;
    }
    if (f.start < b.klar || f.slut > b.slut) fel.push(`${f.fasId}: fuera de su bloque de horno`);
    if (b.lage !== u.lage || b.fukt !== u.fukt) fel.push(`${f.fasId}: modo de horno incorrecto`);
    if (b.temp < u.tempMin || b.temp > u.tempMax) fel.push(`${f.fasId}: ${b.temp} °C fuera de ${u.tempMin}–${u.tempMax}`);
    for (const t of rango(f.start, f.slut)) bleckMin.set(t, (bleckMin.get(t) ?? 0) + u.bleck);
  }
  for (const [t, n] of bleckMin) if (n > inst.ugn.bleck) fel.push(`Ugn min ${t}: ${n} bleck`);
  for (const b of bloques) {
    const g = res.ingrepp.find((x) => x.typ === "ugn-installning" && x.start === b.start);
    if (!g) fel.push(`Ugn bloque ${b.start}: sin programar`);
  }

  // 5. Dependencias
  for (const id of preps) {
    for (const dep of porId.get(id)!.beroendeAv) {
      if (!enLista.has(dep) || !preps.includes(dep)) continue;
      if (prepStart(res, id) < prepSlut(res, dep)) fel.push(`${id} empieza antes de que termine ${dep}`);
    }
  }

  // 6. Tillsyn: una intervención por periodo
  for (const f of res.faser) {
    const fd = fasDef.get(f.fasId)!;
    if (fd.typ !== "tillsyn" || !fd.tillsyn) continue;
    const dur = fd.maxMinuter ?? fd.minuter;
    const esperadas = Math.ceil(dur / fd.tillsyn.varjeMin) - 1;
    const n = res.ingrepp.filter((g) => g.typ === "tillsyn" && g.fasId === f.fasId).length;
    if (n !== esperadas) fel.push(`${f.fasId}: ${n} intervenciones, se esperaban ${esperadas}`);
  }

  // 7. Interrupciones: la pausa de la salsa cuadra con el avbrott
  for (const a of res.avbrott) {
    const salsa = res.faser.find((f) => f.fasId === a.fasId)!;
    if (!salsa.pauser.some((p) => p.start === a.start && p.slut === a.slut)) fel.push(`${a.fasId}: pausa no registrada`);
    if (!fasDef.get(a.fasId)!.avbrytbar) fel.push(`${a.fasId}: interrumpida sin ser avbrytbar`);
  }
  return fel;
}
