// Ciclo de vida de un día (SPEC §4.2): cerrar, arrastrar al día siguiente, följdsteg y "Gjordes det?".
// Puro: la capa de datos decide cuándo guardar.

import { stangDagen } from "../scheduler/stangDagen";
import type { DagensPost, Dagsplan, Forberedelse } from "../scheduler/types";

/** Un día tal como se guarda (planner_dagar.data). */
export interface SparadDag extends Dagsplan {
  /** Huella de la entrada con la que se calculó `resultat` (para saber si está desactualizado). */
  planNyckel?: string;
  /** Lo que pasa al día siguiente, calculado al cerrar. */
  overfors?: DagensPost[];
  /** Fecha del día que ya recibió `overfors` (para no arrastrar dos veces). */
  overfordTill?: string;
}

export type Status = DagensPost["status"];

/** Propuesta inicial en Stäng dagen: obligatorias hechas; las "om-tid" hechas si estaban en el plan. */
export function forslagStatus(dag: Dagsplan): Record<string, Exclude<Status, "planerad">> {
  const iPlanen = new Set(dag.resultat?.faser.map((f) => f.forberedelseId) ?? []);
  const r: Record<string, Exclude<Status, "planerad">> = {};
  for (const p of dag.poster) {
    if (p.status !== "planerad") r[p.forberedelseId] = p.status;
    else r[p.forberedelseId] = p.prioritet === "maste" || iPlanen.has(p.forberedelseId) ? "gjord" : "ej-gjord";
  }
  return r;
}

/** Cierra el día con los estados indicados (los que falten siguen la regla por defecto de stangDagen). */
export function stangDag(dag: SparadDag, katalog: Forberedelse[], status: Record<string, Status> = {}): SparadDag {
  const poster = dag.poster.map((p) => ({ ...p, status: status[p.forberedelseId] ?? p.status }));
  const stangd: SparadDag = { ...dag, poster, stangd: true };
  return { ...stangd, overfors: stangDagen(stangd, katalog) };
}

/** Añade posts a una lista sin duplicar preparaciones (gana la que ya estaba) y renumera el orden. */
export function slaIhop(poster: DagensPost[], nya: DagensPost[]): DagensPost[] {
  const finns = new Set(poster.map((p) => p.forberedelseId));
  return [...poster, ...nya.filter((p) => !finns.has(p.forberedelseId))].map((p, i) => ({ ...p, ordning: i }));
}

/**
 * Crea el plan de `datum`. Si el último día anterior no se cerró, se cierra con la regla por defecto
 * (obligatorias hechas, "om-tid" sin marcar arrastradas). Lo pendiente pasa al día nuevo.
 */
export function skapaDag(
  datum: string,
  tidigare: SparadDag | undefined,
  katalog: Forberedelse[],
): { dag: SparadDag; tidigare?: SparadDag } {
  const ny: SparadDag = { datum, kockar: tidigare?.kockar ?? 2, poster: [], stangd: false };
  if (!tidigare || tidigare.datum >= datum || tidigare.overfordTill) return { dag: ny };
  const stangd = tidigare.stangd && tidigare.overfors ? tidigare : stangDag(tidigare, katalog);
  return {
    dag: { ...ny, poster: slaIhop([], stangd.overfors ?? []) },
    tidigare: { ...stangd, overfordTill: datum },
  };
}

/**
 * Al cerrar un día tarde, cuando el siguiente ya existe y aún no está cerrado: lleva el arrastre a ese día.
 * Devuelve null si no hay nada que hacer.
 */
export function overforTillBefintlig(stangd: SparadDag, nasta: SparadDag | undefined): { stangd: SparadDag; nasta: SparadDag } | null {
  if (!nasta || nasta.stangd || stangd.overfordTill || nasta.datum <= stangd.datum) return null;
  return {
    stangd: { ...stangd, overfordTill: nasta.datum },
    nasta: { ...nasta, poster: slaIhop(nasta.poster, stangd.overfors ?? []) },
  };
}

/** "Gjordes det?" → sí: se quita de la lista y, si tiene följdsteg, este ocupa su lugar. */
export function gjordesDet(dag: SparadDag, forberedelseId: string, katalog: Forberedelse[]): SparadDag {
  const post = dag.poster.find((p) => p.forberedelseId === forberedelseId);
  if (!post) return dag;
  const foljd = katalog.find((f) => f.id === forberedelseId)?.fortsattning;
  const resto = dag.poster.filter((p) => p.forberedelseId !== forberedelseId);
  const nya: DagensPost[] = foljd
    ? [{ forberedelseId: foljd, prioritet: post.prioritet, status: "planerad", ...(post.overfordFran ? { overfordFran: post.overfordFran } : {}) }]
    : [];
  return { ...dag, poster: slaIhop(resto, nya) };
}

/** El día más reciente anterior a `datum`. */
export function senasteFore(dagar: Record<string, SparadDag>, datum: string): SparadDag | undefined {
  return Object.values(dagar)
    .filter((d) => d.datum < datum)
    .sort((a, b) => b.datum.localeCompare(a.datum))[0];
}

/** El primer día posterior a `datum`. */
export function nastaEfter(dagar: Record<string, SparadDag>, datum: string): SparadDag | undefined {
  return Object.values(dagar)
    .filter((d) => d.datum > datum)
    .sort((a, b) => a.datum.localeCompare(b.datum))[0];
}
