# ADR-0001: Lightweight classical model (TF-IDF + Logistic Regression) for detection

## Status

Accepted

## Date

2026-08-06

## Context

> **Scope — read first.** This ADR decides the **Stage-1 single-message abuse
> scorer only**. The Kaggle Cyberbullying Classification corpus it selects is a
> collection of **independently labelled single tweets**: no conversation IDs, no
> reply links, no timestamps, no thread grouping. It therefore **cannot support
> follow-up or escalation detection, because it contains no follow-ups.**
>
> Phase 2's actual goal is detecting attacks as they unfold — escalation over
> time, swarm/pile-on, and victim trajectory. That requires a threaded corpus and
> a conversation-level model, which are a **separate decision recorded in
> ADR-0002**. This ADR remains necessary: Stage-1 is the per-message scorer that
> Stage-2 consumes. It is simply not sufficient on its own.

Phase 2 must replace the current detector with a real trained model. The state
this decision is made against, verified in the audit:

- **There is no model.** `backend/app/models/bullying_model.py:28-31` and
  `depression_model.py:27-30` score text by counting substring hits against a
  12-word and a 14-word list. One hit scores 0.583, which crosses the 0.55
  detection threshold at `causal_chain.py:26`.
- **No artifacts exist and none can be produced.** `backend/ml/artifacts/` is
  absent from disk *and* gitignored (`.gitignore:20`); both training scripts
  (`ml/train_bullying.py`, `ml/train_depression.py`) are 0-byte files. The
  `READY` flag at `bullying_model.py:14` is therefore permanently `False`.
- **The deploy is broken and the cause is dependency weight.**
  `requirements.txt` pins `torch==2.3.1` (~2.5 GB installed, CUDA-bundled),
  `transformers==4.44.2`, and `xgboost==2.0.3`. All three have **zero imports**
  anywhere in the backend. The audit concluded torch exhausting Render's
  free-tier build resources is the most likely proximate cause of the failed
  backend deploy (`docs/AUDIT.md` C-1, H-1).
- **The code already fingerprints the intended corpus.**
  `bullying_model.py:39` looks up a class named `'not_cyberbullying'` — the
  label used by the Kaggle *Cyberbullying Classification* dataset. The original
  design targeted that corpus; it was never implemented.

The inference code that survives this decision imposes two hard constraints,
which narrow the field before preference enters:

1. `bullying_model.py:34` and `depression_model.py:33` both call
   **`predict_proba(X)`**. Any chosen classifier must implement it.
2. `bullying_model.py:35` reads `_encoder.classes_`, so the bullying model is
   **multi-class** with a persisted label encoder;
   `depression_model.py:34` reads `proba[1]`, so the depression model is
   **binary**.

**What was not known when this was decided:** the achievable accuracy on the
Kaggle corpus (nothing has been trained yet), the on-disk size of the resulting
artifacts, and — see *Open questions* — which corpus supplies depression labels.

## Decision

We will replace the keyword counter with a **real trained classical text
classifier**, and we will not introduce a deep-learning stack.

### A. Model class — TF-IDF features + Logistic Regression

Scoring is `TfidfVectorizer` → `LogisticRegression`. Not a neural or
transformer model.

**Logistic Regression over LinearSVC**, because `LinearSVC` has no
`predict_proba`, and both call sites (`bullying_model.py:34`,
`depression_model.py:33`) already depend on it — choosing LinearSVC would mean
either a `CalibratedClassifierCV` wrapper or rewriting inference, for no gain.

Rationale for classical over neural:

- Trains in seconds on commodity hardware; the whole pipeline is rerunnable by
  an examiner.
- Fits inside Render's free-tier memory and build limits, which a transformer
  does not.
- Fully reproducible from a seed and a public corpus.
- It is genuinely a trained, evaluated model — defensible in a viva, unlike
  both the current keyword matcher and a hosted-API call.

### B. Data source — Kaggle Cyberbullying Classification corpus

The bullying classifier trains on the public labelled Kaggle *Cyberbullying
Classification* corpus, whose `not_cyberbullying` class the code at
`bullying_model.py:39` already expects.

Chosen over live social-platform APIs because it is free (X/Twitter's API has
no meaningful free read tier), ethically clean (published for research, already
de-identified), key-free and rate-limit-free, reproducible, and — decisively —
it yields a **measured accuracy number on a held-out split**, which a live feed
alone would not. A live API replaces the *stream*; it does not supply a
*detector*.

### C. Dependency consequence — remove the deep-learning stack

