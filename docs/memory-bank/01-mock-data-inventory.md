# 01 — Mock Data Inventory

> Every place in the codebase where mock, hardcoded, randomised, or stubbed data
> stands in for real detection. Verified line-by-line against the working tree at
> commit `d992288` on 2026-08-06.
>
> **Headline:** the application contains **zero real data end to end**. Not one byte
> of what the UI displays originates from a trained model, an external API, a
> dataset, or a database.

---

## Summary table

| # | Location | Kind | What it fakes |
|---|---|---|---|
| **M-01** | `backend/app/models/bullying_model.py:11-14, 16-17, 28-31` | keyword substring match | the entire cyberbullying classifier |
| **M-02** | `backend/app/models/depression_model.py:10-13, 15-17, 27-30` | keyword substring match | the entire depression classifier |
| **M-03** | `backend/app/models/depression_model.py:36-50` | permanently-empty dict | SHAP explainability |
| **M-04** | `backend/app/services/causal_chain.py:17` | fixed weighted average | causal inference |
| **M-05** | `backend/app/services/causal_chain.py:33` | `T+{i*15}m` | message timestamps |
| **M-06** | `backend/app/services/causal_chain.py:50` | hardcoded string | the model-provenance label |
| **M-07** | `backend/app/services/stream_generator.py:6-38` | 25 literal strings | the live social-media feed |
| **M-08** | `backend/app/services/stream_generator.py:40-46, 103` | 15 literal handles | tweet authors |
| **M-09** | `backend/app/services/stream_generator.py:74-83, 102, 109` | `random.*` | arrival distribution, IDs, timestamps |
| **M-10** | `backend/app/routes/stats.py:8-13` | `random.randint` | all platform-wide statistics |
| **M-11** | `frontend/src/pages/Analyze.jsx:34-48` | literal object | a whole backend analysis response |
| **M-12** | `frontend/src/pages/Home.jsx:6-11` | literal array | hero stat strip |
| **M-13** | `frontend/src/components/Dashboard.jsx:9-19` | literal array | 24-hour detection timeline chart |
| **M-14** | `frontend/src/components/Dashboard.jsx:21-28` | literal array | bullying-type radar breakdown |
| **M-15** | `frontend/src/components/Dashboard.jsx:50-54` | literal array | "Active Causal Chains" list |
| **M-16** | `frontend/src/components/CausalChainPanel.jsx:4-10` | literal array (`MOCK_EVENTS`) | per-chain causal timeline |
| **M-17** | `frontend/src/components/CausalChainPanel.jsx:99` | inline literal | SHAP explainability panel |
| **M-18** | `frontend/src/components/NetworkGraph3D.jsx:7-67` | generator function | the entire 3D social network |
| **M-19** | `frontend/src/components/Globe3D.jsx:8-29` | literal array (`HOTSPOTS`) | worldwide geographic detection data |
| **M-20** | `frontend/src/components/Globe3D.jsx:32-43` | literal array (`ARCS`) | cross-border causal chains |
| **M-21** | `frontend/src/components/Globe3D.jsx:84-99` | `setInterval` + `Math.random` | the globe's "Live Events" ticker |
| **M-22** | `frontend/src/components/Globe3D.jsx:211-217` | `Math.random` jitter | the geographic heat layer |
| **M-23** | `frontend/src/components/EchoChamber.jsx:6-51` | function (`buildEchoData`) | the entire propagation cascade |
| **M-24** | `frontend/src/pages/GlobePage.jsx:5-10` | literal array | global stat strip |
| **M-25** | `frontend/src/pages/NetworkPage.jsx:8-14` | `useState` literal | network stat strip |
| **M-26** | `frontend/src/pages/EchoChamberPage.jsx:5-12` | literal array | echo-chamber metric strip |
| **S-01** | `backend/ml/train_bullying.py` | **0-byte file** | model training |
| **S-02** | `backend/ml/train_depression.py` | **0-byte file** | model training |
| **S-03** | `backend/app/services/preprocessor.py` | **0-byte file** | text preprocessing service |
| **S-04** | `backend/app/services/shap_explainer.py` | **0-byte file** | SHAP explainer service |
| **S-05** | `backend/app/routes/causal.py` | **0-byte file** | causal API surface |
| **S-06** | `backend/config.py` | **0-byte file** | configuration |
| **S-07** | `backend/ml/artifacts/` | **directory absent + gitignored** | the trained models themselves |

**Totals:** 26 active mock-data sites · 7 empty stubs · 10 backend / 16 frontend.

---

# Part 1 — Backend

## M-01 · Bullying classifier is 12 keywords

**File:** `backend/app/models/bullying_model.py`

```python
# lines 11-14
_model   = _load('bullying_model.pkl')
_tfidf   = _load('bullying_tfidf.pkl')
_encoder = _load('bullying_encoder.pkl')
READY    = all([_model, _tfidf, _encoder])

# lines 16-17
BULLY_KW = ['ugly','pathetic','worthless','loser','nobody likes','freak',
            'idiot','stupid','hate you','kill yourself','go die','trash']

# lines 28-31
if not READY:
    hits = sum(1 for kw in BULLY_KW if kw in text.lower())
    score = float(np.clip(hits / 3 + 0.25, 0, 1))
    return {'score': score, 'type': 'keyword_fallback', 'ready': False}
```

