import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { costMicroUsd, tutorEffort, tutorModel } from "../tutor/config";
import type { Ask } from "./generate";

let client: Anthropic | undefined;

/** One request to the model, answered in a fixed JSON shape. */
export const askModel: Ask = async (system, message, shape) => {
  client ??= new Anthropic();
  const model = tutorModel();
  const final = await client.beta.messages
    .stream({
      model,
      max_tokens: 16000,
      output_config: { effort: tutorEffort(), format: betaZodOutputFormat(shape) },
      // If the model declines for policy reasons, the API retries once on its default substitute.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral", ttl: "1h" } }],
      messages: [{ role: "user", content: message }],
    })
    .finalMessage();
  const cost = costMicroUsd(model, final.usage);
  if (final.stop_reason !== "end_turn") return { value: null, costMicroUsd: cost };
  const text = final.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
  try {
    const parsed = shape.safeParse(JSON.parse(text));
    return { value: parsed.success ? parsed.data : null, costMicroUsd: cost };
  } catch {
    return { value: null, costMicroUsd: cost };
  }
};
