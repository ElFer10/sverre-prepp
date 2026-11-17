// Construcción serial de un plan (SPEC §5.2). Una instancia = un intento con un orden dado.
//
// El tiempo es discreto (minutos). Cada recurso es un array por minuto con su "dueño":
//   0 = libre, >0 = fase (clave = índice en `faser` + 1), <0 = intervención (−(índice en `ingrepp` + 1)).
//
// Para probar y deshacer sin copiar el estado, toda mutación pasa por un registro de deshacer
// (`logg`): `markera()` devuelve un punto y `aterstall(punto)` deshace hasta él.

import type { Fas, Forberedelse, Intervall, IngreppTyp, Resurs, UgnLage } from "./types";

export type Maskin = "thermomix" | "pacojet";
export type Relajacion = "kockar" | "ugn" | "spisplatta" | "thermomix" | "pacojet";

export interface PrepInfo {
  idx: number;
  forb: Forberedelse;
  /** Prioridad efectiva (una "om-tid" de la que depende una obligatoria pasa a obligatoria). */
  maste: boolean;
  egenEfter: boolean; // kanAvslutasEfterOppning propio
  arvEfter: boolean; // heredado de una dependencia del día
  efter: boolean;
  deps: number[]; // índices de las dependencias que están en la lista del día
  senast: boolean;
  /** Fase avbrytbar en la que se corta la preparación; el resto se coloca al final. −1 = no se corta. */
  delning: number;
  /** Depende de una preparación cortada: se coloca después de completarla. */
  efterDifferad: boolean;
  rang: number; // preferencia entre las "om-tid" (0 = la primera)
  dur: number[]; // duración (máxima) de cada fase
  kedja: number; // cadena total, incluidas las dependencias
}

export interface Ctx {
  preps: PrepInfo[];
  T: number;
  H: number;
  kockar: number;
  plattor: number;
  maskin: Record<Maskin, { antal: number; rengoring: number }>;
  ugn: { bleck: number; byte: number; ignorera: boolean };
  avbrottMin: number;
  /** Interrumpir solo si se gana más que esto respecto a esperar una hornilla libre. Infinity = nunca. */
  troskel: number;
}

/** Límites para no buscar donde el resultado ya no sirve. */
interface Grans {
  slut?: number; // la última fase debe terminar antes de esto
  forstaStart?: number; // la primera fase debe empezar como tarde aquí
}

export interface Variant {
  senastSist: boolean;
  omTidForeFinal: boolean;
}

export interface FasRec {
  prep: number;
  fas: number;
  start: number;
  slut: number;
  kock: number; // −1 = ninguno
  resurs?: Resurs;
  enhet: number;
  block: number; // id del bloque de horno, −1
  pauser: Intervall[];
  avbrytbar: boolean; // se puede interrumpir ahora
  tillsyn: number[]; // índices de sus intervenciones
}

export interface IngRec {
  typ: IngreppTyp;
  start: number;
  slut: number;
  kock: number;
  prep: number;
  fas: number;
  resurs?: Resurs;
  enhet: number;
  bort: boolean;
}

interface Anv {
  start: number;
  fore: boolean; // limpieza justo antes
  efter: boolean; // limpieza justo después
}

export interface Block {
  id: number;
  lage: UgnLage;
  fukt?: number;
  tMin: number;
  tMax: number;
  start: number;
  klar: number;
  slut: number;
}

export interface AvbRec {
  prep: number;
  fas: number;
  avPrep: number;
  avFas: number;
  enhet: number;
  start: number;
  slut: number;
}

export interface Tillstand {
  kock: Int32Array[];
  platta: Int32Array[];
  maskin: Record<Maskin, Int32Array[]>;
  anv: Record<Maskin, Anv[][]>;
  bleck: Int16Array;
  block: Block[]; // ordenados por start
  faser: FasRec[];
  ingrepp: IngRec[];
  avbrott: AvbRec[];
  prepFaser: number[][]; // claves de fase por preparación
  senasteKock: number[];
  senastePlatta: number[];
}

