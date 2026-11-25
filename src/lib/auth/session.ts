import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getDb } from "@/lib/db";
import { sha256, userForToken } from "./service";

const isProduction = process.env.NODE_ENV === "production";
// The __Host- prefix makes browsers refuse the cookie unless it is Secure,
// host-only and path "/", so no subdomain or plain-HTTP page can set it.
export const SESSION_COOKIE = isProduction && !process.env.BEDROCK_INSECURE_COOKIES ? "__Host-bedrock_session" : "bedrock_session";
const COOKIE_MAX_AGE_S = 400 * 24 * 60 * 60; // The server decides real expiry (90 days from last use).

export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: SESSION_COOKIE.startsWith("__Host-"),
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_S,
  });
}

export async function readSessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/** The signed-in learner, or null. Reads the request, so call it inside a Suspense boundary. */
export const getCurrentUser = cache(async () => {
  await connection(); // Sessions depend on the current time, so never prerender or prefetch this.
  return userForToken(getDb(), await readSessionToken());
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

export async function requestFingerprint() {
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return { ipHash: sha256(`bedrock-ip:${ip}`), userAgent: h.get("user-agent") };
}
