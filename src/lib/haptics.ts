/**
 * Haptic feedback utilities using the Vibration API.
 * Falls back gracefully on devices that don't support vibration.
 */

/**
 * Check if the device supports haptic feedback
 */
export function supportsHaptics(): boolean {
  return "vibrate" in navigator;
}

/**
 * Trigger a haptic vibration
 * @param pattern - Duration in ms or array of alternating vibrate/pause durations
 */
export function vibrate(pattern: number | number[] = 100): void {
  if (supportsHaptics()) {
    navigator.vibrate(pattern);
  }
}

/**
 * Medium vibration for standard feedback (100ms)
 */
export function vibrateLight(): void {
  vibrate(50);
}

/**
 * Medium vibration for standard feedback (100ms)
 */
export function vibrateMedium(): void {
  vibrate(100);
}

/**
 * Success feedback - single medium pulse
 */
export function vibrateSuccess(): void {
  vibrate(100);
}

/**
 * Warning feedback - double pulse
 */
export function vibrateWarning(): void {
  vibrate([100, 50, 100]);
}

/**
 * Error feedback - triple pulse
 */
export function vibrateError(): void {
  vibrate([100, 50, 100, 50, 100]);
}

/**
 * Notification feedback - gentle pulse for suggestions
 */
export function vibrateNotification(): void {
  vibrate([50, 30, 50]);
}
