from flask import Flask, jsonify, request, render_template
from pathlib import Path
import json
from datetime import datetime, timezone
from threading import Lock

app = Flask(__name__)
DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
MEMORY_FILE = DATA_DIR / "memory.json"
lock = Lock()

def now():
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")

def load_memory():
    if not MEMORY_FILE.exists():
        return {"preferences": [], "updated_at": None}
    try:
        return json.loads(MEMORY_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {"preferences": [], "updated_at": None}

def save_memory(data):
    data["updated_at"] = now()
    temp = MEMORY_FILE.with_suffix(".tmp")
    temp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    temp.replace(MEMORY_FILE)

@app.get("/")
def index():
    return render_template("index.html")

@app.get("/api/status")
def status():
    return jsonify({"app": "Alexa TrustLayer", "mode": "simulation", "device": "Living room light"})

@app.get("/api/memory")
def get_memory():
    with lock:
        return jsonify(load_memory())

@app.post("/api/memory")
def add_memory():
    body = request.get_json(silent=True) or {}
    preference = str(body.get("preference", "")).strip()
    if not preference:
        return jsonify({"error": "Please enter a preference to remember."}), 400
    if len(preference) > 180:
        return jsonify({"error": "Keep preferences under 180 characters."}), 400
    with lock:
        data = load_memory()
        # Avoid duplicates without case sensitivity.
        if preference.casefold() not in [p.casefold() for p in data["preferences"]]:
            data["preferences"].append(preference)
        save_memory(data)
        result = load_memory()
    return jsonify(result), 201

@app.delete("/api/memory")
def clear_memory():
    with lock:
        save_memory({"preferences": [], "updated_at": None})
    return jsonify(load_memory())

@app.post("/api/chat")
def chat():
    body = request.get_json(silent=True) or {}
    message = str(body.get("message", "")).strip()
    scenario = body.get("scenario", "failure")
    memory_enabled = bool(body.get("memoryEnabled", True))
    if not message:
        return jsonify({"error": "Enter a request first."}), 400

    events = []
    def event(step, status, detail):
        events.append({"time": now(), "step": step, "status": status, "detail": detail})

    low = message.casefold()
    if any(word in low for word in ("prefer", "preference", "music", "remember")) and memory_enabled:
        with lock:
            memory = load_memory()
        if memory["preferences"]:
            response = "Your saved preference is: " + "; ".join(memory["preferences"])
            event("Memory lookup", "success", "Retrieved user-approved preferences from local storage.")
        else:
            response = "I don't have a saved preference yet. Add one in the Memory panel and ask me again."
            event("Memory lookup", "info", "No saved preferences were found.")
        return jsonify({"reply": response, "events": events, "device": {"name": "Living room light", "on": False}})

    if any(word in low for word in ("light", "lamp", "turn on", "switch on")):
        event("Intent received", "success", "Recognized a simulated smart-home light command.")
        event("Device command", "success", "Sent ON command to the simulated living-room light.")
        if scenario == "failure":
            event("Attempt 1 verification", "failed", "Simulated device did not respond; light remains OFF.")
            event("Safe recovery", "running", "Retrying the idempotent ON command once.")
            event("Attempt 2 verification", "success", "Simulated device responded; light state is ON.")
            response = "The first attempt didn't work, so I retried. The living room light is now on — I verified the final device state."
            device_on = True
        elif scenario == "unrecoverable":
            event("Attempt 1 verification", "failed", "Simulated device did not respond; light remains OFF.")
            event("Safe recovery", "running", "Retrying the idempotent ON command once.")
            event("Attempt 2 verification", "failed", "Device still did not respond; no further retries were attempted.")
            response = "I couldn't turn on the living room light. I tried twice, but the device still didn't respond. Please check its power or connection."
            device_on = False
        else:
            event("Attempt 1 verification", "success", "Simulated device responded; light state is ON.")
            response = "The living room light is on. I checked the simulated device state to confirm."
            device_on = True
        return jsonify({"reply": response, "events": events, "device": {"name": "Living room light", "on": device_on}})

    event("Intent received", "info", "No matching demo action found.")
    response = "I can demonstrate turning on the living room light or recalling a saved preference. Try: “Alexa, turn on the living room lights.”"
    return jsonify({"reply": response, "events": events, "device": {"name": "Living room light", "on": False}})

if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
