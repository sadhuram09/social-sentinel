# DECISIONS PENDING — before Phase 2 coding

**Created:** 2026-08-06 · **Last updated:** 2026-08-06
**Status:** 3 of 11 resolved (D-1, D-4, D-11) · 8 open · **verification TODOs: 2 of 2
resolved ✅** — both confirmed the decision resting on them; database provider is
**Neon**
**🟢 Backend is LIVE** on Render at <https://social-sentinel-api.onrender.com>
**Rule:** every item marked **🔒 NEEDS SIGN-OFF** is your call. I have given a
recommendation for each, but I will not act on it unilaterally. Items marked
**🟢 SAFE DEFAULT** I will proceed with unless you say otherwise — they are
reversible, low-consequence, and stated here only so nothing is silent.

Each entry names what it **blocks**, so the sequence is visible.

| # | Question | Blocks | Sign-off? |
|---|---|---|---|
| ~~**D-1**~~ | ~~What real data source replaces mock detection?~~ | — | ✅ **RESOLVED** → [ADR-0001](adr/0001-lightweight-classical-model.md) + [ADR-0002](adr/0002-escalation-detection-architecture.md) |
| **D-2** | Does the backend need restructuring to deploy on Render? | Step 2 | 🔒 |
| **D-3** | How does the frontend receive the deployed backend URL? | Step 2 | 🔒 |
| ~~**D-4**~~ | ~~Is a database needed, and which?~~ | — | ✅ **RESOLVED** → [ADR-0002](adr/0002-escalation-detection-architecture.md) — **flipped to REQUIRED** |
| **D-5** | Which model artifact delivery mechanism? | Step 3 | 🔒 |
| **D-6** | What method makes the "causal" claim defensible? | Step 4 | 🔒 |
| **D-7** | What is the privacy / ethics posture on real user data? | Steps 3 & 4 | 🔒 |
| **D-8** | Which fabricated features get built vs. relabelled vs. removed? | Step 4 | 🔒 |
| **D-9** | Test strategy and CI | Step 1 | 🟢 |
| **D-10** | Local dev port + repo location | Step 1 | 🟢 |
| ~~**D-11**~~ | ~~Does Hugging Face Spaces remain a deploy target?~~ | — | ✅ **RESOLVED** — **Render-only**, HF Spaces dropped, backend live |

---

## ~~D-1~~ — What real data source replaces mock detection? ✅ RESOLVED 2026-08-06

> **Resolved by two ADRs, because the answer turned out to be two corpora:**
> - **[ADR-0001](adr/0001-lightweight-classical-model.md)** — **Stage-1**
>   single-message scorer: Kaggle Cyberbullying Classification corpus, TF-IDF +
>   Logistic Regression. (Option A below, as recommended.)
> - **[ADR-0002](adr/0002-escalation-detection-architecture.md)** — **Stage-2**
>   conversation-level escalation: ConvoKit **CGA-WIKI**, chosen for its
>   dual-granularity labels and turning-point construction.
>
> **Option B (live social APIs) was rejected** — but on *policy*, not cost or
> difficulty. See `memory-bank/03-corpus-investigation.md` §1.3 and **TODO-1**
> below: my earlier "Reddit via PRAW is the tractable live option" advice was
> wrong and is corrected there.
>
> The original analysis is retained below for the reasoning trail. **Do not act
> on it — act on the ADRs.**

**Blocks:** step 3 (replace mock data) and step 4 (everything downstream). This is
the keystone decision — six other items depend on it.

**Current state:** there is no data source. `stream_generator.py:6-46` holds 25
hardcoded strings and 15 fake handles; `bullying_model.py:16-17` and
`depression_model.py:15-17` hold 12 and 14 keywords; `ml/train_*.py` are 0-byte
files; `ml/artifacts/` does not exist and is gitignored. See AUDIT **C-3** and
`memory-bank/01-mock-data-inventory.md` M-01, M-02, M-07.

Note the code carries a fingerprint of the original intent: `bullying_model.py:39`
looks for a class literally named `'not_cyberbullying'`, which is the label used by
the Kaggle **Cyberbullying Classification** dataset (~47k tweets, 6 classes). That
was almost certainly the planned corpus.

### Option A — Labelled dataset, trained offline, replayed as a "live" stream ⭐

Train real classifiers on a public labelled corpus. Ship the artifacts. Drive the
live feed by replaying held-out rows on a timer instead of cycling 25 literals.

| | |
|---|---|
| ✅ | Real, measurable model with a real accuracy/F1 number to defend |
| ✅ | No API keys, no cost, no rate limits, no platform ToS exposure |
| ✅ | Reproducible — an examiner can rerun the training script |
| ✅ | Ethically clean: public research datasets, already de-identified |
| ✅ | Smallest change to existing architecture — `predict()` bodies keep their signature; the live feed swaps a list for a dataset iterator |
| ⚠️ | The feed is *replayed*, not live. Must be labelled as such in the UI. |
| ⚠️ | Public cyberbullying corpora carry known label noise and topical skew |

