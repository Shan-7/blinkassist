'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Activity, Sliders, Zap, ShieldAlert, Play, Square, RotateCcw, Target } from 'lucide-react';

interface OscilloscopeProps {
  rawData: number;
  threshold: number;
  setThreshold: (val: number) => void;
  isSimulating: boolean;
  setIsSimulating: (val: boolean) => void;
  onOpenCalibration?: () => void;
}

export const Oscilloscope: React.FC<OscilloscopeProps> = ({
  rawData,
  threshold,
  setThreshold,
  isSimulating,
  setIsSimulating,
  onOpenCalibration,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dataPointsRef = useRef<number[]>([]);
  const [spikeCount, setSpikeCount] = useState(0);
  const [currentVal, setCurrentVal] = useState(0);

  // Initialize buffer centered at 0 (Butterworth bandpass filter baseline)
  useEffect(() => {
    dataPointsRef.current = new Array(240).fill(0);
  }, []);

  // Update buffer on raw data
  useEffect(() => {
    if (rawData !== undefined && !isNaN(rawData)) {
      setCurrentVal(rawData);
      dataPointsRef.current.push(rawData);
      if (dataPointsRef.current.length > 240) {
        dataPointsRef.current.shift();
      }
      if (rawData > threshold) {
        setSpikeCount((prev) => prev + 1);
      }
    }
  }, [rawData, threshold]);

  // Canvas drawing loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let simTick = 0;

    const render = () => {
      // Simulate BioAmp EXG Pill Butterworth bandpass waveform (0 baseline + biphasic blink spikes)
      if (isSimulating) {
        simTick++;
        let val = Math.sin(simTick * 0.12) * 15 + (Math.random() - 0.5) * 20;
        // Periodic intentional blink spike (biphasic: shoots up to +180, dips to -110, settles to 0)
        const phaseInCycle = simTick % 120;
        if (phaseInCycle >= 0 && phaseInCycle < 6) {
          val += 180 * Math.sin((phaseInCycle / 6) * Math.PI);
        } else if (phaseInCycle >= 6 && phaseInCycle < 12) {
          val -= 100 * Math.sin(((phaseInCycle - 6) / 6) * Math.PI);
        }

        setCurrentVal(Math.round(val));
        dataPointsRef.current.push(val);
        if (dataPointsRef.current.length > 240) {
          dataPointsRef.current.shift();
        }
      }

      const w = canvas.width;
      const h = canvas.height;

      // Dark background
      ctx.fillStyle = '#0a0f1d';
      ctx.fillRect(0, 0, w, h);

      // Draw oscilloscope grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      const gridStep = 30;
      for (let x = 0; x < w; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Coordinate mapping for Bipolar BioAmp EXG Pill signal (-320 to +320)
      const Y_MAX = 320;
      const toY = (val: number) => (h / 2) - (val / Y_MAX) * (h / 2 - 25);

      // Draw 0 Baseline (Center Line)
      const centerY = toY(0);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(w, centerY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(6, 182, 212, 0.5)';
      ctx.font = '9px monospace';
      ctx.fillText('0 (BASELINE)', 10, centerY - 4);
      ctx.fillText('+200', 10, toY(200) - 3);
      ctx.fillText('-200', 10, toY(-200) + 11);

      // Draw Threshold line (Pink dashed line)
      const thresholdY = toY(threshold);
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(0, thresholdY);
      ctx.lineTo(w, thresholdY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label on threshold
      ctx.fillStyle = '#f43f5e';
      ctx.font = '10px monospace';
      ctx.fillText(`TRIGGER THRESHOLD: +${threshold}`, 10, thresholdY - 6);

      // Draw EOG Waveform with neon glow
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      const pts = dataPointsRef.current;
      const sliceWidth = w / (pts.length - 1);

      pts.forEach((val, i) => {
        const y = toY(val);
        const x = i * sliceWidth;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
      ctx.shadowBlur = 0; // reset shadow

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [threshold, isSimulating]);

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* Top Controls & Metrics */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4 border border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>BioAmp EXG Pill Real-Time Oscilloscope</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Bandpass [0.5 - 19.5 Hz] @ 75 Hz
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Visualizes Butterworth 4th-order filtered EOG blink potentials in real time at 115200 baud.
            </p>
          </div>
        </div>

        {/* Quick Simulator & Calibration Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
          {onOpenCalibration && (
            <button
              onClick={onOpenCalibration}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-md shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
            >
              <Target className="w-3.5 h-3.5" />
              <span>🎯 Calibrate Threshold (1-Min)</span>
            </button>
          )}

          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              isSimulating
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isSimulating ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isSimulating ? 'Stop Simulator' : 'Simulate EOG Signal'}</span>
          </button>
        </div>
      </div>

      {/* Canvas View & Threshold Slider */}
      <div className="glass-panel rounded-2xl p-5 border border-white/10 flex flex-col gap-4">
        
        {/* Canvas Display */}
        <div className="w-full h-64 sm:h-80 rounded-xl overflow-hidden border border-cyan-500/30 relative shadow-inner">
          <canvas
            ref={canvasRef}
            width={800}
            height={360}
            className="w-full h-full object-cover"
          />

          {/* Real-time Value HUD Badge */}
          <div className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 backdrop-blur-md flex items-center gap-2 font-mono text-xs text-cyan-300">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Signal: {currentVal >= 0 ? `+${currentVal.toFixed(1)}` : currentVal.toFixed(1)}</span>
            <span className="text-slate-500">|</span>
            <span className="text-emerald-400">BioAmp Bandpass</span>
          </div>
        </div>

        {/* Sensitivity & Threshold Slider */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-300 w-full sm:w-auto">
            <div className="flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-rose-400" />
              <span>Blink Spike Threshold:</span>
              <span className="font-mono text-rose-400 font-bold">+{threshold}</span>
            </div>

            {onOpenCalibration && (
              <button
                onClick={onOpenCalibration}
                className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 underline underline-offset-2 flex items-center gap-1"
              >
                <span>Auto-Calibrate</span>
              </button>
            )}
          </div>

          <div className="w-full sm:w-80 flex items-center gap-3">
            <span className="text-xs font-mono text-slate-500">+30</span>
            <input
              type="range"
              min="30"
              max="250"
              step="5"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
            <span className="text-xs font-mono text-slate-500">+250</span>
          </div>
        </div>

      </div>

    </div>
  );
};
