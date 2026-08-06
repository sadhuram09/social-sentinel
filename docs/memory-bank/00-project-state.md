# 00 — Project State (Ground Truth)

> **Durable note.** This is the source of truth for Phase 2. Every claim below was
> verified by reading the actual file at the cited line. Nothing here comes from a
> README (the root `README.md` is a 0-byte empty file — see §F).
>
> **Audited:** 2026-08-06 · **Commit:** `d992288` (main) · **Working tree:** dirty
> (whitespace/CRLF-only churn across ~42 files; no committed content differs)

---

## A. STACK MAP

### A.1 Backend — Python / Flask

**Manifest:** `backend/requirements.txt`
**Entrypoint:** `backend/run.py` → `app.create_app()` (`backend/app/__init__.py:8`)
**Runtime pin:** `backend/runtime.txt` → `python-3.11.9`
**Layout:** Flask app-factory + blueprints, no database, no ORM, no migrations.

```
backend/
├── run.py                  # entrypoint, reads $PORT (default 7860)
├── config.py               # ⚠ EMPTY (0 bytes)
├── requirements.txt
├── runtime.txt             # python-3.11.9
├── Procfile                # Heroku-style start command
├── Dockerfile              # python:3.11-slim
├── .dockerignore
├── app/
│   ├── __init__.py         # create_app(), CORS, SocketIO init
│   ├── routes/
│   │   ├── analyze.py      # POST /api/analyze, POST /api/analyze/single
│   │   ├── stats.py        # GET  /api/stats           (random numbers)
│   │   ├── stream.py       # GET  /api/stream/status + socket.io handlers
│   │   └── causal.py       # ⚠ EMPTY (0 bytes), never imported
│   ├── models/
│   │   ├── bullying_model.py    # pickle loader + keyword fallback
│   │   └── depression_model.py  # pickle loader + keyword fallback
│   └── services/
│       ├── causal_chain.py      # orchestrates both models
│       ├── stream_generator.py  # background thread emitting fake tweets
│       ├── preprocessor.py      # ⚠ EMPTY (0 bytes)
│       └── shap_explainer.py    # ⚠ EMPTY (0 bytes)
└── ml/
    ├── train_bullying.py   # ⚠ EMPTY (0 bytes)
    ├── train_depression.py # ⚠ EMPTY (0 bytes)
    └── artifacts/          # ⚠ DOES NOT EXIST (and is .gitignore'd)
```

#### Dependency table — what each line is for, and whether it is actually used

Verified by `grep -rn` for every module name across `backend/**/*.py`.

| Package | Version | Stated purpose | Actually imported anywhere? |
|---|---|---|---|
| `flask` | 3.0.3 | HTTP framework | ✅ `app/__init__.py:1`, all routes |
| `flask-cors` | 4.0.1 | CORS for the Vercel frontend | ✅ `app/__init__.py:2,10` |
| `flask-socketio` | 5.3.6 | WebSocket live-feed transport | ✅ `app/__init__.py:3,6`, `routes/stream.py:2,8,15` |
| `numpy` | 1.26.4 | `clip`, `argsort` in scoring | ✅ `models/*.py:2`, `services/causal_chain.py:1` |
| `shap` | 0.46.0 | SHAP feature attributions | ⚠️ imported **lazily inside a try/except** at `models/depression_model.py:39`; unreachable today because `_explainer` is always `None` |
| `gunicorn` | 22.0.0 | Production WSGI server | ✅ referenced by `Procfile:1` + `Dockerfile:13` (not imported in code) |
| `pandas` | 2.2.2 | — | ❌ **0 references** |
| `scikit-learn` | 1.5.1 | TF-IDF vectorizer + classifier (needed at *unpickle* time) | ❌ 0 direct imports; would be required transitively if `.pkl` artifacts existed |
| `xgboost` | 2.0.3 | claimed bullying classifier | ❌ **0 references** (string `'XGBoost+TF-IDF'` is hardcoded at `services/causal_chain.py:50`) |
| `lightgbm` | 4.5.0 | — | ❌ **0 references** |
| `imbalanced-learn` | 0.12.3 | class rebalancing during training | ❌ **0 references** (training scripts are empty) |
| `optuna` | 3.6.1 | hyperparameter search | ❌ **0 references** |
| `transformers` | 4.44.2 | — | ❌ **0 references** |
| `torch` | 2.3.1 | — | ❌ **0 references** — this is the single largest install in the file (~2.5 GB with bundled CUDA) |
| `nltk` | 3.9.1 | — | ❌ **0 references** |
| `python-dotenv` | 1.0.1 | `.env` loading | ❌ **0 references**; no `.env` or `.env.example` exists |
| `eventlet` | 0.36.1 | async socket.io worker | ❌ **0 references**; `async_mode='threading'` is hardcoded at `app/__init__.py:6`, so eventlet is never selected |

