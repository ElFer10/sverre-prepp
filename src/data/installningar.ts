// Validación de la configuración antes de guardarla.
import type { Installningar } from "../scheduler/types";

const TID = /^([01]\d|2[0-3]):[0-5]\d$/;
const minuter = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const heltal = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max;

export function giltigaInstallningar(i: Installningar): boolean {
  return (
    TID.test(i.start) &&
    TID.test(i.oppning) &&
    minuter(i.oppning) > minuter(i.start) &&
    heltal(i.spisplattor, 1, 8) &&
    heltal(i.ugn.bleck, 1, 20) &&
    heltal(i.ugn.forvarmningMin, 0, 60) &&
    heltal(i.ugn.bytesMin, 0, 60) &&
    heltal(i.thermomix.antal, 0, 4) &&
    heltal(i.thermomix.rengoringMin, 0, 30) &&
    heltal(i.pacojet.antal, 0, 4) &&
    heltal(i.pacojet.rengoringMin, 0, 30) &&
    heltal(i.avbrottMin, 0, 10) &&
    heltal(i.iterationer, 1, 5000)
  );
}
