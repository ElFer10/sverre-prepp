import { renderToBuffer } from "@react-pdf/renderer";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { KATALOG, kor } from "../scheduler/testhjalp";
import { STANDARD_INSTALLNINGAR } from "../scheduler/types";
import { PlanPdf } from "./PlanPdf";
import { registreraTypsnitt } from "./typsnitt";

const require = createRequire(import.meta.url);
const ttf = (n: string) => require.resolve(`dejavu-fonts-ttf/ttf/${n}.ttf`);

describe("PlanPdf", () => {
  it("genera un PDF A4 con un día completo (2 cocineros, salsas, horno)", async () => {
    registreraTypsnitt({
      normal: ttf("DejaVuSansCondensed"),
      fet: ttf("DejaVuSansCondensed-Bold"),
      kursiv: ttf("DejaVuSansCondensed-Oblique"),
    });
    const res = kor(["vinagersky", "smorsas", "rotsellerikram", "inlagd-fankal", "broccoli", "smoradsky", ["ostkram", "om-tid"]], {
      inst: { iterationer: 30 },
    });
    const buf = await renderToBuffer(
      <PlanPdf res={res} katalog={KATALOG} inst={STANDARD_INSTALLNINGAR} datum="2026-11-17" />,
    );
    const pdf = buf.toString("latin1");
    expect(pdf.startsWith("%PDF")).toBe(true);
    // A4: 595.28 × 841.89 pt
    expect(pdf).toMatch(/\/MediaBox \[0 0 595\.2\d+ 841\.8\d+\]/);
    // Una página por cocinero como mínimo, más la de recursos
    const paginas = pdf.match(/\/Type \/Page\b/g)?.length ?? 0;
    expect(paginas).toBeGreaterThanOrEqual(3);
  }, 30_000);
});
