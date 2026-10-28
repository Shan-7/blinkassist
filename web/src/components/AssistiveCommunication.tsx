'use client';

import React from 'react';
import { 
  Utensils, 
  Droplets, 
  AlertTriangle, 
  Bath, 
  Tv, 
  BellRing, 
  Compass, 
  HeartHandshake, 
  Sparkles, 
  CheckCircle2, 
  ChevronRight,
  Eye,
  Keyboard,
  Volume2
} from 'lucide-react';
import { AssistiveOption } from '@/types';
import confetti from 'canvas-confetti';
import { audioFeedback } from '@/lib/speech';
import { hardwareBridge } from '@/lib/serial';

export const ASSISTIVE_OPTIONS: AssistiveOption[] = [
  {
    id: 'food',
    label: 'Food',
    description: 'Meal / Snack requested',
    iconName: 'Utensils',
    color: 'from-amber-500 to-orange-600',
    bgGlow: 'rgba(249, 115, 22, 0.25)',
    borderColor: '#f97316',
    spokenText: 'I would like some food please.',
    category: 'daily',
  },
  {
    id: 'water',
    label: 'Water',
    description: 'Drink / Hydration requested',
    iconName: 'Droplets',
    color: 'from-cyan-400 to-blue-500',
    bgGlow: 'rgba(6, 182, 212, 0.25)',
    borderColor: '#06b6d4',
    spokenText: 'Please get me a glass of water.',
    category: 'daily',
  },
  {
    id: 'help',
    label: 'Help',
    description: 'Immediate assistance needed',
    iconName: 'AlertTriangle',
    color: 'from-red-500 to-rose-600',
    bgGlow: 'rgba(239, 68, 68, 0.3)',
    borderColor: '#ef4444',
    spokenText: 'I need help, please come here.',
    category: 'urgent',
  },
  {
    id: 'washroom',
    label: 'Washroom',
    description: 'Restroom / Personal care',
    iconName: 'Bath',
    color: 'from-purple-500 to-indigo-600',
    bgGlow: 'rgba(168, 85, 247, 0.25)',
    borderColor: '#a855f7',
    spokenText: 'I need to use the washroom.',
    category: 'daily',
  },
  {
    id: 'tv',
    label: 'Television',
    description: 'TV / Media entertainment',
    iconName: 'Tv',
    color: 'from-indigo-500 to-violet-600',
    bgGlow: 'rgba(99, 102, 241, 0.25)',
    borderColor: '#6366f1',
    spokenText: 'Please turn on the television.',
    category: 'daily',
  },
  {
    id: 'emergency',
    label: 'Emergency Bell',
    description: 'Urgent alarm alert',
    iconName: 'BellRing',
    color: 'from-rose-500 to-pink-600',
    bgGlow: 'rgba(244, 63, 94, 0.35)',
    borderColor: '#f43f5e',
    spokenText: 'Emergency alarm! Immediate attention required!',
    category: 'urgent',
  },
  {
    id: 'outing',
    label: 'Outing',
    description: 'Walk / Wheelchair stroll',
    iconName: 'Compass',
    color: 'from-sky-400 to-teal-500',
    bgGlow: 'rgba(14, 165, 233, 0.25)',
    borderColor: '#0ea5e9',
    spokenText: 'I would like to go outside for fresh air.',
    category: 'social',
  },
  {
    id: 'caregiver',
    label: 'Caregiver Call',
    description: 'Notify assigned nurse/family',
    iconName: 'HeartHandshake',
    color: 'from-emerald-400 to-green-600',
    bgGlow: 'rgba(16, 185, 129, 0.25)',
    borderColor: '#10b981',
    spokenText: 'Caregiver call notification sent.',
    category: 'social',
  },
];

interface AssistiveCommunicationProps {
  currentIndex: number;
  menuActive: boolean;
  selectedOption: string | null;
  onSelectOption: (option: AssistiveOption) => void;
  onCycleNext: () => void;
  onSimulateSelect: () => void;
}

