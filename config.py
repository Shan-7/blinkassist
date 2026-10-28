"""
config.py
---------
Shared configuration for the Blink-Assist application.

Keeping every tunable value in one place makes it easy to calibrate the
blink detector for a different person / camera / lighting condition without
touching the detection or GUI logic.
"""

import os
import sys


def get_resource_path(relative_path: str) -> str:
    """
    Get absolute path to resource, works for dev and for PyInstaller bundle.
    When running as a PyInstaller executable, sys._MEIPASS holds the temp directory.
    """
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        return os.path.join(sys._MEIPASS, relative_path)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, relative_path)


# ----------------------------------------------------------------------
# Menu (same 6 categories shown on the M2W assistive-communication board)
# ----------------------------------------------------------------------
MENU_ITEMS = ["Food", "Help", "Outing", "Television", "Washroom", "Water"]

# ----------------------------------------------------------------------
# Camera / EAR (Eye Aspect Ratio) blink-detection tuning
# ----------------------------------------------------------------------
# EAR drops sharply when the eyes close. A typical open eye EAR is ~0.28-0.35.
# Tune EAR_THRESHOLD down if blinks are missed, up if blinks are falsely
# triggered by squinting.
EAR_THRESHOLD = 0.21

# Minimum number of consecutive "closed-eye" frames required before a frame
# sequence counts as a real blink (filters out single-frame noise).
EAR_CONSEC_FRAMES = 2

# ----------------------------------------------------------------------
# Blink grouping (turns raw single blinks into double / triple blink events)
# ----------------------------------------------------------------------
# Maximum gap (seconds) allowed between two consecutive blinks for them to
# be counted as part of the same "burst" (e.g. the two blinks of a double
# blink). If the gap is larger, the burst is closed and evaluated.
MAX_GAP_BETWEEN_BLINKS = 0.6

# Time (seconds) to wait, after the last blink in a burst, before deciding
# the burst is finished and firing the corresponding event.
BURST_FINALIZE_DELAY = 0.55

# A burst of exactly 1 blink is treated as a natural / involuntary blink and
# ignored, so the user's normal blinking does not accidentally trigger the
# menu. Only 2-blink and 3+-blink bursts are meaningful, exactly like M2W:
#   2 blinks (double blink) -> activate menu / move to next option
#   3 or more blinks -> select the highlighted option
IGNORE_SINGLE_BLINKS = True

# ----------------------------------------------------------------------
# Camera settings
# ----------------------------------------------------------------------
CAMERA_INDEX = 0
FRAME_WIDTH = 640
FRAME_HEIGHT = 480

# ----------------------------------------------------------------------
# EOG placeholder settings (kept aside for later, see eog_input_placeholder.py)
# ----------------------------------------------------------------------
EOG_SERIAL_PORT = "COM3"      # change to e.g. "/dev/ttyUSB0" on Linux/Mac
EOG_BAUD_RATE = 115200
