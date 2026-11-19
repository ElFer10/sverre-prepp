// Todos los textos visibles de la app (sueco). Ver glosario en SPEC.md §12.

import type { Flaskhals, Fas, IngreppTyp, Resurs, UgnLage } from "../scheduler/types";

export const sv = {
  appNamn: "Mise en place",
  /** Línea pequeña sobre el menú y los títulos, como en la app de recetas. */
  overline: "Kökets mise en place",
  sidOverline: "Sverre / Köket",
  logoAlt: "Sverre",

  nav: {
    idag: "Idag",
    plan: "Plan",
    katalog: "Katalog",
    installningar: "Inställningar",
  },

  // --- Inloggning och sparande ------------------------------------------------
  konto: {
    rubrik: "Logga in",
    forklaring: "Samma konto som i receptappen.",
    epost: "E-post",
    losenord: "Lösenord",
    loggaIn: "Logga in",
    loggarIn: "Loggar in…",
    loggaUt: "Logga ut",
    laddar: "Laddar…",
    forsokIgen: "Försök igen",
    inloggadSom: (epost: string, roll: string) => `Inloggad som ${epost} (${roll})`,
    lokaltLage: "Lokalt läge: data sparas bara i den här webbläsaren.",
    lasLage: "Du kan se planen men bara Chef kan ändra.",
  },

  fel: {
    inloggning: "Fel e-post eller lösenord.",
    ingenRoll: "Ditt konto saknar behörighet i köket. Be ansvarig tilldela Chef, Kock eller Service.",
    databas: (detalj: string) => `Databasen kunde inte nås: ${detalj}`,
    plannerSaknas: "Planerarens tabeller finns inte i databasen än. Kör supabase/001_planner.sql (se supabase/README.md).",
    sparfel: (detalj: string) => `Kunde inte spara: ${detalj}`,
    bara_chef: "Endast Chef kan ändra.",
    natverk: "Ingen anslutning till servern.",
  },

  // --- Installerad app ------------------------------------------------------------
  pwa: {
    offline: (tid: string) => `Ingen anslutning. Visar data från ${tid}. Ändringar är avstängda tills anslutningen är tillbaka.`,
    nyVersion: "En ny version av appen finns.",
    uppdatera: "Uppdatera",
  },

  sparar: {
    sparar: "Sparar…",
    sparat: "Sparat",
  },

  // --- Importera till molnet ----------------------------------------------------
  importera: {
    rubrik: "Katalogen i molnet är tom",
    forklaring: "Välj vad som ska laddas upp. Det görs bara en gång och påverkar inte receptappen.",
    franEnhet: (n: number) => `Importera från den här enheten (${n} förberedelser)`,
    utkast: (n: number) => `Importera utkastet (${n} förberedelser)`,
    importerar: "Importerar…",
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
    egen: "Egen",
    egenForklaring: "Egen förberedelse – finns inte i receptappen",
    ny: "Ny förberedelse",
    saknas: "Saknas i receptappen",
    saknasForklaring: "Grundreceptet finns inte längre i receptappen",
    kopplad: "Grundrecept",
    koppla: "Koppla till grundrecept",
    okonfigureradeRubrik: "Grundrecept utan moment",
  },

  redigera: {
    rubrik: "Redigera förberedelse",
    nyRubrik: "Ny förberedelse",
    taBort: "Ta bort förberedelse",
    taBortFraga: (namn: string) =>
      `Ta bort ${namn} från planeraren? Den tas också bort som beroende och följdsteg. Receptet i receptappen påverkas inte.`,
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
    delaUpp: "Dela upp i två dagar",
    delaUppForklaring:
      "För recept som görs över två dagar. Skapar steg 2 kopplat till samma recept. När steg 1 är gjort läggs steg 2 automatiskt till nästa dags lista.",
    dag2BorjarMed: "Dag 2 börjar med",
    dag2Senare: "Inga moment än (lägg till dem i steg 2)",
    steg2Info: "Steg 2: läggs automatiskt till dagen efter att steg 1 är gjort.",
    farskhet: "Så sent som möjligt (färskhet)",
    efterOppning: "Kan avslutas efter öppning",
    kontrolleraFore: "Kontrollera före start (en per rad)",
    aktiv: "Aktiv i katalogen",
    visaRecept: "Visa recept",
    grundrecept: "Grundrecept i receptappen",
    ingetGrundrecept: "Inget (egen förberedelse)",
    receptetsSteg: "Receptets steg",
    namnFranRecept: "Namnet kommer från receptappen.",
    fel: "Rätta följande innan du sparar:",
  },

  valideringsfel: {
    namnSaknas: "Namn saknas",
    namnFinns: (namn: string) => `Det finns redan en förberedelse som heter ${namn}`,
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
    gjordesDet: "Gjordes det?",
    stangDagen: "Stäng dagen",
    dagenStangd: "Dagen är stängd.",
    ingenPlanAn: "Ingen plan för idag än.",
  },

  // --- Stäng dagen ----------------------------------------------------------
  stang: {
    rubrik: "Stäng dagen",
    forklaring: "Markera vad som blev gjort. Det som inte blev gjort flyttas till nästa dag, och följdsteg läggs till.",
    gjord: "Gjord",
    ejGjord: "Inte gjord",
    tillNastaDag: "Till nästa dag",
    ingetTillNasta: "Inget flyttas till nästa dag.",
    foljdsteg: "följdsteg",
    bekrafta: "Stäng dagen",
    tom: "Inget på dagens lista.",
  },

  // --- Koppla -------------------------------------------------------------------
  koppla: {
    rubrik: "Koppla till grundrecept",
    forklaring: "Välj vilket grundrecept i receptappen varje förberedelse motsvarar. Exakta namn är förvalda; kontrollera de övriga.",
    exakt: "Exakt namn",
    forslag: "Förslag",
    ingen: "Ingen – egen förberedelse",
    ovriga: "Övriga grundrecept",
    spara: (n: number) => (n === 1 ? "Spara 1 koppling" : `Spara ${n} kopplingar`),
    allaKopplade: "Alla förberedelser är kopplade eller egna.",
    ingaGrundrecept: "Receptappen har inga grundrecept.",
  },

  // --- Inställningar --------------------------------------------------------------
  installningar: {
    rubrik: "Inställningar",
    konto: "Konto",
    tider: "Tider",
    start: "Start",
    oppning: "Öppning",
    resurser: "Resurser",
    spisplattor: "Spisplattor",
    ugnBleck: "Ugn: bleck",
    forvarmning: "Ugn: förvärmning (min)",
    byte: "Ugn: byta inställning (min)",
    thermomixRengoring: "Thermomix: rengöring (min)",
    pacojetRengoring: "Pacojet: rengöring (min)",
    avbrott: "Flytta en kastrull av/på plattan (min)",
    iterationer: "Planerarens försök",
    ogiltig: "Kontrollera värdena: tider som 14:00, öppning efter start och positiva tal.",
  },

  // --- Plan ----------------------------------------------------------------
  plan: {
    rubrik: "Plan",
    ingenPlan: "Ingen plan än. Gå till Idag och tryck på Planera.",
    inaktuell: "Listan har ändrats sedan planen gjordes.",
    planeraOm: "Planera om",
    uppdatera: "Uppdatera",
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
