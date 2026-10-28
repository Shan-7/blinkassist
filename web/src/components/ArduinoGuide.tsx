'use client';

import React, { useState } from 'react';
import { 
  FileCode, 
  Copy, 
  Check, 
  Cpu, 
  CircuitBoard, 
  Terminal, 
  Download, 
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';

const ARDUINO_SKETCH = `// EOG Filter - BioAmp EXG Pill
// https://github.com/upsidedownlabs/BioAmp-EXG-Pill

// Upside Down Labs invests time and resources providing this open source code,
// please support Upside Down Labs and open-source hardware by purchasing
// products from Upside Down Labs!

// Copyright (c) 2021 Upside Down Labs - contact@upsidedownlabs.tech

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

#define SAMPLE_RATE 75
#define BAUD_RATE 115200
#define INPUT_PIN A0

// Band-Pass Butterworth IIR digital filter forward declaration
float EOGFilter(float input);

void setup() {
	// Serial connection begin
	Serial.begin(BAUD_RATE);
}

void loop() {
	// Calculate elapsed time
	static unsigned long past = 0;
	unsigned long present = micros();
	unsigned long interval = present - past;
	past = present;

	// Run timer
	static long timer = 0;
	timer -= interval;

	// Sample
	if(timer < 0){
		timer += 1000000 / SAMPLE_RATE;
		float sensor_value = analogRead(INPUT_PIN);
		float signal = EOGFilter(sensor_value);
		Serial.println(signal);
	}
}

// Band-Pass Butterworth IIR digital filter, generated using filter_gen.py.
// Sampling rate: 75.0 Hz, frequency: [0.5, 19.5] Hz.
// Filter is order 4, implemented as second-order sections (biquads).
// Reference: 
// https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.butter.html
// https://courses.ideate.cmu.edu/16-223/f2020/Arduino/FilterDemos/filter_gen.py
float EOGFilter(float input)
{
  float output = input;
  {
    static float z1, z2; // filter section state
    float x = output - 0.02977423*z1 - 0.04296318*z2;
    output = 0.09797471*x + 0.19594942*z1 + 0.09797471*z2;
    z2 = z1;
    z1 = x;
  }
  {
    static float z1, z2; // filter section state
    float x = output - 0.08383952*z1 - 0.46067709*z2;
    output = 1.00000000*x + 2.00000000*z1 + 1.00000000*z2;
    z2 = z1;
    z1 = x;
  }
  {
    static float z1, z2; // filter section state
    float x = output - -1.92167271*z1 - 0.92347975*z2;
    output = 1.00000000*x + -2.00000000*z1 + 1.00000000*z2;
    z2 = z1;
    z1 = x;
  }
  {
    static float z1, z2; // filter section state
    float x = output - -1.96758891*z1 - 0.96933514*z2;
    output = 1.00000000*x + -2.00000000*z1 + 1.00000000*z2;
    z2 = z1;
    z1 = x;
  }
  return output;
}
`;

export const ArduinoGuide: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(ARDUINO_SKETCH);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* Overview Banner */}
      <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>BioAmp EXG Pill • Official Butterworth Filter Firmware</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                115200 Baud Ready
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Streams 4th-order Bandpass [0.5 - 19.5 Hz] EOG potential directly to this web app over Web Serial.
            </p>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-md shadow-purple-600/30 active:scale-95"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Sketch Copied!' : 'Copy Arduino Sketch (.ino)'}</span>
        </button>
      </div>

      {/* Hardware Wiring Pinout Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        <div className="glass-panel rounded-2xl p-5 border border-white/10 flex flex-col gap-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CircuitBoard className="w-4 h-4 text-cyan-400" />
            <span>BioAmp EXG Pill / EOG Electrode Wiring</span>
          </h3>
          <p className="text-xs text-slate-400">
            Connect standard Ag/AgCl gel snap electrodes: IN+ (above eyebrow), IN- (outer canthus), REF (bony area behind ear / mastoid).
          </p>

          <div className="overflow-x-auto mt-2">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="py-2">BioAmp Pin</th>
                  <th className="py-2">Arduino Pin</th>
                  <th className="py-2">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                <tr>
                  <td className="py-2 text-cyan-400 font-bold">VCC</td>
                  <td className="py-2 text-emerald-400">5V or 3.3V</td>
                  <td className="py-2 text-slate-400 font-sans">Power Supply</td>
                </tr>
                <tr>
                  <td className="py-2 text-cyan-400 font-bold">GND</td>
                  <td className="py-2 text-slate-400">GND</td>
                  <td className="py-2 text-slate-400 font-sans">Ground Reference</td>
                </tr>
                <tr>
                  <td className="py-2 text-cyan-400 font-bold">OUT</td>
                  <td className="py-2 text-purple-400">A0 (Analog In)</td>
                  <td className="py-2 text-slate-400 font-sans">Analog EOG Signal</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-white/10 flex flex-col gap-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Digital Filter & Signal Specifications</span>
          </h3>
          <p className="text-xs text-slate-400">
            Upside Down Labs 4th-order Bandpass Butterworth IIR filter implemented as cascaded biquads.
          </p>

          <div className="overflow-x-auto mt-2">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="py-2">Parameter</th>
                  <th className="py-2">Value</th>
                  <th className="py-2">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                <tr>
                  <td className="py-2 text-white font-sans">Filter Type</td>
                  <td className="py-2 text-amber-400 font-sans">Butterworth 4th-order</td>
                  <td className="py-2 text-slate-400 font-sans">Band-pass [0.5 - 19.5 Hz]</td>
                </tr>
                <tr>
                  <td className="py-2 text-white font-sans">Baud Rate</td>
                  <td className="py-2 text-emerald-400">115200</td>
                  <td className="py-2 text-slate-400 font-sans">High-speed USB Serial transfer</td>
                </tr>
                <tr>
                  <td className="py-2 text-white font-sans">Sample Rate</td>
                  <td className="py-2 text-cyan-400">75 Hz</td>
                  <td className="py-2 text-slate-400 font-sans">13.3 ms sampling interval</td>
                </tr>
                <tr>
                  <td className="py-2 text-white font-sans">Blink Spike Peak</td>
                  <td className="py-2 text-purple-400">+150 to +250</td>
                  <td className="py-2 text-slate-400 font-sans">Deliberate blink amplitude</td>
                </tr>
                <tr>
                  <td className="py-2 text-white font-sans">Trigger Threshold</td>
                  <td className="py-2 text-rose-400">+100</td>
                  <td className="py-2 text-slate-400 font-sans">Optimal decision threshold</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Code Display Container */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
        <div className="px-5 py-3 bg-slate-900/90 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
            <FileCode className="w-4 h-4 text-cyan-400" />
            <span>cognitext_blink_bridge.ino (BioAmp EXG Pill)</span>
          </div>

          <button
            onClick={handleCopy}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <pre className="p-5 text-xs font-mono text-slate-300 overflow-x-auto bg-[#070b14] leading-relaxed max-h-[500px]">
          <code>{ARDUINO_SKETCH}</code>
        </pre>
      </div>

    </div>
  );
};
