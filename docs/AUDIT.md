# AUDIT — social-sentinel

**Audited:** 2026-08-06 · **Commit:** `d992288` (main) · **Scope:** whole repo, read-only
**Method:** every finding below was verified by reading the cited file at the cited line.
**Nothing in this pass was fixed.** This document is a map, not a changelog.

| Severity | Count | Meaning |
|---|---|---|
| 🔴 **CRITICAL** | 4 | Blocks deployment or makes a headline feature structurally non-functional |
| 🟠 **HIGH** | 10 | Real breakage, security exposure, or a feature that silently does nothing |
| 🟡 **MEDIUM** | 15 | Will bite during Phase 2; correctness, hygiene, or maintenance debt |
| 🔵 **LOW** | 10 | Cosmetic, cleanup, or environment-specific friction |

---

# 🚩 RECONCILIATION — Product Claims vs. Implemented Code

> **Read this section first.** The gap between what social-sentinel says it does and
> what it does is the defining fact of the current codebase. Every gap below is
> **named and left in place** — this pass fixes nothing.

**Important correction to the audit premise:** the root `README.md` is **empty — 0
bytes**, in the working tree *and* in `HEAD` (verified: `git cat-file -p
HEAD:README.md` returns nothing; the initial commit `27b5b82` lists it at 0 lines).
`frontend/README.md` is the **unmodified Vite starter template** and says nothing
about this project. **There is no README making any claim about this project at
all.**

The claims cited for this audit are real, but they live in the **shipped UI copy**,
which is worse: they are asserted directly to users on the deployed Vercel site
rather than to developers in a repo file. Below, each claim is traced to the exact
line of user-facing text that makes it.

---

### GAP-1 — "Real-time cyberbullying detection" 🔴

**Claimed at:** `frontend/src/pages/Home.jsx:127-129`
> *"The world's first system that detects cyberbullying events and traces their
> causal impact on victim mental health — in real time, with 3D visualizations."*

Reinforced by `Dashboard.jsx:64` ("— Real-time Intelligence"), `Dashboard.jsx:68`
("Live Detection Dashboard"), `Navbar.jsx:87` (a permanently-green "LIVE" badge),
and `Analyze.jsx:60` ("...trace the causal chain in real time").

**Implemented:** three parts, all false.

| Word in the claim | Reality | Evidence |
|---|---|---|
| *"real-time"* | A daemon thread `sleep`s 1.8–3.5 s and picks a string from a 25-element hardcoded array | `services/stream_generator.py:6-38, 70-83` |
| *"detects"* | `sum(1 for kw in BULLY_KW if kw in text.lower())` — a 12-word substring count | `models/bullying_model.py:16-17, 28-31` |
| *"world's first"* | Unsupported superlative | `Home.jsx:127` |

There is no ingestion of any external data source anywhere in the repo. No API
client, no HTTP client in the backend, no dataset loader, no queue consumer, no
scraper. **The system has never processed a message it did not ship with.**

**Compounding factor — the demo is rigged, and this matters most.** `BULLY_POOL`
entries were authored to contain the exact keywords `BULLY_KW` searches for
(`pathetic`, `loser`, `ugly`, `worthless`, `freak`); `DEPRESSION_POOL` entries
contain `DEP_KW`'s terms (`don't deserve`, `what's the point`, `empty`, `alone`).
**The mock data was written to satisfy the mock detector.** A viewer watching the
live feed sees ~100% apparent classification accuracy from a system that is
measuring nothing. This is the single most misleading property of the project,
because it makes a non-functional system present as a working one.

**Do not fix in this pass. Named only.**

---

### GAP-2 — "Traces their causal impact on victim mental health" 🔴

**Claimed at:** `frontend/src/pages/Home.jsx:110-116`
> *"**Bullying Triggers Depression.** We Prove It, Visually."*

