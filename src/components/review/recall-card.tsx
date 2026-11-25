"use client";

import { useState, useTransition } from "react";
import { clock, spoken } from "@/lib/lessons/timing";
import { useCountdown } from "../lesson/countdown";
import { useWorkspace } from "../workspace/context";
import { startRecall, submitRecall } from "@/lib/review/actions";
import type { RecallView, Revealed } from "@/lib/review/view";

// The text is written by the model, so the server renders it with raw HTML shown as text.
const Html = ({ html, className }: { html: string; className?: string }) => <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;

/**
 * One fresh question, in a lesson's Recall part or in its consolidation set.
 * It takes one answer, then shows the explanation and the lesson the idea came from.
 */
export function RecallCard({ view, number, kind = "recall" }: { view: RecallView; number: number; kind?: "recall" | "consolidation" }) {
  const ws = useWorkspace();
  const [pending, start] = useTransition();
  const [starting, startClock] = useTransition();
  const [done, setDone] = useState<(Revealed & { nextInDays?: number }) | null>(view.done ?? null);
  const [note, setNote] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [choice, setChoice] = useState<number | null>(null);

  const name = kind === "recall" ? `Fresh recall question ${number}` : `Consolidation question ${number}`;
  const locked = done !== null || pending;

  const send = (answer: unknown, timedOut = false) => {
    start(async () => {
      try {
        const result = await submitRecall(view.id, answer, timedOut);
        if (result.note !== undefined) setNote(result.note);
        else {
          setNote(null);
          setDone(result);
          if (result.lessonComplete) ws.finish(result.mastery);
        }
      } catch {
        setNote("Could not reach Bedrock. Check your connection and try again.");
      }
    });
  };
  // Recall is fast retrieval, so the question is timed. If the time runs out, the one try is spent and it is a miss.
  const timer = useCountdown(view.seconds, () => send(null, true), done === null);
  const submit = (answer: unknown) => send(answer);
  // The server keeps the clock. A question started before, on another visit, resumes with the time it has left.
  const begin = () => {
    startClock(async () => {
      try {
        const { remainingMs } = await startRecall(view.id);
        setNote(null);
        timer.begin(remainingMs);
      } catch {
        setNote("Could not reach Bedrock to start the clock. Check your connection and try again.");
      }
    });
  };
  // Hidden until the server has started the clock. Once time runs out, the question stays in view while the miss is recorded.
  const waiting = done === null && (starting || (!timer.running && !pending));
  const checkButton = (disabled: boolean) => (
    <button type="submit" className="btn btn-primary btn-small" disabled={locked || disabled}>
      {pending ? "Checking" : "Check"}
    </button>
  );

  return (
    <section className="q" aria-label={name} data-solved={done?.correct === true} data-timed="true">
      <header className="q-head">
        <span className="label">
          {kind === "recall" ? "Recall" : "Consolidation"} {number} · New question · One try · Timed, {spoken(view.seconds)}
        </span>
        {done ? <span className={done.correct ? "label q-solved" : "label text-error"}>{done.correct ? (kind === "recall" ? "Recalled" : "Right") : "Missed"}</span> : null}
        {done === null && timer.running ? (
          <span className="label q-timer" role="timer" aria-label="Time left" data-low={timer.left <= 10}>
            {clock(timer.left)}
          </span>
        ) : null}
      </header>
      {waiting ? (
        <div className="q-start">
          <p className="text-ink-secondary">
            Answer from memory. The question appears when you start, and you have {spoken(view.seconds)}. If the time runs out it counts as a miss.
          </p>
          {note ? <p className="text-error">{note}</p> : null}
          <button type="button" className="btn btn-primary btn-small" onClick={begin} disabled={starting}>
            {starting ? "Starting" : "Start"}
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
                <input type="radio" name={`recall-${view.id}-choice`} checked={choice === i} onChange={() => setChoice(i)} />
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

      <div aria-live="polite" className="q-feedback">
        {note ? <p className="text-error">{note}</p> : null}
        {done && !done.correct ? (
          <>
            <p className="text-error">Not this time. The answer is:</p>
            <Html html={done.answerHtml ?? ""} className="q-explanation recall-answer" />
          </>
        ) : null}
        {done ? (
          <>
            <Html html={done.explanationHtml} className="q-explanation" />
            <p className="recall-from text-ink-secondary">
              {kind === "recall" ? `From ${done.from}.` : null}
              {done.nextInDays ? ` It comes back in ${done.nextInDays} ${done.nextInDays === 1 ? "day" : "days"}, with a different question.` : ""}
            </p>
          </>
        ) : null}
      </div>
      </>
    );
  }
}
