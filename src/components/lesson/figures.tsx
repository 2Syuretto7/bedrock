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

function Slider({ label, value, onChange, min, max, step = 1 }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number }) {
  return (
    <label className="fig-slider">
      <span className="label">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
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
          <Stepper label="jump" value={jump} onChange={setJump} min={0} max={24} />
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
