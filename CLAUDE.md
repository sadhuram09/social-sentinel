# CLAUDE.md — social-sentinel

Index file, auto-loaded each session. **Not a knowledge dump** — the four documents
linked below are the source of truth. Read them before acting; do not re-derive
facts they already establish.

---

## What this project is

A cyberbullying-detection and mental-health-impact visualisation system. Final-year
project. Flask + Socket.IO backend, React 19 + Vite frontend, three 3D
visualisation surfaces (force-directed network, globe, d3 echo chamber).

- **Phase 1 (6th sem) — done.** Runs end to end on complete **mock** data.
- **Phase 2 (7th sem) — current.** Make it real, deployed, and next-level.

**Current state in one line:** the frontend is deployed on Vercel and works; the
Render backend deploy is broken; detection is a 12-keyword substring match, not a
model.

---

## Source of truth — read these first

| Document | What it holds |
|---|---|
| 👉 [`docs/memory-bank/05-session-handoff.md`](docs/memory-bank/05-session-handoff.md) | **READ FIRST.** Where we are, what happened last session, the exact next step, and the working method. |
| [`docs/memory-bank/00-project-state.md`](docs/memory-bank/00-project-state.md) | Stack map, HTTP contract, data flow, run instructions. **Durable ground truth.** |
| [`docs/memory-bank/01-mock-data-inventory.md`](docs/memory-bank/01-mock-data-inventory.md) | Every mock/hardcoded/stub site — 26 active mocks, 7 empty stubs, with file:line |
| [`docs/AUDIT.md`](docs/AUDIT.md) | 39 findings ranked CRITICAL/HIGH/MEDIUM/LOW, plus the README-vs-code reconciliation |
| [`docs/DECISIONS-PENDING.md`](docs/DECISIONS-PENDING.md) | 11 open questions, each with a recommendation; 9 need the user's sign-off |
| [`docs/adr/`](docs/adr/) | ADR scaffold. Template + conventions. **No real ADRs written yet.** |

There is no README. `README.md` at the repo root is **0 bytes** — in the working
tree and in `HEAD`. `frontend/README.md` is the unmodified Vite starter template.
**Never cite either as a source.** All project claims live in shipped UI copy; the
gaps between those claims and the code are catalogued in `AUDIT.md` §RECONCILIATION.

---

## Planned sequence — recorded, not yet started

**Each step is reviewed before the next begins. Do not run ahead.**

```
1 ── Clean local run of backend + frontend          ← next up
2 ── Fix the Render backend deploy
3 ── Replace mock data with real detection
4 ── UI / 3D / next-level features
```

Findings and decisions are mapped to these steps in `AUDIT.md` § *Fix-order
recommendation* and at the head of `DECISIONS-PENDING.md`.

---

## Facts worth having in context immediately

- **`Analyze.jsx:24`** uses single quotes around a template literal, so the app's
  flagship feature has **never once reached the backend** — it silently renders a
  hardcoded HIGH-RISK result for every input, in dev and in production. One
  character-class fix. `AUDIT.md` C-2.
- **No model artifacts exist and none can be produced.** `ml/artifacts/` is absent
  *and* gitignored; both training scripts are 0-byte files. Every score the system
  has ever produced is a substring count. `AUDIT.md` C-3.
- **12 of 18 backend dependencies are unused**, including `torch` (~2.5 GB) and
  `transformers` — the most likely cause of the Render build failure. `AUDIT.md`
  C-1, H-1.
- **`VITE_BACKEND_URL` appears exactly once in the repo** (`utils/api.js:2`), with
  no `.env`, no `.env.example`, and no `vercel.json` env block. `AUDIT.md` C-4.
- **The mock feed was authored to match the mock detector** — `BULLY_POOL` strings
  contain the exact keywords `BULLY_KW` searches for. The demo looks accurate while
  measuring nothing. `01-mock-data-inventory.md` M-01, M-07.
- **No tests, no CI.** Anywhere. `AUDIT.md` H-8.
- **The backend's last real deploy target was Hugging Face Spaces**, not Render —
  commit `82b9fc7` set `run.py`'s default port to 7860. No Render artifact exists in
  the repo.

---

## Environment

Runs in **WSL2 (Ubuntu 24.04.3) on Windows**. Repo lives at `/mnt/c/...` (Windows
DrvFs). Commands that differ from native Linux/macOS:

| | |
|---|---|
| Python | **`python3` only — `python` is not on PATH.** A venv is mandatory (PEP 668 / externally-managed). `python3-venv` may need `apt install`. |
| Node | v22.23.1 · npm 10.9.8 |
| Docker | **unavailable** — Docker Desktop WSL integration is off for this distro |
| Ports | backend defaults to **7860**, frontend expects **5000** → run backend as `PORT=5000 python3 run.py` |
| Git noise | ~42 files show as modified with CRLF-only diffs; no content is actually pending |

Full detail, including the WSL-vs-native comparison table: `00-project-state.md` §D.

---

## Working agreements

- **Read the actual file before asserting anything about it.** These docs cite
  `file:line` throughout — verify rather than paraphrase.
- **Respect the step gate.** Finish and get review on step *n* before starting *n+1*.
- **Do not resolve a `DECISIONS-PENDING.md` item marked 🔒 unilaterally.**
  Nine of eleven need the user's sign-off.
- **Do not silently add mock data.** If something needs a stub to proceed, say so
  explicitly — this codebase's central problem is fabricated data that reads as
  real.
- **Keep the docs current.** When an ADR is implemented, update
  `00-project-state.md` and close the corresponding `AUDIT.md` finding, so ground
  truth and code never drift apart.
