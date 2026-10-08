/**
 * AGENTIC OS — QUALITY TIERS & PERFORMANCE STRATEGY
 * Enforces frameloop="demand" and dynamic tier adaptation.
 */

export type QualityTier = "HIGH" | "LOW" | "DIAGRAM";

export interface QualityConfig {
  tier: QualityTier;
  dpr: number;
  shadows: boolean;
  tiltShift: boolean;
  instancingThreshold: number;
  frameloop: "demand" | "always";
}

export const QUALITY_TIERS: Record<QualityTier, QualityConfig> = {
  HIGH: {
    tier: "HIGH",
    dpr: 1.5,
    shadows: true,
    tiltShift: true,
    instancingThreshold: 1000,
    frameloop: "demand",
  },
  LOW: {
    tier: "LOW",
    dpr: 1.0,
    shadows: false, // Blob shadows only
    tiltShift: false,
    instancingThreshold: 500,
    frameloop: "demand",
  },
  DIAGRAM: {
    tier: "DIAGRAM",
    dpr: 1.0,
    shadows: false,
    tiltShift: false,
    instancingThreshold: 0,
    frameloop: "demand",
  },
};

export function detectDefaultQualityTier(): QualityTier {
  if (typeof window === "undefined") return "HIGH";
  
  // Mobile check (< 768px defaults to DIAGRAM view per §16)
  if (window.innerWidth < 768) {
    return "DIAGRAM";
  }

  // Check hardware concurrency / memory constraints
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
    return "LOW";
  }

  return "HIGH";
}
