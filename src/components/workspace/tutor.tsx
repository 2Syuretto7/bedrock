"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clearTutor } from "@/lib/learning/actions";

export type TutorMessage = { id: number | string; role: "user" | "assistant"; content: string };
export type TutorSetup = { messages: TutorMessage[]; connected: boolean };
/** What is on screen when a question is asked: the code, its last output, the question open in the editor and the question last worked on. */
export type TutorContext = { code: string; output: string; questionId: string | null; attendingId: string | null };

const MAX = 4000;
const STARTERS = ["Explain this part again, more simply", "Show me another example", "Why is this true?", "Look at my code"];
const OFFLINE = "Could not reach the tutor. Check your connection and try again.";

type Render = (text: string) => string;

function Bubble({ message, render, live }: { message: TutorMessage; render: Render | null; live: boolean }) {
  const mine = message.role === "user";
  return (
    <li className={`tutor-msg ${mine ? "tutor-mine" : "tutor-theirs"}`}>
      <span className="label">{mine ? "You" : "Tutor"}</span>
      {mine || !render ? (
        <p className="tutor-plain">{message.content}</p>
      ) : (
        // The renderer shows any HTML in a reply as text; see lib/tutor/render.ts.
        <div className="tutor-text prose-lesson lesson-text" dangerouslySetInnerHTML={{ __html: render(message.content) }} />
      )}
      {live && !message.content ? <p className="tutor-plain text-ink-faint">Thinking</p> : null}
    </li>
  );
}

export function Tutor({
  conceptId,
  setup,
  context,
  onClose,
}: {
  conceptId: string;
  setup: TutorSetup;
  context: () => TutorContext;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState(setup.messages);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [render, setRender] = useState<Render | null>(null);
  const list = useRef<HTMLOListElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const counter = useRef(0);

  // Markdown and mathematics are only loaded once the tutor is on screen.
  useEffect(() => {
    let live = true;
    void import("@/lib/tutor/render").then((mod) => live && setRender(() => mod.renderReply));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const el = list.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, problem]);

  const ask = useCallback(
    async (text: string) => {
      const message = text.trim().slice(0, MAX);
      if (!message || busy) return;
      const replyId = `local-${++counter.current}`;
      setBusy(true);
      setProblem(null);
      setDraft("");
      setMessages((before) => [...before, { id: `${replyId}-q`, role: "user", content: message }, { id: replyId, role: "assistant", content: "" }]);
      const update = (change: (before: string) => string) =>
        setMessages((before) => before.map((m) => (m.id === replyId ? { ...m, content: change(m.content) } : m)));
      let failed: string | null = null;
      try {
        const response = await fetch("/api/tutor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conceptId, message, ...context() }),
        });
        if (!response.ok || !response.body || response.redirected) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null;
          failed = data?.error ?? OFFLINE;
        } else {
          const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
          let pending = "";
          let finished = false;
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            pending += value;
            const lines = pending.split("\n");
            pending = lines.pop()!;
            for (const line of lines) {
              if (!line) continue;
              const event = JSON.parse(line) as { delta?: string; replace?: string; done?: boolean; error?: string };
              if (event.delta) update((before) => before + event.delta);
              if (event.replace) update(() => event.replace!);
              if (event.error) failed = event.error;
              if (event.done) finished = true;
            }
          }
          if (!finished && !failed) failed = OFFLINE;
        }
      } catch {
        failed = OFFLINE;
      }
      if (failed) {
        setProblem(failed);
        // Keep whatever part of the reply arrived; drop the empty placeholder otherwise.
        setMessages((before) => before.filter((m) => m.id !== replyId || m.content));
      }
      setBusy(false);
    },
    [busy, conceptId, context],
  );

  const clear = async () => {
    if (busy) return;
    setMessages([]);
    setProblem(null);
    await clearTutor(conceptId).catch(() => {});
    box.current?.focus();
  };

  const off = !setup.connected;

  return (
    <>
      <div className="ws-toolbar">
        <h2 className="label">Tutor</h2>
        <div className="ml-auto flex items-center gap-2">
          {messages.length > 0 ? (
            <button type="button" className="btn btn-secondary btn-small" onClick={clear} disabled={busy}>
              Clear
            </button>
          ) : null}
          <button type="button" className="btn btn-secondary btn-small tutor-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <ol ref={list} className="tutor-list" aria-label="Conversation with the tutor" aria-live="polite" tabIndex={0}>
        {messages.length === 0 ? (
          <li className="tutor-empty">
            <p>
              Ask about anything in this lesson. The tutor knows the lesson, the lessons you have finished, your answers so
              far, and what is in your editor. On a question you have not solved it gives hints, never the solution.
            </p>
            {off ? null : (
              <div className="tutor-starters">
                {STARTERS.map((text) => (
                  <button key={text} type="button" className="btn btn-secondary btn-small" onClick={() => void ask(text)} disabled={busy}>
                    {text}
                  </button>
                ))}
              </div>
            )}
          </li>
        ) : null}
        {messages.map((message, i) => (
          <Bubble key={message.id} message={message} render={render} live={busy && i === messages.length - 1} />
        ))}
      </ol>

      {problem ? (
        <p className="tutor-problem" role="alert">
          {problem}
        </p>
      ) : null}

      <form
        className="tutor-form"
        onSubmit={(event) => {
          event.preventDefault();
          void ask(draft);
        }}
      >
        <textarea
          ref={box}
          className="tutor-input"
          aria-label="Ask the tutor"
          placeholder={
            setup.connected ? "Ask the tutor" : "The tutor is not connected yet"
          }
          rows={2}
          maxLength={MAX}
          value={draft}
          disabled={off}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Enter sends; Shift + Enter makes a new line. Touch keyboards use the Ask button.
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void ask(draft);
            }
          }}
        />
        <button type="submit" className="btn btn-primary btn-small" disabled={off || busy || !draft.trim()}>
          {busy ? "Answering" : "Ask"}
        </button>
      </form>
      {setup.connected ? null : <p className="tutor-foot label">Needs ANTHROPIC_API_KEY in this deployment</p>}
    </>
  );
}
