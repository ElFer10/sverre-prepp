// Fuente del PDF.
import { Font } from "@react-pdf/renderer";

export const TYPSNITT = "DejaVu";

export interface Typsnittsfiler {
  normal: string;
  fet: string;
  kursiv: string;
}

let registrerat = false;

/** Registra la fuente (URL en el navegador, ruta de fichero en Node). Las fuentes estándar del PDF no tienen "→". */
export function registreraTypsnitt(f: Typsnittsfiler) {
  if (registrerat) return;
  Font.register({
    family: TYPSNITT,
    fonts: [
      { src: f.normal },
      { src: f.fet, fontWeight: "bold" },
      { src: f.kursiv, fontStyle: "italic" },
    ],
  });
  // Sin guiones de corte: en la cocina se lee mejor la palabra entera
  Font.registerHyphenationCallback((ord) => [ord]);
  registrerat = true;
}
