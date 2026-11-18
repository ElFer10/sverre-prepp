import { useState } from "react";
import { loggaIn } from "../data/lager";
import { sv } from "../i18n/sv";

export function Logga() {
  const [epost, setEpost] = useState("");
  const [losenord, setLosenord] = useState("");
  const [fel, setFel] = useState<string | null>(null);
  const [upptagen, setUpptagen] = useState(false);

  return (
    <main className="inloggning">
      <img className="logo" src="/sverre-logo.png" alt={sv.logoAlt} />
      <h1>{sv.appNamn}</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setUpptagen(true);
          setFel(await loggaIn(epost, losenord));
          setUpptagen(false);
          setLosenord("");
        }}
      >
        <label>
          {sv.konto.epost}
          <input type="email" autoComplete="username" required value={epost} onChange={(e) => setEpost(e.target.value)} />
        </label>
        <label>
          {sv.konto.losenord}
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
        <button className="primar" disabled={upptagen}>
          {upptagen ? sv.konto.loggarIn : sv.konto.loggaIn}
        </button>
      </form>
      <p>{sv.konto.forklaring}</p>
    </main>
  );
}
