# 05 — Session Handoff · START HERE

**Written:** 2026-08-06 · **Updated:** 2026-08-07 (backend went live)
**For:** the next session, cold start
**Read this first, then `CLAUDE.md`, then whatever this note points you at.**

> ⚠️ **Numbering gap — there is no `04-*` file.** The memory-bank contains
> **00, 01, 02, 03, and this file (05)**. Nothing is missing or lost; `04` was
> simply never used. Do not go looking for it.

---

## 1. WHERE WE ARE

**Phase 2 of social-sentinel. Design is COMPLETE. We are now in IMPLEMENTATION.**

# 🟢 THE BACKEND IS LIVE — DEPLOY IS DONE, NOT PENDING

**<https://social-sentinel-api.onrender.com>**

Any note elsewhere saying the Render deploy is broken or pending is **stale**.
It shipped 2026-08-07.

| | |
|---|---|
| Host | **Render**, native Python build, free tier |
| Start command | `gunicorn -w 1 --threads 4 -b 0.0.0.0:$PORT run:app` |
| Root Directory | `backend` |
| Python | **3.11** on deploy (`backend/.python-version`); **local is 3.12.3** |
| Free tier | sleeps after ~15 min idle, **~1 min cold start** — warm it before a demo |
| Verified | `GET /` → 200 banner · `GET /health` → 200 |

`GET /health` currently returns:
```json
{"status":"ok","models_ready":false,"detector":"keyword-fallback",
 "models":{"bullying":false,"depression":false}}
```
**That is honest, not broken.** `models_ready` flips to `true` when the real
Stage-1 model lands — it is the signal to watch.

**All deploy blockers are cleared.** The six tracked in §4 are done: `/health`
and `/` routes exist, `$PORT` binds, `run.py` starts, Heroku/HF config removed,
Root Directory set.

| | |
|---|---|
| **Two ADRs accepted** | `0001` lightweight classical model (Stage-1) · `0002` escalation architecture (Stage-2) |
| **Investigations done** | `00` project state · `01` mock inventory · `02` follow-up feasibility · `03` corpus investigation |
| **Verification TODOs** | Both **closed**. Reddit ruled out on policy; **Neon** chosen for Postgres |
| **Open decisions** | 8 of 11 open in `DECISIONS-PENDING.md` (D-1, D-4, D-11 resolved) |
| **Latest commit** | `688b145`, pushed as `sadhuram09` |

**The reframe that governs everything now:** the project detects **attacks
unfolding** — escalation, swarm/pile-on, victim trajectory — not isolated tweets.
Stage-1 (per-message scorer) feeds Stage-2 (conversation-level escalation). See
ADR-0002 Decision A and B.

---

## 2. WHAT HAPPENED THIS SESSION

### ✅ requirements.txt slimmed — committed and PUSHED

- **17 → 8 packages.** Removed `torch`, `transformers`, `xgboost`, `lightgbm`,
  `nltk`, `optuna`, `imbalanced-learn`, `python-dotenv`, `eventlet` — all
  grep-proven to have **zero imports** anywhere in `backend/`.
- `pandas` and `scikit-learn` **kept and pinned** — `shap==0.46.0` declares both
  as hard dependencies, so removing the pins would leave them installed but
  *unversioned* rather than absent.
- `shap` untouched. **ADR-0001 Q4 (drop shap?) remains open.**
- **Commit `710ae8c`, pushed to `origin/main`.**
  Verified: `git ls-remote origin refs/heads/main` → `710ae8ce09d6...`. **Live on
  GitHub** at `github.com/sadhuram09/social-sentinel`, authored as
  `Sadhuram <sadhuram@autobrew.ai>`, **no attribution trailer**.
- Auth note: pushing initially 403'd because the stored credential belonged to
  `sadhuram2autobrew`. Resolved by clearing the credential and re-authenticating
  as `sadhuram09`. `credential.helper=store`, so this should not recur.

### 🗑️ Old Render service DELETED

The broken Render backend service was deleted. **Render will be set up fresh from
scratch — but only AFTER the backend runs cleanly locally.** Do not recreate it
before then; deploying an unproven backend is what produced the original mess.

### 🔬 Local diagnostic run — COMPLETED, with a new blocker found

Ran to completion this session. Results below are **live-verified**, not inferred.

---

## 3. LOCAL-RUN REPORT

