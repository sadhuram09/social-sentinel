# Architecture Decision Records

Every architectural decision made during Phase 2 gets one file in this directory.

An ADR is a short, immutable record of **one** decision: what was decided, what
forced it, and what it cost. It exists so that six months from now — in a viva, in a
code review, or when you have forgotten everything — the reasoning is recoverable
from the repository instead of from memory.

> **Status:** scaffold only. `0000-template.md` is the template.
> **No real ADRs have been written yet.** The first ones will come from
> [`../DECISIONS-PENDING.md`](../DECISIONS-PENDING.md) once those decisions are
> signed off.

---

## Numbering

- Sequential integers, zero-padded to four digits, starting at **0001**.
- `0000` is reserved for the template and is never a real decision.
- Numbers are **never reused**, even if an ADR is rejected or superseded. A gap in
  the sequence is a bug; a rejected ADR is a valid, informative record.
- Filename: `NNNN-kebab-case-title.md`

```
docs/adr/
├── README.md                                    ← this file
├── 0000-template.md                             ← copy this
├── 0001-slim-runtime-requirements.md            ← example of what will land here
├── 0002-render-deployment-configuration.md
└── ...
```

Name the **decision**, not the question:

| ✅ | ❌ |
|---|---|
| `0003-tfidf-xgboost-for-bullying-classification.md` | `0003-how-to-classify-bullying.md` |
| `0004-no-database-precomputed-aggregates.md` | `0004-database-discussion.md` |

---

## Format

Six sections, in this order. Copy `0000-template.md` — do not write them from scratch.

| Section | Contains |
|---|---|
| **Status** | `Proposed` · `Accepted` · `Rejected` · `Superseded by ADR-NNNN` · `Deprecated` |
| **Date** | `YYYY-MM-DD` — when the status was last set |
| **Context** | The forces at play. Cite `file:line`. State what was *not* known. |
| **Decision** | What we will do, in active voice, specific enough to be checkable |
| **Consequences** | What becomes true — **positive and negative**, plus follow-on work |
| **Relates-to** | Links to other ADRs, to `AUDIT.md` findings, to `DECISIONS-PENDING.md` items |

---

## Lifecycle

```
        ┌──────────┐
        │ Proposed │  drafted, under discussion
        └────┬─────┘
             │
      ┌──────┴───────┐
      ▼              ▼
┌──────────┐   ┌──────────┐
│ Accepted │   │ Rejected │  kept forever — knowing what was
└────┬─────┘   └──────────┘  ruled out, and why, is the point
     │
     ▼
┌─────────────────────┐
│ Superseded by ADR-N │  the new ADR explains what changed
└─────────────────────┘
```

**An accepted ADR is immutable.** Do not rewrite history to match a new opinion.
When a decision changes:

1. Write a **new** ADR with the next number.
2. In the new ADR's *Relates-to*, add `Supersedes: ADR-NNNN`.
3. In the old ADR, change *Status* to `Superseded by ADR-NNNN` and update its
   *Date*. **Change nothing else in the old file.**

The trail of superseded ADRs is the project's reasoning history. It is the most
valuable thing in this directory, and it is exactly what an examiner asking
"why did you build it this way?" is looking for.

---

## When to write one

**Write an ADR when a choice is:**
- hard to reverse (data model, hosting platform, model architecture, dependency you build on),
- cross-cutting (touches both frontend and backend, or changes a contract),
- non-obvious (a future reader would reasonably ask "why not the other way?"),
- or a **deliberate trade-off**, especially one that accepts a known downside.

**Do not write an ADR for:**
- bug fixes — those are commits (see `../AUDIT.md`),
- code style or formatting — those are lint rules,
- anything with an obvious single answer,
- work in progress — ADRs record decisions, not plans.

**Rule of thumb:** if you would need a paragraph to explain the choice to a
teammate, and they might reasonably disagree, it is an ADR.

---

## Relationship to the other docs

```
docs/DECISIONS-PENDING.md    open questions, awaiting sign-off
            │
            │  ── decided ──►
            ▼
docs/adr/NNNN-*.md           the decision, its reasoning, and its cost   ◀── you are here
            │
            │  ── implemented ──►
            ▼
docs/memory-bank/00-project-state.md   updated to reflect the new ground truth
docs/AUDIT.md                          findings closed out
```

- **`../DECISIONS-PENDING.md`** — questions still open. Each resolved item should
  produce an ADR and be struck from that file.
- **`../AUDIT.md`** — problems found, not decisions made. An ADR may cite an audit
  finding as its Context.
- **`../memory-bank/`** — durable ground truth about what the system *is*. Update it
  after an ADR is implemented, so the two never drift apart.

---

## Expected first ADRs

Each maps to an open item in `../DECISIONS-PENDING.md`. Numbers are indicative, not
reserved — take the next unused integer when you actually write one.

| Likely # | Decision | Resolves |
|---|---|---|
| 0001 | Runtime vs. training dependency split | D-2 |
| 0002 | Render deployment configuration | D-2, D-11 |
| 0003 | Frontend→backend URL mechanism | D-3 |
| 0004 | Real data source for detection | D-1 |
| 0005 | Model artifact delivery | D-5 |
| 0006 | Persistence strategy | D-4 |
| 0007 | Causal method and honest labelling | D-6 |
| 0008 | Privacy and mental-health disclaimer posture | D-7 |
| 0009 | Which fabricated features get built, relabelled, or removed | D-8 |

---

## Further reading

The format here is a light adaptation of Michael Nygard's original
*Documenting Architecture Decisions* (2011), plus an explicit `Relates-to` section
so ADRs, audit findings, and pending decisions stay cross-linked.
