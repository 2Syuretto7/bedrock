"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { codeTests, reportCode, saveCode, type AnswerResult } from "@/lib/learning/actions";
import { checkProgram, explainFailure } from "@/lib/lessons/harness";
import { PythonRunner, type RunResult } from "@/lib/python/runner";
import { WorkspaceContext, type CodeVerdict, type WorkspaceApi } from "./context";
import { ThemeToggle } from "../theme";
import { CodeEditor, type EditorHandle } from "./code-editor";
import { SymbolBar } from "./symbol-bar";
import { Tutor, type TutorContext, type TutorSetup } from "./tutor";

type Pane = "lesson" | "code" | "tutor";
const TUTOR_OPEN = "bedrock-tutor-open";

// Whether the tutor column is open is remembered on this device.
const tutorListeners = new Set<() => void>();
const watchTutor = (listener: () => void) => {
  tutorListeners.add(listener);
  return () => void tutorListeners.delete(listener);
};
const readTutor = () => {
  try {
    return localStorage.getItem(TUTOR_OPEN) === "1";
  } catch {
    return false;
  }
};
const writeTutor = (open: boolean) => {
  try {
    localStorage.setItem(TUTOR_OPEN, open ? "1" : "0");
  } catch {}
  tutorListeners.forEach((listener) => listener());
};
type Snapshots = Record<string, { code: string; at: number }>;
type Doc = { key: string; starter: string; question: { id: string; number: number } | null };

/** The newer of this device's copy and the copy saved to the account. */
function load(key: string, fallback: string, snapshots: Snapshots) {
  const server = snapshots[key];
  try {
    const local = localStorage.getItem(key);
    const localAt = Number(localStorage.getItem(`bedrock-code-at:${key}`)) || (local === null ? 0 : Infinity);
    if (server && server.at > localAt) return server.code;
    return local ?? fallback;
  } catch {
    return server?.code ?? fallback;
  }
}

