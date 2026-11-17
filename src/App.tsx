import { sv } from "./i18n/sv";
import { useRutt, type Rutt } from "./komponenter/useRutt";
import { Idag } from "./vyer/Idag";
import { Katalog } from "./vyer/Katalog";
import { Plan } from "./vyer/Plan";
import { Redigera } from "./vyer/Redigera";

const FLIKAR: Array<{ vy: Rutt["vy"]; hash: string; text: string; ikon: string }> = [
  { vy: "idag", hash: "#/idag", text: sv.nav.idag, ikon: "☰" },
  { vy: "plan", hash: "#/plan", text: sv.nav.plan, ikon: "◷" },
  { vy: "katalog", hash: "#/katalog", text: sv.nav.katalog, ikon: "▤" },
];

export default function App() {
  const rutt = useRutt();
  const aktivFlik = rutt.vy === "redigera" ? "katalog" : rutt.vy;
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
      </header>
      <main className="innehall">
        {rutt.vy === "idag" && <Idag />}
        {rutt.vy === "plan" && <Plan />}
        {rutt.vy === "katalog" && <Katalog />}
        {rutt.vy === "redigera" && <Redigera key={rutt.id} id={rutt.id} />}
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
