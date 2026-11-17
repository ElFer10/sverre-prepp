import { useEffect, useMemo, useState } from "react";
import { andraDag, gjordesDet, idagDatum, oppnaDag, tomDag, useLager } from "../data/lager";
import { sv } from "../i18n/sv";
import { ga } from "../komponenter/useRutt";
import { usePlanera } from "../plan/usePlanera";
import { datumText, kortDatum } from "../plan/vy";
import type { DagensPost, Dagsplan, Forberedelse } from "../scheduler/types";

/** Reasigna `ordning` según la posición en la lista. */
const numrera = (poster: DagensPost[]) => poster.map((p, i) => ({ ...p, ordning: i }));

export function Idag() {
  const { katalog, dagar, kanAndra } = useLager();
  const datum = idagDatum();
  const finns = !!dagar[datum];
  const dag: Dagsplan = dagar[datum] ?? tomDag(datum);
  // Chef abre el día: se cierra el anterior si nadie lo hizo y llega lo pendiente
  useEffect(() => {
    if (!finns && kanAndra) oppnaDag(datum);
  }, [finns, kanAndra, datum]);
  const redigerbar = kanAndra && !dag.stangd;
  const porId = useMemo(() => new Map(katalog.map((f) => [f.id, f])), [katalog]);
  const { planera, planerar, fel } = usePlanera();

  const andra = (fn: (d: Dagsplan) => Dagsplan) => andraDag(datum, fn);
  const setPoster = (poster: DagensPost[]) => andra((d) => ({ ...d, poster: numrera(poster) }));

  const laggTill = (f: Forberedelse, prioritet: DagensPost["prioritet"]) =>
    setPoster([...dag.poster, { forberedelseId: f.id, prioritet, status: "planerad" }]);
  const taBort = (id: string) => setPoster(dag.poster.filter((p) => p.forberedelseId !== id));
  const bytPrioritet = (id: string) =>
    setPoster(
      dag.poster.map((p) =>
        p.forberedelseId === id ? { ...p, prioritet: p.prioritet === "maste" ? "om-tid" : "maste" } : p,
      ),
    );
  /** Mueve una "om-tid" un puesto arriba o abajo entre las "om-tid". */
  const flytta = (id: string, steg: -1 | 1) => {
    const omTid = dag.poster.filter((p) => p.prioritet === "om-tid");
    const i = omTid.findIndex((p) => p.forberedelseId === id);
    const j = i + steg;
    if (j < 0 || j >= omTid.length) return;
    [omTid[i], omTid[j]] = [omTid[j], omTid[i]];
    setPoster([...dag.poster.filter((p) => p.prioritet === "maste"), ...omTid]);
  };

  const planerbara = dag.poster.filter((p) => (porId.get(p.forberedelseId)?.faser.length ?? 0) > 0);
  const kor = async () => {
    if (await planera(dag)) ga("#/plan");
  };

  return (
    <div className="sida">
      <h1>{datumText(datum)}</h1>
      {!kanAndra && <p className="liten">{sv.konto.lasLage}</p>}
      {dag.stangd && <p className="banner">{sv.idag.dagenStangd}</p>}
      {!kanAndra && !finns && <p className="tom">{sv.idag.ingenPlanAn}</p>}

      <div className="falt-rad">
        <span className="etikett">{sv.idag.kockar}</span>
        <div className="segment" role="group" aria-label={sv.idag.kockar}>
          {([1, 2] as const).map((n) => (
            <button
              key={n}
              className={dag.kockar === n ? "vald" : ""}
              disabled={!redigerbar}
              onClick={() => andra((d) => ({ ...d, kockar: n }))}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {redigerbar && <Sok katalog={katalog} paListan={new Set(dag.poster.map((p) => p.forberedelseId))} onValj={laggTill} />}

      {dag.poster.length === 0 && finns && <p className="tom">{sv.idag.tomLista}</p>}

      {(["maste", "om-tid"] as const).map((prio) => {
        const poster = dag.poster.filter((p) => p.prioritet === prio);
        if (poster.length === 0) return null;
        return (
          <section key={prio} className="kort">
            <h2>{prio === "maste" ? sv.idag.maste : sv.idag.omTid}</h2>
            <ul className="post-lista">
              {poster.map((p, i) => {
                const f = porId.get(p.forberedelseId);
                const ejKonf = !f || f.faser.length === 0;
                return (
                  <li key={p.forberedelseId} className={ejKonf ? "ej-konf" : ""}>
                    <div className="post-text">
                      <span className="post-namn">{f?.namn ?? p.forberedelseId}</span>
                      {ejKonf && <span className="liten varnings-text">{sv.idag.ejKonfigurerad}</span>}
                      {p.overfordFran && <span className="liten">{sv.idag.overford(kortDatum(p.overfordFran))}</span>}
                      {p.overfordFran && redigerbar && (
                        <label className="bock liten-bock">
                          <input type="checkbox" onChange={() => gjordesDet(datum, p.forberedelseId)} />
                          {sv.idag.gjordesDet}
                        </label>
                      )}
                    </div>
                    {redigerbar && (
                    <div className="post-knappar">
                      {prio === "om-tid" && (
                        <>
                          <button className="ikon" aria-label={sv.allmant.upp} disabled={i === 0} onClick={() => flytta(p.forberedelseId, -1)}>
                            ↑
                          </button>
                          <button
                            className="ikon"
                            aria-label={sv.allmant.ner}
                            disabled={i === poster.length - 1}
                            onClick={() => flytta(p.forberedelseId, 1)}
                          >
                            ↓
                          </button>
                        </>
                      )}
                      <button className="liten-knapp" onClick={() => bytPrioritet(p.forberedelseId)}>
                        {prio === "maste" ? sv.idag.omTid : sv.idag.maste}
                      </button>
                      <button className="ikon" aria-label={sv.allmant.ta_bort} onClick={() => taBort(p.forberedelseId)}>
                        ✕
                      </button>
                    </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {fel !== null && <p className="fel">{fel}</p>}

      {redigerbar && (
        <>
          <div className="knapp-rad">
            <a className="knapp-lank" href="#/stang">
              {sv.idag.stangDagen}
            </a>
          </div>
          <div className="atgard-rad">
            <button className="primar" disabled={planerbara.length === 0 || planerar} onClick={kor}>
              {planerar ? sv.idag.planerar : sv.idag.planera}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Sok(props: {
  katalog: Forberedelse[];
  paListan: Set<string>;
  onValj: (f: Forberedelse, prioritet: DagensPost["prioritet"]) => void;
}) {
  const [q, setQ] = useState("");
  const traffar = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return props.katalog.filter((f) => f.aktiv && f.namn.toLowerCase().includes(s)).slice(0, 8);
  }, [q, props.katalog]);

  return (
    <div className="sok">
      <label className="etikett" htmlFor="idag-sok">
        {sv.idag.laggTill}
      </label>
      <input
        id="idag-sok"
        type="search"
        placeholder={sv.idag.sokPlatshallare}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoComplete="off"
      />
      {traffar.length > 0 && (
        <ul className="traffar">
          {traffar.map((f) => {
            const redan = props.paListan.has(f.id);
            const ejKonf = f.faser.length === 0;
            return (
              <li key={f.id}>
                <div className="post-text">
                  <span className="post-namn">{f.namn}</span>
                  {redan && <span className="liten">{sv.idag.redanPaListan}</span>}
                  {!redan && ejKonf && <span className="liten varnings-text">{sv.katalog.ejKonfigurerad}</span>}
                </div>
                {!redan && (
                  <div className="post-knappar">
                    <button
                      className="liten-knapp"
                      onClick={() => {
                        props.onValj(f, "maste");
                        setQ("");
                      }}
                    >
                      + {sv.idag.maste}
                    </button>
                    <button
                      className="liten-knapp sekundar"
                      onClick={() => {
                        props.onValj(f, "om-tid");
                        setQ("");
                      }}
                    >
                      + {sv.idag.omTid}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
