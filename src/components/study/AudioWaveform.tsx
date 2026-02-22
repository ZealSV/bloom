"use client";

import { useEffect, useRef } from "react";

interface AudioWaveformProps {
  analyserNode: AnalyserNode | null;
  isActive: boolean;
}

export default function AudioWaveform({
  analyserNode,
  isActive,
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode || !isActive) {
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const barCount = 40;

    function draw() {
      if (!ctx || !canvas) return;
      animFrameRef.current = requestAnimationFrame(draw);

      analyserNode!.getByteFrequencyData(dataArray);

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, w, h);

      const barWidth = w / barCount;
      const gap = 2;
      const step = Math.floor(bufferLength / barCount);

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step] / 255;
        const barHeight = Math.max(2, value * h * 0.8);

        const x = i * barWidth + gap / 2;
        const y = (h - barHeight) / 2;

        ctx.fillStyle = `rgba(16, 185, 129, ${0.3 + value * 0.5})`;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth - gap, barHeight, 2);
        ctx.fill();
      }
    }

    draw();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [analyserNode, isActive]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-16"
      style={{ display: "block" }}
    />
  );
}
