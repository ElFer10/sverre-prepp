// Registro del service worker (solo en producción) y aviso de versión nueva.
// La versión nueva no se activa sola: el usuario pulsa "Uppdatera" y la página se recarga.

import { useSyncExternalStore } from "react";

let vantande: ServiceWorker | null = null;
const lyssnare = new Set<() => void>();
const meddela = () => lyssnare.forEach((l) => l());

export function registreraServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const nyVersion = (sw: ServiceWorker | null) => {
        // Sin controlador es la primera instalación: nada que avisar
        if (sw && navigator.serviceWorker.controller) {
          vantande = sw;
          meddela();
        }
      };
      nyVersion(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        sw?.addEventListener("statechange", () => sw.state === "installed" && nyVersion(sw));
      });
      // La app instalada puede quedarse abierta días: buscar versión al volver a ella
      document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && void reg.update());
    } catch {
      // Sin service worker la app funciona igual (solo no abre sin conexión)
    }
  });
}

export function aktiveraNyVersion() {
  if (!vantande) return;
  navigator.serviceWorker.addEventListener("controllerchange", () => location.reload(), { once: true });
  vantande.postMessage("aktivera");
}

export function useNyVersion(): boolean {
  return useSyncExternalStore(
    (l) => {
      lyssnare.add(l);
      return () => lyssnare.delete(l);
    },
    () => vantande !== null,
  );
}