**What it fakes:** the multi-class cyberbullying classifier the rest of the system
is built around.

**Why it is *always* the active path:** `_load()` (line 8) returns `None` when the
file is absent. `ml/artifacts/` **does not exist** on disk, is **`.gitignore`'d**
(`.gitignore:20`), and the scripts that would create it are **empty files** (S-01).
`READY` is therefore `False` on every machine, in every environment, permanently.
There is no configuration that makes line 33 onward execute.

**Observable behaviour:**
- 0 keyword hits → score `0.25`. Every innocuous sentence scores 25% "bullying".
- 1 hit → `0.583`, which crosses the `>0.55` bullying threshold in
  `causal_chain.py:26` and `stream_generator.py:91`. **A single substring decides a
  detection.**
- 3+ hits → `1.0` (clipped). The scale saturates almost immediately.
- Substring, not word-boundary: "**stupid**ly funny" and "he's a **trash** talker"
  both fire. "Kevin **Trash**er" fires.
- No negation handling: "you are *not* pathetic" and "nobody said you're a loser"
  score identically to the slur.
- `type` is always the literal `'keyword_fallback'` — the frontend has explicit
  code to hide that string (`LiveFeed.jsx:59`), which means the fallback state was
  known and papered over rather than fixed.

**A real implementation needs:**
1. A labelled cyberbullying corpus (the code's `'not_cyberbullying'` class name at
   line 39 matches the Kaggle *Cyberbullying Classification* dataset's schema — that
   is the likely intended source).
2. A fitted vectorizer + classifier serialised to
   `ml/artifacts/{bullying_model,bullying_tfidf,bullying_encoder}.pkl`, **or** a
   replacement of `predict()`'s body with a transformer / hosted-inference call.
3. A written training script at `ml/train_bullying.py` (currently 0 bytes).
4. A decision on how artifacts reach production, since they are gitignored —
   see `DECISIONS-PENDING.md` **D-1**.
5. Held-out evaluation numbers. None exist; the project has no measured accuracy of
   any kind.

---

## M-02 · Depression classifier is 14 keywords

**File:** `backend/app/models/depression_model.py`

```python
# lines 10-13
_model     = _load('depression_model.pkl')
_tfidf     = _load('depression_tfidf.pkl')
_explainer = _load('depression_explainer.pkl')
READY      = all([_model, _tfidf])

# lines 15-17
DEP_KW = ["don't deserve","tired of existing","what's the point","disappear",
          "nobody cares","empty","hopeless","give up","can't anymore",
          "want to die","no reason","exhausted","numb","alone"]

# lines 27-30
if not READY:
    hits  = sum(1 for kw in DEP_KW if kw in text.lower())
    score = float(np.clip(hits / 3 + 0.2, 0, 1))
    return {'score': score, 'shap': {}, 'ready': False}
```

**What it fakes:** the depression / mental-health-signal classifier.

**Observable behaviour:** baseline `0.20` for any text. One hit → `0.533`, which
clears the `>0.45` depression threshold at `causal_chain.py:28` and
`stream_generator.py:95`. "I'm **exhausted** from the gym", "the box is **empty**",
"I'll **disappear** for a week on holiday", and "home **alone** tonight 🎉" are all
flagged as depression signals.

**Additional risk beyond correctness:** this is a mental-health screening claim. A
substring matcher presented as clinical signal detection is not merely inaccurate —
it is the kind of output a demo audience will read as meaningful. Phase 2 should
pair the real model with an explicit "not a diagnostic tool" disclaimer in the UI.

**A real implementation needs:** a labelled depression/self-harm-signal corpus, a
fitted model at `ml/artifacts/depression_{model,tfidf}.pkl`, a written
`ml/train_depression.py` (0 bytes today), documented evaluation, and — because of
the subject matter — an explicit statement of intended use and limitations.

---

## M-03 · SHAP explainability returns `{}`, always

**File:** `backend/app/models/depression_model.py:36-50`

```python
shap_features = {}
if _explainer:                     # _explainer is always None (line 12)
    try:
        import shap as shap_lib
        ...
    except Exception:
        pass                       # silent
return {'score': ..., 'shap': shap_features, 'ready': True}
```

**What it fakes:** the model-explainability feature the UI advertises in three
separate places (`Analyze.jsx:152-153`, `CausalChainPanel.jsx:95-96`,
`LiveFeed.jsx:100`).

**Two independent reasons it can never produce output:**
1. `_explainer` is `None` (no `.pkl`), so the block is skipped.
2. Even if it ran, line 27-30 returns *before* it whenever `READY` is `False` —
   which is always.

Plus the `except Exception: pass` at 49-50 would swallow any genuine SHAP failure
silently, with no log line.

**Consequence:** `shap_features` is `{}` in every `/api/analyze` response, so
`Analyze.jsx:155` renders an empty SHAP section — but the page never gets there
anyway, because the URL bug diverts it to mock SHAP values (M-11). Both the real and
the fake path are broken, in opposite directions.

