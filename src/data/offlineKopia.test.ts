import { describe, expect, it } from "vitest";
import type { SparadDag } from "../dag/dagar";
import { STANDARD_INSTALLNINGAR } from "../scheduler/types";
import { lasKopia, raderaKopia, sparaKopia, type OfflineKopia } from "./offlineKopia";

function minne() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

const dag = (datum: string): SparadDag => ({ datum, kockar: 2, poster: [], stangd: false });
const kopia: OfflineKopia = {
  tid: "2026-11-18T07:30:00.000Z",
  anvandare: { epost: "kock@example.com", roll: "Kock" },
  katalog: [],
  grundrecept: [],
  dagar: { "2026-11-17": dag("2026-11-17"), "2026-11-18": dag("2026-11-18"), "2026-11-19": dag("2026-11-19") },
  installningar: STANDARD_INSTALLNINGAR,
};

describe("offlinekopia", () => {
  it("guarda solo hoy y los días siguientes", () => {
    const l = minne();
    sparaKopia(kopia, "2026-11-18", l);
    expect(Object.keys(lasKopia(l)!.dagar)).toEqual(["2026-11-18", "2026-11-19"]);
  });

  it("borrar, datos corruptos o almacenamiento lleno → sin copia y sin error", () => {
    const l = minne();
    sparaKopia(kopia, "2026-11-18", l);
    raderaKopia(l);
    expect(lasKopia(l)).toBeNull();
    l.setItem("planner.offline.v1", "{trasig");
    expect(lasKopia(l)).toBeNull();
    const full = { ...minne(), setItem: () => { throw new Error("QuotaExceededError"); } };
    expect(() => sparaKopia(kopia, "2026-11-18", full)).not.toThrow();
  });
});
