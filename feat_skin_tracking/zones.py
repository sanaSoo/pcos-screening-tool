#segments image into jawline, left cheek, right cheek, and forehead regions using mediapipe face mesh
import mediapipe as mp
import numpy as np
from PIL import Image

mp_face_mesh = mp.solutions.face_mesh

JAWLINE_CHIN_IDX = [172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397]
LEFT_CHEEK_IDX   = [50, 101, 100, 47, 121, 126, 142, 36, 205, 206]
RIGHT_CHEEK_IDX  = [280, 330, 329, 277, 350, 355, 371, 266, 425, 426]
FOREHEAD_IDX     = [10, 338, 297, 332, 284, 251, 21, 54, 103, 67, 109]


def _region_crop(image: Image.Image, landmarks, idx_list, pad_ratio=0.15):
    w, h = image.size
    pts = np.array([(landmarks[i].x * w, landmarks[i].y * h) for i in idx_list])
    x_min, y_min = pts.min(axis=0)
    x_max, y_max = pts.max(axis=0)
    pad_x = (x_max - x_min) * pad_ratio
    pad_y = (y_max - y_min) * pad_ratio
    box = (
        max(0, x_min - pad_x), max(0, y_min - pad_y),
        min(w, x_max + pad_x), min(h, y_max + pad_y),
    )
    return image.crop(box)


def segment_face(image_path: str) -> dict:
    image = Image.open(image_path).convert("RGB")
    arr = np.array(image)

    with mp_face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1) as face_mesh:
        results = face_mesh.process(arr)

    if not results.multi_face_landmarks:
        raise ValueError("No face detected in photo — retake with clear, front-facing lighting.")

    landmarks = results.multi_face_landmarks[0].landmark

    return {
        "jawline": _region_crop(image, landmarks, JAWLINE_CHIN_IDX),
        "left_cheek": _region_crop(image, landmarks, LEFT_CHEEK_IDX),
        "right_cheek": _region_crop(image, landmarks, RIGHT_CHEEK_IDX),
        "forehead": _region_crop(image, landmarks, FOREHEAD_IDX),
    }