**Effort:** low–medium. **Risk:** low.

### Option B — Live social feed (X/Twitter API, Reddit, Mastodon, Bluesky)

| | |
|---|---|
| ✅ | Genuinely real-time; the "LIVE" badge becomes true |
| 🔴 | **X/Twitter API is paid** — the free tier has no meaningful read access. Cost is a hard blocker for a student project. |
| 🔴 | Still needs a trained model — this replaces the *stream*, not the *detector*. It does **not** solve C-3 on its own. |
| 🔴 | Ethics and privacy: ingesting real posts and labelling identifiable people as "bullies"/"depressed" is a serious step (see **D-7**) |
| ⚠️ | Rate limits, key rotation, and outages become demo-day failure modes |
| 🟡 | Reddit (PRAW) and Mastodon/Bluesky are free and much more tractable if live ingestion is required |

**Effort:** high. **Risk:** high.

### Option C — Hosted / pretrained transformer, no local training

Call a hosted model (Hugging Face Inference API, Perspective API, or a Claude API
call) instead of training anything.

| | |
|---|---|
| ✅ | Strong accuracy immediately; no training pipeline, no artifacts, no `.pkl` delivery problem (kills **D-5** entirely) |
| ✅ | Removes `torch`/`transformers` from the deploy image → also helps **C-1** |
| ⚠️ | Network latency per request; needs caching and graceful degradation |
| ⚠️ | API key management, and a cost/quota ceiling |
| 🔴 | **Weakest academically.** For a final-year project, "we called an API" is a much thinner contribution than "we trained and evaluated a model." |
| ⚠️ | SHAP over a hosted model is awkward — the explainability feature (GAP-5) would need a different approach (e.g. attention or token-ablation) |

**Effort:** low. **Risk:** medium (external dependency on demo day).

### 🎯 Recommendation — **Option A**, with Option C as an optional second scorer

1. Train TF-IDF + gradient-boosted classifiers on the Kaggle cyberbullying corpus
   and a public depression/mental-health corpus. Keep the existing `predict()`
   signatures so nothing downstream changes shape.
2. Replay held-out rows through the live feed. **Label the feed honestly** — e.g. a
   "REPLAY · held-out test set" badge instead of the current unconditional "LIVE".
3. *Optionally, later:* add a hosted-transformer scorer as a second opinion and
   display both. That gives the project a genuine comparison — classical vs.
   transformer — which is a much stronger result to present than either alone.

**Rejecting B** primarily on cost and ethics, not difficulty. If you want live
ingestion for the demo, **Reddit via PRAW** is the realistic version: free, public,
no paid tier, and workable consent posture. Say the word and I will scope it.

**❓ I need from you:** (a) A, B, or C; (b) if A, confirm the corpora — I will
propose specific datasets with licences before anything is downloaded; (c) whether
the "second scorer" comparison is in scope for 7th sem or deferred.

---

## D-2 — Does the backend need restructuring to deploy cleanly on Render? 🔒 NEEDS SIGN-OFF

**Blocks:** step 2.

**Current state:** see AUDIT **C-1** in full. Summary: no `render.yaml`; the app is
in `backend/` while Render's Root Directory defaults to the repo root; the
`Procfile` and `runtime.txt` are **Heroku** conventions that Render does not read;
the Dockerfile hardcodes port 5000 instead of `$PORT`; there is no health endpoint;
and `requirements.txt` pulls ~2.5 GB of unused `torch`/`transformers` that almost
certainly exhausts the free tier's build resources.

**The answer is: not restructuring — reconfiguration.** The Flask app-factory +
blueprint layout is sound and idiomatic. Nothing about the code organisation needs
to move. What is wrong is the deploy metadata around it.

### Option A — Native Python runtime on Render ⭐

`render.yaml` with `env: python`, `rootDir: backend`, a slimmed `requirements.txt`,
an explicit `startCommand`, `healthCheckPath: /health`, and `PYTHON_VERSION` pinned.

| ✅ | Faster builds, Render's own pip caching, simplest mental model, no Docker needed |
| ⚠️ | Slightly less reproducible locally than a container |
| 🔴 | **Docker is currently unavailable in this WSL distro** (Docker Desktop integration is off), so a Docker-based path cannot even be tested locally today |

### Option B — Docker on Render

Keep the Dockerfile; fix `$PORT` binding; set `rootDir: backend`, `dockerfilePath`,
and a health check.

| ✅ | Identical image locally and in production; portable to HF Spaces / Fly / Cloud Run |
| ⚠️ | Slower builds; you own the base image and its patching |
| 🔴 | Cannot be tested locally until Docker Desktop WSL integration is enabled |

