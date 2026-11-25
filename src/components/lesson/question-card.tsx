"use client";

import { useState, useTransition } from "react";
import { submitAnswer, timeUp } from "@/lib/learning/actions";
import { clock, spoken } from "@/lib/lessons/timing";
import type { QuestionView } from "@/lib/lessons/content";
import { useWorkspace } from "../workspace/context";
import { useCountdown } from "./countdown";

const Html = ({ html, className }: { html: string; className?: string }) => (
  // Lesson text is written and reviewed in this repository; nothing a visitor types is ever rendered this way.
  <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
);

export function QuestionCard({ view }: { view: QuestionView }) {
  const ws = useWorkspace();
  const [pending, start] = useTransition();
  const [feedback, setFeedback] = useState<{ note?: string; explanationHtml?: string; offline?: boolean } | null>(null);
  const [text, setText] = useState("");
  const [choice, setChoice] = useState<number | null>(null);
  const [order, setOrder] = useState(() => (view.items ?? []).map((_, i) => i));
  const [timedOut, setTimedOut] = useState(false);
  // Only System One questions have a time limit. A System Two question is never timed, so no time is measured for it.
  const timer = useCountdown(view.seconds, () => {
    setTimedOut(true);
    setFeedback(null);
    void timeUp(ws.conceptId, view.id).catch(() => {});
  });

  const verdict = ws.verdicts[view.id];
  const solved = view.solved || ws.solved.has(view.id);
  const explanation = view.explanationHtml ?? feedback?.explanationHtml ?? verdict?.explanationHtml;
  const note = view.type === "code" ? (verdict && !verdict.correct ? verdict.note : undefined) : feedback?.note;
  const wrong = !solved && (view.type === "code" ? verdict?.correct === false : feedback !== null);
  const name = `Question ${view.number}`;

  const timed = view.seconds !== undefined && !solved;
  /** A timed question stays hidden until the learner starts its clock. */
  const waiting = timed && !timer.running;
  const begin = () => {
    setTimedOut(false);
    setFeedback(null);
    timer.begin();
    // A timed code question is answered in the editor, so starting it opens it there.
    if (view.type === "code") ws.open({ id: view.id, number: view.number, starter: view.starter ?? "" });
  };

  const submit = (answer: unknown) => {
    start(async () => {
      try {
        const result = await submitAnswer(ws.conceptId, view.id, answer, view.seconds === undefined ? 0 : timer.elapsed());
        if (result.correct) timer.stop();
        ws.settle(view.id, result);
        setFeedback({ note: result.note, explanationHtml: result.explanationHtml });
      } catch {
        setFeedback({ note: "Could not reach Bedrock. Check your connection and try again.", offline: true });
      }
    });
  };
  const move = (from: number, by: -1 | 1) => {
    setOrder((before) => {
      const next = [...before];
      [next[from], next[from + by]] = [next[from + by], next[from]];
      return next;
    });
  };

  const locked = solved || pending;
  const checkButton = (disabled: boolean) => (
    <button type="submit" className="btn btn-primary btn-small" disabled={locked || disabled}>
      {pending ? "Checking" : "Check"}
    </button>
  );

  return (
    <section className="q" aria-label={name} data-solved={solved} data-question={view.id} data-timed={view.seconds !== undefined} onFocusCapture={() => ws.attend(view.id)} onClickCapture={() => ws.attend(view.id)}>
      <header className="q-head">
        <span className="label">
          {name} · {view.system === "s1" ? `Quick · Timed, ${spoken(view.seconds!)}` : "Think · Not timed"}
        </span>
        {solved ? <span className="label q-solved">Solved</span> : null}
        {timed && timer.running ? (
          <span className="label q-timer" role="timer" aria-label="Time left" data-low={timer.left <= 10}>
            {clock(timer.left)}
          </span>
        ) : null}
      </header>
      {waiting ? (
        <div className="q-start">
          {timedOut ? <p className="text-error">Time is up. It counts as a miss, and you can start again.</p> : null}
          <p className="text-ink-secondary">
            This is a quick question: answer from memory. It appears when you start, and you have {spoken(view.seconds!)}.
          </p>
          <button type="button" className="btn btn-primary btn-small" onClick={begin}>
            {timedOut ? "Start again" : "Start"}
          </button>
        </div>
      ) : (
        renderBody()
      )}
    </section>
  );

  function renderBody() {
    return (
      <>
      <Html html={view.promptHtml} className="q-prompt" />

      {view.type === "numeric" ? (
        <form
          className="q-row"
          onSubmit={(event) => {
            event.preventDefault();
            submit(text);
          }}
        >
          <input
            className="input q-input"
            aria-label={`Answer to ${name.toLowerCase()}`}
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={locked}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          {view.unit ? <span className="text-ink-secondary">{view.unit}</span> : null}
          {checkButton(text.trim() === "")}
        </form>
      ) : null}

      {view.type === "choice" ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit(choice);
          }}
        >
          <fieldset className="q-options" disabled={locked}>
            <legend className="sr-only">Options for {name.toLowerCase()}</legend>
            {view.items!.map((html, i) => (
              <label key={i} className="q-option">
                <input type="radio" name={`${view.id}-choice`} checked={choice === i} onChange={() => setChoice(i)} />
                <span dangerouslySetInnerHTML={{ __html: html }} />
              </label>
            ))}
          </fieldset>
          <div className="q-row">{checkButton(choice === null)}</div>
        </form>
      ) : null}

      {view.type === "predict" ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit(text);
          }}
        >
          <pre className="q-code" tabIndex={0} aria-label={`Code for ${name.toLowerCase()}`}>
            <code>{view.code}</code>
          </pre>
          <textarea
            className="input q-predict"
            aria-label={`What the code prints, for ${name.toLowerCase()}`}
            placeholder="Type exactly what this prints"
            rows={Math.min(8, Math.max(2, text.split("\n").length))}
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={locked}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <div className="q-row">{checkButton(text.trim() === "")}</div>
        </form>
      ) : null}

      {view.type === "order" ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit(order);
          }}
        >
          <ol className="q-steps">
            {order.map((item, position) => (
              <li key={item} className="q-step">
                <span className="label">{position + 1}</span>
                <span className="q-step-text" dangerouslySetInnerHTML={{ __html: view.items![item] }} />
                <button
                  type="button"
                  className="q-move"
                  aria-label={`Move step ${position + 1} up`}
                  disabled={locked || position === 0}
                  onClick={() => move(position, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="q-move"
                  aria-label={`Move step ${position + 1} down`}
                  disabled={locked || position === order.length - 1}
                  onClick={() => move(position, 1)}
                >
                  ↓
                </button>
              </li>
            ))}
          </ol>
          <div className="q-row">{checkButton(false)}</div>
        </form>
      ) : null}

      {view.type === "code" ? (
        <div className="q-row">
          {ws.active === view.id ? (
            <>
              <button type="button" className="btn btn-primary btn-small" onClick={ws.check} disabled={ws.busy}>
                {ws.busy ? "Checking" : "Check my code"}
              </button>
              <span className="text-ink-secondary text-[14px]">This question is open in the editor.</span>
            </>
          ) : (
            <button
              type="button"
              className={`btn btn-small ${solved ? "btn-secondary" : "btn-primary"}`}
              onClick={() => ws.open({ id: view.id, number: view.number, starter: view.starter ?? "" })}
            >
              {view.mode === "find-bug" ? "Open the broken code" : "Open in the editor"}
            </button>
          )}
        </div>
      ) : null}

      <div aria-live="polite" className="q-feedback">
        {wrong ? <p className="text-error">{note ?? "Not yet. Look again and try once more."}</p> : null}
        {solved && explanation ? <Html html={explanation} className="q-explanation" /> : null}
      </div>

      </>
    );
  }
}

