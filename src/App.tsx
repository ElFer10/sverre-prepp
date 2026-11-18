import { useEffect } from "react";
import { forsokIgen, loggaUt, starta, useLager } from "./data/lager";
import { sv } from "./i18n/sv";
import { flikFor, useRutt } from "./komponenter/useRutt";
import { aktiveraNyVersion, useNyVersion } from "./pwa";
import { Idag } from "./vyer/Idag";
import { Installningar } from "./vyer/Installningar";
import { Katalog } from "./vyer/Katalog";
import { Koppla } from "./vyer/Koppla";
import { Logga } from "./vyer/Logga";
import { Plan } from "./vyer/Plan";
import { Redigera } from "./vyer/Redigera";
import { Stang } from "./vyer/Stang";

const FLIKAR = [
  { vy: "idag", hash: "#/idag", text: sv.nav.idag, ikon: "☰" },
  { vy: "plan", hash: "#/plan", text: sv.nav.plan, ikon: "◷" },
  { vy: "katalog", hash: "#/katalog", text: sv.nav.katalog, ikon: "▤" },
  { vy: "installningar", hash: "#/installningar", text: sv.nav.installningar, ikon: "⚙" },
] as const;

export default function App() {
  const lager = useLager();
  const rutt = useRutt();
  const nyVersion = useNyVersion();
  useEffect(() => {
    void starta();
  }, []);

  if (lager.status === "laddar") return <Mitt>{sv.konto.laddar}</Mitt>;
  if (lager.status === "utloggad") return <Logga />;
  if (lager.status === "fel") {
    return (
      <Mitt>
        <p className="fel">{lager.fel}</p>
        <div className="knapp-rad">
          <button className="primar" onClick={() => void starta()}>
            {sv.konto.forsokIgen}
          </button>
          <button className="sekundar" onClick={() => void loggaUt()}>
            {sv.konto.loggaUt}
          </button>
        </div>
      </Mitt>
    );
  }

  const aktivFlik = flikFor(rutt);
  return (
    <div className="app">
      <header className="topp">
        <span className="topp-namn">{sv.appNamn}</span>
        <nav className="flikar flikar-topp">
          {FLIKAR.map((f) => (
            <a key={f.vy} href={f.hash} className={f.vy === aktivFlik ? "aktiv" : ""}>
              {f.text}
            </a>
          ))}
        </nav>
        <span className="topp-status" aria-live="polite">
          {lager.sparar > 0 ? sv.sparar.sparar : ""}
        </span>
      </header>
      {nyVersion && (
        <div className="sparfel ny-version" role="status">
          <span>{sv.pwa.nyVersion}</span>
          <button className="liten-knapp" onClick={aktiveraNyVersion}>
            {sv.pwa.uppdatera}
          </button>
        </div>
      )}
      {lager.offline && (
        <div className="sparfel" role="status">
          <span>{sv.pwa.offline(tidText(lager.offline))}</span>
          <button className="liten-knapp" onClick={() => void starta()}>
            {sv.konto.forsokIgen}
          </button>
        </div>
      )}
      {lager.sparfel && (
        <div className="sparfel" role="alert">
          <span>{lager.sparfel}</span>
          <button className="liten-knapp" onClick={forsokIgen}>
            {sv.konto.forsokIgen}
          </button>
        </div>
      )}
      <main className="innehall">
        {rutt.vy === "idag" && <Idag />}
        {rutt.vy === "plan" && <Plan />}
        {rutt.vy === "katalog" && <Katalog />}
        {rutt.vy === "redigera" && <Redigera key={rutt.id} id={rutt.id} />}
        {rutt.vy === "ny" && <Redigera key={`ny-${rutt.receptId ?? ""}`} id={null} receptId={rutt.receptId} />}
        {rutt.vy === "koppla" && <Koppla />}
        {rutt.vy === "stang" && <Stang />}
        {rutt.vy === "installningar" && <Installningar />}
      </main>
      <nav className="flikar flikar-botten">
        {FLIKAR.map((f) => (
          <a key={f.vy} href={f.hash} className={f.vy === aktivFlik ? "aktiv" : ""}>
            <span className="flik-ikon" aria-hidden>
              {f.ikon}
            </span>
            {f.text}
          </a>
        ))}
      </nav>
    </div>
  );
}

/** "18/11 07:30" en hora local. */
function tidText(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getDate()}/${d.getMonth() + 1} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function Mitt(props: { children: React.ReactNode }) {
  return <div className="mitt">{props.children}</div>;
}