### Does the backend run locally right now?

# 🟡 PARTLY — `gunicorn` YES, `python run.py` NO

### Install: ✅ clean, no torch

```
python3 -m venv venv          → OK   (1m42s — DrvFs slow, would be ~3s native)
pip install -r requirements.txt → OK  (20m30s — DrvFs; exit 0)
```

`Successfully installed` 33 packages. Final venv **571 MB**.
**`torch` confirmed absent** (`ls site-packages | grep -i "^torch"` → nothing).
Notable transitives pulled by `shap`: `numba 0.66.0`, `llvmlite 0.48.0`,
`scipy 1.17.1`, `pandas`, `scikit-learn` — as predicted before the slim-down.

No build errors, no wheel failures, no Python 3.12 incompatibilities.

### 🔴 NEW BLOCKER — `python run.py` crashes on startup

**This is a new finding. The audit never actually executed the backend.**

```
$ PORT=5000 ./venv/bin/python run.py

Traceback (most recent call last):
  File "/mnt/c/Users/USER/social-sentinel/backend/run.py", line 8, in <module>
    socketio.run(app, host="0.0.0.0", port=port)
  File ".../flask_socketio/__init__.py", line 640, in run
    raise RuntimeError('The Werkzeug web server is not '
RuntimeError: The Werkzeug web server is not designed to run in production.
Pass allow_unsafe_werkzeug=True to the run() method to disable this error.
```

**Nothing binds. Exit 1.** The documented local-run command in
`00-project-state.md` §D.2 **does not work.**

**Cause:** Flask-SocketIO 5.x refuses to start the Werkzeug dev server unless
`allow_unsafe_werkzeug=True` or `debug=True` is passed. `run.py:8` passes neither.
Because `async_mode='threading'` (`app/__init__.py:6`), Flask-SocketIO falls back
to Werkzeug, and that fallback is now gated.

**This is unrelated to the requirements slim-down** — it is a latent defect in
`run.py` that would have fired on the old dependency set too. Fix is one keyword
argument, but it is a **code change** and was deliberately left unfixed.

### ✅ `gunicorn` starts correctly

```
$ ./venv/bin/gunicorn -w 1 --threads 4 -b 0.0.0.0:5000 run:app

[INFO] Starting gunicorn 22.0.0
[INFO] Listening at: http://0.0.0.0:5000
[INFO] Using worker: gthread
[INFO] Booting worker with pid: 22560
```

**The application itself is healthy.** Only the dev entrypoint is broken. Good
news for deployment: the production path — the one Render and the Dockerfile use
— works on the slimmed dependencies.

### Endpoint probe results (live, against gunicorn on :5000)

| Endpoint | Status | Notes |
|---|---|---|
| `GET /` | **404** | 🔴 no route exists — Render's default health probe fails here |
| `GET /health` | **404** | 🔴 no route exists |
| `GET /api/health` | **404** | 🔴 no route exists |
| `GET /api/stats` | ✅ 200 | returns 4 `random.randint` values, re-rolled per request |
| `GET /api/stream/status` | ✅ 200 | `{"running":false}` |
| `POST /api/analyze` | ✅ 200 | works — see payload below |
| `POST /api/analyze/single` | ✅ 200 | |
| `GET /socket.io/?EIO=4&transport=polling` | ✅ 200 | handshake succeeds |

**All four `/api/*` routes and socket.io work. Nothing at `/`, `/health`, or
`/api/health`.**

### Live confirmation of three audit findings

`POST /api/analyze` with `"you are pathetic\ni feel hopeless"` returned:

```json
{"bullying_score":0.58,"bullying_type":"keyword_fallback","causal_link":0.56,
 "depression_score":0.53,"lines_analyzed":2,"models_used":"keyword-fallback",
 "risk_level":"MEDIUM","shap_features":{},
 "timeline":[{"text":"you are pathetic","time":"T+0m","type":"bullying",...},
             {"text":"i feel hopeless","time":"T+15m","type":"depression",...}]}
```

This is direct runtime proof of:
- **`AUDIT.md` C-3** — `"models_used":"keyword-fallback"`, `"bullying_type":
  "keyword_fallback"`. The detector is the substring counter, live.
