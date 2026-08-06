# 03 — Threaded Corpus Investigation: Reddit/PRAW vs. ConvoKit CGA

**Investigated:** 2026-08-06 · **Method:** web research, primary sources where reachable
**Question:** which threaded-conversation corpus should back the Postgres data layer for
follow-up / escalation detection?

**Prerequisite:** `02-followup-feasibility.md` — verdict RED. Current data has no reply
links, no target identity, no real timestamps, no persistence.

---

## ⚠️ Verification status — read before building on anything here

| Claim | Status |
|---|---|
| ConvoKit CGA field names, sizes, label granularity | ✅ **VERIFIED** — primary docs at `convokit.cornell.edu` |
| PRAW `Comment` attributes | ✅ **VERIFIED** — primary docs at `praw.readthedocs.io` |
| Reddit research policy (the decisive finding) | 🟡 **CORROBORATED, NOT PRIMARY** — Reddit's help pages return **HTTP 403** to automated fetching. Two independent searches returned *identical verbatim* policy language. High confidence, but **you should open the page in a browser and confirm before acting.** |
| Reddit free-tier rate limit (100 QPM) | 🟠 **WEAKLY SOURCED** — only from third-party SEO/marketing blogs. Not confirmed against Reddit's own docs. |
| CGA dataset licence (as distinct from ConvoKit's MIT code licence) | 🔴 **UNVERIFIED** — no licence statement found on any CGA doc page, in `datasets.rst`, or in the ConvoKit README |
| Wikipedia talk-page content licence (CC BY-SA) | 🔴 **UNVERIFIED** — not checked this session |
| Whether using CGA-CMV (Reddit-derived) inherits Reddit's research policy | 🔴 **UNVERIFIED — open question, possibly legal** |
| Reddit for Researchers eligibility for an undergraduate final-year project | 🔴 **UNVERIFIED** — the docs describe PI/university affiliation; student eligibility is not addressed |

---

# FIELD TABLE

| Field / capability | **Reddit via PRAW** | **ConvoKit CGA-WIKI** | **ConvoKit CGA-CMV / CMV-Large** |
|---|---|---|---|
| **Reply / parent link** | ✅ `parent_id` (`t1_`=comment, `t3_`=submission), `link_id` (submission), `.parent()` | ✅ `reply_to` (utterance id, `None` if thread root) | ✅ `reply_to` |
| **Conversation grouping** | ✅ `link_id` | ✅ `conversation_id` | ✅ `conversation_id` |
| **Timestamp** | ✅ `created_utc` (Unix, real) | ✅ `timestamp` (real) | ✅ `timestamp`, `retrieved_on` |
| **Stable author ID** | ✅ `author` (Redditor) | ✅ `speaker` (Wikipedia editor account name) | ✅ `speaker` (Reddit account name) |
| **Text** | ✅ `body` (Markdown) | ✅ `text` (+ `parsed` SpaCy Doc) | ✅ `text` |
| **Victim / target identification** | ❌ **none** | ❌ **none** | ❌ **none** |
| **Abuse / attack label — utterance level** | ❌ none (unlabelled live data) | ✅ **`comment_has_personal_attack`** — 3 crowdworkers | ❌ none |
| **Abuse / attack label — conversation level** | ❌ none | ✅ `conversation_has_personal_attack` (+ `verified`, `pair_verified`) | 🟡 `has_removed_comment` — moderator removed final comment for Rule 2 violation (proxy, not annotation) |
| **Escalation / turning-point structure** | ❌ none | ✅ **by construction** — see below | 🟡 implicit (derailment at thread end) |
| **Matched civil control** | ❌ none | ✅ `pair_id` — paired design | ✅ `pair_id` |
| **Train/val/test split** | ❌ n/a | ✅ `split` | ✅ `split` |
| **Size** | unbounded (live) | 4,188 conv · 30,021 utt · 8,069 speakers | CMV: 6,842 · 42,964 · 9,548 — **Large: 19,578 · 116,793 · 24,555** |
| **Cost** | free tier (🟠 weakly sourced) | free download | free download |
| **Policy risk for academic use** | 🔴 **HIGH — see below** | 🟢 low | 🟡 **unverified** (Reddit-derived) |

---

# 1. Reddit via PRAW

## 1.1 Thread structure — ✅ genuinely excellent

The fields are exactly what the data layer needs, and they are natively present:

- **`parent_id`** — ID of the parent, prefixed `t1_` for a comment or `t3_` for a submission. This is a true parent pointer.
- **`link_id`** — ID of the submission the comment belongs to (conversation grouping).
- **`created_utc`** — real Unix creation time.
- **`author`** — a `Redditor` instance; stable account identity.
- **`body`** — comment text in Markdown.
- Plus `id`, `score`, `subreddit`, `is_submitter`, `permalink`.
- `.parent()` returns the parent `Comment` or `Submission` directly.

**Caveat worth knowing:** PRAW's own docs state *"PRAW dynamically provides the attributes that Reddit returns via the API. Since those attributes are subject to change on Reddit's end, PRAW makes no effort to document any new/removed/changed attributes."* The fields above are documented as typical attributes, but the contract is Reddit's, not PRAW's.

**Practical note:** `.parent()` triggers a network request per call if the comment wasn't obtained via a `Submission`; the docs recommend refreshing every 9 levels when walking deep chains. Naive chain-walking burns rate limit fast.

On structure alone, Reddit is the better data model — richer and live. **The structure is not the problem.**

## 1.2 Rate limits and auth — 🟠 weakly sourced

Third-party sources consistently report **100 queries/minute per OAuth client ID** for approved free-tier (non-commercial) use, averaged over a rolling 10-minute window, with `X-Ratelimit-Used` / `-Remaining` / `-Reset` response headers, and commercial use at **$0.24 per 1,000 calls**. OAuth is required even for read-only access.

**I could not confirm any of this against Reddit's own documentation** — `support.reddithelp.com` returns 403 to automated fetching. Every source for these numbers is a marketing blog with an incentive to sell an alternative API. **Treat the figures as indicative only.**

## 1.3 Licensing / ToS — 🔴 **this is the blocker**

Two independent searches returned this language verbatim from Reddit's **Responsible Builder Policy** and **Developer Platform** pages:

> *"The only official and authorized avenue for performing research using Reddit data is through the Reddit For Researchers (RFR) program. Using developer tools, APIs, or unauthorized third-party tools for academic research is a violation of our policies."*

> *"Any research that uses Reddit data collected outside of the RFR Program is in violation of this policy."*

> *"Researchers must not retain copies of data beyond what is strictly necessary for the immediate research project."*

> *"You must not sell, license, share, or otherwise commercialize Reddit data without express written approval. This extends to commercial and non-commercial mining, scraping, or using data for purposes like ads targeting **or to train machine learning or AI models**."*

If accurate, this is disqualifying on three counts simultaneously:

1. **Using PRAW for academic research is itself stated as a policy violation.** RFR is described as the *only* authorized avenue.
2. **Training an ML model on Reddit data appears to require express written approval** — that is precisely what this project would do.
3. **Retention limits conflict with a persistent Postgres store**, which is the architecture follow-up detection requires.

**Reddit for Researchers** reportedly requires: affiliation with an accredited university, application from an institutional email address, a detailed proposal naming the specific subreddits of interest, **and a copy of IRB or equivalent ethics-committee approval or exemption**. For a 7th-semester project on a single-semester timeline, obtaining institutional ethics approval before you can begin collecting data is a serious schedule risk — and whether an undergraduate can apply at all is **not addressed** in the documentation I found.

> ### ⚠️ This corrects advice I gave you in `02-followup-feasibility.md`
>
> That report called Reddit via PRAW *"free, no paid tier, and by far the most tractable"* live option, flagged as an unverified lead. **On investigation that was wrong.** The API is technically excellent and the policy posture is hostile to exactly this use. I should not have called it tractable before checking the terms.

## 1.4 Labelling — you would build the corpus yourself

Reddit via PRAW gives **raw unlabelled conversations**. To reach a training corpus you would need to define an escalation/attack annotation scheme, label thousands of comments (or recruit annotators), measure inter-annotator agreement, and handle the ethics of annotating identifiable people's posts as abusive.

**Is there an existing labelled Reddit-harassment corpus that would avoid this?** Broadly, no — and the reason is directly relevant to your goal. A survey of publicly available cyberbullying datasets found that *"in most studies, annotators labeled individual messages instead of message threads, ignoring social context altogether"* and that most datasets *"contain only a single message or post among users, effectively labelling isolated aggression cases as cyberbullying."*

**That is your project's thesis, independently confirmed.** It also means thread-labelled harassment corpora are genuinely rare — which makes CGA's structure unusually valuable, and self-labelling unusually expensive.

Two leads I did **not** verify at field level, worth checking if you pursue self-labelling: *"Aggressive, Repetitive, Intentional, Visible, and Imbalanced: Refining Representations for Cyberbullying Classification"* (arXiv 2004.01820) and a ScienceDirect dataset paper on *"aggressive texts, repetition, peerness, and intent to harm"* — both explicitly model **repetition**, which is the follow-up dimension.

---

# 2. ConvoKit — Conversations Gone Awry

## 2.1 What it is — three corpora

| Corpus | Source | Conversations | Utterances | Speakers |
|---|---|---|---|---|
| **CGA-WIKI** | Wikipedia talk pages | 4,188 | 30,021 | 8,069 |
| **CGA-CMV** | r/ChangeMyView | 6,842 | 42,964 | 9,548 |
| **CGA-CMV-Large** | r/ChangeMyView, through 2022 | **19,578** | **116,793** | **24,555** |

The docs recommend CGA-CMV-Large over CGA-CMV.

*(Note: the original Zhang et al. 2018 paper describes ~1,270 conversations. The 4,188 figure reflects a second annotation round — hence the `annotation_year` field with values `"2018"` and `"2019"`.)*

## 2.2 Record contents — ✅ verified verbatim

**Utterance level (CGA-WIKI)** — required fields:
`id` · `speaker` · `conversation_id` · `reply_to` · `timestamp` · `text`

Additional metadata:
- **`comment_has_personal_attack`** — whether this comment was judged by **3 crowdsourced annotators** to contain a personal attack
- `is_section_header` — whether the utterance is a conversation title/subject
- `parsed` — pre-parsed SpaCy `Doc`

**Conversation level (CGA-WIKI):**
`page_title` · `page_id` · **`pair_id`** · **`conversation_has_personal_attack`** · `verified` (double-checked by an internal annotator) · `pair_verified` · `annotation_year` · `split`

**Speakers:** Wikipedia editor account names.

**CGA-CMV / CMV-Large** carry the same required utterance fields plus Reddit-inherited metadata (`score`, `top_level_comment`, `retrieved_on`, `gilded`, `stickied`, `permalink`, `author_flair_text`), and conversation-level `pair_id`, `has_removed_comment`, `split`, and (Large) `summary_meta`.

## 2.3 What exactly is labelled — the decisive difference

**CGA-WIKI is labelled at BOTH granularities:**

- **Conversation level** — `conversation_has_personal_attack`: did this conversation derail?
- **Utterance level** — `comment_has_personal_attack`: does *this specific comment* contain a personal attack, per 3 crowdworkers?

**This directly answers your question about whether it can train escalation detection specifically. It can, at both levels** — you can train "will this conversation derail?" *and* "is this particular comment the attack?"

**CGA-CMV / CMV-Large are labelled only at conversation level**, and by a *proxy*: `has_removed_comment` = a moderator removed the final comment for violating CMV's Rule 2. That is a real-world signal, not an annotation — cheaper, noisier, and with no per-comment labels.

## 2.4 The construction is a turning-point design — this is the key finding

CGA-WIKI conversations were extracted from WikiConv using an automatic toxicity measure:

> a conversation is a **derailment** sample if the **Nth comment scores toxicity > 0.6 and all preceding comments score < 0.4**; a **non-derailment** sample has all comments < 0.4.

Crucially: *"human annotations are used to ensure that all comments preceding a personal attack are civil"* — explicitly so that models *"actually capture conversational dynamics rather than detecting already-existing toxicity."*

Each derailing conversation is **paired** (`pair_id`) with a civil conversation from the same talk page, giving a balanced, confound-controlled design. The canonical task shows a model the **first two comments** and asks it to predict which conversation will derail.

**This is precisely follow-up/escalation detection as a supervised problem:** a conversation that is civil, then turns. The corpus was purpose-built to force models to detect the *trajectory*, not the toxic words. You will not find a closer structural match, and the anti-shortcut control is exactly the discipline your project needs after the rigged-mock-data finding.

## 2.5 Licence and citation

- **ConvoKit itself: MIT licence.** ✅ verified.
- **The datasets: no licence statement found** on any CGA doc page, in `datasets.rst`, or in the README. The README says to *"acknowledge the work tied to the respective component"*. 🔴 **UNVERIFIED — resolve before publishing.**
- **Citation required:**
  - ConvoKit — Chang, Chiam, Fu, Wang, Zhang, Danescu-Niculescu-Mizil (2020), *"ConvoKit: A Toolkit for the Analysis of Conversations"*, SIGDIAL
  - CGA — Zhang et al. (2018), *"Conversations Gone Awry: Detecting Early Signs of Conversational Failure"*, ACL
  - Forecasting variant — Chang & Danescu-Niculescu-Mizil (2019), *"Trouble on the Horizon"*, EMNLP

## 2.6 Mapping onto your target phenomena — honest scoring

| Target phenomenon | CGA-WIKI |
|---|---|
| **Reply chains** | ✅ `reply_to` + `conversation_id`, real tree structure |
| **Turning point where an attack begins** | ✅ **the dataset's entire design** — labelled at utterance level |
| **Multiple speakers** | ✅ 8,069 speakers; multi-party conversations |
| **Escalation within a conversation** | ✅ directly supported, directly labelled |
| **Swarm (N attackers → 1 victim)** | 🟡 **computable, not labelled** — `speaker` + `comment_has_personal_attack` lets you count distinct attackers per conversation, but no swarm ground truth exists |
| **Victim identity** | ❌ **not labelled** — see below |
| **Escalation across conversations / repeat victimisation** | ❌ conversations are self-contained; no cross-conversation victim tracking |

---

# 3. The gap neither source fills

**Neither corpus labels the victim.**

`comment_has_personal_attack` tells you a comment *contains* an attack. It does not tell you *who it was against*. Reddit's API has no target field either — only an author. This is the same missing field the RED feasibility finding identified, and **no off-the-shelf corpus supplies it.**

You would have to derive it. Two heuristics, both imperfect and both requiring validation:

1. **Reply-based** — if an attacking utterance has `reply_to = X`, the speaker of `X` is the likely target. Cheap, and correct in most dyadic exchanges; wrong when the attack targets a third party or the thread generally.
2. **Mention-based** — parse `@handle` / username mentions in the attack text.

**This is the single largest piece of work either path leaves you.** Budget for it explicitly, validate the heuristic against a hand-checked sample, and report the derivation as a stated method limitation — do not present derived victim IDs as ground truth. That would be the same class of error the audit already caught once.

---

# 4. Verdict

## ConvoKit **CGA-WIKI** is the right primary corpus. It is not close.

**Why:**

1. **It is labelled for exactly your problem, at both granularities.** Conversation-level derailment *and* utterance-level personal attack. Reddit gives you zero labels and a labelling project you have no time for.
2. **The turning-point construction is the escalation phenomenon**, built with an explicit control against shortcut learning — models are forced to read trajectory, not toxicity.
3. **The paired design (`pair_id`) gives you matched civil controls for free**, which is the difference between "our model finds toxic words" and "our model detects derailment."
4. **Free, downloadable, fixed, and reproducible.** One `download()` call, no OAuth, no rate limits, no keys, no ethics application. An examiner can rerun your work.
5. **It is Wikipedia, not Reddit** — which sidesteps the policy problem entirely.
6. **It is published, peer-reviewed, and citable** (ACL 2018 / EMNLP 2019), which strengthens a final-year submission rather than raising questions.

## The honest catch of each

**CGA-WIKI's catches — real, and you should state them in your report:**

- **Domain mismatch.** These are Wikipedia editors in edit disputes, not teenagers cyberbullying a classmate. "Personal attack in an encyclopaedia governance argument" is not the same phenomenon as adolescent cyberbullying. **Your project's framing will need to change, or you accept a documented domain gap.** Do not silently present Wikipedia-trained results as cyberbullying detection.
- **Long-form text.** Talk-page comments are paragraphs, not tweets. Features and thresholds will not transfer directly from the Kaggle tweet model.
- **No victim labels** (§3).
- **No cross-conversation repeat victimisation** — self-contained conversations only, so "same victim attacked again next week" is out of scope.
- **Licence unstated** 🔴 — must be resolved before publishing results.
- **Modest size** — 4,188 conversations is small for deep learning, but ample for the classical models ADR-0001 selects.

**Reddit/PRAW's catches:**

- **Policy appears to prohibit it** (§1.3) — the decisive issue, not the technical one.
- Unlabelled: months of annotation work.
- Retention limits conflict with a persistent store.
- Ethics approval likely required before collection begins.

## Should you use both? Yes — but not as a 50/50 split

**Three sources, three distinct jobs:**

| Corpus | Job | Status |
|---|---|---|
| **Kaggle Cyberbullying Classification** (ADR-0001) | Stage-1 **single-utterance** bullying scorer. Tweet-domain, matches the product framing. | already decided |
| **CGA-WIKI** | Stage-2 **conversation-level escalation / derailment** detector, with the turning point as supervision. | **recommended — needs sign-off** |
| **CGA-CMV-Large** | Optional **scale-up / cross-domain generalisation check** (117k comments, Reddit register). Conversation-level labels only. | optional |

That two-stage split is architecturally clean and it is a genuinely good result to present: a per-message classifier feeding a conversation-level trajectory model, each trained on a corpus suited to it, with a stated domain gap between them.

**Reddit via PRAW: recommend dropping**, unless you have a reason to pursue RFR that I am not seeing.

## ⚠️ One caution on CGA-CMV / CMV-Large

Both are **Reddit-derived**, redistributed by Cornell. Whether using them for ML training inherits Reddit's research policy — given the reported clause on *"using data ... to train machine learning or AI models"* — is **UNVERIFIED and possibly a legal question, not a technical one.**

**CGA-WIKI does not raise it at all.** That is one more reason to make CGA-WIKI primary and treat the CMV corpora as optional extras pending clarification.

---

# 5. What I need from you

| # | Decision | Why it's yours |
|---|---|---|
| 1 | **Confirm CGA-WIKI as the escalation corpus** | Changes the ADR-0001 landscape and the schema you're about to design |
| 2 | **Accept or reject the Wikipedia domain gap** | It changes what the project can honestly claim. If unacceptable, we need a different corpus and this investigation reopens. |
| 3 | **Verify the Reddit policy language in a browser** | I could not reach the primary source (403). Decisive enough to confirm firsthand. |
| 4 | **Decide whether CGA-CMV-Large is in scope** | Pending the Reddit-derivation question above |
| 5 | **Resolve the CGA dataset licence** 🔴 | Unverified; blocks publication, not development |

**Verified enough to design against now:** CGA-WIKI's field list, sizes, and label granularity (§2.2, §2.3). Those come from primary documentation and are safe schema inputs. Everything flagged 🟠 or 🔴 above is not.

## Cross-references

- `02-followup-feasibility.md` — RED verdict; §1.3 here **corrects** its Reddit recommendation
- `docs/adr/0001-*` (draft) — Context still needs the "Kaggle corpus contains no follow-ups" amendment; this report supplies the companion corpus
- `DECISIONS-PENDING.md` — **D-1** (data source) extends to a second corpus; **D-4** (database) confirmed required; **D-7** (ethics) materially eased by choosing Wikipedia over live social data

## Sources

- [ConvoKit — CGA-WIKI dataset docs](https://convokit.cornell.edu/documentation/awry.html)
- [ConvoKit — CGA-CMV dataset docs](https://convokit.cornell.edu/documentation/awry_cmv.html)
- [ConvoKit — CGA-CMV-Large dataset docs](https://convokit.cornell.edu/documentation/awry_cmv_large.html)
- [ConvoKit — dataset index](https://convokit.cornell.edu/documentation/datasets.html)
- [ConvoKit GitHub (MIT licence, citation)](https://github.com/CornellNLP/ConvoKit)
- [ConvoKit `datasets.rst`](https://github.com/CornellNLP/ConvoKit/blob/master/docs/source/datasets.rst)
- [PRAW — Comment model docs](https://praw.readthedocs.io/en/stable/code_overview/models/comment.html)
- [Reddit Help — Responsible Builder Policy](https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy) *(403 to automated fetch; open in browser)*
- [Reddit Help — Developer Platform & Accessing Reddit Data](https://support.reddithelp.com/hc/en-us/articles/14945211791892-Developer-Platform-Accessing-Reddit-Data) *(403)*
- [Reddit Help — Reddit for Researchers Program](https://support.reddithelp.com/hc/en-us/articles/49381918834964-Reddit-for-Researchers-Program) *(403)*
- [Zhang et al. 2018, "Conversations Gone Awry" (ACL)](https://www.researchgate.net/publication/334116118_Conversations_Gone_Awry_Detecting_Early_Signs_of_Conversational_Failure)
- [Chang & Danescu-Niculescu-Mizil 2019, "Trouble on the Horizon" (EMNLP)](https://arxiv.org/pdf/1909.01362)
- [Cyberbullying dataset survey — single-message labelling limitation](https://arxiv.org/pdf/2605.27584)
- [Refining Representations for Cyberbullying Classification (repetition dimension)](https://arxiv.org/pdf/2004.01820)
