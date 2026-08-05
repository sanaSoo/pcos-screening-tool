# runs pretrained model on the zones, returning severity scores for each zone and overall score + confidence
import logging
import re

from PIL import Image
from transformers import pipeline

logger = logging.getLogger(__name__)

_classifier = None

# left/right sub-zone pairs that get averaged into one logical zone;
# forehead and chin have no pair and pass through as-is
LOGICAL_ZONES = {
    "forehead": ["forehead"],
    "temple": ["left_temple", "right_temple"],
    "cheeks": ["left_cheek", "right_cheek"],
    "chin": ["chin"],
    "jaw": ["left_jaw", "right_jaw"],
    "neck": ["left_neck", "right_neck"],
}


def _get_classifier():
    global _classifier
    if _classifier is None:
        _classifier = pipeline(
            "image-classification",
            model="imfarzanansari/skintelligent-acne"
        )
    return _classifier


def score_zone(image: Image.Image) -> dict:
    clf = _get_classifier()
    results = clf(image)

    top = results[0]
    label = top["label"]

    # Labels look like "Level -1: Clear Skin" through "Level 4: Very Severe Acne"
    match = re.search(r"Level (-?\d+)", label, re.IGNORECASE)
    if match:
        level = int(match.group(1))
        # Levels run -1 to 4 (6 total) -> map onto 0-100
        numeric = round(((level + 1) / 5) * 100, 1)
    else:
        logger.warning("Unexpected acne classifier label format: %r — falling back to 50", label)
        numeric = 50

    return {"label": label, "confidence": round(top["score"], 3), "severity_score": numeric}


def score_all_zones(zones: dict) -> dict:
    """Score the 10 sub-zone crops from zones.segment_all(), then average
    left/right pairs into six logical zones plus an overall average.

    Returns {sub_zones: {name: {label, confidence, severity_score}, ...},
             zones: {forehead, temple, cheeks, chin, jaw, neck}, overall: float}
    """
    sub_zones = {name: score_zone(img) for name, img in zones.items()}

    logical = {}
    for zone_name, sub_names in LOGICAL_ZONES.items():
        scores = [sub_zones[n]["severity_score"] for n in sub_names]
        logical[zone_name] = round(sum(scores) / len(scores), 1)

    overall = round(sum(logical.values()) / len(logical), 1)

    return {"sub_zones": sub_zones, "zones": logical, "overall": overall}
