// Plan del día en PDF (SPEC §9): A4 vertical, en blanco y negro, legible a distancia.
// Solo presentación: los datos salen de src/plan/vy.ts, igual que en la pantalla Plan.

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { sv } from "../i18n/sv";
import {
  datumText,
  efterOppningRader,
  klockslag,
  kockRader,
  kontrollRader,
  resursRader,
  ugnHandelser,
  uppslag,
  varningsText,
  type Rad,
} from "../plan/vy";
import type { Forberedelse, Installningar, PlanResultat } from "../scheduler/types";
import { TYPSNITT } from "./typsnitt";

const s = StyleSheet.create({
  sida: {
    fontFamily: TYPSNITT,
    fontSize: 11,
    paddingTop: 42,
    paddingBottom: 40,
    paddingHorizontal: 36,
    color: "#000",
  },
  huvud: {
    position: "absolute",
    top: 16,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 9,
    color: "#444",
    borderBottomWidth: 0.5,
    borderBottomColor: "#999",
    paddingBottom: 3,
  },
  titel: { fontSize: 20, fontWeight: "bold", marginBottom: 2 },
  undertitel: { fontSize: 12, marginBottom: 12 },
  sektion: { marginBottom: 14 },
  rubrik: {
    fontSize: 15,
    fontWeight: "bold",
    borderBottomWidth: 1.5,
    borderBottomColor: "#000",
    paddingBottom: 2,
    marginBottom: 4,
  },
  underrubrik: { fontSize: 12, fontWeight: "bold", marginTop: 6, marginBottom: 2 },
  rad: {
    flexDirection: "row",
    paddingVertical: 3.5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#bbb",
  },
  tid: { width: 78, fontSize: 12, fontWeight: "bold" },
  ruta: { width: 11, height: 11, borderWidth: 1.2, borderColor: "#000", marginTop: 2, marginRight: 7 },
  utanRuta: { width: 18 },
  textKol: { flex: 1 },
  vad: { fontSize: 12 },
  forb: { fontWeight: "bold" },
  ingrepp: { fontSize: 11, color: "#222" },
  detalj: { fontSize: 10, color: "#333", marginTop: 1 },
  tom: { fontSize: 10, color: "#555", fontStyle: "italic" },
  varning: { fontSize: 11, marginBottom: 2 },
  varningsruta: { borderWidth: 1.5, borderColor: "#000", padding: 6, marginBottom: 14 },
});

function Ruta() {
  return <View style={s.ruta} />;
}

function Sektion(props: { titel: string; children: ReactNode; brytFore?: boolean }) {
  return (
    <View style={s.sektion} break={props.brytFore}>
      <Text style={s.rubrik} minPresenceAhead={40}>
        {props.titel}
      </Text>
      {props.children}
    </View>
  );
}

