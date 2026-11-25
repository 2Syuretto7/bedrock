-- Timed (System One) questions are timed by the server. Pressing Start records when a question was revealed,
-- and the time an answer took is measured from that moment when the answer arrives, never taken from the browser.
create table question_starts (
  user_id uuid not null references users(id) on delete cascade,
  -- A lesson's concept id, or a mini-capstone's id.
  unit_id text not null,
  question_id text not null,
  started_at timestamptz not null,
  primary key (user_id, unit_id, question_id)
);

-- A fresh recall or consolidation question is started once. Its clock keeps running if the page is left.
alter table review_questions add column started_at timestamptz;
