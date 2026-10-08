"use client";

import React, { useMemo } from "react";
import * as THREE from "three";

function createSubtleChassisTextTexture(
  text: string,
  width: number,
  height: number,
  fontSize: number,
  letterSpacing: number = 4,
  color: string = "#5A5A65",
  fontFamily: string = '"IBM Plex Mono", monospace'
): THREE.CanvasTexture {
  if (typeof document === "undefined") {
    return new THREE.Texture() as unknown as THREE.CanvasTexture;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width * 4;
  canvas.height = height * 4;

  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    ctx.font = `bold ${fontSize * 4}px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if ("letterSpacing" in ctx) {
      (ctx as any).letterSpacing = `${letterSpacing * 4}px`;
    }

    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Laser-Etched Machine Chassis Typography
 * Subtle, architectural metadata markings integrated into the dark graphite machine base.
 * Zero distracting billboard text; acts strictly as precision engineering datum.
 */
export const PrintedTypography: React.FC = () => {
  const chassisHeaderTex = useMemo(
    () =>
      createSubtleChassisTextTexture(
        "AGENTIC OS // AUTONOMOUS INTERLOCKING COMPUTATIONAL PLATFORM",
        520,
        22,
        10,
        5,
        "#42424E"
      ),
    []
  );

  return (
    <group name="chassis-typography" position={[0, 0.008, 0]}>
      {/* Single Subtle System Datum Header */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -150]}>
        <planeGeometry args={[340, 14]} />
        <meshBasicMaterial map={chassisHeaderTex} transparent opacity={0.6} />
      </mesh>
    </group>
  );
};
