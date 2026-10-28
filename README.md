# CogniText x M2W — Blink-Assist Neuro-Driven Interface

A comprehensive assistive communication system and IoT hardware control platform driven by eye blinks, inspired by [Upside Down Labs M2W](https://upsidedownlabs.github.io/M2W/) and [Cognitext](https://minor-project-nexus-cognitext.vercel.app/).

The system supports two complementary interfaces:
1. **Next.js Web Application (`web/`)**: Modern v0-inspired web app with **direct Arduino USB Web Serial API**, **Web Bluetooth (BLE)**, **Web Speech API audio announcements**, **60 FPS bio-potential oscilloscope**, and **IoT device relays**.
2. **Python Desktop Application (`app_gui.py`)**: Local desktop application running MediaPipe FaceMesh + Eye Aspect Ratio (EAR) blink detection on your webcam with native text-to-speech feedback.
3. **Arduino Firmware (`cognitext_blink_bridge.ino`)**: Ready-to-flash C++ sketch for Arduino Uno/Nano/ESP32 + BioAmp EXG Pill.

---

## 🚀 Quick Start: Next.js Web Application

The web interface connects directly to your Arduino over USB via the **Web Serial API** (Chrome, Edge, Brave, Opera) with zero extra drivers or software needed!

### 1. Launch the Web App
```bash
cd web
npm install
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 2. Connect Arduino Hardware
1. Connect your Arduino Uno / Nano / ESP32 to your computer via USB.
2. In the web app, click **Connect Hardware** in the top navigation.
3. Select **Arduino USB Serial (Web Serial API)** and baud rate (`115200`).
4. Click **Connect** and select your Arduino serial port.

### 3. Interaction Model (Double & Triple Blink)
- **⚡ Double Blink (`2`)**: Activates the menu or advances focus to the next card (Food → Water → Help → Washroom → TV → Emergency Bell → Outing → Caregiver).
- **✨ Triple Blink (`3`)**: Selects the active item, triggers celebratory confetti, sounds a melodic chime, announces the phrase out loud via Web Speech, and sends serial control commands to the Arduino!
- **Keyboard Simulation**: You can press the **`2`** key for double blink and **`3`** key for triple blink anytime to test without hardware.

---

## ⚡ Arduino Hardware Setup & Firmware

Flash `cognitext_blink_bridge.ino` to your Arduino using Arduino IDE.

### Pinout Connections
| Sensor / Peripheral | Arduino Pin | Description |
|---|---|---|
| **BioAmp OUT** | `A0` (Analog In) | Raw Electrooculography (EOG) signal |
| **BioAmp VCC** | `5V` or `3.3V` | Sensor power supply |
| **BioAmp GND** | `GND` | Ground reference |
| **LED / Room Light Relay** | Pin `13` | Actuator for `CMD:LIGHT_ON` / `OFF` |
| **Piezo Buzzer** | Pin `8` | Audible alarm for `CMD:BUZZER_ON` |
| **Motorized Bed Relay** | Pin `7` | Headrest actuator for `CMD:BED_UP` |
| **Cooling Fan Relay** | Pin `6` | Motor relay for `CMD:FAN_ON` |

---

## 🖥️ Python Desktop Application (Webcam AI & Windows Support)

The Python desktop version runs OpenCV + MediaPipe FaceMesh on your webcam to calculate Eye Aspect Ratio (EAR) with cross-platform support for **Windows, macOS, and Linux**:

### 🪟 Windows (Double-Click Launchers)
- **Run without packaging**: Double-click [`run_windows.bat`](file:///Users/shantanushendre/Blink_Assist/run_windows.bat)
- **Build ready-to-share `.zip` package**: Double-click [`package_windows.bat`](file:///Users/shantanushendre/Blink_Assist/package_windows.bat) -> produces `BlinkAssist_Windows.zip` containing `BlinkAssist.exe` with all MediaPipe models bundled!
- **Build standalone single `.exe`**: Double-click [`package_singlefile_windows.bat`](file:///Users/shantanushendre/Blink_Assist/package_singlefile_windows.bat) -> produces `dist\BlinkAssist-Standalone.exe`
- For detailed instructions, see [WINDOWS_GUIDE.md](file:///Users/shantanushendre/Blink_Assist/WINDOWS_GUIDE.md).

### 🍎 macOS / Linux
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app_gui.py
```

### Features:
- **DirectShow Camera Backend**: Instant webcam startup on Windows with auto-fallback for Windows Hello dual cameras.
- **Cross-Platform Speech Synthesis**: Native Windows PowerShell SAPI without command prompt flicker, native macOS `say`, and Linux TTS.
- **High-DPI Razor-Sharp UI**: High-resolution scaling on Windows displays.
- Real-time webcam feed with live EAR indicator and OPEN/CLOSED badge.
- Color-coded M2W category cards (Food, Help, Outing, Television, Washroom, Water).
- Keyboard & Numpad testing shortcuts: Press `2` for double blink, `3` for triple blink.

---

## 📂 Project Structure

```
Blink_Assist/
├── app_gui.py                      # Python desktop GUI (Windows, macOS, Linux)
├── blink_detector_camera.py        # MediaPipe EAR webcam detector (DirectShow & fallback)
├── config.py                       # Shared thresholds & PyInstaller resource resolver
├── requirements.txt                # Python dependencies (NumPy < 2, PyInstaller)
├── blink_assist.spec               # PyInstaller folder bundle spec
├── blink_assist_singlefile.spec    # PyInstaller single-file spec
├── package_windows.bat             # 1-Click Windows packager & ZIP generator
├── package_singlefile_windows.bat  # 1-Click Windows single-EXE builder
├── run_windows.bat                 # 1-Click Windows desktop launcher
├── run_web_windows.bat             # 1-Click Windows web app launcher
├── WINDOWS_GUIDE.md                # Windows deployment & packaging instructions
├── icon.ico / icon.png             # Application brand icons
├── cognitext_blink_bridge.ino      # Arduino C++ firmware for BioAmp EOG & Relays
├── web/                            # Next.js Web Application
│   ├── src/
│   │   ├── app/                    # Dashboard page & layout
│   │   ├── components/             # Assistive grid, Relays, Oscilloscope, Hardware Modal
│   │   └── lib/                    # Web Serial API & Speech synthesizer
│   └── package.json
└── README.md
```

