// Hook para planificar en un Web Worker y guardar el resultado.
import { useCallback, useRef, useState } from "react";
import { hamtaLager, planNyckel, sparaPlan } from "../data/lager";
import type { Dagsplan } from "../scheduler/types";
import type { PlaneraFraga, PlaneraSvar } from "./planeraWorker";

const SEED = 1;

export function usePlanera() {
  const [planerar, setPlanerar] = useState(false);
  const [fel, setFel] = useState<string | null>(null);
  const worker = useRef<Worker | null>(null);
  const nasta = useRef(0);

  const planera = useCallback((dag: Dagsplan): Promise<boolean> => {
    if (!worker.current) {
      worker.current = new Worker(new URL("./planeraWorker.ts", import.meta.url), { type: "module" });
    }
    const w = worker.current;
    const { katalog, installningar } = hamtaLager();
    const id = ++nasta.current;
    const nyckel = planNyckel(dag, katalog, installningar);
    setPlanerar(true);
    setFel(null);
    return new Promise((resolve) => {
      const lyssna = (e: MessageEvent<PlaneraSvar>) => {
        if (e.data.id !== id) return;
        w.removeEventListener("message", lyssna);
        setPlanerar(false);
        if (e.data.resultat) {
          sparaPlan(dag.datum, e.data.resultat, nyckel);
          resolve(true);
        } else {
          setFel(e.data.fel ?? "");
          resolve(false);
        }
      };
      w.addEventListener("message", lyssna);
      const fraga: PlaneraFraga = { id, katalog, dagsplan: { ...dag, resultat: undefined }, inst: installningar, seed: SEED };
      w.postMessage(fraga);
    });
  }, []);

  return { planera, planerar, fel };
}
