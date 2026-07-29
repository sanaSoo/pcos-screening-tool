import base64
import io
import tempfile

from flask import Flask, jsonify, render_template, request
from werkzeug.exceptions import HTTPException

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


@app.route("/")
def index():
    return render_template("capture.html")


def _valid(data_url):
    return bool(data_url and "," in data_url)


def _decoded_tempfile(data_url, suffix):
    tmp = tempfile.NamedTemporaryFile(suffix=suffix)
    tmp.write(base64.b64decode(data_url.split(",", 1)[1]))
    tmp.flush()
    return tmp


@app.route("/api/skin-capture", methods=["POST"])
def skin_capture():
    data = request.get_json(silent=True) or {}
    images_obj = data.get("images")

    if images_obj and isinstance(images_obj, dict):
        # expect keys like 'left','right','front' — each is processed against
        # the zones it actually shows (see zones.py); neck_left/neck_right come
        # from the left/right profile photos too, not a separate photo
        left_data_url = images_obj.get("left")
        right_data_url = images_obj.get("right")
        front_data_url = images_obj.get("front")
    else:
        # fallback to legacy single image key: front only
        left_data_url = None
        right_data_url = None
        front_data_url = data.get("image", "")

    if not _valid(front_data_url):
        return jsonify({"error": "No frontal image provided"}), 400

    all_zones = {}

    with _decoded_tempfile(front_data_url, "_front.jpg") as front_tmp:
        try:
            all_zones.update(zones.segment_front(front_tmp.name))
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

    if _valid(left_data_url):
        with _decoded_tempfile(left_data_url, "_left.jpg") as left_tmp:
            try:
                left_zones = zones.segment_left_profile(left_tmp.name)
            except Exception:
                app.logger.exception("Failed to process left profile photo")
                left_zones = None
        if left_zones:
            all_zones.update(left_zones)

    if _valid(right_data_url):
        with _decoded_tempfile(right_data_url, "_right.jpg") as right_tmp:
            try:
                right_zones = zones.segment_right_profile(right_tmp.name)
            except Exception:
                app.logger.exception("Failed to process right profile photo")
                right_zones = None
        if right_zones:
            all_zones.update(right_zones)

    scores = severity.score_all_zones(all_zones)

    zone_previews = {}
    for name, img in all_zones.items():
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        zone_previews[name] = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()

    return jsonify({"scores": scores, "zones": zone_previews})


if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True, port=5001)
