"use client";

import { useEffect, useRef } from "react";

interface Leaf {
  x: number;
  y: number;
  size: number;
  speed: number;
  amplitude: number;
  frequency: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  phase: number;
}

/**
 * Canvas 2D 枫叶粒子系统
 * 在指定容器中渲染枫叶飘落动画
 */
export function useMapleLeaves(canvasRef: React.RefObject<HTMLCanvasElement | null>, active = true) {
  const leavesRef = useRef<Leaf[]>([]);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = "/assets/ui/particles/particle-maple.png";

    // 初始化叶子
    if (leavesRef.current.length === 0) {
      for (let i = 0; i < 12; i++) {
        leavesRef.current.push(createLeaf(canvas.width));
      }
    }

    let lastTime = performance.now();
    const animate = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1); // cap delta
      lastTime = time;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const leaf of leavesRef.current) {
        // 更新位置
        leaf.y += leaf.speed * dt;
        leaf.x += Math.sin(time * 0.001 * leaf.frequency + leaf.phase) * leaf.amplitude * dt;
        leaf.rotation += leaf.rotationSpeed * dt;

        // 超出底部则重生
        if (leaf.y > canvas.height + 50) {
          Object.assign(leaf, createLeaf(canvas.width));
          leaf.y = -50;
        }

        // 绘制
        ctx.save();
        ctx.globalAlpha = leaf.opacity;
        ctx.translate(leaf.x, leaf.y);
        ctx.rotate(leaf.rotation);
        if (img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, -leaf.size / 2, -leaf.size / 2, leaf.size, leaf.size);
        } else {
          // 占位: 绘制枫叶形状
          ctx.fillStyle = "#8b3a3a";
          ctx.beginPath();
          ctx.moveTo(0, -leaf.size / 2);
          ctx.bezierCurveTo(leaf.size / 3, -leaf.size / 4, leaf.size / 3, leaf.size / 4, 0, leaf.size / 2);
          ctx.bezierCurveTo(-leaf.size / 3, leaf.size / 4, -leaf.size / 3, -leaf.size / 4, 0, -leaf.size / 2);
          ctx.fill();
        }
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    // 处理 canvas 尺寸
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resize();
    window.addEventListener("resize", resize);
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [canvasRef, active]);
}

function createLeaf(maxX: number): Leaf {
  return {
    x: Math.random() * maxX,
    y: -50 - Math.random() * 200,
    size: 24 + Math.random() * 16, // 24-40px
    speed: 30 + Math.random() * 30, // 30-60 px/s
    amplitude: 8 + Math.random() * 10, // 8-18px
    frequency: 0.5 + Math.random() * 1.0,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (20 + Math.random() * 40) * (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 180),
    opacity: 0.25 + Math.random() * 0.3, // 0.25-0.55
    phase: Math.random() * Math.PI * 2,
  };
}
