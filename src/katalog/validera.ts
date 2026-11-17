// Validación de una preparación antes de guardarla en el catálogo.

import { sv } from "../i18n/sv";
import type { Fas, Forberedelse } from "../scheduler/types";

const MAX_BLECK = 5;

/** Devuelve los errores en sueco (lista vacía = válida). */
export function valideraForberedelse(f: Forberedelse, katalog: Forberedelse[]): string[] {
  const fel: string[] = [];
  const e = sv.valideringsfel;
  if (!f.namn.trim()) fel.push(e.namnSaknas);
  if (f.faser.length === 0) fel.push(e.ingaMoment);

  f.faser.forEach((x, i) => {
    const n = i + 1;
    if (!x.namn.trim()) fel.push(e.momentNamn(n));
    if (!(x.minuter >= 1)) fel.push(e.minuter(n));
    if (x.maxMinuter !== undefined && !(x.maxMinuter > x.minuter)) fel.push(e.maxMinuter(n));
    if (x.resurs === "ugn") {
      if (!x.ugn) fel.push(e.ugnSaknas(n));
      else {
        if (x.ugn.tempMin > x.ugn.tempMax) fel.push(e.temp(n));
        if (!(x.ugn.bleck >= 1 && x.ugn.bleck <= MAX_BLECK)) fel.push(e.bleck(n, MAX_BLECK));
      }
    }
    if (x.typ === "tillsyn") {
      const t = x.tillsyn;
      if (!t || !(t.minuter >= 1) || !(t.varjeMin > t.minuter)) fel.push(e.tillsyn(n));
    }
    if (x.avbrytbar && (x.typ === "aktiv" || x.resurs !== "spisplatta")) fel.push(e.avbrytbar(n));
  });

  const porId = new Map(katalog.map((k) => [k.id, k]));
  porId.set(f.id, f);
  for (const d of f.beroendeAv) {
    if (d === f.id) fel.push(e.beroendeSig);
    else if (!porId.has(d)) fel.push(e.beroendeOkant(d));
  }
  // Ciclos: ¿alguna dependencia lleva de vuelta a f?
  const besokt = new Set<string>();
  const tillbaka = (id: string): boolean => {
    if (id === f.id) return true;
    if (besokt.has(id)) return false;
    besokt.add(id);
    return (porId.get(id)?.beroendeAv ?? []).some(tillbaka);
  };
  for (const d of f.beroendeAv) if (d !== f.id && tillbaka(d)) fel.push(e.beroendeCykel(porId.get(d)?.namn ?? d));

  if (f.fortsattning === f.id) fel.push(e.foljdsteg);
  return fel;
}

/** Id nuevo y único para una fase de `f`. */
export function nyttFasId(f: Forberedelse): string {
  const usados = new Set(f.faser.map((x) => x.id));
  let n = f.faser.length + 1;
  while (usados.has(`${f.id}-${n}`)) n++;
  return `${f.id}-${n}`;
}

/** Limpia campos que no aplican según el tipo y el recurso (p. ej. `ugn` si ya no es horno). */
export function stadaFas(x: Fas): Fas {
  const r: Fas = { id: x.id, namn: x.namn, typ: x.typ, minuter: x.minuter };
  if (x.maxMinuter !== undefined && x.maxMinuter > x.minuter) r.maxMinuter = x.maxMinuter;
  if (x.resurs) r.resurs = x.resurs;
  if (x.resurs === "ugn" && x.ugn) {
    r.ugn = { lage: x.ugn.lage, tempMin: x.ugn.tempMin, tempMax: x.ugn.tempMax, bleck: x.ugn.bleck };
    if (x.ugn.lage === "kombi" && x.ugn.fukt !== undefined) r.ugn.fukt = x.ugn.fukt;
  }
  if (x.typ === "tillsyn" && x.tillsyn) r.tillsyn = x.tillsyn;
  if (x.maxVantanFore === 0) r.maxVantanFore = 0;
  if (x.avbrytbar && x.typ !== "aktiv" && x.resurs === "spisplatta") r.avbrytbar = true;
  if (x.notering?.trim()) r.notering = x.notering.trim();
  return r;
}
