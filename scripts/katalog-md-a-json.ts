// Convierte KATALOG-UTKAST.md en src/scheduler/__fixtures__/katalog.json.
// Uso: npm run katalog   (Node ≥ 23 ejecuta TypeScript directamente)
//
// Formato de cada línea (ver la sección "Notación" del catálogo):
//   - `typ min[–max]` Moment — recurso · banderas

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Fas, Forberedelse, UgnLage } from "../src/scheduler/types.ts";

const ENTRADA = new URL("../KATALOG-UTKAST.md", import.meta.url);
const SALIDA = new URL("../src/scheduler/__fixtures__/katalog.json", import.meta.url);

// Notas en español dentro de los nombres: no se imprimen en el PDF.
const NOTAS_ES = ["(luego congelar)", "(depende de la cantidad)", "(¿o kombi? la receta añade agua para tener vapor)"];

// Dependencias cuyo nombre no coincide exactamente con una preparación.
// [Revisar con Fer] "Brynt smör" puede ser el de 3 l o el de löjrom.
const ALIAS_BEROENDE: Record<string, string> = {
  "Friterad potatis": "Friterad potatis (kokt)",
  "Brynt smör": "Brynt smör (3 l)",
};

export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/é/g, "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseRango(s: string): { min: number; max?: number } {
  const [a, b] = s.split("–").map(Number);
  return b === undefined || b === a ? { min: a } : { min: a, max: b };
}

interface Borrador {
  namn: string;
  kategori: string;
  faser: Fas[];
  beroendeNamn: string[];
  foljdsteg?: string;
  efterOppning: boolean;
  senast: boolean;
}

