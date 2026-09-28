from flask import Blueprint, jsonify
from app.models import bullying_model, depression_model

health_bp = Blueprint('health', __name__)


@health_bp.route('/health', methods=['GET'])
def health():
    """Liveness probe. Also reports whether trained artifacts loaded, so
    running on the keyword fallback is never silent.

    models_ready / detector track the Stage-1 bullying detector. The
    depression model has no trained artifacts yet; its own flag in `models`
    stays false until it does."""
    models = {
        'bullying':   bool(bullying_model.READY),
        'depression': bool(depression_model.READY),
    }
    return jsonify({
        'status':       'ok',
        'models_ready': models['bullying'],
        'models':       models,
        'detector':     bullying_model.DETECTOR,
    })


@health_bp.route('/', methods=['GET'])
def root():
    return jsonify({
        'service': 'social-sentinel-api',
        'status':  'ok',
        'health':  '/health',
    })
