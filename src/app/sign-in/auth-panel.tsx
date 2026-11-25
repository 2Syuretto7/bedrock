"use client";

import { useActionState, useState, useTransition } from "react";
import { createAccountAction, signInAction, type AuthState } from "@/lib/auth/actions";

export function AuthPanel({ hasLearner }: { hasLearner: boolean }) {
  const [created, setCreated] = useState<AuthState>({});
  const [creating, startCreating] = useTransition();
  const [signInState, signInFormAction, signingIn] = useActionState(signInAction, {});
  const [copied, setCopied] = useState(false);

  if (created.passphrase) {
    const passphrase = created.passphrase;
    return (
      <section aria-labelledby="passphrase-title">
        <p className="label">Shown once</p>
        <h1 id="passphrase-title" className="mt-4 text-[28px] font-medium leading-8 tracking-[-0.01em]">
          This is your passphrase.
        </h1>
        <p className="mt-4 text-ink-faint">
          Save it in a password manager now. It is the only way to sign in, on this device or any other, and it cannot be shown again.
        </p>
        <div className="panel mt-6 p-4">
          <p data-testid="passphrase" className="break-words font-mono text-[18px] leading-8 text-ink">
            {passphrase}
          </p>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(passphrase);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            Copy
          </button>
          {/* A full page load on purpose, so the passphrase leaves memory. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="btn btn-primary">
            I have saved it
            <span className="chevron" aria-hidden="true">
              ›
            </span>
          </a>
          <span role="status" className="label">
            {copied ? "Copied" : ""}
          </span>
        </div>
      </section>
    );
  }

  if (!hasLearner) {
    return (
      <section aria-labelledby="create-title">
        <p className="label">First visit</p>
        <h1 id="create-title" className="mt-4 text-[28px] font-medium leading-8 tracking-[-0.01em]">
          Create your passphrase.
        </h1>
        <p className="mt-4 text-ink-faint">
          Bedrock will generate six random words. There is no username, email or password to remember, only those words.
        </p>
        <div className="mt-6">
          <button
            type="button"
            className="btn btn-primary"
            disabled={creating}
            onClick={() => startCreating(async () => setCreated(await createAccountAction()))}
          >
            {creating ? "Generating" : "Generate passphrase"}
          </button>
        </div>
        <p role="alert" className="mt-4 min-h-6 text-error">
          {created.error}
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="sign-in-title">
      <p className="label">Sign in</p>
      <h1 id="sign-in-title" className="mt-4 text-[28px] font-medium leading-8 tracking-[-0.01em]">
        Paste your passphrase.
      </h1>
      <form action={signInFormAction} className="mt-6">
        <label htmlFor="passphrase" className="label">
          Six words
        </label>
        <textarea
          id="passphrase"
          name="passphrase"
          rows={2}
          required
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="input mt-2 resize-none"
          aria-describedby="sign-in-error"
        />
        <p id="sign-in-error" role="alert" className="mt-3 min-h-6 text-error">
          {signInState.error}
        </p>
        <button type="submit" className="btn btn-primary mt-3" disabled={signingIn}>
          {signingIn ? "Checking" : "Sign in"}
        </button>
      </form>
    </section>
  );
}