**A real implementation needs:** a fitted `shap.TreeExplainer` (or equivalent)
persisted alongside the model, plus a decision about whether to compute SHAP per
request (slow, ~50-500 ms) or precompute. The empty `services/shap_explainer.py`
(S-04) suggests this was intended to live in its own service module.

---

## M-04 · "Causal link" is a weighted average, not causation

**File:** `backend/app/services/causal_chain.py:17-18`

```python
causal_link = float(np.clip(bullying_score * 0.55 + depression_score * 0.45, 0, 1))
risk        = 'HIGH' if causal_link > 0.72 else 'MEDIUM' if causal_link > 0.45 else 'LOW'
```

**What it fakes:** the project's central intellectual claim — *"Bullying Triggers
Depression. We Prove It, Visually."* (`Home.jsx:110-116`).

**Why it is not causal, structurally:**
- Both inputs are computed from the **same text blob** (lines 11-12), so there is no
  temporal separation between alleged cause and alleged effect.
- The weights `0.55` / `0.45` are magic numbers with no derivation, no citation, and
  no tuning procedure anywhere in the repo.
- The thresholds `0.72` / `0.45` are likewise unjustified.
- A weighted average of two correlated scores is a **correlation summary**, and a
  hand-weighted one at that. It cannot distinguish "bullying caused depression" from
  "a depressed person wrote an angry message" from "both scores fired on the same
  keyword".
- Concretely: text containing only the word `"disappear"` scores bullying `0.25` and
  depression `0.533`, giving `causal_link = 0.377` — a "causal" number produced from
  one word appearing once.

**A real implementation needs** an actual method and a stated one. Options, roughly
in ascending order of rigour:
1. **Temporal precedence** — require bullying events to precede depression signals
   from a *specific* victim account, with real timestamps. Cheap, honest, and a
   genuine improvement.
2. **Change-point / interrupted time-series** — measure a victim's depression-score
   trajectory before vs. after a bullying event.
3. **Difference-in-differences** against matched non-targeted accounts.
4. **Formal causal inference** (DoWhy / propensity matching) with stated assumptions.

Whatever is chosen must be documented in an ADR (`docs/adr/`), and until it exists
the UI copy in `Home.jsx:110-116` should be softened. See `DECISIONS-PENDING.md`
**D-6**.

---

## M-05 · Fabricated timestamps

**File:** `backend/app/services/causal_chain.py:33`

```python
'time': f'T+{i * 15}m',
```

**What it fakes:** the temporal axis of the causal chain. Line *i* of the pasted
text is asserted to have occurred `i × 15` minutes after line 0 — regardless of what
the text is. Two lines pasted from a 3-second exchange are labelled 15 minutes
apart; two lines from a 6-month gap are labelled the same 15 minutes apart.

Because the causal claim (M-04) rests on ordering, and the ordering here is
invented, this is not a cosmetic issue — it is the mechanism by which fabricated
data becomes a fabricated finding.

**A real implementation needs:** genuine `created_at` values carried from the data
source through to the timeline, and a UI that degrades gracefully (shows relative
ordering only) when timestamps are unavailable.

---

## M-06 · Hardcoded model-provenance label

**File:** `backend/app/services/causal_chain.py:50`

```python
'models_used': 'XGBoost+TF-IDF' if b_res.get('ready') else 'keyword-fallback',
```
and `backend/app/services/stream_generator.py:111`
```python
'models_used': 'XGBoost' if b_res.get('ready') else 'fallback',
```

**What it fakes:** the provenance string shown to users at `LiveFeed.jsx:128`.
`xgboost` is pinned in `requirements.txt:9` but has **zero imports** anywhere in the
backend. The string `'XGBoost+TF-IDF'` is an aspiration, not a fact — the
architecture it names has never been written. (In practice the `else` branch always
runs, so users correctly see `fallback`; but the literal encodes an untrue claim
about a code path that does not exist.)

**A real implementation needs:** the label derived from the loaded artifact's own
metadata (algorithm, version, training date, eval score), not from a string literal.

---

## M-07 · The "live social media feed" is 25 hardcoded strings

**File:** `backend/app/services/stream_generator.py:6-38`

```python
BULLY_POOL      = [ ...10 strings... ]   # lines 6-17
DEPRESSION_POOL = [ ...10 strings... ]   # lines 19-30
NEUTRAL_POOL    = [ ...5  strings... ]   # lines 32-38
```
The module's own comment at line 5 is candid: *"Pool of realistic sample tweets to
score through the real models."*

**What it fakes:** the entire real-time ingestion layer. This is the sole content
source behind the `/live` page, the "Real-time Intelligence" dashboard heading
(`Dashboard.jsx:64`), and the green "LIVE" indicator in the navbar
(`Navbar.jsx:87`).

**Observable behaviour:** at 1.8–3.5 s per emission (line 70), the entire corpus
repeats roughly every 60–90 seconds. Watch the feed for two minutes and you will see
every string twice.

