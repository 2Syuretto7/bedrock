// Copies the Pyodide runtime from node_modules into public/pyodide so the app
// serves Python itself: no third-party CDN, and it can be cached for offline use.
//
// NumPy is not part of the npm package. Its build for this exact runtime is kept
// in vendor/pyodide and is copied to both places Python runs: public/pyodide for
// the learner's browser, and node_modules/pyodide for the lesson validator.
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const from = path.join(process.cwd(), "node_modules", "pyodide");
const to = path.join(process.cwd(), "public", "pyodide");
const vendor = path.join(process.cwd(), "vendor", "pyodide");
mkdirSync(to, { recursive: true });
for (const file of ["pyodide.mjs", "pyodide.asm.mjs", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"]) {
  cpSync(path.join(from, file), path.join(to, file));
}

const lock = JSON.parse(readFileSync(path.join(from, "pyodide-lock.json"), "utf8"));
for (const name of ["numpy"]) {
  const { file_name: file, sha256 } = lock.packages[name];
  const source = path.join(vendor, file);
  if (!existsSync(source)) {
    throw new Error(`vendor/pyodide has no ${file}. The pyodide package was upgraded: add the matching build of ${name}.`);
  }
  if (createHash("sha256").update(readFileSync(source)).digest("hex") !== sha256) {
    throw new Error(`vendor/pyodide/${file} is not the build that pyodide-lock.json names.`);
  }
  cpSync(source, path.join(to, file));
  cpSync(source, path.join(from, file));
}
console.log("Pyodide runtime and NumPy copied to public/pyodide");
