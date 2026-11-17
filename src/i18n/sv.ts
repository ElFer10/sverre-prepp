// Todos los textos visibles de la app (sueco). Ver glosario en SPEC.md §12.

import type { Flaskhals, Fas, IngreppTyp, Resurs, UgnLage } from "../scheduler/types";

export const sv = {
  appNamn: "Mise en place",

  nav: {
    idag: "Idag",
    plan: "Plan",
    katalog: "Katalog",
  },

  allmant: {
    spara: "Spara",
    avbryt: "Avbryt",
    ta_bort: "Ta bort",
    upp: "Flytta upp",
    ner: "Flytta ner",
    sok: "Sök",
    min: "min",
    ingen: "Ingen",
    tillbaka: "Tillbaka",
  },

  // --- Katalog -------------------------------------------------------------
  katalog: {
    rubrik: "Katalog",
    sokPlatshallare: "Sök förberedelse…",
    konfigurerad: "Konfigurerad",
    ejKonfigurerad: "Ej konfigurerad",
    inaktiv: "Inaktiv",
    utanKategori: "Övrigt",
    antalMoment: (n: number) => (n === 1 ? "1 moment" : `${n} moment`),
    ingaTraffar: "Inga förberedelser matchar sökningen.",
    aterstall: "Återställ katalogen",
    aterstallFraga: "Återställ katalogen till utkastet? Dina ändringar försvinner.",
  },

  redigera: {
    rubrik: "Redigera förberedelse",
    namn: "Namn",
    kategori: "Kategori",
    moment: "Moment",
    laggTillMoment: "Lägg till moment",
    nyttMoment: "Nytt moment",
    momentNamn: "Vad görs?",
    typ: "Typ",
    minuter: "Minuter",
    maxMinuter: "Max (valfritt)",
    resurs: "Resurs",
    lage: "Läge",
    tempMin: "Temp från (°C)",
    tempMax: "Temp till (°C)",
    fukt: "Fukt (%)",
    bleck: "Bleck",
    tillsynVarje: "Var … min",
    tillsynMinuter: "… min åt gången",
    direktEfter: "Måste starta direkt efter föregående moment",
    avbrytbar: "Kan flyttas av plattan",
    notering: "Notering",
    beroendeAv: "Beroende av",
    laggTillBeroende: "Lägg till beroende…",
    foljdsteg: "Följdsteg (nästa dag)",
    farskhet: "Så sent som möjligt (färskhet)",
    efterOppning: "Kan avslutas efter öppning",
    kontrolleraFore: "Kontrollera före start (en per rad)",
    aktiv: "Aktiv i katalogen",
    visaRecept: "Visa recept",
    fel: "Rätta följande innan du sparar:",
  },

  valideringsfel: {
    namnSaknas: "Namn saknas",
    ingaMoment: "Lägg till minst ett moment",
    momentNamn: (n: number) => `Moment ${n}: beskrivning saknas`,
    minuter: (n: number) => `Moment ${n}: minuter måste vara minst 1`,
    maxMinuter: (n: number) => `Moment ${n}: max måste vara större än minuter`,
    ugnSaknas: (n: number) => `Moment ${n}: ugnsinställning saknas`,
    temp: (n: number) => `Moment ${n}: temperaturen "från" får inte vara högre än "till"`,
    bleck: (n: number, max: number) => `Moment ${n}: bleck måste vara 1–${max}`,
    tillsyn: (n: number) => `Moment ${n}: tillsyn behöver "var … min" större än "… min åt gången"`,
    avbrytbar: (n: number) => `Moment ${n}: bara väntan eller tillsyn på spisplatta kan flyttas av plattan`,
    beroendeSig: "Kan inte vara beroende av sig själv",
    beroendeOkant: (id: string) => `Okänt beroende: ${id}`,
    beroendeCykel: (namn: string) => `Cirkulärt beroende via ${namn}`,
    foljdsteg: "Följdsteget kan inte vara samma förberedelse",
  },

  // --- Idag ----------------------------------------------------------------
  idag: {
    rubrik: "Idag",
    kockar: "Kockar",
    laggTill: "Lägg till från katalogen",
    sokPlatshallare: "Sök och lägg till…",
    tomLista: "Inget på listan än. Sök i katalogen ovan för att lägga till.",
    maste: "Måste göras",
    omTid: "Om tiden räcker",
    planera: "Planera",
    planerar: "Planerar…",
    ejKonfigurerad: "Ej konfigurerad – kan inte planeras",
    redanPaListan: "Redan på listan",
    overford: (datum: string) => `Överförd från ${datum}`,
  },

  // --- Plan ----------------------------------------------------------------
  plan: {
    rubrik: "Plan",
    ingenPlan: "Ingen plan än. Gå till Idag och tryck på Planera.",
    inaktuell: "Listan har ändrats sedan planen gjordes.",
    planeraOm: "Planera om",
    laddaNerPdf: "Ladda ner PDF",
    kockarFonster: (kockar: number, start: string, slut: string) =>
      `${kockar === 1 ? "1 kock" : `${kockar} kockar`} · ${start}–${slut}`,
    varningar: "Varningar",
    kontrolleraFore: "Kontrollera före start",
    redanGjord: (namn: string) => `${namn} finns redan (inte på dagens lista)`,
    kock: (n: number) => `Kock ${n}`,
    efterOppning: (oppning: string) => `Efter ${oppning}`,
    efterOppningTom: "Inget fortsätter efter öppning.",
    omTidEjPlacerade: "Om tiden räcker – fick inte plats",
    omTidEjPlaceradeHint: "Flyttas till nästa dag.",
    allaOmTidPlacerade: "Allt fick plats.",
    ingetForKock: "Inget att göra.",
    ejTilldelad: "Ej tilldelad kock",
    lista: "Lista",
    gantt: "Tidslinje",
  },

  varning: {
    sen: (namn: string, min: number, flaskhalsar: string) => `${namn} blir ${min} min sen (flaskhals: ${flaskhalsar})`,
    ejKonfigurerad: (namn: string) => `${namn} är inte konfigurerad och planerades inte`,
    okand: (id: string) => `Okänd förberedelse: ${id}`,
  },

  flaskhals: {
    kockar: "kockar",
    ugn: "ugn",
    spisplatta: "spisplattor",
    thermomix: "Thermomix",
    pacojet: "Pacojet",
    fonster: "tidsfönstret",
  } satisfies Record<Flaskhals, string>,

  typ: {
    aktiv: "Aktiv",
    vantan: "Väntan",
    tillsyn: "Tillsyn",
  } satisfies Record<Fas["typ"], string>,

  resurs: {
    ugn: "Ugn",
    spisplatta: "Spisplatta",
    thermomix: "Thermomix",
    pacojet: "Pacojet",
  } satisfies Record<Resurs, string>,

  lage: {
    varmluft: "Varmluft",
    anga: "Ånga",
    kombi: "Kombi",
  } satisfies Record<UgnLage, string>,

  ingrepp: {
    tillsyn: "Tillsyn",
    rengoring: "Rengör",
    "ugn-installning": "Ugn",
    "flytta-av": "Flytta av plattan",
    "flytta-pa": "Sätt tillbaka på plattan",
  } satisfies Record<IngreppTyp, string>,

  rad: {
    forvarm: (lage: string, temp: number) => `Förvärm ${lage.toLowerCase()} ${temp} °C`,
    byt: (lage: string, temp: number) => `Byt inställning: ${lage.toLowerCase()} ${temp} °C`,
    rengor: (maskin: string) => `Rengör ${maskin}`,
    flyttaAv: (platta: number) => `Flytta av från platta ${platta}`,
    flyttaPa: (platta: number) => `Sätt tillbaka på platta ${platta}`,
    sedan: (resurs: Resurs, tid: string) =>
      `→ ${({ ugn: "i ugnen", spisplatta: "på plattan", thermomix: "i Thermomix", pacojet: "i Pacojet" } as const)[resurs]} till ${tid}`,
    sedanVanta: (tid: string) => `→ vänta till ${tid}`,
    kontrolleraEfter: (min: number) => `Kontrollera efter ${min} min`,
    pausad: "pausas för tillsyn",
    avbruten: (n: number) => (n === 1 ? "flyttas av plattan 1 gång" : `flyttas av plattan ${n} gånger`),
  },

  pdf: {
    titel: (datum: string) => `Mise en place ${datum}`,
    filnamn: (datum: string) => `mise-en-place-${datum}.pdf`,
    skapar: "Skapar PDF…",
    fel: "Kunde inte skapa PDF:en.",
    sida: (n: number, av: number) => `Sida ${n} av ${av}`,
    ugn: "Ugn",
    spisplattor: "Spisplattor",
    platta: (n: number) => `Platta ${n}`,
    thermomix: "Thermomix",
    pacojet: "Pacojet",
    anvandsInte: "Används inte.",
    klar: (tid: string) => `klar ${tid}`,
    in: (namn: string, bleck: number) => `In: ${namn} (${bleck} bleck)`,
    ut: (namn: string) => `Ut: ${namn}`,
    avbrott: (namn: string) => `Av plattan för ${namn}`,
  },

  gantt: {
    rad: {
      ugn: "Ugn",
      platta: (n: number) => `Spisplatta ${n}`,
      thermomix: "Thermomix",
      pacojet: "Pacojet",
    },
    oppning: "Öppning",
  },
} as const;