Reinforced by `Home.jsx:98` ("AI-Powered Causal Chain Detection"),
`Dashboard.jsx:132` ("Bullying events with confirmed depressive response"),
`Analyze.jsx:146` ("Detected bullying event with **confirmed** depressive response in
victim's subsequent messages"), and the entire `/echo` and `/globe` pages.

**Implemented:** `backend/app/services/causal_chain.py:17`

```python
causal_link = float(np.clip(bullying_score * 0.55 + depression_score * 0.45, 0, 1))
```

A fixed weighted average of two keyword counts taken from **the same text blob**.
This cannot express causation, for four independent structural reasons:

1. **No temporal separation.** Both scores are computed from the same input at
   `causal_chain.py:11-12`. There is no "before" and no "after".
2. **No victim identity.** The system has no persistent account model
   (`stream_generator.py:40-46` assigns random handles), so no individual's mental
   state can be tracked across time. Causal claims about "victim mental health"
   require a victim who persists.
3. **Fabricated time axis.** `causal_chain.py:33` stamps line *i* as `T+{i*15}m` —
   invented, regardless of the actual content. The ordering the causal claim rests
   on is manufactured by the code that makes the claim.
4. **Unjustified constants.** `0.55` / `0.45` and the `0.72` / `0.45` risk
   thresholds (`causal_chain.py:18`) have no derivation, citation, or tuning
   procedure anywhere in the repo.

**Illustrative:** the single word `"disappear"` (in `DEP_KW`, absent from
`BULLY_KW`) yields bullying `0.25`, depression `0.533`, `causal_link = 0.377`. A
"causal" score has been produced from one word occurring once.

The word **"confirmed"** at `Analyze.jsx:146` and `Dashboard.jsx:132` is the
sharpest instance: nothing is confirmed by anything.

**Aggravating context:** this is a mental-health claim shown to users. The Analyze
page renders "🚨 HIGH RISK" with a red glow and the sentence "confirmed depressive
response" for any text containing three keywords — and, because of **C-2** below,
actually renders it for *literally any input at all*, since it always falls back to
a hardcoded `risk_level: 'HIGH'`.

**Do not fix in this pass. Named only.**

---

### GAP-3 — "With 3D visualizations" ✅ **REAL** (but rendering 100% fiction)

**Claimed at:** `Home.jsx:128`, plus the `/network` and `/globe` routes.

**Implemented:** genuinely and competently.
- `components/NetworkGraph3D.jsx` — `react-force-graph-3d` + hand-built three.js
  node objects (sphere meshes, emissive materials, glow rings, canvas-texture sprite
  labels), camera auto-orbit at lines 108-123, click-to-zoom at 192-203.
- `components/Globe3D.jsx` — `react-globe.gl` with points, pulse rings, animated
  dashed arcs, and a hex-bin heat layer.
- `components/EchoChamber.jsx` — a real d3 force simulation with progressive
  wave-reveal animation.

**This is the one claim the code honours.** The rendering is real engineering.

**But:** all three read from hardcoded literals and make **zero network calls**.
`grep -rn "axios\|fetch(\|io(" frontend/src` returns exactly two hits, neither of
them in these files. Specifically:

- `NetworkGraph3D.jsx:52-63` defines a `depression_ripple` edge type — asserting
  **emotional contagion through a social graph**, rendered with animated directional
  particles — backed by no detection logic whatsoever, not even a keyword matcher.
- `Globe3D.jsx:32-43` labels ten intercontinental arcs "⚡ Causal Chain" and gives
  them a legend entry. There is no geolocation anywhere in the backend; no payload
  in the repo carries a `lat`, `lng`, or `country` field.
- `Globe3D.jsx:347` displays a "**Causal Rate**" computed as `depCount /
  bullyCount` — a ratio of two invented integers, shown as an analytical finding.
- `EchoChamber.jsx:20-24` gives bystander nodes texts like `'seeing this ruined my
  whole day'` with `depressionScore: 0.39`, and `EchoChamberPage.jsx:99` states as
  fact: *"Even uninvolved bystanders who view the thread show anxiety and mood
  decline."* There is no impression data, no view tracking, and no before/after
  measurement in the system.

**Do not fix in this pass. Named only.**

---

### GAP-4 — Fabricated platform statistics, in four places, hand-synchronised 🟠

Four separate sources present the same invented numbers as live metrics:

| Source | Values |
|---|---|
| `routes/stats.py:9-12` | `random.randint()` — re-rolled per request |
| `pages/Home.jsx:6-11` | `2.4M`, `18,420`, `7,891`, `3,204` + fake "+12% today" deltas |
| `pages/GlobePage.jsx:5-10` | `3,204`, `18.4K`, `54%` |
| `components/Dashboard.jsx:9-28, 50-54` | timeline curve, radar breakdown, 3 "active chains" |

They agree with each other because they were **manually tuned to agree**, not
because they share a source. `Dashboard.jsx:135` renders "`{CHAINS.length} active`"
— the length of a 3-element literal, presented as a live count. Nothing calls
`/api/stats`. See `docs/memory-bank/01-mock-data-inventory.md` M-10, M-12, M-13,
M-14, M-15, M-24.

---

### GAP-5 — "SHAP Feature Importance", three times, none real 🟠

The UI advertises model explainability in three places, with three **mutually
inconsistent** fake datasets:

| Location | What it shows | Reality |
|---|---|---|
| `Analyze.jsx:152-168` | `threat_language`, `isolation`, `hopelessness`, `self_blame` | hardcoded in the mock at `Analyze.jsx:41` |
| `CausalChainPanel.jsx:96-108` | `isolation words`, `self-deprecation`, `hopelessness`, `social withdrawal` | hardcoded inline at line 99; preceding comment reads `{/* SHAP explanation placeholder */}` |
| `LiveFeed.jsx:100-111` | reads `tweet.shap` | **that key is never present in the payload** (`stream_generator.py:101-112`) — permanently dead branch |

Backend reality: `depression_model.py:36-50` returns `{}` unconditionally
(`_explainer` is always `None`, and line 27-30 returns before it anyway). Real SHAP
output would be TF-IDF **tokens** (`"pathetic"`, `"worthless"`), not human-authored
concept labels like `"social withdrawal"`.

---

### GAP-6 — "XGBoost" is named in the UI; `xgboost` has zero imports 🟡

`causal_chain.py:50` and `stream_generator.py:111` emit the literal strings
`'XGBoost+TF-IDF'` / `'XGBoost'`, surfaced to users at `LiveFeed.jsx:128`.
`xgboost==2.0.3` is pinned at `requirements.txt:9` and **imported nowhere**
(verified by grep across all backend `.py`). The named architecture has never been
written. (In practice the `else` branch always runs, so users correctly see
`fallback` — but the literal encodes an untrue claim about a code path that does not
exist.)

---

### Reconciliation summary

| # | Claim | Status |
|---|---|---|
| GAP-1 | Real-time cyberbullying detection | ❌ hardcoded strings + 12-keyword substring match |
| GAP-2 | Causal impact on victim mental health | ❌ weighted average of two scores from one text |
| GAP-3 | 3D visualizations | ✅ **real rendering**, ❌ 100% fabricated data |
| GAP-4 | Platform statistics | ❌ four hand-synced fake sources |
| GAP-5 | SHAP explainability | ❌ three inconsistent fakes; backend returns `{}` |
| GAP-6 | XGBoost models | ❌ dependency pinned, never imported |

**Verdict:** the frontend is a well-built, genuinely impressive visualisation shell.
The backend is a thin scaffold whose intended contents were never written. Phase 1
delivered the *appearance* of the system, and Phase 2 is the system.

---
---

# 🔴 CRITICAL

## C-1 — Render backend deploy is broken (dedicated entry)

**Status:** deploy fails. **Blocks:** every backend-dependent Phase 2 step.

### C-1.a What deploy configuration actually exists

| Artifact | Path | Contents | Verdict for Render |
|---|---|---|---|
| **Procfile** | `backend/Procfile:1` | `web: gunicorn -w 1 --threads 4 -b 0.0.0.0:$PORT run:app` | ⚠️ **Render does not read Procfiles.** Heroku convention. Render uses a Start Command on the service (dashboard field or `render.yaml`). Correct content, ignored file. |
| **Dockerfile** | `backend/Dockerfile:1-13` | `python:3.11-slim`, `pip install -r requirements.txt`, `EXPOSE 5000`, `CMD [... "-b","0.0.0.0:5000", "run:app"]` | 🔴 **hardcodes port 5000, ignores `$PORT`** |
| **.dockerignore** | `backend/.dockerignore:1-5` | `venv/ __pycache__/ *.pyc .env ml/datasets/` | ✅ fine |
| **runtime.txt** | `backend/runtime.txt:1` | `python-3.11.9` | ⚠️ **Render does not read `runtime.txt`.** Heroku convention. Render uses the `PYTHON_VERSION` env var or `.python-version`. Python version is effectively **unpinned** on Render. |
| **requirements.txt** | `backend/requirements.txt` | 18 packages incl. `torch==2.3.1`, `transformers==4.44.2` | 🔴 **primary build-failure cause — see C-1.c** |
| **render.yaml** | — | **DOES NOT EXIST** | 🔴 no Blueprint; every setting is manual, unreviewable, and unreproducible |
| **Start command** | — | **not declared in-repo anywhere Render reads** | 🔴 |
| **Health check** | — | **no `/` route, no `/health` route** | 🔴 Flask returns 404 at `/`; Render's default probe fails |
| **Env vars referenced in code** | `run.py:7` — `os.environ.get("PORT", 7860)` | that is the **only** env read in the entire backend (verified by grep) | ⚠️ and `run.py:7` is inside `if __name__ == "__main__"`, so gunicorn never executes it |

**No `.env`, no `.env.example`, no `config.py` contents** (`backend/config.py` is
0 bytes). `python-dotenv` is installed and never imported.

### C-1.b Host/PORT binding — three mutually inconsistent values

```
backend/run.py:7        PORT default 7860     ← Hugging Face Spaces convention
backend/Dockerfile:11   EXPOSE 5000
backend/Dockerfile:13   -b 0.0.0.0:5000       ← hardcoded, ignores $PORT
backend/Procfile:1      -b 0.0.0.0:$PORT      ← correct, but Render never reads this file
frontend/src/utils/api.js:2   http://localhost:5000
frontend/src/pages/LiveFeed.jsx:215  "Make sure Flask is running on port 5000"
```

Render injects `PORT` (default `10000`) and requires the service to bind it. The
Dockerfile binds `5000` unconditionally. Render's Docker path does attempt port
detection, but binding `$PORT` is the documented contract; hardcoding is a coin-flip
that will surface as *"Port scan timeout reached, no open ports detected"*.

### C-1.c The likely proximate build failure — `torch`

`requirements.txt:17` pins `torch==2.3.1`. The default PyPI `torch` wheel is the
**CUDA-bundled** build: ~800 MB compressed, **~2.5 GB installed**. Add
`transformers==4.44.2` and its tokenizer/model-hub chain, plus `shap`, `xgboost`,
`lightgbm`, `optuna`, `pandas`, `scikit-learn`, and `nltk`.

On Render's free instance type (512 MB RAM, constrained build disk), this build
exhausts memory or disk. The characteristic symptoms are *"Ran out of memory (used
over 512MB) while running your code"*, *"Killed"* mid-`pip install`, or a build
timeout.