**Net:** 6 of 18 pinned packages are used. 12 are dead weight, and `torch` +
`transformers` alone are the dominant cause of the Render build failure (see
`docs/AUDIT.md` → C-1).

### A.2 Frontend — React 19 / Vite 8

**Manifest:** `frontend/package.json`
**Entrypoint:** `frontend/index.html` → `src/main.jsx` → `src/App.jsx`
**Router:** `react-router-dom` v7, `BrowserRouter` (`src/main.jsx:8`)
**Styling:** plain CSS custom properties in `src/styles/globals.css` + inline
`style={{}}` objects everywhere. No Tailwind, no CSS modules, no styled-components.

| Package | Version | Purpose | Used at |
|---|---|---|---|
| `react` / `react-dom` | ^19.2.6 | UI runtime | everywhere |
| `react-router-dom` | ^7.15.0 | client routing, 6 routes | `App.jsx:44-51`, `Navbar.jsx:2` |
| `axios` | ^1.16.1 | the one HTTP call in the app | `pages/Analyze.jsx:3,24` |
| `socket.io-client` | ^4.8.3 | live-feed WebSocket | `hooks/useWebSocket.js:2,20` |
| `framer-motion` | ^12.38.0 | page/card animation | 9 of 12 components |
| `recharts` | ^3.8.1 | area chart + radar chart | `components/Dashboard.jsx:3-6` |
| `d3` | ^7.9.0 | force simulation for Echo Chamber | `components/EchoChamber.jsx:2` |
| `three` | ^0.184.0 | 3D primitives for network nodes | `components/NetworkGraph3D.jsx:3` |
| `react-force-graph-3d` | ^1.29.1 | 3D force-directed graph | `components/NetworkGraph3D.jsx:2` |
| `react-globe.gl` | ^2.37.1 | 3D globe with arcs/rings/hexbins | `components/Globe3D.jsx:4` |
| `@react-three/fiber` | ^9.6.1 | React renderer for three.js | ❌ **not imported anywhere** |
| `@react-three/drei` | ^10.7.7 | three.js helpers | ❌ **not imported anywhere** |
| `@react-spring/three` | ^10.0.3 | three.js springs | ❌ **not imported anywhere** |
| `gsap` | ^3.15.0 | animation | ❌ **not imported anywhere** |
| `lucide-react` | ^1.14.0 | icon set | ❌ **not imported anywhere** (all icons are emoji literals) |

**Dev deps:** `vite@^8`, `@vitejs/plugin-react@^6`, `eslint@^10` + react-hooks /
react-refresh plugins, `globals@^17`. Config: `vite.config.js` (react plugin only,
**no proxy, no server block, no define**), `eslint.config.js` (flat config).

**Net:** 5 of 15 runtime dependencies are unused.

### A.3 Database

**None.** No ORM, no driver, no connection string, no schema, no migration tool, no
`DATABASE_URL` reference anywhere in the repo. All state is in-process:
- `stats` counters are `random.randint(...)` per request (`routes/stats.py:9-12`)
- live-feed counters live in React state (`hooks/useWebSocket.js:12-17`) and reset on reload
- the stream generator holds a module-level singleton (`services/stream_generator.py:116-122`)

Nothing is persisted between requests, restarts, or page reloads.

### A.4 Build tooling

| Layer | Tool | Command | Config |
|---|---|---|---|
| Frontend dev | Vite 8 | `npm run dev` | `frontend/vite.config.js` |
| Frontend build | Vite 8 | `npm run build` → `dist/` | same |
| Frontend lint | ESLint 10 flat | `npm run lint` | `frontend/eslint.config.js` |
| Frontend deploy | Vercel | auto on push | `frontend/vercel.json` (SPA rewrite only) |
| Backend dev | Flask/SocketIO dev server | `python run.py` | none (`config.py` is empty) |
| Backend prod | gunicorn | `Procfile` / `Dockerfile CMD` | `backend/Procfile`, `backend/Dockerfile` |
| Backend deps | pip | `pip install -r requirements.txt` | `requirements.txt` |

