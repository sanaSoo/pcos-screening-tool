# this is where all of our data and models combine to provide an over arching analysis
#
# Deliberately rule-based, not a trained model: every point added here has a
# plain-language reason attached, so the result stays explainable to the
# user instead of being an opaque score.
from __future__ import annotations

ANDROGEN_SENSITIVE_ZONES = ["jaw", "chin", "neck"]
T_ZONE = ["forehead", "temple"]

HORMONAL_PATTERN_THRESHOLD = 15  # points of severity_score difference
MAX_POINTS = 4

DISCLAIMER = (
    "This is a pattern-matching estimate based on acne location and reported symptoms — "
    "it is not a medical diagnosis. Please consult a dermatologist or doctor for a proper evaluation."
)


def compute_hormonal_likelihood(zone_scores: dict, symptom_answers: dict, cycle_regularity: str | None = None) -> dict:
    """zone_scores: the six logical zone scores from severity.score_all_zones()['zones'].
    symptom_answers: dict of question -> 0/1, matching the intake questionnaire.
    cycle_regularity: "regular" | "irregular" | None (None = no cycle data logged yet, skip that point).
    """
    hormonal_zone_avg = sum(zone_scores[z] for z in ANDROGEN_SENSITIVE_ZONES) / len(ANDROGEN_SENSITIVE_ZONES)
    t_zone_avg = sum(zone_scores[z] for z in T_ZONE) / len(T_ZONE)

    points = 0
    reasons = []

    if hormonal_zone_avg - t_zone_avg > HORMONAL_PATTERN_THRESHOLD:
        points += 1
        reasons.append(
            "Acne severity is notably higher along the jawline, chin, and neck than on the "
            "forehead/temples — a distribution pattern often associated with hormonal (androgen-driven) acne."
        )

    if cycle_regularity == "irregular":
        points += 1
        reasons.append("Irregular menstrual cycles are commonly associated with hormonal acne.")

    if symptom_answers.get("Excessive Hair Growth (Body/Facial)") == 1:
        points += 1
        reasons.append(
            "Excessive body/facial hair growth is often linked to elevated androgen levels, "
            "which can also drive hormonal acne."
        )

    if symptom_answers.get("Recent Weight Gain") == 1:
        points += 1
        reasons.append("Recent weight gain can be associated with hormonal imbalances that also contribute to acne.")

    likelihood_pct = round(points / MAX_POINTS * 100, 1)

    return {
        "likelihood_pct": likelihood_pct,
        "reasons": reasons,
        "zone_comparison": {
            "hormonal_zone_avg": round(hormonal_zone_avg, 1),
            "t_zone_avg": round(t_zone_avg, 1),
        },
        "disclaimer": DISCLAIMER,
    }
