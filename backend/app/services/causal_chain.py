import numpy as np
from app.models.bullying_model  import predict as bully_predict
from app.models.depression_model import predict as dep_predict

class CausalChainService:

    def analyze(self, text: str) -> dict:
        lines = [l.strip() for l in text.strip().split('\n') if l.strip()]

        # Full-text scores
        b_res = bully_predict(text)
        d_res = dep_predict(text)

        bullying_score   = b_res['score']
        bullying_type    = b_res.get('type', 'unknown')
        depression_score = d_res['score']
        causal_link      = float(np.clip(bullying_score * 0.55 + depression_score * 0.45, 0, 1))
        risk             = 'HIGH' if causal_link > 0.72 else 'MEDIUM' if causal_link > 0.45 else 'LOW'

        # Per-line timeline
        timeline = []
        for i, line in enumerate(lines):
            br = bully_predict(line)
            dr = dep_predict(line)
            bs, ds = br['score'], dr['score']
            if bs > 0.55 and bs >= ds:
                etype = 'bullying'
            elif ds > 0.45:
                etype = 'depression'
            else:
                etype = 'neutral'
            timeline.append({
                'time':  f'T+{i * 15}m',
                'type':  etype,
                'score': round(max(bs, ds), 2),
                'text':  line,
                'bullying_score':   round(bs, 2),
                'depression_score': round(ds, 2),
            })

        return {
            'bullying_score':   round(bullying_score, 2),
            'bullying_type':    bullying_type,
            'depression_score': round(depression_score, 2),
            'causal_link':      round(causal_link, 2),
            'risk_level':       risk,
            'shap_features':    d_res.get('shap', {}),
            'timeline':         timeline,
            'lines_analyzed':   len(lines),
            'models_used':      'XGBoost+TF-IDF' if b_res.get('ready') else 'keyword-fallback',
        }