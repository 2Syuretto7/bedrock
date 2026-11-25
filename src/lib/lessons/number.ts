/** Exact rational arithmetic for checking numeric answers: 0.75, 3/4 and 75% are the same number. */
export type Rational = { n: bigint; d: bigint };

const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : gcd(b, a % b));

export function rational(n: bigint, d: bigint = 1n): Rational {
  if (d === 0n) throw new Error("Division by zero");
  if (d < 0n) [n, d] = [-n, -d];
  const g = gcd(n, d) || 1n;
  return { n: n / g, d: d / g };
}

function parseDecimal(text: string): Rational | null {
  const match = /^([+-]?)(\d*)(?:\.(\d+))?$/.exec(text);
  if (!match || (match[2] === "" && match[3] === undefined)) return null;
  const [, sign, whole, frac = ""] = match;
  const value = rational(BigInt((whole || "0") + frac), 10n ** BigInt(frac.length));
  return sign === "-" ? { n: -value.n, d: value.d } : value;
}

/** Accepts integers, decimals, fractions (3/4), mixed numbers (1 1/2), percentages and thousands commas. */
export function parseRational(input: string): Rational | null {
  let text = input.trim().replace(/−/g, "-").replace(/(\d),(?=\d)/g, "$1");
  if (text.length === 0 || text.length > 60) return null;
  let scale = 1n;
  if (text.endsWith("%")) {
    scale = 100n;
    text = text.slice(0, -1).trim();
  }
  let value: Rational | null;
  const mixed = /^([+-]?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(text);
  const fraction = /^([+-]?\d*\.?\d+)\s*\/\s*([+-]?\d*\.?\d+)$/.exec(text);
  if (mixed) {
    if (BigInt(mixed[4]) === 0n) return null;
    const whole = BigInt(mixed[2]);
    const part = rational(BigInt(mixed[3]), BigInt(mixed[4]));
    value = rational(whole * part.d + part.n, part.d);
    if (mixed[1] === "-") value = { n: -value.n, d: value.d };
  } else if (fraction) {
    const top = parseDecimal(fraction[1]);
    const bottom = parseDecimal(fraction[2]);
    if (!top || !bottom || bottom.n === 0n) return null;
    value = rational(top.n * bottom.d, top.d * bottom.n);
  } else {
    value = parseDecimal(text);
  }
  return value && rational(value.n, value.d * scale);
}

export const sameNumber = (a: Rational, b: Rational) => a.n === b.n && a.d === b.d;

/** |a - b| <= tolerance, exactly. */
export function within(a: Rational, b: Rational, tolerance: Rational): boolean {
  let diff = a.n * b.d - b.n * a.d;
  if (diff < 0n) diff = -diff;
  return diff * tolerance.d <= tolerance.n * a.d * b.d;
}
