'use client';

import React from 'react';
import { 
  Bed, 
  Accessibility, 
  Lightbulb, 
  Volume2, 
  Wind, 
  Siren, 
  Power, 
  Check, 
  Wifi, 
  Radio, 
  Keyboard
} from 'lucide-react';
import { DeviceControlItem } from '@/types';
import { audioFeedback } from '@/lib/speech';
import { hardwareBridge } from '@/lib/serial';

export const INITIAL_DEVICES: DeviceControlItem[] = [
  {
    id: 'light',
    name: 'Room LED Lighting',
    description: 'Main overhead / reading light relay',
    iconName: 'Lightbulb',
    state: false,
    commandOn: 'CMD:LIGHT_ON',
    commandOff: 'CMD:LIGHT_OFF',
    activeLabel: 'Illuminated (ON)',
    inactiveLabel: 'Off',
    color: 'amber',
  },
  {
    id: 'bed',
    name: 'Adjustable Motorized Bed',
    description: 'Headrest elevation angle actuator',
    iconName: 'Bed',
    state: false,
    commandOn: 'CMD:BED_UP',
    commandOff: 'CMD:BED_DOWN',
    activeLabel: 'Elevated (45°)',
    inactiveLabel: 'Flat',
    color: 'indigo',
  },
  {
    id: 'wheelchair',
    name: 'Smart Wheelchair Lock',
    description: 'Electric wheel brake & navigation lock',
    iconName: 'Accessibility',
    state: true, // locked by default for safety
    commandOn: 'CMD:WHEELCHAIR_LOCK',
    commandOff: 'CMD:WHEELCHAIR_UNLOCK',
    activeLabel: 'Brakes Locked (Safe)',
    inactiveLabel: 'Unlocked (Drive Ready)',
    color: 'emerald',
  },
  {
    id: 'buzzer',
    name: 'Piezo Alarm Buzzer',
    description: 'High-decibel hardware buzzer on pin 8',
    iconName: 'Volume2',
    state: false,
    commandOn: 'CMD:BUZZER_ON',
    commandOff: 'CMD:BUZZER_OFF',
    activeLabel: 'Sounding Alert',
    inactiveLabel: 'Silent',
    color: 'rose',
  },
  {
    id: 'fan',
    name: 'Cooling Air Fan',
    description: 'Bedside circulation fan motor relay',
    iconName: 'Wind',
    state: false,
    commandOn: 'CMD:FAN_ON',
    commandOff: 'CMD:FAN_OFF',
    activeLabel: 'Running (High)',
    inactiveLabel: 'Stopped',
    color: 'cyan',
  },
  {
    id: 'nurse_call',
    name: 'Nurse Station Beacon',
    description: 'Emergency wireless pager to nurse station',
    iconName: 'Siren',
    state: false,
    commandOn: 'CMD:NURSE_CALL',
    commandOff: 'CMD:NURSE_CANCEL',
    activeLabel: 'Paging Station',
    inactiveLabel: 'Standby',
    color: 'purple',
  },
];

interface DeviceControlProps {
  devices: DeviceControlItem[];
  setDevices: React.Dispatch<React.SetStateAction<DeviceControlItem[]>>;
  menuActive: boolean;
  currentIndex: number;
}

export const DeviceControl: React.FC<DeviceControlProps> = ({
  devices,
  setDevices,
  menuActive,
  currentIndex,
}) => {
  const getDeviceIcon = (name: string, className: string = 'w-7 h-7') => {
    switch (name) {
      case 'Lightbulb': return <Lightbulb className={className} />;
      case 'Bed': return <Bed className={className} />;
      case 'Accessibility': return <Accessibility className={className} />;
      case 'Volume2': return <Volume2 className={className} />;
      case 'Wind': return <Wind className={className} />;
      case 'Siren': return <Siren className={className} />;
      default: return <Power className={className} />;
    }
  };

  const toggleDevice = async (id: string) => {
    setDevices((prev) =>
      prev.map((dev) => {
        if (dev.id === id) {
          const newState = !dev.state;
          const cmd = newState ? dev.commandOn : dev.commandOff;
          
          // Send serial command to Arduino
          hardwareBridge.sendCommand(cmd);
          audioFeedback.playSelectChime();

          const phrase = `${dev.name} is now ${newState ? dev.activeLabel : dev.inactiveLabel}`;
          audioFeedback.speak(phrase);

          return { ...dev, state: newState };
        }
        return dev;
      })
    );
  };

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* Top Info Banner */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/10 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span>Patient Environment & Hardware Relay Control</span>
            </h2>
            <p className="text-xs text-slate-400">
              Direct bidirectional control for Arduino relays, motors, and buzzers via serial commands.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/10 text-slate-300">
          <Wifi className="w-3.5 h-3.5 text-cyan-400" />
          <span>Active Protocol: Standard Serial CMD</span>
        </div>
      </div>

      {/* 6 Devices Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {devices.map((dev, idx) => {
          const isFocused = menuActive && currentIndex === idx;

          return (
            <div
              key={dev.id}
              onClick={() => toggleDevice(dev.id)}
              className={`relative rounded-2xl p-5 cursor-pointer transition-all duration-300 border flex flex-col justify-between overflow-hidden group select-none ${
                dev.state
                  ? 'border-cyan-500/50 bg-cyan-950/20 shadow-lg shadow-cyan-950/40'
                  : 'border-white/10 glass-card hover:border-white/20'
              } ${isFocused ? 'ring-2 ring-purple-400 scale-[1.02]' : 'hover:scale-[1.01]'}`}
            >
              {/* Top Row: Device Icon & Switch */}
              <div className="flex items-center justify-between relative z-10">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                    dev.state
                      ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                      : 'bg-slate-800 text-slate-400 group-hover:text-white'
                  }`}
                >
                  {getDeviceIcon(dev.iconName)}
                </div>

                {/* Animated Power Switch */}
                <div
                  className={`w-14 h-7 rounded-full transition-colors duration-300 flex items-center p-1 cursor-pointer ${
                    dev.state ? 'bg-cyan-500 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center">
                    {dev.state ? (
                      <Check className="w-3 h-3 text-cyan-600 stroke-[3]" />
                    ) : (
                      <Power className="w-3 h-3 text-slate-400 stroke-[2.5]" />
                    )}
                  </div>
                </div>
              </div>

              {/* Middle Row: Name & Description */}
              <div className="my-4 relative z-10">
                <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>{dev.name}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {dev.description}
                </p>
              </div>

              {/* Bottom Row: Status Badge & Serial Command Tag */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs relative z-10">
                <span
                  className={`px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5 ${
                    dev.state
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      dev.state ? 'bg-cyan-400 animate-ping' : 'bg-slate-500'
                    }`}
                  />
                  {dev.state ? dev.activeLabel : dev.inactiveLabel}
                </span>

                <code className="text-[11px] font-mono text-slate-500 group-hover:text-cyan-400 transition-colors">
                  {dev.state ? dev.commandOn : dev.commandOff}
                </code>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
