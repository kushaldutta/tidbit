-- Migration 062: CS 61C — Great Ideas in Computer Architecture, full rebuild.
-- UC Berkeley Fall 2026: Dan Garcia (MoWeFr 11:00, Gateway 1210).
-- Catalog: internal organization of digital computers; machine architecture;
-- support for HLL (logic, arithmetic, instruction sequencing) and OS (I/O,
-- interrupts, memory management, process switching); logic design; tradeoffs.
-- Prereq: 61A plus 61B/61BL (or equivalent).
-- Texts: Patterson & Hennessy, Computer Organization and Design RISC-V
-- Edition (2e); K&R for C; Barroso/Hölzle for warehouse-scale computing.
-- Sequence follows recent 61C calendars (cs61c.org / notes.cs61c.org).

DELETE FROM public.saved_tidbits
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'cs61c');

DELETE FROM public.tidbits
WHERE category_id = 'cs61c';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'cs61c');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'cs61c');

UPDATE public.decks
SET title = 'CS 61C',
    description = 'Machine Structures — Garcia: C, RISC-V, caches, VM, parallelism',
    cover_emoji = '⚙️'
WHERE slug = 'cs61c';

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('c-memory',        'C, Pointers & Memory',
   'Stack vs heap, malloc, arrays, K&R (early 61C)', 0),
  ('numbers',         'Number Representation',
   'Unsigned, two''s complement, IEEE 754, bitwise', 1),
  ('riscv-isa',       'RISC-V ISA & Assembly',
   'RV32I registers, formats, loads/stores, pseudos', 2),
  ('calling-conv',    'CALL, Stack & Functions',
   'RISC-V ABI, ra/sp, caller vs callee saved', 3),
  ('digital-logic',   'Digital Logic & SDS',
   'Gates, mux, ALU, flip-flops, FSMs, Logisim', 4),
  ('datapath',        'Datapath & Control',
   'Single-cycle RISC-V CPU (Project 3)', 5),
  ('pipelining',      'Pipelining & Hazards',
   'Five stages, forwarding, stalls, branches', 6),
  ('caches',          'Caches & Memory Hierarchy',
   'Locality, AMAT, associativity, blocking', 7),
  ('virtual-memory',  'Virtual Memory & I/O',
   'Pages, page tables, TLB, faults, interrupts', 8),
  ('parallelism',     'Parallelism, WSC & Dependability',
   'SIMD, OpenMP, Amdahl, MapReduce, RAID, Hamming', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'cs61c'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. C, Pointers & Memory
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'c-memory'
CROSS JOIN (VALUES
  (0,  'CS 61C (Garcia) in one sentence',
       'How a C program becomes bits on a RISC-V machine: numbers, assembly, a CPU you can draw, then caches, virtual memory, and parallelism so it actually goes fast. 61A is Python/Scheme; 61B is Java data structures; 61C is the hardware/software interface (Patterson/Hennessy).'),
  (1,  'C vs. Java for 61C',
       'No garbage collector, no bounds checks, no objects-as-default. You own malloc/free. Arrays are not objects; they decay to pointers. Undefined behavior (use-after-free, overflow) is a real exam and Valgrind topic, not a theoretical footnote.'),
  (2,  'stack vs. heap vs. static',
       'Stack: locals, grows down, automatic lifetime, fast. Heap: malloc/free, lifetime you control, fragmentation. Static/.data/.bss: globals and string literals, live the whole program. Mixing them up (returning a pointer to a local) is a classic 61C bug.'),
  (3,  'pointer, star, and ampersand',
       'A pointer stores an address. star p is the object at that address. ampersand x is the address of x. Type int-star means "pointer to int." Drawing the box-and-arrow picture is how Garcia wants you to debug, not by staring at hex dumps first.'),
  (4,  'arrays decay to pointers',
       'In almost every expression, T a[N] becomes a pointer to a[0]. a[i] is star(a+i). sizeof(a) in the declaring scope is the whole array; sizeof(a) after passing to a function is the pointer width. Never use sizeof to get a callee''s array length.'),
  (5,  'pointer arithmetic',
       'p+1 advances by sizeof(*p) bytes, not by 1 byte (unless p is char-star). Casting to char-star is how you walk raw bytes. Off-by-one here is how you smash the stack or miss a cache line in later projects.'),
  (6,  'malloc, free, and NULL',
       'malloc(n) returns uninitialized heap (or NULL on failure — check it). calloc zeros. free once; never free stack or a middle-of-block pointer. Use-after-free and double-free are undefined. Pair every malloc with a free on every path (including errors).'),
  (7,  'structs and alignment',
       'A struct packs fields in order with padding so each field meets its alignment. sizeof(struct) can be larger than the sum of field sizes. Arrays of structs vs. struct of arrays changes cache behavior later in the course — 61C plants that seed in C week.'),
  (8,  'C strings',
       'char-star to a NUL-terminated sequence. strlen does not count the NUL; you still need that extra byte in malloc. strcpy vs. strncpy vs. snprintf. String literals live in read-only memory — writing to them crashes.'),
  (9,  'Valgrind / memory errors',
       '61C labs expect you to run Valgrind: invalid reads/writes, leaks, use of uninitialized values. If it only "works on my machine," you still have UB. Fix the first error; later ones are often cascade.'),
  (10, 'compilation pipeline',
       'Preprocessor (hash-include, hash-define) then compiler to assembly, assembler to object, linker to executable. gcc -c vs. gcc with several .c files. A header should declare; a .c should define. Multiple definition of main is a linker error, not a C syntax error.'),
  (11, 'endianness',
       'Little-endian (x86, RISC-V): least-significant byte at the lowest address. Big-endian: the opposite. A 32-bit 0x12345678 in little-endian memory is 78 56 34 12. Network protocols often specify big-endian ("network order").'),
  (12, 'pass-by-value in C',
       'C copies the argument. To mutate the caller''s object, pass a pointer (or for arrays, they already decay). You cannot write swap(a,b) on ints without pointers. This is the same Java-reference story, except C makes the star explicit.'),
  (13, 'typedef and function pointers (light)',
       'typedef hides a type name (often a struct tag or a pointer-to-function). qsort takes a comparator function pointer — 61C''s taste of higher-order C before RISC-V CALL makes the same idea with ra.'),
  (14, 'common C bugs on 61C exams',
       'Returning a local. Off-by-one in malloc(strlen) without +1. Comparing pointers when you meant contents (strcmp). Assuming sizeof(int)==4 on every machine (it is 4 in this class''s RISC-V/gcc, but the language does not promise it).')
) AS c(pos, front, back)
WHERE d.slug = 'cs61c'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 2. Number Representation
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'numbers'
CROSS JOIN (VALUES
  (0,  'bits, bytes, hex',
       'A bit is 0 or 1. A byte is 8 bits. Hex is 4 bits per digit (0-F), so two hex digits per byte. 61C exam arithmetic is almost always hex or binary, not decimal. Know 2^10 is about 10^3 (KiB vs KB: 1024 vs 1000).'),
  (1,  'unsigned integers',
       'n-bit unsigned range is 0 through 2^n - 1. Addition wraps mod 2^n (well-defined in C for unsigned). Comparison is bitwise magnitude. There is no "negative unsigned" — a high bit just means a large number.'),
  (2,  'two''s complement',
       'The representation 61C (and RISC-V) uses for signed ints. Negate by invert-bits-then-add-1. Range: -2^{n-1} through 2^{n-1}-1. One zero. The MSB is the sign bit, but value is -MSB * 2^{n-1} plus the rest unsigned.'),
  (3,  'why two''s complement',
       'The same adder hardware works for signed and unsigned. Sign-magnitude wastes a representation on -0 and needs extra logic. Ones'' complement also has -0. Garcia: "addition does not care about the interpretation until you branch on signed vs unsigned."'),
  (4,  'sign extension vs. zero extension',
       'Moving a narrower value into a wider register: signed uses sign extension (copy the sign bit leftward); unsigned uses zero extension. RISC-V lb vs lbu. Getting this wrong on a load is a midterm classic.'),
  (5,  'bitwise operations',
       'AND masks bits off. OR sets bits. XOR toggles (and is its own inverse). NOT flips all bits. Shifts: logical left; logical right fills 0; arithmetic right copies the sign bit. Prefer masks over magic decimals.'),
  (6,  'shifts vs. multiply/divide',
       'Left shift by k multiplies by 2^k (if it fits). Logical right shift divides unsigned by 2^k. Arithmetic right shift is "almost" signed divide toward -infinity, not toward zero — C signed divide truncates toward zero, so they are not the same for negatives.'),
  (7,  'IEEE 754 binary32 (float)',
       '1 sign bit, 8 exponent bits (bias 127), 23 fraction bits with an implicit leading 1 for normals. Value is (-1)^s * 1.frac * 2^{exp-127}. binary64 (double) is 1+11+52, bias 1023. 61C exams love packing/unpacking a hex float.'),
  (8,  'special values: Inf, NaN, denorms',
       'Exponent all-ones and frac 0: plus/minus infinity. Exp all-ones and frac nonzero: NaN (not a number; NaN compares unequal to everything, including itself). Exp all-zeros: zeros and denorms (no implicit 1; they fill the gap near zero).'),
  (9,  'rounding and exactness',
       'Most decimals are not exact in binary (0.1). Default rounding is round-to-nearest-even. Adding a tiny float to a huge float can be a no-op (the tiny never makes it into the significand). Sum left-to-right vs. pairwise can differ.'),
  (10, 'bias in the exponent',
       'Stored exp 0 and 255 (for binary32) are special; 1 through 254 encode true exponents -126 through 127. Bias 127 lets hardware compare exponents as unsigned magnitudes. Do not store a two''s-complement exponent in the IEEE field.'),
  (11, 'signed vs. unsigned comparison traps',
       'In C, if either operand is unsigned, the other is converted to unsigned. A negative int compared to an unsigned looks huge. RISC-V has blt/bltu and slt/sltu for the same distinction.'),
  (12, 'overflow vs. carry',
       'Unsigned wrap is carry-out of the MSB. Signed overflow is when the true mathematical result does not fit (two positives make a negative, etc.). RISC-V add does not trap; you detect overflow in software if you care (P&H).'),
  (13, 'fixed point (light)',
       'Treat an integer as having an implied binary point (e.g. 16.16). Cheaper than float on tiny cores; used in audio/DSP. 61C wants you to see that "the bits do not know they are a fraction" — interpretation is convention.'),
  (14, 'exam hex drills',
       'Convert, negate in two''s complement, mask a field, decode a float from hex. Show bitwise work, not a calculator. If the problem says "8-bit two''s complement," the answer 0x80 is -128, the most-negative value, which has no positive counterpart.')
) AS c(pos, front, back)
WHERE d.slug = 'cs61c'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 3. RISC-V ISA & Assembly
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'riscv-isa'
CROSS JOIN (VALUES
  (0,  'ISA vs. microarchitecture',
       'The ISA is the contract: instructions, registers, memory model (what software may assume). Microarchitecture is how you build it (single-cycle, pipelined, out-of-order). Same RISC-V binary can run on a tiny core or a huge one. 61C builds both views.'),
  (1,  'RISC vs. CISC (Patterson story)',
       'RISC: few simple instructions, lots of registers, load/store only for memory. CISC: rich ops, memory-to-memory, variable-length encodings. RISC-V was born at Berkeley (Patterson, Asanovic) as an open ISA. 61C switched from MIPS to RISC-V years ago.'),
  (2,  'RV32I register file',
       '32 registers x0-x31, each 32 bits (RV64: 64 bits). x0 is hardwired zero; writes to it vanish. ABI names: zero, ra, sp, gp, tp, t0-t2, s0/fp, s1, a0-a7, s2-s11, t3-t6. You will live in a-registers and s-registers.'),
  (3,  'only loads and stores touch memory',
       'add, sub, and, or, sll, ... operate on registers. lw/lh/lb (and unsigned variants) read memory; sw/sh/sb write. Address is rs1 + imm. Alignment: lw wants a 4-byte-aligned address on many cores (61C usually assumes this).'),
  (4,  'R-type format',
       'opcode, rd, funct3, rs1, rs2, funct7. Used by register-register ALU ops (add, sub, sll, slt, xor, srl, sra, or, and, and mul in M extension). Distinguishing add vs sub is funct7, not the opcode.'),
  (5,  'I-type and immediates',
       'opcode, rd, funct3, rs1, 12-bit signed imm. Used by addi, loads, jalr, and the shift-immediates (shamt in the low bits). The 12-bit imm is sign-extended. lui/auipc exist because 12 bits is not a whole 32-bit constant.'),
  (6,  'S-type and B-type',
       'Stores: imm split around the instruction, rs1+rs2, no rd. Branches: B-type, compare rs1 and rs2, PC-relative offset (multiples of 2; RISC-V has no branch delay slot). beq, bne, blt, bge, bltu, bgeu.'),
  (7,  'U-type and J-type',
       'lui: load 20 upper bits into rd (low 12 become 0). auipc: same but added to PC (position-independent). jal: jump-and-link, 20-bit PC-relative, saves PC+4 into rd (usually ra). Together they build long jumps and address constants.'),
  (8,  'jalr and returns',
       'jalr rd, imm(rs1): jump to rs1+imm (clearing the low bit), save PC+4 in rd. ret is jalr x0, 0(ra). Calls are jal ra, label or auipc+jalr for far calls. This is why ra is sacred until you save it.'),
  (9,  'pseudoinstructions',
       'li, mv, j, jr, ret, bgt, nop (addi x0, x0, 0) are assembler sugar. The exam may ask "this li expands to lui+addi." Do not assume a pseudo is one machine instruction. Machine language is the 32-bit encodings only.'),
  (10, 'PC and sequential execution',
       'The program counter holds the address of the current instruction. Default next PC is PC+4 (32-bit instructions; compressed 16-bit C-extension exists but 61C is mostly uncompressed). Branches/jumps override that.'),
  (11, 'machine code vs. assembly vs. C',
       'gcc -S emits assembly; objdump -d disassembles. One C line can be many instructions (especially with -O0). 61C wants you to read a dump and circle the loop, the call, the load. Project 2 is writing RISC-V by hand.'),
  (12, 'RV32 vs. RV64',
       'XLEN is 32 or 64. lw still loads 32 bits; ld/sd appear in RV64. Immediates and encodings stay 32-bit instruction words. 61C is usually RV32 in Logisim Project 3 and RV64 in some Venus/RISC-V simulators — read the spec for that assignment.'),
  (13, 'ecall / environment',
       'ecall traps to the environment (OS or Venus simulator) for print, read, exit. Arguments follow the ABI (a7 = syscall number in many teaching simulators). This is your first glimpse of privilege: user code cannot talk to devices directly.'),
  (14, 'common RISC-V exam bugs',
       'Using x0 as a destination and wondering why the add "did nothing." Forgetting sign extension on I-type. Treating a branch offset as bytes vs. instructions. Confusing blt (signed) with bltu. Writing to ra without saving it, then ret-ing to nowhere.')
) AS c(pos, front, back)
WHERE d.slug = 'cs61c'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 4. CALL, Stack & Functions
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'calling-conv'
CROSS JOIN (VALUES
  (0,  'the RISC-V calling convention (CALL)',
       'A contract so separately compiled functions interoperate. Arguments in a0-a7 (then the stack). Return values in a0-a1. ra holds the return address. sp is 16-byte aligned at call boundaries. Violate it and Project 2 and gcc-compiled C will disagree.'),
  (1,  'caller-saved vs. callee-saved',
       't0-t6 and a0-a7 (and ra, depending how you count) are caller-saved: if you need them after a call, you save them. s0-s11 are callee-saved: the callee must restore them before ret. Garcia''s exam: "who saves s1 if foo calls bar?"'),
  (2,  'prologue and epilogue',
       'Prologue: addi sp, sp, -framesize; sw ra and saved regs and locals. Epilogue: reverse loads, addi sp back, ret. Non-leaf functions must save ra. Leaf functions that only use t-regs can be empty frames — until they are not.'),
  (3,  'stack grows toward lower addresses',
       'sp points at the last used (or next free — be consistent with the ABI: sp points at the lowest occupied slot of the frame). Push by decreasing sp. Arrays in a frame sit at positive offsets from the new sp. Overflow the stack and you smash other frames.'),
  (4,  'frame pointer (s0/fp)',
       'Optional: save old fp, set fp = sp + framesize so locals are at stable negative offsets from fp even if you alloca. 61C often uses sp-relative addressing without a frame pointer at -O0 gcc sometimes still emits fp. Know both pictures.'),
  (5,  'jal saves PC+4 in ra',
       'After jal ra, label, ra holds the return address. Nested calls: save ra on the stack first. Recursion is just nested calls with different frames. Infinite recursion is a stack overflow, not a "RISC-V bug."'),
  (6,  'passing structs and arrays',
       'Arrays decay to a pointer (address in a0). Small structs may be split across a-regs; large ones are passed by address or on the stack — 61C usually sticks to ints, pointers, and floats in a-regs. Never pass a local array by copying unless you memcpy.'),
  (7,  'return values',
       'a0 (and a1 if 64-bit result on RV32, or a struct return pointer). A function that returns a struct may have a hidden first argument: address of the caller''s return slot. Match gcc if you mix C and assembly.'),
  (8,  'leaf vs. non-leaf',
       'Leaf: no jal. Can often skip saving ra. Non-leaf: you will jal, so ra dies unless saved. If you also need s-registers, save those too. Minimize memory traffic: do not save registers you never use.'),
  (9,  'the stack as a data structure',
       'Each frame is a node with a return address and saved state. Walking frames is how a debugger backtrace works. SETTING sp incorrectly by 4 instead of 8 (or missing 16-byte align) is a silent ABI break that shows up as a crash much later.'),
  (10, 'gp and tp (light)',
       'gp: global pointer, optimization for nearby globals. tp: thread pointer for TLS. 61C rarely makes you allocate these, but you must not clobber them if you did not save them. Treat unknown callee-saved-ish specials as sacred.'),
  (11, 'calling C from RISC-V and back',
       'Match types, register order, and alignment. Variadic functions (printf) put args in the same a0-a7 then stack. Project 2 often has you implement a C-callable routine; the autograder is the ABI.'),
  (12, 'recursion example (factorial)',
       'n in a0. Base: return 1. Else: save ra and a0, call fact(n-1), multiply, restore, ret. The "n" must be in a saved location across the recursive call (s-reg or stack), not only in a caller-saved a0.'),
  (13, 'why calling conventions exist',
       'Without one, every pair of functions needs a private agreement. Compilers, libraries, and your hand-written assembly share one ABI document. 61C is training you to read that document, not to invent a cute new one.'),
  (14, 'CALL exam checklist',
       'After a call, which registers still hold your values? Did you restore sp? Did you restore ra? Are arguments still in a0-a7 when you expected, or did the callee smash them? Draw the stack before and after jal.')
) AS c(pos, front, back)
WHERE d.slug = 'cs61c'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 5. Digital Logic & SDS
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'digital-logic'
CROSS JOIN (VALUES
  (0,  'combinational vs. sequential',
       'Combinational: outputs are a pure function of current inputs (gates, mux, ALU, adder). Sequential: outputs depend on past inputs too (state in flip-flops/registers, FSMs, register file). SDS = synchronous digital systems: state updates on a clock edge.'),
  (1,  'AND, OR, NOT, XOR, NAND',
       'NAND and NOR are universal (you can build everything from one of them). XOR is parity / add-without-carry. De Morgan: not(A and B) = not A or not B. 61C wants minimal gate diagrams, not a pile of redundant bubbles.'),
  (2,  'multiplexer',
       'A mux selects one of several inputs using select bits. 2-to-1 mux: out = sel ? I1 : I0. Building a 4-to-1 from 2-to-1s is a Logisim warmup. Datapaths are mostly muxes plus an ALU plus memories.'),
  (3,  'decoder and encoder',
       'An n-to-2^n decoder turns a binary index into a one-hot line (register-file write enable, instruction opcode maps). Priority encoder goes the other way. ROM/PLA implement truth tables as lookup.'),
  (4,  'adder and ALU',
       'Ripple-carry adder: each bit waits on the previous carry (delay grows with width). Carry-lookahead is faster and more gates. ALU = adder plus AND/OR/XOR/SLT plus a mux controlled by ALUCtrl. Project 3 starts here.'),
  (5,  'clock and D flip-flop',
       'On the rising (or falling) edge, Q becomes D. Hold D stable around the edge (setup and hold times). Registers are banks of flip-flops sharing a clock. Never use a latch as if it were an edge-triggered flop in 61C SDS.'),
  (6,  'register file',
       'Two combinational read ports (rs1, rs2) and one clocked write port (rd). Writing x0 is ignored in RISC-V. In Logisim you build this from registers plus decoders plus muxes. Read-during-write policy matters for pipelining later.'),
  (7,  'FSM (Moore vs. Mealy)',
       'Finite state machine: next state = f(state, input); output from state (Moore) or state+input (Mealy). Draw the bubble diagram, then the transition table, then the gates. Control logic of a simple CPU is an FSM (or combinational in a single-cycle design).'),
  (8,  'critical path and clock period',
       'The longest combinational delay between two clocked elements sets the minimum clock period. Shorten it (or pipeline it) to raise frequency. A single-cycle CPU''s period is "the slowest instruction''s path" — why we pipeline next.'),
  (9,  'setup and hold (exam level)',
       'Setup: D must be stable before the edge by t_setup. Hold: D must stay stable after the edge by t_hold. Too little delay on a short path can violate hold; too much delay on a long path violates setup. 61C may give you numbers and ask if the circuit works.'),
  (10, 'Logisim (Project 3 toolchain)',
       'Schematic capture: wires, tunnels, splitters, registers, memory. Subcircuits are your functions. The 61C CPU project is a RISC-V subset in Logisim Evolution: ALU, imm gen, control, then connect the datapath. Test with a small machine-code program.'),
  (11, 'timing diagrams',
       'X-axis is time; show clk, D, Q, and combinational outputs. Propagation delay means Q changes after the edge, not instantly. Glitches on combinational outputs are normal; do not clock on a glitchy signal.'),
  (12, 'boolean minimization (light)',
       'Sum-of-products, Karnaugh maps for a handful of bits, don''t-cares. 61C is not an EE boolean-algebra course, but control ROMs and ALUCtrl tables are just truth tables you should be willing to fill.'),
  (13, 'signed vs. unsigned in hardware',
       'Bits are bits. slt vs sltu is an ALUOp, not a different wire color. The adder does not know signedness; overflow detection and comparison do. Same story as two''s complement week.'),
  (14, 'SDS exam habits',
       'Label every mux select. Show which edge updates the register. Count gate delays on the critical path. If two outputs must not be driven at once, you need a mux or an enable, not two ANDs fighting (do not create a short).')
) AS c(pos, front, back)
WHERE d.slug = 'cs61c'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 6. Datapath & Control
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'datapath'
CROSS JOIN (VALUES
  (0,  'single-cycle RISC-V CPU idea',
       'One instruction per clock. Fetch from instruction memory at PC, decode, read regs, ALU, maybe data memory, write reg, update PC. CPI = 1, but the clock must stretch to the slowest instruction (usually load). P&H Chapter 4 is the picture.'),
  (1,  'instruction fetch',
       'PC addresses IMEM (read-only in 61C''s simple core). Instruction bits feed the decoder, register-file addresses, and imm-gen. Next PC is PC+4 or a branch/jump target, selected by a mux. PC is a register: it updates on the clock.'),
  (2,  'decode and register read',
       'rs1, rs2, rd fields index the register file. Reads are combinational. Write happens at the end of the cycle (on the edge) so the same instruction does not read the value it is about to write in a naïve single-cycle picture — order of the edge matters.'),
  (3,  'immediate generator',
       'Different formats stash the imm in different bit positions (I, S, B, U, J). Imm-gen muxes/sign-extends them into a 32-bit value. A wrong B-type splice is why your branch always goes to the weeds in Project 3.'),
  (4,  'ALU and ALUCtrl',
       'ALUSrc chooses rs2 vs immediate. ALUOp/ALUCtrl chooses add, sub, AND, OR, XOR, shifts, slt. Loads and stores use add for address. Branches use sub/slt for the comparison (or a dedicated comparator).'),
  (5,  'data memory',
       'Address from ALU, write data from rs2, MemRead/MemWrite from control. Loads: result is memory output, not ALU (MemToReg mux). Stores: no register write. Width (byte/half/word) and signed vs unsigned extend happen here or in a funnel.'),
  (6,  'control unit',
       'Combinational function of opcode (and funct3/funct7): RegWrite, MemRead, MemWrite, Branch, ALUSrc, MemToReg, ALUOp, Jump, ... Single-cycle control is a truth table, not an FSM. Pipelined control later copies these bits down the pipe.'),
  (7,  'branch datapath',
       'Compare rs1 and rs2 (zero? less?). Target = PC + imm (B-type). And the comparison with Branch to select the PC mux. RISC-V does not have a delay slot: the next sequential instruction is not forced to execute.'),
  (8,  'jump datapath',
       'jal: rd = PC+4, PC = PC + imm. jalr: rd = PC+4, PC = rs1 + imm (low bit cleared). auipc is just ALU add of PC and U-imm into rd. Missing the +4 on the link register breaks every ret.'),
  (9,  'why single-cycle is simple and slow',
       'No pipeline registers, easy to reason about. Clock = worst-case path (IMEM + reg + ALU + DMEM + mux). A store does not need DMEM''s full delay on the writeback path, but the clock cannot be shorter than the longest instruction.'),
  (10, 'multicycle (contrast)',
       'Break the instruction into steps sharing one ALU and one memory, several clocks per instruction, shorter period. 61C mentions it so you see CPI vs. clock-period tradeoffs before jumping to a 5-stage pipeline.'),
  (11, 'Project 3 testing strategy',
       'Unit-test ALU and imm-gen with known vectors. Then a tiny IMEM program: addi, add, sw, lw, beq, jal. If lw fails, MemToReg or DMEM wiring; if jal fails, PC mux or rd path. Do not debug the whole CPU at once.'),
  (12, 'RegWrite and x0',
       'Even if control says write, x0 stays 0. In Logisim, either hardwire register 0 or ignore writes to address 0. Exams: "addi x0, x0, 5" is a NOP in effect, and a legal way to encode nop.'),
  (13, 'Harvard vs. von Neumann (teaching cores)',
       '61C single-cycle pictures often use separate IMEM and DMEM (Harvard) so fetch and load can happen in the same cycle without a structural hazard. A unified memory would need two ports or a multicycle/pipelined split.'),
  (14, 'datapath exam move',
       'Trace one instruction: which mux selects, which RegWrite, what ALU does, what the next PC is. They will give a messed-up wiring and ask which instructions still work. If MemToReg is stuck at 0, loads write the address instead of the data.')
) AS c(pos, front, back)
WHERE d.slug = 'cs61c'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 7. Pipelining & Hazards
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'pipelining'
CROSS JOIN (VALUES
  (0,  'five-stage RISC-V pipeline',
       'IF (fetch), ID (decode/reg read), EX (ALU), MEM (data memory), WB (reg write). Pipeline registers between stages hold instruction bits, control, and data. Ideal speedup approaches the number of stages if there are no stalls.'),
  (1,  'pipeline registers',
       'IF/ID, ID/EX, EX/MEM, MEM/WB. They cut the critical path so the clock can be roughly "one stage" long. Control signals travel with the instruction. Forgetting to pipeline a control bit is how you write back the wrong instruction''s result.'),
  (2,  'structural hazards',
       'Two stages want the same hardware (one memory for IF and MEM). Fix: extra hardware (separate IMEM/DMEM) or stall. 61C''s 5-stage picture assumes split memories and a 2-read 1-write register file so structure is mostly gone.'),
  (3,  'data hazards',
       'An instruction needs a register that a previous instruction has not written yet. Types: RAW is the one you fight daily; WAR/WAW show up in more exotic pipelines. Example: add x1, ... then add x2, x1, ... while x1 is still in the pipe.'),
  (4,  'forwarding (bypassing)',
       'Mux ALU inputs from EX/MEM or MEM/WB instead of the register file when rd matches rs. Most ALU-to-ALU RAWs vanish. Does not help a load whose data is not ready until after MEM — that is the load-use case.'),
  (5,  'load-use hazard',
       'lw x1, 0(x2); add x3, x1, x4. Data arrives at the end of MEM, but the add needs it at the start of EX. Solution: stall one cycle (bubble), then forward from MEM/WB. Exams love drawing the stall.'),
  (6,  'control hazards',
       'You fetch the next instruction before you know if a branch is taken. Options: stall until EX/MEM, predict not-taken, or a branch predictor. On a wrong guess, flush the instructions you should not have fetched. RISC-V has no delay slot.'),
  (7,  'flush vs. stall vs. forward',
       'Forward: sneak the value to where it is needed. Stall: insert a bubble (NOP in the pipe), freeze PC/IF. Flush: squash wrong-path instructions (turn them into NOPs) after a mispredict. Mixing the three up loses points.'),
  (8,  'CPI in a pipeline',
       'Ideal CPI = 1. Real CPI = 1 + stall cycles per instruction + flush penalty contribution. Speedup is not 5x if the clock only got 3x faster and you stall a lot. AMAT-style thinking: count the bubbles.'),
  (9,  'branch prediction (61C level)',
       'Static: always not-taken, or BTFNT. Dynamic: 1-bit / 2-bit saturating counters in a BHT, optional BTB for the target. 2-bit resists a single mispredict in a loop. 61C will not make you implement TAGE; know why 1-bit thrashes on a loop-exit.'),
  (10, 'exceptions in a pipeline',
       'An earlier instruction can fault after a later one has already written a register (imprecise exceptions) unless you squash carefully. Precise exceptions: commit in order (the WB stage is the commit point in the simple 5-stage).'),
  (11, 'comparing single-cycle, multi, pipe',
       'Single-cycle: simple, long clock, CPI 1. Multicycle: short clock, CPI about 3-5, shared hardware. Pipeline: short clock, CPI near 1 plus hazards. 61C wants you to compute which is faster given delays and stall rates, not to recite a slogan.'),
  (12, 'superscalar / dual-issue (light)',
       'Fetch/execute more than one instruction per cycle if they are independent. More hazard logic. 61C mentions ILP so that SIMD and threads later do not sound like the only ways to go fast.'),
  (13, 'drawing a pipeline diagram',
       'Rows are instructions in program order; columns are cycles; cells are stages. Arrows for forwards; boxes for stalls. If two instructions are in MEM at once, you drew a structural hazard your hardware cannot do.'),
  (14, 'pipeline exam traps',
       'Forwarding from MEM/WB to ID (reg file) vs. to EX (ALU mux) — know which your lecture diagram uses. A store still needs rs2 at MEM; some designs forward to the store data mux. sw depending on a just-computed address is an EX-to-EX forward on rs1.')
) AS c(pos, front, back)
WHERE d.slug = 'cs61c'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 8. Caches & Memory Hierarchy
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'caches'
CROSS JOIN (VALUES
  (0,  'the memory hierarchy',
       'Registers, L1, L2, L3, DRAM, SSD/disk: each level is larger, slower, and cheaper per bit. Caches exploit locality so the average access looks like the fast level. Garcia: "latency numbers every 61C student should know" (ns vs ms).'),
  (1,  'temporal vs. spatial locality',
       'Temporal: you will touch the same address again soon (loops, stack). Spatial: you will touch a nearby address (arrays, sequential instruction fetch). Cache lines exist because of spatial locality; replacement policy fights for temporal.'),
  (2,  'block / line, tag, index, offset',
       'Offset: which byte in the block. Index: which set. Tag: which block in that set''s possible universe. Address bits split [tag | index | offset]. Mess up the split and every hit/miss problem is wrong.'),
  (3,  'direct-mapped',
       'One block per set (associativity 1). Index selects the only candidate; compare one tag. Simple and fast, but two addresses that alias the same index thrash (conflict misses) even if the cache is half empty.'),
  (4,  'set-associative and fully associative',
       'N-way: N blocks per set, compare N tags (or a CAM). Fully associative: one set, any block can go anywhere. Higher associativity cuts conflict misses, costs more compare logic and power. 61C problems: 2-way vs 4-way given a map of addresses.'),
  (5,  'hit, miss, miss rate, miss penalty',
       'Hit: tag matches and valid. Miss: go to the next level. Miss rate = misses / accesses. Miss penalty = time to fill from below. Hit time is the cache lookup itself. Do not mix rate (a fraction) with penalty (time).'),
  (6,  'AMAT',
       'Average Memory Access Time = hit time + miss rate * miss penalty. For two levels: HT_L1 + MR_L1 * (HT_L2 + MR_L2 * DRAM). This formula is the 61C performance hammer. Local miss rate vs. global miss rate: say which you mean.'),
  (7,  'the 3 Cs of misses',
       'Compulsory (cold): first touch of that block. Capacity: working set larger than the cache. Conflict: associativity too low (would have hit in a fully associative cache of the same size). Adding size, associativity, or prefetch changes different Cs.'),
  (8,  'write policies',
       'Write-through: every store updates lower level (often with a write buffer). Write-back: dirty bit, write the line only on eviction. Write-allocate vs. no-write-allocate on a store miss. Write-back + write-allocate is the usual L1 data cache.'),
  (9,  'replacement: LRU and friends',
       'On a miss in a set, pick a victim. LRU approximates temporal locality; random is simpler; FIFO is easy to build and sometimes worse. Fully associative caches live or die by replacement; direct-mapped has no choice.'),
  (10, 'valid and dirty bits',
       'Valid: this line holds real data. Dirty: write-back needs to store it. After reset, valid is false. A miss with dirty victim costs an extra write. Instruction caches can omit dirty (they are read-only).'),
  (11, 'blocking / tiling (matrix multiply)',
       'Walk a matrix in cache-sized tiles so a block stays hot (Project 4 / cache lab energy). Row-major vs. column-major: one of them streams, the other strides by a row and thrashes. 61C will ask you to count misses for a loop nest.'),
  (12, 'associativity vs. size vs. block size',
       'Bigger block: more spatial, more waste / extra miss penalty if you only needed one word (and more conflict if index bits shrink). Bigger cache: fewer capacity misses, slower hit time. Know the qualitative arrows for "how do I cut AMAT."'),
  (13, 'inclusive vs. exclusive (light)',
       'Inclusive L2 contains L1''s lines (simpler coherence). Exclusive saves capacity. 61C mostly wants multilevel AMAT, not a full MESI protocol yet — that waits for parallelism week.'),
  (14, 'cache exam workflow',
       'Write the address bits. Split tag/index/offset. Simulate a sequence: hit/miss, which set, which victim, dirty writeback? Then AMAT if they give times. Units: bytes vs words vs blocks — label them or lose the factor of 4.')
) AS c(pos, front, back)
WHERE d.slug = 'cs61c'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 9. Virtual Memory & I/O
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'virtual-memory'
CROSS JOIN (VALUES
  (0,  'why virtual memory',
       'Each process thinks it owns a huge private address space; isolation/protection; and the working set can exceed DRAM by paging to disk/SSD. Main memory is a cache for the disk, with a page as the block. Three motivations: size, protection, sharing.'),
  (1,  'virtual vs. physical address',
       'CPU issues VA. Hardware (MMU) + page tables translate to PA before DRAM. Caches may be virtually or physically indexed; 61C usually draws: VA → TLB/page table → PA → cache/DRAM. The program never sees other processes'' PAs.'),
  (2,  'pages and page offset',
       'A page is typically 4 KiB (12 offset bits). VPN = high bits of VA; PPN = high bits of PA; offset is copied unchanged. Translation maps VPN to PPN. Offset not translated is why a page is both the VM block and the alignment unit.'),
  (3,  'page table entry (PTE)',
       'PPN plus flags: valid, dirty, accessed/referenced, permission (R/W/X), user vs supervisor. Invalid PTE: page fault. Each process has its own page table (or ASID). RISC-V SATP points at the root of the current table.'),
  (4,  'TLB',
       'Translation Lookaside Buffer: a cache of recent VPN→PPN translations. Hit: skip the page-table walk. Miss: walk tables (hardware or software), then refill TLB. Flush/shootdown on context switch unless tagged with ASID. AMAT now has a TLB term too.'),
  (5,  'page fault',
       'Valid bit false (or protection fail): trap to OS. OS may load the page from disk (demand paging), kill the process (segfault), or copy-on-write. Then retry the instruction. Disk latency (ms) dominates; TLB/cache misses are ns-us.'),
  (6,  'multi-level page tables',
       'A flat table for a 32- or 64-bit VA is huge and sparse. Trees of tables (RISC-V Sv32/Sv39: 2 or 3 levels) allocate only the branches you use. A walk is several memory accesses — another reason the TLB matters.'),
  (7,  'page table vs. cache vs. disk',
       'Cache: hardware, 64-byte lines, ns. VM: OS+hardware, 4 KiB pages, ms on miss to disk. Replacement is LRU-ish in software because a miss is already catastrophic. Do not say "the cache page-faulted."'),
  (8,  'protection and isolation',
       'User code cannot write kernel pages or another process''s pages. Execute-disable bits stop some code-injection. Sharing: two VPNs (maybe in two processes) map to one PPN (libraries, shared memory) with careful permissions.'),
  (9,  'context switch (light)',
       'OS saves registers, switches SATP/page table, restores. TLB must not leak translations (flush or ASID). 61C connects this to 61B''s threads-vs-processes intuition: the expensive part is the address space, not just the stack.'),
  (10, 'I/O: polling vs. interrupts',
       'Polling: CPU spins on a device status bit (simple, wasteful). Interrupt: device raises a signal, CPU traps to a handler, then resumes. 61C catalog text: interrupts and process switching are why architecture talks to the OS.'),
  (11, 'DMA (light)',
       'Direct Memory Access: the device writes DRAM itself so the CPU is not load/store-ing every byte. Needs coherent view of memory (caches!). After DMA, flush/invalidate or use uncached buffers. Networking and disks all do this.'),
  (12, 'memory-mapped I/O',
       'Device registers appear as special physical addresses. Loads/stores become I/O. MMU protection stops user programs from touching them. Alternative: special in/out instructions (x86). RISC-V teaching cores often MMIO.'),
  (13, 'the full access path (exam)',
       'VA → split VPN/offset → TLB? if miss, page-table walk (maybe fault) → PA → split tag/index/offset → cache? if miss, DRAM. Count the memory references in the worst case (walk + cache fill). 61C loves this combined picture.'),
  (14, 'VM exam traps',
       'Offset bits come from page size, not from cache block size (different levels). A TLB miss is not a page fault. A cache miss can happen after a successful translation. Permissions fail even if the PPN is valid.')
) AS c(pos, front, back)
WHERE d.slug = 'cs61c'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 10. Parallelism, WSC & Dependability
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'parallelism'
CROSS JOIN (VALUES
  (0,  'Flynn''s taxonomy (61C slice)',
       'SISD: ordinary scalar core. SIMD: one instruction, many data (vector/AVX). MIMD: many instruction streams (multicore, cluster). MISD is a trivia box. 61C Project 4 is SIMD plus thread-level (OpenMP) on MIMD cores.'),
  (1,  'data-level parallelism / SIMD',
       'Pack 8 ints in a 256-bit YMM register, add them in one instruction (AVX). Intrinsics look like C functions (_mm256_add_epi32). Alignment, remainder loops, and not every algorithm vectorizes. Speedup is width times, until you are memory-bound.'),
  (2,  'thread-level parallelism / OpenMP',
       'hash-pragma omp parallel for splits loop iterations across threads. Shared vs private variables. Race: two threads write the same location with no lock/reduction. 61C: start with reduction(+:sum) before you invent a mutex.'),
  (3,  'Amdahl''s law',
       'If fraction f of the work is serial, speedup is at most 1 / (f + (1-f)/P) even with P processors. The serial leftover (setup, I/O, a leftover loop) caps you. 61C will plug in numbers; show the algebra, not a vibe.'),
  (4,  'strong vs. weak scaling',
       'Strong: fixed problem size, more cores (Amdahl bites). Weak: grow the problem with the cores (often better for WSC). Say which one a graph is showing when they ask "why didn''t we get 16x on 16 cores?"'),
  (5,  'cache coherence (MESI intuition)',
       'Each core has caches; they must agree on memory. States: Modified, Exclusive, Shared, Invalid. A write invalidates (or updates) other copies. Coherence is "same address, same value eventually"; consistency is "when do I see it?" 61C stays at MESI cartoons.'),
  (6,  'false sharing',
       'Two threads write different variables that live on the same cache line; the line bounces. Pad/align to a line (64 B) or privatize. Looks like a coherency bug but the program is "correct" and just slow — Project 4 trap.'),
  (7,  'synchronization',
       'Locks, atomics (RISC-V lr/sc or AMOs), barriers. Too little: races. Too much: serialization (Amdahl). OpenMP critical vs. reduction. 61C does not replace CS 162, but you must name the hazard.'),
  (8,  'MapReduce / Spark (WSC)',
       'Map independent records, shuffle by key, reduce. The point is moving compute to data in a warehouse-scale computer, surviving machine failure by re-running tasks. Barroso/Hölzle: the datacenter is the computer.'),
  (9,  'warehouse-scale computers',
       'Thousands of commodity servers, custom networking, power and cooling as first-class constraints. Tail latency (the 99th percentile) matters more than average. Failures are normal, not exceptional. 61C''s last "great idea."'),
  (10, 'RAID levels (exam set)',
       'RAID 0: striping, no redundancy, speed. RAID 1: mirroring. RAID 4/5: parity, survive one disk (RAID 5 rotates parity). RAID 6: two parity, two failures. Tradeoff: capacity vs. reliability vs. throughput. Know what "parity" means bitwise XOR.'),
  (11, 'Hamming / SECDED',
       'Parity bits at power-of-two positions detect/correct single-bit errors (Hamming). Extra overall parity gives SECDED (single error correct, double error detect). Garcia loves encoding a 4-bit nibble into 7 bits. Memory ECC is this idea in DRAM.'),
  (12, 'availability and MTTF (light)',
       'Availability = MTTF / (MTTF + MTTR). Replication and RAID raise effective MTTF of the service, not of one disk. 61C: "fast machines that lie" vs. "correct machines that are slow" — dependability is an architecture axis like performance.'),
  (13, 'Project 4 performance recipe',
       'Correctness first (naive C). Then cache blocking. Then SIMD. Then OpenMP. Measure with a timer, not faith. If SIMD did nothing, you are bottlenecked on memory (AMAT) or you have a remainder/scalar tail. Autograder speedup is the spec.'),
  (14, '61C closing picture',
       'C and numbers → RISC-V CALL → gates → a CPU → a pipeline → a memory system that is mostly caches and page tables → then many cores and many machines. Pick the level that is the bottleneck. That is Great Ideas in Computer Architecture.')
) AS c(pos, front, back)
WHERE d.slug = 'cs61c'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

UPDATE public.decks
SET    card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE  slug = 'cs61c';
