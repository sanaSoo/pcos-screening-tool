#segments images into jawline, cheek, forehead, temple, chin, and neck regions using mediapipe
from typing import Optional

import mediapipe as mp
import numpy as np
from PIL import Image, ImageOps

mp_face_mesh = mp.solutions.face_mesh
mp_face_detection = mp.solutions.face_detection

JAWLINE_CHIN_IDX = [172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397]
LEFT_CHEEK_IDX   = [50, 101, 100, 47, 121, 126, 142, 36, 205, 206]
RIGHT_CHEEK_IDX  = [280, 330, 329, 277, 350, 355, 371, 266, 425, 426]
FOREHEAD_IDX     = [10, 338, 297, 332, 284, 251, 21, 54, 103, 67, 109]

# approximate temple indices (left/right) and chin
LEFT_TEMPLE_IDX = [127, 34, 35, 225]
RIGHT_TEMPLE_IDX = [356, 389, 390, 263]

CHIN_CENTER_IDX = [152, 148, 136]

# Proportional bands within a detected profile face bounding box, expressed
# as (top_frac, bottom_frac) of box height, 0 = top of box. These are
# first-pass estimates based on typical face proportions, not measured from
# real profile photos yet -- expect to tune once test photos are available,
# especially `neck`, which deliberately extends below the box since no
# face-detection model outputs neck landmarks.
PROFILE_REGIONS = {
    "temple": (0.0, 0.30),
    "cheek": (0.30, 0.60),
    "jaw": (0.60, 0.88),
    "neck": (0.88, 1.35),
}


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
        # never let the crop extend above this landmark (e.g. keep jaw crops below the lips) --
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


def _load_image(image_path: str) -> Image.Image:
    image = Image.open(image_path)
    # iPhone photos store pixels in the camera's native orientation plus an EXIF
    # tag saying how to rotate for display; PIL ignores that tag by default, so
    # without this, mediapipe detects landmarks on a sideways image and every
    # crop lands on the wrong part of the frame.
    return ImageOps.exif_transpose(image).convert("RGB")


def _detect_mesh(image_path: str):
    """Load an image and run FaceMesh on it.

    Returns (image, landmarks) on success, or (image, None) if no face was found.
    """
    image = _load_image(image_path)
    arr = np.array(image)

    with mp_face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1) as face_mesh:
        results = face_mesh.process(arr)

    if not results.multi_face_landmarks:
        return image, None
    return image, results.multi_face_landmarks[0].landmark


def _detect_face_box(image_path: str):
    """Load an image and run Face Detection (not Face Mesh) on it.

    Face Mesh's 468-point model is trained on largely frontal faces and is
    unreliable at true profile angles -- plus it has no neck landmarks at
    all. Face Detection just needs a bounding box, which holds up much
    better off-axis, and lets the neck region be derived proportionally
    below the box instead of requiring landmarks that don't exist.

    Returns (image, box) where box is (x_min, y_min, x_max, y_max) in pixel
    coordinates, or (image, None) if no face was found.
    """
    image = _load_image(image_path)
    arr = np.array(image)
    w, h = image.size

    with mp_face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5) as detector:
        results = detector.process(arr)

    if not results.detections:
        return image, None

    box = results.detections[0].location_data.relative_bounding_box
    x_min = max(0, box.xmin * w)
    y_min = max(0, box.ymin * h)
    x_max = min(w, (box.xmin + box.width) * w)
    y_max = min(h, (box.ymin + box.height) * h)
    return image, (x_min, y_min, x_max, y_max)


def _profile_region_crop(image: Image.Image, face_box, top_frac: float, bottom_frac: float) -> Image.Image:
    x_min, y_min, x_max, y_max = face_box
    box_h = y_max - y_min
    w, h = image.size
    top = max(0, y_min + box_h * top_frac)
    bottom = min(h, y_min + box_h * bottom_frac)
    return image.crop((x_min, top, x_max, bottom))


def segment_front(image_path: str) -> dict:
    """forehead, left/right temple, left/right cheek, chin from the
    straight-on front photo, via Face Mesh landmarks.

    Raises ValueError if no face is detected -- the front photo is required
    by the capture flow, so this is treated as a hard failure.
    """
    image, landmarks = _detect_mesh(image_path)
    if landmarks is None:
        raise ValueError(
            "No face detected in front photo — retake facing the camera directly, with even lighting."
        )

    return {
        "forehead": _region_crop(image, landmarks, FOREHEAD_IDX, pad_top=0.02),
        "left_temple": _region_crop(image, landmarks, LEFT_TEMPLE_IDX, pad_ratio=0.2),
        "right_temple": _region_crop(image, landmarks, RIGHT_TEMPLE_IDX, pad_ratio=0.2),
        "left_cheek": _region_crop(image, landmarks, LEFT_CHEEK_IDX),
        "right_cheek": _region_crop(image, landmarks, RIGHT_CHEEK_IDX),
        "chin": _region_crop(image, landmarks, CHIN_CENTER_IDX, pad_ratio=0.25),
    }


def segment_left_profile(image_path: str) -> dict:
    """temple, cheek, jaw, neck from the left-profile photo, via a Face
    Detection bounding box proportionally divided into bands (see
    PROFILE_REGIONS). Only jaw/neck end up in segment_all()'s final zone
    set -- temple/cheek are returned too for completeness/future use, but
    the front photo's Face Mesh crop is preferred for those since it's
    higher-fidelity than a proportional guess off a turned angle.

    Raises ValueError if no face is detected.
    """
    image, face_box = _detect_face_box(image_path)
    if face_box is None:
        raise ValueError(
            "No face detected in left profile photo — retake turned so your left cheek "
            "faces the camera, keeping your ear and jaw visible."
        )

    return {
        name: _profile_region_crop(image, face_box, top_frac, bottom_frac)
        for name, (top_frac, bottom_frac) in PROFILE_REGIONS.items()
    }


def segment_right_profile(image_path: str) -> dict:
    """Same as segment_left_profile, mirrored for the right-profile photo.

    Raises ValueError if no face is detected.
    """
    image, face_box = _detect_face_box(image_path)
    if face_box is None:
        raise ValueError(
            "No face detected in right profile photo — retake turned so your right cheek "
            "faces the camera, keeping your ear and jaw visible."
        )

    return {
        name: _profile_region_crop(image, face_box, top_frac, bottom_frac)
        for name, (top_frac, bottom_frac) in PROFILE_REGIONS.items()
    }


def segment_all(front_path: str, left_profile_path: str, right_profile_path: str) -> dict:
    """Run all three photos through segmentation and return a flat dict of
    the 10 named crops severity.score_all_zones() expects.

    Raises ValueError (with a specific, user-facing message identifying
    which photo and how to retake it) if any photo fails face detection.
    """
    front = segment_front(front_path)
    left = segment_left_profile(left_profile_path)
    right = segment_right_profile(right_profile_path)

    return {
        "forehead": front["forehead"],
        "left_temple": front["left_temple"],
        "right_temple": front["right_temple"],
        "left_cheek": front["left_cheek"],
        "right_cheek": front["right_cheek"],
        "chin": front["chin"],
        "left_jaw": left["jaw"],
        "right_jaw": right["jaw"],
        "left_neck": left["neck"],
        "right_neck": right["neck"],
    }
