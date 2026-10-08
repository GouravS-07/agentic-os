/**
 * AGENTIC OS — INTERLOCKING MOTION CONSTANTS
 * Strict motion rules: 90°/45° geometry, expo/quart ease-out, zero bounce, zero springs.
 */

export const MOTION = {
  // Timing budgets (in milliseconds)
  TWEEN_MICRO: 120,      // Fast state flips / crossfades
  TWEEN_FAST: 160,       // Signal arm drop, switch throw
  TWEEN_STANDARD: 360,   // Sheet unfold, station rising
  TWEEN_EASE_REPLAN: 420,// Station repositioning during replan
  TWEEN_CAMERA_HOP: 480, // Local camera refocus
  TWEEN_CAMERA_FULL: 600,// Home macro -> board pullback

  // Bezier transition curves (Framer Motion / CSS format)
  EASE_EXPO_OUT: [0.16, 1, 0.3, 1] as const, // For arrivals & camera moves
  EASE_QUART_OUT: [0.25, 1, 0.5, 1] as const,// For local refocus & plates
  EASE_STEP_DISCRETE: [0, 0, 1, 1] as const, // For discrete state flips
} as const;

/**
 * Calculates adaptive camera transition duration based on distance traveled.
 * Duration = clamp(350 + 60 * log2(distance), 350, 600)
 */
export function calculateCameraDuration(distance: number): number {
  if (distance <= 0) return MOTION.TWEEN_CAMERA_HOP;
  const computed = 350 + 60 * Math.log2(Math.max(1, distance));
  return Math.min(Math.max(computed, 350), 600);
}
