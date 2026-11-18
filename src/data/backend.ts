// Interfaz de la capa de datos. Dos implementaciones: Supabase (producción) y local (desarrollo/pruebas).

import type { SparadDag } from "../dag/dagar";
import type { Grundrecept } from "../katalog/koppling";
import type { Forberedelse, Installningar } from "../scheduler/types";

export type Roll = "Chef" | "Kock" | "Service";

export interface Anvandare {
  epost: string;
  roll: Roll;
}

export interface Data {
  katalog: Forberedelse[];
  dagar: Record<string, SparadDag>;
  installningar: Installningar;
}

/** Error con un mensaje en sueco listo para mostrar. */
export class VisbartFel extends Error {}

/** No hay conexión con el servidor (la app puede seguir con la copia guardada). */
export class NatverksFel extends VisbartFel {}

/** Mensajes de fetch sin red en Chrome, Safari y Firefox. */
export const arNatverksMeddelande = (m: string) => /failed to fetch|load failed|networkerror|fetch failed|network request failed/i.test(m);

export interface Backend {
  lage: "supabase" | "lokal";
  /** Sesión guardada; null si hay que iniciar sesión. Lanza VisbartFel si la cuenta no tiene rol. */
  aktuellAnvandare(): Promise<Anvandare | null>;
  loggaIn(epost: string, losenord: string): Promise<Anvandare>;
  loggaUt(): Promise<void>;
  /** Catálogo, días recientes y configuración del planner. */
  hamta(): Promise<Data>;
  /** Grundrecept de la app de recetas (solo lectura). */
  hamtaGrundrecept(): Promise<Grundrecept[]>;
  sparaForberedelser(lista: Forberedelse[]): Promise<void>;
  taBortForberedelse(id: string): Promise<void>;
  sparaDagar(lista: SparadDag[]): Promise<void>;
  sparaInstallningar(i: Installningar): Promise<void>;
}
