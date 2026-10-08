/**
 * AGENTIC OS — useSpatialLayout Hook
 * Authoritative bridge from SceneMission → computeMissionLayout (ELK) → 3D Scene coordinates.
 *
 * Visual refinement:
 * - Scale tuned so active DAG occupies ~60-75% of the spatial viewport.
 * - Dynamic centering based on bounding box.
 * - Module dimensions: WIDTH = 3.6, DEPTH = 2.0.
 * - Conduits plug into socket elevation at SOCKET_ELEVATION = 0.38.
 */

"use client";

import { useState, useEffect, useRef } from "react";
import type { SceneMission, SceneStation, SceneRoute } from "@/world/adapter/types";
import { computeMissionLayout } from "@/world/layout/layoutEngine";

// Spatial scale conversion:
// ELK station width = 180px -> 3.6m Three.js module width (scaled up for prominent readability)
const SCALE_X = 3.6 / 180;
// ELK station height = 58px -> 2.0m Three.js module depth
const SCALE_Z = 2.0 / 58;

// Module physical geometry offsets matching redesigned TaskBlock3D
const BLOCK_WIDTH = 3.4;
const PORT_COLLAR_OFFSET = 0.22;
const SOCKET_ELEVATION = 0.33; // Y elevation where conduits mate with module port collars

export interface PositionedTaskStation {
  station: SceneStation;
  position: [number, number, number];
  hasInputs: boolean;
  hasOutputs: boolean;
}

export interface PositionedConduitRoute {
  route: SceneRoute;
  start: [number, number, number];
  end: [number, number, number];
}

export interface SpatialLayoutResult {
  stations: PositionedTaskStation[];
  routes: PositionedConduitRoute[];
  ready: boolean;
  bounds: { width: number; height: number };
}

const EMPTY_LAYOUT: SpatialLayoutResult = {
  stations: [],
  routes: [],
  ready: false,
  bounds: { width: 0, height: 0 },
};

export function useSpatialLayout(sceneMission: SceneMission | null): SpatialLayoutResult {
  const [layoutResult, setLayoutResult] = useState<SpatialLayoutResult>(EMPTY_LAYOUT);
  const layoutGen = useRef(0);

  useEffect(() => {
    if (!sceneMission || sceneMission.stations.length === 0) {
      setLayoutResult(EMPTY_LAYOUT);
      return;
    }

    const currentGen = ++layoutGen.current;

    // Delegate spatial layout to the ELK layout engine
    computeMissionLayout(sceneMission, sceneMission.stations)
      .then((diagram) => {
        if (currentGen !== layoutGen.current) return;

        // Center the entire layout around the world origin (0, 0, 0)
        const centerX = ((diagram.bounds.minX + diagram.bounds.maxX) / 2) * SCALE_X;
        const centerZ = ((diagram.bounds.minY + diagram.bounds.maxY) / 2) * SCALE_Z;

        const posMap = new Map<string, [number, number, number]>();

        // Index dependency connections to indicate socket ports
        const inputSet = new Set<string>();
        const outputSet = new Set<string>();
        sceneMission.routes.forEach((r) => {
          outputSet.add(r.sourceStationId);
          inputSet.add(r.targetStationId);
        });

        // 1. Position Stations with natural tiered echelon depth (foreground -> midground -> background)
        const positionedStations: PositionedTaskStation[] = [];
        sceneMission.stations.forEach((st, idx) => {
          const layoutStation = diagram.stations[st.id];
          let worldX = 0;
          let worldZ = 0;

          if (layoutStation) {
            worldX = (layoutStation.x + layoutStation.width / 2) * SCALE_X - centerX;
            // Echelon depth progression: upstream layers sit closer (+Z foreground), downstream recede (-Z background)
            const layerRank = Math.round(layoutStation.x / 240);
            const echelonZ = (layerRank - 1) * -1.25;
            const branchZ = (layoutStation.y + layoutStation.height / 2) * SCALE_Z - centerZ;
            worldZ = echelonZ + branchZ;
          }

          const pos: [number, number, number] = [worldX, 0, worldZ];
          posMap.set(st.id, pos);

          positionedStations.push({
            station: st,
            position: pos,
            hasInputs: inputSet.has(st.id),
            hasOutputs: outputSet.has(st.id),
          });
        });

        // 2. Position Routes (Conduits) mating directly to module ports
        const positionedRoutes: PositionedConduitRoute[] = [];
        sceneMission.routes.forEach((rt) => {
          const srcPos = posMap.get(rt.sourceStationId);
          const tgtPos = posMap.get(rt.targetStationId);
          if (!srcPos || !tgtPos) return;

          // Start: Output socket on right face of source module (+X)
          // End: Input socket on left face of target module (-X)
          const start: [number, number, number] = [
            srcPos[0] + BLOCK_WIDTH / 2 + PORT_COLLAR_OFFSET,
            SOCKET_ELEVATION,
            srcPos[2],
          ];
          const end: [number, number, number] = [
            tgtPos[0] - BLOCK_WIDTH / 2 - PORT_COLLAR_OFFSET,
            SOCKET_ELEVATION,
            tgtPos[2],
          ];

          positionedRoutes.push({
            route: rt,
            start,
            end,
          });
        });

        setLayoutResult({
          stations: positionedStations,
          routes: positionedRoutes,
          ready: true,
          bounds: {
            width: diagram.bounds.width * SCALE_X,
            height: diagram.bounds.height * SCALE_Z,
          },
        });
      })
      .catch((err) => {
        console.error("[useSpatialLayout] ELK calculation failed:", err);
        setLayoutResult(EMPTY_LAYOUT);
      });
  }, [sceneMission]);

  return layoutResult;
}
