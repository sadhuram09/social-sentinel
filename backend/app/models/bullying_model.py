import pickle, os, sys
import numpy as np

from ml.preprocessor import clean

ARTIFACTS = os.path.join(os.path.dirname(__file__), '..', '..', 'ml', 'artifacts')
TOP_K = 8

def _load(name):
    path = os.path.join(ARTIFACTS, name)
    if not os.path.exists(path):
        print(f'[bullying_model] missing artifact: {path}', file=sys.stderr)
        return None
    try:
        with open(path, 'rb') as f:
            return pickle.load(f)
    except Exception as e:
        # e.g. a scikit-learn version mismatch between training and serving
        print(f'[bullying_model] failed to load {path}: {e!r}', file=sys.stderr)
        return None

# Load once at import time
_model   = _load('model.pkl')
_tfidf   = _load('tfidf.pkl')
_encoder = _load('encoder.pkl')
READY    = all(x is not None for x in (_model, _tfidf, _encoder))
DETECTOR = 'trained' if READY else 'keyword-fallback'
print(f'[bullying_model] detector: {DETECTOR}', file=sys.stderr)

if READY:
    _classes  = _encoder.classes_.tolist()
    _features = _tfidf.get_feature_names_out()
    _not_idx  = _classes.index('not_cyberbullying')

# Used ONLY when the artifacts above are missing or unloadable. /health reports
# detector: "keyword-fallback" whenever this path is active.
BULLY_KW = ['ugly','pathetic','worthless','loser','nobody likes','freak',
            'idiot','stupid','hate you','kill yourself','go die','trash']

def _attribution(x, cls_idx):
    """Exact per-token contributions to the predicted class's logit.

    For logistic regression the class score is  b + sum_j coef_j * tfidf_j,
    so coef_j * tfidf_j is exactly token j's share — no approximation, no SHAP.
    """
    x = x.tocsr()
    idx, vals = x.indices, x.data
    contrib = _model.coef_[cls_idx, idx] * vals
    order = np.argsort(-np.abs(contrib))[:TOP_K]
    return [{'token': str(_features[idx[i]]), 'weight': round(float(contrib[i]), 4)}
            for i in order]

def predict(text: str) -> dict:
    """Returns bullying_score (0-1), bullying_type (str label)."""
    if not READY:
        hits = sum(1 for kw in BULLY_KW if kw in text.lower())
        score = float(np.clip(hits / 3 + 0.25, 0, 1))
        return {'score': score, 'type': 'keyword_fallback', 'ready': False}

    X        = _tfidf.transform([clean(text)])
    proba    = _model.predict_proba(X)[0]
    pred_idx = int(proba.argmax())

    return {
        'score':       round(float(1 - proba[_not_idx]), 4),
        'type':        _classes[pred_idx],
        'proba':       {c: round(float(p), 4) for c, p in zip(_classes, proba)},
        'attribution': _attribution(X, pred_idx),
        'ready':       True,
    }
