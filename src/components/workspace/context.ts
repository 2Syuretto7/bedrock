"use client";

import { createContext, useContext } from "react";
import type { AnswerResult } from "@/lib/learning/actions";

export type CodeVerdict = { correct: boolean; note?: string; explanationHtml?: string };

export type WorkspaceApi = {
  conceptId: string;
  total: number;
  solved: ReadonlySet<string>;
  complete: boolean;
  /** Every question is solved, but the finish was weak: the lesson is open until its consolidation set is answered. */
  held: boolean;
  /** Mastery of the lesson as it was finished, from 0 to 100. */
  mastery: number | null;
  /** Marks the lesson finished, when the last consolidation question is answered. */
  finish: (mastery?: number) => void;
  /** Record the outcome of an answer so progress and the end of the lesson update. */
  settle: (questionId: string, result: AnswerResult) => void;
  /** Note which question the learner is working on, so the tutor knows which one a message is likely to be about. */
  attend: (questionId: string) => void;
  /** The code question whose answer is in the editor, if any. */
  active: string | null;
  open: (question: { id: string; number: number; starter: string }) => void;
  check: () => void;
  busy: boolean;
  verdicts: Readonly<Record<string, CodeVerdict>>;
};

export const WorkspaceContext = createContext<WorkspaceApi | null>(null);

export function useWorkspace(): WorkspaceApi {
  const api = useContext(WorkspaceContext);
  if (!api) throw new Error("Used outside the workspace");
  return api;
}
