"""
blink_detector_camera.py
-------------------------
Camera based replacement for the EOG "blink" signal.

The original hardware (BioAmp NeuroPlayground / EXG Pill) detects blinks by
looking for characteristic spikes in the EOG (Electrooculography) signal
recorded near the eyes. Here we detect the same *event* -- an eye blink --
but from a normal webcam, using MediaPipe FaceMesh landmarks and the
Eye Aspect Ratio (EAR) technique:

    EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)

EAR stays roughly constant while the eye is open and drops sharply for a
few frames when the eye closes -> that dip is a blink.

This module does NOT touch the GUI. It exposes a small, thread-safe
`CameraBlinkDetector` class that:
    1. Continuously grabs frames from the webcam.
    2. Computes EAR each frame and detects raw blinks.
    3. Groups raw blinks that happen close together in time into
       "bursts" (single / double / triple blink) exactly like the M2W
       EOG device does.
    4. Reports frames (for preview) and blink events through callbacks,
       so the GUI just has to subscribe and update widgets.
"""

import threading
import time
import cv2
import numpy as np
import mediapipe as mp

import config


# MediaPipe FaceMesh landmark indices for the 6 EAR points of each eye.
# These are the widely-used indices for the 468-point face mesh.
LEFT_EYE = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33, 160, 158, 133, 153, 144]


def _euclidean(a, b):
    return float(np.linalg.norm(np.array(a) - np.array(b)))


def _eye_aspect_ratio(landmarks, eye_indices, w, h):
    pts = [(landmarks[i].x * w, landmarks[i].y * h) for i in eye_indices]
    p1, p2, p3, p4, p5, p6 = pts
    vertical_1 = _euclidean(p2, p6)
    vertical_2 = _euclidean(p3, p5)
    horizontal = _euclidean(p1, p4)
    if horizontal == 0:
        return 0.0
    return (vertical_1 + vertical_2) / (2.0 * horizontal)


