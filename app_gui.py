"""
app_gui.py
----------
Blink-Assist: an eye-blink driven assistive communication board inspired by
the Upside Down Labs M2W project (https://upsidedownlabs.github.io/M2W/).

Detects eye blinks from a standard webcam using MediaPipe FaceMesh and Eye
Aspect Ratio (EAR). Supports cross-platform operation on Windows, macOS, and Linux
with native text-to-speech feedback, high-DPI scaling, and simulated keyboard triggers.

Interaction model:
    Double blink (or '2') -> activate menu / advance focus to the next card
    Triple blink (or '3') -> select the currently highlighted card & speak aloud
"""

import os
import sys
import time
import subprocess
import threading
import tkinter as tk
from tkinter import ttk

import cv2
from PIL import Image, ImageTk

import config
from blink_detector_camera import CameraBlinkDetector
from eog_input_placeholder import EOGBlinkDetector


# ----------------------------------------------------------------------
# Windows High-DPI Scaling: makes text & UI razor sharp on modern displays
# ----------------------------------------------------------------------
if sys.platform == "win32":
    try:
        import ctypes
        ctypes.windll.shcore.SetProcessDpiAwareness(1)
    except Exception:
        try:
            ctypes.windll.user32.SetProcessDPIAware()
        except Exception:
            pass


