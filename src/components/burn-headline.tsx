/**
 * Headline that reveals once, character by character. Each phrase stays on one
 * line, so the headline breaks only between phrases. Screen readers get the
 * plain text through aria-label; the split spans are hidden from them. With
 * reduced motion the headline simply appears fully formed.
 */
export function BurnHeadline({ phrases, className = "" }: { phrases: string[]; className?: string }) {
  let index = 0;
  return (
    <h1 aria-label={phrases.join(" ")} className={`burn ${className}`}>
      {phrases.map((phrase, p) => (
        <span key={p} aria-hidden="true">
          <span className="word">
            {Array.from(phrase).map((char) => {
              const i = index++;
              return (
                <span key={i} className="char" style={{ "--i": i } as React.CSSProperties}>
                  {char === " " ? " " : char}
                </span>
              );
            })}
          </span>{" "}
        </span>
      ))}
    </h1>
  );
}