**Compounding effect:** the pools were written so that the keyword matchers fire on
them. `BULLY_POOL` entries contain `pathetic`, `loser`, `ugly`, `worthless`, `freak`;
`DEPRESSION_POOL` entries contain `don't deserve`, `what's the point`, `empty`,
`alone`, `exhausted`. **The mock data was authored to satisfy the mock detector.**
The demo therefore looks accurate while measuring nothing — this is the most
misleading single fact in the codebase, because it makes a broken system present as
a working one.

**A real implementation needs** an ingestion source. See `DECISIONS-PENDING.md`
**D-1** — the realistic candidates are a replayed labelled dataset (recommended), a
live platform API (cost + access + ethics + rate limits), or a Reddit/Mastodon
public stream. Whatever is chosen must feed `_emit_one()` real text, a real author
reference, and a real timestamp.

---

## M-08 · Fake user handles

**File:** `backend/app/services/stream_generator.py:40-46`, used at line 103

```python
FAKE_USERS = ['@quiet_soul_x', '@shadow_7721', ..., '@bully_acc_01']   # 15 handles
```
Assigned uniformly at random, with **no relationship to the tweet's content or
type**: `@bully_acc_01` is as likely to post a depression-pool string as a
bullying-pool one. There is no notion of a persistent account, so no account can
have a history, and therefore no victim can have a trajectory — which is precisely
what a real causal analysis (M-04) would require.

**A real implementation needs:** stable pseudonymous author identifiers that persist
across messages, so per-account timelines can be built. Also a privacy decision:
real handles must be hashed or pseudonymised before display — see
`DECISIONS-PENDING.md` **D-7**.

---

## M-09 · Randomised stream mechanics

**File:** `backend/app/services/stream_generator.py`

| Line | Code | Fakes |
|---|---|---|
| 70 | `time.sleep(random.uniform(1.8, 3.5))` | arrival rate — real feeds are bursty, not uniform |
| 74-83 | `roll = random.random()` → 38% bully / 32% depression / 30% neutral | base rates. Real-world cyberbullying prevalence is a low single-digit percentage; 38% is off by an order of magnitude and inflates every derived rate on the dashboard |
| 102 | `'id': random.randint(100000, 999999)` | message IDs — collides at ~0.1% per pair (birthday collisions become likely within a few hundred messages), and `useWebSocket.js:32` has to append `Date.now()` to build a usable React key |
| 109 | `'time': 'now'` | timestamps — the literal string `now`; `useWebSocket.js:41-49` then *invents* relative ages (`3s`, `8s`, `0.4m`) from array position |

**A real implementation needs:** real arrival timing, real prevalence emerging from
the data rather than a `random()` cutoff, stable unique IDs from the source, and
real timestamps propagated to the client.

---

## M-10 · `/api/stats` returns four random numbers

**File:** `backend/app/routes/stats.py:6-13`

```python
@stats_bp.route('/stats', methods=['GET'])
def stats():
    return jsonify({
        'tweets_analyzed':    random.randint(2_400_000, 2_450_000),
        'bullying_detected':  random.randint(18000, 19000),
        'depression_signals': random.randint(7500, 8200),
        'causal_chains':      random.randint(3100, 3300),
    })
```

**What it fakes:** every platform-wide aggregate. The numbers are re-rolled on each
request, so the "total tweets analyzed" counter would move *down* on refresh.

**Note:** no frontend code calls this endpoint (see `00-project-state.md` §B.2).
`Home.jsx:6-11` hardcodes its own near-identical numbers (`2.4M`, `18,420`, `7,891`,
`3,204`) instead — so there are **two independent fake sources for the same four
statistics**, and they were tuned to agree with each other.

**A real implementation needs:** a persistence layer to count against. There is no
database (`DECISIONS-PENDING.md` **D-4**), so this endpoint cannot be made real
without that decision first.

---

# Part 2 — Frontend

## M-11 · The Analyze page's mock fallback — the most consequential frontend mock

**File:** `frontend/src/pages/Analyze.jsx:26-48`

```javascript
} catch (e) {
  // Show mock result if backend isn't up yet
  setResult(getMockResult(text))
}

const getMockResult = (text) => ({
  bullying_score: 0.87,
  depression_score: 0.74,
  causal_link: 0.81,
  risk_level: 'HIGH',
  bullying_segments: [text.split('\n')[0]],
  depression_segments: [text.split('\n').slice(-2).join('\n')],
  shap_features: { 'threat_language': 0.34, 'isolation': 0.28,
                   'hopelessness': 0.22, 'self_blame': 0.16 },
  timeline: [
    { time: 'T+0',  type: 'bullying',   score: 0.87 },
    { time: 'T+5m', type: 'bullying',   score: 0.79 },
    { time: 'T+1h', type: 'depression', score: 0.62 },
    { time: 'T+2h', type: 'depression', score: 0.74 },
  ]
})
```

**What it fakes:** a complete `/api/analyze` response — scores, risk level,
segments, SHAP attributions, and a four-point timeline.

