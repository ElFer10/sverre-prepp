import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { sparaForberedelser, useLager } from "../data/lager";
import { sv } from "../i18n/sv";
import { kopplingsforslag } from "../katalog/koppling";
import { ga } from "../komponenter/useRutt";

/** Enlazar el catálogo con las grundrecept (SPEC §7): exactas preseleccionadas, el resto lo decide Fer. */
export function Koppla() {
  const { katalog, grundrecept, kanAndra } = useLager();
  // Primero las exactas, luego las que tienen propuestas, al final el resto
  const forslag = useMemo(() => {
    const vikt = (f: ReturnType<typeof kopplingsforslag>[number]) => (f.exakt ? 0 : f.kandidater.length ? 1 : 2);
    return kopplingsforslag(katalog, grundrecept).sort((a, b) => vikt(a) - vikt(b));
  }, [katalog, grundrecept]);
  const [val, setVal] = useState<Record<string, string>>(() =>
    Object.fromEntries(forslag.map((f) => [f.forberedelseId, f.exakt ?? ""])),
  );
  const aktuella = useMemo(
    () => grundrecept.filter((g) => g.status !== "archived").sort((a, b) => a.namn.localeCompare(b.namn, "sv")),
    [grundrecept],
  );
  const namnPa = (id: string) => grundrecept.find((g) => g.id === id)?.namn ?? id;
  const antal = Object.values(val).filter(Boolean).length;

  if (!kanAndra) return <p className="tom">{sv.fel.bara_chef}</p>;

  const spara = () => {
    const lista = forslag.flatMap((fs) => {
      const receptId = val[fs.forberedelseId];
      const f = katalog.find((k) => k.id === fs.forberedelseId);
      const g = grundrecept.find((x) => x.id === receptId);
      if (!f || !g) return [];
      // Al enlazar, nombre y categoría pasan a ser los de la app de recetas
      return [{ ...f, receptId: g.id, namn: g.namn, kategori: g.kategori || f.kategori }];
    });
    if (lista.length) sparaForberedelser(lista);
    ga("#/katalog");
  };

  return (
    <div className="sida">
      <button className="tillbaka" onClick={() => ga("#/katalog")}>
        <ArrowLeft size={18} aria-hidden />
        {sv.allmant.tillbaka}
      </button>
      <p className="overline">{sv.katalog.rubrik}</p>
      <h1>{sv.koppla.rubrik}</h1>
      <p className="liten">{sv.koppla.forklaring}</p>

      {grundrecept.length === 0 && <p className="tom">{sv.koppla.ingaGrundrecept}</p>}
      {forslag.length === 0 && grundrecept.length > 0 && <p className="tom">{sv.koppla.allaKopplade}</p>}

      {forslag.length > 0 && aktuella.length > 0 && (
        <section className="kort">
          <ul className="koppla-lista">
            {forslag.map((fs) => {
              const f = katalog.find((k) => k.id === fs.forberedelseId)!;
              const forslagIds = fs.exakt ? [fs.exakt] : fs.kandidater;
              const ovriga = aktuella.filter((g) => !forslagIds.includes(g.id));
              return (
                <li key={fs.forberedelseId}>
                  <label>
                    <span className="post-namn">{f.namn}</span>
                    {fs.exakt && <span className="markor ok">{sv.koppla.exakt}</span>}
                    <select value={val[fs.forberedelseId] ?? ""} onChange={(e) => setVal({ ...val, [fs.forberedelseId]: e.target.value })}>
                      <option value="">{sv.koppla.ingen}</option>
                      {forslagIds.length > 0 && (
                        <optgroup label={fs.exakt ? sv.koppla.exakt : sv.koppla.forslag}>
                          {forslagIds.map((id) => (
                            <option key={id} value={id}>
                              {namnPa(id)}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label={sv.koppla.ovriga}>
                        {ovriga.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.namn}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="atgard-rad">
        <button className="sekundar" onClick={() => ga("#/katalog")}>
          {sv.allmant.avbryt}
        </button>
        <button className="primar" disabled={antal === 0} onClick={spara}>
          {sv.koppla.spara(antal)}
        </button>
      </div>
    </div>
  );
}
