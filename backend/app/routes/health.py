from flask import Blueprint, jsonify
from app.models import bullying_model, depression_model

health_bp = Blueprint('health', __name__)


@health_bp.route('/health', methods=['GET'])
def health():
    """Liveness probe. Also reports whether trained artifacts loaded, so
    running on the keyword fallback is never silent."""
    models = {
        'bullying':   bool(bullying_model.READY),
        'depression': bool(depression_model.READY),
    }
    ready = all(models.values())
    return jsonify({
        'status':       'ok',
        'models_ready': ready,
        'models':       models,
        'detector':     'trained' if ready else 'keyword-fallback',
    })


@health_bp.route('/', methods=['GET'])
def root():
    return jsonify({
        'service': 'social-sentinel-api',
        'status':  'ok',
        'health':  '/health',
    })
