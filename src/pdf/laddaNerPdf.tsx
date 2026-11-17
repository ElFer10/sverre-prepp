// Genera el PDF en el navegador y lo descarga. Se carga bajo demanda (react-pdf pesa mucho).
import { pdf } from "@react-pdf/renderer";
import fet from "dejavu-fonts-ttf/ttf/DejaVuSansCondensed-Bold.ttf?url";
import kursiv from "dejavu-fonts-ttf/ttf/DejaVuSansCondensed-Oblique.ttf?url";
import normal from "dejavu-fonts-ttf/ttf/DejaVuSansCondensed.ttf?url";
import { sv } from "../i18n/sv";
import type { Forberedelse, Installningar, PlanResultat } from "../scheduler/types";
import { PlanPdf } from "./PlanPdf";
import { registreraTypsnitt } from "./typsnitt";

export async function laddaNerPdf(res: PlanResultat, katalog: Forberedelse[], inst: Installningar, datum: string) {
  registreraTypsnitt({ normal, fet, kursiv });
  const blob = await pdf(<PlanPdf res={res} katalog={katalog} inst={inst} datum={datum} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = sv.pdf.filnamn(datum);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
