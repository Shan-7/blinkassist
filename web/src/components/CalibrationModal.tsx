'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Target, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  RotateCcw, 
  Sparkles, 
  Sliders, 
  TrendingUp, 
  Clock, 
  Play, 
  Zap,
  ArrowRight
} from 'lucide-react';
import { audioFeedback } from '@/lib/speech';

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentADC: number;
  currentThreshold: number;
  onApplyThreshold: (high: number, low?: number) => void;
}

type CalibrationPhase = 'idle' | 'open_eyes' | 'closed_eyes' | 'complete';

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  isOpen,
  onClose,
  currentADC,
  currentThreshold,
  onApplyThreshold,
}) => {
  // Configurable calibration duration: default 60s total (30s open + 30s closed)
  const [durationMode, setDurationMode] = useState<60 | 20>(60);
  const phaseSeconds = durationMode / 2; // 30s or 10s per phase

  const [phase, setPhase] = useState<CalibrationPhase>('idle');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(phaseSeconds);
  
  // Recorded samples arrays
  const openSamplesRef = useRef<number[]>([]);
  const closedSamplesRef = useRef<number[]>([]);

  // Computed results
  // Computed results for BioAmp Butterworth bandpass filter
  const [openBaseline, setOpenBaseline] = useState<number>(0);
  const [closedPeak, setClosedPeak] = useState<number>(180);
  const [calculatedThreshold, setCalculatedThreshold] = useState<number>(currentThreshold || 100);
  const [calculatedReset, setCalculatedReset] = useState<number>(30);

  // Current live ADC reference to capture inside intervals
  const liveADCRef = useRef<number>(currentADC);
  useEffect(() => {
    liveADCRef.current = currentADC;
  }, [currentADC]);

  // Reset state when opening modal
  useEffect(() => {
    if (isOpen) {
      setPhase('idle');
      setSecondsRemaining(phaseSeconds);
      openSamplesRef.current = [];
      closedSamplesRef.current = [];
      setCalculatedThreshold(currentThreshold || 100);
    }
  }, [isOpen, phaseSeconds, currentThreshold]);

  // Main countdown & sampling timer
  useEffect(() => {
    if (phase !== 'open_eyes' && phase !== 'closed_eyes') return;

    // Collect sample every 50ms (20 Hz sampling for calibration stats)
    const sampleInterval = setInterval(() => {
      const val = liveADCRef.current;
      if (typeof val === 'number' && !isNaN(val)) {
        if (phase === 'open_eyes') {
          openSamplesRef.current.push(val);
        } else if (phase === 'closed_eyes') {
          closedSamplesRef.current.push(val);
        }
      }
    }, 50);

    // 1-second countdown clock
    const clockInterval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (phase === 'open_eyes') {
            // Transition to Phase 2 (Closed Eyes)
            audioFeedback.playTone(587.33, 'triangle', 0.25); // D5 chime cue
            setPhase('closed_eyes');
            return phaseSeconds;
          } else if (phase === 'closed_eyes') {
            // Transition to Complete
            audioFeedback.playSelectChime();
            finalizeCalibration();
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(sampleInterval);
      clearInterval(clockInterval);
    };
  }, [phase, phaseSeconds]);

  // Calculate final thresholds from collected data
  const finalizeCalibration = useCallback(() => {
    const openData = openSamplesRef.current;
    const closedData = closedSamplesRef.current;

    // 1. Calculate Open Eyes Baseline Noise Level (90th percentile of positive noise)
    let baseline = 20;
    if (openData.length > 5) {
      const sortedOpen = [...openData].sort((a, b) => a - b);
      const p90Index = Math.min(
        sortedOpen.length - 1,
        Math.floor(sortedOpen.length * 0.90)
      );
      baseline = Math.max(0, Math.round(sortedOpen[p90Index]));
    } else {
      baseline = Math.max(0, Math.round(liveADCRef.current || 20));
    }

    // 2. Calculate Closed Eyes / Blink Peak (90th percentile of deliberate blink samples)
    let peak = 180;
    if (closedData.length > 5) {
      const sortedClosed = [...closedData].sort((a, b) => a - b);
      const p90Index = Math.min(
        sortedClosed.length - 1,
        Math.floor(sortedClosed.length * 0.90)
      );
      peak = Math.round(sortedClosed[p90Index]);
    } else {
      peak = baseline + 150;
    }

    // Guarantee peak is strictly above baseline
    if (peak <= baseline + 30) {
      peak = baseline + 120;
    }

    // 3. Compute optimal decision threshold:
    // Placed at 50% between baseline noise and blink peak
    const delta = peak - baseline;
    const optimalThreshold = Math.max(40, Math.round(baseline + delta * 0.50));
    const optimalReset = Math.max(15, Math.round(optimalThreshold * 0.30));

    setOpenBaseline(baseline);
    setClosedPeak(peak);
    setCalculatedThreshold(optimalThreshold);
    setCalculatedReset(optimalReset);
    setPhase('complete');

    audioFeedback.speak(`Calibration complete. Recommended threshold is +${optimalThreshold}.`);
  }, []);

  const handleStartCalibration = () => {
    openSamplesRef.current = [];
    closedSamplesRef.current = [];
    setSecondsRemaining(phaseSeconds);
    audioFeedback.playTone(440, 'triangle', 0.2);
    setPhase('open_eyes');
  };

  const handleSkipToClosed = () => {
    audioFeedback.playTone(587.33, 'triangle', 0.25);
    setSecondsRemaining(phaseSeconds);
    setPhase('closed_eyes');
  };

  const handleFinishEarly = () => {
    finalizeCalibration();
  };

  const handleSaveAndApply = () => {
    onApplyThreshold(calculatedThreshold, calculatedReset);
    try {
      localStorage.setItem('blink_assist_calibrated_threshold', String(calculatedThreshold));
      localStorage.setItem('blink_assist_calibrated_reset', String(calculatedReset));
    } catch (_) {}
    onClose();
  };

  if (!isOpen) return null;

  const totalPhaseTime = phaseSeconds;
  const progressPercent = Math.max(0, Math.min(100, ((totalPhaseTime - secondsRemaining) / totalPhaseTime) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-xl glass-panel rounded-2xl border border-white/15 p-6 shadow-2xl relative flex flex-col gap-5 overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Personalized Blink Threshold Calibration</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {durationMode}s Session
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Calibrate open eye baseline & closed blink spikes to find your optimal threshold
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Live Sensor Signal Bar */}
        <div className="px-4 py-2.5 rounded-xl bg-slate-900/70 border border-white/10 flex items-center justify-between text-xs font-mono relative z-10">
          <div className="flex items-center gap-2 text-slate-300">
            <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>Live Filtered Signal:</span>
            <span className="text-cyan-300 font-bold text-sm">
              {currentADC >= 0 ? `+${currentADC.toFixed(1)}` : currentADC.toFixed(1)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-emerald-400">BioAmp Bandpass [0.5 - 19.5 Hz]</span>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* PHASE: IDLE (Start Screen)                                    */}
        {/* ------------------------------------------------------------- */}
        {phase === 'idle' && (
          <div className="flex flex-col gap-5 py-2 relative z-10">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border border-white/10 bg-white/5 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs">
                  <Eye className="w-4 h-4" />
                  <span>Phase 1: Open Eyes</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Relax and look at the screen for {phaseSeconds}s. Records resting electrode voltage.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-white/10 bg-white/5 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-purple-300 font-semibold text-xs">
                  <EyeOff className="w-4 h-4" />
                  <span>Phase 2: Closed / Blinks</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Blink naturally or close eyes for {phaseSeconds}s. Captures the blink amplitude.
                </p>
              </div>
            </div>

            {/* Duration Mode Selection */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/10 text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                Session Duration:
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDurationMode(60)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    durationMode === 60
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  1 Minute (Recommended)
                </button>
                <button
                  onClick={() => setDurationMode(20)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    durationMode === 20
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  Quick 20s
                </button>
              </div>
            </div>

            <button
              onClick={handleStartCalibration}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-95"
            >
              <Play className="w-4 h-4" />
              <span>Start {durationMode}s Guided Calibration</span>
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* PHASE: OPEN EYES (Step 1)                                     */}
        {/* ------------------------------------------------------------- */}
        {phase === 'open_eyes' && (
          <div className="flex flex-col items-center gap-5 py-4 text-center relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center text-cyan-300 shadow-xl shadow-cyan-500/20 animate-bounce">
              <Eye className="w-8 h-8" />
            </div>

            <div className="flex flex-col gap-1">
              <h4 className="text-lg font-black text-white">Step 1: Keep Eyes Open & Relaxed</h4>
              <p className="text-xs text-slate-300 max-w-sm">
                Look straight ahead at the screen naturally. Avoid squinting or deliberate hard blinks.
              </p>
            </div>

            {/* Countdown Clock & Circular Progress */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-4xl font-mono font-black text-cyan-400 tracking-wider">
                00:{secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {openSamplesRef.current.length} resting samples recorded
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-white/10">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <button
              onClick={handleSkipToClosed}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 underline underline-offset-4"
            >
              <span>Skip to Phase 2 (Closed Eyes)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* PHASE: CLOSED EYES / BLINKING (Step 2)                         */}
        {/* ------------------------------------------------------------- */}
        {phase === 'closed_eyes' && (
          <div className="flex flex-col items-center gap-5 py-4 text-center relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border-2 border-purple-400 flex items-center justify-center text-purple-300 shadow-xl shadow-purple-500/20 animate-pulse">
              <EyeOff className="w-8 h-8" />
            </div>

            <div className="flex flex-col gap-1">
              <h4 className="text-lg font-black text-white">Step 2: Close Eyes or Perform Natural Blinks</h4>
              <p className="text-xs text-slate-300 max-w-sm">
                Gently close your eyes or blink deliberately as you normally would to register your peak amplitude.
              </p>
            </div>

            {/* Countdown Clock */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-4xl font-mono font-black text-purple-400 tracking-wider">
                00:{secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {closedSamplesRef.current.length} blink samples recorded
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-white/10">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <button
              onClick={handleFinishEarly}
              className="px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-300 font-bold text-xs flex items-center gap-1.5 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Finish Early & Calculate</span>
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* PHASE: COMPLETE & RESULTS                                     */}
        {/* ------------------------------------------------------------- */}
        {phase === 'complete' && (
          <div className="flex flex-col gap-5 py-2 relative z-10 animate-fade-in">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-300">
              <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-400" />
              <div className="text-xs">
                <p className="font-bold text-emerald-200">Calibration Computed Successfully!</p>
                <p className="text-emerald-400/80">
                  Calculated threshold separates open eye baseline from deliberate blink spikes cleanly.
                </p>
              </div>
            </div>

            {/* Comparison Metrics Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 flex flex-col items-center text-center">
                <span className="text-[11px] text-slate-400 uppercase font-mono">Open Eyes</span>
                <span className="text-xl font-black text-cyan-400 font-mono mt-1">{openBaseline}</span>
                <span className="text-[10px] text-slate-500">Baseline Level</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 flex flex-col items-center text-center">
                <span className="text-[11px] text-slate-400 uppercase font-mono">Blink Peak</span>
                <span className="text-xl font-black text-purple-400 font-mono mt-1">{closedPeak}</span>
                <span className="text-[10px] text-slate-500">Peak Amplitude</span>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 flex flex-col items-center text-center">
                <span className="text-[11px] text-rose-300 uppercase font-mono font-bold">New Threshold</span>
                <span className="text-xl font-black text-rose-400 font-mono mt-1">{calculatedThreshold}</span>
                <span className="text-[10px] text-rose-300/70">Trigger Point</span>
              </div>
            </div>

            {/* Manual Threshold Slider Adjustment */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-rose-400" />
                  Fine-Tune Trigger Threshold:
                </span>
                <span className="font-mono text-rose-400 font-bold text-sm">
                  +{calculatedThreshold}
                </span>
              </div>

              <input
                type="range"
                min={Math.max(30, openBaseline + 15)}
                max={Math.max(150, closedPeak + 40)}
                step="5"
                value={calculatedThreshold}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCalculatedThreshold(val);
                  setCalculatedReset(Math.max(15, Math.round(val * 0.3)));
                }}
                className="w-full accent-rose-500 cursor-pointer"
              />

              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>Baseline Noise: +{openBaseline}</span>
                <span>Reset Trigger: ~+{calculatedReset}</span>
                <span>Blink Peak: +{closedPeak}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleStartCalibration}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Re-Calibrate</span>
              </button>

              <button
                onClick={handleSaveAndApply}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.01] active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Apply & Save Threshold ({calculatedThreshold})</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