/** Candidato para colocar una fase en un instante dado. */
interface Kandidat {
  start: number;
  slut: number;
  kock: number;
  enhet: number;
  pauser: Intervall[];
  tillsyn: Array<{ start: number; slut: number; kock: number }>;
  // Thermomix / Pacojet
  rengorFore?: number; // cocinero que limpia (−1 sin cocinero); undefined = no hay limpieza
  rengorEfter?: number;
  // Horno
  ugnDela?: number; // índice de bloque compartido
  ugnNy?: { start: number; kock: number };
}

export interface PrepUtfall {
  placerad: boolean;
  start: number;
  slut: number;
}

export interface Utfall {
  prep: PrepUtfall[];
  st: Tillstand;
}

const fri = (a: Int32Array, from: number, to: number): boolean => {
  if (from < 0 || to > a.length) return false;
  for (let t = from; t < to; t++) if (a[t] !== 0) return false;
  return true;
};

const fasKey = (i: number) => i + 1;
const ingKey = (i: number) => -(i + 1);

export class Konstruktion {
  st: Tillstand;
  private ctx: Ctx;
  private logg: Array<() => void> = [];
  private antalAvbrytbara = 0;

  constructor(ctx: Ctx) {
    this.ctx = ctx;
    const H = ctx.H;
    const arr = (n: number) => Array.from({ length: n }, () => new Int32Array(H));
    this.st = {
      kock: arr(ctx.kockar),
      platta: arr(ctx.plattor),
      maskin: { thermomix: arr(ctx.maskin.thermomix.antal), pacojet: arr(ctx.maskin.pacojet.antal) },
      anv: {
        thermomix: Array.from({ length: ctx.maskin.thermomix.antal }, () => []),
        pacojet: Array.from({ length: ctx.maskin.pacojet.antal }, () => []),
      },
      bleck: new Int16Array(H),
      block: [],
      faser: [],
      ingrepp: [],
      avbrott: [],
      prepFaser: ctx.preps.map(() => []),
      senasteKock: ctx.preps.map(() => -1),
      senastePlatta: ctx.preps.map(() => -1),
    };
  }

  // -------------------------------------------------------------------------
  // Registro de deshacer

  private markera(): number {
    return this.logg.length;
  }

  private aterstall(punkt: number) {
    while (this.logg.length > punkt) this.logg.pop()!();
  }

  /** Escribe `v` en a[from, to) recordando lo que había. */
  private fyll(a: Int32Array, from: number, to: number, v: number) {
    const gammal = a.slice(from, to);
    a.fill(v, from, to);
    this.logg.push(() => a.set(gammal, from));
  }

  private satt1(a: Int32Array, t: number, v: number) {
    const g = a[t];
    a[t] = v;
    this.logg.push(() => {
      a[t] = g;
    });
  }

  private andra<O extends object, K extends keyof O>(o: O, k: K, v: O[K]) {
    const g = o[k];
    o[k] = v;
    this.logg.push(() => {
      o[k] = g;
    });
  }

  private lagg<X>(lista: X[], x: X) {
    lista.push(x);
    this.logg.push(() => {
      lista.pop();
    });
  }

  private andraAvbrytbara(d: number) {
    this.antalAvbrytbara += d;
    this.logg.push(() => {
      this.antalAvbrytbara -= d;
    });
  }

  // -------------------------------------------------------------------------
  // Construcción completa

