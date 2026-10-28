'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from '@/components/Navbar';
import { AssistiveCommunication, ASSISTIVE_OPTIONS } from '@/components/AssistiveCommunication';
import { DeviceControl, INITIAL_DEVICES } from '@/components/DeviceControl';
import { Oscilloscope } from '@/components/Oscilloscope';
import { ArduinoGuide } from '@/components/ArduinoGuide';
import { HardwareConnectModal } from '@/components/HardwareConnectModal';
import { CalibrationModal } from '@/components/CalibrationModal';
import { CameraVisionWindow } from '@/components/CameraVisionWindow';
import { ConnectionMode, DeviceControlItem, InputSourceMode } from '@/types';
import { hardwareBridge } from '@/lib/serial';
import { audioFeedback } from '@/lib/speech';
import confetti from 'canvas-confetti';
import { Terminal, Shield, Zap, Info, ChevronRight, Activity, Target, Camera, Cpu } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'communication' | 'devices' | 'oscilloscope' | 'guide'>('communication');
  const [inputSourceMode, setInputSourceMode] = useState<InputSourceMode>('hardware');
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('simulator');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [statusMessage, setStatusMessage] = useState<string>('Ready. Connect Arduino over USB Serial or use Simulator.');
  
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);
  const [isCalibrationModalOpen, setIsCalibrationModalOpen] = useState<boolean>(false);

  // Assistive Board Navigation State (M2W Interaction Model)
  const [menuActive, setMenuActive] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [burstIndicator, setBurstIndicator] = useState<string | null>(null);

  // Oscilloscope & Serial Stream (Default 100 tuned for BioAmp Butterworth bandpass filter)
  const [rawData, setRawData] = useState<number>(0);
  const [threshold, setThreshold] = useState<number>(100);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Smart IoT Devices State
  const [devices, setDevices] = useState<DeviceControlItem[]>(INITIAL_DEVICES);

  // Serial & Action Console Logs
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${msg}`, ...prev.slice(0, 45)]);
  }, []);

  // Update HTML root theme class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
  }, [isDarkMode]);

  // Restore saved calibrated threshold on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('blink_assist_calibrated_threshold');
      const savedReset = localStorage.getItem('blink_assist_calibrated_reset');
      if (saved) {
        let val = Number(saved);
        // If legacy threshold (> 300) from raw unipolar ADC, clamp down to BioAmp Butterworth range
        if (val > 300) val = 100;
        if (!isNaN(val) && val > 0) {
          setThreshold(val);
          hardwareBridge.setThreshold(val, savedReset ? Number(savedReset) : Math.round(val * 0.3));
          addLog(`Restored calibrated threshold from storage: +${val} (BioAmp Filter)`);
        }
      }
    } catch (_) {}
  }, [addLog]);

  const handleApplyCalibration = (high: number, low?: number) => {
    setThreshold(high);
    hardwareBridge.setThreshold(high, low);
    addLog(`[CALIBRATION] Applied: Trigger Threshold = ${high} ADC, Reset = ${low || Math.round(high * 0.8)} ADC`);
  };

  // Sync mute state
  useEffect(() => {
    audioFeedback.setMuted(isMuted);
  }, [isMuted]);

  // Debounce refs to prevent duplicate events between hardware & software detection
  const lastCycleTimeRef = useRef<number>(0);
  const lastSelectTimeRef = useRef<number>(0);

  // Cycle cursor forward: 2x Double Blink -> MOVE / CYCLE
  const handleCycleNext = useCallback(() => {
    const now = Date.now();
    if (now - lastCycleTimeRef.current < 280) return; // 280ms refractory period
    lastCycleTimeRef.current = now;

    setBurstIndicator('⚡ 2x Double Blink (Cycle Next)');
    setTimeout(() => setBurstIndicator(null), 1500);

    if (activeTab === 'communication') {
      if (!menuActive) {
        setMenuActive(true);
        setCurrentIndex(0);
        audioFeedback.playCycleBeep(0);
        addLog(`Board Activated -> Target: ${ASSISTIVE_OPTIONS[0].label}`);
      } else {
        const nextIdx = (currentIndex + 1) % ASSISTIVE_OPTIONS.length;
        setCurrentIndex(nextIdx);
        audioFeedback.playCycleBeep(nextIdx);
        addLog(`Cycled to -> ${ASSISTIVE_OPTIONS[nextIdx].label}`);
      }
    } else if (activeTab === 'devices') {
      if (!menuActive) {
        setMenuActive(true);
        setCurrentIndex(0);
        audioFeedback.playCycleBeep(0);
        addLog(`Devices Focus -> ${devices[0].name}`);
      } else {
        const nextIdx = (currentIndex + 1) % devices.length;
        setCurrentIndex(nextIdx);
        audioFeedback.playCycleBeep(nextIdx);
        addLog(`Cycled Device to -> ${devices[nextIdx].name}`);
      }
    }
  }, [activeTab, menuActive, currentIndex, devices, addLog]);

  // Select highlighted item: 3x Triple Blink -> SELECT
  const handleSelectActive = useCallback(() => {
    const now = Date.now();
    if (now - lastSelectTimeRef.current < 800) return; // 800ms refractory period
    lastSelectTimeRef.current = now;

    setBurstIndicator('✨ 3x Triple Blink (Selected)');
    setTimeout(() => setBurstIndicator(null), 2500);

    if (activeTab === 'communication') {
      const targetIdx = menuActive ? currentIndex : 0;
      if (!menuActive) {
        setMenuActive(true);
        setCurrentIndex(0);
      }
      const option = ASSISTIVE_OPTIONS[targetIdx];
      setSelectedOption(option.id);
      addLog(`SELECTED: ${option.label} ("${option.spokenText}")`);

      // Audio & Speech Announcement
      audioFeedback.playSelectChime();
      audioFeedback.speak(option.spokenText);

      // Celebration Confetti
      try {
        confetti({
          particleCount: 65,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (_) {}

      // Send to Arduino
      hardwareBridge.sendCommand(`CMD:REQUEST:${option.id}`);

      // Reset menu state after selection
      setTimeout(() => {
        setMenuActive(false);
        setSelectedOption(null);
      }, 3500);

    } else if (activeTab === 'devices') {
      if (!menuActive) {
        addLog('Notice: Double blink first to focus a device!');
        return;
      }
      const dev = devices[currentIndex];
      const newState = !dev.state;
      const cmd = newState ? dev.commandOn : dev.commandOff;

      hardwareBridge.sendCommand(cmd);
      audioFeedback.playSelectChime();
      audioFeedback.speak(`${dev.name} is now ${newState ? dev.activeLabel : dev.inactiveLabel}`);
      addLog(`TOGGLED DEVICE: ${dev.name} -> ${newState ? 'ON' : 'OFF'}`);

      setDevices((prev) =>
        prev.map((d, i) => (i === currentIndex ? { ...d, state: newState } : d))
      );

      setTimeout(() => {
        setMenuActive(false);
      }, 2000);
    }
  }, [activeTab, menuActive, currentIndex, devices, addLog]);

  // Setup Hardware Bridge Callbacks
  useEffect(() => {
    hardwareBridge.setCallbacks(
      // On Raw Analog Data (for Oscilloscope)
      (val) => {
        setRawData(val);
      },
      // On Blink Burst (2 = Double Blink cycle, 3 = Triple Blink select)
      (count, source) => {
        if (count === 2) {
          addLog(`Hardware Event [${source.toUpperCase()}]: ⚡ 2x Double Blink -> CYCLE`);
          handleCycleNext();
        } else if (count >= 3) {
          addLog(`Hardware Event [${source.toUpperCase()}]: ✨ 3x Triple Blink -> SELECT`);
          handleSelectActive();
        }
      },
      // On Status Update
      (status, msg) => {
        setConnectionStatus(status);
        if (msg) setStatusMessage(msg);
        addLog(`Status Update [${status.toUpperCase()}]: ${msg || ''}`);
      }
    );
  }, [handleCycleNext, handleSelectActive, addLog]);

  // Sync Threshold to hardware bridge
  useEffect(() => {
    hardwareBridge.setThreshold(threshold);
  }, [threshold]);

  // Global Keyboard Shortcuts (Space / '2' = Double Blink Cycle, Enter / '3' = Triple Blink Select)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or select
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === '2' || e.code === 'Space') {
        e.preventDefault();
        handleCycleNext();
      } else if (e.key === '3' || e.key === 'Enter') {
        e.preventDefault();
        handleSelectActive();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCycleNext, handleSelectActive]);

  // Connection Triggers
  const handleConnectSerial = async (baud: number) => {
    setConnectionMode('serial');
    setIsConnectModalOpen(false);
    await hardwareBridge.connectSerial(baud);
  };

  const handleConnectBle = async () => {
    setConnectionMode('ble');
    setIsConnectModalOpen(false);
    await hardwareBridge.connectBluetooth();
  };

  const handleDisconnect = async () => {
    await hardwareBridge.disconnect();
    setConnectionMode('simulator');
  };

  const handleToggleInputMode = (mode: InputSourceMode) => {
    setInputSourceMode(mode);
    if (mode === 'cv') {
      setConnectionMode('webcam');
      addLog('[INPUT MODE]: Activated Computer Vision Mode (Webcam FaceMesh AI)');
    } else {
      setConnectionMode(hardwareBridge.isSerialSupported() ? 'serial' : 'simulator');
      addLog('[INPUT MODE]: Activated Hardware EOG Mode (Arduino / BioAmp)');
    }
  };

  return (
    <div className="min-h-screen flex flex-col cyber-grid relative selection:bg-purple-500 selection:text-white">
      
      {/* Background Animated Gradient Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-10 left-1/4 w-96 h-96 rounded-full bg-purple-600/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 rounded-full bg-cyan-500/10 blur-[120px] animate-pulse" style={{ animationDelay: '3s' }} />
      </div>

      {/* Top Sticky Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        inputSourceMode={inputSourceMode}
        onToggleInputMode={handleToggleInputMode}
        connectionMode={connectionMode}
        connectionStatus={connectionStatus}
        statusMessage={statusMessage}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
        onOpenCalibration={() => setIsCalibrationModalOpen(true)}
        onDisconnect={handleDisconnect}
        menuActive={menuActive}
        burstIndicator={burstIndicator}
      />

      {/* Main App Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6 relative z-10">
        
        {/* Prominent Mode Switcher Banner */}
        <div className="glass-panel rounded-2xl p-4 border border-white/10 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
              inputSourceMode === 'cv' 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-cyan-500/20' 
                : 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-purple-500/20'
            }`}>
              {inputSourceMode === 'cv' ? <Camera className="w-5 h-5 text-cyan-300 animate-pulse" /> : <Cpu className="w-5 h-5 text-purple-300" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Active Mode: {inputSourceMode === 'cv' ? 'Computer Vision (Webcam AI)' : 'BioAmp Hardware EOG'}
                </h3>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                  inputSourceMode === 'cv'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                    : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                }`}>
                  {inputSourceMode === 'cv' ? 'Camera Vision' : 'Physical Sensor'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {inputSourceMode === 'cv'
                  ? 'Real-time eye blink counting via webcam: 2 blinks = cycle card, 3 blinks = select & announce'
                  : 'BioAmp EXG Pill / Arduino USB Serial & Bluetooth Low Energy interface'}
              </p>
            </div>
          </div>

          <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-white/10 w-full sm:w-auto justify-center">
            <button
              onClick={() => handleToggleInputMode('hardware')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                inputSourceMode === 'hardware'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>Hardware (EOG)</span>
            </button>
            <button
              onClick={() => handleToggleInputMode('cv')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                inputSourceMode === 'cv'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Computer Vision (AI)</span>
            </button>
          </div>
        </div>

        {/* Live Camera Vision Window — Rendered ONLY after toggling to Computer Vision */}
        {inputSourceMode === 'cv' && (
          <CameraVisionWindow
            onBlinkBurst={(count) => {
              if (count === 2) {
                addLog('[Computer Vision]: ⚡ 2x Double Blink detected -> Advancing option');
                handleCycleNext();
              } else if (count >= 3) {
                addLog('[Computer Vision]: ✨ 3x Triple Blink detected -> Selected!');
                handleSelectActive();
              }
            }}
            onRawEarValue={(spike) => {
              // Feed normalized blink spike to oscilloscope HUD when in CV mode
              setRawData(spike);
            }}
            onSwitchToHardware={() => handleToggleInputMode('hardware')}
            menuActive={menuActive}
            currentTargetName={
              activeTab === 'communication'
                ? ASSISTIVE_OPTIONS[currentIndex]?.label
                : activeTab === 'devices'
                ? devices[currentIndex]?.name
                : undefined
            }
            isDarkMode={isDarkMode}
          />
        )}
        
        {activeTab === 'communication' && (
          <AssistiveCommunication
            currentIndex={currentIndex}
            menuActive={menuActive}
            selectedOption={selectedOption}
            onSelectOption={(option) => {
              const idx = ASSISTIVE_OPTIONS.findIndex((o) => o.id === option.id);
              if (idx !== -1) setCurrentIndex(idx);
              setMenuActive(true);
              handleSelectActive();
            }}
            onCycleNext={handleCycleNext}
            onSimulateSelect={handleSelectActive}
          />
        )}

        {activeTab === 'devices' && (
          <DeviceControl
            devices={devices}
            setDevices={setDevices}
            menuActive={menuActive}
            currentIndex={currentIndex}
          />
        )}

        {activeTab === 'oscilloscope' && (
          <Oscilloscope
            rawData={rawData}
            threshold={threshold}
            setThreshold={setThreshold}
            isSimulating={isSimulating}
            setIsSimulating={setIsSimulating}
            onOpenCalibration={() => setIsCalibrationModalOpen(true)}
          />
        )}

        {activeTab === 'guide' && <ArduinoGuide />}

        {/* Live Terminal / Serial Activity Console at Bottom */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/10 shadow-lg flex flex-col gap-3 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <Terminal className="w-4 h-4 text-purple-400" />
              <span>Serial Activity & Event Log</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Listening at {connectionMode.toUpperCase()}
              </span>
              <button
                onClick={() => setLogs([])}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="w-full h-24 rounded-xl bg-[#060a14] p-3 overflow-y-auto font-mono text-[11px] text-slate-300 flex flex-col-reverse gap-1 border border-white/5">
            {logs.length === 0 ? (
              <span className="text-slate-500 italic">No events yet. Blink into sensor or press &apos;2&apos; / &apos;3&apos; to simulate.</span>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="leading-tight text-slate-300">
                  <span className="text-purple-400">&gt; </span>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

      </main>

      {/* Hardware Connection Modal */}
      <HardwareConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        connectionMode={connectionMode}
        setConnectionMode={setConnectionMode}
        connectionStatus={connectionStatus}
        statusMessage={statusMessage}
        onConnectSerial={handleConnectSerial}
        onConnectBle={handleConnectBle}
        onDisconnect={handleDisconnect}
        onTriggerSimulate={(burst) => {
          if (burst === 2) handleCycleNext();
          if (burst === 3) handleSelectActive();
        }}
        onSelectComputerVision={() => handleToggleInputMode('cv')}
      />

      {/* Personalized Blink Calibration Modal */}
      <CalibrationModal
        isOpen={isCalibrationModalOpen}
        onClose={() => setIsCalibrationModalOpen(false)}
        currentADC={rawData}
        currentThreshold={threshold}
        onApplyThreshold={handleApplyCalibration}
      />

    </div>
  );
}
