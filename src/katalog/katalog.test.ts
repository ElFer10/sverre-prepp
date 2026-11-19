import { describe, expect, it } from "vitest";
import { sv } from "../i18n/sv";
import { KATALOG } from "../scheduler/testhjalp";
import type { Forberedelse } from "../scheduler/types";
import { arEgen, delaUpp, medId, nyttForberedelseId, slug, utanForberedelse } from "./katalog";
import { valideraForberedelse } from "./validera";

const ny = (namn: string): Forberedelse => ({
  id: "",
  namn,
  faser: [
    { id: "tmp-1", namn: "Krossa", typ: "aktiv", minuter: 5 },
    { id: "tmp-2", namn: "Rosta", typ: "aktiv", minuter: 3 },
  ],
  beroendeAv: [],
  farskhet: "normal",
  kanAvslutasEfterOppning: false,
  aktiv: true,
});

describe("preparaciones propias", () => {
  it("genera un id legible y único", () => {
    expect(slug("Brynt smör (3 l)")).toBe("brynt-smor-3-l");
    expect(nyttForberedelseId("Rostade valnötter", KATALOG)).toBe("rostade-valnotter");
    expect(nyttForberedelseId("Mandlar", KATALOG)).toBe("mandlar-2");
    expect(nyttForberedelseId("  !!  ", KATALOG)).toBe("forberedelse");
  });

  it("renumera las fases con el id definitivo", () => {
    expect(medId(ny("Valnötter"), "valnotter").faser.map((x) => x.id)).toEqual(["valnotter-1", "valnotter-2"]);
  });

  it("una preparación sin receptId es propia", () => {
    expect(arEgen(ny("X"))).toBe(true);
    expect(arEgen({ ...ny("X"), receptId: "0b6c…" })).toBe(false);
  });

  it("al borrar, quita las referencias de dependencias y följdsteg", () => {
    const sinVin = utanForberedelse(KATALOG, "vinagersky");
    expect(sinVin.find((f) => f.id === "vinagersky")).toBeUndefined();
    expect(sinVin.find((f) => f.id === "smoradsky")!.beroendeAv).toEqual([]);
    const sinSteg2 = utanForberedelse(KATALOG, "vispat-brynt-smor-steg-2");
    expect(sinSteg2.find((f) => f.id === "vispat-brynt-smor-steg-1")!.fortsattning).toBeUndefined();
    // Las demás no se tocan
    expect(sinSteg2.find((f) => f.id === "mandlar")).toBe(KATALOG.find((f) => f.id === "mandlar"));
  });

  it("no permite dos preparaciones con el mismo nombre", () => {
    expect(valideraForberedelse(medId(ny("mandlar "), "mandlar-2"), KATALOG)).toEqual([sv.valideringsfel.namnFinns("Mandlar")]);
    expect(valideraForberedelse(medId(ny("Valnötter"), "valnotter"), KATALOG)).toEqual([]);
  });
});

describe("dela upp i två dagar (följdsteg enlazado a la misma receta)", () => {
  // Vinägersky enlazada a la app de recetas; Smörsås/Smöradsky depende de ella
  const vin: Forberedelse = { ...KATALOG.find((f) => f.id === "vinagersky")!, receptId: "g-vin" };
  const katalog = KATALOG.map((f) => (f.id === vin.id ? vin : f));

  it("crea steg 2 enlazado a la misma receta y une los dos días con följdsteg", () => {
    const r = delaUpp(vin, katalog)!;
    expect(r.steg1).toMatchObject({ id: "vinagersky", receptId: "g-vin", steg: 1, namn: "Vinägersky · steg 1", fortsattning: r.steg2.id });
    expect(r.steg2).toMatchObject({ id: "vinagersky-steg-2", receptId: "g-vin", steg: 2, namn: "Vinägersky · steg 2", kategori: vin.kategori });
    expect(r.steg2.fortsattning).toBeUndefined();
    // Sin indicar desde qué momento: todo queda en el día 1 y el día 2 se configura después
    expect(r.steg1.faser).toEqual(vin.faser);
    expect(r.steg2.faser).toEqual([]);
  });

  it("puede mover al día 2 los momentos desde uno dado", () => {
    const r = delaUpp(vin, katalog, 1)!;
    expect(r.steg1.faser).toEqual(vin.faser.slice(0, 1));
    expect(r.steg2.faser.map((x) => x.namn)).toEqual(vin.faser.slice(1).map((x) => x.namn));
    expect(r.steg2.faser.map((x) => x.id)).toEqual(vin.faser.slice(1).map((_, i) => `vinagersky-steg-2-${i + 1}`));
    // El primer momento del día 2 no puede ir "justo después" de algo del día anterior
    expect(r.steg2.faser[0].maxVantanFore).toBeUndefined();
  });

  it("lo que dependía del producto terminado pasa a depender del steg 2", () => {
    const r = delaUpp(vin, katalog)!;
    const smoradsky = r.andrade.find((f) => f.id === "smoradsky")!;
    expect(smoradsky.beroendeAv).toEqual(["vinagersky-steg-2"]);
    expect(r.andrade.every((f) => f.beroendeAv.includes("vinagersky-steg-2"))).toBe(true);
  });

  it("solo para preparaciones enlazadas que aún no están repartidas", () => {
    expect(delaUpp({ ...vin, receptId: undefined }, katalog)).toBeNull();
    expect(delaUpp({ ...vin, fortsattning: "otra" }, katalog)).toBeNull();
    expect(delaUpp({ ...vin, steg: 2 }, katalog)).toBeNull();
  });

  it("al borrar el steg 2, el steg 1 vuelve a ser una preparación normal", () => {
    const r = delaUpp(vin, katalog)!;
    const delad = [...katalog.filter((f) => f.id !== vin.id), r.steg1, r.steg2];
    const efter = utanForberedelse(delad, r.steg2.id).find((f) => f.id === vin.id)!;
    expect(efter.fortsattning).toBeUndefined();
    expect(efter.steg).toBeUndefined();
  });
});
