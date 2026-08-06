# ADR-0002: Model cyberbullying as unfolding attacks (two-stage escalation architecture)

## Status

Accepted

## Date

2026-08-06

## Context

This is the project's centrepiece decision. It reframes what the system detects.

### The goal changed

Phase 1 and ADR-0001 both treat detection as a per-message classification problem:
given a tweet, is it abusive? That is not what cyberbullying is. Cyberbullying is
characterised by **repetition, power imbalance, and escalation over time** — an
attack that unfolds across a conversation, not a single hostile sentence.

Phase 2's goal is therefore to detect **attacks unfolding**:
- **escalation** — the same victim hit repeatedly, with intensifying severity
- **swarm / pile-on** — multiple distinct attackers converging on one victim
- **victim trajectory** — how the target's own language changes as the attack proceeds

### The data cannot currently express any of this — verdict RED

`docs/memory-bank/02-followup-feasibility.md` investigated whether the existing
data supports follow-up detection. The verdict was **RED**: tweets are isolated
with no linkage of any kind. The evidence, in brief:

- **No linking fields exist.** Grepping the entire backend for `reply|parent|
  thread|conversation|target_id|author_id|in_reply_to|root_id` returns **three
  hits, all `threading.Thread`** — an OS thread, not a conversation. The one
  `target=` is `threading.Thread(target=self._loop)`, a callable.
- **No victim field.** `stream_generator.py:103` records `user` — the *author*.
  A tweet classified as bullying has **no field naming who it attacked**. Swarm
  detection is not under-supported; its object has no representation.
- **No real timestamps.** The backend imports no time facility at all; every
  tweet carries the literal string `'time': 'now'` (`stream_generator.py:109`).
  `causal_chain.py:33` fabricates `T+{i*15}m`.
- **No sequential relationship.** `_emit_one()` is a memoryless i.i.d. sampler;
  `StreamGenerator` holds three attributes and no history.
- **The apparent structure is artwork.** The reply graphs, victim rosters, and
  escalation narratives in `NetworkGraph3D.jsx:40-63`, `EchoChamber.jsx:27-48`,
  and `CausalChainPanel.jsx:4-10` are hand-typed literals in `.jsx` files. No
  code produces them; nothing transmits them.

**The hard part is not the algorithm. It is that the data does not exist.**

### A threaded corpus was investigated

`docs/memory-bank/03-corpus-investigation.md` compared two candidates:

- **Reddit via PRAW** — technically excellent (`parent_id`, `link_id`,
  `created_utc`, `author` all native), but **ruled out on policy**. Reddit's
  Responsible Builder Policy reportedly states that the Reddit for Researchers
  programme is the only authorised avenue for research, that research using data
  collected outside it violates policy, that data must not be used "to train
  machine learning or AI models" without express written approval, and that
  researchers must not retain data beyond immediate need — the last of which
  conflicts directly with the persistent store this ADR requires.
- **ConvoKit "Conversations Gone Awry" (CGA-WIKI)** — selected. See Decision C.

**What was not known when this was decided:** the accuracy achievable by either
stage (nothing has been trained), the error rate of the victim heuristic (Decision
F), the exact mapping from CGA fields to a database schema, and the CGA dataset
licence, which remains unverified.

## Decision

### A. Reframe the problem: detect unfolding attacks, not isolated messages

The system's unit of analysis becomes the **conversation**, not the message. The
detection targets are escalation, swarm, and victim trajectory. Per-message abuse
classification is retained, but demoted to an input signal rather than the output.

This is a deliberate scope change from ADR-0001 and from Phase 1, motivated by the
RED finding above and by the observation that repetition and escalation are
definitional to cyberbullying rather than incidental to it.

### B. Two-stage architecture

**Stage-1 — per-message abuse scorer.** As decided in ADR-0001: TF-IDF +
Logistic Regression, trained on the Kaggle Cyberbullying Classification corpus.

**Stage-2 — conversation-level escalation model.** Consumes a linked, ordered,
Stage-1-scored conversation and emits conversation-level judgements.

