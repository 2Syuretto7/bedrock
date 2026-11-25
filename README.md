# Bedrock

A personal university for one learner. It starts at place value and ends at the engineering done at frontier AI labs and top technology companies: software, distributed systems and the cloud, data, machine learning in production, hardware and high-performance computing, and security and reliability, all resting on a foundation of mathematics.

Bedrock is an independent copy of [Axiom](https://github.com/2Syuretto7/axiom) with new subject matter: the same stack, lesson form, question types, tutor, recall, mastery and checks. It shares no code or data with Axiom at run time.

## Curriculum

583 lessons in 65 clusters across seven tracks, defined in `graph/`:

| Track | File | Clusters | Lessons |
| --- | --- | --- | --- |
| F Foundations | `graph/foundations.yaml` | 11 | 103 |
| S Software engineering | `graph/software.yaml` | 9 | 86 |
| D Distributed systems and cloud | `graph/distributed.yaml` | 11 | 110 |
| Q Data engineering | `graph/data.yaml` | 9 | 76 |
| M MLOps | `graph/mlops.yaml` | 7 | 57 |
| H Hardware and HPC | `graph/hardware.yaml` | 10 | 86 |
| R Security and reliability | `graph/security.yaml` | 8 | 65 |

Every cluster requires the one before it on the route, so Learn walks all 583 lessons as one chain, each lesson listing the one before it as a direct prerequisite. `tests/unit/graph.test.ts` walks the whole graph as if every lesson were written and fails if the chain breaks, if a lesson cannot be reached, or if the order of clusters changes. Some lessons also require an earlier idea from another cluster, so that hashing, for example, returns in consistent hashing, hash joins and caches. The route, cluster by cluster, is in [ROADMAP.md](ROADMAP.md).

## Run locally

```bash
cp .env.example .env.local   # point DATABASE_URL at a local Postgres
npm install
npm run migrate
npm run dev
```

## Checks

| Command | What it does |
| --- | --- |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm run lessons` | Checks every lesson and mini-capstone: bridges, answers, predicted outputs, reference solutions and hidden tests, run under the same Python the browser uses |
| `npm test` | Unit and database tests (Vitest) |
| `npm run e2e` | Builds the app and runs browser tests at laptop, tablet and phone sizes |
| `LIVE_URL=... npm run e2e` | Read-only smoke test of the deployed site |

Every pull request gets a Vercel preview with its own Neon database branch. The build applies the migrations to that branch, and on Vercel it fails if `DATABASE_URL` or `ANTHROPIC_API_KEY` is missing, so a preview that deploys successfully has a migrated database and the tutor's key. Previews stay behind Vercel's login; nothing merges unless that deployment and CI both pass. After each deployment to main, `.github/workflows/production.yml` runs the live smoke test against the public site.

## Mini-capstones

A mini-capstone closes a cluster. It is one small project in stages that needs several of the cluster's lessons at once, and it teaches nothing new. Learn gives it straight after the lesson that finishes the cluster. One lives at `content/capstones/<cluster>.yaml`, and its questions use the same format and checks as a lesson's.

What is planned after them, larger capstones and job-readiness, is in [ROADMAP.md](ROADMAP.md).

## Bridges

When a lesson has a direct prerequisite in another track, the lesson file must have a `bridges` entry for it, keyed by that prerequisite's concept id: a short passage, at most 120 words, on how the earlier idea connects to this lesson. Learn shows it at the top of the lesson when that prerequisite was the lesson finished just before. `npm run lessons` fails if an entry is missing, or if one is written for anything other than a direct prerequisite in another track.

## Recall, by spaced repetition

Every lesson opens with a Recall part, and its questions are one set of exactly three, no more and no fewer. They are not written in the lesson files: a lesson's `recall` part holds only its opening words, and the lesson check refuses a question there. Which earlier ideas the three ask about is chosen by spaced repetition. A finished lesson is not given again as a screen of its own.

The ideas that are due come first, the most forgotten first. If fewer than three are due, the ideas due soonest fill the set. The three are on three different ideas whenever three earlier lessons are finished. After only one or two finished lessons an idea is asked about more than once, each time with a different question. The very first lesson has no earlier idea, so it alone has no recall questions.

When an idea is due is decided by the FSRS-4.5 memory model (`src/lib/review/schedule.ts`), which brings it back when the chance of recalling it has fallen to 90%: about 4 days after its lesson is finished, then about 2 weeks, 7 weeks and 20 weeks if it is recalled each time, and within days if it is missed.

Each idea is recalled with one question, one try and no hints. The question is always new: it is written by the model for that one occasion, from the idea's lesson and the list of every recall question the learner has already had on it. It is shown only if it is not a repeat of any of those or of the lesson's own questions, and if a second, independent pass that is not told the answer solves it and reaches the same answer. Once answered, a question is never shown again. If a new question cannot be written, its place stays empty until the next visit; an old question is never used instead.

These questions do not count towards finishing the lesson they appear in. They need `ANTHROPIC_API_KEY`, like the tutor, and each question's cost is recorded in `review_questions`.

## Timed and untimed questions

System One questions (`system: s1`, shown as Quick) are fast retrieval, so they are timed. A timed question is hidden until the learner presses Start, then a countdown runs: 30 seconds for a choice, 60 for a number, a prediction or an ordering, 3 minutes for code, or the question's own `seconds`. If the time runs out the attempt is a miss; a lesson question can be started again, and a fresh recall question, which gets one try, is missed. The limit is enforced on the server.

System Two questions (`system: s2`, shown as Think) are slow reasoning. They are never timed, and no time is measured or stored for them.

## Mastery and consolidation

Mastery of a lesson is a number from 0 to 100%, worked out from the record of answers each time it is shown and never stored (`src/lib/learning/mastery.ts`). It weighs:

- accuracy: a question solved at the first try counts in full, and each wrong try before the right one counts against it;
- hints: each hint the tutor gave on a question before it was solved counts against it (`attempts.hints_used`);
- speed: on a timed (System One) question, an answer in the first half of the time counts in full and a slower one counts for less. Untimed (System Two) questions have no speed;
- recency: newer answers weigh more than older ones, with a half-life of 30 days, and mastery fades by the forgetting curve until the idea is recalled. The fresh recall questions answered on the lesson later count too.

Solving every question is no longer enough to finish a lesson. If every question is solved but the lesson's quality is below 70%, the finish is weak: the lesson stays open and a consolidation set appears at its end. That is three fresh questions on the same lesson, written and checked like recall questions, timed, one try each, never seen before and never shown again. The lesson is finished when all three are answered. If most of the set is missed, the lesson's first recall comes in about a day instead of about four.

Mastery is shown when a lesson is finished and beside each finished lesson on the Map. Mini-capstones are finished as before. Without `ANTHROPIC_API_KEY` no consolidation set can be written, so a lesson is never held open for one.

## Tutor

The tutor sits beside the lesson and the editor (a third tab on a phone). It is told the lesson in progress, the lessons already finished and what comes next. With each message it is also told which questions are solved, every answer given to each question so far, the question last worked on, and the code in the editor.

It first works out what a message is about, and answers accordingly:

- A question not yet solved. The tutor never gives the solution. It judges whether the learner can solve the question without help. If so, it does not nudge at all. If not, it gives one hint written for that moment. It does not discuss the question openly until the question is solved.
- A solved question. Open discussion: the answer, other approaches, where the idea leads.
- The lesson but not a question. It teaches in full.
- Anything else. It answers plainly.

There is no hint ladder. Lessons carry no prepared hints and questions have no Hint button; the tutor is the only source of hints. Each reply opens with a line the learner never sees, in which the tutor states what it judged the message to be about and whether it gave a hint (`src/lib/tutor/turn.ts`). That judgement is stored with the reply in `tutor_messages`, and `attempts.hints_used` records how many hints the tutor had given on a question when each answer was submitted. This is the hint signal that mastery reads.

It needs `ANTHROPIC_API_KEY` in the deployment. It runs on Claude Opus 5.5, always at medium effort (`BEDROCK_TUTOR_MODEL` changes the model; the effort is fixed). Its spend is not capped; the cost of each reply is recorded in `tutor_messages`. Tests use a stand-in for the API (`tests/e2e/mock-anthropic.mjs`), so CI needs no key.

## Layout

- `migrations/` plain SQL, applied in order by `scripts/migrate.ts` during every build
- `src/lib/auth/` passphrase generation, Argon2id hashing, sessions, rate limiting
- `src/app/` screens: home, sign-in, learn
- `content/` the lessons and mini-capstones, and `graph/` the seven tracks: clusters, lessons and what each needs
- `src/lib/capstones/` the mini-capstone format and its checks
- `src/lib/review/` spaced repetition: which earlier ideas a lesson's Recall part brings back, and the fresh question written for each
- `src/lib/tutor/` the tutor beside each lesson: what it is told, what it costs, its conversation
- `tests/` unit tests and browser tests

The EFF large word list in `src/lib/auth/eff-wordlist.json` is published by the Electronic Frontier Foundation under CC BY 3.0 US.
