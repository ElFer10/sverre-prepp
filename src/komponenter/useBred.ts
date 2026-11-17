// true en pantallas anchas (Gantt y columnas por cocinero).
import { useSyncExternalStore } from "react";

const FRAGA = "(min-width: 900px)";

export function useBred(): boolean {
  return useSyncExternalStore(
    (l) => {
      const m = window.matchMedia(FRAGA);
      m.addEventListener("change", l);
      return () => m.removeEventListener("change", l);
    },
    () => window.matchMedia(FRAGA).matches,
  );
}
