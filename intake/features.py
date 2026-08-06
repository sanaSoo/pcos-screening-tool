"""Maps intake questionnaire answers to Model A's expected feature vector,
and defines the raw-dataset renames/column order train.py trains on -- kept
in one module so training and scoring can never drift out of sync."""
from __future__ import annotations

import pandas as pd

# Matches notebooks/01_eda.ipynb's own df.rename(...) calls for the columns
# Model A actually uses -- must stay in sync with the notebook or train.py
# will KeyError against data/PCOS_data.csv's raw survey column names.
RENAME_MAP = {
    "Have you been diagnosed with PCOS/PCOD?": "PCOS",
    "Have you gained weight recently?": "Recent Weight Gain",
    "Do you experience mood swings ?": "Mood Swings",
    "Are your periods regular ?": "Regular Periods",
    "Do you have pimples/acne on your face/jawline ?": "Jaw/Face Acne/Pimples",
    "Do you have excessive body/facial hair growth ?": "Excessive Hair Growth (Body/Facial)",
    "Do have hair loss/hair thinning/baldness ?": "Hair Thinning/Baldness",
}

# The 10 final symptom-only features selected in notebooks/01_eda.ipynb
# (|corr| >= 0.10 vs PCOS, after correlation/VIF-based feature selection).
# ORDER matters -- this is the exact column order Model A is trained and
# scored on.
FEATURE_COLUMNS = [
    "Regular Periods",
    "After how many months do you get your periods?\n(select 1- if every month/regular)",
    "Excessive Hair Growth (Body/Facial)",
    "Are you noticing skin darkening recently?",
    "Weight (in Kg)",
    "Recent Weight Gain",
    "Hair Thinning/Baldness",
    "Jaw/Face Acne/Pimples",
    "How long does your period last ? (in Days)\nexample- 1,2,3,4.....",
    "Mood Swings",
]

# Keys expected in the `answers` dict passed to to_feature_row() -- keep the
# mobile questionnaire (pcos-mobile/lib/intake_api.ts) keyed on these exact
# names.
REQUIRED_KEYS = [
    "period_frequency",       # 1 = every month, 2 = every 2 months, 3 = irregular/longer
    "excessive_hair_growth",  # 0/1
    "skin_darkening",         # 0/1
    "weight_kg",
    "recent_weight_gain",     # 0/1
    "hair_thinning",          # 0/1
    "jaw_face_acne",          # 0/1
    "period_length_days",
    "mood_swings",            # 0/1
]


def to_feature_row(answers: dict) -> pd.DataFrame:
    """Maps a questionnaire-answers dict to a single-row DataFrame in the
    exact FEATURE_COLUMNS order. Raises ValueError if any required key is
    missing."""
    missing = [k for k in REQUIRED_KEYS if k not in answers]
    if missing:
        raise ValueError(f"Missing intake answers: {', '.join(missing)}")

    # The notebook's "Regular Periods" and "period frequency in months" are
    # two separate survey questions but near-perfectly correlated (regular
    # periods essentially means "every month"), so the mobile questionnaire
    # asks one period_frequency question and derives Regular Periods from
    # it here -- asking both risks contradictory input the model never saw.
    freq = int(answers["period_frequency"])
    row = {
        "Regular Periods": 1 if freq == 1 else 0,
        "After how many months do you get your periods?\n(select 1- if every month/regular)": freq,
        "Excessive Hair Growth (Body/Facial)": int(answers["excessive_hair_growth"]),
        "Are you noticing skin darkening recently?": int(answers["skin_darkening"]),
        "Weight (in Kg)": float(answers["weight_kg"]),
        "Recent Weight Gain": int(answers["recent_weight_gain"]),
        "Hair Thinning/Baldness": int(answers["hair_thinning"]),
        "Jaw/Face Acne/Pimples": int(answers["jaw_face_acne"]),
        "How long does your period last ? (in Days)\nexample- 1,2,3,4.....": int(answers["period_length_days"]),
        "Mood Swings": int(answers["mood_swings"]),
    }
    return pd.DataFrame([row], columns=FEATURE_COLUMNS)
