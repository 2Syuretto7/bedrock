import { Suspense } from "react";
import Link from "next/link";
import { BurnHeadline } from "@/components/burn-headline";
import { TopBar } from "@/components/chrome";
import { requireUser } from "@/lib/auth/session";

/** Confirms the session against the database; redirects to sign-in if it is not valid. */
async function SessionGate() {
  await requireUser();
  return null;
}

export default function Home() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div className="grid-backdrop" aria-hidden="true" />
      <Suspense fallback={null}>
        <SessionGate />
      </Suspense>
      <TopBar map />
      <main className="relative z-10 flex flex-1 flex-col justify-center px-4 pb-24 pt-8 sm:px-8 lg:px-[12.5vw]">
        <p className="label rise" style={{ "--delay": "100ms" } as React.CSSProperties}>
          Software · Systems · Data · Machine learning · Hardware · Security
        </p>
        <BurnHeadline phrases={["Derive it.", "Build it.", "Break it."]} className="display mt-6" />
        <p className="lead rise mt-6" style={{ "--delay": "420ms" } as React.CSSProperties}>
          One button decides what comes next: a new idea whose foundations you have mastered. Each lesson opens with three new recall questions on earlier ideas, chosen by spaced repetition.
        </p>
        <div className="rise mt-10" style={{ "--delay": "520ms" } as React.CSSProperties}>
          <Link href="/learn" className="btn btn-primary btn-large" prefetch={false}>
            Learn
            <span className="chevron" aria-hidden="true">
              ›
            </span>
          </Link>
        </div>
      </main>
    </div>
  );
}
