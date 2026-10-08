/**
 * AGENTIC OS — INTERLOCKING CHAMFER GEOMETRY UTILITIES
 * Converts 90° orthogonal edges into 45° transit-map style chamfers.
 * STRICT RULE: Only 90° and 45° geometry. No bezier curves except fixed chamfer radius.
 */

import type { Point2D } from "./types.ts";

/**
 * Inserts 45° chamfer segments at right-angle corner turns in orthogonal paths.
 * @param points Array of 2D points following 90° grid
 * @param chamferRadius Distance from corner vertex to chamfer start/end (default 8px)
 */
export function applyChamferToOrthogonalPath(
  points: Point2D[],
  chamferRadius: number = 8.0
): Point2D[] {
  if (points.length < 3) return points;

  const result: Point2D[] = [points[0]];

  for (let i = 1; i < points.length - 1; i++) {
    const pPrev = points[i - 1];
    const pCurr = points[i];
    const pNext = points[i + 1];

    const d1x = pCurr.x - pPrev.x;
    const d1y = pCurr.y - pPrev.y;
    const d2x = pNext.x - pCurr.x;
    const d2y = pNext.y - pCurr.y;

    const len1 = Math.hypot(d1x, d1y);
    const len2 = Math.hypot(d2x, d2y);

    // Apply chamfer only if both segments are long enough
    const effectiveRadius = Math.min(chamferRadius, len1 / 2, len2 / 2);
    if (effectiveRadius > 0.5) {
      const r1 = effectiveRadius / len1;
      const r2 = effectiveRadius / len2;

      const pChamfer1: Point2D = {
        x: pCurr.x - d1x * r1,
        y: pCurr.y - d1y * r1,
      };

      const pChamfer2: Point2D = {
        x: pCurr.x + d2x * r2,
        y: pCurr.y + d2y * r2,
      };

      result.push(pChamfer1, pChamfer2);
    } else {
      result.push(pCurr);
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

/**
 * Converts array of 2D points into an SVG path string 'M x0 y0 L x1 y1 ...'
 * with 45° chamfered corners.
 */
export function pointsToSvgPath(
  points: Point2D[],
  chamferRadius: number = 8.0
): string {
  if (!points || points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  const chamfered = applyChamferToOrthogonalPath(points, chamferRadius);
  const segments = chamfered.map((p, idx) => {
    const cmd = idx === 0 ? "M" : "L";
    return `${cmd} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  });

  return segments.join(" ");
}

/**
 * Generates an SVG path for a chamfered rectangle (station plate).
 * Corners are cut at 45° by `chamfer` distance.
 */
export function stationPlatePath(
  width: number,
  height: number,
  chamfer: number = 6.0
): string {
  const c = Math.min(chamfer, width / 4, height / 4);
  const w = width;
  const h = height;

  return `M ${c} 0 ` +
    `L ${w - c} 0 ` +
    `L ${w} ${c} ` +
    `L ${w} ${h - c} ` +
    `L ${w - c} ${h} ` +
    `L ${c} ${h} ` +
    `L 0 ${h - c} ` +
    `L 0 ${c} Z`;
}
