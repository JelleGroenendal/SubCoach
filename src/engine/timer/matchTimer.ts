/**
 * Pure timer calculations for match clock.
 * No side effects, no Date.now() calls - time is always passed as parameter.
 */

export function calculateElapsed(
  startTime: number,
  pauseDurations: number[],
  currentTime: number,
): number {
  const totalPaused = pauseDurations.reduce((sum, d) => sum + d, 0);
  return Math.max(0, currentTime - startTime - totalPaused);
}

export function calculateRemainingInPeriod(
  elapsedInPeriod: number,
  periodDurationSeconds: number,
): number {
  return Math.max(0, periodDurationSeconds - elapsedInPeriod);
}

export function isPeriodFinished(
  elapsedInPeriod: number,
  periodDurationSeconds: number,
): boolean {
  return elapsedInPeriod >= periodDurationSeconds;
}

export function isMatchFinished(
  currentPeriod: number,
  periodCount: number,
  elapsedInPeriod: number,
  periodDurationSeconds: number,
): boolean {
  return (
    currentPeriod >= periodCount && elapsedInPeriod >= periodDurationSeconds
  );
}

export function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function getTotalMatchSeconds(
  periodDurationMinutes: number,
  periodCount: number,
): number {
  return periodDurationMinutes * 60 * periodCount;
}
