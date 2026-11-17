import { useState } from "react";
import { loggaIn } from "../data/lager";
import { sv } from "../i18n/sv";

export function Logga() {
  const [epost, setEpost] = useState("");
  const [losenord, setLosenord] = useState("");
  const [fel, setFel] = useState<string | null>(null);
  const [upptagen, setUpptagen] = useState(false);

  return (
    <div className="mitt">
      <form
        className="kort formular inloggning"
        onSubmit={async (e) => {
          e.preventDefault();
          setUpptagen(true);
          setFel(await loggaIn(epost, losenord));
          setUpptagen(false);
          setLosenord("");
        }}
      >
        <h1>{sv.appNamn}</h1>
        <p className="liten">{sv.konto.forklaring}</p>
        <label>
          <span className="etikett">{sv.konto.epost}</span>
          <input type="email" autoComplete="username" required value={epost} onChange={(e) => setEpost(e.target.value)} />
        </label>
        <label>
          <span className="etikett">{sv.konto.losenord}</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={losenord}
            onChange={(e) => setLosenord(e.target.value)}
          />
        </label>
        {fel && (
          <p className="fel" role="alert">
            {fel}
          </p>
        )}
        <button className="primar bred-knapp" disabled={upptagen}>
          {upptagen ? sv.konto.loggarIn : sv.konto.loggaIn}
        </button>
      </form>
    </div>
  );
}
