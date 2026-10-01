/**
 * Duel expiry rules.
 *
 * Duels had no time bound: an OPEN lobby waited for an opponent forever, and an
 * ACTIVE duel stayed open until one player happened to get an accepted
 * submission. A duel either player walked away from was never resolved, and it
 * kept showing as joinable or in-progress indefinitely.
 *
 * Kept pure so the window arithmetic is tested directly, and so the same rule can
 * be applied both by the periodic sweeper and by the request path. The request
 * path matters: if expiry were only enforced by the sweeper, a submission
 * arriving between sweeps could still win a duel that was logically over.
 */

export interface DuelWindows {
  /** How long an OPEN lobby may wait for an opponent before it is abandoned. */
  openMs: number;
  /** How long an ACTIVE duel may run before it is abandoned. */
  activeMs: number;
}

/** The cutoff before which an OPEN duel counts as abandoned. */
export function openDuelCutoff(now: Date, windows: DuelWindows): Date {
  return new Date(now.getTime() - windows.openMs);
}

/** The cutoff before which an ACTIVE duel counts as abandoned. */
export function activeDuelCutoff(now: Date, windows: DuelWindows): Date {
  return new Date(now.getTime() - windows.activeMs);
}
