#segments images into jawline, cheek, forehead, temple, chin, and neck regions using mediapipe face mesh
from typing import Optional

import mediapipe as mp
import numpy as np
from PIL import Image, ImageOps

mp_face_mesh = mp.solutions.face_mesh

JAWLINE_CHIN_IDX = [172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397]
LEFT_CHEEK_IDX   = [50, 101, 100, 47, 121, 126, 142, 36, 205, 206]
RIGHT_CHEEK_IDX  = [280, 330, 329, 277, 350, 355, 371, 266, 425, 426]
FOREHEAD_IDX     = [10, 338, 297, 332, 284, 251, 21, 54, 103, 67, 109]

# approximate temple indices (left/right) and chin
LEFT_TEMPLE_IDX = [127, 34, 35, 225]
RIGHT_TEMPLE_IDX = [356, 389, 390, 263]

CHIN_CENTER_IDX = [152, 148, 136]

# bottom-center of the lower lip; used as a floor so jaw crops can't bleed upward into the mouth
LOWER_LIP_IDX = 17


def _jaw_left_right_idx():
    mid = len(JAWLINE_CHIN_IDX) // 2
    return JAWLINE_CHIN_IDX[:mid], JAWLINE_CHIN_IDX[mid:]


def _region_crop(image: Image.Image, landmarks, idx_list, pad_ratio=0.15, pad_top=None, y_floor_idx=None):
    w, h = image.size
    pts = np.array([(landmarks[i].x * w, landmarks[i].y * h) for i in idx_list])
    x_min, y_min = pts.min(axis=0)
    x_max, y_max = pts.max(axis=0)
    pad_x = (x_max - x_min) * pad_ratio
    pad_y_bottom = (y_max - y_min) * pad_ratio
    pad_y_top = (y_max - y_min) * (pad_ratio if pad_top is None else pad_top)

    y_top = y_min - pad_y_top
    y_bottom = y_max + pad_y_bottom
    if y_floor_idx is not None:
        # never let the crop extend above this landmark (e.g. keep jaw crops below the lips) —
        # but only if the landmark actually falls within the box, otherwise an unusual head
        # pose (e.g. a turned profile) could push the floor below y_bottom and invert the box
        floor_y = landmarks[y_floor_idx].y * h
        if floor_y < y_bottom:
            y_top = max(y_top, floor_y)

    box = (
        max(0, x_min - pad_x), max(0, y_top),
        min(w, x_max + pad_x), min(h, y_bottom),
    )
    return image.crop(box)


def _region_crop_with_extend(image: Image.Image, landmarks, idx_list, pad_ratio=0.15, extend_down=0.0):
    """Crop region and optionally extend the box downward (useful for neck regions).

    extend_down is a fraction of the region height to extend below y_max.
    """
    w, h = image.size
    pts = np.array([(landmarks[i].x * w, landmarks[i].y * h) for i in idx_list])
    x_min, y_min = pts.min(axis=0)
    x_max, y_max = pts.max(axis=0)
    region_h = max(1.0, (y_max - y_min))
    pad_x = (x_max - x_min) * pad_ratio
    pad_y = region_h * pad_ratio
    y_max_ext = min(h, y_max + pad_y + region_h * extend_down)
    box = (
        max(0, x_min - pad_x), max(0, y_min - pad_y),
        min(w, x_max + pad_x), y_max_ext,
    )
    return image.crop(box)


def _detect(image_path: str):
    """Load an image and run FaceMesh on it.

    Returns (image, landmarks) on success, or (image, None) if no face was found.
    """
    image = Image.open(image_path)
    # iPhone photos store pixels in the camera's native orientation plus an EXIF
    # tag saying how to rotate for display; PIL ignores that tag by default, so
    # without this, mediapipe detects landmarks on a sideways image and every
    # crop lands on the wrong part of the frame.
    image = ImageOps.exif_transpose(image).convert("RGB")
    arr = np.array(image)

    with mp_face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1) as face_mesh:
        results = face_mesh.process(arr)

    if not results.multi_face_landmarks:
        return image, None
    return image, results.multi_face_landmarks[0].landmark


def segment_front(image_path: str) -> dict:
    """Forehead + chin from the straight-on front photo.

    Raises ValueError if no face is detected — the front photo is required by
    the capture flow, so this is treated as a hard failure.
    """
    image, landmarks = _detect(image_path)
    if landmarks is None:
        raise ValueError("No face detected in photo — retake with clear, front-facing lighting.")

    return {
        "forehead": _region_crop(image, landmarks, FOREHEAD_IDX, pad_top=0.02),
        "chin": _region_crop(image, landmarks, CHIN_CENTER_IDX, pad_ratio=0.25),
    }


def segment_left_profile(image_path: str) -> Optional[dict]:
    """jaw_left/left_temple/left_cheek/neck_left from the left-profile photo.

    Returns None (rather than raising) if no face is detected, so callers can
    degrade gracefully instead of failing the whole request.
    """
    image, landmarks = _detect(image_path)
    if landmarks is None:
        return None

    jaw_left_idx, _ = _jaw_left_right_idx()
    return {
        "jaw_left": _region_crop(image, landmarks, jaw_left_idx, y_floor_idx=LOWER_LIP_IDX),
        "left_temple": _region_crop(image, landmarks, LEFT_TEMPLE_IDX, pad_ratio=0.2),
        "left_cheek": _region_crop(image, landmarks, LEFT_CHEEK_IDX),
        # the turned profile shows more neck than a straight-on photo would
        "neck_left": _region_crop_with_extend(image, landmarks, jaw_left_idx, pad_ratio=0.15, extend_down=1.2),
    }


def segment_right_profile(image_path: str) -> Optional[dict]:
    """jaw_right/right_temple/right_cheek/neck_right from the right-profile photo.

    Returns None (rather than raising) if no face is detected.
    """
    image, landmarks = _detect(image_path)
    if landmarks is None:
        return None

    _, jaw_right_idx = _jaw_left_right_idx()
    return {
        "jaw_right": _region_crop(image, landmarks, jaw_right_idx, y_floor_idx=LOWER_LIP_IDX),
        "right_temple": _region_crop(image, landmarks, RIGHT_TEMPLE_IDX, pad_ratio=0.2),
        "right_cheek": _region_crop(image, landmarks, RIGHT_CHEEK_IDX),
        "neck_right": _region_crop_with_extend(image, landmarks, jaw_right_idx, pad_ratio=0.15, extend_down=1.2),
    }