  konstruera(ordning: number[], v: Variant): Utfall {
    const { preps } = this.ctx;
    let maste = ordning.filter((i) => preps[i].maste);
    const omTid = ordning.filter((i) => !preps[i].maste);
    if (v.senastSist) {
      maste = topo(
        [...maste.filter((i) => !preps[i].senast), ...maste.filter((i) => preps[i].senast)],
        preps,
      );
    }

    const differade: number[] = [];
    const senare: number[] = [];
    for (const i of maste) {
      const p = preps[i];
      if (p.efterDifferad) {
        senare.push(i);
        continue;
      }
      if (p.delning >= 0) {
        if (this.placeraPrep(p, 0, p.delning, this.depSlut(p), false)) differade.push(i);
      } else {
        this.placeraPrep(p, 0, p.dur.length - 1, this.depSlut(p), v.senastSist && p.senast);
      }
    }

    if (v.omTidForeFinal) this.placeraOmTid(omTid.filter((i) => !preps[i].efterDifferad), v);

    // Completar las preparaciones cortadas y lo que depende de ellas
    for (const i of differade) {
      const p = preps[i];
      const cola = this.st.faser[this.st.prepFaser[i][p.delning] - 1];
      this.andra(cola, "avbrytbar", false);
      this.andraAvbrytbara(-1);
      if (p.delning + 1 <= p.dur.length - 1) this.placeraPrep(p, p.delning + 1, p.dur.length - 1, cola.slut, false);
    }
    for (const i of senare) this.placeraPrep(preps[i], 0, preps[i].dur.length - 1, this.depSlut(preps[i]), false);

    this.placeraOmTid(v.omTidForeFinal ? omTid.filter((i) => preps[i].efterDifferad) : omTid, v);

    this.logg = []; // el estado final ya no se deshace
    return { prep: preps.map((p) => this.utfall(p.idx)), st: this.st };
  }

  private placeraOmTid(lista: number[], v: Variant) {
    const { preps, T } = this.ctx;
    for (const i of lista) {
      const p = preps[i];
      const punkt = this.markera();
      // Solo sirve si cabe: no se busca más allá de la apertura
      const grans: Grans = p.efter ? { forstaStart: T - 1 } : { slut: T };
      const ok = this.placeraPrep(p, 0, p.dur.length - 1, this.depSlut(p), v.senastSist && p.senast, grans);
      const u = this.utfall(i);
      // Solo si cabe entera (§5.2.5)
      const cabe = ok && u.placerad && (p.efter ? u.start < T : u.slut <= T);
      if (!cabe) this.aterstall(punkt);
    }
  }

  private utfall(i: number): PrepUtfall {
    const keys = this.st.prepFaser[i];
    const p = this.ctx.preps[i];
    if (keys.length !== p.dur.length) return { placerad: false, start: -1, slut: -1 };
    return { placerad: true, start: this.st.faser[keys[0] - 1].start, slut: this.st.faser[keys[keys.length - 1] - 1].slut };
  }

  private depSlut(p: PrepInfo): number {
    let lb = 0;
    for (const d of p.deps) {
      const u = this.utfall(d);
      if (u.placerad) lb = Math.max(lb, u.slut);
    }
    return lb;
  }

  // -------------------------------------------------------------------------
  // Colocar una preparación (o un tramo de fases) con retroceso por maxVantanFore

  private placeraPrep(p: PrepInfo, fran: number, till: number, lb0: number, senast: boolean, grans: Grans = {}): boolean {
    const { T } = this.ctx;
    if (senast) {
      // Lo más tarde posible terminando antes de la apertura (§3.12).
      // Primero, lo antes posible: si así no termina a tiempo, más tarde tampoco.
      const punkt = this.markera();
      const tidigt = this.placeraFranLb(p, fran, till, lb0, { slut: T });
      const s0 = this.utfall(p.idx).start;
      this.aterstall(punkt);
      if (tidigt) {
        const total = p.dur.slice(fran, till + 1).reduce((a, b) => a + b, 0);
        for (let L = T - total; L > s0; L--) {
          if (this.placeraFranLb(p, fran, till, L, { slut: T })) return true;
        }
        return this.placeraFranLb(p, fran, till, lb0, { slut: T }) || this.placeraFranLb(p, fran, till, lb0, grans);
      }
    }
    return this.placeraFranLb(p, fran, till, lb0, grans);
  }

