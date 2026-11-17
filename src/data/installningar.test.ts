import { describe, expect, it } from "vitest";
import { STANDARD_INSTALLNINGAR } from "../scheduler/types";
import { giltigaInstallningar } from "./installningar";

describe("giltigaInstallningar", () => {
  it("acepta la configuración por defecto", () => {
    expect(giltigaInstallningar(STANDARD_INSTALLNINGAR)).toBe(true);
  });
  it("rechaza horas mal escritas, apertura antes del inicio y números fuera de rango", () => {
    const s = STANDARD_INSTALLNINGAR;
    expect(giltigaInstallningar({ ...s, start: "14.00" })).toBe(false);
    expect(giltigaInstallningar({ ...s, oppning: "13:30" })).toBe(false);
    expect(giltigaInstallningar({ ...s, spisplattor: 0 })).toBe(false);
    expect(giltigaInstallningar({ ...s, ugn: { ...s.ugn, bleck: 2.5 } })).toBe(false);
    expect(giltigaInstallningar({ ...s, iterationer: NaN })).toBe(false);
  });
});
