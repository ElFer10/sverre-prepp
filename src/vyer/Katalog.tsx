import { ChevronRight, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { sparaForberedelser, useLager } from "../data/lager";
import { tidigareLokalKatalog } from "../data/lokaltBackend";
import { sv } from "../i18n/sv";
import { kopplingsLage, okonfigurerade } from "../katalog/koppling";
import type { Forberedelse } from "../scheduler/types";

type Rad =
  | { typ: "forb"; f: Forberedelse; kategori: string }
  | { typ: "grund"; id: string; namn: string; kategori: string };

export function Katalog() {
  const { katalog, grundrecept, kanAndra } = useLager();
  const [q, setQ] = useState("");

  const grupper = useMemo(() => {
    const s = q.trim().toLowerCase();
    const rader: Rad[] = [
      ...katalog.map((f) => ({ typ: "forb" as const, f, kategori: f.kategori || sv.katalog.utanKategori })),
      ...okonfigurerade(katalog, grundrecept).map((g) => ({
        typ: "grund" as const,
        id: g.id,
        namn: g.namn,
        kategori: g.kategori || sv.katalog.utanKategori,
      })),
    ].filter((r) => !s || (r.typ === "forb" ? r.f.namn : r.namn).toLowerCase().includes(s));
    const m = new Map<string, Rad[]>();
    for (const r of rader) m.set(r.kategori, [...(m.get(r.kategori) ?? []), r]);
    const namn = (r: Rad) => (r.typ === "forb" ? r.f.namn : r.namn);
    return [...m.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "sv"))
      .map(([k, l]) => [k, l.sort((a, b) => namn(a).localeCompare(namn(b), "sv"))] as const);
  }, [katalog, grundrecept, q]);

  const okopplade = grundrecept.length > 0 && katalog.some((f) => !f.receptId);

  return (
    <div className="sida">
      <p className="overline">{sv.sidOverline}</p>
      <div className="rubrik-rad rubrik-rad-knapp">
        <h1>{sv.katalog.rubrik}</h1>
        {kanAndra && (
          <a className="knapp-lank primar" href="#/ny-forberedelse">
            <Plus size={18} aria-hidden />
            {sv.katalog.ny}
          </a>
        )}
      </div>

      {kanAndra && katalog.length === 0 && <Importera />}

      {kanAndra && okopplade && (
        <div className="knapp-rad">
          <a className="knapp-lank" href="#/koppla">
            {sv.katalog.koppla}
          </a>
        </div>
      )}

      <div className="sokfalt">
        <Search size={18} aria-hidden />
        <input
          type="search"
          placeholder={sv.katalog.sokPlatshallare}
          aria-label={sv.allmant.sok}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {grupper.length === 0 && katalog.length > 0 && <p className="tom">{sv.katalog.ingaTraffar}</p>}
      {grupper.map(([kategori, lista]) => (
        <section key={kategori} className="kort">
          <h2>{kategori}</h2>
          <ul className="katalog-lista">
            {lista.map((r) =>
              r.typ === "forb" ? (
                <ForbRad key={r.f.id} f={r.f} lage={kopplingsLage(r.f, grundrecept)} />
              ) : (
                <li key={`g-${r.id}`}>
                  <a href={kanAndra ? `#/ny-forberedelse?recept=${encodeURIComponent(r.id)}` : undefined}>
                    <span className="post-text">
                      <span className="post-namn">{r.namn}</span>
                      <span className="liten">{sv.katalog.kopplad}</span>
                    </span>
                    <span className="markor varn">{sv.katalog.ejKonfigurerad}</span>
                    {kanAndra && (
                      <ChevronRight className="pil" size={18} aria-hidden />
                    )}
                  </a>
                </li>
              ),
            )}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ForbRad(props: { f: Forberedelse; lage: ReturnType<typeof kopplingsLage> }) {
  const { f, lage } = props;
  const konf = f.faser.length > 0;
  return (
    <li>
      <a href={`#/katalog/${encodeURIComponent(f.id)}`}>
        <span className="post-text">
          <span className="post-namn">{f.namn}</span>
          <span className="liten">{konf ? sv.katalog.antalMoment(f.faser.length) : ""}</span>
        </span>
        {lage === "egen" && (
          <span className="markor" title={sv.katalog.egenForklaring}>
            {sv.katalog.egen}
          </span>
        )}
        {lage === "saknas" && (
          <span className="markor varn" title={sv.katalog.saknasForklaring}>
            {sv.katalog.saknas}
          </span>
        )}
        {!f.aktiv && <span className="markor">{sv.katalog.inaktiv}</span>}
        <span className={`markor ${konf ? "ok" : "varn"}`}>{konf ? sv.katalog.konfigurerad : sv.katalog.ejKonfigurerad}</span>
        <ChevronRight className="pil" size={18} aria-hidden />
      </a>
    </li>
  );
}

const hamtaUtkast = async () => (await import("../scheduler/__fixtures__/katalog.json")).default as Forberedelse[];

/** Primera vez: subir explícitamente el catálogo local o el borrador (nunca automático). */
function Importera() {
  const lokal = useMemo(() => tidigareLokalKatalog(), []);
  const [upptagen, setUpptagen] = useState(false);
  const [utkastAntal, setUtkastAntal] = useState<number | null>(null);
  useEffect(() => {
    void hamtaUtkast().then((k) => setUtkastAntal(k.length));
  }, []);

  const importera = async (hamta: () => Forberedelse[] | Promise<Forberedelse[]>) => {
    setUpptagen(true);
    sparaForberedelser(await hamta());
    setUpptagen(false);
  };

  return (
    <section className="kort">
      <h2>{sv.importera.rubrik}</h2>
      <p className="liten">{sv.importera.forklaring}</p>
      <div className="knapp-rad">
        {lokal.length > 0 && (
          <button className="primar" disabled={upptagen} onClick={() => importera(() => lokal)}>
            {upptagen ? sv.importera.importerar : sv.importera.franEnhet(lokal.length)}
          </button>
        )}
        <button
          className={lokal.length ? "sekundar" : "primar"}
          disabled={upptagen || utkastAntal === null}
          onClick={() => importera(hamtaUtkast)}
        >
          {upptagen ? sv.importera.importerar : sv.importera.utkast(utkastAntal ?? 0)}
        </button>
      </div>
    </section>
  );
}
