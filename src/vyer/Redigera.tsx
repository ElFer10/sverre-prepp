import { useState } from "react";
import { laggTillForberedelse, sparaForberedelse, taBortForberedelse, useLager } from "../data/lager";
import { medId, nyttForberedelseId } from "../katalog/katalog";
import { sv } from "../i18n/sv";
import { nyttFasId, stadaFas, valideraForberedelse } from "../katalog/validera";
import type { Fas, Forberedelse, Resurs, UgnLage } from "../scheduler/types";

const tillbaka = () => {
  window.location.hash = "#/katalog";
};

/** Número de un input; vacío → NaN (lo detecta la validación). */
const tal = (v: string) => (v.trim() === "" ? NaN : Number(v));
const visa = (n: number | undefined) => (n === undefined || Number.isNaN(n) ? "" : String(n));

/** Borrador vacío para una preparación propia nueva (id definitivo al guardar). */
const NY_ID = "ny";
const tomForberedelse = (): Forberedelse => ({
  id: NY_ID,
  namn: "",
  faser: [{ id: `${NY_ID}-1`, namn: "", typ: "aktiv", minuter: 5 }],
  beroendeAv: [],
  farskhet: "normal",
  kanAvslutasEfterOppning: false,
  aktiv: true,
});

/** `id === null` → crear una preparación propia nueva. */
export function Redigera(props: { id: string | null }) {
  const { katalog, installningar } = useLager();
  const ny = props.id === null;
  const original = ny ? undefined : katalog.find((f) => f.id === props.id);
  const [utkast, setUtkast] = useState<Forberedelse | undefined>(() =>
    ny ? tomForberedelse() : original ? structuredClone(original) : undefined,
  );
  const [fel, setFel] = useState<string[]>([]);

  if (!utkast) {
    return (
      <div className="sida">
        <p className="tom">
          <a href="#/katalog">{sv.allmant.tillbaka}</a>
        </p>
      </div>
    );
  }

  const f = utkast;
  const satt = (andring: Partial<Forberedelse>) => setUtkast({ ...f, ...andring });
  const sattFas = (i: number, andring: Partial<Fas>) =>
    satt({ faser: f.faser.map((x, j) => (j === i ? { ...x, ...andring } : x)) });
  const flyttaFas = (i: number, steg: -1 | 1) => {
    const j = i + steg;
    if (j < 0 || j >= f.faser.length) return;
    const faser = [...f.faser];
    [faser[i], faser[j]] = [faser[j], faser[i]];
    satt({ faser });
  };
  const laggTillFas = () =>
    satt({ faser: [...f.faser, { id: nyttFasId(f), namn: "", typ: "aktiv", minuter: 5 }] });

  const spara = () => {
    let stadad: Forberedelse = {
      ...f,
      namn: f.namn.trim(),
      kategori: f.kategori?.trim() || undefined,
      faser: f.faser.map(stadaFas),
      kontrolleraFore: (f.kontrolleraFore ?? []).map((s) => s.trim()).filter(Boolean),
    };
    if (!stadad.kontrolleraFore?.length) delete stadad.kontrolleraFore;
    if (!stadad.kategori) delete stadad.kategori;
    if (!stadad.fortsattning) delete stadad.fortsattning;
    if (ny) stadad = medId(stadad, nyttForberedelseId(stadad.namn, katalog));
    const e = valideraForberedelse(stadad, katalog);
    setFel(e);
    if (e.length) {
      window.scrollTo(0, 0);
      return;
    }
    if (ny) laggTillForberedelse(stadad);
    else sparaForberedelse(stadad);
    tillbaka();
  };

  const taBort = () => {
    if (!window.confirm(sv.redigera.taBortFraga(f.namn))) return;
    taBortForberedelse(f.id);
    tillbaka();
  };

  const andra = katalog.filter((k) => k.id !== f.id).sort((a, b) => a.namn.localeCompare(b.namn, "sv"));
  const receptUrl = installningar.receptUrlMall && f.receptId ? installningar.receptUrlMall.replace("{id}", f.receptId) : "";

  return (
    <div className="sida">
      <div className="rubrik-rad">
        <button className="ikon" aria-label={sv.allmant.tillbaka} onClick={tillbaka}>
          ‹
        </button>
        <h1>{ny ? sv.redigera.nyRubrik : sv.redigera.rubrik}</h1>
      </div>

      {fel.length > 0 && (
        <div className="kort varningar" role="alert">
          <h2>{sv.redigera.fel}</h2>
          <ul>
            {fel.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="kort formular">
        <label>
          <span className="etikett">{sv.redigera.namn}</span>
          <input value={f.namn} onChange={(e) => satt({ namn: e.target.value })} />
        </label>
        <label>
          <span className="etikett">{sv.redigera.kategori}</span>
          <input value={f.kategori ?? ""} onChange={(e) => satt({ kategori: e.target.value })} />
        </label>
        {receptUrl ? (
          <a className="lank-knapp" href={receptUrl} target="_blank" rel="noreferrer">
            {sv.redigera.visaRecept}
          </a>
        ) : (
          <p className="liten">{sv.katalog.egenForklaring}</p>
        )}
      </section>

      <h2 className="sektion-rubrik">{sv.redigera.moment}</h2>
      {f.faser.map((x, i) => (
        <FasKort
          key={x.id}
          fas={x}
          nr={i + 1}
          forsta={i === 0}
          sista={i === f.faser.length - 1}
          onAndra={(a) => sattFas(i, a)}
          onFlytta={(s) => flyttaFas(i, s)}
          onTaBort={() => satt({ faser: f.faser.filter((_, j) => j !== i) })}
        />
      ))}
      <button className="sekundar bred-knapp" onClick={laggTillFas}>
        + {sv.redigera.laggTillMoment}
      </button>

      <section className="kort formular">
        <div>
          <span className="etikett">{sv.redigera.beroendeAv}</span>
          <ul className="chips">
            {f.beroendeAv.map((d) => (
              <li key={d}>
                {katalog.find((k) => k.id === d)?.namn ?? d}
                <button
                  className="ikon"
                  aria-label={sv.allmant.ta_bort}
                  onClick={() => satt({ beroendeAv: f.beroendeAv.filter((x) => x !== d) })}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <select
            value=""
            aria-label={sv.redigera.laggTillBeroende}
            onChange={(e) => e.target.value && satt({ beroendeAv: [...f.beroendeAv, e.target.value] })}
          >
            <option value="">{sv.redigera.laggTillBeroende}</option>
            {andra
              .filter((k) => !f.beroendeAv.includes(k.id))
              .map((k) => (
                <option key={k.id} value={k.id}>
                  {k.namn}
                </option>
              ))}
          </select>
        </div>

        <label>
          <span className="etikett">{sv.redigera.foljdsteg}</span>
          <select value={f.fortsattning ?? ""} onChange={(e) => satt({ fortsattning: e.target.value || undefined })}>
            <option value="">{sv.allmant.ingen}</option>
            {andra.map((k) => (
              <option key={k.id} value={k.id}>
                {k.namn}
              </option>
            ))}
          </select>
        </label>

        <label className="bock">
          <input
            type="checkbox"
            checked={f.kanAvslutasEfterOppning}
            onChange={(e) => satt({ kanAvslutasEfterOppning: e.target.checked })}
          />
          {sv.redigera.efterOppning}
        </label>
        <label className="bock">
          <input
            type="checkbox"
            checked={f.farskhet === "senast-mojligt"}
            onChange={(e) => satt({ farskhet: e.target.checked ? "senast-mojligt" : "normal" })}
          />
          {sv.redigera.farskhet}
        </label>
        <label className="bock">
          <input type="checkbox" checked={f.aktiv} onChange={(e) => satt({ aktiv: e.target.checked })} />
          {sv.redigera.aktiv}
        </label>

        <label>
          <span className="etikett">{sv.redigera.kontrolleraFore}</span>
          <textarea
            rows={3}
            value={(f.kontrolleraFore ?? []).join("\n")}
            onChange={(e) =>
              satt({
                kontrolleraFore: e.target.value
                  .split("\n")
                  .map((s) => s.trimStart())
                  .filter((s, i, a) => s !== "" || i === a.length - 1),
              })
            }
          />
        </label>
      </section>

      {!ny && !f.receptId && (
        <div className="knapp-rad">
          <button className="fara" onClick={taBort}>
            {sv.redigera.taBort}
          </button>
        </div>
      )}

      <div className="atgard-rad">
        <button className="sekundar" onClick={tillbaka}>
          {sv.allmant.avbryt}
        </button>
        <button className="primar" onClick={spara}>
          {sv.allmant.spara}
        </button>
      </div>
    </div>
  );
}

function FasKort(props: {
  fas: Fas;
  nr: number;
  forsta: boolean;
  sista: boolean;
  onAndra: (a: Partial<Fas>) => void;
  onFlytta: (steg: -1 | 1) => void;
  onTaBort: () => void;
}) {
  const { fas: x, onAndra } = props;
  const ugn = x.ugn ?? { lage: "varmluft" as UgnLage, tempMin: 180, tempMax: 180, bleck: 1 };
  const sattUgn = (a: Partial<typeof ugn>) => onAndra({ ugn: { ...ugn, ...a } });
  const tillsyn = x.tillsyn ?? { varjeMin: 5, minuter: 1 };

  return (
    <section className="kort fas-kort">
      <div className="fas-huvud">
        <strong>
          {sv.redigera.moment} {props.nr}
        </strong>
        <div className="post-knappar">
          <button className="ikon" aria-label={sv.allmant.upp} disabled={props.forsta} onClick={() => props.onFlytta(-1)}>
            ↑
          </button>
          <button className="ikon" aria-label={sv.allmant.ner} disabled={props.sista} onClick={() => props.onFlytta(1)}>
            ↓
          </button>
          <button className="ikon" aria-label={sv.allmant.ta_bort} onClick={props.onTaBort}>
            ✕
          </button>
        </div>
      </div>

      <label>
        <span className="etikett">{sv.redigera.momentNamn}</span>
        <input value={x.namn} onChange={(e) => onAndra({ namn: e.target.value })} />
      </label>

      <div className="segment segment-full" role="group" aria-label={sv.redigera.typ}>
        {(["aktiv", "vantan", "tillsyn"] as const).map((t) => (
          <button
            key={t}
            className={x.typ === t ? "vald" : ""}
            onClick={() => onAndra({ typ: t, tillsyn: t === "tillsyn" ? tillsyn : undefined })}
          >
            {sv.typ[t]}
          </button>
        ))}
      </div>

      <div className="falt-grid">
        <label>
          <span className="etikett">{sv.redigera.minuter}</span>
          <input type="number" inputMode="numeric" min={1} value={visa(x.minuter)} onChange={(e) => onAndra({ minuter: tal(e.target.value) })} />
        </label>
        <label>
          <span className="etikett">{sv.redigera.maxMinuter}</span>
          <input
            type="number"
            inputMode="numeric"
            value={visa(x.maxMinuter)}
            onChange={(e) => onAndra({ maxMinuter: e.target.value.trim() === "" ? undefined : tal(e.target.value) })}
          />
        </label>
      </div>

      {x.typ === "tillsyn" && (
        <div className="falt-grid">
          <label>
            <span className="etikett">{sv.redigera.tillsynVarje}</span>
            <input
              type="number"
              inputMode="numeric"
              value={visa(tillsyn.varjeMin)}
              onChange={(e) => onAndra({ tillsyn: { ...tillsyn, varjeMin: tal(e.target.value) } })}
            />
          </label>
          <label>
            <span className="etikett">{sv.redigera.tillsynMinuter}</span>
            <input
              type="number"
              inputMode="numeric"
              value={visa(tillsyn.minuter)}
              onChange={(e) => onAndra({ tillsyn: { ...tillsyn, minuter: tal(e.target.value) } })}
            />
          </label>
        </div>
      )}

      <label>
        <span className="etikett">{sv.redigera.resurs}</span>
        <select
          value={x.resurs ?? ""}
          onChange={(e) => {
            const r = (e.target.value || undefined) as Resurs | undefined;
            onAndra({ resurs: r, ugn: r === "ugn" ? ugn : undefined });
          }}
        >
          <option value="">{sv.allmant.ingen}</option>
          {(["ugn", "spisplatta", "thermomix", "pacojet"] as const).map((r) => (
            <option key={r} value={r}>
              {sv.resurs[r]}
            </option>
          ))}
        </select>
      </label>

      {x.resurs === "ugn" && (
        <div className="falt-grid">
          <label>
            <span className="etikett">{sv.redigera.lage}</span>
            <select value={ugn.lage} onChange={(e) => sattUgn({ lage: e.target.value as UgnLage })}>
              {(["varmluft", "anga", "kombi"] as const).map((l) => (
                <option key={l} value={l}>
                  {sv.lage[l]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="etikett">{sv.redigera.bleck}</span>
            <input type="number" inputMode="numeric" min={1} max={5} value={visa(ugn.bleck)} onChange={(e) => sattUgn({ bleck: tal(e.target.value) })} />
          </label>
          <label>
            <span className="etikett">{sv.redigera.tempMin}</span>
            <input type="number" inputMode="numeric" value={visa(ugn.tempMin)} onChange={(e) => sattUgn({ tempMin: tal(e.target.value) })} />
          </label>
          <label>
            <span className="etikett">{sv.redigera.tempMax}</span>
            <input type="number" inputMode="numeric" value={visa(ugn.tempMax)} onChange={(e) => sattUgn({ tempMax: tal(e.target.value) })} />
          </label>
          {ugn.lage === "kombi" && (
            <label>
              <span className="etikett">{sv.redigera.fukt}</span>
              <input
                type="number"
                inputMode="numeric"
                value={visa(ugn.fukt)}
                onChange={(e) => sattUgn({ fukt: e.target.value.trim() === "" ? undefined : tal(e.target.value) })}
              />
            </label>
          )}
        </div>
      )}

      {!props.forsta && (
        <label className="bock">
          <input
            type="checkbox"
            checked={x.maxVantanFore === 0}
            onChange={(e) => onAndra({ maxVantanFore: e.target.checked ? 0 : null })}
          />
          {sv.redigera.direktEfter}
        </label>
      )}
      {x.resurs === "spisplatta" && x.typ !== "aktiv" && (
        <label className="bock">
          <input type="checkbox" checked={!!x.avbrytbar} onChange={(e) => onAndra({ avbrytbar: e.target.checked })} />
          {sv.redigera.avbrytbar}
        </label>
      )}

      <label>
        <span className="etikett">{sv.redigera.notering}</span>
        <input value={x.notering ?? ""} onChange={(e) => onAndra({ notering: e.target.value })} />
      </label>
    </section>
  );
}
