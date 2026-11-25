"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requestFingerprint, setSessionCookie } from "./session";
import { signIn, signUp } from "./service";

export type AuthState = { passphrase?: string; error?: string };

export async function createAccountAction(): Promise<AuthState> {
  const { userAgent } = await requestFingerprint();
  const result = await signUp(getDb(), userAgent);
  if (!result.ok) return { error: "An account already exists. Paste your passphrase to sign in." };
  await setSessionCookie(result.token);
  return { passphrase: result.passphrase };
}

export async function signInAction(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const input = String(formData.get("passphrase") ?? "").slice(0, 400);
  const { ipHash, userAgent } = await requestFingerprint();
  const result = await signIn(getDb(), input, ipHash, userAgent);
  if (!result.ok) {
    if (result.reason === "rate_limited") {
      const minutes = Math.ceil(result.retryAfterSeconds / 60);
      return { error: `Too many attempts. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.` };
    }
    return { error: "That passphrase did not match. Check the words and their order." };
  }
  await setSessionCookie(result.token);
  redirect("/");
}
