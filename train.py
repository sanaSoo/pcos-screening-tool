"""Trains and persists PCOS risk Model A (symptom-only XGBoost classifier).

Run manually: `python train.py`. Requires data/PCOS_data.csv locally
(gitignored -- not tracked in git, kept alongside the raw Kerala dataset used
for the notebook's Model B, which this script does not train).

Reproduces notebooks/01_eda.ipynb's Model A training exactly (same split,
SMOTE, and XGBClassifier hyperparameters) so results should match the
notebook's documented ~0.699 AUC-ROC.
"""
from __future__ import annotations

import joblib
import pandas as pd
from imblearn.over_sampling import SMOTE
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

from intake.features import FEATURE_COLUMNS, RENAME_MAP

DATA_PATH = "data/PCOS_data.csv"
MODEL_PATH = "models/model_a.joblib"


def load_dataset() -> tuple[pd.DataFrame, pd.Series]:
    df = pd.read_csv(DATA_PATH).rename(columns=RENAME_MAP)
    return df[FEATURE_COLUMNS], df["PCOS"]


def train() -> XGBClassifier:
    X, y = load_dataset()
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    X_train_res, y_train_res = SMOTE(random_state=42).fit_resample(X_train, y_train)

    model = XGBClassifier(n_estimators=100, random_state=42, eval_metric="logloss")
    model.fit(X_train_res, y_train_res)

    print("=== Model A: Symptom Only ===")
    print(classification_report(y_test, model.predict(X_test), target_names=["No PCOS", "PCOS"]))
    print(f"AUC-ROC: {roc_auc_score(y_test, model.predict_proba(X_test)[:, 1]):.3f}")
    return model


if __name__ == "__main__":
    trained_model = train()
    joblib.dump(trained_model, MODEL_PATH)
    print(f"Saved model to {MODEL_PATH}")