**And none of it is used.** Verified by grep across every backend `.py`:

```
torch: 0 refs    transformers: 0 refs    nltk: 0 refs      xgboost: 0 refs
lightgbm: 0 refs optuna: 0 refs          imblearn: 0 refs  pandas: 0 refs
eventlet: 0 refs dotenv: 0 refs          sklearn: 0 direct imports
```

**Twelve of eighteen pinned packages are dead weight**, and the two heaviest are the
ones breaking the build. The running application needs exactly: `flask`,
`flask-cors`, `flask-socketio`, `numpy`, `gunicorn` — plus `scikit-learn` and `shap`
*only if* real `.pkl` artifacts are ever introduced.

### C-1.d Repository layout vs. Render's service root

The Flask app lives in `backend/`, not at the repo root. Render's **Root Directory**
defaults to the repository root, where there is no `requirements.txt` and no
`Dockerfile`. Unless Root Directory is explicitly set to `backend`, the build fails
at step one with nothing to install. Because there is no `render.yaml`, this setting
exists only in the dashboard — invisible to the repo, to code review, and to this
audit.

### C-1.e Health check

`app/__init__.py:12-18` registers three blueprints, all under `/api`. **Nothing is
registered at `/`.** Render's default health check path is `/`; Flask answers 404;
Render marks the service unhealthy and the deploy is reported as failed even when
the process is alive and serving `/api/*` correctly. There is no `/health` or
`/api/health` endpoint anywhere.

