# 02 — Follow-up / Escalation Detection: Feasibility

**Investigated:** 2026-08-06 · **Commit:** `d992288` (main) · **Scope:** read-only
**Question:** can this project's data support detecting whether a tweet is a
**follow-up in an unfolding attack** — escalation over time, thread continuation,
and swarm/pile-on?

---

# 🔴 VERDICT: RED

**Tweets are isolated. There is no linkage of any kind — not partial, not latent,
not disabled. A new data layer with real thread, victim, and time structure must be
designed before ANY escalation work begins.**

The single most compact proof: grepping the entire backend for the vocabulary of
tweet linkage returns **nothing but concurrency primitives**.

```
$ grep -rniE "reply|in_reply|parent|thread|conversation|target_id|victim_id|
              attacker_id|author_id|quote|retweet|root_id" backend/ --include=*.py

backend/app/services/stream_generator.py:52:        self.thread  = None
backend/app/services/stream_generator.py:58:        self.thread  = threading.Thread(target=self._loop, daemon=True)
backend/app/services/stream_generator.py:59:        self.thread.start()
```

Three hits. All three are Python's `threading.Thread` — an **OS thread**, not a
conversation thread. The one `target` is `threading.Thread(target=self._loop)` — a
**callable**, not a victim.

Two further sweeps, equally decisive:

```
$ grep -rniE "timestamp|created_at|datetime|time\.time|utcnow|isoformat" backend/ --include=*.py
(no matches)

$ grep -rniE "victim|attacker|perpetrator|swarm|pile|escalat" backend/ --include=*.py
backend/app/services/stream_generator.py:58:        self.thread  = threading.Thread(target=self._loop, daemon=True)
```

**The word "victim" does not appear anywhere in the backend.** Not in a field name,
not in a variable, not in a comment. It exists only in hardcoded frontend display
literals. The same is true of every timestamp function in the Python standard
library: none is imported. The only use of `time` is `time.sleep()`
(`stream_generator.py:70`).

## ⚠️ The illusion is real, and it is worse than the mock-data illusion

The audit previously found mock tweet pools seeded with the detector's own keywords.
**The same class of illusion exists here, and it is more convincing**, because the
frontend contains rich, hand-authored link structures that look exactly like the
output of a working thread pipeline:

| What looks like linked data | Where | What it actually is |
|---|---|---|
| 8 `bully → victim` edges with `strength` and `tweets` counts | `NetworkGraph3D.jsx:40-49` | 8 hand-typed object literals in a `.jsx` file |
| 10 `depression_ripple` edges | `NetworkGraph3D.jsx:52-63` | ditto |
| 16 `source`/`target` links across 4 propagation waves | `EchoChamber.jsx:27-48` | ditto |
| 3 "Active Causal Chains", each pairing a named bully with a named victim over N tweets | `Dashboard.jsx:50-54` | 3 object literals declared **inside the component body** |
| 10 geographic "Causal Chain" arcs | `Globe3D.jsx:32-43` | ditto |

**None of these is produced by any generator. None crosses the network. None exists
in the backend.** They are drawings of a data model, not a data model. A reader
skimming `NetworkGraph3D.jsx` would reasonably conclude the system tracks
attacker→victim relationships. It does not, and never has.

**The gap is not "we have the structure but no algorithm." There is no structure.**

---

# Evidence

## 1. Thread / reply structure — **ABSENT**

### The complete tweet object

`backend/app/services/stream_generator.py:101-112` is the only place a tweet-shaped
object is constructed anywhere in the system. Every field:

```python
payload = {
    'id':               random.randint(100000, 999999),   # line 102
    'user':             random.choice(FAKE_USERS),        # line 103
    'text':             text,                             # line 104
    'type':             detected,                         # line 105
    'bullying_score':   round(b_score, 3),                # line 106
    'depression_score': round(d_score, 3),                # line 107
    'score':            round(score, 3),                  # line 108
    'time':             'now',                            # line 109
    'bullying_type':    b_res.get('type', ''),            # line 110
    'models_used':      'XGBoost' if b_res.get('ready') else 'fallback',  # line 111
}
self.sio.emit('new_tweet', payload)                       # line 113
```

