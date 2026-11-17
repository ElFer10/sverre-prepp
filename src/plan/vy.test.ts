import { describe, expect, it } from "vitest";
import { sv } from "../i18n/sv";
import { KATALOG, kor } from "../scheduler/testhjalp";
import { efterOppningRader, ganttRader, klockslag, kockRader, kontrollRader, uppslag, varningsText } from "./vy";

describe("klockslag", () => {
  it("convierte minutos del plan en hora", () => {
    expect(klockslag(0, "14:00")).toBe("14:00");
    expect(klockslag(65, "14:00")).toBe("15:05");
    expect(klockslag(120, "14:00")).toBe("16:00");
    expect(klockslag(15, "13:50")).toBe("14:05");
  });
});

describe("kockRader", () => {
  it("lista fases activas e intervenciones del cocinero en orden, con lo que sigue", () => {
    const res = kor(["rotsellerikram"], { kockar: 1 });
    const rader = kockRader(res, KATALOG, 1, "14:00");
    expect(rader.map((r) => r.start)).toEqual([...rader.map((r) => r.start)].sort((a, b) => a - b));
    // Programar el horno y las fases activas
    expect(rader.some((r) => r.slag === "ugn-installning" && r.text === sv.rad.forvarm("Varmluft", 180))).toBe(true);
    const skala = rader.find((r) => r.text.startsWith("Skala och tärna"))!;
    expect(skala.forberedelse).toBe("Rotsellerikräm");
    const ugn = res.faser.find((f) => f.fasId === "rotsellerikram-2")!;
    expect(skala.detaljer).toContain(sv.rad.sedan("Ugn", klockslag(ugn.slut, "14:00")));
  });

  it("muestra las intervenciones de tillsyn y la limpieza", () => {
    const res = kor(["brynt-smor-3-l", "karljohanmajonnas", "misomajonnas"], { kockar: 1 });
    const rader = kockRader(res, KATALOG, 1, "14:00");
    expect(rader.filter((r) => r.slag === "tillsyn")).toHaveLength(6);
    expect(rader.filter((r) => r.slag === "rengoring").map((r) => r.text)).toEqual([sv.rad.rengor("Thermomix")]);
  });
});

describe("efterOppningRader", () => {
  it("contiene lo que sigue después de la apertura, sin cocinero", () => {
    const res = kor(["vinagersky"]);
    const rader = efterOppningRader(res, KATALOG, "14:00");
    expect(rader.map((r) => r.text)).toEqual(expect.arrayContaining(["Sila ner i stor plastlåda", "Svalna"]));
    expect(rader.every((r) => r.start >= res.oppning)).toBe(true);
  });
});

describe("avisos y control previo", () => {
  it("nombra la preparación y el cuello de botella en sueco", () => {
    const u = uppslag(KATALOG);
    expect(
      varningsText({ typ: "sen", forberedelseId: "rotsellerikram", minuterSent: 6, flaskhalsar: ["kockar", "ugn"] }, u),
    ).toBe("Rotsellerikräm blir 6 min sen (flaskhals: kockar, ugn)");
  });

  it("lista dependencias asumidas", () => {
    const res = kor(["smoradsky"]);
    expect(kontrollRader(res, uppslag(KATALOG))).toEqual([sv.plan.redanGjord("Vinägersky")]);
  });
});

describe("ganttRader", () => {
  it("tiene filas por cocinero y recurso, y reparte en carriles lo que se solapa en el horno", () => {
    const res = kor(["rotsellerikram", "rostade-jordartskockor"]);
    const rader = ganttRader(res, KATALOG, 2);
    expect(rader.map((r) => r.namn)).toEqual(["Kock 1", "Kock 2", "Ugn", "Spisplatta 1", "Spisplatta 2", "Thermomix", "Pacojet"]);
    const ugn = rader[2];
    expect(ugn.banor).toBeGreaterThanOrEqual(2);
    for (const r of rader) {
      for (const a of r.staplar)
        for (const b of r.staplar)
          if (a !== b && a.bana === b.bana) expect(a.slut <= b.start || b.slut <= a.start).toBe(true);
    }
  });
});
