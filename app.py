import os
import tempfile
from datetime import datetime, timezone
from functools import wraps

from flask import Flask, g, jsonify, request
from werkzeug.exceptions import HTTPException
from werkzeug.utils import secure_filename

import supabase_client
from analysis import hormonal_signal
from skin_tracking import severity, zones

app = Flask(__name__)
# Even in debug mode, return JSON on unhandled errors instead of Flask's HTML
# debug page — an HTML response breaks resp.json() on the client with a
# confusing "unexpected character: <" parse error instead of a real message.
app.config["PROPAGATE_EXCEPTIONS"] = False


@app.errorhandler(Exception)
def handle_exception(e):
    if isinstance(e, HTTPException):
        return jsonify({"error": e.description}), e.code
    app.logger.exception("Unhandled error in %s", request.path)
    return jsonify({"error": "Internal server error"}), 500


def require_auth(fn):
    """Verifies the request's Bearer token and attaches a user-scoped
    Supabase client (g.supabase) + the caller's id (g.user_id) so RLS
    enforces per-user data isolation for the rest of the handler."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        token = auth_header.split(" ", 1)[1] if auth_header.startswith("Bearer ") else None
        try:
            g.user_id = supabase_client.get_user_id(token)
        except ValueError as e:
            return jsonify({"error": str(e)}), 401
        g.supabase = supabase_client.get_user_client(token)
        return fn(*args, **kwargs)

    return wrapper


# multipart field name -> short tag used in storage paths / response keys
PHOTO_FIELDS = {
    "front_photo": "front",
    "left_profile_photo": "left",
    "right_profile_photo": "right",
}

ACNE_PHOTOS_BUCKET = "acne-photos"
SIGNED_URL_EXPIRY_SECONDS = 60 * 60  # 1 hour


@app.route("/tracker/upload", methods=["POST"])
@require_auth
def upload_tracker_entry():
    missing = [field for field in PHOTO_FIELDS if not request.files.get(field) or not request.files[field].filename]
    if missing:
        return jsonify({"error": f"Missing required photo(s): {', '.join(missing)}"}), 400

    temp_paths = {}
    try:
        for field, tag in PHOTO_FIELDS.items():
            file_storage = request.files[field]
            suffix = os.path.splitext(secure_filename(file_storage.filename))[1] or ".jpg"
            tmp = tempfile.NamedTemporaryFile(suffix=f"_{tag}{suffix}", delete=False)
            file_storage.save(tmp.name)
            tmp.close()
            temp_paths[tag] = tmp.name

        try:
            all_zones = zones.segment_all(temp_paths["front"], temp_paths["left"], temp_paths["right"])
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

        scores = severity.score_all_zones(all_zones)

        symptom_answers = {
            "Excessive Hair Growth (Body/Facial)": int(request.form.get("excessive_hair_growth", 0)),
            "Recent Weight Gain": int(request.form.get("recent_weight_gain", 0)),
        }
        # cycles/ isn't built yet, so there's no regularity data to pass in
        hormonal_pattern = hormonal_signal.compute_hormonal_likelihood(
            scores["zones"], symptom_answers, cycle_regularity=None
        )

        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        photo_paths = {}
        for field, tag in PHOTO_FIELDS.items():
            filename = secure_filename(request.files[field].filename)
            storage_path = f"{g.user_id}/{timestamp}_{tag}_{filename}"
            with open(temp_paths[tag], "rb") as f:
                g.supabase.storage.from_(ACNE_PHOTOS_BUCKET).upload(
                    storage_path,
                    f.read(),
                    {"content-type": request.files[field].mimetype or "image/jpeg"},
                )
            photo_paths[tag] = storage_path

        zone_scores = scores["zones"]
        g.supabase.table("acne_entries").insert(
            {
                "user_id": g.user_id,
                "front_photo_path": photo_paths["front"],
                "left_photo_path": photo_paths["left"],
                "right_photo_path": photo_paths["right"],
                "forehead_score": zone_scores["forehead"],
                "temple_score": zone_scores["temple"],
                "cheeks_score": zone_scores["cheeks"],
                "chin_score": zone_scores["chin"],
                "jaw_score": zone_scores["jaw"],
                "neck_score": zone_scores["neck"],
                "overall_score": scores["overall"],
                "hormonal_likelihood_pct": hormonal_pattern["likelihood_pct"],
                "hormonal_reasons": hormonal_pattern["reasons"],
            }
        ).execute()

        return jsonify({"scores": scores, "hormonal_pattern": hormonal_pattern})
    finally:
        for path in temp_paths.values():
            if os.path.exists(path):
                os.remove(path)


@app.route("/tracker", methods=["GET"])
@require_auth
def list_tracker_entries():
    result = g.supabase.table("acne_entries").select("*").order("logged_at").execute()
    entries = result.data or []

    for entry in entries:
        for tag, path_col in (
            ("front", "front_photo_path"),
            ("left", "left_photo_path"),
            ("right", "right_photo_path"),
        ):
            path = entry.get(path_col)
            if not path:
                continue
            signed = g.supabase.storage.from_(ACNE_PHOTOS_BUCKET).create_signed_url(
                path, SIGNED_URL_EXPIRY_SECONDS
            )
            entry[f"{tag}_photo_url"] = signed.get("signedURL")

    return jsonify(entries)


if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True, port=5001)
