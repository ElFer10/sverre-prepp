// Navegación mínima por hash: #/idag, #/plan, #/katalog, #/katalog/<id>, #/ny-forberedelse[?recept=<id>],
// #/koppla, #/stang, #/installningar
import { useEffect, useState } from "react";

export type Rutt =
  | { vy: "idag" }
  | { vy: "plan" }
  | { vy: "katalog" }
  | { vy: "redigera"; id: string }
  | { vy: "ny"; receptId?: string }
  | { vy: "koppla" }
  | { vy: "stang" }
  | { vy: "installningar" };

export function tolka(hash: string): Rutt {
  const [vag, fraga = ""] = hash.replace(/^#\/?/, "").split("?");
  const delar = vag.split("/").filter(Boolean);
  const param = new URLSearchParams(fraga);
  switch (delar[0]) {
    case "plan":
      return { vy: "plan" };
    case "koppla":
      return { vy: "koppla" };
    case "stang":
      return { vy: "stang" };
    case "installningar":
      return { vy: "installningar" };
    case "ny-forberedelse":
      return param.get("recept") ? { vy: "ny", receptId: param.get("recept")! } : { vy: "ny" };
    case "katalog":
      return delar[1] ? { vy: "redigera", id: decodeURIComponent(delar[1]) } : { vy: "katalog" };
    default:
      return { vy: "idag" };
  }
}

/** Pestaña de la barra de navegación a la que pertenece cada vista. */
export function flikFor(r: Rutt): "idag" | "plan" | "katalog" | "installningar" {
  if (r.vy === "redigera" || r.vy === "ny" || r.vy === "koppla") return "katalog";
  if (r.vy === "stang") return "idag";
  return r.vy;
}

export function ga(hash: string) {
  window.location.hash = hash;
}

export function useRutt(): Rutt {
  const [rutt, setRutt] = useState(() => tolka(window.location.hash));
  useEffect(() => {
    const f = () => {
      setRutt(tolka(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  return rutt;
}
