import pickle, os, re
import numpy as np

ARTIFACTS = os.path.join(os.path.dirname(__file__), '..', '..', 'ml', 'artifacts')

def _load(name):
    path = os.path.join(ARTIFACTS, name)
    return pickle.load(open(path, 'rb')) if os.path.exists(path) else None

# Load once at import time
_model   = _load('bullying_model.pkl')
_tfidf   = _load('bullying_tfidf.pkl')
_encoder = _load('bullying_encoder.pkl')
READY    = all([_model, _tfidf, _encoder])

BULLY_KW = ['ugly','pathetic','worthless','loser','nobody likes','freak',
            'idiot','stupid','hate you','kill yourself','go die','trash']

def clean(text):
    text = str(text).lower()
    text = re.sub(r'http\S+', '', text)
    text = re.sub(r'@\w+',    '', text)
    text = re.sub(r'[^a-z\s]',' ', text)
    return re.sub(r'\s+', ' ', text).strip()

def predict(text: str) -> dict:
    """Returns bullying_score (0-1), bullying_type (str label)."""
    if not READY:
        hits = sum(1 for kw in BULLY_KW if kw in text.lower())
        score = float(np.clip(hits / 3 + 0.25, 0, 1))
        return {'score': score, 'type': 'keyword_fallback', 'ready': False}

    X      = _tfidf.transform([clean(text)])
    proba  = _model.predict_proba(X)[0]
    classes = _encoder.classes_.tolist()
    pred_idx = int(proba.argmax())
    pred_cls = classes[pred_idx]

    not_idx  = classes.index('not_cyberbullying') if 'not_cyberbullying' in classes else -1
    bully_score = float(1 - proba[not_idx]) if not_idx >= 0 else float(proba[pred_idx])

    return {
        'score': round(bully_score, 4),
        'type':  pred_cls,
        'proba': {c: round(float(p), 4) for c, p in zip(classes, proba)},
        'ready': True,
    }