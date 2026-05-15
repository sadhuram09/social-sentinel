import pickle, os, re
import numpy as np

ARTIFACTS = os.path.join(os.path.dirname(__file__), '..', '..', 'ml', 'artifacts')

def _load(name):
    path = os.path.join(ARTIFACTS, name)
    return pickle.load(open(path, 'rb')) if os.path.exists(path) else None

_model     = _load('depression_model.pkl')
_tfidf     = _load('depression_tfidf.pkl')
_explainer = _load('depression_explainer.pkl')
READY      = all([_model, _tfidf])

DEP_KW = ["don't deserve","tired of existing","what's the point","disappear",
          "nobody cares","empty","hopeless","give up","can't anymore",
          "want to die","no reason","exhausted","numb","alone"]

def clean(text):
    text = str(text).lower()
    text = re.sub(r'http\S+', '', text)
    text = re.sub(r'[^a-z\s]',' ', text)
    return re.sub(r'\s+', ' ', text).strip()

def predict(text: str) -> dict:
    """Returns depression_score (0-1) and top SHAP features."""
    if not READY:
        hits  = sum(1 for kw in DEP_KW if kw in text.lower())
        score = float(np.clip(hits / 3 + 0.2, 0, 1))
        return {'score': score, 'shap': {}, 'ready': False}

    X     = _tfidf.transform([clean(text)])
    proba = _model.predict_proba(X)[0]
    score = float(proba[1])

    shap_features = {}
    if _explainer:
        try:
            import shap as shap_lib
            vals = _explainer.shap_values(X)
            arr  = vals[0] if isinstance(vals, list) else vals
            names = _tfidf.get_feature_names_out()
            top   = np.argsort(np.abs(arr[0]))[-8:][::-1]
            shap_features = {
                names[i]: round(float(arr[0, i]), 4)
                for i in top
                if float(arr[0, i]) > 0
            }
        except Exception:
            pass

    return {'score': round(score, 4), 'shap': shap_features, 'ready': True}