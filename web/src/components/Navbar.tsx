'use client';

import React from 'react';
import { 
  Activity, 
  Usb, 
  Bluetooth, 
  Camera, 
  Volume2, 
  VolumeX, 
  Sun, 
  Moon, 
  Sliders, 
  Cpu, 
  MessageSquare, 
  Power,
  Tv,
  HelpCircle,
  FileCode,
  Target
} from 'lucide-react';
import { ConnectionMode, InputSourceMode } from '@/types';

interface NavbarProps {
  activeTab: 'communication' | 'devices' | 'oscilloscope' | 'guide';
  setActiveTab: (tab: 'communication' | 'devices' | 'oscilloscope' | 'guide') => void;
  inputSourceMode: InputSourceMode;
  onToggleInputMode: (mode: InputSourceMode) => void;
  connectionMode: ConnectionMode;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  statusMessage: string;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  isMuted: boolean;
  setIsMuted: (val: boolean) => void;
  onOpenConnectModal: () => void;
  onOpenCalibration?: () => void;
  onDisconnect?: () => void;
  menuActive: boolean;
  burstIndicator: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  inputSourceMode,
  onToggleInputMode,
  connectionMode,
  connectionStatus,
  statusMessage,
  isDarkMode,
  setIsDarkMode,
  isMuted,
  setIsMuted,
  onOpenConnectModal,
  onOpenCalibration,
  onDisconnect,
  menuActive,
  burstIndicator,
}) => {
  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-white/10 px-4 py-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Activity className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                  COGNITEXT
                </span>
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  M2W Blink Bridge
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-400">
                Neuro-Driven HCI • Arduino Hardware Interface
              </p>
            </div>
          </div>

          {/* Mobile Hardware vs CV Toggle */}
          <div className="md:hidden flex items-center p-0.5 rounded-lg bg-slate-900 border border-white/10 text-[11px] font-bold">
            <button
              onClick={() => onToggleInputMode('hardware')}
              className={`px-2 py-1 rounded flex items-center gap-1 ${
                inputSourceMode === 'hardware' ? 'bg-purple-600 text-white' : 'text-slate-400'
              }`}
            >
              <Cpu className="w-3 h-3" />
              <span>HW</span>
            </button>
            <button
              onClick={() => onToggleInputMode('cv')}
              className={`px-2 py-1 rounded flex items-center gap-1 ${
                inputSourceMode === 'cv' ? 'bg-cyan-600 text-white' : 'text-slate-400'
              }`}
            >
              <Camera className="w-3 h-3" />
              <span>CV</span>
            </button>
          </div>

          {/* Mobile Connect & Calibrate Buttons */}
          <div className="md:hidden flex items-center gap-2">
            {inputSourceMode === 'hardware' && onOpenCalibration && (
              <button
                onClick={onOpenCalibration}
                className="p-2 rounded-lg text-xs font-semibold bg-cyan-600/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1"
                title="Calibrate Threshold"
              >
                <Target className="w-4 h-4" />
              </button>
            )}
            {inputSourceMode === 'hardware' && (
              <button
                onClick={onOpenConnectModal}
                className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  connectionStatus === 'connected'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-purple-600 hover:bg-purple-700 text-white shadow-md'
                }`}
              >
                <Cpu className="w-4 h-4" />
                <span>{connectionStatus === 'connected' ? 'Connected' : 'Connect'}</span>
              </button>
            )}
            {inputSourceMode === 'cv' && (
              <div className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 animate-pulse" />
                <span>CV Active</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/60 dark:bg-slate-900/80 border border-white/10 text-xs sm:text-sm font-medium w-full md:w-auto justify-center overflow-x-auto">
          <button
            onClick={() => setActiveTab('communication')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'communication'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/30'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Assistive Needs</span>
          </button>

          <button
            onClick={() => setActiveTab('devices')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'devices'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/30'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>IoT Devices</span>
          </button>

          <button
            onClick={() => setActiveTab('oscilloscope')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'oscilloscope'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/30'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Bio-Signal HUD</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'guide'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/30'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Arduino Guide</span>
          </button>
        </div>

        {/* Right Status & Controls */}
        <div className="hidden md:flex items-center gap-3">

          {/* Mode Switcher: Hardware vs Computer Vision */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900/90 border border-white/10 shadow-inner">
            <button
              onClick={() => onToggleInputMode('hardware')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                inputSourceMode === 'hardware'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Use Arduino / BioAmp EOG hardware via USB Serial or BLE"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Hardware</span>
            </button>

            <button
              onClick={() => onToggleInputMode('cv')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                inputSourceMode === 'cv'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Use Webcam AI FaceMesh for real-time camera blink tracking"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Computer Vision</span>
            </button>
          </div>
          
          {/* Active Blink burst pill */}
          {burstIndicator && (
            <div className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 text-xs font-bold flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              {burstIndicator}
            </div>
          )}

          {/* Menu cycling state */}
          {menuActive && (
            <div className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/50 text-purple-300 text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              Cycling Active
            </div>
          )}

          {/* Hardware-only Calibration Trigger */}
          {inputSourceMode === 'hardware' && onOpenCalibration && (
            <button
              onClick={onOpenCalibration}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-md shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
              title="Calibrate blink threshold with 1-minute open/closed eye wizard"
            >
              <Target className="w-3.5 h-3.5 text-cyan-200" />
              <span>Calibrate</span>
            </button>
          )}

          {/* Hardware Connection Trigger */}
          {inputSourceMode === 'hardware' ? (
            <button
              onClick={onOpenConnectModal}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all duration-300 ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  : connectionStatus === 'connecting'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                  : 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400 shadow-md shadow-purple-600/30 hover:scale-105'
              }`}
              title={statusMessage}
            >
              {connectionMode === 'serial' && <Usb className="w-4 h-4" />}
              {connectionMode === 'ble' && <Bluetooth className="w-4 h-4" />}
              {connectionMode === 'webcam' && <Camera className="w-4 h-4" />}
              {connectionMode === 'simulator' && <Sliders className="w-4 h-4" />}
              <span>
                {connectionStatus === 'connected'
                  ? `Active: ${connectionMode.toUpperCase()}`
                  : connectionStatus === 'connecting'
                  ? 'Connecting...'
                  : 'Connect Hardware'}
              </span>
            </button>
          ) : (
            <div className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20">
              <Camera className="w-4 h-4 animate-pulse text-cyan-400" />
              <span>AI Vision Active</span>
            </div>
          )}

          {/* Quick Release Port / Disconnect Button */}
          {connectionStatus === 'connected' && onDisconnect && (
            <button
              onClick={onDisconnect}
              className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 shadow-sm transition-all hover:scale-105 active:scale-95"
              title="Disconnect and immediately release serial port (/dev/cu.*) to the operating system"
            >
              <Power className="w-3.5 h-3.5 text-rose-400" />
              <span>Release Port</span>
            </button>
          )}

          {/* Audio Feedback Mute Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-xl border transition-all ${
              isMuted
                ? 'bg-slate-800 text-slate-400 border-slate-700'
                : 'bg-purple-950/40 text-purple-300 border-purple-800/50 hover:bg-purple-900/50'
            }`}
            title={isMuted ? 'Unmute Audio & Speech' : 'Mute Audio & Speech'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-all hover:scale-105"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>
        </div>

      </div>
    </header>
  );
};