No Makefile, no docker-compose, no CI workflow, no test runner, **no tests at all**.

---

## B. HTTP CONTRACT

### B.1 Endpoints the frontend *actually* calls

Only **two** network operations exist in the entire frontend. Verified exhaustively:

```
$ grep -rn "axios\|fetch(\|io(" frontend/src
hooks/useWebSocket.js:20:    const socket = io(BASE_URL, { ... })
pages/Analyze.jsx:24:      const res = await axios.post('${BASE_URL}/api/analyze', { text })
```

---

#### ① `POST /api/analyze` — thread causal-chain analysis

| | |
|---|---|
| **Frontend origin** | `frontend/src/pages/Analyze.jsx:24` |
| **Backend handler** | `backend/app/routes/analyze.py:7-17` (registered `/api` prefix at `app/__init__.py:16`) |
| **Status** | 🔴 **HANDLER EXISTS BUT IS NEVER REACHED** |

> **🐛 The call is broken.** Line 24 uses **single quotes** around a template
> literal: `axios.post('${BASE_URL}/api/analyze', ...)`. JavaScript does not
> interpolate inside single quotes, so the request URL is the literal 21-character
> relative path `${BASE_URL}/api/analyze`. The browser resolves that against the
> page origin → `https://<vercel-host>/$%7BBASE_URL%7D/api/analyze` → 404 →
> `catch` at line 26 → `setResult(getMockResult(text))` at line 28. **The Analyze
> page has never once displayed a backend response.** See AUDIT C-2.

**Request (intended):**
```json
{ "text": "@user_a: line one\n@victim: line two" }
```

**Response 200 (what the backend would return — `services/causal_chain.py:41-51`):**
```json
{
  "bullying_score":   0.58,
  "bullying_type":    "keyword_fallback",
  "depression_score": 0.53,
  "causal_link":      0.56,
  "risk_level":       "MEDIUM",
  "shap_features":    {},
  "timeline": [
    { "time": "T+0m",  "type": "bullying", "score": 0.58,
      "text": "@user_a: line one", "bullying_score": 0.58, "depression_score": 0.20 }
  ],
  "lines_analyzed": 2,
  "models_used": "keyword-fallback"
}
```
**Response 400:** `{"error": "No text provided"}` (`analyze.py:12`)
**Response 500:** `{"error": "<str(exception)>"}` (`analyze.py:17`) — leaks raw
exception text to the client.

> ⚠️ **Shape mismatch even if the URL were fixed.** The mock fallback at
> `Analyze.jsx:34-48` returns `bullying_segments` and `depression_segments`; the
> backend returns neither. Conversely the backend returns `bullying_type`,
> `lines_analyzed`, and `models_used`, which the mock omits and the UI ignores.
> `Analyze.jsx:155` does `Object.entries(result.shap_features)` unguarded — the
> backend's real `shap_features` is `{}` today, which renders an empty section, but
> any future `undefined` there is an unhandled crash.

---

#### ② `socket.io` connection + `new_tweet` event — live feed

| | |
|---|---|
| **Frontend origin** | `frontend/src/hooks/useWebSocket.js:20` — `io(BASE_URL, { transports: ['websocket','polling'] })` |
| **Backend handler** | `backend/app/routes/stream.py:8-13` (`@socketio.on('connect')`) |
| **Status** | 🟡 wired correctly, but transport order + host binding make it fragile |

**Client → server:** socket.io handshake at `<BASE_URL>/socket.io/`.
**Server → client on connect:** `emit('status', {connected: true, message: 'Stream started'})`
(`stream.py:13`) — **the frontend never registers a `status` listener**, so this is discarded.

**Server → client, every 1.8–3.5 s** (`services/stream_generator.py:70,113`):

event `new_tweet`, payload (`stream_generator.py:101-112`):
```json
{
  "id": 483920,
  "user": "@quiet_soul_x",
  "text": "nobody wants you here just leave already",
  "type": "bullying",
  "bullying_score": 0.583,
  "depression_score": 0.2,
  "score": 0.583,
  "time": "now",
  "bullying_type": "keyword_fallback",
  "models_used": "fallback"
}
```
Consumed at `useWebSocket.js:29-61`; rendered by `pages/LiveFeed.jsx:24-134`.

