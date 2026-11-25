import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { HISTORY_TURNS, tutorEffort, tutorModel, type Usage } from "./config";
import type { TutorMessage } from "./service";
import { TurnReader, turnLine, type Turn } from "./turn";

let client: Anthropic | undefined;

export type Reply = {
  /** The reply as the learner sees it, without its opening line. */
  text: string;
  /** The tutor's judgement of the message, from the opening line. Null if it wrote none. */
  turn: Turn | null;
  usage: Usage;
  model: string;
  refused: boolean;
  cutShort: boolean;
};

/**
 * Asks the model for the tutor's next reply and passes the text on as it arrives.
 * `system` is the same for every question in a lesson, so it is cached for an hour and
 * later questions pay a small fraction of its price.
 */
export async function streamReply(input: {
  system: string;
  history: TutorMessage[];
  /** The number of each question in the lesson, by id, so earlier judgements can be shown to the tutor again. */
  numbers: Map<string, number>;
  message: string;
  note: string;
  onText: (delta: string) => void;
}): Promise<Reply> {
  client ??= new Anthropic();
  const model = tutorModel();
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...input.history.slice(-HISTORY_TURNS).map((m) => ({
      role: m.role,
      content:
        m.role === "assistant" && m.about
          ? `${turnLine({ about: m.about, question: (m.questionId && input.numbers.get(m.questionId)) || null, hint: m.hint ?? false })}\n${m.content}`
          : m.content,
    })),
    { role: "user", content: input.note ? `${input.note}\n\n${input.message}` : input.message },
  ];
  // The API wants the conversation to open with the learner.
  while (messages[0].role !== "user") messages.shift();

  const stream = client.beta.messages.stream({
    model,
    max_tokens: 16000,
    output_config: { effort: tutorEffort() },
    // If the model declines a question for policy reasons, the API retries it once on its default substitute.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [{ type: "text", text: input.system, cache_control: { type: "ephemeral", ttl: "1h" } }],
    messages,
  });
  // The opening line is the tutor's note to Bedrock. It is read here and never reaches the learner.
  const reader = new TurnReader();
  const show = (text: string) => {
    if (text) input.onText(text);
  };
  stream.on("text", (delta) => show(reader.push(delta)));
  const final = await stream.finalMessage();
  show(reader.end());
  return { text: reader.text, turn: reader.turn, usage: final.usage, model, refused: final.stop_reason === "refusal", cutShort: final.stop_reason === "max_tokens" };
}

/** A sentence for the learner when the request fails. Never includes details of the failure. */
export function failureNote(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return "The tutor's API key was not accepted. Check ANTHROPIC_API_KEY in Vercel.";
  }
  if (error instanceof Anthropic.RateLimitError) return "The tutor is being asked too much at once. Wait a minute and try again.";
  if (error instanceof Anthropic.BadRequestError) return "The tutor could not take that message. Try asking it in a shorter form.";
  if (error instanceof Anthropic.APIConnectionError) return "The tutor could not be reached. Check your connection and try again.";
  if (error instanceof Anthropic.APIError && (error.status ?? 0) >= 500) return "The tutor's service is having trouble. Try again in a minute.";
  return "The tutor could not answer just now. Try again.";
}