**Why this is the worst one:** because of the URL bug at line 24 (single quotes
around a template literal — see AUDIT **C-2**), the `axios.post` *always* 404s, so
the `catch` *always* fires, so **this mock is the only thing the Analyze page has
ever rendered**, on localhost and on the deployed Vercel site alike. Fixing the
backend will not change the page's output by one pixel. The values are constant:
every input, from a single emoji to a 500-line thread, yields exactly
87% / 74% / 81% / HIGH and the same four SHAP feature names.

The comment "*Show mock result if backend isn't up yet*" documents an intentional
graceful degradation — but a silent one. There is no visual indication that the
displayed result is fabricated, and `setError` (declared line 17, called line 22)
is **never read anywhere in the component**, so the error state is dead code.

**A real implementation needs:**
1. Fix line 24 to use backticks.
2. Delete `getMockResult` entirely.
3. Render the existing `error` state on failure — a plain "Backend unavailable"
   message.
4. Align field names: the mock's `bullying_segments` / `depression_segments` do not
   exist in the backend response; the backend's `bullying_type`, `lines_analyzed`,
   `models_used`, and per-line `timeline[].text` are not consumed by the UI.
5. Add a `models_used` badge so a fallback-mode result is always visibly labelled as
   such.

---

## M-12 · Home page hero statistics

**File:** `frontend/src/pages/Home.jsx:6-11`
```javascript
const STATS = [
  { label: 'Tweets Analyzed',    value: '2.4M',   delta: '+12%',  color: '#00d4ff' },
  { label: 'Bullying Detected',  value: '18,420', delta: '+3.2%', color: '#ff3d5a' },
  { label: 'Depression Signals', value: '7,891',  delta: '+8.1%', color: '#ffb347' },
  { label: 'Causal Chains',      value: '3,204',  delta: '+5.7%', color: '#a855f7' },
]
```
Rendered at lines 172-188, including "**+12% today**" trend deltas that are also
literals. This is the first thing any visitor sees on the deployed site.

**A real implementation needs:** a `useEffect` fetching `GET /api/stats` (endpoint
exists but returns randoms — M-10), a loading skeleton, and real deltas, which
require historical persistence (**D-4**).

---

## M-13 · Dashboard 24-hour timeline chart

**File:** `frontend/src/components/Dashboard.jsx:9-19` — `TIMELINE_DATA`, nine
`{time, bullying, depression}` points from `00:00` to `23:59`, rendered as a
recharts `AreaChart` at lines 91-110 under the heading "Bullying → Depression
Timeline · 24-hour window · Hourly resolution" (lines 77-78).

The data is a clean unimodal curve peaking at 18:00 — visually persuasive and
entirely invented. The subtitle's claim of "hourly resolution" is contradicted by
the data itself, which has 3-hour spacing.

**A real implementation needs:** a `GET /api/timeline?window=24h` endpoint (does not
exist) backed by time-bucketed aggregates (requires **D-4**).

---

## M-14 · Dashboard bullying-type radar

**File:** `frontend/src/components/Dashboard.jsx:21-28` — `RADAR_DATA`, six
categories (Insults 82, Threats 45, Exclusion 63, Harassment 71, Stalking 38, Hate
Speech 55) rendered at lines 117-123 as a "Relative severity index" (line 116).

The six category names do not correspond to any label set in the backend. The
bullying model's `type` field is either `'keyword_fallback'` or (hypothetically) a
class from `_encoder.classes_` — a taxonomy that has never been defined because the
encoder does not exist.

**A real implementation needs:** the trained model's actual class taxonomy fixed
first (part of **D-1**), then a `GET /api/breakdown` endpoint returning real class
distributions. The chart's axes cannot be designed before the label set exists.

---

## M-15 · "Active Causal Chains" list

**File:** `frontend/src/components/Dashboard.jsx:50-54`
```javascript
const CHAINS = [
  { id: 1, bully: '@xtr3me_h8r',  victim: '@quiet_rose_', severity: 'high',
    tweets: 3, depressionScore: 0.87, topic: 'body shaming',    time: '2h ago' },
  { id: 2, bully: '@troll_lord99', victim: '@stargazer_k', severity: 'medium',
    tweets: 5, depressionScore: 0.61, topic: 'academic failure', time: '4h ago' },
  { id: 3, bully: '@anon_4321',    victim: '@dreamer_m',   severity: 'high',
    tweets: 8, depressionScore: 0.92, topic: 'isolation',        time: '6h ago' },
]
```
Note it is declared **inside** the component body (line 50), so it is reallocated on
every render — the shape of code that started as a fetch and was replaced by a
literal.

The `topic` field ("body shaming", "academic failure", "isolation") implies a topic
classifier. **No topic classification exists anywhere in the backend.** Line 135
displays "`{CHAINS.length} active`" — the count of a hardcoded array, presented as a
live figure.

**A real implementation needs:** a `GET /api/chains?active=true` endpoint (does not
exist), chain persistence (**D-4**), an actual chain-detection algorithm (**D-6**),
and a topic classifier that has not been scoped at all.

---

## M-16 · Causal chain drill-down timeline

**File:** `frontend/src/components/CausalChainPanel.jsx:4-10` — named `MOCK_EVENTS`
in the source, so this one is self-documenting.

