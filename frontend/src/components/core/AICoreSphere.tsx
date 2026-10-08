"use client";

import React, { useEffect, useRef } from "react";

export type AICoreState =
  | "IDLE"
  | "PLANNING"
  | "RUNNING"
  | "WAITING_APPROVAL"
  | "RECOVERING"
  | "COMPLETED"
  | "FAILED";

interface AICoreSphereProps {
  state?: AICoreState;
  size?: number;
  className?: string;
  sublabel?: string;
}

const STATE_PALETTES: Record<
  AICoreState,
  {
    primary: string;
    secondary: string;
    glow: string;
    speed: number;
    ringCount: number;
    corePulseSpeed: number;
  }
> = {
  IDLE: {
    primary: "rgba(99, 102, 241, 0.8)", // Indigo
    secondary: "rgba(168, 85, 247, 0.5)", // Purple
    glow: "rgba(99, 102, 241, 0.3)",
    speed: 0.008,
    ringCount: 3,
    corePulseSpeed: 0.03,
  },
  PLANNING: {
    primary: "rgba(168, 85, 247, 0.9)", // Purple
    secondary: "rgba(236, 72, 153, 0.6)", // Pink
    glow: "rgba(168, 85, 247, 0.4)",
    speed: 0.02,
    ringCount: 4,
    corePulseSpeed: 0.07,
  },
  RUNNING: {
    primary: "rgba(6, 182, 212, 0.9)", // Cyan
    secondary: "rgba(16, 185, 129, 0.7)", // Emerald
    glow: "rgba(6, 182, 212, 0.4)",
    speed: 0.025,
    ringCount: 5,
    corePulseSpeed: 0.08,
  },
  WAITING_APPROVAL: {
    primary: "rgba(245, 158, 11, 0.95)", // Amber
    secondary: "rgba(239, 68, 68, 0.6)", // Rose
    glow: "rgba(245, 158, 11, 0.45)",
    speed: 0.012,
    ringCount: 3,
    corePulseSpeed: 0.1,
  },
  RECOVERING: {
    primary: "rgba(236, 72, 153, 0.9)", // Rose/Magenta
    secondary: "rgba(168, 85, 247, 0.7)", // Violet
    glow: "rgba(236, 72, 153, 0.4)",
    speed: 0.028,
    ringCount: 4,
    corePulseSpeed: 0.09,
  },
  COMPLETED: {
    primary: "rgba(16, 185, 129, 0.9)", // Emerald
    secondary: "rgba(6, 182, 212, 0.7)", // Cyan
    glow: "rgba(16, 185, 129, 0.35)",
    speed: 0.007,
    ringCount: 3,
    corePulseSpeed: 0.02,
  },
  FAILED: {
    primary: "rgba(239, 68, 68, 0.9)", // Red
    secondary: "rgba(245, 158, 11, 0.5)", // Amber
    glow: "rgba(239, 68, 68, 0.4)",
    speed: 0.006,
    ringCount: 2,
    corePulseSpeed: 0.04,
  },
};