> ⚠️ `LiveFeed.jsx:95` reads `tweet.shap` to render a SHAP panel on card expand.
> **`new_tweet` never contains a `shap` key** (`stream_generator.py:101-112`). That
> UI branch is permanently dead. See AUDIT H-4.

---

### B.2 Endpoints the backend serves that **nothing calls**

| Method + path | Handler | Called by frontend? |
|---|---|---|
| `POST /api/analyze/single` | `routes/analyze.py:19-35` | ❌ **NO CALLER FOUND.** Docstring says "used by live feed for on-demand analysis" — the live feed does not call it. |
| `GET /api/stats` | `routes/stats.py:6-13` | ❌ **NO CALLER FOUND.** Returns 4 random ints per request. The Home page hardcodes its own numbers at `pages/Home.jsx:6-11` instead. |
| `GET /api/stream/status` | `routes/stream.py:19-21` | ❌ **NO CALLER FOUND.** |

`POST /api/analyze/single` response shape (`analyze.py:30-35`):
```json
{ "bullying_score": 0.58, "bullying_type": "keyword_fallback",
  "depression_score": 0.2, "shap": {} }
```
`GET /api/stats` response shape (`stats.py:8-13`):
```json
{ "tweets_analyzed": 2431187, "bullying_detected": 18402,
  "depression_signals": 7883, "causal_chains": 3211 }
```

### B.3 Endpoints referenced but **NO BACKEND HANDLER FOUND**

None — every URL the frontend constructs maps to a registered blueprint route.
The failure mode here is the inverse: the frontend simply doesn't call most of the
API, and the one call it does make is malformed.

### B.4 Missing infrastructure endpoints

- **`GET /` — NO HANDLER.** The Flask app registers nothing at the root. Hitting
  the service root returns a 404 HTML page. Render's default health check pings
  `/` and marks the service unhealthy.
- **`GET /health` or `/api/health` — NO HANDLER.** Nothing exists for a platform
  liveness probe. See AUDIT C-1.

---

## C. DATA FLOW — one full request, traced

### C.1 Path A — "Analyze a Thread" (the primary demo path)

```
① USER  pastes text into the textarea and clicks "🔍 Analyze Thread →"
        frontend/src/pages/Analyze.jsx:87-100  (onClick={analyze})
                    │
② FRONTEND  analyze() → axios.post('${BASE_URL}/api/analyze', { text })
        frontend/src/pages/Analyze.jsx:24
        ╳╳╳ BREAKS HERE ╳╳╳  single quotes → literal relative path → 404
                    │
                    ├─────────── catch (Analyze.jsx:26) ──────────┐
                    │                                             ▼
                    │                            ③ setResult(getMockResult(text))
                    │                               Analyze.jsx:28, 34-48
                    │                               ↳ bullying 0.87 / depression 0.74
                    │                                 causal 0.81 / risk HIGH
                    │                                 4 fabricated timeline points
                    │                                 4 fabricated SHAP feature names
                    │                                             │
                    │                                             ▼
                    │                            ⑧ RENDER — score cards, risk badge,
                    │                               SHAP bars   Analyze.jsx:108-169
                    │
        ┌───────────┘  (the path below is what SHOULD happen once the URL is fixed)
        ▼
④ BACKEND ROUTE  POST /api/analyze  →  backend/app/routes/analyze.py:7
                 validates text non-empty (line 10-12)
                 → CausalChainService().analyze(text)   (line 14)
                    │
⑤ SERVICE  backend/app/services/causal_chain.py:7
           splits text on '\n' (line 8)
           full-text:  bully_predict(text) + dep_predict(text)   (lines 11-12)
           per-line:   bully_predict(line) + dep_predict(line)   (lines 23-24)
           causal_link = 0.55*bullying + 0.45*depression         (line 17)   ◀── see §E
           risk        = HIGH >0.72 / MEDIUM >0.45 / LOW         (line 18)
                    │
⑥ DATA SOURCE  backend/app/models/bullying_model.py:26  predict()
               ┌─ tries pickle.load('ml/artifacts/bullying_model.pkl')   (line 8, 11-13)
               │  ▶▶▶ THAT DIRECTORY DOES NOT EXIST ◀◀◀
               │  ▶▶▶ AND IS .gitignore'd (.gitignore:20)  ◀◀◀
               │  → READY = False   (line 14)
               └─ falls through to KEYWORD COUNTING            (lines 28-31)
                  score = clip(hits_in_12_word_list / 3 + 0.25, 0, 1)
                  type  = 'keyword_fallback'
               (identical structure in depression_model.py:25-30, 14-word list)
                    │
⑦ RESPONSE  jsonify(result)  analyze.py:15  → JSON over HTTP
                    │
⑧ RENDER  Analyze.jsx:108-169 — three animated score cards, risk badge, SHAP bars
```