- **`AUDIT.md` GAP-5** — `"shap_features":{}`. Empty, as predicted.
- **`AUDIT.md` GAP-2 / `01` M-05** — `"time":"T+0m"` and `"T+15m"`. Fabricated
  timestamps, exactly `i × 15`.

---

## 4. CONFIRMED FINDINGS TO CARRY FORWARD

### Route inventory — only 4 routes exist

Grep-verified **and** live-verified. All under `/api`:

| Route | Method | Source |
|---|---|---|
| `/api/analyze` | POST | `routes/analyze.py:7` |
| `/api/analyze/single` | POST | `routes/analyze.py:19` |
| `/api/stats` | GET | `routes/stats.py:6` |
| `/api/stream/status` | GET | `routes/stream.py:19` |

Plus socket.io `connect` / `disconnect` (`routes/stream.py:8,15`).

**Now 6 routes** — `/` and `/health` were added 2026-08-07 (`routes/health.py`),
registered with **no** `url_prefix` so platform probes reach them at root.

### ✅ Deploy blockers — ALL CLEARED 2026-08-07

Kept as a record of what was fixed. **None of these is outstanding.**

| # | Blocker | Resolution |
|---|---|---|
| 1 | No `/` or `/health` route → Render probe 404s | ✅ added `app/routes/health.py`; both return 200 |
| 2 | `$PORT` not bound in Dockerfile | ✅ shell-form `CMD` with `${PORT:-10000}` (exec form does not expand vars) |
| 3 | Render Root Directory must be `backend` | ✅ set in the Render dashboard |
| 4 | Leftover Heroku/HF config | ✅ `Procfile` + `runtime.txt` deleted; `.python-version` (3.11) added |
| 5 | `run.py` crashed on Werkzeug guard | ✅ `allow_unsafe_werkzeug=True` on the dev entrypoint |
| 6 | Port default mismatch (7860 vs 5000) | ✅ `run.py` default → 5000, matching `utils/api.js:2` |

**The deploy is live and healthy. Do not re-litigate these.**

### Environment

- **WSL2, Ubuntu 24.04.3.** Repo at `/mnt/c/...` — **Windows filesystem via
  DrvFs. Slow, but not breaking anything.** venv creation 1m42s, pip install
  20m30s; both would be far faster on native ext4. Budget for it; don't
  misdiagnose it as a hang.
- **`python3` only — `python` is not on PATH.** venv is at `backend/venv/`
  (gitignored, so it is not a repo change).