/** Fila con hora, casilla y "Qué — Preparación" (+ detalles). */
function RadVy(props: { rad: Rad; tid: (m: number) => string; ruta?: boolean }) {
  const { rad: r, tid } = props;
  const ingrepp = r.slag !== "fas";
  return (
    <View style={s.rad} wrap={false}>
      <Text style={s.tid}>
        {tid(r.start)}
        {r.slut - r.start > 1 ? `–${tid(r.slut)}` : ""}
      </Text>
      {props.ruta === false ? <View style={s.utanRuta} /> : <Ruta />}
      <View style={s.textKol}>
        <Text style={ingrepp ? s.ingrepp : s.vad}>
          {r.text} — <Text style={s.forb}>{r.forberedelse}</Text>
        </Text>
        {r.detaljer.map((d) => (
          <Text key={d} style={s.detalj}>
            {d}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Lista(props: { rader: Rad[]; tid: (m: number) => string; ruta?: boolean; tom?: string }) {
  if (props.rader.length === 0) return props.tom ? <Text style={s.tom}>{props.tom}</Text> : null;
  return (
    <>
      {props.rader.map((r) => (
        <RadVy key={`${r.slag}-${r.start}-${r.text}-${r.forberedelseId}`} rad={r} tid={props.tid} ruta={props.ruta} />
      ))}
    </>
  );
}

function Bockpunkt(props: { text: string }) {
  return (
    <View style={s.rad} wrap={false}>
      <Ruta />
      <Text style={[s.vad, s.textKol]}>{props.text}</Text>
    </View>
  );
}

export function PlanPdf(props: { res: PlanResultat; katalog: Forberedelse[]; inst: Installningar; datum: string }) {
  const { res, katalog, inst, datum } = props;
  const start = inst.start;
  const tid = (m: number) => klockslag(m, start);
  const u = uppslag(katalog);
  const oppning = tid(res.oppning);
  const kontroll = kontrollRader(res, u);
  const kockar = Array.from({ length: res.kockar }, (_, i) => i + 1);
  const anvands = (r: "thermomix" | "pacojet") => res.faser.some((f) => f.resurs === r);

  return (
    <Document title={sv.pdf.titel(datum)} language="sv">
      <Page size="A4" style={s.sida}>
        <View style={s.huvud} fixed>
          <Text>
            {datumText(datum)} · {sv.plan.kockarFonster(res.kockar, start, oppning)}
          </Text>
          <Text render={({ pageNumber, totalPages }) => sv.pdf.sida(pageNumber, totalPages)} />
        </View>

        <Text style={s.titel}>{datumText(datum)}</Text>
        <Text style={s.undertitel}>{sv.plan.kockarFonster(res.kockar, start, oppning)}</Text>

        {res.varningar.length > 0 && (
          <View style={s.varningsruta} wrap={false}>
            <Text style={s.underrubrik}>{sv.plan.varningar}</Text>
            {res.varningar.map((v) => (
              <Text key={`${v.typ}-${v.forberedelseId}`} style={s.varning}>
                • {varningsText(v, u)}
              </Text>
            ))}
          </View>
        )}

        {kontroll.length > 0 && (
          <Sektion titel={sv.plan.kontrolleraFore}>
            {kontroll.map((t) => (
              <Bockpunkt key={t} text={t} />
            ))}
          </Sektion>
        )}

        {/* Cada cocinero empieza en su propia página para poder repartirlas */}
        {kockar.map((k, i) => (
          <Sektion key={k} titel={sv.plan.kock(k)} brytFore={i > 0}>
            <Lista rader={kockRader(res, katalog, k, start)} tid={tid} tom={sv.plan.ingetForKock} />
          </Sektion>
        ))}

        <Sektion titel={sv.pdf.ugn} brytFore>
          {res.ugn.length === 0 ? (
            <Text style={s.tom}>{sv.pdf.anvandsInte}</Text>
          ) : (
            ugnHandelser(res, katalog, start).map((h, i) => (
              <View key={i} style={s.rad} wrap={false}>
                <Text style={s.tid}>{tid(h.tid)}</Text>
                <Text style={[s.vad, s.textKol]}>{h.text}</Text>
              </View>
            ))
          )}
        </Sektion>

        <Sektion titel={sv.pdf.spisplattor}>
          {Array.from({ length: inst.spisplattor }, (_, p) => (
            <View key={p}>
              <Text style={s.underrubrik}>{sv.pdf.platta(p + 1)}</Text>
              <Lista rader={resursRader(res, katalog, "spisplatta", p, start)} tid={tid} ruta={false} tom={sv.pdf.anvandsInte} />
            </View>
          ))}
        </Sektion>

        {(["thermomix", "pacojet"] as const).map((m) => (
          <Sektion key={m} titel={sv.pdf[m]}>
            {anvands(m) ? (
              Array.from({ length: inst[m].antal }, (_, e) => (
                <Lista key={e} rader={resursRader(res, katalog, m, e, start)} tid={tid} ruta={false} />
              ))
            ) : (
              <Text style={s.tom}>{sv.pdf.anvandsInte}</Text>
            )}
          </Sektion>
        ))}

        <Sektion titel={sv.plan.efterOppning(oppning)}>
          <Lista rader={efterOppningRader(res, katalog, start)} tid={tid} tom={sv.plan.efterOppningTom} />
        </Sektion>

        <Sektion titel={sv.plan.omTidEjPlacerade}>
          {res.ejPlacerade.length === 0 ? (
            <Text style={s.tom}>{sv.plan.allaOmTidPlacerade}</Text>
          ) : (
            res.ejPlacerade.map((id) => <Bockpunkt key={id} text={u.namn(id)} />)
          )}
        </Sektion>
      </Page>
    </Document>
  );
}
