/**
 * The RISC-V machine that runs assembly code, written in Python so that it
 * runs on the same interpreter as every other code question: in the browser's
 * Python worker for the learner, and under Node before a lesson is merged.
 *
 * It assembles RV32I with the M extension and the usual pseudo-instructions,
 * .text and .data sections with .word, .half, .byte, .ascii, .asciz, .string,
 * .space and .align, and runs the result on a machine with RARS's memory
 * layout and system calls: a7 = 1 prints a0 as a signed integer, 4 the string
 * at a0, 11 the character in a0, 34 a0 in hexadecimal, 35 in binary and 36 as
 * unsigned; 10 and 93 exit. Execution starts at main, or at the first
 * instruction, and ends on running past the last instruction, on returning
 * from main, or on an exit call. Errors name the source line.
 */
export const RV32 = String.raw`import re as _re


class AssemblyError(Exception):
    pass


_LABEL = _re.compile(r"^([A-Za-z_][A-Za-z0-9_.]*)\s*:(.*)$")


_ABI = ["zero", "ra", "sp", "gp", "tp", "t0", "t1", "t2", "s0", "s1", "a0", "a1", "a2", "a3", "a4", "a5", "a6", "a7",
        "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10", "s11", "t3", "t4", "t5", "t6"]
_REGS = {name: i for i, name in enumerate(_ABI)}
_REGS["fp"] = 8
_REGS.update({"x%d" % i: i for i in range(32)})
_TEXT = 0x00400000
_DATA = 0x10010000
_STACK = 0x7FFFEFFC
_LIMIT = 1_000_000
_MASK = 0xFFFFFFFF
_SAVED = ["sp", "s0", "s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10", "s11"]

_R = {"add", "sub", "and", "or", "xor", "sll", "srl", "sra", "slt", "sltu", "mul", "mulh", "mulhu", "div", "divu", "rem", "remu"}
_I = {"addi", "andi", "ori", "xori", "slti", "sltiu", "slli", "srli", "srai"}
_LOADS = {"lb": 1, "lh": 2, "lw": 4, "lbu": 1, "lhu": 2}
_STORES = {"sb": 1, "sh": 2, "sw": 4}
_BRANCH = {"beq", "bne", "blt", "bge", "bltu", "bgeu"}
_SWAPPED = {"bgt": "blt", "ble": "bge", "bgtu": "bltu", "bleu": "bgeu"}
_ZERO = {"beqz": ("beq", 0), "bnez": ("bne", 0), "bgez": ("bge", 0), "bltz": ("blt", 0), "blez": ("bge", 1), "bgtz": ("blt", 1)}
_ESCAPES = {"n": "\n", "t": "\t", "0": "\0", "\\": "\\", '"': '"', "'": "'"}


def _signed(value):
    value &= _MASK
    return value - (1 << 32) if value & 0x80000000 else value


def _strip_comment(line):
    quote = None
    for i, ch in enumerate(line):
        if quote:
            if ch == "\\":
                continue
            if ch == quote and line[i - 1] != "\\":
                quote = None
        elif ch in "\"'":
            quote = ch
        elif ch == "#":
            return line[:i]
    return line


def _split_operands(text):
    parts, current, quote = [], "", None
    for i, ch in enumerate(text):
        if quote:
            current += ch
            if ch == quote and text[i - 1] != "\\":
                quote = None
        elif ch in "\"'":
            quote = ch
            current += ch
        elif ch == ",":
            parts.append(current.strip())
            current = ""
        else:
            current += ch
    if current.strip():
        parts.append(current.strip())
    return parts


def _unescape(body, where):
    out, i = "", 0
    while i < len(body):
        ch = body[i]
        if ch == "\\":
            if i + 1 >= len(body) or body[i + 1] not in _ESCAPES:
                raise AssemblyError(where + "unknown escape in a string")
            out += _ESCAPES[body[i + 1]]
            i += 2
        else:
            out += ch
            i += 1
    return out


class Program:
    def __init__(self, source):
        self.source = source
        self.code = []
        self.data = bytearray()
        self.labels = {}
        self.mnemonics = set()
        self._assemble()

    def _assemble(self):
        lines = self.source.split("\n")
        items = []
        section = "text"
        text_at = _TEXT
        for number, raw in enumerate(lines, 1):
            where = "line %d: " % number
            line = _strip_comment(raw).strip()
            while True:
                found = _LABEL.match(line)
                if not found:
                    break
                name = found.group(1)
                if name in self.labels:
                    raise AssemblyError(where + "the label " + name + " is defined twice")
                self.labels[name] = text_at if section == "text" else _DATA + len(self.data)
                line = found.group(2).strip()
            if not line:
                continue
            parts = line.split(None, 1)
            op = parts[0].lower()
            args = _split_operands(parts[1]) if len(parts) > 1 else []
            self.mnemonics.add(op)
            if op.startswith("."):
                if op == ".text":
                    section = "text"
                elif op == ".data":
                    section = "data"
                elif op in (".globl", ".global", ".section", ".type", ".size", ".file"):
                    pass
                elif section != "data" and op not in (".align",):
                    raise AssemblyError(where + op + " belongs in the .data section")
                else:
                    items.append(("data", op, args, number))
                    self._data_directive(op, args, where, sized=True)
                continue
            if section != "text":
                raise AssemblyError(where + "the instruction " + op + " is in the .data section; put .text before it")
            count = self._size(op, args, where)
            items.append(("ins", op, args, number, text_at))
            text_at += 4 * count
        self.end = text_at
        self.data = bytearray()
        for item in items:
            if item[0] == "data":
                self._data_directive(item[1], item[2], "line %d: " % item[3], sized=False)
            else:
                _, op, args, number, at = item
                self._expand(op, args, number, at)

    def _value(self, token, where, allow_label=True):
        token = token.strip()
        if len(token) >= 3 and token[0] == "'" and token[-1] == "'":
            text = _unescape(token[1:-1], where)
            if len(text) != 1:
                raise AssemblyError(where + "a character literal holds one character")
            return ord(text)
        try:
            return int(token, 0)
        except ValueError:
            pass
        if allow_label and token in self.labels:
            return self.labels[token]
        if allow_label and token and (token[0].isalpha() or token[0] in "_."):
            raise AssemblyError(where + "there is no label called " + token)
        raise AssemblyError(where + "expected a number, not " + repr(token))

    def _data_directive(self, op, args, where, sized):
        if op in (".word", ".half", ".byte"):
            width = {".word": 4, ".half": 2, ".byte": 1}[op]
            if not args:
                raise AssemblyError(where + op + " needs at least one value")
            for arg in args:
                value = 0 if sized else self._value(arg, where)
                self.data += (value & ((1 << (8 * width)) - 1)).to_bytes(width, "little")
        elif op in (".ascii", ".asciz", ".string"):
            if len(args) != 1 or len(args[0]) < 2 or args[0][0] != '"' or args[0][-1] != '"':
                raise AssemblyError(where + op + ' needs one string in double quotes')
            text = _unescape(args[0][1:-1], where)
            self.data += text.encode("utf-8") + (b"\0" if op != ".ascii" else b"")
        elif op in (".space", ".zero"):
            if len(args) != 1:
                raise AssemblyError(where + op + " needs a number of bytes")
            self.data += bytes(self._value(args[0], where, allow_label=False))
        elif op == ".align":
            if len(args) != 1:
                raise AssemblyError(where + ".align needs a power of two")
            step = 1 << self._value(args[0], where, allow_label=False)
            while len(self.data) % step:
                self.data.append(0)
        else:
            raise AssemblyError(where + "unknown directive " + op)

    def _size(self, op, args, where):
        if op == "li":
            if len(args) != 2:
                raise AssemblyError(where + "li needs a register and a number")
            value = self._value(args[1], where, allow_label=False)
            if -(1 << 31) <= value <= _MASK:
                value = _signed(value)
            return 1 if -2048 <= value <= 2047 else 2
        if op in _LOADS and len(args) == 2 and "(" not in args[1]:
            return 2
        if op == "la":
            return 2
        if op in _R or op in _I or op in _LOADS or op in _STORES or op in _BRANCH or op in _SWAPPED or op in _ZERO:
            return 1
        if op in ("lui", "auipc", "jal", "jalr", "ecall", "mv", "not", "neg", "nop", "j", "jr", "ret", "call", "tail", "seqz", "snez", "sltz", "sgtz"):
            return 1
        raise AssemblyError(where + "unknown instruction " + op)

    def _reg(self, token, where):
        name = token.strip().lower()
        if name not in _REGS:
            raise AssemblyError(where + repr(token.strip()) + " is not a register")
        return _REGS[name]

    def _need(self, op, args, count, where, shape):
        if len(args) != count:
            raise AssemblyError(where + op + " takes " + shape)

    def _imm(self, token, where, bits, op):
        value = self._value(token, where, allow_label=False)
        low, high = -(1 << (bits - 1)), (1 << (bits - 1)) - 1
        if not low <= value <= high:
            raise AssemblyError(where + "the immediate %d does not fit in %d bits for %s; load it into a register with li first" % (value, bits, op))
        return value

    def _mem(self, token, where, op):
        token = token.strip()
        if "(" not in token or not token.endswith(")"):
            raise AssemblyError(where + op + " needs a memory operand such as 0(a0)")
        offset, reg = token[:-1].split("(", 1)
        value = self._imm(offset, where, 12, op) if offset.strip() else 0
        return value, self._reg(reg, where)

    def _target(self, token, where):
        token = token.strip()
        if token not in self.labels:
            raise AssemblyError(where + "there is no label called " + token)
        return self.labels[token]

    def _emit(self, *ins):
        self.code.append(ins)

    def _expand(self, op, args, line, at):
        where = "line %d: " % line
        e = lambda *rest: self._emit(line, *rest)
        if op in _R:
            self._need(op, args, 3, where, "three registers")
            e(op, self._reg(args[0], where), self._reg(args[1], where), self._reg(args[2], where), 0)
        elif op in _I:
            self._need(op, args, 3, where, "two registers and a number")
            bits = 12
            value = self._value(args[2], where, allow_label=False)
            if op in ("slli", "srli", "srai"):
                if not 0 <= value <= 31:
                    raise AssemblyError(where + "a shift amount must be from 0 to 31")
            else:
                value = self._imm(args[2], where, bits, op)
            e(op, self._reg(args[0], where), self._reg(args[1], where), 0, value)
        elif op in _LOADS and len(args) == 2 and "(" not in args[1]:
            rd = self._reg(args[0], where)
            address = self._target(args[1], where)
            low = _signed(address << 20) >> 20
            e("lui", rd, 0, 0, (address - low) & _MASK)
            e(op, rd, rd, 0, low)
        elif op in _LOADS:
            self._need(op, args, 2, where, "a register and a memory operand such as 0(a0)")
            offset, base = self._mem(args[1], where, op)
            e(op, self._reg(args[0], where), base, 0, offset)
        elif op in _STORES:
            self._need(op, args, 2, where, "a register and a memory operand such as 0(a0)")
            offset, base = self._mem(args[1], where, op)
            e(op, 0, base, self._reg(args[0], where), offset)
        elif op in _BRANCH:
            self._need(op, args, 3, where, "two registers and a label")
            e(op, 0, self._reg(args[0], where), self._reg(args[1], where), self._target(args[2], where))
        elif op in _SWAPPED:
            self._need(op, args, 3, where, "two registers and a label")
            e(_SWAPPED[op], 0, self._reg(args[1], where), self._reg(args[0], where), self._target(args[2], where))
        elif op in _ZERO:
            self._need(op, args, 2, where, "a register and a label")
            real, swap = _ZERO[op]
            reg = self._reg(args[0], where)
            target = self._target(args[1], where)
            e(real, 0, 0 if swap else reg, reg if swap else 0, target)
        elif op == "lui" or op == "auipc":
            self._need(op, args, 2, where, "a register and a number")
            value = self._value(args[1], where, allow_label=False)
            if not 0 <= value <= 0xFFFFF:
                raise AssemblyError(where + op + " takes a 20-bit number, from 0 to 0xFFFFF")
            e(op, self._reg(args[0], where), 0, 0, value << 12 if op == "lui" else (at + (value << 12)) & _MASK)
        elif op == "li":
            rd = self._reg(args[0], where)
            value = self._value(args[1], where, allow_label=False)
            if not -(1 << 31) <= value <= _MASK:
                raise AssemblyError(where + "%d does not fit in 32 bits" % value)
            value = _signed(value)
            if -2048 <= value <= 2047:
                e("addi", rd, 0, 0, value)
            else:
                low = _signed(value << 20) >> 20
                e("lui", rd, 0, 0, (value - low) & _MASK)
                e("addi", rd, rd, 0, low)
        elif op == "la":
            self._need(op, args, 2, where, "a register and a label")
            rd = self._reg(args[0], where)
            address = self._target(args[1], where)
            low = _signed(address << 20) >> 20
            e("lui", rd, 0, 0, (address - low) & _MASK)
            e("addi", rd, rd, 0, low)
        elif op == "mv":
            self._need(op, args, 2, where, "two registers")
            e("addi", self._reg(args[0], where), self._reg(args[1], where), 0, 0)
        elif op == "not":
            self._need(op, args, 2, where, "two registers")
            e("xori", self._reg(args[0], where), self._reg(args[1], where), 0, -1)
        elif op == "neg":
            self._need(op, args, 2, where, "two registers")
            e("sub", self._reg(args[0], where), 0, self._reg(args[1], where), 0)
        elif op == "seqz":
            self._need(op, args, 2, where, "two registers")
            e("sltiu", self._reg(args[0], where), self._reg(args[1], where), 0, 1)
        elif op == "snez":
            self._need(op, args, 2, where, "two registers")
            e("sltu", self._reg(args[0], where), 0, self._reg(args[1], where), 0)
        elif op == "sltz":
            self._need(op, args, 2, where, "two registers")
            e("slt", self._reg(args[0], where), self._reg(args[1], where), 0, 0)
        elif op == "sgtz":
            self._need(op, args, 2, where, "two registers")
            e("slt", self._reg(args[0], where), 0, self._reg(args[1], where), 0)
        elif op == "nop":
            self._need(op, args, 0, where, "nothing")
            e("addi", 0, 0, 0, 0)
        elif op == "j" or op == "tail":
            self._need(op, args, 1, where, "a label")
            e("jal", 0, 0, 0, self._target(args[0], where))
        elif op == "call":
            self._need(op, args, 1, where, "a label")
            e("jal", 1, 0, 0, self._target(args[0], where))
        elif op == "jal":
            if len(args) == 1:
                e("jal", 1, 0, 0, self._target(args[0], where))
            else:
                self._need(op, args, 2, where, "a register and a label")
                e("jal", self._reg(args[0], where), 0, 0, self._target(args[1], where))
        elif op == "jr":
            self._need(op, args, 1, where, "a register")
            e("jalr", 0, self._reg(args[0], where), 0, 0)
        elif op == "ret":
            self._need(op, args, 0, where, "nothing")
            e("jalr", 0, 1, 0, 0)
        elif op == "jalr":
            if len(args) == 1 and "(" not in args[0]:
                e("jalr", 1, self._reg(args[0], where), 0, 0)
            elif len(args) == 2 and "(" in args[1]:
                offset, base = self._mem(args[1], where, op)
                e("jalr", self._reg(args[0], where), base, 0, offset)
            else:
                self._need(op, args, 3, where, "a register, a register and a number")
                e("jalr", self._reg(args[0], where), self._reg(args[1], where), 0, self._imm(args[2], where, 12, op))
        elif op == "ecall":
            self._need(op, args, 0, where, "nothing")
            e("ecall", 0, 0, 0, 0)


class Machine:
    def __init__(self, program, limit=_LIMIT):
        self.program = program
        self.limit = limit
        self.regs = [0] * 32
        self.regs[2] = _STACK
        self.regs[3] = 0x10008000
        self.regs[1] = program.end
        self.memory = {}
        for i, b in enumerate(program.data):
            self.memory[_DATA + i] = b
        self.output = ""
        self.steps = 0
        self.exit_code = None
        self.line = 0

    def reg(self, name):
        return _signed(self.regs[_REGS[name.lower()]])

    def set(self, name, value):
        index = _REGS[name.lower()]
        if index:
            self.regs[index] = value & _MASK

    def _address(self, address, width, verb):
        if address < 0x10000:
            raise AssemblyError("line %d: %s address 0x%x, which is not memory the program may use" % (self.line, verb, address))
        if address % width:
            raise AssemblyError("line %d: %s address 0x%x, which is not a multiple of %d" % (self.line, verb, address, width))

    def load(self, address, width, signed=True):
        address &= _MASK
        self._address(address, width, "reads")
        value = int.from_bytes(bytes(self.memory.get(address + i, 0) for i in range(width)), "little")
        if signed and value >> (8 * width - 1):
            value -= 1 << (8 * width)
        return value & _MASK

    def store(self, address, width, value):
        address &= _MASK
        self._address(address, width, "writes to")
        if _TEXT <= address < self.program.end:
            raise AssemblyError("line %d: writes to address 0x%x, which holds the program's own instructions" % (self.line, address))
        for i, b in enumerate((value & ((1 << (8 * width)) - 1)).to_bytes(width, "little")):
            self.memory[address + i] = b

    def string(self, address):
        out = bytearray()
        while len(out) < 10000:
            b = self.memory.get(address + len(out), 0)
            if b == 0:
                break
            out.append(b)
        return out.decode("utf-8", "replace")

    def run(self, start=None):
        program = self.program
        pc = program.labels.get("main", _TEXT) if start is None else start
        regs = self.regs
        code = program.code
        while True:
            if pc == program.end:
                return self
            index = (pc - _TEXT) >> 2
            if pc % 4 or not 0 <= index < len(code):
                raise AssemblyError("line %d: jumped to address 0x%x, which is not an instruction of the program" % (self.line, pc & _MASK))
            line, op, rd, rs1, rs2, imm = code[index]
            self.line = line
            self.steps += 1
            if self.steps > self.limit:
                raise AssemblyError("line %d: stopped after %s instructions; look for a loop that never ends" % (line, format(self.limit, ",")))
            a, b = regs[rs1], regs[rs2]
            next_pc = pc + 4
            if op == "addi":
                value = a + imm
            elif op == "add":
                value = a + b
            elif op == "sub":
                value = a - b
            elif op in _BRANCH:
                if op == "beq":
                    taken = a == b
                elif op == "bne":
                    taken = a != b
                elif op == "blt":
                    taken = _signed(a) < _signed(b)
                elif op == "bge":
                    taken = _signed(a) >= _signed(b)
                elif op == "bltu":
                    taken = a < b
                else:
                    taken = a >= b
                if taken:
                    next_pc = imm
                pc = next_pc
                continue
            elif op in _LOADS:
                value = self.load(a + imm, _LOADS[op], not op.endswith("u"))
            elif op in _STORES:
                self.store(a + imm, _STORES[op], b)
                pc = next_pc
                continue
            elif op == "jal":
                value = next_pc
                next_pc = imm
            elif op == "jalr":
                value = next_pc
                next_pc = (a + imm) & ~1 & _MASK
            elif op == "lui" or op == "auipc":
                value = imm
            elif op == "and":
                value = a & b
            elif op == "or":
                value = a | b
            elif op == "xor":
                value = a ^ b
            elif op == "andi":
                value = a & (imm & _MASK)
            elif op == "ori":
                value = a | (imm & _MASK)
            elif op == "xori":
                value = a ^ (imm & _MASK)
            elif op == "sll":
                value = a << (b & 31)
            elif op == "srl":
                value = a >> (b & 31)
            elif op == "sra":
                value = _signed(a) >> (b & 31)
            elif op == "slli":
                value = a << imm
            elif op == "srli":
                value = a >> imm
            elif op == "srai":
                value = _signed(a) >> imm
            elif op == "slt":
                value = int(_signed(a) < _signed(b))
            elif op == "sltu":
                value = int(a < b)
            elif op == "slti":
                value = int(_signed(a) < imm)
            elif op == "sltiu":
                value = int(a < (imm & _MASK))
            elif op == "mul":
                value = a * b
            elif op == "mulh":
                value = (_signed(a) * _signed(b)) >> 32
            elif op == "mulhu":
                value = (a * b) >> 32
            elif op == "div" or op == "rem":
                x, y = _signed(a), _signed(b)
                if y == 0:
                    value = -1 if op == "div" else x
                elif x == -(1 << 31) and y == -1:
                    value = x if op == "div" else 0
                else:
                    q = abs(x) // abs(y) * (1 if (x < 0) == (y < 0) else -1)
                    value = q if op == "div" else x - q * y
            elif op == "divu" or op == "remu":
                if b == 0:
                    value = _MASK if op == "divu" else a
                else:
                    value = a // b if op == "divu" else a % b
            elif op == "ecall":
                if self._ecall():
                    return self
                pc = next_pc
                continue
            else:
                raise AssemblyError("line %d: cannot run %s" % (line, op))
            if rd:
                regs[rd] = value & _MASK
            pc = next_pc

    def _ecall(self):
        service = self.regs[17]
        a0 = self.regs[10]
        if service == 1:
            self.output += str(_signed(a0))
        elif service == 4:
            self.output += self.string(a0)
        elif service == 11:
            self.output += chr(a0 & 0xFF)
        elif service == 34:
            self.output += "0x%08x" % a0
        elif service == 35:
            self.output += "0b" + format(a0, "032b")
        elif service == 36:
            self.output += str(a0)
        elif service == 10:
            self.exit_code = 0
            return True
        elif service == 93:
            self.exit_code = _signed(a0)
            return True
        else:
            raise AssemblyError("line %d: ecall with a7 = %d is not a service this machine offers" % (self.line, _signed(service)))
        return False


def assemble(source):
    return Program(source)


def _poke(machine, program, words):
    for label, values in (words or {}).items():
        if label not in program.labels:
            raise AssemblyError("there is no label called " + label)
        if isinstance(values, int):
            values = [values]
        for i, value in enumerate(values):
            machine.store(program.labels[label] + 4 * i, 4, value)


class Run:
    def __init__(self, machine):
        self.machine = machine
        self.output = machine.output
        self.steps = machine.steps
        self.exit_code = machine.exit_code

    def reg(self, name):
        return self.machine.reg(name)

    def word(self, where, index=0):
        address = self.machine.program.labels[where] if isinstance(where, str) else where
        return _signed(self.machine.load(address + 4 * index, 4))

    def byte(self, where, index=0):
        address = self.machine.program.labels[where] if isinstance(where, str) else where
        return self.machine.load(address + index, 1, False)

    def string(self, where):
        address = self.machine.program.labels[where] if isinstance(where, str) else where
        return self.machine.string(address)


def run_program(source, words=None, regs=None, limit=_LIMIT):
    program = Program(source)
    machine = Machine(program, limit)
    _poke(machine, program, words)
    for name, value in (regs or {}).items():
        machine.set(name, value)
    machine.run()
    return Run(machine)


def call_function(source, label, args=(), words=None, limit=_LIMIT):
    program = Program(source)
    if label not in program.labels:
        raise AssemblyError("there is no label called " + label)
    if len(args) > 8:
        raise AssemblyError("at most eight arguments go in registers a0 to a7")
    machine = Machine(program, limit)
    _poke(machine, program, words)
    for i, value in enumerate(args):
        machine.set("a%d" % i, value)
    sentinel = {}
    for i, name in enumerate(_SAVED[1:]):
        sentinel[name] = 0x5A5A0000 + i
        machine.set(name, sentinel[name])
    sentinel["sp"] = machine.regs[2]
    machine.run(program.labels[label])
    result = Run(machine)
    result.value = machine.reg("a0")
    result.clobbered = [name for name in _SAVED if machine.regs[_REGS[name]] != sentinel[name] & _MASK]
    return result
`;
