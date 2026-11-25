-- Spaced repetition. One row per finished lesson: how well it is remembered and when it comes back.
create table review_states (
  user_id uuid not null references users(id) on delete cascade,
  concept_id text not null,
  -- Days for the chance of recalling the lesson to fall to 90%.
  stability double precision not null,
  -- 1 (easy) to 10 (hard).
  difficulty double precision not null,
  reps integer not null default 0,
  lapses integer not null default 0,
  last_reviewed_at timestamptz not null,
  due_at timestamptz not null,
  primary key (user_id, concept_id)
);
create index review_states_by_due on review_states (user_id, due_at);

-- Every fresh question ever written for the learner, for Recall or for consolidation.
-- A question is answered once and never shown again.
create table review_questions (
  id bigint generated always as identity primary key,
  user_id uuid not null references users(id) on delete cascade,
  concept_id text not null,
  question jsonb not null,
  -- What the question asks, without spacing or punctuation. The same question can never be stored twice for a lesson.
  fingerprint text not null,
  -- What writing and checking the question cost, in millionths of a US dollar.
  cost_micro_usd bigint not null default 0,
  -- The lesson whose Recall part showed it, so the lesson shows the same ones on every visit.
  shown_in text,
  purpose text not null default 'recall' check (purpose in ('recall', 'consolidation')),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  correct boolean,
  answer jsonb,
  ms integer,
  unique (user_id, concept_id, fingerprint)
);
create index review_questions_unanswered on review_questions (user_id, concept_id) where answered_at is null;
create index review_questions_by_time on review_questions (user_id, answered_at);
create index review_questions_by_lesson on review_questions (user_id, shown_in);
