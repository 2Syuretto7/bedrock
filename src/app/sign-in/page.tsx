import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { TopBar } from "@/components/chrome";
import { learnerExists } from "@/lib/auth/service";
import { getDb } from "@/lib/db";
import { AuthPanel } from "./auth-panel";

export const metadata: Metadata = { title: "Sign in" };

async function Panel() {
  await connection(); // Always decided at request time, never prerendered.
  return <AuthPanel hasLearner={await learnerExists(getDb())} />;
}

export default function SignIn() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div className="grid-backdrop" aria-hidden="true" />
      <TopBar />
      <main className="relative z-10 flex flex-1 flex-col justify-center px-4 pb-24 sm:px-8 lg:px-[12.5vw]">
        <div className="w-full max-w-[480px]">
          <Suspense fallback={<p className="label">Loading</p>}>
            <Panel />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
