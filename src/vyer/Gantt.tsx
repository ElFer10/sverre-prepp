import { useMemo, type CSSProperties } from "react";
import { sv } from "../i18n/sv";
import { ganttRader, klockslag, sistaMinut } from "../plan/vy";
import type { Forberedelse, PlanResultat } from "../scheduler/types";

const PX_PER_MIN = 6;
const BANA_HOJD = 26;

/** Un tono por preparación, estable dentro del plan. */
function farger(res: PlanResultat): Map<string, number> {
  const ids = [...new Set(res.faser.map((f) => f.forberedelseId))];
  return new Map(ids.map((id, i) => [id, Math.round((i * 137.508) % 360)]));
}

export function Gantt(props: { res: PlanResultat; katalog: Forberedelse[]; plattor: number; start: string }) {
  const { res, katalog, plattor, start } = props;
  const rader = useMemo(() => ganttRader(res, katalog, plattor), [res, katalog, plattor]);
  const ton = useMemo(() => farger(res), [res]);
  const slut = Math.ceil(sistaMinut(res) / 15) * 15;
  const bredd = slut * PX_PER_MIN;
  const markeringar = Array.from({ length: slut / 15 + 1 }, (_, i) => i * 15);

  return (
    <div className="gantt">
      <div className="gantt-namn">
        <div className="gantt-skala-plats" />
        {rader.map((r) => (
          <div key={r.namn} className="gantt-radnamn" style={{ height: r.banor * BANA_HOJD + 8 }}>
            {r.namn}
          </div>
        ))}
      </div>
      <div className="gantt-rulla">
        <div className="gantt-yta" style={{ width: bredd }}>
          <div className="gantt-skala">
            {markeringar.map((m) => (
              <span key={m} className={m % 60 === 0 ? "hel" : ""} style={{ left: m * PX_PER_MIN }}>
                {klockslag(m, start)}
              </span>
            ))}
          </div>
          <div className="gantt-efter" style={{ left: res.oppning * PX_PER_MIN }} title={sv.gantt.oppning} />
          {rader.map((r) => (
            <div key={r.namn} className="gantt-rad" style={{ height: r.banor * BANA_HOJD + 8 }}>
              {r.staplar.map((s, i) => {
                const h = s.forberedelseId ? ton.get(s.forberedelseId) ?? 0 : 0;
                const titel = `${klockslag(s.start, start)}–${klockslag(s.slut, start)} ${s.etikett}`;
                return (
                  <div
                    key={i}
                    className={`stapel stapel-${s.slag}`}
                    style={
                      {
                        left: s.start * PX_PER_MIN,
                        width: Math.max(2, (s.slut - s.start) * PX_PER_MIN - 1),
                        top: 4 + s.bana * BANA_HOJD,
                        height: BANA_HOJD - 4,
                        "--ton": h,
                      } as CSSProperties
                    }
                    title={titel}
                  >
                    {s.pauser.map((p) => (
                      <span
                        key={p.start}
                        className="stapel-paus"
                        style={{ left: (p.start - s.start) * PX_PER_MIN, width: (p.slut - p.start) * PX_PER_MIN }}
                      />
                    ))}
                    <span className="stapel-text">{s.etikett}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
