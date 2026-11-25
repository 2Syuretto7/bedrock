import { Marked } from "marked";
import markedKatex from "marked-katex-extension";

const escape = (text: string) => text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Markdown and mathematics for the tutor's replies. Unlike lesson text, a reply is not
 * written in this repository, so nothing in it is trusted: raw HTML is shown as text,
 * links may only go to web addresses, and images are reduced to their description.
 */
const marked = new Marked(
  { gfm: true, breaks: true },
  markedKatex({ throwOnError: false, output: "htmlAndMathml", nonStandard: true }),
  {
    renderer: {
      html: ({ text }) => escape(text),
      image: ({ text }) => escape(text),
      link({ href, tokens }) {
        const label = this.parser.parseInline(tokens);
        return /^https?:\/\//i.test(href) ? `<a href="${escape(href)}" target="_blank" rel="noopener noreferrer">${label}</a>` : label;
      },
    },
  },
);

export const renderReply = (text: string): string => marked.parse(text, { async: false });

/** The same, for one line of text that sits inside other markup, such as an option of a question. */
export const renderReplyInline = (text: string): string => marked.parseInline(text, { async: false });
