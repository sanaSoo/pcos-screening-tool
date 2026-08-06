"""Loads Model A and scores intake questionnaire answers, mirroring
analysis/hormonal_signal.py's disclaimer-carrying response shape."""
from __future__ import annotations

import joblib

from intake.features import to_feature_row

MODEL_PATH = "models/model_a.joblib"

DISCLAIMER = (
    "This is a rough, symptom-based screening signal from a machine learning model trained on "
    "self-reported survey data (not clinical/lab values) — it is not a medical diagnosis and has "
    "known limited accuracy (~64% AUC-ROC on held-out data). Please consult a doctor for a proper "
    "evaluation, especially if you have concerning symptoms."
)

MODEL_VERSION = "model_a_v1"

_model = None


def _get_model():
    global _model
    if _model is None:
        _model = joblib.load(MODEL_PATH)
    return _model


def score_intake(answers: dict) -> dict:
    """Raises ValueError if `answers` is missing required keys (see
    intake.features.REQUIRED_KEYS), FileNotFoundError if the model hasn't
    been trained yet (see train.py)."""
    model = _get_model()
    feature_row = to_feature_row(answers)
    risk_proba = float(model.predict_proba(feature_row)[0][1])
    risk_pct = round(risk_proba * 100, 1)
    risk_label = "higher" if risk_pct >= 66 else "moderate" if risk_pct >= 33 else "lower"

    return {
        "risk_score_pct": risk_pct,
        "risk_label": risk_label,
        "disclaimer": DISCLAIMER,
        "model_version": MODEL_VERSION,
    }
