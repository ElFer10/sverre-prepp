import { useMemo, useState } from "react";
import { idagDatum, stangDag, useLager } from "../data/lager";
import { forslagStatus, stangDag as forhandsvisa, type Status } from "../dag/dagar";
import { sv } from "../i18n/sv";
import { ga } from "../komponenter/useRutt";
import { datumText } from "../plan/vy";

/** Stäng dagen (SPEC §8.4): marcar lo hecho y confirmar el arrastre y los följdsteg. */
export function Stang() {
  const { dagar, katalog, kanAndra } = useLager();
  const datum = idagDatum();
  const dag = dagar[datum];
  const [status, setStatus] = useState<Record<string, Status>>(() => (dag ? forslagStatus(dag) : {}));
  const namn = (id: string) => katalog.find((f) => f.id === id)?.namn ?? id;

  // Vista previa: lo mismo que se guardará al confirmar
  const overfors = useMemo(() => (dag ? (forhandsvisa(dag, katalog, status).overfors ?? []) : []), [dag, katalog, status]);
  const arFoljdsteg = (id: string) => !dag?.poster.some((p) => p.forberedelseId === id);

  if (!dag || !kanAndra || dag.stangd) {
    return (
      <div className="sida">
        <h1>{sv.stang.rubrik}</h1>
        <p className="tom">{dag?.stangd ? sv.idag.dagenStangd : !kanAndra ? sv.fel.bara_chef : sv.stang.tom}</p>
        <a href="#/idag">{sv.allmant.tillbaka}</a>
      </div>
    );
  }

  return (
    <div className="sida">
      <h1>{sv.stang.rubrik}</h1>
      <p className="underrubrik">{datumText(datum)}</p>
      <p className="liten">{sv.stang.forklaring}</p>

      {(["maste", "om-tid"] as const).map((prio) => {
        const poster = dag.poster.filter((p) => p.prioritet === prio);
        if (!poster.length) return null;
        return (
          <section key={prio} className="kort">
            <h2>{prio === "maste" ? sv.idag.maste : sv.idag.omTid}</h2>
            <ul className="post-lista">
              {poster.map((p) => (
                <li key={p.forberedelseId}>
                  <span className="post-text post-namn">{namn(p.forberedelseId)}</span>
                  <div className="segment" role="group" aria-label={namn(p.forberedelseId)}>
                    {(["gjord", "ej-gjord"] as const).map((st) => (
                      <button
                        key={st}
                        className={status[p.forberedelseId] === st ? "vald" : ""}
                        onClick={() => setStatus({ ...status, [p.forberedelseId]: st })}
                      >
                        {st === "gjord" ? sv.stang.gjord : sv.stang.ejGjord}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {dag.poster.length === 0 && <p className="tom">{sv.stang.tom}</p>}

      <section className="kort">
        <h2>{sv.stang.tillNastaDag}</h2>
        {overfors.length === 0 ? (
          <p className="tom">{sv.stang.ingetTillNasta}</p>
        ) : (
          <ul className="bocklista">
            {overfors.map((p) => (
              <li key={p.forberedelseId}>
                {namn(p.forberedelseId)} · {p.prioritet === "maste" ? sv.idag.maste : sv.idag.omTid}
                {arFoljdsteg(p.forberedelseId) && <span className="liten"> ({sv.stang.foljdsteg})</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="atgard-rad">
        <button className="sekundar" onClick={() => ga("#/idag")}>
          {sv.allmant.avbryt}
        </button>
        <button
          className="primar"
          onClick={() => {
            stangDag(datum, status);
            ga("#/idag");
          }}
        >
          {sv.stang.bekrafta}
        </button>
      </div>
    </div>
  );
}