**Interface contract (design level; no implementation prescribed here).**

*Stage-1 emits, per message:*

| Field | Meaning |
|---|---|
| `message_id` | stable identifier of the scored message |
| `abuse_score` | continuous [0,1] |
| `abuse_class` | predicted label from the corpus taxonomy |
| `model_version` | provenance — which artifact produced this score |

*Stage-2 consumes, per conversation:* an **ordered sequence** of messages, each
carrying the Stage-1 output above **plus the structural fields the RED finding
identified as missing**:

| Field | Meaning |
|---|---|
| `message_id` | — |
| `author_id` | stable speaker identity |
| `reply_to` | parent `message_id`, null at thread root |
| `conversation_id` | thread grouping |
| `timestamp` | real, ordered |
| `abuse_score`, `abuse_class` | from Stage-1 |

*Stage-2 emits, per conversation:*

| Field | Meaning |
|---|---|
| `escalation_risk` | continuous [0,1] — is this conversation derailing? |
| `turning_point_message_id` | where the attack begins, nullable |
| `derived_victim_id` | heuristic — see Decision F |
| `distinct_attacker_count` | derived — see Decision F |

**The load-bearing property of this contract:** Stage-2's minimum input is
*structure + scores*. It may additionally consume raw text as features, but it
must not require it. This keeps the two stages independently trainable,
independently testable, and independently replaceable — Stage-1 can be upgraded
to a transformer later without touching Stage-2.

### C. Stage-2 corpus: ConvoKit CGA-WIKI

**CGA-WIKI** (4,188 conversations · 30,021 utterances · 8,069 speakers) is the
Stage-2 training and evaluation corpus.

**Chosen for two properties no other available corpus combines:**

**1. Dual-granularity labels.**
- `conversation_has_personal_attack` — did this conversation derail?
- `comment_has_personal_attack` — does *this specific comment* contain the attack,
  per three crowdsourced annotators?

This permits training both "will it derail?" and "which message is the turning
point?" — the two questions Decision A requires.

**2. Turning-point construction with an explicit anti-shortcut control.**
Conversations were extracted such that the Nth comment scores toxicity **> 0.6**
while **all preceding comments score < 0.4**, and human annotators verified that
everything before the attack is civil — explicitly so that models "capture
conversational dynamics rather than detecting already-existing toxicity." Each
derailing conversation is paired (`pair_id`) with a civil conversation from the
same talk page, giving a balanced, confound-controlled design.

**That anti-shortcut property is why this corpus was chosen over any alternative.**
This project has already shipped one detector that scored near-perfectly by
matching keywords it had been seeded with (`AUDIT.md` GAP-1). A corpus designed to
defeat exactly that failure mode is the correct instrument for a project
correcting exactly that error.

Required structural fields are all present: `reply_to`, `conversation_id`,
`timestamp`, `speaker`, `text`.

**CGA-CMV-Large** (19,578 conversations · 116,793 utterances) is recorded as an
**optional cross-domain generalisation check** — conversation-level labels only,
derived from moderator removals rather than annotation. Its use is contingent on
resolving whether a Reddit-derived corpus inherits Reddit's research policy
(Q4 below).

### D. Domain-gap disclosure — a first-class stated limitation

**We keep the "cyberbullying" framing and use CGA as an explicit proxy.**

CGA-WIKI is Wikipedia editors in governance and edit disputes. That is **not**
adolescent cyberbullying. The escalation *dynamics* — civil exchange turning
hostile, a identifiable turning point, multiple participants converging —
transfer. The social domain, register, participants, and stakes do not.

**This is disclosed prominently, not buried.** The rationale is not modesty; it is
that undisclosed gaps between claim and implementation are the specific failure
this project is correcting. The audit found six such gaps (`AUDIT.md`
§RECONCILIATION), including a headline reading "We Prove It, Visually" above a
weighted average. Shipping a Wikipedia-trained model described as cyberbullying
detection would be the same error in a new place.

**The sentence the project will use, verbatim, in the report, the UI, and the viva:**

