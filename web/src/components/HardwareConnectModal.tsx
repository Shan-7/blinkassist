'use client';

import React, { useState } from 'react';
import { 
  X, 
  Usb, 
  Bluetooth, 
  Camera, 
  Sliders, 
  Check, 
  AlertCircle, 
  Activity, 
  Cpu, 
  Terminal 
} from 'lucide-react';
import { ConnectionMode } from '@/types';
import { hardwareBridge } from '@/lib/serial';

interface HardwareConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectionMode: ConnectionMode;
  setConnectionMode: (mode: ConnectionMode) => void;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  statusMessage: string;
  onConnectSerial: (baud: number) => void;
  onConnectBle: () => void;
  onDisconnect: () => void;
  onTriggerSimulate: (burst: number) => void;
  onSelectComputerVision?: () => void;
}

export const HardwareConnectModal: React.FC<HardwareConnectModalProps> = ({
  isOpen,
  onClose,
  connectionMode,
  setConnectionMode: _setConnectionMode,
  connectionStatus,
  statusMessage,
  onConnectSerial,
  onConnectBle,
  onDisconnect,
  onTriggerSimulate,
  onSelectComputerVision,
}) => {
  const [selectedBaud, setSelectedBaud] = useState<number>(115200);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg glass-panel rounded-2xl border border-white/15 p-6 shadow-2xl relative flex flex-col gap-5 overflow-hidden">
        
        {/* Glow behind modal */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Connect Hardware or Input Source
              </h3>
              <p className="text-xs text-slate-400">
                Choose how blink data is sent to the CogniText interface
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

        {/* Status Banner */}
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs relative z-10 ${
            connectionStatus === 'connected'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : connectionStatus === 'connecting'
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 animate-pulse'
              : connectionStatus === 'error'
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              : 'bg-slate-900/60 border-white/10 text-slate-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-400'
                  : connectionStatus === 'connecting'
                  ? 'bg-amber-400'
                  : connectionStatus === 'error'
                  ? 'bg-rose-400'
                  : 'bg-slate-500'
              }`}
            />
            <span className="font-semibold capitalize">{connectionStatus}:</span>
            <span>{statusMessage}</span>
          </div>

          {connectionStatus === 'connected' && (
            <button
              onClick={onDisconnect}
              className="text-xs px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
            >
              <span>Disconnect &amp; Release Port</span>
            </button>
          )}
        </div>

        {/* Connection Options List */}
        <div className="flex flex-col gap-3 relative z-10">
          
          {/* 1. USB Web Serial (Arduino / BioAmp) */}
          <div
            className={`p-4 rounded-xl border transition-all flex flex-col gap-3 ${
              connectionMode === 'serial' && connectionStatus === 'connected'
                ? 'bg-purple-950/40 border-purple-500/50'
                : 'glass-card border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
                  <Usb className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Arduino USB Serial (Web Serial API)</h4>
                  <p className="text-xs text-slate-400">Direct USB cable to Uno, Nano, Mega, or ESP32</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedBaud}
                  onChange={(e) => setSelectedBaud(Number(e.target.value))}
                  className="bg-slate-900 text-xs text-slate-200 border border-white/10 rounded-lg px-2 py-1 outline-none"
                >
                  <option value={115200}>115200 baud</option>
                  <option value={9600}>9600 baud</option>
                  <option value={57600}>57600 baud</option>
                </select>

                <button
                  onClick={() => onConnectSerial(selectedBaud)}
                  className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                >
                  Connect
                </button>
              </div>
            </div>
          </div>

          {/* 2. Web Bluetooth BLE (ESP32 / M2W) */}
          <div
            className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
              connectionMode === 'ble' && connectionStatus === 'connected'
                ? 'bg-purple-950/40 border-purple-500/50'
                : 'glass-card border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
                <Bluetooth className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Bluetooth Low Energy (BLE)</h4>
                <p className="text-xs text-slate-400">Wireless connection to ESP32 / BioAmp</p>
              </div>
            </div>

            <button
              onClick={onConnectBle}
              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              Scan BLE
            </button>
          </div>

          {/* 3. Computer Vision AI (Webcam FaceMesh) */}
          <div className="p-4 rounded-xl glass-card border border-cyan-500/30 bg-cyan-950/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Webcam Computer Vision</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    AI FaceMesh
                  </span>
                </h4>
                <p className="text-xs text-slate-400">Detect blinks via camera without hardware sensors</p>
              </div>
            </div>

            {onSelectComputerVision && (
              <button
                onClick={() => {
                  onSelectComputerVision();
                  onClose();
                }}
                className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
              >
                Switch to CV
              </button>
            )}
          </div>

          {/* 3. Simulator Mode & Testing Shortcuts */}
          <div className="p-4 rounded-xl glass-card border-white/10 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Hardware Simulation & Testing</h4>
                  <p className="text-xs text-slate-400">Test the assistive board without physical sensors</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onTriggerSimulate(2)}
                  className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-semibold active:scale-95"
                >
                  ⚡ 2x Blink
                </button>
                <button
                  onClick={() => onTriggerSimulate(3)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 text-xs font-semibold active:scale-95"
                >
                  ✨ 3x Blink
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 italic">
              Tip: Press keyboard key <strong>&quot;2&quot;</strong> anytime for double blink, or <strong>&quot;3&quot;</strong> for triple blink.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
