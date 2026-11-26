# Roadmap

What is built, what comes next and in what order. The curriculum itself, every cluster and what it needs, is in `graph/`.

## Lessons

Written: F0, number sense for engineers (nine lessons), S0, first programs (ten lessons), H0, bits and data representation (eight lessons), F1, algebra and functions (ten lessons), S1, Python proper (ten lessons), F2, logic, sets and proof (ten lessons), S2, data structures (ten lessons), F3, discrete mathematics (ten lessons), F4, probability (thirteen lessons), F5, statistics for engineers (nine lessons), S3, algorithms (thirteen lessons), Q0, relational model and SQL (ten lessons), and Q1, data modelling (seven lessons), each with its mini-capstone: 129 of 583 lessons in all. Next: S4, software design.

Content is written one whole cluster at a time, in the order Learn walks the clusters, each batch with its mini-capstone and any new figures. The lessons written must always be the start of this route, so no cluster is merged before the one it follows.

| # | Cluster | Lessons |
| --- | --- | --- |
| 1 | F0 Number sense for engineers | 9, written |
| 2 | S0 First programs | 10, written |
| 3 | H0 Bits and data representation | 8, written |
| 4 | F1 Algebra and functions | 10, written |
| 5 | S1 Python proper | 10, written |
| 6 | F2 Logic, sets and proof | 10, written |
| 7 | S2 Data structures | 10, written |
| 8 | F3 Discrete mathematics | 10, written |
| 9 | F4 Probability | 13, written |
| 10 | F5 Statistics for engineers | 9, written |
| 11 | S3 Algorithms | 13, written |
| 12 | Q0 Relational model and SQL | 10, written |
| 13 | Q1 Data modelling | 7, written |
| 14 | S4 Software design | 9 |
| 15 | S5 Tools of the trade | 8 |
| 16 | S6 Testing | 10 |
| 17 | S7 Languages and interpreters | 8 |
| 18 | H1 Computer architecture | 10 |
| 19 | H2 Operating systems | 9 |
| 20 | D0 Concurrency | 10 |
| 21 | F6 Queueing and performance modelling | 10 |
| 22 | D1 Networking | 12 |
| 23 | D2 Time, order and failure | 9 |
| 24 | F7 Information, coding and compression | 8 |
| 25 | Q2 Storage engines | 9 |
| 26 | Q3 Query processing | 10 |
| 27 | Q4 Transactions and concurrency control | 8 |
| 28 | D3 Replication | 11 |
| 29 | D4 Consensus | 10 |
| 30 | D5 Partitioning and distributed data | 10 |
| 31 | D6 Distributed storage | 9 |
| 32 | F8 Number theory for cryptography | 8 |
| 33 | R0 Cryptography fundamentals | 12 |
| 34 | R1 Threat modelling | 6 |
| 35 | R2 Secure coding | 10 |
| 36 | R3 Observability | 8 |
| 37 | R4 Reliability engineering | 9 |
| 38 | R5 Incident response | 6 |
| 39 | R6 Chaos engineering and verification | 7 |
| 40 | H3 Linux and C | 13 |
| 41 | H4 Memory hierarchy and caches | 9 |
| 42 | H5 Performance engineering | 7 |
| 43 | S8 Arrays and vectorised computing | 8 |
| 44 | F9 Linear algebra for computing | 8 |
| 45 | F10 Calculus and optimisation | 8 |
| 46 | H6 SIMD and vector processing | 6 |
| 47 | H7 Parallel programming | 7 |
| 48 | H8 GPUs and CUDA | 11 |
| 49 | M0 Machine learning essentials | 9 |
| 50 | M1 Experiment tracking and reproducibility | 8 |
| 51 | D7 Containers and virtualisation | 9 |
| 52 | D8 Orchestration | 9 |
| 53 | M2 Training infrastructure | 10 |
| 54 | H9 Accelerators and interconnects | 6 |
| 55 | D9 Cloud architecture | 12 |
| 56 | Q5 Batch processing | 8 |
| 57 | Q6 Stream processing | 9 |
| 58 | Q7 Pipelines and orchestration | 8 |
| 59 | Q8 Analytical systems | 7 |
| 60 | M3 Model serving | 10 |
| 61 | M4 Monitoring models | 7 |
| 62 | M5 Evaluation in production | 7 |
| 63 | M6 ML platforms | 6 |
| 64 | R7 Systems and network security | 7 |
| 65 | D10 Large-scale system design | 9 |

## Phases

Each phase ends with a deployed version that can be used from the first lesson to the last one written.

