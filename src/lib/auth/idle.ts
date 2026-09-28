/** Session closes after 30 minutes without activity (FR-007, research R6). */
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

export function isIdleExpired(lastActivity: number | Date, now: number | Date = Date.now()): boolean {
  return Number(now) - Number(lastActivity) >= IDLE_TIMEOUT_MS;
}