This decision **removes** `torch`, `transformers`, and `xgboost` from
`requirements.txt`, and adds only `scikit-learn` and its small transitive
dependencies (`scipy`, `joblib`, `threadpoolctl`) — roughly 100–150 MB
installed, against ~2.5 GB for torch alone.

**This dependency slim-down is the expected fix for the broken Render deploy.**
One decision resolves two problems: the detector becomes real, and the build
stops exhausting the free tier. Training-only dependencies, if any are needed
beyond scikit-learn, go in a separate `requirements-train.txt` that the web
service never installs.

### D. Artifacts — trained model persisted, loaded at inference

Training writes a serialised artifact per model; inference loads it at import
time via the existing `_load()` helper (`bullying_model.py:6-8`). The existing
filenames are kept: `bullying_model.pkl`, `bullying_tfidf.pkl`,
`bullying_encoder.pkl`, `depression_model.pkl`, `depression_tfidf.pkl`.

`joblib` is preferred over bare `pickle` for scikit-learn estimators; the
loader will need a corresponding change.

Two facts the implementation must confront rather than inherit:
`backend/ml/artifacts/` is **gitignored at `.gitignore:20`**, so artifacts
cannot reach a git-based deploy as things stand; and both training scripts are
**0-byte files**, so real training *and* inference code has to be written, not
edited.

Whether the artifact is committed or rebuilt at deploy time is **not decided
here** — see *Open questions* Q1.

### E. Accuracy posture — report a real held-out number

We report accuracy and per-class F1 measured on a held-out test split, produced
by the training script and recorded in the repo.

We explicitly reject the current apparent accuracy. The audit found the mock
tweet pools (`stream_generator.py:6-38`) were authored to contain the exact
keywords the matcher searches for (`bullying_model.py:16-17`) — the demo scores
near-perfectly against a detector that measures nothing. **That circularity is
the failure mode this project is correcting, and honest measurement is recorded
here as a project value, not merely a task.** A real classical model reporting a
plausible mid-80s accuracy is worth more than a rigged 100%.

## Consequences

**Positive**

- The detector becomes a real, trained, evaluated model with a defensible number.
- Build weight drops by roughly an order of magnitude.
- Training is fast enough to iterate on and cheap enough to rerun in CI.
- Linear models give **exact** feature attributions for free: the contribution of
  a token is `coefficient × tfidf_value`. The advertised SHAP feature
  (`docs/AUDIT.md` GAP-5, currently three inconsistent fakes) can be made real
  **without** the `shap` dependency, `depression_explainer.pkl`, or per-request
  explainer overhead.
- The full pipeline — corpus, script, seed, artifact, metric — is reproducible
  end to end, which is exactly what an examiner will ask for.

**What this unblocks**

Decision C is the highest-probability fix for the broken Render backend deploy
(`AUDIT.md` C-1). Removing torch/transformers/xgboost should be attempted and
redeployed **before** any further deploy restructuring, since it may resolve the
failure on its own and will otherwise clarify what remains.

**Negative / accepted trade-offs**

- A TF-IDF linear model will underperform a fine-tuned transformer on nuanced
  text. Accepted deliberately: deployability and reproducibility are worth more
  here than a few points of F1.