### C.2 Path B — Live Feed (the only working backend integration)

```
① USER navigates to /live       App.jsx:47 → pages/LiveFeed.jsx:137
② useWebSocket() mounts         hooks/useWebSocket.js:19-22
③ io(BASE_URL) handshake        → backend routes/stream.py:8  on_connect()
④ get_generator(socketio).start()   stream.py:11-12 → stream_generator.py:54-59
   spawns a daemon thread (never stopped on disconnect — see AUDIT M-3)
⑤ every 1.8–3.5 s: _emit_one()  stream_generator.py:72
   ▶▶▶ MOCK ENTERS HERE ◀◀◀ picks a string from one of three hardcoded pools
       BULLY_POOL / DEPRESSION_POOL / NEUTRAL_POOL  (lines 6-38)
       weighted 38% bully / 32% depression / 30% neutral  (lines 74-83)
       attaches a random @handle from FAKE_USERS  (lines 40-46, 103)
⑥ scores it through the SAME keyword fallback as Path A  (lines 85-86)
⑦ socketio.emit('new_tweet', payload)   line 113
⑧ useWebSocket.js:29 receives → setTweets / setStats → LiveFeed.jsx:219 renders
```

### C.3 Path C — 3D visualisations (no backend at all)

`/network`, `/globe`, `/echo` make **zero** network calls. Every node, arc, hotspot,
score, and label is a literal in the component file. Details in
`docs/memory-bank/01-mock-data-inventory.md`.

### C.4 Where mock data enters, and where real data must plug in

| # | Mock entry point | File:line | Real replacement must supply |
|---|---|---|---|
| 1 | Missing model artifacts → keyword fallback | `models/bullying_model.py:11-14,28-31`<br>`models/depression_model.py:10-13,27-30` | Trained + serialised classifiers at `ml/artifacts/*.pkl`, **or** a swap of the `predict()` internals to a hosted model / transformer. This is the single highest-leverage seam: fix it and Paths A **and** B become real simultaneously. |
| 2 | Hardcoded tweet pools | `services/stream_generator.py:6-46` | An ingestion source (API stream, replayed dataset, or queue) feeding `_emit_one()` real text + real author + real timestamp. |
| 3 | Frontend mock fallback on error | `pages/Analyze.jsx:26-48` | Delete the fallback; surface a real error state (`setError` already exists at line 17 and is never read). |
| 4 | Random stats endpoint | `routes/stats.py:9-12` | Aggregate queries against a persistence layer (which does not exist yet — see `DECISIONS-PENDING.md` D-4). |
| 5 | Hardcoded dashboard/home/3D data | `Home.jsx:6-11`, `Dashboard.jsx:9-28,51-54`, `CausalChainPanel.jsx:4-10,99`, `NetworkGraph3D.jsx:7-67`, `Globe3D.jsx:8-43`, `EchoChamber.jsx:6-51`, `GlobePage.jsx:5-10`, `NetworkPage.jsx:8-14`, `EchoChamberPage.jsx:5-12` | New endpoints (`/api/network`, `/api/geo`, `/api/echo`, real `/api/stats`) plus fetch hooks. None of these endpoints exist. |
| 6 | Fabricated timestamps | `causal_chain.py:33` (`T+{i*15}m`) | Real message timestamps carried through from the data source. |
| 7 | Fabricated causal metric | `causal_chain.py:17` | A defensible causal / temporal method — see §E and `DECISIONS-PENDING.md` D-1. |

**The seam that matters most:** `predict()` in the two model modules. Both the
analyze path and the live-feed path funnel through it. Everything else is either a
frontend literal or a missing endpoint.

---

## D. RUN INSTRUCTIONS (reconstructed — no README existed)

### D.1 Environment actually present on this machine

