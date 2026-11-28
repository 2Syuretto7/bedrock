"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import type { FigureName } from "@/lib/lessons/figures";

/*
 * Every figure is drawn here as interactive SVG. None is an image file.
 * Each has a text description of its current state, so it reads the same to a
 * screen reader as it looks, and every control is a real button or slider.
 */

type Props = Record<string, unknown>;
const num = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const group = (n: number) => n.toLocaleString("en-IN");

function Frame({ title, summary, children, controls }: { title: string; summary: string; children: ReactNode; controls: ReactNode }) {
  return (
    <figure className="fig">
      <figcaption className="label">{title}</figcaption>
      <div className="fig-stage">{children}</div>
      <p className="fig-summary" aria-live="polite">
        {summary}
      </p>
      <div className="fig-controls">{controls}</div>
    </figure>
  );
}

function Stepper({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <span className="fig-stepper">
      <span className="label">{label}</span>
      <button type="button" className="q-move" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
        −
      </button>
      <output className="fig-value">{value}</output>
      <button type="button" className="q-move" aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </span>
  );
}

function Slider({ label, value, onChange, min, max, step = 1, text }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; text?: string }) {
  return (
    <label className="fig-slider">
      <span className="label">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} aria-valuetext={text} onChange={(event) => onChange(Number(event.target.value))} />
      {text === undefined ? null : <output className="fig-value">{text}</output>}
    </label>
  );
}

const PLACES = ["ones", "tens", "hundreds", "thousands", "ten thousands", "lakhs"];

/** A number as digits in columns. Each column is worth ten of the column to its right. */
function PlaceValue(props: Props) {
  const columns = clamp(num(props.columns, 4), 2, 6);
  const [value, setValue] = useState(clamp(num(props.start, 207), 0, 10 ** columns - 1));
  const digits = Array.from({ length: columns }, (_, i) => Math.floor(value / 10 ** (columns - 1 - i)) % 10);
  const width = 88;
  const parts = digits.map((d, i) => d * 10 ** (columns - 1 - i)).filter((part) => part > 0);
  const add = (by: number) => setValue((v) => clamp(v + by, 0, 10 ** columns - 1));
  return (
    <Frame
      title="Place value"
      summary={`${group(value)} = ${parts.length ? parts.map(group).join(" + ") : "0"}`}
      controls={
        <>
          {[1, 10, 100].map((by) => (
            <span key={by} className="fig-stepper">
              <button type="button" className="btn btn-secondary btn-small" onClick={() => add(-by)}>
                −{by}
              </button>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => add(by)}>
                +{by}
              </button>
            </span>
          ))}
        </>
      }
    >
      <svg viewBox={`0 0 ${columns * width} 150`} role="img" aria-label={`The digits of ${value} in place-value columns`}>
        {digits.map((digit, i) => {
          const place = columns - 1 - i;
          return (
            <g key={i} transform={`translate(${i * width} 0)`}>
              <rect x="4" y="4" width={width - 8} height="142" className="fig-cell" />
              <text x={width / 2} y="26" className="fig-small" textAnchor="middle">
                {PLACES[place]}
              </text>
              <text x={width / 2} y="88" className="fig-digit" textAnchor="middle">
                {digit}
              </text>
              <text x={width / 2} y="130" className="fig-small" textAnchor="middle">
                {digit} × {group(10 ** place)}
              </text>
            </g>
          );
        })}
      </svg>
    </Frame>
  );
}

/** A point that moves along a number line in equal steps, possibly below zero or between whole numbers. */
function NumberLine(props: Props) {
  const min = num(props.min, 0);
  const max = num(props.max, 10);
  const parts = clamp(num(props.parts, 1), 1, 12); // steps per unit
  const [ticks, setTicks] = useState(Math.round(num(props.start, min) * parts));
  const [from] = useState(ticks);
  const x = (t: number) => 30 + ((t / parts - min) / (max - min)) * 540;
  const name = (t: number) => {
    if (parts === 1 || t % parts === 0) return String(t / parts);
    return `${t < 0 ? "−" : ""}${Math.abs(t)}/${parts}`;
  };
  const moved = ticks - from;
  return (
    <Frame
      title="Number line"
      summary={
        moved === 0
          ? `The point is at ${name(ticks)}.`
          : `Started at ${name(from)}, moved ${Math.abs(moved)} step${Math.abs(moved) === 1 ? "" : "s"} ${moved > 0 ? "right" : "left"}, now at ${name(ticks)}.`
      }
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" disabled={ticks <= min * parts} onClick={() => setTicks(ticks - 1)}>
            Step left
          </button>
          <button type="button" className="btn btn-secondary btn-small" disabled={ticks >= max * parts} onClick={() => setTicks(ticks + 1)}>
            Step right
          </button>
        </>
      }
    >
      <svg viewBox="0 0 600 90" role="img" aria-label={`Number line from ${min} to ${max} with a point at ${name(ticks)}`}>
        <line x1="20" y1="45" x2="580" y2="45" className="fig-axis" />
        {Array.from({ length: (max - min) * parts + 1 }, (_, i) => {
          const t = min * parts + i;
          const whole = t % parts === 0;
          return (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={whole ? 35 : 40} y2={whole ? 55 : 50} className="fig-axis" />
              {whole ? (
                <text x={x(t)} y="76" textAnchor="middle" className="fig-small">
                  {String(t / parts).replace("-", "−")}
                </text>
              ) : null}
            </g>
          );
        })}
        {moved !== 0 ? <line x1={x(from)} x2={x(ticks)} y1="22" y2="22" className="fig-accent-line" /> : null}
        <circle cx={x(ticks)} cy="45" r="7" className="fig-accent" />
      </svg>
    </Frame>
  );
}

/** Multiplication as the area of a rectangle, split to show the distributive law. */
function AreaGrid(props: Props) {
  const [rows, setRows] = useState(clamp(num(props.rows, 3), 1, 9));
  const [cols, setCols] = useState(clamp(num(props.columns, 12), 2, 15));
  const [split, setSplit] = useState(clamp(num(props.split, 10), 1, 14));
  const cut = Math.min(split, cols - 1);
  const cell = 28;
  return (
    <Frame
      title="Multiplication as area"
      summary={`${rows} × ${cols} = ${rows} × ${cut} + ${rows} × ${cols - cut} = ${rows * cut} + ${rows * (cols - cut)} = ${rows * cols}`}
      controls={
        <>
          <Stepper label="rows" value={rows} onChange={setRows} min={1} max={9} />
          <Stepper label="columns" value={cols} onChange={setCols} min={2} max={15} />
          <Slider label="split" value={cut} onChange={setSplit} min={1} max={cols - 1} />
        </>
      }
    >
      <svg viewBox={`0 0 ${15 * cell + 8} ${9 * cell + 8}`} role="img" aria-label={`A grid of ${rows} rows and ${cols} columns, split after column ${cut}`}>
        {Array.from({ length: rows * cols }, (_, i) => {
          const [r, c] = [Math.floor(i / cols), i % cols];
          return <rect key={i} x={4 + c * cell} y={4 + r * cell} width={cell - 3} height={cell - 3} className={c < cut ? "fig-accent" : "fig-fill"} />;
        })}
      </svg>
    </Frame>
  );
}

/** A whole cut into equal parts, some shaded, and the same amount cut more finely. */
function FractionBar(props: Props) {
  const [den, setDen] = useState(clamp(num(props.denominator, 4), 1, 12));
  const [n, setN] = useState(clamp(num(props.numerator, 3), 0, 24));
  const [finer, setFiner] = useState(clamp(num(props.finer, 1), 1, 4));
  const top = Math.min(n, den * 2);
  const bar = (y: number, parts: number, shaded: number) =>
    Array.from({ length: parts * 2 }, (_, i) => (
      <rect key={`${y}-${i}`} x={10 + (i * 280) / parts} y={y} width={280 / parts - 2} height="34" className={i < shaded ? "fig-accent" : i < parts ? "fig-fill" : "fig-ghost"} />
    ));
  return (
    <Frame
      title="Fractions"
      summary={
        finer === 1
          ? `${top}/${den}: the whole is cut into ${den} equal parts and ${top} are taken.${top > den ? " That is more than one whole." : ""}`
          : `${top}/${den} = ${top * finer}/${den * finer}: every part was cut into ${finer}, so there are ${finer} times as many parts and ${finer} times as many taken.`
      }
      controls={
        <>
          <Stepper label="parts taken" value={top} onChange={setN} min={0} max={den * 2} />
          <Stepper label="parts in a whole" value={den} onChange={setDen} min={1} max={12} />
          <Stepper label="cut each part into" value={finer} onChange={setFiner} min={1} max={4} />
        </>
      }
    >
      <svg viewBox="0 0 580 110" role="img" aria-label={`Two bars, each showing ${top} parts out of ${den}; the lower bar is cut ${finer} times finer`}>
        {bar(10, den, top)}
        {bar(62, den * finer, top * finer)}
        <line x1="290" x2="290" y1="2" y2="104" className="fig-axis" strokeDasharray="4 4" />
      </svg>
    </Frame>
  );
}

const SCALE: Record<number, string> = {
  [-9]: "a billionth",
  [-6]: "a millionth",
  [-3]: "a thousandth",
  [-2]: "a hundredth",
  [-1]: "a tenth",
  0: "one",
  1: "ten",
  2: "a hundred",
  3: "a thousand",
  6: "a million",
  9: "a billion",
  12: "a trillion",
};

/** Ten multiplied by itself, or divided away, one step at a time. */
function PowersOfTen(props: Props) {
  const [n, setN] = useState(clamp(num(props.start, 3), -9, 12));
  const written = n >= 0 ? "1" + "0".repeat(n) : "0." + "0".repeat(-n - 1) + "1";
  const spaced = n >= 0 ? written.replace(/\B(?=(\d{3})+$)/g, " ") : written;
  return (
    <Frame
      title="Powers of ten"
      summary={`10 to the power ${String(n).replace("-", "−")} is ${spaced}${SCALE[n] ? `, ${SCALE[n]}` : ""}. Each step right multiplies by ten; each step left divides by ten.`}
      controls={<Slider label="exponent" value={n} onChange={setN} min={-9} max={12} />}
    >
      <svg viewBox="0 0 600 110" role="img" aria-label={`10 to the power ${n} written out as ${spaced}`}>
        <text x="300" y="50" textAnchor="middle" className="fig-digit">
          10
          <tspan dy="-18" fontSize="20">
            {String(n).replace("-", "−")}
          </tspan>
        </text>
        <text x="300" y="92" textAnchor="middle" className="fig-mono">
          {spaced}
        </text>
      </svg>
    </Frame>
  );
}

/** Two quantities that grow together: multiply one and the other is multiplied by the same number. */
function RatioTable(props: Props) {
  const a = clamp(num(props.a, 4), 1, 20);
  const b = clamp(num(props.b, 1), 1, 20);
  const [k, setK] = useState(clamp(num(props.start, 1), 1, 12));
  const names = [String(props.first ?? "first"), String(props.second ?? "second")];
  const scale = 560 / ((a + b) * 12);
  return (
    <Frame
      title="Ratio"
      summary={`${a * k} ${names[0]} to ${b * k} ${names[1]}: both are ${k} times the base amounts ${a} and ${b}, so the ratio is still ${a} : ${b}. Total ${(a + b) * k}.`}
      controls={<Slider label="multiply both by" value={k} onChange={setK} min={1} max={12} />}
    >
      <svg viewBox="0 0 600 80" role="img" aria-label={`A bar of ${a * k} ${names[0]} beside ${b * k} ${names[1]}`}>
        <rect x="20" y="20" width={a * k * scale} height="36" className="fig-accent" />
        <rect x={20 + a * k * scale + 3} y="20" width={b * k * scale} height="36" className="fig-fill" />
        <text x="20" y="74" className="fig-small">
          {a * k} {names[0]}
        </text>
        <text x={20 + a * k * scale + 3} y="14" className="fig-small">
          {b * k} {names[1]}
        </text>
      </svg>
    </Frame>
  );
}

const SUPERSCRIPT: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
const tenTo = (k: number) => `10${String(k).replace(/./g, (c) => SUPERSCRIPT[c] ?? c)}`;
/** Two significant figures, so a ratio reads as "about 30,000" and not as a long string of digits. */
const roughly = (n: number) => {
  if (n >= 100) {
    const step = 10 ** (Math.floor(Math.log10(n)) - 1);
    return group(Math.round(n / step) * step);
  }
  return String(Number(n.toPrecision(2)));
};
const seconds = (s: number) => {
  if (s < 1e-6) return `${Number((s * 1e9).toPrecision(2))} nanoseconds`;
  if (s < 1e-3) return `${Number((s * 1e6).toPrecision(2))} microseconds`;
  if (s < 1) return `${Number((s * 1e3).toPrecision(2))} milliseconds`;
  return `${group(s)} seconds`;
};
/** Written out, with the power of ten beside anything a reader would have to count the zeros of. */
const withPower = (n: number, written: string) => (n >= 1e7 || n < 1e-3 ? `${written}, about ${roughly(n / 10 ** Math.floor(Math.log10(n)))} × ${tenTo(Math.floor(Math.log10(n)))}` : written);

const LOG_SETS: Record<string, { title: string; show: (n: number) => string; items: { name: string; short: string; value: number }[] }> = {
  bytes: {
    title: "Sizes in bytes",
    show: (n) => withPower(n, `${group(n)} ${n === 1 ? "byte" : "bytes"}`),
    items: [
      { name: "one letter of plain text", short: "a letter", value: 1 },
      { name: "one SMS", short: "an SMS", value: 140 },
      { name: "a page of plain text", short: "a page", value: 2_000 },
      { name: "a phone photograph", short: "a photo", value: 3_000_000 },
      { name: "an hour of HD video", short: "an hour of video", value: 3_000_000_000 },
      { name: "a 1 TB laptop drive", short: "a drive", value: 1_000_000_000_000 },
    ],
  },
  time: {
    title: "Durations in seconds",
    show: (n) => withPower(n, seconds(n)),
    items: [
      { name: "one clock tick of a 3 GHz processor", short: "a clock tick", value: 1 / 3e9 },
      { name: "one read from main memory", short: "a memory read", value: 1e-7 },
      { name: "a network round trip from Mumbai to Chennai", short: "a round trip", value: 0.02 },
      { name: "a fast ball, from the bowler's hand to the bat", short: "a fast ball", value: 0.5 },
      { name: "a day", short: "a day", value: 86_400 },
      { name: "a year", short: "a year", value: 31_536_000 },
    ],
  },
  counts: {
    title: "Counts",
    show: (n) => withPower(n, group(n)),
    items: [
      { name: "the players in a cricket team", short: "a team", value: 11 },
      { name: "the students in a large school", short: "a school", value: 2_000 },
      { name: "the crowd in a full Wankhede Stadium", short: "a stadium", value: 33_000 },
      { name: "the people of the Mumbai region", short: "Mumbai", value: 20_000_000 },
      { name: "the people of India", short: "India", value: 1_400_000_000 },
      { name: "the UPI payments made in a month in 2025", short: "UPI, a month", value: 20_000_000_000 },
    ],
  },
  money: {
    title: "Amounts in rupees",
    show: (n) => withPower(n, `₹${group(n)}`),
    items: [
      { name: "a cutting chai", short: "chai", value: 15 },
      { name: "a basic smartphone", short: "a phone", value: 10_000 },
      { name: "a small car", short: "a car", value: 6_00_000 },
      { name: "a flat in a big city", short: "a flat", value: 1_00_00_000 },
      { name: "a very large company's sales in a year", short: "a company", value: 1_00_000_00_00_000 },
      { name: "the Union Budget for 2025–26", short: "the Budget", value: 50_00_000_00_00_000 },
    ],
  },
};

/** The same handful of quantities on an even scale and on a logarithmic one, where each equal step multiplies by ten. */
function LogScale(props: Props) {
  const set = LOG_SETS[String(props.set)] ?? LOG_SETS.bytes;
  const n = set.items.length;
  const [first, setFirst] = useState(clamp(num(props.first, 2), 1, n));
  const [second, setSecond] = useState(clamp(num(props.second, n - 1), 1, n));
  const [even, setEven] = useState(props.even === true);
  const logs = set.items.map((item) => Math.log10(item.value));
  const low = Math.floor(Math.min(...logs));
  const high = Math.ceil(Math.max(...logs));
  const largest = Math.max(...set.items.map((item) => item.value));
  const x = (value: number) => 30 + 540 * (even ? value / largest : (Math.log10(value) - low) / (high - low));
  // Few enough tick labels that each stays legible when the drawing is shrunk to a phone's width.
  const every = Math.ceil((high - low) / 6);
  const ticks = even
    ? [0, 0.25, 0.5, 0.75, 1].map((f) => ({ at: 30 + 540 * f, label: ["0", "¼", "½", "¾", "the largest"][f * 4] }))
    : Array.from({ length: high - low + 1 }, (_, i) => low + i).map((k) => ({ at: 30 + (540 * (k - low)) / (high - low), label: (k - low) % every === 0 ? tenTo(k) : "" }));
  const [a, b] = [set.items[first - 1], set.items[second - 1]];
  const [small, big] = a.value <= b.value ? [a, b] : [b, a];
  const apart = Math.log10(big.value / small.value);
  const crowded = set.items.filter((item) => item.value / largest < 0.01).length;
  const times = big.value / small.value;
  const capital = (text: string) => text[0].toUpperCase() + text.slice(1);
  const summary = even
    ? `On an even scale every equal step adds the same amount: each quarter of the line is a quarter of the largest, ${set.show(largest)}. ${crowded} of the ${n} quantities are under 1% of the largest, so they sit on top of one another at zero and cannot be told apart.`
    : `${capital(a.name)}: ${set.show(a.value)}. ${capital(b.name)}: ${set.show(b.value)}. ${
        a === b
          ? "The same quantity, picked twice."
          : `The larger is ${Number(apart.toFixed(1))} orders of magnitude above the smaller: about ${times >= 1e6 ? `${roughly(times / 10 ** Math.floor(Math.log10(times)))} × ${tenTo(Math.floor(Math.log10(times)))}` : roughly(times)} times as much.`
      } On this scale every equal step multiplies by ten.`;
  const anchor = (at: number) => (at < 110 ? "start" : at > 490 ? "end" : "middle");
  return (
    <Frame
      title={`${set.title}, on ${even ? "an even" : "a logarithmic"} scale`}
      summary={summary}
      controls={
        <>
          <Stepper label="first" value={first} onChange={setFirst} min={1} max={n} />
          <Stepper label="second" value={second} onChange={setSecond} min={1} max={n} />
          <button type="button" className="btn btn-secondary" aria-pressed={even} onClick={() => setEven(!even)}>
            {even ? "Show the logarithmic scale" : "Show an even scale"}
          </button>
        </>
      }
    >
      <svg viewBox="0 0 600 190" role="img" aria-label={`${set.title} marked on ${even ? "an even" : "a logarithmic"} scale, with ${a.short} and ${b.short} picked out`}>
        <line x1="30" y1="100" x2="570" y2="100" className="fig-axis" />
        {ticks.map((tick) => (
          <g key={tick.at}>
            <line x1={tick.at} y1="94" x2={tick.at} y2="106" className="fig-axis" />
            <text x={tick.at} y="178" textAnchor={anchor(tick.at)} className="fig-scale-tick">
              {tick.label}
            </text>
          </g>
        ))}
        {set.items.map((item, i) => {
          const picked = i === first - 1 || i === second - 1;
          return <circle key={item.name} cx={x(item.value)} cy="100" r={picked ? 7 : 5} className={picked ? "fig-accent" : "fig-fill"} />;
        })}
        <text x={x(a.value)} y="74" textAnchor={anchor(x(a.value))} className="fig-scale-name">
          {a.short}
        </text>
        <text x={x(b.value)} y={a === b ? "48" : "138"} textAnchor={anchor(x(b.value))} className="fig-scale-name">
          {b.short}
        </text>
      </svg>
    </Frame>
  );
}

const fmt = (n: number) => {
  const text = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return text.replace("-", "−");
};
/** Writes c1·name1 + c2·name2 + … as people write it: no "1x", no "+ −", no zero terms. */
const sumOf = (terms: [number, string][]) => {
  const kept = terms.filter(([k]) => k !== 0);
  if (kept.length === 0) return "0";
  return kept
    .map(([k, name], i) => {
      const size = Math.abs(k);
      const body = name === "" ? fmt(size) : `${size === 1 ? "" : fmt(size)}${name}`;
      return i === 0 ? `${k < 0 ? "−" : ""}${body}` : `${k < 0 ? "−" : "+"} ${body}`;
    })
    .join(" ");
};

const REACH = 8; // the plane runs from −8 to 8 both ways
const UNIT = 20;
const px = (x: number) => 170 + x * UNIT;
const py = (y: number) => 170 - y * UNIT;

function PlaneGrid({ label, children }: { label: string; children: ReactNode }) {
  const marks = Array.from({ length: 2 * REACH + 1 }, (_, i) => i - REACH);
  return (
    <svg viewBox="0 0 340 340" role="img" aria-label={label}>
      <defs>
        <clipPath id="plane-clip">
          <rect x={px(-REACH)} y={py(REACH)} width={2 * REACH * UNIT} height={2 * REACH * UNIT} />
        </clipPath>
      </defs>
      {marks.map((k) => (
        <g key={k}>
          <line x1={px(k)} x2={px(k)} y1={py(-REACH)} y2={py(REACH)} className="fig-grid" />
          <line y1={py(k)} y2={py(k)} x1={px(-REACH)} x2={px(REACH)} className="fig-grid" />
          {k !== 0 && k % 2 === 0 ? (
            <>
              <text x={px(k)} y={py(0) + 13} textAnchor="middle" className="fig-small">
                {fmt(k)}
              </text>
              <text x={px(0) - 5} y={py(k) + 4} textAnchor="end" className="fig-small">
                {fmt(k)}
              </text>
            </>
          ) : null}
        </g>
      ))}
      <line x1={px(-REACH)} x2={px(REACH)} y1={py(0)} y2={py(0)} className="fig-axis" />
      <line y1={py(-REACH)} y2={py(REACH)} x1={px(0)} x2={px(0)} className="fig-axis" />
      <text x={px(REACH) - 2} y={py(0) - 6} textAnchor="end" className="fig-small">
        x
      </text>
      <text x={px(0) + 6} y={py(REACH) + 10} className="fig-small">
        y
      </text>
      <g clipPath="url(#plane-clip)">{children}</g>
    </svg>
  );
}

/** A point named by two numbers: how far across, then how far up. */
function PlanePoint(props: Props) {
  const [x, setX] = useState(clamp(Math.round(num(props.x, 3)), -REACH, REACH));
  const [y, setY] = useState(clamp(Math.round(num(props.y, 2)), -REACH, REACH));
  const across = x === 0 ? "neither left nor right" : `${Math.abs(x)} ${x > 0 ? "right" : "left"}`;
  const up = y === 0 ? "neither up nor down" : `${Math.abs(y)} ${y > 0 ? "up" : "down"}`;
  const where =
    x === 0 && y === 0
      ? "It is the origin."
      : x === 0
        ? "It lies on the y-axis."
        : y === 0
          ? "It lies on the x-axis."
          : `It is in quadrant ${x > 0 ? (y > 0 ? "I" : "IV") : y > 0 ? "II" : "III"}.`;
  const square = x * x + y * y;
  const root = Math.sqrt(square);
  return (
    <Frame
      title="Coordinates"
      summary={`The point (${fmt(x)}, ${fmt(y)}): ${across}, ${up}. ${where} Distance from the origin: ${Number.isInteger(root) ? fmt(root) : `√${square} ≈ ${fmt(root)}`}.`}
      controls={
        <>
          <Stepper label="x" value={x} onChange={setX} min={-REACH} max={REACH} />
          <Stepper label="y" value={y} onChange={setY} min={-REACH} max={REACH} />
        </>
      }
    >
      <PlaneGrid label={`The coordinate plane with a point at (${x}, ${y})`}>
        <line x1={px(x)} x2={px(x)} y1={py(0)} y2={py(y)} className="fig-guide" />
        <line x1={px(0)} x2={px(x)} y1={py(y)} y2={py(y)} className="fig-guide" />
        <circle cx={px(x)} cy={py(y)} r="6" className="fig-accent" />
      </PlaneGrid>
    </Frame>
  );
}

const lineName = (m: number, b: number) => `y = ${sumOf([[m, "x"], [b, ""]])}`;
const drawLine = (m: number, b: number, className: string) => (
  <line x1={px(-REACH - 1)} y1={py(m * (-REACH - 1) + b)} x2={px(REACH + 1)} y2={py(m * (REACH + 1) + b)} className={className} />
);

/** A straight line steered by its slope and its intercept, with the slope drawn as a step. */
function PlaneLine(props: Props) {
  const [m, setM] = useState(clamp(num(props.slope, 2), -4, 4));
  const [b, setB] = useState(clamp(num(props.intercept, 1), -6, 6));
  const rise = m === 0 ? "stays level" : `goes ${m > 0 ? "up" : "down"} ${fmt(Math.abs(m))}`;
  return (
    <Frame
      title="Straight line"
      summary={`${lineName(m, b)}. It crosses the y-axis at ${fmt(b)}. For each 1 step to the right it ${rise}.`}
      controls={
        <>
          <Slider label="slope" value={m} onChange={setM} min={-4} max={4} step={0.5} />
          <Slider label="intercept" value={b} onChange={setB} min={-6} max={6} />
        </>
      }
    >
      <PlaneGrid label={`The line ${lineName(m, b)}`}>
        {drawLine(m, b, "fig-accent-line")}
        <line x1={px(0)} x2={px(1)} y1={py(b)} y2={py(b)} className="fig-line" />
        <line x1={px(1)} x2={px(1)} y1={py(b)} y2={py(b + m)} className="fig-line" />
        <circle cx={px(0)} cy={py(b)} r="5" className="fig-accent" />
      </PlaneGrid>
    </Frame>
  );
}

/** Two lines. Where they cross is the one pair of numbers that satisfies both equations. */
function PlaneLines(props: Props) {
  const [m, setM] = useState(clamp(num(props.slope, 1), -4, 4));
  const [b, setB] = useState(clamp(num(props.intercept, 1), -6, 6));
  const m2 = clamp(num(props.otherSlope, -1), -4, 4);
  const b2 = clamp(num(props.otherIntercept, 5), -6, 6);
  const x = m === m2 ? null : (b2 - b) / (m - m2);
  const meeting =
    x === null
      ? b === b2
        ? "They are the same line, so every point on it satisfies both equations."
        : "They are parallel and never meet, so no pair satisfies both equations."
      : `They cross at (${fmt(x)}, ${fmt(m * x + b)}), the only pair that satisfies both equations.`;
  return (
    <Frame
      title="Two lines"
      summary={`${lineName(m, b)} and ${lineName(m2, b2)}. ${meeting}`}
      controls={
        <>
          <Slider label="slope" value={m} onChange={setM} min={-4} max={4} step={0.5} />
          <Slider label="intercept" value={b} onChange={setB} min={-6} max={6} />
        </>
      }
    >
      <PlaneGrid label={`The lines ${lineName(m, b)} and ${lineName(m2, b2)}`}>
        {drawLine(m2, b2, "fig-line")}
        {drawLine(m, b, "fig-accent-line")}
        {x === null ? null : <circle cx={px(x)} cy={py(m * x + b)} r="6" className="fig-accent" />}
      </PlaneGrid>
    </Frame>
  );
}

const listOf = (items: number[]) => (items.length === 0 ? "nothing" : items.map(fmt).join(", "));

/** Two sets of whole numbers drawn as overlapping regions, with their union, intersection and differences. */
function Venn(props: Props) {
  const top = 12;
  const [a, setA] = useState(clamp(Math.round(num(props.a, 2)), 2, 6));
  const [b, setB] = useState(clamp(Math.round(num(props.b, 3)), 2, 6));
  const universe = Array.from({ length: top }, (_, i) => i + 1);
  const onlyA = universe.filter((n) => n % a === 0 && n % b !== 0);
  const both = universe.filter((n) => n % a === 0 && n % b === 0);
  const onlyB = universe.filter((n) => n % a !== 0 && n % b === 0);
  const neither = universe.filter((n) => n % a !== 0 && n % b !== 0);
  const column = (items: number[], x: number) =>
    items.map((n, i) => (
      <text key={n} x={x} y={150 - (items.length - 1) * 11 + i * 22} textAnchor="middle" className="fig-mono">
        {n}
      </text>
    ));
  return (
    <Frame
      title="Two sets"
      summary={`Among the numbers 1 to ${top}, A is the multiples of ${a} and B is the multiples of ${b}. In both (A ∩ B): ${listOf(both)}. In at least one (A ∪ B): ${listOf(universe.filter((n) => n % a === 0 || n % b === 0))}. In A but not B (A ∖ B): ${listOf(onlyA)}. In neither: ${listOf(neither)}.`}
      controls={
        <>
          <Stepper label="A: multiples of" value={a} onChange={setA} min={2} max={6} />
          <Stepper label="B: multiples of" value={b} onChange={setB} min={2} max={6} />
        </>
      }
    >
      <svg viewBox="0 0 440 290" role="img" aria-label={`Two overlapping regions for the multiples of ${a} and of ${b} among 1 to ${top}`}>
        <rect x="10" y="10" width="420" height="270" className="fig-ghost" />
        <circle cx="165" cy="145" r="115" className="fig-ghost" />
        <circle cx="275" cy="145" r="115" className="fig-ghost" />
        <text x="80" y="40" className="fig-small">
          A
        </text>
        <text x="352" y="40" className="fig-small">
          B
        </text>
        {column(onlyA, 105)}
        {column(both, 220)}
        {column(onlyB, 335)}
        <text x="20" y="272" className="fig-small">
          outside both: {listOf(neither)}
        </text>
      </svg>
    </Frame>
  );
}

const MAP_RULES: { name: string; f: (x: number, m: number) => number }[] = [
  { name: "x mod m", f: (x, m) => x % m },
  { name: "(x + 1) mod m", f: (x, m) => (x + 1) % m },
  { name: "2x mod m", f: (x, m) => (2 * x) % m },
  { name: "(x // 2) mod m", f: (x, m) => Math.floor(x / 2) % m },
  { name: "x² mod m", f: (x, m) => (x * x) % m },
];

/** A function drawn as arrows from each input to its one output, with the two questions asked of any map. */
function ArrowMap(props: Props) {
  const [n, setN] = useState(clamp(Math.round(num(props.inputs, 4)), 2, 6));
  const [m, setM] = useState(clamp(Math.round(num(props.outputs, 4)), 2, 6));
  const [rule, setRule] = useState(clamp(Math.round(num(props.rule, 1)), 1, MAP_RULES.length));
  const { name, f } = MAP_RULES[rule - 1];
  const inputs = Array.from({ length: n }, (_, i) => i);
  const outputs = Array.from({ length: m }, (_, i) => i);
  const image = inputs.map((x) => f(x, m));
  const missed = outputs.filter((y) => !image.includes(y));
  const clash = inputs.find((x) => image.indexOf(image[x]) !== x);
  const injective = clash === undefined;
  const surjective = missed.length === 0;
  const yIn = (i: number) => 40 + i * 40;
  const kind = injective && surjective ? "a bijection" : injective ? "injective only" : surjective ? "surjective only" : "neither";
  const plain = props.plain === true;
  const head = `f(x) = ${name} with m = ${m}, from {${inputs.join(", ")}} to {${outputs.join(", ")}}. Every input has exactly one arrow.`;
  const range = `The outputs that are reached, the range, are {${outputs.filter((y) => image.includes(y)).join(", ")}}.`;
  return (
    <Frame
      title="Arrow diagram"
      summary={
        plain
          ? `${head} ${range}`
          : `${head} Injective: ${injective ? "yes, no output is hit twice" : `no, inputs ${image.indexOf(image[clash!])} and ${clash} share the output ${image[clash!]}`}. Surjective: ${
              surjective ? "yes, every output is hit" : `no, nothing reaches ${listOf(missed)}`
            }. This map is ${kind}.`
      }
      controls={
        <>
          <Stepper label="rule" value={rule} onChange={setRule} min={1} max={MAP_RULES.length} />
          <Stepper label="inputs" value={n} onChange={setN} min={2} max={6} />
          <Stepper label="outputs (m)" value={m} onChange={setM} min={2} max={6} />
        </>
      }
    >
      <svg viewBox="0 0 440 280" role="img" aria-label={`Arrows from ${n} inputs to ${m} outputs for the rule ${name}`}>
        <text x="110" y="16" textAnchor="middle" className="fig-small">
          inputs
        </text>
        <text x="330" y="16" textAnchor="middle" className="fig-small">
          outputs
        </text>
        {inputs.map((x) => (
          <g key={`in-${x}`}>
            <line x1="128" y1={yIn(x) - 5} x2="312" y2={yIn(image[x]) - 5} className={!plain && (x === clash || (clash !== undefined && x === image.indexOf(image[clash]))) ? "fig-accent-line" : "fig-line"} />
            <text x="110" y={yIn(x)} textAnchor="middle" className="fig-mono">
              {x}
            </text>
          </g>
        ))}
        {outputs.map((y) => (
          <g key={`out-${y}`}>
            <circle cx="318" cy={yIn(y) - 5} r="4" className={image.includes(y) ? "fig-accent" : "fig-ghost"} />
            <text x="340" y={yIn(y)} textAnchor="middle" className="fig-mono">
              {y}
            </text>
          </g>
        ))}
      </svg>
    </Frame>
  );
}

/** A line and its inverse: the same line with the roles of x and y exchanged, its mirror image in y = x. */
function InverseLine(props: Props) {
  const [m, setM] = useState(clamp(num(props.slope, 2), -4, 4));
  const [b, setB] = useState(clamp(num(props.intercept, -2), -6, 6));
  const [x, setX] = useState(clamp(Math.round(num(props.x, 3)), -REACH, REACH));
  const y = m * x + b;
  const detail =
    m === 0
      ? `With slope 0 every input gives ${fmt(b)}, so the output does not tell you the input and there is no inverse.`
      : `Its inverse is ${lineName(1 / m, -b / m).replace("y =", "g(x) =")}. f sends ${fmt(x)} to ${fmt(y)}, and g sends ${fmt(y)} back to ${fmt(x)}: the point (${fmt(x)}, ${fmt(y)}) on f is mirrored to (${fmt(y)}, ${fmt(x)}) on g.`;
  return (
    <Frame
      title="A function and its inverse"
      summary={`${lineName(m, b).replace("y =", "f(x) =")}. ${detail}`}
      controls={
        <>
          <Slider label="slope" value={m} onChange={setM} min={-4} max={4} step={0.5} />
          <Slider label="intercept" value={b} onChange={setB} min={-6} max={6} />
          <Stepper label="x" value={x} onChange={setX} min={-REACH} max={REACH} />
        </>
      }
    >
      <PlaneGrid label={`The line ${lineName(m, b)}, the mirror line y = x, and the inverse`}>
        <line x1={px(-REACH)} y1={py(-REACH)} x2={px(REACH)} y2={py(REACH)} className="fig-guide" />
        {m === 0 ? null : drawLine(1 / m, -b / m, "fig-line")}
        {drawLine(m, b, "fig-accent-line")}
        <circle cx={px(x)} cy={py(y)} r="5" className="fig-accent" />
        {m === 0 ? null : <circle cx={px(y)} cy={py(x)} r="5" className="fig-fill" />}
      </PlaneGrid>
    </Frame>
  );
}

const SPLITS = [1, 2, 4, 12, 52, 365, 8760];
const SPLIT_NAMES = ["once, at the end of the year", "every half-year", "every quarter", "every month", "every week", "every day", "every hour"];

/** One rupee at 100% a year, with the interest paid in more and more instalments: the staircase closes in on e. */
function Growth(props: Props) {
  const [k, setK] = useState(clamp(Math.round(num(props.start, 1)), 1, SPLITS.length));
  const n = SPLITS[k - 1];
  const final = (1 + 1 / n) ** n;
  const gx = (t: number) => 40 + t * 380;
  const gy = (v: number) => 250 - (v - 1) * 125;
  const shown = Math.min(n, 365);
  let stairs = `${gx(0)},${gy(1)}`;
  for (let i = 1; i <= shown; i++) {
    const before = (1 + 1 / n) ** Math.round(((i - 1) * n) / shown);
    const after = (1 + 1 / n) ** Math.round((i * n) / shown);
    stairs += ` ${gx(i / shown).toFixed(1)},${gy(before).toFixed(1)} ${gx(i / shown).toFixed(1)},${gy(after).toFixed(1)}`;
  }
  const curve = Array.from({ length: 101 }, (_, i) => `${gx(i / 100).toFixed(1)},${gy(Math.exp(i / 100)).toFixed(1)}`).join(" ");
  return (
    <Frame
      title="Compound growth"
      summary={`₹1 at 100% a year, interest added ${SPLIT_NAMES[k - 1]}: ${n} step${n === 1 ? "" : "s"}, each multiplying by (1 + 1/${group(n)}). After one year: ₹${final.toFixed(5)}. The limit of ever finer steps is e ≈ 2.71828.`}
      controls={<Stepper label="how often" value={k} onChange={setK} min={1} max={SPLITS.length} />}
    >
      <svg viewBox="0 0 440 280" role="img" aria-label={`Balance over one year with interest added in ${n} steps, against the smooth curve of continuous growth`}>
        <line x1={gx(0)} x2={gx(1)} y1={gy(1)} y2={gy(1)} className="fig-axis" />
        <line x1={gx(0)} x2={gx(0)} y1={gy(1)} y2={gy(2.85)} className="fig-axis" />
        {[1, 2, Math.E].map((v) => (
          <g key={v}>
            <line x1={gx(0)} x2={gx(1)} y1={gy(v)} y2={gy(v)} className="fig-guide" />
            <text x={gx(0) - 6} y={gy(v) + 4} textAnchor="end" className="fig-small">
              {v === Math.E ? "e" : v}
            </text>
          </g>
        ))}
        <text x={gx(1)} y={gy(1) + 16} textAnchor="end" className="fig-small">
          one year
        </text>
        <polyline points={curve} fill="none" className="fig-line" />
        <polyline points={stairs} fill="none" className="fig-accent-line" />
      </svg>
    </Frame>
  );
}

/** 1 + 2 + … + n as a staircase of squares, and two staircases fitted together into an n by (n + 1) rectangle. */
function TriangleSum(props: Props) {
  const [n, setN] = useState(clamp(Math.round(num(props.n, 4)), 1, 10));
  const size = Math.min(26, 250 / (n + 1));
  const total = (n * (n + 1)) / 2;
  const cells: ReactNode[] = [];
  for (let row = 1; row <= n; row++) {
    for (let col = 1; col <= n + 1; col++) {
      cells.push(<rect key={`${row}-${col}`} x={20 + (col - 1) * size} y={15 + (row - 1) * size} width={size - 2} height={size - 2} className={col <= row ? "fig-accent" : "fig-fill"} />);
    }
  }
  return (
    <Frame
      title="Sum of the first n whole numbers"
      summary={`1 + 2 + … + ${n} is the staircase of shaded squares, row k holding k of them: ${total} in all. A second copy of the staircase, turned over, fills the plain squares and completes a rectangle ${n} by ${n + 1} with ${n * (n + 1)} squares. So the staircase is half of it: ${n} × ${n + 1} ÷ 2 = ${total}.`}
      controls={<Stepper label="n" value={n} onChange={setN} min={1} max={10} />}
    >
      <svg viewBox="0 0 340 280" role="img" aria-label={`A staircase of ${total} squares and its copy, forming a rectangle ${n} by ${n + 1}`}>
        {cells}
      </svg>
    </Frame>
  );
}

/** The running totals of a + ar + ar² + …: they settle when the ratio is small, and do not when it is not. */
function PartialSums(props: Props) {
  const [ratio, setRatio] = useState(clamp(num(props.ratio, 0.5), -1.2, 1.2));
  const [count, setCount] = useState(clamp(Math.round(num(props.terms, 6)), 1, 16));
  const sums: number[] = [];
  let term = 1;
  let running = 0;
  for (let i = 0; i < count; i++) {
    running += term;
    sums.push(running);
    term *= ratio;
  }
  const converges = Math.abs(ratio) < 1;
  const limit = converges ? 1 / (1 - ratio) : null;
  const reach = Math.max(2.2, ...sums.map(Math.abs), limit ?? 0) * 1.1;
  const low = Math.min(0, ...sums) < 0 ? -reach : 0;
  const sy = (v: number) => 250 - ((v - low) / (reach - low)) * 230;
  const width = 380 / 16;
  return (
    <Frame
      title="Partial sums of a geometric series"
      summary={`1 + r + r² + … with r = ${fmt(ratio)}. The sum of the first ${count} term${count === 1 ? "" : "s"} is ${fmt(Math.round(sums[count - 1] * 10000) / 10000)}. ${
        limit === null ? "The ratio is not smaller than 1 in size, so the totals never settle: the series diverges." : `The totals close in on 1 ÷ (1 − r) = ${fmt(Math.round(limit * 10000) / 10000)}: the series converges.`
      }`}
      controls={
        <>
          <Slider label="ratio r" value={ratio} onChange={setRatio} min={-1.2} max={1.2} step={0.1} />
          <Stepper label="terms" value={count} onChange={setCount} min={1} max={16} />
        </>
      }
    >
      <svg viewBox="0 0 440 280" role="img" aria-label={`Bars for the first ${count} partial sums of the geometric series with ratio ${ratio}`}>
        <line x1="40" x2="430" y1={sy(0)} y2={sy(0)} className="fig-axis" />
        {limit === null ? null : (
          <>
            <line x1="40" x2="430" y1={sy(limit)} y2={sy(limit)} className="fig-guide" />
            <text x="36" y={sy(limit) + 4} textAnchor="end" className="fig-small">
              {fmt(Math.round(limit * 100) / 100)}
            </text>
          </>
        )}
        <text x="36" y={sy(0) + 4} textAnchor="end" className="fig-small">
          0
        </text>
        {sums.map((v, i) => (
          <rect key={i} x={44 + i * width} y={Math.min(sy(v), sy(0))} width={width - 4} height={Math.max(1, Math.abs(sy(v) - sy(0)))} className={i === count - 1 ? "fig-accent" : "fig-fill"} />
        ))}
      </svg>
    </Frame>
  );
}

const factorialOf = (k: number) => Array.from({ length: k }, (_, i) => i + 1).reduce((a, b) => a * b, 1);

/** The calls of factorial(n) piling up while each waits for the next, then finishing from the top down. */
function CallStack(props: Props) {
  const [n, setN] = useState(clamp(Math.round(num(props.n, 3)), 1, 5));
  const [step, setStep] = useState(0);
  const last = 2 * n + 1;
  const at = Math.min(step, last);
  const returned = Math.max(0, at - n); // how many calls have finished
  const frames = at <= n ? at + 1 : n + 1 - returned; // calls still on the stack
  const top = frames - 1;
  const argOf = (i: number) => n - i;
  let summary: string;
  if (at < n) {
    summary = `Step ${at}: factorial(${argOf(top)}) has been called. ${argOf(top)} is not 0, so it needs factorial(${argOf(top) - 1}) and must wait. ${frames} call${frames === 1 ? " is" : "s are"} on the stack.`;
  } else if (at === n) {
    summary = `Step ${at}: factorial(0) has been called. It is the base case and returns 1 without calling anything. ${frames} calls are on the stack, the deepest it gets.`;
  } else if (at < last) {
    const k = argOf(top);
    summary = `Step ${at}: factorial(${k - 1}) returned ${factorialOf(k - 1)}. factorial(${k}) resumes with its own n = ${k} and computes ${k} × ${factorialOf(k - 1)} = ${factorialOf(k)}. ${frames} call${frames === 1 ? " is" : "s are"} on the stack.`;
  } else {
    summary = `Step ${at}: factorial(${n}) returned ${factorialOf(n)}. The stack is empty. ${n + 1} calls were made in all.`;
  }
  const height = 38;
  return (
    <Frame
      title="The call stack"
      summary={summary}
      controls={
        <>
          <Stepper label="step" value={at} onChange={setStep} min={0} max={last} />
          <Stepper
            label="n"
            value={n}
            onChange={(v) => {
              setN(v);
              setStep(0);
            }}
            min={1}
            max={5}
          />
        </>
      }
    >
      <svg viewBox="0 0 440 280" role="img" aria-label={`The stack of unfinished calls of factorial(${n}) at step ${at}, holding ${frames} call${frames === 1 ? "" : "s"}`}>
        <line x1="60" x2="380" y1="262" y2="262" className="fig-axis" />
        {Array.from({ length: n + 1 }, (_, i) => {
          const y = 262 - (i + 1) * (height + 4);
          const live = i < frames;
          const k = argOf(i);
          const note = !live ? "" : i < top ? `waiting for factorial(${k - 1})` : at === n ? "base case: returns 1" : at > n ? `${k} × ${factorialOf(k - 1)} = ${factorialOf(k)}` : "running";
          return (
            <g key={i}>
              <rect x="60" y={y} width="320" height={height} className={live ? (i === top ? "fig-accent" : "fig-fill") : "fig-ghost"} />
              {live ? (
                <>
                  <text x="72" y={y + 24} className="fig-mono" style={i === top ? { fill: "var(--bg)" } : undefined}>
                    factorial({k})
                  </text>
                  <text x="368" y={y + 23} textAnchor="end" className="fig-small" style={i === top ? { fill: "var(--bg)" } : undefined}>
                    {note}
                  </text>
                </>
              ) : null}
            </g>
          );
        })}
      </svg>
    </Frame>
  );
}

type TraceStep = { line: number; scope: string; names: [string, string][]; output: string[]; note: string };
type Trace = { lines: string[]; steps: TraceStep[] };

/** A float as Python shows it: a whole number keeps its ".0". */
const pyFloat = (x: number) => (Number.isInteger(x) ? x.toFixed(1) : String(x));

/** Collects the steps of a trace as a program is walked line by line. */
function recorder() {
  const steps: TraceStep[] = [];
  const output: string[] = [];
  return {
    steps,
    at(line: number, scope: string, names: [string, string][], note: string, shows?: string) {
      if (shows !== undefined) output.push(shows);
      steps.push({ line, scope, names: names.map(([n, v]) => [n, v]), output: [...output], note });
    },
  };
}

const MAIN = "the main program";

function concessionTrace(age: number, woman: boolean): Trace {
  const w = woman ? "True" : "False";
  const lines = [
    `age = ${age}`,
    `woman = ${w}`,
    "fare = 1200",
    "if woman and age >= 58:",
    "    fare = fare * 0.5",
    "elif age >= 60:",
    "    fare = fare * 0.6",
    "print(fare)",
  ];
  const r = recorder();
  const names: [string, string][] = [["age", String(age)]];
  r.at(0, MAIN, names, `age is bound to ${age}.`);
  names.push(["woman", w]);
  r.at(1, MAIN, names, `woman is bound to ${w}.`);
  names.push(["fare", "1200"]);
  r.at(2, MAIN, names, "fare is bound to 1200, the full fare.");
  const first = woman && age >= 58;
  r.at(
    3,
    MAIN,
    names,
    woman
      ? `woman is True and ${age} >= 58 is ${age >= 58 ? "True" : "False"}, so the condition is ${first ? "True and the block under if runs" : "False. Python moves on to the elif"}.`
      : "woman is False, so the whole and is False without looking at the age. Python moves on to the elif.",
  );
  let fare = "1200";
  if (first) {
    fare = pyFloat(1200 * 0.5);
    names[2] = ["fare", fare];
    r.at(4, MAIN, names, `fare becomes ${fare}. The elif is skipped, because a block in the chain has already run.`);
  } else {
    const second = age >= 60;
    r.at(5, MAIN, names, `${age} >= 60 is ${second ? "True, so the block under elif runs" : "False. No condition in the chain was true, so no block runs and the fare is left alone"}.`);
    if (second) {
      fare = pyFloat(1200 * 0.6);
      names[2] = ["fare", fare];
      r.at(6, MAIN, names, `fare becomes ${fare}.`);
    }
  }
  r.at(7, MAIN, names, `print shows ${fare}. The program ends.`, fare);
  return { lines, steps: r.steps };
}

function depositTrace(rate: number): Trace {
  const factor = `1.${String(rate).padStart(2, "0")}`;
  const lines = ["balance = 100000", "year = 0", "while balance < 200000:", `    balance = balance * ${factor}`, "    year += 1", "print(year)"];
  const r = recorder();
  const names: [string, string][] = [["balance", "100000"]];
  r.at(0, MAIN, names, "balance is bound to 100000.");
  names.push(["year", "0"]);
  r.at(1, MAIN, names, "year is bound to 0.");
  let balance = 100000;
  let year = 0;
  const f = Number(factor);
  for (;;) {
    const shown = names[0][1];
    if (!(balance < 200000)) {
      r.at(2, MAIN, names, `${shown} < 200000 is False, so the loop ends and Python carries on below the block.`);
      break;
    }
    r.at(2, MAIN, names, `${shown} < 200000 is True, so the block runs${year === 0 ? "" : " again"}.`);
    balance = balance * f;
    names[0] = ["balance", pyFloat(balance)];
    r.at(3, MAIN, names, `balance becomes ${pyFloat(balance)}.`);
    year += 1;
    names[1] = ["year", String(year)];
    r.at(4, MAIN, names, `year becomes ${year}. Python jumps back to the while line.`);
  }
  r.at(5, MAIN, names, `print shows ${year}. The deposit first reaches double in year ${year}.`, String(year));
  return { lines, steps: r.steps };
}

const ORDERS: Record<string, [string, number][]> = {
  Kabir: [
    ["Kabir", 0],
    ["Asha", 420],
    ["Ravi", 380],
    ["Meera", 510],
  ],
  Asha: [
    ["Asha", 420],
    ["Kabir", 0],
    ["Ravi", 380],
    ["Meera", 510],
  ],
};

const pyList = (items: string[]) => `[${items.map((s) => `'${s}'`).join(", ")}]`;

function whoAteTrace(fixed: boolean, first: string): Trace {
  const orders = ORDERS[first] ?? ORDERS.Kabir;
  const lines = [
    "def who_ate(orders):",
    "    diners = []",
    "    for name, amount in orders.items():",
    "        if amount > 0:",
    "            diners.append(name)",
    fixed ? "    return diners" : "        return diners",
    "",
    `orders = {${orders.map(([n, a]) => `"${n}": ${a}`).join(", ")}}`,
    "people = who_ate(orders)",
    "print(len(people))",
  ];
  const r = recorder();
  const dict = "a dictionary of 4 orders";
  const main: [string, string][] = [["who_ate", "a function"]];
  r.at(0, MAIN, main, "Python binds the name who_ate to the recipe. Nothing inside it runs yet.");
  main.push(["orders", dict]);
  r.at(7, MAIN, main, `orders is bound to a dictionary of 4 orders, with ${first} first.`);
  const inside = "who_ate";
  const local: [string, string][] = [["orders", dict]];
  r.at(8, inside, local, "who_ate(orders) is called. Python goes into the function, with its own name orders bound to the same dictionary.");
  const diners: string[] = [];
  local.push(["diners", "[]"]);
  r.at(1, inside, local, "diners is bound to a new, empty list.");
  let turns = 0;
  for (const [name, amount] of orders) {
    turns += 1;
    const pair: [string, string][] = [
      ["name", `'${name}'`],
      ["amount", String(amount)],
    ];
    if (turns === 1) local.push(...pair);
    else local.splice(2, 2, ...pair);
    r.at(2, inside, local, `The loop takes ${turns === 1 ? "its first" : "the next"} pair: name is '${name}' and amount is ${amount}.`);
    if (amount > 0) {
      r.at(3, inside, local, `${amount} > 0 is True, so the append runs.`);
      diners.push(name);
      local[1] = ["diners", pyList(diners)];
      r.at(4, inside, local, `diners becomes ${pyList(diners)}.`);
    } else {
      r.at(3, inside, local, `${amount} > 0 is False, so the append is skipped.`);
    }
    if (!fixed) {
      r.at(
        5,
        inside,
        local,
        `The return is inside the loop's block, so it runs now, at the end of the first turn. who_ate returns ${pyList(diners)} without looking at the other ${orders.length - turns} orders.`,
      );
      break;
    }
  }
  if (fixed) {
    r.at(2, inside, local, "No pairs are left, so the loop ends.");
    r.at(5, inside, local, `The return is below the loop, so it runs once, after every order has been checked. who_ate returns ${pyList(diners)}.`);
  }
  main.push(["people", pyList(diners)]);
  r.at(8, MAIN, main, `Back in the main program, people is bound to ${pyList(diners)}. The names inside who_ate are gone.`);
  const count = diners.length;
  const verdict = count === 0 ? "Nobody is listed, so dividing the bill among them would divide by zero." : count === 1 ? `Only ${diners[0]} is listed, so ${diners[0]} would pay the whole bill.` : `The bill would be split ${count} ways, as it should be.`;
  r.at(9, MAIN, main, `print shows ${count}. ${verdict}`, String(count));
  return { lines, steps: r.steps };
}

const PROGRAMS = ["concession", "deposit", "who-ate"] as const;

/** A fixed row of bits: flip any bit, count up or down with the carry, and read the row in decimal and hex, unsigned or as two's complement. */
function BinaryCounter(props: Props) {
  const width = props.width === 4 ? 4 : 8;
  const top = 2 ** width;
  const [value, setValue] = useState(clamp(Math.round(num(props.value, 0)), 0, top - 1));
  const [signed, setSigned] = useState(props.signed === true);
  const [wrapped, setWrapped] = useState("");
  const offers = typeof props.signed === "boolean";
  const bits = Array.from({ length: width }, (_, i) => Math.floor(value / 2 ** (width - 1 - i)) % 2);
  const worth = (i: number) => (signed && i === 0 ? -1 : 1) * 2 ** (width - 1 - i);
  const show = (n: number) => (n < 0 ? `−${-n}` : String(n));
  const grouped = (b: number[]) => b.join("").replace(/(.{4})(?=.)/g, "$1 ");
  const reading = signed && bits[0] === 1 ? value - top : value;
  const terms = bits.flatMap((b, i) => (b === 1 ? [worth(i)] : []));
  const working = terms.length === 0 ? "every bit is 0, so the value is 0" : terms.length === 1 ? `the only 1 is in the ${show(terms[0])} column, so the value is ${show(reading)}` : `${terms.map(show).join(" + ")} = ${show(reading)}`;
  const hex = value.toString(16).toUpperCase().padStart(width / 4, "0");
  const ones = grouped(Array(width).fill(1));
  const zeros = grouped(Array(width).fill(0));
  const step = (by: 1 | -1) => {
    const next = value + by;
    if (next === top) setWrapped(`Adding 1 to ${ones} carried out of the leftmost bit. There is no bit there to hold the carry, so it is lost and the row wraps round to ${zeros}. `);
    else if (next < 0) setWrapped(`Taking 1 from ${zeros} needs a borrow from beyond the leftmost bit. There is none, so the row wraps round to ${ones}. `);
    else setWrapped("");
    setValue((next + top) % top);
  };
  const flip = (i: number) => {
    setWrapped("");
    setValue(bits[i] === 1 ? value - 2 ** (width - 1 - i) : value + 2 ** (width - 1 - i));
  };
  const summary = `${wrapped}Bits ${grouped(bits)}. ${signed ? "Read as two's complement" : "Read as unsigned"}: ${working}. In hexadecimal, ${hex}.`;
  const cell = 56;
  const left = 16;
  const span = width * cell;
  return (
    <Frame
      title={width === 4 ? "Four bits" : "One byte"}
      summary={summary}
      controls={
        <>
          <button type="button" className="btn btn-secondary" onClick={() => step(1)}>
            Add 1
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => step(-1)}>
            Take away 1
          </button>
          {offers ? (
            <button type="button" className="btn btn-secondary" aria-pressed={signed} onClick={() => setSigned(!signed)}>
              {signed ? "Read as unsigned" : "Read as two's complement"}
            </button>
          ) : null}
          <span className="fig-stepper fig-bits">
            <span className="label">flip a bit</span>
            {/* In groups of four, as the hex digits are, so a byte's row can break between them on a phone. */}
            {Array.from({ length: width / 4 }, (_, g) => (
              <span key={g} className="fig-nibble">
                {bits.slice(4 * g, 4 * g + 4).map((b, j) => {
                  const i = 4 * g + j;
                  return (
                    <button key={i} type="button" className="q-move fig-bit-button" aria-label={`Flip the ${show(worth(i))}s bit, which is ${b}`} aria-pressed={b === 1} onClick={() => flip(i)}>
                      {b}
                    </button>
                  );
                })}
              </span>
            ))}
          </span>
        </>
      }
    >
      <svg viewBox={`0 0 ${span + 2 * left} 150`} role="img" aria-label={`${width} bits reading ${grouped(bits)}, which is ${show(reading)} ${signed ? "as two's complement" : "unsigned"} and ${hex} in hexadecimal`}>
        {bits.map((b, i) => {
          const x = left + i * cell;
          return (
            <g key={i}>
              <text x={x + cell / 2} y={22} textAnchor="middle" className="fig-scale-tick">
                {show(worth(i))}
              </text>
              <rect x={x + 4} y={32} width={cell - 8} height={cell - 8} className={b === 1 ? "fig-accent" : "fig-ghost"} />
              <text x={x + cell / 2} y={32 + (cell - 8) / 2 + 10} textAnchor="middle" className="fig-bit" style={b === 1 ? { fill: "var(--bg)" } : undefined}>
                {b}
              </text>
            </g>
          );
        })}
        {Array.from({ length: width / 4 }, (_, g) => {
          const x1 = left + g * 4 * cell + 6;
          const x2 = left + (g + 1) * 4 * cell - 6;
          return (
            <g key={g}>
              <path d={`M ${x1} 96 L ${x1} 104 L ${x2} 104 L ${x2} 96`} className="fig-line" />
              <text x={(x1 + x2) / 2} y={134} textAnchor="middle" className="fig-scale-name">
                {hex[g]}
              </text>
            </g>
          );
        })}
      </svg>
    </Frame>
  );
}

const RECORDS = {
  "char-int": {
    title: "A char and an int",
    fields: [
      { name: "kind", size: 1 },
      { name: "balance", size: 4 },
    ],
  },
  tap: {
    title: "A metro tap record",
    fields: [
      { name: "kind", size: 1 },
      { name: "when", size: 8 },
      { name: "station", size: 2 },
      { name: "fare", size: 4 },
    ],
  },
} as const;
type RecordField = { name: string; size: number };

/** Where each field of a record goes when every field starts at a multiple of its own size, or packed with no gaps. */
function recordLayout(fields: readonly RecordField[], packed: boolean) {
  let at = 0;
  let largest = 1;
  const placed = fields.map((f) => {
    const align = packed ? 1 : f.size;
    const start = Math.ceil(at / align) * align;
    const gap = start - at;
    at = start + f.size;
    largest = Math.max(largest, align);
    return { ...f, start, gap };
  });
  const size = Math.ceil(at / largest) * largest;
  return { placed, size, tail: size - at };
}

/** A record's fields laid out byte by byte, eight bytes to a row, with the padding an aligned layout needs drawn as gaps. */
function StructPadding(props: Props) {
  const record = RECORDS[props.record === "tap" ? "tap" : "char-int"];
  const [packed, setPacked] = useState(props.packed === true);
  const [sorted, setSorted] = useState(props.sorted === true);
  const fields: RecordField[] = sorted ? [...record.fields].sort((a, b) => b.size - a.size) : [...record.fields];
  const { placed, size, tail } = recordLayout(fields, packed);
  const data = fields.reduce((sum, f) => sum + f.size, 0);
  const bytes = (n: number) => `${n} byte${n === 1 ? "" : "s"}`;
  const parts = placed.flatMap((f) => [...(f.gap > 0 ? [`${bytes(f.gap)} of padding`] : []), `${f.name} at byte ${f.start}, ${bytes(f.size)}`]);
  if (tail > 0) parts.push(`${bytes(tail)} of padding at the end, so that the next record in an array starts aligned too`);
  const split = placed.filter((f) => Math.floor(f.start / 8) !== Math.floor((f.start + f.size - 1) / 8)).map((f) => f.name);
  const crossing = split.length === 0 ? "" : ` ${split.join(" and ")} ${split.length === 1 ? "crosses" : "cross"} from one 8-byte row into the next, so reading ${split.length === 1 ? "it" : "each"} takes two reads of memory.`;
  const order = fields.map((f) => f.name).join(", ");
  const summary = `Fields in the order ${order}, ${packed ? "packed with no gaps" : "each starting at a multiple of its own size"}. ${parts.join(". ")}. Size ${bytes(size)}: ${data} of data and ${size - data} of padding.${crossing}`;
  // The tallest layout this record can take sets the height, so the figure does not jump as the buttons are pressed.
  const rows = Math.ceil(Math.max(recordLayout(record.fields, false).size, 8) / 8);
  const cell = 52;
  const left = 16;
  const rowHeight = 84;
  const owner = Array.from({ length: rows * 8 }, (_, b) => placed.find((f) => b >= f.start && b < f.start + f.size));
  const segments = placed.flatMap((f) => {
    const out: { name: string; row: number; from: number; to: number }[] = [];
    for (let b = f.start; b < f.start + f.size; ) {
      const row = Math.floor(b / 8);
      const end = Math.min(f.start + f.size, (row + 1) * 8);
      out.push({ name: f.name, row, from: b % 8, to: end - row * 8 });
      b = end;
    }
    return out;
  });
  return (
    <Frame
      title={record.title}
      summary={summary}
      controls={
        <>
          <button type="button" className="btn btn-secondary" aria-pressed={sorted} onClick={() => setSorted(!sorted)}>
            {sorted ? "Back to the original order" : "Put the largest fields first"}
          </button>
          <button type="button" className="btn btn-secondary" aria-pressed={packed} onClick={() => setPacked(!packed)}>
            {packed ? "Align the fields" : "Pack the fields with no gaps"}
          </button>
        </>
      }
    >
      <svg viewBox={`0 0 ${8 * cell + 2 * left} ${rows * rowHeight + 8}`} role="img" aria-label={`${record.title}: ${bytes(size)}, ${data} of data and ${size - data} of padding`}>
        {owner.map((f, b) => {
          const row = Math.floor(b / 8);
          const x = left + (b % 8) * cell;
          const y = 8 + row * rowHeight;
          const inside = b < size;
          return (
            <g key={b}>
              {!f && inside ? <rect x={x + 3} y={y + 3} width={cell - 6} height={cell - 10} className="fig-pad" /> : null}
              {!f && inside ? (
                <text x={x + cell / 2} y={y + cell / 2 + 3} textAnchor="middle" className="fig-scale-tick">
                  pad
                </text>
              ) : null}
              {inside ? (
                <text x={x + cell / 2} y={y + cell + 18} textAnchor="middle" className="fig-scale-tick">
                  {b}
                </text>
              ) : null}
            </g>
          );
        })}
        {segments.map((s, i) => {
          const x = left + s.from * cell + 3;
          const y = 8 + s.row * rowHeight + 3;
          const w = (s.to - s.from) * cell - 6;
          return (
            <g key={i}>
              <rect x={x} y={y} width={w} height={cell - 10} className="fig-accent" />
              {w >= s.name.length * 9.7 + 4 ? (
                <text x={x + w / 2} y={y + (cell - 10) / 2 + 6} textAnchor="middle" className="fig-step-value" style={{ fill: "var(--bg)" }}>
                  {s.name}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </Frame>
  );
}

/** A short program run one line at a time, with the line about to finish marked and every name's value beside it. */
function StepThrough(props: Props) {
  const program = PROGRAMS.find((p) => p === props.program) ?? "deposit";
  const [age, setAge] = useState(clamp(Math.round(num(props.age, 65)), 50, 75));
  const [woman, setWoman] = useState(props.woman !== false);
  const [rate, setRate] = useState(clamp(Math.round(num(props.rate, 7)), 4, 12));
  const [fixed, setFixed] = useState(props.fixed === true);
  const [first, setFirst] = useState(props.first === "Asha" ? "Asha" : "Kabir");
  const [step, setStep] = useState(1);
  const trace = program === "concession" ? concessionTrace(age, woman) : program === "deposit" ? depositTrace(rate) : whoAteTrace(fixed, first);
  const total = trace.steps.length;
  const at = clamp(step, 1, total);
  const now = trace.steps[at - 1];
  const restart = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setStep(1);
  };
  const rows = Math.max(...trace.steps.map((s) => s.names.length));
  const height = 44 + rows * 40;
  const named = now.names.map(([n, v]) => `${n} = ${v}`).join(", ");
  const summary = `Step ${at} of ${total}, line ${now.line + 1}: ${now.note} Names in ${now.scope === MAIN ? MAIN : `${now.scope}`}: ${named}.`;
  const title = program === "concession" ? "Stepping through the railway concession" : program === "deposit" ? "Stepping through the fixed deposit" : "Stepping through the bill splitter";
  return (
    <Frame
      title={title}
      summary={summary}
      controls={
        <>
          <Stepper label="step" value={at} onChange={setStep} min={1} max={total} />
          <button type="button" className="btn btn-secondary" onClick={() => setStep(at === total ? 1 : total)}>
            {at === total ? "Back to the start" : "Jump to the end"}
          </button>
          {program === "concession" ? (
            <>
              <Stepper label="age" value={age} onChange={restart(setAge)} min={50} max={75} />
              <Toggle label="woman" value={woman} onChange={restart(setWoman)} />
            </>
          ) : null}
          {program === "deposit" ? <Stepper label="rate" value={rate} onChange={restart(setRate)} min={4} max={12} /> : null}
          {program === "who-ate" ? (
            <>
              <button type="button" className="btn btn-secondary" aria-pressed={fixed} onClick={() => restart(setFixed)(!fixed)}>
                {fixed ? "Put the return back inside the loop" : "Move the return out of the loop"}
              </button>
              <button type="button" className="btn btn-secondary" aria-pressed={first === "Asha"} onClick={() => restart(setFirst)(first === "Asha" ? "Kabir" : "Asha")}>
                {first === "Asha" ? "Put Kabir first" : "Put Asha first"}
              </button>
            </>
          ) : null}
        </>
      }
    >
      <pre className="fig-code" tabIndex={0}>
        {trace.lines.map((text, i) => (
          <span key={i} className="fig-code-line" aria-current={i === now.line ? "step" : undefined}>
            <span className="fig-code-number" aria-hidden="true">
              {i + 1}
            </span>
            {text}
          </span>
        ))}
      </pre>
      <svg viewBox={`0 0 440 ${height}`} className="fig-names" role="img" aria-label={`The names in ${now.scope === MAIN ? MAIN : now.scope} and the values they are bound to: ${named}`}>
        <text x="10" y="24" className="fig-mono">
          {now.scope === MAIN ? "Names in the main program" : `Names inside ${now.scope}`}
        </text>
        {now.names.map(([name, value], i) => {
          const y = 44 + i * 40;
          return (
            <g key={name}>
              <text x="126" y={y + 21} textAnchor="end" className="fig-step-name">
                {name}
              </text>
              <line x1="134" x2="166" y1={y + 15} y2={y + 15} className="fig-line" />
              <path d={`M 160 ${y + 10} L 168 ${y + 15} L 160 ${y + 20}`} className="fig-line" />
              <rect x="172" y={y} width="260" height="30" className="fig-ghost" />
              <text x="182" y={y + 21} className="fig-step-value">
                {value}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="label fig-output-label">Output</p>
      <pre className="fig-output">{now.output.length ? now.output.join("\n") : " "}</pre>
    </Frame>
  );
}

const RATES: { name: string; f: (n: number) => number }[] = [
  { name: "log₂ n", f: (n) => Math.log2(n) },
  { name: "n", f: (n) => n },
  { name: "n log₂ n", f: (n) => n * Math.log2(n) },
  { name: "n²", f: (n) => n * n },
  { name: "2ⁿ", f: (n) => 2 ** n },
];

/** How five kinds of running time grow with the size of the input. */
function GrowthRates(props: Props) {
  const [n, setN] = useState(clamp(Math.round(num(props.n, 8)), 2, 32));
  const top = 1100;
  const gx = (x: number) => 44 + ((x - 1) / 31) * 330;
  const gy = (v: number) => 250 - (Math.min(v, top) / top) * 230;
  const whole = (v: number) => group(Math.round(v));
  return (
    <Frame
      title="How running times grow"
      summary={`For an input of size n = ${n}: log₂ n = ${fmt(Math.round(Math.log2(n) * 10) / 10)} steps, n = ${n}, n log₂ n = ${whole(n * Math.log2(n))}, n² = ${whole(n * n)}, 2ⁿ = ${whole(2 ** n)}. Doubling n adds one step to log₂ n, doubles n, multiplies n² by four, and squares 2ⁿ.`}
      controls={<Slider label="size n" value={n} onChange={setN} min={2} max={32} />}
    >
      <svg viewBox="0 0 440 280" role="img" aria-label={`Curves of log n, n, n log n, n squared and 2 to the n, marked at n = ${n}`}>
        <line x1={gx(1)} x2={gx(32)} y1={gy(0)} y2={gy(0)} className="fig-axis" />
        <line x1={gx(1)} x2={gx(1)} y1={gy(0)} y2={gy(top)} className="fig-axis" />
        {[250, 500, 750, 1000].map((v) => (
          <g key={v}>
            <line x1={gx(1)} x2={gx(32)} y1={gy(v)} y2={gy(v)} className="fig-grid" />
            <text x={gx(1) - 6} y={gy(v) + 4} textAnchor="end" className="fig-small">
              {v}
            </text>
          </g>
        ))}
        {[8, 16, 24, 32].map((x) => (
          <text key={x} x={gx(x)} y={gy(0) + 16} textAnchor="middle" className="fig-small">
            {x}
          </text>
        ))}
        <line x1={gx(n)} x2={gx(n)} y1={gy(0)} y2={gy(top)} className="fig-guide" />
        {RATES.map((rate) => {
          const points: string[] = [];
          let end = 1;
          for (let x = 1; x <= 32; x += 0.25) {
            const v = rate.f(x);
            if (v > top) break;
            points.push(`${gx(x).toFixed(1)},${gy(v).toFixed(1)}`);
            end = x;
          }
          const value = rate.f(n);
          return (
            <g key={rate.name}>
              <polyline points={points.join(" ")} className="fig-line" />
              <text x={Math.min(gx(end) + 5, 392)} y={Math.max(gy(rate.f(end)) + (end >= 32 ? 4 : -4), 14)} className="fig-small">
                {rate.name}
              </text>
              {value <= top ? <circle cx={gx(n)} cy={gy(value)} r="4" className="fig-accent" /> : null}
            </g>
          );
        })}
      </svg>
    </Frame>
  );
}

function Toggle({ label, value, onChange, bits = false }: { label: string; value: boolean; onChange: (v: boolean) => void; bits?: boolean }) {
  const shown = bits ? (value ? "1" : "0") : value ? "T" : "F";
  // A digit is read out as text, so a bit's button names it, or its spoken name would not match what it shows.
  return (
    <span className="fig-stepper">
      <span className="label">{label}</span>
      <button type="button" className="q-move" aria-label={bits ? `Switch ${label}, ${shown}` : `Switch ${label}`} aria-pressed={value} onClick={() => onChange(!value)}>
        {shown}
      </button>
    </span>
  );
}

const CONNECTIVES: { head: string; name: string; f: (p: boolean, q: boolean) => boolean }[] = [
  { head: "¬P", name: "not P", f: (p) => !p },
  { head: "P∧Q", name: "P and Q", f: (p, q) => p && q },
  { head: "P∨Q", name: "P or Q", f: (p, q) => p || q },
  { head: "P⇒Q", name: "P implies Q", f: (p, q) => !p || q },
  { head: "P⇔Q", name: "P if and only if Q", f: (p, q) => p === q },
];

/** The truth table of the five connectives, with the row for the chosen P and Q picked out. */
function TruthTable(props: Props) {
  const [p, setP] = useState(props.p !== false);
  const [q, setQ] = useState(props.q !== false);
  const word = (v: boolean) => (v ? "true" : "false");
  const note = !p ? "A false P makes “P implies Q” true whatever Q is: the promise was never put to the test." : q ? "P held and Q followed: the promise was kept." : "This is the only row in which “P implies Q” is false: P held and Q did not, so the promise was broken.";
  const rows: [boolean, boolean][] = [
    [true, true],
    [true, false],
    [false, true],
    [false, false],
  ];
  const heads = ["P", "Q", ...CONNECTIVES.map((c) => c.head)];
  return (
    <Frame
      title="Truth table"
      summary={`P is ${word(p)} and Q is ${word(q)}. ${CONNECTIVES.map((c) => `${c.name} is ${word(c.f(p, q))}`).join(". ")}. ${note}`}
      controls={
        <>
          <Toggle label="P" value={p} onChange={setP} />
          <Toggle label="Q" value={q} onChange={setQ} />
        </>
      }
    >
      <svg viewBox="0 0 440 280" role="img" aria-label={`Truth table of not, and, or, implies and if and only if, with the row for P ${word(p)} and Q ${word(q)} marked`}>
        {heads.map((h, j) => (
          <text key={h} x={52 + j * 56} y="36" textAnchor="middle" className="fig-small" style={{ fontSize: 13 }}>
            {h}
          </text>
        ))}
        <line x1="24" x2="416" y1="50" y2="50" className="fig-axis" />
        {rows.map(([a, b], i) => {
          const here = a === p && b === q;
          const cells = [a, b, ...CONNECTIVES.map((c) => c.f(a, b))];
          return (
            <g key={i}>
              {here ? <rect x="24" y={60 + i * 50} width="392" height="40" className="fig-accent" /> : null}
              {cells.map((v, j) => (
                <text key={j} x={52 + j * 56} y={86 + i * 50} textAnchor="middle" className="fig-mono" style={here ? { fill: "var(--bg)" } : undefined}>
                  {v ? "T" : "F"}
                </text>
              ))}
            </g>
          );
        })}
      </svg>
    </Frame>
  );
}

/** A full adder: two exclusive ors make the sum bit, and two ands and an or make the carry. */
function FullAdder(props: Props) {
  const [a, setA] = useState(props.a !== false);
  const [b, setB] = useState(props.b !== false);
  const [c, setC] = useState(props.carry === true);
  const bit = (v: boolean) => (v ? 1 : 0);
  const x = a !== b;
  const both = a && b;
  const passed = x && c;
  const sum = x !== c;
  const carry = both || passed;
  const total = bit(a) + bit(b) + bit(c);
  const wire = (v: boolean) => (v ? "fig-accent-line" : "fig-line");
  const gates: { label: string; x: number; y: number; on: boolean }[] = [
    { label: "a ⊕ b", x: 96, y: 56, on: x },
    { label: "a ∧ b", x: 96, y: 136, on: both },
    { label: "x ⊕ c", x: 236, y: 30, on: sum },
    { label: "x ∧ c", x: 236, y: 196, on: passed },
    { label: "∨", x: 330, y: 160, on: carry },
  ];
  const why = carry
    ? both
      ? "a and b are both 1, so they carry on their own."
      : "a and b differ, so x is 1, and the carry coming in passes through."
    : x
      ? "Nothing carries: a and b differ, but no carry comes in to join them."
      : both
        ? ""
        : "Nothing carries: a and b are not both 1, and x is 0, so no carry passes through.";
  return (
    <Frame
      title="A full adder"
      summary={`a is ${bit(a)}, b is ${bit(b)} and the carry in is ${bit(c)}. They add to ${total}, which is ${total.toString(2).padStart(2, "0")} in binary: sum bit ${bit(sum)}, carry out ${bit(carry)}. x = a ⊕ b is ${bit(x)}, and the sum bit is x ⊕ c. ${why}`}
      controls={
        <>
          <Toggle label="a" value={a} onChange={setA} bits />
          <Toggle label="b" value={b} onChange={setB} bits />
          <Toggle label="carry in" value={c} onChange={setC} bits />
        </>
      }
    >
      <svg viewBox="0 0 440 280" role="img" aria-label={`A full adder built from gates, adding ${bit(a)}, ${bit(b)} and a carry of ${bit(c)} to give sum ${bit(sum)} and carry ${bit(carry)}`}>
        <text x="4" y="38" className="fig-small">a = {bit(a)}</text>
        <text x="4" y="108" className="fig-small">b = {bit(b)}</text>
        <text x="4" y="214" className="fig-small">carry in c = {bit(c)}</text>
        <path d="M 4 50 H 60 V 146 H 96 M 60 66 H 96" fill="none" className={wire(a)} />
        <path d="M 4 120 H 78 V 166 H 96 M 78 120 V 86 H 96" fill="none" className={wire(b)} />
        <path d="M 4 226 H 236 M 218 226 V 60 H 236" fill="none" className={wire(c)} />
        <path d="M 172 76 H 200 V 40 H 236 M 200 76 V 206 H 236" fill="none" className={wire(x)} />
        <text x="174" y="68" className="fig-small">x={bit(x)}</text>
        <path d="M 172 156 H 318 V 170 H 330" fill="none" className={wire(both)} />
        <path d="M 312 216 H 318 V 190 H 330" fill="none" className={wire(passed)} />
        <path d="M 312 50 H 404" fill="none" className={wire(sum)} />
        <path d="M 390 180 H 404" fill="none" className={wire(carry)} />
        {gates.map((g) => (
          <g key={g.label}>
            <rect x={g.x} y={g.y} width={g.label === "∨" ? 60 : 76} height="40" rx="6" className={g.on ? "fig-accent" : "fig-fill"} />
            <text x={g.x + (g.label === "∨" ? 30 : 38)} y={g.y + 26} textAnchor="middle" className="fig-mono" style={{ fontSize: 15, fill: g.on ? "var(--bg)" : "var(--text)" }}>
              {g.label}
            </text>
          </g>
        ))}
        <text x="420" y="34" textAnchor="middle" className="fig-small">sum</text>
        <text x="420" y="57" textAnchor="middle" className="fig-mono">{bit(sum)}</text>
        <text x="418" y="164" textAnchor="middle" className="fig-small">carry</text>
        <text x="420" y="187" textAnchor="middle" className="fig-mono">{bit(carry)}</text>
        <text x="220" y="268" textAnchor="middle" className="fig-small">
          {bit(a)} + {bit(b)} + {bit(c)} = {total} = binary {total.toString(2).padStart(2, "0")}: carry {bit(carry)}, sum {bit(sum)}
        </text>
      </svg>
    </Frame>
  );
}

/** Induction as a row of dominoes: a first push and a rule that each knocks over the next. */
function Dominoes(props: Props) {
  const count = 8;
  const [base, setBase] = useState(props.base !== false);
  const [gap, setGap] = useState(clamp(Math.round(num(props.gap, 0)), 0, count - 1));
  const fallen = !base ? 0 : gap === 0 ? count : gap;
  const summary = !base
    ? `The base case P(1) has not been shown. ${gap === 0 ? "Every step from P(k) to P(k + 1) holds, and yet" : "So"} no domino falls: nothing starts the chain.`
    : gap === 0
      ? `The base case P(1) holds, and every step from P(k) to P(k + 1) holds. All ${count} dominoes fall, and so would any number of them: P(n) is true for every n.`
      : `The base case P(1) holds, but the step from P(${gap}) to P(${gap + 1}) fails. ${gap === 1 ? "Domino 1 falls" : `Dominoes 1 to ${gap} fall`} and the rest stand: nothing is proved beyond the gap.`;
  return (
    <Frame
      title="Induction as falling dominoes"
      summary={summary}
      controls={
        <>
          <Toggle label="base case" value={base} onChange={setBase} />
          <Stepper label="broken step" value={gap} onChange={setGap} min={0} max={count - 1} />
        </>
      }
    >
      <svg viewBox="0 0 440 280" role="img" aria-label={`${count} dominoes in a row, ${fallen} of them fallen`}>
        <line x1="20" x2="420" y1="230" y2="230" className="fig-axis" />
        {Array.from({ length: count }, (_, i) => {
          const x = 40 + i * 48;
          const down = i < fallen;
          return (
            <g key={i}>
              {down ? <rect x={x} y="216" width="42" height="14" className="fig-accent" /> : <rect x={x} y="120" width="14" height="110" className="fig-fill" />}
              <text x={x + 7} y="254" textAnchor="middle" className="fig-small">
                P({i + 1})
              </text>
              {base && gap === i + 1 ? (
                <text x={x + 21} y="208" textAnchor="middle" className="fig-small">
                  gap
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </Frame>
  );
}

/** The whole numbers sorted into classes by their remainder: an equivalence relation seen as a partition. */
function RemainderClasses(props: Props) {
  const [m, setM] = useState(clamp(Math.round(num(props.modulus, 3)), 2, 6));
  const [pick, setPick] = useState(clamp(Math.round(num(props.number, 14)), 0, 17));
  const r = pick % m;
  const mates = Array.from({ length: 18 }, (_, k) => k).filter((k) => k % m === r);
  const width = 380 / m;
  return (
    <Frame
      title="Classes of whole numbers with the same remainder"
      summary={`Call two numbers related when their difference is a multiple of ${m}. The numbers fall into ${m} classes, one for each remainder, and every number is in exactly one class. ${pick} leaves the remainder ${r}, and its class is shown: ${mates.join(", ")}, and so on.`}
      controls={
        <>
          <Stepper label="modulus" value={m} onChange={setM} min={2} max={6} />
          <Stepper label="number" value={pick} onChange={setPick} min={0} max={17} />
        </>
      }
    >
      <svg viewBox="0 0 440 280" role="img" aria-label={`The numbers 0 to 17 in ${m} columns by remainder on division by ${m}, with the class of ${pick} marked`}>
        {Array.from({ length: m }, (_, c) => (
          <g key={c}>
            {c === r ? <rect x={30 + c * width + 4} y="34" width={width - 8} height="240" className="fig-fill" opacity="0.45" /> : <rect x={30 + c * width + 4} y="34" width={width - 8} height="240" className="fig-ghost" />}
            <text x={30 + c * width + width / 2} y="24" textAnchor="middle" className="fig-small">
              remainder {c}
            </text>
          </g>
        ))}
        {Array.from({ length: 18 }, (_, k) => {
          const x = 30 + (k % m) * width + width / 2;
          const y = 58 + Math.floor(k / m) * 25;
          return (
            <g key={k}>
              {k === pick ? <rect x={x - 16} y={y - 17} width="32" height="23" className="fig-accent" /> : null}
              <text x={x} y={y} textAnchor="middle" className="fig-mono" style={k === pick ? { fill: "var(--bg)", fontSize: 15 } : { fontSize: 15 }}>
                {k}
              </text>
            </g>
          );
        })}
      </svg>
    </Frame>
  );
}

const KEY_PATTERNS: { name: string; opens: (lock: number, key: number) => boolean }[] = [
  { name: "one key for each lock", opens: (l, k) => l === k },
  { name: "a master key", opens: (l, k) => l === k || k === 1 },
  { name: "a lock with no key", opens: (l, k) => l === k && l !== 2 },
  { name: "no key opens anything", opens: () => false },
  { name: "every key opens every lock", opens: () => true },
];

/** A grid of which key opens which lock: "for every … there is" reads along rows, "there is … for every" down a column. */
function QuantifierGrid(props: Props) {
  const [pattern, setPattern] = useState(clamp(Math.round(num(props.pattern, 1)), 1, KEY_PATTERNS.length));
  const { name, opens } = KEY_PATTERNS[pattern - 1];
  const four = [0, 1, 2, 3];
  const bareRow = four.find((l) => !four.some((k) => opens(l, k)));
  const fullColumn = four.find((k) => four.every((l) => opens(l, k)));
  const each = bareRow === undefined;
  const master = fullColumn !== undefined;
  return (
    <Frame
      title="Which key opens which lock"
      summary={`Pattern ${pattern}, ${name}. “For every lock there is a key that opens it” is ${each ? "true: every row has a mark" : `false: the row of lock ${bareRow + 1} has no mark`}. “There is a key that opens every lock” is ${master ? `true: the column of key ${fullColumn + 1} is full` : "false: no column is full"}.`}
      controls={<Stepper label="pattern" value={pattern} onChange={setPattern} min={1} max={KEY_PATTERNS.length} />}
    >
      <svg viewBox="0 0 440 280" role="img" aria-label={`A grid of four locks against four keys for the pattern ${name}`}>
        {four.map((k) => (
          <text key={k} x={150 + k * 60} y="34" textAnchor="middle" className="fig-small">
            key {k + 1}
          </text>
        ))}
        {four.map((l) => (
          <g key={l}>
            <text x="104" y={76 + l * 54} textAnchor="end" className="fig-small">
              lock {l + 1}
            </text>
            {four.map((k) => (
              <g key={k}>
                <rect x={126 + k * 60} y={48 + l * 54} width="48" height="44" className={opens(l, k) ? (k === fullColumn ? "fig-accent" : "fig-fill") : "fig-ghost"} />
                {opens(l, k) ? (
                  <text x={150 + k * 60} y={77 + l * 54} textAnchor="middle" className="fig-mono" style={k === fullColumn ? { fill: "var(--bg)" } : undefined}>
                    ✓
                  </text>
                ) : null}
              </g>
            ))}
          </g>
        ))}
      </svg>
    </Frame>
  );
}

/* Calculus figures share one small plotting kit: a window on the plane, mapped to a 440 by 280 drawing. */
type View = { x0: number; x1: number; y0: number; y1: number };
const dp = (n: number, places = 4) => {
  const scale = 10 ** places;
  const rounded = Math.round(n * scale) / scale;
  return String(rounded === 0 ? 0 : rounded).replace("-", "−");
};
const scales = (v: View) => ({
  sx: (x: number) => 40 + ((x - v.x0) / (v.x1 - v.x0)) * 380,
  sy: (y: number) => 260 - ((clamp(y, v.y0 - (v.y1 - v.y0), v.y1 + (v.y1 - v.y0)) - v.y0) / (v.y1 - v.y0)) * 240,
});
const curvePoints = (f: (x: number) => number, v: View, from = v.x0, to = v.x1) => {
  const { sx, sy } = scales(v);
  return Array.from({ length: 121 }, (_, i) => {
    const x = from + ((to - from) * i) / 120;
    return `${sx(x).toFixed(1)},${sy(f(x)).toFixed(1)}`;
  }).join(" ");
};
function Axes({ view }: { view: View }) {
  const { sx, sy } = scales(view);
  const ax = clamp(0, view.x0, view.x1);
  const ay = clamp(0, view.y0, view.y1);
  return (
    <>
      <line x1={sx(view.x0)} x2={sx(view.x1)} y1={sy(ay)} y2={sy(ay)} className="fig-axis" />
      <line x1={sx(ax)} x2={sx(ax)} y1={sy(view.y0)} y2={sy(view.y1)} className="fig-axis" />
      <text x={sx(view.x0)} y={sy(ay) + 14} className="fig-small">
        {fmt(view.x0)}
      </text>
      <text x={sx(view.x1)} y={sy(ay) + 14} textAnchor="end" className="fig-small">
        {fmt(view.x1)}
      </text>
      <text x={sx(ax) - 6} y={sy(view.y1) + 10} textAnchor="end" className="fig-small">
        {fmt(view.y1)}
      </text>
    </>
  );
}

const APPROACH = [1, 0.5, 0.1, 0.01, 0.001];

const CURVES: Record<string, { name: string; f: (x: number) => number; d: (x: number) => number; view: View; low: number; high: number }> = {
  square: { name: "x²", f: (x) => x * x, d: (x) => 2 * x, view: { x0: -3, x1: 3, y0: -1, y1: 9 }, low: -2, high: 2 },
  cube: { name: "x³", f: (x) => x ** 3, d: (x) => 3 * x * x, view: { x0: -2, x1: 2, y0: -8, y1: 8 }, low: -1.5, high: 1 },
  recip: { name: "1 ÷ x", f: (x) => 1 / x, d: (x) => -1 / (x * x), view: { x0: 0.2, x1: 4, y0: 0, y1: 5 }, low: 0.5, high: 3 },
  sin: { name: "sin x", f: Math.sin, d: Math.cos, view: { x0: -1, x1: 7, y0: -1.5, y1: 1.5 }, low: 0, high: 6 },
  exp: { name: "eˣ", f: Math.exp, d: Math.exp, view: { x0: -2, x1: 2.5, y0: -0.5, y1: 8 }, low: -1.5, high: 1 },
  ln: { name: "ln x", f: Math.log, d: (x) => 1 / x, view: { x0: 0.2, x1: 6, y0: -2, y1: 2.5 }, low: 0.5, high: 5 },
};

/** A chord of a curve whose second end slides towards the first, so that its slope closes in on the slope of the tangent. */
function Secant(props: Props) {
  const which = typeof props.fn === "string" && props.fn in CURVES ? props.fn : "square";
  const c = CURVES[which];
  const [a, setA] = useState(clamp(num(props.at, 1), c.low, c.high));
  const [k, setK] = useState(clamp(Math.round(num(props.closeness, 0)), 0, 4));
  const h = APPROACH[k];
  const rise = c.f(a + h) - c.f(a);
  const chord = rise / h;
  const slope = c.d(a);
  const { sx, sy } = scales(c.view);
  const through = (m: number) => (x: number) => c.f(a) + m * (x - a);
  return (
    <Frame
      title="From a chord to a tangent"
      summary={`f(x) = ${c.name}. From x = ${dp(a)} to x = ${dp(a + h)} the curve ${rise >= 0 ? "rises" : "falls"} ${dp(Math.abs(rise))} over a run of ${dp(h)}, so the chord has slope ${dp(chord)}. The tangent at x = ${dp(a)} has slope ${dp(slope)}. Shrinking the run brings the chord's slope as near to that as you like.`}
      controls={
        <>
          <Slider label="point a" value={a} onChange={setA} min={c.low} max={c.high} step={0.25} />
          <Stepper label="closeness" value={k} onChange={setK} min={0} max={4} />
        </>
      }
    >
      <svg viewBox="0 0 440 280" role="img" aria-label={`The curve y = ${c.name} with a chord from x = ${dp(a)} to x = ${dp(a + h)} and the tangent at x = ${dp(a)}`}>
        <Axes view={c.view} />
        <polyline points={curvePoints(c.f, c.view)} className="fig-line" />
        <polyline points={curvePoints(through(slope), c.view)} className="fig-guide" fill="none" />
        <polyline points={curvePoints(through(chord), c.view)} className="fig-accent-line" fill="none" style={{ strokeWidth: 2 }} />
        <circle cx={sx(a)} cy={sy(c.f(a))} r="5" className="fig-accent" />
        <circle cx={sx(a + h)} cy={sy(c.f(a + h))} r="5" className="fig-accent" />
      </svg>
    </Frame>
  );
}

/** Two machines in a row. Each multiplies small changes by its own local rate, and the rates multiply. */
function ChainRates(props: Props) {
  const [tenths, setTenths] = useState(clamp(Math.round(num(props.x, 1.2) * 10), 5, 20));
  const x = tenths / 10;
  const u = x * x;
  const y = u ** 3;
  const inner = 2 * x;
  const outer = 3 * u * u;
  const box = (cx: number, label: string, value: string) => (
    <g>
      <rect x={cx - 52} y="70" width="104" height="70" className="fig-cell" />
      <text x={cx} y="98" textAnchor="middle" className="fig-small">
        {label}
      </text>
      <text x={cx} y="124" textAnchor="middle" className="fig-mono">
        {value}
      </text>
    </g>
  );
  const arrow = (x1: number, x2: number, yy: number, text: string) => (
    <g>
      <line x1={x1} x2={x2} y1={yy} y2={yy} className="fig-accent-line" style={{ strokeWidth: 2 }} />
      <polygon points={`${x2},${yy} ${x2 - 9},${yy - 5} ${x2 - 9},${yy + 5}`} className="fig-accent" />
      <text x={(x1 + x2) / 2} y={yy - 9} textAnchor="middle" className="fig-small">
        {text}
      </text>
    </g>
  );
  return (
    <Frame
      title="Rates multiply along a chain"
      summary={`u = x² and y = u³. At x = ${dp(x)}: u = ${dp(u)} and y = ${dp(y)}. A small change in x is multiplied by ${dp(inner)} on its way to u, and a small change in u is multiplied by ${dp(outer)} on its way to y. So y changes ${dp(inner)} × ${dp(outer)} = ${dp(inner * outer)} times as fast as x.`}
      controls={<Slider label="x in tenths" value={tenths} onChange={setTenths} min={5} max={20} />}
    >
      <svg viewBox="0 0 440 220" role="img" aria-label={`Three boxes for x, u and y joined by arrows carrying the rates ${dp(inner)} and ${dp(outer)}`}>
        {box(70, "x", dp(x))}
        {box(220, "u = x²", dp(u))}
        {box(370, "y = u³", dp(y))}
        {arrow(124, 166, 105, `× ${dp(inner, 2)}`)}
        {arrow(274, 316, 105, `× ${dp(outer, 2)}`)}
        {arrow(70, 370, 180, `altogether × ${dp(inner * outer, 2)}`)}
        <line x1="70" x2="70" y1="140" y2="180" className="fig-guide" />
      </svg>
    </Frame>
  );
}

/** Gradient descent on f(x) = x²: step against the slope, with a step size that helps or ruins it. */
function Descent(props: Props) {
  const view: View = { x0: -4, x1: 4, y0: 0, y1: 16 };
  const [hundredths, setHundredths] = useState(clamp(Math.round(num(props.rate, 0.1) * 20) * 5, 5, 110));
  const [steps, setSteps] = useState(clamp(Math.round(num(props.steps, 5)), 0, 12));
  const rate = hundredths / 100;
  const factor = 1 - 2 * rate;
  const xs = Array.from({ length: steps + 1 }, (_, i) => 3 * factor ** i);
  const last = xs[steps];
  const { sx, sy } = scales(view);
  const verdict =
    rate === 0.5
      ? "The factor is 0, so one step lands exactly on the minimum."
      : rate === 1
        ? "The factor is −1, so x jumps between 3 and −3 for ever and never improves."
        : Math.abs(factor) < 1
          ? `The distance from the minimum is multiplied by ${dp(Math.abs(factor))} at each step, so the steps close in on 0${factor < 0 ? ", jumping from side to side" : ""}.`
          : `Each step overshoots and lands further away than it started: the distance is multiplied by ${dp(Math.abs(factor))}. The method diverges.`;
  return (
    <Frame
      title="Stepping downhill"
      summary={`f(x) = x², starting at x = 3, with step size ${dp(rate)}. Each step replaces x by x − ${dp(rate)} × 2x, which is ${dp(factor)} times x. After ${steps} step${steps === 1 ? "" : "s"}, x = ${dp(last)} and f(x) = ${dp(last * last)}. ${verdict}`}
      controls={
        <>
          <Slider label="step size in hundredths" value={hundredths} onChange={setHundredths} min={5} max={110} step={5} />
          <Stepper label="steps" value={steps} onChange={setSteps} min={0} max={12} />
        </>
      }
    >
      <svg viewBox="0 0 440 280" role="img" aria-label={`A parabola with ${steps + 1} points marking the steps of gradient descent with step size ${dp(rate)}`}>
        <Axes view={view} />
        <polyline points={curvePoints((t) => t * t, view)} className="fig-line" />
        <polyline points={xs.map((t) => `${sx(clamp(t, -4, 4)).toFixed(1)},${sy(Math.min(t * t, 16)).toFixed(1)}`).join(" ")} className="fig-guide" fill="none" />
        {xs.map((t, i) => (Math.abs(t) <= 4 ? <circle key={i} cx={sx(t)} cy={sy(t * t)} r={i === steps ? 5 : 3} className={i === steps ? "fig-accent" : "fig-line"} /> : null))}
      </svg>
    </Frame>
  );
}

const AREAS: Record<string, { name: string; f: (x: number) => number; a: number; b: number; bName: string; exact: number; view: View }> = {
  square: { name: "y = x²", f: (x) => x * x, a: 0, b: 3, bName: "3", exact: 9, view: { x0: 0, x1: 3.2, y0: 0, y1: 9.5 } },
  line: { name: "y = 2x + 1", f: (x) => 2 * x + 1, a: 0, b: 3, bName: "3", exact: 12, view: { x0: 0, x1: 3.2, y0: 0, y1: 7.5 } },
  sin: { name: "y = sin x", f: Math.sin, a: 0, b: Math.PI, bName: "π", exact: 2, view: { x0: 0, x1: 3.3, y0: 0, y1: 1.3 } },
  recip: { name: "y = 1 ÷ x", f: (x) => 1 / x, a: 1, b: Math.E, bName: "e", exact: 1, view: { x0: 0.8, x1: 2.9, y0: 0, y1: 1.2 } },
};
const RULES = ["left ends", "midpoints", "right ends"];

/** The area under a curve as a sum of rectangles, which improves as the rectangles are made narrower. */
function Riemann(props: Props) {
  const which = typeof props.fn === "string" && props.fn in AREAS ? props.fn : "square";
  const c = AREAS[which];
  const [doublings, setDoublings] = useState(clamp(Math.round(num(props.doublings, 2)), 0, 6));
  const [rule, setRule] = useState(clamp(Math.round(num(props.rule, 0)), 0, 2));
  const n = 2 ** doublings;
  const width = (c.b - c.a) / n;
  const heights = Array.from({ length: n }, (_, i) => c.f(c.a + (i + rule / 2) * width));
  const total = heights.reduce((sum, hgt) => sum + hgt * width, 0);
  const { sx, sy } = scales(c.view);
  return (
    <Frame
      title="Area as a sum of rectangles"
      summary={`${n} rectangle${n === 1 ? "" : "s"} under ${c.name} from ${c.a} to ${c.bName}, with heights taken at the ${RULES[rule]}, total ${dp(total)}. The exact area is ${dp(c.exact)}. The error is ${dp(Math.abs(total - c.exact))}. Doubling the number of rectangles shrinks the error.`}
      controls={
        <>
          <Stepper label="doublings" value={doublings} onChange={setDoublings} min={0} max={6} />
          <button type="button" className="btn btn-secondary btn-small" aria-label="Change rule" onClick={() => setRule((rule + 1) % 3)}>
            Heights at {RULES[rule]}
          </button>
        </>
      }
    >
      <svg viewBox="0 0 440 280" role="img" aria-label={`${n} rectangles under the curve ${c.name}`}>
        {heights.map((hgt, i) => (
          <rect key={i} x={sx(c.a + i * width)} y={sy(hgt)} width={Math.max(0.5, sx(c.a + (i + 1) * width) - sx(c.a + i * width) - (n > 16 ? 0 : 1))} height={sy(0) - sy(hgt)} className="fig-fill" />
        ))}
        <Axes view={c.view} />
        <polyline points={curvePoints(c.f, c.view, c.a, c.b)} className="fig-accent-line" fill="none" style={{ strokeWidth: 2 }} />
      </svg>
    </Frame>
  );
}

/** The area gathered under a rate, and the fact that it grows at exactly that rate. */
function Accumulation(props: Props) {
  const rate = (t: number) => 3 - t;
  const area = (t: number) => 3 * t - (t * t) / 2;
  const [quarters, setQuarters] = useState(clamp(Math.round(num(props.x, 2) * 4), 0, 20));
  const x = quarters / 4;
  const top: View = { x0: 0, x1: 5, y0: -2.5, y1: 3.5 };
  const sx = (t: number) => 40 + (t / 5) * 380;
  const syTop = (v: number) => 130 - ((v - top.y0) / (top.y1 - top.y0)) * 120;
  const syBottom = (v: number) => 270 - (v / 5) * 110;
  const state =
    x < 3
      ? "The rate is positive, so the total is rising."
      : x === 3
        ? "The rate is zero, so the total has stopped rising: it is at its greatest, 4.5."
        : "The rate is negative. Area below the axis is subtracted, so the total is falling.";
  const line = (pts: [number, number][], sy: (v: number) => number) => pts.map(([t, v]) => `${sx(t).toFixed(1)},${sy(v).toFixed(1)}`).join(" ");
  return (
    <Frame
      title="A total and its rate"
      summary={`The rate is f(t) = 3 − t. The area gathered from 0 to x = ${dp(x)} is A(x) = ${dp(area(x))}. At this moment A is changing at the rate f(${dp(x)}) = ${dp(rate(x))}. ${state}`}
      controls={<Slider label="x in quarters" value={quarters} onChange={setQuarters} min={0} max={20} />}
    >
      <svg viewBox="0 0 440 280" role="img" aria-label={`Above, the line f(t) = 3 − t with the area from 0 to ${dp(x)} shaded. Below, the graph of the area gathered so far.`}>
        <polygon points={line(x <= 3 ? [[0, 0], [0, 3], [x, rate(x)], [x, 0]] : [[0, 0], [0, 3], [3, 0]], syTop)} className="fig-fill" />
        {x > 3 ? <polygon points={line([[3, 0], [x, rate(x)], [x, 0]], syTop)} className="fig-fill" opacity="0.45" /> : null}
        <line x1={sx(0)} x2={sx(5)} y1={syTop(0)} y2={syTop(0)} className="fig-axis" />
        <polyline points={line([[0, 3], [5, -2]], syTop)} className="fig-line" />
        <circle cx={sx(x)} cy={syTop(rate(x))} r="4" className="fig-accent" />
        <text x={sx(5)} y={syTop(0) - 6} textAnchor="end" className="fig-small">
          rate f(t)
        </text>
        <line x1={sx(0)} x2={sx(5)} y1={syBottom(0)} y2={syBottom(0)} className="fig-axis" />
        <polyline points={line(Array.from({ length: 41 }, (_, i) => [i / 8, area(i / 8)] as [number, number]), syBottom)} className="fig-line" />
        <line x1={sx(x)} x2={sx(x)} y1={syTop(top.y1)} y2={syBottom(0)} className="fig-guide" />
        <circle cx={sx(x)} cy={syBottom(area(x))} r="5" className="fig-accent" />
        <text x={sx(5)} y={syBottom(0) - 6} textAnchor="end" className="fig-small">
          total A(x)
        </text>
      </svg>
    </Frame>
  );
}

/* Vectors are drawn on a square grid, 40 pixels to the unit in both directions, so that angles and lengths look true. */
const gx = (x: number) => 230 + 40 * x;
const gy = (y: number) => 140 - 40 * y;
type Pair = [number, number];
const pair = ([x, y]: Pair) => `(${dp(x)}, ${dp(y)})`;
const dot = (a: Pair, b: Pair) => a[0] * b[0] + a[1] * b[1];
const signed = (v: number) => (v < 0 ? `− ${dp(-v)}` : `+ ${dp(v)}`);

function Grid() {
  return (
    <>
      <defs>
        <clipPath id="grid-clip">
          <rect x={gx(-4.75)} y={gy(3)} width={380} height={240} />
        </clipPath>
      </defs>
      {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((i) => (
        <line key={`v${i}`} x1={gx(i)} x2={gx(i)} y1={gy(-3)} y2={gy(3)} className={i === 0 ? "fig-axis" : "fig-grid"} />
      ))}
      {[-3, -2, -1, 0, 1, 2, 3].map((i) => (
        <line key={`h${i}`} x1={gx(-4.75)} x2={gx(4.75)} y1={gy(i)} y2={gy(i)} className={i === 0 ? "fig-axis" : "fig-grid"} />
      ))}
    </>
  );
}

function Arrow({ from = [0, 0], to, accent = false, dashed = false, name }: { from?: Pair; to: Pair; accent?: boolean; dashed?: boolean; name?: string }) {
  const [x0, y0, x1, y1] = [gx(from[0]), gy(from[1]), gx(to[0]), gy(to[1])];
  const length = Math.hypot(x1 - x0, y1 - y0);
  const stroke = dashed ? "fig-guide" : accent ? "fig-accent-line" : "fig-line";
  if (length < 1) return <circle cx={x0} cy={y0} r="3" className={accent ? "fig-accent" : "fig-fill"} />;
  const [ux, uy] = [(x1 - x0) / length, (y1 - y0) / length];
  const head = `${(x1 - 9 * ux + 5 * uy).toFixed(1)},${(y1 - 9 * uy - 5 * ux).toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)} ${(x1 - 9 * ux - 5 * uy).toFixed(1)},${(y1 - 9 * uy + 5 * ux).toFixed(1)}`;
  return (
    <>
      <line x1={x0} y1={y0} x2={x1} y2={y1} className={stroke} />
      <polyline points={head} className={stroke} fill="none" />
      {name ? (
        <text x={x1 + 8 * ux - 4} y={y1 + 8 * uy + 4} className="fig-small">
          {name}
        </text>
      ) : null}
    </>
  );
}

const TAILS: Pair[] = [
  [0, 0],
  [1, 1],
  [-1, -1],
  [1.5, -1],
];

/** A vector as an arrow and as a list of two numbers, and the fact that moving the arrow does not change the vector. */
function VectorArrow(props: Props) {
  const [x, setX] = useState(clamp(num(props.x, 3), -3, 3));
  const [y, setY] = useState(clamp(num(props.y, 2), -2, 2));
  const [tail, setTail] = useState(0);
  const from = TAILS[tail];
  const to: Pair = [from[0] + x, from[1] + y];
  const across = x === 0 ? "0 across" : `${dp(Math.abs(x))} ${x > 0 ? "right" : "left"}`;
  const up = y === 0 ? "0 up" : `${dp(Math.abs(y))} ${y > 0 ? "up" : "down"}`;
  return (
    <Frame
      title="An arrow and a list"
      summary={`The vector ${pair([x, y])}, drawn from ${pair(from)} to ${pair(to)}: ${across} and ${up}. Its length is ${dp(Math.hypot(x, y))}. ${tail === 0 ? "Drawn from the origin, its tip is at the point with the same two numbers." : "It has been moved, and it is still the same vector: the same two numbers, the same length, the same direction."}`}
      controls={
        <>
          <Slider label="across" value={x} onChange={setX} min={-3} max={3} step={0.5} />
          <Slider label="up" value={y} onChange={setY} min={-2} max={2} step={0.5} />
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setTail((tail + 1) % TAILS.length)}>
            Move the arrow
          </button>
        </>
      }
    >
      <svg viewBox="0 0 440 280" role="img" aria-label={`An arrow from ${pair(from)} to ${pair(to)}`}>
        <Grid />
        <line x1={gx(from[0])} y1={gy(from[1])} x2={gx(to[0])} y2={gy(from[1])} className="fig-guide" />
        <line x1={gx(to[0])} y1={gy(from[1])} x2={gx(to[0])} y2={gy(to[1])} className="fig-guide" />
        <Arrow from={from} to={to} accent />
      </svg>
    </Frame>
  );
}

/** Adding two vectors tip to tail, in either order, with one of them scaled. */
function VectorSum(props: Props) {
  const a: Pair = [clamp(num(props.ax, 2), -2, 2), clamp(num(props.ay, 1), -1, 1)];
  const b: Pair = [clamp(num(props.bx, 1), -1, 1), clamp(num(props.by, 1), -1, 1)];
  const [halves, setHalves] = useState(clamp(Math.round(num(props.scale, 1) * 2), -4, 4));
  const [bFirst, setBFirst] = useState(false);
  const c = halves / 2;
  const cb: Pair = [c * b[0], c * b[1]];
  const sum: Pair = [a[0] + cb[0], a[1] + cb[1]];
  const scaled = c === 1 ? "b" : c === -1 ? "−b" : `${dp(c)}b`;
  const term = c < 0 ? `(${scaled})` : scaled;
  const effect = c === 0 ? "Scaling by 0 gives the zero vector, so the sum is a itself." : c < 0 ? `A negative scale turns b round to point the opposite way${c === -1 ? "" : ` and makes it ${dp(Math.abs(c))} times as long`}.` : c === 1 ? "" : `Scaling by ${dp(c)} keeps b's direction and makes it ${dp(c)} times as long.`;
  return (
    <Frame
      title="Adding tip to tail"
      summary={`a = ${pair(a)} and b = ${pair(b)}${c === 1 ? "" : `, so ${scaled} = ${pair(cb)}`}. ${bFirst ? `Walk along ${scaled}, then along a` : `Walk along a, then along ${scaled}`}: you arrive at a + ${term} = (${dp(a[0])} ${signed(cb[0])}, ${dp(a[1])} ${signed(cb[1])}) = ${pair(sum)}. Either order arrives at the same place. ${effect}`.trim()}
      controls={
        <>
          <Slider label="scale of b in halves" value={halves} onChange={setHalves} min={-4} max={4} />
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setBFirst(!bFirst)}>
            Swap the order
          </button>
        </>
      }
    >
      <svg viewBox="0 0 440 280" role="img" aria-label={`The vectors a and ${scaled} added tip to tail, giving ${pair(sum)}`}>
        <Grid />
        <Arrow to={bFirst ? a : cb} dashed />
        <Arrow from={bFirst ? a : cb} to={sum} dashed />
        <Arrow to={bFirst ? cb : a} name={bFirst ? scaled : "a"} />
        <Arrow from={bFirst ? cb : a} to={sum} name={bFirst ? "a" : scaled} />
        <Arrow to={sum} accent />
      </svg>
    </Frame>
  );
}

/** The dot product as one vector's length times the other's shadow on it, changing sign as the angle opens. */
function DotProduct(props: Props) {
  const a: Pair = [3, 0];
  const [angle, setAngle] = useState(clamp(Math.round(num(props.angle, 45) / 15) * 15, 0, 345));
  const [halves, setHalves] = useState(clamp(Math.round(num(props.length, 2) * 2), 1, 6));
  const length = halves / 2;
  const b: Pair = [length * Math.cos((angle * Math.PI) / 180), length * Math.sin((angle * Math.PI) / 180)];
  const product = dot(a, b);
  const shadow = b[0];
  const between = angle > 180 ? 360 - angle : angle;
  const tidy = (v: number) => (Math.abs(v) < 1e-9 ? 0 : v);
  const verdict =
    tidy(product) === 0
      ? "The dot product is zero: b is at a right angle to a and has no part along it."
      : product > 0
        ? "The dot product is positive: b points partly along a."
        : "The dot product is negative: b points partly against a.";
  return (
    <Frame
      title="The dot product and the shadow"
      summary={`a = ${pair(a)} and b = ${pair([tidy(b[0]), tidy(b[1])])}, of length ${dp(length)}, with ${between}° between them. a · b = 3 × ${dp(tidy(b[0]))} + 0 × ${dp(tidy(b[1]))} = ${dp(tidy(product))}. The shadow of b on a has length ${dp(tidy(shadow))}, and 3 × ${dp(tidy(shadow))} gives the same number. ${verdict}`}
      controls={
        <>
          <Slider label="angle of b in degrees" value={angle} onChange={setAngle} min={0} max={345} step={15} />
          <Slider label="length of b in halves" value={halves} onChange={setHalves} min={1} max={6} />
        </>
      }
    >
      <svg viewBox="0 0 440 280" role="img" aria-label={`The vector b at ${between} degrees to a, with its shadow on a`}>
        <Grid />
        <line x1={gx(b[0])} y1={gy(b[1])} x2={gx(b[0])} y2={gy(0)} className="fig-guide" />
        <Arrow to={a} name="a" />
        <Arrow to={b} name="b" />
        <line x1={gx(0)} y1={gy(0)} x2={gx(shadow)} y2={gy(0)} className="fig-accent-line" />
        <circle cx={gx(shadow)} cy={gy(0)} r="4" className="fig-accent" />
      </svg>
    </Frame>
  );
}

const NORMS = [
  { name: "Euclidean", symbol: "‖x‖₂", shape: "a circle", f: (x: number, y: number) => Math.hypot(x, y), how: (x: number, y: number) => `√(${dp(x)}² + ${dp(y)}²)` },
  { name: "taxicab", symbol: "‖x‖₁", shape: "a diamond", f: (x: number, y: number) => Math.abs(x) + Math.abs(y), how: (x: number, y: number) => `${dp(Math.abs(x))} + ${dp(Math.abs(y))}` },
  { name: "maximum", symbol: "‖x‖∞", shape: "a square", f: (x: number, y: number) => Math.max(Math.abs(x), Math.abs(y)), how: (x: number, y: number) => `the larger of ${dp(Math.abs(x))} and ${dp(Math.abs(y))}` },
];

/** Three ways of measuring the length of the same vector, and the shape of "all points at distance 1" under each. */
function NormBalls(props: Props) {
  const [xq, setXq] = useState(clamp(Math.round(num(props.x, 1.5) * 4), -12, 12));
  const [yq, setYq] = useState(clamp(Math.round(num(props.y, 1) * 4), -10, 10));
  const [which, setWhich] = useState(clamp(Math.round(num(props.norm, 0)), 0, 2));
  const [x, y] = [xq / 4, yq / 4];
  const norm = NORMS[which];
  const size = norm.f(x, y);
  const ball = (r: number) =>
    which === 0 ? (
      <circle cx={gx(0)} cy={gy(0)} r={40 * r} className={r === 1 ? "fig-line" : "fig-ghost"} />
    ) : which === 1 ? (
      <polygon points={`${gx(r)},${gy(0)} ${gx(0)},${gy(r)} ${gx(-r)},${gy(0)} ${gx(0)},${gy(-r)}`} className={r === 1 ? "fig-line" : "fig-ghost"} />
    ) : (
      <rect x={gx(-r)} y={gy(r)} width={80 * r} height={80 * r} className={r === 1 ? "fig-line" : "fig-ghost"} />
    );
  return (
    <Frame
      title="Three ways to measure length"
      summary={`The vector ${pair([x, y])}. Its ${norm.name} norm ${norm.symbol} is ${norm.how(x, y)} = ${dp(size)}. With this norm the points at distance 1 from the origin form ${norm.shape}. All three norms of this vector: Euclidean ${dp(NORMS[0].f(x, y))}, taxicab ${dp(NORMS[1].f(x, y))}, maximum ${dp(NORMS[2].f(x, y))}.`}
      controls={
        <>
          <Slider label="across in quarters" value={xq} onChange={setXq} min={-12} max={12} />
          <Slider label="up in quarters" value={yq} onChange={setYq} min={-10} max={10} />
          <button type="button" className="btn btn-secondary btn-small" aria-label="Change norm" onClick={() => setWhich((which + 1) % 3)}>
            {norm.name} norm
          </button>
        </>
      }
    >
      <svg viewBox="0 0 440 280" role="img" aria-label={`The vector ${pair([x, y])} with the set of points at ${norm.name} distance 1 and at distance ${dp(size)}`}>
        <Grid />
        {size > 0 ? ball(size) : null}
        {ball(1)}
        <Arrow to={[x, y]} accent />
      </svg>
    </Frame>
  );
}

/** The nearest point to b on the line through a, and the leftover that is perpendicular to a. */
function Projection(props: Props) {
  const a: Pair = [3, 1];
  const [bx, setBx] = useState(clamp(Math.round(num(props.bx, 1) * 2) / 2, -4, 4));
  const [by, setBy] = useState(clamp(Math.round(num(props.by, 2) * 2) / 2, -2.5, 2.5));
  const b: Pair = [bx, by];
  const k = dot(a, b) / dot(a, a);
  const p: Pair = [k * a[0], k * a[1]];
  const e: Pair = [b[0] - p[0], b[1] - p[1]];
  return (
    <Frame
      title="Projection onto a line"
      summary={`a = ${pair(a)} and b = ${pair(b)}. a · b = ${dp(dot(a, b))} and a · a = 10, so the projection of b onto a is ${dp(k)} times a, which is p = ${pair(p)}. What is left over, b − p = ${pair(e)}, is at a right angle to a: its dot product with a is 0. No point on the line through a is nearer to b than p, and the distance is ${dp(Math.hypot(e[0], e[1]))}.`}
      controls={
        <>
          <Slider label="b across" value={bx} onChange={setBx} min={-4} max={4} step={0.5} />
          <Slider label="b up" value={by} onChange={setBy} min={-2.5} max={2.5} step={0.5} />
        </>
      }
    >
      <svg viewBox="0 0 440 280" role="img" aria-label={`The vector b, its projection ${pair(p)} on the line through a, and the perpendicular from b to the line`}>
        <Grid />
        <line x1={gx(-6)} y1={gy(-2)} x2={gx(6)} y2={gy(2)} className="fig-ghost" clipPath="url(#grid-clip)" />
        <line x1={gx(b[0])} y1={gy(b[1])} x2={gx(p[0])} y2={gy(p[1])} className="fig-guide" />
        <Arrow to={a} name="a" />
        <Arrow to={b} name="b" />
        <Arrow to={p} accent />
        <circle cx={gx(p[0])} cy={gy(p[1])} r="4" className="fig-accent" />
      </svg>
    </Frame>
  );
}

/** A line as the set of points where w · x + c is zero, with w at right angles to it and a sign on each side. */
function Hyperplane(props: Props) {
  const [w1h, setW1] = useState(clamp(Math.round(num(props.w1, 1) * 2), -4, 4));
  const [w2h, setW2] = useState(clamp(Math.round(num(props.w2, 2) * 2), -4, 4));
  const [ch, setC] = useState(clamp(Math.round(num(props.c, -2) * 2), -8, 8));
  const point: Pair = [clamp(num(props.px, 2), -4, 4), clamp(num(props.py, 1), -2.5, 2.5)];
  const w: Pair = [w1h / 2, w2h / 2];
  const c = ch / 2;
  const size = Math.hypot(w[0], w[1]);
  const value = dot(w, point) + c;
  const foot: Pair = size === 0 ? [0, 0] : [(-c * w[0]) / (size * size), (-c * w[1]) / (size * size)];
  const along: Pair = size === 0 ? [0, 0] : [-w[1] / size, w[0] / size];
  const side = value === 0 ? "which is zero, so the point is on the line." : `which is ${value > 0 ? "positive" : "negative"}, so the point is on the side that w points ${value > 0 ? "towards" : "away from"}, at a distance of ${dp(Math.abs(value))} ÷ ${dp(size)} = ${dp(Math.abs(value) / size)} from the line.`;
  return (
    <Frame
      title="A line from a vector and a number"
      summary={
        size === 0
          ? `With w = (0, 0) the expression w · x ${signed(c)} is ${dp(c)} at every point, so it describes no line at all.`
          : `The line ${dp(w[0])}x + ${dp(w[1])}y ${signed(c)} = 0. The vector w = ${pair(w)} is at right angles to it. At the point ${pair(point)} the expression is ${dp(w[0])} × ${dp(point[0])} + ${dp(w[1])} × ${dp(point[1])} ${signed(c)} = ${dp(value)}, ${side}`
      }
      controls={
        <>
          <Slider label="first weight in halves" value={w1h} onChange={setW1} min={-4} max={4} />
          <Slider label="second weight in halves" value={w2h} onChange={setW2} min={-4} max={4} />
          <Slider label="offset in halves" value={ch} onChange={setC} min={-8} max={8} />
        </>
      }
    >
      <svg viewBox="0 0 440 280" role="img" aria-label={size === 0 ? "No line" : `The line with normal vector ${pair(w)} and the point ${pair(point)}`}>
        <Grid />
        {size === 0 ? null : (
          <>
            <g clipPath="url(#grid-clip)">
              <line x1={gx(foot[0] - 12 * along[0])} y1={gy(foot[1] - 12 * along[1])} x2={gx(foot[0] + 12 * along[0])} y2={gy(foot[1] + 12 * along[1])} className="fig-accent-line" />
            </g>
            <Arrow from={foot} to={[foot[0] + w[0], foot[1] + w[1]]} name="w" />
          </>
        )}
        <circle cx={gx(point[0])} cy={gy(point[1])} r="5" className="fig-accent" />
      </svg>
    </Frame>
  );
}

/* Figures for data structures and algorithms share three small parts: a row of cells, a node and a link. */
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** A row of boxed values, drawn as the cells of an array. */
function Cells({
  values,
  x = 12,
  y,
  w = 44,
  h = 34,
  hot = [],
  faint = [],
  under,
}: {
  values: (string | number)[];
  x?: number;
  y: number;
  w?: number;
  h?: number;
  hot?: number[];
  faint?: number[];
  under?: (i: number) => string;
}) {
  return (
    <>
      {values.map((value, i) => {
        const on = hot.includes(i);
        const middle = x + i * w + (w - 4) / 2;
        return (
          <g key={i}>
            <rect x={x + i * w} y={y} width={w - 4} height={h} className={on ? "fig-accent" : faint.includes(i) ? "fig-ghost" : "fig-fill"} />
            <text x={middle} y={y + h / 2 + 6} textAnchor="middle" className="fig-mono" style={on ? { fill: "var(--bg)" } : undefined}>
              {value}
            </text>
            {under ? (
              <text x={middle} y={y + h + 14} textAnchor="middle" className="fig-small">
                {under(i)}
              </text>
            ) : null}
          </g>
        );
      })}
    </>
  );
}

type Spot = [number, number];
type Mark = "now" | "done" | "wait";

/** A named node of a graph or a tree. A wide node is a box, for names longer than a letter. */
function Dot({ at, name, mark, wide = false, note, above = false }: { at: Spot; name: string | number; mark: Mark; wide?: boolean; note?: string; above?: boolean }) {
  const style = mark === "now" ? "fig-accent" : mark === "done" ? "fig-fill" : "fig-ghost";
  return (
    <g>
      {wide ? <rect x={at[0] - 32} y={at[1] - 14} width="64" height="28" className={style} /> : <circle cx={at[0]} cy={at[1]} r="16" className={style} />}
      <text x={at[0]} y={at[1] + 4} textAnchor="middle" className="fig-small" style={{ fill: mark === "now" ? "var(--bg)" : "var(--text)" }}>
        {name}
      </text>
      {note ? (
        <text x={at[0]} y={at[1] + (above ? -22 : 32)} textAnchor="middle" className="fig-small">
          {note}
        </text>
      ) : null}
    </g>
  );
}

/** A line between two nodes, stopping short of each, with an optional arrowhead and label. */
function Link({ from, to, arrow = false, hot = false, faint = false, gap = 18, label }: { from: Spot; to: Spot; arrow?: boolean; hot?: boolean; faint?: boolean; gap?: number; label?: string | number }) {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
  const [ux, uy] = [(to[0] - from[0]) / length, (to[1] - from[1]) / length];
  const [x0, y0, x1, y1] = [from[0] + gap * ux, from[1] + gap * uy, to[0] - gap * ux, to[1] - gap * uy];
  const stroke = hot ? "fig-accent-line" : faint ? "fig-guide" : "fig-axis";
  const head = `${(x1 - 8 * ux + 4 * uy).toFixed(1)},${(y1 - 8 * uy - 4 * ux).toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)} ${(x1 - 8 * ux - 4 * uy).toFixed(1)},${(y1 - 8 * uy + 4 * ux).toFixed(1)}`;
  return (
    <>
      <line x1={x0} y1={y0} x2={x1} y2={y1} className={stroke} />
      {arrow ? <polyline points={head} className={stroke} fill="none" /> : null}
      {label === undefined ? null : (
        <text x={(x0 + x1) / 2 + 9 * uy} y={(y0 + y1) / 2 - 9 * ux + 4} textAnchor="middle" className="fig-small">
          {label}
        </text>
      )}
    </>
  );
}

const SHELF = [3, 8, 1, 9, 4, 7];

/** The same insertion into an array, where later items must move, and into a linked list, where links must be followed. */
function ArrayList(props: Props) {
  const n = SHELF.length;
  const [at, setAt] = useState(clamp(Math.round(num(props.index, 2)), 0, n));
  const moved = n - at;
  const after = [...SHELF.slice(0, at), 5, ...SHELF.slice(at)];
  const before = Array.from({ length: at }, (_, i) => i);
  const later = Array.from({ length: moved }, (_, i) => at + 1 + i);
  const step = 60;
  const spot = (i: number): Spot => [34 + i * step, 196];
  return (
    <Frame
      title="Inserting into an array and into a linked list"
      summary={`Inserting 5 at index ${at} of a list of ${n} items. Array: ${
        moved === 0 ? "the new item goes after the last one, so nothing has to move" : `the ${plural(moved, "item")} from index ${at} onwards each move one place to the right, ${plural(moved, "move")}`
      }. Linked list: ${at === 0 ? "the place is at the head, so no links are followed" : `${plural(at, "link is", "links are")} followed from the head to reach the place`}, then 2 links are changed and no item moves.`}
      controls={<Stepper label="index" value={at} onChange={setAt} min={0} max={n} />}
    >
      <svg viewBox="0 0 440 280" role="img" aria-label={`The value 5 inserted at index ${at} of an array and of a linked list`}>
        <text x="12" y="22" className="fig-small">
          array: the filled cells had to move
        </text>
        <Cells values={after} y={34} w={60} hot={[at]} faint={before} under={(i) => String(i)} />
        <text x="12" y="156" className="fig-small">
          linked list: the filled nodes were walked past
        </text>
        {after.map((value, i) => (
          <g key={i}>
            {i < after.length - 1 ? <Link from={spot(i)} to={spot(i + 1)} arrow hot={i === at - 1 || i === at} /> : null}
            <Dot at={spot(i)} name={value} mark={i === at ? "now" : later.includes(i) ? "wait" : "done"} />
          </g>
        ))}
      </svg>
    </Frame>
  );
}

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

/** One line of items with two rules for who leaves next: the last one in, or the first one in. */
function StackQueue(props: Props) {
  const [queue, setQueue] = useState(props.mode === "queue");
  const start = clamp(Math.round(num(props.items, 3)), 0, 6);
  const [state, setState] = useState({ items: LETTERS.slice(0, start), next: start, out: [] as string[] });
  const { items, next, out } = state;
  const leaving = items.length === 0 ? -1 : queue ? 0 : items.length - 1;
  const kind = queue ? "queue" : "stack";
  return (
    <Frame
      title="Last in or first in"
      summary={`A ${kind} holding ${items.length === 0 ? "nothing" : items.join(", ")}${items.length > 1 ? ", in the order they were added" : ""}. ${
        leaving < 0 ? "There is nothing to remove." : `The next to leave is ${items[leaving]}, the ${queue ? "first" : "last"} one in.`
      }${out.length > 0 ? ` Removed so far, in order: ${out.join(", ")}.` : ""}`}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" disabled={items.length >= 6 || next >= LETTERS.length} onClick={() => setState({ items: [...items, LETTERS[next]], next: next + 1, out })}>
            Add an item
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-small"
            disabled={leaving < 0}
            onClick={() => setState({ items: queue ? items.slice(1) : items.slice(0, -1), next, out: [...out, items[leaving]] })}
          >
            Remove an item
          </button>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setQueue(!queue)}>
            {queue ? "Switch to stack" : "Switch to queue"}
          </button>
        </>
      }
    >
      <svg viewBox="0 0 440 200" role="img" aria-label={`A ${kind} holding ${items.length === 0 ? "nothing" : items.join(", ")}`}>
        <text x="12" y="40" className="fig-small">
          {queue ? "queue: leaves from the front, joins at the back" : "stack: joins and leaves at the same end"}
        </text>
        <line x1="12" x2="428" y1="148" y2="148" className="fig-axis" />
        <Cells values={items} x={40} y={78} w={60} h={44} hot={leaving < 0 ? [] : [leaving]} under={(i) => (i === leaving ? "leaves next" : "")} />
        {out.length > 0 ? (
          <text x="12" y="180" className="fig-small">
            removed: {out.join(" ")}
          </text>
        ) : null}
      </svg>
    </Frame>
  );
}

const KEYS = [12, 25, 7, 33, 18, 41, 4, 26];

/** Keys dropped into numbered buckets by their remainder, with the chains that form when two keys share a bucket. */
function HashTable(props: Props) {
  const [m, setM] = useState(clamp(Math.round(num(props.buckets, 5)), 2, 11));
  const [count, setCount] = useState(clamp(Math.round(num(props.keys, 8)), 1, KEYS.length));
  const keys = KEYS.slice(0, count);
  const buckets = Array.from({ length: m }, (_, b) => keys.filter((key) => key % m === b));
  const longest = Math.max(...buckets.map((bucket) => bucket.length));
  const worst = buckets.findIndex((bucket) => bucket.length === longest);
  const empty = buckets.filter((bucket) => bucket.length === 0).length;
  const row = 23;
  return (
    <Frame
      title="Keys in buckets"
      summary={`${plural(count, "key")} in ${m} buckets, each placed in bucket number key mod ${m}. The load factor is ${count} ÷ ${m} = ${dp(count / m, 2)}. The fullest bucket is number ${worst}, holding ${buckets[worst].join(", ")}, so a lookup compares at most ${plural(longest, "key")}. ${plural(empty, "bucket is", "buckets are")} empty.`}
      controls={
        <>
          <Slider label="number of buckets" value={m} onChange={setM} min={2} max={11} />
          <Stepper label="keys" value={count} onChange={setCount} min={1} max={KEYS.length} />
        </>
      }
    >
      <svg viewBox="0 0 440 280" role="img" aria-label={`${count} keys spread over ${m} buckets, the fullest holding ${longest}`}>
        {buckets.map((bucket, b) => (
          <g key={b}>
            <text x="30" y={24 + b * row} textAnchor="end" className="fig-small">
              {b}
            </text>
            <rect x="40" y={10 + b * row} width="20" height={row - 4} className="fig-ghost" />
            {bucket.map((key, i) => (
              <g key={key}>
                <line x1={60 + i * 56} x2={76 + i * 56} y1={20 + b * row} y2={20 + b * row} className="fig-axis" />
                <rect x={76 + i * 56} y={10 + b * row} width="40" height={row - 4} className={b === worst ? "fig-accent" : "fig-fill"} />
                <text x={96 + i * 56} y={24 + b * row} textAnchor="middle" className="fig-small" style={{ fill: b === worst ? "var(--bg)" : "var(--text)" }}>
                  {key}
                </text>
              </g>
            ))}
          </g>
        ))}
      </svg>
    </Frame>
  );
}

const HEAP_START = [2, 5, 3, 9, 6, 8];
const HEAP_NEXT = [1, 7, 4, 10];

/** A binary min-heap drawn as a tree and as the list that stores it, with insertion and removal of the smallest. */
function Heap() {
  const [state, setState] = useState({ items: HEAP_START, fed: 0, note: "Every parent is no larger than its children." });
  const { items, fed, note } = state;
  const insert = () => {
    const next = [...items, HEAP_NEXT[fed]];
    let i = next.length - 1;
    let swaps = 0;
    while (i > 0 && next[Math.floor((i - 1) / 2)] > next[i]) {
      const parent = Math.floor((i - 1) / 2);
      [next[parent], next[i]] = [next[i], next[parent]];
      i = parent;
      swaps += 1;
    }
    setState({
      items: next,
      fed: fed + 1,
      note: `Inserted ${HEAP_NEXT[fed]} at the end and swapped it with its parent ${plural(swaps, "time")}, ${i === 0 && swaps > 0 ? "which took it to the top" : "until its parent was no larger"}.`,
    });
  };
  const remove = () => {
    const smallest = items[0];
    const last = items[items.length - 1];
    const next = items.slice(0, -1);
    let swaps = 0;
    if (next.length > 0) {
      next[0] = last;
      let i = 0;
      for (;;) {
        const [left, right] = [2 * i + 1, 2 * i + 2];
        let least = i;
        if (left < next.length && next[left] < next[least]) least = left;
        if (right < next.length && next[right] < next[least]) least = right;
        if (least === i) break;
        [next[least], next[i]] = [next[i], next[least]];
        i = least;
        swaps += 1;
      }
    }
    setState({
      items: next,
      fed,
      note: next.length === 0 ? `Removed the smallest, ${smallest}. The heap is empty.` : `Removed the smallest, ${smallest}. The last item, ${last}, took its place at the top and was swapped with its smaller child ${plural(swaps, "time")}.`,
    });
  };
  const spot = (i: number): Spot => {
    const level = Math.floor(Math.log2(i + 1));
    const across = i + 1 - 2 ** level;
    return [(across + 0.5) * (440 / 2 ** level), 26 + level * 50];
  };
  return (
    <Frame
      title="A heap as a tree and as a list"
      summary={`The heap as a list: [${items.join(", ")}]. ${items.length > 0 ? `The smallest item, ${items[0]}, is at index 0. ` : ""}The item at index i has its children at indices 2i + 1 and 2i + 2. ${note}`}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" disabled={fed >= HEAP_NEXT.length} onClick={insert}>
            Insert an item
          </button>
          <button type="button" className="btn btn-secondary btn-small" disabled={items.length === 0} onClick={remove}>
            Remove the smallest
          </button>
        </>
      }
    >
      <svg viewBox="0 0 440 280" role="img" aria-label={`A heap of ${plural(items.length, "item")} with ${items.length > 0 ? items[0] : "nothing"} at the top`}>
        {items.map((value, i) => (
          <g key={i}>
            {i > 0 ? <Link from={spot(Math.floor((i - 1) / 2))} to={spot(i)} /> : null}
            <Dot at={spot(i)} name={value} mark={i === 0 ? "now" : "done"} />
          </g>
        ))}
        <Cells values={items} x={12} y={226} w={42} h={28} hot={items.length > 0 ? [0] : []} under={(i) => String(i)} />
      </svg>
    </Frame>
  );
}

type TreeNode = { key: number; left: TreeNode | null; right: TreeNode | null; height: number };
const levels = (t: TreeNode | null): number => (t ? t.height : 0);
const treeNode = (key: number, left: TreeNode | null, right: TreeNode | null): TreeNode => ({ key, left, right, height: 1 + Math.max(levels(left), levels(right)) });
const turnRight = (t: TreeNode) => treeNode(t.left!.key, t.left!.left, treeNode(t.key, t.left!.right, t.right));
const turnLeft = (t: TreeNode) => treeNode(t.right!.key, treeNode(t.key, t.left, t.right!.left), t.right!.right);

/** Inserts a key as a binary search tree does, and, if asked, restores the AVL balance on the way back up, counting the rotations. */
function treeInsert(t: TreeNode | null, key: number, balance: boolean, turns: { count: number }): TreeNode {
  if (!t) return treeNode(key, null, null);
  if (key === t.key) return t;
  let next = key < t.key ? treeNode(t.key, treeInsert(t.left, key, balance, turns), t.right) : treeNode(t.key, t.left, treeInsert(t.right, key, balance, turns));
  if (!balance) return next;
  const lean = levels(next.left) - levels(next.right);
  if (lean > 1) {
    if (key > next.left!.key) {
      next = treeNode(next.key, turnLeft(next.left!), next.right);
      turns.count += 1;
    }
    turns.count += 1;
    return turnRight(next);
  }
  if (lean < -1) {
    if (key < next.right!.key) {
      next = treeNode(next.key, next.left, turnRight(next.right!));
      turns.count += 1;
    }
    turns.count += 1;
    return turnLeft(next);
  }
  return next;
}

const TREE_KEYS = [50, 30, 70, 20, 40, 60, 80, 35, 65, 10, 90, 45, 55, 75, 25];

/** A binary search tree built by inserting keys one at a time, in the order given or in sorted order, with or without rebalancing, and the path a search takes. */
function SearchTree(props: Props) {
  const given = Array.isArray(props.keys) && props.keys.every((k) => typeof k === "number") && props.keys.length > 0 ? (props.keys as number[]).slice(0, 15) : TREE_KEYS;
  const [count, setCount] = useState(clamp(Math.round(num(props.count, given.length)), 1, given.length));
  const [sorted, setSorted] = useState(props.sorted === true);
  const [balance, setBalance] = useState(props.balance === true);
  const [target, setTarget] = useState(clamp(Math.round(num(props.target, 45) / 5) * 5, 0, 100));
  const offerBalance = typeof props.balance === "boolean";
  const order = sorted ? [...given.slice(0, count)].sort((a, b) => a - b) : given.slice(0, count);
  const turns = { count: 0 };
  let root: TreeNode | null = null;
  for (const key of order) root = treeInsert(root, key, balance, turns);
  const height = levels(root) - 1;
  const path: number[] = [];
  let node = root;
  while (node && node.key !== target) {
    path.push(node.key);
    node = target < node.key ? node.left : node.right;
  }
  const found = node !== null;
  if (node) path.push(node.key);
  const placed: { key: number; at: Spot; parent: Spot | null }[] = [];
  let column = 0;
  const step = order.length > 1 ? 400 / (order.length - 1) : 0;
  const rise = Math.min(48, 236 / Math.max(height, 1));
  const lay = (t: TreeNode | null, depth: number, parent: Spot | null) => {
    if (!t) return;
    const index = placed.length;
    placed.push({ key: t.key, at: [0, 0], parent });
    lay(t.left, depth + 1, null);
    const at: Spot = [order.length > 1 ? 20 + column * step : 220, 24 + depth * rise];
    column += 1;
    placed[index].at = at;
    lay(t.right, depth + 1, null);
  };
  lay(root, 0, null);
  const where = new Map(placed.map((p) => [p.key, p.at]));
  const edges: { from: Spot; to: Spot; on: boolean }[] = [];
  const collect = (t: TreeNode | null) => {
    if (!t) return;
    for (const child of [t.left, t.right]) {
      if (child) {
        edges.push({ from: where.get(t.key)!, to: where.get(child.key)!, on: path.includes(t.key) && path.includes(child.key) });
        collect(child);
      }
    }
  };
  collect(root);
  return (
    <Frame
      title="A binary search tree"
      summary={`Inserting ${order.join(", ")} in that order${balance ? ", rebalancing after each insertion," : ""} gives a tree of height ${height}: its deepest key is ${plural(height, "link")} below the root${
        balance ? `, and ${plural(turns.count, "rotation was", "rotations were")} needed along the way` : ""
      }. Read from left to right, the keys are in increasing order. Searching for ${target} compares it with ${path.join(", ")} and ${found ? "finds it" : "reaches an empty place, so it is not in the tree"}: ${plural(path.length, "comparison")}.`}
      controls={
        <>
          <Stepper label="keys" value={count} onChange={setCount} min={1} max={given.length} />
          <Slider label="search for" value={target} onChange={setTarget} min={0} max={100} step={5} />
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setSorted(!sorted)}>
            {sorted ? "Insert in the order given" : "Insert in sorted order"}
          </button>
          {offerBalance ? (
            <button type="button" className="btn btn-secondary btn-small" onClick={() => setBalance(!balance)}>
              {balance ? "Stop rebalancing" : "Rebalance after each insert"}
            </button>
          ) : null}
        </>
      }
    >
      <svg viewBox="0 0 440 290" role="img" aria-label={`A binary search tree of ${plural(order.length, "key")} with height ${height}, and the search path for ${target}`}>
        {edges.map((edge, i) => (
          <line key={i} x1={edge.from[0]} y1={edge.from[1]} x2={edge.to[0]} y2={edge.to[1]} className={edge.on ? "fig-accent-line" : "fig-axis"} />
        ))}
        {placed.map(({ key, at }) => {
          const on = path.includes(key);
          return (
            <g key={key}>
              <circle cx={at[0]} cy={at[1]} r="12" className={on ? "fig-accent" : "fig-fill"} />
              <text x={at[0]} y={at[1] + 4} textAnchor="middle" className="fig-small" style={{ fill: on ? "var(--bg)" : "var(--text)" }}>
                {key}
              </text>
            </g>
          );
        })}
      </svg>
    </Frame>
  );
}

type TrieNode = { prefix: string; end: boolean; children: TrieNode[] };

/** Builds a trie of the words, one node for each distinct beginning, with the children of each node in alphabetical order. */
function buildTrie(words: string[]): TrieNode {
  const root: TrieNode = { prefix: "", end: false, children: [] };
  for (const word of words) {
    let node = root;
    for (const letter of word) {
      let next = node.children.find((child) => child.prefix === node.prefix + letter);
      if (!next) {
        next = { prefix: node.prefix + letter, end: false, children: [] };
        node.children.push(next);
        node.children.sort((a, b) => (a.prefix < b.prefix ? -1 : 1));
      }
      node = next;
    }
    node.end = true;
  }
  return root;
}

const TRIE_WORDS = ["TO", "TEA", "TEN", "TENT", "IN", "INN", "INK"];
const quoted = (text: string) => `\u201c${text}\u201d`;

/** A trie built from a few words, with the path that typing a beginning follows and the words found below it. */
function Trie(props: Props) {
  const given =
    Array.isArray(props.words) && props.words.length > 0 && props.words.every((w) => typeof w === "string" && /^[A-Z]{1,5}$/.test(w)) ? (props.words as string[]).slice(0, 8) : TRIE_WORDS;
  const letters = [...new Set(given.join(""))].sort();
  const start = typeof props.prefix === "string" ? [...props.prefix.toUpperCase()].filter((c) => letters.includes(c)).join("").slice(0, 5) : "";
  const [count, setCount] = useState(clamp(Math.round(num(props.count, given.length)), 1, given.length));
  const [typed, setTyped] = useState(start);
  const words = given.slice(0, count);
  const root = buildTrie(words);
  const all: TrieNode[] = [];
  const walk = (node: TrieNode) => {
    all.push(node);
    node.children.forEach(walk);
  };
  walk(root);
  let reached: TrieNode | null = root;
  for (const letter of typed) reached = reached?.children.find((child) => child.prefix === reached!.prefix + letter) ?? null;
  const deepest = Math.max(...all.map((node) => node.prefix.length));
  const rise = Math.min(52, 200 / Math.max(deepest, 1));
  const place = new Map<string, Spot>();
  let leaf = 0;
  const leaves = all.filter((node) => node.children.length === 0).length;
  const gap = leaves > 1 ? 380 / (leaves - 1) : 0;
  const lay = (node: TrieNode): number => {
    let x: number;
    if (node.children.length === 0) {
      x = leaves > 1 ? 30 + leaf * gap : 220;
      leaf += 1;
    } else {
      const xs = node.children.map(lay);
      x = (xs[0] + xs[xs.length - 1]) / 2;
    }
    place.set(node.prefix, [x, 26 + node.prefix.length * rise]);
    return x;
  };
  lay(root);
  const onPath = (prefix: string) => typed !== "" && typed.startsWith(prefix);
  const found = reached ? all.filter((node) => node.end && node.prefix.startsWith(reached!.prefix)).map((node) => node.prefix) : [];
  const total = words.reduce((sum, word) => sum + word.length, 0);
  let matched = 0;
  while (matched < typed.length && all.some((node) => node.prefix === typed.slice(0, matched + 1))) matched += 1;
  const outcome =
    typed === ""
      ? "Nothing has been typed yet, so every word is below the root."
      : reached
        ? `Typing ${quoted(typed)} follows ${plural(typed.length, "link")} down from the root, one for each letter, and the words below the node it reaches are ${found.length > 0 ? found.join(", ") : "none"}.`
        : `Typing ${quoted(typed)} finds no link for the letter ${quoted(typed[matched])} after ${matched === 0 ? "the root" : quoted(typed.slice(0, matched))}, so no word begins with ${quoted(typed)}.`;
  return (
    <Frame
      title="A trie of words"
      summary={`The trie holds ${plural(words.length, "word")}: ${words.join(", ")}. It has ${plural(all.length, "node")}, counting the root, for ${plural(total, "letter")} in all, because words that begin the same way share the nodes for that beginning. A ringed node ends a word. ${outcome}`}
      controls={
        <>
          <Stepper label="words" value={count} onChange={setCount} min={1} max={given.length} />
          {letters.map((letter) => (
            <button key={letter} type="button" className="btn btn-secondary btn-small" aria-label={`Type ${letter}`} disabled={typed.length >= 5} onClick={() => setTyped(typed + letter)}>
              {letter}
            </button>
          ))}
          <button type="button" className="btn btn-secondary btn-small" disabled={typed === ""} onClick={() => setTyped(typed.slice(0, -1))}>
            Delete a letter
          </button>
        </>
      }
    >
      <svg viewBox="0 0 440 260" role="img" aria-label={`A trie of ${plural(words.length, "word")} with ${plural(all.length, "node")}, and the path for ${typed === "" ? "nothing typed" : quoted(typed)}`}>
        {all
          .filter((node) => node.prefix !== "")
          .map((node) => {
            const parent = place.get(node.prefix.slice(0, -1))!;
            return <Link key={"link" + node.prefix} from={parent} to={place.get(node.prefix)!} gap={13} hot={onPath(node.prefix)} />;
          })}
        {all.map((node) => {
          const at = place.get(node.prefix)!;
          const on = node.prefix === "" || onPath(node.prefix);
          return (
            <g key={"node" + node.prefix}>
              {node.end ? <circle cx={at[0]} cy={at[1]} r="15" className="fig-guide" fill="none" /> : null}
              <circle cx={at[0]} cy={at[1]} r="11" className={on ? "fig-accent" : "fig-fill"} />
              <text x={at[0]} y={at[1] + 4} textAnchor="middle" className="fig-small" style={{ fill: on ? "var(--bg)" : "var(--text)" }}>
                {node.prefix === "" ? "\u00b7" : node.prefix.slice(-1)}
              </text>
            </g>
          );
        })}
        <text x="12" y="250" className="fig-small">
          typed: {typed === "" ? "nothing yet" : typed}
        </text>
      </svg>
    </Frame>
  );
}

const STORE_SPOTS: Record<string, Spot> = { A: [36, 70], B: [126, 40], C: [84, 150], D: [196, 106], E: [146, 206], F: [204, 196] };
const STORE_NAMES = Object.keys(STORE_SPOTS);
const STORE_EDGES: [string, string][] = [
  ["A", "B"],
  ["A", "C"],
  ["B", "C"],
  ["B", "D"],
  ["C", "E"],
  ["D", "E"],
  ["D", "F"],
  ["E", "F"],
];

/** One small graph stored two ways, as a table of 0s and 1s and as a list of neighbours for each node, with one node's row and list picked out. */
function GraphStorage(props: Props) {
  const [directed, setDirected] = useState(props.directed === true);
  const [at, setAt] = useState(clamp(Math.round(num(props.node, 3)), 1, STORE_NAMES.length) - 1);
  const joined = (a: string, b: string) => STORE_EDGES.some(([p, q]) => (p === a && q === b) || (!directed && p === b && q === a));
  const table = STORE_NAMES.map((a) => STORE_NAMES.map((b) => (joined(a, b) ? 1 : 0)));
  const lists = STORE_NAMES.map((a) => STORE_NAMES.filter((b) => joined(a, b)));
  const name = STORE_NAMES[at];
  const mine = lists[at];
  const ones = table.flat().filter((v) => v === 1).length;
  const into = STORE_NAMES.filter((b) => joined(b, name));
  const entries = STORE_NAMES.length ** 2;
  return (
    <Frame
      title="A graph as a table and as lists"
      summary={`The graph has ${STORE_NAMES.length} nodes and ${STORE_EDGES.length} ${directed ? "arrows" : "edges"}. ${
        directed
          ? `${name} has arrows out to ${mine.length > 0 ? mine.join(", ") : "nowhere"} and arrows in from ${into.length > 0 ? into.join(", ") : "nowhere"}, so its out-degree is ${mine.length} and its in-degree is ${into.length}.`
          : `${name} has degree ${mine.length}: its neighbours are ${mine.join(", ")}.`
      } In the table, row ${name} has a 1 in ${plural(mine.length, "column")}${mine.length > 0 ? `, ${mine.join(", ")},` : ""} and a 0 in the other ${STORE_NAMES.length - mine.length}. In the lists, ${name}'s list holds ${plural(mine.length, "name")}. The whole table has ${entries} entries, of which ${ones} are 1${
        directed ? ", one for each arrow" : ", two for each edge, since each edge is recorded from both ends"
      }; the lists hold ${ones} names in all.`}
      controls={
        <>
          <Stepper label="node" value={at + 1} onChange={(v) => setAt(v - 1)} min={1} max={STORE_NAMES.length} />
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setDirected(!directed)}>
            {directed ? "Make the edges two-way" : "Make the edges one-way"}
          </button>
        </>
      }
    >
      <svg viewBox="0 0 440 290" role="img" aria-label={`A graph of ${STORE_NAMES.length} nodes beside its table of 0s and 1s, with node ${name}, its row and its list picked out`}>
        {STORE_EDGES.map(([a, b]) => (
          <Link key={a + b} from={STORE_SPOTS[a]} to={STORE_SPOTS[b]} arrow={directed} hot={a === name || (!directed && b === name)} />
        ))}
        {STORE_NAMES.map((n) => (
          <Dot key={n} at={STORE_SPOTS[n]} name={n} mark={n === name ? "now" : mine.includes(n) ? "done" : "wait"} />
        ))}
        {STORE_NAMES.map((n, j) => (
          <text key={"col" + n} x={258 + j * 28 + 12} y="30" textAnchor="middle" className="fig-small">
            {n}
          </text>
        ))}
        {table.map((row, i) => (
          <g key={"row" + i}>
            <text x="244" y={56 + i * 30} className="fig-small">
              {STORE_NAMES[i]}
            </text>
            <Cells values={row} x={258} y={38 + i * 30} w={28} h={26} hot={i === at ? row.map((v, j) => (v === 1 ? j : -1)).filter((j) => j >= 0) : []} faint={i === at ? [] : row.map((_, j) => j)} />
          </g>
        ))}
        {STORE_NAMES.map((n, i) => (
          <text key={"list" + n} x={12 + (i % 3) * 76} y={i < 3 ? 240 : 258} className="fig-small">
            {`${n}: ${lists[i].join(" ") || "nothing"}`}
          </text>
        ))}
        <text x="12" y="282" className="fig-mono">
          {`${name}: [${mine.join(", ")}]`}
        </text>
      </svg>
    </Frame>
  );
}

const UNION_JOINS: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [4, 5],
  [5, 6],
  [3, 6],
  [6, 7],
];

/** Eight items joined into sets one pair at a time, each set a tree of pointers to a root, with or without joining the smaller tree under the larger, and the path a find follows. */
function UnionFind(props: Props) {
  const [joins, setJoins] = useState(clamp(Math.round(num(props.joins, UNION_JOINS.length)), 0, UNION_JOINS.length));
  const [bySize, setBySize] = useState(props.bySize === true);
  const [target, setTarget] = useState(clamp(Math.round(num(props.find, 0)), 0, 7));
  const parent = Array.from({ length: 8 }, (_, i) => i);
  const size = Array(8).fill(1) as number[];
  const root = (x: number) => {
    while (parent[x] !== x) x = parent[x];
    return x;
  };
  for (const [a, b] of UNION_JOINS.slice(0, joins)) {
    let [ra, rb] = [root(a), root(b)];
    if (ra === rb) continue;
    if (bySize && size[ra] > size[rb]) [ra, rb] = [rb, ra];
    parent[ra] = rb;
    size[rb] += size[ra];
  }
  const depth = (x: number) => {
    let d = 0;
    while (parent[x] !== x) {
      x = parent[x];
      d += 1;
    }
    return d;
  };
  const path = [target];
  while (parent[path[path.length - 1]] !== path[path.length - 1]) path.push(parent[path[path.length - 1]]);
  const roots = parent.map((p, i) => (p === i ? i : -1)).filter((i) => i >= 0);
  const kids = (x: number) => parent.map((p, i) => (p === x && i !== x ? i : -1)).filter((i) => i >= 0);
  const members = (r: number) => parent.map((_, i) => i).filter((i) => root(i) === r);
  const tallest = Math.max(...parent.map((_, i) => depth(i)));
  const rise = Math.min(44, 176 / Math.max(tallest, 1));
  const spots = new Map<number, Spot>();
  let column = 0;
  const lay = (x: number, d: number): number => {
    const below = kids(x);
    let at: number;
    if (below.length === 0) {
      at = 30 + column * 54;
      column += 1;
    } else {
      const xs = below.map((k) => lay(k, d + 1));
      at = (xs[0] + xs[xs.length - 1]) / 2;
    }
    spots.set(x, [at, 26 + d * rise]);
    return at;
  };
  roots.forEach((r) => lay(r, 0));
  const shift = (440 - (60 + (column - 1) * 54)) / 2;
  for (const [item, at] of spots) spots.set(item, [at[0] + shift, at[1]]);
  const shown = UNION_JOINS.slice(0, joins).map(([a, b]) => `(${a}, ${b})`);
  return (
    <Frame
      title="Sets as trees of pointers"
      summary={`${joins === 0 ? "No joins yet, so each of the 8 items is a set on its own." : `After ${plural(joins, "join")}, ${shown.join(", ")}, ${bySize ? "each pointing the root of the smaller tree at the root of the larger" : "each pointing the root of the first item's tree at the root of the second's"}, the 8 items form ${plural(roots.length, "set")}: ${roots.map((r) => `{${members(r).join(", ")}}`).join(", ")}.`} Each set is a tree whose root names it, and the list underneath holds parent[i], the item that i points to; a root points to itself. The tallest tree has height ${tallest}. find(${target}) follows ${plural(path.length - 1, "link")} from ${target}${path.length > 1 ? `, through ${path.slice(1).join(", ")}` : ""}, and reaches the root ${path[path.length - 1]}.`}
      controls={
        <>
          <Stepper label="joins" value={joins} onChange={setJoins} min={0} max={UNION_JOINS.length} />
          <Stepper label="find" value={target} onChange={setTarget} min={0} max={7} />
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setBySize(!bySize)}>
            {bySize ? "Join without looking at size" : "Join the smaller under the larger"}
          </button>
        </>
      }
    >
      <svg viewBox="0 0 440 300" role="img" aria-label={`8 items in ${plural(roots.length, "set")}, drawn as trees of height at most ${tallest}, with the path of find(${target}) marked`}>
        {parent.map((p, i) =>
          p === i ? null : <Link key={"up" + i} from={spots.get(i)!} to={spots.get(p)!} arrow gap={14} hot={path.includes(i) && path.includes(p)} />,
        )}
        {parent.map((_, i) => {
          const at = spots.get(i)!;
          const on = path.includes(i);
          return (
            <g key={"item" + i}>
              <circle cx={at[0]} cy={at[1]} r="12" className={on ? "fig-accent" : parent[i] === i ? "fig-fill" : "fig-ghost"} />
              <text x={at[0]} y={at[1] + 4} textAnchor="middle" className="fig-small" style={{ fill: on ? "var(--bg)" : "var(--text)" }}>
                {i}
              </text>
            </g>
          );
        })}
        <text x="12" y="234" className="fig-small">
          parent:
        </text>
        <Cells values={parent} x={12} y={242} w={52} h={28} hot={path.length > 1 ? path.slice(0, -1) : []} under={(i) => String(i)} />
      </svg>
    </Frame>
  );
}

const MEAL_STAGES = [
  { name: "main", options: ["Rajma", "Kadhi", "Paneer"] },
  { name: "drink", options: ["Lassi", "Chaas", "Nimbu pani"] },
  { name: "sweet", options: ["Halwa", "Jalebi", "Barfi"] },
];

/** A meal chosen in three stages, drawn as a tree with one leaf for each meal, so that the leaves number the product of the choices at each stage. */
function ChoiceTree(props: Props) {
  const [counts, setCounts] = useState([clamp(Math.round(num(props.mains, 3)), 1, 3), clamp(Math.round(num(props.drinks, 2)), 1, 3), clamp(Math.round(num(props.sweets, 2)), 1, 3)]);
  const total = counts[0] * counts[1] * counts[2];
  const [pick, setPick] = useState(clamp(Math.round(num(props.pick, 1)), 1, total));
  const chosen = Math.min(pick, total);
  const digits = [Math.floor((chosen - 1) / (counts[1] * counts[2])), Math.floor((chosen - 1) / counts[2]) % counts[1], (chosen - 1) % counts[2]];
  const setStage = (stage: number, value: number) => {
    const next = counts.map((c, i) => (i === stage ? value : c));
    setCounts(next);
    setPick(Math.min(chosen, next[0] * next[1] * next[2]));
  };
  const gap = total > 1 ? 400 / (total - 1) : 0;
  const leafX = (leaf: number) => (total > 1 ? 20 + leaf * gap : 220);
  const levelY = [26, 90, 156, 222];
  type Placed = { x: number; y: number; label: string; path: number[] };
  const nodes: Placed[] = [];
  const edges: { from: Spot; to: Spot; on: boolean }[] = [];
  const build = (path: number[], first: number, width: number): Spot => {
    const depth = path.length;
    const x = (leafX(first) + leafX(first + width - 1)) / 2;
    const at: Spot = [x, levelY[depth]];
    nodes.push({ x, y: at[1], label: depth === 0 ? "" : MEAL_STAGES[depth - 1].options[path[depth - 1]], path });
    if (depth < 3) {
      const share = width / counts[depth];
      for (let k = 0; k < counts[depth]; k++) {
        const child = build([...path, k], first + k * share, share);
        edges.push({ from: at, to: child, on: [...path, k].every((v, i) => v === digits[i]) });
      }
    }
    return at;
  };
  build([], 0, total);
  const small = total > 12;
  const meal = digits.map((d, i) => MEAL_STAGES[i].options[d]);
  return (
    <Frame
      title="Counting choices with a tree"
      summary={`A meal is one main, then one drink, then one sweet. There ${counts[0] === 1 ? "is 1 main" : `are ${counts[0]} mains`}, each can be followed by ${plural(counts[1], "drink")}, and each of those by ${plural(counts[2], "sweet")}, so the tree branches ${counts[0]} ways, then ${counts[1]}, then ${counts[2]}, and has ${counts[0]} × ${counts[1]} × ${counts[2]} = ${total} ${total === 1 ? "leaf" : "leaves"}, one for each meal. Meal ${chosen} is ${meal.join(", ")}.`}
      controls={
        <>
          {MEAL_STAGES.map((stage, i) => (
            <Stepper key={stage.name} label={`${stage.name}s`} value={counts[i]} onChange={(v) => setStage(i, v)} min={1} max={3} />
          ))}
          <Stepper label="meal" value={chosen} onChange={setPick} min={1} max={total} />
        </>
      }
    >
      <svg viewBox="0 0 440 250" role="img" aria-label={`A tree of choices with ${total} ${total === 1 ? "leaf" : "leaves"}, with the path to meal ${chosen} marked`}>
        {edges.map((edge, i) => (
          <line key={i} x1={edge.from[0]} y1={edge.from[1]} x2={edge.to[0]} y2={edge.to[1]} className={edge.on ? "fig-accent-line" : "fig-axis"} />
        ))}
        {nodes.map((node) => {
          const on = node.path.every((v, i) => v === digits[i]);
          const leaf = node.path.length === 3;
          const r = leaf && small ? 5 : 11;
          return (
            <g key={"n" + node.path.join("-")}>
              <circle cx={node.x} cy={node.y} r={r} className={on ? "fig-accent" : "fig-fill"} />
              {leaf && small ? null : (
                <text x={node.x} y={node.y + 4} textAnchor="middle" className="fig-small" style={{ fill: on ? "var(--bg)" : "var(--text)" }}>
                  {node.label.slice(0, 1)}
                </text>
              )}
            </g>
          );
        })}
        <text x="12" y="246" className="fig-small">
          {`${counts[0]} × ${counts[1]} × ${counts[2]} = ${total}`}
        </text>
      </svg>
    </Frame>
  );
}

/** Pascal's triangle up to row n, with one entry and the two above it that add to it picked out, and the row's total. */
function PascalTriangle(props: Props) {
  const [rows, setRows] = useState(clamp(Math.round(num(props.n, 5)), 1, 10));
  const [k, setK] = useState(clamp(Math.round(num(props.k, 2)), 0, rows));
  const at = Math.min(k, rows);
  const triangle: number[][] = [[1]];
  for (let n = 1; n <= rows; n++) triangle.push(Array.from({ length: n + 1 }, (_, j) => (j === 0 || j === n ? 1 : triangle[n - 1][j - 1] + triangle[n - 1][j])));
  const step = 38;
  const spot = (n: number, j: number): Spot => [220 + (j - n / 2) * step, 22 + n * 24];
  const value = triangle[rows][at];
  const left = at > 0 ? triangle[rows - 1][at - 1] : 0;
  const right = at < rows ? triangle[rows - 1][at] : 0;
  const parents = [at > 0 ? at - 1 : -1, at < rows ? at : -1].filter((j) => j >= 0);
  const total = 2 ** rows;
  const reason =
    at === 0 || at === rows
      ? `It is at the edge of the row, where there is only one way: choose ${at === 0 ? "none" : "all"} of the ${rows}.`
      : `It is the sum of the two entries above it, ${left} + ${right}: the choices of ${at} that include one particular item, C(${rows - 1}, ${at - 1}) = ${left}, and those that leave it out, C(${rows - 1}, ${at}) = ${right}.`;
  return (
    <Frame
      title="Pascal's triangle"
      summary={`Row ${rows} lists the number of ways to choose k items from ${rows}, for k from 0 to ${rows}: ${triangle[rows].join(", ")}. The picked entry is C(${rows}, ${at}) = ${value}. ${reason} The row adds up to ${total} = 2^${rows}, the number of subsets of ${plural(rows, "item")}.`}
      controls={
        <>
          <Stepper
            label="row n"
            value={rows}
            onChange={(v) => {
              setRows(v);
              setK(Math.min(at, v));
            }}
            min={1}
            max={10}
          />
          <Stepper label="k" value={at} onChange={setK} min={0} max={rows} />
        </>
      }
    >
      <svg viewBox="0 0 440 290" role="img" aria-label={`Pascal's triangle to row ${rows}, with C(${rows}, ${at}) = ${value} and the entries above it picked out`}>
        {triangle.map((row, n) =>
          row.map((entry, j) => {
            const [x, y] = spot(n, j);
            const on = n === rows && j === at;
            const feeds = n === rows - 1 && parents.includes(j);
            return (
              <g key={`${n}-${j}`}>
                {on || feeds ? <rect x={x - 17} y={y - 13} width="34" height="20" className={on ? "fig-accent" : "fig-fill"} /> : null}
                <text x={x} y={y + 2} textAnchor="middle" className="fig-small" style={{ fill: on ? "var(--bg)" : n === rows || feeds ? "var(--text)" : "var(--text-secondary)" }}>
                  {entry}
                </text>
              </g>
            );
          }),
        )}
        <text x="12" y="282" className="fig-small">
          {`row ${rows} adds up to ${total}`}
        </text>
      </svg>
    </Frame>
  );
}

/** Items dropped into boxes, either spread as evenly as possible or scattered, with the fullest box never holding fewer than the items divided by the boxes, rounded up. */
function Pigeonholes(props: Props) {
  const [items, setItems] = useState(clamp(Math.round(num(props.items, 13)), 1, 24));
  const [boxes, setBoxes] = useState(clamp(Math.round(num(props.boxes, 12)), 1, 12));
  const [scatter, setScatter] = useState(0);
  const mix = (i: number) => Math.floor((((scatter * 7919 + i * 104729 + 13) * 2654435761) % 4294967296) / 65536);
  const place = Array.from({ length: items }, (_, i) => (scatter === 0 ? i % boxes : mix(i) % boxes));
  const counts = Array.from({ length: boxes }, (_, b) => place.filter((p) => p === b).length);
  const most = Math.max(...counts);
  const bound = Math.ceil(items / boxes);
  const width = 420 / boxes;
  return (
    <Frame
      title="The pigeonhole principle"
      summary={`${plural(items, "item")} in ${plural(boxes, "box", "boxes")}, ${scatter === 0 ? "spread as evenly as possible" : "dropped at random"}. The counts are ${counts.join(", ")}, so the fullest box holds ${most}. However the items are placed, some box holds at least ${items} ÷ ${boxes} rounded up, which is ${bound}${
        bound >= 2 ? ", so at least two items always share a box" : ", so it is possible for no two items to share a box"
      }.`}
      controls={
        <>
          <Stepper label="items" value={items} onChange={setItems} min={1} max={24} />
          <Stepper label="boxes" value={boxes} onChange={setBoxes} min={1} max={12} />
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setScatter(scatter + 1)}>
            Drop them at random
          </button>
          <button type="button" className="btn btn-secondary btn-small" disabled={scatter === 0} onClick={() => setScatter(0)}>
            Spread them evenly
          </button>
        </>
      }
    >
      <svg viewBox="0 0 440 250" role="img" aria-label={`${plural(items, "item")} in ${plural(boxes, "box", "boxes")}, the fullest holding ${most}`}>
        {counts.map((count, b) => {
          const x = 10 + b * width;
          return (
            <g key={b}>
              <rect x={x + 2} y={30} width={width - 4} height={190} className={count === most ? "fig-ghost" : "fig-fill"} fill="none" />
              {Array.from({ length: count }, (_, j) => (
                <circle key={j} cx={x + width / 2} cy={208 - j * Math.min(20, 180 / Math.max(most, 1))} r={Math.min(8, width / 2 - 4)} className={count === most ? "fig-accent" : "fig-fill"} />
              ))}
              <text x={x + width / 2} y={240} textAnchor="middle" className="fig-small">
                {count}
              </text>
            </g>
          );
        })}
        <text x="12" y="20" className="fig-small">
          {`fullest box: ${most}; at least ${bound} guaranteed`}
        </text>
      </svg>
    </Frame>
  );
}

const OVERLAP_SPOTS: Record<string, Spot> = { A: [118, 92], B: [322, 92], C: [220, 252], AB: [220, 70], AC: [158, 186], BC: [282, 186], ABC: [220, 146] };
const OVERLAP_STAGES = ["add the three sets", "subtract the three overlaps of two", "add back the overlap of all three"];

/** The multiples of 2, 3 and 5 up to n as three overlapping sets, with the number of times inclusion and exclusion has counted each region after one, two or three of its steps. */
function InclusionExclusion(props: Props) {
  const [top, setTop] = useState(clamp(Math.round(num(props.n, 30) / 10) * 10, 10, 100));
  const [stage, setStage] = useState(clamp(Math.round(num(props.stage, 1)), 1, 3));
  const divisors: Record<string, number> = { A: 2, B: 3, C: 5 };
  const region = (name: string) => {
    let count = 0;
    for (let x = 1; x <= top; x++) {
      const inside = (["A", "B", "C"] as const).filter((set) => x % divisors[set] === 0).join("");
      if (inside === name) count += 1;
    }
    return count;
  };
  const sizes = Object.fromEntries(Object.keys(OVERLAP_SPOTS).map((name) => [name, region(name)]));
  const choose = (m: number, j: number) => (j === 1 ? m : j === 2 ? (m * (m - 1)) / 2 : m === 3 ? 1 : 0);
  const times = (name: string) => [1, 2, 3].slice(0, stage).reduce((sum, j) => sum + (j % 2 === 1 ? 1 : -1) * choose(name.length, j), 0);
  const single = (d: number) => Math.floor(top / d);
  const singles = single(2) + single(3) + single(5);
  const pairs = single(6) + single(10) + single(15);
  const triple = single(30);
  const running = [singles, singles - pairs, singles - pairs + triple][stage - 1];
  const truth = Object.values(sizes).reduce((a, b) => a + b, 0);
  const steps = [
    `Adding the sizes of the three sets, ${single(2)} + ${single(3)} + ${single(5)}, gives ${singles}`,
    `Subtracting the numbers in each pair of sets, ${single(6)} + ${single(10)} + ${single(15)} multiples of 6, 10 and 15, leaves ${singles - pairs}`,
    `Adding back the ${plural(triple, "number")} in all three, the multiples of 30, gives ${singles - pairs + triple}`,
  ];
  const wrong = Object.keys(OVERLAP_SPOTS).filter((name) => times(name) !== 1);
  return (
    <Frame
      title="Inclusion and exclusion"
      summary={`Among 1 to ${top}, A is the multiples of 2, B of 3 and C of 5. ${steps.slice(0, stage).join(". ")}. ${
        wrong.length === 0
          ? `Every region is now counted exactly once, so ${running} is right: ${running} of the numbers are multiples of 2, 3 or 5.`
          : `So far ${wrong.map((name) => `the region in ${name.split("").join(" and ")} is counted ${times(name)} ${times(name) === 1 ? "time" : "times"}`).join(", ")}, where it should be once, so ${running} is ${running > truth ? "too many" : "too few"}; the true count is ${truth}.`
      }`}
      controls={
        <>
          <Stepper label="numbers up to" value={top} onChange={(v) => setTop(v)} min={10} max={100} />
          <Stepper label="step" value={stage} onChange={setStage} min={1} max={3} />
        </>
      }
    >
      <svg viewBox="0 0 440 290" role="img" aria-label={`Three overlapping sets after the step: ${OVERLAP_STAGES[stage - 1]}`}>
        <circle cx="170" cy="112" r="92" className="fig-ghost" fill="none" />
        <circle cx="270" cy="112" r="92" className="fig-ghost" fill="none" />
        <circle cx="220" cy="196" r="92" className="fig-ghost" fill="none" />
        <text x="62" y="26" className="fig-small">
          A: ×2
        </text>
        <text x="346" y="26" className="fig-small">
          B: ×3
        </text>
        <text x="318" y="282" className="fig-small">
          C: ×5
        </text>
        {Object.entries(OVERLAP_SPOTS).map(([name, at]) => {
          const t = times(name);
          return (
            <g key={name}>
              <rect x={at[0] - 22} y={at[1] - 14} width="44" height="34" className={t === 1 ? "fig-fill" : "fig-accent"} />
              <text x={at[0]} y={at[1]} textAnchor="middle" className="fig-small" style={{ fill: t === 1 ? "var(--text)" : "var(--bg)" }}>
                {sizes[name]}
              </text>
              <text x={at[0]} y={at[1] + 14} textAnchor="middle" className="fig-small" style={{ fill: t === 1 ? "var(--text)" : "var(--bg)" }}>
                {`×${t}`}
              </text>
            </g>
          );
        })}
        <text x="12" y="282" className="fig-small">
          {`running total ${running}, true ${truth}`}
        </text>
      </svg>
    </Frame>
  );
}

/** The greatest common divisor of two whole numbers, with gcd(m, 0) = m. */
const commonDivisor = (a: number, b: number): number => {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x;
};

/** A clock with m positions: jumps of a fixed size from 0 wrap round, and reach only the multiples of gcd(m, jump). */
function ModClock(props: Props) {
  const [m, setM] = useState(clamp(Math.round(num(props.m, 12)), 2, 24));
  const [jump, setJump] = useState(clamp(Math.round(num(props.step, 5)), 0, 24));
  const [jumps, setJumps] = useState(clamp(Math.round(num(props.jumps, 3)), 0, 24));
  const g = commonDivisor(m, jump % m);
  const orbit = m / g;
  const at = (k: number) => (k * jump) % m;
  const where = at(jumps);
  const reached = Array.from({ length: orbit }, (_, k) => (k * g) % m);
  const spot = (k: number, r: number): Spot => [220 + r * Math.sin((2 * Math.PI * k) / m), 146 - r * Math.cos((2 * Math.PI * k) / m)];
  const path = Array.from({ length: jumps }, (_, k) => [at(k), at(k + 1)]);
  const reach =
    orbit === m
      ? `reach all ${m} positions before coming back to 0`
      : `reach only ${plural(orbit, "position")}, ${reached.join(", ")}, the multiples of ${g}, because ${g} is the largest number dividing both ${m} and ${jump}`;
  return (
    <Frame
      title="Arithmetic on a clock"
      summary={`A clock with ${m} positions, 0 to ${m - 1}. Start at 0 and jump ${jump} each time. After ${plural(jumps, "jump")} you are at ${jumps} × ${jump} = ${jumps * jump}, which leaves the remainder ${where} on division by ${m}. Jumps of ${jump} ${reach}.`}
      controls={
        <>
          <Stepper label="positions" value={m} onChange={setM} min={2} max={24} />
          <Stepper label="jump size" value={jump} onChange={setJump} min={0} max={24} />
          <Stepper label="jumps" value={jumps} onChange={setJumps} min={0} max={24} />
        </>
      }
    >
      <svg viewBox="0 0 440 290" role="img" aria-label={`A clock of ${m} positions; ${plural(jumps, "jump")} of ${jump} from 0 end at ${where}`}>
        <circle cx="220" cy="146" r="104" className="fig-ghost" fill="none" />
        {path.map(([from, to], k) => {
          const [x1, y1] = spot(from, 104);
          const [x2, y2] = spot(to, 104);
          return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} className="fig-accent-line" />;
        })}
        {Array.from({ length: m }, (_, k) => {
          const [x, y] = spot(k, 104);
          const [tx, ty] = spot(k, 126);
          const visited = reached.includes(k);
          return (
            <g key={k}>
              <circle cx={x} cy={y} r={k === where ? 9 : 6} className={k === where ? "fig-accent" : visited ? "fig-fill" : "fig-ghost"} />
              <text x={tx} y={ty + 5} textAnchor="middle" className="fig-small">
                {k}
              </text>
            </g>
          );
        })}
        <text x="12" y="22" className="fig-small">
          {`${jumps} × ${jump} = ${jumps * jump} ≡ ${where} (mod ${m})`}
        </text>
        <text x="12" y="282" className="fig-small">
          {`jumps of ${jump} reach ${orbit} of ${m}`}
        </text>
      </svg>
    </Frame>
  );
}

type Tile = { x: number; y: number; side: number; step: number };

/** Euclid's algorithm as cutting the largest squares off a rectangle: each division cuts squares, and the last squares to be cut tile the whole rectangle. */
function EuclidSquares(props: Props) {
  const [a, setA] = useState(clamp(Math.round(num(props.a, 21)), 1, 1200));
  const [b, setB] = useState(clamp(Math.round(num(props.b, 15)), 1, 1200));
  const [step, setStep] = useState(clamp(Math.round(num(props.step, 1)), 0, 30));
  const tiles: Tile[] = [];
  const divisions: { big: number; small: number; q: number; r: number }[] = [];
  let x = 0;
  let y = 0;
  let w = a;
  let h = b;
  while (w > 0 && h > 0) {
    const small = Math.min(w, h);
    const big = Math.max(w, h);
    const q = Math.floor(big / small);
    for (let i = 0; i < q; i++) tiles.push(w >= h ? { x: x + i * small, y, side: small, step: divisions.length } : { x, y: y + i * small, side: small, step: divisions.length });
    if (w >= h) {
      x += q * small;
      w -= q * small;
    } else {
      y += q * small;
      h -= q * small;
    }
    divisions.push({ big, small, q, r: big % small });
  }
  const shown = Math.min(step, divisions.length);
  const g = divisions[divisions.length - 1].small;
  const scale = Math.min(410 / a, 220 / b);
  const left = (440 - a * scale) / 2;
  const top = 34 + (220 - b * scale) / 2;
  const current = shown > 0 ? divisions[shown - 1] : null;
  const done = shown === divisions.length;
  const said = current
    ? `Step ${shown}: ${current.big} = ${current.q} × ${current.small} + ${current.r}, so ${plural(current.q, "square")} of side ${current.small} ${current.q === 1 ? "is" : "are"} cut off${current.r === 0 ? " and nothing is left over" : `, leaving a ${current.r} by ${current.small} rectangle`}.`
    : "No squares have been cut yet.";
  const ending = done
    ? ` The last squares have side ${g}, and squares of side ${g} tile the whole rectangle, so ${g} is the greatest common divisor of ${a} and ${b}.`
    : " Every common divisor of the two sides also divides the sides of what is left, so the greatest common divisor has not changed.";
  return (
    <Frame
      title="Euclid's algorithm as cutting squares"
      summary={`A rectangle ${a} wide and ${b} high. ${said}${ending}`}
      controls={
        <>
          <Stepper label="width" value={a} onChange={setA} min={1} max={1200} />
          <Stepper label="height" value={b} onChange={setB} min={1} max={1200} />
          <Stepper label="step" value={shown} onChange={setStep} min={0} max={divisions.length} />
        </>
      }
    >
      <svg viewBox="0 0 440 290" role="img" aria-label={`A ${a} by ${b} rectangle after ${plural(shown, "step")} of Euclid's algorithm`}>
        <rect x={left} y={top} width={a * scale} height={b * scale} className="fig-ghost" fill="none" />
        {tiles
          .filter((tile) => tile.step < shown)
          .map((tile, k) => (
            <g key={k}>
              <rect x={left + tile.x * scale} y={top + tile.y * scale} width={tile.side * scale} height={tile.side * scale} className={tile.step === shown - 1 ? "fig-accent" : "fig-fill"} stroke="var(--bg)" strokeWidth="1" />
              {tile.side * scale >= 28 ? (
                <text x={left + (tile.x + tile.side / 2) * scale} y={top + (tile.y + tile.side / 2) * scale + 5} textAnchor="middle" className="fig-small" style={{ fill: tile.step === shown - 1 ? "var(--bg)" : "var(--text)" }}>
                  {tile.side}
                </text>
              ) : null}
            </g>
          ))}
        <text x="12" y="22" className="fig-small">
          {current ? `${current.big} = ${current.q} × ${current.small} + ${current.r}` : `${a} by ${b}`}
        </text>
        <text x="12" y="282" className="fig-small">
          {done ? `gcd(${a}, ${b}) = ${g}` : `step ${shown} of ${divisions.length}`}
        </text>
      </svg>
    </Frame>
  );
}

const PEG_NAMES = ["left", "middle", "right"];

/** The moves that carry n discs from one peg to another: n - 1 out of the way, the largest across, n - 1 back on top. */
const towerMoves = (n: number, from: number, to: number, spare: number, out: [number, number, number][]) => {
  if (n === 0) return;
  towerMoves(n - 1, from, spare, to, out);
  out.push([n, from, to]);
  towerMoves(n - 1, spare, to, from, out);
};

/** The tower of discs: moving n discs takes twice the moves for n - 1, plus one for the largest disc. */
function Tower(props: Props) {
  const [discs, setDiscs] = useState(clamp(Math.round(num(props.discs, 3)), 1, 6));
  const [move, setMove] = useState(clamp(Math.round(num(props.move, 0)), 0, 63));
  const moves: [number, number, number][] = [];
  towerMoves(discs, 0, 2, 1, moves);
  const total = moves.length;
  const shown = Math.min(move, total);
  const pegs: number[][] = [Array.from({ length: discs }, (_, i) => discs - i), [], []];
  for (const [disc, from, to] of moves.slice(0, shown)) {
    pegs[from] = pegs[from].slice(0, -1);
    pegs[to] = [...pegs[to], disc];
  }
  const last = shown > 0 ? moves[shown - 1] : null;
  const middle = 2 ** (discs - 1);
  const said = last ? `Move ${shown}: disc ${last[0]} goes from the ${PEG_NAMES[last[1]]} needle to the ${PEG_NAMES[last[2]]} needle.` : "No moves yet: every disc is on the left needle, largest at the bottom.";
  const largest =
    discs === 1
      ? ""
      : ` The largest disc moves once, at move ${middle}, and just before that the other ${discs - 1} discs sit on the middle needle, which took ${middle - 1} moves; moving them back on top takes ${middle - 1} more.`;
  return (
    <Frame
      title="Moving a tower of discs"
      summary={`${plural(discs, "disc")}, moved one at a time and never onto a smaller disc. The fewest moves is 2 to the power ${discs}, minus 1, which is ${total}. ${said}${shown === total ? " The whole tower is now on the right needle." : ""}${largest}`}
      controls={
        <>
          <Stepper label="discs" value={discs} onChange={setDiscs} min={1} max={6} />
          <Stepper label="move" value={shown} onChange={setMove} min={0} max={total} />
        </>
      }
    >
      <svg viewBox="0 0 440 270" role="img" aria-label={`${plural(discs, "disc")} on three needles after ${shown} of ${total} moves`}>
        <line x1="10" y1="236" x2="430" y2="236" className="fig-axis" />
        {[0, 1, 2].map((peg) => {
          const x = 76 + peg * 144;
          return (
            <g key={peg}>
              <line x1={x} y1="236" x2={x} y2="96" className="fig-axis" />
              {pegs[peg].map((disc, level) => {
                const width = 26 + disc * 19;
                const moved = last !== null && last[0] === disc;
                return (
                  <g key={disc}>
                    <rect x={x - width / 2} y={216 - level * 20} width={width} height="18" rx="4" className={moved ? "fig-accent" : "fig-fill"} />
                    <text x={x} y={229 - level * 20} textAnchor="middle" className="fig-small" style={{ fill: moved ? "var(--bg)" : "var(--text)" }}>
                      {disc}
                    </text>
                  </g>
                );
              })}
              <text x={x} y="258" textAnchor="middle" className="fig-small">
                {PEG_NAMES[peg]}
              </text>
            </g>
          );
        })}
        <text x="12" y="24" className="fig-small">
          {`move ${shown} of ${total}`}
        </text>
      </svg>
    </Frame>
  );
}

const BOUND_PAIRS: Record<string, { f: (n: number) => number; g: (n: number) => number; fName: string; gName: string; verdict: string }> = {
  linear: {
    f: (n) => 3 * n + 20,
    g: (n) => n,
    fName: "3n + 20",
    gName: "n",
    verdict: "In fact 3n + 20 ≤ 4n for every n from 20 on, so c = 4 and n₀ = 20 prove that 3n + 20 is O(n).",
  },
  log: {
    f: (n) => 8 * Math.log2(n),
    g: (n) => n,
    fName: "8 log₂ n",
    gName: "n",
    verdict: "In fact 8 log₂ n ≤ n for every n from 44 on, so c = 1 and n₀ = 44 prove that 8 log₂ n is O(n).",
  },
  square: {
    f: (n) => (n * n) / 10,
    g: (n) => n,
    fName: "n²/10",
    gName: "n",
    verdict: "No c works for ever: n²/10 ≤ c·n only while n ≤ 10c, so n²/10 is not O(n).",
  },
  exponential: {
    f: (n) => 2 ** n,
    g: (n) => n ** 3,
    fName: "2ⁿ",
    gName: "n³",
    verdict: "No c works for ever: 2ⁿ eventually outgrows every multiple of n³, so 2ⁿ is not O(n³).",
  },
};
const BOUND_ORDER = ["linear", "log", "square", "exponential"];

/** Testing a proposed big-O bound: f(n) ≤ c·g(n) for every n from n₀ on, with the places it fails marked. */
function BoundWitness(props: Props) {
  const [which, setWhich] = useState(typeof props.pair === "string" && props.pair in BOUND_PAIRS ? props.pair : "linear");
  const [c, setC] = useState(clamp(Math.round(num(props.c, 1)), 1, 20));
  const [start, setStart] = useState(clamp(Math.round(num(props.start, 1)), 1, 100));
  const { f, g, fName, gName, verdict } = BOUND_PAIRS[which];
  const ns = Array.from({ length: 100 }, (_, i) => i + 1);
  const bad = ns.filter((n) => n >= start && f(n) > c * g(n));
  const fTop = Math.max(...ns.map(f));
  const top = 1.15 * Math.max(c * g(100), Math.min(fTop, 2 * c * g(100)));
  const gx = (n: number) => 40 + ((n - 1) / 99) * 384;
  const gy = (v: number) => 250 - (Math.min(v, top) / top) * 224;
  const line = (h: (n: number) => number) => ns.map((n) => `${gx(n).toFixed(1)},${gy(h(n)).toFixed(1)}`).join(" ");
  const next = BOUND_ORDER[(BOUND_ORDER.indexOf(which) + 1) % BOUND_ORDER.length];
  return (
    <Frame
      title="Testing a big-O bound"
      summary={`f(n) = ${fName} against ${c} × g(n), where g(n) = ${gName}, for n from ${start} to 100. ${
        bad.length === 0 ? `The bound f(n) ≤ ${c} × ${gName} holds at every one of these n` : `The bound f(n) ≤ ${c} × ${gName} fails at ${plural(bad.length, "of these n", "of these n")}, first at n = ${bad[0]}`
      }. ${verdict}`}
      controls={
        <>
          <Stepper label="c" value={c} onChange={setC} min={1} max={20} />
          <Slider label="from n" value={start} onChange={setStart} min={1} max={100} />
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={() => {
              setWhich(next);
              setC(1);
              setStart(1);
            }}
          >
            {`Try ${BOUND_PAIRS[next].fName} against ${BOUND_PAIRS[next].gName}`}
          </button>
        </>
      }
    >
      <svg viewBox="0 0 440 280" role="img" aria-label={`${fName} and ${c} times ${gName} for n from 1 to 100, with the bound failing at ${plural(bad.length, "point")} from n = ${start}`}>
        <rect x="40" y="26" width={Math.max(0, gx(start) - 40)} height="224" className="fig-ghost" opacity="0.35" />
        <line x1="40" y1="250" x2="428" y2="250" className="fig-axis" />
        <line x1="40" y1="250" x2="40" y2="22" className="fig-axis" />
        <line x1={gx(start)} y1="250" x2={gx(start)} y2="26" className="fig-guide" />
        <polyline points={line((n) => c * g(n))} className="fig-line" fill="none" />
        <polyline points={line(f)} className="fig-accent-line" fill="none" />
        {bad.map((n) => (
          <circle key={n} cx={gx(n)} cy={gy(f(n))} r="2.5" className="fig-accent" />
        ))}
        <text x="46" y="18" className="fig-small">
          {`f(n) = ${fName}, thick; ${c} × ${gName}, thin`}
        </text>
        <text x={Math.min(gx(start) + 4, 372)} y="40" className="fig-small">
          {`n₀ = ${start}`}
        </text>
        <text x="428" y="272" textAnchor="end" className="fig-small">
          n = 100
        </text>
        <text x="40" y="272" className="fig-small">
          n = 1
        </text>
      </svg>
    </Frame>
  );
}

const pentagon = (k: number): Spot => [220 + 100 * Math.sin((2 * Math.PI * k) / 5), 142 - 100 * Math.cos((2 * Math.PI * k) / 5)];
const STROKE_SHAPES: Record<string, { name: string; spots: Record<string, Spot>; edges: string[]; trail: string[] }> = {
  house: {
    name: "A house with crossed walls",
    spots: { A: [150, 232], B: [290, 232], C: [290, 126], D: [150, 126], E: [220, 44] },
    edges: ["AB", "BC", "CD", "DA", "AC", "BD", "DE", "CE"],
    trail: ["A", "B", "C", "D", "A", "C", "E", "D", "B"],
  },
  square: {
    name: "A square with both diagonals",
    spots: { A: [150, 226], B: [290, 226], C: [290, 86], D: [150, 86] },
    edges: ["AB", "BC", "CD", "DA", "AC", "BD"],
    trail: [],
  },
  star: {
    name: "A star inside a pentagon",
    spots: { A: pentagon(0), B: pentagon(1), C: pentagon(2), D: pentagon(3), E: pentagon(4) },
    edges: ["AB", "BC", "CD", "DE", "EA", "AC", "CE", "EB", "BD", "DA"],
    trail: ["A", "B", "C", "D", "E", "A", "C", "E", "B", "D", "A"],
  },
};
const STROKE_ORDER = ["house", "square", "star"];

/** Drawing a figure in one stroke: possible exactly when no more than two points have an odd number of lines. */
function OneStroke(props: Props) {
  const [which, setWhich] = useState(typeof props.shape === "string" && props.shape in STROKE_SHAPES ? props.shape : "house");
  const [step, setStep] = useState(clamp(Math.round(num(props.step, 0)), 0, 10));
  const { name, spots, edges, trail } = STROKE_SHAPES[which];
  const names = Object.keys(spots);
  const degree = (v: string) => edges.filter((e) => e.includes(v)).length;
  const odd = names.filter((v) => degree(v) % 2 === 1);
  const shown = trail.length === 0 ? 0 : Math.min(step, trail.length - 1);
  const when = (edge: string) => {
    for (let i = 0; i < shown; i++) if ((trail[i] + trail[i + 1] === edge) || (trail[i + 1] + trail[i] === edge)) return i + 1;
    return undefined;
  };
  const verdict =
    odd.length === 0
      ? "Every degree is even, so the figure can be drawn in one stroke that ends where it began."
      : odd.length === 2
        ? `Exactly two degrees are odd, so the figure can be drawn in one stroke, starting at ${odd[0]} and ending at ${odd[1]}, or the other way round.`
        : `${odd.length} degrees are odd, so no single stroke can draw it: every pass through a point uses two of its lines, so only the first and last points can have an odd number.`;
  const progress =
    trail.length === 0
      ? ""
      : shown === 0
        ? ` Step through to draw it, starting at ${trail[0]}.`
        : ` The stroke so far is ${trail.slice(0, shown + 1).join(", ")}: ${shown} of ${edges.length} lines.${shown === edges.length ? " Every line has been drawn exactly once." : ""}`;
  const next = STROKE_ORDER[(STROKE_ORDER.indexOf(which) + 1) % STROKE_ORDER.length];
  return (
    <Frame
      title="Drawing a figure in one stroke"
      summary={`${name}: ${plural(names.length, "point")} and ${plural(edges.length, "line")}. The degrees, the number of lines at each point, are ${names.map((v) => `${v} ${degree(v)}`).join(", ")}. ${verdict}${progress}`}
      controls={
        <>
          {trail.length > 0 ? <Stepper label="step" value={shown} onChange={setStep} min={0} max={trail.length - 1} /> : null}
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={() => {
              setWhich(next);
              setStep(0);
            }}
          >
            {`Try ${STROKE_SHAPES[next].name.toLowerCase()}`}
          </button>
        </>
      }
    >
      <svg viewBox="0 0 440 270" role="img" aria-label={`${name}, with ${plural(odd.length, "point")} of odd degree${trail.length > 0 ? ` and ${shown} lines drawn` : ""}`}>
        {edges.map((edge) => {
          const t = when(edge);
          return <Link key={edge} from={spots[edge[0]]} to={spots[edge[1]]} hot={t !== undefined} label={t} />;
        })}
        {names.map((v) => (
          <Dot key={v} at={spots[v]} name={v} mark={trail.length > 0 && v === trail[shown] ? "now" : odd.includes(v) ? "done" : "wait"} note={`deg ${degree(v)}`} above={spots[v][1] < 140} />
        ))}
        <text x="12" y="22" className="fig-small">
          {`odd degree: ${odd.length === 0 ? "none" : odd.join(", ")}`}
        </text>
      </svg>
    </Frame>
  );
}

const LEAF_TREES: Record<string, { name: string; spots: Record<number, Spot>; edges: [number, number][] }> = {
  branching: {
    name: "A branching tree",
    spots: { 1: [56, 56], 2: [56, 138], 3: [56, 220], 4: [150, 138], 5: [240, 138], 6: [322, 138], 7: [394, 70], 8: [394, 206] },
    edges: [[1, 4], [2, 4], [3, 4], [4, 5], [5, 6], [6, 7], [6, 8]],
  },
  path: {
    name: "A path",
    spots: { 3: [36, 100], 1: [88, 180], 7: [140, 100], 5: [192, 180], 2: [244, 100], 8: [296, 180], 4: [348, 100], 6: [400, 180] },
    edges: [[3, 1], [1, 7], [7, 5], [5, 2], [2, 8], [8, 4], [4, 6]],
  },
  star: {
    name: "A star",
    spots: { 8: [220, 138], 1: [220, 40], 2: [296, 76], 3: [318, 160], 4: [270, 228], 5: [170, 228], 6: [122, 160], 7: [144, 76] },
    edges: [[8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 6], [8, 7]],
  },
};
const LEAF_ORDER = ["branching", "path", "star"];

/** Stripping leaves from a tree: each removal leaves a smaller tree, and writing down each removed leaf's neighbour gives the tree's code. */
function LeafStrip(props: Props) {
  const [which, setWhich] = useState(typeof props.tree === "string" && props.tree in LEAF_TREES ? props.tree : "branching");
  const [step, setStep] = useState(clamp(Math.round(num(props.step, 0)), 0, 6));
  const { name, spots, edges } = LEAF_TREES[which];
  const n = Object.keys(spots).length;
  const removed: number[] = [];
  const code: number[] = [];
  const alive = (e: [number, number]) => !removed.includes(e[0]) && !removed.includes(e[1]);
  const leafNext = () => {
    const live = edges.filter(alive);
    const degree = (v: number) => live.filter((e) => e[0] === v || e[1] === v).length;
    const leaf = Math.min(...Object.keys(spots).map(Number).filter((v) => !removed.includes(v) && degree(v) === 1));
    const edge = live.find((e) => e[0] === leaf || e[1] === leaf) as [number, number];
    return [leaf, edge[0] === leaf ? edge[1] : edge[0]];
  };
  for (let k = 0; k < Math.min(step, n - 2); k++) {
    const [leaf, neighbour] = leafNext();
    removed.push(leaf);
    code.push(neighbour);
  }
  const shown = removed.length;
  const done = shown === n - 2;
  const [nextLeaf, nextNeighbour] = done ? [0, 0] : leafNext();
  const left = n - shown;
  const next = LEAF_ORDER[(LEAF_ORDER.indexOf(which) + 1) % LEAF_ORDER.length];
  return (
    <Frame
      title="Removing leaves from a tree"
      summary={`${name} on ${n} numbered vertices, with ${n - 1} edges. ${
        shown === 0 ? "No leaves removed yet." : `Removed ${plural(shown, "leaf", "leaves")} so far, ${removed.join(", ")}, writing down the neighbour of each: the code so far is (${code.join(", ")}).`
      } What is left is still a tree, with ${plural(left, "vertex", "vertices")} and ${plural(left - 1, "edge")}. ${
        done
          ? `Two vertices remain, joined by one edge, so the code is complete: ${n - 2} numbers, each from 1 to ${n}, from which the whole tree can be rebuilt.`
          : `The smallest leaf now is ${nextLeaf}, attached to ${nextNeighbour}.`
      }`}
      controls={
        <>
          <Stepper label="leaves removed" value={shown} onChange={setStep} min={0} max={n - 2} />
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={() => {
              setWhich(next);
              setStep(0);
            }}
          >
            {`Try ${LEAF_TREES[next].name.toLowerCase()}`}
          </button>
        </>
      }
    >
      <svg viewBox="0 0 440 270" role="img" aria-label={`${name} with ${shown} leaves removed and code (${code.join(", ")})`}>
        {edges.map((e) => (
          <Link key={`${e[0]}-${e[1]}`} from={spots[e[0]]} to={spots[e[1]]} faint={!alive(e)} hot={!done && alive(e) && (e[0] === nextLeaf || e[1] === nextLeaf)} />
        ))}
        {Object.keys(spots)
          .map(Number)
          .map((v) => (removed.includes(v) ? null : <Dot key={v} at={spots[v]} name={v} mark={v === nextLeaf ? "now" : "done"} />))}
        <text x="12" y="262" className="fig-small">
          {`code: (${code.join(", ")})`}
        </text>
      </svg>
    </Frame>
  );
}

const DICE_EVENTS: Record<string, { name: string; holds: (a: number, b: number) => boolean }> = {
  seven: { name: "the total is 7", holds: (a, b) => a + b === 7 },
  doubles: { name: "the two dice match", holds: (a, b) => a === b },
  six: { name: "at least one die shows 6", holds: (a, b) => a === 6 || b === 6 },
  ten: { name: "the total is at least 10", holds: (a, b) => a + b >= 10 },
  "first-even": { name: "the first die is even", holds: (a) => a % 2 === 0 },
  "first-six": { name: "the first die shows 6", holds: (a) => a === 6 },
};
const DICE_ORDER = ["seven", "doubles", "six", "ten", "first-even", "first-six"];

/** A fraction in lowest terms, written n/d, or a whole number. */
const lowest = (n: number, d: number) => {
  const g = commonDivisor(n, d) || 1;
  return d / g === 1 ? `${n / g}` : `${n / g}/${d / g}`;
};

/** The 36 outcomes of two dice, an event among them, and optionally an event it is conditioned on. */
function DiceGrid(props: Props) {
  const [which, setWhich] = useState(typeof props.event === "string" && props.event in DICE_EVENTS ? props.event : "seven");
  const [given, setGiven] = useState(typeof props.given === "string" && props.given in DICE_EVENTS ? props.given : "none");
  const event = DICE_EVENTS[which];
  const condition = given === "none" ? null : DICE_EVENTS[given];
  const faces = [1, 2, 3, 4, 5, 6];
  const cells = faces.flatMap((a) => faces.map((b) => [a, b] as [number, number]));
  const inEvent = cells.filter(([a, b]) => event.holds(a, b)).length;
  const room = condition ? cells.filter(([a, b]) => condition.holds(a, b)) : cells;
  const both = room.filter(([a, b]) => event.holds(a, b)).length;
  const nextEvent = DICE_ORDER[(DICE_ORDER.indexOf(which) + 1) % DICE_ORDER.length];
  const givens = ["none", ...DICE_ORDER];
  const nextGiven = givens[(givens.indexOf(given) + 1) % givens.length];
  const same = both * 36 === inEvent * room.length;
  const summary = condition
    ? `Given that ${condition.name}, only the ${room.length} outcomes where that is true remain, and they are still equally likely. ${both} of them also have ${event.name}, so the chance that ${event.name}, given that ${condition.name}, is ${both}/${room.length}${both === 0 ? "" : ` = ${lowest(both, room.length)}`}. Without the condition it is ${inEvent}/36 = ${lowest(inEvent, 36)}. ${
        same ? "Knowing the condition does not change the chance." : both * 36 > inEvent * room.length ? "Knowing the condition makes it more likely." : "Knowing the condition makes it less likely."
      }`
    : `Two dice, first and second, give 36 equally likely outcomes. The event that ${event.name} contains ${plural(inEvent, "of them", "of them")}, so its probability is ${inEvent}/36 = ${lowest(inEvent, 36)}.`;
  return (
    <Frame
      title="Outcomes of two dice"
      summary={summary}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setWhich(nextEvent)}>
            {`Event: ${DICE_EVENTS[nextEvent].name}`}
          </button>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setGiven(nextGiven)}>
            {nextGiven === "none" ? "Remove the condition" : `Given: ${DICE_EVENTS[nextGiven].name}`}
          </button>
        </>
      }
    >
      <svg viewBox="0 0 440 290" role="img" aria-label={`A 6 by 6 grid of outcomes of two dice, ${condition ? `${room.length} kept by the condition, ` : ""}${both} in the event`}>
        <text x="250" y="18" textAnchor="middle" className="fig-small">
          first die
        </text>
        <text x="40" y="160" textAnchor="middle" className="fig-small" transform="rotate(-90 40 160)">
          second die
        </text>
        {faces.map((f) => (
          <g key={f}>
            <text x={130 + (f - 1) * 40 + 20} y="38" textAnchor="middle" className="fig-small">
              {f}
            </text>
            <text x="116" y={46 + (f - 1) * 40 + 24} textAnchor="middle" className="fig-small">
              {f}
            </text>
          </g>
        ))}
        {cells.map(([a, b]) => {
          const kept = !condition || condition.holds(a, b);
          const hit = event.holds(a, b);
          const x = 130 + (a - 1) * 40;
          const y = 46 + (b - 1) * 40;
          return (
            <g key={`${a}-${b}`}>
              <rect x={x + 2} y={y + 2} width="36" height="36" className={kept && hit ? "fig-accent" : kept ? "fig-fill" : "fig-ghost"} opacity={kept ? 1 : 0.35} />
              <text x={x + 20} y={y + 25} textAnchor="middle" className="fig-small" style={{ fill: kept && hit ? "var(--bg)" : "var(--text)" }}>
                {a + b}
              </text>
            </g>
          );
        })}
        <text x="12" y="284" className="fig-small">
          {condition ? `${both} of ${room.length} kept outcomes` : `${inEvent} of 36 outcomes`}
        </text>
      </svg>
    </Frame>
  );
}

const BAYES_RATES = [1, 2, 5, 10, 20, 50, 100, 200, 300, 500];

/** Ten thousand people split by a condition and by a test, drawn as areas, so the chance of the condition given a positive test can be seen. */
function BayesSquare(props: Props) {
  const start = num(props.prevalence, 10);
  const nearest = BAYES_RATES.reduce((best, rate, i) => (Math.abs(rate - start) < Math.abs(BAYES_RATES[best] - start) ? i : best), 0);
  const [rateAt, setRateAt] = useState(nearest);
  const [sensitivity, setSensitivity] = useState(clamp(Math.round(num(props.sensitivity, 90)), 50, 100));
  const [falsePositive, setFalsePositive] = useState(clamp(Math.round(num(props.falsePositive, 5)), 0, 30));
  const perThousand = BAYES_RATES[rateAt];
  const people = 10000;
  const sick = perThousand * 10;
  const well = people - sick;
  const caught = Math.round((sick * sensitivity) / 100);
  const alarms = Math.round((well * falsePositive) / 100);
  const positives = caught + alarms;
  const share = positives === 0 ? 0 : caught / positives;
  const left = Math.max(4, (360 * sick) / people);
  const right = 360 - left;
  const top = 34;
  const tall = 180;
  const caughtHeight = (tall * sensitivity) / 100;
  const alarmHeight = (tall * falsePositive) / 100;
  const barTrue = positives === 0 ? 0 : 360 * share;
  const percent = (value: number) => `${dp(value * 100, value * 100 < 10 ? 1 : 0)}%`;
  return (
    <Frame
      title="Ten thousand people and one test"
      summary={`Out of ${group(people)} people, ${group(sick)} have the condition and ${group(well)} do not. The test is positive for ${sensitivity}% of those who have it, which is ${group(caught)} people, and for ${falsePositive}% of those who do not, which is ${group(alarms)} more. ${
        positives === 0
          ? "Nobody tests positive."
          : `So ${group(positives)} people test positive, and ${group(caught)} of them have the condition: given a positive test, the chance of having it is ${group(caught)}/${group(positives)}, about ${percent(share)}, against ${percent(sick / people)} before the test.`
      }`}
      controls={
        <>
          <Slider label="have the condition" value={rateAt} onChange={setRateAt} min={0} max={BAYES_RATES.length - 1} text={`${perThousand} in 1,000`} />
          <Slider label="positive if they have it" value={sensitivity} onChange={setSensitivity} min={50} max={100} text={`${sensitivity}%`} />
          <Slider label="positive if they do not" value={falsePositive} onChange={setFalsePositive} min={0} max={30} text={`${falsePositive}%`} />
        </>
      }
    >
      <svg viewBox="0 0 440 300" role="img" aria-label={`A square of ${group(people)} people: ${group(caught)} true positives and ${group(alarms)} false positives`}>
        <text x="40" y="22" className="fig-small">
          {`have it: ${group(sick)}`}
        </text>
        <text x="400" y="22" textAnchor="end" className="fig-small">
          {`do not: ${group(well)}`}
        </text>
        <rect x="40" y={top} width={left} height={caughtHeight} className="fig-accent" />
        <rect x="40" y={top + caughtHeight} width={left} height={tall - caughtHeight} className="fig-fill" />
        <rect x={40 + left} y={top} width={right} height={alarmHeight} className="fig-accent" opacity={0.45} />
        <rect x={40 + left} y={top} width={right} height={tall} className="fig-ghost" />
        <rect x="40" y={top} width="360" height={tall} className="fig-cell" />
        <line x1={40 + left} y1={top} x2={40 + left} y2={top + tall} className="fig-axis" />
        <text x="408" y={top + Math.max(alarmHeight / 2, 6) + 4} className="fig-small">
          +
        </text>
        <text x="408" y={top + tall - 4} className="fig-small">
          −
        </text>
        <text x="40" y="240" className="fig-small">
          {`everyone who tests positive: ${group(positives)}`}
        </text>
        <rect x="40" y="248" width={barTrue} height="20" className="fig-accent" />
        <rect x={40 + barTrue} y="248" width={360 - barTrue} height="20" className="fig-accent" opacity={positives === 0 ? 0 : 0.45} />
        <rect x="40" y="248" width="360" height="20" className="fig-cell" />
        <text x="40" y="288" className="fig-small">
          {positives === 0 ? "no positive tests" : `${group(caught)} have it, ${group(alarms)} do not: ${percent(share)} have it`}
        </text>
      </svg>
    </Frame>
  );
}

const DICE_VARIABLES: Record<string, { name: string; of: (a: number, b: number) => number }> = {
  max: { name: "the larger of the two numbers", of: (a, b) => Math.max(a, b) },
  total: { name: "the total of the two dice", of: (a, b) => a + b },
  gap: { name: "the gap between the two numbers", of: (a, b) => Math.abs(a - b) },
  sixes: { name: "the number of sixes", of: (a, b) => (a === 6 ? 1 : 0) + (b === 6 ? 1 : 0) },
  prize: { name: "the prize in rupees, 20 for a double and −5 otherwise", of: (a, b) => (a === b ? 20 : -5) },
};
const VARIABLE_ORDER = ["max", "total", "gap", "sixes", "prize"];
const minus = (value: number | string) => String(value).replace("-", "−");

/** A number computed from two dice, its chances drawn as bars, one at a time or added up, with its mean and spread if asked. */
function VariableBars(props: Props) {
  const [which, setWhich] = useState(typeof props.variable === "string" && props.variable in DICE_VARIABLES ? props.variable : "max");
  const [cumulative, setCumulative] = useState(props.cumulative === true);
  const marks = props.marks === "mean" || props.marks === "spread" ? props.marks : "none";
  const variable = DICE_VARIABLES[which];
  const counts = new Map<number, number>();
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) counts.set(variable.of(a, b), (counts.get(variable.of(a, b)) ?? 0) + 1);
  const values = [...counts.keys()].sort((x, y) => x - y);
  const running = values.map((v, i) => values.slice(0, i + 1).reduce((total, w) => total + (counts.get(w) ?? 0), 0));
  const lo = values[0];
  const hi = values[values.length - 1];
  const x = (v: number) => 50 + ((v - lo) / (hi - lo)) * 340;
  const gaps = values.slice(1).map((v, i) => x(v) - x(values[i]));
  const width = Math.min(28, 0.7 * Math.min(...gaps));
  const most = Math.max(...counts.values());
  const sum = values.reduce((total, v) => total + v * (counts.get(v) ?? 0), 0);
  const mean = sum / 36;
  const sd = Math.sqrt(values.reduce((total, v) => total + (v - mean) ** 2 * (counts.get(v) ?? 0), 0) / 36);
  const inside = values.filter((v) => Math.abs(v - mean) <= sd).reduce((total, v) => total + (counts.get(v) ?? 0), 0);
  const height = (count: number, all: number) => (count / all) * 150;
  const modes = values.filter((v) => counts.get(v) === most).map(minus);
  const meanText = Number.isInteger(mean) ? minus(mean) : `${minus(lowest(sum, 36))}, about ${minus(dp(mean, 2))}`;
  const marksText =
    marks === "mean"
      ? ` The bars balance at ${meanText}: that is the mean.`
      : marks === "spread"
        ? ` The mean is ${meanText} and the standard deviation is about ${dp(sd, 2)}. The bracket runs from one standard deviation below the mean to one above, ${minus(dp(mean - sd, 2))} to ${minus(dp(mean + sd, 2))}, and the values inside it hold ${inside}/36 of the probability.`
        : "";
  const summary = cumulative
    ? `The chance that ${variable.name} is at most x climbs in steps: ${values.map((v, i) => `${minus(v)}: ${running[i]}/36`).join(", ")}. Each step is as tall as the chance of that one value, and the last reaches 36/36 = 1.${marksText}`
    : `Out of 36 equally likely throws, ${variable.name} takes ${plural(values.length, "value")}: ${values.map((v) => `${minus(v)} in ${counts.get(v)}`).join(", ")}. The most likely ${modes.length === 1 ? `value is ${modes[0]}` : `values are ${modes.join(" and ")}`}, with chance ${lowest(most, 36)}.${marksText}`;
  const nextVariable = VARIABLE_ORDER[(VARIABLE_ORDER.indexOf(which) + 1) % VARIABLE_ORDER.length];
  const edge = (v: number) => clamp(x(v), 30, 410);
  return (
    <Frame
      title="A number that depends on two dice"
      summary={summary}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setWhich(nextVariable)}>
            {`Show ${DICE_VARIABLES[nextVariable].name.split(",")[0]}`}
          </button>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={cumulative} onClick={() => setCumulative(!cumulative)}>
            Add up the chances
          </button>
        </>
      }
    >
      <svg viewBox="0 0 440 260" role="img" aria-label={`Bars for ${variable.name}${cumulative ? ", added up from the left" : ""}`}>
        <line x1="30" y1="200" x2="410" y2="200" className="fig-axis" />
        {values.map((v, i) => {
          const count = cumulative ? running[i] : (counts.get(v) ?? 0);
          const tall = height(count, cumulative ? 36 : most);
          return (
            <g key={v}>
              <rect x={x(v) - width / 2} y={200 - tall} width={width} height={tall} className="fig-accent" />
              <text x={x(v)} y={194 - tall} textAnchor="middle" className="fig-small">
                {count}
              </text>
              <text x={x(v)} y="216" textAnchor="middle" className="fig-small">
                {minus(v)}
              </text>
            </g>
          );
        })}
        <text x="30" y="30" className="fig-small">
          {cumulative ? "throws with at most this value, of 36" : "throws with this value, of 36"}
        </text>
        {marks === "none" ? null : (
          <g>
            <path d={`M ${x(mean)} 222 l -7 12 l 14 0 z`} className="fig-accent" />
            <text x={clamp(x(mean), 60, 380)} y="252" textAnchor="middle" className="fig-small">
              {`mean ${minus(dp(mean, 2))}`}
            </text>
          </g>
        )}
        {marks === "spread" ? (
          <g>
            <line x1={edge(mean - sd)} y1="44" x2={edge(mean + sd)} y2="44" className="fig-accent-line" />
            <line x1={edge(mean - sd)} y1="38" x2={edge(mean - sd)} y2="50" className="fig-accent-line" />
            <line x1={edge(mean + sd)} y1="38" x2={edge(mean + sd)} y2="50" className="fig-accent-line" />
          </g>
        ) : null}
      </svg>
    </Frame>
  );
}

type Family = "binomial" | "geometric" | "poisson";
const FAMILY_ORDER: Family[] = ["binomial", "geometric", "poisson"];
const FAMILY_NAMES: Record<Family, string> = { binomial: "binomial", geometric: "geometric", poisson: "Poisson" };

/** The chances of a named distribution, from its smallest value up to where almost no probability is left. */
function familyChances(family: Family, n: number, p: number, rate: number): { start: number; chances: number[] } {
  if (family === "binomial") {
    const chances = [(1 - p) ** n];
    for (let k = 0; k < n; k++) chances.push((chances[k] * (n - k) * p) / ((k + 1) * (1 - p)));
    return { start: 0, chances };
  }
  if (family === "geometric") {
    const chances = [p];
    while (chances.length < 30 && (1 - p) ** chances.length > 0.005) chances.push(chances[chances.length - 1] * (1 - p));
    return { start: 1, chances };
  }
  const chances = [Math.exp(-rate)];
  const last = Math.min(30, Math.ceil(rate + 4 * Math.sqrt(rate) + 3));
  for (let k = 0; k < last; k++) chances.push((chances[k] * rate) / (k + 1));
  return { start: 0, chances };
}

/** The binomial, geometric and Poisson distributions, with their parameters on controls, and their means and spreads marked. */
function DistributionBars(props: Props) {
  const [family, setFamily] = useState<Family>(props.family === "geometric" || props.family === "poisson" ? props.family : "binomial");
  const [n, setN] = useState(clamp(Math.round(num(props.n, 10)), 1, 40));
  const [p, setP] = useState(clamp(Math.round(num(props.p, 0.3) * 20) / 20, 0.05, 0.95));
  const [rate, setRate] = useState(clamp(Math.round(num(props.rate, 2) * 2) / 2, 0.5, 15));
  const { start, chances } = familyChances(family, n, p, rate);
  const mean = family === "binomial" ? n * p : family === "geometric" ? 1 / p : rate;
  const variance = family === "binomial" ? n * p * (1 - p) : family === "geometric" ? (1 - p) / (p * p) : rate;
  const sd = Math.sqrt(variance);
  const tallest = Math.max(...chances);
  const mode = start + chances.indexOf(tallest);
  const count = chances.length;
  const step = 350 / Math.max(count, 1);
  const x = (value: number) => 45 + (value - start + 0.5) * step;
  const label = count <= 16 ? 1 : 5;
  const story =
    family === "binomial"
      ? `the number of successes in ${n} independent ${n === 1 ? "trial" : "trials"}, each a success with chance ${dp(p, 2)}`
      : family === "geometric"
        ? `the number of independent trials up to and including the first success, each a success with chance ${dp(p, 2)}`
        : `the number of rare events in a stretch of time in which ${dp(rate, 1)} happen on average`;
  const formula = family === "binomial" ? `np = ${dp(mean, 2)}` : family === "geometric" ? `1/p = ${dp(mean, 2)}` : `λ = ${dp(mean, 2)}`;
  const shown = family === "geometric" ? ` The bars stop at ${start + count - 1}; later values are possible but together have chance ${dp((1 - p) ** count, 3)}.` : "";
  const nextFamily = FAMILY_ORDER[(FAMILY_ORDER.indexOf(family) + 1) % FAMILY_ORDER.length];
  const edge = (value: number) => clamp(x(value), 30, 410);
  return (
    <Frame
      title="Three distributions that keep turning up"
      summary={`The ${FAMILY_NAMES[family]} distribution: ${story}. Its mean is ${formula} and its standard deviation is about ${dp(sd, 2)}. The most likely value is ${mode}, with chance ${dp(tallest, 3)}.${shown}`}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setFamily(nextFamily)}>
            {`Show the ${FAMILY_NAMES[nextFamily]} distribution`}
          </button>
          {family === "binomial" ? <Stepper label="trials" value={n} onChange={setN} min={1} max={40} /> : null}
          {family === "poisson" ? (
            <Slider label="average count" value={rate} onChange={setRate} min={0.5} max={15} step={0.5} text={dp(rate, 1)} />
          ) : (
            <Slider label="chance of success" value={p} onChange={(v) => setP(Math.round(v * 20) / 20)} min={0.05} max={0.95} step={0.05} text={dp(p, 2)} />
          )}
        </>
      }
    >
      <svg viewBox="0 0 440 260" role="img" aria-label={`Bars for the ${FAMILY_NAMES[family]} distribution, mean ${dp(mean, 2)}`}>
        <line x1="30" y1="200" x2="410" y2="200" className="fig-axis" />
        {chances.map((chance, i) => {
          const tall = (chance / tallest) * 140;
          const value = start + i;
          return (
            <g key={value}>
              <rect x={x(value) - step * 0.36} y={200 - tall} width={step * 0.72} height={tall} className="fig-accent" />
              {value % label === 0 || label === 1 ? (
                <text x={x(value)} y="216" textAnchor="middle" className="fig-small">
                  {value}
                </text>
              ) : null}
            </g>
          );
        })}
        <path d={`M ${edge(mean)} 222 l -7 12 l 14 0 z`} className="fig-accent" />
        <text x={clamp(edge(mean), 60, 380)} y="252" textAnchor="middle" className="fig-small">
          {`mean ${dp(mean, 2)}`}
        </text>
        <line x1={edge(mean - sd)} y1="44" x2={edge(mean + sd)} y2="44" className="fig-accent-line" />
        <line x1={edge(mean - sd)} y1="38" x2={edge(mean - sd)} y2="50" className="fig-accent-line" />
        <line x1={edge(mean + sd)} y1="38" x2={edge(mean + sd)} y2="50" className="fig-accent-line" />
        <text x="30" y="30" className="fig-small">
          {`chance of each value, tallest ${dp(tallest, 3)}`}
        </text>
      </svg>
    </Frame>
  );
}

/** The error function, to about seven places (Abramowitz and Stegun 7.1.26), for the normal distribution's cdf. */
const erf = (x: number) => {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x < 0 ? -y : y;
};

type DensityShape = "uniform" | "triangle" | "exponential" | "normal";
const DENSITY_ORDER: DensityShape[] = ["uniform", "triangle", "exponential", "normal"];
const DENSITIES: Record<DensityShape, { name: string; story: string; density: (x: number) => number; cdf: (x: number) => number }> = {
  uniform: {
    name: "uniform",
    story: "The wait for a train that comes every 10 minutes, arriving at a random moment",
    density: (x) => (x >= 0 && x <= 10 ? 0.1 : 0),
    cdf: (x) => clamp(x / 10, 0, 1),
  },
  triangle: {
    name: "triangular",
    story: "The total of two separate random waits, each between 0 and 5 minutes",
    density: (x) => (x <= 0 || x >= 10 ? 0 : x <= 5 ? x / 25 : (10 - x) / 25),
    cdf: (x) => (x <= 0 ? 0 : x <= 5 ? (x * x) / 50 : x < 10 ? 1 - ((10 - x) * (10 - x)) / 50 : 1),
  },
  exponential: {
    name: "exponential",
    story: "The time until the next request reaches a server that gets one every 2 minutes on average",
    density: (x) => (x < 0 ? 0 : 0.5 * Math.exp(-0.5 * x)),
    cdf: (x) => (x <= 0 ? 0 : 1 - Math.exp(-0.5 * x)),
  },
  normal: {
    name: "normal",
    story: "A delivery time with mean 5 minutes and standard deviation 1.5 minutes",
    density: (x) => Math.exp(-((x - 5) ** 2) / (2 * 1.5 * 1.5)) / (1.5 * Math.sqrt(2 * Math.PI)),
    cdf: (x) => 0.5 * (1 + erf((x - 5) / (1.5 * Math.SQRT2))),
  },
};

/** A density curve over 0 to 10 minutes; the chance of landing between two times is the area under it, shaded. */
function DensityArea(props: Props) {
  const [shape, setShape] = useState<DensityShape>(typeof props.shape === "string" && props.shape in DENSITIES ? (props.shape as DensityShape) : "uniform");
  const [from, setFrom] = useState(clamp(Math.round(num(props.from, 4) * 2) / 2, 0, 10));
  const [to, setTo] = useState(clamp(Math.round(num(props.to, 6) * 2) / 2, 0, 10));
  const { name, story, density, cdf } = DENSITIES[shape];
  const low = Math.min(from, to);
  const high = Math.max(from, to);
  const area = cdf(high) - cdf(low);
  const xs = Array.from({ length: 201 }, (_, i) => i / 20);
  const peak = Math.max(...xs.map(density));
  const sx = (x: number) => 40 + x * 36;
  const sy = (y: number) => 200 - (y / peak) * 150;
  const curve = xs.map((x) => `${dp(sx(x), 2)},${dp(sy(density(x)), 2)}`).join(" ");
  const inside = xs.filter((x) => x >= low && x <= high);
  const shaded = inside.length > 0 ? `M ${sx(low)} 200 ${inside.map((x) => `L ${dp(sx(x), 2)} ${dp(sy(density(x)), 2)}`).join(" ")} L ${sx(high)} 200 Z` : "";
  const middle = (low + high) / 2;
  const nextShape = DENSITY_ORDER[(DENSITY_ORDER.indexOf(shape) + 1) % DENSITY_ORDER.length];
  return (
    <Frame
      title="Chance as area under a density"
      summary={`${story}: a ${name} distribution. The chance that it lands between ${dp(low, 1)} and ${dp(high, 1)} minutes is the shaded area, about ${dp(area, 3)}.${
        low === high ? " An interval of zero width has zero area, so any one exact time has chance 0." : ` The height of the curve at ${dp(middle, 2)} minutes is ${dp(density(middle), 3)} per minute: a density, not a chance.`
      }`}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setShape(nextShape)}>
            {`Show the ${DENSITIES[nextShape].name} distribution`}
          </button>
          <Slider label="from" value={from} onChange={setFrom} min={0} max={10} step={0.5} text={`${dp(from, 1)} min`} />
          <Slider label="to" value={to} onChange={setTo} min={0} max={10} step={0.5} text={`${dp(to, 1)} min`} />
        </>
      }
    >
      <svg viewBox="0 0 440 250" role="img" aria-label={`A ${name} density from 0 to 10 minutes, with the area from ${dp(low, 1)} to ${dp(high, 1)} shaded, about ${dp(area, 3)}`}>
        {shaded ? <path d={shaded} className="fig-accent" opacity={0.6} /> : null}
        <polyline points={curve} className="fig-line" />
        <line x1="40" y1="200" x2="400" y2="200" className="fig-axis" />
        {[0, 2, 4, 6, 8, 10].map((t) => (
          <text key={t} x={sx(t)} y="218" textAnchor="middle" className="fig-small">
            {t}
          </text>
        ))}
        <text x="400" y="236" textAnchor="end" className="fig-small">
          minutes
        </text>
        <line x1={sx(low)} y1="40" x2={sx(low)} y2="200" className="fig-guide" />
        <line x1={sx(high)} y1="40" x2={sx(high)} y2="200" className="fig-guide" />
        <text x="40" y="30" className="fig-small">
          {`area ${dp(area, 3)}, highest density ${dp(peak, 3)} per minute`}
        </text>
      </svg>
    </Frame>
  );
}

type SpaceName = "days" | "pins" | "codes" | "hashes";
const SPACE_ORDER: SpaceName[] = ["days", "pins", "codes", "hashes"];
const SPACES: Record<SpaceName, { size: number; things: string; values: string; most: number; step: number }> = {
  days: { size: 365, things: "people", values: "birthdays", most: 60, step: 1 },
  pins: { size: 10000, things: "customers", values: "four-digit PINs", most: 300, step: 3 },
  codes: { size: 1000000, things: "users", values: "six-digit codes", most: 3000, step: 30 },
  hashes: { size: 2 ** 32, things: "files", values: "32-bit hashes", most: 200000, step: 2000 },
};

/** The chance that some two of n random picks from m values coincide, exactly and by the exponential approximation, as n grows. */
function BirthdayCurve(props: Props) {
  const [space, setSpace] = useState<SpaceName>(typeof props.space === "string" && props.space in SPACES ? (props.space as SpaceName) : "days");
  const { size, things, values, most, step } = SPACES[space];
  const [n, setN] = useState(clamp(Math.round(num(props.people, 23) / step) * step, step, most));
  // One pass of the exact product, keeping the chance of no match at every value the curve needs.
  const samples = 60;
  const marks = Array.from({ length: samples + 1 }, (_, i) => Math.round((most * i) / samples));
  const noMatch = new Map<number, number>();
  let logProduct = 0;
  let firstHalf = most;
  const wanted = new Set([...marks, n]);
  for (let k = 0; k <= most; k++) {
    if (wanted.has(k)) noMatch.set(k, Math.exp(logProduct));
    if (firstHalf === most && Math.exp(logProduct) <= 0.5) firstHalf = k;
    logProduct += Math.log1p(-k / size);
  }
  const exact = 1 - (noMatch.get(n) ?? 0);
  const approx = 1 - Math.exp(-(n * (n - 1)) / (2 * size));
  const half = Math.sqrt(2 * Math.log(2) * size);
  const sx = (k: number) => 40 + (k / most) * 360;
  const sy = (p: number) => 200 - p * 160;
  const curve = marks.map((k) => `${dp(sx(k), 2)},${dp(sy(1 - (noMatch.get(k) ?? 0)), 2)}`).join(" ");
  const nextSpace = SPACE_ORDER[(SPACE_ORDER.indexOf(space) + 1) % SPACE_ORDER.length];
  const chooseSpace = (next: SpaceName) => {
    setSpace(next);
    setN(clamp(Math.round(Math.sqrt(2 * Math.log(2) * SPACES[next].size) / SPACES[next].step) * SPACES[next].step, SPACES[next].step, SPACES[next].most));
  };
  const percent = (p: number) => (p < 0.001 ? "under 0.1%" : `${dp(p * 100, 1)}%`);
  return (
    <Frame
      title="When do two picks first coincide?"
      summary={`${group(n)} ${things}, each with one of ${group(size)} ${values} picked at random. The chance that at least two share one is ${percent(exact)}; the approximation 1 − e^(−n(n − 1)/2m) gives ${percent(approx)}. The chance first reaches one half at ${group(firstHalf)} ${things}, close to 1.18 × √${group(size)} ≈ ${group(Math.round(half))} and far fewer than ${group(size)}.`}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => chooseSpace(nextSpace)}>
            {`Use ${SPACES[nextSpace].values}`}
          </button>
          <Slider label={things} value={n} onChange={setN} min={step} max={most} step={step} text={group(n)} />
        </>
      }
    >
      <svg viewBox="0 0 440 250" role="img" aria-label={`The chance of a shared value rising with the number of ${things}, ${percent(exact)} at ${group(n)}`}>
        <line x1="40" y1="200" x2="400" y2="200" className="fig-axis" />
        <line x1="40" y1="40" x2="40" y2="200" className="fig-axis" />
        <line x1="40" y1={sy(0.5)} x2="400" y2={sy(0.5)} className="fig-guide" />
        <text x="36" y={sy(0.5) + 4} textAnchor="end" className="fig-small">
          ½
        </text>
        <text x="36" y={sy(1) + 4} textAnchor="end" className="fig-small">
          1
        </text>
        <polyline points={curve} className="fig-line" />
        <line x1={sx(half)} y1={sy(0.5)} x2={sx(half)} y2="200" className="fig-guide" />
        <circle cx={sx(n)} cy={sy(exact)} r="6" className="fig-accent" />
        <text x="40" y="218" className="fig-small">
          0
        </text>
        <text x="400" y="218" textAnchor="end" className="fig-small">
          {group(most)}
        </text>
        <text x="220" y="236" textAnchor="middle" className="fig-small">
          {`number of ${things}`}
        </text>
        <text x="48" y="30" className="fig-small">
          {`chance of a shared value: ${percent(exact)}`}
        </text>
      </svg>
    </Frame>
  );
}

type TailCase = "heads" | "requests" | "response";
const TAIL_ORDER: TailCase[] = ["heads", "requests", "response"];
const lnFactorial = (k: number) => {
  let total = 0;
  for (let i = 2; i <= k; i++) total += Math.log(i);
  return total;
};
const TAIL_CASES: Record<TailCase, { name: string; unit: string; mean: number; sd: number; low: number; high: number; step: number; exact: (t: number) => number; chernoff: ((t: number) => number) | null }> = {
  heads: {
    name: "heads in 100 tosses of a fair coin",
    unit: "heads",
    mean: 50,
    sd: 5,
    low: 51,
    high: 100,
    step: 1,
    exact: (t) => {
      let total = 0;
      for (let k = Math.ceil(t); k <= 100; k++) total += Math.exp(lnFactorial(100) - lnFactorial(k) - lnFactorial(100 - k) - 100 * Math.LN2);
      return total;
    },
    chernoff: (t) => Math.exp((-2 * (t - 50) ** 2) / 100),
  },
  requests: {
    name: "requests in a second, Poisson with mean 4",
    unit: "requests",
    mean: 4,
    sd: 2,
    low: 5,
    high: 30,
    step: 1,
    exact: (t) => {
      let below = 0;
      for (let k = 0; k < Math.ceil(t); k++) below += Math.exp(-4 + k * Math.log(4) - lnFactorial(k));
      return Math.max(0, 1 - below);
    },
    chernoff: (t) => Math.exp(-4) * ((Math.E * 4) / t) ** t,
  },
  response: {
    name: "a response time in milliseconds, exponential with mean 100",
    unit: "ms",
    mean: 100,
    sd: 100,
    low: 150,
    high: 2000,
    step: 50,
    exact: (t) => Math.exp(-t / 100),
    chernoff: null,
  },
};

/** The true chance of a large value next to the guarantees that Markov's, Chebyshev's and Chernoff's inequalities give, on a logarithmic scale. */
function TailBounds(props: Props) {
  const [which, setWhich] = useState<TailCase>(typeof props.variable === "string" && props.variable in TAIL_CASES ? (props.variable as TailCase) : "heads");
  const spec = TAIL_CASES[which];
  const [t, setT] = useState(clamp(Math.round(num(props.threshold, 70) / spec.step) * spec.step, spec.low, spec.high));
  const exact = spec.exact(t);
  const markov = Math.min(1, spec.mean / t);
  const chebyshev = Math.min(1, (spec.sd * spec.sd) / ((t - spec.mean) * (t - spec.mean)));
  const chernoff = spec.chernoff ? Math.min(1, spec.chernoff(t)) : null;
  const rows: [string, number | null][] = [
    ["true chance", exact],
    ["Markov", markov],
    ["Chebyshev", chebyshev],
    ["Chernoff", chernoff],
  ];
  const floor = -16;
  const width = (p: number) => (p <= 0 ? 0 : ((Math.max(Math.log10(p), floor) - floor) / -floor) * 250);
  const show = (p: number) => (p >= 0.001 ? dp(p, 4) : p.toExponential(1).replace("e-", " × 10^-").replace("-", "−"));
  const nextCase = TAIL_ORDER[(TAIL_ORDER.indexOf(which) + 1) % TAIL_ORDER.length];
  const choose = (next: TailCase) => {
    setWhich(next);
    setT(clamp(TAIL_CASES[next].mean + 4 * TAIL_CASES[next].sd, TAIL_CASES[next].low, TAIL_CASES[next].high));
  };
  return (
    <Frame
      title="How good is a guarantee?"
      summary={`For ${spec.name}, with mean ${spec.mean} and standard deviation ${spec.sd}: the chance of ${group(t)} ${spec.unit} or more is ${show(exact)}. Markov's inequality, which knows only the mean, promises at most ${show(markov)}. Chebyshev's, which also knows the standard deviation, promises at most ${show(chebyshev)}. ${
        chernoff === null ? "Chernoff's bound needs a sum of many independent bounded parts, which one response time is not." : `Chernoff's, which uses the independence of the many small parts, promises at most ${show(chernoff)}.`
      } Every bound is at least the true chance, as a guarantee must be.`}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => choose(nextCase)}>
            {`Show ${TAIL_CASES[nextCase].name.split(",")[0]}`}
          </button>
          <Slider label="at least" value={t} onChange={setT} min={spec.low} max={spec.high} step={spec.step} text={`${group(t)} ${spec.unit}`} />
        </>
      }
    >
      <svg viewBox="0 0 440 230" role="img" aria-label={`The true chance and three upper bounds for ${group(t)} ${spec.unit} or more, on a logarithmic scale`}>
        {rows.map(([label, p], i) => (
          <g key={label}>
            <text x="12" y={46 + i * 44} className="fig-small">
              {label}
            </text>
            {p === null ? (
              <text x="110" y={46 + i * 44} className="fig-small">
                does not apply
              </text>
            ) : (
              <>
                <rect x="110" y={32 + i * 44} width={width(p)} height="20" className="fig-accent" opacity={i === 0 ? 1 : 0.55} />
                <text x={Math.min(116 + width(p), 360)} y={46 + i * 44} className="fig-small">
                  {show(p)}
                </text>
              </>
            )}
          </g>
        ))}
        <line x1="110" y1="24" x2="110" y2="200" className="fig-axis" />
        <line x1="360" y1="24" x2="360" y2="200" className="fig-guide" />
        <text x="110" y="218" textAnchor="middle" className="fig-small">
          10^-16
        </text>
        <text x="360" y="218" textAnchor="middle" className="fig-small">
          1
        </text>
      </svg>
    </Frame>
  );
}

type MeanSource = "die" | "wait" | "rare" | "even";
const MEAN_SOURCES: MeanSource[] = ["die", "wait", "rare", "even"];
const MEAN_SPECS: Record<MeanSource, { name: string; mean: number; sd: number; low: number; high: number; draw: (u: number) => number }> = {
  die: { name: "throws of a fair die", mean: 3.5, sd: Math.sqrt(35 / 12), low: 1, high: 6, draw: (u) => Math.floor(u * 6) + 1 },
  wait: { name: "exponential waits with mean 1 minute", mean: 1, sd: 1, low: 0, high: 4, draw: (u) => -Math.log(1 - u) },
  rare: { name: "requests that each fail with chance 0.1, counted as 1 for a failure", mean: 0.1, sd: 0.3, low: 0, high: 1, draw: (u) => (u < 0.1 ? 1 : 0) },
  even: { name: "numbers spread evenly between 0 and 1", mean: 0.5, sd: Math.sqrt(1 / 12), low: 0, high: 1, draw: (u) => u },
};
const MEAN_SIZES = [1, 2, 4, 10, 30, 100];

/** Two thousand averages of n draws each: they gather at the mean, their spread shrinks like 1/√n, and their shape turns into a bell. */
function SampleMeans(props: Props) {
  const [source, setSource] = useState<MeanSource>(typeof props.source === "string" && props.source in MEAN_SPECS ? (props.source as MeanSource) : "die");
  const [sizeAt, setSizeAt] = useState(Math.max(0, MEAN_SIZES.indexOf(num(props.n, 1))));
  const [seed, setSeed] = useState(clamp(Math.round(num(props.seed, 0)), 0, 9));
  const spec = MEAN_SPECS[source];
  const n = MEAN_SIZES[sizeAt];
  const repeats = 2000;
  const raw = draws(seed, repeats * n, false);
  const averages = Array.from({ length: repeats }, (_, r) => {
    let total = 0;
    for (let i = 0; i < n; i++) total += spec.draw(raw[r * n + i]);
    return total / n;
  });
  const bins = 30;
  const span = spec.high - spec.low;
  const counts = Array.from({ length: bins }, () => 0);
  for (const a of averages) counts[clamp(Math.floor(((a - spec.low) / span) * bins), 0, bins - 1)]++;
  const center = averages.reduce((a, b) => a + b, 0) / repeats;
  const spread = Math.sqrt(averages.reduce((a, b) => a + (b - center) ** 2, 0) / repeats);
  const theory = spec.sd / Math.sqrt(n);
  const near = averages.filter((a) => Math.abs(a - spec.mean) <= 2 * theory).length / repeats;
  const bell = (x: number) => (repeats * (span / bins) * Math.exp(-((x - spec.mean) ** 2) / (2 * theory * theory))) / (theory * Math.sqrt(2 * Math.PI));
  const xs = Array.from({ length: 121 }, (_, i) => spec.low + (span * i) / 120);
  const top = Math.max(...counts, ...xs.map(bell));
  const sx = (x: number) => 40 + ((x - spec.low) / span) * 360;
  const sy = (c: number) => 200 - (Math.min(c, top) / top) * 160;
  const curve = xs.map((x) => `${dp(sx(x), 2)},${dp(sy(bell(x)), 2)}`).join(" ");
  const nextSource = MEAN_SOURCES[(MEAN_SOURCES.indexOf(source) + 1) % MEAN_SOURCES.length];
  return (
    <Frame
      title="Averages of many draws"
      summary={`${group(repeats)} averages, each of ${plural(n, "draw")} from ${spec.name}. The averages centre on ${dp(center, 3)}, against a true mean of ${dp(spec.mean, 3)}. Their standard deviation is ${dp(spread, 3)}, close to σ/√n = ${dp(spec.sd, 3)}/√${n} = ${dp(theory, 3)}. ${dp(near * 100, 1)}% of them lie within two of those of the mean, against 95% for a normal. The curve is the normal distribution with that mean and standard deviation.`}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setSource(nextSource)}>
            {`Average ${MEAN_SPECS[nextSource].name.split(",")[0]}`}
          </button>
          <Slider label="draws in each average" value={sizeAt} onChange={setSizeAt} min={0} max={MEAN_SIZES.length - 1} text={`${n}`} />
          <Stepper label="seed" value={seed} onChange={setSeed} min={0} max={9} />
        </>
      }
    >
      <svg viewBox="0 0 440 240" role="img" aria-label={`A histogram of ${group(repeats)} averages of ${n} draws, with a normal curve over it`}>
        {counts.map((c, i) => (
          <rect key={i} x={40 + (i * 360) / bins + 1} y={sy(c)} width={360 / bins - 2} height={200 - sy(c)} className="fig-accent" opacity={0.7} />
        ))}
        <polyline points={curve} className="fig-line" />
        <line x1="40" y1="200" x2="400" y2="200" className="fig-axis" />
        <line x1={sx(spec.mean)} y1="30" x2={sx(spec.mean)} y2="200" className="fig-guide" />
        <text x="40" y="218" textAnchor="middle" className="fig-small">
          {dp(spec.low, 2)}
        </text>
        <text x="400" y="218" textAnchor="middle" className="fig-small">
          {dp(spec.high, 2)}
        </text>
        <text x={sx(spec.mean)} y="234" textAnchor="middle" className="fig-small">
          {`mean ${dp(spec.mean, 2)}`}
        </text>
        <text x="40" y="22" className="fig-small">
          {`averages of ${n}: spread ${dp(spread, 3)}`}
        </text>
      </svg>
    </Frame>
  );
}

/** A small linear congruential generator, x → (5x + 1) mod 2048, whose pairs fall on five lines. */
function poorDraws(seed: number, count: number): number[] {
  let state = seed;
  return Array.from({ length: count }, () => {
    state = (5 * state + 1) % 2048;
    return state / 2048;
  });
}

const THROWS = [100, 300, 1000, 3000, 10000];

/** Points thrown at a unit square to estimate π, from a good generator or a poor one. */
function MonteCarlo(props: Props) {
  const [poor, setPoor] = useState(props.generator === "poor");
  const [throwsAt, setThrowsAt] = useState(Math.max(0, THROWS.indexOf(num(props.points, 1000))));
  const [seed, setSeed] = useState(clamp(Math.round(num(props.seed, 0)), 0, 9));
  const count = THROWS[throwsAt];
  const raw = poor ? poorDraws(seed, 2 * count) : draws(seed, 2 * count, false);
  const points = Array.from({ length: count }, (_, i) => [raw[2 * i], raw[2 * i + 1]] as const);
  const inside = points.filter(([x, y]) => x * x + y * y < 1).length;
  const share = inside / count;
  const estimate = 4 * share;
  const error = 4 * Math.sqrt((share * (1 - share)) / count);
  const distinct = new Set(points.map(([x, y]) => `${x},${y}`)).size;
  const shown = points.slice(0, 2000);
  const sx = (x: number) => 20 + x * 200;
  const sy = (y: number) => 220 - y * 200;
  const arc = Array.from({ length: 61 }, (_, i) => {
    const angle = (Math.PI / 2) * (i / 60);
    return `${dp(sx(Math.cos(angle)), 2)},${dp(sy(Math.sin(angle)), 2)}`;
  }).join(" ");
  const name = poor ? "the poor generator, x → (5x + 1) mod 2048" : "a good generator";
  return (
    <Frame
      title="Throwing points at a square"
      summary={`${group(count)} points from ${name}, seed ${seed}, each made of two draws. ${group(inside)} land inside the quarter circle, so the estimate of π is 4 × ${group(inside)}/${group(count)} = ${dp(estimate, 3)}, with a standard error of about ${dp(error, 3)}. The true value is 3.142. ${
        poor
          ? `Only ${group(distinct)} of the points are different, because the generator repeats after 2,048 draws, and every pair lies on one of five lines. However many points are thrown, the estimate stays near 3.09, and the standard error, which assumes independent draws, is wrong.`
          : "About 95% of the time the estimate is within two standard errors of π, and four times as many points halve the standard error."
      }${shown.length < count ? ` The picture shows the first ${group(shown.length)} points.` : ""}`}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={poor} onClick={() => setPoor(!poor)}>
            Use the poor generator
          </button>
          <Slider label="points" value={throwsAt} onChange={setThrowsAt} min={0} max={THROWS.length - 1} text={group(count)} />
          <Stepper label="seed" value={seed} onChange={setSeed} min={0} max={9} />
        </>
      }
    >
      <svg viewBox="0 0 440 240" role="img" aria-label={`${group(shown.length)} points in a square from ${name}, with a quarter circle drawn in it`}>
        <rect x="20" y="20" width="200" height="200" className="fig-ghost" />
        {shown.map(([x, y], i) => (
          <rect key={i} x={dp(sx(x) - 1, 2)} y={dp(sy(y) - 1, 2)} width="2" height="2" className={x * x + y * y < 1 ? "fig-accent" : "fig-fill"} />
        ))}
        <polyline points={arc} className="fig-line" />
        <line x1="20" y1="220" x2="220" y2="220" className="fig-axis" />
        <line x1="20" y1="20" x2="20" y2="220" className="fig-axis" />
        <text x="250" y="60" className="fig-small">
          {`inside: ${group(inside)} of ${group(count)}`}
        </text>
        <text x="250" y="90" className="fig-small">
          {`estimate of π: ${dp(estimate, 3)}`}
        </text>
        <text x="250" y="120" className="fig-small">
          {`standard error: ${dp(error, 3)}`}
        </text>
        <text x="250" y="150" className="fig-small">
          {`different points: ${group(distinct)}`}
        </text>
        <text x="250" y="180" className="fig-small">
          true π: 3.142
        </text>
      </svg>
    </Frame>
  );
}

/** 1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st and so on. */
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th")}`;

const SUMMARY_TIMES = [42, 45, 47, 48, 50, 51, 52, 53, 55, 56, 58, 60, 61, 63, 66, 70, 75, 82, 95];

/** Twenty response times on a line, with their mean, median and a chosen percentile marked. */
function SummaryMarks(props: Props) {
  const [slowest, setSlowest] = useState(clamp(Math.round(num(props.slowest, 120) / 20) * 20, 100, 5000));
  const [p, setP] = useState(clamp(Math.round(num(props.percentile, 90)), 1, 100));
  const values = [...SUMMARY_TIMES, slowest];
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const median = (values[n / 2 - 1] + values[n / 2]) / 2;
  const rank = Math.ceil((p * n) / 100);
  const pick = values[rank - 1];
  const top = Math.max(200, slowest);
  const sx = (v: number) => 30 + (v / top) * 390;
  const mark = (v: number, label: string, y: number, className: string) => (
    <g key={label}>
      <line x1={sx(v)} y1={y + 6} x2={sx(v)} y2="120" className={className} />
      <text x={sx(v)} y={y} textAnchor="middle" className="fig-small">
        {label}
      </text>
    </g>
  );
  return (
    <Frame
      title="Mean, median and percentile"
      summary={`20 response times in milliseconds, the slowest ${group(slowest)} ms. The mean is ${dp(mean, 2)} ms: the total, ${group(Math.round(mean * n))} ms, shared equally. The median is ${dp(median, 1)} ms, halfway between the 10th and 11th of the sorted times. The ${ordinal(p)} percentile is ${group(pick)} ms, the ${rank === n ? "slowest" : `${ordinal(rank)} of the 20 sorted times`}, because at least ${p}% of the times must be at or below it. Moving the slowest request changes the mean but not the median${rank === n ? ", and this percentile is the slowest request itself" : ""}.`}
      controls={
        <>
          <Slider label="slowest request" value={slowest} onChange={setSlowest} min={100} max={5000} step={20} text={`${group(slowest)} ms`} />
          <Slider label="percentile" value={p} onChange={setP} min={1} max={100} text={ordinal(p)} />
        </>
      }
    >
      <svg viewBox="0 0 440 160" role="img" aria-label={`20 response times on a line from 0 to ${group(top)} milliseconds, with the mean, the median and the ${ordinal(p)} percentile marked`}>
        <line x1="30" y1="120" x2="420" y2="120" className="fig-axis" />
        {values.map((v, i) => (
          <circle key={i} cx={sx(v)} cy="120" r="4" className="fig-accent" />
        ))}
        {mark(median, "median", 30, "fig-line")}
        {mark(mean, "mean", 52, "fig-accent-line")}
        {mark(pick, `p${p}`, 74, "fig-guide")}
        <text x="30" y="142" textAnchor="middle" className="fig-small">
          0
        </text>
        <text x="420" y="142" textAnchor="middle" className="fig-small">
          {`${group(top)} ms`}
        </text>
      </svg>
    </Frame>
  );
}

/** The chance that a response takes longer than t, on logarithmic axes: an exponential tail bends away, a power-law tail is a straight line. */
function TailPlot(props: Props) {
  const [tenths, setTenths] = useState(clamp(Math.round(num(props.alpha, 2) * 10), 10, 30));
  const alpha = tenths / 10;
  const floor = Math.pow(2, -1 / alpha) * 20;
  const sx = (logT: number) => 50 + ((logT - 1) / 4) * 370;
  const sy = (logP: number) => 20 + (Math.min(6, -logP) / 6) * 200;
  const logs = Array.from({ length: 201 }, (_, i) => 1 + (4 * i) / 200);
  const exponential = logs.map((x) => `${dp(sx(x), 2)},${dp(sy(-(10 ** x / 20) * Math.log10(2)), 2)}`).join(" ");
  const power = logs.map((x) => `${dp(sx(x), 2)},${dp(sy(Math.min(0, alpha * (Math.log10(floor) - x))), 2)}`).join(" ");
  const paretoAt = (p: number) => floor * Math.pow(p, -1 / alpha);
  const expAt = (p: number) => 20 * Math.log2(1 / p);
  const ms = (t: number) => group(Math.round(t));
  const mean = alpha > 1 ? `${ms((alpha * floor) / (alpha - 1))} ms` : "infinite: the tail falls too slowly for an average to settle";
  const ticks: [number, string][] = [
    [1, "10 ms"],
    [2, "100 ms"],
    [3, "1 s"],
    [4, "10 s"],
    [5, "100 s"],
  ];
  const levels: [number, string][] = [
    [0, "1"],
    [-2, "1 in 100"],
    [-4, "1 in 10⁴"],
    [-6, "1 in 10⁶"],
  ];
  return (
    <Frame
      title="How fast a tail falls"
      summary={`Both curves give the chance that a response takes longer than a time, and both have a median of 20 ms. The exponential tail bends down and away: every extra 20 ms halves the chance, so its p99 is ${ms(expAt(0.01))} ms, its p99.9 ${ms(expAt(0.001))} ms and its p99.99 ${ms(expAt(0.0001))} ms, and its mean is 29 ms. The power-law tail with exponent ${dp(alpha, 1)} is a straight line of slope −${dp(alpha, 1)} on these logarithmic axes: every doubling of the time divides the chance by ${dp(2 ** alpha, 2)}, so its p99 is ${ms(paretoAt(0.01))} ms, its p99.9 ${ms(paretoAt(0.001))} ms and its p99.99 ${ms(paretoAt(0.0001))} ms. Its mean is ${mean}.`}
      controls={<Slider label="tail exponent" value={tenths} onChange={setTenths} min={10} max={30} text={dp(alpha, 1)} />}
    >
      <svg viewBox="0 0 440 250" role="img" aria-label={`Two falling curves on logarithmic axes, time from 10 milliseconds to 100 seconds and chance from 1 down to 1 in a million: an exponential tail that bends down steeply and a power-law tail of exponent ${dp(alpha, 1)} that falls in a straight line`}>
        {levels.map(([logP, label]) => (
          <g key={label}>
            <line x1="50" y1={sy(logP)} x2="420" y2={sy(logP)} className="fig-guide" />
            <text x="46" y={sy(logP) + 4} textAnchor="end" className="fig-small">
              {label}
            </text>
          </g>
        ))}
        {ticks.map(([logT, label]) => (
          <text key={label} x={sx(logT)} y="240" textAnchor="middle" className="fig-small">
            {label}
          </text>
        ))}
        <line x1="50" y1="220" x2="420" y2="220" className="fig-axis" />
        <line x1="50" y1="20" x2="50" y2="220" className="fig-axis" />
        <polyline points={exponential} className="fig-line" />
        <polyline points={power} className="fig-accent-line" />
        <text x={sx(Math.log10(expAt(0.0001)))} y={sy(-4.6)} className="fig-small">
          exponential
        </text>
        <text x={sx(Math.min(4.3, Math.log10(paretoAt(0.001))))} y={sy(alpha * (Math.log10(floor) - Math.min(4.3, Math.log10(paretoAt(0.001))))) - 8} className="fig-small">
          power law
        </text>
      </svg>
    </Frame>
  );
}

const HIST_TIMES = draws(3, 400, true).map((z) => 20 * Math.exp(0.75 * z));
const HIST_TOP = 250;

/** Four hundred response times counted in buckets: too few hide the shape, too many show noise, and logarithmic buckets suit a long right tail. */
function HistogramBins(props: Props) {
  const [k, setK] = useState(clamp(Math.round(num(props.buckets, 12)), 2, 60));
  const [log, setLog] = useState(props.log === true);
  const edge = (j: number) => (log ? HIST_TOP ** (j / k) : (HIST_TOP * j) / k);
  const counts = Array.from({ length: k }, () => 0);
  for (const t of HIST_TIMES) {
    const at = log ? Math.floor((Math.log(Math.max(t, 1)) / Math.log(HIST_TOP)) * k) : Math.floor((t / HIST_TOP) * k);
    counts[clamp(at, 0, k - 1)]++;
  }
  const tallest = Math.max(...counts);
  const peak = counts.indexOf(tallest);
  const empty = counts.filter((c) => c === 0).length;
  const sorted = [...HIST_TIMES].sort((a, b) => a - b);
  const median = (sorted[199] + sorted[200]) / 2;
  const ms = (t: number) => (t < 10 ? dp(t, 1) : group(Math.round(t)));
  const sy = (c: number) => 200 - (c / tallest) * 170;
  const ticks = log ? [1, 10, 100, 250] : [0, 50, 100, 150, 200, 250];
  const tx = (t: number) => 40 + (log ? Math.log(t) / Math.log(HIST_TOP) : t / HIST_TOP) * 380;
  const width = log ? `whose edges grow by a factor of ${dp(HIST_TOP ** (1 / k), 2)}` : `each ${dp(HIST_TOP / k, 1)} ms wide`;
  return (
    <Frame
      title="Counting times in buckets"
      summary={`400 response times, from ${ms(sorted[0])} to ${ms(sorted[399])} ms with median ${ms(median)} ms, counted in ${k} buckets ${width}. The tallest bucket, from ${ms(edge(peak))} to ${ms(edge(peak + 1))} ms, holds ${tallest} of them. ${empty === 0 ? "No bucket is empty." : `${plural(empty, "bucket is", "buckets are")} empty.`}${log ? " On logarithmic buckets the long right tail is spread out and the bulk is no longer squeezed against zero." : " On equal-width buckets the bulk is squeezed to the left and the tail is a few thin bars."}`}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={log} onClick={() => setLog(!log)}>
            Use logarithmic buckets
          </button>
          <Slider label="buckets" value={k} onChange={setK} min={2} max={60} text={`${k}`} />
        </>
      }
    >
      <svg viewBox="0 0 440 240" role="img" aria-label={`A histogram of 400 response times in ${k} ${log ? "logarithmic" : "equal-width"} buckets`}>
        {counts.map((c, j) => (
          <rect key={j} x={40 + (j * 380) / k + 0.5} y={sy(c)} width={Math.max(380 / k - 1, 0.5)} height={200 - sy(c)} className="fig-accent" opacity={0.75} />
        ))}
        <line x1="40" y1="200" x2="420" y2="200" className="fig-axis" />
        {ticks.map((t) => (
          <text key={t} x={tx(t)} y="218" textAnchor="middle" className="fig-small">
            {group(t)}
          </text>
        ))}
        <text x="420" y="234" textAnchor="end" className="fig-small">
          milliseconds
        </text>
        <text x="40" y="22" className="fig-small">
          {`tallest bucket: ${tallest}`}
        </text>
      </svg>
    </Frame>
  );
}

const EST_POPULATION = draws(7, 2000, true).map((z) => 20 * Math.exp(0.75 * z));
const EST_SIZES = [5, 10, 20, 50, 100, 200, 500];
type EstKind = "mean" | "median" | "p90" | "varn" | "var1";
const EST_KINDS: EstKind[] = ["mean", "median", "p90", "varn", "var1"];
const EST_NAMES: Record<EstKind, string> = { mean: "mean", median: "median", p90: "90th percentile", varn: "variance, dividing by n", var1: "variance, dividing by n − 1" };
const estimateOf = (kind: EstKind, xs: number[]) => {
  const n = xs.length;
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  if (kind === "mean") return mean;
  if (kind === "varn" || kind === "var1") return xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (kind === "varn" ? n : n - 1);
  const sorted = [...xs].sort((a, b) => a - b);
  if (kind === "median") return n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  return sorted[Math.ceil((90 * n) / 100) - 1];
};
const EST_TRUE: Record<EstKind, number> = {
  mean: estimateOf("mean", EST_POPULATION),
  median: estimateOf("median", EST_POPULATION),
  p90: estimateOf("p90", EST_POPULATION),
  varn: estimateOf("varn", EST_POPULATION),
  var1: estimateOf("varn", EST_POPULATION),
};

/** Five hundred samples from one population: each gives an estimate, and their spread is the estimator's standard error. */
function EstimatorSpread(props: Props) {
  const [kind, setKind] = useState<EstKind>(typeof props.estimator === "string" && (EST_KINDS as string[]).includes(props.estimator) ? (props.estimator as EstKind) : "mean");
  const [sizeAt, setSizeAt] = useState(Math.max(0, EST_SIZES.indexOf(num(props.n, 10))));
  const n = EST_SIZES[sizeAt];
  const repeats = 500;
  const picks = draws(11, repeats * n, false);
  const estimates = Array.from({ length: repeats }, (_, r) => estimateOf(kind, Array.from({ length: n }, (_, i) => EST_POPULATION[Math.floor(picks[r * n + i] * EST_POPULATION.length)])));
  const truth = EST_TRUE[kind];
  const centre = estimates.reduce((a, b) => a + b, 0) / repeats;
  const spread = Math.sqrt(estimates.reduce((a, b) => a + (b - centre) ** 2, 0) / repeats);
  const top = 2.5 * truth;
  const bins = 40;
  const counts = Array.from({ length: bins }, () => 0);
  for (const e of estimates) counts[clamp(Math.floor((e / top) * bins), 0, bins - 1)]++;
  const tallest = Math.max(...counts);
  const sx = (v: number) => 40 + (Math.min(v, top) / top) * 380;
  const sy = (c: number) => 200 - (c / tallest) * 160;
  const variance = kind === "varn" || kind === "var1";
  const unit = variance ? " ms²" : " ms";
  const show = (v: number) => `${dp(v, 1)}${unit}`;
  const bias = centre - truth;
  const nextKind = EST_KINDS[(EST_KINDS.indexOf(kind) + 1) % EST_KINDS.length];
  return (
    <Frame
      title="The spread of an estimate"
      summary={`${group(repeats)} samples, each of ${n} response times drawn at random from a population of 2,000 whose ${variance ? "variance" : EST_NAMES[kind]} is ${show(truth)}. Each sample gives one estimate, the ${EST_NAMES[kind]}. The estimates average ${show(centre)}, ${Math.abs(bias) < 0.02 * truth ? "close to the truth" : `${bias < 0 ? "below" : "above"} the truth by ${show(Math.abs(bias))}`}, and spread with a standard deviation of ${show(spread)}: that spread is the standard error of this estimator for samples of ${n}.`}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setKind(nextKind)}>
            {`Estimate the ${EST_NAMES[nextKind]}`}
          </button>
          <Slider label="sample size" value={sizeAt} onChange={setSizeAt} min={0} max={EST_SIZES.length - 1} text={`${n}`} />
        </>
      }
    >
      <svg viewBox="0 0 440 240" role="img" aria-label={`A histogram of ${repeats} estimates of the ${EST_NAMES[kind]} from samples of ${n}, with the true value marked`}>
        {counts.map((c, j) => (
          <rect key={j} x={40 + (j * 380) / bins + 0.5} y={sy(c)} width={380 / bins - 1} height={200 - sy(c)} className="fig-accent" opacity={0.75} />
        ))}
        <line x1="40" y1="200" x2="420" y2="200" className="fig-axis" />
        <line x1={sx(truth)} y1="30" x2={sx(truth)} y2="200" className="fig-line" />
        <text x={sx(truth)} y="24" textAnchor="middle" className="fig-small">
          {`true ${dp(truth, 1)}`}
        </text>
        <text x="40" y="218" textAnchor="middle" className="fig-small">
          0
        </text>
        <text x="420" y="218" textAnchor="middle" className="fig-small">
          {dp(top, 0)}
        </text>
        <text x="230" y="234" textAnchor="middle" className="fig-small">
          {`estimates of the ${EST_NAMES[kind]}${unit === " ms²" ? ", ms²" : ", ms"}`}
        </text>
      </svg>
    </Frame>
  );
}

const IV_SIZES = [5, 10, 20, 50, 100, 200];
const IV_LEVELS = [80, 90, 95, 99];
const IV_Z: Record<number, number> = { 80: 1.2816, 90: 1.6449, 95: 1.96, 99: 2.5758 };

/** A hundred samples, each with its confidence interval for the mean: about the stated share of them catch the true value. */
function IntervalCatch(props: Props) {
  const [sizeAt, setSizeAt] = useState(Math.max(0, IV_SIZES.indexOf(num(props.n, 20))));
  const [levelAt, setLevelAt] = useState(Math.max(0, IV_LEVELS.indexOf(num(props.level, 95))));
  const [seed, setSeed] = useState(clamp(Math.round(num(props.seed, 0)), 0, 9));
  const n = IV_SIZES[sizeAt];
  const level = IV_LEVELS[levelAt];
  const z = IV_Z[level];
  const truth = EST_TRUE.mean;
  const picks = draws(20 + seed, 100 * n, false);
  const intervals = Array.from({ length: 100 }, (_, r) => {
    const xs = Array.from({ length: n }, (_, i) => EST_POPULATION[Math.floor(picks[r * n + i] * EST_POPULATION.length)]);
    const mean = xs.reduce((a, b) => a + b, 0) / n;
    const s = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1));
    const half = (z * s) / Math.sqrt(n);
    return { low: mean - half, high: mean + half, caught: mean - half <= truth && truth <= mean + half };
  });
  const caught = intervals.filter((i) => i.caught).length;
  const width = intervals.reduce((a, i) => a + (i.high - i.low), 0) / 100;
  const top = 60;
  const sx = (v: number) => 40 + (clamp(v, 0, top) / top) * 380;
  return (
    <Frame
      title="How often an interval catches the truth"
      summary={`100 samples of ${n} response times, each with its ${level}% interval for the mean, the sample mean plus or minus ${dp(z, 2)} standard errors. The true mean is ${dp(truth, 1)} ms. ${caught} of the 100 intervals catch it and ${100 - caught} miss, against ${level} expected. The intervals are ${dp(width, 1)} ms wide on average.${n <= 10 ? " With samples this small and times this skewed, the standard error is itself badly estimated, and fewer intervals catch the truth than promised." : ""}`}
      controls={
        <>
          <Slider label="sample size" value={sizeAt} onChange={setSizeAt} min={0} max={IV_SIZES.length - 1} text={`${n}`} />
          <Slider label="confidence" value={levelAt} onChange={setLevelAt} min={0} max={IV_LEVELS.length - 1} text={`${level}%`} />
          <Stepper label="seed" value={seed} onChange={setSeed} min={0} max={9} />
        </>
      }
    >
      <svg viewBox="0 0 440 260" role="img" aria-label={`100 horizontal intervals stacked one above another, with a vertical line at the true mean; ${caught} of them cross it`}>
        {intervals.map((iv, r) => (
          <line key={r} x1={sx(iv.low)} y1={20 + r * 2.2} x2={sx(iv.high)} y2={20 + r * 2.2} className={iv.caught ? "fig-line" : "fig-accent-line"} style={{ strokeWidth: 1.6 }} />
        ))}
        <line x1={sx(truth)} y1="14" x2={sx(truth)} y2="242" className="fig-guide" />
        <line x1="40" y1="242" x2="420" y2="242" className="fig-axis" />
        {[0, 20, 40, 60].map((t) => (
          <text key={t} x={sx(t)} y="256" textAnchor="middle" className="fig-small">
            {`${t} ms`}
          </text>
        ))}
        <text x={sx(truth) + 4} y="12" className="fig-small">
          {`true mean ${dp(truth, 1)}`}
        </text>
      </svg>
    </Frame>
  );
}

const NULL_SIZES = [10, 20, 50, 100, 200];

/** A permutation test: shuffle the labels of two groups many times, and see how often chance alone gives a difference as large as the one observed. */
function NullTest(props: Props) {
  const [effect, setEffect] = useState(clamp(Math.round(num(props.effect, 5)), 0, 15));
  const [sizeAt, setSizeAt] = useState(Math.max(0, NULL_SIZES.indexOf(num(props.n, 50))));
  const [seed, setSeed] = useState(clamp(Math.round(num(props.seed, 0)), 0, 9));
  const n = NULL_SIZES[sizeAt];
  const picks = draws(40 + seed, 2 * n, false);
  const values = picks.map((u, i) => EST_POPULATION[Math.floor(u * EST_POPULATION.length)] + (i >= n ? effect : 0));
  const meanOf = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const observed = meanOf(values.slice(n)) - meanOf(values.slice(0, n));
  const shuffles = 1000;
  const coins = draws(60 + seed, shuffles * 2 * n, false);
  const total = values.reduce((a, b) => a + b, 0);
  const diffs = Array.from({ length: shuffles }, (_, s) => {
    const pool = [...values];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(coins[s * 2 * n + i] * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const first = pool.slice(0, n).reduce((a, b) => a + b, 0);
    return (total - first) / n - first / n;
  });
  const extreme = diffs.filter((d) => Math.abs(d) >= Math.abs(observed)).length;
  const span = Math.max(15, Math.abs(observed) * 1.2, ...diffs.map((d) => Math.abs(d)));
  const bins = 40;
  const counts = Array.from({ length: bins }, () => 0);
  for (const d of diffs) counts[clamp(Math.floor(((d + span) / (2 * span)) * bins), 0, bins - 1)]++;
  const tallest = Math.max(...counts);
  const sx = (v: number) => 40 + ((v + span) / (2 * span)) * 380;
  const sy = (c: number) => 200 - (c / tallest) * 160;
  const binMid = (j: number) => -span + ((j + 0.5) * 2 * span) / bins;
  const p = extreme / shuffles;
  return (
    <Frame
      title="Could it be chance?"
      summary={`Two groups of ${n} response times from the same population, with ${effect} ms added to every time in group B. The observed difference of means, B minus A, is ${dp(observed, 2)} ms. Shuffling the ${2 * n} times between the groups at random ${group(shuffles)} times, as if the labels meant nothing, gave a difference at least that large in size ${group(extreme)} times, so the p-value is about ${dp(p, 3)}. ${p < 0.05 ? "That is below 0.05: chance alone rarely does this, and the difference is called significant at the 5% level." : "That is not below 0.05: chance alone does this often enough that the data cannot rule it out."}`}
      controls={
        <>
          <Slider label="added to group B" value={effect} onChange={setEffect} min={0} max={15} text={`${effect} ms`} />
          <Slider label="group size" value={sizeAt} onChange={setSizeAt} min={0} max={NULL_SIZES.length - 1} text={`${n}`} />
          <Stepper label="seed" value={seed} onChange={setSeed} min={0} max={9} />
        </>
      }
    >
      <svg viewBox="0 0 440 240" role="img" aria-label={`A histogram of ${group(shuffles)} differences from shuffled labels, centred on zero, with the observed difference of ${dp(observed, 1)} milliseconds marked`}>
        {counts.map((c, j) => (
          <rect key={j} x={40 + (j * 380) / bins + 0.5} y={sy(c)} width={380 / bins - 1} height={200 - sy(c)} className={Math.abs(binMid(j)) >= Math.abs(observed) ? "fig-accent" : "fig-fill"} />
        ))}
        <line x1="40" y1="200" x2="420" y2="200" className="fig-axis" />
        <line x1={sx(observed)} y1="30" x2={sx(observed)} y2="200" className="fig-line" />
        <text x={sx(observed)} y="24" textAnchor="middle" className="fig-small">
          {`observed ${dp(observed, 1)}`}
        </text>
        <text x={sx(0)} y="218" textAnchor="middle" className="fig-small">
          0
        </text>
        <text x="40" y="218" textAnchor="middle" className="fig-small">
          {`−${dp(span, 0)}`}
        </text>
        <text x="420" y="218" textAnchor="middle" className="fig-small">
          {dp(span, 0)}
        </text>
        <text x="230" y="234" textAnchor="middle" className="fig-small">
          difference of means after shuffling, ms
        </text>
      </svg>
    </Frame>
  );
}

const BOOT_SIZES = [10, 20, 50, 100, 200];
const BOOT_KINDS: EstKind[] = ["mean", "median", "p90"];

/** One sample, resampled with replacement a thousand times: the spread of the resampled estimates stands in for the spread over real samples. */
function Bootstrap(props: Props) {
  const [kind, setKind] = useState<EstKind>(typeof props.estimator === "string" && (BOOT_KINDS as string[]).includes(props.estimator) ? (props.estimator as EstKind) : "median");
  const [sizeAt, setSizeAt] = useState(Math.max(0, BOOT_SIZES.indexOf(num(props.n, 50))));
  const [seed, setSeed] = useState(clamp(Math.round(num(props.seed, 0)), 0, 9));
  const n = BOOT_SIZES[sizeAt];
  const sample = draws(80 + seed, n, false).map((u) => EST_POPULATION[Math.floor(u * EST_POPULATION.length)]);
  const resamples = 1000;
  const picks = draws(90 + seed, resamples * n, false);
  const stats = Array.from({ length: resamples }, (_, r) => estimateOf(kind, Array.from({ length: n }, (_, i) => sample[Math.floor(picks[r * n + i] * n)]))).sort((a, b) => a - b);
  const low = stats[25];
  const high = stats[resamples - 26];
  const centre = stats.reduce((a, b) => a + b, 0) / resamples;
  const se = Math.sqrt(stats.reduce((a, b) => a + (b - centre) ** 2, 0) / resamples);
  const estimate = estimateOf(kind, sample);
  const truth = EST_TRUE[kind];
  const caught = low <= truth && truth <= high;
  const top = 2.5 * truth;
  const bins = 40;
  const counts = Array.from({ length: bins }, () => 0);
  for (const s of stats) counts[clamp(Math.floor((s / top) * bins), 0, bins - 1)]++;
  const tallest = Math.max(...counts);
  const sx = (v: number) => 40 + (clamp(v, 0, top) / top) * 380;
  const sy = (c: number) => 220 - (c / tallest) * 120;
  const dotTop = 150;
  const dx = (v: number) => 40 + (clamp(v, 0, dotTop) / dotTop) * 380;
  const nextKind = BOOT_KINDS[(BOOT_KINDS.indexOf(kind) + 1) % BOOT_KINDS.length];
  return (
    <Frame
      title="Resampling one sample"
      summary={`One sample of ${n} response times, whose ${EST_NAMES[kind]} is ${dp(estimate, 1)} ms. Drawing ${n} values from it with replacement, ${group(resamples)} times, gives ${group(resamples)} resampled ${EST_NAMES[kind]}s with a standard deviation of ${dp(se, 1)} ms: the bootstrap standard error. Dropping the lowest and highest 25 leaves the 95% interval ${dp(low, 1)} to ${dp(high, 1)} ms. The population's true ${EST_NAMES[kind]}, ${dp(truth, 1)} ms, which a real analyst never sees, is ${caught ? "inside" : "outside"} it.`}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setKind(nextKind)}>
            {`Resample the ${EST_NAMES[nextKind]}`}
          </button>
          <Slider label="sample size" value={sizeAt} onChange={setSizeAt} min={0} max={BOOT_SIZES.length - 1} text={`${n}`} />
          <Stepper label="seed" value={seed} onChange={setSeed} min={0} max={9} />
        </>
      }
    >
      <svg viewBox="0 0 440 260" role="img" aria-label={`Above, the ${n} sampled times as dots; below, a histogram of ${group(resamples)} resampled ${EST_NAMES[kind]}s with the 95% interval marked`}>
        <text x="40" y="14" className="fig-small">
          {`the sample, ${n} times (0 to ${dotTop} ms)`}
        </text>
        <line x1="40" y1="40" x2="420" y2="40" className="fig-axis" />
        {sample.map((v, i) => (
          <circle key={i} cx={dx(v)} cy={34 - (i % 3) * 5} r="2.5" className="fig-accent" opacity={0.7} />
        ))}
        <text x="40" y="78" className="fig-small">
          {`resampled ${EST_NAMES[kind]}s (0 to ${dp(top, 0)} ms)`}
        </text>
        <rect x={sx(low)} y="90" width={Math.max(sx(high) - sx(low), 1)} height="130" className="fig-fill" opacity={0.5} />
        {counts.map((c, j) => (
          <rect key={j} x={40 + (j * 380) / bins + 0.5} y={sy(c)} width={380 / bins - 1} height={220 - sy(c)} className="fig-accent" opacity={0.75} />
        ))}
        <line x1="40" y1="220" x2="420" y2="220" className="fig-axis" />
        <line x1={sx(truth)} y1="90" x2={sx(truth)} y2="220" className="fig-guide" />
        <text x={sx(truth)} y="238" textAnchor="middle" className="fig-small">
          {`true ${dp(truth, 1)}`}
        </text>
        <text x={sx(low)} y="254" textAnchor="end" className="fig-small">
          {dp(low, 1)}
        </text>
        <text x={sx(high)} y="254" textAnchor="start" className="fig-small">
          {dp(high, 1)}
        </text>
      </svg>
    </Frame>
  );
}

const AB_LOOKS = [1, 2, 3, 5, 10, 15, 30];
const AB_DAYS = 30;
const AB_USERS = 1000;
const AB_BASE = 0.05;
const phi = (z: number) => {
  // The standard normal distribution function, from the error function by a rational approximation.
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
};

/** One A/B test, run for 30 days and looked at along the way, and how often stopping at the first significant look declares a winner by chance. */
function AbTest(props: Props) {
  const [lift, setLift] = useState(clamp(Math.round(num(props.lift, 0)), 0, 20));
  const [looksAt, setLooksAt] = useState(Math.max(0, AB_LOOKS.indexOf(num(props.looks, 30))));
  const [seed, setSeed] = useState(clamp(Math.round(num(props.seed, 0)), 0, 9));
  const looks = AB_LOOKS[looksAt];
  const rateB = AB_BASE * (1 + lift / 100);
  const lookDays = Array.from({ length: looks }, (_, i) => Math.round(((i + 1) * AB_DAYS) / looks));
  const run = (noise: number[]) => {
    let a = 0;
    let b = 0;
    return Array.from({ length: AB_DAYS }, (_, d) => {
      a += AB_USERS * AB_BASE + Math.sqrt(AB_USERS * AB_BASE * (1 - AB_BASE)) * noise[2 * d];
      b += AB_USERS * rateB + Math.sqrt(AB_USERS * rateB * (1 - rateB)) * noise[2 * d + 1];
      const n = AB_USERS * (d + 1);
      const pooled = (a + b) / (2 * n);
      const z = (b / n - a / n) / Math.sqrt((2 * pooled * (1 - pooled)) / n);
      return 2 * (1 - phi(Math.abs(z)));
    });
  };
  const tests = 400;
  const noise = draws(100 + seed, tests * 2 * AB_DAYS, true);
  const paths = Array.from({ length: tests }, (_, t) => run(noise.slice(t * 2 * AB_DAYS, (t + 1) * 2 * AB_DAYS)));
  const firstHit = (path: number[]) => lookDays.find((day) => path[day - 1] < 0.05);
  const declared = paths.filter((path) => firstHit(path) !== undefined).length;
  // With no true difference, show a test whose p-value dips below 0.05 along the way but not at the end: the one a peeker is fooled by.
  const fooling = lift === 0 ? paths.findIndex((path) => path.some((p) => p < 0.05) && path[AB_DAYS - 1] >= 0.05) : -1;
  const shown = paths[Math.max(0, fooling)];
  const hit = firstHit(shown);
  const dip = shown.findIndex((p) => p < 0.05);
  const sx = (day: number) => 40 + ((day - 1) / (AB_DAYS - 1)) * 380;
  const sy = (p: number) => 20 + (Math.min(3, -Math.log10(Math.max(p, 1e-3))) / 3) * 190;
  const line = shown.map((p, d) => `${dp(sx(d + 1), 2)},${dp(sy(p), 2)}`).join(" ");
  return (
    <Frame
      title="Peeking at an A/B test"
      summary={`Version B's true conversion rate is ${lift === 0 ? "the same as A's, 5%" : `${lift}% higher than A's 5%, ${dp(rateB * 100, 2)}%`}, with ${group(AB_USERS)} users a day on each version for ${AB_DAYS} days. The test is looked at ${looks === 1 ? "once, at the end" : looks === AB_DAYS ? `${looks} times, every day` : `${looks} times, every ${dp(AB_DAYS / looks, 1)} days`}. The test drawn ${dip < 0 ? "never dips below 0.05" : `dips below 0.05 on day ${dip + 1}`} and ${hit === undefined ? "is not below 0.05 at any look, so it is reported as no difference" : `is below 0.05 at the look on day ${hit}, so stopping there declares a difference`}. Over ${tests} tests like it, stopping at the first look with p below 0.05 declares the versions different in ${dp((declared / tests) * 100, 1)}% of them${lift === 0 ? ", every one a false alarm" : ""}.`}
      controls={
        <>
          <Slider label="true lift" value={lift} onChange={setLift} min={0} max={20} text={`${lift}%`} />
          <Slider label="looks" value={looksAt} onChange={setLooksAt} min={0} max={AB_LOOKS.length - 1} text={`${looks}`} />
          <Stepper label="seed" value={seed} onChange={setSeed} min={0} max={9} />
        </>
      }
    >
      <svg viewBox="0 0 440 250" role="img" aria-label={`The p-value of one A/B test day by day over ${AB_DAYS} days, on a logarithmic scale, with a line at 0.05 and the ${looks} looks marked`}>
        <line x1="40" y1={sy(0.05)} x2="420" y2={sy(0.05)} className="fig-guide" />
        <text x="420" y={sy(0.05) - 4} textAnchor="end" className="fig-small">
          0.05
        </text>
        {[1, 0.1, 0.01, 0.001].map((p) => (
          <text key={p} x="36" y={sy(p) + 4} textAnchor="end" className="fig-small">
            {p}
          </text>
        ))}
        <line x1="40" y1="20" x2="40" y2="210" className="fig-axis" />
        <line x1="40" y1="210" x2="420" y2="210" className="fig-axis" />
        <polyline points={line} className="fig-line" />
        {lookDays.map((day) => (
          <circle key={day} cx={sx(day)} cy={sy(shown[day - 1])} r={day === hit ? 5 : 3} className="fig-accent" />
        ))}
        <text x="40" y="228" textAnchor="middle" className="fig-small">
          day 1
        </text>
        <text x="420" y="228" textAnchor="middle" className="fig-small">
          {`day ${AB_DAYS}`}
        </text>
        <text x="230" y="244" textAnchor="middle" className="fig-small">
          p-value so far, at each day
        </text>
      </svg>
    </Frame>
  );
}

const BENCH_RUNS = 80;

/** Eighty timed runs of two versions on one machine, with warm-up, drift and the odd interruption: the order of the runs and the summary chosen decide what the comparison says. */
function BenchmarkRuns(props: Props) {
  const [diff, setDiff] = useState(clamp(Math.round(num(props.difference, 0)), -10, 10));
  const [interleave, setInterleave] = useState(props.interleave === true);
  const [dropWarm, setDropWarm] = useState(props.dropWarmup === true);
  const [seed, setSeed] = useState(clamp(Math.round(num(props.seed, 0)), 0, 9));
  const noise = draws(120 + seed, BENCH_RUNS * 2, false);
  const runs = Array.from({ length: BENCH_RUNS }, (_, k) => {
    const version = interleave ? (k % 2 === 0 ? "A" : "B") : k < BENCH_RUNS / 2 ? "A" : "B";
    const base = version === "A" ? 100 : 100 * (1 + diff / 100);
    const warm = k < 5 ? 0.4 * (1 - k / 5) : 0;
    const drift = (0.08 * k) / (BENCH_RUNS - 1);
    const jitter = 0.03 * -Math.log(1 - noise[2 * k]);
    const spike = noise[2 * k + 1] < 0.05 ? 0.3 : 0;
    return { k, version, time: base * (1 + warm + drift + jitter + spike) };
  });
  const kept = runs.filter((r) => !dropWarm || r.k >= 5);
  const times = (v: string) => kept.filter((r) => r.version === v).map((r) => r.time);
  const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  };
  const a = times("A");
  const b = times("B");
  const ratio = median(b) / median(a);
  const minRatio = Math.min(...b) / Math.min(...a);
  const meanRatio = b.reduce((s, x) => s + x, 0) / b.length / (a.reduce((s, x) => s + x, 0) / a.length);
  const truth = 1 + diff / 100;
  const sx = (k: number) => 40 + (k / (BENCH_RUNS - 1)) * 380;
  const sy = (t: number) => 210 - ((clamp(t, 90, 170) - 90) / 80) * 190;
  const pct = (r: number) => (Math.abs(r - 1) < 0.0005 ? "0%" : `${r > 1 ? "+" : "−"}${dp(Math.abs(r - 1) * 100, 1)}%`);
  return (
    <Frame
      title="Timing two versions"
      summary={`80 timed runs on one machine, ${interleave ? "alternating A and B" : "all 40 of A first, then all 40 of B"}, ${dropWarm ? "with the first 5 runs dropped as warm-up" : "keeping every run"}. B is truly ${diff === 0 ? "exactly as fast as A" : `${Math.abs(diff)}% ${diff > 0 ? "slower" : "faster"} than A`}. The machine warms up over the first few runs and drifts about 8% slower over the session, and about one run in twenty is interrupted. Measured B against A: median ${pct(ratio)}, minimum ${pct(minRatio)}, mean ${pct(meanRatio)}, against a true ${pct(truth)}.`}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={interleave} onClick={() => setInterleave(!interleave)}>
            Interleave the runs
          </button>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={dropWarm} onClick={() => setDropWarm(!dropWarm)}>
            Drop the first 5 runs
          </button>
          <Slider label="true difference" value={diff} onChange={setDiff} min={-10} max={10} text={`${diff > 0 ? "+" : diff < 0 ? "−" : ""}${Math.abs(diff)}%`} />
          <Stepper label="seed" value={seed} onChange={setSeed} min={0} max={9} />
        </>
      }
    >
      <svg viewBox="0 0 440 250" role="img" aria-label={`80 run times in the order they were taken, A as filled dots and B as rings, ${interleave ? "alternating" : "A first, then B"}`}>
        {[100, 120, 140, 160].map((t) => (
          <g key={t}>
            <line x1="40" y1={sy(t)} x2="420" y2={sy(t)} className="fig-grid" />
            <text x="36" y={sy(t) + 4} textAnchor="end" className="fig-small">
              {t}
            </text>
          </g>
        ))}
        <line x1="40" y1="210" x2="420" y2="210" className="fig-axis" />
        {runs.map((r) => (
          <circle key={r.k} cx={sx(r.k)} cy={sy(r.time)} r="3.5" className={r.version === "A" ? "fig-accent" : "fig-line"} opacity={dropWarm && r.k < 5 ? 0.25 : 1} />
        ))}
        <text x="40" y="228" textAnchor="middle" className="fig-small">
          run 1
        </text>
        <text x="420" y="228" textAnchor="middle" className="fig-small">
          run 80
        </text>
        <text x="230" y="244" textAnchor="middle" className="fig-small">
          filled: A, rings: B, time in ms
        </text>
      </svg>
    </Frame>
  );
}

const TREE_N = 16;
const TREE_LEVELS = 4;

function growthName(a: number, d: number): string {
  const ratio = a / 2 ** d;
  const power = (e: number) => (e === 0 ? "1" : e === 1 ? "n" : "n²");
  if (ratio < 1) return `Θ(${power(d)})`;
  if (ratio === 1) return d === 0 ? "Θ(log n)" : `Θ(${power(d)} log n)`;
  const e = Math.log2(a);
  return Number.isInteger(e) ? `Θ(${power(e)})` : `Θ(n^${dp(e, 2)}), since log₂ ${a} = ${dp(e, 2)}`;
}

/** The recursion tree of T(n) = a T(n/2) + n^d on n = 16: the work of each level, and which levels dominate. */
function RecursionTree(props: Props) {
  const [a, setA] = useState(clamp(Math.round(num(props.a, 2)), 1, 4));
  const [d, setD] = useState(clamp(Math.round(num(props.d, 1)), 0, 2));
  const levels = Array.from({ length: TREE_LEVELS + 1 }, (_, k) => {
    const count = a ** k;
    const size = TREE_N / 2 ** k;
    return { k, count, size, work: count * size ** d };
  });
  const total = levels.reduce((s, l) => s + l.work, 0);
  const widest = Math.max(...levels.map((l) => l.work));
  const ratio = a / 2 ** d;
  const ratioText = Number.isInteger(ratio) ? `${ratio}` : `${a}/${2 ** d}`;
  const cost = d === 0 ? "1 step" : d === 1 ? "as many steps as its size" : "its size squared in steps";
  const verdict =
    ratio < 1
      ? `Each level does ${ratioText} of the work of the level above, so the top level dominates and the total is ${growthName(a, d)}.`
      : ratio === 1
        ? `Each level does the same work as the level above, so every level counts and the total is the work of one level times the number of levels: ${growthName(a, d)}.`
        : `Each level does ${ratioText} times the work of the level above, so the leaves dominate and the total is ${growthName(a, d)}.`;
  const y = (k: number) => 44 + k * 34;
  return (
    <Frame
      title="The recursion tree"
      summary={`T(n) = ${a === 1 ? "" : a}T(n/2) + ${d === 0 ? "1" : d === 1 ? "n" : "n²"} on an input of size ${TREE_N}: each problem splits into ${plural(a, "half-size subproblem")}, and splitting and combining cost ${cost}. The levels, from the top, do ${levels
        .map((l) => group(l.work))
        .join(", ")} steps of work, ${group(total)} in all. ${verdict}`}
      controls={
        <>
          <Slider label="subproblems" value={a} onChange={setA} min={1} max={4} text={`${a}`} />
          <Slider label="work exponent" value={d} onChange={setD} min={0} max={2} text={`${d}`} />
        </>
      }
    >
      <svg viewBox="0 0 440 224" role="img" aria-label={`Bars for the five levels of the recursion tree, with work ${levels.map((l) => l.work).join(", ")} from top to bottom`}>
        <text x="10" y="18" className="fig-small">
          problems × size
        </text>
        <text x="96" y="18" className="fig-small">
          work of the level
        </text>
        {levels.map((l) => {
          const width = Math.max(2, (l.work / widest) * 270);
          return (
            <g key={l.k}>
              <text x="10" y={y(l.k) + 4} className="fig-small">
                {`${group(l.count)} × ${l.size}`}
              </text>
              <rect x="96" y={y(l.k) - 10} width={width} height="20" className={l.work === widest ? "fig-accent" : "fig-fill"} />
              <text x={102 + width} y={y(l.k) + 4} className="fig-small">
                {group(l.work)}
              </text>
            </g>
          );
        })}
        <text x="10" y="216" className="fig-small">
          {`total ${group(total)}`}
        </text>
      </svg>
    </Frame>
  );
}

type Road = [string, string, number];
const roadName = ([a, b, length]: Road) => `${a}–${b} ${length}`;

/** Kruskal's steps on the six towns: each road in order of length, taken unless it would close a loop. */
function kruskalSteps(): { road: Road; taken: boolean }[] {
  const group: Record<string, string> = Object.fromEntries(Object.keys(TOWNS).map((town) => [town, town]));
  const find = (town: string): string => (group[town] === town ? town : find(group[town]));
  return [...ROADS]
    .sort((x, y) => x[2] - y[2])
    .map((road) => {
      const [ra, rb] = [find(road[0]), find(road[1])];
      if (ra !== rb) group[ra] = rb;
      return { road, taken: ra !== rb };
    });
}

/** Prim's steps from A: each time, the shortest road with exactly one end in the tree. */
function primSteps(): Road[] {
  const inTree = new Set(["A"]);
  const taken: Road[] = [];
  while (inTree.size < Object.keys(TOWNS).length) {
    const leaving = ROADS.filter(([a, b]) => inTree.has(a) !== inTree.has(b)).sort((x, y) => x[2] - y[2]);
    const road = leaving[0];
    taken.push(road);
    inTree.add(road[0]);
    inTree.add(road[1]);
  }
  return taken;
}

/** The cheapest set of roads joining six towns, found two ways: shortest roads first, or growing one tree. */
function SpanningTree(props: Props) {
  const [prim, setPrim] = useState(props.method === "prim");
  const kruskal = kruskalSteps();
  const grown = primSteps();
  const most = prim ? grown.length : kruskal.length;
  const [step, setStep] = useState(clamp(Math.round(num(props.step, 0)), 0, most));
  const total = (roads: Road[]) => roads.reduce((s, r) => s + r[2], 0);
  let summary: string;
  let hot: Road[];
  let faint: Road[] = [];
  if (prim) {
    hot = grown.slice(0, step);
    const inTree = new Set(["A", ...hot.flatMap(([a, b]) => [a, b])]);
    summary = `Prim's method from A, after ${plural(step, "road")} added. In the tree: ${[...inTree].sort().join(", ")}. Roads taken: ${hot.map(roadName).join(", ") || "none yet"}, ${total(hot)} in all. ${
      step < grown.length ? `The shortest road with one end in the tree and one outside is ${roadName(grown[step])}, so it is added next.` : "Every town is joined, by 5 roads."
    }`;
  } else {
    const seen = kruskal.slice(0, step);
    hot = seen.filter((s) => s.taken).map((s) => s.road);
    faint = seen.filter((s) => !s.taken).map((s) => s.road);
    const next = kruskal[step];
    summary = `Kruskal's method, after ${step} of ${kruskal.length} roads considered, shortest first. Taken: ${hot.map(roadName).join(", ") || "none yet"}, ${total(hot)} in all. ${
      faint.length > 0 ? `Skipped, because each would close a loop: ${faint.map(roadName).join(", ")}. ` : ""
    }${
      hot.length === 5
        ? "Five roads join all six towns, so the rest can only close loops."
        : next
          ? `Next to consider: ${roadName(next.road)}.`
          : ""
    }`;
  }
  const isIn = (list: Road[], road: Road) => list.some((r) => r[0] === road[0] && r[1] === road[1]);
  return (
    <Frame
      title="The cheapest roads that join every town"
      summary={summary}
      controls={
        <>
          <Stepper label="step" value={step} onChange={setStep} min={0} max={most} />
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={() => {
              setPrim(!prim);
              setStep(0);
            }}
          >
            {prim ? "Switch to Kruskal's method" : "Switch to Prim's method"}
          </button>
        </>
      }
    >
      <svg viewBox="0 0 440 260" role="img" aria-label={`Six towns joined by nine roads with lengths, ${hot.length} of the roads taken`}>
        {ROADS.map((road) => (
          <Link key={road[0] + road[1]} from={TOWNS[road[0]]} to={TOWNS[road[1]]} label={road[2]} hot={isIn(hot, road)} faint={isIn(faint, road)} />
        ))}
        {Object.entries(TOWNS).map(([name, at]) => (
          <Dot key={name} at={at} name={name} mark={hot.some(([a, b]) => a === name || b === name) || (prim && name === "A") ? "done" : "wait"} />
        ))}
      </svg>
    </Frame>
  );
}

const BOOKINGS: [string, number, number][] = [
  ["A", 8, 19],
  ["B", 9, 12],
  ["C", 11, 13],
  ["D", 12, 15],
  ["E", 14, 16],
  ["F", 15, 18],
  ["G", 17, 19],
  ["H", 18, 20],
];
type Rule = "finish" | "start" | "shortest";
const BOOKING_RULES: Rule[] = ["finish", "start", "shortest"];
const RULE_NAMES: Record<Rule, string> = { finish: "Earliest finish first", start: "Earliest start first", shortest: "Shortest first" };
const hour = (h: number) => (h === 12 ? "12 noon" : h < 12 ? `${h} am` : `${h - 12} pm`);

/** One hall, eight bookings, and three greedy rules for choosing as many as fit without overlapping. */
function IntervalSchedule(props: Props) {
  const [rule, setRule] = useState<Rule>(BOOKING_RULES.includes(props.rule as Rule) ? (props.rule as Rule) : "finish");
  const [step, setStep] = useState(clamp(Math.round(num(props.step, 0)), 0, BOOKINGS.length));
  const order = [...BOOKINGS].sort((x, y) =>
    rule === "finish" ? x[2] - y[2] || x[1] - y[1] : rule === "start" ? x[1] - y[1] || x[2] - y[2] : x[2] - x[1] - (y[2] - y[1]) || x[1] - y[1],
  );
  const taken: string[] = [];
  const skipped: string[] = [];
  const fits = (b: [string, number, number]) => taken.every((name) => {
    const t = BOOKINGS.find((x) => x[0] === name)!;
    return b[2] <= t[1] || b[1] >= t[2];
  });
  order.slice(0, step).forEach((b) => (fits(b) ? taken.push(b[0]) : skipped.push(b[0])));
  const span = (name: string) => {
    const b = BOOKINGS.find((x) => x[0] === name)!;
    return `${name} (${hour(b[1])} to ${hour(b[2])})`;
  };
  const end = step === BOOKINGS.length;
  const summary = `${RULE_NAMES[rule]}, after ${step} of ${BOOKINGS.length} bookings considered. Taken: ${taken.map(span).join(", ") || "none yet"}. ${
    skipped.length > 0 ? `Skipped, because each overlaps one already taken: ${skipped.join(", ")}. ` : ""
  }${
    end
      ? `${plural(taken.length, "booking")} fit. The most that can fit is 4, ${taken.length === 4 ? "so this rule finds the best." : "so this rule falls short."}`
      : `Next to consider: ${span(order[step][0])}.`
  }`;
  const x = (h: number) => 40 + (h - 8) * 32;
  return (
    <Frame
      title="Choosing bookings that do not overlap"
      summary={summary}
      controls={
        <>
          <Stepper label="step" value={step} onChange={setStep} min={0} max={BOOKINGS.length} />
          {BOOKING_RULES.map((r) => (
            <button
              key={r}
              type="button"
              className="btn btn-secondary btn-small"
              aria-pressed={rule === r}
              onClick={() => {
                setRule(r);
                setStep(0);
              }}
            >
              {RULE_NAMES[r]}
            </button>
          ))}
        </>
      }
    >
      <svg viewBox="0 0 440 236" role="img" aria-label={`Eight bookings of one hall drawn as bars across the day, ${taken.length} taken`}>
        {[8, 10, 12, 14, 16, 18, 20].map((h) => (
          <g key={h}>
            <line x1={x(h)} x2={x(h)} y1="8" y2="200" className="fig-grid" />
            <text x={x(h)} y="216" textAnchor="middle" className="fig-small">
              {h > 12 ? h - 12 : h}
            </text>
          </g>
        ))}
        {BOOKINGS.map(([name, from, to], i) => (
          <g key={name}>
            <text x="14" y={26 + i * 23} className="fig-small">
              {name}
            </text>
            <rect
              x={x(from)}
              y={13 + i * 23}
              width={x(to) - x(from)}
              height="17"
              className={taken.includes(name) ? "fig-accent" : skipped.includes(name) ? "fig-ghost" : "fig-fill"}
            />
          </g>
        ))}
        <text x="40" y="232" className="fig-small">
          hour of the day
        </text>
      </svg>
    </Frame>
  );
}

const QS_N = 16;
const QS_SHUFFLED = (() => {
  const items = Array.from({ length: QS_N }, (_, i) => i + 1);
  const u = draws(42, QS_N, false);
  for (let i = QS_N - 1; i > 0; i--) {
    const j = Math.floor(u[i] * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
})();
type QsPart = { depth: number; low: number; size: number; pivot: number };

/** Quicksort's partitions, level by level; the pivot is the first item, or one chosen with the uniform numbers given. */
function quicksortRun(items: number[], random: number[] | null) {
  const parts: QsPart[] = [];
  let comparisons = 0;
  let used = 0;
  const sort = (list: number[], depth: number) => {
    if (list.length < 2) return;
    const at = random ? Math.floor(random[used++ % random.length] * list.length) : 0;
    const pivot = list[at];
    comparisons += list.length - 1;
    parts.push({ depth, low: Math.min(...list), size: list.length, pivot });
    sort(
      list.filter((x) => x < pivot),
      depth + 1,
    );
    sort(
      list.filter((x) => x > pivot),
      depth + 1,
    );
  };
  sort(items, 0);
  return { parts, comparisons, levels: parts.length === 0 ? 0 : Math.max(...parts.map((p) => p.depth)) + 1 };
}

const QS_RANDOM_RUNS = (() => {
  const counts = Array.from({ length: 1000 }, (_, k) => quicksortRun(QS_SHUFFLED, draws(1000 + k, QS_N, false)).comparisons);
  return { mean: counts.reduce((s, c) => s + c, 0) / counts.length, most: Math.max(...counts), least: Math.min(...counts) };
})();

/** Quicksort with the first item as pivot, or a random one, on numbers already in order or shuffled. */
function QuickPivot(props: Props) {
  const [sorted, setSorted] = useState(props.input !== "shuffled");
  const [random, setRandom] = useState(props.pivot === "random");
  const [seed, setSeed] = useState(clamp(Math.round(num(props.seed, 0)), 0, 9));
  const items = sorted ? Array.from({ length: QS_N }, (_, i) => i + 1) : QS_SHUFFLED;
  const run = quicksortRun(items, random ? draws(seed, QS_N, false) : null);
  const note = random
    ? `Over 1,000 runs with random pivots, on any order of the input, the comparisons average ${dp(QS_RANDOM_RUNS.mean, 1)}, ranging from ${QS_RANDOM_RUNS.least} to ${QS_RANDOM_RUNS.most}.`
    : sorted
      ? "Every pivot is the smallest item left, so each partition peels off a single item: 15 + 14 + … + 1 = 120 comparisons, the most possible."
      : "On this shuffled input the first item happens to be a fair pivot, but an input already in order would make it the worst.";
  const w = 24;
  const top = 26;
  const row = Math.min(13, 190 / Math.max(run.levels, 1));
  return (
    <Frame
      title="Quicksort's pivots"
      summary={`Quicksort on ${QS_N} numbers ${sorted ? "already in order" : "in a shuffled order"}, taking ${random ? `a pivot chosen at random, seed ${seed}` : "the first item as the pivot"}. It partitions on ${plural(run.levels, "level")} and makes ${run.comparisons} comparisons. ${note}`}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={random} onClick={() => setRandom(!random)}>
            Choose pivots at random
          </button>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={!sorted} onClick={() => setSorted(!sorted)}>
            Shuffle the input
          </button>
          {random ? <Stepper label="seed" value={seed} onChange={setSeed} min={0} max={9} /> : null}
        </>
      }
    >
      <svg viewBox="0 0 440 236" role="img" aria-label={`Quicksort's partitions drawn level by level: ${run.levels} levels and ${run.comparisons} comparisons`}>
        <text x="12" y="16" className="fig-small">
          each row is one level of partitioning; the marked square is the pivot
        </text>
        {run.parts.map((p, i) => (
          <g key={i}>
            <rect x={28 + (p.low - 1) * w} y={top + p.depth * row} width={p.size * w - 2} height={row - 3} className="fig-fill" />
            <rect x={28 + (p.pivot - 1) * w} y={top + p.depth * row} width={w - 2} height={row - 3} className="fig-accent" />
          </g>
        ))}
      </svg>
    </Frame>
  );
}

const TOUR_TOWNS: Spot[] = [
  [15, 20],
  [25, 40],
  [50, 35],
  [60, 15],
  [70, 25],
  [75, 40],
  [5, 40],
  [85, 5],
  [30, 5],
];
const TOUR_NAMES = "ABCDEFGHI";
const tourKm = (a: number, b: number) => Math.hypot(TOUR_TOWNS[a][0] - TOUR_TOWNS[b][0], TOUR_TOWNS[a][1] - TOUR_TOWNS[b][1]);
const tourLength = (order: number[]) => order.reduce((s, t, k) => s + tourKm(t, order[(k + 1) % order.length]), 0);
const tourRoads = (order: number[]) => order.map((t, k) => [t, order[(k + 1) % order.length]].sort((x, y) => x - y).join("-"));
const roadLabel = (road: string) =>
  road
    .split("-")
    .map((t) => TOUR_NAMES[Number(t)])
    .join("–");

/** The nearest-neighbour tour from A, then each 2-opt step that shortens it most, until none does. */
const TOUR_STEPS = (() => {
  const order = [0];
  const left = new Set(TOUR_TOWNS.map((_, i) => i).slice(1));
  while (left.size > 0) {
    const here = order[order.length - 1];
    let next = -1;
    for (const t of left) if (next < 0 || tourKm(here, t) < tourKm(here, next)) next = t;
    order.push(next);
    left.delete(next);
  }
  const steps = [order];
  for (;;) {
    const now = steps[steps.length - 1];
    let best: number[] | null = null;
    let bestLength = tourLength(now);
    for (let i = 1; i < now.length - 1; i++) {
      for (let j = i + 1; j < now.length; j++) {
        const trial = [...now.slice(0, i), ...now.slice(i, j + 1).reverse(), ...now.slice(j + 1)];
        const length = tourLength(trial);
        if (length < bestLength - 1e-9) {
          best = trial;
          bestLength = length;
        }
      }
    }
    if (!best) return steps;
    steps.push(best);
  }
})();

/** A tour of nine towns built by the nearest-neighbour rule, then shortened by reversing stretches of it. */
function TourHeuristic(props: Props) {
  const last = TOUR_STEPS.length - 1;
  const [step, setStep] = useState(clamp(Math.round(num(props.step, 0)), 0, last));
  const order = TOUR_STEPS[step];
  const roads = tourRoads(order);
  const before = step > 0 ? tourRoads(TOUR_STEPS[step - 1]) : roads;
  const added = roads.filter((r) => !before.includes(r));
  const removed = before.filter((r) => !roads.includes(r));
  const km = (x: number) => dp(x, 1);
  // The saving is worked from the lengths as shown, so that it is their difference to the last digit.
  const tenths = (x: number) => Math.round(x * 10) / 10;
  const names = order.map((t) => TOUR_NAMES[t]).join(", ");
  let summary: string;
  if (step === 0) {
    const [g, h] = [order[order.length - 2], order[order.length - 1]];
    summary = `The tour that nearest neighbour builds from A: ${names}, and back to A, ${km(tourLength(order))} km. Each move goes to the closest town not yet visited, so ${TOUR_NAMES[h]}, out on its own, is left until last, and the tour ends with ${km(tourKm(g, h))} km from ${TOUR_NAMES[g]} to ${TOUR_NAMES[h]} and ${km(tourKm(h, 0))} km back to A.`;
  } else {
    const prev = TOUR_STEPS[step - 1];
    const first = prev.findIndex((t, k) => t !== order[k]);
    const end = prev.length - 1 - [...prev].reverse().findIndex((t, k) => t !== order[order.length - 1 - k]);
    summary = `After ${plural(step, "improvement")}: ${names}, and back to A, ${km(tourLength(order))} km. This step reversed the stretch from ${TOUR_NAMES[prev[first]]} to ${TOUR_NAMES[prev[end]]}, replacing the roads ${removed.map(roadLabel).join(" and ")} with ${added.map(roadLabel).join(" and ")}, ${km(tenths(tourLength(prev)) - tenths(tourLength(order)))} km shorter. ${
      step === last
        ? "No single reversal shortens it further. Checking all 20,160 possible tours confirms that, here, it is also the shortest of them all."
        : "Another reversal can still shorten it."
    }`;
  }
  const at = (t: number): Spot => [30 + TOUR_TOWNS[t][0] * 4.6, 22 + TOUR_TOWNS[t][1] * 5];
  return (
    <Frame title="Building a tour, then improving it" summary={summary} controls={<Stepper label="improvements" value={step} onChange={setStep} min={0} max={last} />}>
      <svg viewBox="0 0 440 250" role="img" aria-label={`Nine towns and a tour through them, ${km(tourLength(order))} km long`}>
        <text x="12" y="16" className="fig-small">
          {`tour ${km(tourLength(order))} km`}
        </text>
        {removed.map((r) => {
          const [a, b] = r.split("-").map(Number);
          return <Link key={"x" + r} from={at(a)} to={at(b)} faint />;
        })}
        {roads.map((r) => {
          const [a, b] = r.split("-").map(Number);
          return <Link key={r} from={at(a)} to={at(b)} hot={added.includes(r)} />;
        })}
        {TOUR_TOWNS.map((_, t) => (
          <Dot key={t} at={at(t)} name={TOUR_NAMES[t]} mark={t === 0 ? "now" : "done"} />
        ))}
      </svg>
    </Frame>
  );
}

type SqlCell = string | number | null;
type SqlMark = "accent" | "fill" | "ghost" | undefined;

/** A small table drawn in SVG: a header row, then rows whose cells can be marked. NULL is written out. */
function SqlTable({ x, y, widths, head, rows, mark, title, height = 20 }: { x: number; y: number; widths: number[]; head: string[]; rows: SqlCell[][]; mark?: (row: number, col: number) => SqlMark; title?: string; height?: number }) {
  const lefts = widths.map((_, i) => x + widths.slice(0, i).reduce((s, w) => s + w, 0));
  const style = (m: SqlMark) => (m === "accent" ? "fig-accent" : m === "fill" ? "fig-fill" : m === "ghost" ? "fig-ghost" : "fig-cell");
  return (
    <g>
      {title ? (
        <text x={x} y={y - 6} className="fig-small">
          {title}
        </text>
      ) : null}
      {head.map((h, c) => (
        <text key={"h" + c} x={lefts[c] + 4} y={y + height - 7} className="fig-small" style={{ fontWeight: 600 }}>
          {h}
        </text>
      ))}
      <line x1={x} x2={x + widths.reduce((s, w) => s + w, 0) - 2} y1={y + height - 1} y2={y + height - 1} className="fig-axis" />
      {rows.map((row, r) =>
        row.map((cell, c) => {
          const m = mark?.(r, c);
          return (
            <g key={r + "-" + c}>
              <rect x={lefts[c]} y={y + (r + 1) * height + 1} width={widths[c] - 2} height={height - 2} className={style(m)} />
              <text x={lefts[c] + 4} y={y + (r + 2) * height - 6} className="fig-small" style={m === "accent" ? { fill: "var(--bg)" } : cell === null ? { fontStyle: "italic" } : undefined}>
                {cell === null ? "NULL" : String(cell)}
              </text>
            </g>
          );
        }),
      )}
    </g>
  );
}

const SHIFT_COLUMNS = ["rider", "day", "store", "slot"] as const;
const SHIFT_ROWS: string[][] = [
  ["Asha", "Mon", "Koramangala", "morning"],
  ["Asha", "Mon", "Koramangala", "evening"],
  ["Asha", "Tue", "Indiranagar", "morning"],
  ["Bilal", "Mon", "Indiranagar", "morning"],
  ["Bilal", "Tue", "Indiranagar", "evening"],
  ["Chitra", "Mon", "Koramangala", "morning"],
  ["Chitra", "Tue", "Koramangala", "evening"],
  ["Dev", "Tue", "Indiranagar", "morning"],
];
const WEDNESDAY_ROW = ["Asha", "Wed", "Koramangala", "morning"];

/** The first pair of rows that agree on every chosen column, or null when the columns tell every row apart. */
function clash(rows: string[][], cols: number[]): [number, number] | null {
  const seen = new Map<string, number>();
  for (let r = 0; r < rows.length; r++) {
    const key = cols.map((c) => rows[r][c]).join("\u0000");
    const before = seen.get(key);
    if (before !== undefined) return [before, r];
    seen.set(key, r);
  }
  return null;
}

/** Riders' shifts, where the learner chooses columns and sees whether they single out every row. */
function TableKeys(props: Props) {
  const given = Array.isArray(props.columns) ? (props.columns as string[]) : ["rider"];
  const [chosen, setChosen] = useState(SHIFT_COLUMNS.map((c) => given.includes(c)));
  const [wednesday, setWednesday] = useState(props.wednesday === true);
  const rows = wednesday ? [...SHIFT_ROWS, WEDNESDAY_ROW] : SHIFT_ROWS;
  const cols = SHIFT_COLUMNS.map((_, i) => i).filter((i) => chosen[i]);
  const names = (list: number[]) => list.map((c) => SHIFT_COLUMNS[c]).join(", ");
  const pair = clash(rows, cols);
  let summary: string;
  if (cols.length === 0) {
    summary = `No columns chosen, so all ${rows.length} rows look the same.`;
  } else if (pair) {
    summary = `Columns chosen: ${names(cols)}. Rows ${pair[0] + 1} and ${pair[1] + 1} agree on ${cols.length === 1 ? "it" : "all of them"} (${cols.map((c) => rows[pair[0]][c]).join(", ")}), so ${cols.length === 1 ? "this column does" : "these columns do"} not single out every row: not a key.`;
  } else {
    const spare = cols.filter((c) => !clash(rows, cols.filter((d) => d !== c)));
    summary = `Columns chosen: ${names(cols)}. No two of the ${rows.length} rows agree on ${cols.length === 1 ? "it" : "all of them"}, so ${cols.length === 1 ? "it singles" : "they single"} out every row: a superkey. ${
      spare.length === 0
        ? "Dropping any one column breaks this, so no smaller set works: a candidate key."
        : `It is not minimal: ${names(spare)} can be dropped and the rest still single out every row.`
    }`;
  }
  const mark = (r: number, c: number): SqlMark => (pair && (r === pair[0] || r === pair[1]) && chosen[c] ? "accent" : chosen[c] ? "fill" : undefined);
  return (
    <Frame
      title="Which columns single out a row"
      summary={summary}
      controls={
        <>
          {SHIFT_COLUMNS.map((c, i) => (
            <button
              key={c}
              type="button"
              className="btn btn-secondary btn-small"
              aria-pressed={chosen[i]}
              onClick={() => setChosen(chosen.map((on, j) => (j === i ? !on : on)))}
            >
              {c}
            </button>
          ))}
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={wednesday} onClick={() => setWednesday(!wednesday)}>
            Add Wednesday&apos;s shift
          </button>
        </>
      }
    >
      <svg viewBox="0 0 440 226" role="img" aria-label={`A table of ${rows.length} shifts with the columns rider, day, store and slot`}>
        <SqlTable x={60} y={4} widths={[70, 52, 114, 84]} head={[...SHIFT_COLUMNS]} rows={rows} mark={mark} />
        {rows.map((_, r) => (
          <text key={r} x="44" y={4 + (r + 2) * 20 - 6} textAnchor="end" className="fig-small">
            {r + 1}
          </text>
        ))}
      </svg>
    </Frame>
  );
}

const ALG_RIDERS: string[][] = [
  ["Asha", "KOR"],
  ["Bilal", "IND"],
  ["Chitra", "KOR"],
];
const ALG_STORES: string[][] = [
  ["KOR", "Meena"],
  ["IND", "Ravi"],
  ["HSR", "Tara"],
];
const ALG_MON = [["Asha"], ["Bilal"]];
const ALG_TUE = [["Bilal"], ["Chitra"]];
type AlgOp = "select" | "project" | "product" | "join" | "union" | "difference";
const ALG_OPS: AlgOp[] = ["select", "project", "product", "join", "union", "difference"];
const ALG_LABELS: Record<AlgOp, string> = { select: "σ select", project: "π project", product: "× product", join: "⋈ join", union: "∪ union", difference: "− difference" };

/** The six operations of relational algebra applied to small tables of riders, stores and rota lists. */
function AlgebraOps(props: Props) {
  const [op, setOp] = useState<AlgOp>(ALG_OPS.includes(props.op as AlgOp) ? (props.op as AlgOp) : "select");
  const product = ALG_RIDERS.flatMap((r) => ALG_STORES.map((s) => [...r, ...s]));
  const lists = op === "union" || op === "difference";
  let head: string[];
  let out: string[][];
  let summary: string;
  const names = (rows: string[][]) => rows.map((r) => r.join(" ")).join(", ");
  if (op === "select") {
    head = ["rider", "store"];
    out = ALG_RIDERS.filter((r) => r[1] === "KOR");
    summary = `σ store = 'KOR' (Riders): keep the rows of Riders whose store is KOR. ${out.length} of the ${ALG_RIDERS.length} rows pass: ${names(out)}. In SQL: select * from riders where store = 'KOR'.`;
  } else if (op === "project") {
    head = ["store"];
    out = [...new Set(ALG_RIDERS.map((r) => r[1]))].map((s) => [s]);
    summary = `π store (Riders): keep only the store column. The ${ALG_RIDERS.length} rows give ${ALG_RIDERS.map((r) => r[1]).join(", ")}, and a relation holds each row once, so the result has ${out.length} rows: ${names(out)}. In SQL: select distinct store from riders.`;
  } else if (op === "product") {
    head = ["rider", "R.store", "S.store", "manager"];
    out = product;
    summary = `Riders × Stores: every row of Riders paired with every row of Stores, ${ALG_RIDERS.length} × ${ALG_STORES.length} = ${out.length} rows. Only the ${product.filter((r) => r[1] === r[2]).length} marked pairs match a rider with the store they work at. In SQL: select * from riders cross join stores.`;
  } else if (op === "join") {
    head = ["rider", "store", "manager"];
    out = product.filter((r) => r[1] === r[2]).map((r) => [r[0], r[1], r[3]]);
    summary = `Riders ⋈ Stores: the pairs of the product that agree on store, with the store column kept once. ${out.length} rows: ${names(out)}. HSR has no rider, so it does not appear. In SQL: select * from riders natural join stores.`;
  } else if (op === "union") {
    head = ["rider"];
    out = [...new Set([...ALG_MON, ...ALG_TUE].map((r) => r[0]))].map((s) => [s]);
    summary = `Mon ∪ Tue: the riders on either day's list, each once: ${names(out)}. In SQL: select rider from mon union select rider from tue.`;
  } else {
    head = ["rider"];
    out = ALG_MON.filter((r) => !ALG_TUE.some((t) => t[0] === r[0]));
    summary = `Mon − Tue: the riders on Monday's list but not on Tuesday's: ${names(out)}. In SQL: select rider from mon except select rider from tue.`;
  }
  const passes = (r: number) => op === "select" && ALG_RIDERS[r][1] === "KOR";
  const widths = head.length === 4 ? [52, 58, 58, 58] : head.length === 3 ? [56, 48, 64] : head.length === 2 ? [56, 48] : [64];
  return (
    <Frame
      title="Operations on tables"
      summary={summary}
      controls={
        <>
          {ALG_OPS.map((o) => (
            <button key={o} type="button" className="btn btn-secondary btn-small" aria-pressed={op === o} onClick={() => setOp(o)}>
              {ALG_LABELS[o]}
            </button>
          ))}
        </>
      }
    >
      <svg viewBox="0 0 440 230" role="img" aria-label={`Relational algebra: ${ALG_LABELS[op]}, with its input tables and a result of ${out.length} rows`}>
        {lists ? (
          <>
            <SqlTable x={8} y={22} widths={[64]} head={["rider"]} rows={ALG_MON} title="Mon" height={18} />
            <SqlTable x={8} y={118} widths={[64]} head={["rider"]} rows={ALG_TUE} title="Tue" height={18} />
          </>
        ) : (
          <>
            <SqlTable x={8} y={22} widths={[56, 48]} head={["rider", "store"]} rows={ALG_RIDERS} title="Riders" height={18} mark={(r) => (passes(r) ? "accent" : undefined)} />
            {op === "product" || op === "join" ? <SqlTable x={8} y={118} widths={[48, 64]} head={["store", "manager"]} rows={ALG_STORES} title="Stores" height={18} /> : null}
          </>
        )}
        <SqlTable
          x={200}
          y={22}
          widths={widths}
          head={head}
          rows={out}
          title="Result"
          height={18}
          mark={(r) => (op === "product" && out[r][1] === out[r][2] ? "accent" : "fill")}
        />
      </svg>
    </Frame>
  );
}

const QO_ORDERS: (string | number)[][] = [
  [1, "Asha", "KOR", 250],
  [2, "Bilal", "IND", 900],
  [3, "Chitra", "KOR", 480],
  [4, "Asha", "KOR", 1200],
  [5, "Dev", "IND", 300],
  [6, "Chitra", "KOR", 650],
  [7, "Esha", "HSR", 410],
];
/** The clauses as written, each with its place in the order of evaluation. */
const QO_LINES: [string, number][] = [
  ["SELECT rider, amount", 3],
  ["FROM orders", 1],
  ["WHERE store = 'KOR'", 2],
  ["ORDER BY amount DESC", 4],
  ["LIMIT 2", 5],
];

/** One query evaluated clause by clause, in the order a database applies them rather than the order they are written. */
function QueryOrder(props: Props) {
  const [step, setStep] = useState(clamp(Math.round(num(props.step, 1)), 1, 5));
  let head = ["id", "rider", "store", "amount"];
  let rows = QO_ORDERS;
  if (step >= 2) rows = rows.filter((r) => r[2] === "KOR");
  if (step >= 3) {
    head = ["rider", "amount"];
    rows = rows.map((r) => [r[1], r[3]]);
  }
  if (step >= 4) rows = [...rows].sort((a, b) => Number(b[1]) - Number(a[1]));
  if (step >= 5) rows = rows.slice(0, 2);
  const show = (r: (string | number)[]) => r.map((v) => (typeof v === "number" ? group(v) : v)).join(" ");
  const notes = [
    "",
    `FROM orders: start with every row of the table, ${QO_ORDERS.length} rows.`,
    `WHERE store = 'KOR': keep the rows whose store is KOR, ${rows.length} of the ${QO_ORDERS.length}.`,
    "SELECT rider, amount: keep two columns of each remaining row. Only now do the result's columns exist, which is why standard SQL does not let WHERE use a name defined in SELECT.",
    "ORDER BY amount DESC: sort the rows, largest amount first. Without this the rows come in no promised order.",
    "LIMIT 2: keep the first 2 rows of the sorted result.",
  ];
  const summary = `Step ${step} of 5. ${notes[step]} The table now holds ${rows.length === 0 ? "no rows" : plural(rows.length, "row")}: ${rows.map(show).join("; ")}.`;
  return (
    <Frame title="The order a query is evaluated in" summary={summary} controls={<Stepper label="step" value={step} onChange={setStep} min={1} max={5} />}>
      <svg viewBox="0 0 440 236" role="img" aria-label={`A query of five clauses, evaluated up to step ${step}, and the table it has produced`}>
        <text x="10" y="18" className="fig-small">
          as written, with the order of evaluation
        </text>
        {QO_LINES.map(([line, order], i) => (
          <g key={line}>
            <rect x="8" y={30 + i * 26} width="200" height="22" className={order === step ? "fig-accent" : order < step ? "fig-fill" : "fig-ghost"} />
            <text x="16" y={45 + i * 26} className="fig-small" style={order === step ? { fill: "var(--bg)" } : undefined}>
              {`${order}  ${line}`}
            </text>
          </g>
        ))}
        <SqlTable x={step >= 3 ? 250 : 224} y={30} widths={step >= 3 ? [70, 70] : [30, 60, 48, 60]} head={head} rows={rows.map((r) => r.map((v) => (typeof v === "number" && v >= 1000 ? group(v) : v)))} height={22} />
      </svg>
    </Frame>
  );
}

const JM_CUSTOMERS: [number, string][] = [
  [1, "Asha"],
  [2, "Bilal"],
  [3, "Chitra"],
  [4, "Dev"],
];
const JM_ORDERS: [number, number, number][] = [
  [101, 1, 250],
  [102, 1, 480],
  [103, 3, 900],
  [104, 5, 120],
];
type JoinKind = "inner" | "left" | "right" | "full";
const JOIN_KINDS: JoinKind[] = ["inner", "left", "right", "full"];

/** Customers joined to orders by customer id, by each kind of join, with unmatched rows padded with NULL. */
function JoinMatch(props: Props) {
  const [kind, setKind] = useState<JoinKind>(JOIN_KINDS.includes(props.kind as JoinKind) ? (props.kind as JoinKind) : "inner");
  const rows: SqlCell[][] = [];
  for (const [id, name] of JM_CUSTOMERS) for (const [oid, cust, amount] of JM_ORDERS) if (cust === id) rows.push([name, oid, amount]);
  const lonelyCustomers = JM_CUSTOMERS.filter(([id]) => !JM_ORDERS.some((o) => o[1] === id));
  const lonelyOrders = JM_ORDERS.filter((o) => !JM_CUSTOMERS.some(([id]) => id === o[1]));
  const matched = rows.length;
  if (kind === "left" || kind === "full") for (const [, name] of lonelyCustomers) rows.push([name, null, null]);
  if (kind === "right" || kind === "full") for (const [oid, , amount] of lonelyOrders) rows.push([null, oid, amount]);
  const keepsCustomers = kind === "left" || kind === "full";
  const keepsOrders = kind === "right" || kind === "full";
  const what = {
    inner: "only the pairs of a customer and an order placed by that customer",
    left: "every customer, with each of their orders; a customer with no order appears once, with NULL for the order's columns",
    right: "every order, with its customer; an order whose customer is missing appears with NULL for the customer's name",
    full: "every matching pair, then every customer without an order and every order without a customer, each padded with NULL",
  }[kind];
  const show = (r: SqlCell[]) => r.map((v) => (v === null ? "NULL" : String(v))).join(" ");
  const summary = `Customers ${kind} join orders on the customer's id: ${what}. ${plural(rows.length, "row")}, ${matched} of them matched pairs: ${rows.map(show).join("; ")}. Bilal and Dev have no orders, and order 104 names customer 5, who does not exist. In SQL: select c.name, o.id, o.amount from customers c ${kind === "full" ? "full outer" : kind} join orders o on o.customer = c.id.`;
  return (
    <Frame
      title="Kinds of join"
      summary={summary}
      controls={
        <>
          {JOIN_KINDS.map((k) => (
            <button key={k} type="button" className="btn btn-secondary btn-small" aria-pressed={kind === k} onClick={() => setKind(k)}>
              {`${k} join`}
            </button>
          ))}
        </>
      }
    >
      <svg viewBox="0 0 440 196" role="img" aria-label={`Customers ${kind} join orders, giving ${rows.length} rows`}>
        <SqlTable
          x={8}
          y={22}
          widths={[26, 56]}
          head={["id", "name"]}
          rows={JM_CUSTOMERS}
          title="customers"
          mark={(r) => (lonelyCustomers.some((c) => c[0] === JM_CUSTOMERS[r][0]) ? (keepsCustomers ? "fill" : "ghost") : undefined)}
        />
        <SqlTable
          x={100}
          y={22}
          widths={[36, 40, 52]}
          head={["id", "cust", "amount"]}
          rows={JM_ORDERS}
          title="orders"
          mark={(r) => (lonelyOrders.some((o) => o[0] === JM_ORDERS[r][0]) ? (keepsOrders ? "fill" : "ghost") : undefined)}
        />
        <SqlTable x={250} y={22} widths={[60, 52, 60]} head={["name", "order", "amount"]} rows={rows} title="result" mark={(r) => (r >= matched ? "fill" : undefined)} />
      </svg>
    </Frame>
  );
}

const GB_ORDERS: [number, string, number][] = [
  [1, "KOR", 250],
  [2, "IND", 900],
  [3, "KOR", 480],
  [4, "HSR", 150],
  [5, "KOR", 1200],
  [6, "IND", 300],
  [7, "KOR", 650],
  [8, "HSR", 410],
  [9, "IND", 720],
];
type GbAggregate = "count" | "sum" | "avg" | "max";
const GB_AGGREGATES: GbAggregate[] = ["count", "sum", "avg", "max"];

/** Orders split into groups by store, each group folded into one row by an aggregate, then filtered by having. */
function GroupBuckets(props: Props) {
  const [agg, setAgg] = useState<GbAggregate>(GB_AGGREGATES.includes(props.aggregate as GbAggregate) ? (props.aggregate as GbAggregate) : "count");
  const [least, setLeast] = useState(clamp(Math.round(num(props.least, 1)), 1, 5));
  const stores = [...new Set(GB_ORDERS.map((o) => o[1]))].sort();
  const sorted = [...GB_ORDERS].sort((a, b) => a[1].localeCompare(b[1]) || a[0] - b[0]);
  const fold = (amounts: number[]) =>
    agg === "count" ? amounts.length : agg === "sum" ? amounts.reduce((s, a) => s + a, 0) : agg === "avg" ? amounts.reduce((s, a) => s + a, 0) / amounts.length : Math.max(...amounts);
  const groups = stores.map((s) => {
    const amounts = GB_ORDERS.filter((o) => o[1] === s).map((o) => o[2]);
    return { store: s, size: amounts.length, value: fold(amounts) };
  });
  const kept = groups.filter((g) => g.size >= least);
  const value = (v: number) => (agg === "avg" ? dp(v, 2) : group(v));
  const expr = agg === "count" ? "count(*)" : `${agg}(amount)`;
  const summary = `select store, ${expr} from orders group by store having count(*) >= ${least}. The ${GB_ORDERS.length} rows fall into ${groups.length} groups, one per store: ${groups.map((g) => `${g.store} with ${plural(g.size, "row")}`).join(", ")}. Each group becomes one row: ${groups.map((g) => `${g.store} ${value(g.value)}`).join(", ")}. ${
    kept.length === groups.length ? `Every group has at least ${plural(least, "row")}, so having keeps them all.` : `Having drops ${groups.filter((g) => g.size < least).map((g) => g.store).join(" and ") || "none"}, with fewer than ${least} rows.`
  } Result: ${kept.length === 0 ? "no rows" : kept.map((g) => `${g.store} ${value(g.value)}`).join("; ")}.`;
  const isKept = (s: string) => kept.some((g) => g.store === s);
  return (
    <Frame
      title="Grouping rows and folding each group"
      summary={summary}
      controls={
        <>
          {GB_AGGREGATES.map((a) => (
            <button key={a} type="button" className="btn btn-secondary btn-small" aria-pressed={agg === a} onClick={() => setAgg(a)}>
              {a === "count" ? "count(*)" : `${a}(amount)`}
            </button>
          ))}
          <Stepper label="having count(*) at least" value={least} onChange={setLeast} min={1} max={5} />
        </>
      }
    >
      <svg viewBox="0 0 440 232" role="img" aria-label={`Nine orders grouped by store into ${groups.length} groups, ${kept.length} kept by having`}>
        <SqlTable
          x={8}
          y={22}
          widths={[30, 46, 60]}
          head={["id", "store", "amount"]}
          rows={sorted.map((o) => [o[0], o[1], group(o[2])])}
          title="orders, grouped by store"
          mark={(r) => (isKept(sorted[r][1]) ? (stores.indexOf(sorted[r][1]) % 2 === 0 ? "fill" : undefined) : "ghost")}
        />
        <SqlTable
          x={250}
          y={22}
          widths={[50, 100]}
          head={["store", expr]}
          rows={groups.map((g) => [g.store, value(g.value)])}
          title="one row per group"
          mark={(r) => (isKept(groups[r].store) ? "accent" : "ghost")}
        />
      </svg>
    </Frame>
  );
}

/** A correlated subquery run for each row of the outer query: is this order above its own store's average? */
function SubquerySteps(props: Props) {
  const [step, setStep] = useState(clamp(Math.round(num(props.step, 0)), 0, GB_ORDERS.length));
  const average = (store: string) => {
    const amounts = GB_ORDERS.filter((o) => o[1] === store).map((o) => o[2]);
    return amounts.reduce((s, a) => s + a, 0) / amounts.length;
  };
  const done = GB_ORDERS.slice(0, step);
  const kept = done.filter((o) => o[2] > average(o[1]));
  const now = step > 0 ? GB_ORDERS[step - 1] : null;
  const money = (x: number) => `₹${group(Math.round(x * 100) / 100)}`;
  const summary = now
    ? `Outer row ${step} of ${GB_ORDERS.length}: order ${now[0]}, ${money(now[2])} at ${now[1]}. The subquery runs again with o.store = '${now[1]}' and returns that store's average, ${money(average(now[1]))}. ${money(now[2])} is ${now[2] > average(now[1]) ? "above it, so the order is kept" : "not above it, so the order is dropped"}. Kept so far: ${kept.length === 0 ? "none" : kept.map((o) => o[0]).join(", ")}.`
    : `select id, amount from orders o where amount > (select avg(amount) from orders where store = o.store). The subquery mentions o.store, a column of the outer row, so it is re-evaluated for each of the ${GB_ORDERS.length} orders. Step through the outer rows.`;
  return (
    <Frame title="A subquery that depends on the outer row" summary={summary} controls={<Stepper label="outer row" value={step} onChange={setStep} min={0} max={GB_ORDERS.length} />}>
      <svg viewBox="0 0 440 232" role="img" aria-label={`Nine orders checked one by one against their store's average, ${step} checked so far`}>
        <SqlTable
          x={8}
          y={22}
          widths={[30, 46, 60]}
          head={["id", "store", "amount"]}
          rows={GB_ORDERS.map((o) => [o[0], o[1], group(o[2])])}
          title="orders o (outer)"
          mark={(r) => (r === step - 1 ? "accent" : r < step ? (GB_ORDERS[r][2] > average(GB_ORDERS[r][1]) ? "fill" : "ghost") : undefined)}
        />
        <text x="168" y="36" className="fig-small">
          subquery for this row
        </text>
        <rect x="166" y="44" width="266" height="46" className={now ? "fig-fill" : "fig-ghost"} />
        <text x="174" y="62" className="fig-small">
          {now ? `select avg(amount) from orders` : "select avg(amount) from orders"}
        </text>
        <text x="174" y="80" className="fig-small">
          {now ? `where store = '${now[1]}'  →  ${money(average(now[1]))}` : "where store = o.store"}
        </text>
        <text x="168" y="118" className="fig-small">
          {now ? `${money(now[2])} > ${money(average(now[1]))}?  ${now[2] > average(now[1]) ? "yes, keep" : "no, drop"}` : ""}
        </text>
        <text x="168" y="150" className="fig-small">
          {`kept so far: ${kept.length === 0 ? "none" : kept.map((o) => o[0]).join(", ")}`}
        </text>
      </svg>
    </Frame>
  );
}

const WF_ROWS: [string, number, number][] = [
  ["KOR", 1, 1200],
  ["KOR", 2, 900],
  ["KOR", 3, 1500],
  ["KOR", 4, 800],
  ["KOR", 5, 2100],
  ["IND", 1, 700],
  ["IND", 2, 1100],
  ["IND", 3, 600],
  ["IND", 4, 1300],
  ["IND", 5, 1000],
];
type WfKind = "whole" | "running" | "moving" | "rank";
const WF_KINDS: WfKind[] = ["whole", "running", "moving", "rank"];
const WF_LABELS: Record<WfKind, string> = { whole: "store total", running: "running total", moving: "3-day average", rank: "rank" };
const WF_SQL: Record<WfKind, string[]> = {
  whole: ["sum(amount) over (", "  partition by store)"],
  running: ["sum(amount) over (", "  partition by store", "  order by day)"],
  moving: ["avg(amount) over (", "  partition by store", "  order by day", "  rows between 2 preceding", "  and current row)"],
  rank: ["rank() over (", "  partition by store", "  order by amount desc)"],
};

/** A window function: for each row, the rows of its partition that its frame covers, and the value computed from them. */
function WindowFrame(props: Props) {
  const [kind, setKind] = useState<WfKind>(WF_KINDS.includes(props.frame as WfKind) ? (props.frame as WfKind) : "running");
  const [row, setRow] = useState(clamp(Math.round(num(props.row, 3)), 1, WF_ROWS.length));
  const inFrame = (i: number, j: number) => {
    const [a, b] = [WF_ROWS[i], WF_ROWS[j]];
    if (a[0] !== b[0]) return false;
    if (kind === "whole") return true;
    if (kind === "running") return b[1] <= a[1];
    if (kind === "moving") return b[1] <= a[1] && b[1] >= a[1] - 2;
    return b[2] > a[2];
  };
  const value = (i: number) => {
    const frame = WF_ROWS.filter((_, j) => inFrame(i, j)).map((r) => r[2]);
    if (kind === "rank") return 1 + frame.length;
    const total = frame.reduce((s, a) => s + a, 0);
    return kind === "moving" ? total / frame.length : total;
  };
  const show = (v: number) => (kind === "rank" ? String(v) : group(Math.round(v * 100) / 100));
  const cur = row - 1;
  const [store, day, amount] = WF_ROWS[cur];
  const frameRows = WF_ROWS.filter((_, j) => inFrame(cur, j));
  const working =
    kind === "rank"
      ? frameRows.length === 0
        ? [`no ${store} amount is above ₹${group(amount)}`, `rank = 1`]
        : [`${store} amounts above ₹${group(amount)}:`, frameRows.map((r) => group(r[2])).join(", "), `rank = 1 + ${frameRows.length} = ${1 + frameRows.length}`]
      : [
          kind === "whole" ? `frame: all of ${store}` : `frame: ${store} days ${frameRows[0][1]} to ${day}`,
          frameRows.map((r) => group(r[2])).join(" + "),
          kind === "moving" ? `÷ ${frameRows.length} = ${show(value(cur))}` : `= ${show(value(cur))}`,
        ];
  const amounts = frameRows.map((r) => group(r[2]));
  const explain =
    kind === "rank"
      ? frameRows.length === 0
        ? `No ${store} amount is above ₹${group(amount)}, so its rank is 1.`
        : `${store} amounts above ₹${group(amount)}: ${amounts.join(", ")}, so its rank is 1 + ${frameRows.length} = ${1 + frameRows.length}.`
      : kind === "whole"
        ? `Its window is all of ${store}: ${amounts.join(" + ")} = ${show(value(cur))}.`
        : kind === "moving"
          ? `Its frame is ${store} days ${frameRows[0][1]} to ${day}: (${amounts.join(" + ")}) ÷ ${frameRows.length} = ${show(value(cur))}.`
          : `Its frame is ${store} days ${frameRows[0][1]} to ${day}: ${amounts.join(" + ")} = ${show(value(cur))}.`;
  const summary = `${WF_SQL[kind].join(" ").replace(/\s+/g, " ").replace("( ", "(")}. Each of the ${WF_ROWS.length} rows stays in the result and gains one value, computed from the rows of its own store that its window covers. Current row ${row}: ${store}, day ${day}, ₹${group(amount)}. ${explain} The other store's rows are outside this row's partition. Results for every row: ${WF_ROWS.map((r, i) => `${r[0]} day ${r[1]} ${show(value(i))}`).join(", ")}.`;
  return (
    <Frame
      title="A window over each row"
      summary={summary}
      controls={
        <>
          {WF_KINDS.map((k) => (
            <button key={k} type="button" className="btn btn-secondary btn-small" aria-pressed={kind === k} onClick={() => setKind(k)}>
              {WF_LABELS[k]}
            </button>
          ))}
          <Stepper label="current row" value={row} onChange={setRow} min={1} max={WF_ROWS.length} />
        </>
      }
    >
      <svg viewBox="0 0 440 250" role="img" aria-label={`Ten rows of daily takings for two stores, with the ${WF_LABELS[kind]} of each; row ${row} is current`}>
        <SqlTable
          x={8}
          y={22}
          widths={[44, 34, 58, 70]}
          head={["store", "day", "amount", kind === "rank" ? "rank" : kind === "moving" ? "avg" : "sum"]}
          rows={WF_ROWS.map((r, i) => [r[0], r[1], group(r[2]), show(value(i))])}
          title="takings, one row per store and day"
          mark={(r, c) => (r === cur ? (c === 3 || c === 2 ? "accent" : "fill") : WF_ROWS[r][0] !== store ? "ghost" : inFrame(cur, r) && c === 2 ? "fill" : undefined)}
        />
        {WF_SQL[kind].map((line, i) => (
          <text key={"s" + i} x="230" y={44 + i * 16} className="fig-small">
            {line}
          </text>
        ))}
        <text x="230" y="146" className="fig-small" style={{ fontWeight: 600 }}>
          {`row ${row}: ${store}, day ${day}`}
        </text>
        {working.map((line, i) => (
          <text key={"w" + i} x="230" y={166 + i * 16} className="fig-small">
            {line}
          </text>
        ))}
      </svg>
    </Frame>
  );
}

type TvValue = "true" | "unknown" | "false";
type TvOp = "and" | "or" | "not";
const TV_VALUES: TvValue[] = ["true", "unknown", "false"];
const TV_OPS: TvOp[] = ["and", "or", "not"];
const tvKnown = (v: TvValue): boolean[] => (v === "true" ? [true] : v === "false" ? [false] : [true, false]);
const tvName = (b: boolean): TvValue => (b ? "true" : "false");

/** Three-valued logic: unknown stands for "true or false, not yet known", and a result is known only when every way of filling it in agrees. */
function ThreeValued(props: Props) {
  const [op, setOp] = useState<TvOp>(TV_OPS.includes(props.op as TvOp) ? (props.op as TvOp) : "and");
  const [cellRaw, setCell] = useState(clamp(Math.round(num(props.cell, 2)), 1, 9));
  const cells = op === "not" ? 3 : 9;
  const cell = Math.min(cellRaw, cells);
  const apply = (a: boolean, b: boolean) => (op === "and" ? a && b : op === "or" ? a || b : !a);
  const outcomes = (a: TvValue, b: TvValue) => {
    const seen: { a: boolean; b: boolean; r: boolean }[] = [];
    for (const x of tvKnown(a)) for (const y of op === "not" ? [true] : tvKnown(b)) seen.push({ a: x, b: y, r: apply(x, y) });
    return seen;
  };
  const result = (a: TvValue, b: TvValue): TvValue => {
    const rs = outcomes(a, b).map((o) => o.r);
    return rs.every((r) => r) ? "true" : rs.every((r) => !r) ? "false" : "unknown";
  };
  const a = TV_VALUES[op === "not" ? cell - 1 : Math.floor((cell - 1) / 3)];
  const b = TV_VALUES[op === "not" ? 0 : (cell - 1) % 3];
  const r = result(a, b);
  const expr = (x: string, y: string) => (op === "not" ? `not ${x}` : `${x} ${op} ${y}`);
  const tries = outcomes(a, b).map((o) => `${expr(tvName(o.a), tvName(o.b))} = ${tvName(o.r)}`);
  const verdict = tries.length === 1 ? `Nothing is unknown: ordinary logic gives ${r}.` : r === "unknown" ? `The fillings disagree, so the result is unknown.` : `Every filling gives ${r}, so the result is ${r}.`;
  const table = op === "not" ? TV_VALUES.map((v) => `not ${v} is ${result(v, "true")}`).join("; ") : TV_VALUES.flatMap((x) => TV_VALUES.map((y) => `${x} ${op} ${y} is ${result(x, y)}`)).join("; ");
  const summary = `The truth table of ${op} with three values. Unknown means true or false, not yet known. Selected: ${expr(a, b)}. ${tries.length > 1 ? `Filling in the unknown: ${tries.join("; ")}. ` : ""}${verdict} The whole table: ${table}. A where clause keeps a row only when its condition is true, so unknown rows are dropped along with false ones.`;
  const x0 = 120;
  const w = op === "not" ? 120 : 96;
  const h = 32;
  const cls = (v: TvValue, selected: boolean) => (selected ? "fig-accent" : v === "unknown" ? "fig-fill" : "fig-cell");
  return (
    <Frame
      title="Logic with a third value"
      summary={summary}
      controls={
        <>
          {TV_OPS.map((o) => (
            <button key={o} type="button" className="btn btn-secondary btn-small" aria-pressed={op === o} onClick={() => setOp(o)}>
              {o}
            </button>
          ))}
          <Stepper label="cell" value={cell} onChange={setCell} min={1} max={cells} />
        </>
      }
    >
      <svg viewBox="0 0 440 248" role="img" aria-label={`Truth table of ${op} with true, unknown and false; selected cell ${expr(a, b)} is ${r}`}>
        <text x={8} y={22} className="fig-small" style={{ fontWeight: 600 }}>
          {op === "not" ? "A ↓" : "A ↓  B →"}
        </text>
        {op === "not" ? (
          <text x={x0 + 4} y={22} className="fig-small" style={{ fontWeight: 600 }}>
            not A
          </text>
        ) : (
          TV_VALUES.map((v, c) => (
            <text key={"h" + v} x={x0 + c * w + 4} y={22} className="fig-small" style={{ fontWeight: 600 }}>
              {v}
            </text>
          ))
        )}
        {TV_VALUES.map((ra, i) => (
          <g key={"r" + ra}>
            <text x={8} y={30 + i * h + 21} className="fig-small" style={{ fontWeight: 600 }}>
              {ra}
            </text>
            {(op === "not" ? ["true" as TvValue] : TV_VALUES).map((cb, j) => {
              const v = result(ra, cb);
              const selected = (op === "not" ? i + 1 : i * 3 + j + 1) === cell;
              return (
                <g key={"c" + cb}>
                  <rect x={x0 + j * w} y={30 + i * h} width={w - 4} height={h - 4} className={cls(v, selected)} />
                  <text x={x0 + j * w + 8} y={30 + i * h + 19} className="fig-small" style={selected ? { fill: "var(--bg)" } : undefined}>
                    {v}
                  </text>
                </g>
              );
            })}
          </g>
        ))}
        <text x={8} y={148} className="fig-small" style={{ fontWeight: 600 }}>
          {`${expr(a, b)} = ${r}`}
        </text>
        {tries.length > 1
          ? tries.map((t, i) => (
              <text key={"t" + i} x={8} y={168 + i * 16} className="fig-small">
                {`fill in: ${t}`}
              </text>
            ))
          : null}
        <text x={8} y={tries.length > 1 ? 168 + tries.length * 16 + 4 : 168} className="fig-small">
          {verdict}
        </text>
      </svg>
    </Frame>
  );
}

/** A ₹500 transfer between two wallets, with or without a transaction, and with or without a power cut between its two updates. */
function TransferCrash(props: Props) {
  const [inTx, setInTx] = useState(props.transaction !== false);
  const [crash, setCrash] = useState(props.crash === true);
  const statements = [
    ...(inTx ? ["begin"] : []),
    "update wallets set balance = balance - 500 where name = 'Asha'",
    ...(crash ? ["power cut, then restart"] : ["update wallets set balance = balance + 500 where name = 'Bilal'", ...(inTx ? ["commit"] : [])]),
  ];
  const last = statements.length;
  const [stepRaw, setStep] = useState(clamp(Math.round(num(props.step, 0)), 0, 4));
  const step = Math.min(stepRaw, last);
  // Replay the statements up to this step, keeping what this connection sees apart from what is safely on disk.
  let seen = { Asha: 1000, Bilal: 200 };
  let disk = { ...seen };
  for (const s of statements.slice(0, step)) {
    if (s.includes("- 500")) seen = { ...seen, Asha: seen.Asha - 500 };
    else if (s.includes("+ 500")) seen = { ...seen, Bilal: seen.Bilal + 500 };
    else if (s === "commit") disk = { ...seen };
    else if (s.startsWith("power")) seen = { ...disk };
    if (!inTx && s.startsWith("update")) disk = { ...seen };
  }
  const total = disk.Asha + disk.Bilal;
  const money = (n: number) => `₹${group(n)}`;
  const pending = inTx && step >= 1 && !statements.slice(0, step).some((s) => s === "commit" || s.startsWith("power"));
  const verdict =
    step < last
      ? pending
        ? "Inside the transaction: visible here, not yet committed."
        : "Each statement is committed as soon as it runs."
      : crash
        ? inTx
          ? "The unfinished transaction is undone: nothing lost."
          : `The debit was saved and the credit never ran: ${money(1200 - total)} lost.`
        : "Both updates are saved: the money has moved.";
  const summary = `${inTx ? "A transaction wraps the two updates." : "No transaction: each update is committed by itself."} ${crash ? "The power fails between the debit and the credit." : "Nothing fails."} Step ${step} of ${last}${step > 0 ? `, after: ${statements[step - 1]}` : ", before anything runs"}. This connection sees Asha ${money(seen.Asha)} and Bilal ${money(seen.Bilal)}; on disk, Asha ${money(disk.Asha)} and Bilal ${money(disk.Bilal)}, ${money(total)} in all. ${verdict}`;
  return (
    <Frame
      title="A transfer and a power cut"
      summary={summary}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={inTx} onClick={() => setInTx(!inTx)}>
            inside a transaction
          </button>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={crash} onClick={() => setCrash(!crash)}>
            power cut after the debit
          </button>
          <Stepper label="step" value={step} onChange={setStep} min={0} max={last} />
        </>
      }
    >
      <svg viewBox="0 0 470 236" role="img" aria-label={`Wallet transfer, step ${step} of ${last}; on disk Asha ${money(disk.Asha)}, Bilal ${money(disk.Bilal)}`}>
        {statements.map((s, i) => (
          <g key={s}>
            <rect x={8} y={8 + i * 24} width={454} height={20} className={i === step - 1 ? "fig-accent" : i < step ? "fig-fill" : "fig-ghost"} />
            <text x={14} y={22 + i * 24} className="fig-small" style={i === step - 1 ? { fill: "var(--bg)" } : undefined}>
              {s}
            </text>
          </g>
        ))}
        <SqlTable x={8} y={132} widths={[60, 70]} head={["name", "balance"]} rows={[["Asha", money(seen.Asha)], ["Bilal", money(seen.Bilal)]]} title="what this connection sees" mark={() => (pending ? "fill" : undefined)} />
        <SqlTable x={230} y={132} widths={[60, 70]} head={["name", "balance"]} rows={[["Asha", money(disk.Asha)], ["Bilal", money(disk.Bilal)]]} title="committed, safe on disk" />
        <text x={230} y={210} className="fig-small">
          {`total on disk ${money(total)}`}
        </text>
        <text x={8} y={230} className="fig-small">
          {verdict}
        </text>
      </svg>
    </Frame>
  );
}

const IX_ORDERS: [number, string][] = [
  [1, "Rohan"],
  [2, "Meera"],
  [3, "Arjun"],
  [4, "Zoya"],
  [5, "Kabir"],
  [6, "Priya"],
  [7, "Dev"],
  [8, "Nisha"],
  [9, "Arjun"],
  [10, "Tara"],
  [11, "Meera"],
  [12, "Ishaan"],
  [13, "Rohan"],
  [14, "Kabir"],
  [15, "Zoya"],
  [16, "Priya"],
];
const IX_ENTRIES = [...IX_ORDERS].sort((a, b) => a[1].localeCompare(b[1]) || a[0] - b[0]);
const IX_TARGET = "Meera";
/** The ranges a lower-bound binary search for IX_TARGET passes through, one per comparison. */
const IX_SEARCH: { lo: number; hi: number; mid: number }[] = (() => {
  const out: { lo: number; hi: number; mid: number }[] = [];
  let lo = 0;
  let hi = IX_ENTRIES.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    out.push({ lo, hi, mid });
    if (IX_ENTRIES[mid][1] < IX_TARGET) lo = mid + 1;
    else hi = mid;
  }
  out.push({ lo, hi: lo, mid: -1 });
  return out;
})();
type IxMethod = "scan" | "index";

/** Finding one customer's orders by reading every row, or by binary search in a sorted index that points to the rows. */
function IndexLookup(props: Props) {
  const [method, setMethod] = useState<IxMethod>(props.method === "index" ? "index" : "scan");
  const last = method === "scan" ? IX_ORDERS.length : IX_SEARCH.length;
  const [stepRaw, setStep] = useState(clamp(Math.round(num(props.step, 0)), 0, IX_ORDERS.length));
  const step = Math.min(stepRaw, last);
  const choose = (m: IxMethod) => {
    setMethod(m);
    setStep(0);
  };
  const first = IX_SEARCH[IX_SEARCH.length - 1].lo;
  const matches = IX_ENTRIES.map((e, i) => i).filter((i) => IX_ENTRIES[i][1] === IX_TARGET);
  const done = step === last;
  const found = method === "scan" ? IX_ORDERS.slice(0, step).filter((o) => o[1] === IX_TARGET) : done ? matches.map((i) => IX_ENTRIES[i]) : [];
  const now = method === "index" && step > 0 && step < last ? IX_SEARCH[step - 1] : null;
  const range = method === "index" && step > 0 ? IX_SEARCH[Math.min(step, IX_SEARCH.length) - 1] : null;
  const rowMark = (r: number): SqlMark => {
    if (method === "scan") return r === step - 1 ? "accent" : r < step ? (IX_ORDERS[r][1] === IX_TARGET ? "fill" : "ghost") : undefined;
    return done && IX_ORDERS[r][1] === IX_TARGET ? "accent" : undefined;
  };
  const entryMark = (i: number): SqlMark => {
    if (method === "scan" || !range) return method === "scan" ? "ghost" : undefined;
    if (done) return matches.includes(i) ? "accent" : i === matches[matches.length - 1] + 1 ? "fill" : "ghost";
    if (now && i === now.mid) return "accent";
    return i >= range.lo && i < range.hi ? "fill" : "ghost";
  };
  const h = 16;
  const rowY = (r: number) => 22 + (r + 1) * h + h / 2;
  const line =
    method === "scan"
      ? step === 0
        ? `No index: read the rows in the order they are stored.`
        : `Rows read: ${step} of ${IX_ORDERS.length}. Found so far: ${found.map((o) => `order ${o[0]}`).join(", ") || "none"}.`
      : step === 0
        ? `The index keeps every (customer, id) pair sorted by customer.`
        : now
          ? `Comparison ${step}: entry ${now.mid + 1} is ${IX_ENTRIES[now.mid][1]}, ${IX_ENTRIES[now.mid][1] < IX_TARGET ? `before ${IX_TARGET}, so look later` : `not before ${IX_TARGET}, so look here or earlier`}.`
          : `After ${IX_SEARCH.length - 1} comparisons, entries ${first + 1} and ${first + matches.length} hold ${IX_TARGET}: orders ${matches.map((i) => IX_ENTRIES[i][0]).join(" and ")}.`;
  const tail =
    method === "scan"
      ? done
        ? `A scan reads all ${IX_ORDERS.length} rows: another ${IX_TARGET} could be anywhere.`
        : ""
      : done
        ? `About log₂ ${IX_ORDERS.length} = ${Math.log2(IX_ORDERS.length)} comparisons, then one read per match.`
        : "";
  const ids = found.map((o) => o[0]).join(", ");
  const notes =
    method === "scan"
      ? step === 0
        ? ["full scan: read every", "row in stored order"]
        : [`rows read: ${step} of ${IX_ORDERS.length}`, `found: ${ids || "none"}`, ...(done ? [`another ${IX_TARGET} could`, "be anywhere"] : [])]
      : step === 0
        ? ["index search: entries", "sorted by customer"]
        : now
          ? [`comparison ${step}:`, `entry ${now.mid + 1} is ${IX_ENTRIES[now.mid][1]}`, IX_ENTRIES[now.mid][1] < IX_TARGET ? `before ${IX_TARGET}:` : `not before ${IX_TARGET}:`, IX_ENTRIES[now.mid][1] < IX_TARGET ? "look later" : "look here or earlier"]
          : [`${IX_SEARCH.length - 1} comparisons, then`, `entries ${first + 1} and ${first + matches.length} give`, `orders ${matches.map((i) => IX_ENTRIES[i][0]).join(" and ")}`];
  const summary = `select id from orders where customer = '${IX_TARGET}'. ${method === "scan" ? "Full scan of the table." : "Search in an index on customer."} Step ${step} of ${last}. ${[line, tail].filter((t) => t).join(" ")} The table holds ${IX_ORDERS.length} orders; ${IX_TARGET} placed orders ${matches.map((i) => IX_ENTRIES[i][0]).join(" and ")}.`;
  return (
    <Frame
      title="Finding rows with and without an index"
      summary={summary}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={method === "scan"} onClick={() => choose("scan")}>
            full scan
          </button>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={method === "index"} onClick={() => choose("index")}>
            index search
          </button>
          <Stepper label="step" value={step} onChange={setStep} min={0} max={last} />
        </>
      }
    >
      <svg viewBox="0 0 412 300" role="img" aria-label={`Looking for ${IX_TARGET}'s orders by ${method === "scan" ? "full scan" : "index search"}, step ${step} of ${last}`}>
        <SqlTable x={8} y={22} widths={[32, 72]} head={["id", "customer"]} rows={IX_ORDERS.map((o) => [o[0], o[1]])} title="orders, as stored" height={h} mark={(r) => rowMark(r)} />
        <SqlTable
          x={300}
          y={22}
          widths={[72, 32]}
          head={["customer", "id"]}
          rows={IX_ENTRIES.map((e) => [e[1], e[0]])}
          title="index on customer"
          height={h}
          mark={(i) => entryMark(i)}
        />
        {method === "index" && done
          ? matches.map((i) => {
              const r = IX_ORDERS.findIndex((o) => o[0] === IX_ENTRIES[i][0]);
              return <line key={i} x1={300} y1={rowY(i)} x2={112} y2={rowY(r)} className="fig-axis" />;
            })
          : null}
        {notes.map((note, i) => (
          <text key={i} x={124} y={236 + i * 16} className="fig-small">
            {note}
          </text>
        ))}
      </svg>
    </Frame>
  );
}

type ErKind = "one-one" | "one-many" | "many-many";
const ER_KINDS: ErKind[] = ["one-one", "one-many", "many-many"];
const ER_SHAPES: Record<
  ErKind,
  { label: string; left: string; right: string; verb: string; ends: [string, string]; tables: { name: string; head: string[]; rows: SqlCell[][]; key: number[] }[]; rule: string; short: string; reading: string }
> = {
  "one-one": {
    label: "one to one",
    left: "employee",
    right: "laptop",
    verb: "is issued",
    ends: ["1", "1"],
    tables: [
      { name: "employees", head: ["id", "name"], rows: [[1, "Asha"], [2, "Bilal"]], key: [] },
      { name: "laptops", head: ["id", "serial", "employee"], rows: [[7, "LX-201", 1], [8, "LX-305", 2]], key: [2] },
    ],
    rule: "laptops.employee is a foreign key declared unique",
    short: "laptops.employee: a unique foreign key",
    reading: "Each employee is issued at most one laptop, and each laptop goes to at most one employee",
  },
  "one-many": {
    label: "one to many",
    left: "teacher",
    right: "batch",
    verb: "teaches",
    ends: ["1", "N"],
    tables: [
      { name: "teachers", head: ["id", "name"], rows: [[1, "Rao"], [2, "Iyer"]], key: [] },
      { name: "batches", head: ["id", "subject", "teacher"], rows: [[10, "Physics", 1], [11, "Chemistry", 1], [12, "Maths", 2]], key: [2] },
    ],
    rule: "the foreign key batches.teacher sits on the many side",
    short: "the foreign key goes on the many side",
    reading: "Each teacher teaches any number of batches, and each batch has exactly one teacher",
  },
  "many-many": {
    label: "many to many",
    left: "student",
    right: "batch",
    verb: "enrols in",
    ends: ["M", "N"],
    tables: [
      { name: "students", head: ["id", "name"], rows: [[1, "Asha"], [2, "Bilal"]], key: [] },
      { name: "enrolments", head: ["student", "batch", "fee"], rows: [[1, 10, 4000], [1, 11, 3500], [2, 10, 4000]], key: [0, 1] },
      { name: "batches", head: ["id", "subject"], rows: [[10, "Physics"], [11, "Chemistry"]], key: [] },
    ],
    rule: "a junction table, enrolments, holds a foreign key to each side and the fee",
    short: "a junction table holds a key to each side",
    reading: "Each student enrols in any number of batches, and each batch has any number of students",
  },
};

/** An entity-relationship pair at three cardinalities, and the tables each one becomes. */
function ErCardinality(props: Props) {
  const [kind, setKind] = useState<ErKind>(ER_KINDS.includes(props.kind as ErKind) ? (props.kind as ErKind) : "one-many");
  const shape = ER_SHAPES[kind];
  const widths = (t: { head: string[]; rows: SqlCell[][] }) => t.head.map((h, c) => Math.max(34, ...[h, ...t.rows.map((r) => String(r[c]))].map((v) => v.length * 7 + 10)));
  const lefts: number[] = [];
  let x = 8;
  for (const t of shape.tables) {
    lefts.push(x);
    x += widths(t).reduce((s, w) => s + w, 0) + 16;
  }
  const summary = `${shape.label[0].toUpperCase()}${shape.label.slice(1)}: ${shape.reading}. As tables: ${shape.tables.map((t) => `${t.name} (${t.head.join(", ")})`).join("; ")}. The rule: ${shape.rule}.`;
  return (
    <Frame
      title="Relationships and the tables they become"
      summary={summary}
      controls={
        <>
          {ER_KINDS.map((k) => (
            <button key={k} type="button" className="btn btn-secondary btn-small" aria-pressed={kind === k} onClick={() => setKind(k)}>
              {ER_SHAPES[k].label}
            </button>
          ))}
        </>
      }
    >
      <svg viewBox="0 0 440 236" role="img" aria-label={`${shape.label}: ${shape.left} ${shape.verb} ${shape.right}, stored as ${shape.tables.length} tables`}>
        <rect x={20} y={12} width={110} height={32} className="fig-cell" />
        <text x={75} y={32} textAnchor="middle" className="fig-small">
          {shape.left}
        </text>
        <rect x={310} y={12} width={110} height={32} className="fig-cell" />
        <text x={365} y={32} textAnchor="middle" className="fig-small">
          {shape.right}
        </text>
        <line x1={130} y1={28} x2={310} y2={28} className="fig-axis" />
        <rect x={172} y={16} width={96} height={24} className="fig-fill" />
        <text x={220} y={32} textAnchor="middle" className="fig-small">
          {shape.verb}
        </text>
        <text x={140} y={22} className="fig-small" style={{ fontWeight: 600 }}>
          {shape.ends[0]}
        </text>
        <text x={296} y={22} className="fig-small" style={{ fontWeight: 600 }}>
          {shape.ends[1]}
        </text>
        {shape.tables.map((t, i) => (
          <SqlTable key={t.name} x={lefts[i]} y={88} widths={widths(t)} head={t.head} rows={t.rows} title={t.name} mark={(_, c) => (t.key.includes(c) ? "accent" : undefined)} />
        ))}
        <text x={8} y={222} className="fig-small">
          {shape.short}
        </text>
      </svg>
    </Frame>
  );
}

const FD_COLUMNS = ["pnr", "pax", "name", "train", "train_name", "date", "coach", "berth"];
const FD_RULES: [string[], string[]][] = [
  [["pnr"], ["train", "date"]],
  [["train"], ["train_name"]],
  [["pnr", "pax"], ["name", "coach", "berth"]],
  [["train", "date", "coach", "berth"], ["pnr", "pax"]],
];
/** The rules applied, in order, while working out the closure of a set of columns: each with the columns it added. */
const fdSteps = (start: string[]) => {
  const known = new Set(start);
  const steps: { rule: number; added: string[] }[] = [];
  let grew = true;
  while (grew) {
    grew = false;
    FD_RULES.forEach(([left, right], i) => {
      const added = right.filter((c) => !known.has(c));
      if (left.every((c) => known.has(c)) && added.length > 0) {
        added.forEach((c) => known.add(c));
        steps.push({ rule: i, added });
        grew = true;
      }
    });
  }
  return { steps, closure: known };
};

/** Working out which columns a set of columns determines, one functional dependency at a time. */
function FdClosure(props: Props) {
  const initial = Array.isArray(props.start) ? FD_COLUMNS.filter((c) => (props.start as unknown[]).includes(c)) : ["pnr", "pax"];
  const [start, setStart] = useState<string[]>(initial);
  const { steps, closure } = fdSteps(start);
  const [stepRaw, setStep] = useState(clamp(Math.round(num(props.step, 0)), 0, 8));
  const step = Math.min(stepRaw, steps.length);
  const known = new Set([...start, ...steps.slice(0, step).flatMap((s) => s.added)]);
  const done = step === steps.length;
  const full = closure.size === FD_COLUMNS.length;
  const minimal = full && start.every((c) => fdSteps(start.filter((d) => d !== c)).closure.size < FD_COLUMNS.length);
  const toggle = (c: string) => {
    setStart(start.includes(c) ? start.filter((d) => d !== c) : FD_COLUMNS.filter((d) => d === c || start.includes(d)));
    setStep(0);
  };
  const rule = (i: number) => `${FD_RULES[i][0].join(", ")} → ${FD_RULES[i][1].join(", ")}`;
  const set = (cs: string[]) => (cs.length === 0 ? "nothing" : `{${cs.join(", ")}}`);
  const now = step > 0 ? steps[step - 1] : null;
  const verdict = !done
    ? ""
    : full
      ? minimal
        ? `The closure is all ${FD_COLUMNS.length} columns, so ${set(start)} is a superkey, and dropping any one of its columns loses that: a candidate key.`
        : `The closure is all ${FD_COLUMNS.length} columns, so ${set(start)} is a superkey, but a smaller set inside it would do: not a candidate key.`
      : `No rule adds anything more, and ${FD_COLUMNS.length - closure.size} of the ${FD_COLUMNS.length} columns are missing, so ${set(start)} is not a key.`;
  const summary = `Start from ${set(start)}. ${now ? `Step ${step} of ${steps.length}: the rule ${rule(now.rule)} applies, adding ${now.added.join(", ")}.` : `Step 0 of ${steps.length}.`} Known so far: ${known.size} of ${FD_COLUMNS.length} columns, ${FD_COLUMNS.filter((c) => known.has(c)).join(", ")}. ${verdict}`;
  return (
    <Frame
      title="The closure of a set of columns"
      summary={summary}
      controls={
        <>
          {FD_COLUMNS.map((c) => (
            <button key={c} type="button" className="btn btn-secondary btn-small" aria-pressed={start.includes(c)} onClick={() => toggle(c)}>
              {c}
            </button>
          ))}
          <Stepper label="step" value={step} onChange={setStep} min={0} max={steps.length} />
        </>
      }
    >
      <svg viewBox="0 0 440 226" role="img" aria-label={`Closure of ${set(start)}: ${known.size} of ${FD_COLUMNS.length} columns known after ${step} steps`}>
        {FD_COLUMNS.map((c, i) => {
          const x = 8 + (i % 4) * 106;
          const y = 8 + Math.floor(i / 4) * 30;
          const cls = start.includes(c) ? "fig-accent" : known.has(c) ? "fig-fill" : "fig-ghost";
          return (
            <g key={c}>
              <rect x={x} y={y} width={100} height={24} className={cls} />
              <text x={x + 50} y={y + 16} textAnchor="middle" className="fig-small" style={start.includes(c) ? { fill: "var(--bg)" } : undefined}>
                {c}
              </text>
            </g>
          );
        })}
        {FD_RULES.map((_, i) => {
          const used = steps.slice(0, step).some((s) => s.rule === i);
          const current = now?.rule === i;
          return (
            <g key={i}>
              <rect x={8} y={84 + i * 24} width={424} height={20} className={current ? "fig-accent" : used ? "fig-fill" : "fig-cell"} />
              <text x={14} y={98 + i * 24} className="fig-small" style={current ? { fill: "var(--bg)" } : undefined}>
                {rule(i)}
              </text>
            </g>
          );
        })}
        <text x={8} y={200} className="fig-small">
          {`known: ${known.size} of ${FD_COLUMNS.length} columns`}
        </text>
        <text x={8} y={218} className="fig-small">
          {done ? (full ? (minimal ? "superkey, and minimal: a candidate key" : "superkey, but not minimal") : "not a superkey") : ""}
        </text>
      </svg>
    </Frame>
  );
}

const NF_FLAT: string[][] = [
  ["Asha", "98450", "P1", "Physics", "Rao", "99001", "4,000"],
  ["Asha", "98450", "C1", "Chemistry", "Iyer", "99002", "3,500"],
  ["Bilal", "98761", "P1", "Physics", "Rao", "99001", "4,000"],
  ["Chitra", "97012", "P1", "Physics", "Rao", "99001", "3,000"],
  ["Chitra", "97012", "M1", "Maths", "Rao", "99001", "3,800"],
  ["Dev", "96543", "C1", "Chemistry", "Iyer", "99002", "3,500"],
];
const NF_HEAD = ["student", "s_phone", "batch", "subject", "teacher", "t_phone", "fee"];
type NfTable = { name: string; cols: number[]; x: number; y: number; widths: number[] };
const nfRows = (cols: number[]) => {
  const seen = new Set<string>();
  return NF_FLAT.map((r) => cols.map((c) => r[c])).filter((r) => (seen.has(r.join("|")) ? false : (seen.add(r.join("|")), true)));
};
const NF_STAGES: { title: string; tables: NfTable[]; note: string; text: string }[] = [
  {
    title: "one wide table",
    tables: [{ name: "flat", cols: [0, 1, 2, 3, 4, 5, 6], x: 6, y: 22, widths: [52, 50, 40, 64, 50, 50, 40] }],
    note: "key (student, batch); Rao's phone is in 4 rows",
    text: "One table holds everything, keyed by (student, batch). Rao's phone number appears in 4 rows, Physics as P1's subject in 3, and Asha's phone in 2: changing one fact means changing many rows, and a batch with no students cannot be recorded at all.",
  },
  {
    title: "second normal form",
    tables: [
      { name: "students", cols: [0, 1], x: 6, y: 22, widths: [52, 50] },
      { name: "enrolments", cols: [0, 2, 6], x: 112, y: 22, widths: [52, 40, 40] },
      { name: "batches", cols: [2, 3, 4, 5], x: 250, y: 22, widths: [40, 64, 50, 50] },
    ],
    note: "no partial dependency; Rao's phone is in 2 rows",
    text: "student → s_phone and batch → subject, teacher depend on part of the key, so those columns move to tables of their own, students and batches. Every non-key column now depends on a whole key. But batch → teacher → t_phone still repeats Rao's phone in both of his batches.",
  },
  {
    title: "third normal form",
    tables: [
      { name: "students", cols: [0, 1], x: 6, y: 22, widths: [52, 50] },
      { name: "enrolments", cols: [0, 2, 6], x: 112, y: 22, widths: [52, 40, 40] },
      { name: "batches", cols: [2, 3, 4], x: 250, y: 22, widths: [40, 64, 50] },
      { name: "teachers", cols: [4, 5], x: 250, y: 132, widths: [50, 50] },
    ],
    note: "every fact once; Rao's phone is in 1 row",
    text: "teacher → t_phone does not start from a key of batches, so the teachers get their own table. Now every column depends on the key, the whole key and nothing but the key: each fact is stored once, Rao's phone in exactly one row, and joining the four tables gives back the original six rows.",
  },
];

/** A wide table split step by step into tables in second and third normal form. */
function NormaliseSteps(props: Props) {
  const [stage, setStage] = useState(clamp(Math.round(num(props.step, 1)), 1, NF_STAGES.length) - 1);
  const s = NF_STAGES[stage];
  const raos = (t: NfTable) => (r: number, c: number): SqlMark => {
    const rows = nfRows(t.cols);
    return t.cols[c] === 5 && rows[r][c] === "99001" ? "accent" : undefined;
  };
  const summary = `Step ${stage + 1} of ${NF_STAGES.length}, ${s.title}: ${s.tables.map((t) => `${t.name} (${t.cols.map((c) => NF_HEAD[c]).join(", ")}) with ${plural(nfRows(t.cols).length, "row")}`).join("; ")}. ${s.text}`;
  return (
    <Frame title="Splitting a table until each fact is stored once" summary={summary} controls={<Stepper label="step" value={stage + 1} onChange={(v) => setStage(v - 1)} min={1} max={NF_STAGES.length} />}>
      <svg viewBox="0 0 466 214" role="img" aria-label={`${s.title}: ${s.tables.length} tables; ${s.note}`}>
        {s.tables.map((t) => (
          <SqlTable key={t.name} x={t.x} y={t.y} widths={t.widths} head={t.cols.map((c) => NF_HEAD[c])} rows={nfRows(t.cols)} title={t.name} height={18} mark={raos(t)} />
        ))}
        <text x={8} y={206} className="fig-small">
          {s.note}
        </text>
      </svg>
    </Frame>
  );
}

const DN_VIEWS = [0.01, 0.1, 1, 10, 100, 1000];
const DN_LIKES = [10, 100, 1000];
const DN_WRITES = 2000;

/** Rows touched per hour by counting likes on every view, against keeping a count column up to date. */
function DenormTradeoff(props: Props) {
  const [views, setViews] = useState(DN_VIEWS.includes(num(props.views, 100)) ? num(props.views, 100) : 100);
  const [likes, setLikes] = useState(DN_LIKES.includes(num(props.likes, 100)) ? num(props.likes, 100) : 100);
  const reads = DN_WRITES * views;
  const plain = { read: reads * likes, write: DN_WRITES };
  const kept = { read: reads, write: DN_WRITES * 2 };
  const total = (c: { read: number; write: number }) => c.read + c.write;
  const show = (n: number) => group(Math.round(n));
  const bar = (n: number) => Math.max(4, ((Math.log10(n) - 2) / 9) * 250);
  const better = total(kept) < total(plain) ? "kept" : "plain";
  const ratio = better === "kept" ? total(plain) / total(kept) : total(kept) / total(plain);
  const even = ratio < 1.1;
  const verdict = even
    ? "Both touch about the same number of rows, so the column buys nothing."
    : better === "kept"
      ? `The count column touches ${dp(ratio, 1)} times fewer rows.`
      : `Counting on each view touches ${dp(ratio, 1)} times fewer rows; the column is not worth keeping.`;
  const summary = `${show(DN_WRITES)} likes an hour, ${show(reads)} views an hour (${group(views)} per like), ${show(likes)} likes on a typical post. Counting likes on every view reads ${show(plain.read)} rows and writes ${show(plain.write)}: ${show(total(plain))} in all. Keeping a likes column reads ${show(kept.read)} rows and writes ${show(kept.write)}, since each like also updates its post: ${show(total(kept))} in all. ${verdict}`;
  const rows: [string, { read: number; write: number }][] = [
    ["count on every view", plain],
    ["keep a likes column", kept],
  ];
  return (
    <Frame
      title="Reading a count against keeping one"
      summary={summary}
      controls={
        <>
          <span className="fig-stepper">
            <span className="label">views per like</span>
          </span>
          {DN_VIEWS.map((v) => (
            <button key={v} type="button" className="btn btn-secondary btn-small" aria-pressed={views === v} aria-label={`${group(v)} views per like`} onClick={() => setViews(v)}>
              {group(v)}
            </button>
          ))}
          <span className="fig-stepper">
            <span className="label">likes per post</span>
          </span>
          {DN_LIKES.map((l) => (
            <button key={l} type="button" className="btn btn-secondary btn-small" aria-pressed={likes === l} aria-label={`${group(l)} likes per post`} onClick={() => setLikes(l)}>
              {group(l)}
            </button>
          ))}
        </>
      }
    >
      <svg viewBox="0 0 440 176" role="img" aria-label={`Rows touched per hour: ${show(total(plain))} counting on every view, ${show(total(kept))} keeping a column`}>
        <text x={8} y={16} className="fig-small">
          rows touched per hour, on a log scale
        </text>
        {rows.map(([label, c], i) => (
          <g key={label}>
            <text x={8} y={46 + i * 56} className="fig-small" style={{ fontWeight: 600 }}>
              {label}
            </text>
            <rect x={8} y={54 + i * 56} width={bar(total(c))} height={16} className={(better === "kept") === (i === 1) ? "fig-accent" : "fig-fill"} />
            <text x={16 + bar(total(c))} y={66 + i * 56} className="fig-small">
              {show(total(c))}
            </text>
            <text x={8} y={84 + i * 56} className="fig-small">
              {`${show(c.read)} read, ${show(c.write)} written`}
            </text>
          </g>
        ))}
        <text x={8} y={168} className="fig-small">
          {even ? "about the same either way" : better === "kept" ? `the column is ${dp(ratio, 1)} times cheaper` : `counting is ${dp(ratio, 1)} times cheaper`}
        </text>
      </svg>
    </Frame>
  );
}

const DE_ORDERS = [1, 10, 100, 1000];

/** One line of a document listing, indented by its leading spaces, on a marked band when lit. */
function DeLine({ x, y, line, lit }: { x: number; y: number; line: string; lit: boolean }) {
  const indent = line.length - line.trimStart().length;
  const text = line.trimStart();
  const left = x + indent * 6.6;
  return (
    <g>
      {lit && <rect x={left - 3} y={y - 11} width={text.length * 6.6 + 6} height={15} className="fig-accent" />}
      <text x={left} y={y} className="fig-small" style={lit ? { fill: "var(--bg)" } : undefined}>
        {text}
      </text>
    </g>
  );
}

/** One order document with its customer embedded or referenced, and what each choice costs to read and to change. */
function DocEmbed(props: Props) {
  const [mode, setMode] = useState(props.mode === "reference" ? "reference" : "embed");
  const [orders, setOrders] = useState(DE_ORDERS.includes(num(props.orders, 10)) ? num(props.orders, 10) : 10);
  const embed = mode === "embed";
  const reads = embed ? 1 : 2;
  const writes = embed ? orders : 1;
  const ordersText = `${group(orders)} ${orders === 1 ? "order" : "orders"}`;
  const summary = embed
    ? `The customer is embedded: each of Asha's ${ordersText} carries its own copy of her name and phone number, next to its lines. Showing an order with its customer takes ${reads} read. When Asha changes her phone number, ${group(writes)} ${writes === 1 ? "document" : "documents"} must be rewritten, and any one missed shows the old number.`
    : `The customer is referenced: each of Asha's ${ordersText} stores only her id, 77, next to its lines, and her name and phone number live once, in customer document 77. Showing an order with its customer takes ${reads} reads. When Asha changes her phone number, ${group(writes)} document is rewritten.`;
  const order = embed
    ? ['{ "id": 5012,', '  "customer": {', '    "name": "Asha Rao",', '    "phone": "98450 12345" },', '  "lines": [', '    { "item": "dosa", "qty": 2 },', '    { "item": "coffee", "qty": 1 } ] }']
    : ['{ "id": 5012,', '  "customer": 77,', '  "lines": [', '    { "item": "dosa", "qty": 2 },', '    { "item": "coffee", "qty": 1 } ] }'];
  const lit = (line: string) => line.includes('"phone"');
  const customer = ['{ "id": 77,', '  "name": "Asha Rao",', '  "phone": "98450 12345" }'];
  const stats: [string, string][] = [
    ["reads to show an order with its customer", group(reads)],
    ["writes when Asha changes her phone number", group(writes)],
    ["copies of her phone number", group(embed ? orders : 1)],
  ];
  return (
    <Frame
      title="Embedding or referencing the customer"
      summary={summary}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={embed} onClick={() => setMode("embed")}>
            embed
          </button>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={!embed} onClick={() => setMode("reference")}>
            reference
          </button>
          <span className="fig-stepper">
            <span className="label">Asha&apos;s orders</span>
          </span>
          {DE_ORDERS.map((n) => (
            <button key={n} type="button" className="btn btn-secondary btn-small" aria-pressed={orders === n} aria-label={`${group(n)} ${n === 1 ? "order" : "orders"}`} onClick={() => setOrders(n)}>
              {group(n)}
            </button>
          ))}
        </>
      }
    >
      <svg viewBox="0 0 480 250" role="img" aria-label={`${embed ? "Embedded" : "Referenced"} customer: ${plural(reads, "read", "reads")} to show an order, ${group(writes)} ${writes === 1 ? "write" : "writes"} to change her phone number`}>
        <text x={8} y={16} className="fig-small" style={{ fontWeight: 600 }}>
          {embed ? `order 5012, one of ${ordersText}` : "order 5012"}
        </text>
        {order.map((line, i) => (
          <DeLine key={i} x={8} y={36 + i * 15} line={line} lit={lit(line)} />
        ))}
        {!embed && (
          <g>
            <text x={286} y={16} className="fig-small" style={{ fontWeight: 600 }}>
              customer 77, stored once
            </text>
            {customer.map((line, i) => (
              <DeLine key={i} x={286} y={36 + i * 15} line={line} lit={lit(line)} />
            ))}
            <line x1={132} y1={47} x2={278} y2={32} className="fig-guide" />
          </g>
        )}
        <line x1={8} y1={148} x2={472} y2={148} className="fig-line" />
        {stats.map(([label, value], i) => (
          <g key={label}>
            <text x={8} y={170 + i * 20} className="fig-small">
              {label}
            </text>
            <text x={420} y={170 + i * 20} className="fig-small" style={{ fontWeight: 600 }}>
              {value}
            </text>
          </g>
        ))}
        <text x={8} y={240} className="fig-small">
          {embed ? "one read, but every copy must be rewritten on a change" : "one write on a change, but one more read to show"}
        </text>
      </svg>
    </Frame>
  );
}

const GH_PEOPLE: [string, number, number][] = [
  ["Asha", 40, 110],
  ["Bilal", 140, 46],
  ["Chitra", 140, 110],
  ["Dev", 140, 174],
  ["Esha", 240, 30],
  ["Farhan", 240, 98],
  ["Gita", 240, 174],
  ["Hari", 340, 64],
  ["Isha", 340, 174],
  ["Jai", 430, 118],
];
const GH_LINKS: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [1, 2], [1, 4], [2, 5], [3, 6], [4, 7], [5, 7], [6, 8], [7, 9], [8, 9],
];

/** Breadth-first distance of every person from Asha along the friendships. */
function ghDistances(): number[] {
  const dist = GH_PEOPLE.map(() => -1);
  dist[0] = 0;
  const queue = [0];
  while (queue.length > 0) {
    const p = queue.shift()!;
    for (const [a, b] of GH_LINKS) {
      const q = a === p ? b : b === p ? a : -1;
      if (q >= 0 && dist[q] < 0) {
        dist[q] = dist[p] + 1;
        queue.push(q);
      }
    }
  }
  return dist;
}

/** People within a number of hops of Asha in a friendship graph, and the self-joins a query needs to find them. */
function GraphHops(props: Props) {
  const [hops, setHops] = useState(clamp(Math.round(num(props.hops, 1)), 0, 4));
  const dist = ghDistances();
  const reached = GH_PEOPLE.filter((_, i) => dist[i] <= hops).map(([name]) => name);
  const others = reached.slice(1);
  const summary = `Within ${plural(hops, "hop", "hops")} of Asha: ${others.length === 0 ? "nobody but Asha herself" : others.join(", ")}, ${plural(others.length, "person", "people")} besides Asha. In tables, a query for exactly this reach joins the friendships table to itself ${plural(hops, "time", "times")}, one join per hop; a recursive query lets the number of hops be decided by the data.`;
  return (
    <Frame
      title="Hops through a friendship graph"
      summary={summary}
      controls={
        <Stepper label="hops" value={hops} min={0} max={4} onChange={setHops} />
      }
    >
      <svg viewBox="0 0 470 230" role="img" aria-label={`${plural(others.length, "person", "people")} within ${plural(hops, "hop", "hops")} of Asha`}>
        {GH_LINKS.map(([a, b]) => {
          const walked = Math.min(dist[a], dist[b]) < hops;
          return (
            <line key={`${a}-${b}`} x1={GH_PEOPLE[a][1]} y1={GH_PEOPLE[a][2]} x2={GH_PEOPLE[b][1]} y2={GH_PEOPLE[b][2]} className={walked ? "fig-accent-line" : "fig-grid"} />
          );
        })}
        {GH_PEOPLE.map(([name, x, y], i) => {
          const lit = dist[i] <= hops;
          return (
            <g key={name}>
              <rect x={x - 26} y={y - 11} width={52} height={22} rx={4} className={lit ? "fig-accent" : "fig-fill"} />
              <text x={x} y={y + 4} textAnchor="middle" className="fig-small" style={lit ? { fill: "var(--bg)" } : { fill: "var(--text)" }}>
                {name}
              </text>
            </g>
          );
        })}
        <text x={8} y={222} className="fig-small">
          {`${plural(others.length, "person", "people")} reached, ${plural(hops, "self-join", "self-joins")} of the friendships table`}
        </text>
      </svg>
    </Frame>
  );
}

type SvCell = { ok: boolean; note: string };
const SV_CHANGES: { key: string; label: string; what: string; cells: [SvCell, SvCell, SvCell, SvCell] }[] = [
  {
    key: "add-optional",
    label: "add optional",
    what: "version 2 adds a nickname field, with a default of none when it is missing",
    cells: [
      { ok: true, note: "same version" },
      { ok: true, note: "no nickname: default" },
      { ok: true, note: "ignores nickname" },
      { ok: true, note: "same version" },
    ],
  },
  {
    key: "add-required",
    label: "add required",
    what: "version 2 adds a nickname field that every reader expects to find",
    cells: [
      { ok: true, note: "same version" },
      { ok: false, note: "nickname missing" },
      { ok: true, note: "ignores nickname" },
      { ok: true, note: "same version" },
    ],
  },
  {
    key: "remove",
    label: "remove",
    what: "version 2 stops writing the phone field, which version 1 requires",
    cells: [
      { ok: true, note: "same version" },
      { ok: true, note: "ignores phone" },
      { ok: false, note: "phone missing" },
      { ok: true, note: "same version" },
    ],
  },
  {
    key: "rename",
    label: "rename",
    what: "version 2 renames the mobile field to phone",
    cells: [
      { ok: true, note: "same version" },
      { ok: false, note: "phone missing" },
      { ok: false, note: "mobile missing" },
      { ok: true, note: "same version" },
    ],
  },
];

/** Which pairs of writer and reader versions still work after one change to a record's shape. */
function SchemaVersions(props: Props) {
  const start = SV_CHANGES.findIndex((c) => c.key === props.change);
  const [index, setIndex] = useState(start >= 0 ? start : 0);
  const change = SV_CHANGES[index];
  const [, backward, forward] = change.cells;
  const verdict = (ok: boolean) => (ok ? "works" : "fails");
  const kind =
    backward.ok && forward.ok
      ? "The change is backward and forward compatible, so old and new versions can run side by side."
      : backward.ok
        ? "The change is backward compatible only: new code reads old data, but old code cannot read new data."
        : forward.ok
          ? "The change is forward compatible only: old code reads new data, but new code cannot read old data."
          : "The change is neither backward nor forward compatible, so it cannot be made in one step while both versions run.";
  const summary = `Change: ${change.what}. New code reading old data ${verdict(backward.ok)}: ${backward.note}. Old code reading new data ${verdict(forward.ok)}: ${forward.note}. ${kind}`;
  const cx = [184, 330];
  const cy = [80, 150];
  return (
    <Frame
      title="Old and new versions reading each other's data"
      summary={summary}
      controls={
        <>
          {SV_CHANGES.map((c, i) => (
            <button key={c.key} type="button" className="btn btn-secondary btn-small" aria-pressed={index === i} onClick={() => setIndex(i)}>
              {c.label}
            </button>
          ))}
        </>
      }
    >
      <svg viewBox="0 0 410 236" role="img" aria-label={`New code reading old data ${verdict(backward.ok)}; old code reading new data ${verdict(forward.ok)}`}>
        <text x={257} y={16} textAnchor="middle" className="fig-small" style={{ fontWeight: 600 }}>
          read by
        </text>
        <text x={cx[0]} y={36} textAnchor="middle" className="fig-small">
          version 1 code
        </text>
        <text x={cx[1]} y={36} textAnchor="middle" className="fig-small">
          version 2 code
        </text>
        <text x={8} y={cy[0] - 18} className="fig-small" style={{ fontWeight: 600 }}>
          written by
        </text>
        {[0, 1].map((w) => (
          <text key={w} x={8} y={cy[w] + 4} className="fig-small">
            {`version ${w + 1} data`}
          </text>
        ))}
        {[0, 1].map((w) =>
          [0, 1].map((r) => {
            const cell = change.cells[w * 2 + r];
            return (
              <g key={`${w}-${r}`}>
                <rect x={cx[r] - 70} y={cy[w] - 28} width={140} height={56} rx={4} className={cell.ok ? "fig-fill" : "fig-accent"} />
                <text x={cx[r]} y={cy[w] - 4} textAnchor="middle" className="fig-small" style={{ fontWeight: 600, fill: cell.ok ? "var(--text)" : "var(--bg)" }}>
                  {cell.ok ? "works" : "fails"}
                </text>
                <text x={cx[r]} y={cy[w] + 14} textAnchor="middle" className="fig-small" style={{ fill: cell.ok ? "var(--text)" : "var(--bg)" }}>
                  {cell.note}
                </text>
              </g>
            );
          }),
        )}
        <text x={8} y={206} className="fig-small">
          {`backward (v2 code, v1 data): ${verdict(backward.ok)}`}
        </text>
        <text x={8} y={224} className="fig-small">
          {`forward (v1 code, v2 data): ${verdict(forward.ok)}`}
        </text>
      </svg>
    </Frame>
  );
}

const IS_CALLERS = ["checkout", "refunds", "top-ups", "subscriptions", "invoices", "payouts", "tips", "gift cards"];
const IS_PROVIDERS = ["UPI", "cards", "net banking", "pay later", "EMI", "wallet"];

/** Places in an app that take payments, wired to payment providers directly or through one interface. */
function InterfaceSwap(props: Props) {
  const [callers, setCallers] = useState(clamp(Math.round(num(props.callers, 4)), 1, IS_CALLERS.length));
  const [providers, setProviders] = useState(clamp(Math.round(num(props.providers, 3)), 1, IS_PROVIDERS.length));
  const [shared, setShared] = useState(props.mode === "interface");
  const pieces = shared ? callers + providers : callers * providers;
  const added = shared ? 1 : callers;
  const summary = shared
    ? `${plural(callers, "place", "places")} in the app take payments through one PaymentProvider interface, and each of the ${plural(providers, "provider", "providers")} sits behind it in one adapter: ${callers} + ${providers} = ${pieces} pieces of code, and only the ${plural(providers, "adapter", "adapters")} know anything about a provider. Adding another provider means writing 1 new adapter; no caller changes.`
    : `${plural(callers, "place", "places")} in the app each talk to each of the ${plural(providers, "provider", "providers")} directly: ${callers} × ${providers} = ${pieces} pieces of provider-specific code. Adding another provider means writing ${plural(added, "new piece", "new pieces")}, one in every place that takes payments.`;
  const cy = (i: number, n: number) => 130 + (i - (n - 1) / 2) * 27;
  return (
    <Frame
      title="Calling providers directly or through an interface"
      summary={summary}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={!shared} onClick={() => setShared(false)}>
            direct
          </button>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={shared} onClick={() => setShared(true)}>
            through an interface
          </button>
          <Stepper label="places" value={callers} min={1} max={IS_CALLERS.length} onChange={setCallers} />
          <Stepper label="providers" value={providers} min={1} max={IS_PROVIDERS.length} onChange={setProviders} />
        </>
      }
    >
      <svg viewBox="0 0 460 270" role="img" aria-label={`${pieces} pieces of code connecting ${plural(callers, "place", "places")} to ${plural(providers, "provider", "providers")}${shared ? " through one interface" : " directly"}`}>
        {IS_CALLERS.slice(0, callers).map((name, i) =>
          shared ? (
            <line key={`l${name}`} x1={112} y1={cy(i, callers)} x2={178} y2={130} className="fig-axis" />
          ) : (
            IS_PROVIDERS.slice(0, providers).map((p, j) => <line key={`l${name}${p}`} x1={112} y1={cy(i, callers)} x2={348} y2={cy(j, providers)} className="fig-axis" />)
          ),
        )}
        {shared &&
          IS_PROVIDERS.slice(0, providers).map((p, j) => <line key={`r${p}`} x1={282} y1={130} x2={348} y2={cy(j, providers)} className="fig-accent-line" />)}
        {shared && (
          <g>
            <rect x={178} y={112} width={104} height={36} rx={4} className="fig-accent" />
            <text x={230} y={127} textAnchor="middle" className="fig-small" style={{ fill: "var(--bg)", fontWeight: 600 }}>
              PaymentProvider
            </text>
            <text x={230} y={141} textAnchor="middle" className="fig-small" style={{ fill: "var(--bg)" }}>
              charge, refund
            </text>
          </g>
        )}
        {IS_CALLERS.slice(0, callers).map((name, i) => (
          <g key={name}>
            <rect x={8} y={cy(i, callers) - 10} width={104} height={20} rx={4} className="fig-fill" />
            <text x={60} y={cy(i, callers) + 4} textAnchor="middle" className="fig-small" style={{ fill: "var(--text)" }}>
              {name}
            </text>
          </g>
        ))}
        {IS_PROVIDERS.slice(0, providers).map((p, j) => (
          <g key={p}>
            <rect x={348} y={cy(j, providers) - 10} width={104} height={20} rx={4} className="fig-fill" />
            <text x={400} y={cy(j, providers) + 4} textAnchor="middle" className="fig-small" style={{ fill: "var(--text)" }}>
              {p}
            </text>
          </g>
        ))}
        <text x={8} y={262} className="fig-small">
          {shared ? `${callers} + ${providers} = ${pieces} pieces; a new provider costs 1 adapter` : `${callers} × ${providers} = ${pieces} pieces; a new provider costs ${added} more`}
        </text>
      </svg>
    </Frame>
  );
}

const CR_MODULES: [string, number, number][] = [
  ["app", 230, 20],
  ["delivery", 120, 66],
  ["orders", 300, 112],
  ["payments", 380, 158],
  ["notify", 150, 204],
  ["menu", 270, 204],
  ["dates", 110, 252],
  ["money", 290, 252],
  ["db", 410, 252],
];
const CR_IMPORTS: Record<string, string[]> = {
  app: ["orders", "delivery"],
  orders: ["payments", "menu", "money", "db"],
  payments: ["money", "notify", "db"],
  delivery: ["orders", "notify", "dates"],
  menu: ["money", "db"],
  notify: ["dates"],
  money: [],
  dates: [],
  db: [],
};

/** Every module that imports a changed module, directly or through others, and so must be checked again. */
function ChangeRipple(props: Props) {
  const names = CR_MODULES.map(([n]) => n);
  const [changed, setChanged] = useState(typeof props.changed === "string" && names.includes(props.changed) ? props.changed : "money");
  const hit = new Set<string>();
  const todo = [changed];
  while (todo.length > 0) {
    const m = todo.pop()!;
    for (const [importer, used] of Object.entries(CR_IMPORTS)) {
      if (used.includes(m) && !hit.has(importer) && importer !== changed) {
        hit.add(importer);
        todo.push(importer);
      }
    }
  }
  const direct = names.filter((n) => CR_IMPORTS[n].includes(changed));
  const indirect = names.filter((n) => hit.has(n) && !direct.includes(n));
  const at = (n: string) => CR_MODULES.find(([m]) => m === n)!;
  const summary =
    hit.size === 0
      ? `Changing ${changed}: no module imports it, so nothing else needs checking. Modules at the top of the graph are the cheapest to change.`
      : `Changing ${changed}: ${direct.join(", ")} ${direct.length === 1 ? "imports" : "import"} it directly${indirect.length > 0 ? `, and ${indirect.join(", ")} ${indirect.length === 1 ? "imports" : "import"} it through them` : ""}. ${plural(hit.size, "module", "modules")} of ${names.length - 1} must be checked again.`;
  return (
    <Frame
      title="How far a change ripples"
      summary={summary}
      controls={
        <>
          <span className="fig-stepper">
            <span className="label">change</span>
          </span>
          {names.map((n) => (
            <button key={n} type="button" className="btn btn-secondary btn-small" aria-pressed={changed === n} onClick={() => setChanged(n)}>
              {n}
            </button>
          ))}
        </>
      }
    >
      <svg viewBox="0 0 470 276" role="img" aria-label={`Changing ${changed} affects ${plural(hit.size, "module", "modules")}`}>
        {Object.entries(CR_IMPORTS).flatMap(([from, used]) =>
          used.map((to) => {
            const [, x1, y1] = at(from);
            const [, x2, y2] = at(to);
            const lit = hit.has(from) && (to === changed || hit.has(to));
            return <line key={`${from}-${to}`} x1={x1} y1={y1} x2={x2} y2={y2} className={lit ? "fig-accent-line" : "fig-axis"} />;
          }),
        )}
        {CR_MODULES.map(([n, x, y]) => {
          const isChanged = n === changed;
          const isHit = hit.has(n);
          return (
            <g key={n}>
              <rect
                x={x - 36}
                y={y - 11}
                width={72}
                height={22}
                rx={4}
                className={isChanged ? "fig-accent" : "fig-fill"}
                style={isHit ? { stroke: "var(--focus)", strokeWidth: 3 } : undefined}
              />
              <text x={x} y={y + 4} textAnchor="middle" className="fig-small" style={{ fill: isChanged ? "var(--bg)" : "var(--text)", fontWeight: isHit || isChanged ? 600 : 400 }}>
                {n}
              </text>
            </g>
          );
        })}
        <text x={8} y={20} className="fig-small">
          imports point down
        </text>
      </svg>
    </Frame>
  );
}

const SF_FLAGS = ["paid", "packed", "shipped", "delivered", "cancelled"];
const SF_STATES: [number, string][] = [
  [0, "PLACED"],
  [1, "PAID"],
  [3, "PACKED"],
  [7, "SHIPPED"],
  [15, "DELIVERED"],
  [16, "CANCELLED before payment"],
  [17, "CANCELLED after payment"],
  [19, "CANCELLED after packing"],
];

/** Why an impossible combination of order flags is impossible, or an empty string for a real state. */
function sfProblem(bits: number): string {
  const has = (f: string) => (bits & (1 << SF_FLAGS.indexOf(f))) !== 0;
  if (has("cancelled") && has("delivered")) return "cancelled and delivered at once";
  if (has("cancelled") && has("shipped")) return "cancelled after it shipped";
  if (has("delivered") && !has("shipped")) return "delivered but never shipped";
  if (has("shipped") && !has("packed")) return "shipped but never packed";
  if (has("packed") && !has("paid")) return "packed before it was paid for";
  return "";
}

/** Five true-or-false flags on an order against the handful of states an order can really be in. */
function StateFlags(props: Props) {
  const start = Array.isArray(props.flags) ? props.flags.filter((f): f is string => typeof f === "string" && SF_FLAGS.includes(f)) : [];
  const [bits, setBits] = useState(start.reduce((b, f) => b | (1 << SF_FLAGS.indexOf(f)), 0));
  const toggle = (i: number) => setBits(bits ^ (1 << i));
  const on = SF_FLAGS.filter((_, i) => (bits & (1 << i)) !== 0);
  const state = SF_STATES.find(([b]) => b === bits);
  const problem = sfProblem(bits);
  const flagsText = on.length === 0 ? "no flags set" : on.join(", ");
  const summary = state
    ? `Flags: ${flagsText}. This is a real state, ${state[1]}. Of the 32 combinations five true-or-false flags allow, only ${SF_STATES.length} describe an order that can exist; an enum with those ${SF_STATES.length} values cannot express the other ${32 - SF_STATES.length}.`
    : `Flags: ${flagsText}. No order can be in this state: ${problem}. The five flags allow it anyway, as they allow ${32 - SF_STATES.length} impossible combinations in all; an enum of the ${SF_STATES.length} real states cannot express it.`;
  return (
    <Frame
      title="Flags against states"
      summary={summary}
      controls={
        <>
          {SF_FLAGS.map((f, i) => (
            <button key={f} type="button" className="btn btn-secondary btn-small" aria-pressed={(bits & (1 << i)) !== 0} onClick={() => toggle(i)}>
              {f}
            </button>
          ))}
        </>
      }
    >
      <svg viewBox="0 0 460 214" role="img" aria-label={state ? `A real state: ${state[1]}` : `An impossible combination: ${problem}`}>
        <text x={8} y={16} className="fig-small" style={{ fontWeight: 600 }}>
          all 32 combinations of the flags
        </text>
        {Array.from({ length: 32 }, (_, i) => {
          const real = SF_STATES.some(([b]) => b === i);
          const x = 8 + (i % 8) * 30;
          const y = 28 + Math.floor(i / 8) * 30;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={24}
              height={24}
              rx={3}
              className={real ? "fig-accent" : "fig-ghost"}
              style={i === bits ? { stroke: "var(--text)", strokeWidth: 3 } : undefined}
            />
          );
        })}
        <text x={8} y={164} className="fig-small">
          filled: one of the 8 real states
        </text>
        <text x={280} y={16} className="fig-small" style={{ fontWeight: 600 }}>
          the enum
        </text>
        {SF_STATES.map(([b, name], k) => (
          <text key={name} x={280} y={38 + k * 17} className="fig-small" style={b === bits ? { fill: "var(--text)", fontWeight: 600 } : undefined}>
            {b === bits ? `▸ ${name}` : `  ${name}`}
          </text>
        ))}
        <text x={8} y={200} className="fig-small" style={{ fill: "var(--text)" }}>
          {state ? `real: ${state[1]}` : `impossible: ${problem}`}
        </text>
      </svg>
    </Frame>
  );
}

const EU_FRAMES: [string, string][] = [
  ["handle_request", "catches any Exception: logs it, answers 500"],
  ["place_order", "catches CardDeclined and Timeout: tells the customer"],
  ["charge_with_retries", "catches Timeout: tries again, at most 3 tries"],
  ["gateway.charge", "talks to the payment gateway; may raise"],
];
const EU_CASES: Record<string, { label: string; raised: string; tries: number; caughtAt: number; outcome: string }> = {
  declined: { label: "card declined", raised: "CardDeclined", tries: 1, caughtAt: 1, outcome: "Your card was declined. Please try another card." },
  "timeout-once": { label: "one timeout", raised: "Timeout", tries: 2, caughtAt: 2, outcome: "Order placed. The second try went through, and the customer never knew." },
  "timeout-thrice": { label: "three timeouts", raised: "Timeout", tries: 3, caughtAt: 1, outcome: "The payment service is not responding. You have not been charged; please try again." },
  bug: { label: "bug: KeyError", raised: "KeyError", tries: 1, caughtAt: 0, outcome: "Something went wrong. (The KeyError and its traceback go to the log for an engineer.)" },
};

/** An exception travelling up a call stack until the first frame that handles that kind of error. */
function ErrorUnwind(props: Props) {
  const keys = Object.keys(EU_CASES);
  const [kind, setKind] = useState(typeof props.error === "string" && keys.includes(props.error) ? props.error : "declined");
  const c = EU_CASES[kind];
  const recovered = kind === "timeout-once";
  const unwound = recovered ? [] : [1, 2].filter((i) => i > c.caughtAt);
  const gaveUp = kind === "timeout-thrice";
  const summary = gaveUp
    ? `gateway.charge raises Timeout on all 3 tries. charge_with_retries catches each one and tries again, then gives up after the third and raises the Timeout again. place_order catches it. The customer sees: ${c.outcome}`
    : recovered
    ? `gateway.charge raises Timeout on the first try. charge_with_retries catches it and tries again, and the second try succeeds, so nothing above it ever sees an error. The customer sees: ${c.outcome}`
    : `gateway.charge raises ${c.raised}${c.tries > 1 ? ` on all ${c.tries} tries` : ""}. It travels up through ${[...unwound].reverse().map((i) => EU_FRAMES[i][0]).join(" and then ")}, ${unwound.length === 1 ? "which does not handle it" : "neither of which handles it"}, until ${EU_FRAMES[c.caughtAt][0]} catches it. The customer sees: ${c.outcome}`;
  return (
    <Frame
      title="Where an error is handled"
      summary={summary}
      controls={
        <>
          {keys.map((k) => (
            <button key={k} type="button" className="btn btn-secondary btn-small" aria-pressed={kind === k} onClick={() => setKind(k)}>
              {EU_CASES[k].label}
            </button>
          ))}
        </>
      }
    >
      <svg viewBox="0 0 460 236" role="img" aria-label={recovered ? "Timeout handled by a retry" : `${c.raised} handled in ${EU_FRAMES[c.caughtAt][0]}`}>
        {EU_FRAMES.map(([name, note], i) => {
          const y = 8 + i * 42;
          const catches = i === c.caughtAt;
          const passed = unwound.includes(i);
          const source = i === EU_FRAMES.length - 1;
          return (
            <g key={name}>
              <rect x={8} y={y} width={444} height={34} rx={4} className={catches ? "fig-accent" : passed ? "fig-ghost" : "fig-fill"} style={passed ? { strokeDasharray: "4 4" } : undefined} />
              <text x={18} y={y + 14} className="fig-small" style={{ fontWeight: 600, fill: catches ? "var(--bg)" : "var(--text)" }}>
                {passed ? `${name}  (${gaveUp ? "retried, then gave up" : "passed through"})` : source ? `${name}  (raised here)` : name}
              </text>
              <text x={18} y={y + 28} className="fig-small" style={catches ? { fill: "var(--bg)" } : undefined}>
                {note}
              </text>
            </g>
          );
        })}
        <text x={8} y={196} className="fig-small" style={{ fill: "var(--text)" }}>
          {`raised: ${c.raised} in gateway.charge${c.tries > 1 ? `, ${c.tries} tries` : ""}`}
        </text>
        <text x={8} y={216} className="fig-small" style={{ fill: "var(--text)" }}>
          {recovered ? "handled: by the retry; the order goes through" : `handled: in ${EU_FRAMES[c.caughtAt][0]}`}
        </text>
      </svg>
    </Frame>
  );
}

/** A test of a shop's opening hours, run at different hours, with the clock read inside the function or passed in. */
function DiClock(props: Props) {
  const [injected, setInjected] = useState(props.mode === "injected");
  const [hour, setHour] = useState(clamp(Math.round(num(props.hour, 23)), 0, 23));
  const open = (h: number) => h >= 9 && h < 21;
  const passes = (h: number) => injected || open(h);
  const passing = Array.from({ length: 24 }, (_, h) => h).filter(passes).length;
  const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;
  const code = injected
    ? ["def is_open(clock):", "    return 9 <= clock.now() < 21", "", "test: is_open(FakeClock(10)) is True", "test: is_open(FakeClock(22)) is False"]
    : ["def is_open():", "    return 9 <= current_hour() < 21", "", "test: is_open() is True"];
  const summary = injected
    ? `The clock is passed in. Run at ${hh(hour)}, the test hands is_open a fake clock reading 10:00 and gets True, then one reading 22:00 and gets False: it passes, as it does at every hour of the day, and it now checks closing time too.`
    : `The clock is read inside is_open. Run at ${hh(hour)}, the test gets ${open(hour) ? "True" : "False"} and ${open(hour) ? "passes" : "fails"}. It passes only when the test happens to run between 09:00 and 21:00, ${passing} of 24 hours, and closing time cannot be tested at all without waiting for it.`;
  return (
    <Frame
      title="A test that depends on the time it runs"
      summary={summary}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={!injected} onClick={() => setInjected(false)}>
            clock read inside
          </button>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={injected} onClick={() => setInjected(true)}>
            clock passed in
          </button>
          <Stepper label="test runs at hour" value={hour} min={0} max={23} onChange={setHour} />
        </>
      }
    >
      <svg viewBox="0 0 460 214" role="img" aria-label={`Run at ${hh(hour)}, the test ${passes(hour) ? "passes" : "fails"}; it passes at ${passing} of 24 hours`}>
        {code.map((line, i) => (
          <text key={i} x={8 + (line.length - line.trimStart().length) * 6.6} y={18 + i * 16} className="fig-small" style={{ fill: "var(--text)" }}>
            {line.trimStart()}
          </text>
        ))}
        <text x={8} y={116} className="fig-small">
          when the test runs: filled = passes
        </text>
        {Array.from({ length: 24 }, (_, h) => (
          <rect
            key={h}
            x={8 + h * 18.5}
            y={124}
            width={15}
            height={24}
            rx={2}
            className={passes(h) ? "fig-accent" : "fig-ghost"}
            style={h === hour ? { stroke: "var(--text)", strokeWidth: 3 } : undefined}
          />
        ))}
        {[0, 6, 12, 18, 23].map((h) => (
          <text key={h} x={8 + h * 18.5 + 7.5} y={164} textAnchor="middle" className="fig-small">
            {h}
          </text>
        ))}
        <text x={8} y={200} className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          {`run at ${hh(hour)}: ${passes(hour) ? "passes" : "fails"}; passes at ${passing} of 24 hours`}
        </text>
      </svg>
    </Frame>
  );
}

const FS_PLANS: [string, string, string][] = [
  ["flat", "flat", "₹30 whatever the distance"],
  ["distance", "by_distance", "₹10 + ₹8 per km"],
  ["busy", "busy", "by_distance × 1.5, rounded down"],
  ["free_over_500", "free_over_500", "₹0 from ₹500, else by_distance"],
];

/** A delivery fee chosen from a table of plans, each plan a function with the same parameters. */
function FeeStrategy(props: Props) {
  const keys = FS_PLANS.map(([k]) => k);
  const [plan, setPlan] = useState(typeof props.plan === "string" && keys.includes(props.plan) ? props.plan : "distance");
  const [km, setKm] = useState(clamp(Math.round(num(props.km, 4)), 1, 10));
  const [big, setBig] = useState(props.total === 650);
  const total = big ? 650 : 300;
  const feeOf = (p: string, d: number) => {
    const dist = 10 + 8 * d;
    if (p === "flat") return 30;
    if (p === "distance") return dist;
    if (p === "busy") return Math.floor((dist * 3) / 2);
    return total >= 500 ? 0 : dist;
  };
  const row = FS_PLANS.find(([k]) => k === plan)!;
  const fee = feeOf(plan, km);
  const working =
    plan === "flat"
      ? "₹30"
      : plan === "distance"
        ? `10 + 8 × ${km} = ₹${fee}`
        : plan === "busy"
          ? `(10 + 8 × ${km}) × 1.5 = ₹${fee}`
          : total >= 500
            ? `₹${total} is at least ₹500, so ₹0`
            : `₹${total} is under ₹500, so 10 + 8 × ${km} = ₹${fee}`;
  const summary = `PLANS["${plan}"] is the function ${row[1]}: ${row[2]}. For ${km} km and an order of ₹${total}: ${working}. fee() only looks the plan up and calls it, so adding a plan means writing one function and adding one row to the table; fee() itself never changes.`;
  const top = 135;
  return (
    <Frame
      title="Choosing behaviour from a table"
      summary={summary}
      controls={
        <>
          {keys.map((k) => (
            <button key={k} type="button" className="btn btn-secondary btn-small" aria-pressed={plan === k} onClick={() => setPlan(k)}>
              {k}
            </button>
          ))}
          <Stepper label="km" value={km} min={1} max={10} onChange={setKm} />
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={big} onClick={() => setBig(!big)}>
            order of ₹650
          </button>
        </>
      }
    >
      <svg viewBox="0 0 460 230" role="img" aria-label={`Plan ${plan}: ₹${fee} for ${km} km`}>
        <text x={8} y={16} className="fig-small" style={{ fontWeight: 600 }}>
          PLANS
        </text>
        {FS_PLANS.map(([k, fn], i) => (
          <g key={k}>
            <rect x={8} y={26 + i * 28} width={214} height={22} rx={3} className={k === plan ? "fig-accent" : "fig-fill"} />
            <text x={14} y={41 + i * 28} className="fig-small" style={{ fill: k === plan ? "var(--bg)" : "var(--text)" }}>
              {`"${k}": ${fn}`}
            </text>
          </g>
        ))}
        <text x={8} y={160} className="fig-small">
          fee(plan, km, total):
        </text>
        <text x={8} y={176} className="fig-small">
          return PLANS[plan](km, total)
        </text>
        <text x={230} y={16} className="fig-small" style={{ fontWeight: 600 }}>
          {`fee by distance, order ₹${total}`}
        </text>
        {Array.from({ length: 10 }, (_, i) => {
          const d = i + 1;
          const f = feeOf(plan, d);
          const h = Math.max(1, (f / top) * 170);
          return (
            <g key={d}>
              <rect x={230 + i * 22} y={200 - h} width={16} height={h} className={d === km ? "fig-accent" : "fig-fill"} />
              <text x={238 + i * 22} y={216} textAnchor="middle" className="fig-small">
                {d}
              </text>
            </g>
          );
        })}
        <text x={8} y={216} className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          {`${km} km: ₹${fee}`}
        </text>
      </svg>
    </Frame>
  );
}

/** A refactoring made of many small changes, tested after each change or only once at the end. */
function RefactorSteps(props: Props) {
  const [small, setSmall] = useState(props.mode !== "big");
  const [n, setN] = useState(clamp(Math.round(num(props.changes, 12)), 2, 20));
  const [slipRaw, setSlip] = useState(clamp(Math.round(num(props.slip, 5)), 0, 20));
  const slip = Math.min(slipRaw, n);
  const allRight = Math.round(Math.pow(0.95, n) * 100);
  const suspects = slip === 0 ? 0 : small ? 1 : n;
  const runs = small ? (slip === 0 ? n : slip) : 1;
  const slot = 440 / n;
  const w = Math.max(6, Math.min(34, slot - 4));
  const cx = (i: number) => 10 + slot * i + slot / 2;
  const isSuspect = (i: number) => slip !== 0 && (small ? i + 1 === slip : true);
  const runState = (i: number): "pass" | "fail" | "skip" | "none" => {
    if (small) {
      if (slip === 0 || i + 1 < slip) return "pass";
      if (i + 1 === slip) return "fail";
      return "skip";
    }
    if (i < n - 1) return "none";
    return slip === 0 ? "pass" : "fail";
  };
  const summary = small
    ? slip === 0
      ? `Tests run after each of the ${n} changes, ${n} runs in all, and every run passes: the code was restructured without changing what it does.`
      : `Tests run after every change. The slip in change ${slip} makes the run straight after it fail, so change ${slip} is the only suspect: undo it and make it again. The work stopped after ${slip} ${slip === 1 ? "run" : "runs"} of a few seconds each.`
    : slip === 0
      ? `All ${n} changes are made before the tests run once, and this time they pass. At a 5% chance of a slip per change, that happens only ${allRight}% of the time.`
      : `All ${n} changes are made before the tests run once. The slip in change ${slip} makes that run fail, and any of the ${n} changes could be the cause. At a 5% chance of a slip per change, all ${n} are right only ${allRight}% of the time.`;
  return (
    <Frame
      title="Small steps or one big change"
      summary={summary}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={small} onClick={() => setSmall(true)}>
            test after each change
          </button>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={!small} onClick={() => setSmall(false)}>
            test once at the end
          </button>
          <Stepper label="changes" value={n} min={2} max={20} onChange={setN} />
          <Stepper label="slip in change (0 for none)" value={slip} min={0} max={n} onChange={setSlip} />
        </>
      }
    >
      <svg
        viewBox="0 0 460 190"
        role="img"
        aria-label={`${n} changes, ${small ? "tested after each" : "tested once at the end"}; ${slip === 0 ? "no slip" : `slip in change ${slip}, ${suspects === 1 ? "1 suspect" : `${suspects} suspects`}`}`}
      >
        <text x={10} y={16} className="fig-small">
          changes, in the order they are made (filled = contains the slip)
        </text>
        {Array.from({ length: n }, (_, i) => (
          <rect
            key={`c${i}`}
            x={cx(i) - w / 2}
            y={26}
            width={w}
            height={30}
            rx={3}
            className={i + 1 === slip ? "fig-accent" : "fig-ghost"}
            style={isSuspect(i) ? { stroke: "var(--text)", strokeWidth: 3 } : undefined}
          />
        ))}
        {Array.from({ length: n }, (_, i) =>
          n <= 12 || i === 0 || (i + 1) % 5 === 0 || i + 1 === slip ? (
            <text key={`l${i}`} x={cx(i)} y={72} textAnchor="middle" className="fig-small">
              {i + 1}
            </text>
          ) : null,
        )}
        <text x={10} y={98} className="fig-small">
          test runs (filled = passes, ring = fails, dash = not run)
        </text>
        {Array.from({ length: n }, (_, i) => {
          const s = runState(i);
          if (s === "none") return null;
          if (s === "skip") return <line key={`r${i}`} x1={cx(i) - 5} x2={cx(i) + 5} y1={116} y2={116} className="fig-guide" />;
          return s === "pass" ? (
            <circle key={`r${i}`} cx={cx(i)} cy={116} r={6} className="fig-accent" />
          ) : (
            <circle key={`r${i}`} cx={cx(i)} cy={116} r={7} className="fig-ghost" style={{ stroke: "var(--text)", strokeWidth: 3 }} />
          );
        })}
        <text x={10} y={152} className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          {`test runs: ${runs}; changes to inspect: ${suspects}`}
        </text>
        <text x={10} y={176} className="fig-small">
          {`chance all ${n} changes are right at 5% per change: ${allRight}%`}
        </text>
      </svg>
    </Frame>
  );
}

/** Page 2 of a newest-first feed, asked for by offset or by cursor, after new posts arrive at the top. */
function PageCursor(props: Props) {
  const [cursor, setCursor] = useState(props.mode === "cursor");
  const [arrived, setArrived] = useState(clamp(Math.round(num(props.arrived, 2)), 0, 5));
  const size = 5;
  const first = Array.from({ length: size }, (_, i) => 40 - i);
  const now = [...Array.from({ length: arrived }, (_, i) => 40 + arrived - i), ...Array.from({ length: 40 }, (_, i) => 40 - i)];
  const last = first[size - 1];
  const second = cursor ? now.filter((id) => id < last).slice(0, size) : now.slice(size, 2 * size);
  const repeats = second.filter((id) => first.includes(id));
  const ask = cursor ? `5 posts older than post ${last}` : "skip 5 posts, take 5";
  const box = (id: number, i: number, y: number, seen: boolean) => (
    <g key={`${y}-${i}`}>
      <rect x={10 + i * 88} y={y} width={80} height={30} rx={3} className={seen ? "fig-accent" : "fig-ghost"} />
      <text x={50 + i * 88} y={y + 20} textAnchor="middle" className="fig-small" style={{ fill: seen ? "var(--bg)" : "var(--text)", fontWeight: seen ? 600 : 400 }}>
        {seen ? `${id} (again)` : `post ${id}`}
      </text>
    </g>
  );
  const arrivedText = arrived === 0 ? "no new posts arrive" : `${arrived} new ${arrived === 1 ? "post arrives" : "posts arrive"} at the top (${Array.from({ length: arrived }, (_, i) => 41 + i).join(", ")})`;
  const summary = cursor
    ? `Page 2 asks for the ${ask}. ${arrived ? "New posts at the top do not move that point, so page" : "Page"} 2 is post ${second[0]} to post ${second[size - 1]} with no repeats${arrived ? "; the new posts appear when the feed is refreshed" : ""}.`
    : arrived === 0
      ? `Page 2 asks to skip 5 posts and take 5. Nothing arrived, so it is post ${second[0]} to post ${second[size - 1]}, exactly the next five.`
      : `Page 2 asks to skip 5 posts and take 5. ${arrived === 1 ? "The new post" : `The ${arrived} new posts`} pushed everything down by ${arrived}, so the first ${arrived === 1 ? "post" : `${arrived} posts`} of page 2 ${arrived === 1 ? "is" : "are"} ${arrived === 1 ? "one" : "ones"} the reader already saw on page 1.`;
  return (
    <Frame
      title="Offset or cursor: fetching page 2 of a feed"
      summary={summary}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={!cursor} onClick={() => setCursor(false)}>
            by offset
          </button>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={cursor} onClick={() => setCursor(true)}>
            by cursor
          </button>
          <Stepper label="new posts before page 2" value={arrived} min={0} max={5} onChange={setArrived} />
        </>
      }
    >
      <svg viewBox="0 0 460 196" role="img" aria-label={`Page 2 by ${cursor ? "cursor" : "offset"} after ${arrived} new posts: ${repeats.length} repeated from page 1`}>
        <text x={10} y={16} className="fig-small">
          page 1, newest first
        </text>
        {first.map((id, i) => box(id, i, 24, false))}
        <text x={10} y={76} className="fig-small">
          {`then ${arrivedText}`}
        </text>
        <text x={10} y={100} className="fig-small">
          {`page 2: ${ask}`}
        </text>
        {second.map((id, i) => box(id, i, 108, repeats.includes(id)))}
        <text x={10} y={170} className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          {`posts on page 2 already seen on page 1: ${repeats.length}`}
        </text>
      </svg>
    </Frame>
  );
}

const DM_CRITERIA: [string, string][] = [
  ["cost", "cost"],
  ["effort", "build effort"],
  ["scale", "scaling"],
];
const DM_OPTIONS: [string, number[]][] = [
  ["one database server", [4, 5, 1]],
  ["object storage", [3, 4, 5]],
  ["own file servers", [4, 1, 4]],
];

/** A weighted decision matrix for where a festival app keeps its photos, with a check of how easily the winner changes. */
function DecisionMatrix(props: Props) {
  const start = (key: string, fallback: number) => clamp(Math.round(num(props[key], fallback)), 0, 5);
  const [weights, setWeights] = useState([start("cost", 3), start("effort", 2), start("scale", 5)]);
  const totalsFor = (w: number[]) => DM_OPTIONS.map(([, s]) => s.reduce((acc, v, i) => acc + v * w[i], 0));
  const winnerOf = (w: number[]) => {
    const t = totalsFor(w);
    const best = Math.max(...t);
    const top = t.flatMap((v, i) => (v === best ? [i] : []));
    return top.length === 1 ? top[0] : -1;
  };
  const totals = totalsFor(weights);
  const winner = winnerOf(weights);
  let flip: { c: number; to: number } | null = null;
  for (let d = 1; d <= 5 && !flip; d++) {
    for (let c = 0; c < 3 && !flip; c++) {
      for (const to of [weights[c] - d, weights[c] + d]) {
        if (flip || to < 0 || to > 5) continue;
        const w = weights.map((v, i) => (i === c ? to : v));
        const next = winnerOf(w);
        if (next !== -1 && next !== winner) flip = { c, to };
      }
    }
  }
  const order = DM_OPTIONS.map((_, i) => i).sort((a, b) => totals[b] - totals[a]);
  const tied = order.filter((i) => totals[i] === totals[order[0]]).map((i) => DM_OPTIONS[i][0]);
  const lead =
    winner === -1
      ? `With these weights, ${tied.slice(0, -1).join(", ")} and ${tied[tied.length - 1]} tie at ${totals[order[0]]}.`
      : `With these weights, ${DM_OPTIONS[winner][0]} wins with ${totals[winner]}, ahead of ${DM_OPTIONS[order[1]][0]} at ${totals[order[1]]} and ${DM_OPTIONS[order[2]][0]} at ${totals[order[2]]}.`;
  const sens = flip
    ? winner === -1
      ? ` Changing the weight of ${DM_CRITERIA[flip.c][1]} from ${weights[flip.c]} to ${flip.to} would break the tie.`
      : ` The winner changes if the weight of ${DM_CRITERIA[flip.c][1]} goes from ${weights[flip.c]} to ${flip.to}, so the decision rests on that weight.`
    : " No change to a single weight would change the result.";
  const colX = [196, 246, 296];
  const barScale = 90 / 75;
  return (
    <Frame
      title="A weighted decision matrix"
      summary={lead + sens}
      controls={
        <>
          {DM_CRITERIA.map(([, label], c) => (
            <Stepper key={label} label={`weight of ${label}`} value={weights[c]} min={0} max={5} onChange={(v) => setWeights(weights.map((x, i) => (i === c ? v : x)))} />
          ))}
        </>
      }
    >
      <svg viewBox="0 0 460 184" role="img" aria-label={winner === -1 ? "The options tie" : `${DM_OPTIONS[winner][0]} scores highest, ${totals[winner]}`}>
        <text x={8} y={34} className="fig-small">
          option
        </text>
        <text x={8} y={176} className="fig-small">
          each score runs from 1 to 5, and higher is better
        </text>
        {DM_CRITERIA.map(([key], c) => (
          <text key={key} x={colX[c]} y={16} textAnchor="middle" className="fig-small">
            {key}
          </text>
        ))}
        {DM_CRITERIA.map(([key], c) => (
          <text key={`w${key}`} x={colX[c]} y={34} textAnchor="middle" className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
            {`× ${weights[c]}`}
          </text>
        ))}
        <text x={340} y={16} className="fig-small">
          weighted total
        </text>
        <line x1={8} x2={452} y1={44} y2={44} className="fig-grid" />
        {DM_OPTIONS.map(([name, s], r) => {
          const y = 70 + r * 36;
          const win = r === winner;
          return (
            <g key={name}>
              <text x={8} y={y} className="fig-small" style={{ fill: "var(--text)", fontWeight: win ? 600 : 400 }}>
                {name}
              </text>
              {s.map((v, c) => (
                <text key={c} x={colX[c]} y={y} textAnchor="middle" className="fig-small" style={{ fill: "var(--text)" }}>
                  {v}
                </text>
              ))}
              <rect x={340} y={y - 13} width={Math.max(1, totals[r] * barScale)} height={18} rx={2} className={win ? "fig-accent" : "fig-ghost"} />
              <text x={344 + totals[r] * barScale} y={y} className="fig-small" style={{ fill: "var(--text)", fontWeight: win ? 600 : 400 }}>
                {totals[r]}
              </text>
            </g>
          );
        })}
      </svg>
    </Frame>
  );
}

const CS_FILES: [string, string][] = [
  ["README.md", "Tiffin app: how to run it"],
  ["app.py", "print(menu_for(today))"],
  ["menu.csv", "monday,rajma chawal"],
];

/** A short, stable fingerprint of a text (FNV-1a, 32 bits), standing in for a real content hash. */
function csHash(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0").slice(0, 7);
}

/** Two commits of a three-file project in a content-addressed store: what a new commit adds and what it shares. */
function ContentStore(props: Props) {
  const start = Array.isArray(props.changed) ? props.changed.filter((n): n is string => typeof n === "string") : ["app.py"];
  const [changed, setChanged] = useState<string[]>(CS_FILES.map(([n]) => n).filter((n) => start.includes(n)));
  const v1 = CS_FILES.map(([name, text]) => ({ name, id: csHash(text) }));
  const v2 = CS_FILES.map(([name, text]) => ({ name, id: changed.includes(name) ? csHash(`${text} (edited)`) : csHash(text) }));
  const treeText = (entries: { name: string; id: string }[]) => entries.map((e) => `${e.name} ${e.id}`).join("\n");
  const t1 = csHash(treeText(v1));
  const t2 = csHash(treeText(v2));
  const c1 = csHash(`tree ${t1}\nfirst menu`);
  const c2 = csHash(`tree ${t2}\nparent ${c1}\nnext week`);
  const newBlobs = v2.filter((e) => changed.includes(e.name));
  const sameTree = t2 === t1;
  const objects: { kind: string; id: string; added: boolean }[] = [
    ...v1.map((e) => ({ kind: "blob", id: e.id, added: false })),
    { kind: "tree", id: t1, added: false },
    { kind: "commit", id: c1, added: false },
    ...newBlobs.map((e) => ({ kind: "blob", id: e.id, added: true })),
    ...(sameTree ? [] : [{ kind: "tree", id: t2, added: true }]),
    { kind: "commit", id: c2, added: true },
  ];
  const added = objects.filter((o) => o.added).length;
  const toggle = (name: string) => setChanged(changed.includes(name) ? changed.filter((n) => n !== name) : [...changed, name]);
  const names = CS_FILES.map(([n]) => n).filter((n) => changed.includes(n));
  const listed = names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  const kept = CS_FILES.length - changed.length;
  const summary =
    changed.length === 0
      ? `Commit 2 changes no file, so its tree has the same entries and the same id as commit 1's, and the store gains only the new commit record: 1 object.`
      : `Commit 2 changes ${listed}: ${newBlobs.length} new ${newBlobs.length === 1 ? "blob" : "blobs"}, 1 new tree and 1 new commit, ${added} objects added.${kept === 0 ? " Every file changed, so nothing is shared." : ` The other ${kept === 1 ? "file points" : `${kept} files point`} at ${kept === 1 ? "a blob" : "blobs"} already stored, by the same id.`}`;
  const entryRows = (entries: { name: string; id: string }[], x: number, mark: boolean) =>
    entries.map((e, i) => {
      const hot = mark && changed.includes(e.name);
      return (
        <g key={`${x}-${e.name}`}>
          <rect x={x} y={52 + i * 22} width={200} height={18} rx={2} className={hot ? "fig-accent" : "fig-ghost"} />
          <text x={x + 6} y={65 + i * 22} className="fig-small" style={{ fill: hot ? "var(--bg)" : "var(--text)" }}>
            {`${e.name} → ${e.id}`}
          </text>
        </g>
      );
    });
  return (
    <Frame
      title="Two commits in a content-addressed store"
      summary={summary}
      controls={
        <>
          <span className="label">changed in commit 2</span>
          {CS_FILES.map(([name]) => (
            <button key={name} type="button" className="btn btn-secondary btn-small" aria-pressed={changed.includes(name)} onClick={() => toggle(name)}>
              {name}
            </button>
          ))}
        </>
      }
    >
      <svg viewBox="0 0 460 236" role="img" aria-label={`Commit 2 adds ${added} ${added === 1 ? "object" : "objects"} to the store, ${objects.length} in all`}>
        <text x={10} y={16} className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          {`commit 1: ${c1}`}
        </text>
        <text x={10} y={32} className="fig-small">
          {`tree ${t1}, no parent`}
        </text>
        <text x={250} y={16} className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          {`commit 2: ${c2}`}
        </text>
        <text x={250} y={32} className="fig-small">
          {`tree ${t2}, parent ${c1}`}
        </text>
        {entryRows(v1, 10, false)}
        {entryRows(v2, 250, true)}
        <text x={10} y={142} className="fig-small">
          {`the store: ${objects.length} objects, filled = added by commit 2`}
        </text>
        {objects.map((o, i) => (
          <g key={`o${i}`}>
            <rect x={10 + (i % 5) * 89} y={152 + Math.floor(i / 5) * 34} width={84} height={28} rx={3} className={o.added ? "fig-accent" : "fig-ghost"} />
            <text x={52 + (i % 5) * 89} y={163 + Math.floor(i / 5) * 34} textAnchor="middle" className="fig-small" style={{ fill: o.added ? "var(--bg)" : "var(--text)" }}>
              {o.kind}
            </text>
            <text x={52 + (i % 5) * 89} y={175 + Math.floor(i / 5) * 34} textAnchor="middle" className="fig-small" style={{ fill: o.added ? "var(--bg)" : "var(--text)" }}>
              {o.id}
            </text>
          </g>
        ))}
      </svg>
    </Frame>
  );
}

const TWM_BASE = ["mon rajma", "tue chole", "wed idli", "thu poha", "fri biryani"];
const TWM_CASES: Record<string, { label: string; ours: string[]; theirs: string[] }> = {
  separate: { label: "different lines", ours: ["mon rajma", "tue bhature", "wed idli", "thu poha", "fri biryani"], theirs: ["mon rajma", "tue chole", "wed idli", "thu upma", "fri biryani"] },
  same: { label: "same line, different edits", ours: ["mon rajma", "tue chole", "wed dosa", "thu poha", "fri biryani"], theirs: ["mon rajma", "tue chole", "wed pongal", "thu poha", "fri biryani"] },
  identical: { label: "same edit on both", ours: ["mon rajma", "tue chole", "wed idli", "thu poha", "fri pulao"], theirs: ["mon rajma", "tue chole", "wed idli", "thu poha", "fri pulao"] },
  oneside: { label: "only one side edits", ours: TWM_BASE, theirs: ["mon kadhi", "tue chole", "wed idli", "thu poha", "fri pulao"] },
};

/** A line-by-line three-way merge of a week's menu, with the rule each line follows. */
function ThreeWayMerge(props: Props) {
  const keys = Object.keys(TWM_CASES);
  const [key, setKey] = useState(typeof props.scenario === "string" && keys.includes(props.scenario) ? props.scenario : "separate");
  const { ours, theirs } = TWM_CASES[key];
  const rows = TWM_BASE.map((base, i) => {
    const o = ours[i];
    const t = theirs[i];
    if (o === t) return { base, o, t, result: o, rule: o === base ? "same" : "both" };
    if (o === base) return { base, o, t, result: t, rule: "theirs" };
    if (t === base) return { base, o, t, result: o, rule: "ours" };
    return { base, o, t, result: "CONFLICT", rule: "conflict" };
  });
  const conflicts = rows.filter((r) => r.rule === "conflict").length;
  const fromOurs = rows.filter((r) => r.rule === "ours").length;
  const fromTheirs = rows.filter((r) => r.rule === "theirs").length;
  const fromBoth = rows.filter((r) => r.rule === "both").length;
  const parts: string[] = [];
  if (fromOurs) parts.push(`${fromOurs} ${fromOurs === 1 ? "line" : "lines"} changed only on ours, so ours is taken`);
  if (fromTheirs) parts.push(`${fromTheirs} ${fromTheirs === 1 ? "line" : "lines"} changed only on theirs, so theirs is taken`);
  if (fromBoth) parts.push(`${fromBoth} ${fromBoth === 1 ? "line" : "lines"} changed the same way on both, so that change is taken once`);
  if (conflicts) parts.push(`${conflicts} ${conflicts === 1 ? "line" : "lines"} changed differently on both, a conflict that a person must resolve`);
  const summary = `Compared with the common base: ${parts.join("; ")}. ${conflicts ? "The merge stops until the conflict is resolved." : "Every other line is unchanged, and the merge completes on its own."}`;
  const cols: [string, (r: (typeof rows)[number]) => string, (r: (typeof rows)[number]) => boolean][] = [
    ["base", (r) => r.base, () => false],
    ["ours", (r) => r.o, (r) => r.o !== r.base],
    ["theirs", (r) => r.t, (r) => r.t !== r.base],
    ["merged", (r) => r.result, (r) => r.result !== r.base],
  ];
  return (
    <Frame
      title="A three-way merge, line by line"
      summary={summary}
      controls={
        <>
          {keys.map((k) => (
            <button key={k} type="button" className="btn btn-secondary btn-small" aria-pressed={k === key} onClick={() => setKey(k)}>
              {TWM_CASES[k].label}
            </button>
          ))}
        </>
      }
    >
      <svg viewBox="0 0 460 172" role="img" aria-label={`Merged menu: ${conflicts} ${conflicts === 1 ? "conflict" : "conflicts"}`}>
        {cols.map(([name], c) => (
          <text key={name} x={8 + c * 114} y={16} className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
            {name}
          </text>
        ))}
        {rows.map((r, i) =>
          cols.map(([name, text, hot], c) => {
            const conflict = c === 3 && r.rule === "conflict";
            const filled = conflict || (c === 3 && hot(r));
            return (
              <g key={`${name}-${i}`}>
                <rect
                  x={6 + c * 114}
                  y={26 + i * 26}
                  width={106}
                  height={22}
                  rx={2}
                  className={filled ? "fig-accent" : "fig-ghost"}
                  style={!filled && hot(r) ? { stroke: "var(--text)", strokeWidth: 2 } : undefined}
                />
                <text x={12 + c * 114} y={41 + i * 26} className="fig-small" style={{ fill: filled ? "var(--bg)" : "var(--text)", fontWeight: filled ? 600 : 400 }}>
                  {text(r)}
                </text>
              </g>
            );
          }),
        )}
        <text x={8} y={164} className="fig-small">
          outlined: changed from base; filled: merged line that differs
        </text>
      </svg>
    </Frame>
  );
}

/** A simple model of review: the same 1,200-line change sent as one pull request or split into several smaller ones. */
function ReviewSize(props: Props) {
  const total = 1200;
  const defects = 12;
  const [k, setK] = useState(clamp(Math.round(num(props.prs, 1)), 1, 12));
  const size = total / k;
  const p = size <= 200 ? 0.7 : (0.7 * 200) / size;
  const caught = defects * p;
  const pct = Math.round(p * 100);
  const one = (x: number) => (Math.round(x * 10) / 10).toLocaleString("en-IN");
  const summary =
    k === 1
      ? `One pull request of 1,200 lines. In this model each of its 12 defects is spotted with probability ${pct}%, so a review catches about ${one(caught)} of them on average, and the rest reach the main branch.`
      : `${k} pull requests of ${group(Math.round(size))} lines each. In this model each defect is spotted with probability ${pct}%, so the reviews catch about ${one(caught)} of the 12 on average${size <= 200 ? ", the most any split can reach" : ""}.`;
  const barW = 440 / k;
  return (
    <Frame
      title="The same change, reviewed whole or in pieces"
      summary={summary}
      controls={<Stepper label="pull requests" value={k} min={1} max={12} onChange={setK} />}
    >
      <svg viewBox="0 0 460 196" role="img" aria-label={`${k} pull requests: about ${one(caught)} of 12 defects caught`}>
        <text x={10} y={16} className="fig-small">
          up to 200 lines: 70% chance per defect; beyond that, it thins
        </text>
        {Array.from({ length: k }, (_, i) => (
          <g key={i}>
            <rect x={10 + i * barW + 2} y={30} width={Math.max(4, barW - 4)} height={34} rx={3} className="fig-ghost" />
            {k <= 6 ? (
              <text x={10 + i * barW + barW / 2} y={52} textAnchor="middle" className="fig-small" style={{ fill: "var(--text)" }}>
                {`${group(Math.round(size))} lines`}
              </text>
            ) : null}
          </g>
        ))}
        <text x={10} y={92} className="fig-small">
          of 12 defects, caught on average (filled) and missed
        </text>
        <rect x={10} y={102} width={440} height={26} rx={3} className="fig-ghost" />
        <rect x={10} y={102} width={(440 * caught) / defects} height={26} rx={3} className="fig-accent" />
        <text x={16} y={120} className="fig-small" style={{ fill: "var(--bg)", fontWeight: 600 }}>
          {caught >= 1.2 ? one(caught) : ""}
        </text>
        <text x={10} y={152} className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          {`${k} × ${group(Math.round(size))} lines: ${pct}% per defect, about ${one(caught)} caught and ${one(defects - caught)} missed`}
        </text>
        <text x={10} y={176} className="fig-small">
          70% and 200 lines are assumptions, not measurements
        </text>
      </svg>
    </Frame>
  );
}

const BG_NODES: Record<string, { x: number; y: number; source?: boolean }> = {
  "utils.h": { x: 10, y: 22, source: true },
  "utils.c": { x: 100, y: 22, source: true },
  "menu.c": { x: 190, y: 22, source: true },
  "orders.c": { x: 280, y: 22, source: true },
  "pay.c": { x: 370, y: 22, source: true },
  "utils.o": { x: 10, y: 96 },
  "menu.o": { x: 100, y: 96 },
  "orders.o": { x: 190, y: 96 },
  "pay.o": { x: 280, y: 96 },
  docs: { x: 370, y: 96 },
  app: { x: 145, y: 160 },
  tests: { x: 145, y: 214 },
};
const BG_DEPS: Record<string, string[]> = {
  "utils.o": ["utils.c"],
  "menu.o": ["menu.c", "utils.h"],
  "orders.o": ["orders.c", "utils.h"],
  "pay.o": ["pay.c"],
  docs: ["menu.c", "orders.c"],
  app: ["utils.o", "menu.o", "orders.o", "pay.o"],
  tests: ["app"],
};

/** A small build graph: which targets must be rebuilt when one source file changes. */
function BuildGraph(props: Props) {
  const sources = Object.keys(BG_NODES).filter((n) => BG_NODES[n].source);
  const [changed, setChanged] = useState(typeof props.changed === "string" && sources.includes(props.changed) ? props.changed : "utils.h");
  const dirty = new Set<string>([changed]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const [t, ins] of Object.entries(BG_DEPS)) {
      if (!dirty.has(t) && ins.some((i) => dirty.has(i))) {
        dirty.add(t);
        grew = true;
      }
    }
  }
  const targets = Object.keys(BG_DEPS);
  const rebuilt = targets.filter((t) => dirty.has(t));
  const reused = targets.filter((t) => !dirty.has(t));
  const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
  const summary = `Changing ${changed} rebuilds ${list(rebuilt)}: ${rebuilt.length} of ${targets.length} targets. ${list(reused)} ${reused.length === 1 ? "does" : "do"} not depend on it, directly or through anything else, so ${reused.length === 1 ? "its last output is" : "their last outputs are"} reused.`;
  const w = 80;
  const h = 26;
  return (
    <Frame
      title="What a change forces a build to redo"
      summary={summary}
      controls={
        <>
          <span className="label">change</span>
          {sources.map((s) => (
            <button key={s} type="button" className="btn btn-secondary btn-small" aria-pressed={s === changed} onClick={() => setChanged(s)}>
              {s}
            </button>
          ))}
        </>
      }
    >
      <svg viewBox="0 0 460 252" role="img" aria-label={`Changing ${changed} rebuilds ${rebuilt.length} of ${targets.length} targets`}>
        {Object.entries(BG_DEPS).flatMap(([t, ins]) =>
          ins.map((i) => {
            const a = BG_NODES[i];
            const b = BG_NODES[t];
            const hot = dirty.has(i) && dirty.has(t);
            return <line key={`${i}-${t}`} x1={a.x + w / 2} y1={a.y + h} x2={b.x + w / 2} y2={b.y} className={hot ? "fig-accent-line" : "fig-line"} />;
          }),
        )}
        {Object.entries(BG_NODES).map(([name, n]) => {
          const hot = dirty.has(name);
          return (
            <g key={name}>
              <rect
                x={n.x}
                y={n.y}
                width={w}
                height={h}
                rx={n.source ? 2 : 8}
                className={hot ? "fig-accent" : "fig-fill"}
                style={name === changed ? { stroke: "var(--text)", strokeWidth: 3 } : undefined}
              />
              <text x={n.x + w / 2} y={n.y + 17} textAnchor="middle" className="fig-small" style={{ fill: hot ? "var(--bg)" : "var(--text)", fontWeight: hot ? 600 : 400 }}>
                {name}
              </text>
            </g>
          );
        })}
        <text x={10} y={16} className="fig-small">
          sources have square corners; lines join inputs to outputs
        </text>
        <text x={250} y={232} className="fig-small">
          {`rebuilt: ${rebuilt.length} of ${targets.length}`}
        </text>
      </svg>
    </Frame>
  );
}

const VR_VERSIONS = ["1.2.0", "1.4.0", "1.5.2", "1.6.0", "1.7.1", "1.9.0", "1.10.0", "2.0.0", "2.1.0"];
const VR_SPECS: Record<string, { label: string; lo: string; hi: string | null }> = {
  ge16: { label: ">=1.6.0", lo: "1.6.0", hi: null },
  tilde15: { label: "~1.5.0", lo: "1.5.0", hi: "1.6.0" },
  caret2: { label: "^2.0.0", lo: "2.0.0", hi: "3.0.0" },
  caret14: { label: "^1.4.0", lo: "1.4.0", hi: "2.0.0" },
};

function vrParse(v: string) {
  return v.split(".").map((x) => Number(x));
}
function vrCmp(a: string, b: string) {
  const x = vrParse(a);
  const y = vrParse(b);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

/** Two packages' version ranges for a shared library, and the version a resolver picks. */
function VersionRanges(props: Props) {
  const keys = Object.keys(VR_SPECS).filter((k) => k !== "caret14");
  const [key, setKey] = useState(typeof props.other === "string" && keys.includes(props.other) ? props.other : "ge16");
  const ok = (spec: { lo: string; hi: string | null }, v: string) => vrCmp(v, spec.lo) >= 0 && (spec.hi === null || vrCmp(v, spec.hi) < 0);
  const a = VR_SPECS.caret14;
  const b = VR_SPECS[key];
  const both = VR_VERSIONS.filter((v) => ok(a, v) && ok(b, v));
  const pick = both.length ? both[both.length - 1] : null;
  const summary = pick
    ? `orders needs pay-sdk ^1.4.0, from 1.4.0 up to but not including 2.0.0; receipts needs ${b.label}. ${both.length === 1 ? "Only" : "Both allow"} ${both.join(", ")}${both.length === 1 ? " satisfies both" : ""}. The resolver picks the newest, ${pick}, and the lock file records it, so every later install gets ${pick} too.`
    : `orders needs pay-sdk ^1.4.0, below 2.0.0; receipts needs ${b.label}. No published version satisfies both, so installation fails until one of the two packages changes its requirement.`;
  const x = (i: number) => 26 + i * 51;
  return (
    <Frame
      title="Two version ranges for one library"
      summary={summary}
      controls={
        <>
          <span className="label">receipts needs</span>
          {keys.map((k) => (
            <button key={k} type="button" className="btn btn-secondary btn-small" aria-pressed={k === key} onClick={() => setKey(k)}>
              {VR_SPECS[k].label}
            </button>
          ))}
        </>
      }
    >
      <svg viewBox="0 0 460 184" role="img" aria-label={pick ? `The resolver picks pay-sdk ${pick}` : "No version satisfies both ranges"}>
        <text x={8} y={14} className="fig-small">
          published versions of pay-sdk, oldest to newest
        </text>
        {VR_VERSIONS.map((v, i) => (
          <text key={v} x={x(i)} y={32} textAnchor="middle" className="fig-small" style={{ fill: "var(--text)", fontWeight: v === pick ? 600 : 400 }}>
            {v}
          </text>
        ))}
        {[
          { name: "orders allows (^1.4.0)", spec: a, y: 40 },
          { name: `receipts allows (${b.label})`, spec: b, y: 80 },
        ].map((row) => (
          <g key={row.name}>
            <text x={8} y={row.y + 10} className="fig-small">
              {row.name}
            </text>
            {VR_VERSIONS.map((v, i) => (
              <rect key={v} x={x(i) - 22} y={row.y + 16} width={44} height={16} rx={2} className={ok(row.spec, v) ? "fig-fill" : "fig-ghost"} />
            ))}
          </g>
        ))}
        <text x={8} y={130} className="fig-small">
          {"allowed by both (the resolver's pick is highlighted)"}
        </text>
        {VR_VERSIONS.map((v, i) => (
          <rect key={`b${v}`} x={x(i) - 22} y={136} width={44} height={16} rx={2} className={v === pick ? "fig-accent" : both.includes(v) ? "fig-fill" : "fig-ghost"} />
        ))}
        <text x={8} y={174} className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          {pick ? `allowed by both: ${both.length}; picked: ${pick}` : "allowed by both: none; nothing can be installed"}
        </text>
      </svg>
    </Frame>
  );
}

/** Bisecting 64 commits for the first bad one: each test halves the range that can contain it. */
function BisectCommits(props: Props) {
  const n = 64;
  const [bad, setBad] = useState(clamp(Math.round(num(props.bad, 41)), 1, n - 1));
  const [steps, setSteps] = useState(clamp(Math.round(num(props.steps, 0)), 0, 6));
  const history: { mid: number; isBad: boolean; lo: number; hi: number }[] = [];
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    const isBad = mid >= bad;
    if (isBad) hi = mid;
    else lo = mid;
    history.push({ mid, isBad, lo, hi });
  }
  const total = history.length;
  const shown = Math.min(steps, total);
  const now = shown === 0 ? { lo: 0, hi: n - 1 } : history[shown - 1];
  const next = shown < total ? Math.floor((now.lo + now.hi) / 2) : null;
  const last = shown === 0 ? null : history[shown - 1];
  const remaining = now.hi - now.lo;
  const summary =
    shown === 0
      ? `Commit 0 is known good and commit 63 known bad. The first bad commit could be any of commits 1 to 63. The first test is commit ${next}, halfway.`
      : shown === total
        ? `After ${total} tests, commit ${now.lo} is good and commit ${now.hi} is bad, so commit ${now.hi} introduced the bug. Testing every commit in turn could have taken up to 63 tests.`
        : `Test ${shown}: commit ${last?.mid} is ${last?.isBad ? "bad, so the first bad commit is at or before it" : "good, so the first bad commit comes after it"}. ${remaining} ${remaining === 1 ? "commit remains" : "commits remain"} as candidates, ${now.lo + 1} to ${now.hi}; next, test commit ${next}.`;
  const cell = 440 / n;
  return (
    <Frame
      title="Bisecting history for the commit that broke it"
      summary={summary}
      controls={
        <>
          <Stepper label="tests done" value={shown} min={0} max={total} onChange={setSteps} />
          <Stepper label="first bad commit (hidden in real life)" value={bad} min={1} max={n - 1} onChange={(v) => {
              setBad(v);
              setSteps(0);
            }} />
        </>
      }
    >
      <svg viewBox="0 0 460 150" role="img" aria-label={`${shown} of ${total} tests done; candidates ${now.lo + 1} to ${now.hi}`}>
        <text x={10} y={16} className="fig-small">
          commits 0 to 63: shaded good, outlined candidate, filled bad
        </text>
        {Array.from({ length: n }, (_, i) => {
          const knownBad = i >= now.hi;
          const knownGood = i <= now.lo;
          const candidate = !knownBad && !knownGood;
          return (
            <rect
              key={i}
              x={10 + i * cell}
              y={28}
              width={cell - 1.5}
              height={36}
              className={knownBad ? "fig-accent" : candidate ? "fig-ghost" : "fig-fill"}
              style={i === next ? { stroke: "var(--text)", strokeWidth: 2.5 } : undefined}
            />
          );
        })}
        {[0, 16, 32, 48, 63].map((i) => (
          <text key={i} x={10 + i * cell + cell / 2} y={80} textAnchor="middle" className="fig-small">
            {i}
          </text>
        ))}
        {next !== null ? (
          <text x={10 + next * cell + cell / 2} y={98} textAnchor="middle" className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
            test next
          </text>
        ) : null}
        <text x={10} y={136} className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          {`tests: ${shown} of ${total}; candidates left: ${remaining === 1 ? "1, found" : remaining}`}
        </text>
      </svg>
    </Frame>
  );
}

const AS_PARTS: { key: string; label: string; secs: number }[] = [
  { key: "load", label: "load", secs: 9 },
  { key: "parse", label: "parse", secs: 33 },
  { key: "compute", label: "compute", secs: 12 },
  { key: "save", label: "save", secs: 6 },
];

/** Amdahl's law: speeding up one part of a 60-second program, and how much the whole gains. */
function AmdahlSpeedup(props: Props) {
  const keys = AS_PARTS.map((p) => p.key);
  const [part, setPart] = useState(typeof props.part === "string" && keys.includes(props.part) ? props.part : "compute");
  const [factor, setFactor] = useState(clamp(Math.round(num(props.factor, 10)), 1, 50));
  const total = AS_PARTS.reduce((s, p) => s + p.secs, 0);
  const after = AS_PARTS.map((p) => ({ ...p, secs: p.key === part ? p.secs / factor : p.secs }));
  const newTotal = after.reduce((s, p) => s + p.secs, 0);
  const chosen = AS_PARTS.find((p) => p.key === part) ?? AS_PARTS[0];
  const rest = total - chosen.secs;
  const fmt = (x: number) => x.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const speedup = total / newTotal;
  const ceiling = total / rest;
  const summary = `${chosen.label} takes ${chosen.secs} of the program's ${total} seconds, ${fmt((100 * chosen.secs) / total)}%. Making it ${factor} times faster brings the whole program from ${total} to ${fmt(newTotal)} seconds, ${fmt(speedup)} times faster. Even if ${chosen.label} took no time at all, the other ${rest} seconds would remain, so the whole could never be more than ${fmt(ceiling)} times faster.`;
  const scale = 440 / total;
  const bar = (rows: { key: string; label: string; secs: number }[], y: number) => {
    let x = 10;
    return rows.map((p) => {
      const w = p.secs * scale;
      const r = (
        <g key={p.key}>
          <rect x={x} y={y} width={Math.max(w - 2, 0.5)} height={30} className={p.key === part ? "fig-accent" : "fig-fill"} />
          {w >= 42 ? (
            <text x={x + w / 2 - 1} y={y + 19} textAnchor="middle" className="fig-small" style={{ fill: "var(--bg)" }}>
              {`${p.label} ${fmt(p.secs)}`}
            </text>
          ) : null}
        </g>
      );
      x += w;
      return r;
    });
  };
  return (
    <Frame
      title="Speeding up one part of a program"
      summary={summary}
      controls={
        <>
          <span className="label">speed up</span>
          {AS_PARTS.map((p) => (
            <button key={p.key} type="button" className="btn btn-secondary btn-small" aria-pressed={p.key === part} onClick={() => setPart(p.key)}>
              {p.label}
            </button>
          ))}
          <Stepper label="times faster" value={factor} min={1} max={50} onChange={setFactor} />
        </>
      }
    >
      <svg viewBox="0 0 460 170" role="img" aria-label={`Whole program ${fmt(speedup)} times faster, at most ${fmt(ceiling)}`}>
        <text x={10} y={16} className="fig-small">
          {`before: ${total} seconds`}
        </text>
        {bar(AS_PARTS, 24)}
        <text x={10} y={76} className="fig-small">
          {`after: ${fmt(newTotal)} seconds`}
        </text>
        {bar(after, 84)}
        <line x1={10 + newTotal * scale} y1={80} x2={10 + newTotal * scale} y2={120} className="fig-guide" />
        <text x={10} y={140} className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          {`whole program: ${fmt(speedup)} times faster`}
        </text>
        <text x={10} y={158} className="fig-small">
          {`limit if ${chosen.label} took no time: ${fmt(ceiling)} times`}
        </text>
      </svg>
    </Frame>
  );
}
/** A CI pipeline in three stages on a pool of runners: what more runners and a dependency cache each buy. */
function CiPipeline(props: Props) {
  const [runners, setRunners] = useState(clamp(Math.round(num(props.runners, 1)), 1, 4));
  const [cache, setCache] = useState(props.cache === true);
  const install = cache ? 1 : 6;
  const middle = [
    { name: "lint", mins: 2 },
    { name: "types", mins: 3 },
    { name: "unit", mins: 9 },
    { name: "build", mins: 5 },
  ];
  const e2e = 7;
  const bars: { name: string; runner: number; start: number; mins: number }[] = [{ name: "install", runner: 0, start: 0, mins: install }];
  const freeAt = Array.from({ length: runners }, () => install);
  for (const job of middle) {
    let first = 0;
    for (let i = 1; i < runners; i++) if (freeAt[i] < freeAt[first]) first = i;
    bars.push({ name: job.name, runner: first, start: freeAt[first], mins: job.mins });
    freeAt[first] += job.mins;
  }
  const middleEnd = Math.max(...freeAt);
  bars.push({ name: "e2e", runner: 0, start: middleEnd, mins: e2e });
  const total = middleEnd + e2e;
  const middleLen = middleEnd - install;
  const bound = runners >= 3 ? " The 9-minute unit tests now set the length of the middle stage, so another runner would not help; splitting the unit tests into smaller jobs would." : "";
  const summary = `With ${plural(runners, "runner")}${cache ? " and a dependency cache" : ""}, installing takes ${plural(install, "minute")}, the four checks are done ${plural(middleLen, "minute")} after that, and the end-to-end tests take ${e2e} more: ${plural(total, "minute")} from push to result.${bound}`;
  const scale = 440 / 32;
  const rowH = 26;
  return (
    <Frame
      title="A pipeline on a pool of runners"
      summary={summary}
      controls={
        <>
          <Stepper label="runners" value={runners} min={1} max={4} onChange={setRunners} />
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={cache} onClick={() => setCache(!cache)}>
            cache dependencies
          </button>
        </>
      }
    >
      <svg viewBox="0 0 460 184" role="img" aria-label={`Pipeline takes ${plural(total, "minute")} on ${plural(runners, "runner")}`}>
        <text x={10} y={14} className="fig-small">
          one row per runner; time runs left to right
        </text>
        {Array.from({ length: 4 }, (_, r) => (
          <rect key={r} x={10} y={24 + r * rowH} width={440} height={rowH - 4} className={r < runners ? "fig-ghost" : "fig-grid"} style={r < runners ? undefined : { fill: "none" }} />
        ))}
        {bars.map((b) => {
          const w = b.mins * scale;
          return (
            <g key={b.name}>
              <rect x={10 + b.start * scale} y={24 + b.runner * rowH} width={Math.max(w - 1.5, 1)} height={rowH - 4} className={b.name === "unit" ? "fig-accent" : "fig-fill"} />
              {w >= 34 ? (
                <text x={10 + b.start * scale + w / 2} y={24 + b.runner * rowH + 15} textAnchor="middle" className="fig-small" style={{ fill: "var(--bg)" }}>
                  {b.name}
                </text>
              ) : null}
            </g>
          );
        })}
        {[install, middleEnd].map((t, i) => (
          <line key={i} x1={10 + t * scale} y1={20} x2={10 + t * scale} y2={24 + 4 * rowH} className="fig-guide" />
        ))}
        {[0, 8, 16, 24, 32].map((t) => (
          <text key={t} x={10 + t * scale} y={142} textAnchor="middle" className="fig-small">
            {t}
          </text>
        ))}
        <text x={10} y={158} className="fig-small">
          jobs in order: install, lint, types, unit (highlighted), build, e2e
        </text>
        <text x={10} y={176} className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          {`push to result: ${plural(total, "minute")}`}
        </text>
      </svg>
    </Frame>
  );
}
const BT_COUNTS = [10, 100, 1000];

function btDraws(n: number) {
  // A fixed linear congruential generator, so the same tests appear on every visit.
  const out: number[] = [];
  let s = 1127;
  for (let i = 0; i < n; i++) {
    s = (s * 48271) % 2147483647;
    out.push(Math.floor((s / 2147483647) * 2001));
  }
  return out;
}

/** Random tests against boundary tests for a discount whose code says > where the rule says at least. */
function BoundaryTests(props: Props) {
  const startN = clamp(Math.round(num(props.random, 100)), 0, 1000);
  const [n, setN] = useState(BT_COUNTS.includes(startN) ? startN : 100);
  const [edges, setEdges] = useState(props.boundary === true);
  const draws = btDraws(n);
  const hits = draws.filter((x) => x === 1000).length;
  const boundary = [0, 999, 1000, 1001, 2000];
  const chance = 1 - Math.pow(2000 / 2001, n);
  const pct = (100 * chance).toLocaleString("en-IN", { maximumFractionDigits: 1 });
  const found = hits > 0 || edges;
  const randomPart = `${group(n)} random amounts from ₹0 to ₹2,000: ${hits === 0 ? "none is exactly ₹1,000, so every one passes" : `${plural(hits, "test")} landed on ₹1,000 and failed`}. Any one random test has a 1 in 2,001 chance of hitting the bug, so ${group(n)} of them find it ${pct}% of the time.`;
  const edgePart = edges ? " The boundary tests try ₹0, ₹999, ₹1,000, ₹1,001 and ₹2,000, and the one at ₹1,000 fails: the bug is found with five tests." : "";
  const summary = `The rule: 10% off orders of ₹1,000 or more. The code says amount > 1000. ${randomPart}${edgePart}`;
  const x = (v: number) => 10 + (v / 2000) * 440;
  return (
    <Frame
      title="Where the tests land"
      summary={summary}
      controls={
        <>
          <span className="label">random tests</span>
          {BT_COUNTS.map((c) => (
            <button key={c} type="button" className="btn btn-secondary btn-small" aria-pressed={c === n} onClick={() => setN(c)}>
              {group(c)}
            </button>
          ))}
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={edges} onClick={() => setEdges(!edges)}>
            boundary tests
          </button>
        </>
      }
    >
      <svg viewBox="0 0 460 150" role="img" aria-label={found ? "The bug at ₹1,000 is found" : "No test lands on ₹1,000; the bug is missed"}>
        <text x={10} y={14} className="fig-small">
          order amount in rupees; each mark is one test
        </text>
        <line x1={10} y1={70} x2={450} y2={70} className="fig-axis" />
        {draws.map((v, i) => (
          <line key={i} x1={x(v)} y1={44} x2={x(v)} y2={68} className="fig-line" style={{ opacity: n >= 1000 ? 0.35 : 0.8 }} />
        ))}
        {edges
          ? boundary.map((v) => (
              <rect key={v} x={x(v) - 3} y={74} width={6} height={16} className={v === 1000 ? "fig-accent" : "fig-fill"} />
            ))
          : null}
        <line x1={x(1000)} y1={28} x2={x(1000)} y2={96} className="fig-accent-line" />
        <text x={x(1000)} y={24} textAnchor="middle" className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          bug: exactly ₹1,000
        </text>
        {[0, 500, 1000, 1500, 2000].map((v) => (
          <text key={v} x={x(v)} y={110} textAnchor={v === 0 ? "start" : v === 2000 ? "end" : "middle"} className="fig-small">
            {group(v)}
          </text>
        ))}
        <text x={10} y={138} className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          {found ? "bug found" : "every test passes, and the bug is still there"}
        </text>
      </svg>
    </Frame>
  );
}
const TO_TESTS: Record<string, { name: string; adds: string | null; check: (cart: string[]) => boolean; expect: string }> = {
  "1": { name: "empty_at_start", adds: null, check: (c) => c.length === 0, expect: "cart is empty" },
  "2": { name: "add_chai", adds: "chai", check: (c) => c.length === 1, expect: "cart has 1 item" },
  "3": { name: "add_samosa", adds: "samosa", check: (c) => c.includes("samosa"), expect: "cart has a samosa" },
};
const TO_ORDERS = ["123", "132", "213", "231", "312", "321"];

/** Three tests sharing one cart: the order they run in decides which pass, unless each gets a fresh cart. */
function TestOrder(props: Props) {
  const [order, setOrder] = useState(typeof props.order === "string" && TO_ORDERS.includes(props.order) ? props.order : "213");
  const [fresh, setFresh] = useState(props.fresh === true);
  const shared: string[] = [];
  const rows: { k: string; name: string; after: string[]; ok: boolean; expect: string }[] = [];
  for (const k of order.split("")) {
    const t = TO_TESTS[k];
    const cart = fresh ? [] : shared;
    if (t.adds) cart.push(t.adds);
    rows.push({ k, name: t.name, after: [...cart], ok: t.check(cart), expect: t.expect });
  }
  const passing = rows.filter((r) => r.ok).length;
  const allOrders = TO_ORDERS.filter((o) => {
    const c: string[] = [];
    return o.split("").every((k) => {
      const cart = fresh ? [] : c;
      if (TO_TESTS[k].adds) cart.push(TO_TESTS[k].adds as string);
      return TO_TESTS[k].check(cart);
    });
  }).length;
  const show = (c: string[]) => (c.length === 0 ? "[]" : `[${c.join(", ")}]`);
  const fails = rows.filter((r) => !r.ok);
  const said = passing === 3 ? "all three pass" : `${passing} of 3 pass`;
  const why = fails.map((r) => `${r.name} expects that the ${r.expect} but finds ${show(r.after)}`).join("; ");
  const summary = fresh
    ? `Each test gets a fresh, empty cart from a fixture, so all three pass in this order, and in all ${allOrders} possible orders.`
    : `All three tests share one cart. In the order ${order.split("").join(", ")}, ${said}${why ? `: ${why}` : ""}. Only ${allOrders} of the 6 possible orders lets every test pass.`;
  return (
    <Frame
      title="Tests that share a cart"
      summary={summary}
      controls={
        <>
          <span className="label">run order</span>
          {TO_ORDERS.map((o) => (
            <button key={o} type="button" className="btn btn-secondary btn-small" aria-pressed={o === order} onClick={() => setOrder(o)}>
              {o.split("").join(" ")}
            </button>
          ))}
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={fresh} onClick={() => setFresh(!fresh)}>
            fresh cart per test
          </button>
        </>
      }
    >
      <svg viewBox="0 0 460 150" role="img" aria-label={`${passing} of 3 tests pass in the order ${order.split("").join(", ")}`}>
        <text x={10} y={16} className="fig-small">
          run
        </text>
        <text x={44} y={16} className="fig-small">
          test
        </text>
        <text x={190} y={16} className="fig-small">
          cart when it checks
        </text>
        <text x={390} y={16} className="fig-small">
          result
        </text>
        {rows.map((r, i) => (
          <g key={r.k}>
            <rect x={6} y={26 + i * 38} width={448} height={32} className={r.ok ? "fig-ghost" : "fig-fill"} />
            <text x={14} y={46 + i * 38} className="fig-small" style={{ fill: "var(--text)" }}>
              {`${i + 1}.`}
            </text>
            <text x={44} y={46 + i * 38} className="fig-small" style={{ fill: "var(--text)" }}>
              {`${r.k}: ${r.name}`}
            </text>
            <text x={190} y={46 + i * 38} className="fig-small" style={{ fill: "var(--text)" }}>
              {show(r.after)}
            </text>
            <text x={390} y={46 + i * 38} className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
              {r.ok ? "pass" : "FAIL"}
            </text>
          </g>
        ))}
      </svg>
    </Frame>
  );
}
const TD_ROWS: { key: string; label: string; secs: string; repeat: boolean; catches: boolean; refactor: boolean; note: string }[] = [
  {
    key: "real",
    label: "real gateway",
    secs: "24",
    repeat: false,
    catches: true,
    refactor: true,
    note: "The test sends 30 real text messages at 0.8 seconds each, costs money every run, and fails whenever the network does. It checks the truth, slowly and unreliably.",
  },
  {
    key: "stub",
    label: "stub",
    secs: "0.001",
    repeat: true,
    catches: false,
    refactor: true,
    note: 'The stub answers "sent" to anything and remembers nothing, so the test can only check what notify_delays returns. It would still pass if the code messaged nobody at all.',
  },
  {
    key: "fake",
    label: "fake outbox",
    secs: "0.001",
    repeat: true,
    catches: true,
    refactor: true,
    note: "The fake keeps an in-memory outbox and implements both send and send_bulk, so the test asserts that every passenger's number received the message. It checks the outcome, not how it was produced, so the bulk refactor leaves it green.",
  },
  {
    key: "mock",
    label: "strict mock",
    secs: "0.001",
    repeat: true,
    catches: true,
    refactor: false,
    note: "The mock expects exactly 30 calls to send, in order, and fails on anything else. It catches a missing message, but when the code is changed to one send_bulk call that delivers the same messages, it fails although nothing is wrong.",
  },
];

/** Four stand-ins for an SMS gateway in a test of notify_delays, and what each one can and cannot tell you. */
function TestDoubles(props: Props) {
  const [key, setKey] = useState(typeof props.double === "string" && TD_ROWS.some((r) => r.key === props.double) ? props.double : "fake");
  const row = TD_ROWS.find((r) => r.key === key) ?? TD_ROWS[2];
  const summary = `With a ${row.label}: ${row.note}`;
  const cols = [
    { x: 150, head: "seconds" },
    { x: 222, head: "repeatable" },
    { x: 310, head: "catches a" },
    { x: 400, head: "survives" },
  ];
  const yes = (b: boolean) => (b ? "yes" : "no");
  return (
    <Frame
      title="Four stand-ins for an SMS gateway"
      summary={summary}
      controls={
        <>
          <span className="label">the test uses</span>
          {TD_ROWS.map((r) => (
            <button key={r.key} type="button" className="btn btn-secondary btn-small" aria-pressed={r.key === key} onClick={() => setKey(r.key)}>
              {r.label}
            </button>
          ))}
        </>
      }
    >
      <svg viewBox="0 0 460 196" role="img" aria-label={`The test uses a ${row.label}`}>
        {cols.map((c) => (
          <text key={c.head} x={c.x} y={14} textAnchor="middle" className="fig-small">
            {c.head}
          </text>
        ))}
        <text x={310} y={28} textAnchor="middle" className="fig-small">
          missing message
        </text>
        <text x={400} y={28} textAnchor="middle" className="fig-small">
          bulk refactor
        </text>
        {TD_ROWS.map((r, i) => {
          const y = 38 + i * 38;
          const on = r.key === key;
          const cells = [r.secs, yes(r.repeat), yes(r.catches), yes(r.refactor)];
          return (
            <g key={r.key}>
              <rect x={4} y={y} width={452} height={32} className={on ? "fig-accent" : "fig-ghost"} />
              <text x={12} y={y + 20} className="fig-small" style={{ fill: on ? "var(--bg)" : "var(--text)", fontWeight: on ? 600 : 400 }}>
                {r.label}
              </text>
              {cells.map((v, j) => (
                <text key={j} x={cols[j].x} y={y + 20} textAnchor="middle" className="fig-small" style={{ fill: on ? "var(--bg)" : "var(--text)" }}>
                  {v}
                </text>
              ))}
            </g>
          );
        })}
      </svg>
    </Frame>
  );
}
const PR_COUNTS = [20, 100, 500];

function prCases(n: number, small: boolean) {
  // A fixed generator, so the same cases appear on every visit.
  const out: number[][] = [];
  let s = 1440;
  for (let i = 0; i < n; i++) {
    const c: number[] = [];
    for (let j = 0; j < 5; j++) {
      s = (s * 48271) % 2147483647;
      c.push(small ? s % 10 : s % 1440);
    }
    out.push(c);
  }
  return out;
}

function prFails(xs: number[]) {
  return new Set(xs).size < xs.length;
}

function prShrink(xs: number[]) {
  let cur = [...xs];
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < cur.length; i++) {
      const t = [...cur.slice(0, i), ...cur.slice(i + 1)];
      if (prFails(t)) {
        cur = t;
        changed = true;
        break;
      }
    }
  }
  return cur;
}

/** A property test of merge_bookings, which loses bookings made at the same minute: how the generator decides whether the bug is found. */
function PropertyRuns(props: Props) {
  const startN = Math.round(num(props.cases, 100));
  const [n, setN] = useState(PR_COUNTS.includes(startN) ? startN : 100);
  const [small, setSmall] = useState(props.gen === "small");
  const cases = prCases(n, small);
  const failing = cases.filter(prFails);
  const first = failing[0];
  const shrunk = first ? prShrink(first) : null;
  const chance = small ? "69.8%" : "0.69%";
  const range = small ? "minutes 0 to 9 only" : "all 1,440 minutes of a day";
  const show = (xs: number[]) => `[${xs.join(", ")}]`;
  const result = first && shrunk
    ? `${plural(failing.length, "list")} ${failing.length === 1 ? "fails" : "fail"} the property. The first failure, ${show(first)}, shrinks to ${show(shrunk)}: two bookings at the same minute, and the bug is plain to see.`
    : "None of them repeats a minute, so every case passes and the bug goes unnoticed.";
  const summary = `The property: merging a list of bookings keeps every booking. ${group(n)} random lists of 5 booking times, drawn from ${range}, where any one list repeats a minute with chance ${chance}. ${result}`;
  const cols = 50;
  const cell = 440 / cols;
  return (
    <Frame
      title="Random cases against one property"
      summary={summary}
      controls={
        <>
          <span className="label">cases</span>
          {PR_COUNTS.map((c) => (
            <button key={c} type="button" className="btn btn-secondary btn-small" aria-pressed={c === n} onClick={() => setN(c)}>
              {group(c)}
            </button>
          ))}
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={small} onClick={() => setSmall(!small)}>
            draw from a small range
          </button>
        </>
      }
    >
      <svg viewBox="0 0 460 150" role="img" aria-label={first ? `${failing.length} of ${n} cases fail` : `All ${n} cases pass`}>
        <text x={10} y={14} className="fig-small">
          each square is one generated list; filled squares fail
        </text>
        {cases.map((c, i) => (
          <rect key={i} x={10 + (i % cols) * cell} y={24 + Math.floor(i / cols) * cell} width={cell - 1.5} height={cell - 1.5} className={prFails(c) ? "fig-accent" : "fig-ghost"} />
        ))}
        <text x={10} y={130} className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          {shrunk ? `failing: ${failing.length} of ${group(n)}; smallest failing case: ${show(shrunk)}` : `failing: 0 of ${group(n)}`}
        </text>
      </svg>
    </Frame>
  );
}
const TC_OPTIONS = [280, 315, 340, 480];

/** Checking a route planner without knowing the true distances: the triangle rule as an oracle. */
function TriangleCheck(props: Props) {
  const start = Math.round(num(props.pn, 340));
  const [pn, setPn] = useState(TC_OPTIONS.includes(start) ? start : 340);
  const pm = 150;
  const mn = 165;
  const via = pm + mn;
  const broken = pn > via;
  const summary = broken
    ? `The planner says Pune to Nashik is ${group(pn)} km, but going through Mumbai takes ${pm} + ${mn} = ${via} km, so ${group(pn)} cannot be the shortest distance. At least one of the three answers is wrong, by ${group(pn - via)} km or more in all, though the check cannot say which.`
    : `All three triangle rules hold: ${group(pn)} ≤ ${pm} + ${mn} = ${via}, ${pm} ≤ ${group(pn)} + ${mn}, and ${mn} ≤ ${group(pn)} + ${pm}. The answers are consistent with each other, which does not prove that any of them is right.`;
  const P = { x: 70, y: 150 };
  const M = { x: 230, y: 50 };
  const N = { x: 390, y: 150 };
  return (
    <Frame
      title="A rule the answers must obey"
      summary={summary}
      controls={
        <>
          <span className="label">planner says Pune to Nashik is</span>
          {TC_OPTIONS.map((v) => (
            <button key={v} type="button" className="btn btn-secondary btn-small" aria-pressed={v === pn} onClick={() => setPn(v)}>
              {`${group(v)} km`}
            </button>
          ))}
        </>
      }
    >
      <svg viewBox="0 0 460 184" role="img" aria-label={broken ? "The triangle rule is broken" : "The triangle rule holds"}>
        <line x1={P.x} y1={P.y} x2={M.x} y2={M.y} className="fig-line" />
        <line x1={M.x} y1={M.y} x2={N.x} y2={N.y} className="fig-line" />
        <line x1={P.x} y1={P.y} x2={N.x} y2={N.y} className={broken ? "fig-accent-line" : "fig-line"} style={{ strokeWidth: broken ? 3 : undefined }} />
        {[
          { c: P, name: "Pune" },
          { c: M, name: "Mumbai" },
          { c: N, name: "Nashik" },
        ].map(({ c, name }) => (
          <g key={name}>
            <circle cx={c.x} cy={c.y} r={7} className="fig-fill" />
            <text x={c.x} y={c.y + (c.y < 100 ? -14 : 24)} textAnchor="middle" className="fig-small" style={{ fill: "var(--text)" }}>
              {name}
            </text>
          </g>
        ))}
        <text x={(P.x + M.x) / 2 - 14} y={(P.y + M.y) / 2} textAnchor="end" className="fig-small">
          {`${pm} km`}
        </text>
        <text x={(M.x + N.x) / 2 + 14} y={(M.y + N.y) / 2} className="fig-small">
          {`${mn} km`}
        </text>
        <text x={(P.x + N.x) / 2} y={P.y - 8} textAnchor="middle" className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          {`${group(pn)} km`}
        </text>
        <text x={10} y={16} className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          {broken ? `broken: ${group(pn)} > ${via}` : `consistent: ${group(pn)} ≤ ${via}`}
        </text>
      </svg>
    </Frame>
  );
}
const TP_MIXES: Record<string, { label: string; unit: number; integ: number; e2e: number }> = {
  units: { label: "unit tests only", unit: 5200, integ: 0, e2e: 0 },
  pyramid: { label: "pyramid", unit: 5000, integ: 200, e2e: 20 },
  cone: { label: "mostly end-to-end", unit: 200, integ: 100, e2e: 300 },
};
const TP_BUGS: { name: string; needs: "unit" | "integ" | "e2e" }[] = [
  { name: "fare rounded the wrong way", needs: "unit" },
  { name: "time stored without its time zone", needs: "integ" },
  { name: "app sends rupees, server expects paise", needs: "integ" },
  { name: "Pay button hidden on small phones", needs: "e2e" },
];

/** Three mixes of unit, integration and end-to-end tests: time per run, chance of a clean run, and which bugs each catches. */
function TestPyramid(props: Props) {
  const [key, setKey] = useState(typeof props.mix === "string" && props.mix in TP_MIXES ? props.mix : "pyramid");
  const m = TP_MIXES[key];
  const secs = m.unit * 0.005 + m.integ * 2 + m.e2e * 30;
  const mins = Math.round(secs / 60);
  const clean = Math.pow(0.999, m.integ) * Math.pow(0.99, m.e2e);
  const caught = TP_BUGS.filter((b) => (b.needs === "unit" ? m.unit > 0 : b.needs === "integ" ? m.integ > 0 || m.e2e > 0 : m.e2e > 0));
  const time = mins >= 120 ? `${(secs / 3600).toLocaleString("en-IN", { maximumFractionDigits: 1 })} hours` : plural(Math.max(mins, 1), "minute");
  const cleanPct = Math.round(clean * 100);
  const summary = `${group(m.unit)} unit, ${group(m.integ)} integration and ${group(m.e2e)} end-to-end tests take about ${time} a run on one machine. With integration tests failing by accident 1 time in 1,000 and end-to-end tests 1 time in 100, ${cleanPct}% of runs come back clean. The suite catches ${caught.length} of the 4 bugs${caught.length < 4 ? `, missing: ${TP_BUGS.filter((b) => !caught.includes(b)).map((b) => b.name).join("; ")}` : ""}.`;
  const layers = [
    { name: "end-to-end", n: m.e2e },
    { name: "integration", n: m.integ },
    { name: "unit", n: m.unit },
  ];
  return (
    <Frame
      title="How a test suite is balanced"
      summary={summary}
      controls={
        <>
          <span className="label">mix</span>
          {Object.keys(TP_MIXES).map((k) => (
            <button key={k} type="button" className="btn btn-secondary btn-small" aria-pressed={k === key} onClick={() => setKey(k)}>
              {TP_MIXES[k].label}
            </button>
          ))}
        </>
      }
    >
      <svg viewBox="0 0 460 200" role="img" aria-label={`${TP_MIXES[key].label}: about ${time} a run, ${cleanPct}% clean, ${caught.length} of 4 bugs caught`}>
        {layers.map((l, i) => {
          const max = Math.max(m.unit, m.integ, m.e2e, 1);
          const filled = l.n === 0 ? 0 : Math.max(6, (Math.log10(l.n + 1) / Math.log10(max + 1)) * 290);
          return (
            <g key={l.name}>
              <text x={10} y={32 + i * 40} className="fig-small" style={{ fill: "var(--text)" }}>
                {`${l.name}: ${group(l.n)}`}
              </text>
              <rect x={160} y={12 + i * 40} width={290} height={30} className="fig-ghost" />
              <rect x={160} y={12 + i * 40} width={filled} height={30} className={l.name === "end-to-end" && m.e2e > m.unit ? "fig-accent" : "fig-fill"} />
            </g>
          );
        })}
        <text x={10} y={150} className="fig-small">
          bar widths on a logarithmic scale
        </text>
        <text x={10} y={170} className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          {`about ${time} a run; ${cleanPct}% of runs clean`}
        </text>
        <text x={10} y={190} className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          {`bugs caught: ${caught.length} of 4`}
        </text>
      </svg>
    </Frame>
  );
}
const MS_MUTANTS: { name: string; f: (a: number) => number }[] = [
  { name: "> for >=", f: (a) => (a > 1000 ? a * 0.9 : a) },
  { name: "0.8 for 0.9", f: (a) => (a >= 1000 ? a * 0.8 : a) },
  { name: "100 for 1000", f: (a) => (a >= 100 ? a * 0.9 : a) },
  { name: "0 for a", f: (a) => (a >= 1000 ? a * 0.9 : 0) },
  { name: "<= for >=", f: (a) => (a <= 1000 ? a * 0.9 : a) },
  { name: "- for *", f: (a) => (a >= 1000 ? a - 0.9 : a) },
];
const MS_TESTS: { key: string; label: string; inputs: number[]; check: boolean }[] = [
  { key: "types", label: "types only", inputs: [1500, 500], check: false },
  { key: "t1500", label: "1,500 gives 1,350", inputs: [1500], check: true },
  { key: "t1000", label: "1,000 gives 900", inputs: [1000], check: true },
  { key: "t500", label: "500 gives 500", inputs: [500], check: true },
];

function msRight(a: number) {
  return a >= 1000 ? a * 0.9 : a;
}

/** Coverage against mutation score for a 10% discount on orders of 1,000 or more. */
function MutationScore(props: Props) {
  const start = Array.isArray(props.tests) ? props.tests.filter((t): t is string => typeof t === "string") : ["types"];
  const [on, setOn] = useState<string[]>(MS_TESTS.map((t) => t.key).filter((k) => start.includes(k)));
  const toggle = (k: string) => setOn(on.includes(k) ? on.filter((x) => x !== k) : [...on, k]);
  const chosen = MS_TESTS.filter((t) => on.includes(t.key));
  const inputs = chosen.flatMap((t) => t.inputs);
  const branches = new Set(inputs.map((a) => (a >= 1000 ? "discount" : "full")));
  const coverage = Math.round((100 * (1 + branches.size)) / 3);
  const killedBy = (m: (a: number) => number) => chosen.some((t) => t.check && t.inputs.some((a) => Math.abs(m(a) - msRight(a)) > 1e-9));
  const killed = MS_MUTANTS.filter((m) => killedBy(m.f));
  const survivors = MS_MUTANTS.filter((m) => !killedBy(m.f));
  const lineText = inputs.length === 0 ? "No tests: no line runs" : `Line coverage ${coverage}%`;
  const summary = `${lineText}. ${killed.length} of ${MS_MUTANTS.length} mutants killed, a mutation score of ${Math.round((100 * killed.length) / MS_MUTANTS.length)}%.${survivors.length ? ` Surviving: ${survivors.map((m) => m.name).join(", ")}.` : " Every mutant is killed."}${chosen.some((t) => !t.check) && !chosen.some((t) => t.check) ? " The tests run every line but check nothing that a mutant could change." : ""}`;
  return (
    <Frame
      title="Coverage against mutants"
      summary={summary}
      controls={
        <>
          <span className="label">tests in the suite</span>
          {MS_TESTS.map((t) => (
            <button key={t.key} type="button" className="btn btn-secondary btn-small" aria-pressed={on.includes(t.key)} onClick={() => toggle(t.key)}>
              {t.label}
            </button>
          ))}
        </>
      }
    >
      <svg viewBox="0 0 460 196" role="img" aria-label={`${killed.length} of ${MS_MUTANTS.length} mutants killed`}>
        <text x={10} y={14} className="fig-small">
          {"discount(a): 10% off if a >= 1000; each mutant changes one thing"}
        </text>
        {MS_MUTANTS.map((m, i) => {
          const dead = killed.includes(m);
          const y = 24 + i * 26;
          return (
            <g key={m.name}>
              <rect x={10} y={y} width={440} height={22} className={dead ? "fig-fill" : "fig-ghost"} />
              <text x={20} y={y + 15} className="fig-small" style={{ fill: dead ? "var(--bg)" : "var(--text)" }}>
                {m.name}
              </text>
              <text x={440} y={y + 15} textAnchor="end" className="fig-small" style={{ fill: dead ? "var(--bg)" : "var(--text)", fontWeight: 600 }}>
                {dead ? "killed" : "survives"}
              </text>
            </g>
          );
        })}
        <text x={10} y={190} className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          {`${inputs.length === 0 ? "line coverage 0%" : `line coverage ${coverage}%`}; mutants killed ${killed.length} of ${MS_MUTANTS.length}`}
        </text>
      </svg>
    </Frame>
  );
}
const SP_WAITS = ["1", "2", "3", "5", "poll"];

function spTimes() {
  // Twenty runs of a background job that finishes at a random moment between 0 and 4 seconds.
  const out: number[] = [];
  let s = 42;
  for (let i = 0; i < 20; i++) {
    s = (s * 48271) % 2147483647;
    out.push((s / 2147483647) * 4);
  }
  return out;
}

/** A test that sleeps a fixed time before checking a background job, against one that polls until the job is done. */
function SleepPoll(props: Props) {
  const startKey = typeof props.wait === "string" ? props.wait : typeof props.wait === "number" ? String(props.wait) : "3";
  const [key, setKey] = useState(SP_WAITS.includes(startKey) ? startKey : "3");
  const times = spTimes();
  const poll = key === "poll";
  const wait = poll ? null : Number(key);
  const fails = wait === null ? 0 : times.filter((t) => t > wait).length;
  const waited = times.map((t) => (wait === null ? Math.ceil(t / 0.1 - 1e-9) * 0.1 : wait));
  const avg = waited.reduce((a, b) => a + b, 0) / times.length;
  const fmt = (x: number) => x.toLocaleString("en-IN", { maximumFractionDigits: 1 });
  const w = wait ?? 0;
  const longRun = Math.round((Math.max(0, 4 - w) / 4) * 100);
  const summary = poll
    ? `Checking every 0.1 seconds, for up to 10 seconds: none of the 20 runs fails, and each waits only until its job is done, ${fmt(avg)} seconds on average.`
    : fails === 0
      ? `Sleeping ${plural(w, "second")} before checking: none of the 20 runs fails, but every run waits the full ${plural(w, "second")}, whenever its job actually finished.`
      : `Sleeping ${plural(w, "second")} before checking: ${fails} of the 20 runs fail, because their job had not finished yet, and every run waits the full ${plural(w, "second")}. In the long run, ${longRun}% of runs would fail.`;
  const x = (t: number) => 10 + (t / 5) * 440;
  return (
    <Frame
      title="Sleeping against polling"
      summary={summary}
      controls={
        <>
          <span className="label">the test</span>
          {SP_WAITS.map((k) => (
            <button key={k} type="button" className="btn btn-secondary btn-small" aria-pressed={k === key} onClick={() => setKey(k)}>
              {k === "poll" ? "polls until done" : `sleeps ${k} s`}
            </button>
          ))}
        </>
      }
    >
      <svg viewBox="0 0 460 150" role="img" aria-label={poll ? "No run fails" : `${fails} of 20 runs fail`}>
        <text x={10} y={14} className="fig-small">
          {"when each of 20 runs' background job finished, in seconds"}
        </text>
        {times.map((t, i) => {
          const failed = wait !== null && t > wait;
          return <rect key={i} x={x(t) - 3} y={28 + (i % 4) * 16} width={6} height={12} className={failed ? "fig-accent" : "fig-fill"} />;
        })}
        {wait !== null ? (
          <>
            <line x1={x(wait)} y1={22} x2={x(wait)} y2={100} className="fig-accent-line" />
            <text x={x(wait) + (wait >= 4.5 ? -4 : 4)} y={98} textAnchor={wait >= 4.5 ? "end" : "start"} className="fig-small" style={{ fill: "var(--text)" }}>
              check
            </text>
          </>
        ) : null}
        <line x1={10} y1={104} x2={450} y2={104} className="fig-axis" />
        {[0, 1, 2, 3, 4, 5].map((t) => (
          <text key={t} x={x(t)} y={120} textAnchor="middle" className="fig-small">
            {t}
          </text>
        ))}
        <text x={10} y={142} className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          {`failed runs: ${fails} of 20; average wait: ${fmt(avg)} s`}
        </text>
      </svg>
    </Frame>
  );
}
const ME_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ME_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ME_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const ME_CHOSEN: [number, number][] = [
  [5, 15],
  [0, 31],
  [1, 28],
  [3, 30],
  [11, 31],
];

function meDayOfYear(month: number, day: number) {
  let n = day;
  for (let m = 0; m < month; m++) n += ME_LENGTHS[m];
  return n;
}

function meDate(doy: number): [number, number] {
  let rest = doy;
  for (let m = 0; m < 12; m++) {
    if (rest <= ME_LENGTHS[m]) return [m, rest];
    rest -= ME_LENGTHS[m];
  }
  return [11, 31];
}

/** A test of a "tomorrow" function that is wrong on the last day of each month, run on the real date every day of 2027 or on chosen dates every run. */
function MonthEnd(props: Props) {
  const [mode, setMode] = useState(props.mode === "chosen" ? "chosen" : "real");
  const [day, setDay] = useState(clamp(Math.round(num(props.day, 73)), 1, 365));
  const [rm, rd] = meDate(day);
  const label = (m: number, d: number) => `${d} ${ME_MONTHS[m]}`;
  const longLabel = (m: number, d: number) => `${d} ${ME_LONG[m]}`;
  const lastDays: number[] = [];
  for (let m = 0; m < 12; m++) lastDays.push(meDayOfYear(m, ME_LENGTHS[m]));
  const failedSoFar = lastDays.filter((n) => n <= day);
  const chosen = mode === "chosen";
  const failedNames = failedSoFar.map((n) => {
    const [m, d] = meDate(n);
    return longLabel(m, d);
  });
  const todayFails = lastDays.includes(day);
  const summary = chosen
    ? "With the clock passed in, every run checks the same five dates: 15 June, 31 January, 28 February, 30 April and 31 December. Four of them are month ends, so every run fails, on the same dates, until the code is fixed."
    : `The test reads the real date and has run once a day from 1 January to ${longLabel(rm, rd)}. Today's run ${todayFails ? "fails" : "passes"}. It has failed on ${failedSoFar.length === 0 ? "no days" : plural(failedSoFar.length, "day")}${failedNames.length > 0 && failedNames.length <= 3 ? `, ${failedNames.join(" and ")},` : ""} and passed on ${plural(day - failedSoFar.length, "other day")}. Each failure looked like a flake, because the next day's run passed. Over the whole year it fails on 12 of 365 days.`;
  const cell = 13;
  const x0 = 34;
  const y0 = 24;
  return (
    <Frame
      title="The real clock against chosen dates"
      summary={summary}
      controls={
        <>
          <span className="label">the test</span>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={!chosen} onClick={() => setMode("real")}>
            reads the real date
          </button>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={chosen} onClick={() => setMode("chosen")}>
            is given chosen dates
          </button>
          {chosen ? null : <Slider label="today" value={day} min={1} max={365} onChange={setDay} text={label(rm, rd)} />}
        </>
      }
    >
      <svg viewBox="0 0 460 200" role="img" aria-label={chosen ? "Five chosen dates, four of them month ends, fail on every run" : `Runs up to ${label(rm, rd)}: ${failedSoFar.length} failed`}>
        <text x={10} y={14} className="fig-small">
          {chosen ? "2027: the dates the test checks on every run" : "2027: one run a day, failures marked"}
        </text>
        {ME_MONTHS.map((name, m) => (
          <g key={name}>
            <text x={10} y={y0 + m * cell + 10} className="fig-small">
              {name}
            </text>
            {Array.from({ length: ME_LENGTHS[m] }, (_, i) => {
              const d = i + 1;
              const n = meDayOfYear(m, d);
              const isLast = d === ME_LENGTHS[m];
              const isChosen = ME_CHOSEN.some(([cm, cd]) => cm === m && cd === d);
              let cls = "fig-ghost";
              if (chosen) {
                if (isChosen) cls = isLast ? "fig-accent" : "fig-fill";
              } else if (n <= day) {
                cls = isLast ? "fig-accent" : "fig-fill";
              }
              return <rect key={d} x={x0 + i * cell} y={y0 + m * cell} width={cell - 2} height={cell - 2} className={cls} />;
            })}
          </g>
        ))}
        {chosen ? null : <rect x={x0 + (rd - 1) * cell - 2} y={y0 + rm * cell - 2} width={cell + 2} height={cell + 2} className="fig-line" />}
        <text x={10} y={y0 + 12 * cell + 20} className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          {chosen ? "failures: 4 of 5 dates, on every run" : `failures so far: ${failedSoFar.length} of ${day} runs`}
        </text>
      </svg>
    </Frame>
  );
}
function fhGuidedSteps(len: number) {
  // One run of a fuzzer that keeps inputs reaching new code: it mutates one random byte of its
  // best input, and keeps the result when one more byte of the header is right.
  const reached: number[] = [0];
  let s = 2027;
  let matched = 0;
  let step = 0;
  while (matched < len && step < 1000000) {
    step += 1;
    s = (s * 48271) % 2147483647;
    const pos = s % len;
    s = (s * 48271) % 2147483647;
    const value = s % 256;
    if (pos === matched && value === 7) {
      matched += 1;
      reached.push(step);
    }
  }
  return reached;
}

/** How many inputs a fuzzer needs to get past a header check: random bytes against keeping inputs that reach new code. */
function FuzzHeader(props: Props) {
  const [len, setLen] = useState(clamp(Math.round(num(props.bytes, 4)), 1, 4));
  const [power, setPower] = useState(clamp(Math.round(num(props.budget, 4)), 1, 10));
  const budget = 10 ** power;
  const guided = fhGuidedSteps(len);
  const randomAt: number[] = [0];
  for (let k = 1; k <= len; k++) randomAt.push(256 ** k);
  const randomGot = randomAt.filter((n, k) => k > 0 && n <= budget).length;
  const guidedGot = guided.filter((n, k) => k > 0 && n <= budget).length;
  const total = 256 ** len;
  const summary =
    `A ${len}-byte header. After ${group(budget)} inputs, random bytes have on average got ${randomGot} of ${len} header bytes right` +
    (randomGot === len ? `, getting past it after about ${group(total)} inputs` : `; they need about ${group(total)} inputs to get past it`) +
    `. The fuzzer that keeps inputs reaching new code ` +
    (guidedGot === len ? `got past the whole header after ${group(guided[len])} inputs, and every input since has tested the code behind it.` : `has ${guidedGot} of ${len} bytes right so far.`);
  const x = (n: number) => 40 + (Math.log10(Math.max(1, n)) / 10) * 400;
  const y = (k: number) => 130 - (k / len) * 100;
  const stairs = (at: number[]) => {
    const pts: string[] = [`${x(1)},${y(0)}`];
    for (let k = 1; k < at.length; k++) {
      if (at[k] > 1e10) break;
      pts.push(`${x(at[k])},${y(k - 1)}`, `${x(at[k])},${y(k)}`);
    }
    const last = at.filter((n) => n <= 1e10).length - 1;
    pts.push(`${x(1e10)},${y(last)}`);
    return pts.join(" ");
  };
  return (
    <Frame
      title="Getting past a header check"
      summary={summary}
      controls={
        <>
          <Stepper label="header bytes" value={len} min={1} max={4} onChange={setLen} />
          <Slider label="inputs tried" value={power} min={1} max={10} onChange={setPower} text={group(budget)} />
        </>
      }
    >
      <svg viewBox="0 0 460 190" role="img" aria-label={`After ${group(budget)} inputs: random ${randomGot} of ${len} bytes, guided ${guidedGot} of ${len}`}>
        <text x={10} y={14} className="fig-small">
          header bytes right, against inputs tried (marks ten times apart)
        </text>
        {Array.from({ length: len + 1 }, (_, k) => (
          <g key={k}>
            <line x1={40} y1={y(k)} x2={440} y2={y(k)} className="fig-grid" />
            <text x={30} y={y(k) + 4} textAnchor="end" className="fig-small">
              {k}
            </text>
          </g>
        ))}
        {Array.from({ length: 11 }, (_, p) => (
          <line key={p} x1={x(10 ** p)} y1={130} x2={x(10 ** p)} y2={135} className="fig-axis" />
        ))}
        <text x={x(1)} y={148} className="fig-small">
          1
        </text>
        <text x={x(1e5)} y={148} textAnchor="middle" className="fig-small">
          1,00,000
        </text>
        <text x={x(1e10)} y={148} textAnchor="end" className="fig-small">
          10,00,00,00,000
        </text>
        <polyline points={stairs(randomAt)} className="fig-line" />
        <polyline points={stairs(guided)} className="fig-accent-line" fill="none" />
        <line x1={x(budget)} y1={24} x2={x(budget)} y2={130} className="fig-guide" />
        <text x={10} y={168} className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          {`thick line: keeps new coverage, ${guidedGot} of ${len}`}
        </text>
        <text x={10} y={184} className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          {`thin line: random bytes, on average, ${randomGot} of ${len}`}
        </text>
      </svg>
    </Frame>
  );
}
const TS_SOURCES = ["fare = base*1.18 + gst2", "age>=18", "x = 3 $ 4"];

type TsToken = { kind: string; text: string; start: number; end: number };

function tsScan(src: string) {
  const tokens: TsToken[] = [];
  let error = -1;
  let i = 0;
  const isDigit = (c: string) => c >= "0" && c <= "9";
  const isLetter = (c: string) => (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_";
  while (i < src.length) {
    const c = src[i];
    if (c === " ") {
      i += 1;
    } else if (isDigit(c)) {
      let j = i;
      while (j < src.length && isDigit(src[j])) j += 1;
      if (src[j] === "." && j + 1 < src.length && isDigit(src[j + 1])) {
        j += 1;
        while (j < src.length && isDigit(src[j])) j += 1;
      }
      tokens.push({ kind: "number", text: src.slice(i, j), start: i, end: j });
      i = j;
    } else if (isLetter(c)) {
      let j = i;
      while (j < src.length && (isLetter(src[j]) || isDigit(src[j]))) j += 1;
      tokens.push({ kind: "name", text: src.slice(i, j), start: i, end: j });
      i = j;
    } else {
      const two = src.slice(i, i + 2);
      const op = ["<=", ">=", "==", "!="].includes(two) ? two : "+-*/()=<>".includes(c) ? c : "";
      if (op === "") {
        error = i;
        break;
      }
      tokens.push({ kind: "op", text: op, start: i, end: i + op.length });
      i += op.length;
    }
  }
  return { tokens, error };
}

/** A tokeniser reading a line of code: each step skips spaces and takes the longest token at the cursor. */
function TokenScan(props: Props) {
  const startSrc = typeof props.source === "string" && TS_SOURCES.includes(props.source) ? props.source : TS_SOURCES[0];
  const [src, setSrc] = useState(startSrc);
  const { tokens, error } = tsScan(src);
  const steps = tokens.length + (error >= 0 ? 1 : 0);
  const [stepRaw, setStep] = useState(clamp(Math.round(num(props.step, 0)), 0, 20));
  const step = Math.min(stepRaw, steps);
  const shown = tokens.slice(0, Math.min(step, tokens.length));
  const atError = error >= 0 && step === steps;
  const last = shown.length > 0 ? shown[shown.length - 1] : null;
  const cursor = atError ? error : last ? last.end : 0;
  const why = (t: TsToken) =>
    t.kind === "number"
      ? t.text.includes(".")
        ? "Digits, then a dot and more digits, make one number."
        : "The scanner reads digits for as long as they last."
      : t.kind === "name"
        ? t.text.length > 1 && /[0-9]/.test(t.text)
          ? `A letter starts a name, which runs on through letters and digits, so ${t.text} is one name.`
          : "A letter starts a name, which runs on through letters, digits and underscores."
        : t.text.length === 2
          ? `${t.text} is one token, not two: the scanner takes the longest operator that matches.`
          : "A single operator character.";
  const summary =
    step === 0
      ? "The scanner starts at position 0. Each step skips spaces, then reads the longest token that starts at the cursor."
      : atError
        ? `Position ${error} holds ${src[error]}, which starts no token, so the scanner stops with an error that names the position, after ${plural(tokens.length, "token")}.`
        : last
          ? `Token ${step}: ${last.kind} ${last.text}, positions ${last.start} to ${last.end - 1}. ${why(last)}${step === tokens.length && error < 0 ? ` All ${tokens.length} tokens are read; the parser sees only these, not the characters or the spaces.` : ""}`
          : "";
  const cw = 18;
  const x0 = Math.max(10, Math.round((460 - src.length * cw) / 2));
  return (
    <Frame
      title="Reading tokens"
      summary={summary}
      controls={
        <>
          <span className="label">the line</span>
          {TS_SOURCES.map((s) => (
            <button
              key={s}
              type="button"
              className="btn btn-secondary btn-small"
              aria-pressed={s === src}
              onClick={() => {
                setSrc(s);
                setStep(0);
              }}
            >
              {s}
            </button>
          ))}
          <Stepper label="steps" value={step} min={0} max={steps} onChange={setStep} />
        </>
      }
    >
      <svg viewBox="0 0 460 130" role="img" aria-label={`${shown.length} tokens read from ${src}`}>
        {src.split("").map((c, i) => {
          const read = i < cursor;
          return (
            <g key={i}>
              <rect x={x0 + i * cw} y={20} width={cw - 2} height={24} className={atError && i === error ? "fig-accent" : read ? "fig-fill" : "fig-ghost"} />
              <text x={x0 + i * cw + (cw - 2) / 2} y={37} textAnchor="middle" style={{ fill: atError && i === error ? "var(--bg)" : "var(--text)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                {c === " " ? "·" : c}
              </text>
              <text x={x0 + i * cw + (cw - 2) / 2} y={14} textAnchor="middle" className="fig-small">
                {i % 5 === 0 ? i : ""}
              </text>
            </g>
          );
        })}
        <line x1={x0 + cursor * cw - 1} y1={16} x2={x0 + cursor * cw - 1} y2={48} className="fig-accent-line" />
        {shown.map((t, k) => (
          <g key={k}>
            <line x1={x0 + t.start * cw} y1={52} x2={x0 + t.end * cw - 2} y2={52} className={k === shown.length - 1 && !atError ? "fig-accent-line" : "fig-line"} />
            <text x={x0 + ((t.start + t.end) * cw) / 2 - 1} y={66 + (k % 2) * 12} textAnchor="middle" className="fig-small">
              {t.kind === "number" ? "num" : t.kind}
            </text>
          </g>
        ))}
        <text x={10} y={110} className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          {`tokens: ${shown.length === 0 ? "none yet" : shown.map((t) => t.text).join("  ")}`}
        </text>
      </svg>
    </Frame>
  );
}
const DR_INPUTS = ["3.14", "40", "7.", "1.2.3", ".5"];
const DR_STATES: { id: string; x: number; y: number; accept: boolean }[] = [
  { id: "start", x: 50, y: 62, accept: false },
  { id: "int", x: 160, y: 62, accept: true },
  { id: "dot", x: 270, y: 62, accept: false },
  { id: "frac", x: 380, y: 62, accept: true },
  { id: "stuck", x: 215, y: 150, accept: false },
];

function drStep(state: string, c: string) {
  const digit = c >= "0" && c <= "9";
  if (state === "start") return digit ? "int" : "stuck";
  if (state === "int") return digit ? "int" : c === "." ? "dot" : "stuck";
  if (state === "dot") return digit ? "frac" : "stuck";
  if (state === "frac") return digit ? "frac" : "stuck";
  return "stuck";
}

/** A finite automaton for numbers such as 3.14 reading its input one character at a time. */
function DfaRun(props: Props) {
  const startInput = typeof props.input === "string" && DR_INPUTS.includes(props.input) ? props.input : DR_INPUTS[0];
  const [input, setInput] = useState(startInput);
  const [readRaw, setRead] = useState(clamp(Math.round(num(props.read, 0)), 0, 10));
  const read = Math.min(readRaw, input.length);
  const path: string[] = ["start"];
  for (let i = 0; i < input.length; i++) path.push(drStep(path[i], input[i]));
  const state = path[read];
  const accepting = state === "int" || state === "frac";
  const done = read === input.length;
  let lastAccept = -1;
  for (let i = 1; i <= input.length; i++) if (path[i] === "int" || path[i] === "frac") lastAccept = i;
  const summary =
    read === 0
      ? `The automaton starts in state start, before reading ${input}. It will read each character once and never look back.`
      : !done
        ? `After reading ${input.slice(0, read)}, the automaton is in state ${state}, which ${accepting ? "accepts" : "does not accept"}.${state === "stuck" ? " Nothing can lead out of stuck, so the answer is already known." : ""}`
        : accepting
          ? `${input} is accepted: the automaton ends in ${state}, an accepting state, after reading each character exactly once.`
          : `${input} is rejected: the automaton ends in ${state}, which does not accept.${lastAccept > 0 ? ` A scanner using the longest match would still take ${input.slice(0, lastAccept)}, the longest prefix that ended in an accepting state.` : ""}`;
  const at = (id: string) => DR_STATES.find((s) => s.id === id) ?? DR_STATES[0];
  const edge = (a: string, b: string, label: string, dy = 0) => {
    const p = at(a);
    const q = at(b);
    const dx = q.x - p.x;
    const dyy = q.y - p.y;
    const len = Math.hypot(dx, dyy);
    const ux = dx / len;
    const uy = dyy / len;
    return (
      <g key={`${a}-${b}`}>
        <line x1={p.x + ux * 22} y1={p.y + uy * 22} x2={q.x - ux * 24} y2={q.y - uy * 24} className="fig-line" />
        <circle cx={q.x - ux * 24} cy={q.y - uy * 24} r={3} style={{ fill: "var(--text-secondary)" }} />
        <text x={(p.x + q.x) / 2} y={(p.y + q.y) / 2 - 6 + dy} textAnchor="middle" className="fig-small">
          {label}
        </text>
      </g>
    );
  };
  const loop = (id: string) => {
    const p = at(id);
    return (
      <g key={`${id}-loop`}>
        <path d={`M ${p.x - 10} ${p.y - 19} C ${p.x - 22} ${p.y - 50}, ${p.x + 22} ${p.y - 50}, ${p.x + 10} ${p.y - 19}`} className="fig-line" />
        <text x={p.x} y={p.y - 44} textAnchor="middle" className="fig-small">
          digit
        </text>
      </g>
    );
  };
  return (
    <Frame
      title="An automaton reading a number"
      summary={summary}
      controls={
        <>
          <span className="label">the input</span>
          {DR_INPUTS.map((s) => (
            <button
              key={s}
              type="button"
              className="btn btn-secondary btn-small"
              aria-pressed={s === input}
              onClick={() => {
                setInput(s);
                setRead(0);
              }}
            >
              {s}
            </button>
          ))}
          <Stepper label="characters read" value={read} min={0} max={input.length} onChange={setRead} />
        </>
      }
    >
      <svg viewBox="0 0 460 230" role="img" aria-label={`After ${read} characters of ${input}, in state ${state}`}>
        {edge("start", "int", "digit")}
        {edge("int", "dot", ".")}
        {edge("dot", "frac", "digit")}
        {loop("int")}
        {loop("frac")}
        <text x={245} y={154} className="fig-small">
          anything else
        </text>
        {DR_STATES.filter((s) => s.id !== "stuck").map((s) => (
          <line key={`${s.id}-stuck`} x1={s.x + (215 - s.x) * 0.2} y1={s.y + 20} x2={215 + (s.x - 215) * 0.14} y2={150 - 20} className="fig-guide" />
        ))}
        {DR_STATES.map((s) => (
          <g key={s.id}>
            <circle cx={s.x} cy={s.y} r={20} className={s.id === state ? "fig-accent" : "fig-fill"} />
            {s.accept ? <circle cx={s.x} cy={s.y} r={16} fill="none" style={{ stroke: s.id === state ? "var(--bg)" : "var(--text-secondary)" }} /> : null}
            <text x={s.x} y={s.y + 4} textAnchor="middle" className="fig-small" style={{ fill: s.id === state ? "var(--bg)" : "var(--text)" }}>
              {s.id}
            </text>
          </g>
        ))}
        {input.split("").map((c, i) => (
          <g key={i}>
            <rect x={150 + i * 24} y={186} width={22} height={24} className={i < read ? "fig-fill" : "fig-ghost"} />
            <text x={161 + i * 24} y={203} textAnchor="middle" style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
              {c}
            </text>
          </g>
        ))}
        <line x1={150 + read * 24 - 1} y1={182} x2={150 + read * 24 - 1} y2={214} className="fig-accent-line" />
        <text x={10} y={203} className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          {done ? (accepting ? "accepted" : "rejected") : "reading"}
        </text>
      </svg>
    </Frame>
  );
}
const PT_CASES: { key: string; label: string; a: number; b: number; c: number; op1: string; op2: string; left: boolean; summary: string }[] = [
  {
    key: "sub-left",
    label: "8 − 4 − 2, from the left",
    a: 8,
    b: 4,
    c: 2,
    op1: "−",
    op2: "−",
    left: true,
    summary: "The tree groups (8 − 4) − 2. The lower subtraction runs first, giving 4, and the root subtracts 2, giving 2, which is what arithmetic means. A rule that repeats in a loop, expr → term (− term)*, builds this left-leaning tree.",
  },
  {
    key: "sub-right",
    label: "8 − 4 − 2, from the right",
    a: 8,
    b: 4,
    c: 2,
    op1: "−",
    op2: "−",
    left: false,
    summary: "The tree groups 8 − (4 − 2). The lower subtraction gives 2 and the root gives 8 − 2 = 6. The same tokens in a different tree give a different answer. A rule that calls itself on its right, expr → term − expr, leans this way.",
  },
  {
    key: "mul-first",
    label: "2 + 3 × 4, × first",
    a: 2,
    b: 3,
    c: 4,
    op1: "+",
    op2: "×",
    left: false,
    summary: "The tree groups 2 + (3 × 4). Multiplication is handled by a lower rule, term, so it sits deeper in the tree and runs first: 3 × 4 = 12, then 2 + 12 = 14.",
  },
  {
    key: "flat",
    label: "2 + 3 × 4, left to right",
    a: 2,
    b: 3,
    c: 4,
    op1: "+",
    op2: "×",
    left: true,
    summary: "Treating + and × alike and grouping from the left gives (2 + 3) × 4 = 20, the answer a cheap calculator gives. Precedence lives in the grammar's levels, not in the tokens.",
  },
];

function ptApply(op: string, x: number, y: number) {
  return op === "−" ? x - y : op === "+" ? x + y : x * y;
}

/** Two parse trees for the same tokens: grouping and precedence decide the answer. */
function ParseTree(props: Props) {
  const startKey = typeof props.case === "string" && PT_CASES.some((c) => c.key === props.case) ? props.case : PT_CASES[0].key;
  const [key, setKey] = useState(startKey);
  const c = PT_CASES.find((x) => x.key === key) ?? PT_CASES[0];
  const inner = c.left ? ptApply(c.op1, c.a, c.b) : ptApply(c.op2, c.b, c.c);
  const total = c.left ? ptApply(c.op2, inner, c.c) : ptApply(c.op1, c.a, inner);
  const root = { x: 230, y: 34, label: c.left ? c.op2 : c.op1, value: total };
  const mid = c.left ? { x: 140, y: 94, label: c.op1, value: inner } : { x: 320, y: 94, label: c.op2, value: inner };
  const leafTop = c.left ? { x: 320, y: 94, label: String(c.c) } : { x: 140, y: 94, label: String(c.a) };
  const leaves = c.left
    ? [
        { x: 90, y: 154, label: String(c.a) },
        { x: 190, y: 154, label: String(c.b) },
      ]
    : [
        { x: 270, y: 154, label: String(c.b) },
        { x: 370, y: 154, label: String(c.c) },
      ];
  const link = (p: { x: number; y: number }, q: { x: number; y: number }, k: string) => <line key={k} x1={p.x} y1={p.y + 18} x2={q.x} y2={q.y - 18} className="fig-line" />;
  const node = (n: { x: number; y: number; label: string; value?: number }, k: string, op: boolean) => (
    <g key={k}>
      <circle cx={n.x} cy={n.y} r={18} className={op ? "fig-fill" : "fig-ghost"} />
      <text x={n.x} y={n.y + 5} textAnchor="middle" style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 14 }}>
        {n.label}
      </text>
      {n.value === undefined ? null : (
        <text x={n.x + 26} y={n.y + 5} className="fig-small" style={{ fill: "var(--focus)", fontWeight: 600 }}>
          {`= ${n.value}`}
        </text>
      )}
    </g>
  );
  return (
    <Frame
      title="One line, two trees"
      summary={c.summary}
      controls={
        <>
          <span className="label">the tree</span>
          {PT_CASES.map((x) => (
            <button key={x.key} type="button" className="btn btn-secondary btn-small" aria-pressed={x.key === key} onClick={() => setKey(x.key)}>
              {x.label}
            </button>
          ))}
        </>
      }
    >
      <svg viewBox="0 0 460 200" role="img" aria-label={`${c.label}: the root gives ${total}`}>
        {link(root, mid, "rm")}
        {link(root, leafTop, "rl")}
        {leaves.map((l, i) => link(mid, l, `ml${i}`))}
        {node(root, "root", true)}
        {node(mid, "mid", true)}
        {node(leafTop, "leaf", false)}
        {leaves.map((l, i) => node(l, `leaf${i}`, false))}
        <text x={10} y={192} className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          {`the lower operator runs first; the root gives ${total}`}
        </text>
      </svg>
    </Frame>
  );
}
type AeNode = { id: number; label: string; x: number; y: number; kids: number[]; leaf?: number | boolean };

const AE_TREES: Record<string, { label: string; nodes: AeNode[]; root: number }> = {
  arith: {
    label: "(2 + 3) × (10 − 4)",
    root: 0,
    nodes: [
      { id: 0, label: "×", x: 230, y: 30, kids: [1, 2] },
      { id: 1, label: "+", x: 130, y: 90, kids: [3, 4] },
      { id: 2, label: "−", x: 330, y: 90, kids: [5, 6] },
      { id: 3, label: "2", x: 80, y: 150, kids: [], leaf: 2 },
      { id: 4, label: "3", x: 180, y: 150, kids: [], leaf: 3 },
      { id: 5, label: "10", x: 280, y: 150, kids: [], leaf: 10 },
      { id: 6, label: "4", x: 380, y: 150, kids: [], leaf: 4 },
    ],
  },
  and: {
    label: "x ≠ 0 and 10 ÷ x > 2, with x = 0",
    root: 0,
    nodes: [
      { id: 0, label: "and", x: 230, y: 30, kids: [1, 2] },
      { id: 1, label: "≠", x: 120, y: 90, kids: [3, 4] },
      { id: 2, label: ">", x: 340, y: 90, kids: [5, 6] },
      { id: 3, label: "x", x: 80, y: 150, kids: [], leaf: 0 },
      { id: 4, label: "0", x: 160, y: 150, kids: [], leaf: 0 },
      { id: 5, label: "÷", x: 300, y: 150, kids: [7, 8] },
      { id: 6, label: "2", x: 390, y: 150, kids: [], leaf: 2 },
      { id: 7, label: "10", x: 260, y: 200, kids: [], leaf: 10 },
      { id: 8, label: "x", x: 340, y: 200, kids: [], leaf: 0 },
    ],
  },
};

function aeRun(tree: { nodes: AeNode[]; root: number }) {
  // Post-order evaluation, with `and` evaluating its right side only when the left is true.
  const order: { id: number; value: number | boolean; note: string }[] = [];
  const skipped: number[] = [];
  const skip = (id: number) => {
    skipped.push(id);
    for (const k of tree.nodes[id].kids) skip(k);
  };
  const visit = (id: number): number | boolean => {
    const n = tree.nodes[id];
    if (n.kids.length === 0) {
      const v = n.leaf ?? 0;
      order.push({ id, value: v, note: n.label === "x" ? "x is looked up in the environment: 0" : `the number ${n.label} is its own value` });
      return v;
    }
    const a = visit(n.kids[0]);
    if (n.label === "and" && !a) {
      skip(n.kids[1]);
      order.push({ id, value: false, note: "and sees a false left side, so it is false without evaluating its right side at all, and the division by zero never happens" });
      return false;
    }
    const b = visit(n.kids[1]);
    const num = (v: number | boolean) => (typeof v === "boolean" ? (v ? 1 : 0) : v);
    let v: number | boolean = 0;
    if (n.label === "+") v = num(a) + num(b);
    else if (n.label === "−") v = num(a) - num(b);
    else if (n.label === "×") v = num(a) * num(b);
    else if (n.label === "÷") v = num(a) / num(b);
    else if (n.label === ">") v = num(a) > num(b);
    else if (n.label === "≠") v = num(a) !== num(b);
    else v = b;
    order.push({ id, value: v, note: `${n.label} combines its children's values, ${String(a)} and ${String(b)}, giving ${String(v)}` });
    return v;
  };
  visit(tree.root);
  return { order, skipped };
}

/** A tree-walking evaluator visiting each node after its children, and skipping what `and` does not need. */
function AstEval(props: Props) {
  const startKey = props.tree === "and" ? "and" : "arith";
  const [key, setKey] = useState(startKey);
  const tree = AE_TREES[key];
  const { order, skipped } = aeRun(tree);
  const [stepRaw, setStep] = useState(clamp(Math.round(num(props.step, 0)), 0, 20));
  const step = Math.min(stepRaw, order.length);
  const done = order.slice(0, step);
  const value = (id: number) => done.find((d) => d.id === id)?.value;
  const last = done.length > 0 ? done[done.length - 1] : null;
  const finished = step === order.length;
  const show = (v: number | boolean) => (typeof v === "boolean" ? (v ? "True" : "False") : String(v));
  const summary =
    step === 0
      ? `The evaluator starts at the root of ${tree.label} and must evaluate a node's children before the node itself.`
      : last
        ? `Step ${step}: ${last.note.replace(/true/g, "True").replace(/false/g, "False")}.${finished ? ` The root's value, ${show(order[order.length - 1].value)}, is the value of the whole expression${skipped.length > 0 ? `, and ${plural(skipped.length, "node")} were never visited` : ""}.` : ""}`
        : "";
  return (
    <Frame
      title="Walking a syntax tree"
      summary={summary}
      controls={
        <>
          <span className="label">the expression</span>
          {Object.entries(AE_TREES).map(([k, t]) => (
            <button
              key={k}
              type="button"
              className="btn btn-secondary btn-small"
              aria-pressed={k === key}
              onClick={() => {
                setKey(k);
                setStep(0);
              }}
            >
              {t.label}
            </button>
          ))}
          <Stepper label="steps" value={step} min={0} max={order.length} onChange={setStep} />
        </>
      }
    >
      <svg viewBox="0 0 460 240" role="img" aria-label={`${tree.label}: ${step} of ${order.length} steps`}>
        {tree.nodes.flatMap((n) =>
          n.kids.map((k) => <line key={`${n.id}-${k}`} x1={n.x} y1={n.y + 16} x2={tree.nodes[k].x} y2={tree.nodes[k].y - 16} className={skipped.includes(k) && finished ? "fig-guide" : "fig-line"} />),
        )}
        {tree.nodes.map((n) => {
          const v = value(n.id);
          const isLast = last !== null && last.id === n.id;
          const gone = finished && skipped.includes(n.id);
          return (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r={16} className={isLast ? "fig-accent" : v !== undefined ? "fig-fill" : "fig-ghost"} />
              <text x={n.x} y={n.y + 5} textAnchor="middle" style={{ fill: isLast ? "var(--bg)" : gone ? "var(--text-faint)" : "var(--text)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                {n.label}
              </text>
              {v === undefined ? null : (
                <text x={n.x + 20} y={n.y - 10} className="fig-small" style={{ fill: "var(--focus)", fontWeight: 600 }}>
                  {show(v)}
                </text>
              )}
              {gone ? (
                <text x={n.x + 20} y={n.y - 10} className="fig-small">
                  skipped
                </text>
              ) : null}
            </g>
          );
        })}
        <text x={10} y={232} className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          {`step ${step} of ${order.length}${finished ? `: the value is ${show(order[order.length - 1].value)}` : ""}`}
        </text>
      </svg>
    </Frame>
  );
}
type SmIns = [string, (string | number)?];

const SM_PROGRAMS: Record<string, { label: string; code: SmIns[]; env: Record<string, number> }> = {
  fare: {
    label: "(price + tip) × qty",
    code: [["LOAD", "price"], ["LOAD", "tip"], ["ADD"], ["LOAD", "qty"], ["MUL"], ["STORE", "bill"]],
    env: { price: 450, tip: 50, qty: 2 },
  },
  loop: {
    label: "a loop: total += n while n > 0",
    code: [
      ["PUSH", 0],
      ["STORE", "total"],
      ["PUSH", 0],
      ["LOAD", "n"],
      ["LT"],
      ["JUMP_IF_FALSE", 15],
      ["LOAD", "total"],
      ["LOAD", "n"],
      ["ADD"],
      ["STORE", "total"],
      ["LOAD", "n"],
      ["PUSH", 1],
      ["SUB"],
      ["STORE", "n"],
      ["JUMP", 2],
    ],
    env: { n: 3 },
  },
};

type SmState = { pc: number; stack: (number | boolean)[]; env: Record<string, number>; note: string };

function smTrace(code: SmIns[], env0: Record<string, number>) {
  const states: SmState[] = [{ pc: 0, stack: [], env: { ...env0 }, note: "" }];
  for (let guard = 0; guard < 200; guard++) {
    const cur = states[states.length - 1];
    if (cur.pc >= code.length) break;
    const [op, arg] = code[cur.pc];
    const stack = [...cur.stack];
    const env = { ...cur.env };
    let pc = cur.pc + 1;
    let note = "";
    const show = (v: number | boolean) => (typeof v === "boolean" ? (v ? "True" : "False") : String(v));
    if (op === "PUSH") {
      stack.push(Number(arg));
      note = `PUSH ${arg} puts ${arg} on the stack.`;
    } else if (op === "LOAD") {
      const v = env[String(arg)];
      stack.push(v);
      note = `LOAD ${arg} looks up ${arg} and pushes ${v}.`;
    } else if (op === "STORE") {
      const v = stack.pop() ?? 0;
      env[String(arg)] = Number(v);
      note = `STORE ${arg} pops ${show(v)} and saves it as ${arg}.`;
    } else if (op === "JUMP_IF_FALSE") {
      const v = stack.pop();
      if (!v) pc = Number(arg);
      note = v ? `JUMP_IF_FALSE pops True, so execution carries on into the loop body.` : `JUMP_IF_FALSE pops False and jumps to ${arg}, past the end: the loop is over.`;
    } else if (op === "JUMP") {
      pc = Number(arg);
      note = `JUMP ${arg} sends execution back to the test at ${arg}: the loop goes round again.`;
    } else {
      const right = stack.pop() ?? 0;
      const left = stack.pop() ?? 0;
      const l = Number(left);
      const r = Number(right);
      const v = op === "ADD" ? l + r : op === "SUB" ? l - r : op === "MUL" ? l * r : l < r;
      stack.push(v);
      note = `${op} pops ${show(right)} and then ${show(left)}, and pushes ${show(v)}.`;
    }
    states.push({ pc, stack, env, note });
  }
  return states;
}

/** A stack machine running bytecode: a program counter, a stack and a table of variables. */
function StackMachine(props: Props) {
  const startKey = props.program === "loop" ? "loop" : "fare";
  const [key, setKey] = useState(startKey);
  const prog = SM_PROGRAMS[key];
  const states = smTrace(prog.code, prog.env);
  const total = states.length - 1;
  const [stepRaw, setStep] = useState(clamp(Math.round(num(props.step, 0)), 0, 200));
  const step = Math.min(stepRaw, total);
  const st = states[step];
  const finished = step === total;
  const vars = Object.entries(st.env)
    .map(([k, v]) => `${k} = ${v}`)
    .join(", ");
  const summary =
    step === 0
      ? `The machine starts at instruction 0 with an empty stack and ${vars}. Each step runs the instruction at the program counter.`
      : `Step ${step}: ${st.note}${finished ? ` The program counter has passed the last instruction, so the run is over after ${total} instructions, with ${vars}.` : ""}`;
  const show = (v: number | boolean) => (typeof v === "boolean" ? (v ? "True" : "False") : String(v));
  const lineH = 13;
  return (
    <Frame
      title="A stack machine"
      summary={summary}
      controls={
        <>
          <span className="label">the program</span>
          {Object.entries(SM_PROGRAMS).map(([k, p]) => (
            <button
              key={k}
              type="button"
              className="btn btn-secondary btn-small"
              aria-pressed={k === key}
              onClick={() => {
                setKey(k);
                setStep(0);
              }}
            >
              {p.label}
            </button>
          ))}
          <Slider label="instructions run" value={step} min={0} max={total} onChange={setStep} text={String(step)} />
        </>
      }
    >
      <svg viewBox="0 0 460 236" role="img" aria-label={`After ${step} instructions: stack ${st.stack.map(show).join(", ") || "empty"}`}>
        <text x={10} y={12} className="fig-small">
          code
        </text>
        {prog.code.map(([op, arg], i) => (
          <g key={i}>
            {i === st.pc ? <rect x={8} y={18 + i * lineH} width={196} height={lineH} className="fig-fill" /> : null}
            <text x={12} y={28 + i * lineH} className="fig-small" style={{ fill: i === st.pc ? "var(--text)" : undefined }}>
              {`${String(i).padStart(2, " ")}  ${op}${arg === undefined ? "" : ` ${arg}`}`}
            </text>
          </g>
        ))}
        <text x={230} y={12} className="fig-small">
          stack
        </text>
        <text x={340} y={12} className="fig-small">
          variables
        </text>
        {Object.entries(st.env).map(([k, v], i) => (
          <text key={k} x={340} y={30 + i * 16} className="fig-small" style={{ fill: "var(--text)" }}>
            {`${k} = ${v}`}
          </text>
        ))}
        {st.stack.map((v, i) => (
          <g key={i}>
            <rect x={230} y={190 - (i + 1) * 26} width={80} height={24} className={i === st.stack.length - 1 ? "fig-accent" : "fig-fill"} />
            <text x={270} y={190 - (i + 1) * 26 + 16} textAnchor="middle" style={{ fill: i === st.stack.length - 1 ? "var(--bg)" : "var(--text)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
              {show(v)}
            </text>
          </g>
        ))}
        <line x1={225} y1={192} x2={315} y2={192} className="fig-axis" />
        <text x={230} y={230} className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          {finished ? `done after ${total} instructions` : `next: instruction ${st.pc}`}
        </text>
      </svg>
    </Frame>
  );
}
const SC_FRAMES: { key: string; title: string; names: [string, string][] }[] = [
  { key: "local", title: "increment (local)", names: [["step", "1"]] },
  { key: "enclosing", title: "make_counter (enclosing)", names: [["count", "2"]] },
  { key: "global", title: "module (global)", names: [["GST_RATE", "0.18"], ["make_counter", "function"]] },
  { key: "builtin", title: "built-ins", names: [["len", "function"], ["print", "function"]] },
];
const SC_LOOKUPS = ["step", "count", "GST_RATE", "len", "discount"];

/** Where Python finds a name: local, enclosing, global, then built-in scope. */
function ScopeChain(props: Props) {
  const startName = typeof props.name === "string" && SC_LOOKUPS.includes(props.name) ? props.name : "count";
  const [name, setName] = useState(startName);
  const [returned, setReturned] = useState(props.returned === true);
  const foundAt = SC_FRAMES.findIndex((f) => f.names.some(([n]) => n === name));
  const searched = foundAt < 0 ? SC_FRAMES.length : foundAt + 1;
  const value = foundAt < 0 ? "" : (SC_FRAMES[foundAt].names.find(([n]) => n === name)?.[1] ?? "");
  const order = ["local", "enclosing", "global", "built-in"];
  const summary =
    foundAt < 0
      ? `Looking up ${name} from inside increment: Python searches all four scopes, local, enclosing, global and built-in, finds it in none, and raises NameError.`
      : foundAt === 0
        ? `Looking up ${name} from inside increment: it is a local variable, found at the first place Python looks, with the value ${value}.`
        : `Looking up ${name} from inside increment: not found in ${order.slice(0, foundAt).join(" or ")}, so Python looks further out and finds it in the ${order[foundAt]} scope${value === "function" ? ", a function" : `, with the value ${value}`}.` +
          (foundAt === 1
            ? returned
              ? " make_counter's call has finished, but count lives on in a cell that increment holds: that is a closure."
              : " increment uses count, so Python keeps it in a cell that increment will hold even after make_counter returns."
            : "");
  const boxY = (i: number) => 20 + i * 50;
  return (
    <Frame
      title="Where a name is found"
      summary={summary}
      controls={
        <>
          <span className="label">look up</span>
          {SC_LOOKUPS.map((n) => (
            <button key={n} type="button" className="btn btn-secondary btn-small" aria-pressed={n === name} onClick={() => setName(n)}>
              {n}
            </button>
          ))}
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={returned} onClick={() => setReturned(!returned)}>
            make_counter has returned
          </button>
        </>
      }
    >
      <svg viewBox="0 0 460 238" role="img" aria-label={foundAt < 0 ? `${name} is not found: NameError` : `${name} is found in the ${order[foundAt]} scope`}>
        {SC_FRAMES.map((f, i) => {
          const isFound = i === foundAt;
          const looked = i < searched;
          const ghost = returned && f.key === "enclosing";
          return (
            <g key={f.key}>
              <rect x={20} y={boxY(i)} width={300} height={40} className={isFound ? "fig-accent" : looked ? "fig-fill" : "fig-ghost"} style={ghost ? { strokeDasharray: "4 4", stroke: "var(--text-faint)" } : undefined} />
              <text x={30} y={boxY(i) + 16} className="fig-small" style={{ fill: isFound ? "var(--bg)" : "var(--text)" }}>
                {ghost ? "make_counter: call finished; cell kept" : f.title}
              </text>
              <text x={30} y={boxY(i) + 32} className="fig-small" style={{ fill: isFound ? "var(--bg)" : undefined }}>
                {f.names.map(([n, v]) => `${n} = ${v}`).join(",  ")}
              </text>
              {i < SC_FRAMES.length - 1 ? <line x1={340} y1={boxY(i) + 20} x2={340} y2={boxY(i + 1) + 20} className={i + 1 < searched ? "fig-accent-line" : "fig-guide"} /> : null}
            </g>
          );
        })}
        <text x={350} y={boxY(0) + 24} className="fig-small">
          looks here first
        </text>
        <text x={350} y={boxY(3) + 24} className="fig-small">
          and here last
        </text>
        <text x={20} y={230} className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          {foundAt < 0 ? `${name}: NameError after 4 scopes` : `${name}: found after ${plural(searched, "scope")}`}
        </text>
      </svg>
    </Frame>
  );
}
type TcNode = { label: string; type: string; x: number; y: number; kids: number[]; error?: boolean };

const TC_PROGRAMS: Record<string, { label: string; nodes: TcNode[]; check: string; run: Record<string, string> }> = {
  ok: {
    label: "fare * seats + 40",
    nodes: [
      { label: "+", type: "int", x: 230, y: 30, kids: [1, 2] },
      { label: "*", type: "int", x: 140, y: 90, kids: [3, 4] },
      { label: "40", type: "int", x: 320, y: 90, kids: [] },
      { label: "fare", type: "int", x: 90, y: 150, kids: [] },
      { label: "seats", type: "int", x: 190, y: 150, kids: [] },
    ],
    check: "Every node gets its type from its children: int * int is int, and int + int is int. The checker accepts the program without running it.",
    run: {
      three: "Python computes 450 * 3 + 40 = 1390. The types worked out exactly as the checker predicted.",
      zero: "Python computes 450 * 0 + 40 = 40. The types worked out exactly as the checker predicted.",
    },
  },
  mixed: {
    label: "name + fare",
    nodes: [
      { label: "+", type: "?", x: 230, y: 40, kids: [1, 2], error: true },
      { label: "name", type: "str", x: 150, y: 110, kids: [] },
      { label: "fare", type: "int", x: 310, y: 110, kids: [] },
    ],
    check: "+ has a str on its left and an int on its right, and no rule for + fits that pair, so the checker rejects the program before it runs, pointing at this node.",
    run: {
      three: "Python raises TypeError when it reaches this line, because it will not add a str to an int. A weakly typed language would quietly produce Asha450 instead.",
      zero: "Python raises TypeError when it reaches this line, whatever seats is, because it will not add a str to an int.",
    },
  },
  branches: {
    label: "fare if seats > 0 else 'sold out'",
    nodes: [
      { label: "if", type: "?", x: 230, y: 30, kids: [1, 2, 3], error: true },
      { label: ">", type: "bool", x: 110, y: 90, kids: [4, 5] },
      { label: "fare", type: "int", x: 250, y: 90, kids: [] },
      { label: "'sold out'", type: "str", x: 370, y: 90, kids: [] },
      { label: "seats", type: "int", x: 70, y: 150, kids: [] },
      { label: "0", type: "int", x: 150, y: 150, kids: [] },
    ],
    check: "The test is a bool, but the branches are an int and a str, so the whole expression has no single type. The checker rejects it, although some runs would be fine.",
    run: {
      three: "With seats = 3 the test is true, only fare is evaluated, and the result is 450: no error at all. The checker rejected a run that would have worked.",
      zero: "With seats = 0 the result is the string 'sold out'. Nothing fails here; the error comes later, wherever the code does arithmetic with it, far from its cause.",
    },
  },
};

/** The same expressions checked before running, and run with real values. */
function TypeCheck(props: Props) {
  const startKey = typeof props.program === "string" && props.program in TC_PROGRAMS ? props.program : "ok";
  const [key, setKey] = useState(startKey);
  const [mode, setMode] = useState(props.mode === "three" || props.mode === "zero" ? props.mode : "check");
  const prog = TC_PROGRAMS[key];
  const summary = mode === "check" ? prog.check : prog.run[mode];
  const checking = mode === "check";
  return (
    <Frame
      title="Checked before running, or found while running"
      summary={summary}
      controls={
        <>
          <span className="label">the expression</span>
          {Object.entries(TC_PROGRAMS).map(([k, p]) => (
            <button key={k} type="button" className="btn btn-secondary btn-small" aria-pressed={k === key} onClick={() => setKey(k)}>
              {p.label}
            </button>
          ))}
          <span className="label">how</span>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={mode === "check"} onClick={() => setMode("check")}>
            check the types first
          </button>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={mode === "three"} onClick={() => setMode("three")}>
            run with seats = 3
          </button>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={mode === "zero"} onClick={() => setMode("zero")}>
            run with seats = 0
          </button>
        </>
      }
    >
      <svg viewBox="0 0 460 215" role="img" aria-label={`${prog.label}: ${checking ? (prog.nodes.some((n) => n.error) ? "rejected by the checker" : "accepted by the checker") : "run"}`}>
        {prog.nodes.flatMap((n, i) => n.kids.map((k) => <line key={`${i}-${k}`} x1={n.x} y1={n.y + 16} x2={prog.nodes[k].x} y2={prog.nodes[k].y - 16} className="fig-line" />))}
        {prog.nodes.map((n, i) => {
          const bad = checking && n.error === true;
          const w = Math.max(32, n.label.length * 8 + 12);
          return (
            <g key={i}>
              <rect x={n.x - w / 2} y={n.y - 16} width={w} height={32} rx={6} className={bad ? "fig-accent" : "fig-fill"} />
              <text x={n.x} y={n.y + 5} textAnchor="middle" style={{ fill: bad ? "var(--bg)" : "var(--text)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                {n.label}
              </text>
              {checking ? (
                <text x={n.x} y={n.y + 30} textAnchor="middle" className="fig-small" style={{ fill: bad ? "var(--focus)" : undefined, fontWeight: bad ? 600 : undefined }}>
                  {bad ? "type error" : n.type}
                </text>
              ) : null}
            </g>
          );
        })}
        <text x={10} y={208} className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          {checking ? (prog.nodes.some((n) => n.error) ? "rejected before running" : "accepted before running") : `running with seats = ${mode === "three" ? 3 : 0}, fare = 450, name = Asha`}
        </text>
      </svg>
    </Frame>
  );
}
const MS_NODES: { id: string; x: number; y: number; refs: string[]; root?: boolean }[] = [
  { id: "variables", x: 48, y: 40, refs: ["session"], root: true },
  { id: "session", x: 160, y: 40, refs: ["cart", "user"] },
  { id: "user", x: 160, y: 115, refs: [] },
  { id: "cart", x: 280, y: 40, refs: ["item1", "item2"] },
  { id: "item1", x: 400, y: 40, refs: ["cart"] },
  { id: "item2", x: 400, y: 115, refs: [] },
  { id: "log", x: 70, y: 185, refs: ["log"] },
  { id: "old_cart", x: 235, y: 185, refs: ["old_item"] },
  { id: "old_item", x: 375, y: 185, refs: ["old_cart"] },
];
const MS_ORDER: [string, string][] = [
  ["session", "the variables"],
  ["cart", "session"],
  ["user", "session"],
  ["item1", "cart"],
  ["item2", "cart"],
];
const MS_OBJECTS = MS_NODES.filter((n) => !n.root);

function msClip(cx: number, cy: number, hw: number, hh: number, dx: number, dy: number): [number, number] {
  const t = Math.min(dx !== 0 ? hw / Math.abs(dx) : Infinity, dy !== 0 ? hh / Math.abs(dy) : Infinity);
  return [cx + dx * t, cy + dy * t];
}

/** Mark and sweep from the roots, compared with counting references, on a heap with cycles. */
function MarkSweep(props: Props) {
  const last = MS_ORDER.length + 1;
  const [step, setStep] = useState(clamp(Math.round(num(props.step, 0)), 0, last));
  const [mode, setMode] = useState(props.mode === "count" ? "count" : "mark");
  const counting = mode === "count";
  const marked = new Set(MS_ORDER.slice(0, Math.min(step, MS_ORDER.length)).map(([id]) => id));
  const swept = !counting && step === last;
  const counts: Record<string, number> = {};
  for (const n of MS_NODES) for (const r of n.refs) counts[r] = (counts[r] ?? 0) + 1;
  const label = (id: string) => (counting && id !== "variables" ? `${id} · ${counts[id] ?? 0}` : id);
  const width = (id: string) => label(id).length * 7 + 16;
  const byId = (id: string) => MS_NODES.find((n) => n.id === id) ?? MS_NODES[0];
  const garbage = MS_OBJECTS.filter((n) => !MS_ORDER.some(([id]) => id === n.id)).map((n) => n.id);
  const garbageList = garbage.length > 1 ? `${garbage.slice(0, -1).join(", ")} and ${garbage[garbage.length - 1]}` : garbage.join("");
  const summary = counting
    ? `Reference counting frees an object when the number of references to it falls to 0. Every object here has at least one. The ${plural(garbage.length, "unreachable object")}, ${garbageList}, are still referred to by each other or by themselves, so counting alone frees none of them.`
    : step === 0
      ? `The heap holds ${plural(MS_OBJECTS.length, "object")}. Only the variables, the roots, are known to be in use. Step through the mark phase, which follows references out from the roots.`
      : step <= MS_ORDER.length
        ? `Mark: ${MS_ORDER[step - 1][0]} is reached from ${MS_ORDER[step - 1][1]}, so it is marked as live. ${marked.size} of ${MS_OBJECTS.length} objects marked so far.`
        : `Sweep: the ${plural(garbage.length, "object")} never reached, ${garbageList}, ${garbage.length === 1 ? "is" : "are"} freed, although each still has a reference pointing at it. ${MS_ORDER.length} objects survive.`;
  const edges: ReactNode[] = [];
  for (const n of MS_NODES) {
    for (const r of n.refs) {
      if (r === n.id) {
        const top = n.y - 13;
        edges.push(
          <g key={`${n.id}-self`}>
            <path d={`M ${n.x - 10} ${top} C ${n.x - 30} ${top - 34}, ${n.x + 30} ${top - 34}, ${n.x + 10} ${top}`} className="fig-line" fill="none" />
            <polygon points={`${n.x + 10},${top} ${n.x + 13},${top - 9} ${n.x + 4},${top - 6}`} className="fig-accent" />
          </g>,
        );
        continue;
      }
      const t = byId(r);
      const dx = t.x - n.x;
      const dy = t.y - n.y;
      const len = Math.hypot(dx, dy);
      const ux = dx / len;
      const uy = dy / len;
      const twoWay = t.refs.includes(n.id);
      const ox = twoWay ? -uy * 5 : 0;
      const oy = twoWay ? ux * 5 : 0;
      const [sx, sy] = msClip(n.x, n.y, width(n.id) / 2, 13, dx, dy);
      const [ex, ey] = msClip(t.x, t.y, width(r) / 2, 13, -dx, -dy);
      const tipX = ex + ox;
      const tipY = ey + oy;
      edges.push(
        <g key={`${n.id}-${r}`}>
          <line x1={sx + ox} y1={sy + oy} x2={tipX} y2={tipY} className="fig-line" />
          <polygon
            points={`${tipX},${tipY} ${tipX - 8 * ux - 4 * uy},${tipY - 8 * uy + 4 * ux} ${tipX - 8 * ux + 4 * uy},${tipY - 8 * uy - 4 * ux}`}
            className="fig-accent"
          />
        </g>,
      );
    }
  }
  return (
    <Frame
      title={counting ? "Counting references" : "Mark and sweep"}
      summary={summary}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={!counting} onClick={() => setMode("mark")}>
            mark and sweep
          </button>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={counting} onClick={() => setMode("count")}>
            count references
          </button>
          {counting ? null : <Stepper label="step" value={step} min={0} max={last} onChange={setStep} />}
        </>
      }
    >
      <svg viewBox="0 0 460 230" role="img" aria-label={counting ? "reference counts: no object has a count of 0" : swept ? `${plural(garbage.length, "object")} freed` : `${marked.size} of ${MS_OBJECTS.length} objects marked`}>
        {edges}
        {MS_NODES.map((n) => {
          const w = width(n.id);
          const isMarked = marked.has(n.id) && !counting;
          const isFreed = swept && garbage.includes(n.id);
          return (
            <g key={n.id} opacity={isFreed ? 0.45 : 1}>
              <rect
                x={n.x - w / 2}
                y={n.y - 13}
                width={w}
                height={26}
                rx={n.root ? 2 : 8}
                className={isMarked ? "fig-accent" : isFreed ? "fig-ghost" : "fig-fill"}
                style={isFreed ? { strokeDasharray: "4 4", stroke: "var(--text-faint)" } : undefined}
              />
              <text x={n.x} y={n.y + 4} textAnchor="middle" style={{ fill: isMarked ? "var(--bg)" : "var(--text)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                {label(n.id)}
              </text>
            </g>
          );
        })}
        <text x={455} y={222} textAnchor="end" className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          {counting ? `freed by counting: 0 of ${MS_OBJECTS.length}` : swept ? `freed: ${garbage.length}, kept: ${MS_ORDER.length}` : `marked: ${marked.size} of ${MS_OBJECTS.length}`}
        </text>
      </svg>
    </Frame>
  );
}

type GcGate = { id: string; kind: string; x: number; y: number; ins: string[] };

const GC_CIRCUITS: Record<string, { label: string; inputs: { id: string; y: number }[]; gates: GcGate[]; depth: number }> = {
  xor: {
    label: "XOR from four NANDs",
    inputs: [
      { id: "A", y: 50 },
      { id: "B", y: 170 },
    ],
    gates: [
      { id: "n1", kind: "NAND", x: 160, y: 110, ins: ["A", "B"] },
      { id: "n2", kind: "NAND", x: 270, y: 50, ins: ["A", "n1"] },
      { id: "n3", kind: "NAND", x: 270, y: 170, ins: ["n1", "B"] },
      { id: "out", kind: "NAND", x: 380, y: 110, ins: ["n2", "n3"] },
    ],
    depth: 3,
  },
  mux: {
    label: "2-to-1 multiplexer",
    inputs: [
      { id: "A", y: 40 },
      { id: "S", y: 110 },
      { id: "B", y: 180 },
    ],
    gates: [
      { id: "ns", kind: "NOT", x: 150, y: 75, ins: ["S"] },
      { id: "p", kind: "AND", x: 260, y: 50, ins: ["A", "ns"] },
      { id: "q", kind: "AND", x: 260, y: 170, ins: ["S", "B"] },
      { id: "out", kind: "OR", x: 380, y: 110, ins: ["p", "q"] },
    ],
    depth: 3,
  },
};

function gcEval(kind: string, values: number[]) {
  if (kind === "NOT") return 1 - values[0];
  if (kind === "AND") return values[0] & values[1];
  if (kind === "OR") return values[0] | values[1];
  return 1 - (values[0] & values[1]);
}

/** Signals moving through a small circuit of gates, with inputs the learner can switch. */
function GateCircuit(props: Props) {
  const [key, setKey] = useState(props.circuit === "mux" ? "mux" : "xor");
  const [inputs, setInputs] = useState<Record<string, number>>({
    A: props.a === 1 ? 1 : 0,
    B: props.b === 1 ? 1 : 0,
    S: props.s === 1 ? 1 : 0,
  });
  const circuit = GC_CIRCUITS[key];
  const values: Record<string, number> = { ...inputs };
  for (const g of circuit.gates) values[g.id] = gcEval(g.kind, g.ins.map((w) => values[w]));
  const pos = (id: string): [number, number] => {
    const input = circuit.inputs.find((i) => i.id === id);
    if (input) return [40, input.y];
    const g = circuit.gates.find((gate) => gate.id === id)!;
    return [g.x, g.y];
  };
  const out = values.out;
  const summary =
    key === "xor"
      ? `A = ${values.A}, B = ${values.B}. The first NAND gives ${values.n1}, the middle two give ${values.n2} and ${values.n3}, and the last gives ${out}. ` +
        `XOR is 1 exactly when one input is 1, so this is ${values.A ^ values.B ? "a case where it is 1" : "a case where it is 0"}. The slowest path passes through ${circuit.depth} gates.`
      : `S = ${values.S} selects ${values.S ? "B" : "A"}, which is ${values.S ? values.B : values.A}, so the output is ${out}. ` +
        `The NOT gives ${values.ns}, the top AND passes A only when S is 0 (${values.p}), the bottom AND passes B only when S is 1 (${values.q}), and the OR joins them. The slowest path passes through ${circuit.depth} gates.`;
  return (
    <Frame
      title={circuit.label}
      summary={summary}
      controls={
        <>
          <span className="label">the circuit</span>
          {Object.entries(GC_CIRCUITS).map(([k, c]) => (
            <button key={k} type="button" className="btn btn-secondary btn-small" aria-pressed={k === key} onClick={() => setKey(k)}>
              {c.label}
            </button>
          ))}
          <span className="label">inputs</span>
          {circuit.inputs.map((i) => (
            <button
              key={i.id}
              type="button"
              className="btn btn-secondary btn-small"
              aria-pressed={inputs[i.id] === 1}
              onClick={() => setInputs({ ...inputs, [i.id]: 1 - inputs[i.id] })}
            >
              {`${i.id} = ${inputs[i.id]}`}
            </button>
          ))}
        </>
      }
    >
      <svg viewBox="0 0 460 220" role="img" aria-label={`${circuit.label}: output ${out}`}>
        {circuit.gates.flatMap((g) =>
          g.ins.map((w, k) => {
            const [x1, y1] = pos(w);
            const ty = g.ins.length === 1 ? g.y : g.y - 8 + 16 * k;
            const sx = circuit.inputs.some((i) => i.id === w) ? x1 + 14 : x1 + 26;
            return (
              <polyline
                key={`${g.id}-${w}`}
                points={`${sx},${y1} ${(sx + g.x - 26) / 2},${y1} ${(sx + g.x - 26) / 2},${ty} ${g.x - 26},${ty}`}
                fill="none"
                className={values[w] ? "fig-accent-line" : "fig-line"}
                style={values[w] ? { strokeWidth: 2.5 } : { opacity: 0.5 }}
              />
            );
          }),
        )}
        <line x1={406} y1={110} x2={440} y2={110} className={out ? "fig-accent-line" : "fig-line"} style={out ? { strokeWidth: 2.5 } : { opacity: 0.5 }} />
        {circuit.inputs.map((i) => (
          <g key={i.id}>
            <circle cx={40} cy={i.y} r={14} className={inputs[i.id] ? "fig-accent" : "fig-fill"} />
            <text x={40} y={i.y + 4} textAnchor="middle" style={{ fill: inputs[i.id] ? "var(--bg)" : "var(--text)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
              {i.id}
            </text>
            <text x={12} y={i.y + 4} textAnchor="middle" className="fig-small">
              {inputs[i.id]}
            </text>
          </g>
        ))}
        {circuit.gates.map((g) => (
          <g key={g.id}>
            <rect x={g.x - 26} y={g.y - 18} width={52} height={36} rx={8} className="fig-fill" />
            <text x={g.x} y={g.y + 4} textAnchor="middle" style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
              {g.kind}
            </text>
            <text x={g.x + 30} y={g.y - 20} className="fig-small" style={{ fill: values[g.id] ? "var(--focus)" : undefined, fontWeight: 600 }}>
              {values[g.id]}
            </text>
          </g>
        ))}
        <text x={444} y={104} textAnchor="end" className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
          {`out ${out}`}
        </text>
      </svg>
    </Frame>
  );
}

/** A 4-bit ripple-carry adder: the carry passes from each full adder to the next, and subtracting adds NOT B with a carry in of 1. */
function RippleAdder(props: Props) {
  const [a, setA] = useState(clamp(num(props.a, 9), 0, 15));
  const [b, setB] = useState(clamp(num(props.b, 5), 0, 15));
  const [op, setOp] = useState(props.op === "sub" ? "sub" : "add");
  const bb = op === "sub" ? ~b & 15 : b;
  const carries = [op === "sub" ? 1 : 0];
  const sums: number[] = [];
  for (let i = 0; i < 4; i++) {
    const x = (a >> i) & 1;
    const y = (bb >> i) & 1;
    const c = carries[i];
    sums.push(x ^ y ^ c);
    carries.push((x & y) | (c & (x ^ y)));
  }
  const result = sums.reduce((acc, bit, i) => acc + (bit << i), 0);
  const signed = (n: number) => (n >= 8 ? n - 16 : n);
  const trueSigned = op === "sub" ? signed(a) - signed(b) : signed(a) + signed(b);
  const flags = { Z: result === 0 ? 1 : 0, N: result >> 3, C: carries[4], V: trueSigned < -8 || trueSigned > 7 ? 1 : 0 };
  const bits = (n: number) => n.toString(2).padStart(4, "0");
  const show = (n: number) => (n < 0 ? `−${-n}` : `${n}`);
  const sign = op === "sub" ? "−" : "+";
  const summary =
    (op === "sub"
      ? `A − B is worked out as A + (NOT B) + 1: ${a} + ${bb} + 1 = ${a + bb + 1}. `
      : `A + B = ${a} + ${b} = ${a + b}. `) +
    `Four bits keep ${result} (${bits(result)}) and the carry out is ${carries[4]}. ` +
    `Read as signed 4-bit numbers this is ${show(signed(a))} ${sign} ${show(signed(b))} = ${show(trueSigned)}, ` +
    (flags.V ? `which does not fit between −8 and 7, so V, the overflow flag, is 1.` : `which fits, so V, the overflow flag, is 0.`) +
    ` Flags: Z ${flags.Z}, N ${flags.N}, C ${flags.C}, V ${flags.V}.`;
  const xs = [390, 290, 190, 90];
  return (
    <Frame
      title={op === "sub" ? "Subtracting with an adder" : "A 4-bit ripple-carry adder"}
      summary={summary}
      controls={
        <>
          <Stepper label="A" value={a} onChange={setA} min={0} max={15} />
          <Stepper label="B" value={b} onChange={setB} min={0} max={15} />
          {(["add", "sub"] as const).map((k) => (
            <button key={k} type="button" className="btn btn-secondary btn-small" aria-pressed={op === k} onClick={() => setOp(k)}>
              {k === "add" ? "add" : "subtract"}
            </button>
          ))}
        </>
      }
    >
      <svg viewBox="0 0 460 220" role="img" aria-label={`${a} ${sign} ${b}: result ${result}, carry out ${carries[4]}`}>
        <text x={230} y={18} textAnchor="middle" className="fig-small">
          {`A = ${bits(a)}  ·  ${op === "sub" ? "NOT B" : "B"} = ${bits(bb)}  ·  carry in = ${carries[0]}`}
        </text>
        {xs.map((x, i) => (
          <g key={i}>
            <text x={x - 18} y={50} textAnchor="end" className="fig-small">{`a${i}=${(a >> i) & 1}`}</text>
            <text x={x + 18} y={50} textAnchor="start" className="fig-small">{`${op === "sub" ? "¬b" : "b"}${i}=${(bb >> i) & 1}`}</text>
            <line x1={x - 14} y1={42} x2={x - 14} y2={80} className={(a >> i) & 1 ? "fig-accent-line" : "fig-line"} />
            <line x1={x + 14} y1={42} x2={x + 14} y2={80} className={(bb >> i) & 1 ? "fig-accent-line" : "fig-line"} />
            <rect x={x - 32} y={80} width={64} height={50} rx={8} className="fig-fill" />
            <text x={x} y={109} textAnchor="middle" style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
              {`FA ${i}`}
            </text>
            <line x1={x + 50} y1={105} x2={x + 32} y2={105} className={carries[i] ? "fig-accent-line" : "fig-line"} style={carries[i] ? { strokeWidth: 2.5 } : undefined} />
            <text x={x + 50} y={98} textAnchor="middle" className="fig-small">{`c${i}=${carries[i]}`}</text>
            <line x1={x} y1={130} x2={x} y2={152} className={sums[i] ? "fig-accent-line" : "fig-line"} />
            <text x={x} y={168} textAnchor="middle" className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>{`s${i}=${sums[i]}`}</text>
          </g>
        ))}
        <line x1={58} y1={105} x2={30} y2={105} className={carries[4] ? "fig-accent-line" : "fig-line"} style={carries[4] ? { strokeWidth: 2.5 } : undefined} />
        <text x={26} y={98} textAnchor="middle" className="fig-small">{`c4=${carries[4]}`}</text>
        <text x={230} y={200} textAnchor="middle" className="fig-small" style={{ fill: "var(--text)" }}>
          {`result ${bits(result)} = ${result} (signed ${show(signed(result))})  ·  Z ${flags.Z} N ${flags.N} C ${flags.C} V ${flags.V}`}
        </text>
      </svg>
    </Frame>
  );
}

const CS_D = [0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 1];

/** A D latch against a D flip-flop over sixteen half-cycles of the clock: the latch follows D while the clock is high, the flip-flop copies it only at a rising edge. */
function ClockedStore(props: Props) {
  const [device, setDevice] = useState(props.device === "latch" ? "latch" : "flipflop");
  const [time, setTime] = useState(clamp(num(props.time, 15), 0, 15));
  const clock = CS_D.map((_, i) => i % 2);
  const q: number[] = [];
  let held = 0;
  CS_D.forEach((d, i) => {
    if (device === "latch" ? clock[i] === 1 : clock[i] === 1 && (i === 0 || clock[i - 1] === 0)) held = d;
    q.push(held);
  });
  const x0 = 70;
  const w = 24;
  const wave = (values: number[], top: number) =>
    values
      .slice(0, time + 1)
      .map((v, i) => `${x0 + i * w},${top + (v ? 0 : 22)} ${x0 + (i + 1) * w},${top + (v ? 0 : 22)}`)
      .join(" ");
  const edges = clock.map((c, i) => (c === 1 && (i === 0 || clock[i - 1] === 0) ? i : -1)).filter((i) => i >= 0 && i <= time);
  const lastEdge = edges.length ? edges[edges.length - 1] : -1;
  const changes = q.slice(0, time + 1).filter((v, i) => i > 0 && v !== q[i - 1]).length;
  const now = `At time ${time} the clock is ${clock[time]} and D is ${CS_D[time]}. `;
  const summary =
    device === "latch"
      ? now +
        (clock[time]
          ? `The latch is transparent while the clock is 1, so Q follows D and is ${q[time]}. `
          : `The clock is 0, so the latch holds what it had when the clock fell: Q is ${q[time]}. `) +
        `Q has changed ${plural(changes, "time")} so far, including every change of D while the clock was high.`
      : now +
        (lastEdge >= 0
          ? `The flip-flop copies D only at a rising edge of the clock. The last edge was at time ${lastEdge}, when D was ${CS_D[lastEdge]}, so Q is ${q[time]}. `
          : `No rising edge has come yet, so Q is still ${q[time]}. `) +
        `Q has changed ${plural(changes, "time")} so far, and only at edges, however D wanders between them.`;
  return (
    <Frame
      title={device === "latch" ? "A D latch follows its input while the clock is high" : "A D flip-flop samples its input at each rising edge"}
      summary={summary}
      controls={
        <>
          {(["latch", "flipflop"] as const).map((k) => (
            <button key={k} type="button" className="btn btn-secondary btn-small" aria-pressed={device === k} onClick={() => setDevice(k)}>
              {k === "latch" ? "D latch" : "D flip-flop"}
            </button>
          ))}
          <Stepper label="time" value={time} onChange={setTime} min={0} max={15} />
        </>
      }
    >
      <svg viewBox="0 0 460 200" role="img" aria-label={`${device === "latch" ? "D latch" : "D flip-flop"} at time ${time}: Q is ${q[time]}`}>
        {edges.map((i) => (
          <line key={i} x1={x0 + i * w} y1={20} x2={x0 + i * w} y2={180} className="fig-line" style={{ strokeDasharray: "3 3", opacity: device === "flipflop" ? 0.9 : 0.3 }} />
        ))}
        {[
          ["clock", clock, 28],
          ["D", CS_D, 88],
          ["Q", q, 148],
        ].map(([name, values, top]) => (
          <g key={name as string}>
            <text x={52} y={(top as number) + 16} textAnchor="end" className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
              {name as string}
            </text>
            <polyline points={wave(values as number[], top as number)} fill="none" className={name === "Q" ? "fig-accent-line" : "fig-line"} style={{ strokeWidth: 2 }} />
          </g>
        ))}
        <rect x={x0 + time * w} y={18} width={w} height={164} className="fig-accent" style={{ opacity: 0.12 }} />
        <text x={x0 + time * w + w / 2} y={196} textAnchor="middle" className="fig-small">{`t=${time}`}</text>
      </svg>
    </Frame>
  );
}

type FeInstr = { name: string; rd: number; rs: number; imm: number };

function feProgram(n: number): FeInstr[] {
  return [
    { name: "li", rd: 0, rs: 0, imm: 0 },
    { name: "li", rd: 1, rs: 0, imm: n },
    { name: "li", rd: 2, rs: 0, imm: 1 },
    { name: "add", rd: 0, rs: 1, imm: 0 },
    { name: "sub", rd: 1, rs: 2, imm: 0 },
    { name: "bnez", rd: 1, rs: 0, imm: 3 },
    { name: "halt", rd: 0, rs: 0, imm: 0 },
  ];
}

const FE_OPS = ["halt", "li", "add", "sub", "bnez"];

function feText(i: FeInstr) {
  if (i.name === "halt") return "halt";
  if (i.name === "li") return `li r${i.rd}, ${i.imm}`;
  if (i.name === "bnez") return `bnez r${i.rd}, ${i.imm}`;
  return `${i.name} r${i.rd}, r${i.rs}`;
}

function feWord(i: FeInstr) {
  const w = (FE_OPS.indexOf(i.name) << 12) | (i.rd << 8) | (i.rs << 4) | i.imm;
  return "0x" + w.toString(16).padStart(4, "0");
}

/** A toy machine fetching, decoding and executing a loop that adds n + (n − 1) + … + 1, one phase per step. */
function FetchExecute(props: Props) {
  const [n, setN] = useState(clamp(num(props.n, 3), 1, 5));
  const program = feProgram(n);
  const trace: { pc: number; before: number[]; after: number[]; next: number }[] = [];
  let regs = [0, 0, 0];
  let pc = 0;
  for (;;) {
    const ins = program[pc];
    const before = regs.slice();
    let next = pc + 1;
    if (ins.name === "li") regs[ins.rd] = ins.imm;
    if (ins.name === "add") regs[ins.rd] = regs[ins.rd] + regs[ins.rs];
    if (ins.name === "sub") regs[ins.rd] = regs[ins.rd] - regs[ins.rs];
    if (ins.name === "bnez" && regs[ins.rd] !== 0) next = ins.imm;
    trace.push({ pc, before, after: regs.slice(), next });
    if (ins.name === "halt") break;
    regs = regs.slice();
    pc = next;
  }
  const last = trace.length * 3 - 1;
  const [rawStep, setStep] = useState(clamp(num(props.step, 0), 0, 3 * 34));
  const step = Math.min(rawStep, last);
  const t = trace[Math.floor(step / 3)];
  const phase = step % 3;
  const ins = program[t.pc];
  const shown = phase === 2 ? t.after : t.before;
  const pcShown = phase === 0 ? t.pc + 1 : phase === 1 ? t.pc + 1 : t.next;
  let what: string;
  if (phase === 0) what = `Fetch: the word at address ${t.pc}, ${feWord(ins)}, is copied into the instruction register, and the PC moves on to ${t.pc + 1}.`;
  else if (phase === 1)
    what =
      `Decode: opcode ${FE_OPS.indexOf(ins.name)} means ${ins.name}` +
      (ins.name === "halt" ? "." : ins.name === "li" ? `, with r${ins.rd} as the destination and ${ins.imm} as the number to load.` : ins.name === "bnez" ? `, testing r${ins.rd}, which holds ${t.before[ins.rd]}.` : `, so the register file reads r${ins.rd} = ${t.before[ins.rd]} and r${ins.rs} = ${t.before[ins.rs]}.`);
  else if (ins.name === "halt") what = `Execute: halt stops the machine. It fetched ${plural(trace.length, "instruction")}, and r0 holds ${t.after[0]}.`;
  else if (ins.name === "li") what = `Execute: ${ins.imm} is written into r${ins.rd}.`;
  else if (ins.name === "bnez") what = t.next === ins.imm ? `Execute: r${ins.rd} is ${t.before[ins.rd]}, not zero, so the PC is set to ${ins.imm} and the loop runs again.` : `Execute: r${ins.rd} is 0, so the PC is left at ${t.pc + 1} and the loop ends.`;
  else what = `Execute: the ALU computes ${t.before[ins.rd]} ${ins.name === "add" ? "+" : "−"} ${t.before[ins.rs]} = ${t.after[ins.rd]} and writes it into r${ins.rd}.`;
  const summary = `Step ${step + 1} of ${last + 1}. ${what}`;
  const phases = ["fetch", "decode", "execute"];
  return (
    <Frame
      title="Fetch, decode, execute"
      summary={summary}
      controls={
        <>
          <Stepper label="n" value={n} onChange={(v) => { setN(v); setStep(0); }} min={1} max={5} />
          <Stepper label="step" value={step + 1} onChange={(v) => setStep(v - 1)} min={1} max={last + 1} />
        </>
      }
    >
      <svg viewBox="0 0 460 230" role="img" aria-label={`${phases[phase]} of ${feText(ins)} at address ${t.pc}`}>
        {program.map((p, i) => (
          <g key={i}>
            {i === t.pc ? <rect x={14} y={22 + i * 26} width={200} height={22} rx={4} className="fig-accent" style={{ opacity: 0.18 }} /> : null}
            <text x={24} y={37 + i * 26} className="fig-small">{i}</text>
            <text x={44} y={37 + i * 26} style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{feWord(p)}</text>
            <text x={104} y={37 + i * 26} style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{feText(p)}</text>
          </g>
        ))}
        <text x={14} y={14} className="fig-small">memory</text>
        {phases.map((name, k) => (
          <g key={name}>
            <rect x={240 + k * 72} y={14} width={64} height={24} rx={12} className={k === phase ? "fig-accent" : "fig-fill"} />
            <text x={272 + k * 72} y={30} textAnchor="middle" style={{ fill: k === phase ? "var(--bg)" : "var(--text)", fontSize: 12 }}>{name}</text>
          </g>
        ))}
        <text x={240} y={70} className="fig-small">PC</text>
        <text x={300} y={70} style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600 }}>{pcShown}</text>
        <text x={240} y={98} className="fig-small">instruction</text>
        <text x={320} y={98} style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{`${feWord(ins)}  ${phase === 0 ? "" : feText(ins)}`}</text>
        {[0, 1, 2].map((r) => (
          <g key={r}>
            <rect x={240 + r * 72} y={130} width={64} height={44} rx={6} className="fig-fill" />
            <text x={272 + r * 72} y={147} textAnchor="middle" className="fig-small">{`r${r}`}</text>
            <text x={272 + r * 72} y={166} textAnchor="middle" style={{ fill: phase === 2 && ins.rd === r && ins.name !== "bnez" && ins.name !== "halt" ? "var(--focus)" : "var(--text)", fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600 }}>
              {shown[r]}
            </text>
          </g>
        ))}
        <text x={240} y={204} className="fig-small">{`instructions fetched: ${Math.floor(step / 3) + 1}`}</text>
      </svg>
    </Frame>
  );
}

type RvField = { label: string; lo: number; width: number; value: number };

const RV_EXAMPLES: Record<string, { text: string; format: string; fields: RvField[]; note: string }> = (() => {
  const r = (f7: number, rs2: number, rs1: number, f3: number, rd: number, op: number) => [
    { label: "funct7", lo: 25, width: 7, value: f7 },
    { label: "rs2", lo: 20, width: 5, value: rs2 },
    { label: "rs1", lo: 15, width: 5, value: rs1 },
    { label: "f3", lo: 12, width: 3, value: f3 },
    { label: "rd", lo: 7, width: 5, value: rd },
    { label: "opcode", lo: 0, width: 7, value: op },
  ];
  const i = (imm: number, rs1: number, f3: number, rd: number, op: number) => [
    { label: "imm", lo: 20, width: 12, value: imm & 0xfff },
    { label: "rs1", lo: 15, width: 5, value: rs1 },
    { label: "f3", lo: 12, width: 3, value: f3 },
    { label: "rd", lo: 7, width: 5, value: rd },
    { label: "opcode", lo: 0, width: 7, value: op },
  ];
  const s = (imm: number, rs2: number, rs1: number, f3: number, op: number) => [
    { label: "imm hi", lo: 25, width: 7, value: (imm >> 5) & 0x7f },
    { label: "rs2", lo: 20, width: 5, value: rs2 },
    { label: "rs1", lo: 15, width: 5, value: rs1 },
    { label: "f3", lo: 12, width: 3, value: f3 },
    { label: "imm lo", lo: 7, width: 5, value: imm & 0x1f },
    { label: "opcode", lo: 0, width: 7, value: op },
  ];
  const b = (imm: number, rs2: number, rs1: number, f3: number, op: number) => [
    { label: "imm hi", lo: 25, width: 7, value: (((imm >> 12) & 1) << 6) | ((imm >> 5) & 0x3f) },
    { label: "rs2", lo: 20, width: 5, value: rs2 },
    { label: "rs1", lo: 15, width: 5, value: rs1 },
    { label: "f3", lo: 12, width: 3, value: f3 },
    { label: "imm lo", lo: 7, width: 5, value: (((imm >> 1) & 0xf) << 1) | ((imm >> 11) & 1) },
    { label: "opcode", lo: 0, width: 7, value: op },
  ];
  return {
    add: { text: "add x5, x6, x7", format: "R", fields: r(0, 7, 6, 0, 5, 0x33), note: "Two source registers and a destination; funct7 and funct3 say which operation." },
    sub: { text: "sub x5, x6, x7", format: "R", fields: r(0x20, 7, 6, 0, 5, 0x33), note: "Only funct7 differs from add: one bit tells the ALU to subtract." },
    addi: { text: "addi x5, x0, 42", format: "I", fields: i(42, 0, 0, 5, 0x13), note: "The second operand is a 12-bit signed number held in the instruction itself, from −2048 to 2047." },
    lw: { text: "lw x5, 8(x10)", format: "I", fields: i(8, 10, 2, 5, 0x03), note: "A load has the same shape as addi: the address is x10 + 8, and funct3 = 2 means a 4-byte word." },
    sw: { text: "sw x5, 8(x10)", format: "S", fields: s(8, 5, 10, 2, 0x23), note: "A store has no destination register, so the offset is split in two around rs1, rs2 and funct3." },
    beq: { text: "beq x5, x6, 16", format: "B", fields: b(16, 6, 5, 0, 0x63), note: "A branch offset is always even, so bit 0 is not stored; the other bits are shuffled so that the hardware finds each one where S-type keeps it." },
    lui: { text: "lui x5, 0x12345", format: "U", fields: [{ label: "imm (upper 20 bits)", lo: 12, width: 20, value: 0x12345 }, { label: "rd", lo: 7, width: 5, value: 5 }, { label: "opcode", lo: 0, width: 7, value: 0x37 }], note: "A 20-bit number goes into the top of rd; an addi can then fill in the low 12 bits." },
  };
})();

/** How a RISC-V instruction is packed into 32 bits, field by field, for each of the instruction formats. */
function RvEncoding(props: Props) {
  const initial = typeof props.instr === "string" && props.instr in RV_EXAMPLES ? props.instr : "add";
  const [key, setKey] = useState(initial);
  const ex = RV_EXAMPLES[key];
  const word = ex.fields.reduce((acc, f) => (acc + f.value * 2 ** f.lo), 0);
  const hex = "0x" + word.toString(16).padStart(8, "0");
  const bits = Array.from({ length: 32 }, (_, k) => Math.floor(word / 2 ** k) % 2);
  const x = (bit: number) => 22 + (31 - bit) * 13;
  const fieldText = ex.fields.map((f) => `${f.label} ${f.value.toString(2).padStart(f.width, "0")}`).join(", ");
  const summary = `${ex.text} is ${ex.format}-type. Fields from bit 31 down: ${fieldText}. As one word it is ${hex}. ${ex.note}`;
  return (
    <Frame
      title={`${ex.format}-type: ${ex.text}`}
      summary={summary}
      controls={
        <>
          <span className="label">instruction</span>
          {Object.keys(RV_EXAMPLES).map((k) => (
            <button key={k} type="button" className="btn btn-secondary btn-small" aria-pressed={k === key} onClick={() => setKey(k)}>
              {k}
            </button>
          ))}
        </>
      }
    >
      <svg viewBox="0 0 460 180" role="img" aria-label={`${ex.text} encodes as ${hex}`}>
        <text x={230} y={22} textAnchor="middle" style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600 }}>
          {`${ex.text}   →   ${hex}`}
        </text>
        {[31, 24, 19, 14, 11, 6, 0].map((bit) => (
          <text key={bit} x={x(bit) + 6.5} y={46} textAnchor="middle" className="fig-small">{bit}</text>
        ))}
        {ex.fields.map((f, k) => (
          <g key={f.label}>
            <rect x={x(f.lo + f.width - 1)} y={54} width={f.width * 13} height={28} className={k % 2 ? "fig-fill" : "fig-accent"} style={k % 2 ? undefined : { opacity: 0.22 }} />
            <text x={x(f.lo + f.width - 1) + (f.width * 13) / 2} y={102} textAnchor="middle" className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>
              {f.label}
            </text>
            <text x={x(f.lo + f.width - 1) + (f.width * 13) / 2} y={120} textAnchor="middle" className="fig-small">
              {f.value}
            </text>
          </g>
        ))}
        {bits.map((v, bit) => (
          <text key={bit} x={x(bit) + 6.5} y={73} textAnchor="middle" style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
            {v}
          </text>
        ))}
        <text x={230} y={160} textAnchor="middle" className="fig-small">
          {"rs1, rs2 and rd sit in the same bits in every format that has them"}
        </text>
      </svg>
    </Frame>
  );
}

const AT_LINES = [
  "    la t0, prices",
  "    lw t1, n",
  "    li a0, 0",
  "loop:",
  "    beqz t1, done",
  "    lw t2, 0(t0)",
  "    add a0, a0, t2",
  "    addi t0, t0, 4",
  "    addi t1, t1, -1",
  "    j loop",
  "done:",
  "    li a7, 1",
  "    ecall",
];
const AT_PRICES = [120, 45, 300];
const AT_BASE = 0x10010004;

/** Stepping through an assembly loop that adds up an array, one instruction at a time, with the registers and memory it touches. */
function AsmTrace(props: Props) {
  type Row = { line: number; regs: Record<string, number>; note: string };
  const rows: Row[] = [];
  const r: Record<string, number> = { t0: 0, t1: 0, t2: 0, a0: 0 };
  const push = (line: number, note: string) => rows.push({ line, regs: { ...r }, note });
  r.t0 = AT_BASE;
  push(0, "la puts the address of prices, 0x10010004, into t0.");
  r.t1 = AT_PRICES.length;
  push(1, `lw loads n, ${AT_PRICES.length}, the number of prices left, into t1.`);
  r.a0 = 0;
  push(2, "li sets the running total in a0 to 0.");
  for (;;) {
    if (r.t1 === 0) {
      push(4, "t1 is 0, so beqz jumps to done: every price has been added.");
      break;
    }
    push(4, `t1 is ${r.t1}, not 0, so beqz falls through into the loop body.`);
    const k = (r.t0 - AT_BASE) / 4;
    r.t2 = AT_PRICES[k];
    push(5, `lw reads the word at the address in t0, 0x${r.t0.toString(16)}: price ${k}, which is ${r.t2}.`);
    r.a0 += r.t2;
    push(6, `add makes the total ${r.a0 - r.t2} + ${r.t2} = ${r.a0}.`);
    r.t0 += 4;
    push(7, "addi moves t0 on by 4 bytes, one word, to the next price.");
    r.t1 -= 1;
    push(8, `addi counts down: ${r.t1} ${r.t1 === 1 ? "price is" : "prices are"} left.`);
    push(9, "j jumps back to loop to test t1 again.");
  }
  push(11, "li puts 1 in a7, choosing the print-a-number service.");
  push(12, `ecall prints a0, ${r.a0}, the total of the three prices.`);
  const last = rows.length - 1;
  const [step, setStep] = useState(clamp(num(props.step, 0), 0, last));
  const s = rows[Math.min(step, last)];
  const nextIndex = (s.regs.t0 - AT_BASE) / 4;
  const summary = `Step ${step + 1} of ${last + 1}: ${s.note} Registers: t0 = 0x${s.regs.t0.toString(16)}, t1 = ${s.regs.t1}, t2 = ${s.regs.t2}, a0 = ${s.regs.a0}.`;
  return (
    <Frame
      title="An assembly loop over an array"
      summary={summary}
      controls={<Stepper label="step" value={step + 1} onChange={(v) => setStep(v - 1)} min={1} max={last + 1} />}
    >
      <svg viewBox="0 0 460 250" role="img" aria-label={`Step ${step + 1}: ${AT_LINES[s.line].trim()}`}>
        {AT_LINES.map((text, i) => (
          <g key={i}>
            {i === s.line ? <rect x={8} y={8 + i * 18} width={190} height={17} rx={3} className="fig-accent" style={{ opacity: 0.2 }} /> : null}
            <text x={14} y={21 + i * 18} style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 11.5, whiteSpace: "pre" }}>
              {text}
            </text>
          </g>
        ))}
        {(["t0", "t1", "t2", "a0"] as const).map((name, i) => (
          <g key={name}>
            <rect x={222 + i * 58} y={14} width={52} height={40} rx={6} className="fig-fill" />
            <text x={248 + i * 58} y={29} textAnchor="middle" className="fig-small">{name}</text>
            <text x={248 + i * 58} y={47} textAnchor="middle" style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>
              {name === "t0" ? `…${s.regs.t0.toString(16).slice(-2)}` : s.regs[name]}
            </text>
          </g>
        ))}
        <text x={222} y={84} className="fig-small">memory</text>
        {[["n", AT_PRICES.length, 0x10010000], ...AT_PRICES.map((p, i) => [`prices[${i}]`, p, AT_BASE + 4 * i])].map(([label, value, address], i) => (
          <g key={label as string}>
            <rect x={222} y={92 + i * 32} width={176} height={26} rx={4} className={i > 0 && i - 1 === nextIndex && s.line !== 12 ? "fig-accent" : "fig-fill"} style={i > 0 && i - 1 === nextIndex ? { opacity: 0.35 } : undefined} />
            <text x={230} y={109 + i * 32} className="fig-small">{`0x${(address as number).toString(16).slice(-3)}`}</text>
            <text x={280} y={109 + i * 32} className="fig-small">{label as string}</text>
            <text x={390} y={109 + i * 32} textAnchor="end" style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>{value as number}</text>
          </g>
        ))}
        {nextIndex < AT_PRICES.length ? <text x={404} y={109 + (nextIndex + 1) * 32} className="fig-small">{"← t0"}</text> : null}
      </svg>
    </Frame>
  );
}

type SfFrame = { k: number; ra: string; s0: string };
type SfEvent = { frames: SfFrame[]; a0: string; s0: string; ra: string; note: string };

function sfEvents(n: number): SfEvent[] {
  const out: SfEvent[] = [];
  const frames: SfFrame[] = [];
  let a0 = String(n);
  let s0 = "main's";
  let ra = "main";
  const emit = (note: string) => out.push({ frames: frames.map((f) => ({ ...f })), a0, s0, ra, note });
  emit(`main puts ${n} in a0 and calls fact. The call saves the way back into main in ra.`);
  const enter = (k: number) => {
    if (k === 0) {
      a0 = "1";
      emit(`fact(0) needs no frame: it puts 1 in a0 and returns at once, through ra, to fact(1).`);
      return;
    }
    frames.push({ k, ra, s0 });
    emit(`fact(${k}) moves sp down 16 bytes and saves ra (the way back into ${ra}) and s0 (${s0 === "main's" ? "main's value" : s0}) in its frame.`);
    s0 = String(k);
    a0 = String(k - 1);
    ra = `fact(${k})`;
    emit(`fact(${k}) keeps n = ${k} in s0, puts ${k - 1} in a0 and calls fact(${k - 1}); ra now leads back into fact(${k}).`);
    enter(k - 1);
    const product = k * Number(a0);
    emit(`Back in fact(${k}): a0 = s0 × a0 = ${k} × ${a0} = ${product}.`);
    a0 = String(product);
    const f = frames.pop()!;
    s0 = f.s0;
    ra = f.ra;
    emit(`fact(${k}) reloads s0 and ra from its frame, moves sp back up 16 bytes and returns to ${ra}.`);
  };
  enter(n);
  emit(`main prints a0, ${a0}. The stack is back where it started, and main's s0 is untouched.`);
  return out;
}

/** The call stack of a recursive factorial in RISC-V: each call saves its return address and s0 in a 16-byte frame, and unwinds them in reverse. */
function StackFrames(props: Props) {
  const [n, setN] = useState(clamp(num(props.n, 3), 1, 4));
  const events = sfEvents(n);
  const last = events.length - 1;
  const [rawStep, setStep] = useState(clamp(num(props.step, 0), 0, 30));
  const step = Math.min(rawStep, last);
  const e = events[step];
  const top = 0x7fffeffc;
  const sp = top - 16 * e.frames.length;
  const deepest = Math.max(...events.map((ev) => ev.frames.length));
  const summary = `Step ${step + 1} of ${last + 1}. ${e.note} sp = 0x${sp.toString(16)}, ${16 * e.frames.length} bytes below where main left it; the deepest point uses ${16 * deepest} bytes.`;
  return (
    <Frame
      title={`The stack during fact(${n})`}
      summary={summary}
      controls={
        <>
          <Stepper label="n" value={n} onChange={(v) => { setN(v); setStep(0); }} min={1} max={4} />
          <Stepper label="step" value={step + 1} onChange={(v) => setStep(v - 1)} min={1} max={last + 1} />
        </>
      }
    >
      <svg viewBox="0 0 460 240" role="img" aria-label={`Step ${step + 1}: ${e.frames.length} frames on the stack`}>
        <text x={20} y={20} className="fig-small">{"higher addresses"}</text>
        <rect x={20} y={28} width={190} height={22} rx={4} className="fig-fill" style={{ opacity: 0.5 }} />
        <text x={115} y={43} textAnchor="middle" className="fig-small">{"main's part of the stack"}</text>
        {e.frames.map((f, i) => (
          <g key={f.k}>
            <rect x={20} y={54 + i * 40} width={190} height={36} rx={6} className={i === e.frames.length - 1 ? "fig-accent" : "fig-fill"} style={i === e.frames.length - 1 ? { opacity: 0.3 } : undefined} />
            <text x={30} y={68 + i * 40} style={{ fill: "var(--text)", fontSize: 12, fontWeight: 600 }}>{`fact(${f.k})'s frame`}</text>
            <text x={30} y={84 + i * 40} className="fig-small">{`ra → ${f.ra} · s0 = ${f.s0}`}</text>
          </g>
        ))}
        <line x1={214} y1={52 + e.frames.length * 40} x2={238} y2={52 + e.frames.length * 40} className="fig-accent-line" style={{ strokeWidth: 2.5 }} />
        <text x={244} y={56 + e.frames.length * 40} className="fig-small" style={{ fill: "var(--text)", fontWeight: 600 }}>sp</text>
        {(["a0", "s0", "ra", "sp"] as const).map((name, i) => (
          <g key={name}>
            <rect x={300} y={20 + i * 34} width={150} height={28} rx={6} className="fig-fill" />
            <text x={310} y={38 + i * 34} className="fig-small">{name}</text>
            <text x={442} y={38 + i * 34} textAnchor="end" style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>
              {name === "ra" ? `→ ${e.ra}` : name === "sp" ? `0x${sp.toString(16)}` : e[name]}
            </text>
          </g>
        ))}
        <text x={20} y={234} className="fig-small">{"lower addresses: the stack grows down"}</text>
      </svg>
    </Frame>
  );
}

const PC_STAGES = ["F", "D", "X", "M", "W"];
const PC_NAMES = ["fetch", "decode", "execute", "memory", "write back"];

/** A pipeline diagram: instructions down the side, clock cycles along the top, with and without pipelining. */
function PipelineChart(props: Props) {
  const [n, setN] = useState(clamp(num(props.n, 4), 1, 6));
  const [piped, setPiped] = useState(props.pipelined !== false);
  const k = PC_STAGES.length;
  const total = piped ? k + n - 1 : k * n;
  const start = (i: number) => (piped ? i : i * k);
  const left = 64;
  const cell = Math.min(36, (450 - left) / total);
  const rowH = 26;
  const inFlight = piped ? Math.min(n, k) : 1;
  const summary =
    `${plural(n, "instruction")} through ${k} stages take ${total} cycles ${piped ? "with" : "without"} pipelining` +
    (piped
      ? `: ${k} cycles for the first, then one more finishing every cycle. Up to ${plural(inFlight, "instruction")} ${inFlight === 1 ? "is" : "are"} in flight at once, each in a different stage. Without pipelining the same work takes ${k * n} cycles.`
      : `: each instruction waits for the one before to finish all ${k} stages, so four of the five stages sit idle at any moment. With pipelining it takes ${k + n - 1} cycles.`) +
    ` Either way, each instruction takes ${k} cycles from fetch to write back.`;
  return (
    <Frame
      title={piped ? "Pipelined: one instruction finishes every cycle" : "Not pipelined: one instruction at a time"}
      summary={summary}
      controls={
        <>
          <Stepper label="instructions" value={n} onChange={setN} min={1} max={6} />
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={piped} onClick={() => setPiped(true)}>
            pipelined
          </button>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={!piped} onClick={() => setPiped(false)}>
            not pipelined
          </button>
        </>
      }
    >
      <svg viewBox="0 0 460 220" role="img" aria-label={`${n} instructions, ${total} cycles, ${piped ? "pipelined" : "not pipelined"}`}>
        <text x={left} y={16} className="fig-small">{`cycle 1 … ${total}`}</text>
        {Array.from({ length: n }, (_, i) => (
          <g key={i}>
            <text x={10} y={40 + i * rowH + 13} className="fig-small" style={{ fill: "var(--text)" }}>{`instr ${i + 1}`}</text>
            {PC_STAGES.map((s, j) => (
              <g key={s}>
                <rect x={left + (start(i) + j) * cell} y={40 + i * rowH} width={cell - 1.5} height={rowH - 4} rx={3} className={j % 2 ? "fig-fill" : "fig-accent"} style={j % 2 ? undefined : { opacity: 0.35 }} />
                <text x={left + (start(i) + j) * cell + (cell - 1.5) / 2} y={40 + i * rowH + 15} textAnchor="middle" style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: cell >= 12 ? 11 : 8 }}>
                  {s}
                </text>
              </g>
            ))}
          </g>
        ))}
        <text x={10} y={212} className="fig-small">{PC_STAGES.map((s, j) => `${s} ${PC_NAMES[j]}`).join("  ·  ")}</text>
      </svg>
    </Frame>
  );
}

/** A loop branch run through a one-bit or a two-bit predictor: the counter's state, each guess, and how many were wrong. */
function BranchPredictor(props: Props) {
  const [bits, setBits] = useState(props.bits === 1 ? 1 : 2);
  const [trips, setTrips] = useState(clamp(num(props.trips, 4), 2, 6));
  const outcomes = Array.from({ length: 3 * trips }, (_, i) => i % trips !== trips - 1);
  const max = bits === 2 ? 3 : 1;
  const states = [bits === 2 ? 1 : 0];
  const guesses: boolean[] = [];
  outcomes.forEach((taken) => {
    const c = states[states.length - 1];
    guesses.push(bits === 2 ? c >= 2 : c === 1);
    states.push(taken ? Math.min(max, c + 1) : Math.max(0, c - 1));
  });
  const last = outcomes.length - 1;
  const [rawStep, setStep] = useState(clamp(num(props.step, 0), 0, 17));
  const step = Math.min(rawStep, last);
  const wrongSoFar = outcomes.slice(0, step + 1).filter((t, i) => guesses[i] !== t).length;
  const wrongLater = outcomes.filter((t, i) => i >= trips && guesses[i] !== t).length / 2;
  const names = bits === 2 ? ["strongly not taken", "weakly not taken", "weakly taken", "strongly taken"] : ["not taken", "taken"];
  const now = states[step + 1];
  const summary =
    `Branch ${step + 1} of ${outcomes.length}: the predictor guessed ${guesses[step] ? "taken" : "not taken"} and the branch was ${outcomes[step] ? "taken" : "not taken"}, ` +
    `${guesses[step] === outcomes[step] ? "a right guess" : "a wrong guess"}. The ${bits}-bit state is now ${names[now]}. ` +
    `${plural(wrongSoFar, "wrong guess", "wrong guesses")} so far. After the first pass, the ${bits}-bit predictor gets ${plural(wrongLater, "branch", "branches")} wrong in each pass of ${trips}.`;
  return (
    <Frame
      title={`A ${bits}-bit predictor on a loop of ${trips}`}
      summary={summary}
      controls={
        <>
          {[1, 2].map((b) => (
            <button key={b} type="button" className="btn btn-secondary btn-small" aria-pressed={bits === b} onClick={() => setBits(b)}>
              {`${b}-bit`}
            </button>
          ))}
          <Stepper label="loop length" value={trips} onChange={(v) => { setTrips(v); setStep(0); }} min={2} max={6} />
          <Stepper label="branch" value={step + 1} onChange={(v) => setStep(v - 1)} min={1} max={last + 1} />
        </>
      }
    >
      <svg viewBox="0 0 460 214" role="img" aria-label={`${bits}-bit predictor, ${wrongSoFar} wrong so far`}>
        {names.map((name, s) => {
          const w = 460 / names.length;
          return (
            <g key={name}>
              <circle cx={w * s + w / 2} cy={44} r={22} className={s === now ? "fig-accent" : "fig-fill"} />
              <text x={w * s + w / 2} y={49} textAnchor="middle" style={{ fill: s === now ? "var(--bg)" : "var(--text)", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600 }}>
                {bits === 2 ? s.toString(2).padStart(2, "0") : s}
              </text>
              {(bits === 2 ? [name.slice(0, name.indexOf(" ")), name.slice(name.indexOf(" ") + 1)] : [name]).map((line, k) => (
                <text key={line} x={w * s + w / 2} y={84 + k * 14} textAnchor="middle" className="fig-small">{line}</text>
              ))}
            </g>
          );
        })}
        <text x={10} y={128} className="fig-small">branch</text>
        <text x={10} y={152} className="fig-small">guess</text>
        {outcomes.map((t, i) => {
          const x = 70 + i * (380 / outcomes.length);
          const wrong = guesses[i] !== t;
          return (
            <g key={i} style={{ opacity: i <= step ? 1 : 0.25 }}>
              <text x={x} y={128} textAnchor="middle" style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 11 }}>{t ? "T" : "N"}</text>
              <text x={x} y={152} textAnchor="middle" style={{ fill: wrong ? "var(--focus)" : "var(--text)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: wrong ? 700 : 400 }}>
                {guesses[i] ? "T" : "N"}
              </text>
              {wrong && i <= step ? <line x1={x - 5} y1={158} x2={x + 5} y2={158} className="fig-accent-line" style={{ strokeWidth: 2 }} /> : null}
            </g>
          );
        })}
        <rect x={70 + step * (380 / outcomes.length) - 8} y={114} width={16} height={48} rx={3} className="fig-line" style={{ fill: "none" }} />
        <text x={10} y={196} className="fig-small">{`wrong guesses so far: ${wrongSoFar}, underlined`}</text>
      </svg>
    </Frame>
  );
}

const OOO_PROGRAM = [
  { text: "lw t0, 0(a0)", dest: "t0", srcs: ["a0"], lat: 3 },
  { text: "add t1, t0, t2", dest: "t1", srcs: ["t0", "t2"], lat: 1 },
  { text: "addi t3, a1, 4", dest: "t3", srcs: ["a1"], lat: 1 },
  { text: "mul t4, t3, t3", dest: "t4", srcs: ["t3"], lat: 3 },
  { text: "addi t5, a2, 1", dest: "t5", srcs: ["a2"], lat: 1 },
  { text: "add t6, t5, t4", dest: "t6", srcs: ["t5", "t4"], lat: 1 },
];

function oooSchedule(outOfOrder: boolean, width: number) {
  const ready: Record<string, number> = Object.fromEntries(OOO_PROGRAM.map((ins) => [ins.dest, Infinity]));
  const start: number[] = OOO_PROGRAM.map(() => 0);
  const issued: boolean[] = OOO_PROGRAM.map(() => false);
  let next = 0;
  for (let cycle = 1; issued.some((x) => !x) && cycle < 40; cycle++) {
    let used = 0;
    for (let i = outOfOrder ? 0 : next; i < OOO_PROGRAM.length && used < width; i++) {
      if (issued[i]) continue;
      const ins = OOO_PROGRAM[i];
      const ok = ins.srcs.every((r) => (ready[r] ?? 1) <= cycle);
      if (!ok) {
        if (outOfOrder) continue;
        break;
      }
      issued[i] = true;
      start[i] = cycle;
      ready[ins.dest] = cycle + ins.lat;
      used++;
      if (!outOfOrder) next = i + 1;
    }
  }
  const end = Math.max(...OOO_PROGRAM.map((ins, i) => start[i] + ins.lat - 1));
  return { start, end };
}

/** Issuing a short program in order or out of order, one to three instructions a cycle, and when each result is ready. */
function OooIssue(props: Props) {
  const [ooo, setOoo] = useState(props.mode === "ooo");
  const [width, setWidth] = useState(clamp(num(props.width, 2), 1, 3));
  const { start, end } = oooSchedule(ooo, width);
  const other = oooSchedule(!ooo, width).end;
  const cols = 12;
  const left = 130;
  const cell = (450 - left) / cols;
  const summary =
    `${ooo ? "Out of order" : "In order"}, up to ${plural(width, "instruction")} a cycle: the program's last result is ready after cycle ${end}, against ${other} ${ooo ? "in order" : "out of order"}. ` +
    (ooo
      ? `Independent instructions such as addi t3 and addi t5 start while the add waits for the load, so the waiting is hidden behind useful work.`
      : `The add must wait three cycles for the load, and everything after it waits too, even the instructions that do not need t0.`);
  return (
    <Frame
      title={ooo ? "Out-of-order issue" : "In-order issue"}
      summary={summary}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={!ooo} onClick={() => setOoo(false)}>
            in order
          </button>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={ooo} onClick={() => setOoo(true)}>
            out of order
          </button>
          <Stepper label="width" value={width} onChange={setWidth} min={1} max={3} />
        </>
      }
    >
      <svg viewBox="0 0 460 210" role="img" aria-label={`${ooo ? "Out of order" : "In order"}, width ${width}: done after cycle ${end}`}>
        {Array.from({ length: cols }, (_, c) => (
          <text key={c} x={left + c * cell + cell / 2} y={16} textAnchor="middle" className="fig-small">{c + 1}</text>
        ))}
        {OOO_PROGRAM.map((ins, i) => (
          <g key={i}>
            <text x={8} y={40 + i * 28} style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 11 }}>{ins.text}</text>
            {Array.from({ length: ins.lat }, (_, k) => (
              <rect key={k} x={left + (start[i] - 1 + k) * cell + 1} y={26 + i * 28} width={cell - 2} height={20} rx={3} className={k === 0 ? "fig-accent" : "fig-fill"} style={k === 0 ? { opacity: 0.55 } : undefined} />
            ))}
          </g>
        ))}
        <line x1={left + end * cell} y1={22} x2={left + end * cell} y2={196} className="fig-accent-line" style={{ strokeDasharray: "4 3" }} />
        <text x={left + end * cell - 4} y={206} textAnchor="end" className="fig-small">{`done after cycle ${end}`}</text>
      </svg>
    </Frame>
  );
}

type MsLane = "user" | "kernel" | "hardware";
const MS_EVENTS: Record<string, { label: string; moral: string; steps: [MsLane, string][] }> = {
  write: {
    label: "write a line",
    moral: "The program crossed into the kernel once and came back once, and never touched the terminal itself.",
    steps: [
      ["user", "ecall with a7 = 64, the number of write"],
      ["kernel", "trap: registers saved, kernel mode on"],
      ["kernel", "sys_write checks the buffer is user memory"],
      ["hardware", "the terminal is handed the 6 bytes"],
      ["kernel", "the result, 6, goes into the saved a0"],
      ["user", "sret: user mode, just after the ecall"],
    ],
  },
  fault: {
    label: "load from address 0",
    moral: "The program never asked for the kernel: its own bad load took it there, and it did not come back.",
    steps: [
      ["user", "lw t0, 0(zero): a load from address 0"],
      ["kernel", "page fault: registers saved, kernel mode on"],
      ["kernel", "nothing is mapped at 0, so: SIGSEGV"],
      ["kernel", "no handler for it, so the process ends"],
      ["user", "the shell wakes and reports the crash"],
    ],
  },
  privileged: {
    label: "turn off the timer",
    moral: "Only kernel mode may touch the timer, so the attempt itself is the program's last instruction.",
    steps: [
      ["user", "csrw: try to switch the timer off"],
      ["kernel", "illegal instruction: kernel mode on"],
      ["kernel", "SIGILL, no handler: the process ends"],
      ["user", "another program runs"],
    ],
  },
  timer: {
    label: "timer fires",
    moral: "The loop made no system call and did nothing wrong, yet the kernel took the processor back.",
    steps: [
      ["user", "a loop runs, making no system calls"],
      ["hardware", "the timer fires: 4 ms are up"],
      ["kernel", "interrupt: the loop's registers saved"],
      ["kernel", "the scheduler picks the music player"],
      ["user", "the music player runs; the loop waits"],
    ],
  },
};
const MS_LANES: MsLane[] = ["user", "kernel", "hardware"];

/** The three ways into the kernel: a system call, an exception and an interrupt, drawn as a path across user mode, kernel mode and the hardware. */
function ModeSwitch(props: Props) {
  const keys = Object.keys(MS_EVENTS);
  const [event, setEvent] = useState(keys.includes(String(props.event)) ? String(props.event) : "write");
  const ev = MS_EVENTS[event];
  const last = ev.steps.length - 1;
  const [rawStep, setStep] = useState(clamp(num(props.step, 0), 0, 5));
  const step = Math.min(rawStep, last);
  const laneY = (l: MsLane) => 46 + MS_LANES.indexOf(l) * 58;
  const x = (i: number) => 120 + i * (320 / last);
  const entries = ev.steps.filter(([l], i) => l === "kernel" && i > 0 && ev.steps[i - 1][0] !== "kernel").length;
  const summary =
    `Step ${step + 1} of ${last + 1}, in ${ev.steps[step][0] === "hardware" ? "the hardware" : `${ev.steps[step][0]} mode`}: ${ev.steps[step][1]}. ` +
    (step === last ? `${ev.moral} Entries into the kernel: ${entries}.` : "");
  return (
    <Frame
      title={`Into the kernel and out: ${ev.label}`}
      summary={summary}
      controls={
        <>
          {keys.map((k) => (
            <button key={k} type="button" className="btn btn-secondary btn-small" aria-pressed={event === k} onClick={() => { setEvent(k); setStep(0); }}>
              {MS_EVENTS[k].label}
            </button>
          ))}
          <Stepper label="step" value={step + 1} onChange={(v) => setStep(v - 1)} min={1} max={last + 1} />
        </>
      }
    >
      <svg viewBox="0 0 460 224" role="img" aria-label={`${ev.label}, step ${step + 1} of ${last + 1}`}>
        {MS_LANES.map((l) => (
          <g key={l}>
            <rect x={96} y={laneY(l) - 22} width={360} height={44} rx={8} className="fig-fill" style={{ opacity: l === "user" ? 0.35 : l === "kernel" ? 0.7 : 0.5 }} />
            <text x={8} y={laneY(l) + 4} className="fig-small" style={{ fill: "var(--text)" }}>{l === "hardware" ? "hardware" : `${l} mode`}</text>
          </g>
        ))}
        {ev.steps.slice(1).map(([l], i) => (
          <line key={i} x1={x(i)} y1={laneY(ev.steps[i][0])} x2={x(i + 1)} y2={laneY(l)} className={i < step ? "fig-accent-line" : "fig-line"} style={{ strokeWidth: i < step ? 2.5 : 1.5 }} />
        ))}
        {ev.steps.map(([l], i) => (
          <g key={i}>
            <circle cx={x(i)} cy={laneY(l)} r={13} className={i === step ? "fig-accent" : "fig-fill"} style={i === step ? undefined : { stroke: "var(--line)" }} />
            <text x={x(i)} y={laneY(l) + 4} textAnchor="middle" style={{ fill: i === step ? "var(--bg)" : "var(--text)", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>
              {i + 1}
            </text>
          </g>
        ))}
        <text x={8} y={214} className="fig-small" style={{ fill: "var(--text)" }}>{`${step + 1}. ${ev.steps[step][1]}`}</text>
      </svg>
    </Frame>
  );
}

type FtProc = { pid: number; parent: number | null; born: number; kids: number[] };

function forkTree(n: number, all: boolean): FtProc[] {
  const procs: FtProc[] = [{ pid: 100, parent: null, born: 0, kids: [] }];
  const inLoop = new Set([100]);
  let next = 101;
  for (let r = 1; r <= n; r++) {
    const forking = procs.filter((p) => inLoop.has(p.pid) && p.born < r);
    for (const p of forking) {
      const child: FtProc = { pid: next++, parent: p.pid, born: r, kids: [] };
      p.kids.push(child.pid);
      procs.push(child);
      if (all) inLoop.add(child.pid);
    }
  }
  return procs;
}

/** Processes made by calling fork in a loop: every process forks each time round, or only the parent does while each child leaves the loop. */
function ForkTree(props: Props) {
  const [n, setN] = useState(clamp(num(props.n, 3), 1, 4));
  const [all, setAll] = useState(props.mode !== "parent");
  const last = n + 1;
  const [rawStep, setStep] = useState(clamp(num(props.step, 0), 0, 5));
  const step = Math.min(rawStep, last);
  const procs = forkTree(n, all);
  const byPid = new Map(procs.map((p) => [p.pid, p]));
  const alive = procs.filter((p) => p.born <= Math.min(step, n));
  const leaves = (p: FtProc): number => (p.kids.length ? p.kids.map((k) => leaves(byPid.get(k)!)).reduce((a, b) => a + b, 0) : 1);
  const pos = new Map<number, { x: number; y: number }>();
  const total = leaves(procs[0]);
  const place = (p: FtProc, left: number, depth: number) => {
    const w = (leaves(p) / total) * 440;
    pos.set(p.pid, { x: 10 + left + w / 2, y: 28 + depth * 44 });
    let at = left;
    for (const k of p.kids) {
      const c = byPid.get(k)!;
      place(c, at, depth + 1);
      at += (leaves(c) / total) * 440;
    }
  };
  place(procs[0], 0, 0);
  const count = alive.length;
  const forkingNow = step >= 1 && step <= n ? procs.filter((p) => p.born < step && (all || p.pid === 100)).length : 0;
  let summary: string;
  if (step === 0) summary = `Step 1 of ${last + 1}. Before the loop there is 1 process, pid 100.`;
  else if (step <= n)
    summary = all
      ? `Step ${step + 1} of ${last + 1}. Time round ${step}: each of the ${plural(forkingNow, "process", "processes")} in the loop calls fork, and each call makes one child that carries on from the same point, with fork returning 0 in the child. There ${count === 1 ? "is" : "are"} now ${plural(count, "process", "processes")}.`
      : `Step ${step + 1} of ${last + 1}. Time round ${step}: only pid 100 is still in the loop. Its new child, pid ${100 + step}, sees fork return 0 and breaks out. There are now ${plural(count, "process", "processes")}.`;
  else
    summary = `Step ${step + 1} of ${last + 1}. The loop is over, and each of the ${plural(count, "process", "processes")} prints hi, so hi appears ${count} times: ${all ? `2 to the power ${n}` : `${n} + 1`}.`;
  const r = procs.length > 8 ? 11 : 13;
  return (
    <Frame
      title={all ? `fork() in a loop of ${n}` : `fork() in a loop of ${n}, children break out`}
      summary={summary}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={all} onClick={() => setAll(true)}>
            every process forks
          </button>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={!all} onClick={() => setAll(false)}>
            children break out
          </button>
          <Stepper label="loop length" value={n} onChange={(v) => { setN(v); setStep(0); }} min={1} max={4} />
          <Stepper label="step" value={step + 1} onChange={(v) => setStep(v - 1)} min={1} max={last + 1} />
        </>
      }
    >
      <svg viewBox="0 0 460 260" role="img" aria-label={`${count} processes after step ${step + 1}`}>
        {procs.filter((p) => p.parent !== null).map((p) => {
          const a = pos.get(p.parent!)!;
          const b = pos.get(p.pid)!;
          return <line key={p.pid} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={p.born === step ? "fig-accent-line" : "fig-line"} style={{ opacity: p.born <= step ? 1 : 0.15, strokeWidth: p.born === step ? 2.5 : 1.5 }} />;
        })}
        {procs.map((p) => {
          const at = pos.get(p.pid)!;
          const shown = p.born <= step;
          return (
            <g key={p.pid} style={{ opacity: shown ? 1 : 0.15 }}>
              <circle cx={at.x} cy={at.y} r={r} className={p.born === step && step > 0 && step <= n ? "fig-accent" : "fig-fill"} style={{ stroke: "var(--line)" }} />
              {shown ? (
                <text x={at.x} y={at.y + 3.5} textAnchor="middle" style={{ fill: p.born === step && step > 0 && step <= n ? "var(--bg)" : "var(--text)", fontFamily: "var(--font-mono)", fontSize: r > 12 ? 10 : 8.5, fontWeight: 600 }}>
                  {p.pid}
                </text>
              ) : null}
              {step === last ? (
                <text x={at.x} y={at.y + r + 12} textAnchor="middle" className="fig-small" style={{ fill: "var(--focus)", fontWeight: 600 }}>
                  hi
                </text>
              ) : null}
            </g>
          );
        })}
        <text x={10} y={252} className="fig-small">{`${plural(count, "process", "processes")}${step === last ? `, ${count} lines of hi` : ""}`}</text>
      </svg>
    </Frame>
  );
}

const SG_JOBS = [
  { name: "A", arrival: 0, length: 8 },
  { name: "B", arrival: 1, length: 4 },
  { name: "C", arrival: 2, length: 9 },
  { name: "D", arrival: 3, length: 5 },
];
const SG_NAMES: Record<string, string> = { fcfs: "first come, first served", sjf: "shortest job first", srtf: "shortest remaining time first", rr: "round robin" };

function sgSchedule(policy: string, quantum: number) {
  const segs: { job: number; start: number; end: number }[] = [];
  const left = SG_JOBS.map((j) => j.length);
  const add = (job: number, start: number, end: number) => {
    const prev = segs[segs.length - 1];
    if (prev && prev.job === job && prev.end === start) prev.end = end;
    else segs.push({ job, start, end });
  };
  let time = 0;
  if (policy === "rr") {
    const queue: number[] = [];
    let next = 0;
    const admit = () => {
      while (next < SG_JOBS.length && SG_JOBS[next].arrival <= time) queue.push(next++);
    };
    while (next < SG_JOBS.length || queue.length) {
      admit();
      if (!queue.length) {
        time = SG_JOBS[next].arrival;
        continue;
      }
      const j = queue.shift()!;
      const run = Math.min(quantum, left[j]);
      add(j, time, time + run);
      time += run;
      left[j] -= run;
      admit();
      if (left[j] > 0) queue.push(j);
    }
  } else {
    while (left.some((l) => l > 0)) {
      const ready = SG_JOBS.map((j, i) => i).filter((i) => SG_JOBS[i].arrival <= time && left[i] > 0);
      if (!ready.length) {
        time += 1;
        continue;
      }
      const running = segs.length && segs[segs.length - 1].end === time && left[segs[segs.length - 1].job] > 0 ? segs[segs.length - 1].job : -1;
      let j: number;
      if (policy === "fcfs") j = running >= 0 ? running : ready[0];
      else if (policy === "sjf") j = running >= 0 ? running : ready.reduce((a, b) => (SG_JOBS[b].length < SG_JOBS[a].length ? b : a));
      else j = ready.reduce((a, b) => (left[b] < left[a] ? b : a));
      add(j, time, time + 1);
      left[j] -= 1;
      time += 1;
    }
  }
  const finish = SG_JOBS.map((_, i) => Math.max(...segs.filter((s) => s.job === i).map((s) => s.end)));
  const first = SG_JOBS.map((_, i) => Math.min(...segs.filter((s) => s.job === i).map((s) => s.start)));
  return { segs, finish, first };
}

/** Four jobs on one processor under four scheduling policies, as a Gantt chart with waiting and response times. */
function SchedulerGantt(props: Props) {
  const policies = ["fcfs", "sjf", "srtf", "rr"];
  const [policy, setPolicy] = useState(policies.includes(String(props.policy)) ? String(props.policy) : "fcfs");
  const [quantum, setQuantum] = useState(clamp(num(props.quantum, 3), 1, 6));
  const { segs, finish, first } = sgSchedule(policy, quantum);
  const waits = SG_JOBS.map((j, i) => finish[i] - j.arrival - j.length);
  const responses = SG_JOBS.map((j, i) => first[i] - j.arrival);
  const avg = (xs: number[]) => {
    const v = xs.reduce((a, b) => a + b, 0) / xs.length;
    return Number.isInteger(v) ? String(v) : v.toFixed(2);
  };
  const end = Math.max(...finish);
  const left = 34;
  const unit = (450 - left) / end;
  const switches = segs.length - 1;
  const order = segs.map((s) => `${SG_JOBS[s.job].name} ${s.start}–${s.end}`).join(", ");
  const summary =
    `${SG_NAMES[policy][0].toUpperCase()}${SG_NAMES[policy].slice(1)}${policy === "rr" ? ` with a quantum of ${quantum} ms` : ""}: ${order}. ` +
    `Waiting times ${SG_JOBS.map((j, i) => `${j.name} ${waits[i]}`).join(", ")}, average ${avg(waits)} ms; average response ${avg(responses)} ms; ${plural(switches, "switch", "switches")} between jobs.`;
  return (
    <Frame
      title={`Scheduling four jobs: ${SG_NAMES[policy]}`}
      summary={summary}
      controls={
        <>
          {policies.map((p) => (
            <button key={p} type="button" className="btn btn-secondary btn-small" aria-pressed={policy === p} onClick={() => setPolicy(p)}>
              {SG_NAMES[p]}
            </button>
          ))}
          {policy === "rr" ? <Stepper label="quantum" value={quantum} onChange={setQuantum} min={1} max={6} /> : null}
        </>
      }
    >
      <svg viewBox="0 0 460 200" role="img" aria-label={`${SG_NAMES[policy]}: average waiting time ${avg(waits)} ms`}>
        {SG_JOBS.map((j, i) => (
          <g key={j.name}>
            <text x={8} y={36 + i * 34} style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>{j.name}</text>
            <line x1={left + j.arrival * unit} y1={20 + i * 34} x2={left + j.arrival * unit} y2={46 + i * 34} className="fig-accent-line" style={{ strokeWidth: 2 }} />
            <rect x={left + j.arrival * unit} y={24 + i * 34} width={(finish[i] - j.arrival) * unit} height={18} rx={3} className="fig-fill" style={{ opacity: 0.35 }} />
          </g>
        ))}
        {segs.map((s, k) => (
          <rect key={k} x={left + s.start * unit} y={24 + s.job * 34} width={(s.end - s.start) * unit - 1} height={18} rx={3} className="fig-accent" />
        ))}
        {Array.from({ length: end + 1 }, (_, t) => t).filter((t) => t % 2 === 0 || t === end).map((t) => (
          <text key={t} x={left + t * unit} y={170} textAnchor="middle" className="fig-small">{t}</text>
        ))}
        <line x1={left} y1={158} x2={left + end * unit} y2={158} className="fig-line" />
        <text x={8} y={192} className="fig-small">{`ms · bright: running · dark: waiting · tick: arrival`}</text>
      </svg>
    </Frame>
  );
}

const PT_ROWS: { frame: number | null; onDisk?: boolean; rights: string; note: string }[] = [
  { frame: null, rights: "---", note: "unmapped: null" },
  { frame: 5, rights: "r-x", note: "code" },
  { frame: 3, rights: "rw-", note: "data" },
  { frame: 6, rights: "rw-", note: "heap" },
  { frame: null, onDisk: true, rights: "rw-", note: "heap, swapped out" },
  { frame: null, rights: "---", note: "unmapped" },
  { frame: null, rights: "---", note: "unmapped" },
  { frame: 1, rights: "rw-", note: "stack" },
];
const PT_ACCESSES: Record<string, { label: string; vaddr: number; write: boolean }> = {
  code: { label: "read 0x1a2c", vaddr: 0x1a2c, write: false },
  data: { label: "write 0x2010", vaddr: 0x2010, write: true },
  "write-code": { label: "write 0x1004", vaddr: 0x1004, write: true },
  swapped: { label: "read 0x4100", vaddr: 0x4100, write: false },
  null: { label: "read 0x0000", vaddr: 0x0000, write: false },
};

/** Translating a virtual address through one process's page table: page number and offset, present and permission bits, and the faults. */
function PageTable(props: Props) {
  const keys = Object.keys(PT_ACCESSES);
  const [key, setKey] = useState(keys.includes(String(props.access)) ? String(props.access) : "code");
  const acc = PT_ACCESSES[key];
  const page = acc.vaddr >> 12;
  const offset = acc.vaddr & 0xfff;
  const row = PT_ROWS[page];
  const hex = (n: number) => `0x${n.toString(16)}`;
  let frame: number | null = null;
  let outcome: string;
  if (row.onDisk) {
    frame = 2;
    outcome = `Page ${page} has an entry but is not present: it was swapped out to disk. The hardware raises a page fault; the kernel reads the page from disk into free frame 2, marks the entry present, and runs the load again, which now gives ${hex((2 << 12) | offset)}. The program never notices, except that this load took milliseconds.`;
  } else if (row.frame === null) {
    outcome = `Page ${page} is not mapped at all, so the hardware raises a page fault and the kernel finds nothing to load. It sends the process SIGSEGV, a segmentation fault, which ends it.`;
  } else if (acc.write && !row.rights.includes("w")) {
    outcome = `Page ${page} is in frame ${row.frame}, but its entry says ${row.rights}: readable and executable, not writable. The write raises a protection fault, and the kernel ends the process with SIGSEGV. Code cannot be overwritten by accident or by an attacker.`;
  } else {
    frame = row.frame;
    outcome = `Page ${page} is present in frame ${row.frame} and ${acc.write ? "writable" : "readable"}, so the physical address is frame ${row.frame} followed by the same offset: ${hex((row.frame << 12) | offset)}.`;
  }
  const summary = `${acc.label}: the top 3 bits give page ${page} and the low 12 bits the offset ${hex(offset)}. ${outcome}`;
  const owner = (f: number) => {
    const i = PT_ROWS.findIndex((r) => r.frame === f);
    if (i >= 0) return `page ${i}`;
    if (f === 2) return row.onDisk ? "page 4, loaded" : "free";
    return "another process";
  };
  const rowY = (i: number) => 58 + i * 20;
  return (
    <Frame
      title={`Translating ${acc.label.split(" ")[1]}`}
      summary={summary}
      controls={keys.map((k) => (
        <button key={k} type="button" className="btn btn-secondary btn-small" aria-pressed={key === k} onClick={() => setKey(k)}>
          {PT_ACCESSES[k].label}
        </button>
      ))}
    >
      <svg viewBox="0 0 460 232" role="img" aria-label={`${acc.label}: page ${page}, offset ${hex(offset)}`}>
        <text x={10} y={18} style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>
          {`${acc.label.split(" ")[1]} = page ${page} · offset ${hex(offset)}`}
        </text>
        <text x={10} y={44} className="fig-small">page table</text>
        <text x={340} y={44} className="fig-small">physical memory</text>
        {PT_ROWS.map((r, i) => (
          <g key={i}>
            <rect x={10} y={rowY(i) - 13} width={300} height={18} rx={3} className={i === page ? "fig-accent" : "fig-fill"} style={{ opacity: i === page ? 0.35 : 0.5 }} />
            <text x={18} y={rowY(i)} style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
              {[String(i), r.rights, r.frame !== null ? `frame ${r.frame}` : r.onDisk ? "on disk" : "none"].join(" · ")}
            </text>
            <text x={162} y={rowY(i)} className="fig-small">{r.note}</text>
          </g>
        ))}
        {Array.from({ length: 8 }, (_, f) => (
          <g key={f}>
            <rect x={340} y={rowY(f) - 13} width={110} height={18} rx={3} className={f === frame ? "fig-accent" : "fig-fill"} style={{ opacity: f === frame ? 0.45 : 0.5 }} />
            <text x={346} y={rowY(f)} className="fig-small" style={{ fill: "var(--text)" }}>{`${f}: ${owner(f)}`}</text>
          </g>
        ))}
        {frame !== null ? <line x1={312} y1={rowY(page) - 4} x2={338} y2={rowY(frame) - 4} className="fig-accent-line" style={{ strokeWidth: 2.5 }} /> : null}
        <text x={10} y={226} className="fig-small" style={{ fill: frame === null ? "var(--focus)" : "var(--text)" }}>
          {frame === null ? "page fault: the process is ended" : `physical address ${hex((frame << 12) | offset)}`}
        </text>
      </svg>
    </Frame>
  );
}

const TLB_PATTERNS: Record<string, { label: string; addrs: number[] }> = {
  sequential: { label: "walk an array", addrs: Array.from({ length: 12 }, (_, i) => i * 0x400) },
  stride: { label: "one int per page", addrs: Array.from({ length: 12 }, (_, i) => (i % 6) * 0x1000 + 0x10) },
  loop: { label: "three hot pages", addrs: Array.from({ length: 12 }, (_, i) => (i % 3) * 0x1000 + 0x200 + (i >> 2) * 8) },
};
const TLB_FRAMES = [7, 2, 9, 4, 12, 1];

/** A four-entry TLB with LRU replacement in front of a four-level page table, on three access patterns. */
function TlbCache(props: Props) {
  const keys = Object.keys(TLB_PATTERNS);
  const [key, setKey] = useState(keys.includes(String(props.pattern)) ? String(props.pattern) : "sequential");
  const pat = TLB_PATTERNS[key];
  const last = pat.addrs.length - 1;
  const [rawStep, setStep] = useState(clamp(num(props.step, 0), 0, 11));
  const step = Math.min(rawStep, last);
  const tlb: number[] = [];
  const hit: boolean[] = [];
  const evicted: (number | null)[] = [];
  let snapshot: number[] = [];
  pat.addrs.forEach((a, i) => {
    const vpn = a >> 12;
    const at = tlb.indexOf(vpn);
    hit.push(at >= 0);
    evicted.push(at < 0 && tlb.length === 4 ? tlb[0] : null);
    if (at >= 0) tlb.splice(at, 1);
    else if (tlb.length === 4) tlb.shift();
    tlb.push(vpn);
    if (i === step) snapshot = [...tlb];
  });
  const vpn = pat.addrs[step] >> 12;
  const hits = hit.slice(0, step + 1).filter(Boolean).length;
  const misses = step + 1 - hits;
  const hex = (n: number) => `0x${n.toString(16).padStart(4, "0")}`;
  const summary =
    `Access ${step + 1} of ${last + 1}: address ${hex(pat.addrs[step])}, page ${vpn}. ` +
    (hit[step]
      ? `A TLB hit: frame ${TLB_FRAMES[vpn]} comes back in about a cycle, with no page-table walk. `
      : `A TLB miss: the hardware walks the four-level page table, four extra memory reads, finds frame ${TLB_FRAMES[vpn]}, and puts the translation in the TLB${evicted[step] !== null ? `, evicting page ${evicted[step]}, the least recently used` : ""}. `) +
    `So far ${plural(hits, "hit")} and ${plural(misses, "miss", "misses")}, ${4 * misses} extra memory reads.`;
  const cell = 34;
  return (
    <Frame
      title={`A 4-entry TLB: ${pat.label}`}
      summary={summary}
      controls={
        <>
          {keys.map((k) => (
            <button key={k} type="button" className="btn btn-secondary btn-small" aria-pressed={key === k} onClick={() => { setKey(k); setStep(0); }}>
              {TLB_PATTERNS[k].label}
            </button>
          ))}
          <Stepper label="access" value={step + 1} onChange={(v) => setStep(v - 1)} min={1} max={last + 1} />
        </>
      }
    >
      <svg viewBox="0 0 460 200" role="img" aria-label={`Access ${step + 1}: ${hits} hits, ${misses} misses`}>
        <text x={10} y={18} className="fig-small">page of each access</text>
        {pat.addrs.map((a, i) => (
          <g key={i} style={{ opacity: i <= step ? 1 : 0.25 }}>
            <rect x={10 + i * (cell + 3)} y={26} width={cell} height={26} rx={4} className={i === step ? "fig-accent" : "fig-fill"} style={i === step ? { opacity: 0.4 } : undefined} />
            <text x={10 + i * (cell + 3) + cell / 2} y={44} textAnchor="middle" style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>{a >> 12}</text>
            <text x={10 + i * (cell + 3) + cell / 2} y={68} textAnchor="middle" className="fig-small" style={{ fill: hit[i] ? "var(--text)" : "var(--focus)", fontWeight: hit[i] ? 400 : 700 }}>
              {i <= step ? (hit[i] ? "hit" : "miss") : ""}
            </text>
          </g>
        ))}
        <text x={10} y={96} className="fig-small">TLB, least recently used first</text>
        {Array.from({ length: 4 }, (_, i) => {
          const v = snapshot[i];
          return (
            <g key={i}>
              <rect x={10 + i * 112} y={104} width={104} height={30} rx={6} className={v === vpn ? "fig-accent" : "fig-fill"} style={v === vpn ? { opacity: 0.4 } : undefined} />
              <text x={62 + i * 112} y={124} textAnchor="middle" style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                {v === undefined ? "empty" : `page ${v} → ${TLB_FRAMES[v]}`}
              </text>
            </g>
          );
        })}
        <text x={10} y={160} style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>
          {`${hits} ${hits === 1 ? "hit" : "hits"} · ${misses} ${misses === 1 ? "miss" : "misses"} · ${4 * misses} walk reads`}
        </text>
        <text x={10} y={186} className="fig-small">{"pages 4 KiB · frames from the page table"}</text>
      </svg>
    </Frame>
  );
}

type IoSeg = { row: "cpu" | "dev"; start: number; len: number; kind: "io" | "spin" | "free" | "busy"; label: string };
const IO_NAMES: Record<string, string> = { polling: "polling", interrupt: "an interrupt per word", dma: "DMA" };

function ioSegments(mode: string, n: number) {
  const segs: IoSeg[] = [];
  let t = 0;
  const DEV = 4;
  segs.push({ row: "cpu", start: 0, len: 1, kind: "io", label: "start" });
  t = 1;
  if (mode === "dma") {
    segs.push({ row: "dev", start: t, len: DEV * n, kind: "busy", label: `${n} words into memory` });
    segs.push({ row: "cpu", start: t, len: DEV * n, kind: "free", label: "other work" });
    t += DEV * n;
    segs.push({ row: "cpu", start: t, len: 1, kind: "io", label: "irq" });
    t += 1;
  } else {
    for (let i = 0; i < n; i++) {
      segs.push({ row: "dev", start: t, len: DEV, kind: "busy", label: `w${i + 1}` });
      segs.push({ row: "cpu", start: t, len: DEV, kind: mode === "polling" ? "spin" : "free", label: mode === "polling" ? "poll" : "other" });
      t += DEV;
      segs.push({ row: "cpu", start: t, len: 1, kind: "io", label: mode === "polling" ? "copy" : "irq" });
      t += 1;
    }
  }
  return { segs, total: t };
}

/** Reading a block from a device three ways: the processor polling, an interrupt per word, and direct memory access with one interrupt at the end. */
function IoTimeline(props: Props) {
  const modes = ["polling", "interrupt", "dma"];
  const [mode, setMode] = useState(modes.includes(String(props.mode)) ? String(props.mode) : "polling");
  const [n, setN] = useState(clamp(num(props.words, 4), 1, 8));
  const { segs, total } = ioSegments(mode, n);
  const cpu = segs.filter((s) => s.row === "cpu");
  const ioTime = cpu.filter((s) => s.kind === "io" || s.kind === "spin").reduce((a, s) => a + s.len, 0);
  const spin = cpu.filter((s) => s.kind === "spin").reduce((a, s) => a + s.len, 0);
  const free = cpu.filter((s) => s.kind === "free").reduce((a, s) => a + s.len, 0);
  const irqs = cpu.filter((s) => s.label === "irq").length;
  const summary =
    `Reading ${plural(n, "word")} with ${IO_NAMES[mode]} takes ${total} time units, and the device needs 4 per word. ` +
    (mode === "polling"
      ? `The processor spends all ${total} on the transfer, ${spin} of them spinning on the status register, and can do nothing else.`
      : mode === "interrupt"
        ? `The processor spends ${ioTime} units on it, starting the read and handling ${plural(irqs, "interrupt")}, one per word, and has ${free} units free for other programs.`
        : `The device copies every word into memory itself. The processor spends ${ioTime} units, starting the transfer and handling ${plural(irqs, "interrupt")} at the end, and has ${free} units free.`);
  const left = 78;
  const unit = (450 - left) / 41;
  const rowY = { cpu: 52, dev: 112 };
  const cls = (k: IoSeg["kind"]) => (k === "io" ? "fig-accent" : k === "spin" ? "fig-accent" : k === "busy" ? "fig-fill" : "fig-ghost");
  return (
    <Frame
      title={`Reading from a device: ${IO_NAMES[mode]}`}
      summary={summary}
      controls={
        <>
          {modes.map((m) => (
            <button key={m} type="button" className="btn btn-secondary btn-small" aria-pressed={mode === m} onClick={() => setMode(m)}>
              {IO_NAMES[m]}
            </button>
          ))}
          <Stepper label="words" value={n} onChange={setN} min={1} max={8} />
        </>
      }
    >
      <svg viewBox="0 0 460 200" role="img" aria-label={`${IO_NAMES[mode]}: ${ioTime} of ${total} units on I/O`}>
        <text x={8} y={rowY.cpu + 17} className="fig-small" style={{ fill: "var(--text)" }}>processor</text>
        <text x={8} y={rowY.dev + 17} className="fig-small" style={{ fill: "var(--text)" }}>device</text>
        {segs.map((s, i) => (
          <g key={i}>
            <rect
              x={left + s.start * unit}
              y={rowY[s.row]}
              width={Math.max(1, s.len * unit - 1)}
              height={26}
              rx={3}
              className={cls(s.kind)}
              style={s.kind === "spin" ? { opacity: 0.35 } : s.kind === "free" ? { opacity: 0.6 } : undefined}
            />
            {s.len * unit > 24 ? (
              <text x={left + (s.start + s.len / 2) * unit} y={rowY[s.row] + 17} textAnchor="middle" className="fig-small" style={{ fill: "var(--text)" }}>
                {s.label}
              </text>
            ) : null}
          </g>
        ))}
        <line x1={left} y1={152} x2={left + total * unit} y2={152} className="fig-line" />
        <text x={left} y={168} className="fig-small">0</text>
        <text x={left + total * unit} y={168} textAnchor="end" className="fig-small">{total}</text>
        <text x={8} y={192} className="fig-small">{`on I/O ${ioTime} · free ${free} · interrupts ${irqs}`}</text>
      </svg>
    </Frame>
  );
}

const IB_SIZES: Record<string, { label: string; kib: number }> = {
  "10k": { label: "10 KiB", kib: 10 },
  "48k": { label: "48 KiB", kib: 48 },
  "100k": { label: "100 KiB", kib: 100 },
  "4m": { label: "4 MiB", kib: 4096 },
  "1g": { label: "1 GiB", kib: 1048576 },
};

/** An inode's block pointers: twelve direct, then single and double indirect blocks, for files of growing size. */
function InodeBlocks(props: Props) {
  const keys = Object.keys(IB_SIZES);
  const [key, setKey] = useState(keys.includes(String(props.size)) ? String(props.size) : "10k");
  const { label, kib } = IB_SIZES[key];
  const blocks = Math.ceil(kib / 4);
  const direct = Math.min(12, blocks);
  const single = Math.min(1024, Math.max(0, blocks - 12));
  const dbl = Math.max(0, blocks - 12 - 1024);
  const dblTables = Math.ceil(dbl / 1024);
  const meta = (single ? 1 : 0) + (dbl ? 1 + dblTables : 0);
  const lastReads = dbl ? 3 : single ? 2 : 1;
  const fmt = (n: number) => n.toLocaleString("en-IN");
  const summary =
    `A file of ${label} fills ${fmt(blocks)} data ${blocks === 1 ? "block" : "blocks"} of 4 KiB. ` +
    `${direct === blocks ? `All ${plural(direct, "is", "are")} listed directly in the inode.` : `The inode lists the first 12 directly; `}` +
    (single ? `the single indirect block lists ${fmt(single)} more` : "") +
    (dbl ? `, and the double indirect block points to ${plural(dblTables, "block")} of pointers listing the last ${fmt(dbl)}` : "") +
    (single ? `. That is ${plural(meta, "extra block", "extra blocks")} of pointers. ` : " ") +
    `Reading the file's last byte, with the inode already in memory, takes ${plural(lastReads, "disk read")}.`;
  const cells = Array.from({ length: 12 }, (_, i) => i < direct);
  return (
    <Frame
      title={`Where a ${label} file's blocks are listed`}
      summary={summary}
      controls={keys.map((k) => (
        <button key={k} type="button" className="btn btn-secondary btn-small" aria-pressed={key === k} onClick={() => setKey(k)}>
          {IB_SIZES[k].label}
        </button>
      ))}
    >
      <svg viewBox="0 0 460 220" role="img" aria-label={`${label}: ${fmt(blocks)} data blocks, ${meta} pointer blocks`}>
        <rect x={10} y={10} width={150} height={200} rx={8} className="fig-fill" style={{ opacity: 0.5 }} />
        <text x={20} y={30} style={{ fill: "var(--text)", fontSize: 12, fontWeight: 600 }}>inode</text>
        <text x={20} y={46} className="fig-small">{`size ${label}`}</text>
        {cells.map((used, i) => (
          <rect key={i} x={20 + (i % 6) * 22} y={58 + Math.floor(i / 6) * 22} width={18} height={18} rx={3} className={used ? "fig-accent" : "fig-ghost"} style={used ? { opacity: 0.7 } : undefined} />
        ))}
        <text x={20} y={118} className="fig-small">12 direct</text>
        {[
          { name: "single", y: 136, used: single > 0 },
          { name: "double", y: 162, used: dbl > 0 },
          { name: "triple", y: 188, used: false },
        ].map((p) => (
          <g key={p.name}>
            <rect x={20} y={p.y - 12} width={18} height={18} rx={3} className={p.used ? "fig-accent" : "fig-ghost"} style={p.used ? { opacity: 0.7 } : undefined} />
            <text x={44} y={p.y + 2} className="fig-small">{p.name}</text>
            {p.used ? <line x1={160} y1={p.y - 3} x2={196} y2={p.y - 3} className="fig-accent-line" style={{ strokeWidth: 2 }} /> : null}
          </g>
        ))}
        <text x={200} y={30} className="fig-small" style={{ fill: "var(--text)" }}>{`data blocks: ${fmt(blocks)}`}</text>
        <rect x={200} y={40} width={250} height={14} rx={3} className="fig-fill" style={{ opacity: 0.5 }} />
        <rect x={200} y={40} width={Math.max(2, (250 * direct) / blocks)} height={14} rx={3} className="fig-accent" />
        <text x={200} y={70} className="fig-small">{`direct ${fmt(direct)}`}</text>
        {single ? (
          <g>
            <rect x={200} y={124} width={250} height={22} rx={4} className="fig-fill" style={{ opacity: 0.5 }} />
            <text x={208} y={139} className="fig-small" style={{ fill: "var(--text)" }}>{`1 pointer block → ${fmt(single)} data blocks`}</text>
          </g>
        ) : null}
        {dbl ? (
          <g>
            <rect x={200} y={150} width={250} height={22} rx={4} className="fig-fill" style={{ opacity: 0.5 }} />
            <text x={208} y={165} className="fig-small" style={{ fill: "var(--text)" }}>{`1 + ${fmt(dblTables)} pointer blocks → ${fmt(dbl)}`}</text>
          </g>
        ) : null}
        <text x={200} y={192} className="fig-small">{`last byte: ${plural(lastReads, "disk read")}`}</text>
        <text x={200} y={208} className="fig-small">4 KiB blocks, 1,024 pointers each</text>
      </svg>
    </Frame>
  );
}

const TM_NAMES: Record<string, string> = { "one-to-one": "1:1 kernel threads", "many-to-one": "N:1 user-level threads", "many-to-many": "M:N runtime" };

/** Six threads of one process on four cores under three threading models, with and without one thread blocked in a system call. */
function ThreadModels(props: Props) {
  const models = ["one-to-one", "many-to-one", "many-to-many"];
  const [model, setModel] = useState(models.includes(String(props.model)) ? String(props.model) : "one-to-one");
  const [blocked, setBlocked] = useState(props.blocked === true);
  const users = [1, 2, 3, 4, 5, 6];
  // kernel thread for each user thread (index into kernels), and which kernel threads are on cores
  let kernels: number[];
  let userToKernel: (number | null)[];
  let onCore: number[];
  let note: string;
  if (model === "one-to-one") {
    kernels = [1, 2, 3, 4, 5, 6];
    userToKernel = users.map((u) => u - 1);
    onCore = blocked ? [1, 2, 3, 4] : [0, 1, 2, 3];
    note = blocked
      ? "T1 is blocked in read, so the kernel puts its kernel thread to sleep and runs four of the other five on the four cores; T6 waits its turn."
      : "Each thread is a kernel thread, so the kernel schedules them directly: four run, one per core, and two wait their turn.";
  } else if (model === "many-to-one") {
    kernels = [1];
    userToKernel = users.map(() => 0);
    onCore = blocked ? [] : [0];
    note = blocked
      ? "T1 called read. The kernel sees only one thread, the process's, and puts it to sleep, so none of the six can run until the read finishes, and every core is idle for this process."
      : "The library switches the six threads on one kernel thread, cheaply and without system calls, but they can only ever use one core.";
  } else {
    kernels = blocked ? [1, 2, 3, 4, 5] : [1, 2, 3, 4];
    userToKernel = blocked ? [0, 4, 1, 2, 3, null] : [0, 1, 2, 3, null, null];
    onCore = blocked ? [1, 2, 3, 4] : [0, 1, 2, 3];
    note = blocked
      ? "T1 is blocked in read on its kernel thread. The runtime notices, starts another kernel thread and moves the waiting work onto it, so four threads still run."
      : "The runtime multiplexes six threads onto four kernel threads, one per core; threads waiting for their turn cost only a little memory.";
  }
  const running = onCore.map((k) => userToKernel.indexOf(k)).filter((u) => u >= 0 && !(blocked && u === 0));
  const summary = `${TM_NAMES[model]}${blocked ? ", with T1 blocked in a read" : ""}: ${plural(running.length, "thread")} running on 4 cores. ${note}`;
  const ux = (i: number) => 40 + i * 76;
  const kx = (j: number) => (kernels.length === 1 ? 230 : 40 + (j * 380) / (kernels.length - 1));
  const cx = (c: number) => 70 + c * 106;
  return (
    <Frame
      title={`Threads on cores: ${TM_NAMES[model]}`}
      summary={summary}
      controls={
        <>
          {models.map((m) => (
            <button key={m} type="button" className="btn btn-secondary btn-small" aria-pressed={model === m} onClick={() => setModel(m)}>
              {TM_NAMES[m]}
            </button>
          ))}
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={blocked} onClick={() => setBlocked(!blocked)}>
            T1 blocks in read
          </button>
        </>
      }
    >
      <svg viewBox="0 0 460 220" role="img" aria-label={`${TM_NAMES[model]}: ${running.length} threads running`}>
        <text x={4} y={14} className="fig-small">threads</text>
        <text x={4} y={96} className="fig-small">kernel threads</text>
        <text x={4} y={156} className="fig-small">cores</text>
        {users.map((u, i) => {
          const k = userToKernel[i];
          const isRunning = running.includes(i);
          const asleep = blocked && i === 0;
          return (
            <g key={u}>
              {k !== null ? <line x1={ux(i)} y1={46} x2={kx(k)} y2={104} className={isRunning ? "fig-accent-line" : "fig-line"} style={{ strokeWidth: isRunning ? 2 : 1, opacity: isRunning ? 1 : 0.5 }} /> : null}
              <rect x={ux(i) - 26} y={22} width={52} height={24} rx={6} className={isRunning ? "fig-accent" : "fig-fill"} style={{ opacity: asleep ? 0.35 : isRunning ? 0.6 : 0.8 }} />
              <text x={ux(i)} y={38} textAnchor="middle" style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600 }}>{asleep ? "T1 zz" : `T${u}`}</text>
            </g>
          );
        })}
        {kernels.map((k, j) => {
          const core = onCore.indexOf(j);
          return (
            <g key={k}>
              {core >= 0 ? <line x1={kx(j)} y1={126} x2={cx(core)} y2={162} className="fig-accent-line" style={{ strokeWidth: 2 }} /> : null}
              <rect x={kx(j) - 20} y={104} width={40} height={22} rx={5} className="fig-fill" style={{ stroke: "var(--line)" }} />
              <text x={kx(j)} y={119} textAnchor="middle" style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 10 }}>{`K${k}`}</text>
            </g>
          );
        })}
        {[0, 1, 2, 3].map((c) => {
          const busy = onCore[c] !== undefined;
          return (
            <g key={c}>
              <rect x={cx(c) - 36} y={162} width={72} height={26} rx={6} className={busy ? "fig-accent" : "fig-ghost"} style={busy ? { opacity: 0.45 } : undefined} />
              <text x={cx(c)} y={179} textAnchor="middle" className="fig-small" style={{ fill: "var(--text)" }}>{busy ? `core ${c}` : `core ${c} idle`}</text>
            </g>
          );
        })}
        <text x={4} y={210} className="fig-small">{`${running.length} running · ${kernels.length} kernel ${kernels.length === 1 ? "thread" : "threads"}`}</text>
      </svg>
    </Frame>
  );
}

type PlState = "new" | "ready" | "running" | "blocked" | "zombie" | "gone";
const PL_POS: Record<PlState, { x: number; y: number }> = {
  new: { x: 50, y: 50 },
  ready: { x: 170, y: 50 },
  running: { x: 300, y: 50 },
  blocked: { x: 235, y: 140 },
  zombie: { x: 410, y: 50 },
  gone: { x: 410, y: 140 },
};
const PL_COMMON: [PlState, string][] = [
  ["new", "The shell forks: the child, pid 4242, exists but has not run yet."],
  ["ready", "The child is ready, waiting for a core."],
  ["running", "The scheduler runs it, and it execs the backup program."],
  ["blocked", "It calls read on the disk and blocks until the data arrives."],
  ["ready", "The disk interrupt wakes it: ready again."],
  ["running", "It runs again, copying files."],
];
const PL_ENDINGS: Record<string, { label: string; steps: [PlState, string][]; status: string }> = {
  exit: {
    label: "finishes",
    status: "exit status 0, so $? is 0",
    steps: [
      ["zombie", "It calls exit(0). Its memory and files are freed, but its entry stays, holding the status: a zombie."],
      ["gone", "The shell's wait returns pid 4242 and status 0, and the entry is removed: reaped."],
    ],
  },
  term: {
    label: "gets SIGTERM",
    status: "exit status 0 after cleaning up, so $? is 0",
    steps: [
      ["running", "kill 4242 sends SIGTERM. On its next return to user mode the kernel runs its handler, which sets a flag."],
      ["zombie", "The program sees the flag, finishes the file it was copying, and calls exit(0): a zombie."],
      ["gone", "The shell's wait collects status 0, and the entry is removed."],
    ],
  },
  kill: {
    label: "gets SIGKILL",
    status: "killed by signal 9, so $? is 128 + 9 = 137",
    steps: [
      ["zombie", "kill -9 sends SIGKILL, which no handler can catch. The kernel ends it at once, mid-file: a zombie."],
      ["gone", "The shell's wait reports killed by signal 9, and the entry is removed."],
    ],
  },
  orphan: {
    label: "outlives its parent",
    status: "exit status 0, collected by init",
    steps: [
      ["running", "The shell exits first. The child is orphaned and adopted by init, pid 1."],
      ["zombie", "It calls exit(0) and becomes a zombie, now init's child."],
      ["gone", "init, which waits for any child in a loop, reaps it."],
    ],
  },
};

/** The life of a process as a state diagram: created, ready, running, blocked, zombie and reaped, with four ways for it to end. */
function ProcessLife(props: Props) {
  const keys = Object.keys(PL_ENDINGS);
  const [ending, setEnding] = useState(keys.includes(String(props.ending)) ? String(props.ending) : "exit");
  const steps = [...PL_COMMON, ...PL_ENDINGS[ending].steps];
  const last = steps.length - 1;
  const [rawStep, setStep] = useState(clamp(num(props.step, 0), 0, 12));
  const step = Math.min(rawStep, last);
  const [state, note] = steps[step];
  const summary = `Step ${step + 1} of ${last + 1}, ${state === "gone" ? "reaped" : state}: ${note}${step === last ? ` In the end: ${PL_ENDINGS[ending].status}.` : ""}`;
  const edges: [PlState, PlState][] = [
    ["new", "ready"],
    ["ready", "running"],
    ["running", "ready"],
    ["running", "blocked"],
    ["blocked", "ready"],
    ["running", "zombie"],
    ["zombie", "gone"],
  ];
  const prev = step > 0 ? steps[step - 1][0] : null;
  return (
    <Frame
      title={`The life of a process that ${PL_ENDINGS[ending].label}`}
      summary={summary}
      controls={
        <>
          {keys.map((k) => (
            <button key={k} type="button" className="btn btn-secondary btn-small" aria-pressed={ending === k} onClick={() => { setEnding(k); setStep(0); }}>
              {PL_ENDINGS[k].label}
            </button>
          ))}
          <Stepper label="step" value={step + 1} onChange={(v) => setStep(v - 1)} min={1} max={last + 1} />
        </>
      }
    >
      <svg viewBox="0 0 460 200" role="img" aria-label={`Step ${step + 1}: ${state}`}>
        {edges.map(([a, b]) => {
          const p = PL_POS[a];
          const q = PL_POS[b];
          const active = prev === a && state === b;
          const bend = a === "running" && b === "ready" ? -18 : 0;
          return (
            <path
              key={`${a}-${b}`}
              d={`M ${p.x} ${p.y + bend * 0.2} Q ${(p.x + q.x) / 2} ${(p.y + q.y) / 2 + bend} ${q.x} ${q.y + bend * 0.2}`}
              fill="none"
              className={active ? "fig-accent-line" : "fig-line"}
              style={{ strokeWidth: active ? 3 : 1.5 }}
            />
          );
        })}
        {(Object.keys(PL_POS) as PlState[]).map((s) => (
          <g key={s}>
            <rect x={PL_POS[s].x - 40} y={PL_POS[s].y - 15} width={80} height={30} rx={15} className={s === state ? "fig-accent" : "fig-fill"} style={{ stroke: "var(--line)" }} />
            <text x={PL_POS[s].x} y={PL_POS[s].y + 4} textAnchor="middle" style={{ fill: s === state ? "var(--bg)" : "var(--text)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600 }}>
              {s === "gone" ? "reaped" : s}
            </text>
          </g>
        ))}
        <text x={10} y={190} className="fig-small">{step === last ? PL_ENDINGS[ending].status : "pid 4242, child of the shell"}</text>
      </svg>
    </Frame>
  );
}

type TiStep = { who: "A" | "B"; op: string };

function tiMerges(a: TiStep[], b: TiStep[]): TiStep[][] {
  if (!a.length) return [b];
  if (!b.length) return [a];
  return [...tiMerges(a.slice(1), b).map((m) => [a[0], ...m]), ...tiMerges(a, b.slice(1)).map((m) => [b[0], ...m])];
}

function tiRun(order: TiStep[]) {
  let count = 0;
  const reg = { A: 0, B: 0 };
  const notes: string[] = [];
  const after: number[] = [];
  for (const s of order) {
    if (s.op === "load") {
      reg[s.who] = count;
      notes.push(`load ${count}`);
    } else if (s.op === "add") {
      reg[s.who] += 1;
      notes.push(`add → ${reg[s.who]}`);
    } else if (s.op === "store") {
      count = reg[s.who];
      notes.push(`store ${count}`);
    } else {
      count += 1;
      notes.push(`+1 → ${count}`);
    }
    after.push(count);
  }
  return { count, notes, after };
}

/** Every interleaving of two threads' increments of one shared count, as three steps each or as one atomic step. */
function ThreadInterleaving(props: Props) {
  const modes = ["steps", "atomic"];
  const [mode, setMode] = useState(modes.includes(String(props.mode)) ? String(props.mode) : "steps");
  const ops = mode === "steps" ? ["load", "add", "store"] : ["increment"];
  const merges = tiMerges(
    ops.map((op) => ({ who: "A" as const, op })),
    ops.map((op) => ({ who: "B" as const, op })),
  );
  const total = merges.length;
  const [raw, setRaw] = useState(clamp(num(props.schedule, 1), 1, 20));
  const k = Math.min(raw, total);
  const order = merges[k - 1];
  const { count, notes, after } = tiRun(order);
  const bad = merges.filter((m) => tiRun(m).count !== 2).length;
  const words = order.map((s) => `${s.who} ${s.op === "increment" ? "increments" : s.op}`).join(", ");
  const summary =
    `Schedule ${k} of ${total}: ${words}. The count ends at ${count}` +
    (count === 2 ? ", which is right." : ": both threads loaded the same old value, and one store overwrote the other, so one increment is lost.") +
    ` ${bad === 0 ? `None of the ${total} schedules loses` : `${bad} of the ${total} schedules lose`} an update.`;
  const col = mode === "steps" ? 64 : 160;
  const x0 = 70;
  const laneY = { A: 40, B: 96 };
  return (
    <Frame
      title={mode === "steps" ? "Two threads, count += 1 each, as load, add, store" : "Two threads, count += 1 each, as one atomic step"}
      summary={summary}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={mode === "steps"} onClick={() => setMode("steps")}>
            load, add, store
          </button>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={mode === "atomic"} onClick={() => setMode("atomic")}>
            one atomic step
          </button>
          <Stepper label="schedule" value={k} onChange={setRaw} min={1} max={total} />
        </>
      }
    >
      <svg viewBox="0 0 460 210" role="img" aria-label={`Schedule ${k} of ${total}: count ends at ${count}`}>
        <text x={8} y={18} className="fig-small">time →</text>
        {(["A", "B"] as const).map((who) => (
          <text key={who} x={8} y={laneY[who] + 20} style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>
            {`thread ${who}`}
          </text>
        ))}
        {order.map((s, i) => {
          const x = x0 + i * col;
          const lost = mode === "steps" && s.op === "store" && count !== 2 && i === order.length - 1;
          return (
            <g key={i}>
              <rect x={x} y={laneY[s.who]} width={col - 6} height={30} rx={5} className={lost ? "fig-accent" : "fig-fill"} style={lost ? { opacity: 0.5 } : undefined} />
              <text x={x + (col - 6) / 2} y={laneY[s.who] + 19} textAnchor="middle" style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                {notes[i]}
              </text>
              <text x={x + (col - 6) / 2} y={160} textAnchor="middle" className="fig-small">{String(after[i])}</text>
            </g>
          );
        })}
        <line x1={x0} y1={142} x2={x0 + order.length * col - 6} y2={142} className="fig-line" />
        <text x={8} y={160} className="fig-small">count</text>
        <text x={8} y={196} style={{ fill: count === 2 ? "var(--text)" : "var(--focus)", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>
          {count === 2 ? "count = 2, correct" : `count = ${count}, one increment lost`}
        </text>
        <text x={452} y={196} textAnchor="end" className="fig-small">{`${bad} of ${total} schedules lose an update`}</text>
      </svg>
    </Frame>
  );
}

/** Threads that each do some work, a short critical section and some more work, with and without a lock around the critical section. */
function LockTimeline(props: Props) {
  const [mode, setMode] = useState(props.mode === "none" ? "none" : "lock");
  const [n, setN] = useState(clamp(num(props.threads, 3), 1, 5));
  const names = ["A", "B", "C", "D", "E"].slice(0, n);
  const before = 2;
  const crit = 2;
  const after = 1;
  const rows = names.map((name, k) => {
    const start = mode === "lock" ? before + crit * k : before;
    return { name, wait: start - before, start, end: start + crit + after };
  });
  const total = Math.max(...rows.map((r) => r.end));
  const count = mode === "lock" ? n : 1;
  const last = rows[rows.length - 1];
  const summary =
    mode === "lock"
      ? `With the lock, ${plural(n, "thread")} on ${plural(n, "core")} finish in ${total} time units, against ${before + crit + after} without it, and the count is ${count}, correct. ` +
        (n > 1 ? `Thread ${last.name} waited ${last.wait} units for the lock, ${crit} for each critical section ahead of it. ` : "") +
        `At most one thread is ever inside, so at most one critical section finishes every ${crit} units, however many threads there are.`
      : `Without the lock, ${plural(n, "thread")} finish in ${total} time units, ` +
        (n > 1
          ? `but every thread loads the count inside its critical section before any of them stores, so all store 1 and the count is 1: ${plural(n - 1, "increment")} lost.`
          : "and with one thread there is nobody to collide with, so the count is 1, correct.");
  const unit = 26;
  const x0 = 76;
  return (
    <Frame
      title={mode === "lock" ? "A lock around the critical section" : "No lock around the critical section"}
      summary={summary}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={mode === "lock"} onClick={() => setMode("lock")}>
            with a lock
          </button>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={mode === "none"} onClick={() => setMode("none")}>
            no lock
          </button>
          <Stepper label="threads" value={n} onChange={setN} min={1} max={5} />
        </>
      }
    >
      <svg viewBox="0 0 460 240" role="img" aria-label={`${n} threads, ${mode === "lock" ? "with" : "without"} a lock: ${total} units, count ${count}`}>
        {rows.map((r, k) => {
          const y = 20 + k * 34;
          return (
            <g key={r.name}>
              <text x={8} y={y + 18} style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>{`thread ${r.name}`}</text>
              <rect x={x0} y={y} width={before * unit - 2} height={26} rx={4} className="fig-fill" />
              {r.wait > 0 ? (
                <g>
                  <rect x={x0 + before * unit} y={y + 9} width={r.wait * unit - 2} height={8} rx={3} className="fig-ghost" />
                  <text x={x0 + (before + r.wait / 2) * unit} y={y + 6} textAnchor="middle" className="fig-small">wait</text>
                </g>
              ) : null}
              <rect x={x0 + r.start * unit} y={y} width={crit * unit - 2} height={26} rx={4} className="fig-accent" style={{ opacity: 0.6 }} />
              <text x={x0 + (r.start + crit / 2) * unit} y={y + 17} textAnchor="middle" className="fig-small" style={{ fill: "var(--text)" }}>
                {mode === "lock" ? `${k} → ${k + 1}` : "0 → 1"}
              </text>
              <rect x={x0 + (r.start + crit) * unit} y={y} width={after * unit - 2} height={26} rx={4} className="fig-fill" />
            </g>
          );
        })}
        <line x1={x0} y1={194} x2={x0 + 13 * unit} y2={194} className="fig-line" />
        {Array.from({ length: 14 }, (_, t) => (t % 2 === 1 ? null : (
          <text key={t} x={x0 + t * unit} y={208} textAnchor="middle" className="fig-small">{t}</text>
        )))}
        <text x={8} y={232} className="fig-small">{"time units · bright: critical section"}</text>
        <text x={452} y={232} textAnchor="end" style={{ fill: count === n ? "var(--text)" : "var(--focus)", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>
          {`count ${count} of ${n}`}
        </text>
      </svg>
    </Frame>
  );
}

type DgEvent = { text: string; holds: Record<string, string>; waits: Record<string, string> };

const DG_SCRIPTS: Record<string, { label: string; events: DgEvent[] }> = {
  opposite: {
    label: "opposite orders",
    events: [
      { text: "T1 will move money from A to B and takes A first; T2 will move money from B to A and takes B first. Both locks are free.", holds: {}, waits: {} },
      { text: "T1 takes lock A.", holds: { A: "T1" }, waits: {} },
      { text: "T2 takes lock B.", holds: { A: "T1", B: "T2" }, waits: {} },
      { text: "T1 asks for B, which T2 holds, and waits.", holds: { A: "T1", B: "T2" }, waits: { T1: "B" } },
      { text: "T2 asks for A, which T1 holds, and waits. T1 waits for T2 and T2 waits for T1: the graph has a cycle, and neither thread can ever move. Deadlock.", holds: { A: "T1", B: "T2" }, waits: { T1: "B", T2: "A" } },
    ],
  },
  ordered: {
    label: "same order",
    events: [
      { text: "Both threads take the locks in the same order, A before B, whichever way the money goes. Both locks are free.", holds: {}, waits: {} },
      { text: "T1 takes lock A.", holds: { A: "T1" }, waits: {} },
      { text: "T2 asks for A, which T1 holds, and waits, holding nothing.", holds: { A: "T1" }, waits: { T2: "A" } },
      { text: "T1 takes lock B and now holds both.", holds: { A: "T1", B: "T1" }, waits: { T2: "A" } },
      { text: "T1 makes its transfer and releases B and A. T2's wait is over.", holds: {}, waits: { T2: "A" } },
      { text: "T2 takes lock A.", holds: { A: "T2" }, waits: {} },
      { text: "T2 takes lock B, makes its transfer and releases both. A thread waiting for A holds nothing, so no cycle can form: no deadlock.", holds: { A: "T2", B: "T2" }, waits: {} },
    ],
  },
};

function dgArrow(x1: number, y1: number, x2: number, y2: number) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p = (d: number, t: number) => `${x2 - d * Math.cos(a + t)},${y2 - d * Math.sin(a + t)}`;
  return `${x2},${y2} ${p(10, 0.4)} ${p(10, -0.4)}`;
}

/** A wait-for graph of two threads and two locks, as they take the locks in opposite orders or in the same order. */
function DeadlockGraph(props: Props) {
  const keys = Object.keys(DG_SCRIPTS);
  const [key, setKey] = useState(keys.includes(String(props.order)) ? String(props.order) : "opposite");
  const script = DG_SCRIPTS[key];
  const last = script.events.length - 1;
  const [raw, setStep] = useState(clamp(num(props.step, 0), 0, 6));
  const step = Math.min(raw, last);
  const ev = script.events[step];
  const cycle = Object.keys(ev.waits).length === 2 && Object.keys(ev.holds).length === 2 && ev.holds.A !== ev.holds.B;
  const pos: Record<string, { x: number; y: number }> = { T1: { x: 100, y: 56 }, T2: { x: 100, y: 156 }, A: { x: 340, y: 56 }, B: { x: 340, y: 156 } };
  const summary = `Step ${step + 1} of ${last + 1}: ${ev.text}`;
  const edge = (from: string, to: string, kind: "hold" | "wait", k: string) => {
    const a = pos[from];
    const b = pos[to];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / len;
    const uy = (b.y - a.y) / len;
    const off = kind === "hold" ? 6 : -6;
    const x1 = a.x + ux * 30 - uy * off;
    const y1 = a.y + uy * 30 + ux * off;
    const x2 = b.x - ux * 30 - uy * off;
    const y2 = b.y - uy * 30 + ux * off;
    const hot = kind === "wait";
    return (
      <g key={k}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} className={hot ? "fig-accent-line" : "fig-line"} style={{ strokeWidth: 2, strokeDasharray: hot ? "6 4" : undefined }} />
        <polygon points={dgArrow(x1, y1, x2, y2)} className={hot ? "fig-accent" : "fig-fill"} style={hot ? undefined : { fill: "var(--line)" }} />
      </g>
    );
  };
  return (
    <Frame
      title={`Two transfers, locks taken in ${script.label}`}
      summary={summary}
      controls={
        <>
          {keys.map((k) => (
            <button key={k} type="button" className="btn btn-secondary btn-small" aria-pressed={key === k} onClick={() => { setKey(k); setStep(0); }}>
              {DG_SCRIPTS[k].label}
            </button>
          ))}
          <Stepper label="step" value={step + 1} onChange={(v) => setStep(v - 1)} min={1} max={last + 1} />
        </>
      }
    >
      <svg viewBox="0 0 460 230" role="img" aria-label={`Step ${step + 1}: ${cycle ? "deadlock" : "no cycle"}`}>
        {Object.entries(ev.holds).map(([lock, t]) => edge(lock, t, "hold", `h${lock}`))}
        {Object.entries(ev.waits).map(([t, lock]) => edge(t, lock, "wait", `w${t}`))}
        {["T1", "T2"].map((t) => (
          <g key={t}>
            <circle cx={pos[t].x} cy={pos[t].y} r={26} className={cycle ? "fig-accent" : "fig-fill"} style={{ stroke: "var(--line)", opacity: cycle ? 0.6 : 1 }} />
            <text x={pos[t].x} y={pos[t].y + 5} textAnchor="middle" style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600 }}>{t}</text>
          </g>
        ))}
        {["A", "B"].map((l) => (
          <g key={l}>
            <rect x={pos[l].x - 32} y={pos[l].y - 22} width={64} height={44} rx={6} className="fig-fill" style={{ stroke: "var(--line)" }} />
            <text x={pos[l].x} y={pos[l].y + 5} textAnchor="middle" style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600 }}>{`lock ${l}`}</text>
          </g>
        ))}
        <text x={8} y={206} className="fig-small">{"solid: lock held by thread · dashed: thread waits for lock"}</text>
        <text x={8} y={224} style={{ fill: cycle ? "var(--focus)" : "var(--text)", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>
          {cycle ? "cycle: deadlock" : Object.keys(ev.waits).length ? "waiting, but no cycle" : "nobody waiting"}
        </text>
      </svg>
    </Frame>
  );
}

function bbSimulate(make: number, use: number, cap: number, n: number) {
  let buf = 0;
  let made = 0;
  let consumed = 0;
  let pLeft = make;
  let ready = false;
  let using = false;
  let cLeft = 0;
  const rows: { p: string; level: number; c: string }[] = [];
  for (let t = 0; consumed < n && t < 60; t++) {
    if (!using && buf > 0) {
      buf -= 1;
      using = true;
      cLeft = use;
    }
    if (ready && buf < cap) {
      buf += 1;
      made += 1;
      ready = false;
      pLeft = make;
    }
    let p: string;
    if (made === n && !ready) p = "done";
    else if (ready) p = "wait";
    else {
      p = "make";
      pLeft -= 1;
      if (pLeft === 0) ready = true;
    }
    let c: string;
    if (using) {
      c = "use";
      cLeft -= 1;
      if (cLeft === 0) {
        consumed += 1;
        using = false;
      }
    } else c = consumed === n ? "done" : "wait";
    rows.push({ p, level: buf, c });
  }
  return rows;
}

/** A producer and a consumer joined by a bounded buffer: who waits for whom, as the buffer grows. */
function BoundedBuffer(props: Props) {
  const [speed, setSpeed] = useState(props.speed === "slow-producer" ? "slow-producer" : "slow-consumer");
  const [cap, setCap] = useState(clamp(num(props.capacity, 2), 1, 4));
  const make = speed === "slow-consumer" ? 1 : 2;
  const use = speed === "slow-consumer" ? 2 : 1;
  const n = 8;
  const rows = bbSimulate(make, use, cap, n);
  const total = rows.length;
  const pWait = rows.filter((r) => r.p === "wait").length;
  const cWait = rows.filter((r) => r.c === "wait").length;
  const pDone = rows.findIndex((r) => r.p === "done");
  const summary =
    `The producer makes an item every ${plural(make, "time unit")} and the consumer uses one every ${plural(use, "unit")}, through a buffer with room for ${cap}. ` +
    `All ${n} items are used by time ${total}. The producer spends ${plural(pWait, "unit")} waiting for space` +
    (pDone >= 0 ? ` and is finished at time ${pDone}` : "") +
    `; the consumer spends ${plural(cWait, "unit")} waiting for items. ` +
    (speed === "slow-consumer"
      ? "A bigger buffer lets the producer run further ahead and wait less, but the last item is used no sooner: the slower side sets the pace."
      : "The consumer is always waiting for the next item, so the buffer never holds more than one and its size makes no difference.");
  const cell = 19;
  const x0 = 92;
  const color = (s: string) => (s === "make" || s === "use" ? "fig-accent" : s === "wait" ? "fig-ghost" : "");
  return (
    <Frame
      title={`Producer and consumer, buffer of ${cap}`}
      summary={summary}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={speed === "slow-consumer"} onClick={() => setSpeed("slow-consumer")}>
            slow consumer
          </button>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={speed === "slow-producer"} onClick={() => setSpeed("slow-producer")}>
            slow producer
          </button>
          <Stepper label="capacity" value={cap} onChange={setCap} min={1} max={4} />
        </>
      }
    >
      <svg viewBox="0 0 460 210" role="img" aria-label={`Buffer of ${cap}: done at ${total}, producer waits ${pWait}, consumer waits ${cWait}`}>
        <text x={8} y={36} className="fig-small" style={{ fill: "var(--text)" }}>producer</text>
        <text x={8} y={96} className="fig-small" style={{ fill: "var(--text)" }}>in buffer</text>
        <text x={8} y={156} className="fig-small" style={{ fill: "var(--text)" }}>consumer</text>
        {rows.map((r, t) => (
          <g key={t}>
            {r.p !== "done" ? <rect x={x0 + t * cell} y={22} width={cell - 2} height={22} rx={3} className={color(r.p)} style={r.p === "make" ? { opacity: 0.6 } : undefined} /> : null}
            {Array.from({ length: r.level }, (_, k) => (
              <rect key={k} x={x0 + t * cell} y={108 - (k + 1) * 9} width={cell - 2} height={7} rx={2} className="fig-fill" style={{ stroke: "var(--line)" }} />
            ))}
            {r.c !== "done" ? <rect x={x0 + t * cell} y={142} width={cell - 2} height={22} rx={3} className={color(r.c)} style={r.c === "use" ? { opacity: 0.6 } : undefined} /> : null}
          </g>
        ))}
        <line x1={x0} y1={176} x2={x0 + 18 * cell} y2={176} className="fig-line" />
        {[0, 5, 10, 15].map((t) => (
          <text key={t} x={x0 + t * cell} y={190} className="fig-small">{t}</text>
        ))}
        <text x={8} y={206} className="fig-small">{"bright: working · dark: waiting"}</text>
      </svg>
    </Frame>
  );
}

/** Threads that all read a counter at once and increment it, by a compare-and-swap loop or by one fetch-and-add each. */
function CasRetry(props: Props) {
  const [op, setOp] = useState(props.op === "fetch-add" ? "fetch-add" : "cas");
  const [n, setN] = useState(clamp(num(props.threads, 4), 1, 5));
  const names = ["A", "B", "C", "D", "E"].slice(0, n);
  const total = op === "cas" ? (n * (n + 1)) / 2 : n;
  const wasted = total - n;
  const summary =
    n === 1
      ? `One thread ${op === "cas" ? "reads the counter and swaps in one more; with nobody else changing it, its first compare-and-swap succeeds" : "adds 1 with one indivisible fetch-and-add and gets back 0"}. 1 increment takes 1 attempt, none wasted.`
      : op === "cas"
      ? `${plural(n, "thread")} read the counter at the same moment and each tries to swap in one more. In every round only the first compare-and-swap succeeds; the others find the value changed, read again and retry. ` +
        `${n} increments take ${plural(total, "attempt")}, ${wasted} of them wasted, and the last thread needs ${n}: the waste grows with the square of the number of threads.`
      : `Each thread's fetch-and-add is one indivisible step that adds 1 and returns the value it replaced: ${names.map((x, i) => `${x} gets ${i}`).join(", ")}. ` +
        `${n} increments take ${plural(n, "attempt")}, none wasted, however many threads collide.`;
  const x0 = 78;
  const colW = 74;
  return (
    <Frame
      title={op === "cas" ? "Incrementing with a compare-and-swap loop" : "Incrementing with fetch-and-add"}
      summary={summary}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={op === "cas"} onClick={() => setOp("cas")}>
            compare-and-swap loop
          </button>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={op === "fetch-add"} onClick={() => setOp("fetch-add")}>
            fetch-and-add
          </button>
          <Stepper label="threads" value={n} onChange={setN} min={1} max={5} />
        </>
      }
    >
      <svg viewBox="0 0 460 230" role="img" aria-label={`${n} threads, ${op === "cas" ? "compare-and-swap" : "fetch-and-add"}: ${total} attempts`}>
        {(op === "cas" ? Array.from({ length: n }, (_, r) => r) : [0]).map((r) => (
          <text key={r} x={x0 + r * colW + colW / 2 - 3} y={16} textAnchor="middle" className="fig-small">{op === "cas" ? `round ${r + 1}` : "one step"}</text>
        ))}
        {names.map((name, i) => {
          const y = 26 + i * 34;
          return (
            <g key={name}>
              <text x={8} y={y + 18} style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>{`thread ${name}`}</text>
              {op === "cas"
                ? Array.from({ length: i + 1 }, (_, r) => {
                    const ok = r === i;
                    return (
                      <g key={r}>
                        <rect x={x0 + r * colW} y={y} width={colW - 6} height={26} rx={4} className={ok ? "fig-accent" : "fig-ghost"} style={ok ? { opacity: 0.6 } : undefined} />
                        <text x={x0 + r * colW + (colW - 6) / 2} y={y + 17} textAnchor="middle" className="fig-small" style={{ fill: "var(--text)" }}>
                          {`${r}→${r + 1} ${ok ? "ok" : "fail"}`}
                        </text>
                      </g>
                    );
                  })
                : (
                  <g>
                    <rect x={x0} y={y} width={colW + 40} height={26} rx={4} className="fig-accent" style={{ opacity: 0.6 }} />
                    <text x={x0 + (colW + 40) / 2} y={y + 17} textAnchor="middle" className="fig-small" style={{ fill: "var(--text)" }}>{`add 1, got ${i}`}</text>
                  </g>
                )}
            </g>
          );
        })}
        <text x={8} y={222} style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>
          {`${total} attempts for ${n} increments · ${wasted} wasted`}
        </text>
      </svg>
    </Frame>
  );
}

type SbState = { text: string; pc: [number, number]; bufs: [string[], string[]]; mem: { x: number; y: number }; r1: string; r2: string };

const SB_SCRIPTS: Record<string, SbState[]> = {
  plain: [
    { text: "x and y start at 0 in memory, and both store buffers are empty.", pc: [0, 0], bufs: [[], []], mem: { x: 0, y: 0 }, r1: "?", r2: "?" },
    { text: "Core 1 runs x = 1. The store goes into core 1's store buffer, not yet to memory, and the core moves straight on.", pc: [1, 0], bufs: [["x = 1"], []], mem: { x: 0, y: 0 }, r1: "?", r2: "?" },
    { text: "Core 2 runs y = 1, into its own store buffer.", pc: [1, 1], bufs: [["x = 1"], ["y = 1"]], mem: { x: 0, y: 0 }, r1: "?", r2: "?" },
    { text: "Core 1 runs r1 = y. Its own buffer holds no y, so it reads memory, which still says 0: r1 = 0.", pc: [2, 1], bufs: [["x = 1"], ["y = 1"]], mem: { x: 0, y: 0 }, r1: "0", r2: "?" },
    { text: "Core 2 runs r2 = x. Its buffer holds no x, so it reads memory: r2 = 0.", pc: [2, 2], bufs: [["x = 1"], ["y = 1"]], mem: { x: 0, y: 0 }, r1: "0", r2: "0" },
    { text: "The buffers drain and memory ends with x = 1 and y = 1. Yet both cores read 0, which no interleaving of the two programs allows: each load overtook its own core's earlier store.", pc: [2, 2], bufs: [[], []], mem: { x: 1, y: 1 }, r1: "0", r2: "0" },
  ],
  fence: [
    { text: "x and y start at 0 in memory, and both store buffers are empty. Each program now has a fence between its store and its load.", pc: [0, 0], bufs: [[], []], mem: { x: 0, y: 0 }, r1: "?", r2: "?" },
    { text: "Core 1 runs x = 1, into its store buffer.", pc: [1, 0], bufs: [["x = 1"], []], mem: { x: 0, y: 0 }, r1: "?", r2: "?" },
    { text: "Core 2 runs y = 1, into its store buffer.", pc: [1, 1], bufs: [["x = 1"], ["y = 1"]], mem: { x: 0, y: 0 }, r1: "?", r2: "?" },
    { text: "Core 1 reaches its fence, which waits until core 1's buffer has drained: x = 1 is now in memory.", pc: [2, 1], bufs: [[], ["y = 1"]], mem: { x: 1, y: 0 }, r1: "?", r2: "?" },
    { text: "Core 2's fence drains its buffer: y = 1 is now in memory.", pc: [2, 2], bufs: [[], []], mem: { x: 1, y: 1 }, r1: "?", r2: "?" },
    { text: "Core 1 runs r1 = y and reads 1 from memory.", pc: [3, 2], bufs: [[], []], mem: { x: 1, y: 1 }, r1: "1", r2: "?" },
    { text: "Core 2 runs r2 = x and reads 1. With fences, each core's store reaches memory before its own load runs, so r1 and r2 can never both be 0.", pc: [3, 3], bufs: [[], []], mem: { x: 1, y: 1 }, r1: "1", r2: "1" },
  ],
};

/** The store-buffering litmus test on two cores with store buffers, with and without fences. */
function StoreBuffer(props: Props) {
  const [fence, setFence] = useState(props.fence === true);
  const script = SB_SCRIPTS[fence ? "fence" : "plain"];
  const last = script.length - 1;
  const [raw, setStep] = useState(clamp(num(props.step, 0), 0, 6));
  const step = Math.min(raw, last);
  const s = script[step];
  const programs = fence ? [["x = 1", "fence", "r1 = y"], ["y = 1", "fence", "r2 = x"]] : [["x = 1", "r1 = y"], ["y = 1", "r2 = x"]];
  const summary = `Step ${step + 1} of ${last + 1}: ${s.text}`;
  const mono = { fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 12 };
  return (
    <Frame
      title={fence ? "Store buffering, with fences" : "Store buffering, no fences"}
      summary={summary}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={!fence} onClick={() => { setFence(false); setStep(0); }}>
            no fence
          </button>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={fence} onClick={() => { setFence(true); setStep(0); }}>
            with fences
          </button>
          <Stepper label="step" value={step + 1} onChange={(v) => setStep(v - 1)} min={1} max={last + 1} />
        </>
      }
    >
      <svg viewBox="0 0 460 236" role="img" aria-label={`Step ${step + 1}: r1 = ${s.r1}, r2 = ${s.r2}`}>
        {[0, 1].map((c) => {
          const y = 12 + c * 112;
          return (
            <g key={c}>
              <rect x={8} y={y} width={136} height={96} rx={8} className="fig-fill" style={{ stroke: "var(--line)" }} />
              <text x={18} y={y + 18} style={{ ...mono, fontWeight: 600 }}>{`core ${c + 1}`}</text>
              {programs[c].map((line, k) => (
                <g key={k}>
                  {s.pc[c] === k + 1 ? <rect x={14} y={y + 26 + k * 18} width={124} height={17} rx={3} className="fig-accent" style={{ opacity: 0.45 }} /> : null}
                  <text x={20} y={y + 39 + k * 18} style={mono}>{line}</text>
                </g>
              ))}
              <text x={18} y={y + 88} className="fig-small" style={{ fill: "var(--text)" }}>{`r${c + 1} = ${c === 0 ? s.r1 : s.r2}`}</text>
              <rect x={160} y={y + 24} width={130} height={48} rx={6} className="fig-ghost" />
              <text x={166} y={y + 18} className="fig-small">store buffer</text>
              {s.bufs[c].map((entry, k) => (
                <g key={k}>
                  <rect x={168} y={y + 34 + k * 22} width={114} height={26} rx={4} className="fig-accent" style={{ opacity: 0.6 }} />
                  <text x={225} y={y + 52 + k * 22} textAnchor="middle" style={mono}>{entry}</text>
                </g>
              ))}
              <line x1={290} y1={y + 48} x2={318} y2={118} className="fig-line" />
            </g>
          );
        })}
        <rect x={318} y={70} width={134} height={96} rx={8} className="fig-fill" style={{ stroke: "var(--line)" }} />
        <text x={328} y={90} style={{ ...mono, fontWeight: 600 }}>memory</text>
        <text x={328} y={120} style={mono}>{`x = ${s.mem.x}`}</text>
        <text x={328} y={144} style={mono}>{`y = ${s.mem.y}`}</text>
        <text x={318} y={196} style={{ fill: s.r1 === "0" && s.r2 === "0" ? "var(--focus)" : "var(--text)", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>
          {`r1 = ${s.r1}, r2 = ${s.r2}`}
        </text>
      </svg>
    </Frame>
  );
}

const WQ_TASKS = [6, 1, 1, 1, 5, 1, 1, 2];

function wqPlan(workers: number, shared: boolean) {
  const free = Array.from({ length: workers }, () => 0);
  const bars: { w: number; task: number; start: number; len: number }[] = [];
  WQ_TASKS.forEach((len, task) => {
    let w = task % workers;
    if (shared) {
      w = 0;
      for (let k = 1; k < workers; k++) if (free[k] < free[w]) w = k;
    }
    bars.push({ w, task, start: free[w], len });
    free[w] += len;
  });
  return { bars, end: Math.max(...free), free };
}

/** Eight tasks of uneven length run by a pool of workers, taking from one shared queue or split among them in advance. */
function WorkQueue(props: Props) {
  const [mode, setMode] = useState(props.mode === "fixed" ? "fixed" : "shared");
  const [n, setN] = useState(clamp(num(props.workers, 2), 1, 4));
  const { bars, end, free } = wqPlan(n, mode === "shared");
  const total = WQ_TASKS.reduce((a, b) => a + b, 0);
  const idle = n * end - total;
  const busiest = free.indexOf(end);
  const summary =
    (mode === "shared"
      ? `With one shared queue, ${plural(n, "worker")} finish all ${WQ_TASKS.length} tasks at ${end} ms. Whenever a worker is free it takes the next task, so the short tasks flow around the long ones. `
      : `Handing task i to worker i mod ${n} in advance finishes at ${end} ms: worker ${busiest} was given ${end} ms of work while the others ran out early. `) +
    `The tasks need ${total} ms of work in all, and the workers spend ${idle} ms idle before the last one finishes.`;
  const unit = 20;
  const x0 = 76;
  return (
    <Frame
      title={mode === "shared" ? `A pool of ${n} taking from one queue` : `${WQ_TASKS.length} tasks split among ${n} in advance`}
      summary={summary}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={mode === "shared"} onClick={() => setMode("shared")}>
            shared queue
          </button>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={mode === "fixed"} onClick={() => setMode("fixed")}>
            fixed split
          </button>
          <Stepper label="workers" value={n} onChange={setN} min={1} max={4} />
        </>
      }
    >
      <svg viewBox={`0 0 460 ${28 + n * 32 + 52}`} role="img" aria-label={`${n} workers, ${mode === "shared" ? "shared queue" : "fixed split"}: done at ${end} ms`}>
        <text x={8} y={16} className="fig-small">{`queue, in order: t0 to t7, lasting ${WQ_TASKS.join(", ")} ms`}</text>
        {Array.from({ length: n }, (_, w) => (
          <text key={w} x={8} y={46 + w * 32} style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>{`worker ${w}`}</text>
        ))}
        {bars.map((b) => (
          <g key={b.task}>
            <rect x={x0 + b.start * unit} y={28 + b.w * 32} width={b.len * unit - 2} height={26} rx={4} className={b.len >= 5 ? "fig-accent" : "fig-fill"} style={b.len >= 5 ? { opacity: 0.6 } : { stroke: "var(--line)" }} />
            <text x={x0 + (b.start + b.len / 2) * unit - 1} y={45 + b.w * 32} textAnchor="middle" className="fig-small" style={{ fill: "var(--text)" }}>{`t${b.task}`}</text>
          </g>
        ))}
        <line x1={x0 + end * unit - 1} y1={24} x2={x0 + end * unit - 1} y2={28 + n * 32} className="fig-accent-line" style={{ strokeWidth: 2 }} />
        <line x1={x0} y1={28 + n * 32 + 6} x2={x0 + 18 * unit} y2={28 + n * 32 + 6} className="fig-line" />
        {[0, 3, 6, 9, 12, 15, 18].map((t) => (
          <text key={t} x={x0 + t * unit} y={28 + n * 32 + 20} textAnchor="middle" className="fig-small">{t}</text>
        ))}
        <text x={8} y={28 + n * 32 + 42} className="fig-small">{`ms · done at ${end} · ${idle} ms idle`}</text>
      </svg>
    </Frame>
  );
}

const EL_WAIT = 100;
const EL_CPU = 20;

/** Requests that each wait for a database and then compute, served by one thread with blocking calls or by an event loop. */
function EventLoop(props: Props) {
  const [mode, setMode] = useState(props.mode === "blocking" ? "blocking" : "async");
  const [n, setN] = useState(clamp(num(props.requests, 3), 1, 6));
  const blocking = mode === "blocking";
  const bars = Array.from({ length: n }, (_, i) =>
    blocking
      ? { wait: i * (EL_WAIT + EL_CPU), cpu: i * (EL_WAIT + EL_CPU) + EL_WAIT }
      : { wait: 0, cpu: EL_WAIT + i * EL_CPU },
  );
  const end = blocking ? n * (EL_WAIT + EL_CPU) : EL_WAIT + n * EL_CPU;
  const summary = blocking
    ? `With blocking calls, the one thread waits out each database call before it can start the next request, so ${plural(n, "request")} take ${n} × ${EL_WAIT + EL_CPU} = ${end} ms, and the thread spends ${n * EL_WAIT} ms of that doing nothing.`
    : n === 1
      ? `With an event loop, the one thread sends the query, is free while it waits, and computes the reply when it arrives, ready at ${EL_WAIT} + ${EL_CPU} = ${end} ms. With one request there is nothing to overlap; add requests to see the waits overlap.`
      : `With an event loop, the one thread sends all ${n} queries at once and computes each reply as it arrives, so the waits overlap and the last reply is ready at ${EL_WAIT} + ${n} × ${EL_CPU} = ${end} ms. Only the computing is still one at a time.`;
  const x0 = 60;
  const span = n * (EL_WAIT + EL_CPU);
  const scale = 390 / span;
  const axisY = 54 + n * 24 + 10;
  const height = axisY + 40;
  const x = (t: number) => x0 + t * scale;
  const row = (i: number) => 54 + i * 24;
  return (
    <Frame
      title={blocking ? `${plural(n, "request")}, one thread, blocking calls` : `${plural(n, "request")} on an event loop`}
      summary={summary}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={blocking} onClick={() => setMode("blocking")}>
            blocking
          </button>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={!blocking} onClick={() => setMode("async")}>
            event loop
          </button>
          <Stepper label="requests" value={n} onChange={setN} min={1} max={6} />
        </>
      }
    >
      <svg viewBox={`0 0 460 ${height}`} role="img" aria-label={`${plural(n, "request")}, ${blocking ? "blocking" : "event loop"}: last reply at ${end} ms`}>
        <text x={8} y={16} className="fig-small">{`each request waits ${EL_WAIT} ms for the database, then computes ${EL_CPU} ms`}</text>
        <text x={8} y={39} style={{ fill: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>thread</text>
        {bars.map((b, i) => (
          <rect key={`t${i}`} x={x(b.cpu)} y={26} width={EL_CPU * scale - 1} height={18} rx={3} className="fig-accent" />
        ))}
        {blocking &&
          bars.map((b, i) => (
            <rect key={`tb${i}`} x={x(b.wait)} y={26} width={EL_WAIT * scale - 1} height={18} rx={3} className="fig-ghost" style={{ stroke: "var(--text-secondary)", strokeDasharray: "4 3" }} />
          ))}
        {Array.from({ length: n }, (_, i) => (
          <text key={`l${i}`} x={8} y={row(i) + 13} className="fig-small" style={{ fill: "var(--text)" }}>{`r${i + 1}`}</text>
        ))}
        {bars.map((b, i) => (
          <g key={`r${i}`}>
            <rect x={x(b.wait)} y={row(i)} width={EL_WAIT * scale - 1} height={18} rx={3} className="fig-ghost" style={{ stroke: "var(--text-secondary)" }} />
            <rect x={x(b.cpu)} y={row(i)} width={EL_CPU * scale - 1} height={18} rx={3} className="fig-accent" style={{ opacity: 0.6 }} />
          </g>
        ))}
        <line x1={x(end)} y1={22} x2={x(end)} y2={row(n - 1) + 22} className="fig-accent-line" style={{ strokeWidth: 2 }} />
        <line x1={x0} y1={axisY} x2={x(span)} y2={axisY} className="fig-line" />
        {[0, 1, 2, 3, 4, 5, 6].map((j) => (
          <text key={j} x={x((j * span) / 6)} y={axisY + 14} textAnchor="middle" className="fig-small">{(j * span) / 6}</text>
        ))}
        <text x={8} y={axisY + 34} className="fig-small">{`ms · outline: waiting · solid: computing · last reply at ${end}`}</text>
      </svg>
    </Frame>
  );
}

const AM_SERVICE = 200;
const AM_CAP = 1000;

/** Senders filling an actor's mailbox faster or slower than it can handle messages, with an unbounded or a bounded mailbox. */
function ActorMailbox(props: Props) {
  const [n, setN] = useState(clamp(num(props.senders, 3), 1, 4));
  const [kind, setKind] = useState(props.mailbox === "bounded" ? "bounded" : "unbounded");
  const bounded = kind === "bounded";
  const rate = n * 100;
  const growth = Math.max(0, rate - AM_SERVICE);
  const at = (t: number) => (bounded ? Math.min(growth * t, AM_CAP) : growth * t);
  const final = at(60);
  const rejected = growth * 60 - final;
  const wait = final / AM_SERVICE;
  const full = growth > 0 ? AM_CAP / growth : 0;
  const head =
    n === 1
      ? `One sender sends 100 messages a second to an actor that handles ${AM_SERVICE}. `
      : `${n} senders sending 100 messages a second each add up to ${group(rate)} a second, to an actor that handles ${AM_SERVICE}. `;
  const summary =
    growth === 0
      ? head +
        (rate === AM_SERVICE
          ? "Messages arrive exactly as fast as they are handled, so the mailbox stays empty only while they arrive perfectly evenly; any burst would never drain."
          : "The actor keeps up, so its mailbox stays empty and each message is handled as it arrives.")
      : bounded
        ? head + `The mailbox fills to ${group(AM_CAP)} after ${full} s; from then on the actor turns away ${growth} messages a second, ${group(rejected)} in the minute, and no message waits more than ${AM_CAP / AM_SERVICE} s.`
        : head + `The mailbox grows by ${growth} a second, to ${group(final)} after a minute, and a message arriving then waits ${wait} s before the actor reaches it.`;
  const x0 = 64;
  const w = 380;
  const y0 = 176;
  const h = 150;
  const ymax = 12000;
  const px = (t: number) => x0 + (t / 60) * w;
  const py = (v: number) => y0 - (v / ymax) * h;
  const pts = bounded && growth > 0 ? [0, full, 60] : [0, 60];
  return (
    <Frame
      title={`Mailbox of an actor fed by ${plural(n, "sender")}`}
      summary={summary}
      controls={
        <>
          <Stepper label="senders" value={n} onChange={setN} min={1} max={4} />
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={!bounded} onClick={() => setKind("unbounded")}>
            unbounded
          </button>
          <button type="button" className="btn btn-secondary btn-small" aria-pressed={bounded} onClick={() => setKind("bounded")}>
            bounded at {group(AM_CAP)}
          </button>
        </>
      }
    >
      <svg viewBox="0 0 460 226" role="img" aria-label={`${plural(n, "sender")}, ${kind} mailbox: ${group(final)} waiting after 60 s`}>
        <text x={8} y={16} className="fig-small">{`messages waiting · arriving ${group(rate)}/s · handled ${AM_SERVICE}/s`}</text>
        {[0, 4000, 8000, 12000].map((v) => (
          <g key={v}>
            <line x1={x0} y1={py(v)} x2={x0 + w} y2={py(v)} className="fig-line" style={{ opacity: v === 0 ? 1 : 0.35 }} />
            <text x={x0 - 6} y={py(v) + 4} textAnchor="end" className="fig-small">{group(v)}</text>
          </g>
        ))}
        {bounded && (
          <>
            <line x1={x0} y1={py(AM_CAP)} x2={x0 + w} y2={py(AM_CAP)} className="fig-line" style={{ strokeDasharray: "4 3" }} />
            <text x={x0 + w} y={py(AM_CAP) - 5} textAnchor="end" className="fig-small">{`capacity ${group(AM_CAP)}`}</text>
          </>
        )}
        <polyline points={pts.map((t) => `${px(t)},${py(at(t))}`).join(" ")} className="fig-accent-line" style={{ fill: "none", strokeWidth: 2 }} />
        <circle cx={px(60)} cy={py(final)} r={4} className="fig-accent" />
        {[0, 10, 20, 30, 40, 50, 60].map((t) => (
          <text key={t} x={px(t)} y={y0 + 16} textAnchor="middle" className="fig-small">{t}</text>
        ))}
        <text x={8} y={220} className="fig-small">{`s · after a minute: ${group(final)} waiting${bounded ? `, ${group(rejected)} turned away` : `, newest waits ${wait} s`}`}</text>
      </svg>
    </Frame>
  );
}

function seSchedules(k: number) {
  const out: string[] = [];
  const walk = (s: string, a: number, b: number) => {
    if (a === k && b === k) {
      out.push(s);
      return;
    }
    if (a < k) walk(s + "A", a + 1, b);
    if (b < k) walk(s + "B", a, b + 1);
  };
  walk("", 0, 0);
  return out;
}

function sePreemptions(s: string, k: number) {
  let p = 0;
  let a = 0;
  let b = 0;
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && s[i] !== s[i - 1]) {
      const left = s[i - 1] === "A" ? k - a : k - b;
      if (left > 0) p++;
    }
    if (s[i] === "A") a++;
    else b++;
  }
  return p;
}

/** Every interleaving of two threads as a path through a grid, with how often each schedule preempts a thread. */
function ScheduleExplorer(props: Props) {
  const [k, setK] = useState(clamp(num(props.steps, 3), 1, 6));
  const all = seSchedules(k);
  const [pick, setPick] = useState(clamp(num(props.schedule, 1), 1, all.length));
  const i = clamp(pick, 1, all.length);
  const s = all[i - 1];
  const pre = sePreemptions(s, k);
  const few = all.filter((x) => sePreemptions(x, k) <= 2).length;
  const summary =
    `Two threads of ${plural(k, "step")} each can interleave in C(${2 * k}, ${k}) = ${group(all.length)} ways, one for each path through the grid. ` +
    `Schedule ${i} runs ${s.split("").join(" ")} and preempts a thread ${plural(pre, "time")}. ` +
    `${group(few)} of the ${group(all.length)} schedules preempt at most twice.`;
  const cell = Math.min(45, Math.floor(180 / k));
  const gx = 40;
  const gy = 200;
  const pts: string[] = [`${gx},${gy}`];
  let a = 0;
  let b = 0;
  for (const c of s) {
    if (c === "A") a++;
    else b++;
    pts.push(`${gx + a * cell},${gy - b * cell}`);
  }
  return (
    <Frame
      title={`Schedule ${i} of ${group(all.length)}`}
      summary={summary}
      controls={
        <>
          <Stepper label="steps each" value={k} onChange={(v) => { setK(v); setPick(1); }} min={1} max={6} />
          <Stepper label="schedule" value={i} onChange={setPick} min={1} max={all.length} />
        </>
      }
    >
      <svg viewBox="0 0 460 236" role="img" aria-label={`Schedule ${i} of ${all.length}: ${s}, ${pre} preemptions`}>
        {Array.from({ length: k + 1 }, (_, j) => (
          <g key={j}>
            <line x1={gx} y1={gy - j * cell} x2={gx + k * cell} y2={gy - j * cell} className="fig-line" style={{ opacity: 0.4 }} />
            <line x1={gx + j * cell} y1={gy} x2={gx + j * cell} y2={gy - k * cell} className="fig-line" style={{ opacity: 0.4 }} />
          </g>
        ))}
        <polyline points={pts.join(" ")} className="fig-accent-line" style={{ fill: "none", strokeWidth: 3 }} />
        <circle cx={gx} cy={gy} r={4} className="fig-accent" />
        <circle cx={gx + k * cell} cy={gy - k * cell} r={4} className="fig-accent" />
        <text x={gx} y={gy + 18} className="fig-small">thread A steps, rightwards</text>
        <text x={gx - 8} y={gy - k * cell - 8} className="fig-small">thread B steps, upwards</text>
        <text x={260} y={40} className="fig-small">schedule</text>
        {s.split("").map((c, j) => (
          <g key={j}>
            <rect x={260 + (j % 6) * 30} y={48 + Math.floor(j / 6) * 30} width={26} height={24} rx={4} className={c === "A" ? "fig-accent" : "fig-fill"} style={c === "A" ? { opacity: 0.6 } : undefined} />
            <text x={273 + (j % 6) * 30} y={64 + Math.floor(j / 6) * 30} textAnchor="middle" className="fig-small" style={{ fill: "var(--text)" }}>{c}</text>
          </g>
        ))}
        <text x={260} y={130} className="fig-small">{`preemptions: ${pre}`}</text>
        <text x={260} y={148} className="fig-small">{`schedules in all: ${group(all.length)}`}</text>
        <text x={260} y={166} className="fig-small">{`at most 2 preemptions: ${group(few)}`}</text>
      </svg>
    </Frame>
  );
}

const WALK_NODES: Record<string, Spot> = { A: [60, 130], B: [160, 56], C: [160, 204], D: [270, 30], E: [270, 112], F: [290, 204], G: [394, 204] };
const WALK_EDGES = ["AB", "AC", "BD", "BE", "CF", "EF", "FG"];
const nextTo = (node: string) =>
  WALK_EDGES.filter((edge) => edge.includes(node))
    .map((edge) => edge.replace(node, ""))
    .sort();

type WalkStep = { order: string[]; waiting: string[] };
function walkSteps(depth: boolean): WalkStep[] {
  const steps: WalkStep[] = [{ order: [], waiting: depth ? [] : ["A"] }];
  const order: string[] = [];
  if (depth) {
    const visit = (node: string, path: string[]) => {
      order.push(node);
      steps.push({ order: [...order], waiting: [...path, node] });
      for (const other of nextTo(node)) if (!order.includes(other)) visit(other, [...path, node]);
    };
    visit("A", []);
  } else {
    const queue = ["A"];
    const seen = new Set(["A"]);
    while (queue.length > 0) {
      const node = queue.shift()!;
      order.push(node);
      for (const other of nextTo(node)) {
        if (!seen.has(other)) {
          seen.add(other);
          queue.push(other);
        }
      }
      steps.push({ order: [...order], waiting: [...queue] });
    }
  }
  return steps;
}

/** One small graph explored two ways: nearest first with a queue, or as deep as possible with a stack. */
function GraphWalk(props: Props) {
  const [depth, setDepth] = useState(props.mode === "depth");
  const steps = walkSteps(depth);
  const [step, setStep] = useState(clamp(Math.round(num(props.step, 0)), 0, steps.length - 1));
  const { order, waiting } = steps[step];
  const current = order[order.length - 1];
  const all = step === steps.length - 1;
  return (
    <Frame
      title="Two ways to explore a graph"
      summary={
        depth
          ? `Depth-first search from A, after ${plural(step, "step")}. Visited in order: ${order.join(", ") || "nothing yet"}. ${
              step === 0 ? "The stack is empty." : `The path back to the start, held on the stack: ${waiting.join(", ")}.`
            }${all ? " Every node has been visited, going as deep as possible before turning back." : ""}`
          : `Breadth-first search from A, after ${plural(step, "step")}. Visited in order: ${order.join(", ") || "nothing yet"}. Waiting in the queue: ${waiting.join(", ") || "nothing"}.${
              all ? " Every node has been visited, nearest first." : ""
            }`
      }
      controls={
        <>
          <Stepper label="step" value={step} onChange={setStep} min={0} max={steps.length - 1} />
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={() => {
              setDepth(!depth);
              setStep(0);
            }}
          >
            {depth ? "Switch to breadth-first" : "Switch to depth-first"}
          </button>
        </>
      }
    >
      <svg viewBox="0 0 440 240" role="img" aria-label={`A graph of seven nodes with ${order.length} visited`}>
        {WALK_EDGES.map((edge) => (
          <Link key={edge} from={WALK_NODES[edge[0]]} to={WALK_NODES[edge[1]]} />
        ))}
        {Object.entries(WALK_NODES).map(([name, at]) => (
          <Dot key={name} at={at} name={name} mark={name === current ? "now" : order.includes(name) ? "done" : "wait"} note={order.includes(name) ? String(order.indexOf(name) + 1) : undefined} />
        ))}
      </svg>
    </Frame>
  );
}

const UNSORTED = [5, 2, 8, 1, 9, 3, 7, 4];
type SortStep = { items: number[]; comparisons: number };
function insertionSteps(): SortStep[] {
  const items = [...UNSORTED];
  let comparisons = 0;
  const steps: SortStep[] = [{ items: [...items], comparisons }];
  for (let pass = 1; pass < items.length; pass++) {
    const key = items[pass];
    let j = pass;
    while (j > 0) {
      comparisons += 1;
      if (items[j - 1] <= key) break;
      items[j] = items[j - 1];
      j -= 1;
    }
    items[j] = key;
    steps.push({ items: [...items], comparisons });
  }
  return steps;
}
function mergeSteps(): SortStep[] {
  let items = [...UNSORTED];
  let comparisons = 0;
  const steps: SortStep[] = [{ items: [...items], comparisons }];
  for (let width = 1; width < items.length; width *= 2) {
    const merged: number[] = [];
    for (let start = 0; start < items.length; start += 2 * width) {
      const left = items.slice(start, start + width);
      const right = items.slice(start + width, start + 2 * width);
      while (left.length > 0 && right.length > 0) {
        comparisons += 1;
        merged.push(left[0] <= right[0] ? left.shift()! : right.shift()!);
      }
      merged.push(...left, ...right);
    }
    items = merged;
    steps.push({ items: [...items], comparisons });
  }
  return steps;
}

/** The same eight numbers sorted by insertion, one item at a time, and by merging, one doubling at a time. */
function SortSteps(props: Props) {
  const [merge, setMerge] = useState(props.method === "merge");
  const steps = merge ? mergeSteps() : insertionSteps();
  const [step, setStep] = useState(clamp(Math.round(num(props.step, 0)), 0, steps.length - 1));
  const { items, comparisons } = steps[step];
  const last = step === steps.length - 1;
  const run = 2 ** step;
  const runs = Array.from({ length: Math.ceil(items.length / run) }, (_, i) => items.slice(i * run, (i + 1) * run));
  const w = 52;
  return (
    <Frame
      title="Sorting step by step"
      summary={
        merge
          ? `Merge sort, after ${plural(step, "round")} of merging. The list is made of sorted runs of length ${run}: ${runs.map((part) => `[${part.join(", ")}]`).join(" ")}. ${
              last ? "The list is sorted." : "Next, neighbouring runs are merged in pairs."
            } Comparisons so far: ${comparisons}.`
          : `Insertion sort, after ${plural(step, "pass", "passes")}. The first ${plural(step + 1, "item is", "items are")} in order: ${items.slice(0, step + 1).join(", ")}. ${
              last ? "The list is sorted." : `Next, ${items[step + 1]} is moved left past every larger item.`
            } Comparisons so far: ${comparisons}.`
      }
      controls={
        <>
          <Stepper label="step" value={step} onChange={setStep} min={0} max={steps.length - 1} />
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={() => {
              setMerge(!merge);
              setStep(0);
            }}
          >
            {merge ? "Switch to insertion sort" : "Switch to merge sort"}
          </button>
        </>
      }
    >
      <svg viewBox="0 0 440 150" role="img" aria-label={`${merge ? "Merge" : "Insertion"} sort of eight numbers at step ${step}: ${items.join(", ")}`}>
        <Cells
          values={items}
          y={40}
          w={w}
          h={44}
          hot={merge || last ? [] : [step + 1]}
          faint={merge ? [] : items.map((_, i) => i).filter((i) => i > step + 1)}
        />
        {(merge ? runs : [items.slice(0, step + 1)]).map((part, i) => (
          <line key={i} x1={12 + i * run * w} x2={12 + (i * run + part.length) * w - 4} y1={98} y2={98} className="fig-accent-line" />
        ))}
        <text x="12" y="124" className="fig-small">
          the marked stretches are already in order
        </text>
      </svg>
    </Frame>
  );
}

const SORTED = [2, 5, 8, 12, 16, 23, 38, 42, 56, 61, 72, 80, 91, 95, 99];
type Halving = { low: number; high: number; middle: number; left: number };
function halvings(target: number): Halving[] {
  const steps: Halving[] = [];
  let [low, high] = [0, SORTED.length - 1];
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const step = { low, high, middle, left: 0 };
    if (SORTED[middle] === target) {
      steps.push(step);
      break;
    }
    if (target < SORTED[middle]) high = middle - 1;
    else low = middle + 1;
    step.left = high - low + 1;
    steps.push(step);
  }
  return steps;
}

/** Binary search on fifteen sorted numbers: each comparison with the middle rules out half of what remains. */
function BinarySearch(props: Props) {
  const [pick, setPick] = useState(clamp(Math.round(num(props.target, 5)), 0, SORTED.length - 1));
  const [missing, setMissing] = useState(props.missing === true);
  const target = missing ? 50 : SORTED[pick];
  const steps = halvings(target);
  const [at, setAt] = useState(0);
  const step = Math.min(at, steps.length);
  const now = step === 0 ? null : steps[step - 1];
  const value = now ? SORTED[now.middle] : 0;
  const [low, high] = !now ? [0, SORTED.length - 1] : value === target ? [now.middle, now.middle] : target < value ? [now.low, now.middle - 1] : [now.middle + 1, now.high];
  let summary = `Looking for ${target} among ${SORTED.length} sorted items. `;
  if (!now) summary += `Nothing has been compared yet, and all ${SORTED.length} positions are possible.`;
  else if (value === target) summary += `Step ${step}: the middle of positions ${now.low} to ${now.high} is position ${now.middle}, holding ${value}. That is the target, found after ${plural(step, "comparison")}.`;
  else {
    summary += `Step ${step}: the middle of positions ${now.low} to ${now.high} is position ${now.middle}, holding ${value}. ${target} is ${target < value ? "smaller" : "larger"}, so positions ${
      target < value ? `${now.middle} to ${now.high}` : `${now.low} to ${now.middle}`
    } are ruled out. ${now.left === 0 ? `No positions remain, so ${target} is not in the list.` : `${plural(now.left, "position remains", "positions remain")}.`}`;
  }
  return (
    <Frame
      title="Halving the search"
      summary={summary}
      controls={
        <>
          <Stepper label="step" value={step} onChange={setAt} min={0} max={steps.length} />
          <Slider
            label="position of the target"
            value={pick}
            onChange={(v) => {
              setPick(v);
              setMissing(false);
              setAt(0);
            }}
            min={0}
            max={SORTED.length - 1}
          />
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={() => {
              setMissing(!missing);
              setAt(0);
            }}
          >
            {missing ? "Look for an item in the list" : "Look for 50, which is missing"}
          </button>
        </>
      }
    >
      <svg viewBox="0 0 440 130" role="img" aria-label={`Fifteen sorted numbers with positions ${low} to ${high} still possible for ${target}`}>
        <Cells
          values={SORTED}
          x={10}
          y={36}
          w={28}
          h={36}
          hot={now ? [now.middle] : []}
          faint={SORTED.map((_, i) => i).filter((i) => (i < low || i > high) && i !== now?.middle)}
          under={(i) => String(i)}
        />
        <text x="10" y="112" className="fig-small">
          outlined cells are ruled out
        </text>
      </svg>
    </Frame>
  );
}

/** A table filled cell by cell, each cell from the two already known beside it: the number of routes across a grid. */
function DpGrid(props: Props) {
  const rows = clamp(Math.round(num(props.rows, 4)), 2, 4);
  const cols = clamp(Math.round(num(props.cols, 5)), 2, 6);
  const total = rows * cols;
  const [filled, setFilled] = useState(clamp(Math.round(num(props.filled, 0)), 0, total));
  const routes: number[][] = [];
  for (let r = 0; r < rows; r++) {
    routes.push([]);
    for (let c = 0; c < cols; c++) routes[r].push(r === 0 || c === 0 ? 1 : routes[r - 1][c] + routes[r][c - 1]);
  }
  const [r, c] = [Math.floor((filled - 1) / cols), (filled - 1) % cols];
  let summary = `A grid of ${rows} rows and ${cols} columns. Each cell holds the number of routes to it from the top-left corner, moving only right or down. `;
  if (filled === 0) summary += "Nothing is filled in yet.";
  else {
    summary += `Filled ${filled} of ${total} cells. The cell in row ${r + 1}, column ${c + 1} `;
    if (r === 0 && c === 0) summary += "is the starting corner, with 1 route, which is to stay put.";
    else if (r === 0 || c === 0) summary += `is on the ${r === 0 ? "top" : "left"} edge, so there is only 1 route to it.`;
    else summary += `can be entered from above, ${plural(routes[r - 1][c], "route")}, or from the left, ${plural(routes[r][c - 1], "route")}, so it has ${routes[r - 1][c]} + ${routes[r][c - 1]} = ${routes[r][c]}.`;
    if (filled === total) summary += ` The far corner has ${routes[rows - 1][cols - 1]} routes.`;
  }
  const [w, h] = [64, 52];
  return (
    <Frame title="Filling a table of routes" summary={summary} controls={<Stepper label="cells filled" value={filled} onChange={setFilled} min={0} max={total} />}>
      <svg viewBox={`0 0 440 ${rows * h + 30}`} role="img" aria-label={`A ${rows} by ${cols} table of route counts with ${filled} cells filled`}>
        {routes.map((line, i) =>
          line.map((value, j) => {
            const index = i * cols + j;
            const on = index === filled - 1;
            const from = filled > 0 && r > 0 && c > 0 && ((i === r - 1 && j === c) || (i === r && j === c - 1));
            return (
              <g key={index}>
                <rect x={24 + j * w} y={14 + i * h} width={w - 4} height={h - 4} className={on ? "fig-accent" : index < filled ? (from ? "fig-fill" : "fig-cell") : "fig-ghost"} />
                {index < filled ? (
                  <text x={24 + j * w + (w - 4) / 2} y={14 + i * h + h / 2 + 4} textAnchor="middle" className="fig-mono" style={on ? { fill: "var(--bg)" } : undefined}>
                    {value}
                  </text>
                ) : null}
              </g>
            );
          }),
        )}
      </svg>
    </Frame>
  );
}

/** Appending to a list that doubles its room when full: most appends cost one write, a few cost a whole copy. */
function DoublingArray(props: Props) {
  const most = 17;
  const [n, setN] = useState(clamp(Math.round(num(props.appends, 9)), 1, most));
  const grew = (i: number) => i > 1 && Number.isInteger(Math.log2(i - 1)); // the i-th append finds the block full
  const resizes = Array.from({ length: n }, (_, i) => i + 1)
    .filter(grew)
    .map((i) => i - 1);
  const copies = resizes.reduce((sum, size) => sum + size, 0);
  const room = 2 ** Math.ceil(Math.log2(n));
  return (
    <Frame
      title="The cost of each append"
      summary={`After ${plural(n, "append")} the list has room for ${room}. ${
        resizes.length === 0
          ? "It has not needed to grow yet."
          : `It ran out of room ${plural(resizes.length, "time")}, and copied ${resizes.length > 1 ? `${resizes.join(" + ")} = ` : ""}${plural(copies, "item")} in all while moving to blocks twice the size.`
      } Total work: ${plural(n, "write")} + ${plural(copies, "copy", "copies")} = ${n + copies}, which is ${dp((n + copies) / n, 2)} per append.`}
      controls={<Stepper label="appends" value={n} onChange={setN} min={1} max={most} />}
    >
      <svg viewBox="0 0 440 260" role="img" aria-label={`The cost of each of ${n} appends to a list that doubles when full`}>
        <line x1="20" x2="430" y1="232" y2="232" className="fig-axis" />
        {Array.from({ length: most }, (_, k) => {
          const i = k + 1;
          const cost = grew(i) ? i : 1;
          return (
            <g key={i}>
              <rect x={24 + k * 24} y={232 - cost * 12} width="18" height={cost * 12} className={i > n ? "fig-ghost" : grew(i) ? "fig-accent" : "fig-fill"} />
              <text x={33 + k * 24} y="248" textAnchor="middle" className="fig-small">
                {i}
              </text>
            </g>
          );
        })}
        <text x="24" y="20" className="fig-small">
          height: work done by that append
        </text>
      </svg>
    </Frame>
  );
}

const TASKS: Record<string, Spot> = { data: [56, 60], clean: [168, 60], split: [280, 60], model: [168, 190], train: [280, 190], test: [388, 125] };
const NEEDS: [string, string][] = [
  ["data", "clean"],
  ["clean", "split"],
  ["split", "train"],
  ["model", "train"],
  ["train", "test"],
  ["split", "test"],
];
const needsOf = (task: string) => NEEDS.filter(([, after]) => after === task).map(([before]) => before);

/** Tasks with prerequisites, put in an order in which nothing comes before what it needs. */
function TopoOrder(props: Props) {
  const names = Object.keys(TASKS);
  const [step, setStep] = useState(clamp(Math.round(num(props.step, 0)), 0, names.length));
  const done: string[] = [];
  const readyAfter = () =>
    names
      .filter((task) => !done.includes(task) && needsOf(task).every((need) => done.includes(need)))
      .sort();
  for (let i = 0; i < step; i++) done.push(readyAfter()[0]);
  const ready = readyAfter();
  const blocked = names.filter((task) => !done.includes(task) && !ready.includes(task));
  return (
    <Frame
      title="An order that respects every arrow"
      summary={`After ${plural(step, "step")}. Done, in order: ${done.join(", ") || "nothing yet"}. Ready now, with every prerequisite done: ${ready.join(", ") || "nothing"}. ${
        blocked.length > 0
          ? `Still blocked: ${blocked.map((task) => `${task} (needs ${needsOf(task).filter((need) => !done.includes(need)).join(" and ")})`).join(", ")}.`
          : step === names.length
            ? "Every task is done, and each came after everything it needs."
            : "Nothing is blocked."
      }`}
      controls={<Stepper label="step" value={step} onChange={setStep} min={0} max={names.length} />}
    >
      <svg viewBox="0 0 440 240" role="img" aria-label={`Six tasks joined by arrows, with ${done.length} done and ${ready.length} ready`}>
        {NEEDS.map(([before, after]) => (
          <Link key={before + after} from={TASKS[before]} to={TASKS[after]} arrow gap={before === "split" && after === "train" ? 20 : 38} faint={done.includes(before)} />
        ))}
        {names.map((task) => (
          <Dot key={task} at={TASKS[task]} name={task} wide mark={done.includes(task) ? "done" : ready.includes(task) ? "now" : "wait"} note={done.includes(task) ? String(done.indexOf(task) + 1) : undefined} />
        ))}
      </svg>
    </Frame>
  );
}

const TOWNS: Record<string, Spot> = { A: [44, 130], B: [150, 44], C: [150, 216], D: [272, 84], E: [296, 216], F: [400, 130] };
const ROADS: [string, string, number][] = [
  ["A", "B", 4],
  ["A", "C", 1],
  ["C", "B", 2],
  ["B", "D", 5],
  ["C", "D", 8],
  ["C", "E", 10],
  ["D", "E", 2],
  ["D", "F", 6],
  ["E", "F", 3],
];

/** Dijkstra's algorithm on six towns: settle the nearest unsettled town, then improve its neighbours. */
function ShortestPath(props: Props) {
  const names = Object.keys(TOWNS);
  const [step, setStep] = useState(clamp(Math.round(num(props.step, 0)), 0, names.length));
  const best: Record<string, number> = Object.fromEntries(names.map((name) => [name, name === "A" ? 0 : Infinity]));
  const settled: string[] = [];
  const nearest = () => names.filter((name) => !settled.includes(name)).sort((a, b) => (best[a] === best[b] ? 0 : best[a] < best[b] ? -1 : 1))[0];
  for (let i = 0; i < step; i++) {
    const town = nearest();
    settled.push(town);
    for (const [a, b, length] of ROADS) {
      const other = a === town ? b : b === town ? a : null;
      if (other && !settled.includes(other)) best[other] = Math.min(best[other], best[town] + length);
    }
  }
  const rest = names.filter((name) => !settled.includes(name));
  const next = rest.length > 0 ? nearest() : null;
  const shown = (name: string) => (best[name] === Infinity ? "not reached" : String(best[name]));
  return (
    <Frame
      title="Shortest distances from A"
      summary={`After ${plural(step, "step")}. Settled, with their final distances from A: ${settled.map((name) => `${name} ${best[name]}`).join(", ") || "none yet"}. ${
        next ? `Best found so far for the rest: ${rest.map((name) => `${name} ${shown(name)}`).join(", ")}. The nearest unsettled town is ${next}, so it is settled next.` : "Every town is settled."
      }`}
      controls={<Stepper label="step" value={step} onChange={setStep} min={0} max={names.length} />}
    >
      <svg viewBox="0 0 440 260" role="img" aria-label={`Six towns joined by roads with lengths, ${settled.length} of them settled`}>
        {ROADS.map(([a, b, length]) => (
          <Link key={a + b} from={TOWNS[a]} to={TOWNS[b]} label={length} hot={settled.includes(a) && settled.includes(b) && Math.abs(best[a] - best[b]) === length} />
        ))}
        {names.map((name) => (
          <Dot key={name} at={TOWNS[name]} name={name} mark={settled.includes(name) ? "done" : name === next ? "now" : "wait"} note={best[name] === Infinity ? "∞" : String(best[name])} above={name === "B" || name === "D"} />
        ))}
      </svg>
    </Frame>
  );
}


/* Matrices are drawn on the same grid as vectors. A matrix here is two rows of two numbers. */
type M2 = [Pair, Pair];
const mv = (m: M2, [x, y]: Pair): Pair => [m[0][0] * x + m[0][1] * y, m[1][0] * x + m[1][1] * y];
const rowsOf = (m: M2) => `rows (${dp(m[0][0])}, ${dp(m[0][1])}) and (${dp(m[1][0])}, ${dp(m[1][1])})`;

/** The grid lines of the plane after a matrix has moved every point. */
function Warped({ m }: { m: M2 }) {
  const lines: [Pair, Pair][] = [];
  for (let i = -8; i <= 8; i++) {
    lines.push([mv(m, [i, -8]), mv(m, [i, 8])]);
    lines.push([mv(m, [-8, i]), mv(m, [8, i])]);
  }
  return (
    <g clipPath="url(#grid-clip)">
      {lines.map(([p, q], i) => (
        <line key={i} x1={gx(p[0])} y1={gy(p[1])} x2={gx(q[0])} y2={gy(q[1])} className="fig-guide" />
      ))}
    </g>
  );
}

/** A filled outline through the given points. */
function Outline({ points, accent = false }: { points: Pair[]; accent?: boolean }) {
  return <polygon points={points.map(([x, y]) => `${gx(x).toFixed(1)},${gy(y).toFixed(1)}`).join(" ")} className={accent ? "fig-accent" : "fig-fill"} opacity={accent ? 0.35 : 0.6} />;
}

const MAPS: { name: string; m: M2; does: string }[] = [
  { name: "stretch", m: [[2, 0], [0, 1]], does: "Every point moves to twice its distance from the vertical axis." },
  { name: "shear", m: [[1, 1], [0, 1]], does: "Each point slides sideways by its own height, so the square leans over and keeps its area." },
  { name: "quarter turn", m: [[0, -1], [1, 0]], does: "The whole plane turns a quarter of the way round, anticlockwise." },
  { name: "reflection", m: [[1, 0], [0, -1]], does: "The plane is flipped over the horizontal axis." },
  { name: "squash", m: [[1, 2], [0.5, 1]], does: "The two columns point the same way, so the whole plane is flattened onto one line." },
];

/** A matrix as a movement of the whole plane, fixed by where it sends the two unit vectors. */
function LinearMap(props: Props) {
  const [which, setWhich] = useState(clamp(MAPS.findIndex((map) => map.name === props.map), 0, MAPS.length - 1));
  const [quarters, setQuarters] = useState(clamp(Math.round(num(props.amount, 1) * 4), 0, 4));
  const { name, m: full, does } = MAPS[which];
  const t = quarters / 4;
  const m: M2 = [
    [1 + t * (full[0][0] - 1), t * full[0][1]],
    [t * full[1][0], 1 + t * (full[1][1] - 1)],
  ];
  const point: Pair = [2, 1];
  const image = mv(m, point);
  return (
    <Frame
      title="A matrix moves the plane"
      summary={`The ${name}, with ${rowsOf(full)}${quarters < 4 ? `, shown ${quarters} quarter${quarters === 1 ? "" : "s"} of the way from doing nothing` : ""}. The unit vector (1, 0) lands on ${pair([m[0][0], m[1][0]])}, the first column. The unit vector (0, 1) lands on ${pair([m[0][1], m[1][1]])}, the second column. The point (2, 1) is 2 of the first and 1 of the second, so it lands on 2 × ${pair([m[0][0], m[1][0]])} + 1 × ${pair([m[0][1], m[1][1]])} = ${pair(image)}.${quarters === 4 ? ` ${does}` : ""}`}
      controls={
        <>
          <Stepper label="quarters of the way" value={quarters} onChange={setQuarters} min={0} max={4} />
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setWhich((which + 1) % MAPS.length)}>
            Next matrix
          </button>
        </>
      }
    >
      <svg viewBox="0 0 440 280" role="img" aria-label={`The plane moved by the ${name}, with the unit square and the point (2, 1)`}>
        <Grid />
        <Warped m={m} />
        <Outline points={[[0, 0], [1, 0], [1, 1], [0, 1]].map((p) => mv(m, p as Pair))} accent />
        <Arrow to={[m[0][0], m[1][0]]} name="col 1" />
        <Arrow to={[m[0][1], m[1][1]]} name="col 2" />
        <circle cx={gx(image[0])} cy={gy(image[1])} r="5" className="fig-accent" />
      </svg>
    </Frame>
  );
}

const COLUMNS: M2 = [
  [2, -1],
  [1, 1],
];

/** A matrix times a vector, as a combination of the columns and as one dot product for each row. */
function MatrixVector(props: Props) {
  const [xh, setX] = useState(clamp(Math.round(num(props.x, 1) * 2), -3, 3));
  const [yh, setY] = useState(clamp(Math.round(num(props.y, 1) * 2), -3, 3));
  const x: Pair = [xh / 2, yh / 2];
  const a: Pair = [COLUMNS[0][0], COLUMNS[1][0]];
  const b: Pair = [COLUMNS[0][1], COLUMNS[1][1]];
  const first: Pair = [x[0] * a[0], x[0] * a[1]];
  const out = mv(COLUMNS, x);
  return (
    <Frame
      title="A matrix times a vector"
      summary={`The matrix has columns ${pair(a)} and ${pair(b)}, and x = ${pair(x)}. By columns: ${dp(x[0])} × ${pair(a)} + ${dp(x[1])} × ${pair(b)} = ${pair(out)}. By rows: (2, −1) · x = ${dp(out[0])} and (1, 1) · x = ${dp(out[1])}. Both give Ax = ${pair(out)}.`}
      controls={
        <>
          <Stepper label="first entry of x in halves" value={xh} onChange={setX} min={-3} max={3} />
          <Stepper label="second entry of x in halves" value={yh} onChange={setY} min={-3} max={3} />
        </>
      }
    >
      <svg viewBox="0 0 440 280" role="img" aria-label={`The columns ${pair(a)} and ${pair(b)} combined with weights ${dp(x[0])} and ${dp(x[1])}, reaching ${pair(out)}`}>
        <Grid />
        <Arrow to={first} dashed />
        <Arrow from={first} to={out} dashed />
        <Arrow to={a} name="col 1" />
        <Arrow to={b} name="col 2" />
        <Arrow to={out} accent name="Ax" />
      </svg>
    </Frame>
  );
}


const ELIMINATION: { rows: number[][]; changed: number; did: string }[] = [
  { rows: [[1, 1, 1, 6], [2, 3, 1, 11], [1, -1, 2, 5]], changed: -1, did: "The three equations x + y + z = 6, 2x + 3y + z = 11 and x − y + 2z = 5, written as rows of numbers. Nothing has been done yet." },
  { rows: [[1, 1, 1, 6], [0, 1, -1, -1], [1, -1, 2, 5]], changed: 1, did: "Row 2 has had 2 times row 1 subtracted from it, which removes x from the second equation." },
  { rows: [[1, 1, 1, 6], [0, 1, -1, -1], [0, -2, 1, -1]], changed: 2, did: "Row 3 has had row 1 subtracted from it, which removes x from the third equation." },
  { rows: [[1, 1, 1, 6], [0, 1, -1, -1], [0, 0, -1, -3]], changed: 2, did: "Row 3 has had 2 times row 2 added to it, which removes y. The rows now form a triangle, and the last says −z = −3." },
  { rows: [[1, 1, 1, 6], [0, 1, -1, -1], [0, 0, 1, 3]], changed: 2, did: "Row 3 has been divided by −1, so z = 3." },
  { rows: [[1, 1, 1, 6], [0, 1, 0, 2], [0, 0, 1, 3]], changed: 1, did: "Row 3 has been added to row 2, which puts z = 3 into the second equation and leaves y = 2." },
  { rows: [[1, 0, 0, 1], [0, 1, 0, 2], [0, 0, 1, 3]], changed: 0, did: "Rows 2 and 3 have been subtracted from row 1, leaving x = 1. The solution is x = 1, y = 2, z = 3." },
];

/** Three equations solved by row operations, one step at a time. */
function Elimination(props: Props) {
  const [step, setStep] = useState(clamp(Math.round(num(props.step, 0)), 0, ELIMINATION.length - 1));
  const { rows, changed, did } = ELIMINATION[step];
  return (
    <Frame
      title="Clearing one unknown at a time"
      summary={`Step ${step} of ${ELIMINATION.length - 1}. ${did} The rows are now ${rows.map((row) => `(${row.slice(0, 3).map((v) => dp(v)).join(", ")} | ${dp(row[3])})`).join(", ")}.`}
      controls={<Stepper label="step" value={step} onChange={setStep} min={0} max={ELIMINATION.length - 1} />}
    >
      <svg viewBox="0 0 440 190" role="img" aria-label={`Three equations as rows of numbers at step ${step} of elimination`}>
        {["x", "y", "z", "="].map((head, j) => (
          <text key={head} x={120 + j * 56 + (j === 3 ? 22 : 0) + 26} y="22" textAnchor="middle" className="fig-small">
            {head}
          </text>
        ))}
        {rows.map((row, i) => (
          <g key={i}>
            <text x="110" y={56 + i * 46} textAnchor="end" className="fig-small">
              row {i + 1}
            </text>
            <Cells values={row.slice(0, 3).map((v) => dp(v))} x={120} y={32 + i * 46} w={56} h={38} hot={i === changed ? [0, 1, 2] : []} />
            <Cells values={[dp(row[3])]} x={310} y={32 + i * 46} w={56} h={38} hot={i === changed ? [0] : []} />
          </g>
        ))}
        <line x1="299" x2="299" y1="30" y2="166" className="fig-axis" />
      </svg>
    </Frame>
  );
}


const NET: Record<string, Spot> = { A: [70, 60], B: [190, 60], C: [70, 190], D: [190, 190] };
const NET_NAMES = ["A", "B", "C", "D"];
const NET_LINKS: [string, string][] = [
  ["A", "B"],
  ["A", "C"],
  ["B", "C"],
  ["B", "D"],
  ["C", "D"],
  ["D", "A"],
];

/** A directed graph written as a table of 0s and 1s, and the powers of that table, which count walks. */
function AdjacencyMatrix(props: Props) {
  const [steps, setSteps] = useState(clamp(Math.round(num(props.steps, 1)), 1, 3));
  const [from, setFrom] = useState(clamp(Math.round(num(props.from, 1)), 1, 4) - 1);
  const one: number[][] = NET_NAMES.map((a) => NET_NAMES.map((b) => (NET_LINKS.some(([p, q]) => p === a && q === b) ? 1 : 0)));
  let power = one;
  for (let k = 1; k < steps; k++) power = power.map((row) => NET_NAMES.map((_, j) => row.reduce((sum, value, m) => sum + value * one[m][j], 0)));
  const start = NET_NAMES[from];
  return (
    <Frame
      title="A graph as a table of numbers"
      summary={`The entry in row i, column j of the table counts the walks of exactly ${plural(steps, "step")} from node i to node j${steps === 1 ? ", which is 1 where there is an arrow and 0 where there is none" : `, and the table is the first one multiplied by itself ${steps === 2 ? "once" : "twice"}`}. From ${start}: ${NET_NAMES.map((name, j) => `${power[from][j]} to ${name}`).join(", ")}.`}
      controls={
        <>
          <Stepper label="steps" value={steps} onChange={setSteps} min={1} max={3} />
          <Stepper label="row" value={from + 1} onChange={(v) => setFrom(v - 1)} min={1} max={4} />
        </>
      }
    >
      <svg viewBox="0 0 440 250" role="img" aria-label={`A graph of four nodes beside the table counting walks of ${steps} steps, with the row for ${start} marked`}>
        {NET_LINKS.map(([a, b]) => (
          <Link key={a + b} from={NET[a]} to={NET[b]} arrow hot={a === start && steps === 1} />
        ))}
        {NET_NAMES.map((name) => (
          <Dot key={name} at={NET[name]} name={name} mark={name === start ? "now" : "done"} />
        ))}
        {NET_NAMES.map((name, j) => (
          <text key={name} x={282 + j * 38 + 17} y="42" textAnchor="middle" className="fig-small">
            {name}
          </text>
        ))}
        {power.map((row, i) => (
          <g key={i}>
            <text x="264" y={72 + i * 38} className="fig-small">
              {NET_NAMES[i]}
            </text>
            <Cells values={row} x={282} y={50 + i * 38} w={38} h={32} hot={i === from ? [0, 1, 2, 3] : []} />
          </g>
        ))}
      </svg>
    </Frame>
  );
}

type TileKind = "hot" | "fill" | "ghost" | "cell";

/** A grid of small boxes with a value in each. kind says how each box is drawn. */
function Tiles({
  rows,
  cols,
  x,
  y,
  w = 34,
  h = 32,
  value,
  kind,
}: {
  rows: number;
  cols: number;
  x: number;
  y: number;
  w?: number;
  h?: number;
  value: (r: number, c: number) => string | number;
  kind?: (r: number, c: number) => TileKind;
}) {
  const tiles: ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = kind?.(r, c) ?? "fill";
      tiles.push(
        <g key={`${r}-${c}`}>
          <rect x={x + c * w} y={y + r * h} width={w - 4} height={h - 4} className={k === "hot" ? "fig-accent" : k === "ghost" ? "fig-ghost" : k === "cell" ? "fig-cell" : "fig-fill"} />
          <text x={x + c * w + (w - 4) / 2} y={y + r * h + (h - 4) / 2 + 6} textAnchor="middle" className="fig-mono" style={k === "hot" ? { fill: "var(--bg)" } : k === "ghost" ? { fill: "var(--text-faint)" } : undefined}>
            {value(r, c)}
          </text>
        </g>,
      );
    }
  }
  return <>{tiles}</>;
}

const tuple = (shape: number[]) => `(${shape.join(", ")}${shape.length === 1 ? "," : ""})`;
const SHAPES: number[][] = [[12], [2, 6], [3, 4], [4, 3], [6, 2], [2, 3, 2]];

/** Twelve numbers in one block of memory, read with one shape after another. */
function ArrayShape(props: Props) {
  const [which, setWhich] = useState(clamp(SHAPES.findIndex((shape) => shape.join("x") === props.shape), 0, SHAPES.length - 1));
  const [item, setItem] = useState(clamp(Math.round(num(props.item, 6)), 0, 11));
  const shape = SHAPES[which];
  const index: number[] = [];
  let rest = item;
  for (let axis = 0; axis < shape.length; axis++) {
    const step = shape.slice(axis + 1).reduce((a, b) => a * b, 1);
    index.push(Math.floor(rest / step));
    rest %= step;
  }
  const sum = index.map((value, axis) => (axis === shape.length - 1 ? `${value}` : `${value} × ${shape.slice(axis + 1).reduce((a, b) => a * b, 1)}`)).join(" + ");
  const [rows, cols] = shape.length === 1 ? [1, shape[0]] : shape.length === 2 ? shape : [shape[1], shape[2]];
  const slabs = shape.length === 3 ? shape[0] : 1;
  return (
    <Frame
      title="One block of numbers, many shapes"
      summary={`Twelve numbers in one block of memory, read with shape ${tuple(shape)}: ${plural(shape.length, "axis", "axes")}, of length${shape.length === 1 ? "" : "s"} ${shape.join(" and ")}. The number at place ${item} in the block is at index [${index.join(", ")}]${shape.length === 1 ? "" : `, because ${sum} = ${item}`}. The shape is only a way of reading the block. Changing it moves no number.`}
      controls={
        <>
          <Stepper label="place in the block" value={item} onChange={setItem} min={0} max={11} />
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setWhich((which + 1) % SHAPES.length)}>
            Next shape
          </button>
        </>
      }
    >
      <svg viewBox={`0 0 440 ${112 + rows * 32}`} role="img" aria-label={`A block of 12 numbers read with shape ${tuple(shape)}, with place ${item} marked`}>
        <text x="16" y="16" className="fig-small">
          the block in memory
        </text>
        <Tiles rows={1} cols={12} x={16} y={24} value={(_, c) => c} kind={(_, c) => (c === item ? "hot" : "fill")} />
        <text x="16" y="88" className="fig-small">
          read with shape {tuple(shape)}
        </text>
        {Array.from({ length: slabs }, (_, s) => (
          <Tiles
            key={s}
            rows={rows}
            cols={cols}
            x={16 + s * (cols * 34 + 28)}
            y={96}
            value={(r, c) => s * rows * cols + r * cols + c}
            kind={(r, c) => (s * rows * cols + r * cols + c === item ? "hot" : "fill")}
          />
        ))}
      </svg>
    </Frame>
  );
}

/** A slice of a table: which rows and which columns it keeps. */
function ArraySlice(props: Props) {
  const [start, setStart] = useState(clamp(Math.round(num(props.start, 1)), 0, 4));
  const [stop, setStop] = useState(clamp(Math.round(num(props.stop, 3)), 0, 4));
  const [step, setStep] = useState(clamp(Math.round(num(props.step, 2)), 1, 3));
  const rows = Array.from({ length: Math.max(0, stop - start) }, (_, i) => start + i);
  const cols = [0, 1, 2, 3, 4, 5].filter((c) => c % step === 0);
  const code = `a[${start}:${stop}, ::${step}]`;
  return (
    <Frame
      title="Slicing a table"
      summary={`${code} on a table of 4 rows and 6 columns. ${
        rows.length === 0 ? `No row is at or after ${start} and before ${stop}, so no rows are taken` : `Rows from ${start} up to but not including ${stop}: ${rows.join(", ")}`
      }. Every ${step === 1 ? "column" : step === 2 ? "2nd column" : "3rd column"}: ${cols.join(", ")}. The result has shape (${rows.length}, ${cols.length})${
        rows.length === 0 ? "" : `, with first row ${cols.map((c) => rows[0] * 10 + c).join(", ")}`
      }. It is a view of the same memory, not a copy.`}
      controls={
        <>
          <Stepper label="row start" value={start} onChange={setStart} min={0} max={4} />
          <Stepper label="row stop" value={stop} onChange={setStop} min={0} max={4} />
          <Stepper label="column step" value={step} onChange={setStep} min={1} max={3} />
        </>
      }
    >
      <svg viewBox="0 0 440 170" role="img" aria-label={`A 4 by 6 table with the slice ${code} marked`}>
        {[0, 1, 2, 3, 4, 5].map((c) => (
          <text key={c} x={72 + c * 52 + 24} y={16} textAnchor="middle" className="fig-small">
            {c}
          </text>
        ))}
        {[0, 1, 2, 3].map((r) => (
          <text key={r} x={56} y={24 + r * 36 + 22} textAnchor="middle" className="fig-small">
            {r}
          </text>
        ))}
        <Tiles rows={4} cols={6} x={72} y={24} w={52} h={36} value={(r, c) => r * 10 + c} kind={(r, c) => (rows.includes(r) && cols.includes(c) ? "hot" : "fill")} />
      </svg>
    </Frame>
  );
}

const TABLE34 = [
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
];
const BROADCASTS: { left: number[][]; right: number[][]; shapes: [number[], number[]]; why: string }[] = [
  {
    left: TABLE34,
    right: [[10, 20, 30, 40]],
    shapes: [[3, 4], [4]],
    why: "Lined up from the right: 4 with 4, then 3 with nothing, and a missing axis counts as length 1. An axis of length 1 is stretched to match, so the one row is used again for each of the 3 rows.",
  },
  {
    left: TABLE34,
    right: [[10], [20], [30]],
    shapes: [[3, 4], [3, 1]],
    why: "Lined up from the right: 4 with 1, then 3 with 3. The axis of length 1 is stretched to match, so the one column is used again for each of the 4 columns.",
  },
  {
    left: [[10], [20], [30]],
    right: [[1, 2, 3, 4]],
    shapes: [[3, 1], [4]],
    why: "Lined up from the right: 1 with 4, then 3 with nothing, which counts as 1. Both arrays are stretched, the column across and the row down, and every pairing of one entry from each appears once.",
  },
  {
    left: TABLE34,
    right: [[5]],
    shapes: [[3, 4], []],
    why: "A single number has no axes at all, so every axis is missing and counts as length 1. It is stretched over the whole table.",
  },
  {
    left: TABLE34,
    right: [[10, 20, 30]],
    shapes: [[3, 4], [3]],
    why: "Lined up from the right: 4 with 3. The lengths differ and neither is 1, so the shapes do not fit and NumPy raises an error. A list of 3 numbers meant as a column must be given the shape (3, 1).",
  },
];

/** Two arrays of different shapes added, with the smaller one stretched. */
function Broadcast(props: Props) {
  const [which, setWhich] = useState(clamp(Math.round(num(props.pair, 0)), 0, BROADCASTS.length - 1));
  const { left, right, shapes, why } = BROADCASTS[which];
  const fits = which !== 4;
  const pick = (grid: number[][], r: number, c: number) => grid[grid.length === 1 ? 0 : r][grid[0].length === 1 ? 0 : c];
  const own = (grid: number[][], r: number, c: number) => r < grid.length && c < grid[0].length;
  const result = [0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => pick(left, r, c) + (fits ? pick(right, r, c) : 0)));
  const side = (grid: number[][], x: number) => (
    <Tiles rows={fits ? 3 : grid.length} cols={fits ? 4 : grid[0].length} x={x} y={28} w={32} h={32} value={(r, c) => pick(grid, r, c)} kind={(r, c) => (own(grid, r, c) ? "fill" : "ghost")} />
  );
  return (
    <Frame
      title="Stretching the smaller array"
      summary={`Adding arrays of shapes ${tuple(shapes[0])} and ${shapes[1].length === 0 ? "()" : tuple(shapes[1])}. ${why}${
        fits ? ` The result has shape (3, 4), with first row ${result[0].join(", ")} and last row ${result[2].join(", ")}. Nothing is copied to do the stretching: the faint boxes are the same numbers read again.` : ""
      }`}
      controls={
        <button type="button" className="btn btn-secondary btn-small" onClick={() => setWhich((which + 1) % BROADCASTS.length)}>
          Next pair of shapes
        </button>
      }
    >
      <svg viewBox="0 0 440 136" role="img" aria-label={`Arrays of shapes ${tuple(shapes[0])} and ${shapes[1].length === 0 ? "()" : tuple(shapes[1])} ${fits ? "added, with the stretched copies drawn faintly" : "that cannot be added"}`}>
        <text x="4" y="16" className="fig-small">
          {tuple(shapes[0])}
        </text>
        <text x="156" y="16" className="fig-small">
          {shapes[1].length === 0 ? "()" : tuple(shapes[1])}
        </text>
        <text x="308" y="16" className="fig-small">
          {fits ? "(3, 4)" : "error"}
        </text>
        {side(left, 4)}
        <text x="140" y="82" textAnchor="middle" className="fig-mono">
          +
        </text>
        {side(right, 156)}
        <text x="292" y="82" textAnchor="middle" className="fig-mono">
          =
        </text>
        {fits ? <Tiles rows={3} cols={4} x={308} y={28} w={32} h={32} value={(r, c) => result[r][c]} kind={() => "cell"} /> : null}
      </svg>
    </Frame>
  );
}

const span = (nanoseconds: number) => {
  const [value, unit] =
    nanoseconds < 1000 ? [dp(nanoseconds, 0), "nanosecond"] : nanoseconds < 1e6 ? [dp(nanoseconds / 1000, 1), "microsecond"] : nanoseconds < 1e9 ? [dp(nanoseconds / 1e6, 1), "millisecond"] : [dp(nanoseconds / 1e9, 1), "second"];
  return `${value} ${unit}${value === "1" ? "" : "s"}`;
};

/** The cost of a Python loop over n numbers beside the cost of one array operation. */
function LoopVsArray(props: Props) {
  const [power, setPower] = useState(clamp(Math.round(num(props.power, 6)), 0, 8));
  const n = 10 ** power;
  const loop = 60 * n;
  const array = 2000 + n;
  const ratio = loop / array;
  const bar = (time: number) => 20 + (Math.log10(time) / 10) * 380;
  return (
    <Frame
      title="A loop in Python and a loop in the array"
      summary={`Adding two lists of ${group(n)} ${n === 1 ? "number" : "numbers"}. A Python loop does about 60 nanoseconds of bookkeeping for each item: ${span(loop)} in all. One array operation pays about 2 microseconds once to get started, then about 1 nanosecond for each item: ${span(array)}. ${
        ratio >= 1.5 ? `The array is about ${dp(ratio, 0)} times faster.` : ratio > 1 / 1.5 ? "The two cost about the same." : `The loop is about ${dp(1 / ratio, 0)} times faster, because for so few numbers the fixed cost is nearly all of it.`
      } These are typical figures, not measurements of your machine.`}
      controls={<Stepper label="power of ten" value={power} onChange={setPower} min={0} max={8} />}
    >
      <svg viewBox="0 0 440 130" role="img" aria-label={`Bars for the time of a Python loop and of one array operation on ${group(n)} numbers, on a scale where each step is ten times longer`}>
        <text x="20" y="22" className="fig-small">
          Python loop: {span(loop)}
        </text>
        <rect x="20" y="30" width={bar(loop) - 20} height="20" className="fig-fill" />
        <text x="20" y="78" className="fig-small">
          one array operation: {span(array)}
        </text>
        <rect x="20" y="86" width={bar(array) - 20} height="20" className="fig-accent" />
        <text x="20" y="124" className="fig-small">
          each tenth of the width is ten times longer
        </text>
      </svg>
    </Frame>
  );
}

const AXES = ["0", "1", "none"];

/** Adding up a table along one axis, which makes that axis disappear. */
function AxisReduce(props: Props) {
  const [which, setWhich] = useState(clamp(AXES.indexOf(String(props.axis ?? 0)), 0, 2));
  const [keep, setKeep] = useState(props.keepdims === true);
  const down = [0, 1, 2, 3].map((c) => TABLE34[0][c] + TABLE34[1][c] + TABLE34[2][c]);
  const across = TABLE34.map((row) => row.reduce((a, b) => a + b, 0));
  const all = across.reduce((a, b) => a + b, 0);
  const call = `a.sum(${which === 2 ? "" : `axis=${which}`}${keep ? `${which === 2 ? "" : ", "}keepdims=True` : ""})`;
  const shape = which === 0 ? (keep ? "(1, 4)" : "(4,)") : which === 1 ? (keep ? "(3, 1)" : "(3,)") : keep ? "(1, 1)" : "()";
  const said =
    which === 0
      ? `adds along axis 0, down the rows, so axis 0 is the one that goes. The result is ${down.join(", ")}, one total for each column`
      : which === 1
        ? `adds along axis 1, across the columns, so axis 1 is the one that goes. The result is ${across.join(", ")}, one total for each row`
        : `adds along every axis, so both go. The result is the single number ${all}`;
  return (
    <Frame
      title="Adding along an axis"
      summary={`${call} on a table of shape (3, 4) ${said}. Its shape is ${shape}${keep ? ", because keepdims leaves the used-up axis in place with length 1, ready to be stretched against the table" : ""}.`}
      controls={
        <>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setWhich((which + 1) % 3)}>
            Next axis
          </button>
          <Toggle label="keepdims" value={keep} onChange={setKeep} />
        </>
      }
    >
      <svg viewBox="0 0 440 180" role="img" aria-label={`A 3 by 4 table and its totals from ${call}`}>
        <Tiles rows={3} cols={4} x={60} y={16} w={52} h={36} value={(r, c) => TABLE34[r][c]} />
        {which === 0 ? <Tiles rows={1} cols={4} x={60} y={136} w={52} h={36} value={(_, c) => down[c]} kind={() => "hot"} /> : null}
        {which === 1 ? <Tiles rows={3} cols={1} x={292} y={16} w={52} h={36} value={(r) => across[r]} kind={() => "hot"} /> : null}
        {which === 2 ? <Tiles rows={1} cols={1} x={292} y={136} w={52} h={36} value={() => all} kind={() => "hot"} /> : null}
        <text x="60" y="130" className="fig-small">
          {which === 0 ? "axis 0 runs down ↓" : which === 1 ? "axis 1 runs across →" : "both axes"}
        </text>
      </svg>
    </Frame>
  );
}

const VIEWS: { code: string; shape: number[]; strides: number[]; offset: number; said: string }[] = [
  { code: "a", shape: [3, 4], strides: [4, 1], offset: 0, said: "The array as it was made, by a = np.arange(12).reshape(3, 4)." },
  { code: "a.T", shape: [4, 3], strides: [1, 4], offset: 0, said: "The transpose only exchanges the two strides." },
  { code: "a[:, ::2]", shape: [3, 2], strides: [4, 2], offset: 0, said: "Taking every 2nd column doubles the stride along axis 1." },
  { code: "a[::-1]", shape: [3, 4], strides: [-4, 1], offset: 8, said: "Reversing the rows starts at the last row and gives axis 0 a negative stride." },
  { code: "a[1]", shape: [4], strides: [1], offset: 4, said: "One row is a start place and a single stride." },
];

/** A view of an array as a start place and one stride for each axis, over an unchanged block of memory. */
function Strides(props: Props) {
  const [which, setWhich] = useState(clamp(Math.round(num(props.view, 0)), 0, VIEWS.length - 1));
  const [wanted, setItem] = useState(clamp(Math.round(num(props.item, 0)), 0, 11));
  const { code, shape, strides, offset, said } = VIEWS[which];
  const size = shape.reduce((a, b) => a * b, 1);
  const item = Math.min(wanted, size - 1);
  const [rows, cols] = shape.length === 1 ? [1, shape[0]] : shape;
  const [r, c] = [Math.floor(item / cols), item % cols];
  const index = shape.length === 1 ? [c] : [r, c];
  const place = (i: number, j: number) => offset + (shape.length === 1 ? j * strides[0] : i * strides[0] + j * strides[1]);
  const at = place(r, c);
  return (
    <Frame
      title="A view is a start and a stride"
      summary={`${code} has shape ${tuple(shape)}, starts at place ${offset} of the block, and has strides ${tuple(strides).replace(/-/g, "−")} counted in items: ${strides
        .map((s, axis) => `one step along axis ${axis} moves ${s < 0 ? `back ${-s}` : s} ${Math.abs(s) === 1 ? "place" : "places"}`)
        .join(", ")}. ${said} Its item at [${index.join(", ")}] is at place ${offset} + ${index.map((v, axis) => `${v} × ${strides[axis] < 0 ? `(−${-strides[axis]})` : strides[axis]}`).join(" + ")} = ${at}, which holds ${at}. With numbers of 8 bytes each, NumPy reports the strides as ${tuple(strides.map((s) => s * 8)).replace(/-/g, "−")} bytes. No number was moved to make this view.`}
      controls={
        <>
          <Stepper label="item of the view" value={item} onChange={setItem} min={0} max={size - 1} />
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setWhich((which + 1) % VIEWS.length)}>
            Next view
          </button>
        </>
      }
    >
      <svg viewBox={`0 0 440 ${112 + rows * 32}`} role="img" aria-label={`The block of 12 numbers and the view ${code}, with the item at [${index.join(", ")}] marked in both`}>
        <text x="16" y="16" className="fig-small">
          the block in memory, places 0 to 11
        </text>
        <Tiles rows={1} cols={12} x={16} y={24} value={(_, j) => j} kind={(_, j) => (j === at ? "hot" : "fill")} />
        <text x="16" y="88" className="fig-small">
          {code}
        </text>
        <Tiles rows={rows} cols={cols} x={16} y={96} value={(i, j) => place(i, j)} kind={(i, j) => (i === r && j === c ? "hot" : "fill")} />
      </svg>
    </Frame>
  );
}

type Nested = number | Nested[];
const LENGTHS: Record<string, number> = { i: 2, j: 3, k: 2 };
const EINSUMS: { code: string; inputs: Nested[]; names: string[]; said: string }[] = [
  { code: "ij,j->i", inputs: [[[1, 2, 3], [4, 5, 6]], [1, 0, 2]], names: ["A", "x"], said: "Entry [i] is the sum over j of A[i, j] × x[j]: the matrix-vector product." },
  { code: "ij,jk->ik", inputs: [[[1, 2, 3], [4, 5, 6]], [[1, 0], [0, 1], [2, 1]]], names: ["A", "B"], said: "Entry [i, k] is the sum over j of A[i, j] × B[j, k]: the matrix product." },
  { code: "ij->ji", inputs: [[[1, 2, 3], [4, 5, 6]]], names: ["A"], said: "Entry [j, i] is A[i, j]: the transpose. Nothing is added up." },
  { code: "ij->i", inputs: [[[1, 2, 3], [4, 5, 6]]], names: ["A"], said: "Entry [i] is the sum over j of A[i, j]: the total of each row, the same as A.sum(axis=1)." },
  { code: "j,j->", inputs: [[1, 0, 2], [3, 1, 1]], names: ["x", "y"], said: "The sum over j of x[j] × y[j]: the dot product." },
  { code: "i,j->ij", inputs: [[1, 2], [1, 0, 2]], names: ["u", "x"], said: "Entry [i, j] is u[i] × x[j]: the outer product. Nothing is added up." },
];

function einsum(code: string, inputs: Nested[]): Nested {
  const [left, out] = code.split("->");
  const terms = left.split(",");
  const letters = [...new Set(left.replace(/,/g, ""))];
  const read = (value: Nested, path: number[]): number => path.reduce<Nested>((inner, i) => (inner as Nested[])[i], value) as number;
  const build = (depth: number, fixed: Record<string, number>): Nested => {
    if (depth < out.length) return Array.from({ length: LENGTHS[out[depth]] }, (_, i) => build(depth + 1, { ...fixed, [out[depth]]: i }));
    const free = letters.filter((letter) => !out.includes(letter));
    const total = (at: number, values: Record<string, number>): number =>
      at === free.length
        ? terms.reduce((product, term, t) => product * read(inputs[t], [...term].map((letter) => values[letter])), 1)
        : Array.from({ length: LENGTHS[free[at]] }, (_, i) => total(at + 1, { ...values, [free[at]]: i })).reduce((a, b) => a + b, 0);
    return total(0, fixed);
  };
  return build(0, {});
}

const written = (value: Nested): string => (Array.isArray(value) ? `[${value.map(written).join(Array.isArray(value[0]) ? ", " : " ")}]` : String(value));

/** A grid for a number, a list or a table. */
function Shown({ value, x, y }: { value: Nested; x: number; y: number }) {
  const table: number[][] = !Array.isArray(value) ? [[value]] : Array.isArray(value[0]) ? (value as number[][]) : [value as number[]];
  return <Tiles rows={table.length} cols={table[0].length} x={x} y={y} w={32} h={32} value={(r, c) => table[r][c]} />;
}

/** An einsum string read letter by letter: which letters are kept and which are summed away. */
function Einsum(props: Props) {
  const [which, setWhich] = useState(clamp(EINSUMS.findIndex((entry) => entry.code === props.code), 0, EINSUMS.length - 1));
  const { code, inputs, names, said } = EINSUMS[which];
  const [left, out] = code.split("->");
  const letters = [...new Set(left.replace(/,/g, ""))];
  const summed = letters.filter((letter) => !out.includes(letter));
  const result = einsum(code, inputs);
  const shape = [...out].map((letter) => LENGTHS[letter]);
  const widths = inputs.map((value) => (Array.isArray(value) ? (Array.isArray(value[0]) ? (value[0] as number[]).length : value.length) : 1) * 32 + 20);
  const starts = widths.map((_, t) => 8 + widths.slice(0, t).reduce((a, b) => a + b, 0));
  const end = 8 + widths.reduce((a, b) => a + b, 0) + 24;
  return (
    <Frame
      title="Naming the axes"
      summary={`np.einsum("${code}", ${names.join(", ")}), with i of length 2, j of length 3 and k of length 2. ${
        summed.length === 0 ? "Every letter of the inputs appears in the output, so nothing is summed" : `The letter ${summed.join(" and ")} appears in the inputs and not in the output, so it is summed over`
      }. ${out.length === 0 ? "No letter is kept, so the result is a single number" : `The ${out.length === 1 ? "letter" : "letters"} ${[...out].join(" and ")} ${out.length === 1 ? "is" : "are"} kept, so the result has shape ${tuple(shape)}`}. ${said} The result is ${written(result)}.`}
      controls={
        <button type="button" className="btn btn-secondary btn-small" onClick={() => setWhich((which + 1) % EINSUMS.length)}>
          Next expression
        </button>
      }
    >
      <svg viewBox="0 0 440 136" role="img" aria-label={`The inputs and the result of the einsum expression ${code}`}>
        {inputs.map((value, t) => (
          <g key={t}>
            <text x={starts[t]} y="16" className="fig-small">
              {names[t]}, axes {left.split(",")[t]}
            </text>
            <Shown value={value} x={starts[t]} y={28} />
          </g>
        ))}
        <text x={end - 22} y="50" textAnchor="middle" className="fig-mono">
          →
        </text>
        <text x={end} y="16" className="fig-small">
          result{out.length ? `, axes ${out}` : ""}
        </text>
        <Shown value={result} x={end} y={28} />
      </svg>
    </Frame>
  );
}

/** A small generator of pseudo-random numbers: a fixed rule, started from a seed. */
function draws(seed: number, count: number, normal: boolean): number[] {
  let state = (seed + 1) * 0x9e3779b9;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: count }, () => (normal ? Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next()) : next()));
}

/** Draws from a seeded generator, gathered into a histogram. */
function RandomSamples(props: Props) {
  const [seed, setSeed] = useState(clamp(Math.round(num(props.seed, 0)), 0, 9));
  const [power, setPower] = useState(clamp(Math.round(num(props.power, 2)), 1, 4));
  const [normal, setNormal] = useState(props.normal === true);
  const count = 10 ** power;
  const values = draws(seed, count, normal);
  const [low, high] = normal ? [-3, 3] : [0, 1];
  const bins = Array.from({ length: 12 }, () => 0);
  for (const value of values) if (value >= low && value < high) bins[Math.floor(((value - low) / (high - low)) * 12)]++;
  const tallest = Math.max(...bins);
  const mean = values.reduce((a, b) => a + b, 0) / count;
  return (
    <Frame
      title="Random numbers from a seed"
      summary={`Seed ${seed}, ${group(count)} draws from ${normal ? "the standard normal distribution" : "the uniform distribution between 0 and 1"}. The first three are ${values.slice(0, 3).map((v) => dp(v, 3)).join(", ")}. The mean of all of them is ${dp(mean, 3)}, and the more draws there are, the nearer it comes to ${normal ? "0" : "0.5"}. The same seed gives these same numbers every time, because the generator is a fixed rule and the seed only says where it starts.`}
      controls={
        <>
          <Stepper label="seed" value={seed} onChange={setSeed} min={0} max={9} />
          <Stepper label="power of ten" value={power} onChange={setPower} min={1} max={4} />
          <Toggle label="normal" value={normal} onChange={setNormal} />
        </>
      }
    >
      <svg viewBox="0 0 440 180" role="img" aria-label={`A histogram of ${group(count)} draws from ${normal ? "the standard normal distribution" : "the uniform distribution"} with seed ${seed}`}>
        {bins.map((bin, i) => (
          <rect key={i} x={28 + i * 32} y={150 - (bin / tallest) * 130} width="28" height={(bin / tallest) * 130} className="fig-accent" />
        ))}
        <line x1="24" y1="150" x2="416" y2="150" className="fig-axis" />
        <text x="28" y="168" className="fig-small">
          {low}
        </text>
        <text x="412" y="168" textAnchor="end" className="fig-small">
          {high}
        </text>
      </svg>
    </Frame>
  );
}

const SHIFTS = [0, 100, 700, 1000, -1000];
const sci = (value: number) => (value === Infinity ? "inf" : value === 0 ? "0" : Math.abs(value) >= 1e5 || Math.abs(value) < 1e-3 ? value.toExponential(2).replace("e+", "e").replace("-", "−") : dp(value, 3));

/** The logarithm of a sum of exponentials, computed directly and after subtracting the largest input. */
function LogSumExp(props: Props) {
  const [which, setWhich] = useState(clamp(SHIFTS.indexOf(num(props.shift, 0)), 0, SHIFTS.length - 1));
  const shift = SHIFTS[which];
  const xs = [shift, shift + 1, shift + 2];
  const direct = xs.map(Math.exp);
  const naive = Math.log(direct.reduce((a, b) => a + b, 0));
  const top = Math.max(...xs);
  const moved = xs.map((x) => Math.exp(x - top));
  const stable = top + Math.log(moved.reduce((a, b) => a + b, 0));
  const show = (value: number) => (value === Infinity ? "inf" : value === -Infinity ? "−inf" : dp(value, 4));
  return (
    <Frame
      title="Subtract the largest first"
      summary={`The inputs are ${xs.map((x) => dp(x)).join(", ")}. Directly: their exponentials are ${direct.map(sci).join(", ")}, and the logarithm of the sum comes out as ${show(naive)}${
        naive === Infinity ? ", because the exponentials are too large for a float and overflow to infinity" : naive === -Infinity ? ", because the exponentials are too small for a float and round to zero" : ""
      }. After subtracting the largest input, ${dp(top)}: the exponentials are ${moved.map(sci).join(", ")}, none larger than 1, and the answer is ${dp(top)} + ${dp(Math.log(moved.reduce((a, b) => a + b, 0)), 4)} = ${show(stable)}. ${Number.isFinite(naive) ? "Here the two agree." : "The true answer was an ordinary number all along, and only the route through the exponentials failed."}`}
      controls={
        <button type="button" className="btn btn-secondary btn-small" onClick={() => setWhich((which + 1) % SHIFTS.length)}>
          Next inputs
        </button>
      }
    >
      <svg viewBox="0 0 440 150" role="img" aria-label={`The exponentials of ${xs.join(", ")} computed directly and after subtracting the largest`}>
        <text x="16" y="18" className="fig-small">
          exp(x), directly
        </text>
        <Tiles rows={1} cols={3} x={16} y={26} w={136} h={40} value={(_, c) => sci(direct[c])} kind={(_, c) => (Number.isFinite(direct[c]) && direct[c] > 0 ? "fill" : "ghost")} />
        <text x="16" y="90" className="fig-small">
          exp(x − largest)
        </text>
        <Tiles rows={1} cols={3} x={16} y={98} w={136} h={40} value={(_, c) => sci(moved[c])} kind={() => "hot"} />
      </svg>
    </Frame>
  );
}

/** How far apart neighbouring floating-point numbers are near a given size. */
function FloatGaps(props: Props) {
  const [power, setPower] = useState(clamp(Math.round(num(props.power, 8)), 0, 16));
  const [single, setSingle] = useState(props.single === true);
  const x = 10 ** power;
  const exponent = Math.floor(Math.log2(x));
  const gap = 2 ** (exponent - (single ? 23 : 52));
  const kind = single ? "float32" : "float64";
  const tell = (value: number) => (value >= 1 ? group(value) : value.toExponential(1).replace("e-", " × 10^−").replace("e+", " × 10^"));
  return (
    <Frame
      title="The gaps between floats"
      summary={`Near ${group(x)}, neighbouring ${kind} values are ${tell(gap)} apart. A ${kind} keeps ${single ? 24 : 53} binary digits, about ${single ? 7 : 16} decimal digits, however large or small the number is, so the gap grows with the number. ${
        gap > 2
          ? `Adding 1 to ${group(x)} changes nothing: the exact sum falls between two neighbours, nearer the one it started from, and is rounded back to it.`
          : gap === 2
            ? `Adding 1 to ${group(x)} lands exactly half-way between two neighbours, and the rule for ties rounds it back to where it started.`
            : gap === 1
              ? `Adding 1 to ${group(x)} is exact, since it lands on the next neighbour, but nothing between whole numbers can be stored here.`
              : `Adding 1 to ${group(x)} is ${gap < 1e-6 ? "accurate to many digits" : "accurate to only a few digits after the point"}: the error is at most half a gap.`
      }`}
      controls={
        <>
          <Stepper label="power of ten" value={power} onChange={setPower} min={0} max={16} />
          <Toggle label="float32" value={single} onChange={setSingle} />
        </>
      }
    >
      <svg viewBox="0 0 440 110" role="img" aria-label={`A number line near ${group(x)} with marks for neighbouring ${kind} values, ${tell(gap)} apart`}>
        <line x1="20" y1="56" x2="420" y2="56" className="fig-axis" />
        {[-3, -2, -1, 0, 1, 2, 3].map((k) => (
          <line key={k} x1={220 + k * 60} y1={k === 0 ? 38 : 46} x2={220 + k * 60} y2={k === 0 ? 74 : 66} className={k === 0 ? "fig-accent-line" : "fig-line"} />
        ))}
        <text x="220" y="28" textAnchor="middle" className="fig-small">
          {group(x)}
        </text>
        <line x1="220" y1="88" x2="280" y2="88" className="fig-line" />
        <text x="250" y="104" textAnchor="middle" className="fig-small">
          gap {tell(gap)}
        </text>
      </svg>
    </Frame>
  );
}

const FIGURES: Record<FigureName, ComponentType<Props>> = {
  "place-value": PlaceValue,
  "number-line": NumberLine,
  "area-grid": AreaGrid,
  "fraction-bar": FractionBar,
  "powers-of-ten": PowersOfTen,
  "ratio-table": RatioTable,
  "log-scale": LogScale,
  "plane-point": PlanePoint,
  "plane-line": PlaneLine,
  "plane-lines": PlaneLines,
  venn: Venn,
  "arrow-map": ArrowMap,
  "inverse-line": InverseLine,
  growth: Growth,
  "triangle-sum": TriangleSum,
  "partial-sums": PartialSums,
  "step-through": StepThrough,
  "binary-counter": BinaryCounter,
  "struct-padding": StructPadding,
  "call-stack": CallStack,
  "growth-rates": GrowthRates,
  "truth-table": TruthTable,
  "full-adder": FullAdder,
  dominoes: Dominoes,
  "remainder-classes": RemainderClasses,
  "quantifier-grid": QuantifierGrid,
  secant: Secant,
  "chain-rates": ChainRates,
  descent: Descent,
  riemann: Riemann,
  accumulation: Accumulation,
  "vector-arrow": VectorArrow,
  "vector-sum": VectorSum,
  "dot-product": DotProduct,
  "norm-balls": NormBalls,
  projection: Projection,
  hyperplane: Hyperplane,
  "array-list": ArrayList,
  "stack-queue": StackQueue,
  "hash-table": HashTable,
  heap: Heap,
  "search-tree": SearchTree,
  trie: Trie,
  "graph-storage": GraphStorage,
  "union-find": UnionFind,
  "choice-tree": ChoiceTree,
  "pascal-triangle": PascalTriangle,
  pigeonholes: Pigeonholes,
  "inclusion-exclusion": InclusionExclusion,
  "mod-clock": ModClock,
  "euclid-squares": EuclidSquares,
  tower: Tower,
  "bound-witness": BoundWitness,
  "one-stroke": OneStroke,
  "leaf-strip": LeafStrip,
  "dice-grid": DiceGrid,
  "bayes-square": BayesSquare,
  "variable-bars": VariableBars,
  "distribution-bars": DistributionBars,
  "density-area": DensityArea,
  "birthday-curve": BirthdayCurve,
  "tail-bounds": TailBounds,
  "sample-means": SampleMeans,
  "monte-carlo": MonteCarlo,
  "summary-marks": SummaryMarks,
  "tail-plot": TailPlot,
  "histogram-bins": HistogramBins,
  "estimator-spread": EstimatorSpread,
  "interval-catch": IntervalCatch,
  "null-test": NullTest,
  "bootstrap": Bootstrap,
  "ab-test": AbTest,
  "benchmark-runs": BenchmarkRuns,
  "recursion-tree": RecursionTree,
  "spanning-tree": SpanningTree,
  "interval-schedule": IntervalSchedule,
  "quick-pivot": QuickPivot,
  "tour-heuristic": TourHeuristic,
  "table-keys": TableKeys,
  "algebra-ops": AlgebraOps,
  "query-order": QueryOrder,
  "join-match": JoinMatch,
  "group-buckets": GroupBuckets,
  "subquery-steps": SubquerySteps,
  "window-frame": WindowFrame,
  "three-valued": ThreeValued,
  "transfer-crash": TransferCrash,
  "index-lookup": IndexLookup,
  "er-cardinality": ErCardinality,
  "fd-closure": FdClosure,
  "normalise-steps": NormaliseSteps,
  "denorm-tradeoff": DenormTradeoff,
  "doc-embed": DocEmbed,
  "graph-hops": GraphHops,
  "schema-versions": SchemaVersions,
  "interface-swap": InterfaceSwap,
  "change-ripple": ChangeRipple,
  "state-flags": StateFlags,
  "error-unwind": ErrorUnwind,
  "di-clock": DiClock,
  "fee-strategy": FeeStrategy,
  "refactor-steps": RefactorSteps,
  "page-cursor": PageCursor,
  "decision-matrix": DecisionMatrix,
  "content-store": ContentStore,
  "three-way-merge": ThreeWayMerge,
  "review-size": ReviewSize,
  "build-graph": BuildGraph,
  "version-ranges": VersionRanges,
  "bisect-commits": BisectCommits,
  "amdahl-speedup": AmdahlSpeedup,
  "ci-pipeline": CiPipeline,
  "boundary-tests": BoundaryTests,
  "test-order": TestOrder,
  "test-doubles": TestDoubles,
  "property-runs": PropertyRuns,
  "triangle-check": TriangleCheck,
  "test-pyramid": TestPyramid,
  "mutation-score": MutationScore,
  "sleep-poll": SleepPoll,
  "month-end": MonthEnd,
  "fuzz-header": FuzzHeader,
  "token-scan": TokenScan,
  "dfa-run": DfaRun,
  "parse-tree": ParseTree,
  "ast-eval": AstEval,
  "stack-machine": StackMachine,
  "scope-chain": ScopeChain,
  "type-check": TypeCheck,
  "mark-sweep": MarkSweep,
  "gate-circuit": GateCircuit,
  "ripple-adder": RippleAdder,
  "clocked-store": ClockedStore,
  "fetch-execute": FetchExecute,
  "rv-encoding": RvEncoding,
  "asm-trace": AsmTrace,
  "stack-frames": StackFrames,
  "pipeline-chart": PipelineChart,
  "branch-predictor": BranchPredictor,
  "ooo-issue": OooIssue,
  "mode-switch": ModeSwitch,
  "fork-tree": ForkTree,
  "scheduler-gantt": SchedulerGantt,
  "page-table": PageTable,
  "tlb": TlbCache,
  "io-timeline": IoTimeline,
  "inode-blocks": InodeBlocks,
  "thread-models": ThreadModels,
  "process-life": ProcessLife,
  "thread-interleaving": ThreadInterleaving,
  "lock-timeline": LockTimeline,
  "deadlock-graph": DeadlockGraph,
  "bounded-buffer": BoundedBuffer,
  "cas-retry": CasRetry,
  "store-buffer": StoreBuffer,
  "work-queue": WorkQueue,
  "event-loop": EventLoop,
  "actor-mailbox": ActorMailbox,
  "schedule-explorer": ScheduleExplorer,
  "graph-walk": GraphWalk,
  "sort-steps": SortSteps,
  "binary-search": BinarySearch,
  "dp-grid": DpGrid,
  "doubling-array": DoublingArray,
  "topo-order": TopoOrder,
  "shortest-path": ShortestPath,
  "linear-map": LinearMap,
  "matrix-vector": MatrixVector,
  elimination: Elimination,
  "adjacency-matrix": AdjacencyMatrix,
  "array-shape": ArrayShape,
  "array-slice": ArraySlice,
  broadcast: Broadcast,
  "loop-vs-array": LoopVsArray,
  "axis-reduce": AxisReduce,
  strides: Strides,
  einsum: Einsum,
  "random-samples": RandomSamples,
  "log-sum-exp": LogSumExp,
  "float-gaps": FloatGaps,
};

export function Figure({ name, props }: { name: string; props?: Props }) {
  const Drawn = (FIGURES as Record<string, ComponentType<Props>>)[name];
  return Drawn ? <Drawn {...(props ?? {})} /> : null;
}
