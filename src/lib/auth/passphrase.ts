import { randomInt } from "node:crypto";
import words from "./eff-wordlist.json";

/**
 * Word list: the EFF large word list for passphrases (7,776 words),
 * published by the Electronic Frontier Foundation under CC BY 3.0 US.
 * Six words give log2(7776^6), about 77.5 bits of entropy.
 */
export const WORD_COUNT = 6;
const WORDS: readonly string[] = words;

export function generatePassphrase(count: number = WORD_COUNT): string {
  return Array.from({ length: count }, () => WORDS[randomInt(WORDS.length)]).join(" ");
}

/**
 * Makes pasting forgiving: case, surrounding space, and the separators people
 * tend to introduce (extra spaces, hyphens, commas, line breaks) do not matter.
 */
export function normalisePassphrase(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean)
    .join(" ");
}

/** Cheap shape check so obviously wrong input never reaches Argon2. */
export function looksLikePassphrase(normalised: string): boolean {
  // A few list entries are hyphenated ("yo-yo"), and normalising splits them,
  // so six generated words can become up to twelve tokens.
  const parts = normalised.split(" ");
  return parts.length >= WORD_COUNT && parts.length <= WORD_COUNT * 2 && normalised.length <= 160;
}
