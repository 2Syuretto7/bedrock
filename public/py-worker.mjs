// Runs learner code in Pyodide, off the main thread. One message in, one out.
// The page ends a run that takes too long by terminating this worker.
import { loadPyodide } from "/pyodide/pyodide.mjs";

let ready;
function boot() {
  ready ??= loadPyodide({ indexURL: "/pyodide/" });
  return ready;
}

/** NumPy is a large download, so it is fetched only for code that names it, and then only once. */
let numpy;
function needs(pyodide, code) {
  if (!/\bnumpy\b/.test(code)) return undefined;
  numpy ??= pyodide.loadPackage("numpy", { messageCallback: () => {}, errorCallback: () => {} });
  return numpy;
}

const LIMIT = 200_000; // characters of output kept per run

/** Keep the part of a traceback that is about the learner's own code. */
function tidy(message) {
  const lines = String(message).split("\n");
  const start = lines.findIndex((line) => line.includes('File "<exec>"'));
  const kept = start > 0 ? ["Traceback (most recent call last):", ...lines.slice(start)] : lines;
  return kept.join("\n").trim();
}

self.onmessage = async (event) => {
  const { id, type, code } = event.data;
  if (type === "warm") {
    await boot();
    self.postMessage({ id, type: "ready" });
    return;
  }
  const out = [];
  let size = 0;
  const write = (stream) => (text) => {
    if (size > LIMIT) return;
    size += text.length;
    out.push({ stream, text });
  };
  const started = performance.now();
  let error = null;
  try {
    const pyodide = await boot();
    pyodide.setStdout({ batched: write("out") });
    pyodide.setStderr({ batched: write("err") });
    await needs(pyodide, code);
    // Python is ready and the learner's code starts now: the page times the run from here.
    self.postMessage({ id, type: "started" });
    const globals = pyodide.globals.get("dict")();
    try {
      await pyodide.runPythonAsync(code, { globals });
    } finally {
      globals.destroy();
    }
  } catch (caught) {
    error = tidy(caught?.message ?? caught);
  }
  self.postMessage({ id, type: "done", out, error, ms: performance.now() - started, truncated: size > LIMIT });
};
