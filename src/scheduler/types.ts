// Modelo de datos del planificador (SPEC §6). TypeScript puro, sin dependencias.

export type Resurs = "ugn" | "spisplatta" | "thermomix" | "pacojet";
export type UgnLage = "varmluft" | "anga" | "kombi";

export interface UgnInstallning {
  lage: UgnLage;
  tempMin: number; // °C
  tempMax: number; // °C (= tempMin si la receta da un solo valor)
  fukt?: number; // %, solo kombi
  bleck: number; // 1..5
}

export interface Fas {
  id: string;
  namn: string; // sueco, se imprime en el PDF
  typ: "aktiv" | "vantan" | "tillsyn";
  minuter: number;
  maxMinuter?: number; // rango: el planificador usa este valor
  resurs?: Resurs;
  ugn?: UgnInstallning; // obligatorio si resurs === "ugn"
  tillsyn?: { varjeMin: number; minuter: number };
  maxVantanFore?: number | null;
  avbrytbar?: boolean; // solo vantan/tillsyn en spisplatta
  notering?: string; // p. ej. "Kontrollera efter 20 min"
}

export interface Forberedelse {
  id: string;
  /** uuid de la grundrecept en la app de recetas. Sin valor = preparación propia del planner. */
  receptId?: string;
  namn: string; // caché; la fuente de verdad es la app de recetas
  kategori?: string; // caché, solo para agrupar en la interfaz
  faser: Fas[];
  beroendeAv: string[]; // dependencias
  fortsattning?: string; // id del steg siguiente (al día siguiente)
  farskhet: "normal" | "senast-mojligt";
  kanAvslutasEfterOppning: boolean;
  kontrolleraFore?: string[]; // requisitos previos
  aktiv: boolean;
}

export interface DagensPost {
  forberedelseId: string;
  prioritet: "maste" | "om-tid";
  ordning?: number;
  status: "planerad" | "gjord" | "ej-gjord";
  overfordFran?: string; // fecha ISO de origen
}

export interface Dagsplan {
  datum: string; // ISO yyyy-mm-dd
  kockar: 1 | 2;
  poster: DagensPost[];
  resultat?: PlanResultat;
  stangd: boolean;
}

export interface Installningar {
  start: string; // "14:00"
  oppning: string; // "16:00"
  spisplattor: number;
  ugn: { bleck: number; forvarmningMin: number; bytesMin: number };
  thermomix: { antal: number; rengoringMin: number };
  pacojet: { antal: number; rengoringMin: number };
  avbrottMin: number; // retirar o devolver una olla
  iterationer: number;
  receptUrlMall: string;
}

export const STANDARD_INSTALLNINGAR: Installningar = {
  start: "14:00",
  oppning: "16:00",
  spisplattor: 2,
  ugn: { bleck: 5, forvarmningMin: 10, bytesMin: 10 },
  thermomix: { antal: 1, rengoringMin: 3 },
  pacojet: { antal: 1, rengoringMin: 3 },
  avbrottMin: 1,
  iterationer: 500,
  receptUrlMall: "https://sverre-recepter.pages.dev/?recept={id}",
};

// ---------------------------------------------------------------------------
// Resultado. Todos los tiempos en minutos desde `start` (t = 0 → 14:00).

/** Recurso cuya falta explica que una obligatoria no quepa. */
export type Flaskhals = "kockar" | "ugn" | "spisplatta" | "thermomix" | "pacojet" | "fonster";

export interface Intervall {
  start: number;
  slut: number;
}

export interface PlaneradFas {
  forberedelseId: string;
  fasId: string;
  typ: Fas["typ"];
  start: number;
  slut: number; // incluye pausas
  /** 1 o 2. Solo fases activas; sin valor si la fase va a "Efter 16:00". */
  kock?: number;
  resurs?: Resurs;
  /** Hornilla / Thermomix / Pacojet concreta (0, 1…). */
  enhet?: number;
  /** Índice en `PlanResultat.ugn`. */
  ugnBlock?: number;
  /** Tramos en que la fase está detenida (salsa retirada de la hornilla o fase activa pausada por tillsyn). */
  pauser: Intervall[];
  /** Empieza a la hora de apertura o después. */
  efterOppning: boolean;
}

export type IngreppTyp =
  | "tillsyn" // intervención periódica de una fase tillsyn
  | "rengoring" // limpieza de Thermomix / Pacojet
  | "ugn-installning" // programar el horno (precalentar o cambiar)
  | "flytta-av" // retirar una salsa de la hornilla
  | "flytta-pa"; // devolverla

/** Trabajo corto de un cocinero que no es una fase. */
export interface Ingrepp {
  typ: IngreppTyp;
  start: number;
  slut: number;
  kock?: number; // sin valor si va a "Efter 16:00"
  forberedelseId: string;
  fasId: string;
  resurs?: Resurs;
  enhet?: number;
  efterOppning: boolean;
}

export interface UgnBlock {
  lage: UgnLage;
  temp: number; // temperatura elegida, dentro del solapamiento
  fukt?: number;
  /** Empieza a calentar / cambiar. */
  start: number;
  /** Listo para meter bandejas. */
  klar: number;
  /** Última bandeja sale. */
  slut: number;
  /** true = precalentar desde frío (primer bloque); false = cambiar configuración. */
  forvarmning: boolean;
}

export interface Avbrott {
  /** La salsa interrumpida. */
  forberedelseId: string;
  fasId: string;
  /** La fase que usa la hornilla. */
  avForberedelseId: string;
  avFasId: string;
  enhet: number;
  /** Pausa de la salsa (incluye retirar y devolver la olla). */
  start: number;
  slut: number;
}

export type Varning =
  | { typ: "sen"; forberedelseId: string; minuterSent: number; flaskhalsar: Flaskhals[] }
  | { typ: "ej-konfigurerad"; forberedelseId: string }
  | { typ: "okand"; forberedelseId: string };

export interface KontrollPunkt {
  forberedelseId: string;
  /** Requisito previo en texto libre. */
  krav?: string;
  /** Dependencia que no está en la lista del día: se asume hecha. */
  beroendeAv?: string;
}

export interface PlanResultat {
  seed: number;
  kockar: number;
  /** Minuto de apertura (T). */
  oppning: number;
  faser: PlaneradFas[];
  ingrepp: Ingrepp[];
  ugn: UgnBlock[];
  avbrott: Avbrott[];
  /** "Om tiden räcker" que no cupieron (se arrastran). */
  ejPlacerade: string[];
  kontrolleraFore: KontrollPunkt[];
  varningar: Varning[];
  /** Puntuación lexicográfica de §5.3 (para depurar). */
  poang: number[];
}
