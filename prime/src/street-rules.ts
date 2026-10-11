export const LANES = [240, 480, 720] as const;
export const DURATION = 55;
export const BEST_KEY = 'jozefs-world-street-best-v1';

export type Kind = 'star' | 'defender' | 'shield' | 'gold';
export interface Pickup { lane: number; y: number; kind: Kind; hit: boolean }

export function paceOf(elapsed: number): number {
  return elapsed >= 36 ? 2 : elapsed >= 19 ? 1 : 0;
}

export function collect(kind: Kind, combo: number, shield: number): { score: number; combo: number; shield: number; hearts: number; note: string } {
  if (kind === 'star' || kind === 'gold') {
    const next = combo + (kind === 'gold' ? 2 : 1);
    const mult = 1 + Math.min(4, Math.floor(next / 3));
    return { score: (kind === 'gold' ? 20 : 10) * mult, combo: next, shield, hearts: 0, note: kind === 'gold' ? 'GOLDEN STAR!' : '' };
  }
  if (kind === 'shield') {
    return { score: shield ? 15 : 0, combo, shield: 1, hearts: 0, note: shield ? '' : 'SHIELD READY!' };
  }
  if (shield) return { score: 0, combo, shield: 0, hearts: 0, note: 'SHIELD SAVE!' };
  return { score: 0, combo: 0, shield, hearts: -1, note: '' };
}