### C-1.f WebSocket transport will not work as configured

`app/__init__.py:6` sets `async_mode='threading'`. Under gunicorn's threaded worker,
Flask-SocketIO in threading mode supports **HTTP long-polling only** — a sync/threaded
WSGI worker cannot perform a WebSocket upgrade. Meanwhile
`hooks/useWebSocket.js:21` requests `transports: ['websocket', 'polling']`, putting
the unsupported transport **first**. `eventlet==0.36.1` is installed (the dependency
that would enable real WebSockets) and never selected, because `async_mode` is
hardcoded.

Result on Render: failed upgrade attempts, a fallback to polling if the client
negotiates it, and higher latency and request volume than intended. On a free
instance that also spins down after 15 minutes of inactivity, the "LIVE" feed will
frequently be dead on arrival.

### C-1.g Evidence the last deploy target was not Render

Commit `82b9fc7` is titled **"HF Spaces deployment"** and is what set `run.py`'s
default port to `7860` — the Hugging Face Spaces convention. Commit `1d68c48`
("Added Docker deployment") added the Dockerfile. **There is no Render-specific
artifact anywhere in the repository.** The backend was last aimed at HF Spaces; the
Render attempt appears to have reused that configuration without adapting it.

### C-1.h Proposed fix

Ordered, smallest-first. **Requires sign-off on `DECISIONS-PENDING.md` D-2 and D-3
before implementation.**

1. **Slim `requirements.txt`** to what is imported: `flask`, `flask-cors`,
   `flask-socketio`, `numpy`, `gunicorn` (+ `scikit-learn`, `shap` when artifacts
   land). Drop `torch`, `transformers`, `nltk`, `xgboost`, `lightgbm`, `optuna`,
   `imbalanced-learn`, `pandas`, `python-dotenv`, `eventlet` — or move ML-training
   deps into a separate `requirements-train.txt` that the web service never
   installs. **This alone probably fixes the build.**
2. **Add `GET /health`** returning `{"status":"ok","models_ready":<bool>}`, and a
   `GET /` returning a small JSON banner so the default probe succeeds.
3. **Bind `$PORT` in the Dockerfile** — switch `CMD` to shell form or an entrypoint
   script: `gunicorn -w 1 --threads 4 -b 0.0.0.0:${PORT:-10000} run:app`. Update
   `EXPOSE` accordingly (or drop it; it is documentation only).
4. **Add `backend/render.yaml`** (or a root Blueprint) declaring `rootDir: backend`,
   the build and start commands, `healthCheckPath: /health`, and env vars — so the
   configuration is in the repo and reviewable, not in a dashboard.
5. **Pin Python for Render** via `PYTHON_VERSION=3.11.9` in the Blueprint, or add
   `backend/.python-version`. Keep `runtime.txt` only if HF Spaces remains a target.
6. **Keep `-w 1`.** `StreamGenerator` is a module-level singleton
   (`stream_generator.py:116-122`) emitting from a background thread; multiple
   workers would each spawn their own and duplicate the feed. Multi-worker requires a
   Redis message queue — do not raise the worker count casually.
7. **Decide WebSocket vs. polling** (see D-3): either switch to
   `async_mode='eventlet'` with `-k eventlet` and keep `eventlet` installed, or
   accept polling and reorder the client to `transports: ['polling','websocket']`.
8. Add `ENV PYTHONUNBUFFERED=1` to the Dockerfile so Render's log stream is not
   empty during the next failure.

---

## C-2 — `Analyze.jsx:24`: template literal in single quotes — the primary feature has never reached the backend

**Location:** `frontend/src/pages/Analyze.jsx:24`

```javascript
const res = await axios.post('${BASE_URL}/api/analyze', { text })
//                           ↑ single quotes — NOT a template literal
```

**What's wrong:** JavaScript does not interpolate `${...}` inside single quotes. The
request URL is the literal 21-character **relative** path `${BASE_URL}/api/analyze`,
resolved against the page origin as
`https://<host>/$%7BBASE_URL%7D/api/analyze`. `BASE_URL` is imported at line 4 and
never actually used.

**Why it matters:** this is the app's flagship feature. The request 404s → `catch`
at line 26 → `setResult(getMockResult(text))` at line 28. **The Analyze page has
never once rendered a backend response** — not in local dev, not on the deployed
Vercel site. It returns the identical constant for every input:
bullying 87% / depression 74% / causal 81% / **HIGH RISK**, with four fixed SHAP
labels (lines 34-48).

