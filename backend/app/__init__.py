from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
import os

socketio = SocketIO(cors_allowed_origins="*", async_mode='threading')

def create_app():
    app = Flask(__name__)
    CORS(app, origins="*")

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