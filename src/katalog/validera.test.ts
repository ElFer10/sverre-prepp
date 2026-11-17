import { describe, expect, it } from "vitest";
import { sv } from "../i18n/sv";
import { KATALOG } from "../scheduler/testhjalp";
import type { Forberedelse } from "../scheduler/types";
import { nyttFasId, stadaFas, valideraForberedelse } from "./validera";

const hamta = (id: string) => structuredClone(KATALOG.find((f) => f.id === id)!);

describe("valideraForberedelse", () => {
  it("todo el catálogo configurado es válido", () => {
    for (const f of KATALOG.filter((f) => f.faser.length > 0)) expect(valideraForberedelse(f, KATALOG), f.id).toEqual([]);
  });

  it("detecta fases incompletas", () => {
    const f = hamta("rotsellerikram");
    f.faser[0].namn = " ";
    f.faser[1].ugn = { ...f.faser[1].ugn!, tempMin: 200, tempMax: 180, bleck: 7 };
    f.faser[2].maxMinuter = 5;
    expect(valideraForberedelse(f, KATALOG)).toEqual([
      sv.valideringsfel.momentNamn(1),
      sv.valideringsfel.temp(2),
      sv.valideringsfel.bleck(2, 5),
      sv.valideringsfel.maxMinuter(3),
    ]);
  });

  it("detecta dependencias circulares", () => {
    const vin = hamta("vinagersky");
    vin.beroendeAv = ["smoradsky"]; // Smöradsky ya depende de Vinägersky
    expect(valideraForberedelse(vin, KATALOG)).toEqual([sv.valideringsfel.beroendeCykel("Smöradsky")]);
  });

  it("solo permite avbrytbar en espera sobre hornilla", () => {
    const f = hamta("inlagd-fankal");
    f.faser[0].avbrytbar = true;
    expect(valideraForberedelse(f, KATALOG)).toEqual([sv.valideringsfel.avbrytbar(1)]);
  });
});

describe("stadaFas / nyttFasId", () => {
  it("quita lo que no aplica", () => {
    const f = hamta("rotsellerikram").faser[1];
    expect(stadaFas({ ...f, resurs: "spisplatta", avbrytbar: true, maxVantanFore: null })).toEqual({
      id: f.id,
      namn: f.namn,
      typ: "vantan",
      minuter: 30,
      resurs: "spisplatta",
      avbrytbar: true,
    });
  });

  it("genera ids únicos", () => {
    const f: Forberedelse = { ...hamta("mandlar") };
    f.faser = [...f.faser, { ...f.faser[0], id: "mandlar-2" }];
    expect(nyttFasId(f)).toBe("mandlar-3");
  });
});
