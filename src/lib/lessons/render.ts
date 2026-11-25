import { Marked } from "marked";
import markedKatex from "marked-katex-extension";

const marked = new Marked({ gfm: true }, markedKatex({ throwOnError: true, output: "htmlAndMathml", nonStandard: true }));

const REF = /\[\[([a-z0-9.-]+)\]\]/g;

/** Concepts a piece of lesson text names with [[concept-id]]. */
export const conceptRefs = (text: string) => [...text.matchAll(REF)].map((match) => match[1]);

type Titles = (id: string) => string | undefined;

const withTitles = (text: string, titles: Titles) => text.replace(REF, (_, id: string) => titles(id) ?? id);

/** Lesson prose: Markdown with $inline$ and $$display$$ mathematics. Lesson text is written in this repository, never by a visitor. */
export const renderBlock = (text: string, titles: Titles = () => undefined) =>
  marked.parse(withTitles(text, titles), { async: false });

export const renderInline = (text: string, titles: Titles = () => undefined) =>
  marked.parseInline(withTitles(text, titles), { async: false });