> *SocialSentinel detects the dynamics of an unfolding attack — escalation,
> pile-on, and victim response. Stage-2 is trained on the Conversations Gone Awry
> corpus (Wikipedia talk-page disputes), used as a labelled **proxy** for those
> dynamics: it is the only public corpus that labels both whether a conversation
> derails and which message turns it. The escalation structure transfers; the
> social domain does not. We make no claim that a model trained on Wikipedia
> editor disputes generalises to adolescent cyberbullying without further
> validation, and we report results as escalation detection in a proxy domain.*

### E. Postgres as the memory layer

> **Resolved 2026-08-06 — provider is NEON.** Render's free Postgres was verified
> to expire 30 days after creation (+14-day grace, then permanent deletion, no
> backups); Neon's free tier has no time-based expiry. See
> `docs/DECISIONS-PENDING.md` → TODO-2. Decision E is otherwise unchanged.

**A database is now required.** Escalation is a claim about the past: "attacked
**again**" cannot be evaluated without memory. The backend is currently stateless
and holds nothing between requests.

**Postgres over SQLite:** Render's filesystem is ephemeral — a SQLite file is
wiped on every deploy and restart, and a persistent disk is a paid add-on. A
managed Postgres (Neon or Supabase; **not** Render's free Postgres, which expires
after 30 days and would fail weeks before viva) is the minimum that survives the
project's own lifecycle.

**The schema is deliberately not designed here.** It depends on the exact CGA
field mapping and on the Stage-2 feature set, neither of which is settled. A
follow-on ADR will record it once CGA's fields are mapped. This ADR records only
that persistence is required and which engine.

### F. Victim identity and swarm counts are DERIVED — and must be labelled as such

**No available corpus labels the victim.** `comment_has_personal_attack` states
that a comment *contains* an attack; it does not state *against whom*. Reddit's
API has only an author field. This is the same missing field the RED finding
identified, and it is not obtainable off the shelf.

**Therefore:**

1. **Victim identity is derived from reply structure** — for an attacking
   utterance with `reply_to = X`, the speaker of `X` is the presumed target.
2. **Swarm is derived** — distinct `author_id` values with attacking messages in a
   conversation or window.
3. **Both must be validated against a hand-checked sample and reported with a
   measured error rate.**
4. **Neither may be presented as ground truth** — not in the UI, not in the
   report, not in the viva. Derived quantities are labelled derived wherever they
   appear.

**This is recorded as a project value, not merely a method:**

> **Derived is not measured.** Any quantity this system infers rather than
> observes is labelled as inferred, carries a stated error rate, and is never
> rendered with the same authority as a measured one.

The reply-based heuristic is known to be wrong in identifiable cases — attacks on
third parties, attacks on the thread generally, and multi-target attacks. Those
are limitations to quantify and disclose, not to discover later.

### G. The depression model is RETAINED but DEMOTED to a distress-signal input

*(This decision resolves what was drafted as open question Q5, and answers
**ADR-0001 Q2**, which asked which corpus supplies depression labels.)*

The depression model is **not removed**, and it is **not a standalone output**.

1. **Retained as an input, not an output.** It becomes one signal feeding the
   **victim-trajectory feature** within Stage-2 — a measure of how a presumed
   target's language changes across an unfolding attack. It is never surfaced as
   an independent verdict about a person.
2. **Never a diagnosis.** No output of this system constitutes, resembles, or may
   be presented as a clinical or diagnostic judgement about any individual's
   mental health.
3. **Inherits Decision F.** It is a **derived signal**: labelled as inferred
   wherever it appears — UI, report, and viva — and carrying a stated error rate.
   It is not rendered with the authority of a measurement.
4. **Terminology changes.** The words **"depression"** and **"depressive
   response"** are replaced with **"distress signal"** or **"risk signal"** across
   **all user-facing surfaces.** The internal model name may persist in code, but
   no user-facing string may imply a clinical claim.

