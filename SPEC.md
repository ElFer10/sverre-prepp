# Planificador de mise en place — Especificación

> Documento de planificación para construir la app con Claude Code.
> Estado: borrador v2 (2026-11-17). Las secciones marcadas **[PENDIENTE]** requieren una decisión de Fer.
> Catálogo inicial de preparaciones (borrador con tiempos estimados): ver `KATALOG-UTKAST.md`.

## 1. Objetivo

Cada día, elegir de un catálogo de preparaciones previas habituales (grundrecept) las que hay que hacer, y obtener un **plan de trabajo ordenado y repartido entre 1–2 cocineros**. El plan respeta:

- tiempo activo (ocupa a un cocinero) y tiempo de espera (no lo ocupa),
- los recursos limitados de la cocina (1 horno combinado, 2 hornillas, 1 Thermomix, 1 Pacojet),
- la ventana de trabajo (14:00–16:00, apertura a las 16:00).

El resultado principal es un **PDF imprimible**. El plan también tiene que poder consultarse desde el teléfono.

**Idioma:** la interfaz y el PDF están **en sueco** (ver el glosario en §12). Este documento está en español.

**Fuera de alcance:** la app **no guarda recetas**. Las recetas viven en la app de recetas (Supabase + Cloudflare Pages, https://sverre-recepter.pages.dev/). El planner solo guarda datos de *tiempo y recursos* y enlaza con la receta.

## 2. Contexto operativo

| Parámetro | Valor |
|---|---|
| Ventana de preparación | 14:00 – 16:00 (120 min), configurable |
| Cocineros | 1 o 2 (se elige cada día). Empiezan a la misma hora y pueden hacer cualquier tarea |
| Horno | 1 combinado (varmluft / ånga / kombi), 5 bandejas |
| Precalentar / cambiar configuración del horno | ~10 min cada uno (estimado; configurable) |
| Hornillas | 2 |
| Thermomix | 1 |
| Pacojet | 1 |
| Frío | 2 refrigeradores, 1 congelador (sin restricción de capacidad en el planificador; solo informativo) |
| Usuarios | 1 (Fer) |
| Cantidades | Normalmente iguales cada día: 1 batch (no hace falta escalar en el MVP) |

## 3. Conceptos clave

### 3.1 Preparación (plantilla del catálogo)

Una preparación es una **secuencia ordenada de fases**. El planificador necesita saber qué recurso se ocupa en cada momento, así que no basta con guardar "activo X min + espera Y min".

Ejemplo (Rotsellerikräm):

| # | Fase | Tipo | Duración | Recurso |
|---|---|---|---|---|
| 1 | Skala och tärna | activa | 20 min | — |
| 2 | Rosta | espera | 30 min | Horno, varmluft 180 °C, 2 bandejas |
| 3 | Mixa | activa | 10 min | Thermomix |
| 4 | Smaka av | activa | 3 min | — |

### 3.2 Tipos de fase

- **activa** (`aktiv`): ocupa a un cocinero durante toda la fase (y el recurso, si tiene).
- **espera** (`väntan`): no ocupa cocinero; puede ocupar un recurso (horno, hornilla…).
- **espera con atención** (`tillsyn`): como la espera, pero exige intervenciones cortas y periódicas de un cocinero (remover el brynt smör, espumar la vinägersky). El planificador reserva esos huecos a cualquier cocinero libre.
  - `tillsyn 1/5 20` = intervención de 1 min en los minutos 5, 10 y 15 de la fase.
  - Una intervención puede **pausar una fase activa sin recurso** (pelar, cortar) del mismo cocinero; esa fase se alarga lo que dure la intervención. Las fases activas con recurso (Thermomix, hornilla…) no se pausan.

### 3.3 Duraciones con rango

Muchas recetas dicen "20–30 min" o "10–12 min". Cada fase tiene `duracionMin` y un `duracionMaxMin` opcional. **El planificador usa el máximo** para ir sobre seguro, y el PDF muestra el rango ("kontrollera efter 20 min").

### 3.4 Encadenamiento entre fases

Cada fase tiene `maxEsperaAntes` (minutos):
- `0` → debe empezar justo al terminar la anterior (p. ej. echar el agua hirviendo sobre el brócoli).
- `null` → sin límite (puede esperar).
- Valor por defecto: `null`.

### 3.5 Horno combinado

Una fase de horno declara:
- `modo`: varmluft | ånga | kombi
- **rango de temperatura** `tempMin`–`tempMax` en °C. Si la receta da un solo valor, min = max. Por ejemplo, Hasselnötter "160–170 °C" → 160–170.
- `humedad` (% solo en kombi)
- `bandejas` (1–5)

Reglas:
- El horno tiene en cada momento **una sola configuración** (modo + temperatura + humedad).
- Dos fases pueden coincidir en el horno si tienen el **mismo modo**, la misma humedad y **rangos de temperatura que se solapan**, y si la **suma de bandejas ≤ 5**. La temperatura elegida cae dentro del solapamiento.
- No hace falta que entren o salgan a la vez.
- **Precalentar** (horno frío → temperatura) y **cambiar de configuración** cuestan ~10 min (configurable). Ese tiempo no ocupa a un cocinero, salvo 1 min activo para programar el horno.
- El PDF muestra la línea de tiempo del horno: cuándo cambiar de configuración y qué entra y sale.

### 3.6 Hornillas

2 hornillas idénticas. Una fase que usa hornilla la ocupa durante toda la fase, **salvo las fases interrumpibles** (§3.10).

### 3.7 Thermomix y Pacojet

Una unidad de cada uno. Muchas preparaciones usan la Thermomix (mayonesas, cremas, aceites), así que suele ser el **cuello de botella**.
- Entre dos usos seguidos hay un **tiempo de limpieza** (`rengöringMin`, por defecto 3 min, activo, configurable por equipo).
- [Fase 2] Algunas secuencias no necesitan limpieza completa (p. ej. dos mayonesas seguidas). Por ahora la limpieza es siempre fija.

### 3.8 Dependencias entre preparaciones

`dependeDe: prepId[]`: B no empieza hasta que A termine.
- Ejemplo: Smöradsky depende de Vinägersky.
- Si A no está en la lista del día, se asume que ya existe (está en la nevera), pero el PDF lo muestra en "Kontrollera före start".

### 3.9 Requisitos previos

Texto libre por preparación (p. ej. "Pacoburkar frysta sedan igår"). El planificador no los programa: **se imprimen en el PDF como lista de verificación** al principio del día.

### 3.10 Salsas largas: interrumpibles y después de la apertura

Las reducciones (Smörsås, Vinägersky) suelen terminar después de las 16:00. Si hace falta su hornilla, Fer retira la olla un momento, usa la hornilla y vuelve a poner la salsa. Para modelarlo:

- **Fase interrumpible** (`avbrytbar: true`, solo en fases de espera o tillsyn sobre hornilla): otra fase puede tomar esa hornilla.
  - Mientras tanto, la salsa queda **en pausa** y su duración se alarga lo que dure la pausa.
  - Cada interrupción cuesta **1 min activo** para retirar la olla y 1 min para devolverla. Los hace el cocinero de la fase que interrumpe (si esa fase es de espera, cualquier cocinero libre).
  - El planificador prefiere usar la hornilla libre antes que interrumpir.
- **Puede terminar después de la apertura** (`kanAvslutasEfterOppning: true`, a nivel de preparación): la preparación tiene que **empezar** antes de las 16:00, pero sus fases restantes pueden continuar durante el servicio.
  - Las fases que caen después de las 16:00 se imprimen en una sección **"Efter 16:00"** (p. ej. "Sila, tillsätt grädde och smör…").
  - Las fases activas posteriores a las 16:00 no se asignan a C1 ni a C2: se listan como pendientes.
- Las preparaciones así marcadas deben empezar **lo antes posible**, porque son las más largas: se colocan las primeras y sus fases hasta la reducción van encadenadas, sin espera. Si otra fase necesita su hornilla, se interrumpe la salsa en lugar de retrasarla (decisión de Fer, 2026-11-17).
- Una preparación que depende de otra del día con `kanAvslutasEfterOppning` (p. ej. Smöradsky → Vinägersky) **hereda** esa condición: va a "Efter 16:00" sin aviso de retraso.

### 3.11 Preparaciones de varios días (följdsteg)

Algunas recetas se hacen en dos días: Vispat brynt smör (bryna → enfriar toda la noche → mixar) y Hängt gräddfil (colar toda la noche → llenar mangas). Se modelan como **dos preparaciones enlazadas**: `steg 1` y `steg 2`, con `fortsattning: prepId`.
- Al cerrar el día con el steg 1 hecho, el steg 2 se añade **automáticamente** a la lista del día siguiente, con la misma prioridad que tenía el steg 1.
- Lo mismo sirve para sorbetes y helados (llenar los vasos y congelar hoy; pasarlos por la Pacojet otro día), si Fer quiere que el pacotizado aparezca en el plan. [PENDIENTE]

### 3.12 Frescura

`frescura: "normal" | "senast-mojligt"`. Las segundas se programan lo más cerca posible de las 16:00 sin poner en riesgo nada obligatorio. Äggskum y Broccoli (confirmado 2026-11-17).

### 3.13 [Fase 2] Bases compartidas

Fänkål, rotselleri, gröna tomater y spetskål usan todas una **1-2-3-lag**. Una mejora futura: cuando varias preparaciones del día usan la misma base, sugerir hacer una sola tanda. No entra en el MVP.

## 4. Plan del día

### 4.1 Lista del día

Cada preparación seleccionada tiene una **prioridad**:
- **Måste göras** (obligatoria): tiene que estar lista antes de las 16:00, o empezada si `kanAvslutasEfterOppning`.
- **Om tiden räcker** (si da tiempo): se avanza para otros días. Solo ocupa huecos libres y **nunca retrasa una obligatoria**.

Opcional: orden de preferencia entre las "si da tiempo" (arrastrar para ordenar).

### 4.2 Arrastre automático y cierre del día

- Las "si da tiempo" que no se hicieron **pasan a la lista del día siguiente**.
- Al crear el plan de un día nuevo, la app muestra lo que quedó pendiente del día anterior con un check de "Gjordes det?".
- Por defecto, si nadie cierra el día: las "si da tiempo" que no estaban programadas o no se marcaron se arrastran, y las obligatorias se dan por hechas (y generan su följdsteg, si tienen).
- Lo arrastrado conserva su prioridad. Fer puede cambiarla.

### 4.3 Resultado

- Horario por cocinero (Kock 1, Kock 2), con hora de inicio y fin de cada fase activa y de cada intervención de tillsyn.
- Línea de tiempo del horno (configuraciones, qué entra y qué sale), las hornillas (con interrupciones), la Thermomix y la Pacojet.
- Sección "Efter 16:00".
- Lista de "si da tiempo" que **no** cupieron (se arrastran).
- **Avisos**: obligatorias que no caben y por qué (cuello de botella: horno, hornillas, Thermomix, cocineros, ventana).

## 5. Algoritmo de planificación

Es un problema de *Resource-Constrained Project Scheduling (RCPSP)*. Con 10–25 preparaciones al día basta una heurística constructiva con reinicios aleatorios.

### 5.1 Modelo

- Tiempo discreto en minutos, `t = 0` a las 14:00 y `T = 120` a las 16:00 (configurable). Las fases de preparaciones con `kanAvslutasEfterOppning` pueden pasar de `T`.
- Recursos: cocineros (1 o 2, intercambiables), horno (estado de configuración + bandejas), hornillas (2), Thermomix (1, con limpieza), Pacojet (1, con limpieza).

### 5.2 Construcción (serial schedule generation)

1. Ordenar las preparaciones: obligatorias primero. Dentro de cada grupo:
   1. `kanAvslutasEfterOppning` (salsas largas) primero,
   2. mayor **cadena total** (suma de duraciones máximas, incluidas las dependencias),
   3. mayor uso del recurso más escaso del día (horno, hornilla o Thermomix),
   4. desempate aleatorio en cada iteración.
2. Para cada preparación, en orden, colocar sus fases en el **primer instante factible** que respete recursos, `maxEsperaAntes`, dependencias, compatibilidad del horno (con precalentamiento o cambio si hace falta) y limpieza de la Thermomix.
3. Si una fase de horno puede **compartir** una configuración ya programada, preferir eso a un cambio.
4. Si una fase necesita hornilla y no hay ninguna libre, se puede **interrumpir** una fase `avbrytbar` (§3.10).
5. Las "si da tiempo" se colocan solo si la preparación **entera** cabe (respetando su propio `kanAvslutasEfterOppning`). Si no cabe, no se coloca.
6. Al final, pasada de **desplazamiento a la derecha** para las preparaciones `senast-mojligt`.

### 5.3 Mejora

Repetir la construcción N veces (p. ej. 500, con semilla configurable para que sea reproducible) con órdenes perturbados y quedarse con el mejor plan según esta puntuación lexicográfica:

1. Número de obligatorias que cumplen (máx.)
2. Retraso total de las obligatorias (mín.)
2b. Suma de las horas de inicio de las salsas `kanAvslutasEfterOppning` (mín.): al fuego cuanto antes, aunque haya que interrumpirlas.
3. Número (o peso por orden de preferencia) de "si da tiempo" colocadas (máx.)
4. Número de interrupciones de salsas (mín.)
5. Penalización de frescura (mín.)
6. Hora de fin de la última obligatoria (mín.)
7. Cambios de contexto por cocinero: preferir que un mismo cocinero siga con su preparación (mín.)

### 5.4 Requisitos de implementación

- Módulo **puro en TypeScript** (`src/scheduler/`), sin React ni Supabase. Entrada: catálogo + plan del día + configuración. Salida: plan + avisos.
- Determinista para una misma semilla.
- **Tests con Vitest** desde el principio (ver §10).
- Debe correr en el navegador del teléfono en < 1 s.

## 6. Modelo de datos (TypeScript)

Los identificadores del código van en inglés o español neutro; los textos visibles, en sueco.

```ts
type Resurs = "ugn" | "spisplatta" | "thermomix" | "pacojet";
type UgnLage = "varmluft" | "anga" | "kombi";

interface UgnInstallning {
  lage: UgnLage;
  tempMin: number;          // °C
  tempMax: number;          // °C (= tempMin si la receta da un solo valor)
  fukt?: number;            // %, solo kombi
  bleck: number;            // 1..5
}

interface Fas {
  id: string;
  namn: string;                                  // sueco, se imprime en el PDF
  typ: "aktiv" | "vantan" | "tillsyn";
  minuter: number;
  maxMinuter?: number;                           // rango: el planificador usa este valor
  resurs?: Resurs;
  ugn?: UgnInstallning;                          // obligatorio si resurs === "ugn"
  tillsyn?: { varjeMin: number; minuter: number };
  maxVantanFore?: number | null;
  avbrytbar?: boolean;                           // solo vantan/tillsyn en spisplatta
  notering?: string;                             // p. ej. "Kontrollera efter 20 min"
}

interface Forberedelse {
  id: string;
  receptId: string;            // id de la grundrecept en la app de recetas
  namn: string;                // caché; la fuente de verdad es la app de recetas
  faser: Fas[];
  beroendeAv: string[];        // dependencias
  fortsattning?: string;       // id del steg siguiente (al día siguiente)
  farskhet: "normal" | "senast-mojligt";
  kanAvslutasEfterOppning: boolean;
  kontrolleraFore?: string[];  // requisitos previos
  aktiv: boolean;
}

interface DagensPost {
  forberedelseId: string;
  prioritet: "maste" | "om-tid";
  ordning?: number;
  status: "planerad" | "gjord" | "ej-gjord";
  overfordFran?: string;       // fecha ISO de origen
}

interface Dagsplan {
  datum: string;               // ISO yyyy-mm-dd
  kockar: 1 | 2;
  poster: DagensPost[];
  resultat?: PlanResultat;     // guardado para verlo y reimprimirlo
  stangd: boolean;
}

interface Installningar {
  start: string;               // "14:00"
  oppning: string;             // "16:00"
  spisplattor: number;         // 2
  ugn: { bleck: number; forvarmningMin: number; bytesMin: number };  // 5, 10, 10
  thermomix: { antal: number; rengoringMin: number };                // 1, 3
  pacojet: { antal: number; rengoringMin: number };                  // 1, 3
  avbrottMin: number;          // 1: retirar o devolver una olla
  iterationer: number;         // 500
  receptUrlMall: string;       // [PENDIENTE confirmar ruta] p. ej. "https://sverre-recepter.pages.dev/#/recept/{id}"
}
```

## 7. Integración con la app de recetas

- Mismo proyecto de Supabase. Las tablas del planner van aparte (prefijo `planner_`).
- El planner **solo lee** las grundrecept (id, nombre, categoría). **Nunca escribe** en las tablas de la app de recetas. Las maträtter no se usan.
- El catálogo del planner = grundrecept + los datos de tiempo y recursos del planner, unidos por `receptId`.
- Si una grundrecept todavía no tiene fases, se marca "Ej konfigurerad" y no se puede planificar hasta completarla.
- El editor de fases muestra los pasos de la receta (solo lectura, si están accesibles en Supabase) junto al formulario, para que crear las fases sea rápido.
- Cada preparación tiene un botón "Visa recept" que abre la app de recetas (`receptUrlMall`).
- Import inicial: `KATALOG-UTKAST.md` → fixture JSON y semilla. El nombre se empareja con la grundrecept por nombre; los casos ambiguos se le preguntan a Fer.
- **Esquema confirmado** (código de la app de recetas, `sverrecepter/supabase/`, 2026-11-17):
  - Grundrecept = tabla `public.recipes` con `type = 'prep'` (`'dish'` = maträtter). Columnas útiles: `id uuid`, `name_sv`, `category`, `status` (`draft | active | archived`), `steps_sv` (pasos, texto con saltos de línea), `minutes`.
  - Lectura: RLS `member_read` permite `select` a cualquier usuario autenticado con perfil (`public.my_role() is not null`). Las escrituras directas están revocadas; la app de recetas guarda todo con la RPC `kitchen_save`.
  - Auth: Supabase Auth con correo y contraseña (`signInWithPassword`). Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
  - **Las tablas `planner_*` no deben tener claves foráneas a `recipes`**: `kitchen_save` borra y vuelve a insertar recetas, y una FK haría fallar el guardado de la app de recetas. `receptId` se guarda como `uuid` sin FK; si la receta desaparece, la preparación se marca como huérfana.
  - Los ids de los datos locales de la app de recetas (`p1`, `sverre-ing-001`…) no son los de la nube: el emparejamiento por nombre se hace contra Supabase.
- [PENDIENTE] Ruta de una receta individual: la app de recetas **no tiene enlace directo** a una receta (la receta abierta es estado interno; solo existen rutas de página como `/settings`). Opciones: enlazar a la lista (`https://sverre-recepter.pages.dev/`) o añadir a la app de recetas un parámetro `?recept=<id>`.
- Auth: Supabase Auth, la misma cuenta que en la app de recetas. RLS en las tablas `planner_*` limitado al usuario.

## 8. Pantallas (textos en sueco)

1. **Katalog**: grundrecept agrupadas por categoría, con estado (Konfigurerad / Ej konfigurerad). Editor: fases (añadir, reordenar, tipo, duración, rango, recurso, horno), dependencias, följdsteg, frescura, "kan avslutas efter öppning", "kontrollera före".
2. **Idag**: fecha y número de cocineros, pendientes arrastradas (con "Gjordes det?"), buscador para añadir del catálogo, marcar Måste göras / Om tiden räcker. Botón **Planera**.
3. **Plan**: Gantt (filas: Kock 1, Kock 2, Ugn, Spisplatta 1, Spisplatta 2, Thermomix, Pacojet), avisos, "Efter 16:00", "si da tiempo" no colocadas. Botones **Ladda ner PDF** y **Planera om**.
4. **Stäng dagen**: marcar lo hecho y lo no hecho; confirmar el arrastre y los följdsteg.
5. **Inställningar**: horario, recursos, horno, limpieza.

Diseño *mobile-first*. En el teléfono, el plan se ve como lista por cocinero; el Gantt es para pantallas anchas. Color de tema coherente con la app de recetas (`#455e49`).

## 9. PDF (en sueco)

- A4 vertical, legible a distancia y en blanco y negro.
- Cabecera: fecha, número de cocineros y ventana horaria.
- **Kontrollera före start**: requisitos previos y dependencias que se asumen hechas.
- **Kock 1 / Kock 2**: lista cronológica `14:05–14:20 □ Skala och tärna — Rotsellerikräm`, con las esperas indicadas ("→ i ugnen till 14:55") y las intervenciones de tillsyn ("14:30 □ Rör om — Brynt smör").
- **Ugn**: secuencia de configuraciones (`14:00 Förvärm varmluft 180 °C`, `14:10 In: Rotsellerikräm (2 bleck)`…).
- **Spisplattor / Thermomix / Pacojet**: ocupación e interrupciones.
- **Efter 16:00**: fases que siguen durante el servicio.
- **Om tiden räcker**: lista con casillas.
- Generado en el cliente (`@react-pdf/renderer`), para que funcione igual en el ordenador y en el teléfono.

## 10. Casos de prueba del planificador (mínimos)

Usar el catálogo de `KATALOG-UTKAST.md` como fixture.

1. Dos fases de horno a 180 °C con 2 + 2 bandejas → coinciden.
2. Rotsellerikräm (2) + Rostade jordärtskockor (2) + Gulbetor (1) + J-K majonnäs (1) a 180 °C = 6 bandejas → no caben todas a la vez.
3. Hasselnötter (160–170) + Havresmulor (170) → comparten a 170 °C. Bakade äpple (175) no comparte con Hasselnötter.
4. Svartrot (ånga 100 °C) y una fase de varmluft → secuenciales, con cambio de 10 min.
5. Tres preparaciones de hornilla a la vez → nunca más de 2.
6. Con 1 cocinero, dos fases activas nunca se solapan. Con 2 cocineros, sí.
7. Mientras algo se asa, el cocinero hace otra fase activa.
8. Tres mayonesas en Thermomix → secuenciales, con limpieza entre ellas.
9. `maxVantanFore = 0` se respeta (Broccoli: echar el agua al hervir).
10. Smöradsky + Vinägersky el mismo día → Smöradsky después de Vinägersky.
11. Vinägersky (`kanAvslutasEfterOppning`, `avbrytbar`) empieza antes de las 16:00. Sus fases restantes salen en "Efter 16:00".
12. Hornillas llenas con una salsa interrumpible → otra fase interrumpe la salsa, la salsa se alarga y se cuentan los 2 min de mover la olla.
13. Una "si da tiempo" nunca retrasa una obligatoria.
14. Obligatorias que no caben en 120 min → aviso que nombra el cuello de botella.
15. `senast-mojligt` termina lo más cerca posible de las 16:00.
16. Las intervenciones de tillsyn quedan reservadas a un cocinero.
17. Al cerrar el día, Vispat brynt smör steg 1 → steg 2 aparece al día siguiente.
18. La misma semilla da el mismo plan.

## 11. Stack

- Vite + React + TypeScript
- Supabase (mismo proyecto que la app de recetas): datos + auth
- Cloudflare Pages (despliegue), PWA instalable en el teléfono
- `@react-pdf/renderer` para el PDF
- Vitest para los tests
- Todos los textos visibles en un único fichero `sv.ts`

## 12. Glosario de la interfaz (sueco)

| Concepto | Texto en la app |
|---|---|
| Preparación | Förberedelse |
| Fase | Moment |
| Activa / Espera / Espera con atención | Aktiv / Väntan / Tillsyn |
| Obligatoria / Si da tiempo | Måste göras / Om tiden räcker |
| Cocinero 1 / 2 | Kock 1 / Kock 2 |
| Horno / Hornilla | Ugn / Spisplatta |
| Precalentar / Cambiar configuración | Förvärm / Byt inställning |
| Modo varmluft / vapor / combinado | Varmluft / Ånga / Kombi |
| Bandeja | Bleck |
| Requisitos previos | Kontrollera före start |
| Después de la apertura | Efter 16:00 |
| Cerrar el día | Stäng dagen |
| ¿Se hizo? | Gjordes det? |
| Planificar / Volver a planificar | Planera / Planera om |
| Descargar PDF | Ladda ner PDF |
| Ver receta | Visa recept |
| Interrumpible | Kan flyttas av plattan |
| Paso siguiente (otro día) | Följdsteg |

## 13. Fases de desarrollo

1. **Planificador puro + tests** (§5, §10) con el fixture de `KATALOG-UTKAST.md`. Sin interfaz.
2. **Interfaz con datos locales**: Katalog, Idag, Plan (Gantt y lista).
3. **PDF.**
4. **Supabase**: auth, tablas `planner_*`, lectura de grundrecept, arrastre, följdsteg y cierre del día.
5. **PWA + despliegue** en Cloudflare Pages.

## 14. Decisiones

Resueltas:
- [x] Idioma: sueco (interfaz y PDF).
- [x] Salsas: pueden seguir después de las 16:00 y ser retiradas un momento de la hornilla (§3.10).
- [x] Precalentar / cambiar configuración: ~10 min (medir más adelante).
- [x] `senast-mojligt`: Äggskum y Broccoli.
- [x] Tillsyn puede pausar una fase activa sin recurso (§3.2).
- [x] Dependencias de una preparación `kanAvslutasEfterOppning` heredan la condición (§3.10).
- [x] Salsas largas al fuego cuanto antes: pesa más que evitar interrupciones (§3.10, §5.3).
- [x] Mover la olla al interrumpir: lo hace el cocinero de la fase que interrumpe (§3.10).

Pendientes:
- [x] Tabla y columnas de grundrecept: `recipes` con `type = 'prep'` (§7).
- [ ] Ruta URL de una receta: no existe enlace directo (§7).
- [ ] Emparejar el catálogo con las grundrecept: 22 de 46 coinciden por nombre exacto (§7).
- [ ] Revisar los tiempos estimados de `KATALOG-UTKAST.md`.
- [ ] ¿El pacotizado de sorbetes y helados aparece en el plan como följdsteg?
- [ ] Fases de Potatis chips, Gröna oliver y Kokta potatis i brynt smör (no tienen pasos en la receta).
