"use client";

import { useEffect, useImperativeHandle, useRef } from "react";
import { defaultKeymap, history, historyKeymap, indentWithTab, redo, undo } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { bracketMatching, indentOnInput, indentUnit, syntaxHighlighting } from "@codemirror/language";
import { Compartment, EditorState } from "@codemirror/state";
import { drawSelection, EditorView, highlightActiveLine, keymap, lineNumbers } from "@codemirror/view";
import { classHighlighter } from "@lezer/highlight";

export type EditorHandle = {
  insert: (text: string) => void;
  undo: () => void;
  redo: () => void;
  move: (by: -1 | 1) => void;
  focus: () => void;
  /** Swap the whole document, for example when a code question is opened, and the language it is in. */
  replace: (text: string, language?: "python" | "asm") => void;
};

/** Python is highlighted; assembly is shown as plain text, since its columns already make it easy to read. */
const grammar = (language: "python" | "asm") => (language === "asm" ? [] : python());

const theme = EditorView.theme({
  "&": { height: "100%", fontSize: "14px", backgroundColor: "transparent", color: "var(--text)" },
  ".cm-scroller": { fontFamily: "var(--font-mono)", lineHeight: "22px" },
  ".cm-content": { padding: "12px 0", caretColor: "var(--text)" },
  ".cm-gutters": { backgroundColor: "transparent", color: "var(--gray-500)", border: "none" },
  ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "var(--bg-raised)" },
  "&.cm-focused": { outline: "none" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": { backgroundColor: "var(--selection)" },
  ".cm-cursor": { borderLeftColor: "var(--text)" },
  "&.cm-focused .cm-matchingBracket": { backgroundColor: "transparent", outline: "1px solid var(--border-input)" },
});

export function CodeEditor({
  initial,
  language = "python",
  onChange,
  onRun,
  label,
  ref,
}: {
  initial: string;
  language?: "python" | "asm";
  onChange: (code: string) => void;
  onRun: () => void;
  label: string;
  ref: React.Ref<EditorHandle>;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const languageSlot = useRef(new Compartment());
  const callbacks = useRef({ onChange, onRun });
  useEffect(() => {
    callbacks.current = { onChange, onRun };
  });

  useEffect(() => {
    const editor = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: initial,
        extensions: [
          lineNumbers(),
          history(),
          drawSelection(),
          highlightActiveLine(),
          EditorView.lineWrapping,
          indentOnInput(),
          bracketMatching(),
          indentUnit.of("    "),
          EditorState.tabSize.of(4),
          languageSlot.current.of(grammar(language)),
          syntaxHighlighting(classHighlighter),
          theme,
          keymap.of([
            { key: "Mod-Enter", run: () => (callbacks.current.onRun(), true) },
            ...defaultKeymap,
            ...historyKeymap,
            indentWithTab,
          ]),
          EditorView.contentAttributes.of({
            "aria-label": label,
            autocapitalize: "off",
            autocorrect: "off",
            spellcheck: "false",
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) callbacks.current.onChange(update.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = editor;
    return () => editor.destroy();
    // The editor owns its text after mounting; `initial` is only the starting value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    insert(text) {
      const editor = view.current;
      if (!editor) return;
      editor.dispatch(editor.state.replaceSelection(text), { scrollIntoView: true, userEvent: "input" });
      editor.focus();
    },
    undo: () => view.current && undo(view.current),
    redo: () => view.current && redo(view.current),
    move(by) {
      const editor = view.current;
      if (!editor) return;
      const head = Math.max(0, Math.min(editor.state.doc.length, editor.state.selection.main.head + by));
      editor.dispatch({ selection: { anchor: head }, scrollIntoView: true });
      editor.focus();
    },
    focus: () => view.current?.focus(),
    replace(text, next = "python") {
      const editor = view.current;
      if (!editor) return;
      editor.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: text },
        selection: { anchor: 0 },
        effects: languageSlot.current.reconfigure(grammar(next)),
      });
    },
  }));

  return <div ref={host} className="h-full min-h-0 overflow-hidden" />;
}
