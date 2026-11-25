import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: no cookie, no app. The session itself is verified
// against the database wherever data is read (see lib/auth/session.ts).
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("__Host-bedrock_session") || request.cookies.has("bedrock_session");
  if (!hasSession) return NextResponse.redirect(new URL("/sign-in", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!sign-in|api/health|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)"],
};