### Option C — Move off Render entirely

Fly.io, Railway, or (given commit `82b9fc7`) back to Hugging Face Spaces.

| ✅ | HF Spaces has already been targeted once — `run.py:7`'s port 7860 default is that legacy |
| ✅ | HF Spaces is ML-friendly and tolerates large images better than Render's free tier |
| ⚠️ | Sidesteps the stated Phase 2 goal rather than achieving it |
| ⚠️ | Vercel-frontend + HF-backend has its own CORS and cold-start characteristics |

### 🎯 Recommendation — **Option A**, and do the cheap fix first

Before any restructuring, **slim `requirements.txt`** (AUDIT H-1). There is a real
chance that single change fixes the deploy on its own, since `torch` is very likely
the proximate failure. Do that, redeploy, read the logs, *then* decide how much
configuration work is actually needed.

Then, regardless of outcome: add `render.yaml` (config in the repo, not a
dashboard), add `/health`, and split `requirements-train.txt` from
`requirements.txt`. Keep `-w 1` — `StreamGenerator` is a module-level singleton
(`stream_generator.py:116-122`) and multiple workers would duplicate the feed.
Keep the Dockerfile in the repo as a fallback and for HF Spaces (see **D-11**), but
fix its `$PORT` binding so it is not quietly wrong.

**❓ I need from you:** (a) native runtime or Docker; (b) confirmation I may delete
unused deps from `requirements.txt` — this is the one change most likely to fix the
build, and I will not touch that file without your say-so; (c) whether the Render
free tier is fixed, or whether a paid instance is acceptable (free-tier spin-down
after 15 min idle will make the live feed dead on arrival for demo visitors).

---

## D-3 — How does the frontend receive the deployed backend URL? 🔒 NEEDS SIGN-OFF

**Blocks:** step 2.

**Current state:** `frontend/src/utils/api.js:2` reads
`import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'`. That variable appears
**exactly once in the whole repo** — on that line. No `.env`, no `.env.example`, no
`env` block in `vercel.json`. If it is unset in the Vercel dashboard, the production
bundle ships with `http://localhost:5000` **baked in at build time** (Vite inlines
`import.meta.env.*` statically), and the browser blocks it as mixed content. See
AUDIT **C-4**.

### Option A — Vercel environment variable + committed `.env.example` ⭐

Set `VITE_BACKEND_URL` in the Vercel project; commit `frontend/.env.example`
documenting it; add a dev-mode console warning when it is unset.

| ✅ | Minimal change; conventional Vite pattern; works today |
| ⚠️ | Still a build-time constant — changing the backend URL requires a rebuild |
| ⚠️ | Cross-origin, so backend CORS must stay correct |

### Option B — Vercel rewrite proxy (same-origin `/api`)

Add to `vercel.json`: `{"source": "/api/(.*)", "destination": "https://<backend>/api/$1"}`
and drop `BASE_URL` to `''`.

| ✅ | Same-origin — CORS problems disappear entirely; no mixed content possible |
| ✅ | The backend URL lives in config, not in the JS bundle |
| 🔴 | **Socket.io does not proxy cleanly through Vercel rewrites.** Vercel's edge rewrites are not designed for long-lived WebSocket/long-poll connections. The live feed would need to keep a direct absolute URL anyway — so this becomes a hybrid, not a simplification. |

### Option C — Runtime config fetch

Ship a `/config.json` in `public/`, fetch it at boot.

| ✅ | Change the backend URL with no rebuild |
| ⚠️ | An extra round-trip before the app can connect; more moving parts than this project needs |

### 🎯 Recommendation — **Option A**, plus a runtime guard

1. Commit `frontend/.env.example` with `VITE_BACKEND_URL=http://localhost:5000`.
2. Set the production value in the Vercel dashboard.
3. Add a startup check in `utils/api.js`: if the app is on HTTPS and `BASE_URL`
   points at `localhost`, log a loud console error and surface a visible banner —
   so this failure is never silent again.
4. Keep it cross-origin, and tighten backend CORS to an explicit allowlist
   (AUDIT H-7) rather than `origins="*"`.

Option B is tempting for CORS hygiene but breaks the one integration that actually
works today. Not worth it.

**❓ I need from you:** (a) confirm Option A; (b) I need the **Vercel project URL**
to put in the backend's CORS allowlist; (c) confirm you can set the env var in the
Vercel dashboard, or whether you want it declared in `vercel.json` instead.

---

## ~~D-4~~ — Is a database needed, and which? ✅ RESOLVED 2026-08-06

