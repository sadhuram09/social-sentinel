from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
import os

# Browser origins allowed to call this API.
#
# Override without a code change by setting ALLOWED_ORIGINS (comma-separated)
# in the Render dashboard. Both layers below must agree: HTTP CORS and
# socket.io CORS are enforced separately, so locking only one would leave the
# live feed broken while /api/* kept working.
#
# Server-side probes (Render's health check) send no Origin header, so /health
# and / are unaffected by this list.
DEFAULT_ALLOWED_ORIGINS = [
    'https://social-sentinel-omega.vercel.app',  # production frontend (Vercel)
    'http://localhost:5173',                     # Vite dev server
    'http://127.0.0.1:5173',
]

ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        'ALLOWED_ORIGINS', ','.join(DEFAULT_ALLOWED_ORIGINS)
    ).split(',')
    if o.strip()
]

socketio = SocketIO(cors_allowed_origins=ALLOWED_ORIGINS, async_mode='threading')

def create_app():
    app = Flask(__name__)
    CORS(app, origins=ALLOWED_ORIGINS)

    from app.routes.analyze import analyze_bp
    from app.routes.stats import stats_bp
    from app.routes.stream import stream_bp
    from app.routes.health import health_bp

    app.register_blueprint(analyze_bp, url_prefix='/api')
    app.register_blueprint(stats_bp, url_prefix='/api')
    app.register_blueprint(stream_bp, url_prefix='/api')
    app.register_blueprint(health_bp)  # no prefix — platform probes hit / and /health

    socketio.init_app(app)
    return app