  private placeraFranLb(p: PrepInfo, fran: number, till: number, lb0: number, grans: Grans): boolean {
    const { H } = this.ctx;
    const n = till - fran + 1;
    // Duración que queda desde cada fase hasta el final del tramo
    const kvar = new Array<number>(n + 1).fill(0);
    for (let j = n - 1; j >= 0; j--) kvar[j] = kvar[j + 1] + p.dur[fran + j];
    const minStart = new Array<number>(n).fill(lb0);
    const punkt = this.markera();
    const forraSlut = fran > 0 ? this.st.faser[this.st.prepFaser[p.idx][fran - 1] - 1].slut : lb0;

    for (let forsok = 0; forsok < 200; forsok++) {
      const starts: number[] = [];
      let prevSlut = forraSlut;
      let fel = -1;
      let behov = 1;
      for (let j = 0; j < n; j++) {
        const i = fran + j;
        // Salsa larga: mezclar y reducir sin esperas (decisión de Fer, SPEC §3.10)
        const kedjad = p.egenEfter && p.delning >= 0 && i <= p.delning;
        const w = kedjad ? 0 : p.forb.faser[i].maxVantanFore;
        const harFonster = w != null && i > 0;
        const lo = Math.max(minStart[j], prevSlut, lb0);
        let hi = harFonster ? Math.min(prevSlut + w, H - p.dur[i]) : H - p.dur[i];
        if (grans.slut !== undefined) hi = Math.min(hi, grans.slut - kvar[j]);
        if (grans.forstaStart !== undefined && j === 0) hi = Math.min(hi, grans.forstaStart);
        const key = lo <= hi ? this.hittaOchPlacera(p, i, lo, hi) : null;
        if (key === null) {
          // Sin ventana o primera fase del tramo: no hay a dónde retroceder
          if (!harFonster || j === 0) {
            this.aterstall(punkt);
            return false;
          }
          // ¿Cuándo podría empezar esta fase? La anterior tiene que terminar `behov` min más tarde
          let tj = hi + 1;
          const tope = Math.min(H - p.dur[i], hi + 60);
          while (tj <= tope && !this.prova(p, i, tj)) tj++;
          behov = Math.max(1, tj - w - prevSlut);
          fel = j;
          break;
        }
        const rec = this.st.faser[key - 1];
        starts.push(rec.start);
        prevSlut = rec.slut;
      }
      if (fel < 0) return true;
      this.aterstall(punkt);
      minStart[fel - 1] = starts[fel - 1] + behov;
      for (let j = fel; j < n; j++) minStart[j] = lb0;
    }
    this.aterstall(punkt);
    return false;
  }

  /** Busca el primer instante factible en [lo, hi] y coloca la fase. Devuelve su clave. */
  private hittaOchPlacera(p: PrepInfo, i: number, lo: number, hi: number): number | null {
    const fas = p.forb.faser[i];
    let tFri = -1;
    let kand: Kandidat | null = null;
    for (let t = lo; t <= hi; t++) {
      kand = this.prova(p, i, t);
      if (kand) {
        tFri = t;
        break;
      }
    }

    const kanAvbryta =
      fas.resurs === "spisplatta" && !fas.avbrytbar && this.antalAvbrytbara > 0 && Number.isFinite(this.ctx.troskel);
    if (kanAvbryta) {
      const grans = tFri < 0 ? hi : Math.min(hi, tFri - 1 - this.ctx.troskel);
      for (let t = lo; t <= grans; t++) {
        const key = this.provaAvbrott(p, i, t);
        if (key !== null) return key;
      }
    }
    return kand ? this.applicera(p, i, kand) : null;
  }

  // -------------------------------------------------------------------------
  // Factibilidad de una fase en t (sin modificar el estado)

  private behoverKock(p: PrepInfo, t: number): boolean {
    return !(p.efter && t >= this.ctx.T);
  }

  private kockOrdning(p: PrepInfo): number[] {
    const n = this.ctx.kockar;
    const pref = this.st.senasteKock[p.idx];
    const r: number[] = pref >= 0 ? [pref] : [];
    for (let c = 0; c < n; c++) if (c !== pref) r.push(c);
    return r;
  }

  private ledigKock(p: PrepInfo, from: number, to: number): number {
    for (const c of this.kockOrdning(p)) if (fri(this.st.kock[c], from, to)) return c;
    return -1;
  }

