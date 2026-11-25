"use client";

import { useSyncExternalStore } from "react";

const KEY = "bedrock-theme";

/** Runs before first paint so the stored theme never flashes. Dark is the default. */
export const themeScript = `try{var t=localStorage.getItem("${KEY}");document.documentElement.classList.toggle("dark",t!=="light")}catch(e){}`;

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("dark"),
    () => true,
  );
  return (
    <button
      type="button"
      className="label bar-item"
      aria-pressed={!dark}
      onClick={() => {
        const next = !dark;
        document.documentElement.classList.toggle("dark", next);
        try {
          localStorage.setItem(KEY, next ? "dark" : "light");
        } catch {}
      }}
    >
      <span suppressHydrationWarning>{dark ? "Light theme" : "Dark theme"}</span>
    </button>
  );
}
