import "server-only";
import { content } from "../lessons/content";
import { secondsFor } from "../lessons/timing";
import { renderReply, renderReplyInline } from "../tutor/render";
import { optionOrder, type ReviewQuestion } from "./question";

const escape = (text: string) => text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);

/** The seed for the order a question's options are shown in. The same on every visit. */
export const orderSeed = (questionId: number) => `review:${questionId}`;

/** What is revealed once a fresh recall question has been answered. */
export type Revealed = {
  correct: boolean;
  explanationHtml: string;
  /** The right answer, shown after a miss. */
  answerHtml?: string;
  /** The lesson the idea came from. */
  from: string;
};

/** What the browser is given for a fresh recall question. Never the answer, until it has been answered. */
export type RecallView = {
  id: number;
  type: ReviewQuestion["type"];
  promptHtml: string;
  unit?: string;
  items?: string[];
  code?: string;
  /** The time limit in seconds. Recall is fast retrieval, so every one of these questions is timed. */
  seconds: number;
  done?: Revealed;
};

// Question text is written by the model, so it is rendered with raw HTML shown as text.
export function reveal(q: ReviewQuestion, conceptId: string, correct: boolean): Revealed {
  const answerHtml =
    q.type === "numeric"
      ? escape(`${q.answer}${q.unit ? ` ${q.unit}` : ""}`)
      : q.type === "choice"
        ? renderReplyInline(q.options[q.answer])
        : `<pre class="q-code"><code>${escape(q.output)}</code></pre>`;
  return {
    correct,
    explanationHtml: renderReply(q.explanation),
    answerHtml: correct ? undefined : answerHtml,
    from: content().graph.concepts.get(conceptId)?.title ?? conceptId,
  };
}

export function recallView(stored: { id: number; conceptId: string; question: ReviewQuestion; answered?: boolean; correct?: boolean | null }): RecallView {
  const q = stored.question;
  return {
    id: stored.id,
    type: q.type,
    promptHtml: renderReply(q.prompt),
    unit: q.type === "numeric" ? q.unit : undefined,
    items: q.type === "choice" ? optionOrder(q, orderSeed(stored.id)).map((i) => renderReplyInline(q.options[i])) : undefined,
    code: q.type === "predict" ? q.code : undefined,
    seconds: secondsFor({ system: "s1", type: q.type })!,
    done: stored.answered ? reveal(q, stored.conceptId, stored.correct === true) : undefined,
  };
}
