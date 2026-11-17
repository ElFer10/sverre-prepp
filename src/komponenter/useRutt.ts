// Navegación mínima por hash: #/idag, #/plan, #/katalog, #/katalog/<id>, #/ny-forberedelse
import { useEffect, useState } from "react";

export type Rutt = { vy: "idag" } | { vy: "plan" } | { vy: "katalog" } | { vy: "redigera"; id: string } | { vy: "ny" };

export function tolka(hash: string): Rutt {
  const delar = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (delar[0] === "plan") return { vy: "plan" };
  if (delar[0] === "ny-forberedelse") return { vy: "ny" };
  if (delar[0] === "katalog" && delar[1]) return { vy: "redigera", id: decodeURIComponent(delar[1]) };
  if (delar[0] === "katalog") return { vy: "katalog" };
  return { vy: "idag" };
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
