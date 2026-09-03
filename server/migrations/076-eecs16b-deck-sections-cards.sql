-- Migration 076: EECS 16B — Introduction to Circuits & Devices, full deck rebuild.
-- UC Berkeley Fall 2026 is listed as ELENG 64 (formerly EECS 16B):
-- Kater Murch and Rikky Muller, TuTh 14:00-15:29, Stanley 105.
-- Catalog: time/frequency domain, complex arithmetic, phasor analysis of DEs,
-- Kirchhoff's laws, electronic elements and devices, RLC circuits, op-amp
-- signal processors, feedback, circuit models beyond electronics. Lab included.
-- Prereq: MATH 54 or PHYSICS 89 (enforced). This is the redesigned 16B —
-- circuits and devices — not the old DIDS II control/SVD/S1XT33N curriculum
-- (those ideas now live in 16A or later EE courses). Distinct from EE 105/140.

DELETE FROM public.saved_tidbits
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'eecs16b');

DELETE FROM public.tidbits
WHERE category_id = 'eecs16b';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'eecs16b');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'eecs16b');

UPDATE public.decks
SET title = 'EECS 16B',
    description = 'Introduction to Circuits & Devices — KVL/KCL, RLC, phasors, op-amps (EE 64)',
    cover_emoji = '⚡'
WHERE slug = 'eecs16b';

