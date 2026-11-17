import { useState } from "react";
import { loggaUt, sparaInstallningar, uppdatera, useLager } from "../data/lager";
import { giltigaInstallningar } from "../data/installningar";
import { sv } from "../i18n/sv";
import type { Installningar as Inst } from "../scheduler/types";

const tal = (v: string) => (v.trim() === "" ? NaN : Number(v));

/** Inställningar (SPEC §8.5): horario, recursos, horno, limpieza. También la cuenta. */
export function Installningar() {
  const { installningar, anvandare, kanAndra, lage } = useLager();
  const [utkast, setUtkast] = useState<Inst>(installningar);
  const [fel, setFel] = useState(false);
  const [sparat, setSparat] = useState(false);
  const satt = (a: Partial<Inst>) => {
    setUtkast({ ...utkast, ...a });
    setSparat(false);
  };

  const Tal = (p: { etikett: string; varde: number; onAndra: (n: number) => void }) => (
    <label>
      <span className="etikett">{p.etikett}</span>
      <input type="number" inputMode="numeric" value={Number.isNaN(p.varde) ? "" : p.varde} onChange={(e) => p.onAndra(tal(e.target.value))} />
    </label>
  );

  return (
    <div className="sida">
      <h1>{sv.installningar.rubrik}</h1>

      <section className="kort">
        <h2>{sv.installningar.konto}</h2>
        <p>{lage === "lokal" ? sv.konto.lokaltLage : sv.konto.inloggadSom(anvandare?.epost ?? "", anvandare?.roll ?? "")}</p>
        {!kanAndra && <p className="liten">{sv.konto.lasLage}</p>}
        <div className="knapp-rad">
          <button className="sekundar" onClick={() => void uppdatera()}>
            {sv.plan.uppdatera}
          </button>
          {lage !== "lokal" && (
            <button className="sekundar" onClick={() => void loggaUt()}>
              {sv.konto.loggaUt}
            </button>
          )}
        </div>
      </section>

      <fieldset className="las" disabled={!kanAndra}>
        <section className="kort formular">
          <h2>{sv.installningar.tider}</h2>
          <div className="falt-grid">
            <label>
              <span className="etikett">{sv.installningar.start}</span>
              <input type="time" value={utkast.start} onChange={(e) => satt({ start: e.target.value })} />
            </label>
            <label>
              <span className="etikett">{sv.installningar.oppning}</span>
              <input type="time" value={utkast.oppning} onChange={(e) => satt({ oppning: e.target.value })} />
            </label>
          </div>
        </section>

        <section className="kort formular">
          <h2>{sv.installningar.resurser}</h2>
          <div className="falt-grid">
            {Tal({ etikett: sv.installningar.spisplattor, varde: utkast.spisplattor, onAndra: (n) => satt({ spisplattor: n }) })}
            {Tal({ etikett: sv.installningar.ugnBleck, varde: utkast.ugn.bleck, onAndra: (n) => satt({ ugn: { ...utkast.ugn, bleck: n } }) })}
            {Tal({ etikett: sv.installningar.forvarmning, varde: utkast.ugn.forvarmningMin, onAndra: (n) => satt({ ugn: { ...utkast.ugn, forvarmningMin: n } }) })}
            {Tal({ etikett: sv.installningar.byte, varde: utkast.ugn.bytesMin, onAndra: (n) => satt({ ugn: { ...utkast.ugn, bytesMin: n } }) })}
            {Tal({
              etikett: sv.installningar.thermomixRengoring,
              varde: utkast.thermomix.rengoringMin,
              onAndra: (n) => satt({ thermomix: { ...utkast.thermomix, rengoringMin: n } }),
            })}
            {Tal({
              etikett: sv.installningar.pacojetRengoring,
              varde: utkast.pacojet.rengoringMin,
              onAndra: (n) => satt({ pacojet: { ...utkast.pacojet, rengoringMin: n } }),
            })}
            {Tal({ etikett: sv.installningar.avbrott, varde: utkast.avbrottMin, onAndra: (n) => satt({ avbrottMin: n }) })}
            {Tal({ etikett: sv.installningar.iterationer, varde: utkast.iterationer, onAndra: (n) => satt({ iterationer: n }) })}
          </div>
        </section>
      </fieldset>

      {fel && (
        <p className="fel" role="alert">
          {sv.installningar.ogiltig}
        </p>
      )}

      {kanAndra && (
        <div className="atgard-rad">
          <button
            className="primar"
            onClick={() => {
              const ok = giltigaInstallningar(utkast);
              setFel(!ok);
              if (ok) {
                sparaInstallningar(utkast);
                setSparat(true);
              }
            }}
          >
            {sparat ? sv.sparar.sparat : sv.allmant.spara}
          </button>
        </div>
      )}
    </div>
  );
}