This also means the deployed site currently shows a fabricated "🚨 HIGH RISK —
confirmed depressive response" verdict for *any* text a visitor pastes, including
harmless text. Given the mental-health framing, that is the most user-facing defect
in the project.

Worse, it is **invisible**: the mock is rendered with no error banner and no
"offline mode" indicator. `error` state exists (declared line 17, set line 22) and is
**never read anywhere in the component**.

On Vercel, `frontend/vercel.json:2-7` rewrites `/(.*)` → `/`, so the bad URL returns
the SPA's `index.html` with **HTTP 200** and an HTML body. Whether axios throws then
depends on JSON parsing — meaning the failure mode differs between local dev (clean
404) and production (200 + HTML). Both end at the mock.

**Proposed fix:** change the quotes to backticks; delete `getMockResult` entirely
(lines 34-48); render the existing `error` state on failure. Then reconcile the
response shape — the mock returns `bullying_segments` / `depression_segments`, which
the backend never sends, while the backend's `bullying_type`, `lines_analyzed`,
`models_used`, and per-line `timeline[].text` are never consumed by the UI.

**One character-class change plus a deletion converts the app's main feature from
permanently-fake to genuinely backend-driven, with no new infrastructure.** This is
the highest value-per-effort fix in the repo.

---

## C-3 — No model artifacts exist, and none can be produced

**Locations:**
- `backend/app/models/bullying_model.py:6-14` — loader + `READY` flag
- `backend/app/models/depression_model.py:6-13` — same
- `backend/ml/train_bullying.py` — **0 bytes**
- `backend/ml/train_depression.py` — **0 bytes**
- `backend/ml/artifacts/` — **directory does not exist**
- `.gitignore:20` — `backend/ml/artifacts/` is **gitignored**

**What's wrong:** `_load()` returns `None` for a missing file (line 8), so `READY`
is `False`, so every call to `predict()` takes the keyword-fallback branch
(`bullying_model.py:28-31`, `depression_model.py:27-30`). This is not a
misconfiguration — it is unfixable from within the repo:

1. The `.pkl` files do not exist.
2. The scripts that would create them are **empty files**.
3. Even if written and run locally, `.gitignore:20` guarantees the output never
   reaches a git-based deployment.

**Why it matters:** this is the actual state behind GAP-1 and GAP-2. Every score the
system has ever produced — in the live feed, in `/api/analyze`, in `/api/analyze/single`
— is a substring count. Concretely:

- Any text with **zero** keyword hits scores `0.25` bullying / `0.20` depression.
- **One** hit scores `0.583` bullying, which crosses the `>0.55` detection threshold
  at `causal_chain.py:26`. A single substring decides a detection.
- Substring, not word-boundary: "**stupid**ly funny", "he's a **trash** talker",
  "I'm **exhausted** from the gym", "the box is **empty**", "home **alone** tonight 🎉"
  all fire.
- No negation handling: "you are **not** pathetic" scores identically to the slur.

**Proposed fix:** blocked on `DECISIONS-PENDING.md` **D-1** (data source) and **D-2**
(artifact delivery). Once decided: write the two training scripts, produce evaluated
artifacts, and choose a delivery mechanism — Git LFS, a release asset fetched at
build time, Hugging Face Hub, or object storage. Do **not** simply un-gitignore the
directory; `.pkl` blobs in git history are a long-term liability. Add a startup log
line and expose `models_ready` on `/health` so fallback mode is never silent again.

---

## C-4 — The deployed frontend has no way to reach a deployed backend

**Location:** `frontend/src/utils/api.js:1-2`

```javascript
const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'
```

**What's wrong:** `VITE_BACKEND_URL` appears **exactly once in the entire repo** — on
this line. There is no `.env`, no `.env.example`, no `.env.production`, and
`frontend/vercel.json:1-8` contains only an SPA rewrite rule — no `env` or `build.env`
block. Nothing in the repository documents that this variable exists or what it
should be set to.

**Why it matters:** if the variable is not set in the Vercel dashboard, the
production bundle ships with `http://localhost:5000` baked in at build time (Vite
inlines `import.meta.env.*` statically — it cannot be changed after build). The
HTTPS Vercel page then attempts an HTTP request to `localhost`, which browsers block
as **mixed content**, and `hooks/useWebSocket.js:20` attempts a socket.io handshake
to the visitor's own machine. The live feed shows "CONNECTING..." forever
(`LiveFeed.jsx:170`).

This is invisible in the repo and easy to lose across rebuilds — a redeploy from a
different branch or a fresh Vercel project silently reverts to localhost.

**Proposed fix:** requires `DECISIONS-PENDING.md` **D-3** (sign-off on the
mechanism). Recommended: commit a `frontend/.env.example` documenting the variable;
declare it in `vercel.json` or as a Vercel project env var; add a dev-mode console
warning when `VITE_BACKEND_URL` is unset; and, once C-1 is fixed and the backend has
a stable URL, consider a Vercel rewrite (`/api/* → <backend>/api/*`) so the frontend
uses same-origin paths and the URL stops being a build-time constant.

---
---

# 🟠 HIGH

