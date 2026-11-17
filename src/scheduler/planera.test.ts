// Casos de prueba mínimos del planificador (SPEC §10).
import { describe, expect, it } from "vitest";
import { planera } from "./planera";
import { stangDagen } from "./stangDagen";
import {
  KATALOG,
  dag,
  fas,
  faserAv,
  kor,
  minuterAv,
  overlappar,
  prepSlut,
  prepStart,
} from "./testhjalp";
import { STANDARD_INSTALLNINGAR, type Forberedelse, type PlanResultat } from "./types";

const T = 120;

const ugnsfaser = (res: PlanResultat) => res.faser.filter((f) => f.resurs === "ugn");
const sena = (res: PlanResultat) =>
  res.varningar.flatMap((v) => (v.typ === "sen" ? [v] : []));

describe("fixture (KATALOG-UTKAST.md)", () => {
  it("contiene el catálogo completo con ids únicos y referencias válidas", () => {
    expect(KATALOG.length).toBe(46);
    const ids = new Set(KATALOG.map((f) => f.id));
    expect(ids.size).toBe(KATALOG.length);
    for (const f of KATALOG) {
      for (const d of f.beroendeAv) expect(ids, `${f.id} → ${d}`).toContain(d);
      if (f.fortsattning) expect(ids).toContain(f.fortsattning);
      for (const x of f.faser) if (x.resurs === "ugn") expect(x.ugn, x.id).toBeDefined();
    }
  });

  it("Rotsellerikräm coincide con el ejemplo de SPEC §3.1", () => {
    const r = KATALOG.find((f) => f.id === "rotsellerikram")!;
    expect(r.faser.map((x) => [x.typ, x.minuter, x.resurs])).toEqual([
      ["aktiv", 20, undefined],
      ["vantan", 30, "ugn"],
      ["aktiv", 10, "thermomix"],
      ["aktiv", 3, undefined],
    ]);
    expect(r.faser[1].ugn).toEqual({ lage: "varmluft", tempMin: 180, tempMax: 180, bleck: 2 });
  });
});