export function Workspace({
  id,
  breadcrumb,
  starterCode,
  snapshots = {},
  lesson,
  tutor,
  children,
}: {
  id: string;
  breadcrumb: string[];
  starterCode: string;
  snapshots?: Snapshots;
  lesson?: { total: number; solved: string[]; complete: boolean; held?: boolean };
  tutor: TutorSetup;
  children: React.ReactNode;
}) {
  const [scratch] = useState<Doc>(() => ({ key: `bedrock-code:${id}`, starter: starterCode, question: null }));
  const [doc, setDoc] = useState<Doc>(scratch);
  const docRef = useRef(doc);
  const [pane, setPane] = useState<Pane>("lesson");
  const [split, setSplit] = useState(50);
  // On a phone the tutor is a third pane; on wider screens it is a column that opens beside the other two.
  const tutorOpen = useSyncExternalStore(watchTutor, readTutor, () => false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [saved, setSaved] = useState(true);
  const [solved, setSolved] = useState(() => new Set(lesson?.solved ?? []));
  const [complete, setComplete] = useState(lesson?.complete ?? false);
  const [held, setHeld] = useState(lesson?.held ?? false);
  const [mastery, setMastery] = useState<number | null>(null);
  const router = useRouter();
  const [verdicts, setVerdicts] = useState<Record<string, CodeVerdict>>({});
  const [initial] = useState(() => (typeof window === "undefined" ? starterCode : load(scratch.key, starterCode, snapshots)));
  const code = useRef(initial);
  const editor = useRef<EditorHandle>(null);
  const runner = useRef<PythonRunner | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const syncTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const tests = useRef(new Map<string, string>());
  const openedAt = useRef(0);
  const attending = useRef<string | null>(null);
  const main = useRef<HTMLDivElement>(null);
  const resultRef = useRef<RunResult | null>(null);

  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  const toggleTutor = useCallback((open: boolean) => {
    writeTutor(open);
    setPane((before) => (open ? before : before === "tutor" ? "lesson" : before));
  }, []);

  /** What the tutor is told about the screen when a question is asked. */
  const tutorContext = useCallback((): TutorContext => {
    const last = resultRef.current;
    const output = last ? [...last.out.map((chunk) => chunk.text), last.error ?? ""].join("\n").trim() : "";
    return { code: code.current, output, questionId: docRef.current.question?.id ?? null, attendingId: attending.current };
  }, []);

  useEffect(() => {
    const instance = new PythonRunner();
    runner.current = instance;
    instance.warm();
    return () => instance.dispose();
  }, []);

  const persist = useCallback((key: string, text: string) => {
    try {
      localStorage.setItem(key, text);
      localStorage.setItem(`bedrock-code-at:${key}`, String(Date.now()));
      setSaved(true);
    } catch {}
  }, []);

  const onChange = useCallback(
    (next: string) => {
      code.current = next;
      const key = docRef.current.key;
      setSaved(false);
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persist(key, next), 400);
      // The account copy follows a little later; without a connection the device copy is enough.
      clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => void saveCode(key, next).catch(() => {}), 2500);
    },
    [persist],
  );

  const show = useCallback(
    (next: Doc) => {
      if (docRef.current.key === next.key) return;
      clearTimeout(saveTimer.current);
      persist(docRef.current.key, code.current);
      docRef.current = next;
      setDoc(next);
      setResult(null);
      const text = load(next.key, next.starter, snapshots);
      code.current = text;
      editor.current?.replace(text);
    },
    [persist, snapshots],
  );

  const run = useCallback(async () => {
    if (!runner.current || running) return;
    setRunning(true);
    setPane("code");
    setResult(await runner.current.run(code.current));
    setRunning(false);
  }, [running]);

  const attend = useCallback((questionId: string) => {
    attending.current = questionId;
  }, []);

  const settle = useCallback((questionId: string, outcome: AnswerResult) => {
    if (outcome.correct) setSolved((before) => new Set(before).add(questionId));
    if (outcome.mastery !== undefined) setMastery(outcome.mastery);
    if (outcome.lessonComplete) setComplete(true);
    else if (outcome.held) {
      setHeld(true);
      // The server writes the consolidation set and sends it into the lesson.
      router.refresh();
    }
  }, [router]);

  const finish = useCallback((value?: number) => {
    if (value !== undefined) setMastery(value);
    setComplete(true);
  }, []);

  /** Runs the open question's checks against the code in the editor. */
  const check = useCallback(async () => {
    const question = docRef.current.question;
    if (!runner.current || running || !question) return;
    setRunning(true);
    setPane("code");
    const submitted = code.current;
    let outcome: CodeVerdict;
    try {
      if (!tests.current.has(question.id)) tests.current.set(question.id, await codeTests(id, question.id));
      const ran = await runner.current.run(checkProgram(submitted, tests.current.get(question.id)!));
      if (ran.error === null) {
        setResult({ ...ran, out: [{ stream: "out", text: "All checks passed." }] });
        outcome = { correct: true };
      } else {
        const { note, detail } = explainFailure(ran.error);
        setResult({ ...ran, out: [], error: detail ? `${note}\n\n${detail}` : note });
        outcome = { correct: false, note };
      }
      const recorded = await reportCode(id, question.id, outcome.correct, submitted, Date.now() - openedAt.current);
      // A timed question whose time was up is not solved, even if its checks pass.
      if (outcome.correct && !recorded.correct) outcome = { correct: false, note: recorded.note };
      outcome.explanationHtml = recorded.explanationHtml;
      settle(question.id, recorded);
    } catch {
      outcome = { correct: false, note: "Could not reach Bedrock to check this. Your code is saved; try again when you are connected." };
      setResult({ out: [], error: outcome.note!, ms: 0, timedOut: false, truncated: false });
    }
    setVerdicts((before) => ({ ...before, [question.id]: outcome }));
    setRunning(false);
  }, [id, running, settle]);

  const open = useCallback(
    (question: { id: string; number: number; starter: string }) => {
      openedAt.current = Date.now();
      attending.current = question.id;
      show({ key: `bedrock-code:${id}:${question.id}`, starter: question.starter, question: { id: question.id, number: question.number } });
      setPane("code");
      editor.current?.focus();
    },
    [id, show],
  );

  const stop = () => runner.current?.stop();

  // Keyboard shortcuts that work wherever focus is.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.shiftKey && event.key === "Enter") {
        event.preventDefault();
        void check();
      } else if (mod && event.key === "Enter") {
        event.preventDefault();
        void run();
      } else if (event.altKey && event.key === "1") {
        setPane("lesson");
      } else if (event.altKey && event.key === "2") {
        setPane("code");
        editor.current?.focus();
      } else if (event.altKey && event.key === "3") {
        setPane("tutor");
        toggleTutor(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run, check, toggleTutor]);

  const api = useMemo<WorkspaceApi>(
    () => ({
      conceptId: id,
      total: lesson?.total ?? 0,
      solved,
      complete,
      held: held && !complete,
      mastery,
      finish,
      settle,
      attend,
      active: doc.question?.id ?? null,
      open,
      check: () => void check(),
      busy: running,
      verdicts,
    }),
    [id, lesson?.total, solved, complete, held, mastery, finish, settle, attend, doc, open, check, running, verdicts],
  );

  const drag = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = main.current?.getBoundingClientRect();
    if (!box) return;
    const vertical = getComputedStyle(main.current!).getPropertyValue("--stack").trim() === "1";
    const move = (e: PointerEvent) => {
      const ratio = vertical ? (e.clientY - box.top) / box.height : (e.clientX - box.left) / box.width;
      setSplit(Math.round(Math.max(25, Math.min(75, ratio * 100))));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    event.preventDefault();
  };

  return (
    <WorkspaceContext value={api}>
    <div className="ws" data-pane={pane} data-tutor={tutorOpen ? "open" : "closed"}>
      <header className="ws-top">
        <Link href="/" className="bar-item font-mono text-[13px] tracking-[0.32em] text-ink" aria-label="Bedrock home">
          BEDROCK
        </Link>
        <ol className="ws-crumbs label" aria-label="Where you are">
          {breadcrumb.map((part, i) => (
            <li key={i}>{part}</li>
          ))}
        </ol>
        <div className="ws-controls">
          <button type="button" className="label bar-item ws-tutor-toggle" aria-pressed={tutorOpen} onClick={() => toggleTutor(!tutorOpen)}>
            Tutor
          </button>
          <Link href="/map" className="label bar-item">
            Map
          </Link>
          <span className="label bar-item ws-status" role="status">
            {saved ? "Saved" : "Saving"}
          </span>
          <ThemeToggle />
        </div>
      </header>

      <div className="ws-body">
      <div ref={main} className="ws-main" style={{ "--split": `${split}%` } as React.CSSProperties}>
        <section className="ws-pane ws-lesson" aria-label="Lesson">
          <div className="ws-scroll">{children}</div>
        </section>

        <div
          className="ws-divider"
          role="separator"
          aria-label="Resize panes"
          aria-valuenow={split}
          aria-valuemin={25}
          aria-valuemax={75}
          tabIndex={0}
          onPointerDown={drag}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowUp") setSplit((s) => Math.max(25, s - 5));
            if (event.key === "ArrowRight" || event.key === "ArrowDown") setSplit((s) => Math.min(75, s + 5));
          }}
        />

        <section className="ws-pane ws-code" aria-label="Code">
          <div className="ws-toolbar">
            <span className="label" data-testid="doc-name">
              {doc.question ? `Question ${doc.question.number}` : "Python"}
            </span>
            <div className="ml-auto flex items-center gap-2">
              {doc.question ? (
                <button type="button" className="btn btn-secondary btn-small" onClick={() => show(scratch)}>
                  Scratch
                </button>
              ) : null}
              {running ? (
                <button type="button" className="btn btn-secondary btn-small" onClick={stop}>
                  Stop
                </button>
              ) : null}
              <button
                type="button"
                className={`btn btn-small ${doc.question ? "btn-secondary" : "btn-primary"}`}
                onClick={run}
                disabled={running}
              >
                {running ? "Running" : "Run"}
                <kbd className="ws-kbd" aria-hidden="true">
                  Ctrl ↵
                </kbd>
              </button>
              {doc.question ? (
                <button type="button" className="btn btn-primary btn-small" onClick={check} disabled={running}>
                  Check
                  <kbd className="ws-kbd" aria-hidden="true">
                    Ctrl ⇧ ↵
                  </kbd>
                </button>
              ) : null}
            </div>
          </div>
          <div className="ws-editor">
            <CodeEditor ref={editor} initial={initial} onChange={onChange} onRun={run} label="Python code editor" />
          </div>
          <SymbolBar editor={editor} />
          <div className="ws-output" role="region" aria-label="Output" aria-live="polite" tabIndex={0}>
            <p className="label mb-2">Output{result && !result.timedOut ? ` · ${Math.max(1, Math.round(result.ms))} ms` : ""}</p>
            {result === null ? (
              <p className="text-ink-faint">Run your code to see what it prints.</p>
            ) : (
              <pre data-testid="output" className="ws-pre">
                {result.out.map((chunk, i) => (
                  <span key={i} className={chunk.stream === "err" ? "text-error" : undefined}>
                    {chunk.text}
                    {"\n"}
                  </span>
                ))}
                {result.error ? <span className="text-error">{result.error}</span> : null}
                {!result.error && result.out.length === 0 ? <span className="text-ink-faint">No output.</span> : null}
                {result.truncated ? <span className="text-ink-faint">{"\n"}Output was cut short.</span> : null}
              </pre>
            )}
          </div>
        </section>
      </div>

        <aside className="ws-tutor" aria-label="Tutor">
          <Tutor conceptId={id} setup={tutor} context={tutorContext} onClose={() => toggleTutor(false)} />
        </aside>
      </div>

      <nav className="ws-tabs" aria-label="Panes">
        {(["lesson", "code", "tutor"] as const).map((name) => (
          <button key={name} type="button" className="ws-tab" aria-pressed={pane === name} onClick={() => setPane(name)}>
            {name === "lesson" ? "Lesson" : name === "code" ? "Code" : "Tutor"}
          </button>
        ))}
      </nav>
    </div>
    </WorkspaceContext>
  );
}