## H-1 — 12 of 18 backend dependencies are unused; the two heaviest break the build
**Location:** `backend/requirements.txt`
Full table in `docs/memory-bank/00-project-state.md` §A.1. `torch`, `transformers`,
`nltk`, `xgboost`, `lightgbm`, `optuna`, `imbalanced-learn`, `pandas`,
`python-dotenv`, `eventlet` have **zero references**; `scikit-learn` has no direct
import (needed only transitively at unpickle time). **Matters:** ~2.5 GB of install
for code that does not exist, multi-minute cold starts, and the proximate cause of
C-1. **Fix:** split into `requirements.txt` (runtime) and `requirements-train.txt`
(ML training), verified with `pip-compile` or `pipreqs`.

## H-2 — WebSocket transport cannot work under the configured server
**Locations:** `backend/app/__init__.py:6` (`async_mode='threading'`),
`backend/Procfile:1` / `Dockerfile:13` (gunicorn threaded worker),
`frontend/src/hooks/useWebSocket.js:21` (`transports: ['websocket','polling']`).
A sync/threaded WSGI worker cannot perform a WebSocket upgrade; Flask-SocketIO in
threading mode is long-polling only. The client requests the unsupported transport
first. `eventlet` is installed but unreachable because `async_mode` is hardcoded.
**Matters:** the one genuinely-working backend integration is running on the slow
path, with failed upgrade attempts on every connect. **Fix:** decide via D-3, then
either `async_mode='eventlet'` + `-k eventlet`, or accept polling and reorder the
client transports.

## H-3 — No health endpoint and no root route
**Location:** `backend/app/__init__.py:12-18` — all blueprints under `/api`; nothing
at `/`. **Matters:** Render's default health probe hits `/`, gets 404, marks the
service unhealthy. There is also no way to check *from outside* whether the models
loaded. **Fix:** add `GET /health` → `{"status":"ok","models_ready":<bool>,"version":...}`
and a minimal `GET /`.

## H-4 — Live feed renders a SHAP panel from a key the server never sends
**Locations:** `frontend/src/pages/LiveFeed.jsx:95-115` reads `tweet.shap`;
`backend/app/services/stream_generator.py:101-112` never includes a `shap` key.
**Matters:** an entire interactive UI branch (click a card to expand) is permanently
dead, and nothing signals it. **Fix:** either add `shap` to the emitted payload once
C-3 lands, or remove the branch. Note `/api/analyze/single` *does* return `shap`
(`analyze.py:34`) — but nothing calls that endpoint (H-9).

## H-5 — Raw exception text is returned to clients
**Location:** `backend/app/routes/analyze.py:16-17` — `except Exception as e: return
jsonify({'error': str(e)}), 500`. **Matters:** leaks file paths, library internals,
and stack context to any caller; combined with `CORS(origins="*")` (H-7) that is any
website on the internet. Also logs nothing server-side, so failures are invisible to
the operator. **Fix:** log the traceback; return a generic message plus a correlation
ID.

## H-6 — Backend and frontend disagree on the analyze response shape
**Locations:** backend returns `bullying_type`, `lines_analyzed`, `models_used`, and
`timeline[].text` (`causal_chain.py:41-51`) — none consumed. The frontend mock
returns `bullying_segments` / `depression_segments` (`Analyze.jsx:39-40`) — neither
sent. **Matters:** the moment C-2 is fixed, the UI will render a differently-shaped
object than it was built against, and `Analyze.jsx:155`'s unguarded
`Object.entries(result.shap_features)` will throw if that key is ever absent.
**Fix:** define the contract once (see `docs/adr/`), then align both ends.

## H-7 — CORS and socket.io accept every origin
**Locations:** `backend/app/__init__.py:10` — `CORS(app, origins="*")`;
`backend/app/__init__.py:6` — `SocketIO(cors_allowed_origins="*")`.
**Matters:** any site can call the API and open a socket. Harmless while the API is
read-only and unauthenticated; becomes a real exposure the moment there is a
database, user data, or rate-limited inference behind it. **Fix:** read an
`ALLOWED_ORIGINS` env var (Vercel URL + `localhost:5173`) once `config.py` exists.

## H-8 — Zero tests, zero CI
**Location:** whole repo. No `pytest`, no vitest, no `.github/workflows`, no test
file of any kind. **Matters:** Phase 2 replaces the core scoring path (C-3) and
restructures deploy (C-1). Without a single characterisation test, there is nothing
to detect a regression, and no way to prove a real model outperforms the keyword
fallback. **Fix:** before touching model code, add characterisation tests pinning the
current `/api/analyze` contract, plus a smoke test that boots the app and hits
`/health`. Wire to GitHub Actions.

## H-9 — Three of four backend endpoints have no caller; the frontend duplicates their data as literals
**Locations:** `POST /api/analyze/single` (`analyze.py:19-35`), `GET /api/stats`
(`stats.py:6-13`), `GET /api/stream/status` (`stream.py:19-21`) — all uncalled
(verified: `grep -rn "axios\|fetch(\|io(" frontend/src` returns 2 hits).
Meanwhile `Home.jsx:6-11` hardcodes the very numbers `/api/stats` exists to serve.
**Matters:** ~40% of the API surface is dead code that still has to be maintained,
deployed, and reasoned about, while the UI it was built for reads from literals
beside it. **Fix:** wire them up or delete them — but decide deliberately.

