import { describe, expect, it } from "vitest";
import { KATALOG, dag as nyDag, kor } from "../scheduler/testhjalp";
import { forslagStatus, gjordesDet, overforTillBefintlig, skapaDag, slaIhop, stangDag, type SparadDag } from "./dagar";

const dag = (datum: string, ...args: Parameters<typeof nyDag>): SparadDag => ({ ...nyDag(...args), datum });
const ids = (d: SparadDag) => d.poster.map((p) => `${p.forberedelseId}:${p.prioritet}`);

describe("Stäng dagen", () => {
  it("propone obligatorias hechas y las om-tid según si cupieron en el plan", () => {
    const d = dag("2026-11-18", ["vinagersky", ["mandlar", "om-tid"], ["rodloksmarmelad", "om-tid"]]);
    d.resultat = kor(["vinagersky", ["mandlar", "om-tid"], ["rodloksmarmelad", "om-tid"]]);
    // Con 2 cocineros caben las dos om-tid; quito una del plan para probar
    d.resultat = { ...d.resultat, faser: d.resultat.faser.filter((f) => f.forberedelseId !== "rodloksmarmelad") };
    expect(forslagStatus(d)).toEqual({ vinagersky: "gjord", mandlar: "gjord", rodloksmarmelad: "ej-gjord" });
  });

  it("al cerrar calcula el arrastre y los följdsteg", () => {
    const d = dag("2026-11-18", ["vispat-brynt-smor-steg-1", "panerad-schnitzel", ["mandlar", "om-tid"]]);
    const s = stangDag(d, KATALOG, { "panerad-schnitzel": "ej-gjord" });
    expect(s.stangd).toBe(true);
    expect(s.poster.map((p) => p.status)).toEqual(["planerad", "ej-gjord", "planerad"]);
    expect(s.overfors!.map((p) => p.forberedelseId)).toEqual(["vispat-brynt-smor-steg-2", "panerad-schnitzel", "mandlar"]);
  });
});

describe("día nuevo", () => {
  it("recibe lo pendiente del último día cerrado, una sola vez", () => {
    const ayer = stangDag(dag("2026-11-17", ["hangt-graddfil-steg-1", ["mandlar", "om-tid"]], 1), KATALOG);
    const { dag: hoy, tidigare } = skapaDag("2026-11-18", ayer, KATALOG);
    expect(ids(hoy)).toEqual(["hangt-graddfil-steg-2:maste", "mandlar:om-tid"]);
    expect(hoy.poster.every((p) => p.overfordFran === "2026-11-17")).toBe(true);
    expect(hoy.kockar).toBe(1);
    expect(tidigare!.overfordTill).toBe("2026-11-18");
    // Si ya se arrastró, no se vuelve a arrastrar
    expect(skapaDag("2026-11-19", tidigare, KATALOG).dag.poster).toEqual([]);
  });

  it("si nadie cerró el día anterior, se cierra con la regla por defecto", () => {
    const ayer = dag("2026-11-17", ["vispat-brynt-smor-steg-1", ["mandlar", "om-tid"]]);
    const { dag: hoy, tidigare } = skapaDag("2026-11-18", ayer, KATALOG);
    expect(tidigare!.stangd).toBe(true);
    expect(ids(hoy)).toEqual(["vispat-brynt-smor-steg-2:maste", "mandlar:om-tid"]);
  });

  it("sin día anterior empieza vacío", () => {
    expect(skapaDag("2026-11-18", undefined, KATALOG)).toEqual({ dag: { datum: "2026-11-18", kockar: 2, poster: [], stangd: false } });
  });

  it("si el día siguiente ya existía, el arrastre se añade sin duplicar", () => {
    const ayer = stangDag(dag("2026-11-17", [["mandlar", "om-tid"], ["tartar-kott", "om-tid"]]), KATALOG);
    const hoy = dag("2026-11-18", ["mandlar", "broccoli"]);
    const r = overforTillBefintlig(ayer, hoy)!;
    expect(ids(r.nasta)).toEqual(["mandlar:maste", "broccoli:maste", "tartar-kott:om-tid"]);
    expect(r.stangd.overfordTill).toBe("2026-11-18");
    expect(overforTillBefintlig(r.stangd, r.nasta)).toBeNull();
    expect(overforTillBefintlig(ayer, { ...hoy, stangd: true })).toBeNull();
  });
});

describe("Gjordes det?", () => {
  it("quita lo arrastrado que sí se hizo y añade su följdsteg", () => {
    const d = dag("2026-11-18", [["vispat-brynt-smor-steg-1", "om-tid"], "mandlar"]);
    d.poster[0].overfordFran = "2026-11-17";
    const r = gjordesDet(d, "vispat-brynt-smor-steg-1", KATALOG);
    expect(ids(r)).toEqual(["mandlar:maste", "vispat-brynt-smor-steg-2:om-tid"]);
    expect(r.poster[1].overfordFran).toBe("2026-11-17");
    expect(ids(gjordesDet(r, "mandlar", KATALOG))).toEqual(["vispat-brynt-smor-steg-2:om-tid"]);
  });

  it("slaIhop no duplica y renumera", () => {
    const a = dag("x", ["mandlar", "broccoli"]).poster;
    expect(slaIhop(a, dag("x", ["broccoli", "tartar-kott"]).poster).map((p) => [p.forberedelseId, p.ordning])).toEqual([
      ["mandlar", 0],
      ["broccoli", 1],
      ["tartar-kott", 2],
    ]);
  });
});
