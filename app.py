import base64
import io
import tempfile

from flask import Flask, jsonify, render_template, request

from skin_tracking import severity, zones

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("capture.html")


@app.route("/api/skin-capture", methods=["POST"])
def skin_capture():
    data = request.get_json(silent=True) or {}
    image_data_url = data.get("image", "")
    if "," not in image_data_url:
        return jsonify({"error": "No image data received"}), 400

    image_bytes = base64.b64decode(image_data_url.split(",", 1)[1])

    with tempfile.NamedTemporaryFile(suffix=".jpg") as tmp:
        tmp.write(image_bytes)
        tmp.flush()
        try:
            face_zones = zones.segment_face(tmp.name)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

    scores = severity.score_all_zones(face_zones)

    zone_previews = {}
    for name, img in face_zones.items():
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        zone_previews[name] = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()

    return jsonify({"scores": scores, "zones": zone_previews})


if __name__ == "__main__":
    app.run(debug=True, port=5001)