```
OS       Ubuntu 24.04.3 LTS (Noble Numbat) under WSL2
Kernel   6.6.87.2-microsoft-standard-WSL2  (x86_64)
Host     Windows — repo lives at /mnt/c/Users/USER/social-sentinel (Windows drive, DrvFs)
node     v22.23.1
npm      10.9.8
python3  3.12.3      ⚠  repo pins python-3.11.9 in runtime.txt / Dockerfile
python   NOT ON PATH ⚠  `python` is unavailable; only `python3` resolves
pip3     24.0 (system pip, Debian-patched, PEP 668 externally-managed)
docker   NOT AVAILABLE ⚠  Docker Desktop WSL integration is disabled for this distro
git user Sadhuram
```

### D.2 Backend — local run

```bash
cd /mnt/c/Users/USER/social-sentinel/backend

# Ubuntu 24.04 ships PEP 668 "externally-managed-environment"; a venv is REQUIRED.
# python3-venv is a separate apt package on Ubuntu and may not be installed:
sudo apt install -y python3-venv          # one-time, if `python3 -m venv` errors

python3 -m venv venv
source venv/bin/activate                  # WSL/Linux/macOS. On Windows CMD: venv\Scripts\activate

pip install -r requirements.txt           # ⚠ pulls torch 2.3.1 → ~2.5 GB, several minutes

PORT=5000 python3 run.py                  # PORT=5000 matters — see D.4
```

Expected: `run.py:8` calls `socketio.run(app, host="0.0.0.0", port=port)`.
Serving on `http://0.0.0.0:5000`, socket.io mounted at `/socket.io/`.

### D.3 Frontend — local run

```bash
cd /mnt/c/Users/USER/social-sentinel/frontend
npm install
npm run dev            # vite dev server, default http://localhost:5173
```
Other scripts (`package.json:6-11`): `npm run build`, `npm run preview`, `npm run lint`.

### D.4 ⚠️ Blockers for a clean local run

| # | Blocker | Evidence | Workaround today |
|---|---|---|---|
| **1** | **Port mismatch.** Backend defaults to **7860**; frontend defaults to **5000**. The socket never connects out of the box. | `run.py:7` (`PORT`, default `7860`) vs `utils/api.js:2` (`http://localhost:5000`). The UI even instructs "Make sure Flask is running on port 5000" at `LiveFeed.jsx:215`. | Launch with `PORT=5000 python3 run.py`. |
| **2** | **`python` is not on PATH.** Any doc or habit that says `python run.py` fails in this WSL image. | verified: `python: command not found` | Use `python3`, or `source venv/bin/activate` first (the venv provides a `python` shim). |
| **3** | **PEP 668.** Bare `pip3 install -r requirements.txt` on Ubuntu 24.04 is refused outright. | `pip 24.0 ... /usr/lib/python3/dist-packages` | Always use a venv. Never `--break-system-packages`. |
| **4** | **Python version drift.** Local is 3.12.3; `runtime.txt` pins 3.11.9; `Dockerfile` uses `python:3.11-slim`. Three different targets. | `runtime.txt:1`, `Dockerfile:1` | Works today (all pins have cp312 wheels), but it is unpinned drift. |
| **5** | **No `.env`, no `.env.example`.** `python-dotenv` is installed but never called; `config.py` is empty. Nothing documents `PORT` or `VITE_BACKEND_URL`. | `grep environ` → only `run.py:7` | Set env vars inline on the command line. |
| **6** | **`ml/artifacts/` does not exist and cannot be produced.** Both training scripts are 0-byte files. There is no path to generating the `.pkl` files the models try to load. | `ml/train_bullying.py` (0 B), `ml/train_depression.py` (0 B) | Backend runs, but *always* in `keyword_fallback` mode. |
| **7** | **Docker unavailable in this WSL distro.** `docker build` cannot be used to reproduce the Render image locally. | `docker --version` → "could not be found in this WSL 2 distro" | Enable WSL integration in Docker Desktop settings, or test on Render directly. |
| **8** | **No Vite dev proxy.** `vite.config.js:5-7` has only the react plugin. Cross-origin calls rely entirely on the backend's `CORS(origins="*")`. | `vite.config.js` | Works, but no same-origin dev option exists. |
| **9** | **Analyze page cannot reach the backend regardless.** The URL bug at `Analyze.jsx:24` means even a perfectly-running backend produces mock output. | see §B.1 ① | None — requires a code fix (out of scope for this pass). |
| **10** | **`/mnt/c` DrvFs performance.** `npm install` and Vite HMR over the Windows drive are markedly slower than on native ext4, and file-watching can miss events. | repo path `/mnt/c/...` | Optional Phase 2 improvement: relocate to `~/` inside WSL. |

