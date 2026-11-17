import { describe, expect, it } from "vitest";
import { flikFor, tolka } from "./useRutt";

describe("tolka", () => {
  it("entiende todas las rutas", () => {
    expect(tolka("")).toEqual({ vy: "idag" });
    expect(tolka("#/plan")).toEqual({ vy: "plan" });
    expect(tolka("#/katalog/brynt-smor-3-l")).toEqual({ vy: "redigera", id: "brynt-smor-3-l" });
    expect(tolka("#/ny-forberedelse")).toEqual({ vy: "ny" });
    expect(tolka("#/ny-forberedelse?recept=abc-123")).toEqual({ vy: "ny", receptId: "abc-123" });
    expect(tolka("#/stang")).toEqual({ vy: "stang" });
    expect(tolka("#/okand")).toEqual({ vy: "idag" });
  });

  it("asigna cada vista a su pestaña", () => {
    expect(flikFor(tolka("#/koppla"))).toBe("katalog");
    expect(flikFor(tolka("#/stang"))).toBe("idag");
    expect(flikFor(tolka("#/installningar"))).toBe("installningar");
  });
});
