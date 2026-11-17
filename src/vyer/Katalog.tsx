import { useMemo, useState } from "react";
import { aterstallKatalog, useLager } from "../data/lager";
import { sv } from "../i18n/sv";
import type { Forberedelse } from "../scheduler/types";

export function Katalog() {
  const { katalog } = useLager();
  const [q, setQ] = useState("");

  const grupper = useMemo(() => {
    const s = q.trim().toLowerCase();
    const m = new Map<string, Forberedelse[]>();
    for (const f of katalog) {
      if (s && !f.namn.toLowerCase().includes(s)) continue;
      const k = f.kategori || sv.katalog.utanKategori;
      m.set(k, [...(m.get(k) ?? []), f]);
    }
    return [...m.entries()];
  }, [katalog, q]);

  return (
    <div className="sida">
      <div className="rubrik-rad rubrik-rad-knapp">
        <h1>{sv.katalog.rubrik}</h1>
        <a className="knapp-lank" href="#/ny-forberedelse">
          + {sv.katalog.ny}
        </a>
      </div>
      <input
        type="search"
        placeholder={sv.katalog.sokPlatshallare}
        aria-label={sv.allmant.sok}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {grupper.length === 0 && <p className="tom">{sv.katalog.ingaTraffar}</p>}
      {grupper.map(([kategori, lista]) => (
        <section key={kategori} className="kort">
          <h2>{kategori}</h2>
          <ul className="katalog-lista">
            {lista.map((f) => {
              const konf = f.faser.length > 0;
              return (
                <li key={f.id}>
                  <a href={`#/katalog/${encodeURIComponent(f.id)}`}>
                    <span className="post-text">
                      <span className="post-namn">{f.namn}</span>
                      <span className="liten">{konf ? sv.katalog.antalMoment(f.faser.length) : ""}</span>
                    </span>
                    {!f.receptId && (
                      <span className="markor" title={sv.katalog.egenForklaring}>
                        {sv.katalog.egen}
                      </span>
                    )}
                    {!f.aktiv && <span className="markor">{sv.katalog.inaktiv}</span>}
                    <span className={`markor ${konf ? "ok" : "varn"}`}>
                      {konf ? sv.katalog.konfigurerad : sv.katalog.ejKonfigurerad}
                    </span>
                    <span className="pil" aria-hidden>
                      ›
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <div className="knapp-rad">
        <button
          className="sekundar"
          onClick={() => {
            if (window.confirm(sv.katalog.aterstallFraga)) aterstallKatalog();
          }}
        >
          {sv.katalog.aterstall}
        </button>
      </div>
    </div>
  );
}
