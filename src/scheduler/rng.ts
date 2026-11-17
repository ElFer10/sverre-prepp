// Generador pseudoaleatorio con semilla (mulberry32): mismo seed → misma secuencia.

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Combina varios enteros en una semilla (para tener flujos independientes). */
export function blanda(...n: number[]): number {
  let h = 2166136261;
  for (const x of n) {
    h ^= x >>> 0;
    h = Math.imul(h, 16777619);
    h ^= h >>> 13;
  }
  return h >>> 0;
}
