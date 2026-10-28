'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Camera, 
  CameraOff, 
  Sliders, 
  Eye, 
  CheckCircle2, 
  Zap, 
  Sparkles, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  RefreshCw, 
  ShieldCheck, 
  AlertCircle,
  Cpu,
  Layers,
  Activity
} from 'lucide-react';

interface CameraVisionWindowProps {
  onBlinkBurst: (count: number) => void;
  onRawEarValue?: (ear: number) => void;
  onSwitchToHardware: () => void;
  menuActive: boolean;
  currentTargetName?: string;
  isDarkMode?: boolean;
}

// MediaPipe 468-point FaceMesh indices for EAR (Eye Aspect Ratio) calculation
// Matches exactly the python implementation in blink_detector_camera.py
const LEFT_EYE_EAR_INDICES = [362, 385, 387, 263, 373, 380];
const RIGHT_EYE_EAR_INDICES = [33, 160, 158, 133, 153, 144];

// Full contour landmarks for visual cyber eye rendering
const LEFT_EYE_CONTOUR = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];
const RIGHT_EYE_CONTOUR = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];

function euclideanDistance(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function calculateEAR(
  landmarks: { x: number; y: number }[],
  indices: number[],
  w: number,
  h: number
): number {
  const pts = indices.map((idx) => ({
    x: landmarks[idx].x * w,
    y: landmarks[idx].y * h,
  }));
  const [p1, p2, p3, p4, p5, p6] = pts;
  const vertical1 = euclideanDistance(p2, p6);
  const vertical2 = euclideanDistance(p3, p5);
  const horizontal = euclideanDistance(p1, p4);
  if (horizontal === 0) return 0;
  return (vertical1 + vertical2) / (2.0 * horizontal);
}

export const CameraVisionWindow: React.FC<CameraVisionWindowProps> = ({
  onBlinkBurst,
  onRawEarValue,
  onSwitchToHardware,
  menuActive,
  currentTargetName,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceMeshRef = useRef<any>(null);
  const isRunningRef = useRef<boolean>(false);
  const animFrameRef = useRef<number | null>(null);

  // Configuration State
  const [earThreshold, setEarThreshold] = useState<number>(0.21);
  const [consecFramesReq, setConsecFramesReq] = useState<number>(2);
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Runtime Tracking State
  const [modelLoading, setModelLoading] = useState<boolean>(true);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentEar, setCurrentEar] = useState<number>(0);
  const [eyesClosed, setEyesClosed] = useState<boolean>(false);
  const [burstCountVisual, setBurstCountVisual] = useState<number>(0);
  const [burstFeedback, setBurstFeedback] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(0);

  // Ref tracking for detection math
  const consecClosedFramesRef = useRef<number>(0);
  const isEyeClosedStateRef = useRef<boolean>(false);
  const burstCountRef = useRef<number>(0);
  const lastBlinkTimeRef = useRef<number>(0);
  const burstTimerRef = useRef<any>(null);
  const earThresholdRef = useRef<number>(earThreshold);
  const consecFramesReqRef = useRef<number>(consecFramesReq);
  const fpsFrameCountRef = useRef<number>(0);
  const fpsLastTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    earThresholdRef.current = earThreshold;
  }, [earThreshold]);

  useEffect(() => {
    consecFramesReqRef.current = consecFramesReq;
  }, [consecFramesReq]);

  // Burst handling: Same logic as config.py / blink_detector_camera.py
  // 1 blink: ignored (natural blink)
  // 2 blinks within 600ms: double blink -> onBlinkBurst(2) (Cycle)
  // 3+ blinks within 600ms: triple blink -> onBlinkBurst(3) (Select)
  const finalizeBurst = useCallback(() => {
    const count = burstCountRef.current;
    burstCountRef.current = 0;
    setBurstCountVisual(0);
    burstTimerRef.current = null;

    if (count <= 0) return;

    if (count === 1) {
      setBurstFeedback('Natural blink ignored (Double blink to navigate)');
      setTimeout(() => setBurstFeedback(null), 1200);
      return;
    }

    if (count === 2) {
      setBurstFeedback('⚡ 2x Double Blink -> Cycle Next');
      onBlinkBurst(2);
      setTimeout(() => setBurstFeedback(null), 2000);
    } else if (count >= 3) {
      setBurstFeedback('✨ 3x Triple Blink -> SELECTED!');
      onBlinkBurst(3);
      setTimeout(() => setBurstFeedback(null), 2500);
    }
  }, [onBlinkBurst]);

  const registerRawBlink = useCallback(() => {
    const now = Date.now();
    const gap = now - lastBlinkTimeRef.current;

    // If gap was larger than 650ms, close previous burst
    if (burstCountRef.current > 0 && gap > 650) {
      burstCountRef.current = 0;
    }

    burstCountRef.current += 1;
    lastBlinkTimeRef.current = now;
    const currentCount = burstCountRef.current;
    setBurstCountVisual(currentCount);

    if (currentCount === 1) {
      setBurstFeedback('⚡ 1x Blink detected... (Blink again for Double Blink)');
    } else if (currentCount === 2) {
      setBurstFeedback('⚡⚡ 2x Double Blink detected! (Cycle pending...)');
    } else if (currentCount >= 3) {
      setBurstFeedback('✨✨✨ 3x Triple Blink detected! (Select pending...)');
    }

    if (burstTimerRef.current) {
      clearTimeout(burstTimerRef.current);
    }

    burstTimerRef.current = setTimeout(() => {
      finalizeBurst();
    }, 550); // 550ms timeout window to finalize burst
  }, [finalizeBurst]);

  // Dynamically load external scripts from CDN
  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.crossOrigin = 'anonymous';
      s.onload = () => resolve();
      s.onerror = (err) => reject(err);
      document.head.appendChild(s);
    });
  };

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    isRunningRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Process results from FaceMesh
  const onResults = useCallback((results: any) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Keep canvas resolution synced to video display
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Calculate FPS
    fpsFrameCountRef.current += 1;
    const now = Date.now();
    if (now - fpsLastTimeRef.current >= 1000) {
      setFps(fpsFrameCountRef.current);
      fpsFrameCountRef.current = 0;
      fpsLastTimeRef.current = now;
    }

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      setFaceDetected(true);
      const landmarks = results.multiFaceLandmarks[0];

      // Calculate EAR for both eyes
      const leftEar = calculateEAR(landmarks, LEFT_EYE_EAR_INDICES, w, h);
      const rightEar = calculateEAR(landmarks, RIGHT_EYE_EAR_INDICES, w, h);
      const avgEar = (leftEar + rightEar) / 2.0;
      const roundedEar = Math.round(avgEar * 1000) / 1000;
      setCurrentEar(roundedEar);

      // Pass raw bio-potential equivalent to parent for Oscilloscope
      if (onRawEarValue) {
        // Map EAR into pseudo-microvolts for oscilloscope visualization:
        // When eyes close, EAR dips -> inverted waveform creates a positive blink spike!
        const normalizedSpike = Math.round(Math.max(0, (0.35 - avgEar) * 800));
        onRawEarValue(normalizedSpike);
      }

      const isClosed = avgEar < earThresholdRef.current;
      setEyesClosed(isClosed);

      // Raw blink detection with consecutive frame filter
      if (isClosed) {
        consecClosedFramesRef.current += 1;
        if (consecClosedFramesRef.current >= consecFramesReqRef.current) {
          isEyeClosedStateRef.current = true;
        }
      } else {
        if (isEyeClosedStateRef.current && consecClosedFramesRef.current >= consecFramesReqRef.current) {
          registerRawBlink();
        }
        isEyeClosedStateRef.current = false;
        consecClosedFramesRef.current = 0;
      }

      // Draw Eye Visualizations
      ctx.save();
      if (isMirrored) {
        ctx.scale(-1, 1);
        ctx.translate(-w, 0);
      }

      // Render Eye Contours
      const drawContour = (indices: number[], color: string) => {
        ctx.beginPath();
        indices.forEach((idx, i) => {
          const pt = landmarks[idx];
          const px = pt.x * w;
          const py = pt.y * h;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      };

      // Draw EAR Keypoints
      const drawPoints = (indices: number[], color: string) => {
        indices.forEach((idx) => {
          const pt = landmarks[idx];
          const px = pt.x * w;
          const py = pt.y * h;
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        });
      };

      // Draw vertical EAR connecting lines
      const drawEarLines = (indices: number[]) => {
        const pts = indices.map((idx) => ({
          x: landmarks[idx].x * w,
          y: landmarks[idx].y * h,
        }));
        ctx.beginPath();
        ctx.moveTo(pts[1].x, pts[1].y);
        ctx.lineTo(pts[5].x, pts[5].y);
        ctx.moveTo(pts[2].x, pts[2].y);
        ctx.lineTo(pts[4].x, pts[4].y);
        ctx.strokeStyle = isClosed ? '#f43f5e' : '#06b6d4';
        ctx.lineWidth = 1;
        ctx.stroke();
      };

      const eyeColor = isClosed ? '#ef4444' : '#22d3ee';
      drawContour(LEFT_EYE_CONTOUR, eyeColor);
      drawContour(RIGHT_EYE_CONTOUR, eyeColor);
      drawPoints(LEFT_EYE_EAR_INDICES, isClosed ? '#f43f5e' : '#38bdf8');
      drawPoints(RIGHT_EYE_EAR_INDICES, isClosed ? '#f43f5e' : '#38bdf8');
      drawEarLines(LEFT_EYE_EAR_INDICES);
      drawEarLines(RIGHT_EYE_EAR_INDICES);

      // If closed, draw glowing halo around eyes
      if (isClosed) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.lineWidth = 4;
        drawContour(LEFT_EYE_CONTOUR, 'rgba(239, 68, 68, 0.4)');
        drawContour(RIGHT_EYE_CONTOUR, 'rgba(239, 68, 68, 0.4)');
      }

      ctx.restore();
    } else {
      setFaceDetected(false);
      consecClosedFramesRef.current = 0;
      isEyeClosedStateRef.current = false;
    }
  }, [isMirrored, registerRawBlink, onRawEarValue]);

  // Main camera loop
  const startCameraLoop = useCallback(() => {
    const processFrame = async () => {
      if (!isRunningRef.current || !videoRef.current || !faceMeshRef.current) {
        return;
      }
      if (videoRef.current.readyState >= 2) {
        try {
          await faceMeshRef.current.send({ image: videoRef.current });
        } catch (_) {}
      }
      if (isRunningRef.current) {
        animFrameRef.current = requestAnimationFrame(processFrame);
      }
    };
    animFrameRef.current = requestAnimationFrame(processFrame);
  }, []);

  // Initialize MediaPipe FaceMesh & Camera
  const startCamera = useCallback(async () => {
    try {
      setErrorMessage(null);
      setModelLoading(true);

      // Load MediaPipe FaceMesh from CDN if needed
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js');

      const win = window as any;
      if (!win.FaceMesh) {
        throw new Error('MediaPipe FaceMesh failed to initialize from library.');
      }

      // Create FaceMesh instance if not exists
      if (!faceMeshRef.current) {
        const faceMesh = new win.FaceMesh({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });

        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        faceMesh.onResults(onResults);
        faceMeshRef.current = faceMesh;
      }

      // Request User Webcam
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraActive(true);
          setModelLoading(false);
          isRunningRef.current = true;
          startCameraLoop();
        };
      }
    } catch (err: any) {
      console.error('Failed to start camera:', err);
      setModelLoading(false);
      setCameraActive(false);
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in browser permissions.'
          : err.message || 'Could not access camera device.'
      );
    }
  }, [onResults, startCameraLoop]);

  // Boot on mount, clean up on unmount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (burstTimerRef.current) {
        clearTimeout(burstTimerRef.current);
      }
    };
  }, [startCamera, stopCamera]);

  return (
    <div className="w-full glass-panel rounded-2xl border border-cyan-500/30 p-4 sm:p-5 shadow-2xl relative overflow-hidden transition-all duration-300">
      
      {/* Background Cyber Ambient Glow */}
      <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3 relative z-10">
        
        {/* Title & Live Status */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
            <Camera className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Computer Vision Eye Tracker</span>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  MediaPipe FaceMesh AI
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              {cameraActive 
                ? `60 FPS EAR Tracker • ${fps} FPS processing • ${faceDetected ? 'Face Locked' : 'Searching for face...'}`
                : 'Initializing camera hardware...'}
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          
          {/* Quick Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-xl text-xs font-semibold border transition-all ${
              showSettings
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-800/80 text-slate-300 border-white/10 hover:bg-slate-800'
            }`}
            title="Tuning Settings (Threshold, Mirror, Filters)"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Minimize / Expand Toggle */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 rounded-xl text-xs font-semibold bg-slate-800/80 text-slate-300 border border-white/10 hover:bg-slate-800 transition-all"
            title={isMinimized ? 'Expand Camera Window' : 'Minimize Camera Window'}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>

          {/* Switch to Hardware Mode Button */}
          <button
            onClick={onSwitchToHardware}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
            title="Switch input source to Arduino USB Serial / BLE"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Switch to Hardware</span>
          </button>
        </div>

      </div>

      {/* Main Body Content */}
      {!isMinimized && (
        <div className="flex flex-col lg:flex-row gap-5 mt-4 relative z-10">
          
          {/* Left: Video Preview Window with Canvas Landmark Overlay */}
          <div className="w-full lg:w-7/12 flex flex-col gap-2">
            
            <div className="relative w-full aspect-[4/3] max-h-[380px] rounded-xl overflow-hidden bg-slate-950 border border-white/10 flex items-center justify-center shadow-inner group">
              
              {/* Hidden HTML Video Element (source for FaceMesh) */}
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className={`absolute inset-0 w-full h-full object-cover ${
                  isMirrored ? 'scale-x-[-1]' : ''
                } ${cameraActive ? 'opacity-90' : 'opacity-0'}`}
              />

              {/* Render Canvas Overlay for FaceMesh & EAR telemetry */}
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
              />

              {/* Loading State Spinner */}
              {modelLoading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-950/80 backdrop-blur-sm p-4 text-center">
                  <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Loading Vision Model...</h4>
                    <p className="text-xs text-slate-400">Loading WebAssembly FaceMesh neural weights</p>
                  </div>
                </div>
              )}

              {/* Error State Banner */}
              {errorMessage && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-950/90 backdrop-blur-sm p-6 text-center">
                  <AlertCircle className="w-10 h-10 text-rose-500" />
                  <div className="max-w-xs">
                    <h4 className="text-sm font-bold text-white">Camera Access Error</h4>
                    <p className="text-xs text-rose-300 mt-1">{errorMessage}</p>
                  </div>
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Retry Camera</span>
                  </button>
                </div>
              )}

              {/* Live HUD Badges on Top of Video */}
              {cameraActive && (
                <>
                  {/* Top-left: Face Status */}
                  <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                    <div
                      className={`px-2.5 py-1 rounded-lg backdrop-blur-md text-[11px] font-bold flex items-center gap-1.5 border shadow-sm ${
                        faceDetected
                          ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                          : 'bg-amber-950/70 border-amber-500/40 text-amber-300 animate-pulse'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${faceDetected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      <span>{faceDetected ? 'FACE TRACKED' : 'ALIGN FACE'}</span>
                    </div>

                    <div
                      className={`px-2.5 py-1 rounded-lg backdrop-blur-md text-[11px] font-bold flex items-center gap-1.5 border shadow-sm ${
                        eyesClosed
                          ? 'bg-rose-950/80 border-rose-500/50 text-rose-300 animate-pulse'
                          : 'bg-slate-900/80 border-cyan-500/30 text-cyan-300'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{eyesClosed ? 'EYES CLOSED' : 'EYES OPEN'}</span>
                    </div>
                  </div>

                  {/* Top-right: Real-time EAR metric */}
                  <div className="absolute top-3 right-3 z-20 px-3 py-1 rounded-lg backdrop-blur-md bg-slate-900/80 border border-white/15 text-xs font-mono font-bold text-white flex items-center gap-1.5">
                    <span className="text-slate-400">EAR:</span>
                    <span className={currentEar < earThreshold ? 'text-rose-400' : 'text-emerald-400'}>
                      {currentEar.toFixed(3)}
                    </span>
                  </div>

                  {/* Bottom Center: Active Burst Flasher */}
                  {burstFeedback && (
                    <div className="absolute bottom-4 inset-x-4 z-20 flex justify-center">
                      <div className="px-4 py-2 rounded-xl backdrop-blur-md bg-slate-900/90 border border-cyan-400/60 text-cyan-200 text-xs sm:text-sm font-bold shadow-xl animate-bounce flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        <span>{burstFeedback}</span>
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>

            {/* Quick Status Bar below camera */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Webcam Vision Active (Native WebRTC + WASM)</span>
              </span>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsMirrored(!isMirrored)}
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{isMirrored ? 'Mirrored' : 'Normal'}</span>
                </button>
              </div>
            </div>

          </div>

          {/* Right: Metrics, Threshold Calibration, and Burst Feedback */}
          <div className="w-full lg:w-5/12 flex flex-col justify-between gap-4">
            
            {/* Live Burst Counter Gauge */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Blink Burst Meter</span>
                </span>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {burstCountVisual === 0 ? 'READY' : `${burstCountVisual} BLINK${burstCountVisual > 1 ? 'S' : ''}`}
                </span>
              </div>

              {/* 3-Step Visual Burst Gauge */}
              <div className="grid grid-cols-3 gap-2">
                <div
                  className={`p-2.5 rounded-lg border flex flex-col items-center text-center gap-1 transition-all ${
                    burstCountVisual >= 1
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md'
                      : 'bg-slate-950/40 border-white/5 text-slate-500'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase">1x Blink</span>
                  <span className="text-xs font-extrabold">Involuntary</span>
                </div>

                <div
                  className={`p-2.5 rounded-lg border flex flex-col items-center text-center gap-1 transition-all ${
                    burstCountVisual >= 2
                      ? 'bg-purple-500/30 border-purple-400 text-purple-200 shadow-md scale-105'
                      : 'bg-slate-950/40 border-white/5 text-slate-500'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase">2x Double</span>
                  <span className="text-xs font-extrabold">Cycle Next</span>
                </div>

                <div
                  className={`p-2.5 rounded-lg border flex flex-col items-center text-center gap-1 transition-all ${
                    burstCountVisual >= 3
                      ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200 shadow-md scale-105 animate-pulse'
                      : 'bg-slate-950/40 border-white/5 text-slate-500'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase">3x Triple</span>
                  <span className="text-xs font-extrabold">Select</span>
                </div>
              </div>

              {/* Interaction Instructions */}
              <div className="p-3 rounded-lg bg-slate-950/60 border border-white/5 text-[11px] text-slate-300 flex flex-col gap-1 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                  <Activity className="w-3.5 h-3.5" />
                  <span>CogniText Interaction Rules:</span>
                </div>
                <div>• <strong>Double Blink</strong> (2 intentional blinks): Activates the board or advances to the next card.</div>
                <div>• <strong>Triple Blink</strong> (3 intentional blinks): Confirms and announces the highlighted card!</div>
                <div>• Normal involuntary single blinks are ignored automatically to prevent accidental triggers.</div>
              </div>
            </div>

            {/* EAR Threshold Meter & Sensitivity Slider */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>EAR Sensitivity Calibration</span>
                </span>
                <span className="text-xs font-mono font-bold text-cyan-300">
                  Cutoff: {earThreshold.toFixed(2)}
                </span>
              </div>

              {/* Real-time Visual EAR Gauge bar */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>0.00 (Closed)</span>
                  <span className="text-amber-400">Threshold ({earThreshold.toFixed(2)})</span>
                  <span>0.40+ (Open)</span>
                </div>

                <div className="w-full h-4 rounded-full bg-slate-950 border border-white/10 relative overflow-hidden">
                  {/* Threshold vertical marker line */}
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-amber-400 z-10 shadow-lg shadow-amber-400/50"
                    style={{ left: `${Math.min(100, (earThreshold / 0.4) * 100)}%` }}
                  />

                  {/* Current EAR Bar fill */}
                  <div
                    className={`h-full transition-all duration-75 rounded-full ${
                      currentEar < earThreshold
                        ? 'bg-gradient-to-r from-rose-600 to-red-500'
                        : 'bg-gradient-to-r from-cyan-600 via-indigo-500 to-emerald-400'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, (currentEar / 0.4) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Sensitivity slider */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Sensitivity Slider</span>
                  <span className="text-slate-300 font-semibold">
                    {earThreshold <= 0.18 ? 'Less Sensitive' : earThreshold >= 0.25 ? 'More Sensitive' : 'Balanced (Default)'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.14"
                  max="0.30"
                  step="0.01"
                  value={earThreshold}
                  onChange={(e) => setEarThreshold(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              {/* Consecutive frames tuning (accordion or sub-setting) */}
              {showSettings && (
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Consecutive Closed Frames:</span>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3].map((f) => (
                      <button
                        key={f}
                        onClick={() => setConsecFramesReq(f)}
                        className={`px-2.5 py-0.5 rounded-md text-xs font-bold transition-all ${
                          consecFramesReq === f
                            ? 'bg-cyan-500 text-slate-950 shadow-sm'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {f}f
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
};
