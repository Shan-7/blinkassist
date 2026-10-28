"""
eog_input_placeholder.py
-------------------------
Placeholder for the real EOG (Electrooculography) input, e.g. the
Upside Down Labs BioAmp EXG Pill / NeuroPlayground Lite board read over
a serial port.

This is intentionally NOT implemented yet -- the task said to keep the
EOG side "aside for now" and get the camera-based version fully working
first. This file exists so that:

  1. The GUI can already have a working "EOG" toggle option with the
     right shape (start/stop/callbacks), without crashing.
  2. Wiring up the real hardware later is a drop-in job: implement the
     body of `_run()` below and nothing in app_gui.py needs to change.

--------------------------------------------------------------------
Sketch of how the real implementation would work (for later):
--------------------------------------------------------------------
    import serial
    ser = serial.Serial(config.EOG_SERIAL_PORT, config.EOG_BAUD_RATE)
    while running:
        raw = ser.readline()              # one analog sample from the board
        value = int(raw)                  # ADC value from the EOG channel
        # A blink shows up as a sharp spike/dip in `value`. Apply a
        # threshold + refractory-period check, the same way
        # `_register_raw_blink` groups things in blink_detector_camera.py,
        # to turn spikes into single/double/triple blink bursts.
--------------------------------------------------------------------
"""

import threading


class EOGBlinkDetector:
    """
    Same public interface as CameraBlinkDetector so the GUI can switch
    between the two input modes with a single toggle button.
    """

    def __init__(self, on_frame=None, on_blink_burst=None, on_status=None):
        self.on_frame = on_frame
        self.on_blink_burst = on_blink_burst
        self.on_status = on_status
        self._running = threading.Event()

    def start(self):
        self._running.set()
        if self.on_status:
            self.on_status(
                "EOG mode selected, but hardware support is not wired up "
                "yet. Connect the BioAmp/NeuroPlayground board over serial "
                "and implement eog_input_placeholder.py to enable it. "
                "Switch back to Camera mode to use blink detection now."
            )

    def stop(self):
        self._running.clear()

    def is_running(self):
        return self._running.is_set()
