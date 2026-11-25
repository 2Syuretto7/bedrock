import { loadPyodide, type PyodideInterface } from "pyodide";

export type PyRun = { out: string; error: string | null };
export type RunPython = (code: string) => Promise<PyRun>;

let ready: Promise<PyodideInterface> | undefined;
let numpy: Promise<unknown> | undefined;

/** Runs Python under Node with the same interpreter the learner's browser uses. */
export const runPython: RunPython = async (code) => {
  const pyodide = await (ready ??= loadPyodide());
  // The copy of NumPy placed beside the runtime by scripts/copy-pyodide.mjs, loaded as the browser loads it.
  if (/\bnumpy\b/.test(code)) await (numpy ??= pyodide.loadPackage("numpy", { messageCallback: () => {}, errorCallback: () => {} }));
  let out = "";
  pyodide.setStdout({ batched: (text) => (out += text + "\n") });
  pyodide.setStderr({ batched: () => {} });
  const globals = pyodide.globals.get("dict")();
  try {
    await pyodide.runPythonAsync(code, { globals });
    return { out, error: null };
  } catch (caught) {
    return { out, error: String((caught as Error)?.message ?? caught) };
  } finally {
    globals.destroy();
  }
};