```javascript
const MOCK_EVENTS = [
  { type: 'bullying',   time: 'T+0',   text: 'nobody wants ur ugly ass here...', score: 0.94, label: 'Bullying Detected' },
  { type: 'bullying',   time: 'T+2m',  text: 'everyone agrees ur pathetic lmao', score: 0.89, label: 'Escalation' },
  { type: 'neutral',    time: 'T+15m', text: '...',                              score: 0.12, label: 'Silence' },
  { type: 'depression', time: 'T+1h',  text: "maybe they're right...",           score: 0.81, label: 'Depression Signal' },
  { type: 'depression', time: 'T+3h',  text: 'tired of existing honestly...',    score: 0.93, label: 'High Risk' },
]
```

**Critical detail:** the component accepts a `chain` prop (line 14) — passed from
`Dashboard.jsx:199` — and **never uses it**. Click chain #1, #2, or #3 and you see
the identical five events every time. The escalation narrative
(attack → escalation → silence → depression → high risk) is a hand-authored story,
not a detection.

This panel is the visual centrepiece of the "we prove causation" claim, and it is
the most thoroughly fabricated artifact in the project.

**A real implementation needs:** render from the `chain` prop; source it from a real
`/api/chains/:id` endpoint; and derive the `label` field ("Escalation", "Silence",
"High Risk") from actual event-sequence logic, which does not exist.

---

## M-17 · Second hardcoded SHAP panel

**File:** `frontend/src/components/CausalChainPanel.jsx:99`
```javascript
{[['isolation words', 0.34], ['self-deprecation', 0.28],
  ['hopelessness', 0.22], ['social withdrawal', 0.16]].map(...)}
```
Rendered under the heading "⚡ SHAP Explainability" (line 96). The section's own
preceding comment at line 89 reads `{/* SHAP explanation placeholder */}`.

