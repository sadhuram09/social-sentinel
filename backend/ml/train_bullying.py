"""Train the Stage-1 cyberbullying classifier (ADR-0001).

TF-IDF (word 1-2 grams) -> Logistic Regression, on the Kaggle fine-grained
cyberbullying corpus (47,692 tweets, 6 classes).

Run from backend/ so the shared preprocessor is importable:

    python3 -m ml.train_bullying

Input:  ml/datasets/cyberbullying_tweets.csv  (gitignored; download from
        https://raw.githubusercontent.com/leoAshu/cyberbullying-classification/HEAD/data/cyberbullying_tweets.csv)
Output: ml/artifacts/{model,tfidf,encoder}.pkl
"""
import os
import pickle
import random

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, f1_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

from ml.preprocessor import clean

SEED = 42
HERE = os.path.dirname(os.path.abspath(__file__))
DATASET = os.path.join(HERE, 'datasets', 'cyberbullying_tweets.csv')
ARTIFACTS = os.path.join(HERE, 'artifacts')


def main():
    random.seed(SEED)
    np.random.seed(SEED)

    df = pd.read_csv(DATASET)
    print(f'loaded            {len(df):>6} rows')

    # Exact-duplicate tweets must go BEFORE the split, or copies land on both
    # sides and the test set partly measures memorisation.
    df = df.drop_duplicates(subset='tweet_text', keep='first')
    print(f'after dedup       {len(df):>6} rows')

    df = df.assign(text=df['tweet_text'].map(clean))
    df = df[df['text'].str.split().str.len() >= 2]
    print(f'after <2-token    {len(df):>6} rows')

    encoder = LabelEncoder()
    y = encoder.fit_transform(df['cyberbullying_type'])

    X_train_txt, X_test_txt, y_train, y_test = train_test_split(
        df['text'].values, y, test_size=0.2, stratify=y, random_state=SEED,
    )
    print(f'train / test      {len(X_train_txt)} / {len(X_test_txt)}')

    tfidf = TfidfVectorizer(max_features=30000, ngram_range=(1, 2),
                            sublinear_tf=True, min_df=2)
    X_train = tfidf.fit_transform(X_train_txt)  # fitted on TRAIN only
    X_test = tfidf.transform(X_test_txt)

    model = LogisticRegression(max_iter=2000, C=4.0, random_state=SEED)
    model.fit(X_train, y_train)

    pred = model.predict(X_test)
    proba = model.predict_proba(X_test)
    print()
    print(f'held-out accuracy {accuracy_score(y_test, pred):.4f}')
    print(f'weighted F1       {f1_score(y_test, pred, average="weighted"):.4f}')
    print(f'macro ROC-AUC     {roc_auc_score(y_test, proba, multi_class="ovr", average="macro"):.4f}')
    print()
    print(classification_report(y_test, pred, target_names=encoder.classes_, digits=4))

    os.makedirs(ARTIFACTS, exist_ok=True)
    for name, obj in (('model.pkl', model), ('tfidf.pkl', tfidf), ('encoder.pkl', encoder)):
        path = os.path.join(ARTIFACTS, name)
        with open(path, 'wb') as f:
            pickle.dump(obj, f)
        print(f'saved {path} ({os.path.getsize(path) / 1e6:.2f} MB)')


if __name__ == '__main__':
    main()
