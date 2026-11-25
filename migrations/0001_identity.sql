-- Identity: one learner, passphrase sign-in, server-side sessions.
create extension if not exists pgcrypto;

create table users (
  id uuid primary key default gen_random_uuid(),
  passphrase_hash text not null,
  created_at timestamptz not null default now()
);

-- Bedrock has exactly one learner. Drop this index to allow more.
create unique index users_single_learner on users ((true));

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  token_hash text not null unique,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index sessions_user_idx on sessions (user_id);

create table login_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  succeeded boolean not null,
  attempted_at timestamptz not null default now()
);

create index login_attempts_ip_time_idx on login_attempts (ip_hash, attempted_at desc);
create index login_attempts_time_idx on login_attempts (attempted_at desc);
