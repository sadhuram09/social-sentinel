from flask import Blueprint, request, jsonify
from app.services.causal_chain import CausalChainService

analyze_bp = Blueprint('analyze', __name__)
_service   = CausalChainService()

@analyze_bp.route('/analyze', methods=['POST'])
def analyze():
    data = request.get_json()
    text = data.get('text', '').strip()
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    try:
        result = _service.analyze(text)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analyze_bp.route('/analyze/single', methods=['POST'])
def analyze_single():
    """Score one tweet — used by live feed for on-demand analysis."""
    data  = request.get_json()
    text  = data.get('text', '').strip()
    if not text:
        return jsonify({'error': 'No text'}), 400
    from app.models.bullying_model   import predict as bp
    from app.models.depression_model import predict as dp
    b = bp(text)
    d = dp(text)
    return jsonify({
        'bullying_score':   b['score'],
        'bullying_type':    b.get('type', ''),
        'depression_score': d['score'],
        'shap':             d.get('shap', {}),
    })