/** Progress through the questions of a lesson or a mini-capstone, and the way on once all are solved. */
export function LessonEnd({ capstone = false }: { capstone?: boolean }) {
  const ws = useWorkspace();
  return (
    <footer className="lesson-end" aria-live="polite">
      <p className="label">
        {ws.solved.size} of {ws.total} questions solved
      </p>
      {ws.complete ? (
        <>
          <p className="lesson-end-title">{capstone ? "Mini-capstone complete." : "Lesson complete."}</p>
          {ws.mastery !== null ? (
            <p className="text-ink-secondary lesson-end-mastery">Mastery {ws.mastery}%. It counts wrong tries, hints from the tutor and speed on timed questions, and it fades until the idea is recalled.</p>
          ) : null}
          {/* A full page load, so the server chooses the next lesson from fresh progress. */}
          <a className="btn btn-primary" href="/learn">
            Continue
          </a>
        </>
      ) : ws.held ? (
        <p className="text-ink-secondary">Every question is solved, but not securely yet. Answer the consolidation questions above to finish this lesson.</p>
      ) : (
        <p className="text-ink-secondary">
          {capstone ? "Solve every question to finish this mini-capstone. It closes the cluster." : "Solve every question to finish this lesson. The next one builds on it."}
        </p>
      )}
    </footer>
  );
}

/** The closing account of a mini-capstone. It names what each stage was, so it appears only once every stage is solved. */
export function CapstoneReview({ html }: { html: string }) {
  const ws = useWorkspace();
  if (!ws.complete) return null;
  return (
    <section className="lesson-part" aria-label="What you built">
      <h2 className="label lesson-part-label">What you built</h2>
      <Html html={html} className="lesson-text" />
    </section>
  );
}
