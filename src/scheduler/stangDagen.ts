// Cierre del día (SPEC §3.11, §4.2): qué pasa a la lista del día siguiente.

import type { Dagsplan, DagensPost, Forberedelse } from "./types";

/**
 * - Obligatoria sin marcar o hecha → se da por hecha; si tiene följdsteg, este pasa al día siguiente con la misma prioridad.
 * - Obligatoria marcada "ej-gjord" → se arrastra.
 * - "Om tiden räcker" hecha → genera su följdsteg; no hecha o sin marcar → se arrastra.
 */
export function stangDagen(dagsplan: Dagsplan, katalog: Forberedelse[]): DagensPost[] {
  const porId = new Map(katalog.map((f) => [f.id, f]));
  const nya: DagensPost[] = [];
  for (const post of dagsplan.poster) {
    const gjord = post.status === "gjord" || (post.prioritet === "maste" && post.status === "planerad");
    if (gjord) {
      const foljd = porId.get(post.forberedelseId)?.fortsattning;
      if (foljd) nya.push({ forberedelseId: foljd, prioritet: post.prioritet, status: "planerad", overfordFran: dagsplan.datum });
    } else {
      const ny: DagensPost = { ...post, status: "planerad", overfordFran: post.overfordFran ?? dagsplan.datum };
      nya.push(ny);
    }
  }
  return nya;
}
