# runs pretrained model on teh zones, returning severity scores for each zone and overall score + confidence
from transformers import pipeline
from PIL import Image
import re

_classifier = None

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
    match = re.search(r"Level (-?\d+)", label)
    if match:
        level = int(match.group(1))
        # Levels run -1 to 4 (6 total) -> map onto 0-100
        numeric = round(((level + 1) / 5) * 100, 1)
    else:
        numeric = 50  # fallback if the label format doesn't match what's expected

    return {"label": label, "confidence": round(top["score"], 3), "severity_score": numeric}


def score_all_zones(zones: dict) -> dict:
    scores = {name: score_zone(img) for name, img in zones.items()}
    overall = sum(z["severity_score"] for z in scores.values()) / len(scores)
    scores["overall"] = round(overall, 1)
    return scores