from flask import Blueprint, jsonify
import random

stats_bp = Blueprint('stats', __name__)

@stats_bp.route('/stats', methods=['GET'])
def stats():
    return jsonify({
        'tweets_analyzed': random.randint(2_400_000, 2_450_000),
        'bullying_detected': random.randint(18000, 19000),
        'depression_signals': random.randint(7500, 8200),
        'causal_chains': random.randint(3100, 3300),
    })