-- Every answer the learner gives. Mastery is computed from this, never stored by hand.
create table attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references users(id) on delete cascade,
  concept_id text not null,
  question_id text not null,
  system text not null check (system in ('s1', 's2')),
  correct boolean not null,
  answer jsonb,
  -- The tutor's hints on this question before the answer was submitted.
  hints_used integer not null default 0,
  ms integer,
  created_at timestamptz not null default now()
);
create index attempts_by_question on attempts (user_id, concept_id, question_id, created_at);

create table lesson_progress (
  user_id uuid not null references users(id) on delete cascade,
  concept_id text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, concept_id)
);

-- The editor's contents, so work follows the learner across devices.
create table code_snapshots (
  user_id uuid not null references users(id) on delete cascade,
  key text not null,
  code text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
