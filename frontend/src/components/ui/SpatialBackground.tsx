"use client";

import React, { useEffect, useRef } from "react";

export function SpatialBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    // Particle field initialization
    const particleCount = 70;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.5 + 0.5,
      speedX: (Math.random() - 0.5) * 0.25,
      speedY: (Math.random() - 0.5) * 0.25,
      opacity: Math.random() * 0.5 + 0.2,
      pulseSpeed: Math.random() * 0.02 + 0.005,
      pulseVal: Math.random() * Math.PI * 2,
    }));

    // Grid coordinates
    let time = 0;

    const render = () => {
      time += 0.01;
      ctx.clearRect(0, 0, width, height);

      // 1. Subtle radial ambient glows
      const grad1 = ctx.createRadialGradient(
        width * 0.2,
        height * 0.15,
        0,
        width * 0.2,
        height * 0.15,
        width * 0.45
      );
      grad1.addColorStop(0, "rgba(99, 102, 241, 0.07)"); // Indigo
      grad1.addColorStop(1, "rgba(9, 10, 15, 0)");
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const grad2 = ctx.createRadialGradient(
        width * 0.8,
        height * 0.8,
        0,
        width * 0.8,
        height * 0.8,
        width * 0.5
      );
      grad2.addColorStop(0, "rgba(168, 85, 247, 0.05)"); // Purple
      grad2.addColorStop(1, "rgba(9, 10, 15, 0)");
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      const grad3 = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        0,
        width * 0.5,
        height * 0.5,
        width * 0.35
      );
      grad3.addColorStop(0, "rgba(6, 182, 212, 0.04)"); // Cyan
      grad3.addColorStop(1, "rgba(9, 10, 15, 0)");
      ctx.fillStyle = grad3;
      ctx.fillRect(0, 0, width, height);

      // 2. Render subtle floating particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;
        p.pulseVal += p.pulseSpeed;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const currentOpacity = p.opacity + Math.sin(p.pulseVal) * 0.15;
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, currentOpacity)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-70" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f24380a_1px,transparent_1px),linear-gradient(to_bottom,#1f24380a_1px,transparent_1px)] bg-[size:32px_32px]" />
    </div>
  );
}