UPDATE public.classes
SET title = 'Introduction to Circuits & Devices'
WHERE id = 'uc-berkeley:eecs16b:fa26';

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('kvl',    'Voltage, Current, KCL & KVL',
   'Circuit variables, passive sign, Kirchhoff laws', 0),
  ('resist', 'Resistive Circuits & Analysis',
   'Ohm, dividers, node/mesh, linearity', 1),
  ('equiv',  'Thevenin, Norton & Superposition',
   'Equivalents, source transform, max power', 2),
  ('cap',    'Capacitors & RC Transients',
   'i=C dv/dt, time constant, 1st-order DE', 3),
  ('ind',    'Inductors & RL Transients',
   'v=L di/dt, RL natural/forced response', 4),
  ('rlc',    'Second-Order RLC Circuits',
   'Damping, ω0, step and natural response', 5),
  ('phasor', 'Phasors & Impedance',
   'jωL, 1/jωC, AC steady state, power', 6),
  ('freq',   'Transfer Functions, Filters & Bode',
   'H(jω), cutoff, first-order Bode sketches', 7),
  ('opamp',  'Op-Amps & Signal Processors',
   'Golden rules, inverting, integrator, difference', 8),
  ('fbdev',  'Feedback, Devices & Analogies',
   'Feedback, diodes/MOS light, non-electrical models', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'eecs16b'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. Voltage, Current, KCL & KVL
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'kvl'
CROSS JOIN (VALUES
  (0,  '16B in one sentence',
       'Predict real circuits with models: KCL/KVL, RLC transients, phasors, op-amps, and a little device physics. Catalog title is Introduction to Circuits & Devices. FA26 is listed as EE 64 (formerly EECS 16B), Murch and Muller. This is not old DIDS II (control, SVD, S1XT33N). 16A is signals/linear algebra; 16B is hardware. Prereq MATH 54 or PHYSICS 89.'),
  (1,  'voltage vs current vs power',
       'Voltage v is energy per charge between two nodes (volts). Current i is charge per time through a branch (amps). Instantaneous power into an element is p = v i with the passive sign convention. Energy is the integral of p. 16B: label v and i on every element before writing an equation, or the signs will lie.'),
  (2,  'passive sign convention',
       'Current enters the terminal where the voltage + is marked. Then p = v i is power absorbed by the element. A source typically delivers power (p negative under this labeling, or you flip the current arrow). 16B exams dock points for mixed conventions more often than for algebra.'),
  (3,  'node, branch, loop, ground',
       'Node: equipotential connection. Branch: one element (or series combo) between nodes. Loop: closed path. Ground is the 0 V reference you chose — not a physical magic node unless the problem says chassis/earth. All voltages in nodal analysis are measured to that reference.'),
  (4,  'Kirchhoff''s current law (KCL)',
       'Sum of currents leaving a node is 0 (charge is not stored at an ideal node). Equivalent: currents in = currents out. Holds for any supernode too. 16B: write KCL in currents, then substitute element laws (Ohm, C dv/dt, ...). Do not KCL voltages.'),
  (5,  'Kirchhoff''s voltage law (KVL)',
       'Sum of voltage drops around a closed loop is 0 (energy of a test charge). Walk the loop, add a drop when you go + to −, or pick one orientation and stick to it. 16B: KVL is the loop analog of KCL. Mesh analysis is systematic KVL.'),
  (6,  'Ohm''s law and resistors',
       'v = i R for a positive R (passive). Conductance G = 1/R, i = G v. Resistors dissipate p = i^2 R = v^2 / R as heat. Ideal wires are R = 0 (short); ideal opens are R infinite (i = 0). 16B: a short forces v = 0; an open forces i = 0 — use those as element laws.'),
  (7,  'independent sources',
       'Voltage source: fixes v, i is whatever KCL needs (within limits). Current source: fixes i, v is whatever KVL needs. You cannot write Ohm on a source. Two voltage sources in parallel must agree; two current sources in series must agree — otherwise the model is inconsistent.'),
  (8,  'dependent sources',
       'A source whose value is controlled by some v_x or i_x elsewhere (VCVS, VCCS, CCVS, CCCS). Treat the source as a source in KCL/KVL, and keep the controlling variable as an extra unknown with its own equation. 16B: Thevenin/Norton still work; the equivalent may include the gain.'),
  (9,  'ideal wire / short / open',
       'Ideal wire: same node (0 V drop). Short circuit: a wire placed across something, forcing that voltage to 0. Open circuit: broken branch, i = 0, voltage can be anything KVL says. Measuring voltage is (ideally) an open; measuring current is (ideally) a short in series. 16B labs: your DMM is not quite ideal.'),
  (10, 'series vs parallel (definition)',
       'Series: same current, voltages add. Parallel: same voltage, currents add. Two elements are series only if the shared node has no other current path. 16B trap: a wire to a third element at the middle node kills series. Redraw before combining.'),
  (11, 'power balance sanity check',
       'Sum of power absorbed over all elements is 0 (including sources, with passive signs). If resistors absorb 5 W, sources must deliver 5 W. 16B: after a numeric solve, check p. A sign error often shows up as a resistor generating power.'),
  (12, 'reference directions are yours',
       'You may draw i either way; if you guessed backwards, the number comes out negative. Negative current means the actual flow is opposite your arrow, not that KCL failed. Same for voltage polarities. 16B: pick arrows, never change them mid-problem.'),
  (13, '16A vs 16B on the same DE',
       '16A treats e^{st} and state-space as signals/systems. 16B writes the same first-order DE from C dv/dt and a resistor, then solves the circuit. Same math, different object: here the unknown is a capacitor voltage, not an abstract state. Do not bring SVD or DTFS into a 16B KVL problem.'),
  (14, 'KCL/KVL exam move',
       'Redraw. Mark ground. Label every v and i with passive signs. Count unknowns. Write one KCL per non-ground node or one KVL per mesh, plus element laws. Solve. Check a power or a divider special case (equal resistors). If a result makes a resistor generate power, your signs are wrong.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs16b';

-- =====================================================================
-- 2. Resistive Circuits & Analysis
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'resist'
CROSS JOIN (VALUES
  (0,  'series resistors',
       'R_eq = R1 + R2 + ... . Same i; voltage divides in proportion to R. Current is v_total / R_eq. 16B: series is the KVL special case. A 0 Ω resistor in series does nothing; an open in series kills the current.'),
  (1,  'parallel resistors',
       '1/R_eq = 1/R1 + 1/R2 + ... , or two resistors: R_eq = R1 R2 / (R1 + R2). Same v; current divides in proportion to conductance (inversely to R). 16B: two equal R in parallel give R/2. A short in parallel with anything makes R_eq = 0.'),
  (2,  'voltage divider',
       'Two series resistors across v_s: voltage on R2 (grounded) is v_s R2 / (R1+R2) if no extra load. Loading: a load on R2 is in parallel with R2, so the ratio changes. 16B: always ask "is the divider unloaded?" Labs: scope probe and next-stage Rin are loads.'),
  (3,  'current divider',
       'Two parallel resistors: i through R1 is i_total R2 / (R1+R2) (more current in the smaller R). Comes from sharing v = i_eq R_eq. 16B: current divider is the KCL twin of the voltage divider. Do not mix the formulas.'),
  (4,  'nodal analysis',
       'Unknowns: node voltages to ground. KCL at each non-ground node; supernode if a floating voltage source. Convert each branch current to (v_a - v_b)/R. Current sources inject known currents. 16B default method when many elements share nodes. Ground the most-connected node.'),
  (5,  'supernode',
       'A voltage source between two non-ground nodes: those nodes are a supernode. Write KCL for the combined blob (the source current cancels internally) plus one KVL: v_a - v_b = v_source. 16B: forgetting the KVL constraint is the classic supernode miss.'),
  (6,  'mesh analysis',
       'Unknowns: loop currents in a planar circuit. KVL around each mesh; supermesh if a current source is shared. Resistors on the boundary see one mesh current; shared resistors see a difference. 16B: mesh shines with many series loops; nodal shines with many parallels. Pick the smaller system.'),
  (7,  'linearity of resistive circuits',
       'With sources and R (and dependent sources that are linear), every voltage and current is a linear function of the independent sources. Scaling all sources by k scales all v,i by k. 16B: this is why superposition and Thevenin exist. A product v*i (power) is not linear — do not superpose power.'),
  (8,  'conductance form of KCL',
       'At a node, sum G_k (v - v_k) = i_injected. The G matrix is the Laplacian of the resistor network (symmetric, PSD). 16B does not need graph theory; it does need "current = G times voltage drop." Ill-conditioned when a huge G sits next to a tiny one (floating node / leftover 1e12 Ω).'),
  (9,  'voltage vs current as the unknown',
       'Nodal: voltages, then i = (v_a-v_b)/R. Mesh: currents, then v = i R. If the question asks for a current through a single branch in a web of parallels, nodal plus Ohm is usually faster. If it asks for a loop voltage in a ring of series R, mesh is faster. 16B: spend 10 seconds choosing.'),
  (10, 'grounded voltage source trick',
       'A voltage source from a node to ground sets that node voltage. Remove that unknown; it is not a KCL node (or KCL there only finds the source current after the fact). 16B: this is why you ground one side of a source when you can — one fewer equation.'),
  (11, 'units and SI prefixes',
       'V, A, Ω, W. kΩ and mA are 16B default lab units. 1 mA through 1 kΩ is 1 V. Power: 1 mA * 1 V = 1 mW. 16B arithmetic errors are often prefix errors (using 1000 instead of 1e3 in 1/RC). Write 10^3 explicitly once per problem.'),
  (12, 'open and short as analysis tools',
       'To find an equivalent seen by a load, you will later open-circuit a port (find v_oc) or short it (find i_sc). Already at this level: kill a voltage source by replacing it with a short; kill a current source by replacing it with an open. 16B: that killing rule is for superposition and R_th, not for "the source is still on."'),
  (13, 'why 16B still does node/mesh',
       'SPICE will solve it. Exams will not give SPICE. Node/mesh is how you set up the linear system by hand, how you see a divider, and how you get the DE for RC/RL later (replace R with the rest of the network). 16B labs: predict before you measure, then debug the difference.'),
  (14, 'resistive exam move',
       'Combine obvious series/parallel first. If a divider is unloaded, use the divider. Else write nodal (or mesh). Label ground. Count equations = unknowns. Solve a 2x2 with substitution, not a mystery matrix inverse. Check: equal R split voltage in half; open load means i_load = 0.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs16b';

-- =====================================================================
-- 3. Thevenin, Norton & Superposition
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'equiv'
CROSS JOIN (VALUES
  (0,  'Thevenin equivalent',
       'From a port, any linear network looks like v_th in series with R_th. v_th = v_oc (open-circuit port voltage). R_th is the resistance seen with independent sources killed (voltage sources shorted, current sources opened). 16B: dependent sources stay; compute R_th as v_test / i_test.'),
  (1,  'Norton equivalent',
       'i_n in parallel with R_n. i_n = i_sc (short-circuit port current). R_n = R_th. Relation: v_th = i_n R_th. Source transformation: series v+R becomes parallel i=v/R with the same R. 16B: pick Thevenin if the load wants a voltage; Norton if it wants a current. Same port behavior.'),
  (2,  'finding R_th with a test source',
       'When dependent sources are present (or you do not want to inspect the graph), kill independent sources, attach v_test at the port, find i_test, R_th = v_test / i_test. If i_test = 0, R_th is infinite (the port looks like a current source / open). If v_test = 0 for finite i, R_th = 0.'),
  (3,  'superposition',
       'Turn on one independent source at a time (kill the others), solve, add the v and i. Do not superpose power. Dependent sources stay on in every subcircuit because they are linear elements, not independent excitations. 16B: superposition is often slower than nodal, but it is the right tool when a problem says "contribution of source 2."'),
  (4,  'maximum power transfer',
       'For a resistive Thevenin driving R_L, p_L is maximized at R_L = R_th, and that max is v_th^2 / (4 R_th). Matching is about power in the load, not efficiency (efficiency at match is 50%). 16B: if R_L is constrained (say R_L greater than some value), pick the allowed R_L closest to R_th.'),
  (5,  'why Thevenin for RC later',
       'A capacitor hanging off a messy resistive network sees R_th. The time constant is R_th C, and the final voltage is v_th of that same port. 16B: Thevenin is not a party trick — it reduces every first-order circuit to one R and one C (or L). Find the port the energy-storage element sees.'),
  (6,  'open-circuit voltage pitfalls',
       'v_oc is the voltage at the port with the load removed, not with the load shorted. If a current source has nowhere to go when you open the port, you made a modeling error (or R_th is infinite and v_oc is undefined / the model is a pure current source). 16B: sketch the port with X marks where the load was.'),
  (7,  'source transformation checklist',
       'v_s in series with R becomes i_s = v_s / R in parallel with the same R, polarity: current leaves the + of the old voltage source. Reverse to go Norton to Thevenin. You cannot transform a lone ideal source with R = 0 or R infinite. 16B: transformation is optional sugar on top of Thevenin/Norton.'),
  (8,  'equivalent of a voltage divider',
       'Unload it: v_th is the divider voltage, R_th is the two resistors seen in parallel from the tap (sources killed: v_s becomes a short, so R1 || R2). 16B: this is the standard "what does the next stage load" calculation. A load R_L sees v_th R_L / (R_th + R_L).'),
  (9,  'linearity vs equivalent',
       'Thevenin/Norton require a linear network as seen from the port (R, linear dependent sources, independent sources). A diode or a saturating op-amp is not linear — no single R_th for all loads. 16B later: linearize a device at a bias point, then Thevenin the small-signal model.'),
  (10, 'power from equivalents',
       'The Thevenin source and R_th dissipate internally; they match the original network only at the port (v, i of the load). Internal resistor power in the equivalent is not the internal power of the original. 16B: use the equivalent to find load v,i,p. To find power in a specific original resistor, go back to the original circuit.'),
  (11, 'killing sources (again, carefully)',
       'Independent voltage source → short (it already forced v; with value 0 that is a wire). Independent current source → open. Do not kill dependent sources. Do not short a current source or open a voltage source as a "kill." 16B: say the words "independent sources off" when you compute R_th.'),
  (12, 'negative R_th (rare, 16B-aware)',
       'With dependent sources, R_th can be negative (active network pumping energy). Max-power formulas assuming positive R_th then fail. 16B: if v_test / i_test comes out negative, you probably have an active circuit; report the signed R_th and do not blindly match R_L = R_th.'),
  (13, 'port vs element',
       'An equivalent is defined at a pair of terminals. Replacing the rest of the world by Thevenin does not let you see voltages inside the replaced blob. 16B labs: the function generator is approximately a Thevenin (50 Ω). Your protoboard is the load. The internals of the generator are not your schematic.'),
  (14, 'Thevenin exam move',
       'Identify the port. v_th = v_oc. R_th: kill independent sources, or v_test/i_test if dependent sources lurk. Optional: i_sc and check v_th = i_sc R_th. Attach R_L as a divider with R_th. For max power, R_L = R_th (if R_th greater than 0). Then leave the equivalent and only claim port quantities.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs16b';

-- =====================================================================
-- 4. Capacitors & RC Transients
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'cap'
CROSS JOIN (VALUES
  (0,  'capacitor element law',
       'i = C dv/dt (passive signs). v cannot jump if i is finite — capacitor voltage is a state. Energy stored: (1/2) C v^2. DC steady state: dv/dt = 0 so i = 0, the capacitor is an open. 16B: an ideal C is not a resistor; never write v = i R_C.'),
  (1,  'why v_C is continuous',
       'A jump in v would mean an impulse of current (infinite i). Ordinary sources and resistors cannot supply that, so v_C(0+) = v_C(0−) unless the problem has an impulsive source or ideal charge share with a short. 16B switch problems: the initial condition is the voltage just before the switch, carried across t = 0.'),
  (2,  'series and parallel capacitors',
       'Parallel: C_eq = C1 + C2 (share v, charges add). Series: 1/C_eq = 1/C1 + 1/C2 (share i, voltages add). Opposite of resistors. 16B: two equal C in series give C/2. DC: series capacitors can have floating DC offsets from leftover charge — labs sometimes bleed them with a big R.'),
  (3,  'first-order RC natural response',
       'Source-free: C discharges through R. v_C(t) = v_C(0) e^{-t/τ} with τ = R C. Current i = C dv/dt is the same exponential. Time constant τ is when the exponential has fallen to 1/e ≈ 0.37. After 5τ the transient is practically gone. 16B: find R as the Thevenin seen by C.'),
  (4,  'forced / step response of RC',
       'With a DC Thevenin v_th turned on at t = 0: v_C(t) = v_final + (v_initial - v_final) e^{-t/τ}. v_final is DC steady state (C open), v_initial is v_C(0+), τ = R_th C. 16B template: write those three numbers, then the exponential. Do not solve the DE from scratch every time.'),
  (5,  'finding τ',
       'Look from the capacitor''s terminals: kill independent sources, R_th of what remains, τ = R_th C. A shorted voltage source can change which resistors C sees. 16B: redraw after the switch moves — τ before and after the switch need not match. Two capacitors generally make a second-order circuit unless they combine to C_eq.'),
  (6,  'RC as a DE',
       'KCL at the capacitor node: C dv/dt + v/R = i_s or v_s / R, depending on the circuit. Standard form dv/dt + v/τ = v_final / τ. Homogeneous solution Ae^{-t/τ}; particular solution for DC is the constant v_final. 16B: this is the same first-order linear DE as 16A, derived from a part.'),
  (7,  'integrator / differentiator intuition',
       'i = C dv/dt means a capacitor voltage is the integral of current (times 1/C). A current into C ramps v. Differentiating v gives spikes at jumps. 16B op-amp week: an op-amp capacitor in feedback makes a nice integrator because the op-amp holds the other node. A lone C is a leaky integrator when a resistor is present.'),
  (8,  'switch at t = 0 recipe',
       't less than 0: assume DC forever, C is open, find v_C(0−). t = 0+: v_C unchanged, redraw with the new switch position, find R_th and v_final. Write v_C(t) = v_f + (v_0 - v_f) e^{-t/τ} for t greater than 0. Then any other v or i from KCL/Ohm using that v_C(t).'),
  (9,  'RC low-pass vs high-pass (preview)',
       'Series R then C to ground: v_C prefers slow signals (low-pass). Series C then R to ground: v_R prefers fast edges (high-pass). Cutoff ω = 1/τ = 1/(RC). 16B phasor week makes this H(jω). Already at transients: a step into an RC low-pass is the exponential rise you just solved.'),
  (10, 'energy during a transient',
       'The capacitor energy changes from (1/2)C v_i^2 to (1/2)C v_f^2. The resistor burns the difference plus whatever the source pumped. You cannot recover resistor heat. 16B: charging a C from a DC source through R dumps half the sourced energy in R if you go from 0 to V (classic paradox / accounting exercise).'),
  (11, 'continuity vs KCL at a node of only capacitors',
       'If two capacitors and a switch force charge redistribution, v may jump while total charge on a floating node is conserved. 16B: this is the exception to "v_C continuous." Write Q conservation, not v conservation, at that node. Ordinary homework RC with a resistor does not do this.'),
  (12, 'units of τ',
       'R in ohms, C in farads, τ in seconds. 1 kΩ * 1 μF = 1 ms. 16B labs live in ms and μs. If τ comes out in hours, you used F instead of μF. Write C = 1e-6 F once. Angular cutoff 1/τ has units rad/s; f_c = 1/(2π RC) is hertz.'),
  (13, 'initial current in an RC step',
       'At t = 0+, v_C is still v_0, so the resistor sees v_th - v_0 and i(0+) = (v_th - v_0)/R. At infinity, i = 0. The current jumps; the capacitor voltage does not. 16B: people plot v_C continuous and i discontinuous — both are correct for this model.'),
  (14, 'RC exam move',
       'State: C voltage continuous. Find v(0+), v(infinity) with C as open, τ = R_th C after the switch. Write the one-line exponential. Get i = C dv/dt or (v_R)/R. Sketch: start at v(0+), aim at v(infinity), 63% of the gap in one τ. If two independent C voltages, it is not first-order.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs16b';

-- =====================================================================
-- 5. Inductors & RL Transients
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'ind'
CROSS JOIN (VALUES
  (0,  'inductor element law',
       'v = L di/dt (passive signs). Current cannot jump if v is finite — inductor current is a state. Energy stored: (1/2) L i^2. DC steady state: di/dt = 0 so v = 0, the inductor is a short. Dual of the capacitor. 16B: never write Ohm on L except in the phasor world (jωL).'),
  (1,  'why i_L is continuous',
       'A jump in i would mean an impulse of voltage. Ordinary circuits keep i_L(0+) = i_L(0−). Opening a current-carrying inductor produces a huge v (spark, flyback) because the model wants to keep i going. 16B labs: that is why you do not hot-unplug an inductive load without a diode path.'),
  (2,  'series and parallel inductors',
       'Series: L_eq = L1 + L2 (same i, voltages add). Parallel: 1/L_eq = 1/L1 + 1/L2. Same combining rule as resistors, opposite of capacitors. Mutual inductance M is extra (coupled coils); 16B may only mention it. Uncoupled assumption: no M unless drawn.'),
  (3,  'first-order RL natural response',
       'Source-free: i_L(t) = i_L(0) e^{-t/τ} with τ = L/R, where R is the resistance the inductor sees. Voltage v_L = L di/dt decays the same way. Dual of RC: now the exponential is in current. 16B: large L or small R means a slow current decay.'),
  (4,  'forced / step response of RL',
       'i_L(t) = i_final + (i_initial - i_final) e^{-t/τ}. i_final from DC (L is a short). i_initial = i_L(0+). τ = L / R_th seen by L. 16B: copy the RC template with current as the state. A step voltage through R into L makes i rise toward V/R with that τ.'),
  (5,  'finding τ for RL',
       'From the inductor''s port, kill independent sources, R_th of the rest, τ = L / R_th. Dual of τ = R_th C. If R_th = 0, τ is infinite in the model (lossless loop — current never decays). 16B: a superconducting loop is that ideal; your copper winding is not.'),
  (6,  'RL as a DE',
       'KVL: L di/dt + R i = v_s. Standard form di/dt + i/τ = i_final / τ. Same first-order linear DE. 16B: write this from the schematic rather than memorizing which variable is the exponential. If the unknown you were asked is a voltage, it may jump; recover it from v_L = L di/dt and Ohm.'),
  (7,  'duality RC ↔ RL',
       'v_C ↔ i_L, i_C ↔ v_L, C ↔ L, R ↔ 1/R (or G). Open ↔ short in DC. 16B: if you can solve RC in your sleep, relabel for RL. Exams still want you to derive from KVL, but duality is the check. τ_RC = RC, τ_RL = L/R — do not swap them.'),
  (8,  'switch recipe for RL',
       't less than 0, DC: L is a short, find i_L(0−). t = 0+: i_L unchanged, new R_th and i_final. Write the exponential for t greater than 0. Other voltages may jump at t = 0 because v_L can jump when di/dt jumps. 16B: plot i_L continuous, v_L possibly discontinuous.'),
  (9,  'inductor as a current source (instant)',
       'On a short timescale compared with τ, i_L is almost constant, so L looks like a current source of value i_L(0). On a long timescale it looks like a short. 16B: this is the dual of "C looks like a voltage source of v_C(0) just after a switch, and an open at DC."'),
  (10, 'energy and flyback',
       '(1/2) L i^2 has to go somewhere if you interrupt i. A diode (freewheel) gives a path; otherwise v spikes until something arcs or a FET avalanches. 16B devices week: that diode is a circuit-model fix, not a mystery. Power electronics (Pilawa''s world) lives on this energy.'),
  (11, 'units',
       'L in henries. 1 mH through 1 kΩ: τ = L/R = 1 μs. Lab inductors are often mH–μH; parasitic L of a wire is nH. 16B: if τ is ridiculous, you mixed mH and H. Angular: the impedance jωL matches 1/jωC later; already, L/R has seconds.'),
  (12, 'series R-L with a DC source',
       'i(t) = (V/R)(1 - e^{-t/τ}) if i(0)=0, τ = L/R. Initial di/dt = V/L (all voltage on L at t=0+ because i=0 so v_R=0). Final: all voltage on R. 16B: this is the twin of charging C through R, with i ↔ v.'),
  (13, 'cannot combine L and C into one first-order τ',
       'One independent energy-storage element (after combining series/parallel) implies first-order. An L and a C that cannot be merged make second-order (next section). 16B: count independent L currents and C voltages. If the count is 2, do not force a single exponential.'),
  (14, 'RL exam move',
       'State: L current continuous. DC: L is a short. Find i(0+), i(infinity), τ = L/R_th. Write i_L(t). Then v_L = L di/dt (will be a pure exponential decaying to 0 for DC sources). Dual-check against the RC template. Sketch i starting at i(0+), heading to i(infinity).')
) AS c(pos, front, back)
WHERE d.slug = 'eecs16b';

-- =====================================================================
-- 6. Second-Order RLC Circuits
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'rlc'
CROSS JOIN (VALUES
  (0,  'second-order because two states',
       'Independent v_C and i_L (or two C, two L) give a 2nd-order DE. Characteristic equation s^2 + 2α s + ω0^2 = 0 (notation varies: sometimes 2ζω_n s). 16B: write KVL/KCL, substitute element laws, eliminate to one variable, read α and ω0 off the DE. Do not start with a memorized table until the DE is on the page.'),
  (1,  'undamped LC: ω0',
       'Lossless LC: oscillation at ω0 = 1/sqrt(L C) rad/s (series or parallel — check the DE). Period T = 2π/ω0. Energy sloshes between (1/2)C v^2 and (1/2)L i^2. 16B: R = 0 is over-ideal; a little R makes the sinusoid decay. Natural frequency vs resonant frequency: they meet when damping is light.'),
  (2,  'damping α and the three cases',
       'Overdamped: two real decaying exponentials (α^2 greater than ω0^2). Critically damped: (A + B t) e^{-α t} (α = ω0). Underdamped: e^{-α t} (A cos ω_d t + B sin ω_d t) with ω_d = sqrt(ω0^2 - α^2). 16B: "rings" means underdamped. "No overshoot, two time constants" means overdamped.'),
  (3,  'series RLC vs parallel RLC',
       'Series: R, L, C in one loop; current is the shared state-ish variable; α = R/(2L). Parallel: α = 1/(2 R C). The ω0 = 1/sqrt(LC) is the same shape if the DE is written in standard form. 16B: do not grab series α for a parallel schematic. Redraw, then identify series vs parallel.'),
  (4,  'step response of RLC',
       'Same cases, plus a particular solution (DC final values: L short, C open). Total = natural + forced. Fit A, B with two initial conditions: v_C(0+) and i_L(0+), which may determine dv_C/dt(0+) via i_C = C dv/dt. 16B: you need two ICs. One is not enough.'),
  (5,  'quality factor Q (16B level)',
       'Q = ω0 / (2α) for these second-order circuits (equivalent forms Q = ω0 L / R series, Q = R / (ω0 L) parallel). High Q: rings a long time, sharp resonance later in phasors. Q = 1/2 is critical damping. 16B: Q is a single number that tells you the case and how peaky H(jω) will be.'),
  (6,  'critical damping in words',
       'Fastest return to steady state without ringing. Used in some instrument movements and (loosely) in control. On an exam, α = ω0 is the algebraic test. The t e^{-α t} term is easy to forget when matching ICs. 16B: if they ask "choose R so it is critical," solve α(R) = ω0.'),
  (7,  'underdamped envelope',
       'The e^{-α t} envelope decays with time constant 1/α. Oscillation period 2π/ω_d, a bit slower than 2π/ω0. 16B sketches: draw the envelope first, then fill in a few cycles. Measuring α from a lab ring-down: ln of successive peaks.'),
  (8,  'initial conditions from the circuit',
       'v_C(0+) from continuity. i_L(0+) from continuity. Then i_C(0+) = C dv/dt(0+) from KCL at the capacitor (using i_L(0+) and resistors). That gives the second IC on v. Dual for di_L/dt(0+) from KVL. 16B: this is the step people skip, then they cannot find A and B.'),
  (9,  'DC final values in RLC',
       'Long after a DC step: inductors shorts, capacitors opens. A series RLC with a DC voltage ends with i = 0 and v_C = V_source (C charged, L idle). A parallel RLC with a DC current ends with v = 0 if there is a path... draw it. 16B: finals are a resistive DC circuit, not a second-order problem.'),
  (10, 'characteristic roots as natural frequencies',
       's = -α ± sqrt(α^2 - ω0^2) (overdamped, both negative if passive). Underdamped: s = -α ± j ω_d. Left-half-plane roots mean decaying transients (passive R,L,C). 16B: this is the circuit origin of the 16A "poles in the left half-plane" slogan. Same s, now from L and C.'),
  (11, 'when two C or two L still first-order',
       'If capacitors combine to one C_eq (series/parallel) and there is no independent L, still first-order. Independent means you cannot write one voltage as a constant times the other by a loop of only capacitors (with possible voltage sources). 16B: count states, do not count components.'),
  (12, 'RLC lab picture',
       'A square wave into a series RLC looks like a step train: each edge launches a transient. Underdamped: ringing on the edges. Overdamped: sluggish corners. 16B scope: if you see ringing you did not expect, parasitic L/C or a high-Q tank is in the circuit (leads, ground loop).'),
  (13, '16B vs 16A on second-order',
       '16A: abstract x-dot = A x, eigenvalues, damping from |λ|. 16B: the entries of A are 1/C, R/L, etc., and you can solder it. Same characteristic polynomial. Do not diagonalize a 2x2 unless asked; complete-the-square / quadratic formula on the DE is the 16B move.'),
  (14, 'RLC exam move',
       'Identify series vs parallel. Write the 2nd-order DE or quote α, ω0 with the matching formula after a 2-line derivation. Classify damping. Write the right functional form. ICs: v_C(0+), i_L(0+), convert to the unknown and its derivative. Forced DC: add the constant particular solution. Sketch using envelope vs two real exponentials.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs16b';

-- =====================================================================
-- 7. Phasors & Impedance
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'phasor'
CROSS JOIN (VALUES
  (0,  'why phasors',
       'In sinusoidal steady state, every v and i is a sinusoid at the same ω (linear circuit). Encode A cos(ωt + φ) as the complex number A e^{j φ} (or RMS versions — pick the staff convention). Then KCL/KVL stay algebraic: no DEs. 16B: transients died; you are finding the particular solution at frequency ω.'),
  (1,  'Euler and the 16B phasor',
       'A cos(ωt + φ) = Re{ A e^{j φ} e^{j ω t} }. The phasor is V = A e^{j φ} (peak) or A/sqrt(2) e^{j φ} (RMS). Convert back: magnitude and angle of the complex answer, then write the cosine. 16B: mixing peak and RMS in one problem is the silent factor-of-sqrt(2) bug. State which you use.'),
  (2,  'impedance of R, L, C',
       'Z_R = R. Z_L = j ω L. Z_C = 1 / (j ω C) = -j / (ω C). Ohm''s law for phasors: V = I Z. High ω: L looks open-ish (|Z| large), C looks short. Low ω: L shorts, C opens — same as DC. 16B: write jωL and 1/(jωC) before combining; do not memorize a zoo of special cases first.'),
  (3,  'admittance',
       'Y = 1/Z. Parallel elements add Y; series add Z. Y_C = j ω C, Y_L = 1/(j ω L). 16B nodal in the phasor domain is KCL with Y (V_a - V_b). Same nodal analysis as resistors, complex numbers instead of reals.'),
  (4,  'series and parallel impedances',
       'Series: Z_eq = Z1 + Z2. Parallel: Z_eq = Z1 Z2 / (Z1+Z2). Voltage and current dividers work with Z in place of R. 16B: a divider ratio is now complex — magnitude is the amplitude ratio, angle is the phase shift. That ratio is already a transfer function H(jω).'),
  (5,  'KCL/KVL in the phasor domain',
       'Unchanged: sum I = 0, sum V = 0, but I and V are complex. Independent sources become their phasors. Dependent sources: same gain, complex V_x. 16B: you may use Thevenin with Z_th(jω). Superposition over different frequencies: one phasor problem per ω, then add time-domain sinusoids (not the phasors at different ω).'),
  (6,  'impedance triangle / power factor (light)',
       'Z = R + j X. X greater than 0 is inductive (current lags voltage). X less than 0 is capacitive (current leads). Power factor cos θ where θ = angle(Z) for a passive load. 16B optional Note on AC power: average power is (1/2) Re{V I*} in peak phasors, or V_rms I_rms cos θ.'),
  (7,  'resonance (series)',
       'Series RLC: Z = R + jωL + 1/(jωC) is real (min |Z|) at ω0 = 1/sqrt(LC). Current max for a voltage source. Q = ω0 L / R. 16B: this is the frequency-domain face of the underdamped tank. Bandwidth ≈ ω0 / Q for high Q.'),
  (8,  'resonance (parallel)',
       'Parallel RLC: Y min (max |Z|) at ω0 = 1/sqrt(LC). Voltage peaks for a current source. Q = R / (ω0 L) = R ω0 C. 16B: do not mix series and parallel Q formulas. "Tank circuit" in radios is usually parallel.'),
  (9,  'from DE to jω',
       'Replace d/dt by jω in the sinusoidal particular solution. That is why Z_L = jωL (v = L di/dt) and Z_C = 1/(jωC) (i = C dv/dt). 16B: phasors are not a new physics — they are the eigenfunction e^{jωt} trick from 16A, soldered to R, L, C.'),
  (10, 'DC as ω = 0 phasors',
       'ω = 0: Z_L = 0 (short), Z_C infinite (open), Z_R = R. Phasor analysis reproduces DC. 16B: a circuit with DC and AC sources uses superposition: DC problem (C open, L short) plus one phasor problem per AC frequency. Add in the time domain.'),
  (11, 'polar vs rectangular',
       'Add in rectangular (a+jb); multiply/divide in polar (r e^{jθ}). 16B arithmetic: convert often. Angle of a product is the sum of angles; angle of 1/Z is minus angle of Z. Conjugate for power I*. A calculator in degrees vs radians will ruin φ — match the problem statement.'),
  (12, 'impedance seen by a source',
       'Z_in = V_source / I_source with load attached. Matches Thevenin Z_th only if you look from a port with independent sources off — different question. 16B: "input impedance of this filter" means drive with a test phasor, find V/I at that port.'),
  (13, 'complex arithmetic 16B actually uses',
       'Same as 16A Euler: j^2 = -1, 1/j = -j, |a+jb| = sqrt(a^2+b^2). 16B adds: multiply numerator and denominator by the conjugate to invert Z. Lee & Varaiya is optional review; you need fluency, not a signals proof. If |H| is not dimensionless, you computed V/V wrong.'),
  (14, 'phasor exam move',
       'State peak vs RMS. Replace L,C by jωL, 1/(jωC). Draw the Z circuit, then nodal/mesh/divider as if it were resistors. Convert the complex V back to A cos(ωt+φ). Check limits: ω to 0 and ω to infinity match C opens/shorts and L shorts/opens. Units: ohms for Z, volts for V.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs16b';

-- =====================================================================
-- 8. Transfer Functions, Filters & Bode
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'freq'
CROSS JOIN (VALUES
  (0,  'transfer function H(jω)',
       'H(jω) = V_out(jω) / V_in(jω) (or I_out / I_in, as defined). Magnitude |H| is the gain; arg(H) is the phase shift. 16B: find H with a voltage divider of impedances, or nodal, then replace Z(jω). A cosine in becomes |H| times a cosine at the same ω, plus the phase, in steady state (assuming a stable circuit).'),
  (1,  'first-order low-pass',
       'Prototype: H(jω) = 1 / (1 + jω/ω_c), ω_c = 1/(RC) for the series-R shunt-C divider. |H| ≈ 1 below ω_c, falls as 1/ω above (–20 dB/decade). Phase from 0 toward –90°. 16B: this is the phasor of the RC you already solved. Cutoff is where |H| = 1/sqrt(2) (–3 dB).'),
  (2,  'first-order high-pass',
       'H(jω) = (jω/ω_c) / (1 + jω/ω_c), series-C shunt-R. |H| ≈ 0 at DC, ≈ 1 above ω_c. Phase from +90° toward 0. 16B: blocks DC, passes edges. Same ω_c = 1/(RC). Swap C and R relative to the low-pass divider and you swap LPF/HPF.'),
  (3,  'dB and decades',
       '|H|_dB = 20 log10 |H|. –3 dB is |H| = 1/sqrt(2). A decade is ×10 in ω; an octave is ×2. First-order rolloff is –20 dB/decade = –6 dB/octave. 16B Bode: plot dB vs log ω. Zeroes of H raise the slope by +20; poles drop it by –20 per decade (simple real poles/zeros).'),
  (4,  'Bode magnitude sketch (first-order)',
       'Straight-line approx: 0 dB until ω_c then –20 dB/decade for a low-pass pole. Actual curve is –3 dB at ω_c. 16B: they want the sketch plus the exact |H(jω_c)|. Do not spend the exam computing 20 log of 12 points unless asked. Label axes: log ω, dB.'),
  (5,  'Bode phase sketch (first-order)',
       'A pole at ω_c: phase starts at 0, is –45° at ω_c, ends at –90°. The transition spans roughly a decade below to a decade above. A zero flips the signs to positive phase. 16B: high-pass is a zero at 0 (starts at +90°) plus a pole at ω_c.'),
  (6,  'second-order filters (light)',
       'LPF/HPF/BPF/notch from RLC. High Q: peak near ω0, steep skirts. Low-pass second-order rolls –40 dB/decade after ω0. 16B: write H(jω) from Z divider, identify ω0 and Q, then sketch. Matching a cascade of two first-order sections is not the same as one high-Q RLC (no peak if both poles are real).'),
  (7,  'cutoff / 3 dB frequency',
       'Defined by |H| = |H|_max / sqrt(2) unless the problem says otherwise. For the simple first-order LPF, that is ω_c = 1/τ. For a high-Q bandpass, two cutoffs around ω0, bandwidth ω0/Q. 16B: compute |H(jω)|^2 = 1/2 and solve rather than guessing from a sketch.'),
  (8,  'loading and cascading filters',
       'Two RC sections in cascade without a buffer load each other: the transfer function is not H1 H2 of the isolated dividers. An op-amp buffer (next section) lets you multiply transfer functions. 16B: if you write H = H1 H2, you assumed isolation (zero output impedance, infinite next Rin, or an op-amp in between).'),
  (9,  'from H(jω) back to a DE',
       'H(s) with s = jω is the same rational function you get from Laplace of the circuit DE (rest ICs). 16B may stay on the jω axis. Poles of H are the natural frequencies of the circuit. A right-half-plane pole would mean an unstable analog filter — passive RLC will not do that.'),
  (10, 'all-pass / phase (light)',
       'Some op-amp circuits have |H| constant but frequency-dependent phase (all-pass). 16B: if |H| is flat and phase moves, it is not a magnitude filter. Delay of a sinusoid is –φ/ω. Group delay is a 120/105 topic; here, just read φ(ω) off arg(H).'),
  (11, 'design a first-order cutoff',
       'Pick ω_c, pick a convenient C from the lab drawer, R = 1/(ω_c C). Or pick R first. 16B labs: 3.3 kΩ and 0.1 μF is a ~500 Hz-ish scale (compute exactly: 1/(2π RC) for f_c). Always convert ω vs f: ω_c = 2π f_c. Mixing Hz and rad/s is the other silent bug next to RMS vs peak.'),
  (12, 'impedance vs transfer function',
       'Z_in is V/I at one port. H is an output over an input, often two different ports. A filter can have a nice H and a nasty Z_in (hard to drive). 16B: both show up. Thevenin of the source plus Z_in sets how much the generator sags. H assumes a defined V_in already at the input terminals.'),
  (13, 'Bode vs the exact |H|',
       'Straight-line Bode is a sketch. Exact |H| = |numerator| / |denominator| with jω plugged in. At a decade above a first-order pole, the sketch is already close. At ω_c it is off by 3 dB on purpose. 16B: if they want numbers at ω = 10^3, use the exact complex H, not the stick figure.'),
  (14, 'filter exam move',
       'Write H(jω) from the divider. Identify zeros (numerator) and poles (denominator). Classify LPF/HPF/BPF by |H| at ω=0 and ω→infinity. Mark ω_c or ω0, Q. Sketch Bode sticks, note –3 dB. Check loading if stages cascade. Convert a required f_c into RC. State dB = 20 log10 |H|.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs16b';

-- =====================================================================
-- 9. Op-Amps & Signal Processors
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'opamp'
CROSS JOIN (VALUES
  (0,  'ideal op-amp terminals',
       'Two inputs (v+, v−), one output, power rails (±V_S, often omitted on 16B sketches). Differential input v_id = v+ − v−. Ideal: infinite gain, infinite Rin, zero Rout. Output can source/sink whatever current the feedback network needs (until the rails). 16B: the triangle is not a floating two-terminal part — current comes from the rails.'),
  (1,  'golden rules (negative feedback)',
       '(1) i+ = i− = 0 (no input current). (2) v+ = v− (virtual short) if the op-amp is in negative feedback and linear (not railed). 16B: rule 2 is a consequence of huge gain plus feedback forcing v_id ≈ 0. It is not true in open loop or in positive feedback (comparator). Always check that feedback is negative first.'),
  (2,  'voltage follower / buffer',
       'Output wired to v−, input to v+. Then v_out = v_in. Infinite (ideal) Rin, zero Rout — the isolation box that lets you cascade filters. 16B labs: buffer a divider so the next stage does not load it. If you omit the feedback wire, you built a comparator, not a buffer.'),
  (3,  'inverting amplifier',
       'R_in from v_in to v−, R_f from v_out to v−, v+ grounded. v_out / v_in = − R_f / R_in. Virtual ground at v−. Input current v_in / R_in all goes through R_f. 16B: the minus sign is the inversion. Rin of the stage is R_in (the virtual ground eats the divider).'),
  (4,  'noninverting amplifier',
       'v_in to v+, divider R1 (to ground) and R2 (to v_out) on v−. v_out / v_in = 1 + R2/R1. High input impedance (ideal). 16B: gain is at least 1. A follower is the R2=0 or R1 open special case. Do not swap this formula with the inverting −Rf/Rin.'),
  (5,  'summing amplifier',
       'Several input resistors to the inverting node, one R_f. v_out = − R_f (v1/R1 + v2/R2 + ...). Virtual ground sums currents. 16B: this is analog addition. Weights are R_f/R_k. A weighted summer is how you make a cheap DAC with binary-weighted resistors (lab flavor).'),
  (6,  'difference / instrumentation flavor',
       'A difference amp (one op-amp) does v_out = (R_f/R)(v2 − v1) with matched ratios. Instrumentation amps add buffers for high Zin. 16B: mismatched resistors wreck CMRR — why 0.1% parts or a trim show up. Catalog "op-amp signal processors" means these linear stages, not a CPU.'),
  (7,  'op-amp integrator',
       'Inverting config with C in feedback, R at the input. v_out = − (1/(R C)) integral v_in dt (ideal, plus a DC term from initial charge). 16B: a resistor across C (DC feedback) keeps it from ramping to the rail on offset. Differentiator: C at the input, R in feedback — noisy, used less.'),
  (8,  'saturation / rails',
       'If the golden-rule prediction wants |v_out| above the supply, the op-amp saturates and v+ = v− is false. Output sits near a rail. 16B: after solving, check |v_out| vs V_S. Comparators use this on purpose (no negative feedback). A linear amplifier accidentally railed is a wrong operating region, not a new gain formula.'),
  (9,  'negative vs positive feedback',
       'Negative: a fraction of v_out comes back to v− (or the loop inverts). Stabilizes to the virtual short. Positive: feedback to v+ — regenerates, used in Schmitt triggers and oscillators. 16B: if you cannot tell the sign of the loop, do not apply golden rule 2. Sketch the path from v_out to the inputs.'),
  (10, 'finite gain (light)',
       'v_out = A (v+ − v−) with A large but finite. Closed-loop gain is less than the ideal golden-rule gain by a factor involving A β (loop gain). 16B: usually A → infinity is enough. If they give A, keep v_out / A = v+ − v− as an extra equation instead of v+ = v−.'),
  (11, 'op-amp with complex Z (filters)',
       'Replace R_f or R_in by Z(jω): inverting H(jω) = − Z_f / Z_in. First-order active LPF: Z_f is R || C. Sallen–Key and friends are 105/140; 16B wants the inverting/noninverting Z ratio and maybe an RC on a follower. Active filters can have gain; passive RC cannot exceed 1 in |H| for a simple divider.'),
  (12, 'why rails and bypass caps in lab',
       'The model ignores power pins. Real chips need V+ / V− (or single supply) and 0.1 μF nearby or they oscillate. 16B lab: "no output" is often missing supplies or a floating v+. Dual-supply vs single-supply biasing is a practical golden-rule add-on (virtual ground at mid-rail).'),
  (13, 'ideal vs 16A "op-amp as a gain block"',
       '16A might treat H as an abstract gain. 16B: the gain is made of a triangle plus a few R''s, and the current in R_f is real. Power into a load is supplied by the rails, not by v_in. 16B energy: the signal source may provide almost no power (buffer).'),
  (14, 'op-amp exam move',
       'Confirm negative feedback. Apply i+=i−=0 and v+=v−. KCL at v− (virtual ground in the inverting case). Solve v_out. Check rails. Name the circuit (inverting, noninverting, follower, summer, integrator). If Z(jω), write H(jω) = −Z_f/Z_in. If the output is stuck at a rail, drop rule 2 and treat it as a DC source at the rail.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs16b';

-- =====================================================================
-- 10. Feedback, Devices & Analogies
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'fbdev'
CROSS JOIN (VALUES
  (0,  'feedback in one 16B paragraph',
       'Sense the output, return a correction to the input. Negative feedback trades raw gain for accuracy, lower distortion, designed closed-loop gain (the golden-rule ratios), and usually better bandwidth*gain tradeoffs. 16B: the op-amp circuits you already use are the main example. Control-theoretic state-space is 16A leftovers / EE 128 — do not import SVD.'),
  (1,  'loop gain and "why golden rules work"',
       'A huge A with a feedback factor β makes the error v+ − v− ≈ v_out / A tiny. Closed-loop gain ≈ 1/β, set by the network, not by A. 16B: this is why 1 + R2/R1 is trustworthy even if A varies from chip to chip. If A β is not large, use the finite-A formula.'),
  (2,  'stability slogan (circuits, not 16A unit circle)',
       'Too much delay or extra poles in the loop and negative feedback becomes positive at some frequency — oscillation (op-amp with a capacitive load, no compensation). 16B: if a follower rings on the scope, think loop stability, not a new KVL. Compensation and GBW are EE 105; here, recognize ringing vs RC exponential.'),
  (3,  'ideal diode model',
       'On: short (or 0.7 V battery in the practical model) if that assumption is consistent with i greater than 0. Off: open if v assumed reverse is consistent. 16B: guess region, solve, check the inequality. A rectifier is a diode plus R (and C for filtering). Do not Thevenin a diode network and treat R_th as valid for all v.'),
  (4,  'piecewise-linear diode',
       'Off until v_on (about 0.7 V for Si), then a battery v_on in series with small r_d, or just the battery. Exponential Shockley law is EE 105. 16B: piecewise plus KVL is enough for clippers, clampers, and "which diodes conduct." Superposition fails (nonlinear).'),
  (5,  'rectifier and DC from AC',
       'Half-wave: one diode, pulses of sine. Full-wave / bridge: both halves. C after the diode holds up v with ripple ≈ I_load / (f C) (order-of-magnitude). 16B lab: that C is why a supply looks DC. Ripple vs τ = R_load C. Peak inverse voltage on the diode matters or it breaks.'),
  (6,  'MOSFET as a switch (16B level)',
       'Gate voltage turns a channel on (low R_DS) or off (open). Digital inverters: NMOS/PMOS pull down/up. Analog: a voltage-controlled resistor or current source in saturation — models, not layout. 16B catalog "devices": i-v curves you can put in a KCL schematic, not a fab sequence. EE 105/130 own the physics depth.'),
  (7,  'load line',
       'The rest of the circuit imposes a straight i vs v constraint (Thevenin). The device imposes its i-v curve. Operating point is the intersection. 16B: this is how you bias a diode or a FET without solving exponentials. Move the Thevenin, the intersection moves.'),
  (8,  'small-signal linearization',
       'At a DC bias, replace a nonlinear device by a tangent (r_d, g_m v_gs, ...). Then all of Thevenin, phasors, and op-amp formulas apply to the increments. 16B: this is the bridge from devices back to linear circuits. The small-signal model is not valid for large swings (the rectifier is not small-signal).'),
  (9,  'circuit models beyond electronics',
       'Across-variable analog of voltage: force, pressure, temperature difference. Through-variable analog of current: velocity, volume flow, heat flow. A mass is an "inductor" (f = m dv/dt), a spring a "capacitor" (or vice versa depending on effort/flow convention). 16B catalog line: the same KCL/KVL graph models a hydraulic or thermal network.'),
  (10, 'impedance analogy (mechanical)',
       'If you take force ~ voltage and velocity ~ current (one common pick), a damper is a resistor, a mass is an inductor, a spring is a capacitor. Then ω0 = sqrt(k/m) is the LC resonance. 16B: you will not become a mechanical engineer in week 14; you will write one loop of "KVL" for a mass-spring-damper and recognize the RLC DE.'),
  (11, 'feedback around a plant (light)',
       'A circuit that senses v_out and subtracts a fraction from v_in is a proportional controller. Closed-loop gain is approximately the inverse of the feedback divider if the forward gain is large — same story as the op-amp. 16B: this is the catalog word "feedback methods" without Lyapunov. If they give a block diagram, write Y = G (U − H Y) and solve Y/U = G/(1+GH).'),
  (12, '16B vs EE 40 vs EE 105',
       'Old EE 40 was intro circuits plus a pile of device physics. Redesigned 16B is EE-40-like circuits with a lighter device pass and explicit feedback/analogies. EE 105 is where MOSFET equations and analog building blocks get serious. 16B: you should analyze RLC + op-amp + a diode clipper confidently; you should not fake a square-law GM stage on an exam unless they taught it.'),
  (13, 'lab debugging 16B',
       'No output: supplies, ground, floating input. Distorted sine: rails, slew, wrong gain. RC times disagree: prefix error, scope probe, Thevenin loading. Ringing: inductance or unstable op-amp loop. 16B: compare measurement to a first-order prediction before spinning a story. The golden-rule schematic is a model; the breadboard has extra C and L.'),
  (14, 'devices exam move',
       'Nonlinear? Guess diode/FET region, solve linear KVL/KCL, check i and v inequalities. Feedback? Negative plus large gain → golden rules or Y/U = G/(1+GH). Analogy? Name effort and flow, write the graph, reuse the RLC DE. Small-signal? Bias first, then r or g_m. Do not apply phasor Thevenin across a rectifier and call it a day.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs16b';

UPDATE public.decks
SET card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE slug = 'eecs16b';
