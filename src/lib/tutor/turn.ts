/**
 * Every reply from the tutor opens with one line the learner never sees:
 *
 *   <turn about="unsolved" question="2" hint="yes">
 *
 * It is the tutor's own judgement of what the learner's message was about and of whether
 * the reply gave a hint. Hints recorded this way are the only hints there are, and they
 * are what mastery counts.
 */
export const ABOUT = ["unsolved", "solved", "lesson", "other"] as const;
export type About = (typeof ABOUT)[number];
export type Turn = { about: About; /** The question's number in the lesson, from 1. */ question: number | null; hint: boolean };

const OPEN = "<turn";
/** Longer than any real tag. Text that runs past this without closing is not a tag. */
const LIMIT = 200;

export function parseTurn(tag: string): Turn | null {
  const attribute = (name: string) => new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`).exec(tag)?.[1]?.trim().toLowerCase();
  const about = attribute("about") as About | undefined;
  if (!about || !ABOUT.includes(about)) return null;
  const number = Number(attribute("question"));
  const question = Number.isInteger(number) && number > 0 ? number : null;
  return { about, question, hint: about === "unsolved" && question !== null && attribute("hint") === "yes" };
}

/** The line as the tutor wrote it, rebuilt for earlier replies so that it sees its own judgements again. */
export const turnLine = (turn: Turn) => `<turn about="${turn.about}"${turn.question ? ` question="${turn.question}"` : ""} hint="${turn.hint ? "yes" : "no"}">`;

/**
 * Takes the reply as it streams, holds back the opening line, and passes on everything after it.
 * A reply that does not open with the line is passed on whole.
 */
export class TurnReader {
  turn: Turn | null = null;
  text = "";
  private held = "";
  private state: "opening" | "gap" | "body" = "opening";

  /** Returns the part of the reply that can be shown now. */
  push(delta: string): string {
    if (this.state === "body") return this.show(delta);
    this.held += delta;
    if (this.state === "opening") {
      const start = this.held.trimStart();
      const couldBeTag = start.length < OPEN.length ? OPEN.startsWith(start) : start.startsWith(OPEN);
      const end = start.indexOf(">");
      if (!couldBeTag || (end < 0 && start.length > LIMIT)) return this.flush(this.held);
      if (end < 0) return "";
      this.turn = parseTurn(start.slice(0, end + 1));
      this.held = start.slice(end + 1);
      this.state = "gap";
    }
    // The blank space between the line and the reply is not part of the reply.
    const rest = this.held.trimStart();
    return rest ? this.flush(rest) : ((this.held = ""), "");
  }

  /** Call when the reply has ended. Returns anything still held back. */
  end(): string {
    return this.state === "opening" ? this.flush(this.held) : "";
  }

  private flush(text: string): string {
    this.state = "body";
    this.held = "";
    return this.show(text);
  }

  private show(text: string): string {
    this.text += text;
    return text;
  }
}
