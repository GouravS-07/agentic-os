/**
 * AGENTIC OS — FEATURE FLAG & WORLD MODE DETECTION
 * Controls activation of the Interlocking World environment vs Legacy 2D dashboard.
 */

export const WORLD_STORAGE_KEY = "agentic_os_world_mode";

export function isWorldFeatureFlagEnabled(): boolean {
  return process.env.NEXT_PUBLIC_WORLD === "true" || process.env.NEXT_PUBLIC_WORLD === "1";
}

/**
 * Evaluates whether Interlocking World mode is active in the current browser context.
 * Precedence:
 * 1. URL search param ?legacy=1 or ?world=0 -> false
 * 2. URL search param ?world=1 -> true
 * 3. LocalStorage override
 * 4. NEXT_PUBLIC_WORLD environment variable
 * 5. Default: false (Current UI remains default until M9)
 */
export function evaluateWorldMode(): boolean {
  if (typeof window === "undefined") {
    return isWorldFeatureFlagEnabled();
  }

  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("legacy") === "1" || params.get("world") === "0") {
      return false;
    }
    if (params.get("world") === "1") {
      return true;
    }

    const stored = localStorage.getItem(WORLD_STORAGE_KEY);
    if (stored !== null) {
      return stored === "true";
    }
  } catch (e) {
    // Ignore storage/URL access errors
  }

  return isWorldFeatureFlagEnabled();
}

export function persistWorldMode(enabled: boolean): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(WORLD_STORAGE_KEY, enabled ? "true" : "false");
    } catch (e) {
      console.warn("Failed to persist world mode to localStorage:", e);
    }
  }
}
