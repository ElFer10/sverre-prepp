// Ejecuta el planificador fuera del hilo principal para no congelar la interfaz.
import { planera } from "../scheduler/planera";
import type { Dagsplan, Forberedelse, Installningar, PlanResultat } from "../scheduler/types";

export interface PlaneraFraga {
  id: number;
  katalog: Forberedelse[];
  dagsplan: Dagsplan;
  inst: Installningar;
  seed: number;
}

export interface PlaneraSvar {
  id: number;
  resultat?: PlanResultat;
  fel?: string;
}

self.onmessage = (e: MessageEvent<PlaneraFraga>) => {
  const { id, katalog, dagsplan, inst, seed } = e.data;
  let svar: PlaneraSvar;
  try {
    svar = { id, resultat: planera(katalog, dagsplan, inst, seed) };
  } catch (err) {
    svar = { id, fel: err instanceof Error ? err.message : String(err) };
  }
  (self as unknown as { postMessage(m: PlaneraSvar): void }).postMessage(svar);
};