export function AICoreSphere({
  state = "IDLE",
  size = 260,
  className = "",
  sublabel,
}: AICoreSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const palette = STATE_PALETTES[state] || STATE_PALETTES.IDLE;
    const centerX = size / 2;
    const centerY = size / 2;
    const sphereRadius = size * 0.32;

    // Generate 3D point cloud on sphere surface
    const pointCount = 120;
    const points: Array<{ x: number; y: number; z: number; origX: number; origY: number; origZ: number }> = [];

    for (let i = 0; i < pointCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / pointCount);
      const theta = Math.sqrt(pointCount * Math.PI) * phi;
      const x = sphereRadius * Math.cos(theta) * Math.sin(phi);
      const y = sphereRadius * Math.sin(theta) * Math.sin(phi);
      const z = sphereRadius * Math.cos(phi);
      points.push({ x, y, z, origX: x, origY: y, origZ: z });
    }

    // Orbital ring particles
    const ringParticles: Array<{
      radius: number;
      angle: number;
      speed: number;
      tiltX: number;
      tiltY: number;
      size: number;
    }> = [];

    const numRings = palette.ringCount;
    for (let r = 0; r < numRings; r++) {
      const ringRadius = sphereRadius * (1.25 + r * 0.18);
      const particlesPerRing = 18;
      const tiltX = (r * 0.45) - 0.6;
      const tiltY = (r * 0.35) + 0.3;
      for (let p = 0; p < particlesPerRing; p++) {
        ringParticles.push({
          radius: ringRadius,
          angle: (Math.PI * 2 * p) / particlesPerRing,
          speed: (r % 2 === 0 ? 1 : -1) * palette.speed * (1 + r * 0.2),
          tiltX,
          tiltY,
          size: Math.random() * 1.5 + 1.2,
        });
      }
    }

    let rotX = 0;
    let rotY = 0;
    let pulseAngle = 0;

    const render = () => {
      ctx.clearRect(0, 0, size, size);

      rotX += palette.speed * 0.7;
      rotY += palette.speed;
      pulseAngle += palette.corePulseSpeed;

      const currentPulse = 1 + Math.sin(pulseAngle) * 0.08;

      // 1. Ambient Central Core Radial Glow
      const coreGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        sphereRadius * 1.2 * currentPulse
      );
      coreGrad.addColorStop(0, palette.primary);
      coreGrad.addColorStop(0.35, palette.secondary);
      coreGrad.addColorStop(0.8, palette.glow);
      coreGrad.addColorStop(1, "rgba(9, 10, 15, 0)");

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, sphereRadius * 1.2 * currentPulse, 0, Math.PI * 2);
      ctx.fill();

      // 2. Project & Render 3D Sphere Points
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      const projectedPoints: Array<{ x2d: number; y2d: number; z: number; alpha: number }> = [];

      for (let i = 0; i < points.length; i++) {
        const p = points[i];

        // 3D Rotation Y
        let x1 = p.origX * cosY - p.origZ * sinY;
        let z1 = p.origZ * cosY + p.origX * sinY;

        // 3D Rotation X
        let y2 = p.origY * cosX - z1 * sinX;
        let z2 = z1 * cosX + p.origY * sinX;

        // Perspective divide
        const fov = 350;
        const scale = fov / (fov + z2);
        const x2d = centerX + x1 * scale * currentPulse;
        const y2d = centerY + y2 * scale * currentPulse;
        const alpha = Math.max(0.15, (z2 + sphereRadius) / (sphereRadius * 2));

        projectedPoints.push({ x2d, y2d, z: z2, alpha });
      }

      // Sort points by Z depth for realistic rendering
      projectedPoints.sort((a, b) => a.z - b.z);

      // Draw connective neural links between close points
      ctx.lineWidth = 0.5;
      for (let i = 0; i < projectedPoints.length; i++) {
        for (let j = i + 1; j < Math.min(i + 4, projectedPoints.length); j++) {
          const p1 = projectedPoints[i];
          const p2 = projectedPoints[j];
          const dist = Math.hypot(p1.x2d - p2.x2d, p1.y2d - p2.y2d);
          if (dist < size * 0.18) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${p1.alpha * 0.18})`;
            ctx.beginPath();
            ctx.moveTo(p1.x2d, p1.y2d);
            ctx.lineTo(p2.x2d, p2.y2d);
            ctx.stroke();
          }
        }
      }

      // Draw sphere node points
      for (let i = 0; i < projectedPoints.length; i++) {
        const p = projectedPoints[i];
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.85})`;
        ctx.beginPath();
        ctx.arc(p.x2d, p.y2d, Math.max(1, p.alpha * 2.2), 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Render Orbital Planetary Rings & Particles
      for (let i = 0; i < ringParticles.length; i++) {
        const rp = ringParticles[i];
        rp.angle += rp.speed;

        // Calculate 3D orbital point with tilt
        const rawX = Math.cos(rp.angle) * rp.radius;
        const rawY = Math.sin(rp.angle) * rp.radius * Math.sin(rp.tiltX);
        const rawZ = Math.sin(rp.angle) * rp.radius * Math.cos(rp.tiltX);

        // Apply global yaw
        const x3d = rawX * Math.cos(rp.tiltY) - rawZ * Math.sin(rp.tiltY);
        const z3d = rawZ * Math.cos(rp.tiltY) + rawX * Math.sin(rp.tiltY);

        const fov = 380;
        const scale = fov / (fov + z3d);
        const x2d = centerX + x3d * scale;
        const y2d = centerY + rawY * scale;
        const alpha = Math.max(0.2, (z3d + rp.radius) / (rp.radius * 2));

        // Draw particle trail & particle
        ctx.fillStyle = palette.primary;
        ctx.shadowColor = palette.primary;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(x2d, y2d, rp.size * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [state, size]);

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ width: `${size}px`, height: `${size}px` }}
        className="select-none pointer-events-none drop-shadow-2xl"
      />
      {sublabel && (
        <div className="absolute bottom-2 text-center pointer-events-none">
          <span className="text-[10px] font-mono tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-surface/80 border border-border backdrop-blur-md text-foreground">
            {sublabel}
          </span>
        </div>
      )}
    </div>
  );
}
