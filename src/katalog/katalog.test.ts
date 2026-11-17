import { describe, expect, it } from "vitest";
import { sv } from "../i18n/sv";
import { KATALOG } from "../scheduler/testhjalp";
import type { Forberedelse } from "../scheduler/types";
import { arEgen, medId, nyttForberedelseId, slug, utanForberedelse } from "./katalog";
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
