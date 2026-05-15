"use client";

import { useRef } from "react";
import { useMapleLeaves } from "@/hooks/useMapleLeaves";

export function MapleLeaves() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useMapleLeaves(canvasRef, true);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-[1] pointer-events-none"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
