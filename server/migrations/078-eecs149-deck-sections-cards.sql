-- Migration 078: EECS 149 — Introduction to Embedded and Cyber Physical
-- Systems, new preset deck.
-- UC Berkeley Fall 2026: Prabal Dutta and Sanjit A. Seshia, MoWe
-- 14:00-15:29, Gateway 1220. Labs in Cory 204. Co-listed ELENG C249A /
-- COMPSCI C249A (same lecture; grad code). Catalog: modeling, analysis,
-- and design of embedded CPS; integrate computation with physical
-- processes. Topics: models of computation, control, verification,
-- interfacing, real-time, mapping to platforms, distributed embedded.
-- Strong lab / semester project. Text: Lee and Seshia, Introduction to
-- Embedded Systems — A Cyber-Physical Systems Approach, 2nd ed. (LS).
-- Sequence follows LS parts I-III and recent 149/249A calendars: CPS
-- intro, continuous, discrete/FSM, hybrid + composition, concurrent
-- MoCs, sensors/processors/I/O, multitasking/scheduling, LTL, model
-- checking/WCET, security and networks. Distinct from 16A (signals),
-- 16B/EE 64 (circuits), 127 (optimization models), and CS 162 (OS
-- without CPS/real-time theory). Prereqs: CS 61C, CS 70; EE 66 and 64
-- (redesigned 16A/16B) or permission.

INSERT INTO public.decks (owner_id, slug, title, description, class_id, source, is_public, cover_emoji, card_count)
VALUES (
  NULL,
  'eecs149',
  'EECS 149',
  'Embedded and CPS — FSMs, hybrid, MoCs, RTOS, LTL (Dutta / Seshia)',
  'uc-berkeley:eecs149:fa26',
  'system',
  true,
  '🔌',
  0
)
ON CONFLICT (slug) DO UPDATE SET
  title       = EXCLUDED.title,
  description = EXCLUDED.description,
  class_id    = EXCLUDED.class_id,
  cover_emoji = EXCLUDED.cover_emoji;

UPDATE public.classes
SET title = 'Introduction to Embedded and Cyber Physical Systems'
WHERE id = 'uc-berkeley:eecs149:fa26';

DELETE FROM public.saved_tidbits
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'eecs149');