**Linking fields present: zero.**

No `in_reply_to_id`. No `conversation_id`. No `thread_id`. No `parent_id`. No
`root_id`. No `quoted_id`. No `mentions[]`. No `target`. No `victim`.

Every field is a property **of the tweet in isolation**. Not one field references
any other tweet, or any other entity.

### The other two data-producing paths are no better

| Path | File:line | Linking fields |
|---|---|---|
| `POST /api/analyze` response | `services/causal_chain.py:41-51` | none — `timeline[]` entries carry `time`, `type`, `score`, `text`, `bullying_score`, `depression_score`. No IDs at all, not even for the entries themselves. |
| `POST /api/analyze/single` response | `routes/analyze.py:30-35` | none — returns 4 scalar fields |
| `GET /api/stats` | `routes/stats.py:8-13` | none — 4 random integers |

### There is no data model at all

There is no schema, no dataclass, no Pydantic model, no ORM entity, no TypeScript
interface, and no database (`docs/memory-bank/00-project-state.md` §A.3). A "tweet"
exists only as an ad-hoc dict literal built at `stream_generator.py:101` and
consumed at `hooks/useWebSocket.js:29`. **There is no place where a linking field
could be added without inventing the concept of a tweet record first.**

### The one genuine partial signal — and how the code destroys it

`frontend/src/pages/Analyze.jsx:7-12` defines the demo thread:

```javascript
const EXAMPLE_THREAD = `@user_a: you're literally the dumbest person in this school lmao
@victim: please stop
@user_b: fr nobody likes you
@user_a: go cry to your mommy loser
@victim: maybe you're all right. i'm tired of this
@victim: i don't think i can keep doing this. what's the point anymore`
```

**This string contains all three target phenomena.** `@user_a` attacks, is asked to
stop, and attacks again — *escalation*. `@user_b` joins `@user_a` against the same
target — *swarm*. `@victim` replies within the sequence — *thread continuation*.

The structure the new Phase 2 goal needs is already illustrated in the project's own
demo text. **The pipeline then throws away every field required to detect it:**

- `causal_chain.py:8` — `lines = [l.strip() for l in text.strip().split('\n') if l.strip()]`
  Splits on newlines only. The `@handle:` prefix is **never parsed**. Speaker
  identity is not extracted, not stored, not returned.
- `causal_chain.py:32-39` — the timeline entry keeps `text` (with the raw prefix
  still embedded as a string) but records **no speaker field**.
- `bullying_model.py:22` — `text = re.sub(r'@\w+', '', text)`
  **The only regex in the codebase that touches `@handles` deletes them**, before
  scoring, so the classifier never sees who spoke.

(Note the asymmetry: `depression_model.py:19-23` has no equivalent line, so the two
models disagree about whether handles are part of the text — separately logged as
`AUDIT.md` H-10.)

**One thing genuinely survives: ordinal order.** `causal_chain.py:22` iterates
`for i, line in enumerate(lines)`, and the `timeline[]` array preserves input order.
For a user-pasted thread, **line order is real** — a human supplied it. That is the
sole authentic sequencing signal anywhere in the system, and it is per-request,
never persisted, and discarded when the response is rendered.

---

## 2. Victim identity — **ABSENT** (this is the keystone failure)

### There is no victim field. There is only an author.

`stream_generator.py:103` — `'user': random.choice(FAKE_USERS)`

The `user` field is **who posted**, not who was attacked. A tweet classified
`type: 'bullying'` records its attacker and **has no field naming its target**.

