from flask import Blueprint, jsonify
import threading

stats_bp = Blueprint('stats', __name__)

# Messages actually scored by the analyze routes since this process started.
# In-memory only: resets to zero on restart, and is per gunicorn worker.
_lock = threading.Lock()
_messages_analyzed = 0

# Fixed results from backend/ml/train_bullying.py. Accuracy and ROC-AUC were
# measured on the held-out split (heldout_size messages) of the deduplicated,
# cleaned dataset (dataset_size messages). Static facts, not live counts.
MODEL_METRICS = {
    'heldout_accuracy': 0.850,
    'roc_auc_macro':    0.975,
    'dataset_size':     45308,
    'heldout_size':     9062,
    'categories':       6,
}

def record_analyzed(n=1):
    global _messages_analyzed
    with _lock:
        _messages_analyzed += n

@stats_bp.route('/stats', methods=['GET'])
def stats():
    with _lock:
        analyzed = _messages_analyzed
    return jsonify({
        'messages_analyzed_since_startup': analyzed,
        'model_metrics': MODEL_METRICS,
    })