**Why demote rather than delete.** Victim trajectory is one of the three targets
in Decision A, and a distress signal is a reasonable proxy for it. Deleting the
model would lose that. Keeping it as a headline output would perpetuate the
project's most serious integrity problem: the deployed site currently renders
"🚨 HIGH RISK" beside the phrase "**confirmed** depressive response"
(`Analyze.jsx:146`, `Dashboard.jsx:132`) on the strength of a 14-word substring
match. Demotion keeps the signal and retires the claim.

**Resolves ADR-0001 Q2 as follows:** no dedicated depression corpus is required.
Under this decision the depression signal is a trajectory feature, not a
standalone classifier with its own accuracy claim, so it does not need its own
labelled corpus and held-out evaluation. If a future decision re-promotes it to a
standalone output, ADR-0001 Q2 reopens and a corpus must be chosen.

## 🚩 Reconciliation — a prior recommendation flips

`docs/DECISIONS-PENDING.md` **D-4** currently recommends **no database** for
step 3, with precomputed JSON aggregates instead, and treats Postgres as a
step-4 maybe.

**That recommendation was correct for single-tweet classification and is wrong
under this ADR.** Follow-up detection is inherently stateful. D-4 flips from
*"probably unnecessary"* to **required**, and moves **earlier** in the sequence.

D-4 should be struck from `DECISIONS-PENDING.md` and marked resolved by this ADR.
**The schema itself remains open** and is deferred to a follow-on ADR (Q1).

## Consequences

**Positive**

- The system detects what cyberbullying actually is — repetition and escalation —
  rather than what is easiest to classify.
- The two-stage split is architecturally clean: each stage trains on a corpus
  suited to it, and each is independently replaceable.
- CGA-WIKI's anti-shortcut construction makes it *hard* to accidentally build
  another keyword matcher that scores well. The corpus enforces the discipline.
- The paired design supplies matched civil controls for free — the difference
  between "finds toxic words" and "detects derailment."
- Free, downloadable, fixed, reproducible: one `download()` call, no OAuth, no
  rate limits, no ethics application. An examiner can rerun the work.
- Peer-reviewed and citable (ACL 2018 / EMNLP 2019), which strengthens the
  submission rather than raising questions.
- Choosing Wikipedia over live social data materially eases the privacy and
  ethics posture (`DECISIONS-PENDING.md` D-7).
- **Decision G retires the project's largest ethical exposure** — clinical-sounding
  mental-health verdicts rendered from a keyword count — without discarding the
  victim-trajectory signal.

**What this unblocks**

The database schema, the ingestion layer, and every escalation feature. It also
resolves the corpus question that `02-followup-feasibility.md` left open as the
gate on all Phase 2 detection work.

**Negative / accepted trade-offs**

- **The domain gap is real and permanent** (Decision D). The project's central
  claim becomes narrower and more defensible, but narrower.
- **Scope increase.** A database, an ingestion layer, and a second model are
  substantially more than ADR-0001 alone implied.
- **Two domains at inference.** Stage-1 is tweet-trained, Stage-2 is
  Wikipedia-trained. How they compose on real input is unresolved (Q3).
- **Victim and swarm carry irreducible derivation error** (Decision F).
- **No cross-conversation repeat victimisation.** CGA conversations are
  self-contained, so "same victim attacked again next week" is out of scope for
  Stage-2 training, even though the Postgres layer could represent it.
- **CGA-WIKI is modest** (4,188 conversations) — ample for classical models,
  small for deep learning.
- **Long-form text.** Talk-page comments are paragraphs, not tweets; Stage-1
  thresholds will not transfer directly.
- **Decision G loses a headline feature.** "Depression detection" is more
  striking to a casual viewer than "distress signal feeding a trajectory
  feature." Accepted deliberately — the striking version is not supportable.

**Follow-on work this creates**

- A schema ADR (Q1) and the ingestion layer that populates it.
- A hand-checked validation sample for the victim heuristic (Decision F).
- The domain-gap sentence (Decision D) must reach the UI, not just the report —
  the deployed site currently makes stronger claims than the code supports.