| Phase | Engine | Content | State |
| --- | --- | --- | --- |
| P0 The engine | Axiom's engine copied and renamed; the 65-cluster graph; four fresh migrations; the copper theme; CI and the production check; server-recorded Start for timed questions; typed figure props; the `log-scale` figure; the preview-only figure gallery, checked at three sizes in CI | F0 | Built; waiting on the live site check |
| P1 Program and reason | The era 1 figures, starting with `step-through` (a short program run a line at a time, with every name's value and the output so far) | S0, H0, F1, S1, F2, S2, F3, F4, F5, S3 | Content written: S0, H0, F1, S1, F2, S2, F3, F4, F5 and S3, with `binary-counter`, `struct-padding`, `triangle-sum`, `full-adder`, `search-tree`, `trie`, `graph-storage`, `union-find`, `choice-tree`, `pascal-triangle`, `pigeonholes`, `inclusion-exclusion`, `mod-clock`, `euclid-squares`, `tower`, `bound-witness`, `one-stroke`, `leaf-strip`, `dice-grid`, `bayes-square`, `variable-bars`, `distribution-bars`, `density-area`, `birthday-curve`, `tail-bounds`, `sample-means`, `monte-carlo`, `summary-marks`, `tail-plot`, `histogram-bins`, `estimator-spread`, `interval-catch`, `null-test`, `bootstrap`, `ab-test`, `benchmark-runs`, `recursion-tree`, `spanning-tree`, `interval-schedule`, `quick-pivot` and `tour-heuristic` |
| P2 SQL and the machine | `sql` and `asm` runtimes; the `bedrock` simulator core (event loop, threads, caches, queues); the Trace tab | Q0, Q1, S4, S5, S6, S7, H1, H2, D0, F6 | Content written: Q0, with `table-keys`, `algebra-ops`, `query-order`, `join-match`, `group-buckets`, `subquery-steps`, `window-frame`, `three-valued`, `transfer-crash` and `index-lookup`; and Q1, with `er-cardinality`, `fd-closure`, `normalise-steps`, `denorm-tradeoff`, `doc-embed`, `graph-hops` and `schema-versions`. Q0's and Q1's queries run on SQLite through Python's `sqlite3` module, which the Python runtime already provides, so neither needed a separate `sql` runtime; the `asm` runtime, the simulator core and the Trace tab are not started |
| P3 Networks and storage | Network, node and checking simulators; the seed-sweep check; the larger-capstone engine | D1, D2, F7, Q2, Q3, Q4, capstone C1 | Not started |
| P4 Distributed data | Linearisability checking and fault shrinking at full strength | D3, D4, D5, D6, capstones C2 and C3 | Not started |
| P5 Security and reliability | Attacker and observability simulators | F8, R0, R1, R2, capstone C4, R3, R4, R5, R6 | Not started |
| P6 Real machines | The Vercel Sandbox runner; `c` and `shell` runtimes; the GPU simulator | H3, H4, H5, S8, F9, capstone C5, F10, H6, H7, H8 | Not started |
| P7 ML and infrastructure, data at scale | Cluster, training and cloud simulators | M0, M1, D7, D8, M2, H9, D9, Q5, Q6, Q7, Q8 | Not started |
| P8 ML in production and synthesis | The serving simulator | M3, M4, capstone C6, M5, M6, R7, D10 | Not started |
| P9 Job-readiness | Postings collected weekly, skills mapped to lessons, readiness scored from evidence only, Learn steered towards gaps, resume and portfolio | None | Not started |

## Mini-capstones

Built, from Axiom. A mini-capstone closes one cluster. It is one small project in stages that needs several of the cluster's lessons at once, and it teaches nothing new. Learn gives it straight after the lesson that finishes the cluster. Written for F0 (sizing a metro's card system), S0 (settling up after a Goa trip, in at most one payment fewer than the number of people who owe or are owed) and H0 (reading a day of metro taps from a binary file: checking each record's XOR byte, decoding packed little-endian fields, and reporting the busiest station and the day's fares); each later cluster ships with its own.

## Larger capstones

Not built. Each spans several clusters, keeps its work across sessions, is judged by hidden tests re-run on the server and by a rubric the tutor applies to a short written account, and has a page of its own.

| # | Capstone | Unlocks after |
| --- | --- | --- |
| C1 | A small query engine | Q4 |
| C2 | A replicated key-value store | D3 |
| C3 | Raft under simulated faults | D4 |
| C4 | Threat model and hardening of the store | R2 |
| C5 | A cache-aware matrix multiply, on the runner | F9 |
| C6 | A model-serving service with monitoring | M4 |

## Job-readiness

Not built, and it comes last. Once the learner has finished two capstones, a weekly job collects postings for software, infrastructure, data, ML platform, performance and security roles at frontier AI labs and top technology companies, maps the skills they ask for to lessons, and scores the learner from evidence only: mastery, answers and finished capstones. The largest gaps steer Learn towards practice on lessons whose foundations are already mastered, and the job drafts a resume and a portfolio page built only from that evidence.
