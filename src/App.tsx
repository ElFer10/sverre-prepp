import { sv } from "./i18n/sv";

// Marcador de posición: la interfaz llega en la fase 2 (SPEC §13).
export default function App() {
  return (
    <main>
      <h1>{sv.appNamn}</h1>
      <p>{sv.kommerSnart}</p>
    </main>
  );
}
