import { hash, verify } from "@node-rs/argon2";

// Argon2id (algorithm 2), 64 MiB, 3 passes. A per-hash random salt is generated
// by the library and stored inside the encoded hash string.
const OPTIONS = { algorithm: 2, memoryCost: 64 * 1024, timeCost: 3, parallelism: 1, outputLen: 32 } as const;

export function hashPassphrase(normalised: string): Promise<string> {
  return hash(normalised, OPTIONS);
}

export async function verifyPassphrase(encoded: string, normalised: string): Promise<boolean> {
  try {
    return await verify(encoded, normalised);
  } catch {
    return false;
  }
}

// Verified against when no account exists, so timing does not reveal that.
let decoy: Promise<string> | undefined;
export function decoyHash(): Promise<string> {
  decoy ??= hashPassphrase("decoy decoy decoy decoy decoy decoy");
  return decoy;
}
