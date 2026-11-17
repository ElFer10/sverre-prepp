import { useMemo, useState } from "react";
import { idagDatum, planNyckel, useLager } from "../data/lager";
import { sv } from "../i18n/sv";
import { useBred } from "../komponenter/useBred";
import { usePlanera } from "../plan/usePlanera";
import { datumText, efterOppningRader, klockslag, kockRader, kontrollRader, uppslag, varningsText, type Rad } from "../plan/vy";
import { Gantt } from "./Gantt";

export function Plan() {
  const { katalog, dagar, installningar, planNycklar } = useLager();
  const datum = idagDatum();
  const dag = dagar[datum];
  const res = dag?.resultat;
  const bred = useBred();
  const [lage, setLage] = useState<"lista" | "gantt">("lista");
  const [valdKock, setValdKock] = useState(1);
  const { planera, planerar } = usePlanera();
  const [skaparPdf, setSkaparPdf] = useState(false);
  const [pdfFel, setPdfFel] = useState(false);
  const u = useMemo(() => uppslag(katalog), [katalog]);

  if (!dag || !res) {
    return (
      <div className="sida">
        <h1>{sv.plan.rubrik}</h1>
        <p className="tom">
          <a href="#/idag">{sv.plan.ingenPlan}</a>
        </p>
      </div>
    );
  }

  const start = installningar.start;
  const tid = (m: number) => klockslag(m, start);
  const oppning = tid(res.oppning);
  const inaktuell = planNycklar[datum] !== planNyckel(dag, katalog, installningar);
  const visaGantt = bred && lage === "gantt";
  const kockar = Array.from({ length: res.kockar }, (_, i) => i + 1);
  const synligaKockar = bred ? kockar : [Math.min(valdKock, res.kockar)];
  const kontroll = kontrollRader(res, u);
  const efter = efterOppningRader(res, katalog, start);

  const pdf = async () => {
    setSkaparPdf(true);
    setPdfFel(false);
    try {
      // react-pdf solo se descarga cuando hace falta
      const { laddaNerPdf } = await import("../pdf/laddaNerPdf");
      await laddaNerPdf(res, katalog, installningar, dag.datum);
    } catch (e) {
      console.error(e);
      setPdfFel(true);
    } finally {
      setSkaparPdf(false);
    }
  };

  return (
    <div className="sida sida-bred">
      <h1>{datumText(dag.datum)}</h1>
      <p className="underrubrik">{sv.plan.kockarFonster(res.kockar, start, oppning)}</p>

      {inaktuell && (
        <div className="banner">
          <span>{sv.plan.inaktuell}</span>
        </div>
      )}

      <div className="knapp-rad">
        <button className="primar" disabled={planerar} onClick={() => planera(dag)}>
          {planerar ? sv.idag.planerar : sv.plan.planeraOm}
        </button>
        <button className="sekundar" disabled={skaparPdf} onClick={pdf}>
          {skaparPdf ? sv.pdf.skapar : sv.plan.laddaNerPdf}
        </button>
      </div>
      {pdfFel && <p className="fel">{sv.pdf.fel}</p>}

      {res.varningar.length > 0 && (
        <section className="kort varningar">
          <h2>{sv.plan.varningar}</h2>
          <ul>
            {res.varningar.map((v) => (
              <li key={`${v.typ}-${v.forberedelseId}`}>{varningsText(v, u)}</li>
            ))}
          </ul>
        </section>
      )}

      {kontroll.length > 0 && (
        <section className="kort">
          <h2>{sv.plan.kontrolleraFore}</h2>
          <ul className="bocklista">
            {kontroll.map((t) => (
              <li key={t}>
                <label>
                  <input type="checkbox" /> {t}
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}

      {bred && (
        <div className="segment" role="group">
          <button className={lage === "lista" ? "vald" : ""} onClick={() => setLage("lista")}>
            {sv.plan.lista}
          </button>
          <button className={lage === "gantt" ? "vald" : ""} onClick={() => setLage("gantt")}>
            {sv.plan.gantt}
          </button>
        </div>
      )}

      {visaGantt ? (
        <Gantt res={res} katalog={katalog} plattor={installningar.spisplattor} start={start} />
      ) : (
        <>
          {!bred && res.kockar > 1 && (
            <div className="segment segment-full" role="group">
              {kockar.map((k) => (
                <button key={k} className={valdKock === k ? "vald" : ""} onClick={() => setValdKock(k)}>
                  {sv.plan.kock(k)}
                </button>
              ))}
            </div>
          )}
          <div className="kock-kolumner">
            {synligaKockar.map((k) => (
              <section key={k} className="kort">
                <h2>{sv.plan.kock(k)}</h2>
                <Radlista rader={kockRader(res, katalog, k, start)} tid={tid} tom={sv.plan.ingetForKock} />
              </section>
            ))}
          </div>
        </>
      )}

      <section className="kort">
        <h2>{sv.plan.efterOppning(oppning)}</h2>
        <Radlista rader={efter} tid={tid} tom={sv.plan.efterOppningTom} />
      </section>

      <section className="kort">
        <h2>{sv.plan.omTidEjPlacerade}</h2>
        {res.ejPlacerade.length === 0 ? (
          <p className="tom">{sv.plan.allaOmTidPlacerade}</p>
        ) : (
          <>
            <ul className="bocklista">
              {res.ejPlacerade.map((id) => (
                <li key={id}>{u.namn(id)}</li>
              ))}
            </ul>
            <p className="liten">{sv.plan.omTidEjPlaceradeHint}</p>
          </>
        )}
      </section>
    </div>
  );
}

function Radlista(props: { rader: Rad[]; tid: (m: number) => string; tom: string }) {
  if (props.rader.length === 0) return <p className="tom">{props.tom}</p>;
  return (
    <ol className="radlista">
      {props.rader.map((r) => (
        <li key={`${r.slag}-${r.start}-${r.text}-${r.forberedelseId}`} className={r.slag === "fas" ? "" : "ingrepp"}>
          <span className="rad-tid">
            {props.tid(r.start)}
            {r.slut - r.start > 1 && `–${props.tid(r.slut)}`}
          </span>
          <span className="rad-text">
            <span className="rad-vad">{r.text}</span>
            <span className="rad-forb"> — {r.forberedelse}</span>
            {r.detaljer.map((d) => (
              <span key={d} className="rad-detalj">
                {d}
              </span>
            ))}
          </span>
        </li>
      ))}
    </ol>
  );
}