function parsearCabecera(linea: string, kategori: string): Borrador {
  // "### Vinägersky · `efter-öppning`" / "### Potatis chips — **SIN PASOS…**"
  let texto = linea.replace(/^###\s+/, "").replace(/\s+—\s+\*\*.*$/, "");
  const banderas = [...texto.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  texto = texto.replace(/\s*·\s*`[^`]+`/g, "").trim();
  const b: Borrador = { namn: texto, kategori, faser: [], beroendeNamn: [], efterOppning: false, senast: false };
  for (const f of banderas) {
    if (f === "efter-öppning") b.efterOppning = true;
    else if (f === "senast-möjligt") b.senast = true;
    else if (f.startsWith("följdsteg:")) b.foljdsteg = f.slice("följdsteg:".length).trim();
    else if (f.startsWith("beroende:")) b.beroendeNamn = f.slice("beroende:".length).split(",").map((x) => x.trim());
    else throw new Error(`Bandera desconocida "${f}" en: ${linea}`);
  }
  return b;
}

function parsearFas(linea: string, prepId: string, nr: number): Fas | null {
  // Fases fuera del plan: "- `väntan` Svalna över natten (fuera del plan)", "- (… fuera del plan)"
  if (/fuera del plan/.test(linea)) return null;
  const m = linea.match(/^- `([^`]+)`\s+(.*)$/);
  if (!m) throw new Error(`Línea no reconocida: ${linea}`);
  const [, codigo, resto0] = m;

  const fas: Fas = { id: `${prepId}-${nr}`, namn: "", typ: "aktiv", minuter: 0 };
  const mc = codigo.match(/^(aktiv|väntan|tillsyn)(?:\s+(\d+)\/(\d+))?\s+(\d+(?:–\d+)?)$/);
  if (!mc) throw new Error(`Código de fase no reconocido: ${codigo}`);
  const [, typ, tMin, tVarje, dur] = mc;
  fas.typ = typ === "väntan" ? "vantan" : (typ as Fas["typ"]);
  const r = parseRango(dur);
  fas.minuter = r.min;
  if (r.max !== undefined) fas.maxMinuter = r.max;
  if (tMin) fas.tillsyn = { minuter: Number(tMin), varjeMin: Number(tVarje) };

  let resto = resto0;
  if (resto.includes("⇢0")) {
    fas.maxVantanFore = 0;
    resto = resto.replace(/\s*⇢0/, "");
  }
  const banderas = [...resto.matchAll(/·\s*`([^`]+)`/g)].map((x) => x[1]);
  resto = resto.replace(/\s*·\s*`[^`]+`/g, "");
  for (const f of banderas) {
    if (f === "avbrytbar") fas.avbrytbar = true;
    else throw new Error(`Bandera de fase desconocida "${f}"`);
  }
  for (const n of NOTAS_ES) resto = resto.replace(` ${n}`, "");

  const [namnRaw, recurso] = resto.split(/\s+—\s+/);
  let namn = namnRaw.trim();
  const nota = namn.match(/^(.*?)\s*\(([^)]+)\)$/);
  if (nota && !/\d/.test(nota[2])) {
    // Nota sueca entre paréntesis → notering ("Rör om vid behov")
    namn = nota[1];
    fas.notering = nota[2].charAt(0).toUpperCase() + nota[2].slice(1);
  }
  fas.namn = namn;

  if (recurso) {
    const rec = recurso.trim();
    if (rec === "Spisplatta") fas.resurs = "spisplatta";
    else if (rec === "Thermomix") fas.resurs = "thermomix";
    else if (rec === "Pacojet") fas.resurs = "pacojet";
    else {
      const mu = rec.match(/^Ugn (varmluft|ånga|kombi) (\d+(?:–\d+)?) °C(?:, (\d+) % fukt)?, (\d+) bleck$/);
      if (!mu) throw new Error(`Recurso no reconocido: ${rec}`);
      const t = parseRango(mu[2]);
      fas.resurs = "ugn";
      fas.ugn = {
        lage: (mu[1] === "ånga" ? "anga" : mu[1]) as UgnLage,
        tempMin: t.min,
        tempMax: t.max ?? t.min,
        bleck: Number(mu[4]),
      };
      if (mu[3]) fas.ugn.fukt = Number(mu[3]);
    }
  }
  return fas;
}

export function parsearKatalog(md: string): Forberedelse[] {
  const borradores: Borrador[] = [];
  let kategori = "";
  let actual: Borrador | null = null;
  for (const linea of md.split("\n")) {
    if (linea.startsWith("## ")) {
      kategori = linea.slice(3).trim();
      actual = null;
    } else if (linea.startsWith("### ")) {
      actual = parsearCabecera(linea, kategori);
      borradores.push(actual);
    } else if (actual && linea.startsWith("- ")) {
      const fas = parsearFas(linea, slug(actual.namn), actual.faser.length + 1);
      if (fas) actual.faser.push(fas);
    }
  }

  const porNombre = new Map(borradores.map((b) => [b.namn, b]));
  const idDe = (namn: string): string => {
    const real = porNombre.has(namn) ? namn : ALIAS_BEROENDE[namn];
    if (!real || !porNombre.has(real)) throw new Error(`Dependencia desconocida: ${namn}`);
    return slug(real);
  };

  return borradores.map((b) => {
    const f: Forberedelse = {
      id: slug(b.namn),
      receptId: "", // [PENDIENTE] se empareja con la grundrecept en la fase 4
      namn: b.namn,
      kategori: b.kategori,
      faser: b.faser,
      beroendeAv: b.beroendeNamn.map(idDe),
      farskhet: b.senast ? "senast-mojligt" : "normal",
      kanAvslutasEfterOppning: b.efterOppning,
      aktiv: true,
    };
    if (b.foljdsteg) {
      // "steg 2" → mismo nombre base con "— steg 2"
      const base = b.namn.replace(/\s+—\s+steg \d+$/, "");
      f.fortsattning = idDe(`${base} — ${b.foljdsteg}`);
    }
    return f;
  });
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const katalog = parsearKatalog(readFileSync(ENTRADA, "utf-8"));
  writeFileSync(SALIDA, JSON.stringify(katalog, null, 2) + "\n");
  const sinFases = katalog.filter((f) => f.faser.length === 0).map((f) => f.namn);
  console.log(`${katalog.length} förberedelser → ${fileURLToPath(SALIDA)}`);
  if (sinFases.length) console.log(`Sin fases (Ej konfigurerad): ${sinFases.join(", ")}`);
}