DELETE FROM public.tidbits
WHERE category_id = 'eecs149';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'eecs149');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'eecs149');

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('cps',    'Cyber-Physical Systems',
   'What CPS is, design process, 149 vs 16A/162 (LS 1)', 0),
  ('cont',   'Continuous Dynamics and Control',
   'Actors, ODEs, LTI, feedback (LS 2)', 1),
  ('disc',   'Discrete Dynamics and FSMs',
   'State, FSM, extended and timed automata (LS 3)', 2),
  ('hybrid', 'Hybrid Systems and Composition',
   'Modes, hierarchy, concurrent FSMs (LS 4-5)', 3),
  ('moc',    'Concurrent Models of Computation',
   'SR, dataflow, discrete-event, time (LS 6)', 4),
  ('hw',     'Sensors, Processors, Memory, I/O',
   'Platform mapping, ADC, interrupts (LS 7-10)', 5),
  ('rtos',   'Multitasking and Real-Time Scheduling',
   'Threads, RMS, EDF, priority inversion (LS 11-12)', 6),
  ('spec',   'Invariants, LTL and Refinement',
   'Safety/liveness, simulation, bisimulation (LS 13-14)', 7),
  ('verify', 'Reachability, Model Checking, WCET',
   'State explosion, abstraction, execution time (LS 15-16)', 8),
  ('apps',   'Security, Networks and Labs',
   'Crypto, information flow, distributed CPS (LS 17)', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'eecs149'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. Cyber-Physical Systems
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'cps'
CROSS JOIN (VALUES
  (0,  '149 in one sentence',
       'Model, analyze, and implement systems that mix software with physical processes: sensors, actuators, time, and networks, so the joint dynamics meet a spec. FA26: Dutta and Seshia, MoWe 14:00-15:29, Gateway 1220, labs Cory 204. Co-listed C249A (grad). Text: Lee and Seshia, Introduction to Embedded Systems (2nd ed.). 16A is signals; 16B is circuits; 127 is optimization; 162 is OS. 149 is the CPS course — models of computation plus platforms plus verification.'),
  (1,  'embedded vs cyber-physical',
       'Embedded: a computer dedicated to a device, often invisible (ABS, thermostat, pacemaker). Cyber-physical (CPS): computation, networking, and physical processes designed together — the physics is first-class, not just an I/O peripheral. 149: every lecture asks how time, concurrency, and the plant interact with the program. A web server is embedded-ish; a drone flight controller is CPS.'),
  (2,  'why CPS is hard (Lee/Seshia slogan)',
       'Software is discrete and sequential; physics is continuous and concurrent; networks add delay and loss. The hard problems are timing, concurrency, and meeting a spec under all of those. 149: correctness is not "the C compiled." It is "the closed-loop system never hits the unsafe set" and "the brake command arrives by the deadline."'),
  (3,  'design process (LS 1.3)',
       'Specification, modeling, design, analysis/verification, implementation, testing. Iterate. 149: you write a model (FSM, hybrid, actor) before (or with) the firmware. Model-based design: the model is a first-class artifact, not a sketch you throw away. Labs: a semester project that has to close the loop on real hardware.'),
  (4,  'specification vs implementation',
       'A spec says what must be true (safety: never enter a bad state; liveness: eventually do something useful). An implementation is one way to do it. 149: temporal logic and invariants are spec languages. An FSM can be a spec or a design. Confusing the two is how you "prove" a model that is not the code you flashed.'),
  (5,  'actors (preview, LS 2.2)',
       'An actor has input ports, output ports, and a firing rule. Signals (continuous or discrete) flow on connections. 149: this is the drawing language for plants and controllers. Composition of actors is a model of computation (how they fire together). Do not think "object with methods" — think "block with signals and time."'),
  (6,  'time is part of the spec',
       'A correct value late is a wrong value (airbag, motor commutation). Real-time: deadlines relative to physical time, not just throughput. 149: hard real-time (miss = failure) vs soft (miss degrades quality). 162 talks about fairness and throughput; 149 talks about worst-case execution time and RMS/EDF.'),
  (7,  'concurrency is not optional',
       'The plant evolves while the MCU is in an ISR, a thread, and a network stack. Shared variables without a model are races. 149: threads are one MoC, and a leaky one. Synchronous-reactive, dataflow, and state-machine composition are the alternatives you will be asked to compare.'),
  (8,  'heterogeneity',
       'One CPS uses continuous ODEs, discrete FSMs, and a network. No single MoC owns the system. 149: hybrid systems and actor composition are how you glue those views. Ptolemy-style hierarchical models (Lee''s group) are the intellectual home of the course, even if the lab MCU is C.'),
  (9,  'safety-critical examples',
       'Automotive (ABS, airbag, steer-by-wire), medical (infusion pump, pacemaker), avionics, industrial control, IoT locks. 149: these justify verification and WCET, not "move fast." A buffer overflow in a thermostat is annoying; in a brake ECU it is a recall. Security chapter (LS 17) is not optional color.'),
  (10, 'prereqs 149 actually uses',
       '61C: ISRs, memory-mapped I/O, caches (they wreck WCET). 70: FSMs, graphs, logic (LTL lives here). EE 66/64 (16A/16B): ODEs, LTI, circuits for sensors. 149: you will write C on a board and also draw a hybrid automaton. If you only have one of those skills, the other half of the course is the point.'),
  (11, '149 vs 16A vs 16B vs 127 vs 162',
       '16A: vectors, DTFS, LS, SVD, LTI as signals. 16B/EE 64: KVL, RLC, op-amps. 127: convex models, KKT. 162: processes, VM, filesystems. 149: those as ingredients — LTI plant plus FSM controller plus a scheduler plus a spec. If a question is "is this RMS-schedulable" or "write the LTL," it is 149.'),
  (12, 'C249A vs 149',
       'Same lectures (Dutta/Seshia). 249A is the grad code (ELENG/COMPSCI C249A): extra depth, often extra project/analysis. 149: undergrad CPS intro. Credit: they share a lecture; do not take both as if they were different courses. App alias maps C249A to this deck.'),
  (13, 'lab culture (Cory 204)',
       'Weekly lab plus a semester sequence: sense, actuate, close a loop, add concurrency, maybe a network. 149 outcome: you can take a spec to a board without pretending the physics is a printf. Debugging is half oscilloscope, half state-machine. Bring the model to lab — "it works on my desk" is not a proof.'),
  (14, 'CPS exam move',
       'Name the cyber part, the physical part, and the interface (sensors/actuators/time). Say whether the requirement is safety or liveness and whether time is in the spec. Pick a model (ODE, FSM, hybrid, SR) before C. Contrast with 16A/162 in one sentence if they ask "why not just write threads."')
) AS c(pos, front, back)
WHERE d.slug = 'eecs149';

-- =====================================================================
-- 2. Continuous Dynamics and Control
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'cont'
CROSS JOIN (VALUES
  (0,  'continuous-time state',
       'A plant with state x(t) in R^n obeys an ODE: dx/dt = f(x,u), output y = g(x,u). 149/LS 2: this is the physical half of CPS. Discrete software samples y and writes u. 16A already did LTI; here the ODE is a component you compose with an FSM. If f depends only on x (no u), it is autonomous — the controller is missing.'),
  (1,  'Newtonian mechanics as the running example',
       'F = ma gives second-order ODEs (position, velocity). Springs, dampers, motors, vehicles. 149: you reduce order by putting velocity in the state. A "simple" cart-pole or DC motor is enough to force hybrid modes (contact, saturation) later. Do not linearize until they ask; first write the nonlinear f.'),
  (2,  'actor models of continuous systems',
       'Integrator, adder, gain, nonlinear map: wire them. Feedback is a wire from output to input. 149: well-formedness — algebraic loops (a cycle of instantaneous actors) may have 0, 1, or many solutions. An integrator breaks an algebraic loop because its output is a state, not an instantaneous function of its input.'),
  (3,  'signals: continuous vs discrete',
       'Continuous-time: defined for all real t (or an interval). Discrete-event: defined at a set of timestamps. Discrete-time: periodic samples. 149: mixing them is the course. A sampler is an actor from continuous to discrete; a ZOH (zero-order hold) goes the other way. Naming the signal type prevents "the PID ran at infinite rate" bugs.'),
  (4,  'causal, memoryless, LTI',
       'Causal: output at t depends only on inputs up to t (no peeking at the future). Memoryless: y(t) depends only on u(t), not on history. Linear and time-invariant: superposition plus shift-invariance; then convolution / transfer functions exist. 149: an integrator is causal and LTI but not memoryless. A delay is causal; a predictor is not.'),
  (5,  'stability (continuous, 149-sized)',
       'BIBO: bounded input implies bounded output. Lyapunov / asymptotic: states go to an equilibrium. For LTI, poles in the open left half-plane (continuous) or inside the unit disk (discrete). 149: you need the vocabulary to say why feedback was added. Unstable plant plus a slow MCU is a hybrid-time bomb, not a software bug.'),
  (6,  'feedback control slogan',
       'Measure y, compute u = K(r - y) or a richer law, apply to the plant. Feedback can stabilize, reject disturbance, and reduce sensitivity. 149: the controller is often an FSM or a periodic task, not an analog op-amp (that was 16B). Sampled-data: the loop is hybrid even if both pieces look linear.'),
  (7,  'PID in one card',
       'u = Kp e + Ki integral(e) + Kd de/dt, e = r - y. P: proportional punch. I: kills steady-state error. D: damps. 149 labs: you will tune this on a plant. Derivative on a noisy sensor is painful — filter or differentiate the measurement carefully. Anti-windup matters when the actuator saturates (a hybrid mode).'),
  (8,  'linearization (when they ask)',
       'Around an equilibrium (x0,u0), A = df/dx, B = df/du. Local LTI model. 149: useful for pole placement and for saying "small signals." Invalid across a mode switch (hybrid) or a hard nonlinearity (backlash, Coulomb friction). If the exam plant is a thermostat, linearize nothing — it is already hybrid.'),
  (9,  'discretization / sampling',
       'Hold u constant over a period T, sample y. The discrete map x[k+1] = Φ x[k] + Γ u[k] for LTI (matrix exponential). 149: T is a design variable. Too slow: the continuous plant misbehaves between samples. Too fast: the MCU cannot meet WCET. 16A treated sampling as DTFS; 149 treats it as a scheduler constraint.'),
  (10, 'properties you must not mix',
       'Time-invariant ≠ time-triggered. Deterministic ≠ discrete. Continuous-state ≠ analog hardware (you can simulate ODEs in software). 149 exams like "is this actor memoryless?" Draw the block, name the state. If there is an integrator or a delay, there is memory.'),
  (11, 'simulation vs the real plant',
       'Numerical ODE solvers (Euler, RK) approximate f. Stiff plants + big steps = junk. 149: a desktop sim that is stable can still be wrong on the board (quantization, delay, missed deadlines). Always say which model you simulated. Hybrid sim is later — event detection matters more than a fancy RK.'),
  (12, '16A LTI vs 149 continuous',
       '16A: DTFS, convolution, modes of A^n, least squares. 149: the same ODE is an actor you close with a discrete controller, then schedule. If they ask for a Bode plot, that is 16A leftover. If they ask "where is the state" or "does feedback create an algebraic loop," that is 149.'),
  (13, 'units and sensors sneak in',
       'x has physical units; the ADC returns integers. Calibration is an affine map you must put in the model (LS 7). 149: forgetting units is the most common lab fail. Write y_adc = G * y_phys + b, then invert. Noise is a signal; do not pretend the plant is the sim.'),
  (14, 'continuous exam move',
       'Write dx/dt = f(x,u), name state vs input vs output. Classify causal / memoryless / LTI / stable. Draw actors; flag algebraic loops. If they close the loop with software, say sampled-data and name T. PID: write the three terms and one pitfall (windup or noisy D). Do not start a 127 KKT on a cart ODE.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs149';

-- =====================================================================
-- 3. Discrete Dynamics and FSMs
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'disc'
CROSS JOIN (VALUES
  (0,  'discrete system (LS 3)',
       'State and inputs live on countable sets; time is a sequence of reactions (events), not a real line. 149: this is software, protocols, and mode logic. A reaction maps (state, input event) to (next state, output). Between reactions the discrete state is constant. The physical plant may still be moving — that is hybrid, next section.'),
  (1,  'the notion of state',
       'State is whatever you need to know so that future outputs depend only on future inputs plus this state (Markov). 149: if you cannot name the state, you cannot draw the FSM or prove an invariant. Hidden state (a static variable in C, a timer you forgot) is how models lie. Extended state: finite modes plus variables in a larger domain.'),
  (2,  'finite-state machine',
       'Finite set of states S, inputs I, outputs O, initial state, transition function (or relation). Guard on a transition: a predicate on the input (and later on extended variables). Action: output and/or update. 149: deterministic FSM — at most one enabled transition. Draw states as bubbles, transitions as labeled arrows. This is the 149 bread-and-butter model.'),
  (3,  'Mealy vs Moore',
       'Moore: output is a function of state only (output on the bubble). Mealy: output is a function of state and input (output on the arrow). 149: Mealy can react in the same tick; Moore has a delay. Composition and "instantaneous cycles" care which you picked. On an exam, label the outputs so the grader sees Mealy vs Moore.'),
  (4,  'guards, actions, and stuttering',
       'Guard true ⇒ transition may fire. If nothing is enabled, some models stutter (stay, output absent). 149: absent is a real input in SR/DE — "no event" is not the same as "event with value 0." Default transitions (else) keep the machine input-enabled. A machine that deadlocks with no enabled transition is a modeling bug unless you meant it.'),
  (5,  'extended state machines',
       'Finite control modes plus variables (counters, clocks, data). Transitions: guard on variables, action updates them. 149/LS 3.4: this is how you avoid a million bubbles for "count to 10." The state space may now be infinite (integers) — verification gets harder. Timed automata: clocks that increase with real time, guards like clock at least T, resets.'),
  (6,  'timed automata (149 version)',
       'Clocks x-dot = 1 in every mode; guards x ≼ T or x ≽ T; resets x := 0. 149: this models watchdog timers, timeouts, and "wait 5 ms." Dense time + guards can make infinitely many timestamps; region/zone abstractions exist (deeper 249A). For 149: you must be able to draw a two-clock picture and say whether a timeout transition is urgent.'),
  (7,  'nondeterminism',
       'A relation, not a function: several next states legal. Environment nondeterminism (unknown input) vs internal (you left a choice). 149: useful for specs ("the user may press A or B") and for underspecified designs. Bad if you needed a controller and left a race. Traces: a behavior is one possible run. "The machine can reach X" means some trace does.'),
  (8,  'behaviors and traces',
       'A trace is a sequence of states and/or I/O. The language of a machine is the set of output (or I/O) traces. 149: safety properties are "no bad prefix"; liveness is "something good keeps happening." Two machines are language-equivalent if they have the same traces. Later: simulation is a finer relation than language inclusion.'),
  (9,  'input-enabled and receptive',
       'A machine should define a reaction for every input (or explicitly reject). 149: embedded controllers that "do not handle that interrupt" are not input-enabled — they are bugs. Completeness of the transition relation is a checklist item before you claim an invariant over all traces.'),
  (10, 'encoding FSMs in C (lab)',
       'enum state; switch(state) in a task or ISR; each case checks guards and updates. 149: one switch is an FSM; two unsynchronized switches are a concurrent composition you have not defined. Shared variables need a MoC (next sections). Do not sprinkle state across five files and call it a state machine.'),
  (11, 'determinism vs timing',
       'A discrete FSM can be deterministic and still miss a deadline (the reaction took too long). 149: logical correctness (right transition) is not timing correctness. WCET of the reaction is a quantitative property (LS 16). "The FSM is deterministic" is not an excuse for a 20 ms ISR on a 1 ms period.'),
  (12, 'when not to use a pure FSM',
       'Rich data (images, filters): keep the filter as an actor, the mode logic as an FSM. Continuous plants: hybrid. Lots of concurrency: compose machines or use SR/dataflow. 149: a 200-state flat FSM is a smell — hierarchy (LS 5) or extended variables. If they hand you a PID plus a fault mode, that is hybrid, not a bigger switch.'),
  (13, '70 FSMs vs 149 FSMs',
       '70: DFAs, regex, pumping, decidability. 149: outputs, time, composition with physics, implementation on a MCU. Same bubbles. If the question is "is this regular," it is 70. If it is "add a timeout clock" or "compose two FSMs with shared events," it is 149.'),
  (14, 'discrete exam move',
       'Name S, I, O, initial state. Say Mealy vs Moore. Write guards/actions. Check determinism and input-enabled. If they mention time, add a clock (timed automaton) or say "this FSM has no time." Give one trace that violates a stated safety property if asked. Do not draw an ODE in the discrete section unless they asked for hybrid.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs149';

-- =====================================================================
-- 4. Hybrid Systems and Composition
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'hybrid'
CROSS JOIN (VALUES
  (0,  'hybrid system',
       'Continuous dynamics inside modes, discrete jumps on transitions. Each mode has an ODE (or actor model); guards enable mode switches; resets can jump the continuous state. 149/LS 4: thermostat, bouncing ball, gear shift, PWM, stick-slip. This is the native language of CPS. A sampled controller plus a plant is already hybrid.'),
  (1,  'modal models',
       'A mode is a continuous actor; a supervisor FSM picks the mode. 149: refinements — the FSM state "Flying" contains the flight ODE. Hierarchical: modes inside modes (LS 5.2 / Statecharts flavor). The discrete supervisor must not chatter (infinite switches in finite time) unless you designed a sliding mode on purpose.'),
  (2,  'bouncing ball (classic)',
       'Mode: free fall, x-dot-dot = -g. Guard: height = 0 and velocity downward. Reset: v := -c v (restitution). 149: Zeno — infinitely many bounces in finite time if you do not stop at small energy. Hybrid models can be mathematically nasty; engineers add a "rest" mode. If they ask "is this Zeno," check for infinite events accumulating.'),
  (3,  'thermostat / hysteresis',
       'Heat mode vs off. Guards use two thresholds (on at T_low, off at T_high) so you do not chatter at a single T_set. 149: hysteresis is a hybrid design pattern. A single-threshold on/off with noise chatters — the actuator dies, the model is wrong. This is also a lab pattern (bang-bang plus a gap).'),
  (4,  'classes of hybrid systems (LS 4.2)',
       'Timed automata (clocks with slope 1). Multirate. Rectangular / linear / nonlinear ODEs in modes. Impulsive (jumps). 149: you should classify a picture, not recite a taxonomy. "Linear hybrid automaton" means linear ODEs plus linear guards — still not an easy model check. Safety of hybrid systems is undecidable in general; 149 wants the modeling, not a full decidability proof.'),
  (5,  'guard, invariant, reset',
       'Mode invariant: you may stay only while it holds (must leave when it fails). Guard: you may take the transition when it holds. Urgent vs non-urgent: must fire as soon as enabled, or may wait. Reset: discrete update of continuous state. 149: mixing these up is the usual drawing error. Write all three on the figure.'),
  (6,  'composition of state machines (LS 5)',
       'Side-by-side machines sharing events or signals. Sideways composition: outputs of A are inputs of B. 149: you must define the MoC of the composition (who fires first, simultaneous events). Hierarchy: a state contains a machine. Flattening: product construction — |S| multiplies (state explosion). That explosion is why verification needs abstraction.'),
  (7,  'synchronous product vs interleaving',
       'Synchronous: both react on a shared tick (or shared event set). Interleaving: one moves at a time (asynchronous product). 149: the same two FSMs have different languages under the two rules. Shared-variable composition without a rule is undefined — that is a race, not a model. Write the composition rule on the exam.'),
  (8,  'hierarchical state machines / Statecharts flavor',
       'XOR states (exactly one child active), AND states (concurrent children), history (resume last child). 149/LS 5.2: hierarchy is how you keep a flight controller readable (Takeoff / Cruise / Land, each with submodes). AND is concurrent composition in disguise. Do not invent a 50-state flat machine when hierarchy exists.'),
  (9,  'chattering and sliding',
       'If two modes fight across a guard (on/off at the same T), the model switches infinitely fast. 149: add hysteresis, or a dwell time (clock), or acknowledge a sliding mode (Filippov) if you really mean it. In software, chatter is a GPIO pin that fries a relay. In simulation, it looks like a solver that never finishes.'),
  (10, 'closed-loop hybrid',
       'Plant ODE + controller FSM + sampler/hold. Events: sample ticks, threshold crossings, faults. 149: this is the default architecture for the course. Stability of the closed loop is not "each piece is stable." A stable ODE plus a slow/wrong FSM can chatter or diverge. Analyze the hybrid, not the C file alone.'),
  (11, 'nondeterministic hybrid',
       'Guards that overlap: several switches possible. Useful for disturbances ("the packet may drop"). 149: safety must hold for all resolutions if the nondeterminism is adversarial. Controller synthesis (bonus/249A): pick actions so a bad set is avoided. 149 exams: exhibit one bad trace or argue an invariant that blocks it.'),
  (12, 'implementation of hybrid controllers',
       'Periodic task reads sensors, evaluates guards, updates mode, writes actuators. Time in the model vs time in the scheduler: the guard "x ≽ 1.0 s" is not the same as "this task ran once." 149: clocks are software counters plus a timebase. Jitter makes a deterministic hybrid look nondeterministic on the bench.'),
  (13, '16A continuous vs 149 hybrid',
       '16A never mode-switches the plant as a first-class model (maybe a footnote). 149: the switch is the point. If they give you a bouncing ball or a thermostat, write modes + guards + resets, not a single transfer function. A Laplace transform across a bounce is the wrong tool.'),
  (14, 'hybrid exam move',
       'Draw modes, ODEs, invariants, guards, resets. Say whether switches are urgent. Check Zeno and chatter. If two machines, name the composition (sync vs interleave vs hierarchy). Product size: multiply mode counts. Closed loop: plant + controller + time. Do not drop the continuous state on a discrete jump unless the reset says so.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs149';

-- =====================================================================
-- 5. Concurrent Models of Computation
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'moc'
CROSS JOIN (VALUES
  (0,  'model of computation (MoC)',
       'The rules for what an actor is, when it fires, and what a connection means (sequence? timestamped event? continuous signal?). 149/LS 6: picking a MoC is a design decision. Threads+shared memory is a MoC (a sloppy one). Synchronous-reactive, dataflow, and discrete-event are the 149 toolkit. "I wrote C" is not a MoC.'),
  (1,  'structure of models',
       'Actors, ports, connections, hierarchy. A composite actor has an interior model and an exterior interface. 149: this is Ptolemy/actor-oriented design. The director (MoC) of a composite defines firing. You can nest MoCs (SR inside DE, etc.) — heterogeneity. Labs may not run Ptolemy; exams still want the vocabulary.'),
  (2,  'synchronous-reactive (SR)',
       'Global ticks. On each tick every actor may produce a value or absent. Fixed-point semantics: signals are functions of the tick, solved simultaneously. 149: great for deterministic concurrency (Esterel, Lustre, Simulink discrete). Instantaneous feedback needs a unique fixed point; otherwise the model is ill-formed (causality cycle). Time between ticks is a separate scheduler question.'),
  (3,  'absent vs zero',
       'In SR/DE, absent means "no event this tick." Zero is a present event with value 0. 149: mixing them is a classic bug (your FSM thinks a 0 is a missing button). Draw present/absent explicitly. A default value is a modeling choice, not a free lunch.'),
  (4,  'dataflow MoCs',
       'Actors consume/produce tokens on FIFO channels. SDF (synchronous dataflow): fixed consume/produce rates; static schedule; you can solve balance equations for a periodic firing. 149: audio, filters, stream processing. Dynamic dataflow / Kahn process networks: more general, can deadlock or need unbounded buffers. If rates do not balance, the graph has no periodic schedule.'),
  (5,  'SDF balance equations',
       'For each channel, (firings of src) * produce = (firings of dst) * consume. Solve for a nonnegative integer firing vector. 149: if only the zero solution exists, inconsistent. If infinitely many, pick a minimal positive one. This is graph linear algebra, not 127 optimization. Buffer sizes follow from the schedule.'),
  (6,  'Kahn process networks (light)',
       'Deterministic processes communicating over unbounded FIFOs, blocking reads. Kahn: the network is deterministic (same tokens regardless of scheduling) if processes are continuous in the prefix order. 149: determinism is the prize; unbounded buffers and deadlock are the costs. Do not confuse with threads that share RAM.'),
  (7,  'discrete-event (DE)',
       'Events carry a timestamp. A global event queue; the next event is the earliest timestamp. Simultaneous events need a microstep / priority rule. 149: networks, simulators (NS, SystemC, Simulink DE), interrupts as timestamped events. DE can model time; SR models ticks. A late event in DE is a modeling fact, not a thread race — unless you implemented DE badly.'),
  (8,  'timed MoCs vs logical time',
       'Logical/tag: an order of reactions (superdense time: (t, n) for timestamp t and microstep n). Physical time: wall clock. 149: they diverge when the platform is slow. A synchronous model that "takes zero time" per tick still occupies WCET on the MCU. Superdense time lets several events share a timestamp without losing order.'),
  (9,  'determinism as a 149 value',
       'Same inputs ⇒ same behaviors. SR and Kahn give you a path to determinism. Threads with races do not. 149: if the spec is safety-critical, start from a deterministic MoC and compile it, or discipline the threads until they implement one. "It usually works" is not deterministic.'),
  (10, 'comparing MoCs (exam table)',
       'SR: deterministic ticks, needs fixed points, good for control logic. SDF: streaming, static schedule, rates must balance. DE: timed events, good for networks and sim. Threads: easy to write, hard to analyze. Hybrid/actors: glue to physics. 149: they will describe a problem; you name the MoC and one reason. Wrong MoC is a modeling error.'),
  (11, 'rendezvous / message passing',
       'CSP-style: send and receive meet. No shared RAM. 149/LS 11.3: processes plus channels are cleaner than pthreads for some protocols. Deadlock if the wait-for graph cycles. Contrast: shared-memory threads need locks (and then priority inversion). Pick message passing when you can afford copies and want a clearer causal story.'),
  (12, 'implementation of an MoC',
       'SR: a static cyclic executive or a sync-language compiler. SDF: a loop that fires the schedule. DE: an event calendar. Threads: an RTOS. 149: mapping a model to a platform can break the MoC (a "synchronous" tick that misses its period is not SR anymore). The lab board does not forgive a mismatched director.'),
  (13, '61C vs 149 concurrency',
       '61C: interrupts, caches, maybe a spinlock. 149: those are the platform; the question is which MoC you meant. If they ask you to draw a dataflow graph and solve rates, it is 149. If they ask you to pipeline a CPU, it is 61C. Do not schedule SDF with RMS unless they explicitly composed those worlds.'),
  (14, 'MoC exam move',
       'Name the MoC, firing rule, and what a connection carries (token, event, continuous signal). For SDF, write balance equations. For SR, mention ticks, absent, and fixed points. For DE, mention the event queue and simultaneous events. Say whether the model is deterministic. If they give threads, list a race and propose a cleaner MoC.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs149';

-- =====================================================================
-- 6. Sensors, Processors, Memory, I/O
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'hw'
CROSS JOIN (VALUES
  (0,  'sensor/actuator as actors (LS 7)',
       'A sensor maps a physical signal to a cyber one (with delay, noise, quantization, range). An actuator maps a cyber command to physics (with saturation, slew, backlash). 149: put these actors in the model or your closed-loop analysis is a fantasy. Calibration: affine map plus units. The "true" plant starts after the actuator and before the sensor.'),
  (1,  'quantization and range',
       'An n-bit ADC on [Vmin, Vmax] has step (Vmax-Vmin)/2^n. Saturation clips. 149: quantization is a nonlinear actor; for small steps you pretend it is noise. Range errors are hybrid (a new mode: saturated). Always state full-scale and bits in a lab report. A 10-bit reading is not a float from the sim.'),
  (2,  'common sensors (149 lab set)',
       'IMU (accel/gyro), magnetometer, encoders, current/voltage, temperature, cameras, ToF/ultrasonic, buttons. 149: each has bandwidth, bias, noise, and a bus (I2C/SPI/ADC). An IMU is not "position" — you integrate and drift. Encoders need decoding (another FSM). Dutta''s half of 149 cares that you can actually talk to the chip.'),
  (3,  'actuators',
       'DC motors, servos, steppers, heaters, LEDs, solenoids, speakers. Drive: PWM, H-bridge, DAC. 149: PWM is a hybrid/fast-switching implementation of an analog effort. The plant often low-pass filters PWM. Do not command a voltage the supply cannot give (saturation). Recoil / back-EMF is the plant talking back — model it or get surprised.'),
  (4,  'embedded processors (LS 8)',
       'Microcontrollers (MCU): on-chip flash/RAM, timers, ADC, cheap, deterministic-ish. Application processors / Linux SBCs: MMU, caches, throughput, worse WCET. DSPs, FPGAs, GPUs for specialized loops. 149: pick the smallest platform that meets timing and I/O. 61C''s RISC-V is the ISA story; here the peripherals and the timebase matter more than the pipeline cartoon.'),
  (5,  'parallelism on the chip',
       'DMA, hardware timers, multi-core, peripherals that run while the CPU sleeps. 149: this is concurrency you did not write as threads. A timer + DMA + ISR is a DE machine implemented in silicon. Race: CPU and DMA both touch a buffer. Memory barriers and ownership (who may read now) belong in the model.'),
  (6,  'memory technologies and hierarchy (LS 9)',
       'SRAM (fast, expensive, volatile), DRAM (needs refresh), flash/EEPROM (nonvolatile, slow writes, wear). Caches: great average case, hostile WCET. 149: scratchpads and locking cache lines are the real-time answers. 61C said "cache miss is slow"; 149 says "then your deadline math is a lie unless you bound it."'),
  (7,  'memory models / consistency (light)',
       'What a load may see when another core or a device wrote. 149: volatile in C means "do not cache this in a register," not "atomic" and not "ordered with other threads." MMIO registers are volatile. If two tasks share a struct, you need a lock or a single-writer MoC, not just volatile.'),
  (8,  'I/O hardware (LS 10)',
       'GPIO, ADC/DAC, UART, SPI, I2C, CAN, timers, PWM, interrupts, DMA. Memory-mapped registers. 149: polling vs interrupt vs DMA is a scheduling decision. Polling wastes CPU and can still miss. Interrupts preempt — they are a hidden highest-priority task. DMA moves bytes without the CPU, then interrupts at the end.'),
  (9,  'interrupt service routines',
       'Keep ISRs short: ack the device, enqueue an event, return. Shared data with the task world needs critical sections (disable IRQ or a lock that is IRQ-safe). 149: an ISR is a concurrent actor. Priority of interrupts vs RTOS tasks is a platform rule (often ISR wins). Nested IRQs are another scheduler.'),
  (10, 'sequential software, concurrent world',
       'C is a sequential language. The world is concurrent (several devices, the plant, the network). 149/LS 10.2: you must pick a concurrency mechanism (ISRs + flags, RTOS, sync language, event loop). Super-loop: while(1) poll everything — simple, jittery, hard to meet mixed rates. Fine for a lab 1; not an architecture for a car.'),
  (11, 'timebases',
       'Hardware timers, SysTick, RTC, network time (NTP/PTP, later). 149: every clock in a timed automaton needs a physical timebase with resolution and drift. Do not use busy-wait delay() in a system with deadlines — you block the CPU from other actors. Sleep/idle plus a timer interrupt is the grown-up version.'),
  (12, 'numerical issues in software',
       'Fixed-point vs float on MCUs without an FPU. Overflow, quantization, deadbands. 149: a controller that is stable in double on a laptop can overflow an int16 on the board. Scale your PID. 127-style conditioning shows up as "why is my gyro angle NaN."'),
  (13, '16B circuits vs 149 I/O',
       '16B: how an op-amp or RC works. 149: you treat the analog front-end as a sensor actor with bandwidth and range, then you care about the register map and the ISR. If they ask you to bias a microphone, that may be 16B leftover. If they ask "polling vs interrupt for this ADC," it is 149.'),
  (14, 'platform exam move',
       'Name the sensor/actuator errors (delay, noise, quantize, saturate). Pick MCU vs SBC with a timing reason. For I/O, choose poll / IRQ / DMA and say who is concurrent with whom. Mention volatile vs atomic vs lock. Cache: average vs WCET. Draw the actor, not just the pin number.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs149';

-- =====================================================================
-- 7. Multitasking and Real-Time Scheduling
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'rtos'
CROSS JOIN (VALUES
  (0,  'task model (LS 12)',
       'A periodic task τ_i = (C_i, T_i, D_i): worst-case execution C, period T, deadline D (often D = T). Release times k T_i. Utilization U_i = C_i / T_i. 149: this is how you turn "the controller runs at 100 Hz" into math. Aperiodic / sporadic tasks have minimum inter-arrival instead of T. If you cannot bound C, you do not have a real-time argument — you have a hope.'),
  (1,  'preemptive vs non-preemptive',
       'Preemptive: a higher-priority job can suspend a lower one. Non-preemptive: run to completion (or to a yield). 149: preemption improves responsiveness and complicates WCET and shared-resource analysis. A super-loop is cooperative / non-preemptive. ISRs are a preemptive layer even if you have no RTOS.'),
  (2,  'rate-monotonic scheduling (RMS)',
       'Static priorities: shorter period ⇒ higher priority (Liu and Layland). For n independent periodic tasks, preemptive uniprocessor, D = T, a utilization bound U ≼ n (2^{1/n} - 1) is sufficient (approaches ln 2 ≈ 0.69). 149: sufficient, not necessary — a set with U above the bound may still be schedulable. Exact test: response-time analysis (critical instant).'),
  (3,  'critical instant',
       'Worst-case response for a task starts when it releases together with all higher-priority tasks (for independent periodic RMS/DM). 149: this is the picture you draw for a response-time test. Recurrence: R_i = C_i + sum of higher-priority interference over the window R_i. Iterate until fixpoint; fail if R_i exceeds D_i.'),
  (4,  'earliest deadline first (EDF)',
       'Dynamic priority: the pending job with the earliest deadline runs. Uniprocessor, independent, D = T: schedulable iff U ≼ 1 (100 percent). 149: EDF uses the machine better than RMS; RMS is simpler to implement (fixed priorities in almost every MCU NVIC/RTOS). Overload: EDF can miss many deadlines at once; RMS tends to miss the lowest-priority first.'),
  (5,  'deadline-monotonic',
       'Static priority: shorter relative deadline ⇒ higher priority. When D_i is less than T_i, DM is the right static rule (RMS assumes D = T). 149: if they give D not equal to T, do not blindly RMS. Response-time analysis still applies with the new priorities.'),
  (6,  'priority inversion',
       'Low-priority job holds a lock; high-priority job blocks; medium-priority jobs run and stretch the wait (unbounded inversion). Famous: Mars Pathfinder. 149: this is why mutexes and RMS do not compose naively. Fixes: priority inheritance (holder runs at the waiter''s priority) or priority ceiling (raise to the highest priority that ever uses the resource).'),
  (7,  'priority ceiling protocol (idea)',
       'Each lock has a ceiling = max priority of tasks that use it. Taker runs at the ceiling; a task only locks if its priority is above current ceilings. 149: bounds blocking to at most one critical section (under the textbook assumptions) and prevents deadlocks among the protocol''s locks. Implementation cost: the RTOS must know the ceilings. Inheritance is the lighter story if they only ask "how do we fix inversion."'),
  (8,  'threads vs processes (LS 11)',
       'Threads: shared address space, cheap context, easy races. Processes: separate spaces, message passing, heavier. 149: MCU firmware is usually threads or tasks in one address space (no MMU). 162 loves processes and VM; 149 loves a tiny RTOS (FreeRTOS-class) or a cyclic executive. Message passing is the cleaner concurrent MoC if you can afford it.'),
  (9,  'mutual exclusion and blocking',
       'Critical section: shared data or a device. Blocking time B_i enters the response-time formula. 149: keep CS short (same advice as ISRs). Disabling interrupts is a global lock — it delays every deadline. Nested locks: deadlock. The scheduling chapter and the MoC chapter are the same problem: who may run, and who waits.'),
  (10, 'scheduling anomalies (149 lecture)',
       'More processors, cheaper C, or weaker priorities can make a schedule worse (timing anomalies, multiprocessor). 149: uniprocessor RMS/EDF theorems do not transplant blindly to multicore (global vs partitioned EDF). Caches and pipelines make C not additive. If they say "we added a core, why did we miss," this is the card.'),
  (11, 'cyclic executive',
       'A static table: every minor cycle run a list of runnables. No RTOS. 149: this implements a schedule you computed offline (often from SDF or from RMS that you flattened). Jitter is controlled; flexibility is poor (a new task means redesign the table). Fine for a small flight computer; painful for a product that keeps adding features.'),
  (12, 'soft vs hard and overload',
       'Hard: a miss is a system failure (airbag). Soft: a miss costs quality (video). Firm: late results are useless but not fatal. 149: admission control and reservations belong here. Do not put a best-effort logger at a higher priority than the control task. Slack stealing: run aperiodic work when periodic tasks are ahead.'),
  (13, '162 scheduling vs 149 scheduling',
       '162: fairness, throughput, MLFQ, general-purpose OS. 149: deadlines, WCET, RMS/EDF, inversion. Same word "scheduler." If they ask you to maximize average throughput, it is 162. If they give C, T, D and ask schedulable?, it is 149. Do not cite CFS on a 149 final.'),
  (14, 'scheduling exam move',
       'Write (C,T,D) for each task, compute U. Pick RMS or EDF and the matching bound (n(2^{1/n}-1) vs 1). If they want exact, do response-time / critical instant. If there is a lock, mention inversion and inheritance/ceiling. If D is not T, use DM or EDF, not naive RMS. State uniprocessor and independent as assumptions.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs149';

-- =====================================================================
-- 8. Invariants, LTL and Refinement
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'spec'
CROSS JOIN (VALUES
  (0,  'invariant (LS 13)',
       'A state predicate that is true in every reachable state. Safety: "nothing bad happens" = an invariant (or an invariant of the prefix-closed bad set). 149: you prove an invariant by induction — true initially, and every transition preserves it. This is the cheapest verification. If you cannot name an invariant, you do not understand the machine yet.'),
  (1,  'safety vs liveness',
       'Safety: can be violated in finite time (a bad prefix). Liveness: "something good eventually / infinitely often" — a finite prefix never proves a liveness bug by itself. 149: "never hit the wall" is safety. "The door eventually opens" is liveness. "Always eventually service" is a liveness (GF p in LTL). Deadlock is often a liveness failure (you stay in a silent set).'),
  (2,  'linear temporal logic (LTL)',
       'Formulas over infinite traces. G p: always p. F p: eventually p. X p: next p. p U q: p until q. 149/LS 13.2: this is the spec language of the course. G (req ⇒ F ack) is "every request is eventually acknowledged." You evaluate LTL on a path, not on a branching tree (that is CTL). 70 logic plus time operators.'),
  (3,  'LTL patterns 149 actually writes',
       'G ¬danger (safety). G (start ⇒ F done). G (p ⇒ X q) (next-step handshake). GF p (infinitely often). FG p (eventually forever — stabilization). 149: translate English to these before you model-check. A common bug: writing F G when you meant G F. Read them aloud: "eventually always" vs "always eventually."'),
  (4,  'atomic propositions',
       'The p in G p is a predicate on a state (or a labeling). 149: pick a small set of APs (inDanger, req, ack, mode==LAND). Too many APs explode the Kripke structure. The model checker does not know "the robot is safe" unless you define that predicate on the state vector.'),
  (5,  'Kripke structure / transition system',
       'States, transitions, labeling with APs. Initial states. 149: an FSM is already this. A hybrid system is not, until you discretize or abstract. Open system: inputs from an environment; you quantify over input traces. Closed: environment is part of the model. Model checking needs a closed (or game) story.'),
  (6,  'models as specifications (LS 14)',
       'A more abstract machine can be the spec; a refined machine should not do anything the spec forbids. 149: refinement / conformance is "implementation ≼ spec" in an appropriate order. Testing against traces of the spec is the lightweight version. If the spec is too concrete, you over-constrained the lab team.'),
  (7,  'language inclusion',
       'L(Impl) ⊆ L(Spec): every impl trace is allowed by the spec (for safety-style trace specs). 149: this is the automaton view of refinement. If Spec is deterministic, inclusion is cheaper. Counterexample: a finite (safety) or infinite (liveness) trace in Impl not in Spec. That trace is what a model checker returns.'),
  (8,  'simulation relation',
       'A relation R on states: related states have the same APs (or outputs), and every impl step can be matched by a spec step to related states. 149: simulation ⇒ language inclusion, not always the converse. You use simulation when you want a step-by-step "the spec can mimic the impl." Draw two machines and a dashed R.'),
  (9,  'bisimulation',
       'Simulation both ways: each can match the other''s steps. 149: stronger than language equivalence for branching (they agree on what they could have done, not only on traces). Useful for minimizing state machines (quotient). If they ask "same traces," language equivalence suffices; if they ask "same branching," you want bisimulation.'),
  (10, 'type / interface refinement (light)',
       'A subtype can be used where the type was expected: weaker assumptions, stronger guarantees (behavioral subtyping). 149/LS 14.2: ports and actor interfaces have types (signal kinds, rates). An SDF actor that produces more tokens than advertised breaks the schedule. Refining an interface without telling the composition is a type error.'),
  (11, 'assumptions vs guarantees',
       'Assume-guarantee: under environment assumptions A, the system guarantees G. 149: a controller is correct only if the plant stays in the assumed class (no broken sensor, no extra delay). Write A as well as G on the exam. Composition: one module''s G is another''s A.'),
  (12, 'from English to a spec (method)',
       'Circle the always/never/eventually words. Name the APs. Decide safety vs liveness. Write LTL or an invariant. Only then draw or code. 149: most midterm points are this translation, not a SPIN tutorial. If the English is ambiguous ("soon"), say you need a bound (a clock) and write a timed property.'),
  (13, '70 logic vs 149 LTL',
       '70: propositional/predicate, SAT, induction. 149: those plus G, F, X, U on traces of a machine. If they ask you to push negations inward on an LTL formula (duals: ¬G p ≡ F ¬p), that is 149. If they ask resolution on a CNF with no time, it is 70.'),
  (14, 'spec exam move',
       'Translate to G/F/X/U or to an invariant. Label safety vs liveness. Define APs on the state. For refinement, say inclusion or draw a simulation. Give a short counterexample trace if the property fails. Do not dump a CTL path-quantifier (A/E) unless they asked CTL — 149 default is LTL.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs149';

-- =====================================================================
-- 9. Reachability, Model Checking, WCET
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'verify'
CROSS JOIN (VALUES
  (0,  'reachability analysis (LS 15)',
       'Compute the set of states reachable from the initial set. Safety: reachable ∩ Bad is empty. 149: BFS/DFS on a finite FSM is the algorithm. On infinite/hybrid state, you need symbols, zones, or abstraction — otherwise you do not terminate. A counterexample is a path from Init to Bad. This is the core "analysis" outcome of the course.'),
  (1,  'state explosion',
       'Product of n machines: |S| multiplies. Add a 32-bit counter and the graph is imaginary. 149: this is why we compose carefully and abstract. "I will just enumerate" is not a plan for a 10-task system. Symmetry, hierarchy, and cone-of-influence (drop irrelevant vars) are the standard attacks.'),
  (2,  'model checking',
       'Automatic: model + temporal formula ⇒ yes, or a counterexample. Explicit-state (walk the graph) vs symbolic (BDD/SAT/SMT over sets of states). 149: you should know what the tool is doing, not implement a BDD. SPIN, nuSMV, TLA+, UPPAAL (timed) are the names that show up. A failed check with no counterexample is a timeout, not a proof.'),
  (3,  'abstraction (LS 15.3)',
       'Throw away detail so the abstract system over-approximates behaviors (for safety: if abstract is safe, concrete is safe). If abstract is unsafe, maybe spurious — refine (CEGAR). 149: predicate abstraction, data hiding, rate ignoring. Under-approximation (testing, bounded MC) can miss bugs; it cannot prove safety.'),
  (4,  'bounded model checking',
       'Unroll transitions k steps, ask SAT if Bad is reachable in k. 149: great at finding bugs, not a full proof unless you have a diameter argument. Labs/autograders (Donzé-style CPS graders) often check traces against STL/LTL on a finite horizon — that is BMC in spirit.'),
  (5,  'liveness and fairness',
       'To check GF p you need infinite traces; the algorithm looks for a reachable cycle where p is false forever (or a lassoes / accepting cycle in a Büchi automaton). 149: without fairness ("the scheduler eventually runs me"), liveness fails for silly reasons. State the fairness assumptions. Safety is usually the 149 homework; liveness is the trick question.'),
  (6,  'open vs closed (LS 15.1)',
       'Closed: you modeled the environment. Open: the environment is adversarial or unknown — then you want a strategy (controller synthesis) or you close with a nondeterministic environment automaton. 149: a controller that is "correct" only for one recorded trace is not verified. Always say what the environment may do.'),
  (7,  'hybrid / timed model checking (light)',
       'UPPAAL-style: timed automata, zone abstraction. Hybrid: much harder (undecidable in general). 149: you model-check the discrete supervisor, or a discretized plant, or you prove an inductive invariant on the ODE (Lyapunov) separately. Do not claim SPIN ate your bouncing ball.'),
  (8,  'quantitative analysis (LS 16)',
       'Not just yes/no: execution time, energy, memory, probability. 149: WCET is the headline. ILP / IPET: program as a graph, maximize time subject to flow constraints and loop bounds. This is 127-adjacent math (an ILP) in the service of a deadline, not a 127 lecture.'),
  (9,  'WCET and what wrecks it',
       'Worst-case execution time of a task. Caches, pipelines, interrupts, DMA, and data-dependent loops make WCET hard. 149: measurement (observe many runs, add a margin) vs static analysis (bound every path). 61C caches help average case and hurt a tight WCET proof. A measured max is not a proof unless you argue coverage.'),
  (10, 'program as a graph (IPET idea)',
       'Basic blocks with times; edges are control flow. Maximize sum t_b * x_b subject to flow conservation and loop bounds. 149: the loop bound is the modeling assumption that makes the ILP finite. If the bound is a lie, the WCET is a lie. Recursion and unbounded heap: static WCET often gives up.'),
  (11, 'other quantitative questions',
       'Response time (already in scheduling). Memory high-water. Energy per mission. Reliability (FIT rates) — usually out of scope. 149: if they ask "can we add logging," you answer with leftover utilization and WCET of the logger, not with a logging library review.'),
  (12, 'testing vs verification',
       'Tests show presence of bugs; model checking / invariants can show absence (in the model). 149: you still test the board because the model is not the silicon. Coverage (states, transitions, MC/DC) is how you talk about tests. A green lab demo is one trace.'),
  (13, '127 ILP vs 149 WCET',
       '127: LP/QP as engineering models, duality, KKT. 149: one ILP encoding of a CFG to bound time. If they want complementary slackness, it is 127. If they want a loop bound and a deadline, it is 149. Do not dualize the IPET unless they are trolling.'),
  (14, 'verify exam move',
       'Safety: reachability vs Bad, or inductive invariant. Name state explosion and one abstraction. LTL: say what the checker returns (counterexample path / lasso). WCET: graph + bounds + cache caveat. Closed vs open environment. Do not claim you verified the C if you checked a 5-state cartoon — say which model.')
) AS c(pos, front, back)
WHERE d.slug = 'eecs149';

-- =====================================================================
-- 10. Security, Networks and Labs
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'apps'
CROSS JOIN (VALUES
  (0,  'why CPS security is different (LS 17)',
       'IT security protects data and servers. CPS security also protects physical processes: a forged packet can open a breaker or a valve. Availability and integrity of control often beat confidentiality. 149: Stuxnet-style and automotive CAN attacks are the motivating stories. A correct RMS schedule does not help if the setpoint is attacker-controlled.'),
  (1,  'crypto primitives 149 needs',
       'Symmetric (AES) for bulk, hashes (SHA) for integrity, MACs / HMAC for authenticated commands, public-key (TLS handshake, signatures) for identity. 149: MCUs are slow and have little key storage. Do not invent a XOR "cipher." Nonces stop replay of a valid "open door" frame. This is not CS 161 depth; it is "which primitive for which threat."'),
  (2,  'replay, spoof, inject',
       'Replay: resend a good command later. Spoof: pretend to be the controller. Inject: extra packets on a bus (CAN is broadcast and historically unauthenticated). 149: sequence numbers + MAC, or a challenge-response, or a secure timebase. Physical access to a bus is a real attacker model for cars and plants.'),
  (3,  'software security on an MCU',
       'Buffer overflows, unsafe C, debug ports left on, default passwords, unencrypted firmware updates. 149/LS 17.3: the lab board is a product if you ship it. Watchdog + safe state on crash is a CPS response, not just a SELinux policy. 61C / 161 give you the bug class; 149 asks what the plant does when the MCU wedges.'),
  (4,  'information flow (light)',
       'High (secret / trusted) data should not leak to low (public / untrusted) outputs, unless declassified. Integrity: low should not taint high controls. 149: a debug UART that prints keys is an information-flow bug. Noninterference is the theory word; the exam wants a concrete leak (side channel, leftover packet).'),
  (5,  'networked embedded (Dutta lecture)',
       'Low-power wireless (802.15.4 / BLE / LoRa), time-slotted meshes, IP-to-the-leaf (6LoWPAN), duty cycling. 149: energy and lossy links are part of the MoC (DE with drops). A "synchronous" multi-hop net is a wish — you need clocks and retries. Dutta''s research flavor: sensors that live on a coin cell still have deadlines.'),
  (6,  'time synchronization',
       'NTP (loose), PTP / IEEE 1588 (sub-microsecond on good Ethernet), pairwise wireless flooding (FTSP-style). 149: distributed timed automata need a clock-sync error bound in the guard. If sync error is 10 ms, a 1 ms guard is fiction. GPS is a time oracle when the sky is visible — not indoors, not in a jammed battlefield.'),
  (7,  'automotive / field buses (mention)',
       'CAN, LIN, FlexRay, automotive Ethernet. Priority on CAN is the message ID (another scheduler!). 149: these show up as "distributed embedded in a car." FlexRay is time-triggered (a TDMA MoC). CAN is event-triggered and can miss under burst load. You do not need the full frame format; you need the MoC and the security story (modern CAN-FD + auth).'),
  (8,  'time-triggered vs event-triggered nets',
       'Time-triggered: slots on a global schedule (FlexRay, TTP, TTEthernet) — deterministic, reserved bandwidth, painful to reconfigure. Event-triggered: send when something happens (CAN, Ethernet) — efficient, collision/queueing delay. 149: this is DE vs time-triggered MoC on a wire. Hard CPS often reserves slots for the control packets.'),
  (9,  'distributed consensus / fault tolerance (light)',
       'Sensors disagree; networks drop. Voting, primary-backup, fail-safe defaults (go limp, open relay). 149: Byzantine is 162/distributed-systems depth; here you need a fail-safe mode in the hybrid model. Triple modular redundancy is the hardware classic. The spec should say what happens when a node dies.'),
  (10, 'controller synthesis (bonus card)',
       'From a plant + a spec, compute a winning controller (safety game on a finite graph, or a more exotic hybrid game). 149/overview lists it; 249A may go further. 149: know it exists, and that an uncontrollable environment makes some specs unrealizable. You still usually design the FSM by hand and verify.'),
  (11, 'STL and CPS autograders (calendar leftover)',
       'Signal temporal logic: G/F with time bounds on real-valued signals (Donzé et al.). Robustness: how much a trace satisfies a formula. 149: used to grade simulations (did the room stay in [18 C, 22 C] after 5 min?). This is LTL''s analog for continuous traces. A lab plot can fail a spec the same way a model checker fails a state graph.'),
  (12, 'semester project checklist',
       'Spec (English + LTL/invariant), plant model, controller model, platform map (tasks, rates, I/O), schedule/U, hazards (saturation, packet loss), test plan, fail-safe. 149: the writeup is a 149 exam. A demo that works once is a trace. Mention WCET or measured periods. Cite Lee/Seshia chapters you actually used.'),
  (13, '149 vs 16A vs 127 vs 161 vs 162 vs 249A',
       '16A/16B: signals and circuits under the actors. 127: if you optimize a controller gain as a QP, you left 149. 161: crypto and memory safety in depth. 162: OS for servers. 149: CPS models + real-time + a bit of all of those. 249A: same lectures, grad expectations. If the question is "draw the hybrid and the LTL," stay in 149.'),
  (14, 'apps exam move',
       'Threat: name spoof/replay/inject and a primitive (MAC, nonce). Network: name the MoC (event vs time-triggered) and a time-sync bound. Fault: name the fail-safe mode. Lab: spec, rates, and one invariant you would check. Do not write a full TLS handshake or a 161 buffer-overflow exploit — pick the CPS consequence (what the plant does).')
) AS c(pos, front, back)
WHERE d.slug = 'eecs149';

UPDATE public.decks
SET card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE slug = 'eecs149';