- Bag-of-words carries no word order and no context. Negation ("you are *not*
  pathetic") remains partially unhandled — better than the current substring
  matcher, but not solved.
- Performance is bounded by the corpus's known label noise and topical skew.
- Vocabulary is frozen at training time; new slang requires retraining.

**Follow-on work this creates**

- Train/serve preprocessing skew is now a live risk. `clean()` is duplicated and
  **divergent** between the two models — `bullying_model.py:22` strips
  `@mentions`, `depression_model.py` does not (`AUDIT.md` H-10). The shared
  `services/preprocessor.py` (0 bytes) must be implemented and used by both
  training and inference, or the model degrades silently.
- Characterisation tests should pin the current `/api/analyze` contract *before*
  the scoring path is swapped (`AUDIT.md` H-8).
- `/health` should expose `models_ready` so fallback mode is never silent again.

**What would make us revisit this**

- Measured accuracy falls low enough to be indefensible in a viva.
- A transformer becomes deployable within the hosting budget.
- The project acquires a GPU-capable or paid host, changing the constraint that
  drove this decision.

## 🚩 Reconciliation — a user-facing string becomes false

`causal_chain.py:50` emits `'XGBoost+TF-IDF'` and `stream_generator.py:111`
emits `'XGBoost'`; both surface to users at `LiveFeed.jsx:128`.

Those strings were **already false** — `xgboost` has never been imported. Under
this decision they become false in a new way: xgboost is removed outright, and
the real model is Logistic Regression. The provenance label must change to match.

**Flagged, not fixed here.** It is step 5 of the implementation slice below.
Ideally the label is derived from artifact metadata rather than replaced with
another hardcoded literal.

## Open questions

Raised by this decision, **deliberately not resolved in it**:

- **Q1 — Artifact delivery.** Commit the trained artifacts (simple, works
  immediately, but `.gitignore:20` must change and binaries enter git history
  permanently), or rebuild/fetch at deploy time (cleaner, adds a build-time
  dependency)? Recommend deciding once actual artifact sizes are known — under
  ~10 MB combined, committing is likely the pragmatic answer.
  Tracked as `docs/DECISIONS-PENDING.md` D-5. **Needs sign-off.**
- **Q2 — Depression corpus.** Decision B names a corpus for the *bullying*
  classifier only. The Kaggle Cyberbullying dataset carries **no depression
  labels**, yet `depression_model.py:33-34` expects a binary `predict_proba[1]`.
  A second labelled corpus is required, and has not been chosen. Until it is,
  the depression model has no data source and would remain on the keyword
  fallback. **Needs sign-off.**
- **Q3 — Bullying score derivation.** `bullying_model.py:40` computes
  `1 - proba['not_cyberbullying']`. Is that the intended severity semantics
  under a real multi-class model, or should severity derive from the predicted
  class instead? Affects the 0.55 threshold at `causal_chain.py:26`.
- **Q4 — Do we drop the `shap` dependency?** If linear attributions replace SHAP
  (see Consequences), `shap==0.46.0` and `depression_explainer.pkl` become
  unnecessary — a further build-weight reduction, but a change to the advertised
  feature's implementation.

## Implementation slice — ordered, NOT YET EXECUTED

Recorded for when this ADR is implemented. **No step below has been performed;
no code, dependency, dataset, or artifact has been touched by this ADR.**

1. **Slim `requirements.txt`** per decision C — remove `torch`, `transformers`,
   `xgboost` (and the other unused pins per `AUDIT.md` H-1); keep/add
   `scikit-learn`. Redeploy to Render and read the build log before doing
   anything else — this alone may fix C-1.
2. **Write the training script** (`ml/train_bullying.py`, currently 0 bytes):
   load the Kaggle corpus → shared `clean()` → `TfidfVectorizer` →
   `LogisticRegression` → fixed-seed stratified train/test split → persist model,
   vectorizer, and `LabelEncoder` to `ml/artifacts/` → **print held-out accuracy
   and per-class F1** per decision E.
3. **Write the inference function** — implement `services/preprocessor.py` as the
   single shared `clean()`, then load the artifact and score text, preserving the
   existing `predict()` return contract (`{'score', 'type', 'proba', 'ready'}`).
4. **Replace the keyword counter** — make the real path primary; keep the
   fallback only as an explicit, *logged and surfaced* degraded mode, never a
   silent one.
5. **Update the provenance string** — `causal_chain.py:50` and
   `stream_generator.py:111`, so `LiveFeed.jsx:128` stops naming a model that
   does not exist.

Steps 2–5 are blocked on Q2 for the depression model; steps 1–5 can proceed for
the bullying model independently.

## Relates-to

- Scoped by: ADR-0002 (escalation detection architecture) — this ADR is Stage-1
- Insufficient for: follow-up / escalation detection; see ADR-0002 Decision B
- Evidence for the scoping note: `docs/memory-bank/02-followup-feasibility.md`
  (RED verdict), `docs/memory-bank/03-corpus-investigation.md` §2
- Resolves: `docs/DECISIONS-PENDING.md` → D-1 (data source), partially D-2
  (dependency slim-down)
- Defers: `docs/DECISIONS-PENDING.md` → D-5 (artifact delivery, as Q1)
- Addresses: `docs/AUDIT.md` → C-3 (no model artifacts), C-1/H-1 (deploy weight),
  GAP-1 (real-time detection claim), GAP-5 (SHAP), GAP-6 (XGBoost string)
- Creates work on: `docs/AUDIT.md` → H-10 (divergent preprocessing), H-8 (tests)
- Evidence: `docs/memory-bank/01-mock-data-inventory.md` → M-01, M-02, M-06,
  M-07, S-01, S-02, S-07
- Phase 2 step: 2 (fix Render deploy) and 3 (replace mock data)