export const AssistiveCommunication: React.FC<AssistiveCommunicationProps> = ({
  currentIndex,
  menuActive,
  selectedOption,
  onSelectOption,
  onCycleNext,
  onSimulateSelect,
}) => {
  const getIcon = (name: string, className: string = 'w-8 h-8') => {
    switch (name) {
      case 'Utensils': return <Utensils className={className} />;
      case 'Droplets': return <Droplets className={className} />;
      case 'AlertTriangle': return <AlertTriangle className={className} />;
      case 'Bath': return <Bath className={className} />;
      case 'Tv': return <Tv className={className} />;
      case 'BellRing': return <BellRing className={className} />;
      case 'Compass': return <Compass className={className} />;
      case 'HeartHandshake': return <HeartHandshake className={className} />;
      default: return <Sparkles className={className} />;
    }
  };

  const handleCardClick = (option: AssistiveOption) => {
    onSelectOption(option);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* Top Banner Status Info */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/10 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className={`w-3.5 h-3.5 rounded-full ${menuActive ? 'bg-purple-500 animate-ping' : 'bg-slate-500'}`} />
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span>{menuActive ? 'Blink Navigation In Progress' : 'Menu Inactive'}</span>
              {menuActive && (
                <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full">
                  Target: {ASSISTIVE_OPTIONS[currentIndex]?.label}
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              {menuActive 
                ? '⚡ Double blink to advance to next card • ✨ Triple blink to select and announce' 
                : 'Blink twice to activate board • Double blink to advance • Triple blink to select'}
            </p>
          </div>
        </div>

        {/* Quick Simulation / Testing Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={onCycleNext}
            className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
            title="Press '2' or Spacebar to cycle"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>⚡ Cycle [2]</span>
          </button>
          
          <button
            onClick={onSimulateSelect}
            className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
            title="Press '3' or Enter to select"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>✨ Select [3]</span>
          </button>
        </div>
      </div>

      {/* 8-Card Assistive Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
        {ASSISTIVE_OPTIONS.map((option, idx) => {
          const isFocused = menuActive && currentIndex === idx;
          const isSelected = selectedOption === option.id;

          return (
            <div
              key={option.id}
              onClick={() => handleCardClick(option)}
              style={{
                boxShadow: isSelected
                  ? `0 0 35px rgba(34, 197, 94, 0.5)`
                  : isFocused
                  ? `0 0 25px ${option.bgGlow}`
                  : undefined,
              }}
              className={`relative rounded-2xl p-4 sm:p-5 cursor-pointer transition-all duration-300 flex flex-col justify-between overflow-hidden group select-none min-h-[170px] sm:min-h-[190px] border ${
                isSelected
                  ? 'border-emerald-400 bg-emerald-950/40 scale-[1.03] animate-select-burst'
                  : isFocused
                  ? 'border-purple-400 bg-purple-950/30 ring-2 ring-purple-400/80 scale-[1.02]'
                  : 'border-white/10 glass-card hover:border-white/25 hover:scale-[1.01]'
              }`}
            >
              {/* Dynamic Glow Underlay */}
              <div
                className="absolute inset-0 opacity-15 pointer-events-none transition-opacity group-hover:opacity-30"
                style={{
                  background: `radial-gradient(circle at 50% 20%, ${option.borderColor}, transparent 70%)`,
                }}
              />

              {/* Top Row: Icon Pod & Badges */}
              <div className="flex items-start justify-between w-full relative z-10">
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center bg-gradient-to-tr ${option.color} text-white shadow-lg transition-transform duration-300 group-hover:rotate-6`}
                >
                  {getIcon(option.iconName, 'w-6 h-6 sm:w-7 sm:h-7')}
                </div>

                {/* State Badges */}
                {isSelected ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-400/50 px-2 py-0.5 rounded-full animate-bounce">
                    <CheckCircle2 className="w-3 h-3" />
                    Selected
                  </span>
                ) : isFocused ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-purple-300 bg-purple-500/30 border border-purple-400/60 px-2 py-0.5 rounded-full animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                    Active
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    {option.category}
                  </span>
                )}
              </div>

              {/* Bottom Content: Title & Spoken Phrase */}
              <div className="mt-4 relative z-10">
                <div className="flex items-center justify-between">
                  <h3
                    className={`text-lg sm:text-xl font-black tracking-tight transition-colors ${
                      isSelected
                        ? 'text-emerald-300'
                        : isFocused
                        ? 'text-white'
                        : 'text-slate-200 group-hover:text-white'
                    }`}
                  >
                    {option.label}
                  </h3>
                  <ChevronRight
                    className={`w-4 h-4 text-slate-500 transition-transform group-hover:translate-x-1 ${
                      isFocused ? 'text-purple-400 translate-x-1' : ''
                    }`}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                  {option.description}
                </p>
                <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center gap-1.5 text-[11px] text-slate-400 group-hover:text-slate-300">
                  <Volume2 className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                  <span className="italic truncate">&ldquo;{option.spokenText}&rdquo;</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step by Step "How It Works" Guide Cards (M2W Design) */}
      <div className="mt-4 glass-panel rounded-2xl p-5 border border-white/10">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          <Eye className="w-4 h-4 text-purple-400" />
          <span>Interactive Blink Protocol • How It Works</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 font-black text-xs flex items-center justify-center border border-blue-500/30">
                01
              </span>
              <span className="text-sm font-bold text-white">Connect Device</span>
            </div>
            <p className="text-xs text-slate-400">
              Connect Arduino via Web Serial, ESP32 via Bluetooth, or enable your Webcam for AI blink tracking.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 font-black text-xs flex items-center justify-center border border-purple-500/30">
                02
              </span>
              <span className="text-sm font-bold text-white">Double Blink (Wake)</span>
            </div>
            <p className="text-xs text-slate-400">
              Blink twice intentionally. Natural involuntary single blinks are ignored. The board activates option #1.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center border border-amber-500/30">
                03
              </span>
              <span className="text-sm font-bold text-white">Double Blink (Cycle)</span>
            </div>
            <p className="text-xs text-slate-400">
              Each subsequent double blink advances focus: Food &rarr; Water &rarr; Help &rarr; Washroom &rarr; TV...
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center border border-emerald-500/30">
                04
              </span>
              <span className="text-sm font-bold text-white">Triple Blink (Select)</span>
            </div>
            <p className="text-xs text-slate-400">
              Blink three times rapidly. The option is selected, spoken aloud in natural voice, and sent to Arduino.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
};
