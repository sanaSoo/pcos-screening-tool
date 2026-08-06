"""Computes menstrual cycle regularity from a user's `cycles` rows, for
analysis/hormonal_signal.py's cycle_regularity input."""
from __future__ import annotations

import statistics
from datetime import date

LOOKBACK_CYCLES = 7  # completed cycles to look at (yields up to 6 gaps)
MIN_GAPS_FOR_REGULARITY = 2  # need at least this many cycle-length gaps to say anything
IRREGULAR_STDDEV_THRESHOLD_DAYS = 7  # >7 days of cycle-to-cycle variation reads as "irregular"


def compute_regularity(supabase_client, user_id: str) -> str | None:
    """Returns "regular" | "irregular" | None (None = not enough data yet).

    `supabase_client` should be a user-scoped client (e.g. flask.g.supabase)
    so RLS already restricts rows to `user_id` -- no explicit filter needed.
    """
    result = (
        supabase_client.table("cycles")
        .select("start_date,end_date")
        .not_.is_("end_date", "null")
        .order("start_date", desc=True)
        .limit(LOOKBACK_CYCLES)
        .execute()
    )
    rows = result.data or []
    starts = sorted((r["start_date"] for r in rows), reverse=True)

    # Cycle length = days between consecutive period *start* dates (the
    # clinical definition), not each row's own start/end (bleed duration).
    gaps = [
        (date.fromisoformat(starts[i]) - date.fromisoformat(starts[i + 1])).days
        for i in range(len(starts) - 1)
    ]
    if len(gaps) < MIN_GAPS_FOR_REGULARITY:
        return None

    return "irregular" if statistics.pstdev(gaps) > IRREGULAR_STDDEV_THRESHOLD_DAYS else "regular"
