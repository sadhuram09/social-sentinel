# ADR-0000: <Short noun phrase naming the decision>

<!--
COPY THIS FILE to create a new ADR. Do not edit this template in place.

  cp docs/adr/0000-template.md docs/adr/0001-my-decision.md

Filename: NNNN-kebab-case-title.md  — number is the next unused integer, zero-padded to 4.
Title: name the DECISION, not the problem.
  ✅ "0003-tfidf-xgboost-for-bullying-classification"
  ❌ "0003-how-should-we-classify-bullying"

See README.md in this directory for the full convention.
-->

## Status

<!-- One of: Proposed | Accepted | Rejected | Superseded by ADR-NNNN | Deprecated -->

Proposed

## Date

<!-- YYYY-MM-DD — the date this status was last set, not the date drafting started. -->

YYYY-MM-DD

## Context

<!--
The forces at play. Write this so someone with no memory of the discussion can
judge whether the decision still holds.

Include:
  - What problem or constraint forced a decision to be made now.
  - The relevant facts about the current system — CITE FILE:LINE. This repo's
    ground truth lives in docs/memory-bank/; link to the specific finding.
  - Constraints that narrowed the field: cost, deadline, hosting limits, rubric
    requirements, data availability, ethics.
  - What was NOT known at the time. Be explicit about uncertainty — a future
    reader needs to know which parts were judgement calls.

Describe the situation. Do not argue for the outcome here — that belongs below.
-->

## Decision

<!--
What was decided, in active voice: "We will ..."

Be specific enough to be checkable. Someone should be able to read this and tell
whether the codebase complies.

  ✅ "We will pin gunicorn to a single worker (-w 1) because StreamGenerator is a
      module-level singleton (backend/app/services/stream_generator.py:116-122).
      Raising the worker count requires introducing a Redis message queue first."
  ❌ "We will be careful with worker configuration."

If options were weighed, list them and say why the alternatives lost. One or two
lines each is enough — this is the part future-you will actually reread.
-->

## Consequences

<!--
What becomes true once this is in effect. Include the bad with the good — an ADR
with no downsides listed is an ADR nobody trusts.

**Positive**
- ...

**Negative / accepted trade-offs**
- ...

**Follow-on work this creates**
- ...

**What would make us revisit this**
- The condition or signal that should trigger a superseding ADR.
-->

## Relates-to

<!--
Links. Delete lines that do not apply.

- Supersedes: ADR-NNNN
- Superseded by: ADR-NNNN
- Depends on: ADR-NNNN
- Resolves: docs/DECISIONS-PENDING.md → D-N
- Addresses: docs/AUDIT.md → C-N / H-N / M-N / L-N
- Evidence: docs/memory-bank/00-project-state.md § / docs/memory-bank/01-mock-data-inventory.md M-NN
- Phase 2 step: 1 clean local run | 2 fix Render deploy | 3 replace mock data | 4 UI / 3D
-->
