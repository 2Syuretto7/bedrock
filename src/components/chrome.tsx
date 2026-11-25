import Link from "next/link";
import { ThemeToggle } from "./theme";

/** The thin top line shared by every screen: wordmark left, quiet controls right. The Map link is only for signed-in screens. */
export function TopBar({ map = false }: { map?: boolean }) {
  return (
    <header className="relative z-10 flex h-14 items-center justify-between px-4 sm:px-8">
      <Link href="/" className="bar-item font-mono text-[13px] tracking-[0.32em] text-ink" aria-label="Bedrock home">
        BEDROCK
      </Link>
      <nav className="flex items-center gap-4 sm:gap-6" aria-label="Site">
        {map ? (
          <Link href="/map" className="label bar-item">
            Map
          </Link>
        ) : null}
        <ThemeToggle />
      </nav>
    </header>
  );
}
