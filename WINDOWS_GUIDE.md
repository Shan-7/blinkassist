# 🪟 Windows Deployment & Packaging Guide

This guide explains how to package and run **Blink-Assist** on Windows as an error-free, standalone application that you can package into a `.zip` or `.exe` and distribute to any Windows user.

---

## ⚡ What was Optimized for Windows

1. **DirectShow (CAP_DSHOW) Webcam Backend**:
   - Fixes the common 5–10 second delay and freeze bugs caused by OpenCV's default Windows Media Foundation (MSMF).
   - Automatically detects and falls back from Index 0 to Index 1 (resolves issues where laptops map an IR Windows Hello sensor as camera 0).

2. **Native Windows Speech Synthesis (TTS)**:
   - Uses Windows built-in PowerShell `System.Speech.Synthesis.SpeechSynthesizer`.
   - Runs with `CREATE_NO_WINDOW` and hidden window attributes so **no black command prompt flashes** on screen when cards are announced.
   - Requires zero external binaries or codecs.

3. **High-DPI Razor-Sharp UI**:
   - Calls Windows `SetProcessDpiAwareness(1)` so fonts, cards, and webcam video are crisp on 1080p, 2K, and 4K displays with 125%/150% scaling.

4. **MediaPipe Model Bundling (PyInstaller)**:
   - Configured in [blink_assist.spec](file:///Users/shantanushendre/Blink_Assist/blink_assist.spec) to bundle all required `.tflite` and `.binarypb` FaceMesh graphs so the compiled `.exe` does not crash with missing file errors.

5. **Full Keyboard & Numpad Support**:
   - Supports both top-row and numeric keypad `2` (advance menu) and `3` (select item).

---

## 📦 How to Package into an Executable (One-Click)

### Method A: Folder Distribution & Auto-ZIP (Recommended)
1. On your Windows machine, open this project folder.
2. Double-click **`package_windows.bat`**.
3. The script will:
   - Check your Python installation.
   - Install all required packages (`opencv-python`, `mediapipe`, `Pillow`, `numpy<2`, `pyinstaller`).
   - Run PyInstaller with [blink_assist.spec](file:///Users/shantanushendre/Blink_Assist/blink_assist.spec).
   - Automatically create **`BlinkAssist_Windows.zip`**.
   - Open File Explorer highlighting the output.

### 📤 Sending to End-Users:
- Send **`BlinkAssist_Windows.zip`** to the user.
- The user simply extracts the `.zip` and double-clicks **`BlinkAssist.exe`**.
- **No Python or command prompt needed by the recipient!**

---

### Method B: Single Standalone `.exe`
If you prefer a single `.exe` file instead of a folder:
1. Double-click **`package_singlefile_windows.bat`**.
2. Once complete, you will find **`dist\BlinkAssist-Standalone.exe`**.
3. Send this single file directly to your user.

---

## 🚀 How to Run Directly from Source (No Packaging Needed)

If you have Python installed and want to test or run immediately:
1. Double-click **`run_windows.bat`**.
2. It will set up `.venv`, install requirements, and launch the application.

---

## 🌐 Running the Next.js Web App on Windows

To run the web app with direct Arduino USB Web Serial and BioAmp Oscilloscope:
1. Double-click **`run_web_windows.bat`**.
2. It will install npm modules if needed and launch `http://localhost:3000` in your default browser.

---

## 🛠️ Troubleshooting on Windows

| Issue | Solution |
|---|---|
| **Camera read failed / Black screen** | Make sure Windows Camera Permissions are enabled: `Windows Settings → Privacy & Security → Camera → Allow desktop apps to access your camera`. Also close any apps using the camera (Zoom, Teams). |
| **Laptops with Windows Hello (Dual Camera)** | The app automatically tries Camera Index 1 if Index 0 is the infrared sensor. If needed, you can explicitly set `CAMERA_INDEX = 1` in `config.py`. |
| **Windows SmartScreen warning** | Unsigned custom executables may show a blue SmartScreen prompt. Click **More info** → **Run anyway**. |
| **Pip install fails for MediaPipe** | Use Python 3.10, 3.11, or 3.12 (64-bit). Ensure `numpy<2` is installed. |
