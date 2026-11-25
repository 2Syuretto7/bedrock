"use client";

import type { EditorHandle } from "./code-editor";

const SYMBOLS = ["(", ")", "[", "]", "{", "}", ":", "=", "_", ".", ",", "'", '"', "#", "+", "-", "*", "/", "<", ">"];

/** Touch keyboards hide the characters Python needs most. This row brings them back. */
export function SymbolBar({ editor }: { editor: React.RefObject<EditorHandle | null> }) {
  // preventDefault on pointer down keeps the on-screen keyboard open.
  const hold = (event: React.PointerEvent) => event.preventDefault();
  const key = (label: string, action: () => void, name?: string) => (
    <button key={name ?? label} type="button" className="symbol-key" aria-label={name} onPointerDown={hold} onClick={action}>
      {label}
    </button>
  );
  return (
    <div className="symbol-bar" role="toolbar" aria-label="Code symbols">
      {key("Tab", () => editor.current?.insert("    "), "Indent")}
      {key("←", () => editor.current?.move(-1), "Move left")}
      {key("→", () => editor.current?.move(1), "Move right")}
      {SYMBOLS.map((symbol) => key(symbol, () => editor.current?.insert(symbol)))}
      {key("Undo", () => editor.current?.undo())}
      {key("Redo", () => editor.current?.redo())}
    </div>
  );
}
