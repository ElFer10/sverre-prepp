// Punto de entrada del planificador (SPEC §5): catálogo + plan del día + configuración → plan + avisos.

import { Konstruktion, topo, type Ctx, type PrepInfo, type Relajacion, type Utfall, type Variant } from "./konstruktion";
import { blanda, mulberry32, type Rng } from "./rng";
import {
  STANDARD_INSTALLNINGAR,
  type Dagsplan,
  type Flaskhals,
  type Forberedelse,
  type Ingrepp,
  type Installningar,
  type KontrollPunkt,
  type PlanResultat,
  type PlaneradFas,
  type UgnBlock,
  type Varning,
} from "./types";

/** Minutos que se permite seguir planificando después de la apertura. */
const HORISONT_EFTER = 600;

function minuter(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

const fasDur = (f: Forberedelse["faser"][number]) => f.maxMinuter ?? f.minuter;

export function planera(
  katalog: Forberedelse[],
  dagsplan: Dagsplan,
  inst: Installningar = STANDARD_INSTALLNINGAR,
  seed = 1,
): PlanResultat {
  const T = minuter(inst.oppning) - minuter(inst.start);
  const H = T + HORISONT_EFTER;
  const porId = new Map(katalog.map((f) => [f.id, f]));
  const varningar: Varning[] = [];

  // --- Preparaciones válidas del día -------------------------------------------------
  const poster = dagsplan.poster.filter(
    (p, i, a) => a.findIndex((q) => q.forberedelseId === p.forberedelseId) === i,
  );
  const valida = poster.filter((post) => {
    const f = porId.get(post.forberedelseId);
    if (!f) varningar.push({ typ: "okand", forberedelseId: post.forberedelseId });
    else if (f.faser.length === 0) varningar.push({ typ: "ej-konfigurerad", forberedelseId: f.id });
    return !!f && f.faser.length > 0;
  });
  const indice = new Map(valida.map((p, i) => [p.forberedelseId, i]));
  const omTidRang = valida
    .map((p, i) => ({ p, i }))
    .filter((x) => x.p.prioritet === "om-tid")
    .sort((a, b) => (a.p.ordning ?? a.i) - (b.p.ordning ?? b.i) || a.i - b.i);

  const preps: PrepInfo[] = valida.map((post, idx) => {
    const forb = porId.get(post.forberedelseId)!;
    const delningIdx = forb.faser.findIndex((f) => f.avbrytbar && f.resurs === "spisplatta" && f.typ !== "aktiv");
    return {
      idx,
      forb,
      maste: post.prioritet === "maste",
      egenEfter: forb.kanAvslutasEfterOppning,
      arvEfter: false,
      efter: forb.kanAvslutasEfterOppning,
      deps: forb.beroendeAv.flatMap((d) => (indice.has(d) ? [indice.get(d)!] : [])),
      senast: forb.farskhet === "senast-mojligt",
      delning: delningIdx,
      efterDifferad: false,
      rang: omTidRang.findIndex((x) => x.i === idx),
      dur: forb.faser.map(fasDur),
      kedja: 0,
    };
  });

  // Orden topológico para propagar herencias
  const topoAlla = topo(preps.map((p) => p.idx), preps);
  for (const i of topoAlla) {
    const p = preps[i];
    p.arvEfter = p.deps.some((d) => preps[d].efter);
    p.efter = p.egenEfter || p.arvEfter;
    p.kedja = p.dur.reduce((a, b) => a + b, 0) + Math.max(0, ...p.deps.map((d) => preps[d].kedja));
  }
  // Una "om-tid" de la que depende una obligatoria pasa a ser obligatoria
  for (const i of [...topoAlla].reverse()) if (preps[i].maste) for (const d of preps[i].deps) preps[d].maste = true;
  // Solo se cortan (y se pueden interrumpir) las salsas obligatorias sin dependencias cortadas
  for (const i of topoAlla) {
    const p = preps[i];
    p.efterDifferad = p.deps.some((d) => preps[d].delning >= 0 || preps[d].efterDifferad);
    if (!p.maste || p.efterDifferad) p.delning = -1;
  }

  // --- Recurso más escaso del día (criterio de orden §5.2.1.3) ------------------------
  const uso = (p: PrepInfo, r: string) =>
    p.forb.faser.reduce((s, f, i) => s + (f.resurs === r ? p.dur[i] : 0), 0);
  const capacidad: Record<string, number> = {
    ugn: 1,
    spisplatta: inst.spisplattor,
    thermomix: inst.thermomix.antal,
    pacojet: inst.pacojet.antal,
  };
  let escaso = "ugn";
  let maxCarga = -1;
  for (const r of Object.keys(capacidad)) {
    const carga = preps.reduce((s, p) => s + uso(p, r), 0) / capacidad[r];
    if (carga > maxCarga) [escaso, maxCarga] = [r, carga];
  }

  const ordna = (grupo: PrepInfo[], rng: Rng, storning: boolean): number[] => {
    const slump = new Map(grupo.map((p) => [p.idx, rng()]));
    const lista = [...grupo]
      .sort(
        (a, b) =>
          Number(b.egenEfter) - Number(a.egenEfter) ||
          b.kedja - a.kedja ||
          uso(b, escaso) - uso(a, escaso) ||
          slump.get(a.idx)! - slump.get(b.idx)!,
      )
      .map((p) => p.idx);
    if (storning && lista.length > 1) {
      const n = Math.floor(rng() * lista.length * 1.5);
      for (let k = 0; k < n; k++) {
        const j = Math.floor(rng() * (lista.length - 1));
        [lista[j], lista[j + 1]] = [lista[j + 1], lista[j]];
      }
    }
    // Las salsas largas siempre primero: al fuego cuanto antes (§3.10)
    return [...lista.filter((i) => preps[i].egenEfter), ...lista.filter((i) => !preps[i].egenEfter)];
  };

  const basCtx: Ctx = {
    preps,
    T,
    H,
    kockar: dagsplan.kockar,
    plattor: inst.spisplattor,
    maskin: {
      thermomix: { antal: inst.thermomix.antal, rengoring: inst.thermomix.rengoringMin },
      pacojet: { antal: inst.pacojet.antal, rengoring: inst.pacojet.rengoringMin },
    },
    ugn: { bleck: inst.ugn.bleck, byte: Math.max(inst.ugn.forvarmningMin, inst.ugn.bytesMin), ignorera: false },
    avbrottMin: inst.avbrottMin,
    troskel: 0,
  };

  // --- Evaluación -------------------------------------------------------------------
  const ok = (p: PrepInfo, u: Utfall["prep"][number]) =>
    u.placerad && (p.arvEfter || (p.egenEfter ? u.start < T : u.slut <= T));
  const sent = (p: PrepInfo, u: Utfall["prep"][number]) =>
    !u.placerad ? H : p.arvEfter ? 0 : p.egenEfter ? Math.max(0, u.start - T + 1) : Math.max(0, u.slut - T);

  const poang = (r: Utfall): number[] => {
    let klara = 0;
    let retraso = 0;
    let salsas = 0;
    let omTid = 0;
    let farsk = 0;
    let sista = 0;
    preps.forEach((p, i) => {
      const u = r.prep[i];
      if (p.maste) {
        if (ok(p, u)) klara++;
        retraso += sent(p, u);
        if (p.egenEfter && u.placerad) salsas += u.start;
        if (u.placerad && !p.efter) sista = Math.max(sista, u.slut);
      } else if (u.placerad) {
        omTid += 1000 + (preps.length - p.rang);
      }
      if (p.senast && u.placerad && u.slut <= T) farsk += T - u.slut;
    });
    // Cambios de contexto por cocinero
    let byten = 0;
    const porKock = new Map<number, Array<{ s: number; p: number }>>();
    for (const f of r.st.faser) {
      if (f.kock < 0) continue;
      const l = porKock.get(f.kock) ?? [];
      l.push({ s: f.start, p: f.prep });
      porKock.set(f.kock, l);
    }
    for (const l of porKock.values()) {
      l.sort((a, b) => a.s - b.s);
      for (let k = 1; k < l.length; k++) if (l[k].p !== l[k - 1].p) byten++;
    }
    return [-klara, retraso, salsas, -omTid, r.st.avbrott.length, farsk, sista, byten];
  };
  const battre = (a: number[], b: number[]) => {
    for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) return a[k] < b[k];
    return false;
  };

  const harDifferade = preps.some((p) => p.delning >= 0);
  const harOmTid = preps.some((p) => !p.maste);
  const TROSKLAR = [0, 5, 15, Infinity];

  interface Forsok {
    ordning: number[];
    variant: Variant;
    troskel: number;
    utfall: Utfall;
    poang: number[];
  }
  const kor = (ordning: number[], variant: Variant, troskel: number, relajar?: Relajacion) => {
    const ctx: Ctx = { ...basCtx, troskel };
    if (relajar === "kockar") ctx.kockar = 20;
    if (relajar === "spisplatta") ctx.plattor = 20;
    if (relajar === "thermomix") ctx.maskin = { ...ctx.maskin, thermomix: { ...ctx.maskin.thermomix, antal: 20 } };
    if (relajar === "pacojet") ctx.maskin = { ...ctx.maskin, pacojet: { ...ctx.maskin.pacojet, antal: 20 } };
    if (relajar === "ugn") ctx.ugn = { ...ctx.ugn, ignorera: true };
    return new Konstruktion(ctx).konstruera(ordning, variant);
  };

  let bast: Forsok | null = null;
  const iter = Math.max(1, inst.iterationer);
  for (let it = 0; it < iter; it++) {
    // Flujos aleatorios independientes: el orden de las obligatorias no depende de las "om-tid"
    const rngM = mulberry32(blanda(seed, it, 1));
    const rngO = mulberry32(blanda(seed, it, 2));
    const rngV = mulberry32(blanda(seed, it, 3));
    const storning = it > 0;
    const maste = ordna(preps.filter((p) => p.maste), rngM, storning);
    const omTid = ordna(preps.filter((p) => !p.maste), rngO, storning);
    const ordning = topo([...maste, ...omTid], preps);
    const troskel = it === 0 ? 0 : TROSKLAR[Math.floor(rngV() * TROSKLAR.length)];
    const senastSist = it === 0 ? true : rngV() < 0.75;

    const varA: Variant = { senastSist, omTidForeFinal: false };
    const a = kor(ordning, varA, troskel);
    const pa = poang(a);
    let kandidat: Forsok = { ordning, variant: varA, troskel, utfall: a, poang: pa };
    if (harDifferade && harOmTid) {
      // Variante B: las "om-tid" pueden usar la hornilla interrumpiendo una salsa,
      // pero solo si las obligatorias quedan exactamente igual de bien.
      const varB: Variant = { senastSist, omTidForeFinal: true };
      const b = kor(ordning, varB, troskel);
      const pb = poang(b);
      if (pb[0] === pa[0] && pb[1] === pa[1] && battre(pb, pa))
        kandidat = { ordning, variant: varB, troskel, utfall: b, poang: pb };
    }
    if (!bast || battre(kandidat.poang, bast.poang)) bast = kandidat;
  }
  const B = bast!;
  const R = B.utfall;

  // --- Avisos: obligatorias que no cumplen y su cuello de botella ---------------------
  const sena = preps.filter((p) => p.maste && !ok(p, R.prep[p.idx]));
  const relajados = new Map<Relajacion, Utfall>();
  const RELAJ: Relajacion[] = ["kockar", "ugn", "spisplatta", "thermomix", "pacojet"];
  const usa = (p: PrepInfo, r: Relajacion) =>
    r === "kockar" ? p.forb.faser.some((f) => f.typ !== "vantan") : p.forb.faser.some((f) => f.resurs === r);
  if (sena.length) for (const r of RELAJ) relajados.set(r, kor(B.ordning, B.variant, B.troskel, r));
  const latVarn: Varning[] = sena.map((p) => {
    let flask: Flaskhals[] = [];
    if (!p.efter && p.kedja > T) flask = ["fonster"];
    else {
      for (const r of RELAJ) if (ok(p, relajados.get(r)!.prep[p.idx])) flask.push(r);
      if (!flask.length) {
        // Ninguno lo arregla solo: el primer recurso que usa
        const cand = RELAJ.filter((r) => usa(p, r));
        flask = cand.length ? [cand[0]] : ["fonster"];
      }
    }
    return { typ: "sen", forberedelseId: p.forb.id, minuterSent: sent(p, R.prep[p.idx]), flaskhalsar: flask };
  });

  return bygg(R, preps, T, dagsplan.kockar, seed, B.poang, [...varningar, ...latVarn]);
}