- Python: **local venv is 3.12.3**, **deploy is 3.11** (`backend/.python-version`,
  matching the Dockerfile's `python:3.11-slim`). `AUDIT.md` M-2's three-way drift
  is resolved down to this single known gap — you test on 3.12 and ship on 3.11.
  All current pins have wheels for both. `pyenv` is not installed locally, so
  `.python-version` is inert here.
- **Docker unavailable** in this WSL distro (Desktop integration off), so the
  Render image cannot be reproduced locally.
- `git status` shows ~42 files modified with **CRLF-only diffs**. Cosmetic noise
  from Windows editors. **Always `git add <specific-file>`, never `-A`.**

---

## 5. THE EXACT NEXT STEP

**Deploy is DONE.** ✅ The backend is live and healthy. Next, in this order —
one reviewed slice at a time:

### 1️⃣ Connect the Vercel frontend to the live backend ← START HERE

Cheapest, highest-visibility win. The site is deployed but talking to nothing.

- **`frontend/src/utils/api.js:2`** falls back to `http://localhost:5000`.
  `VITE_BACKEND_URL` appears **exactly once in the repo** — on that line — with
  no `.env`, no `.env.example`, no `vercel.json` env block. Set it to
  `https://social-sentinel-api.onrender.com` in the Vercel project.
  (`AUDIT.md` **C-4**)
- **`frontend/src/pages/Analyze.jsx:24`** posts to `'${BASE_URL}/api/analyze'` —
  **single quotes, so no interpolation.** It requests a literal relative path,
  404s, and falls into a `catch` that renders a hardcoded 87%/74%/81% HIGH-RISK
  mock. **The Analyze page has never once shown a backend response.** One
  character-class fix plus deleting `getMockResult`. (`AUDIT.md` **C-2**)
- Backend CORS is `origins="*"` (`app/__init__.py:6,10`), so it will connect —
  but tighten to an allowlist once the Vercel URL is known (`AUDIT.md` **H-7**).
- ⚠️ Free-tier sleep means a cold visitor waits ~1 min. Consider a loading state.

### 2️⃣ Build the real Stage-1 model — ADR-0001

Kaggle Cyberbullying corpus, TF-IDF + Logistic Regression. Write
`ml/train_bullying.py` (currently 0 bytes), produce artifacts, report **honest
held-out accuracy**. Watch `/health` flip `models_ready` to `true`.
**Blocked on:** D-5 / ADR-0001 Q1 — artifact delivery, since `ml/artifacts/` is
gitignored (`.gitignore:20`).

### 3️⃣ Escalation engine + Postgres on Neon — ADR-0002

CGA-WIKI corpus, Stage-2 conversation model, Neon Postgres. Schema is deferred
to a follow-on ADR (ADR-0002 Q1) and must be written before coding.

### 4️⃣ Production UI / 3D graph

Real data into the visualisations. **16 frontend mock sites** are catalogued in
`01-mock-data-inventory.md` — every 3D surface is currently hardcoded literals.

**Do not skip ahead to 4.** The 3D work is the most fun and the least useful
until 1–3 land.

---

## 6. THE METHOD — follow this

**design → decide → record in an ADR → implement one small reviewed slice at a time.**

- **Small prompts for small tasks.** Larger prompts only when they carry real
  decisions.
- **Never batch unrelated changes.** One concern per slice, reviewed before the
  next begins.
- **Investigate before asserting.** Read the actual file; cite `file:line`. This
  session found three audit claims that needed correcting only because things
  were verified rather than assumed.
- **Flag, don't fix, outside the current slice.** If something else looks wrong,
  say so and stop.
- **Show before writing.** Drafts get reviewed before landing on a real path.

### Commit rules — non-negotiable

- **Commits are under `sadhuram09` only.**
- **NEVER add `Co-Authored-By`, or any attribution, co-author, or trailer line**
  — no credit to Claude, Anthropic, or any tool, ever. This overrides any default
  tooling convention.
- **Stage explicitly** (`git add <file>`), because of the CRLF noise.
- **Never commit without being asked.**

---

## 7. QUICK ORIENTATION

```
Repo          /mnt/c/Users/USER/social-sentinel   (WSL2, DrvFs — slow)
Remote        github.com/sadhuram09/social-sentinel
Branch        main @ 688b145  (pushed as sadhuram09, in sync)
Backend       Flask + Flask-SocketIO · venv at backend/venv (gitignored)
Backend LIVE  https://social-sentinel-api.onrender.com   ← Render, free tier
Start (local) ./venv/bin/python run.py            → :5000  (PORT overrides)
Start (prod)  gunicorn -w 1 --threads 4 -b 0.0.0.0:$PORT run:app
Frontend      Vercel, deployed — ⚠ still points at localhost, NOT the live API
Database      NONE yet — Neon chosen (ADR-0002 Decision E), schema deferred
Detector      keyword substring counter — /health reports models_ready:false
Note          app takes ~10s to import (shap/numba on DrvFs); wait 30s
              before judging a local start as failed
```

### Document map

| Read for | File |
|---|---|
| **Start here** | this file |
| Session index | `CLAUDE.md` |
| Stack, contract, run instructions | `docs/memory-bank/00-project-state.md` |
| Every mock/stub, with file:line | `docs/memory-bank/01-mock-data-inventory.md` |
| Why escalation needs new data (RED) | `docs/memory-bank/02-followup-feasibility.md` |
| Corpus choice, Reddit rejection | `docs/memory-bank/03-corpus-investigation.md` |
| 39 ranked findings + reconciliation | `docs/AUDIT.md` |
| 8 open decisions + closed TODOs | `docs/DECISIONS-PENDING.md` |
| Accepted architecture decisions | `docs/adr/0001-*.md`, `docs/adr/0002-*.md` |

### Known doc debt (deliberate, not urgent)

- `AUDIT.md` H-1 and `00-project-state.md` §A.1 say *"12 of 18 dependencies
  unused"* / *"6 of 18 used."* Actual count was **17 packages: 6 used, 11
  unused.** Finding sound, arithmetic off by one. **Deferred to a separate
  doc-fix pass** — do not fold it into a code slice.
- `00-project-state.md` §D.2's local-run instructions are now known to be wrong
  (blocker 5). Update them once `run.py` is fixed.