describe("SPEC §10", () => {
  it("1. dos fases de horno a 180 °C con 2 + 2 bandejas coinciden", () => {
    const res = kor(["rotsellerikram", "rostade-jordartskockor"]);
    const a = fas(res, "rotsellerikram", 2);
    const b = fas(res, "rostade-jordartskockor", 2);
    expect(overlappar(a, b)).toBe(true);
    expect(a.ugnBlock).toBe(b.ugnBlock);
    expect(res.ugn).toHaveLength(1);
  });

  it("2. 2 + 2 + 1 + 1 bandejas a 180 °C no caben todas a la vez", () => {
    const res = kor(["rotsellerikram", "rostade-jordartskockor", "gulbetor", "j-k-majonnas"]);
    const fs = ugnsfaser(res);
    expect(fs).toHaveLength(4);
    for (let t = 0; t < 300; t++) {
      const dentro = fs.filter((f) => f.start <= t && t < f.slut).length;
      expect(dentro, `minuto ${t}`).toBeLessThan(4);
    }
  });

  it("3. Hasselnötter (160–170) y Havresmulor (170) comparten a 170 °C", () => {
    const res = kor(["hasselnotter", "havresmulor"]);
    const h = fas(res, "hasselnotter", 1);
    const m = fas(res, "havresmulor", 2);
    expect(h.ugnBlock).toBe(m.ugnBlock);
    expect(overlappar(h, m)).toBe(true);
    expect(res.ugn[h.ugnBlock!].temp).toBe(170);
  });

  it("3b. Bakade äpple (175) no comparte con Hasselnötter (160–170)", () => {
    const res = kor(["hasselnotter", "bakade-apple"]);
    const h = fas(res, "hasselnotter", 1);
    const a = fas(res, "bakade-apple", 2);
    expect(h.ugnBlock).not.toBe(a.ugnBlock);
    expect(overlappar(h, a)).toBe(false);
    expect(res.ugn).toHaveLength(2);
  });

  it("4. Svartrot (ånga 100 °C) y una fase de varmluft van seguidas, con cambio de 10 min", () => {
    const res = kor(["svartrot", "gulbetor"]);
    const s = fas(res, "svartrot", 3);
    const g = fas(res, "gulbetor", 2);
    expect(overlappar(s, g)).toBe(false);
    const [primero, segundo] = s.start < g.start ? [s, g] : [g, s];
    expect(segundo.start - primero.slut).toBeGreaterThanOrEqual(10);
    expect(res.ugn).toHaveLength(2);
    expect(res.ugn[1].forvarmning).toBe(false);
    expect(res.ugn[1].klar - res.ugn[1].start).toBe(10);
  });

  it("5. tres o más preparaciones de hornilla a la vez → nunca más de 2 hornillas", () => {
    const res = kor(["inlagda-granskott", "brynt-smor-lojrom", "citronsteklokar", "friterad-potatis-kokt", "vaniljglass"]);
    for (let t = 0; t < 400; t++) {
      const n = res.faser.filter((f) => f.resurs === "spisplatta" && minuterAv(f).includes(t)).length;
      expect(n, `minuto ${t}`).toBeLessThanOrEqual(2);
    }
  });

  it("6. con 1 cocinero las fases activas nunca se solapan; con 2, sí", () => {
    const poster = ["panerad-schnitzel", "tartar-kott", "mandlar", "kondenserade-mjolk"];
    // Con 1 cocinero, `kor` valida que el cocinero no hace dos cosas a la vez.
    const uno = kor(poster, { kockar: 1 });
    expect(new Set(uno.faser.map((f) => f.kock))).toEqual(new Set([1]));
    const dos = kor(poster, { kockar: 2 });
    const activas = dos.faser.filter((f) => f.typ === "aktiv");
    const solapan = activas.some((a) => activas.some((b) => a !== b && overlappar(a, b)));
    expect(solapan).toBe(true);
  });

  it("7. mientras algo se asa, el cocinero hace otra fase activa", () => {
    const res = kor(["gulbetor", "panerad-schnitzel"], { kockar: 1 });
    const asado = fas(res, "gulbetor", 2);
    const otra = res.faser.filter((f) => f.typ === "aktiv" && f.forberedelseId === "panerad-schnitzel");
    expect(otra.some((f) => overlappar(f, asado))).toBe(true);
  });

  it("8. tres mayonesas en la Thermomix van seguidas, con limpieza entre ellas", () => {
    const res = kor(["karljohanmajonnas", "misomajonnas", "ostkram"]);
    const usos = res.faser.filter((f) => f.resurs === "thermomix").sort((a, b) => a.start - b.start);
    expect(usos).toHaveLength(3);
    const limpiezas = res.ingrepp.filter((g) => g.typ === "rengoring" && g.resurs === "thermomix");
    expect(limpiezas).toHaveLength(2);
    for (let i = 1; i < usos.length; i++) expect(usos[i].start - usos[i - 1].slut).toBeGreaterThanOrEqual(3);
    for (const g of limpiezas) expect(g.slut - g.start).toBe(3);
  });

  it("9. maxVantanFore = 0 se respeta (Broccoli: echar el agua al hervir)", () => {
    // Con otras preparaciones compitiendo por cocineros y hornillas
    const res = kor(["broccoli", "panerad-schnitzel", "inlagd-fankal", "citronsteklokar"], { kockar: 1 });
    expect(fas(res, "broccoli", 3).start).toBe(fas(res, "broccoli", 2).slut);
    expect(fas(res, "citronsteklokar", 3).start).toBe(fas(res, "citronsteklokar", 2).slut);
  });

  it("10. Smöradsky va después de Vinägersky, en Efter 16:00 y sin aviso", () => {
    const res = kor(["smoradsky", "vinagersky"]);
    expect(prepStart(res, "smoradsky")).toBeGreaterThanOrEqual(prepSlut(res, "vinagersky"));
    expect(fas(res, "smoradsky", 1).efterOppning).toBe(true);
    expect(fas(res, "smoradsky", 1).kock).toBeUndefined();
    expect(res.varningar).toEqual([]);
  });

  it("10b. sin Vinägersky en la lista, Smöradsky la pide en Kontrollera före start", () => {
    const res = kor(["smoradsky"]);
    expect(res.kontrolleraFore).toContainEqual({ forberedelseId: "smoradsky", beroendeAv: "vinagersky" });
    expect(prepSlut(res, "smoradsky")).toBeLessThanOrEqual(T);
  });

  it("11. Vinägersky empieza antes de las 16:00 y sus fases restantes van a Efter 16:00", () => {
    const res = kor(["vinagersky"]);
    const fs = faserAv(res, "vinagersky");
    expect(fs[0].start).toBeLessThan(T);
    expect(prepSlut(res, "vinagersky")).toBeGreaterThan(T);
    const despues = fs.filter((f) => f.efterOppning);
    expect(despues.map((f) => f.fasId)).toEqual(["vinagersky-3", "vinagersky-4"]);
    // Las fases activas después de las 16:00 no se asignan a ningún cocinero
    expect(fas(res, "vinagersky", 3).kock).toBeUndefined();
    // Ni las intervenciones de tillsyn posteriores
    for (const g of res.ingrepp) expect(g.kock === undefined).toBe(g.start >= T);
    expect(res.varningar).toEqual([]);
  });

  it("12. hornillas llenas con salsas interrumpibles → se interrumpe una y se alarga", () => {
    const res = kor(["vinagersky", "smorsas", "inlagd-fankal"]);
    expect(sena(res)).toEqual([]);
    // Las salsas van al fuego cuanto antes (decisión de Fer)
    expect(prepStart(res, "vinagersky")).toBe(0);
    expect(prepStart(res, "smorsas")).toBe(0);
    expect(res.avbrott.length).toBeGreaterThanOrEqual(1);
    for (const a of res.avbrott) {
      const salsa = fas(res, a.forberedelseId, Number(a.fasId.split("-").pop()));
      const otra = res.faser.find((f) => f.fasId === a.avFasId)!;
      // La otra fase usa la hornilla de la salsa durante la pausa
      expect(otra.enhet).toBe(a.enhet);
      expect(otra.start).toBe(a.start + 1);
      expect(otra.slut).toBe(a.slut - 1);
      // La pausa cuenta 1 min para retirar y 1 min para devolver la olla
      expect(a.slut - a.start).toBe(otra.slut - otra.start + 2);
      const av = res.ingrepp.find((g) => g.typ === "flytta-av" && g.start === a.start)!;
      const pa = res.ingrepp.find((g) => g.typ === "flytta-pa" && g.slut === a.slut)!;
      expect(av.slut - av.start).toBe(1);
      expect(pa.slut - pa.start).toBe(1);
      if (otra.kock !== undefined) {
        expect(av.kock).toBe(otra.kock);
        expect(pa.kock).toBe(otra.kock);
      }
      // La salsa se alarga lo que dura la pausa (validado también en `kor`)
      expect(salsa.pauser).toContainEqual({ start: a.start, slut: a.slut });
    }
  });

  it("12b. si hay una hornilla libre, no se interrumpe la salsa", () => {
    const res = kor(["vinagersky", "inlagd-fankal", "broccoli"]);
    expect(res.avbrott).toEqual([]);
  });

  it("13. una «si da tiempo» nunca retrasa una obligatoria", () => {
    const maste = ["rotsellerikram", "panerad-schnitzel", "karljohanmajonnas", "misomajonnas", "vinagersky"];
    const omTid: Array<[string, "om-tid"]> = [
      ["ostkram", "om-tid"],
      ["tartar-kott", "om-tid"],
      ["inlagd-fankal", "om-tid"],
      ["dillolja", "om-tid"],
    ];
    for (const seed of [1, 2, 3]) {
      const solo = kor(maste, { kockar: 1, seed });
      const con = kor([...maste, ...omTid], { kockar: 1, seed });
      // Mismas obligatorias cumplidas y mismo retraso total
      expect(con.poang.slice(0, 2)).toEqual(solo.poang.slice(0, 2));
      // Las colocadas caben enteras antes de la apertura; las otras se arrastran
      for (const [id] of omTid) {
        if (con.ejPlacerade.includes(id)) expect(faserAv(con, id)).toEqual([]);
        else expect(prepSlut(con, id)).toBeLessThanOrEqual(T);
      }
      expect(con.ejPlacerade.length).toBeGreaterThan(0);
    }
  });

  it("14. obligatorias que no caben → aviso con el cuello de botella (cocineros)", () => {
    const res = kor(
      ["panerad-schnitzel", "rotsellerikram", "svartrot", "syrad-spetskal", "rostade-palsternacka", "citronsteklokar", "tartar-kott"],
      { kockar: 1 },
    );
    const s = sena(res);
    expect(s.length).toBeGreaterThan(0);
    for (const v of s) {
      expect(v.minuterSent).toBeGreaterThan(0);
      expect(v.flaskhalsar).toContain("kockar");
    }
  });

  it("14b. aviso de cuello de botella: Thermomix", () => {
    const res = kor(
      [
        "karljohanmajonnas",
        "misomajonnas",
        "ostkram",
        "dillolja",
        "hackad-karljohansvamp",
        "vispat-brynt-smor-steg-2",
        "rotsellerikram",
        "j-k-majonnas",
      ],
      {
        kockar: 2,
        // Una limpieza larga satura la Thermomix
        inst: { thermomix: { antal: 1, rengoringMin: 10 } },
      },
    );
    const s = sena(res);
    expect(s.length).toBeGreaterThan(0);
    for (const v of s) expect(v.flaskhalsar).toContain("thermomix");
  });

  it("14c. aviso de cuello de botella: la ventana (cadena más larga que 120 min)", () => {
    const katalog: Forberedelse[] = KATALOG.map((f) =>
      f.id === "smorsas" ? { ...f, kanAvslutasEfterOppning: false } : f,
    );
    const res = kor(["smorsas"], { katalog });
    expect(sena(res)).toEqual([
      expect.objectContaining({ forberedelseId: "smorsas", flaskhalsar: ["fonster"] }),
    ]);
  });

  it("15. senast-möjligt termina lo más cerca posible de las 16:00", () => {
    const res = kor(["broccoli", "rotsellerikram", "aggskum"]);
    expect(prepSlut(res, "broccoli")).toBe(T);
    expect(prepSlut(res, "aggskum")).toBe(T);
    expect(sena(res)).toEqual([]);
  });

  it("16. las intervenciones de tillsyn quedan reservadas a un cocinero", () => {
    const res = kor(["brynt-smor-3-l", "panerad-schnitzel", "tartar-kott"], { kockar: 1 });
    const bryn = fas(res, "brynt-smor-3-l", 2);
    const tillsyn = res.ingrepp.filter((g) => g.typ === "tillsyn" && g.fasId === bryn.fasId);
    expect(tillsyn.map((g) => g.start - bryn.start)).toEqual([4, 8, 12, 16, 20, 24]);
    for (const g of tillsyn) expect(g.kock).toBe(1);
    // `kor` ya valida que el cocinero no hace otra cosa en ese minuto.
    expect(sena(res)).toEqual([]);
  });

  it("16b. una intervención de tillsyn puede pausar una fase activa sin recurso", () => {
    const res = kor(["brynt-smor-3-l", "tartar-kott", "mandlar"], { kockar: 1 });
    const tartar = fas(res, "tartar-kott", 1);
    const bryn = fas(res, "brynt-smor-3-l", 2);
    // Con un solo cocinero, el tartar se hace mientras se dora la mantequilla,
    // parando 1 min para remover cada vez que toca
    expect(overlappar(tartar, bryn)).toBe(true);
    expect(tartar.pauser.length).toBeGreaterThan(0);
    const remover = res.ingrepp.filter((g) => g.typ === "tillsyn").map((g) => g.start);
    for (const p of tartar.pauser) expect(remover).toContain(p.start);
  });

  it("17. al cerrar el día, Vispat brynt smör steg 1 → steg 2 aparece al día siguiente", () => {
    const d = dag([
      "vispat-brynt-smor-steg-1",
      ["hangt-graddfil-steg-1", "om-tid"],
      ["tartar-kott", "om-tid"],
      ["mandlar", "om-tid"],
      "panerad-schnitzel",
    ]);
    d.poster[1].status = "gjord";
    d.poster[3].status = "ej-gjord";
    d.poster[4].status = "ej-gjord";
    const nya = stangDagen(d, KATALOG);
    expect(nya).toEqual([
      // Obligatoria sin marcar → se da por hecha y genera su följdsteg
      { forberedelseId: "vispat-brynt-smor-steg-2", prioritet: "maste", status: "planerad", overfordFran: "2026-11-17" },
      // Hecha con följdsteg → steg 2 con su misma prioridad
      { forberedelseId: "hangt-graddfil-steg-2", prioritet: "om-tid", status: "planerad", overfordFran: "2026-11-17" },
      // «Si da tiempo» no hecha o sin marcar → se arrastra con su prioridad
      { forberedelseId: "tartar-kott", prioritet: "om-tid", ordning: 2, status: "planerad", overfordFran: "2026-11-17" },
      { forberedelseId: "mandlar", prioritet: "om-tid", ordning: 3, status: "planerad", overfordFran: "2026-11-17" },
      // Obligatoria marcada como no hecha → se arrastra
      { forberedelseId: "panerad-schnitzel", prioritet: "maste", ordning: 4, status: "planerad", overfordFran: "2026-11-17" },
    ]);
  });

  it("18. la misma semilla da el mismo plan", () => {
    const poster = [
      "vinagersky",
      "smorsas",
      "rotsellerikram",
      "j-k-majonnas",
      "broccoli",
      "inlagd-fankal",
      "hasselnotter",
      "havresmulor",
      ["ostkram", "om-tid"],
      ["mandlar", "om-tid"],
    ] as const;
    const a = kor([...poster], { seed: 42 });
    const b = kor([...poster], { seed: 42 });
    expect(b).toEqual(a);
  });
});