> **Resolved by [ADR-0002](adr/0002-escalation-detection-architecture.md)
> Decision E — and the answer REVERSED.**
>
> **Decided: Postgres, required, and earlier in the sequence than step 4.**
> Managed Postgres (Neon or Supabase). The schema itself is **deferred** to a
> follow-on ADR (ADR-0002 Q1).
>
> **⚠️ My recommendation below was wrong under the new goal.** It said "no
> database for step 3, precomputed JSON aggregates." That was correct for
> single-tweet classification and is wrong for follow-up detection, which is
> inherently stateful — "attacked **again**" cannot be evaluated without memory.
> The reframe in ADR-0002 Decision A invalidated it.
>
> **Not Render's free Postgres** — it expires after 30 days and would fail weeks
> before viva. See **TODO-2** below.
>
> The original analysis is retained below for the reasoning trail. **Do not act
> on it — act on the ADR.**

**Blocks:** steps 3 and 4.

**Current state:** no database, no ORM, no driver, no `DATABASE_URL` anywhere. All
state is ephemeral: `/api/stats` re-rolls `random.randint` per request
(`stats.py:9-12`); live-feed counters live in React state and reset on reload
(`useWebSocket.js:12-17`); nothing survives a restart.

**What actually requires persistence** — worth being precise, because the honest
answer is "less than it looks":

| Feature | Needs a DB? | Why |
|---|---|---|
| `/api/analyze` (paste a thread, get scores) | ❌ **No** | Pure function of the input |
| Live feed | ❌ **No** | Ephemeral by nature |
| 3D network / globe / echo pages | ❌ **No** — precomputed JSON would do | These are aggregate views; a build-time artifact serves them fine |
| Real `/api/stats` counters | ✅ **Yes** | Needs a durable count |
| "+12% today" trend deltas (`Home.jsx:6-11`) | ✅ **Yes** | Needs history |
| 24-hour timeline chart (`Dashboard.jsx:9-19`) | ✅ **Yes** | Needs time-bucketed history |
| Per-victim causal chains over time (**D-6**) | ✅ **Yes** | Needs per-account trajectories — the core of any real causal claim |
| Analysis history / saved results | ✅ **Yes** | If in scope at all |

### Option A — No database; precomputed JSON artifacts ⭐ *for step 3*

Generate aggregate JSON at training time, ship it as a static asset, serve it from
new read-only endpoints.

| ✅ | Zero infrastructure, zero cost, zero ops, no free-tier DB expiry |
| ✅ | Kills the four fabricated-statistics sites (GAP-4) with real numbers from the real corpus |
| ✅ | Deploys anywhere; nothing to back up |
| 🔴 | No live counters, no trends, no per-victim trajectories — so **D-6** stays blocked |

### Option B — SQLite (file-backed)

| ✅ | Stdlib, no service, no cost, trivial locally |
| 🔴 | **Render's filesystem is ephemeral** — the file is wiped on every deploy and restart. A persistent disk is a paid add-on. Effectively unusable on Render free. |

### Option C — Postgres (Render's managed Postgres, Supabase, or Neon) ⭐ *for step 4*

