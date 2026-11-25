/**
 * How a code answer is checked. The same program runs in the browser for the
 * learner and under Node before a lesson is merged, so a reference solution
 * that passes in review passes for the learner.
 *
 * The learner's code runs first with its printing captured; the tests then run
 * in the same namespace and can read every name the code defined, plus
 * `output`, the text it printed, and `source`, the code itself.
 *
 * Tests can also call `rerun(name=value, ...)`. It runs the learner's code
 * again with the top-level line that sets each named variable replaced, and
 * returns the resulting namespace (including `output`). That lets a test try
 * several inputs before the learner has been taught how to write functions.
 */
const py = (text: string) => JSON.stringify(text);

export function checkProgram(code: string, tests: string): string {
  return `import io as _io, contextlib as _ctx, re as _re
_src = ${py(code)}
def _run(_source):
    _space = {"__name__": "__main__"}
    _buf = _io.StringIO()
    with _ctx.redirect_stdout(_buf):
        exec(compile(_source, "<exec>", "exec"), _space)
    _space["output"] = _buf.getvalue()
    _space["source"] = _source
    return _space
def rerun(**_values):
    _source = _src
    for _name, _value in _values.items():
        _source, _count = _re.subn(r"(?m)^" + _name + r"[ \\t]*=.*$", lambda _m: _name + " = " + repr(_value), _source, count=1)
        assert _count == 1, "Keep the line that sets " + _name + " at the top of your program"
    return _run(_source)
_ns = _run(_src)
_ns["rerun"] = rerun
exec(compile(${py(tests)}, "<tests>", "exec"), _ns)
`;
}

/**
 * Turns a failed check into something the learner can act on: one line, and
 * for an error in their own code, the part of the traceback about that code.
 * Test messages are written never to contain the answer.
 */
export function explainFailure(error: string): { note: string; detail: string | null } {
  const lines = error.trim().split("\n");
  const last = lines.at(-1) ?? "";
  if (/^Stopped/.test(last)) return { note: last, detail: null };
  if (last.startsWith("AssertionError") && error.includes('File "<tests>"')) {
    return { note: last.replace(/^AssertionError:?\s*/, "") || "Not yet. One of the checks did not pass.", detail: null };
  }
  const own = lines.findLastIndex((line) => line.includes('File "<exec>"'));
  const detail = own >= 0 ? ["Traceback (most recent call last):", ...lines.slice(own)].join("\n") : last;
  return { note: "Your code stopped with an error.", detail };
}

/**
 * Lists the Python features a piece of code uses, so a lesson can be held to
 * the features its learner has already been taught. Returns JSON, or the
 * string "syntax-error" for code that does not parse.
 *
 * An attribute the code defines for itself, a method of its own class or a
 * field it assigns such as self.x, is not a feature of Python and is not
 * listed. context is other code shown alongside, whose definitions count too.
 */
export function featureProgram(code: string, context = ""): string {
  return `import ast as _ast, builtins as _b, json as _json
_STRUCT = {"If","IfExp","For","While","Break","Continue","FunctionDef","Return","Lambda","ClassDef","List","Tuple",
  "Dict","Set","Subscript","Slice","ListComp","DictComp","SetComp","GeneratorExp","Try","Raise","Assert","With",
  "JoinedStr","Starred","Global","Nonlocal","Pass","Delete","Yield","YieldFrom","Await","AsyncFunctionDef","Match",
  "NamedExpr","Assign","AugAssign","AnnAssign","BoolOp","Compare"}
def _own(src):
    own = set()
    try:
        tree = _ast.parse(src)
    except SyntaxError:
        return own
    for node in _ast.walk(tree):
        if isinstance(node, _ast.Attribute) and isinstance(node.ctx, _ast.Store):
            own.add(node.attr)
        elif isinstance(node, _ast.ClassDef):
            for item in node.body:
                if isinstance(item, _ast.FunctionDef):
                    own.add(item.name)
                elif isinstance(item, _ast.Assign):
                    own.update(t.id for t in item.targets if isinstance(t, _ast.Name))
                elif isinstance(item, _ast.AnnAssign) and isinstance(item.target, _ast.Name):
                    own.add(item.target.id)
    return own
def _features(src, context):
    found = set()
    own = _own(src) | _own(context)
    for node in _ast.walk(_ast.parse(src)):
        name = type(node).__name__
        if name in _STRUCT:
            found.add("node:" + name)
        if isinstance(node, (_ast.BinOp, _ast.UnaryOp, _ast.AugAssign)):
            found.add("op:" + type(node.op).__name__)
        elif isinstance(node, _ast.Compare):
            found.update("op:" + type(op).__name__ for op in node.ops)
        elif isinstance(node, _ast.BoolOp):
            found.add("op:" + type(node.op).__name__)
        elif isinstance(node, _ast.Call) and isinstance(node.func, _ast.Name) and hasattr(_b, node.func.id):
            found.add("call:" + node.func.id)
        elif isinstance(node, _ast.Attribute):
            if node.attr not in own:
                found.add("attr:" + node.attr)
        elif isinstance(node, _ast.Import):
            found.update("import:" + alias.name.split(".")[0] for alias in node.names)
        elif isinstance(node, _ast.ImportFrom):
            found.add("import:" + (node.module or "").split(".")[0])
        elif isinstance(node, _ast.Constant):
            found.add("const:" + type(node.value).__name__)
    return sorted(found)
try:
    print(_json.dumps(_features(${py(code)}, ${py(context)})))
except SyntaxError:
    print("syntax-error")
`;
}
