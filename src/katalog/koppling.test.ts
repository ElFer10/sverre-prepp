import { describe, expect, it } from "vitest";
import { KATALOG } from "../scheduler/testhjalp";
import type { Forberedelse } from "../scheduler/types";
import {
  kopplingsLage,
  kopplingsforslag,
  lasGrundrecept,
  normalisera,
  okonfigurerade,
  synka,
  type Grundrecept,
} from "./koppling";

const g = (id: string, namn: string, status: Grundrecept["status"] = "active", kategori = "Sås & kräm"): Grundrecept => ({
  id,
  namn,
  kategori,
  status,
  steg: [],
});

const GRUND = [
  g("g-karl", "Karljohanmajonnäs"),
  g("g-vin", "Vinägersky"),
  g("g-brynt", "Brynt smör"),
  g("g-tartar", "Tartar"),
  g("g-chips", "Potatischips"),
  g("g-vit", "Rostad vitchoklad"),
  g("g-vispat", "Vispat brynt smör"),
  g("g-gammal", "Mandlar", "archived"),
  g("g-dubbel-1", "Broccoli"),
  g("g-dubbel-2", "broccoli"),
];

const forslag = (id: string) => kopplingsforslag(KATALOG, GRUND).find((f) => f.forberedelseId === id)!;

describe("normalisera", () => {
  it("ignora mayúsculas, signos y el sufijo de steg", () => {
    expect(normalisera("Vispat brynt smör — steg 1")).toBe("vispat brynt smör");
    expect(normalisera("Vispat brynt smör · steg 2")).toBe("vispat brynt smör");
    expect(normalisera("J-K  majonnäs")).toBe("j k majonnäs");
    expect(normalisera("Brynt smör (3 l)", true)).toBe("brynt smör");
  });
});

describe("kopplingsforslag", () => {
  it("propone enlazar las coincidencias exactas y únicas", () => {
    expect(forslag("karljohanmajonnas")).toEqual({ forberedelseId: "karljohanmajonnas", exakt: "g-karl", kandidater: [] });
    expect(forslag("vinagersky").exakt).toBe("g-vin");
    // Las dos partes de una receta de dos días apuntan a la misma grundrecept
    expect(forslag("vispat-brynt-smor-steg-1").exakt).toBe("g-vispat");
    expect(forslag("vispat-brynt-smor-steg-2").exakt).toBe("g-vispat");
  });

  it("deja a Fer decidir los parecidos", () => {
    expect(forslag("brynt-smor-3-l")).toEqual({ forberedelseId: "brynt-smor-3-l", kandidater: ["g-brynt", "g-vispat"] });
    expect(forslag("brynt-smor-lojrom").exakt).toBeUndefined();
    expect(forslag("brynt-smor-lojrom").kandidater[0]).toBe("g-brynt");
    expect(forslag("potatis-chips").kandidater[0]).toBe("g-chips");
    expect(forslag("rostad-vit-choklad").kandidater[0]).toBe("g-vit");
    expect(forslag("tartar-kott").kandidater[0]).toBe("g-tartar");
  });

  it("no propone grundrecept archivadas ni elige entre dos iguales", () => {
    expect(forslag("mandlar")).toEqual({ forberedelseId: "mandlar", kandidater: [] });
    const b = forslag("broccoli");
    expect(b.exakt).toBeUndefined();
    expect(b.kandidater).toEqual(["g-dubbel-1", "g-dubbel-2"]);
  });

  it("solo considera las que no están enlazadas", () => {
    const enlazado = KATALOG.map((f) => (f.id === "vinagersky" ? { ...f, receptId: "g-vin" } : f));
    expect(kopplingsforslag(enlazado, GRUND).some((f) => f.forberedelseId === "vinagersky")).toBe(false);
  });
});

describe("estado del enlace", () => {
  const vin: Forberedelse = { ...KATALOG.find((f) => f.id === "vinagersky")!, receptId: "g-vin", namn: "Vinägersky (gammalt namn)" };

  it("toma nombre y categoría de la app de recetas", () => {
    const [s] = synka([vin], [g("g-vin", "Vinägersky", "active", "Såser")]);
    expect(s.namn).toBe("Vinägersky");
    expect(s.kategori).toBe("Såser");
    expect(s.faser).toBe(vin.faser);
  });

  it("una receta repartida en dos días mantiene el número de steg en el nombre", () => {
    const [s1, s2] = synka([{ ...vin, steg: 1 }, { ...vin, id: "vin-2", steg: 2 }], [g("g-vin", "Vinäger-sky")]);
    expect(s1.namn).toBe("Vinäger-sky · steg 1");
    expect(s2.namn).toBe("Vinäger-sky · steg 2");
  });

  it("distingue enlazada, propia y huérfana", () => {
    expect(kopplingsLage(vin, GRUND)).toBe("kopplad");
    expect(kopplingsLage(KATALOG[0], GRUND)).toBe("egen");
    expect(kopplingsLage({ ...vin, receptId: "borrad" }, GRUND)).toBe("saknas");
  });

  it("lista las grundrecept sin configurar, sin las archivadas", () => {
    const ids = okonfigurerade([vin], GRUND).map((x) => x.id);
    expect(ids).not.toContain("g-vin");
    expect(ids).not.toContain("g-gammal");
    expect(ids).toContain("g-karl");
  });
});

describe("lasGrundrecept", () => {
  it("lee solo recetas de tipo prep del JSON de la app de recetas", () => {
    expect(
      lasGrundrecept({ id: "x", name: " Dillolja ", type: "prep", status: "draft", category: "Olja", steps: "Mixa.\n\n Sila. ", items: [] }),
    ).toEqual({ id: "x", namn: "Dillolja", kategori: "Olja", status: "draft", steg: ["Mixa.", "Sila."] });
    expect(lasGrundrecept({ id: "y", name: "Torsk", type: "dish" })).toBeNull();
    expect(lasGrundrecept(null)).toBeNull();
  });
});