  /** Fase activa sin recurso: puede pausarse por intervenciones ya reservadas del mismo cocinero. */
  private flytande(c: number, t: number, dur: number): { slut: number; pauser: Intervall[] } | null {
    const a = this.st.kock[c];
    if (a[t] !== 0) return null;
    const pauser: Intervall[] = [];
    let m = t;
    let gjort = 0;
    while (gjort < dur) {
      if (m >= a.length) return null;
      const v = a[m];
      if (v === 0) gjort++;
      else if (v < 0) {
        const sista = pauser[pauser.length - 1];
        if (sista && sista.slut === m) sista.slut = m + 1;
        else pauser.push({ start: m, slut: m + 1 });
      } else return null;
      m++;
    }
    return { slut: m, pauser };
  }

  private tillsynTider(p: PrepInfo, fas: Fas, t: number, dur: number): Kandidat["tillsyn"] | null {
    const r: Kandidat["tillsyn"] = [];
    if (!fas.tillsyn) return r;
    const { varjeMin, minuter } = fas.tillsyn;
    for (let off = varjeMin; off < dur; off += varjeMin) {
      const s = t + off;
      if (!this.behoverKock(p, s)) {
        r.push({ start: s, slut: s + minuter, kock: -1 });
        continue;
      }
      const k = this.ledigKock(p, s, s + minuter);
      if (k < 0) return null;
      r.push({ start: s, slut: s + minuter, kock: k });
    }
    return r;
  }