**You cannot represent "the same victim was attacked again" because you cannot
represent "this victim was attacked once."** Swarm detection ("multiple distinct
attackers converging on one victim") is not under-supported — the target of
convergence has no representation in the data.

### Author identity does not persist meaningfully

`FAKE_USERS` (`stream_generator.py:40-46`) holds 15 handle strings. Assignment is
`random.choice` — uniform, independent, and **with no relationship to the tweet's
content or classification**:

```python
FAKE_USERS = [
    '@quiet_soul_x', '@shadow_7721', '@lost_echo_',
    '@tired_star99', '@crying_moon_', '@empty_vessel',
    '@sad_chapter_',  '@broken_link9', '@grey_skies__',
    '@fading_light7', '@troll_king99', '@hate_spreader',
    '@anon_darkness', '@cruel_word_s', '@bully_acc_01',
]
```

Handles *do* recur — with 15 names drawn uniformly, repeats are frequent. **But the
recurrence is meaningless.** `@bully_acc_01` is exactly as likely to emit a
depression-pool string as a bullying-pool one; `@quiet_soul_x` is as likely to emit
a slur. There is no role, no history, no state, and no consistency. The handle is
decoration attached after classification (line 103, *after* scoring at lines 85-86).

A "same user, second time" query would return true constantly and mean nothing.

### The frontend's victim identities are unrelated to the backend

`NetworkGraph3D.jsx:20-28` defines `@quiet_rose_`, `@sad_user_x`, `@dreamer_m`,
`@tired_soul`, `@stargazer_k`, `@moonchild_x`, `@lost_soul_9` with `type: 'victim'`
and fixed `depressionScore` values. `Dashboard.jsx:51-53` names a different set.
`EchoChamber.jsx:15-18` a third. **None of these strings appears anywhere in the
backend**, and none is ever transmitted. Three disjoint hardcoded victim rosters,
zero connection to the data pipeline.

---

## 3. Timestamps — **FABRICATED, and mostly absent**

### The backend imports no time facility whatsoever

Confirmed by sweep: no `datetime`, no `time.time()`, no `utcnow`, no `isoformat`, no
`created_at` anywhere in `backend/`. The lone `time` usage is `time.sleep()` at
`stream_generator.py:70`, which paces the emission loop.

### Live feed: the literal string `'now'`

`stream_generator.py:109` — `'time': 'now'`

Every tweet ever emitted carries the same four-character string. There is no clock
reading, so **no two tweets can be ordered by their own data**. Ordering exists only
as arrival order in a socket, which is not persisted anywhere.

The frontend then **invents** ages from array position — `hooks/useWebSocket.js:39-49`:

```javascript
return updated.map((t, i) => ({
  ...t,
  time: i === 0 ? 'now'
      : i < 3   ? `${i * 3}s`
      : i < 8   ? `${Math.round(i * 8)}s`
      : `${Math.round(i * 0.4)}m`,
}))
```

The displayed "3s", "24s", "4m" are **computed from a tweet's index in a React
array**. They are recomputed on every insertion, so a given tweet's displayed age
changes as new ones arrive — driven by list position, not elapsed time.

### Analyze path: `T+{i × 15}m`, confirmed fabricated

`causal_chain.py:33` — `'time': f'T+{i * 15}m'`

Line *i* is asserted to have occurred `i × 15` minutes after line 0, regardless of
content. Two lines from a 3-second exchange are labelled 15 minutes apart; two lines
from a 6-month gap are labelled the same 15 minutes apart. **This confirms the
audit's earlier finding (`AUDIT.md` GAP-2, `01-mock-data-inventory.md` M-05).**

**What is real:** the *ordinal sequence* is genuine for pasted threads — line 3 does
come after line 2 (`causal_chain.py:22`). **What is fake:** every duration, every
interval, and every absolute time. Escalation detection needs intervals ("attacked
again within 2 hours"). Ordinal position alone cannot supply them.

### The only two real clock reads in the system are cosmetic

`hooks/useWebSocket.js:32` (`Date.now()` for a React key) and `Globe3D.jsx:88`
(`Date.now()` as a fake event ID). Neither is a tweet timestamp; neither reaches the
backend.

---

## 4. Escalation — **NO SEQUENTIAL RELATIONSHIP EXISTS**

The generator is a memoryless i.i.d. sampler. Full logic, `stream_generator.py:72-99`:

```python
def _emit_one(self):
    # Pick a tweet with weighted randomness
    roll = random.random()
    if roll < 0.38:
        text    = random.choice(BULLY_POOL)
        hint    = 'bullying'
    elif roll < 0.70:
        text    = random.choice(DEPRESSION_POOL)
        hint    = 'depression'
    else:
        text    = random.choice(NEUTRAL_POOL)
        hint    = 'neutral'

    b_res = bully_predict(text)
    d_res = dep_predict(text)
    ...
```

and the driving loop, lines 64-70:

```python
def _loop(self):
    while self.running:
        try:
            self._emit_one()
        except Exception as e:
            print(f"[stream] error: {e}")
        time.sleep(random.uniform(1.8, 3.5))
```

**Each call to `_emit_one()` is statistically independent of every call before it.**
Reading the code for state:

- `StreamGenerator.__init__` (lines 49-52) holds exactly three attributes: `sio`,
  `running`, `thread`. **No history buffer, no counter, no previous-tweet reference,
  no per-user state, no escalation variable.**
- `_emit_one` reads no instance state and writes none. It is a pure function of
  `random`.
- The `hint` variable (lines 76, 79, 82) is assigned in all three branches and
  **never read again** — dead code. Even the generator's own notion of intent is
  discarded before emission.
- The 38/32/30 split is a fixed constant. It does not drift, ramp, or respond to
  anything.

**There is no mechanism by which attack severity could increase over time, or by
which additional attackers could join.** Two consecutive `type: 'bullying'` tweets
are two independent draws that happened to land in the same bucket — they may carry
different random `user` values, unrelated text, and no connection whatsoever.

**Sub-finding — the appearance of escalation is hand-authored in the frontend.**
`CausalChainPanel.jsx:4-10` (`MOCK_EVENTS`) contains a five-beat narrative arc:
attack (0.94) → escalation (0.89) → silence (0.12) → depression signal (0.81) →
high risk (0.93), with `label` fields literally reading `'Escalation'` and
`'High Risk'`. `EchoChamber.jsx:6-51` encodes a four-wave cascade with a `wave`
field per node. **Both are static literals in `.jsx` files.** No code produces
either; `CausalChainPanel` does not even read the `chain` prop it is passed
(`CausalChainPanel.jsx:14`, cf. `AUDIT.md` M-11), so all three dashboard chains
render the identical escalation story.

The escalation narrative exists as **artwork**, not as output.

---

## 5. Attacker multiplicity / swarm — **NOT REPRESENTABLE**

Swarm detection requires three things simultaneously. The system has none:

| Requirement | Status | Evidence |
|---|---|---|
| A **target** each attack is directed at | ❌ absent | no `target`/`victim`/`mentions` field exists (`stream_generator.py:101-112`) |
| **Distinct attacker identities** with stable meaning | ❌ absent | `random.choice(FAKE_USERS)` (line 103), no role, no consistency |
| A **time window** to count convergence within | ❌ absent | `'time': 'now'` (line 109); no clock read in the backend |

Because there is no target field, the query at the heart of swarm detection —
*"how many distinct authors targeted victim V in the last N minutes?"* — cannot be
expressed against this data. There is no `V`. There is no `N`. There is no store to
query.

**And the system is stateless.** `StreamGenerator` broadcasts each payload
(`stream_generator.py:113`) and retains nothing. There is no database
(`00-project-state.md` §A.3). Even with perfect fields on every tweet, "multiple
attackers converged" is a claim about a *set* of tweets, and no set is ever
assembled anywhere in the backend.

**Sub-finding — the frontend depicts swarms it cannot compute.** `NetworkGraph3D.jsx`
encodes exactly the swarm topology: `b1 → v1` (line 41) and `b4 → v1` (line 48) —
two distinct attackers converging on victim `v1`. `EchoChamber.jsx:33-37` shows
three amplifiers fanning onto four victims. These are the target phenomenon, drawn
by hand as literal edge lists. They are the strongest evidence that swarm structure
was *designed* and never *implemented*.

---

# What a "follow-up" could and could not be detected from today

## Could be detected — a short list

**1. Within a single pasted thread, at `/api/analyze`: ordinal position.**
`causal_chain.py:22` preserves input order, so "this line came after that line" is
genuine. On that alone you could build:
- *"A high-bullying line was followed by a high-depression line"* — sequence-of-types
  reasoning, which is roughly what the existing per-line timeline already gestures
  at.
- *"Bullying scores rose across the thread"* — a trend over the score series.

This is real, and it is the seed to build from. But note its ceiling: it works only
on text a human pastes into a textarea, in one request, with ordering they supplied
by hand. It is not detection over a data stream.

**2. Speaker identity within a pasted thread — recoverable, currently discarded.**
The `@handle:` convention in `EXAMPLE_THREAD` is parseable with one regex. Nothing
parses it today, and `bullying_model.py:22` deletes handles before scoring, but the
information is *present in the input*. This is the cheapest available upgrade: parse
the prefix, and "same speaker attacked twice" and "two speakers attacked one target"
become computable **within a single request**.

## Could not be detected — and why

| Target capability | Blocker |
|---|---|
| **Escalation over time** ("same victim hit repeatedly across sessions") | No victim field, no real timestamps, no persistence. Requires memory across requests; the backend has none. |
| **Thread continuation** ("this reply continues an attack above it") | No `in_reply_to_id`, no `conversation_id`. Reply structure does not exist in any payload. |
| **Swarm / pile-on** | No target field — the object of convergence is unrepresentable. |
| **Attack intensification** ("worse than last time") | Requires a prior comparable score for the same victim. Nothing is stored. |
| **Time-windowed anything** ("3 attackers in 10 minutes") | No clock read exists in the backend. |
| **Live-feed follow-up** | Every emitted tweet is an independent draw (`_emit_one`, lines 72-99). There is no "previous" tweet in any sense the code can access. |

**The load-bearing sentence:** follow-up detection is inherently a claim about a
*relationship between tweets*. This system has no representation of a relationship
between tweets, and no memory in which to hold one.

---

# Minimum additions to reach GREEN

Four layers. **Layer 1 is the keystone — nothing above it works without it.**

### Layer 1 — A tweet record with linkage (required)

Replace the ad-hoc dict at `stream_generator.py:101-112` with a defined record.
Minimum viable fields, in rough priority order:

```
id              stable unique ID          (replaces random.randint, line 102 — currently collides)
author_id       persistent, pseudonymous  (replaces random.choice(FAKE_USERS), line 103)
target_ids[]    who is addressed/attacked ← THE KEYSTONE. Nothing exists today.
created_at      real UTC timestamp        (replaces the literal 'now', line 109)
conversation_id groups a thread
in_reply_to_id  parent link, nullable
```

Everything downstream is blocked on `target_ids[]` and `created_at`. `target_ids[]`
alone unlocks swarm; `+ created_at` unlocks escalation; `+ in_reply_to_id` unlocks
thread continuation.

### Layer 2 — Persistence (required)

Escalation is a claim about the past. "Attacked **again**" requires memory. The
backend is stateless and has no database, so it cannot answer *"has this victim been
targeted before?"* even in principle.

> ### ⚠️ This changes a recommendation I previously gave you
>
> `DECISIONS-PENDING.md` **D-4** currently recommends **no database for step 3**,
> precomputed JSON aggregates instead. **That recommendation was correct for
> single-tweet classification and is wrong for this goal.** Follow-up detection is
> inherently stateful. D-4 moves from "probably unnecessary" to **required**, and it
> moves earlier in the sequence. Postgres (Neon or Supabase — *not* Render's free
> tier, which expires after 30 days) with an index on `(target_id, created_at)` is
> the shape that serves all three detection tasks.

### Layer 3 — A threaded data source (required — and this is a new problem)

> ### ⚠️ This also affects ADR-0001, currently in draft
>
> ADR-0001 selects the **Kaggle Cyberbullying Classification** corpus. That corpus
> is a collection of **independently labelled single tweets** — no conversation IDs,
> no reply chains, no timestamps, no thread grouping. **It cannot train or evaluate
> follow-up detection, because it contains no follow-ups.**
>
> ADR-0001 remains sound for what it decides: a lightweight classical model for
> *single-tweet* bullying classification, which stays the necessary first-stage
> scorer. But it is **insufficient for the new Phase 2 goal**, and its Context
> section should say so before it is accepted. Follow-up detection needs a *second*,
> conversational corpus.

Leads worth evaluating (**I have not verified availability, licence, or current
contents — treat as starting points, not recommendations**):

- **Reddit via PRAW** — free, no paid tier, and natively threaded: comments carry
  `parent_id`, `link_id`, and `created_utc`. Of the live options this is by far the
  most tractable, and it supplies real reply structure rather than simulated.
- **ConvoKit** (Cornell Conversational Analysis Toolkit) — conversation corpora with
  reply structure preserved. Its *"Conversations Gone Awry"* dataset is specifically
  about conversations that derail into personal attacks, which is close to this
  problem statement. Worth investigating first.
- **Any corpus with `conversation_id` + `created_at`**, including threaded
  harassment datasets published for research.

### Layer 4 — Detection logic (the part that is actually straightforward)

Once layers 1–3 exist, the three target capabilities become ordinary queries:

| Capability | Becomes |
|---|---|
| **Escalation** | `SELECT ... WHERE target_id = ? AND created_at > now() - interval` → compare score trend |
| **Thread continuation** | walk `in_reply_to_id` to the root; check whether ancestors were classified as attacks |
| **Swarm** | `COUNT(DISTINCT author_id) WHERE target_id = ? AND created_at IN window` → threshold |

**This is the honest headline: the hard part is not the algorithm. It is that the
data does not exist.** Layer 4 is a few days of work on top of layers 1–3, and
impossible without them.

## Suggested sequencing

1. **Cheapest real win first** — parse `@handle:` prefixes in `causal_chain.py:8`.
   This makes speaker identity real *within a pasted thread*, and gives you a
   working demo of escalation and swarm on user-supplied input, with **no database
   and no new data source**. It is a genuine intermediate result, not a stopgap.
2. **Decide the corpus** (Layer 3) — this gates everything and needs sign-off. It
   also determines whether ADR-0001 needs amending or a companion ADR.
3. **Design the tweet record** (Layer 1) and **stand up persistence** (Layer 2).
4. **Build detection** (Layer 4).

Steps 1 and 2 can proceed in parallel. Step 1 is the only one that produces visible
progress without a decision from you.

---

# Bottom line

**RED.** Tweets are isolated dict literals with no linking fields, no target
identity, no real timestamps, and no memory. The generator is a memoryless i.i.d.
sampler with three attributes and no history. The rich thread, victim, and swarm
structures visible in the UI are hand-typed literals in `.jsx` files that no code
produces and nothing transmits.

The one authentic asset is **ordinal line order within a user-pasted thread**
(`causal_chain.py:22`), plus `@handle:` prefixes that are present in the input,
never parsed, and actively deleted before scoring (`bullying_model.py:22`).

Escalation detection cannot be built on this data. It can be built on a data layer
designed for it — and the demo thread already in the repo
(`Analyze.jsx:7-12`) is a precise specification of what that layer must represent.

## Cross-references

- `docs/memory-bank/00-project-state.md` §B.2, §C.2 — payload shapes, live-feed data flow
- `docs/memory-bank/01-mock-data-inventory.md` — M-05 (fabricated timestamps),
  M-07/M-08/M-09 (stream mocks), M-16 (hand-authored escalation narrative),
  M-18 (hand-authored network edges), M-23 (hand-authored cascade)
- `docs/AUDIT.md` — GAP-2 (causal claim), H-10 (divergent `clean()`), M-4 (ID collisions)
- `docs/DECISIONS-PENDING.md` — **D-4 recommendation superseded by this report**;
  D-1 (data source) must now also satisfy Layer 3
- `docs/adr/0001-*` (draft) — **Context section needs amending**: the selected corpus
  cannot support follow-up detection
