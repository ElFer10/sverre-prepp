import { BookOpen, CalendarClock, ClipboardList, Settings } from "lucide-react";
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

// Mismo menú que la app de recetas: iconos lucide de 19 px junto al texto
const FLIKAR = [
  { vy: "idag", hash: "#/idag", text: sv.nav.idag, Ikon: ClipboardList },
  { vy: "plan", hash: "#/plan", text: sv.nav.plan, Ikon: CalendarClock },
  { vy: "katalog", hash: "#/katalog", text: sv.nav.katalog, Ikon: BookOpen },
  { vy: "installningar", hash: "#/installningar", text: sv.nav.installningar, Ikon: Settings },
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
    <>
      {lager.sparar > 0 && (
        <div className="spar-notis" role="status">
          {sv.sparar.sparar}
        </div>
      )}
      <div className="skal">
        <aside className="sidomeny">
          <img className="logo" src="/sverre-logo.png" alt={sv.logoAlt} />
          <p className="overline">{sv.overline}</p>
          <nav className="flikar">
            {FLIKAR.map(({ vy, hash, text, Ikon }) => (
              <a key={vy} href={hash} className={vy === aktivFlik ? "aktiv" : ""} aria-current={vy === aktivFlik ? "page" : undefined}>
                <Ikon size={19} aria-hidden />
                {text}
              </a>
            ))}
          </nav>
          <div className="sidomeny-botten">
            {lager.anvandare && (
              <small>
                {lager.anvandare.epost} · {lager.anvandare.roll}
              </small>
            )}
            <button onClick={() => void loggaUt()}>{sv.konto.loggaUt}</button>
          </div>
        </aside>
        <main className="innehall">
          {nyVersion && (
            <div className="notis ny-version" role="status">
              <span>{sv.pwa.nyVersion}</span>
              <button className="primar liten-knapp" onClick={aktiveraNyVersion}>
                {sv.pwa.uppdatera}
              </button>
            </div>
          )}
          {lager.offline && (
            <div className="notis" role="status">
              <span>{sv.pwa.offline(tidText(lager.offline))}</span>
              <button className="liten-knapp" onClick={() => void starta()}>
                {sv.konto.forsokIgen}
              </button>
            </div>
          )}
          {lager.sparfel && (
            <div className="notis" role="alert">
              <span>{lager.sparfel}</span>
              <button className="liten-knapp" onClick={forsokIgen}>
                {sv.konto.forsokIgen}
              </button>
            </div>
          )}
          {rutt.vy === "idag" && <Idag />}
          {rutt.vy === "plan" && <Plan />}
          {rutt.vy === "katalog" && <Katalog />}
          {rutt.vy === "redigera" && <Redigera key={rutt.id} id={rutt.id} />}
          {rutt.vy === "ny" && <Redigera key={`ny-${rutt.receptId ?? ""}`} id={null} receptId={rutt.receptId} />}
          {rutt.vy === "koppla" && <Koppla />}
          {rutt.vy === "stang" && <Stang />}
          {rutt.vy === "installningar" && <Installningar />}
        </main>
      </div>
    </>
  );
}

/** "18/11 07:30" en hora local. */
function tidText(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getDate()}/${d.getMonth() + 1} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function Mitt(props: { children: React.ReactNode }) {
  return (
    <main className="inloggning">
      <img className="logo" src="/sverre-logo.png" alt={sv.logoAlt} />
      {props.children}
    </main>
  );
}