  private prova(p: PrepInfo, i: number, t: number, tvingad?: { platta: number; kock: number }): Kandidat | null {
    const fas = p.forb.faser[i];
    const d = p.dur[i];
    if (t < 0 || t + d > this.ctx.H) return null;
    const aktiv = fas.typ === "aktiv";
    const kockKravs = aktiv && this.behoverKock(p, t);
    const bas: Kandidat = { start: t, slut: t + d, kock: -1, enhet: -1, pauser: [], tillsyn: [] };

    // Cocinero para una fase activa con recurso (sin pausas). −1 = no hace falta, −2 = no hay.
    const fastKock = (from: number, to: number): number => {
      if (!kockKravs) return -1;
      if (tvingad && tvingad.kock >= 0) return fri(this.st.kock[tvingad.kock], from, to) ? tvingad.kock : -2;
      const c = this.ledigKock(p, from, to);
      return c < 0 ? -2 : c;
    };

    switch (fas.resurs) {
      case undefined: {
        if (aktiv) {
          if (!kockKravs) return bas;
          for (const c of this.kockOrdning(p)) {
            const f = this.flytande(c, t, d);
            if (f) return { ...bas, kock: c, slut: f.slut, pauser: f.pauser };
          }
          return null;
        }
        const tl = this.tillsynTider(p, fas, t, d);
        return tl ? { ...bas, tillsyn: tl } : null;
      }

      case "spisplatta": {
        const pref = this.st.senastePlatta[p.idx];
        const alla = [...this.st.platta.keys()];
        const ordning = tvingad ? [tvingad.platta] : pref >= 0 ? [pref, ...alla.filter((b) => b !== pref)] : alla;
        for (const b of ordning) {
          if (!fri(this.st.platta[b], t, t + d)) continue;
          const c = fastKock(t, t + d);
          if (c === -2) continue;
          const tl = this.tillsynTider(p, fas, t, d);
          if (!tl) continue;
          return { ...bas, enhet: b, kock: c, tillsyn: tl };
        }
        return null;
      }

      case "thermomix":
      case "pacojet": {
        const m = fas.resurs;
        const R = this.ctx.maskin[m].rengoring;
        for (let u = 0; u < this.st.maskin[m].length; u++) {
          // Limpieza entre dos usos seguidos: antes si el anterior no limpió después,
          // después si el siguiente no limpió antes.
          let prev: Anv | undefined;
          let next: Anv | undefined;
          for (const x of this.st.anv[m][u]) {
            if (x.start < t && (!prev || x.start > prev.start)) prev = x;
            if (x.start >= t && (!next || x.start < next.start)) next = x;
          }
          const fore = !!prev && !prev.efter;
          const efter = !!next && !next.fore;
          const a = t - (fore ? R : 0);
          const b = t + d + (efter ? R : 0);
          if (!fri(this.st.maskin[m][u], a, b)) continue;
          const c = fastKock(a, b);
          if (c === -2) continue;
          let rf: number | undefined;
          let re: number | undefined;
          if (fore) rf = c >= 0 ? c : this.behoverKock(p, a) ? this.ledigKock(p, a, t) : -1;
          if (efter) re = c >= 0 ? c : this.behoverKock(p, t + d) ? this.ledigKock(p, t + d, b) : -1;
          if (fore && rf! < 0 && this.behoverKock(p, a)) continue;
          if (efter && re! < 0 && this.behoverKock(p, t + d)) continue;
          return { ...bas, enhet: u, kock: c, rengorFore: rf, rengorEfter: re };
        }
        return null;
      }

      case "ugn": {
        const c = fastKock(t, t + d);
        if (c === -2) return null;
        if (this.ctx.ugn.ignorera) return { ...bas, kock: c };
        const ugn = fas.ugn!;
        for (let m = t; m < t + d; m++) if (this.st.bleck[m] + ugn.bleck > this.ctx.ugn.bleck) return null;
        const bl = this.st.block;
        // 1) Compartir (o prolongar) un bloque compatible
        for (let k = 0; k < bl.length; k++) {
          const B = bl[k];
          if (B.klar > t || B.lage !== ugn.lage || B.fukt !== ugn.fukt) continue;
          if (Math.max(B.tMin, ugn.tempMin) > Math.min(B.tMax, ugn.tempMax)) continue;
          const nasta = bl[k + 1];
          if (t + d > B.slut && nasta && nasta.start < t + d) continue;
          return { ...bas, kock: c, ugnDela: k };
        }
        // 2) Bloque nuevo: calentar justo antes (o un poco antes si no hay cocinero libre)
        const byte = this.ctx.ugn.byte;
        for (let s = t - byte; s >= Math.max(0, t - byte - 10); s--) {
          if (bl.some((B) => B.start < t + d && s < B.slut)) continue;
          let pk = -1;
          if (this.behoverKock(p, s)) {
            pk = this.ledigKock(p, s, s + 1);
            if (pk < 0) continue;
          }
          return { ...bas, kock: c, ugnNy: { start: s, kock: pk } };
        }
        return null;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Aplicar un candidato

  private nyttIngrepp(g: Omit<IngRec, "bort">): number {
    const idx = this.st.ingrepp.length;
    this.lagg(this.st.ingrepp, { ...g, bort: false });
    if (g.kock >= 0) this.fyll(this.st.kock[g.kock], g.start, g.slut, ingKey(idx));
    return idx;
  }

  private applicera(p: PrepInfo, i: number, k: Kandidat): number {
    const fas = p.forb.faser[i];
    const st = this.st;
    const idx = st.faser.length;
    const key = fasKey(idx);
    const rec: FasRec = {
      prep: p.idx,
      fas: i,
      start: k.start,
      slut: k.slut,
      kock: k.kock,
      resurs: fas.resurs,
      enhet: k.enhet,
      block: -1,
      pauser: k.pauser,
      avbrytbar: !!fas.avbrytbar && p.delning === i,
      tillsyn: [],
    };
    this.lagg(st.faser, rec);
    const pf = st.prepFaser[p.idx];
    pf[i] = key;
    this.logg.push(() => {
      pf.length = i;
    });
    if (rec.avbrytbar) this.andraAvbrytbara(1);

    if (k.kock >= 0) {
      const a = st.kock[k.kock];
      for (let t = k.start; t < k.slut; t++) if (a[t] === 0) this.satt1(a, t, key);
      this.andra(st.senasteKock, p.idx, k.kock);
    }
    if (fas.resurs === "spisplatta") {
      this.fyll(st.platta[k.enhet], k.start, k.slut, key);
      this.andra(st.senastePlatta, p.idx, k.enhet);
    }
    if (fas.resurs === "thermomix" || fas.resurs === "pacojet") {
      const m = fas.resurs;
      const R = this.ctx.maskin[m].rengoring;
      this.fyll(st.maskin[m][k.enhet], k.start, k.slut, key);
      const ing = (start: number, kock: number) => {
        const gi = this.nyttIngrepp({ typ: "rengoring", start, slut: start + R, kock, prep: p.idx, fas: i, resurs: m, enhet: k.enhet });
        this.fyll(st.maskin[m][k.enhet], start, start + R, ingKey(gi));
      };
      if (k.rengorFore !== undefined) ing(k.start - R, k.rengorFore);
      if (k.rengorEfter !== undefined) ing(k.slut, k.rengorEfter);
      this.lagg(st.anv[m][k.enhet], { start: k.start, fore: k.rengorFore !== undefined, efter: k.rengorEfter !== undefined });
    }
    if (fas.resurs === "ugn" && !this.ctx.ugn.ignorera) {
      const u = fas.ugn!;
      const bleck = st.bleck;
      for (let t = k.start; t < k.slut; t++) bleck[t] += u.bleck;
      this.logg.push(() => {
        for (let t = k.start; t < k.slut; t++) bleck[t] -= u.bleck;
      });
      let B: Block;
      if (k.ugnDela !== undefined) {
        B = st.block[k.ugnDela];
        this.andra(B, "tMin", Math.max(B.tMin, u.tempMin));
        this.andra(B, "tMax", Math.min(B.tMax, u.tempMax));
        this.andra(B, "slut", Math.max(B.slut, k.slut));
      } else {
        const s = k.ugnNy!.start;
        B = { id: st.block.length, lage: u.lage, fukt: u.fukt, tMin: u.tempMin, tMax: u.tempMax, start: s, klar: s + this.ctx.ugn.byte, slut: k.slut };
        this.andra(st, "block", [...st.block, B].sort((a, b) => a.start - b.start));
        this.nyttIngrepp({ typ: "ugn-installning", start: s, slut: s + 1, kock: k.ugnNy!.kock, prep: p.idx, fas: i, resurs: "ugn", enhet: -1 });
      }
      rec.block = B.id;
    }
    for (const g of k.tillsyn) {
      rec.tillsyn.push(this.nyttIngrepp({ typ: "tillsyn", start: g.start, slut: g.slut, kock: g.kock, prep: p.idx, fas: i, enhet: -1 }));
    }
    return key;
  }

  // -------------------------------------------------------------------------
  // Interrumpir una salsa (§3.10)

  private provaAvbrott(p: PrepInfo, i: number, t: number): number | null {
    const A = this.ctx.avbrottMin;
    const d = p.dur[i];
    const { H } = this.ctx;
    if (t - A < 0 || t + d + A > H) return null;

    for (let b = 0; b < this.st.platta.length; b++) {
      const pl = this.st.platta[b];
      const Pkey = pl[t - A];
      if (Pkey <= 0) continue;
      const P = this.st.faser[Pkey - 1];
      if (!P.avbrytbar || P.start >= t - A || P.pauser.some((x) => x.slut > t - A)) continue;
      let ok = true;
      for (let m = t - A; m < t + d + A && ok; m++) if (pl[m] !== 0 && pl[m] !== Pkey) ok = false;
      const forl = d + 2 * A;
      const nySlut = P.slut + forl;
      if (!ok || nySlut > H) continue;
      for (let m = t + d + A; m < nySlut && ok; m++) if (pl[m] !== 0 && pl[m] !== Pkey) ok = false;
      if (!ok) continue;

      const punkt = this.markera();
      const key = this.genomforAvbrott(p, i, t, b, P, Pkey, forl);
      if (key !== null) return key;
      this.aterstall(punkt);
    }
    return null;
  }

  private genomforAvbrott(p: PrepInfo, i: number, t: number, b: number, P: FasRec, Pkey: number, forl: number): number | null {
    const A = this.ctx.avbrottMin;
    const d = p.dur[i];
    const st = this.st;
    const Pp = this.ctx.preps[P.prep];
    const pl = st.platta[b];
    const fas = p.forb.faser[i];

    // Intervenciones de la salsa que hay que mover. Si una fase activa se pausó para
    // una de ellas, no se puede mover (la fase quedaría con un hueco): no se interrumpe aquí.
    const mover = P.tillsyn.filter((gi) => st.ingrepp[gi].start >= t - A);
    for (const gi of mover) {
      const g = st.ingrepp[gi];
      if (g.kock < 0) continue;
      const pausada = st.faser.some(
        (f) => f.kock === g.kock && f.pauser.some((x) => x.start < g.slut && g.start < x.slut),
      );
      if (pausada) return null;
    }

    // 1. Desplazar la salsa: deja la hornilla en [t−A, t+d+A) y termina `forl` minutos más tarde
    for (let m = t - A; m < P.slut; m++) if (pl[m] === Pkey) this.satt1(pl, m, 0);
    this.fyll(pl, t + d + A, P.slut + forl, Pkey);
    this.andra(P, "pauser", [...P.pauser, { start: t - A, slut: t + d + A }]);
    this.andra(P, "slut", P.slut + forl);

    // 2. Liberar sus intervenciones posteriores
    for (const gi of mover) {
      const g = st.ingrepp[gi];
      if (g.kock >= 0) this.fyll(st.kock[g.kock], g.start, g.slut, 0);
      this.andra(g, "bort", true);
    }
    this.andra(P, "tillsyn", P.tillsyn.filter((gi) => !mover.includes(gi)));

    // 3. Retirar y devolver la olla: el cocinero de la fase que interrumpe
    let c = -1;
    if (fas.typ === "aktiv" && this.behoverKock(p, t)) {
      c = this.ledigKock(p, t - A, t + d + A);
      if (c < 0) return null;
    }
    const flytt = (typ: IngreppTyp, s: number): boolean => {
      let k = c;
      if (k < 0 && this.behoverKock(p, s)) {
        k = this.ledigKock(p, s, s + A);
        if (k < 0) return false;
      }
      this.nyttIngrepp({ typ, start: s, slut: s + A, kock: k, prep: P.prep, fas: P.fas, resurs: "spisplatta", enhet: b });
      return true;
    };
    if (!flytt("flytta-av", t - A) || !flytt("flytta-pa", t + d)) return null;

    // 4. La fase que interrumpe, en esa hornilla
    const k = this.prova(p, i, t, { platta: b, kock: c });
    if (!k) return null;
    const key = this.applicera(p, i, k);

    // 5. Reprogramar las intervenciones movidas
    const nya = [...P.tillsyn];
    for (const gi of mover) {
      const g = st.ingrepp[gi];
      const s = g.start + forl;
      let kk = -1;
      if (this.behoverKock(Pp, s)) {
        kk = this.ledigKock(Pp, s, g.slut + forl);
        if (kk < 0) return null;
      }
      nya.push(this.nyttIngrepp({ typ: "tillsyn", start: s, slut: g.slut + forl, kock: kk, prep: P.prep, fas: P.fas, enhet: -1 }));
    }
    this.andra(P, "tillsyn", nya);

    this.lagg(st.avbrott, { prep: P.prep, fas: P.fas, avPrep: p.idx, avFas: i, enhet: b, start: t - A, slut: t + d + A });
    return key;
  }
}

/** Orden topológico estable: cada preparación después de sus dependencias de la lista. */
export function topo(lista: number[], preps: PrepInfo[]): number[] {
  const set = new Set(lista);
  const hecho = new Set<number>();
  const r: number[] = [];
  const resto = lista.slice();
  while (resto.length) {
    const k = resto.findIndex((i) => preps[i].deps.every((d) => !set.has(d) || hecho.has(d)));
    const [i] = resto.splice(k < 0 ? 0 : k, 1); // ciclo: se rompe por el primero
    hecho.add(i);
    r.push(i);
  }
  return r;
}