describe("otros", () => {
  it("avisa de preparaciones sin fases o desconocidas", () => {
    const res = kor(["potatis-chips", "finns-inte", "mandlar"]);
    expect(res.varningar).toEqual([
      { typ: "ej-konfigurerad", forberedelseId: "potatis-chips" },
      { typ: "okand", forberedelseId: "finns-inte" },
    ]);
    expect(faserAv(res, "mandlar")).toHaveLength(1);
  });

  it("lista los requisitos previos", () => {
    const katalog = KATALOG.map((f) =>
      f.id === "chokladsorbet" ? { ...f, kontrolleraFore: ["Pacoburkar frysta sedan igår"] } : f,
    );
    const res = kor(["chokladsorbet"], { katalog });
    expect(res.kontrolleraFore).toEqual([{ forberedelseId: "chokladsorbet", krav: "Pacoburkar frysta sedan igår" }]);
  });

  it("un día completo con 2 cocineros es válido y rápido (500 iteraciones)", () => {
    const poster = [
      "vinagersky",
      "smorsas",
      "rotsellerikram",
      "j-k-majonnas",
      "karljohanmajonnas",
      "broccoli",
      "aggskum",
      "inlagd-fankal",
      "picklad-rotselleri",
      "hasselnotter",
      "havresmulor",
      "gulbetor",
      "rostade-jordartskockor",
      "brynt-smor-lojrom",
      "dillolja",
      "tartar-kott",
      ["ostkram", "om-tid"],
      ["rodloksmarmelad", "om-tid"],
      ["chokladsorbet", "om-tid"],
      ["mandlar", "om-tid"],
    ] as const;
    const t0 = performance.now();
    const res = kor([...poster], { inst: { iterationer: STANDARD_INSTALLNINGAR.iterationer } });
    const ms = performance.now() - t0;
    expect(res.faser.length).toBeGreaterThan(40);
    expect(ms).toBeLessThan(3000);
  });

  it("es puro: no muta el catálogo ni el plan del día", () => {
    const d = dag(["vinagersky", "inlagd-fankal", "smorsas"]);
    const antesK = JSON.stringify(KATALOG);
    const antesD = JSON.stringify(d);
    planera(KATALOG, d, { ...STANDARD_INSTALLNINGAR, iterationer: 20 }, 7);
    expect(JSON.stringify(KATALOG)).toBe(antesK);
    expect(JSON.stringify(d)).toBe(antesD);
  });
});