- **A user-facing terminology sweep for Decision G.** "Depression" appears in
  UI copy across at least `Analyze.jsx`, `Dashboard.jsx`, `LiveFeed.jsx`,
  `Home.jsx`, `CausalChainPanel.jsx`, `NetworkGraph3D.jsx`, `Globe3D.jsx`,
  `EchoChamber.jsx`, and the page-level stat strips. Every user-facing instance
  must become "distress signal" / "risk signal". Scope this as its own task; it
  is wider than it first appears.
- Characterisation tests before the scoring path changes (`AUDIT.md` H-8).

**What would make us revisit this**

- A threaded corpus in an adolescent/social-media domain becomes available,
  closing the domain gap.
- The victim heuristic's measured error rate proves too high to report honestly.
- Reddit's research policy is clarified such that CGA-CMV-Large or live Reddit
  data becomes usable.
- The distress signal proves to add nothing to victim trajectory, in which case
  Decision G's retention is revisited in favour of removal.

## Open questions — all DEFERRED, none decided here

- **Q1 — Exact Postgres schema.** Table structure, indexes, and the CGA
  field→column mapping. Deferred to a follow-on ADR once CGA's fields are mapped
  against the Stage-2 feature set. Decision E records only *that* Postgres is
  required.
- **Q2 — Victim-heuristic error threshold.** What measured error rate is
  acceptable before the derived victim ID may be surfaced in the UI at all?
  Requires the hand-checked sample from Decision F to exist first. **Needs
  sign-off.**
- **Q3 — Reconciling Stage-1 (tweet domain) and Stage-2 (Wikipedia domain) at
  inference.** Options not evaluated: retrain Stage-1 on CGA utterances for
  in-domain consistency; keep both and treat the mismatch as a documented
  limitation; or use Stage-1 scores only as a rank-ordering rather than a
  calibrated probability. **This is the most technically substantive open
  question in this ADR.**
- **Q4 — CGA dataset licence, and whether CGA-CMV-Large inherits Reddit's
  research policy.** ConvoKit's *code* is MIT; no licence statement was found for
  the *datasets* on any doc page, in `datasets.rst`, or in the README. Blocks
  publication, not development. The Reddit-derivation question may be legal
  rather than technical.
- **Q5 — RESOLVED.** Was: "the depression model's role under this reframe."
  Decided in **Decision G** — retained, demoted to a distress-signal input to the
  victim-trajectory feature, never a standalone output or a diagnosis, with
  user-facing terminology changed. Number retained rather than reused, per the
  ADR numbering convention in `docs/adr/README.md`.
- **Q6 — Verify the Reddit policy language firsthand.** `03-corpus-investigation.md`
  could not fetch Reddit's help pages (HTTP 403); the policy text is corroborated
  by two independent searches but not read from primary source. Decision C's
  rejection of Reddit rests on it.

## Relates-to

- Depends on: **ADR-0001** — Stage-1 is the per-message scorer this architecture
  consumes; ADR-0001's Context is scoped by this ADR
- Answers: **ADR-0001 Q2** (depression corpus) — see Decision G
- Resolves: `docs/DECISIONS-PENDING.md` → **D-4** (database — flipped to
  *required*), and extends **D-1** (data source) to a second corpus
- Eases: `docs/DECISIONS-PENDING.md` → D-7 (privacy/ethics), by choosing
  Wikipedia over live social data; Decision G addresses its disclaimer question
  directly
- Evidence: `docs/memory-bank/02-followup-feasibility.md` (RED verdict),
  `docs/memory-bank/03-corpus-investigation.md` (corpus comparison, Reddit policy)
- Addresses: `docs/AUDIT.md` → GAP-1 (real-time detection claim), GAP-2 (causal
  claim), GAP-3 (3D visualisations rendering fabricated links)
- Creates work on: `docs/AUDIT.md` → H-8 (tests), and a new schema ADR
- Defers to: future ADR — Postgres schema (Q1)
- Phase 2 step: 3 (replace mock data) and 4 (UI / next-level features)