# ----------------------------------------------------------------------
# Cross-Platform Text-to-Speech (Non-Blocking, No Console Popup)
# ----------------------------------------------------------------------
def speak_aloud(text: str):
    """
    Announce text aloud without freezing the GUI.
    - Windows: Uses built-in PowerShell SAPI SpeechSynthesizer with CREATE_NO_WINDOW
               (works out of the box with zero external packages; no black cmd popup).
    - macOS: Uses native 'say'.
    - Linux: Uses 'spd-say' or 'espeak' if installed.
    """
    def _speech_worker():
        try:
            if sys.platform == "win32":
                clean_text = text.replace("'", " ").replace('"', " ").strip()
                ps_script = (
                    "Add-Type -AssemblyName System.Speech; "
                    f"(New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('{clean_text}')"
                )
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                startupinfo.wShowWindow = 0  # SW_HIDE
                # 0x08000000 = CREATE_NO_WINDOW
                subprocess.run(
                    ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_script],
                    startupinfo=startupinfo,
                    creationflags=0x08000000,
                    timeout=6,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
            elif sys.platform == "darwin":
                subprocess.run(
                    ["say", text],
                    timeout=5,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
            else:
                for bin_name in ["spd-say", "espeak"]:
                    try:
                        subprocess.run(
                            [bin_name, text],
                            timeout=5,
                            stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL,
                        )
                        break
                    except FileNotFoundError:
                        continue
        except Exception:
            pass

    threading.Thread(target=_speech_worker, daemon=True).start()


class BlinkAssistApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Blink-Assist — Neuro-Assistive Interface")
        self.root.geometry("1000x640")
        self.root.minsize(900, 560)
        self.root.configure(bg="#101418")

        # Set application window icon if present
        self._setup_window_icon()

        # ---- app state -------------------------------------------------
        self.mode = tk.StringVar(value="camera")   # "camera" or "eog"
        self.detector = None
        self.menu_active = False
        self.current_index = 0
        self.selection_flash_job = None

        self._latest_photo = None  # keep a ref so Tk doesn't GC the image

        self._build_ui()
        self._update_menu_ui()

    def _setup_window_icon(self):
        try:
            ico_path = config.get_resource_path("icon.ico")
            png_path = config.get_resource_path("icon.png")
            if sys.platform == "win32" and os.path.exists(ico_path):
                self.root.iconbitmap(default=ico_path)
            elif os.path.exists(png_path):
                icon_img = ImageTk.PhotoImage(Image.open(png_path))
                self.root.iconphoto(True, icon_img)
        except Exception:
            pass

    # ------------------------------------------------------------------
    # UI construction
    # ------------------------------------------------------------------
    def _build_ui(self):
        FG = "#e8ecef"
        SUB = "#8b98a5"
        ACCENT = "#3ea6ff"

        style = ttk.Style()
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass

        # ---- top bar: title + mode toggle + start/stop -----------------
        top = tk.Frame(self.root, bg="#161b22")
        top.pack(side="top", fill="x")

        tk.Label(
            top, text="Blink-Assist", bg="#161b22", fg=FG,
            font=("Segoe UI", 16, "bold"), padx=16, pady=12,
        ).pack(side="left")

        toggle_frame = tk.Frame(top, bg="#161b22")
        toggle_frame.pack(side="left", padx=20)

        tk.Label(toggle_frame, text="Input source:", bg="#161b22", fg=SUB,
                 font=("Segoe UI", 10)).pack(side="left", padx=(0, 8))

        self.cam_radio = tk.Radiobutton(
            toggle_frame, text="Camera (Webcam EAR)", variable=self.mode,
            value="camera", command=self._on_mode_change, bg="#161b22", fg=FG,
            selectcolor="#22303c", activebackground="#161b22",
            activeforeground=FG, font=("Segoe UI", 10, "bold"),
            indicatoron=True,
        )
        self.cam_radio.pack(side="left", padx=4)

        self.eog_radio = tk.Radiobutton(
            toggle_frame, text="EOG (BioAmp Hardware)", variable=self.mode,
            value="eog", command=self._on_mode_change, bg="#161b22", fg=FG,
            selectcolor="#22303c", activebackground="#161b22",
            activeforeground=FG, font=("Segoe UI", 10, "bold"),
            indicatoron=True,
        )
        self.eog_radio.pack(side="left", padx=4)

        self.start_btn = tk.Button(
            top, text="\u25b6 Start Camera", command=self._toggle_start_stop,
            bg=ACCENT, fg="#0b0f13", activebackground="#5cb8ff",
            font=("Segoe UI", 10, "bold"), relief="flat", padx=14, pady=6,
            cursor="hand2",
        )
        self.start_btn.pack(side="right", padx=16)

        # ---- main body: camera (left) + menu (right) -------------------
        body = tk.Frame(self.root, bg="#101418")
        body.pack(side="top", fill="both", expand=True, padx=14, pady=14)

        # Camera panel
        cam_panel = tk.Frame(body, bg="#161b22")
        cam_panel.pack(side="left", fill="both", expand=True, padx=(0, 10))

        tk.Label(cam_panel, text="Camera preview", bg="#161b22", fg=SUB,
                 font=("Segoe UI", 10, "bold")).pack(anchor="w", padx=10, pady=(10, 0))

        self.video_label = tk.Label(cam_panel, bg="#0b0f13")
        self.video_label.pack(padx=10, pady=10, fill="both", expand=True)
        self._show_placeholder_frame("Press \u25b6 Start Camera to begin")

        stats = tk.Frame(cam_panel, bg="#161b22")
        stats.pack(fill="x", padx=10, pady=(0, 10))

        self.eye_state_var = tk.StringVar(value="Eyes: \u2014")
        self.ear_var = tk.StringVar(value="EAR: \u2014")
        self.burst_var = tk.StringVar(value="Last blink burst: \u2014")

        tk.Label(stats, textvariable=self.eye_state_var, bg="#161b22", fg=FG,
                 font=("Consolas", 11)).pack(anchor="w")
        tk.Label(stats, textvariable=self.ear_var, bg="#161b22", fg=FG,
                 font=("Consolas", 11)).pack(anchor="w")
        tk.Label(stats, textvariable=self.burst_var, bg="#161b22", fg=ACCENT,
                 font=("Consolas", 11, "bold")).pack(anchor="w")

        # Menu panel
        menu_panel = tk.Frame(body, bg="#161b22")
        menu_panel.pack(side="left", fill="both", expand=True)

        tk.Label(menu_panel, text="Assistive Communication Board", bg="#161b22",
                 fg=SUB, font=("Segoe UI", 10, "bold")).pack(anchor="w", padx=10, pady=(10, 0))

        self.menu_state_var = tk.StringVar(value="MENU INACTIVE \u2014 double blink (or key '2') to activate")
        tk.Label(menu_panel, textvariable=self.menu_state_var, bg="#161b22",
                 fg="#f2c94c", font=("Segoe UI", 11, "bold")).pack(anchor="w", padx=10, pady=(4, 10))

        grid = tk.Frame(menu_panel, bg="#161b22")
        grid.pack(padx=10, pady=6, fill="both", expand=True)

        self.item_labels = []
        cols = 2
        for i, item in enumerate(config.MENU_ITEMS):
            r, c = divmod(i, cols)
            grid.grid_rowconfigure(r, weight=1)
            grid.grid_columnconfigure(c, weight=1)
            lbl = tk.Label(
                grid, text=item, bg="#22303c", fg=FG,
                font=("Segoe UI", 14, "bold"), relief="flat",
            )
            lbl.grid(row=r, column=c, sticky="nsew", padx=6, pady=6, ipadx=10, ipady=24)
            self.item_labels.append(lbl)

        self.selection_banner = tk.Label(
            menu_panel, text="", bg="#161b22", fg="#27d17f",
            font=("Segoe UI", 15, "bold"),
        )
        self.selection_banner.pack(pady=(0, 10))

        how_it_works = (
            "How it works:\n"
            "  1) Click '\u25b6 Start Camera' to track eyes.\n"
            "  2) Double blink (or press '2') to activate menu & cycle items.\n"
            "  3) Triple blink (or press '3') to select & announce out loud.\n"
            "Keyboard simulation: press '2' or '3' (or Numpad 2/3) anytime."
        )
        tk.Label(menu_panel, text=how_it_works, justify="left", bg="#161b22",
                 fg=SUB, font=("Segoe UI", 9)).pack(anchor="w", padx=10, pady=(0, 10))

        # ---- status bar --------------------------------------------------
        self.status_var = tk.StringVar(value="Ready. Choose camera input and click Start Camera.")
        status_bar = tk.Label(
            self.root, textvariable=self.status_var, bg="#0b0f13", fg=SUB,
            anchor="w", font=("Segoe UI", 9), padx=10, pady=6,
        )
        status_bar.pack(side="bottom", fill="x")

        # keyboard shortcuts for testing both top row & numeric keypad
        for key in ["2", "<KP_2>"]:
            self.root.bind(key, lambda e: self._on_blink_burst(2))
        for key in ["3", "<KP_3>"]:
            self.root.bind(key, lambda e: self._on_blink_burst(3))

        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

    # ------------------------------------------------------------------
    # Mode / start-stop handling
    # ------------------------------------------------------------------
    def _on_mode_change(self):
        if self.detector is not None and self.detector.is_running():
            self._stop_detector()
            self._start_detector()

    def _toggle_start_stop(self):
        if self.detector is not None and self.detector.is_running():
            self._stop_detector()
            self.start_btn.config(text="\u25b6 Start Camera")
        else:
            self._start_detector()
            self.start_btn.config(text="\u25a0 Stop Camera")

    def _start_detector(self):
        if self.mode.get() == "camera":
            self.detector = CameraBlinkDetector(
                on_frame=self._on_frame,
                on_blink_burst=self._threadsafe_blink_burst,
                on_status=self._threadsafe_status,
            )
        else:
            self.detector = EOGBlinkDetector(
                on_frame=self._on_frame,
                on_blink_burst=self._threadsafe_blink_burst,
                on_status=self._threadsafe_status,
            )
        self.detector.start()

    def _stop_detector(self):
        if self.detector is not None:
            if hasattr(self.detector, "close"):
                self.detector.close()
            else:
                self.detector.stop()
            self.detector = None
        self._show_placeholder_frame("Camera Stopped")
        self.eye_state_var.set("Eyes: \u2014")
        self.ear_var.set("EAR: \u2014")

    def _on_close(self):
        self._stop_detector()
        try:
            self.root.destroy()
        except Exception:
            pass

    # ------------------------------------------------------------------
    # Callbacks from the detector's background thread
    # ------------------------------------------------------------------
    def _threadsafe_status(self, message):
        if self.root.winfo_exists():
            self.root.after(0, self.status_var.set, message)

    def _threadsafe_blink_burst(self, count):
        if self.root.winfo_exists():
            self.root.after(0, self._on_blink_burst, count)

    def _on_frame(self, frame_bgr, ear, eyes_closed):
        display = frame_bgr.copy()
        if ear is not None:
            state_text = "CLOSED" if eyes_closed else "OPEN"
            color = (60, 60, 240) if eyes_closed else (80, 220, 80)
            cv2.putText(display, f"EAR: {ear:.2f}  Eyes: {state_text}",
                        (12, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
        else:
            cv2.putText(display, "No face detected", (12, 26),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 165, 255), 2)

        rgb = cv2.cvtColor(display, cv2.COLOR_BGR2RGB)
        img = Image.fromarray(rgb)
        if self.root.winfo_exists():
            self.root.after(0, self._update_video_label, img, ear, eyes_closed)

    def _update_video_label(self, img, ear, eyes_closed):
        if not self.root.winfo_exists():
            return
        try:
            photo = ImageTk.PhotoImage(image=img)
            self.video_label.configure(image=photo)
            self._latest_photo = photo

            if ear is not None:
                self.ear_var.set(f"EAR: {ear:.3f}")
                self.eye_state_var.set(f"Eyes: {'CLOSED' if eyes_closed else 'OPEN'}")
            else:
                self.ear_var.set("EAR: \u2014 (no face)")
                self.eye_state_var.set("Eyes: \u2014")
        except tk.TclError:
            pass

    def _show_placeholder_frame(self, text):
        img = Image.new("RGB", (config.FRAME_WIDTH, config.FRAME_HEIGHT), (11, 15, 19))
        try:
            self.video_label.configure(image="", text=text, fg="#8b98a5",
                                         font=("Segoe UI", 12), compound="center")
            self._latest_photo = ImageTk.PhotoImage(image=img)
        except tk.TclError:
            pass

    # ------------------------------------------------------------------
    # Menu / blink-burst logic
    # ------------------------------------------------------------------
    def _on_blink_burst(self, count):
        self.burst_var.set(f"Last blink burst: {count}x blink")

        if count == 2:
            if not self.menu_active:
                self.menu_active = True
                self.current_index = 0
                self.status_var.set("Menu activated. Double blink to move, triple blink to select.")
            else:
                self.current_index = (self.current_index + 1) % len(config.MENU_ITEMS)
                self.status_var.set(f"Highlighted: {config.MENU_ITEMS[self.current_index]}")
            self._update_menu_ui()

        elif count >= 3:
            if self.menu_active:
                selected = config.MENU_ITEMS[self.current_index]
                self._flash_selection(selected)
                self.status_var.set(f"Selected: {selected}")
                self.menu_active = False
                self._update_menu_ui()
            else:
                self.status_var.set("Menu is inactive. Double blink (or press 2) first to activate.")

    ITEM_COLORS = {
        "Food": "#f97316",
        "Help": "#ef4444",
        "Outing": "#3b82f6",
        "Television": "#6366f1",
        "Washroom": "#a855f7",
        "Water": "#06b6d4",
    }

    def _update_menu_ui(self):
        for i, lbl in enumerate(self.item_labels):
            item_name = config.MENU_ITEMS[i]
            accent_color = self.ITEM_COLORS.get(item_name, "#3ea6ff")
            if self.menu_active and i == self.current_index:
                lbl.configure(bg=accent_color, fg="#ffffff")
            else:
                lbl.configure(bg="#22303c", fg="#e8ecef")

        if self.menu_active:
            self.menu_state_var.set(
                f"MENU ACTIVE \u2014 highlighting \u201c{config.MENU_ITEMS[self.current_index]}\u201d"
            )
        else:
            self.menu_state_var.set("MENU INACTIVE \u2014 double blink (or press 2) to activate")

    def _flash_selection(self, selected_text):
        if not self.root.winfo_exists():
            return
        accent_color = self.ITEM_COLORS.get(selected_text, "#27d17f")
        self.selection_banner.configure(text=f"\u2713 Selected: {selected_text}", fg=accent_color)

        # Cross-platform audio announcement
        speak_aloud(f"{selected_text} requested")

        if self.selection_flash_job is not None:
            try:
                self.root.after_cancel(self.selection_flash_job)
            except Exception:
                pass
        self.selection_flash_job = self.root.after(3000, self._clear_selection_banner)

    def _clear_selection_banner(self):
        if self.root.winfo_exists():
            self.selection_banner.configure(text="")


def main():
    root = tk.Tk()
    app = BlinkAssistApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