This is the **third** independent set of fake SHAP values in the app (with M-03's
empty dict and M-11's four different feature names), and none of the three agree
with each other. Real SHAP output would be TF-IDF token names like `"pathetic"` or
`"worthless"` — not human-authored concept labels like `"social withdrawal"`.

**A real implementation needs:** M-03 fixed first, then a single shared SHAP display
component fed from one source.

---

## M-18 · The entire 3D network graph

**File:** `frontend/src/components/NetworkGraph3D.jsx:6-67`, comment at line 6 reads
`// ── mock data generator ────`.

- 4 bully nodes with hardcoded severities (lines 12-17)
- 7 victim nodes with hardcoded depression scores (lines 20-28)
- 10 bystander nodes, `Math.random()` labels and scores (lines 31-35)
- 8 bullying links with hardcoded `strength` and `tweets` counts (lines 40-49)
- 10 "depression_ripple" links with hardcoded strengths (lines 52-63)

**What it fakes:** the "3D Causal Network" — 21 nodes, 18 edges, all invented.

The `depression_ripple` edge type (victim → bystander, and bystander → bystander at
lines 61-62) asserts **emotional contagion through a social graph**. That is a
substantial scientific claim, rendered with animated directional particles at
`NetworkGraph3D.jsx:221-224`, backed by **no detection logic whatsoever** — not even
a keyword matcher. There is no code path anywhere in the repo that could compute a
ripple edge.

The 3D rendering itself is real and well-built (three.js sphere meshes, glow rings,
canvas sprite labels, camera auto-orbit, force layout, click-to-zoom). The
visualisation is genuine engineering; only the data is fake.

**A real implementation needs:** a `GET /api/network` endpoint (does not exist)
returning nodes/links derived from real interaction data — which requires real
authorship (**M-08**), real reply/mention graph extraction (unscoped), and a defined
method for the ripple edges (or their removal). Also worth noting: the current graph
is 21 nodes; a real one may be thousands, so the frontend will need pagination or
subgraph sampling.

---

## M-19 · Globe hotspots

**File:** `frontend/src/components/Globe3D.jsx:8-29`, comment at line 7:
`// ── Geo data — realistic hotspots based on social media usage ──`

20 cities, each with hardcoded `bullyCount`, `depCount`, and `severity`
(New York 342/187/0.91 … Stockholm 89/51/0.59). Rendered as points, labels, and
pulse rings, with a per-city detail panel at lines 316-368 that computes a
"**Causal Rate**" as `depCount / bullyCount` (line 347) — a ratio of two invented
numbers, presented to three significant figures as an analytical finding.

**Geolocation does not exist anywhere in the backend.** No tweet payload has a
`lat`, `lng`, `country`, or `place` field; no geocoding library is installed. There
is no code path by which a detection could acquire a location.

**A real implementation needs:** geotagged source data (most platforms have removed
precise geotags; a country-level inference model or a dataset with location metadata
would be required), a `GET /api/geo` endpoint, and — importantly — an honest
treatment of geographic sparsity. The current globe is uniformly populated across 20
major cities; real data would be extremely lumpy and mostly missing.

---

## M-20 · Globe causal arcs

**File:** `frontend/src/components/Globe3D.jsx:32-43` — 10 arcs with labels like
`'NYC → London'`, `'LA → Delhi'`, `'Delhi → Lagos'`, each with a hardcoded
`severity`, animated as travelling dashes (lines 198-200) and labelled in the tooltip
as "⚡ Causal Chain" (line 207).

These assert that a bullying event in one city caused depression in another. The
routes trace major-city pairs, which is a plausible-looking pattern with no
underlying cross-account, cross-geography linkage logic. The legend at line 255 even
gives "Causal Arc" its own entry, formalising the fiction into the UI's vocabulary.

**A real implementation needs:** cross-account chain detection (**D-6**) plus
geolocation (**M-19**), i.e. it depends on two things that do not exist. This is the
strongest candidate for **removal or explicit relabelling as illustrative** rather
than for implementation.

---

## M-21 · Globe "Live Events" ticker

**File:** `frontend/src/components/Globe3D.jsx:84-99`
```javascript
const iv = setInterval(() => {
  const hs = HOTSPOTS[Math.floor(Math.random() * HOTSPOTS.length)]
  const ev = { id: Date.now(), city: hs.city, country: hs.country,
               severity: +(Math.random() * 0.4 + 0.6).toFixed(2),
               type: Math.random() > 0.45 ? 'bullying' : 'depression',
               time: 'now' }
  setLiveEvents(prev => [ev, ...prev.slice(0, 7)])
}, 2800)
```
The comment at line 83 is explicit: `// Live event ticker — simulate new causal
chain events`.

**What it fakes:** a live global event feed — displayed under a pulsing green dot
and the header "LIVE EVENTS" (lines 274-277). Every 2.8 s it invents a city, a
severity between 0.60 and 1.00, and a coin-flip type. It does **not** use the
socket.io connection; the globe page has no backend connection at all. Severities
are drawn from `[0.6, 1.0]` only, so the ticker can never show a low-risk event —
guaranteeing a permanently alarming display.

**A real implementation needs:** subscribe to the existing socket.io `new_tweet`
stream (the `useWebSocket` hook already exists and is currently used by only one
page) once that stream carries real, geolocated data.

---

## M-22 · Globe heat layer

**File:** `frontend/src/components/Globe3D.jsx:211-217`
```javascript
hexBinPointsData={HOTSPOTS.flatMap(h =>
  Array.from({ length: Math.round(h.bullyCount / 40) }, () => ({
    lat: h.lat + (Math.random() - 0.5) * 8,
    lng: h.lng + (Math.random() - 0.5) * 8,
    weight: h.severity,
  }))
)}
```
Synthesises a point cloud by scattering `bullyCount / 40` random points within ±4°
(roughly ±440 km) of each fake hotspot, purely to make the hex-bin heat layer look
populated. Because it is inside the JSX render expression rather than a `useMemo`,
the entire cloud is **regenerated on every React render**, so the heat map silently
shifts position as the component re-renders.

**A real implementation needs:** real per-event coordinates (see M-19), memoised.

---

## M-23 · The entire echo-chamber cascade

**File:** `frontend/src/components/EchoChamber.jsx:6-51`, comment at line 5:
`// ── Echo chamber simulation data ──`

13 nodes across 4 waves (1 origin → 3 amplifiers → 4 victims → 5 bystanders) and 16
links of 4 types (`spread`, `bullying`, `ripple`, `echo`), each with a hardcoded
`text`, `severity`, and `depressionScore`. Includes a deliberate 3-cycle among the
amplifiers (lines 45-47) to make the "echo chamber loop" visible.

The bystander texts are the boldest fabrication in the repo — e.g.
`'seeing this ruined my whole day'` with `depressionScore: 0.39`, and
`'scared to post anything anymore'` with `0.48`. These assert **measured
second-order psychological harm in uninvolved observers**, and the page's own copy
at `EchoChamberPage.jsx:99` states it as fact: *"Even uninvolved bystanders who view
the thread show anxiety and mood decline."*

There is no impression data, no view tracking, no bystander identification, and no
before/after measurement anywhere in the system. Nothing in the codebase could
produce this claim.

**Secondary issue:** `buildEchoData()` is called at line 76 in the component body
without `useMemo`, so a fresh object graph is built on every render, re-seeding the
d3 force simulation.

**A real implementation needs:** reshare/quote-graph extraction, view or engagement
data (generally unavailable via public APIs), longitudinal per-account scoring, and
a `GET /api/echo/:originId` endpoint. Realistically this feature should be
**explicitly relabelled as a simulation** rather than implemented — see
`DECISIONS-PENDING.md` **D-8**.

---

## M-24 · Globe page stat strip

**File:** `frontend/src/pages/GlobePage.jsx:5-10`
```javascript
const GLOBAL_STATS = [
  { label: 'Countries Monitored', value: '20'    },
  { label: 'Active Chains',       value: '3,204' },
  { label: 'Victims Tracked',     value: '18.4K' },
  { label: 'Avg Causal Rate',     value: '54%'   },
]
```
"3,204" and "18.4K" are the same numbers as `Home.jsx:6-11` and the midpoints of
`stats.py:9-13`'s random ranges — a fourth copy of the same fiction, kept manually in
sync across three files. "Countries Monitored: 20" is actually the length of the
`HOTSPOTS` array, which contains 20 *cities* across 18 countries (USA appears twice).

---

## M-25 · Network page stat strip

**File:** `frontend/src/pages/NetworkPage.jsx:8-14`
```javascript
const [stats] = useState({ totalNodes: 21, bullyNodes: 4, victimNodes: 7,
                           links: 18, avgDepressionRisk: '74%' })
```
Manually transcribed from `NetworkGraph3D`'s mock generator rather than derived from
it — so `links: 18` matches the 8+10 links by coincidence of authorship, and
`avgDepressionRisk: '74%'` was not computed from the 7 victim scores (whose true
mean is 75.9%). Two mocks that disagree.

Also note `NetworkPage.jsx:54-56` renders three `RippleEffect` components at
hardcoded percentage coordinates — decorative animation pinned to positions that
have no relationship to where the force layout actually places the bully nodes.

---

## M-26 · Echo chamber page metric strip

**File:** `frontend/src/pages/EchoChamberPage.jsx:5-12` — six metrics (Origin Posts 1,
Amplifications 3, Victims Hit 4, Bystanders 5, Total Reach 13, Avg Depression 73%)
hand-transcribed from `EchoChamber.jsx`'s `buildEchoData()`. Same pattern as M-25:
counts that *could* be `.filter().length` on the data are literals instead, so they
will silently desynchronise the moment the graph changes.

---

# Part 3 — Empty stubs

Seven files exist as **0-byte placeholders**, all created in the initial commit
`27b5b82` and never written to.

| ID | Path | Implied purpose | Consequence of emptiness |
|---|---|---|---|
| **S-01** | `backend/ml/train_bullying.py` | train + serialise the bullying classifier | 🔴 **No way to produce `bullying_model.pkl`.** Root cause of M-01. |
| **S-02** | `backend/ml/train_depression.py` | train + serialise the depression classifier | 🔴 **No way to produce `depression_model.pkl`.** Root cause of M-02 and M-03. |
| **S-03** | `backend/app/services/preprocessor.py` | shared text cleaning | `clean()` is duplicated in `bullying_model.py:19-24` and `depression_model.py:19-23` — and the two versions **differ**: the bullying one strips `@mentions` (line 22), the depression one does not. Any future model trained on one preprocessing and served with the other will silently degrade. |
| **S-04** | `backend/app/services/shap_explainer.py` | SHAP orchestration | SHAP logic is inlined at `depression_model.py:36-50` inside a `try/except: pass`. Root cause of M-03. |
| **S-05** | `backend/app/routes/causal.py` | dedicated causal-analysis endpoints | Not imported in `app/__init__.py:12-18`; the blueprint is never registered. Dead file. Causal logic lives in `analyze.py` instead. |
| **S-06** | `backend/config.py` | Flask config, env handling | No config layer exists. `python-dotenv` is installed but never imported; the only env read in the entire backend is `run.py:7`. |
| **S-07** | `backend/ml/artifacts/` *(directory)* | trained model storage | 🔴 **Does not exist on disk** and is `.gitignore`'d at `.gitignore:20`. Even if S-01/S-02 were written and run locally, the artifacts would never reach a git-based deployment. This is the structural blocker behind every model mock. |

---

# Part 4 — Dependency chain for de-mocking

The mocks are not independent. Removing them has a required order:

```
S-07 artifact delivery strategy  ──┐   (DECISIONS-PENDING D-1, D-2)
D-1  real data source            ──┤
                                   ├──►  S-01/S-02 training scripts
                                   │       │
                                   │       ▼
                                   │     M-01/M-02  real classifiers
                                   │       │
                                   │       ├──►  M-03  real SHAP  ──►  M-17
                                   │       ├──►  M-06  real provenance label
                                   │       └──►  M-07  real feed content  ──►  M-08, M-09
                                   │
D-4  database decision  ───────────┴──►  M-10 /api/stats  ──►  M-12, M-24
                                          │
                                          ├──►  M-13  timeline endpoint
                                          ├──►  M-14  breakdown endpoint (needs the label taxonomy from M-01)
                                          └──►  M-15  chains endpoint  ──►  M-16
D-6  causal method     ────────────────►  M-04, M-05  ──►  M-16, M-20

INDEPENDENT — fixable immediately, no decision required:
   M-11  Analyze.jsx URL bug + delete the mock fallback   (AUDIT C-2)

PROBABLY NOT WORTH IMPLEMENTING — recommend relabel or remove (D-8):
   M-18 (ripple edges)   M-19/M-20/M-21/M-22 (geo)   M-23 (echo cascade)
```

**The single highest-leverage move:** M-01 + M-02. Those two `predict()` functions
are the sole scoring path for both `/api/analyze` and the live feed. Real models
there make Path A and Path B genuine at once, and unblock M-03, M-06, and M-07.

**The single cheapest move:** M-11 — one character-class change (`'` → `` ` ``) plus
deleting a function. It converts the Analyze page from permanently-fake to
genuinely backend-driven with no new infrastructure at all.