## H-10 — Text preprocessing is duplicated *and divergent* between the two models
**Locations:** `bullying_model.py:19-24` vs. `depression_model.py:19-23`. Both define
`clean()`. **They are not the same function:** the bullying version strips
`@mentions` (`re.sub(r'@\w+','',text)`, line 22); the depression version does not.
`backend/app/services/preprocessor.py` — the file that should hold the shared
implementation — is **0 bytes**. **Matters:** a model trained with one preprocessing
and served with the other degrades silently, with no error. This is a classic
train/serve skew bug lying in wait for C-3. **Fix:** implement `preprocessor.py`,
import it in both models and in both training scripts, and pin the choice in an ADR.

---
---

# 🟡 MEDIUM

## M-1 — Backend and frontend default to different ports
`backend/run.py:7` defaults `PORT` to **7860** (HF Spaces); `frontend/src/utils/api.js:2`
defaults to **5000**; `frontend/src/pages/LiveFeed.jsx:215` tells users "port 5000".
A fresh clone will not connect. **Fix:** pick one local default (5000), align all
three, and document it.

## M-2 — Three-way Python version drift
Local WSL runs **3.12.3**; `backend/runtime.txt:1` pins **3.11.9**;
`backend/Dockerfile:1` uses **python:3.11-slim**. Also, `python` is not on PATH in
this WSL image — only `python3`. **Fix:** pick one version, pin it in the Dockerfile
and in `.python-version`, and record the WSL `python3` caveat in run instructions.

## M-3 — The stream generator thread is started and never stopped
`backend/app/routes/stream.py:8-17` — `on_connect` calls `gen.start()`;
`on_disconnect` does nothing. `StreamGenerator.stop()` exists
(`stream_generator.py:61-62`) and is **never called anywhere**. **Matters:** after
the first client ever connects, the daemon thread runs and emits forever, burning CPU
on a free Render instance with zero connected clients. **Fix:** track connected
clients and stop the generator at zero.

## M-4 — Random message IDs collide
`backend/app/services/stream_generator.py:102` — `random.randint(100000, 999999)`.
By the birthday bound, collisions become likely within a few hundred messages.
`frontend/src/hooks/useWebSocket.js:32` already works around it by appending
`Date.now()` to build a usable React key. **Fix:** a monotonic counter or `uuid4`.

## M-5 — No configuration layer at all
`backend/config.py` is **0 bytes**; `python-dotenv` is installed and never imported;
`run.py:7` is the only `os.environ` read in the backend, and it sits inside
`if __name__ == "__main__"` so gunicorn never executes it. There is no `.env.example`.
**Fix:** implement `config.py` with `PORT`, `ALLOWED_ORIGINS`, `MODEL_ARTIFACT_PATH`,
`LOG_LEVEL`; commit `.env.example`.

## M-6 — Five 0-byte files ship as if they were modules
`backend/app/routes/causal.py`, `backend/app/services/preprocessor.py`,
`backend/app/services/shap_explainer.py`, `backend/config.py`, plus the two `ml/`
training scripts. `causal.py` is not even registered in `app/__init__.py:12-18`.
**Matters:** they read as implemented architecture in a file listing and are not.
**Fix:** implement or delete; do not leave them as decoration.

## M-7 — Mock data structures rebuilt on every React render
`components/EchoChamber.jsx:76` — `buildEchoData()` called in the component body
without `useMemo`, re-seeding the d3 force simulation.
`components/Dashboard.jsx:50-54` — `CHAINS` declared inside the component.
`components/Globe3D.jsx:211-217` — the hex-bin point cloud is regenerated with fresh
`Math.random()` inside JSX, so the heat map visibly shifts between renders.
**Fix:** hoist to module scope or wrap in `useMemo`. (These become fetch calls once
the real endpoints exist, so fix them as part of that work.)

## M-8 — Silent exception swallowing in the SHAP path
`backend/app/models/depression_model.py:49-50` — `except Exception: pass`. Any
genuine SHAP failure vanishes with no log line. **Fix:** log at `warning` and set an
explicit degraded flag in the response.

