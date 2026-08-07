import os
from app import create_app, socketio

app = create_app()

if __name__ == "__main__":
    # Local dev entrypoint. Render injects $PORT (default 10000) and starts
    # gunicorn via the service Start Command / Dockerfile CMD instead.
    port = int(os.environ.get("PORT", 5000))
    # Flask-SocketIO refuses to start its Werkzeug fallback without this flag.
    socketio.run(app, host="0.0.0.0", port=port, allow_unsafe_werkzeug=True)