### D.5 WSL-specific differences from native Linux / macOS

| Concern | This WSL setup | Native Linux | macOS |
|---|---|---|---|
| Repo location | `/mnt/c/...` (Windows DrvFs) — slow I/O, unreliable inotify | native fs | native fs |
| Python interpreter | `python3` only; no `python` alias | usually both | `python3` (Homebrew) |
| Externally-managed pip | ✅ enforced (Ubuntu 24.04 / PEP 668) | distro-dependent | Homebrew also enforces it |
| `python3-venv` | separate apt package, may need install | often bundled | bundled |
| Docker | ✗ absent — needs Docker Desktop WSL integration toggled on | native daemon | Docker Desktop |
| Vite HMR | may need `server.watch.usePolling: true` when editing from Windows tools | not needed | not needed |
| `localhost` from Windows browser | ✅ WSL2 forwards `localhost` automatically | n/a | n/a |
| Line endings | files may carry CRLF from Windows editors — this is the sole cause of the 42 "modified" files in `git status` | LF | LF |

---

## E. WHAT THE CODE ACTUALLY DOES vs. WHAT IT CLAIMS

The root `README.md` is **empty (0 bytes)** — in the working tree *and* in
`HEAD` (`git cat-file -p HEAD:README.md` returns nothing; the initial commit
`27b5b82` lists it at 0 lines). `frontend/README.md` is the **unmodified Vite
starter template**. So the project's marketing claims live in the UI copy, not in
any README. The three claims cited for this audit map to:

| Claim | Where it is asserted in the product | What the code does | Verdict |
|---|---|---|---|
| "real-time cyberbullying detection" | `pages/Home.jsx:127-129`, `Dashboard.jsx:64` ("Real-time Intelligence"), `Navbar.jsx:87` ("LIVE") | A daemon thread picks from 25 hardcoded strings and scores them with a 12-word substring match | ❌ |
| "traces their causal impact on victim mental health" | `pages/Home.jsx:110-116` ("Bullying Triggers Depression. We Prove It, Visually."), `pages/Analyze.jsx:60` | `causal_link = 0.55·bullying + 0.45·depression` — a fixed weighted average of two scores derived from the *same* text. No temporal ordering, no counterfactual, no intervention, no statistical test. It cannot express causation in principle. | ❌ |
| "with 3D visualizations" | `pages/Home.jsx:128`, `/network`, `/globe` routes | Genuinely 3D (`react-force-graph-3d` + three.js; `react-globe.gl`). Renders, orbits, is interactive. | ✅ **real** — but rendering 100% hardcoded data |

Full gap list with severity is in `docs/AUDIT.md` → **§ RECONCILIATION**.

---

## F. GIT / REPO FACTS

- Branch `main`, 5 commits, latest `d992288` "Python version updated".
- All application code landed in a single commit `27b5b82` "Initial commit" (8688 lines).
  The 4 commits since touch only deploy config: `requirements.txt`, `Dockerfile`,
  `.dockerignore`, `run.py`, `runtime.txt`.
- Commit `82b9fc7` is titled **"HF Spaces deployment"** and is what changed `run.py`'s
  default port to **7860** — the Hugging Face Spaces convention. This is direct
  evidence the backend was last aimed at HF Spaces, **not** Render. There is no
  Render-specific artifact anywhere in the repo.
- `.gitignore:20-21` excludes `backend/ml/artifacts/` and `backend/ml/datasets/`,
  so trained models and data can never reach a git-based deploy.
- Working tree shows ~42 modified files; diffs are whitespace/line-ending only
  (Windows editors on a DrvFs mount). No content change is pending.
- **No tests exist** anywhere in the repo. No `pytest`, no vitest, no CI config.

---

## G. QUICK REFERENCE

```
Backend base URL (local)     http://localhost:5000     ← must set PORT=5000 explicitly
Backend base URL (deployed)  ❌ none — Render deploy is broken
Frontend dev                 http://localhost:5173
Frontend prod                Vercel (working)
Frontend→backend env var     VITE_BACKEND_URL          (read at utils/api.js:2)
Socket.io path               <BASE_URL>/socket.io/
Only working integration     socket.io 'new_tweet'
Only broken integration      POST /api/analyze (URL bug)
Model artifacts              ❌ absent, ungenerable, gitignored
Database                     ❌ none
Tests                        ❌ none
```