| ✅ | Real persistence, real aggregates, real trends; enables **D-6** properly |
| ✅ | Free tiers exist (Neon and Supabase are generous; Render's free Postgres **expires after 30 days** — a real trap for a project that must survive until viva) |
| ⚠️ | Adds SQLAlchemy/psycopg, migrations (Alembic), a connection string, and a second thing that can break on demo day |
| ⚠️ | Genuine scope increase for 7th sem |

### Option D — MongoDB Atlas

| ✅ | Free tier, schema-flexible, natural fit for JSON-shaped tweet documents |
| ⚠️ | Weaker for the time-bucketed aggregate queries the dashboard actually needs |

### 🎯 Recommendation — **staged: A now, C if step 4 reaches it**

- **Step 3: no database.** Precompute aggregates during model training and serve
  them from static JSON. This makes GAP-4 honest, requires no new infrastructure,
  and does not risk the deploy you just fixed in step 2.
- **Step 4: Postgres, only if per-victim trajectories are in scope.** A real causal
  method (**D-6**) needs per-account history, and that is the point where a
  database earns its complexity. If **D-6** lands on "temporal precedence within a
  single submitted thread," even that is unnecessary.
- **If you do go Postgres, use Neon or Supabase, not Render's free Postgres** — the
  30-day expiry would silently kill your demo weeks before viva.

**❓ I need from you:** (a) confirm the staged approach; (b) does your project rubric
require a database as a deliverable? If it does, that overrides the engineering
argument and we go to Postgres in step 3 — tell me and I will plan for it directly.

---

## D-5 — How do trained model artifacts reach production? 🔒 NEEDS SIGN-OFF

**Blocks:** step 3. **Dependent on D-1** (moot if D-1 = Option C, hosted model).

**Current state:** `.gitignore:20` excludes `backend/ml/artifacts/`, so `.pkl` files
can never reach a git-based deploy. This is the structural reason C-3 exists.

| Option | Verdict |
|---|---|
| **A · Un-gitignore and commit the `.pkl` files** | Simplest, works immediately. But pickles are ~1–50 MB, bloat history permanently, and `pickle.load` on untrusted data is an arbitrary-code-execution vector (acceptable here since we produce them, but worth knowing). |
| **B · Git LFS** ⭐ | Keeps the repo lean, versions artifacts properly. Needs LFS enabled on the host and — **verify this** — LFS support on Render's build environment. |
| **C · Fetch at build/start time** from a GitHub Release or object storage | Clean separation of code and weights; standard practice. Adds a network dependency to startup and a failure mode to the deploy. |
| **D · Hugging Face Hub** ⭐ | Purpose-built for this; free; public; `huggingface_hub.hf_hub_download` is one call; gives the project a citable public artifact, which is a genuine plus for a final-year submission. |

### 🎯 Recommendation — **D (Hugging Face Hub)**, with **A** as the pragmatic fallback

Push the trained artifacts to a public HF model repo and download them at container
build time (not at request time — a cold start should not depend on HF being up).
Cache them in the image. It is free, purpose-built, and produces a shareable public
artifact you can cite.

**Fallback:** if the artifacts come in under ~10 MB combined, just commit them
(Option A). Do not over-engineer a 10 MB problem.

**Also required regardless of choice:** expose `models_ready` on `/health` and log a
loud warning at startup when the fallback path is active, so "silently running on
keyword matching" can never happen again.

**❓ I need from you:** HF Hub vs. commit-directly. I will report the actual artifact
sizes once D-1 is settled and training has run — that number should probably decide it.

---

## D-6 — What method makes the "causal" claim defensible? 🔒 NEEDS SIGN-OFF

**Blocks:** step 4. **Depends on D-1 and D-4.**

**Current state:** `causal_chain.py:17` — `0.55·bullying + 0.45·depression`, computed
from the same text, with invented timestamps (`causal_chain.py:33`) and unjustified
constants. See AUDIT **GAP-2**. The project's headline is *"Bullying Triggers
Depression. We Prove It, Visually."* — this is the claim that headline rests on.

| Option | Method | Effort | Honesty |
|---|---|---|---|
| **A** | **Rename it.** Call it a "co-occurrence score" or "risk index". Change the UI copy. Keep the maths. | Trivial | ✅ Fully honest |
| **B** ⭐ | **Temporal precedence.** Require a bullying event to *precede* a depression signal from a *specific* account, using real timestamps. Report lag distribution. | Low–medium | ✅ A real, defensible finding |
| **C** | **Interrupted time-series.** Track a victim's depression-score trajectory before vs. after a bullying event; test for a change point. | Medium–high | ✅ Genuinely strong |
| **D** | **Difference-in-differences / matched controls.** Compare targeted accounts against matched non-targeted ones. | High | ✅ Strongest, and a real research contribution |

### 🎯 Recommendation — **B**, with the **A** rename landing immediately

**Do A now, regardless of what else happens.** Changing `"causal_link"` to
`"risk_index"` and softening `Home.jsx:110-116` and `Analyze.jsx:146` ("confirmed
depressive response") costs nothing and removes the project's single biggest
integrity liability. An examiner who spots the current gap will find it damaging;
one who sees honest labelling plus a stated roadmap to **C** will find it credible.

Then implement **B** in step 4: real timestamps, real per-account grouping, real
temporal ordering, and a reported lag distribution. That is a genuine finding you
can defend in a viva, and it is achievable in one semester.

**C** is the stretch goal, and it is what would make the project genuinely
distinctive. It is only reachable if D-1 gives you per-account longitudinal data and
D-4 gives you somewhere to store it.

**❓ I need from you:** (a) approve the immediate rename — this touches UI copy on a
live deployed site, so it is explicitly your call; (b) target B or C for 7th sem.

---

## D-7 — Privacy and ethics posture on real user data 🔒 NEEDS SIGN-OFF

**Blocks:** steps 3 and 4. **Becomes urgent the moment D-1 involves real people.**

If D-1 = Option A (public research dataset), most of this is already handled —
those corpora are de-identified and licensed for research. If D-1 = Option B (live
feeds), every question below becomes live and unavoidable.

**Open questions:**
1. **Display of identities.** The current UI shows `@handles` prominently
   (`LiveFeed.jsx:52`, `Dashboard.jsx:162,177`, `NetworkGraph3D.jsx:180`). With real
   data, that means publicly labelling identifiable people as "bullies" and
   "depressed victims" on a public website. **Recommendation: hash or pseudonymise
   all handles before they ever leave the backend.** This is not optional if real
   data is used.
2. **Mental-health disclaimer.** The app outputs depression risk scores with a red
   "🚨 HIGH RISK" treatment. **Recommendation: a persistent, non-dismissible
   disclaimer — "research prototype, not a diagnostic tool" — plus crisis-line
   signposting on any high-risk result.** I would add this even with mock data,
   given the site is publicly deployed today.
3. **Retention.** If D-4 lands on a database, how long is scored content kept? A
   defensible default is: store scores and hashed IDs, never raw text.
4. **Institutional review.** Does your department require ethics approval for a
   project that processes real social-media posts about mental health? Worth asking
   your supervisor **before** step 3 rather than after.
5. **Platform terms.** Scraping or redistributing platform content typically
   violates ToS. Datasets published for research generally do not.

### 🎯 Recommendation

Take D-1 Option A (public research datasets), which resolves 1, 3, 4, and 5 almost
entirely. Add the disclaimer and pseudonymisation **regardless** — they cost little
and they are the difference between a prototype an examiner respects and one they
question.

**❓ I need from you:** (a) confirm the disclaimer goes in (I recommend yes, in step
1 — it is a small, safe, high-value change); (b) check with your supervisor whether
ethics approval applies; (c) confirm pseudonymisation as a hard rule if real data is
ever ingested.

---

## D-8 — Which fabricated features get built, relabelled, or removed? 🔒 NEEDS SIGN-OFF

**Blocks:** step 4.

Some Phase 1 features are *not reachable* in Phase 2 — not because they are hard,
but because the data they need does not exist and cannot be obtained. Deciding this
early prevents step 4 from becoming an open-ended sink.

| Feature | Location | What it needs | Realistic? | My call |
|---|---|---|---|---|
| Analyze page | `Analyze.jsx` | just the C-2 fix + real models | ✅ Yes | **BUILD** — highest value |
| Live feed | `LiveFeed.jsx` | real models + a dataset replay | ✅ Yes | **BUILD** |
| Dashboard stats | `Dashboard.jsx:9-28`, `Home.jsx:6-11` | precomputed aggregates (D-4 Option A) | ✅ Yes | **BUILD** |
| Causal chain timeline | `CausalChainPanel.jsx` | D-6 Option B + real timestamps | ✅ Yes | **BUILD** |
| SHAP explainability | 3 sites, see GAP-5 | a fitted explainer alongside the model | ✅ Yes | **BUILD** — it is genuinely differentiating |
| 3D network graph | `NetworkGraph3D.jsx` | a real reply/mention graph | 🟡 Partly — the graph is feasible from thread data; the `depression_ripple` edges are not | **BUILD nodes/bullying edges · REMOVE ripple edges** |
| Globe hotspots + arcs | `Globe3D.jsx` | per-message geolocation | 🔴 No — platforms have removed precise geotags; no geo data exists in any candidate corpus | **RELABEL as illustrative, or remove** |
| Echo chamber cascade | `EchoChamber.jsx` | reshare graph + impression/view data + longitudinal bystander scoring | 🔴 No — view data is not publicly available from any source | **RELABEL as an explicit simulation** |

### 🎯 Recommendation

**Build** the six feasible features on real data. For the globe and echo chamber,
**relabel rather than delete** — they are the best visual work in the project and
they demonstrate real skill. Add a clear "SIMULATED — illustrative model of
propagation dynamics" badge and say so in the viva. A well-built simulation that is
*labelled* as a simulation is a legitimate contribution; the same artifact presented
as measurement is the thing that damages the project.

Delete only the `depression_ripple` edges (`NetworkGraph3D.jsx:52-63`) and the
`'Causal Chain'` arc labelling (`Globe3D.jsx:201-208`), because those two make
specific empirical claims that a badge cannot soften.

**❓ I need from you:** approve build / relabel / remove per row. In particular:
would you rather **relabel** the globe and echo chamber, or **remove** them? They
are strong demo material, which is exactly why the framing matters.

---

## D-9 — Test strategy and CI 🟢 SAFE DEFAULT (tell me if you disagree)

**Blocks:** step 1 — and, in practice, the trustworthiness of steps 2–4.

**Current state:** zero tests, no CI (AUDIT H-8).

**Plan I will proceed with unless told otherwise:**
1. **Characterisation tests first**, before any behaviour changes — pin the current
   `/api/analyze` response shape, the keyword scoring boundaries, and the
   `new_tweet` payload shape. These are the safety net for step 3's rewrite.
2. `pytest` for the backend; a boot-and-hit-`/health` smoke test.
3. `vitest` for the frontend, limited to `utils/api.js` and the `useWebSocket`
   reducer logic — **not** the three.js/d3 components, which are not economically
   testable.
4. A GitHub Actions workflow running lint + tests on push.

**❓ Only flag if:** your rubric requires a specific framework or a coverage
threshold.

---

## D-10 — Local dev port and repo location 🟢 SAFE DEFAULT

**Blocks:** step 1.

**Current state:** backend defaults to **7860** (`run.py:7`, HF Spaces legacy);
frontend expects **5000** (`utils/api.js:2`); the UI tells users "port 5000"
(`LiveFeed.jsx:215`). Nothing connects on a fresh clone (AUDIT M-1). The repo also
sits on `/mnt/c` (Windows DrvFs under WSL), which makes `npm install` and Vite HMR
noticeably slower and can drop file-watch events (AUDIT L-6).

**Plan I will proceed with unless told otherwise:** standardise local dev on **5000**
(frontend already assumes it, and the UI already documents it), keep `PORT` env
overridable for HF Spaces compatibility, and document both in the README.

**On the repo location:** I will **not** move it. Relocating into the WSL filesystem
(`~/social-sentinel`) would speed things up meaningfully, but it changes where your
project lives and how you reach it from Windows tools — that is your call, not mine.
Say the word if you want it.

---

## ~~D-11~~ — Does Hugging Face Spaces remain a deploy target? ✅ RESOLVED 2026-08-07

> **Decided: Option A — RENDER ONLY. Hugging Face Spaces is dropped.**
> *(Recorded as a doc note, not an ADR — this is a deployment-target choice, not
> an architecture decision.)*
>
> ### 🟢 The backend is LIVE
>
> **<https://social-sentinel-api.onrender.com>** — Render, **native Python** build,
> free tier.
>
> Verified 2026-08-07:
> - `GET /` → `200` · `{"health":"/health","service":"social-sentinel-api","status":"ok"}`
> - `GET /health` → `200` · `{"status":"ok","models_ready":false,"detector":"keyword-fallback","models":{"bullying":false,"depression":false}}`
>
> ### Service configuration
>
> | | |
> |---|---|
> | Start command | `gunicorn -w 1 --threads 4 -b 0.0.0.0:$PORT run:app` |
> | Root Directory | `backend` |
> | Python | **3.11** on deploy (via `backend/.python-version`); local is 3.12.3 |
> | Free-tier behaviour | sleeps after ~15 min idle, ~1 min cold start |
>
> Keep `-w 1`: `StreamGenerator` is a module-level singleton
> (`stream_generator.py:116-122`), so extra workers would each spawn one and
> duplicate the feed.
>
> ### What was removed
>
> - `backend/Procfile` — Heroku convention, not read by Render
> - `backend/runtime.txt` — Heroku convention; Render uses `PYTHON_VERSION` or
>   `.python-version`
> - `run.py`'s `7860` port default (the HF Spaces value) → now `5000` local,
>   `$PORT` in deploy
>
> Added: `backend/.python-version` (`3.11`), which also resolves `AUDIT.md` **M-2**
> (the 3.11/3.12 version drift) by standardising on 3.11.
>
> ### ⚠️ Supersedes a line in D-2
>
> **D-2's recommendation (still open) says to keep the Dockerfile "as a fallback
> and for HF Spaces." That reason is now void.** The Dockerfile is retained
> *solely* for the still-open native-vs-Docker choice in D-2 — not as an HF
> fallback. It was updated to bind `$PORT` correctly regardless.
>
> **Consequence accepted:** there is no second live backend. Render's free tier
> sleeps, so a demo after idle takes ~1 min to wake. Warm it before a viva.
>
> The original analysis is retained below for the reasoning trail. **Do not act
> on it — Option C was recommended and Option A was chosen.**

**Blocks:** step 2 (it changes what "done" means).

**Current state:** commit `82b9fc7` is titled "HF Spaces deployment" and set
`run.py`'s default port to `7860` — the HF convention. The Dockerfile (commit
`1d68c48`) fits HF Spaces well. **There is no Render-specific artifact anywhere in
the repo.** The evidence says the backend was last aimed at HF Spaces, and the Render
attempt reused that config without adapting it.

This matters because HF Spaces is arguably the *better* host for this project: it
tolerates large ML images, is free, is ML-native, and — if D-5 lands on HF Hub — the
model and the app would live in one place.

| Option | |
|---|---|
| **A · Render only** | Drop `runtime.txt` and the 7860 default; commit to one target and make it clean |
| **B · HF Spaces only** | Arguably the better technical fit; abandons the stated Phase 2 goal of fixing Render |
| **C · Both** ⭐ | Keep the Dockerfile portable, `$PORT`-driven with a 7860 fallback; add `render.yaml` for Render. Costs little and gives you a demo-day fallback host. |

### 🎯 Recommendation — **C**

Fix Render as the primary target (that is the Phase 2 goal), but keep the Dockerfile
genuinely portable so HF Spaces remains a working fallback. Having a second live
backend the week of your viva is cheap insurance, particularly given Render's
free-tier spin-down.

**❓ I need from you:** confirm Render is the primary target, and whether keeping HF
Spaces alive is worth the small ongoing cost of portability.

---

## Fastest path to unblocking

If you want to answer the minimum needed for me to start work:

| Priority | Decision | Unblocks |
|---|---|---|
| 1️⃣ | **D-2** — may I slim `requirements.txt`? | The single most likely fix for the broken deploy |
| 2️⃣ | **D-3** — the Vercel project URL | Frontend↔backend wiring |
| ~~3️⃣~~ | ~~**D-1** — data source~~ | ✅ resolved by ADR-0001 + ADR-0002 |
| 3️⃣ | **D-6** — approve the immediate "causal" → "risk index" rename | Removes the biggest integrity liability, costs nothing |
| 4️⃣ | **D-5** — artifact delivery (ADR-0001 Q1) | Now on the critical path, since D-1 is settled |

Everything else can wait until step 1 is done and we know more.

---

# 📋 TRACKED TODOs — verification items

**Both closed 2026-08-06.** Both were checks on *my* claims, and **both confirmed
the decision that rested on them.** No ADR reopens.

---

## ✅ TODO-1 — Reddit's research policy — RESOLVED 2026-08-06

**Verified by you** against Reddit's own help pages: *Responsible Builder Policy*,
*Developer Platform & Accessing Reddit Data*, and *Reddit for Researchers Program*.

**Confirmed findings:**

- **Reddit for Researchers (RFR) is the only authorized avenue** for academic
  research using Reddit data.
- **Using the API for research outside RFR violates policy.**
- **Training ML/AI models on Reddit data requires express written approval.**
- **RFR requires an institutional email address and per-person applications.**
- **RFR requires permanent deletion of all data at project end.**

**Outcome: [ADR-0002](adr/0002-escalation-detection-architecture.md) Decision C is
CONFIRMED on verified grounds** — reject Reddit/PRAW, use CGA-WIKI.

**Why this is now a stronger rejection than when drafted.** The original basis was
one clause about ML training. Verification surfaced a **second, independent
disqualifier**: RFR's mandatory deletion of all data at project end is
structurally incompatible with the persistent Postgres store that **Decision E**
requires. Escalation detection needs memory that outlives the project; RFR
forbids exactly that. The two conditions cannot both be satisfied — so this is
not a cost or convenience judgement, it is an architectural contradiction.

**Also settled:** the institutional-email and per-person application requirements
confirm RFR is not a realistic path on a single-semester undergraduate timeline.

**Knock-on — CGA-CMV-Large.** This was contingent on the same question
(**ADR-0002 Q4**). The verified policy concerns *access to and collection of*
Reddit data via Reddit's own surfaces. Whether it reaches a **third-party
research corpus already published by Cornell** is a distinct question this
verification does **not** answer. **Q4 remains open**, and CGA-CMV-Large stays
optional and unused pending it. CGA-WIKI is unaffected — it is Wikipedia, not
Reddit.

**Closes ADR-0002 Q6.** *(The ADR body is unchanged; this is the resolution
record.)*

---

## ✅ TODO-2 — Render free Postgres — RESOLVED 2026-08-06 · **Provider: NEON**

**Verified by you** against Render's documentation.

**Confirmed findings — Render free Postgres:**

- **Expires 30 days after creation.**
- Then a **14-day grace period**.
- Then **permanent deletion of the database and all data**.
- **No backups.**
- **No connection pooling.**

**Outcome: [ADR-0002](adr/0002-escalation-detection-architecture.md) Decision E is
CONFIRMED.** Render's free Postgres is unusable for this project — it would delete
itself, unrecoverably and without backups, roughly six weeks after creation.

### Provider decision: **Neon** 🎯

**Verified:** free tier with **no time-based expiry** — it does not self-delete
the way Render's does. Computes **scale to zero after ~5 minutes idle** and
**wake in ~1 second**, with **data preserved across sleep**.

**Chosen over Supabase**, whose free tier **pauses projects after 1 week idle**
and requires **manual unpause** — a demo-day failure mode: arrive at the viva,
find the database paused, and need a dashboard login to revive it. Neon's
scale-to-zero is automatic and sub-second, so idleness is invisible to a visitor.

### ⚠️ Standing note — keep your own backups regardless of provider

**Maintain a self-managed periodic `pg_dump`.** Free-tier retention guarantees are
never absolute — they are terms a vendor can change, and Render's own policy is
proof of how sharp the edge can be. A scheduled dump to a location you control is
the only retention guarantee that is actually yours.

This applies to Neon exactly as it would have to Render. **Treat it as a
requirement of the schema ADR (ADR-0002 Q1), not an optional nicety.**

---

**Both TODOs closed. Neither reopened an ADR; both strengthened one.**
A one-line pointer to the Neon decision has been added to ADR-0002 Decision E;
that ADR's body is otherwise unchanged.