## M-9 — A dead duplicate `index.html`, and the real one is untitled
`frontend/public/index.html` has the correct title ("SocialSentinel — Causal Chain
Detection") but **Vite never serves it** — Vite uses the project-root
`frontend/index.html`, whose `<title>` is the scaffold default **`frontend`**
(line 7), and which is what actually ships to Vercel. Files in `public/` are copied
verbatim, so `public/index.html` is a confusing artifact reachable only at
`/index.html`. **Fix:** set the real title in `frontend/index.html`; delete
`frontend/public/index.html`.

## M-10 — Five unused frontend dependencies bloat the bundle
`@react-three/fiber`, `@react-three/drei`, `@react-spring/three`, `gsap`, and
`lucide-react` are in `package.json:13-20` and **imported nowhere** (all icons are
emoji literals). **Matters:** install time, lockfile churn, audit surface, and — for
anything the bundler cannot fully tree-shake — payload. **Fix:** remove, or record
why they are being held for planned work.

## M-11 — `CausalChainPanel` ignores its own `chain` prop
`components/CausalChainPanel.jsx:14` accepts `{ chain }` (passed from
`Dashboard.jsx:199`) and never reads it; the component renders the module-level
`MOCK_EVENTS` instead (lines 4-10). Clicking chain 1, 2, or 3 shows the identical
five events. **Fix:** render from the prop.

## M-12 — Dead error state in the Analyze page
`pages/Analyze.jsx:17` declares `[error, setError]`; line 22 calls `setError(null)`;
`error` is **never read** in the JSX. Together with C-2, this is why the permanent
mock fallback is invisible. **Fix:** render it.

## M-13 — No error boundaries, and unguarded property access
`main.jsx:7-11` and `App.jsx:44-51` have no `<ErrorBoundary>`. Any throw inside the
three.js / d3 / globe components blanks the whole page. `Analyze.jsx:155` calls
`Object.entries(result.shap_features)` with no guard. **Fix:** add a route-level
boundary and optional-chain the access.

## M-14 — The root README is empty
`README.md` — **0 bytes**, in the working tree and in `HEAD`. `frontend/README.md` is
the unmodified Vite template. There is no setup documentation of any kind, which is
the direct reason this audit had to reconstruct run instructions from source.
**Note:** the run instructions now live in `docs/memory-bank/00-project-state.md` §D.
**Fix (Phase 2):** write a real README pointing at `CLAUDE.md` and `docs/`.

## M-15 — 3D globe textures are fetched from a third-party CDN at runtime
`components/Globe3D.jsx:136-138` loads `earth-night.jpg`, `earth-topology.png`, and
`night-sky.png` from `//unpkg.com/three-globe/...` — protocol-relative URLs to a
public CDN. **Matters:** the globe page silently degrades to a blank sphere if unpkg
is slow, blocked, or the assets move; it also blocks any future Content-Security-Policy
and any offline demo. For a final-year project defence, a CDN outage during the demo
is a real risk. **Fix:** vendor the three textures into `frontend/public/`.

---
---

# 🔵 LOW

| ID | Location | Issue | Fix |
|---|---|---|---|
| **L-1** | `pages/LiveFeed.jsx:1` (`useRef`), `pages/GlobePage.jsx:13` (`clickedCity`), `pages/EchoChamberPage.jsx:15` (`selectedNode`) | imported/declared and never used | remove; `npm run lint` will list them |
| **L-2** | `routes/stream.py:13` | server emits a `status` event; no client ever listens | handle it (show a connection banner) or drop it |
| **L-3** | `components/Navbar.jsx:80-88` | the "LIVE" pill is hardcoded green with a pulse animation — it reflects nothing | bind to `useWebSocket().connected` |
| **L-4** | `components/Navbar.jsx:18` | leftover dev comment `// ← ADD` shipped to production | remove |
| **L-5** | repo-wide | ~42 files show as modified with whitespace/CRLF-only diffs (Windows editors on a `/mnt/c` DrvFs mount) | add `.gitattributes` with `* text=auto eol=lf` |
| **L-6** | repo location `/mnt/c/Users/USER/social-sentinel` | DrvFs I/O makes `npm install` and Vite HMR markedly slower, and inotify can miss events | optionally relocate into the WSL filesystem (`~/`); or set `server.watch.usePolling` in `vite.config.js` |
| **L-7** | `backend/Dockerfile` | no `PYTHONUNBUFFERED=1` (logs buffer, so Render's log stream looks empty during a failure) and no non-root `USER` | add both |
| **L-8** | `components/Dashboard.jsx:78` | subtitle claims "Hourly resolution"; `TIMELINE_DATA` (lines 9-19) is 3-hourly | correct the copy (or the data, once real) |
| **L-9** | `frontend/README.md` | unmodified Vite starter boilerplate | replace or delete |
| **L-10** | `stats.py:9-12`, `Home.jsx:6-11`, `GlobePage.jsx:5-10`, `NetworkPage.jsx:8-14`, `EchoChamberPage.jsx:5-12` | the same fabricated statistics are hand-maintained in five files and already disagree (`NetworkPage`'s `avgDepressionRisk: '74%'` vs. the actual 75.9% mean of `NetworkGraph3D`'s victim scores) | single source once the endpoints are real |

---

## Fix-order recommendation

Mapped to the planned Phase 2 sequence. **Each step is reviewed before the next
begins.**

| Step | Findings addressed | Notes |
|---|---|---|
| **1 · Clean local run** | M-1, M-2, M-5, M-14, L-5, L-6 | Also add the characterisation tests from H-8 **before** anything else changes — they are the only safety net for steps 2-4. |
| **2 · Fix Render deploy** | **C-1**, C-4, H-1, H-2, H-3, H-7, L-7 | Needs sign-off on D-2, D-3. Slimming `requirements.txt` (H-1) is the highest-probability single fix. |
| **3 · Replace mock detection** | **C-3**, **C-2**, H-4, H-5, H-6, H-9, H-10, M-3, M-4, M-6, M-8 | Needs sign-off on D-1. C-2 is one character-class change and can land immediately — do it in step 1 or 2 if convenient. |
| **4 · UI / 3D / next-level** | GAP-1…GAP-6, M-7, M-9, M-10, M-11, M-12, M-13, M-15, L-1…L-4, L-8, L-10 | The reconciliation gaps are resolved here: either back each claim with real data, or change the copy. Needs sign-off on D-6, D-8. |

**Sequencing note:** step 3 replaces the scoring path that steps 1 and 2 validate.
Landing H-8 (tests) during step 1 is what makes steps 2-4 verifiable rather than
hopeful.
