"""The single text-cleaning function shared by training and serving.

Training (ml/train_bullying.py) and inference (app/models/bullying_model.py)
must transform text identically, or the deployed model sees inputs shaped
differently from what it learned on. Keep this the only definition of clean().
"""
import re


def clean(text):
    text = str(text).lower()
    text = re.sub(r'http\S+', '', text)       # URLs
    text = re.sub(r'@\w+', '', text)          # @mentions
    text = re.sub(r'[^a-z\s]', ' ', text)     # everything non-alphabetic
    return re.sub(r'\s+', ' ', text).strip()  # collapse whitespace