// -------------------------------------------------------------------------------------
// Salida

function bygg(
  R: Utfall,
  preps: PrepInfo[],
  T: number,
  kockar: number,
  seed: number,
  poang: number[],
  varningar: Varning[],
): PlanResultat {
  const st = R.st;
  const blockOrdning = [...st.block].sort((a, b) => a.start - b.start);
  const blockIndex = new Map(blockOrdning.map((b, i) => [b.id, i]));

  const ugn: UgnBlock[] = blockOrdning.map((b, i) => {
    const u: UgnBlock = { lage: b.lage, temp: b.tMax, start: b.start, klar: b.klar, slut: b.slut, forvarmning: i === 0 };
    if (b.fukt !== undefined) u.fukt = b.fukt;
    return u;
  });

  const placerad = (i: number) => R.prep[i].placerad;
  const fasId = (prep: number, fas: number) => preps[prep].forb.faser[fas].id;

  const faser: PlaneradFas[] = st.faser
    .filter((f) => placerad(f.prep))
    .map((f) => {
      const def = preps[f.prep].forb.faser[f.fas];
      const pf: PlaneradFas = {
        forberedelseId: preps[f.prep].forb.id,
        fasId: def.id,
        typ: def.typ,
        start: f.start,
        slut: f.slut,
        pauser: [...f.pauser].sort((a, b) => a.start - b.start),
        efterOppning: f.start >= T,
      };
      if (f.kock >= 0) pf.kock = f.kock + 1;
      if (f.resurs) pf.resurs = f.resurs;
      if (f.enhet >= 0) pf.enhet = f.enhet;
      if (f.block >= 0) pf.ugnBlock = blockIndex.get(f.block)!;
      return pf;
    })
    .sort((a, b) => a.start - b.start || a.fasId.localeCompare(b.fasId));

  const ingrepp: Ingrepp[] = st.ingrepp
    .filter((g) => !g.bort && placerad(g.prep))
    .map((g) => {
      const r: Ingrepp = {
        typ: g.typ,
        start: g.start,
        slut: g.slut,
        forberedelseId: preps[g.prep].forb.id,
        fasId: fasId(g.prep, g.fas),
        efterOppning: g.start >= T,
      };
      if (g.kock >= 0) r.kock = g.kock + 1;
      if (g.resurs) r.resurs = g.resurs;
      if (g.enhet >= 0) r.enhet = g.enhet;
      return r;
    })
    .sort((a, b) => a.start - b.start || a.fasId.localeCompare(b.fasId) || a.typ.localeCompare(b.typ));

  const avbrott = st.avbrott
    .map((a) => ({
      forberedelseId: preps[a.prep].forb.id,
      fasId: fasId(a.prep, a.fas),
      avForberedelseId: preps[a.avPrep].forb.id,
      avFasId: fasId(a.avPrep, a.avFas),
      enhet: a.enhet,
      start: a.start,
      slut: a.slut,
    }))
    .sort((a, b) => a.start - b.start);

  const ejPlacerade = preps
    .filter((p) => !p.maste && !placerad(p.idx))
    .sort((a, b) => a.rang - b.rang)
    .map((p) => p.forb.id);

  // Kontrollera före start: requisitos y dependencias que no se hacen hoy
  const kontrolleraFore: KontrollPunkt[] = [];
  for (const p of preps) {
    if (!placerad(p.idx)) continue;
    for (const krav of p.forb.kontrolleraFore ?? []) kontrolleraFore.push({ forberedelseId: p.forb.id, krav });
    for (const d of p.forb.beroendeAv) {
      const i = preps.findIndex((q) => q.forb.id === d);
      if (i < 0 || !placerad(i)) kontrolleraFore.push({ forberedelseId: p.forb.id, beroendeAv: d });
    }
  }

  return { seed, kockar, oppning: T, faser, ingrepp, ugn, avbrott, ejPlacerade, kontrolleraFore, varningar, poang };
}