class CameraBlinkDetector:
    """
    Runs webcam capture + blink detection on a background thread.

    Callbacks (all optional, called from the background thread -- GUI code
    subscribing to these must marshal back to the UI thread, e.g. via
    `root.after(0, ...)` in Tkinter):

        on_frame(frame_bgr, ear_value, eyes_closed: bool)
            Fired every processed frame. Use this to update the live
            camera preview and an on-screen EAR / eye-state indicator.

        on_blink_burst(count: int)
            Fired once a "burst" of blinks finishes. `count` is 2 for a
            double blink, 3 for a triple blink. Single blinks are
            swallowed (see config.IGNORE_SINGLE_BLINKS) so ordinary
            involuntary blinking does not trigger the menu.

        on_status(message: str)
            Fired for human-readable status updates (camera opened,
            face not found, camera error, etc).
    """

    def __init__(self, on_frame=None, on_blink_burst=None, on_status=None):
        self.on_frame = on_frame
        self.on_blink_burst = on_blink_burst
        self.on_status = on_status

        self._thread = None
        self._running = threading.Event()

        self._face_mesh = mp.solutions.face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )

        # Raw-blink (EAR dip) state
        self._consec_closed_frames = 0
        self._eye_currently_closed = False

        # Burst grouping state
        self._burst_count = 0
        self._last_blink_time = 0.0
        self._burst_lock = threading.Lock()
        self._burst_timer = None

    # ------------------------------------------------------------------
    # Public control
    # ------------------------------------------------------------------
    def start(self):
        if self._running.is_set():
            return
        self._running.set()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self):
        self._running.clear()
        if self._thread is not None:
            self._thread.join(timeout=2.0)
            self._thread = None
        self._cancel_burst_timer()

    def close(self):
        self.stop()
        if hasattr(self, "_face_mesh") and self._face_mesh is not None:
            try:
                self._face_mesh.close()
            except Exception:
                pass

    def is_running(self):
        return self._running.is_set()

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------
    def _emit_status(self, msg):
        if self.on_status:
            self.on_status(msg)

    def _open_capture(self, index):
        import sys
        if sys.platform.startswith("win"):
            # DirectShow initializes immediately on Windows and avoids Media Foundation bugs
            cap = cv2.VideoCapture(index, cv2.CAP_DSHOW)
            if cap is not None and cap.isOpened():
                return cap
            if cap is not None:
                cap.release()
            return cv2.VideoCapture(index)
        return cv2.VideoCapture(index)

    def _run(self):
        cap = self._open_capture(config.CAMERA_INDEX)

        # Fallback to index 1 if index 0 is not opened (common on Windows laptops with IR/Hello sensors)
        if (cap is None or not cap.isOpened()) and config.CAMERA_INDEX == 0:
            if cap is not None:
                cap.release()
            cap = self._open_capture(1)

        if cap is None or not cap.isOpened():
            self._emit_status(
                "Could not open webcam (index {}). Ensure camera is connected, "
                "not used by Zoom/Teams, and camera permissions are allowed in Windows Settings.".format(
                    config.CAMERA_INDEX
                )
            )
            self._running.clear()
            return

        cap.set(cv2.CAP_PROP_FRAME_WIDTH, config.FRAME_WIDTH)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, config.FRAME_HEIGHT)

        self._emit_status("Camera started. Looking for your face...")

        try:
            while self._running.is_set():
                ok, frame = cap.read()
                if not ok:
                    self._emit_status("Camera read failed.")
                    time.sleep(0.05)
                    continue

                frame = cv2.flip(frame, 1)  # mirror, feels natural on screen
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = self._face_mesh.process(rgb)

                ear = None
                eyes_closed = False

                if results.multi_face_landmarks:
                    h, w = frame.shape[:2]
                    landmarks = results.multi_face_landmarks[0].landmark
                    left_ear = _eye_aspect_ratio(landmarks, LEFT_EYE, w, h)
                    right_ear = _eye_aspect_ratio(landmarks, RIGHT_EYE, w, h)
                    ear = (left_ear + right_ear) / 2.0
                    eyes_closed = ear < config.EAR_THRESHOLD
                    self._process_ear(eyes_closed)
                else:
                    # Lost the face -- reset closed-frame streak to avoid
                    # spurious blinks once the face re-appears.
                    self._consec_closed_frames = 0

                if self.on_frame:
                    self.on_frame(frame, ear, eyes_closed)

        finally:
            cap.release()
            self._emit_status("Camera stopped.")

    def _process_ear(self, eyes_closed):
        """Raw EAR-dip -> single blink detection (runs every frame)."""
        if eyes_closed:
            self._consec_closed_frames += 1
        else:
            if self._consec_closed_frames >= config.EAR_CONSEC_FRAMES:
                self._register_raw_blink()
            self._consec_closed_frames = 0

    def _register_raw_blink(self):
        """A single physical blink was detected -- feed it into the burst grouper."""
        now = time.time()
        with self._burst_lock:
            gap = now - self._last_blink_time
            if self._burst_count > 0 and gap > config.MAX_GAP_BETWEEN_BLINKS:
                # Too much time passed since the previous blink in this
                # burst; the old burst should already have been finalized
                # by the timer, but guard against races.
                self._burst_count = 0

            self._burst_count += 1
            self._last_blink_time = now

            self._cancel_burst_timer()
            self._burst_timer = threading.Timer(
                config.BURST_FINALIZE_DELAY, self._finalize_burst
            )
            self._burst_timer.daemon = True
            self._burst_timer.start()

    def _finalize_burst(self):
        with self._burst_lock:
            count = self._burst_count
            self._burst_count = 0
            self._burst_timer = None

        if count <= 0:
            return
        if count == 1 and config.IGNORE_SINGLE_BLINKS:
            return  # natural blink, ignore

        if self.on_blink_burst:
            self.on_blink_burst(count)

    def _cancel_burst_timer(self):
        if self._burst_timer is not None:
            self._burst_timer.cancel()
            self._burst_timer = None
