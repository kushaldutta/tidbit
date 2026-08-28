-- Migration 067: CS 188 — Introduction to Artificial Intelligence, full deck rebuild.
-- UC Berkeley Fall 2026: Emma Pierson and Peyrin Kao, MoWe 14:00-15:29,
-- Gateway 1210 (EECS fall schedule / faculty teaching lists).
-- Catalog: search, games, KR/inference, planning, uncertainty, ML, robotics,
-- perception, language. Prereq: 61A, 61B, 70.
-- Text: Russell & Norvig, Artificial Intelligence: A Modern Approach (AIMA 4e),
-- plus the unofficial CS 188 textbook. Sequence follows the standard
-- Klein/Abbeel Berkeley 188 calendar (search through supervised ML).

DELETE FROM public.saved_tidbits
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'cs188');

DELETE FROM public.tidbits
WHERE category_id = 'cs188';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'cs188');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'cs188');

UPDATE public.decks
SET title = 'CS 188',
    description = 'Artificial Intelligence — Pierson / Kao / AIMA: search, MDPs, Bayes nets, ML',
    cover_emoji = '🤖'
WHERE slug = 'cs188';

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('uninformed',   'Agents & Uninformed Search',
   'PEAS, DFS/BFS/UCS, tree vs graph (AIMA 1–3.4)', 0),
  ('informed',     'A* & Heuristics',
   'Greedy, A*, admissibility, consistency (AIMA 3.5–3.6)', 1),
  ('csps',         'Constraint Satisfaction',
   'Backtracking, AC-3, MRV, tree CSPs (AIMA 6)', 2),
  ('games',        'Adversarial Search',
   'Minimax, alpha-beta, expectimax (AIMA 5)', 3),
  ('mdps',         'Markov Decision Processes',
   'Bellman, value/policy iteration, Q-values (AIMA 17)', 4),
  ('rl',           'Reinforcement Learning',
   'TD, Q-learning, exploration, features (AIMA 22)', 5),
  ('bayes-rep',    'Probability & Bayes Nets',
   'Bayes rule, BN semantics, d-separation (AIMA 12–13)', 6),
  ('bayes-inf',    'BN Inference & Sampling',
   'Enumeration, VE, rejection, LW, Gibbs (AIMA 13)', 7),
  ('hmm-vpi',      'HMMs, Filtering & Decisions',
   'Forward, Viterbi, particles, VPI (AIMA 14, 16)', 8),
  ('ml',           'Machine Learning',
   'Naive Bayes, perceptrons, nets, overfitting (AIMA 19–20)', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'cs188'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. Agents & Uninformed Search
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'uninformed'
CROSS JOIN (VALUES
  (0,  'CS 188 (Pierson / Kao) in one sentence',
       'Build rational agents: search and games to act, MDPs/RL when the world is sequential and noisy, Bayes nets when you must infer, then a slice of supervised ML. Textbook: Russell & Norvig AIMA, plus the unofficial CS 188 notes. Pacman projects are the lab. Site: inst.eecs.berkeley.edu/~cs188.'),
  (1,  'rational agent',
       'An agent that selects actions to maximize expected performance given its percepts and knowledge. PEAS: Performance, Environment, Actuators, Sensors. 188 is not "make it look smart"; it is expected utility (later) plus the algorithms that approximate it. Reflex agents vs planning agents is the first split.'),
  (2,  'search problem ingredients',
       'State space, successor function (actions + results), start, goal test, step cost. A solution is a path (or the goal state if you only care about being there). Abstraction: leave out details that do not change the answer. Pacman positions are states; the screen pixels are not.'),
  (3,  'tree search vs graph search',
       'Tree search can revisit states (loops, exponential waste). Graph search keeps an explored set and never expands a state twice. Graph search needs extra care for optimality (A* consistency). 188 exams: say which one you are running before you claim completeness.'),
  (4,  'DFS',
       'Expand deepest first (stack / recursion). Not optimal with positive costs. Complete for graph search in finite spaces; tree DFS can loop. Time O(b^m), space O(bm) if you generate one path — the space win is why people still mention it. Depth-limited / iterative deepening fix unbounded depth.'),
  (5,  'BFS',
       'Expand shallowest first (queue). Optimal if all step costs are equal. Complete. Time and space O(b^d) — space is the killer. 188: BFS is "fewest actions," not "cheapest path" unless costs are uniform. Pacman with cost 1 per move: BFS finds a shortest path.'),
  (6,  'uniform-cost search (UCS)',
       'Expand least path-cost g(n) first (priority queue). Optimal for nonnegative costs. Complete if costs are bounded away from zero. Like Dijkstra on the implicit graph. If a cheaper path to an already-expanded node appears in tree search you can get duplicates; graph-UCS must not close a node too early unless you decrease-key.'),
  (7,  'completeness vs optimality vs complexity',
       'Complete: finds a solution if one exists. Optimal: finds a cheapest one. Time/space in terms of branching b, depth d, max depth m. 188 table: DFS/BFS/UCS/greedy/A* with these four columns. "Fast on Pacman" is not a row in the table.'),
  (8,  'iterative deepening',
       'DFS with limit 0,1,2,... Combines BFS optimality (unit costs) with DFS space. Overhead of repeating shallow levels is usually small because the last level dominates. 188: the algorithm you quote when they want optimal + linear space and unit costs.'),
  (9,  'frontier and explored',
       'Frontier (fringe): nodes generated but not expanded. Explored (closed): expanded. A node is a state plus a path (or parent pointer) plus g. Two nodes can share a state. Graph search keys on state, not on node identity.'),
  (10, 'uninformed means no goal hint',
       'DFS/BFS/UCS do not use an estimate of remaining cost. That is the next lecture (h). UCS already uses path cost — that is not a heuristic; it is accounting. Mixing "informed" with "priority queue" is a 188 fail; UCS is uninformed.'),
  (11, 'Pacman Project 1 (search)',
       'Implement DFS, BFS, UCS, A* in the search agents. State must include what the goal cares about (food grid, not just position) or you will "find" a path that eats nothing. Autograder cares about expansion counts, not just reaching the goal.'),
  (12, '70 vs 188 search',
       '70: graphs as objects, BFS as a proof tool. 188: the graph is implicit and huge; you generate successors on the fly. Complexity is in b and d, not n and m of an adjacency list. Same queue, different modeling.'),
  (13, 'failure modes',
       'Infinite branching, zero-cost loops, goal tests that miss a component of state, hashing mutable state. Graph search with a bad explored set drops the optimal path. 188: if Pacman loops, you probably used tree DFS or forgot food in the state.'),
  (14, 'uninformed exam move',
       'Name the fringe order, then completeness/optimality under the cost assumptions they gave. If costs vary, BFS is not optimal — UCS is. Draw a tiny graph and show the expansion order. Circle tree vs graph.')
) AS c(pos, front, back)
WHERE d.slug = 'cs188'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 2. A* & Heuristics
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'informed'
CROSS JOIN (VALUES
  (0,  'informed search idea',
       'Use h(n), an estimate of cost from n to a goal, to order the fringe. Greedy: order by h. A*: order by f(n) = g(n) + h(n). The art is designing h so search is both fast and still optimal. 188 midterms live here.'),
  (1,  'greedy best-first',
       'Expand smallest h first. Can be fast. Not optimal (can walk into a cheap-looking dead end). Not even complete in the worst graphs (can loop in tree search). 188: greedy is a foil so you want A*.'),
  (2,  'A* definition',
       'Expand smallest f = g + h. UCS is A* with h = 0. Greedy is A* that ignores g. With a good h, A* expands toward the goal along f-contours instead of UCS circles. Same priority-queue machinery as UCS.'),
  (3,  'admissible heuristic',
       'h(n) is never larger than the true cheapest cost from n to a goal, and h is at least 0. Tree-search A* is optimal if h is admissible. Overestimate even once and A* can skip the real optimum. "Manhattan in Pacman with no walls" is admissible because walls only make paths longer.'),
  (4,  'consistent (monotonic) heuristic',
       'h(n) is at most cost(n, a, n'') + h(n'') for every successor n''. Consistency implies admissibility. Graph-search A* is optimal if h is consistent (the usual 188 theorem). Most heuristics from relaxed problems are consistent. Triangle inequality energy.'),
  (5,  'tree A* vs graph A*',
       'Tree: admissible suffices for optimality (may re-expand). Graph: if you never re-expand, you need consistency so the first time you expand a state it is via an optimal g. Inconsistent admissible h: graph A* can be suboptimal unless you reopen nodes. 188 wants this sentence.'),
  (6,  'relaxed problems',
       'Drop constraints (ignore walls, allow diagonal, ignore remaining food except the closest). The exact cost in the easier problem is an admissible h for the real one. This is the 188 design method, not "guess a number." Dominance: if h2 is at least h1 everywhere and both admissible, h2 is better (never worse expansions, usually fewer).'),
  (7,  'heuristic dominance',
       'Larger (but still admissible) h prunes more. Trivial h=0 is UCS. h = true cost is a perfect oracle (only the optimal path). Combining: max of admissible heuristics is admissible and dominates each. Sum is admissible only if the heuristics never double-count the same cost (disjoint).'),
  (8,  'Pacman heuristics',
       'Manhattan to a single food: admissible. Sum of Manhattan to all remaining food: usually not admissible (one move can approach several, but more often it overcounts because one path eats many). Max Manhattan is admissible. MST of remaining food (plus agent) is a classic admissible combo. Project 1 will punish overestimates via extra expansions or failed opt tests.'),
  (9,  'f-contours',
       'A* expands in bands of increasing f. With a tight h, bands hug the optimal path. UCS bands are circles of g. Drawing contours is how Klein slides explain "why A* expands fewer nodes."'),
  (10, 'when A* still explodes',
       'Bad h (too small), huge branching, many similar-cost goals. Admissible does not mean fast. Bidirectional search and pattern databases are later tricks; 188 still expects you to say "better heuristic" first.'),
  (11, 'graph search bug: closing too soon',
       'If you mark a state explored when you first generate it (not when you expand it) with a worse g, you can lose the optimal path. Standard: add to explored at expansion. UCS/A* decrease-key if a better g appears on the fringe.'),
  (12, 'weighted A* (light)',
       'f = g + W h with W at least 1: faster, bounded suboptimality if h is admissible. 188 may only mention it. Do not call it optimal A*.'),
  (13, 'proving a heuristic on an exam',
       'Name the relaxation, argue every real path is a path in the relaxed problem (so relaxed OPT is at most real OPT), hence h = relaxed cost is admissible. Then optionally check consistency on one action. "It looks smaller" is not a proof.'),
  (14, 'A* exam move',
       'Write f = g + h, state tree vs graph and admissible vs consistent. Fill a tiny table of g,h,f and give expansion order. If they hand you an h that overestimates one state, exhibit a graph where A* returns a suboptimal goal.')
) AS c(pos, front, back)
WHERE d.slug = 'cs188'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 3. Constraint Satisfaction
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'csps'
CROSS JOIN (VALUES
  (0,  'CSP vs generic search',
       'States are assignments to variables; goals are complete consistent assignments. Successor: assign one more variable. Incremental structure lets you prune with constraints before the assignment is complete. Map coloring, scheduling, Sudoku, 188 crossword-style problems.'),
  (1,  'variables, domains, constraints',
       'Each variable has a domain. Constraints are unary, binary, or n-ary relations on subsets. A solution assigns every variable a value in its domain satisfying all constraints. Constraint graph: vertices = variables, edges = binary constraints (hypergraph if n-ary).'),
  (2,  'backtracking search',
       'DFS that assigns one variable per step and fails as soon as a constraint is broken. Better than searching permutations of all values blindly. 188: this is the skeleton; the speed is in filtering and ordering.'),
  (3,  'forward checking',
       'After assigning X=v, delete values in neighboring domains that conflict with v. If a domain empties, backtrack. Detects some failures earlier than naked backtracking. Does not look beyond neighbors (arc consistency does).'),
  (4,  'arc consistency / AC-3',
       'Arc X to Y is consistent if every value of X has some value of Y that satisfies the constraint. AC-3 queues arcs, removes values, requeues neighbors. Can be run as preprocess or after each assignment (MAC). Empty domain = no solution in this subtree. 188 loves a trace.'),
  (5,  'MRV, degree, LCV',
       'Minimum Remaining Values: assign the variable with the smallest domain (fail fast). Degree heuristic: break ties by most constraints on unassigned vars. Least Constraining Value: try the value that rules out the fewest choices for neighbors (succeed slow). 188: MRV on variables, LCV on values.'),
  (6,  'tree-structured CSPs',
       'If the constraint graph is a tree: pick a root, make arcs consistent from leaves to root, then assign greedily root-to-leaves in linear time. Cutset conditioning: assign a small cycle cutset, then the rest is a tree. 188: structure beats exponential backtracking when you have it.'),
  (7,  'iterative improvement / min-conflicts',
       'Start with a complete assignment; while conflicts remain, pick a conflicted variable and give it the value that minimizes remaining conflicts. Fast on n-queens. Can stuck in local minima — not a complete solver unless you restart. Local search family (later games/RL echo).'),
  (8,  'unary and n-ary constraints',
       'Unary: just shrink the domain (preprocess). N-ary: convert to binary with extra variables, or check during assignment. Alldiff is a global constraint with specialized propagators (not always in 188). Do not pretend every CSP is binary without a conversion.'),
  (9,  'why CSPs are not A*',
       'Path cost is usually irrelevant; any consistent assignment is a solution (or you optimize a separate objective). Heuristics here order variables/values, they do not estimate remaining path cost. Mixing A* language into CSPs confuses the exam grader.'),
  (10, 'consistency levels (names)',
       'Node: unary. Arc: binary neighbors. Path consistency: triples (188 rarely implements it). k-consistency generalizes. More consistency = more preprocessing, fewer backtracks, more CPU per node. AC-3 is the 188 default.'),
  (11, 'Pacman / 188 CSP appearances',
       'Course often uses map coloring, Australia, and course-scheduling examples. Projects may not be a full CSP Pacman; vitamins will still trace AC-3. If they give a constraint graph, you should run MRV on paper.'),
  (12, 'backtracking + filtering combo',
       'Assign with MRV, filter with forward checking or AC-3, order values with LCV. This is "smart backtracking." Without filtering, MRV has less information. 188 code-style pseudocode: select-unassigned, for each value, if consistent then recurse.'),
  (13, 'infeasibility certificates',
       'An empty domain after AC-3 is a proof that the current partial assignment cannot extend. That is the CSP analog of a heuristic cutoff. If AC-3 does nothing and you still fail later, you needed a deeper lookahead or a better encoding.'),
  (14, 'CSP exam move',
       'List variables and domains, draw the constraint graph, then either run one AC-3 pass (cross out values) or show a backtracking tree with MRV. If they ask runtime for a tree CSP, say linear after the directed-arc pass.')
) AS c(pos, front, back)
WHERE d.slug = 'cs188'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 4. Adversarial Search
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'games'
CROSS JOIN (VALUES
  (0,  'zero-sum games',
       'Agents alternate; one''s win is the other''s loss. Terminal utilities: typically +1/0/-1 or a score. Pacman vs ghosts is adversarial (or expectimax if ghosts are random). 188 Project 2 is this tree.'),
  (1,  'minimax',
       'Max node: pick the action with largest backed-up value. Min node: smallest. Value of a state is the utility if both play optimally. DFS to terminals (or a cutoff). Time O(b^m). Optimal against an optimal opponent — not against a noisy one (use expectimax).'),
  (2,  'alpha-beta pruning',
       'Keep alpha = best already-guaranteed for Max along the path, beta = best for Min. Prune a branch when it cannot affect the parent choice: if a possible value is worse than the current guarantee for the player to move above. Same result as minimax, fewer nodes if move ordering is good (best moves first).'),
  (3,  'alpha-beta slogan (no magic)',
       'You prune when a node''s remaining children cannot produce a value that the ancestor would ever pick. Alpha is a Max floor, beta is a Min ceiling. If the window empties (alpha at least beta), stop. 188: mark pruned branches on a drawn tree; do not change surviving values.'),
  (4,  'move ordering',
       'If the best move is tried first, more pruning. Worst-case order: no pruning, same as minimax. Iterative deepening + previous PV move is a real chess trick. 188: "alpha-beta is never slower than minimax in node count in the worst case, and often much faster."'),
  (5,  'evaluation functions',
       'At depth cutoff, return an estimate of expected utility, not a true terminal. Features (food left, ghost distance) plus weights. Must be fast. Quiescence: do not cut in the middle of a capture. 188 Pacman eval: you will tune this; a bad eval beats a deeper search with a worse one.'),
  (6,  'expectimax',
       'Chance nodes average (or take expectation of) children weighted by probabilities. Max still maxes. Right model if ghosts move randomly. Minimax is pessimistic against a random ghost (plays too scared). 188: know which node type is which in a mixed tree.'),
  (7,  'utilities and lotteries',
       'If the agent maximizes expected utility, utilities are more than scores — they encode risk attitude. Monotone transform of all terminals can change expectimax decisions if it is not positive affine. 188 later: VPI and decision nets reuse expected utility.'),
  (8,  'depth-limited and iterative deepening',
       'Games are too deep to search to the end. Search to ply d, eval, then deepen if time remains. Horizon effect: a bad capture just beyond the cutoff. 188: state the ply and the eval; "minimax" alone is incomplete for Pacman.'),
  (9,  'multi-agent (more than two)',
       'Layer a min (or chance) for each other agent. Pacman plus two ghosts: max, min, min, or max, chance, chance. The tree branches by the product of action sets. 188 Project 2: implement this, not just two-player.'),
  (10, 'not always zero-sum',
       'If utilities do not sum to a constant, max-max or other models apply; each agent maximizes its own. 188 mentions it; exams are usually zero-sum or expectimax. Do not minimax a cooperative game.'),
  (11, 'pruning with chance nodes',
       'Exact expectimax does not prune as cleanly as alpha-beta (averages need all children unless you have bounds). 188 usually asks alpha-beta on pure max/min trees. If they mix chance, compute the expectation; do not pretend it is min.'),
  (12, 'Project 2 (multi-agent)',
       'Minimax, expectimax, alpha-beta, evaluation. Ghosts can be random or adversarial depending on the question. If your agent dies to random ghosts, you probably used minimax. Expansion counts and exact values on tiny maps are autograded.'),
  (13, 'games vs MDPs',
       'Here the "environment" is an opponent (or a known random policy). MDPs: the environment is a transition matrix you (later) may not know. Expectimax with known ghost distribution is a known-chance game, not Q-learning.'),
  (14, 'games exam move',
       'Label max/min/chance. Fill bottom-up values. For alpha-beta, write alpha/beta at each node left-to-right and cross pruned edges. If they change a ghost to uniform random, switch those layers to expectimax and recompute.')
) AS c(pos, front, back)
WHERE d.slug = 'cs188'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 5. Markov Decision Processes
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'mdps'
CROSS JOIN (VALUES
  (0,  'MDP tuple',
       'States S, actions A, transition T(s, a, s'') = P(s'' | s, a), reward R(s, a, s'') or R(s), discount gamma in [0,1). Sequential decisions under known stochastic dynamics. Gridworld is the 188 picture. Contrast: search assumed deterministic successors.'),
  (1,  'policies and value',
       'A policy pi maps state to action (or a distribution). V^pi(s) is expected discounted return from s following pi. The optimal V*(s) is the best possible expected return. 188: values are numbers on squares; policies are arrows.'),
  (2,  'discount gamma',
       'Future rewards multiply by gamma each step. gamma = 0: greedy now. gamma near 1: far-sighted (and value iteration needs more sweeps; infinite horizon still converges if gamma is strictly less than 1). Living reward: a constant per step that makes you finish or wander.'),
  (3,  'Bellman equation for V*',
       'V*(s) = max over a of sum_{s''} T(s,a,s'') * (R(s,a,s'') + gamma V*(s'')). One-step lookahead with optimal future values. Q*(s,a) is the same without the max (the sum only). 188: write this once from memory or you will fail the algebra questions.'),
  (4,  'Q-values',
       'Q*(s,a) = sum_{s''} T (R + gamma V*(s'')). Then V*(s) = max_a Q*(s,a) and pi*(s) = argmax_a Q*(s,a). Q is the natural object for RL later (you can learn Q without T). Policy extraction from V needs a one-step lookahead with T; from Q it is just argmax.'),
  (5,  'value iteration',
       'Initialize V arbitrarily (often 0). Repeat a Bellman backup on all states (synchronous) until the max change is tiny. Converges to V* for gamma strictly less than 1. After enough iterations, extract pi by one-step greedy lookahead. 188: compute two backups on a tiny grid by hand.'),
  (6,  'policy iteration',
       'Policy evaluation: solve V^pi (linear system, or iterative backups without max). Policy improvement: greedy one-step with respect to V^pi. Repeat. Often fewer rounds than VI, each round more expensive. 188: know the two steps; you may not invert matrices on the exam.'),
  (7,  'Bellman backup as expectimax',
       'A depth-1 expectimax tree: max over actions, then chance over T, then V of next state. Value iteration is repeated expectimax backups. That is the bridge from games week. Infinite horizon: the tree is infinite, so we iterate values instead of unrolling forever.'),
  (8,  'terminal states',
       'Absorbing: V(terminal) is often just the exit reward and no future. Do not backup through a terminal as if you keep acting. 188 gridworld: the +1/-1 exits. Living reward is collected before exit depending on the R convention — read the slide''s R definition.'),
  (9,  'noise in gridworld',
       'Intended move with probability p, perpendicular slips otherwise (classic 188). That is T. Optimal policy can hug walls or take longer paths to avoid the pit. If p = 1, MDP collapses toward deterministic search (still discounted rewards).'),
  (10, 'finite vs infinite horizon',
       'Finite: time is part of state or you unroll t = N ... 0. Infinite discounted: stationary V* and pi*. 188 mostly infinite + gamma. Undiscounted infinite can be undefined if you can loop with positive reward.'),
  (11, 'convergence intuition',
       'Each backup propagates information one step farther (like a wave from rewards). After k iterations, V_k is exactly the optimal k-step lookahead (from 0 init). 188: "how many iterations until the exit reward reaches the start?" is Manhattan-ish in a deterministic grid.'),
  (12, 'VI vs PI vs brute policy enum',
       'There are exponentially many policies. VI never enumerates them. PI walks a sequence of improving policies. 188: do not "try all policies" on an exam unless the state space is tiny (2–3 states).'),
  (13, 'known T (planning) vs unknown (RL)',
       'This week you are given T and R — it is planning. Next week you only see samples. If the exam gives T, use VI/PI, not Q-learning. Mixing them is the #1 MDP/RL confusion.'),
  (14, 'MDP exam move',
       'Write the Bellman equation with their T and R. Do one or two value-iteration sweeps in a table. Extract arrows from the final V (or Q). State gamma. If they change noise, recompute the expectation, do not keep the old arrows.')
) AS c(pos, front, back)
WHERE d.slug = 'cs188'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 6. Reinforcement Learning
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'rl'
CROSS JOIN (VALUES
  (0,  'RL vs MDP planning',
       'You do not have T (or R) written down; you experience samples (s, a, r, s''). Goal is still a good policy. Model-based: estimate T, then VI. Model-free: estimate V or Q directly. 188 Project 3 is model-free Q-learning in Pacman/gridworld.'),
  (1,  'passive vs active',
       'Passive: follow a fixed policy, just learn V^pi (like policy evaluation from data). Active: choose actions to learn and to collect reward (exploration). Q-learning is active and off-policy. 188: name which one they described.'),
  (2,  'sample-based policy evaluation',
       'Direct: average returns from each s (Monte Carlo). Needs full episodes. Temporal difference: V(s) gets closer to r + gamma V(s'') after each transition. TD can learn online, incomplete episodes. 188: MC vs TD is a vitamin classic.'),
  (3,  'TD update (V)',
       'V(s) := V(s) + alpha * (r + gamma V(s'') - V(s)). The term in parentheses is the TD error. alpha is the learning rate (small, or 1/counts). If alpha does not go to 0, values keep bouncing. 188: plug in numbers once by hand.'),
  (4,  'Q-learning',
       'Q(s,a) := Q(s,a) + alpha * (r + gamma max_{a''} Q(s'',a'') - Q(s,a)). Off-policy: the max is the greedy backup, even if you actually took an exploratory action. Converges to Q* (under exploration and step-size conditions). This is the 188 RL equation to memorize.'),
  (5,  'SARSA (on-policy, light)',
       'Backup uses the action you actually took at s'', not the max. Learns Q^pi for the behavior policy. Safer in some live systems. 188 may only contrast it with Q-learning''s max. If the exam says "use the max next Q," it is Q-learning.'),
  (6,  'exploration vs exploitation',
       'Epsilon-greedy: with probability epsilon, random action; else argmax Q. Too little epsilon: stuck on a suboptimal action that looked good early. Too much: never ride the good policy. Decay epsilon over time. Optimistic initialization is another trick.'),
  (7,  'approximate Q-learning',
       'Q(s,a) = w · f(s,a) for features f. Update w in the direction of the TD error times the features (Q-learning with linear FA). Lets Pacman generalize across similar positions. 188: features must be functions of (s,a); bad features cannot be saved by more alpha.'),
  (8,  'why tabular Q fails in Pacman',
       'Too many states (food configurations). Function approximation + identity features for "ghost near" etc. Overfitting features / aliasing: two states share features but need different actions. 188 Project 3 part 2 is this fight.'),
  (9,  'reward shaping (caution)',
       'Adding extra rewards to "guide" learning can change the optimal policy unless it is potential-based shaping (Ng et al. slogan). 188: living reward already shapes haste. Do not sprinkle +1 for "looks good" without thinking.'),
  (10, 'on-policy data vs off-policy',
       'Q-learning can learn about the greedy policy from exploratory data. That is why it is off-policy. If you only ever take random actions but still max in the backup, you can still converge to Q* in theory. In practice, coverage matters.'),
  (11, 'batch / experience (light)',
       'Replay, averaging many samples: more stats, less online. 188 stays at one-sample TD. Deep RL (DQN) is a cameo, not the exam algorithm. Do not write a neural net if they asked for a Q table update.'),
  (12, 'Project 3 (RL)',
       'Implement Q-update, epsilon-greedy, then feature-based Pacman. If values diverge, alpha is too big or gamma is 1 with looping positive rewards. If the agent never leaves the start, epsilon is 0 and Q is 0. Watch the sign of rewards.'),
  (13, 'RL vs games vs search',
       'Search: known deterministic tree. Games: known opponent or chance model, we still recurse. RL: unknown T, sample through the world. If they give a full T table, it is an MDP question, not RL.'),
  (14, 'RL exam move',
       'Write the Q-learning update and plug in the sample (s,a,r,s''). State alpha, gamma, and whether next action is max or on-policy. If features, write Q = w · f and the w update. Circle exploration: epsilon or not.')
) AS c(pos, front, back)
WHERE d.slug = 'cs188'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 7. Probability & Bayes Nets
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'bayes-rep'
CROSS JOIN (VALUES
  (0,  'why probability in 188',
       'Sensors lie, ghosts move randomly, medical tests are noisy. Agents maximize expected utility under a belief. CS 70 gave you the axioms; 188 builds joint distributions that are too big to write, hence Bayes nets. Ghostbusters is the project.'),
  (1,  'joint, marginal, conditional',
       'Joint P(X,Y) over all assignments. Marginal: sum out the other variables. Conditional P(X|Y=y) = P(X,y) / P(y). Always a distribution over the leftover variables. 188: if they ask for a number, say whether it is joint, conditional, or a most-likely assignment.'),
  (2,  'product rule and Bayes',
       'P(X,Y) = P(X|Y) P(Y) = P(Y|X) P(X). Bayes: P(H|e) proportional to P(e|H) P(H). Normalize so the posterior sums to 1. 188 exams: write the unnormalized table, then divide by the sum. Skipping normalize is a vitamin trap.'),
  (3,  'independence vs conditional independence',
       'X independent of Y: P(X,Y)=P(X)P(Y). Conditionally independent given Z: P(X,Y|Z)=P(X|Z)P(Y|Z). Independence is rare; CI given a BN separator is the whole point. 70: definition. 188: read it off a graph.'),
  (4,  'Bayes net',
       'Directed acyclic graph plus a CPT for each node given its parents. Joint = product over i of P(X_i | Parents(X_i)). Compact: local CPTs, exponential only in fan-in, not in n. Missing edges are CI assumptions. 188: write the product factorization first, then plug numbers.'),
  (5,  'semantics: local Markov',
       'A node is independent of its non-descendants given its parents. Causal cartoon: arrows often mean "direct influence," but the math is the factorization, not the philosophy. Reversing an arrow usually changes which independences you claim.'),
  (6,  'd-separation (188 slogan)',
       'X and Y are d-separated by evidence Z if every undirected path is blocked. Chain and fork: blocked by observing the middle. Collider (v-structure): blocked when the collider and descendants are not observed; observing a collider opens the path. 188: "explain away" is the collider.'),
  (7,  'explaining away',
       'Two independent causes of one effect: observing the effect makes them dependent; observing one cause lowers P(the other | effect). Classic: burglar and earthquake both cause alarm. 188 midterm drawing.'),
  (8,  'Markov blanket',
       'Parents, children, and co-parents of children. Given the blanket, a node is independent of the rest of the net. Gibbs sampling uses this. 188: name the blanket on a small graph.'),
  (9,  'CPT size',
       'If a node has k binary parents, the CPT has 2^k rows of probabilities (2^{k+1} entries if you store both true/false, or 2^k if the last is 1-minus). That is why we keep parent sets small. Deterministic OR still counts as a CPT.'),
  (10, 'common 188 nets',
       'Naive Bayes (later ML): class points to all features, features independent given class. HMM: chain of hidden X_t, each with evidence E_t. Diagnostic nets: symptoms given diseases. Draw arrows from causes to effects unless they specify otherwise.'),
  (11, 'not every joint is a given BN',
       'If the true independences do not match the graph, the product is the wrong model (or an approximation). Adding an edge never removes independences; it can only add dependence. 188: "can this BN represent that independence?" — d-separation.'),
  (12, '70 skills you must not drop',
       'Law of total probability, chain rule, "given" vs "and," binary vs multi-valued. 188 will mix a BN factorization with a 70-style table. If your posterior does not sum to 1, you forgot to normalize or you marginalized the wrong index.'),
  (13, 'Project 4 (Ghostbusters / BN)',
       'Usually inference in an HMM-like ghost world: beliefs over positions given noisy readings. Representation first (what is hidden vs evidence), then the inference algorithms of the next section. Wrong graph = wrong posterior forever.'),
  (14, 'BN-rep exam move',
       'Write P(all) as a product of CPTs. For independence, try d-separation on each path; mention collider vs chain. If they give numbers, fill the joint for the relevant tiny slice, then condition and normalize.')
) AS c(pos, front, back)
WHERE d.slug = 'cs188'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 8. BN Inference & Sampling
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'bayes-inf'
CROSS JOIN (VALUES
  (0,  'inference tasks',
       'P(Q | e): posterior over query vars given evidence. MAP: most likely assignment to Q given e. MPE: most likely full hidden assignment. 188 mostly posterior marginals. Enumeration is exact; sampling is approximate.'),
  (1,  'inference by enumeration',
       'Sum the joint over hidden variables, with evidence clamped. Factor the product of CPTs, push sums in (by hand on tiny nets). Exponential in the number of hidden vars. Correct, too slow. 188: do a 3-variable numeric example.'),
  (2,  'variable elimination',
       'Move sums left-to-right: multiply factors that mention the variable, then sum it out, producing a new factor. Order matters for speed (treewidth). Worst case still exponential. 188: show the factor tables after eliminating one var. Leave evidence as a clamped factor.'),
  (3,  'factors',
       'A factor is a table over a subset of variables (not necessarily a probability). Multiply: pointwise on the union of scopes. Sum-out: add rows that differ only on the eliminated var. 188 VE is just factor algebra. Normalize at the end for a posterior.'),
  (4,  'evidence in VE',
       'Fix evidence variables to the observed values (reduce factors). Do not sum them out. Query variables stay until the end. Hidden: eliminate. Mixing these three is how people get a number that is not P(Q|e).'),
  (5,  'complexity / treewidth slogan',
       'VE is exponential in the size of the largest factor during elimination. A chain is easy; a grid is hard. 188: "exact inference in general BNs is NP-hard" (actually #P-hard for probabilities) — so we sample on Ghostbusters-scale nets.'),
  (6,  'prior sampling',
       'Sample each node given its already-sampled parents (topological order). Approximate a joint by histogram. To condition on evidence, throw away samples that miss (rejection). Easy and unbiased for the joint; wastes samples if evidence is rare.'),
  (7,  'rejection sampling',
       'Prior-sample, keep only samples consistent with e, count query. Unbiased estimate of P(Q|e). If P(e) is tiny, almost every sample dies. 188: expected kept fraction is P(e). Do not "nudge" a rejected sample; that would be a different algorithm.'),
  (8,  'likelihood weighting',
       'Clamp evidence nodes to their values; when you would have sampled them, multiply a weight by P(evidence | parents) instead. Sample non-evidence as usual. Weighted histogram approximates P(Q|e). Better than rejection when evidence is downstream. Weights can still be tiny if evidence is unlikely given parents.'),
  (9,  'Gibbs sampling',
       'MCMC: start with a full assignment consistent with e. Repeatedly resample one hidden variable from P(X | Markov blanket, e). After mixing, the histogram of visits approximates the posterior. Correlated samples. 188: write the blanket distribution, not "sample from the CPT alone."'),
  (10, 'when which sampler',
       'Rare evidence, evidence is leaves: LW. Need exact: VE on a small net. Hard posterior, many correlated hiddens: Gibbs (with enough mixing talk). Prior sampling without rejection does not give P(Q|e). 188 loves "which samples are wasted."'),
  (11, 'unbiased vs consistent',
       'Rejection and LW (with infinite samples) converge to the true posterior. Finite N has variance. Gibbs is consistent under mild conditions after burn-in, not an i.i.d. unbiased average of the first sample. 188: more samples, less variance; do not claim a single Gibbs pass is exact.'),
  (12, 'MAP vs sampling counts',
       'The most frequent sample of Q is an approximate MAP. Not the same as the posterior mean. 188: if they want P, normalize counts/weights; if they want an assignment, argmax.'),
  (13, 'Ghostbusters inference',
       'Often particle filtering (next section) rather than full BN Gibbs. Same idea: weighted particles as an approximate belief. If you implement enumeration on a 30x30 grid, you will time out. That is why 188 teaches sampling.'),
  (14, 'inference exam move',
       'Exact: enumerate or one VE elimination with factor tables, then normalize. Sampling: say what is sampled vs weighted vs rejected. If they give 4 samples, compute the actual estimate (weights included). Name the Markov blanket for a Gibbs step.')
) AS c(pos, front, back)
WHERE d.slug = 'cs188'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 9. HMMs, Filtering & Decisions
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'hmm-vpi'
CROSS JOIN (VALUES
  (0,  'HMM',
       'Hidden Markov Model: hidden chain X_0, X_1, ... with P(X_t | X_{t-1}) (stationary), evidence E_t with P(E_t | X_t). Belief at time t is P(X_t | e_{1:t}). Ghost position is X; noisy reading is E. 188 Ghostbusters.'),
  (1,  'Markov and stationarity',
       'P(X_t | X_{0:t-1}) = P(X_t | X_{t-1}). Emission depends only on current X. Stationary: the same T and O every t. If the ghost changes speed, the model is wrong. 188: write the two CPTs, not a fully connected BN unrolled by hand every time.'),
  (2,  'filtering / forward',
       'Elapse: B''(x'') = sum_x P(x''|x) B(x). Observe: B(x) proportional to P(e|x) B''(x), then normalize. Repeat. This is exact for discrete X. 188: one elapse + one observe on a 2-state ghost by hand.'),
  (3,  'prediction vs smoothing vs decoding',
       'Filter: current belief. Predict: future without that time''s evidence. Smooth: P(X_t | all e including future) — forward-backward. Decode: most likely trajectory (Viterbi), not the sequence of most likely states (can be invalid). 188: Viterbi vs forward is a classic trick question.'),
  (4,  'Viterbi',
       'Max-product version of forward: keep the best path score into each state, with backpointers. Yields the single most likely X_{1:T} given e_{1:T}. 188: replace sum with max in the elapse step (and do not normalize the same way as a belief — scores are path probabilities).'),
  (5,  'particle filtering',
       'Represent B by a bag of particles (samples of X). Elapse: each particle takes a sampled transition. Weight by P(e|x), then resample (weighted to unweighted). Approximate forward when |X| is huge. 188: too few particles = impoverishment; all particles in the wrong room never recover if T cannot jump.'),
  (6,  'resampling',
       'After weighting, draw a new population with replacement proportional to weights (or systematic resampling). High-weight particles duplicate; zero-weight die. That is how evidence "moves" the cloud. 188: if you skip resample, you just have weighted prior samples (LW-like) and variance grows.'),
  (7,  'decision networks',
       'BN plus action nodes and a utility node. Choose the action maximizing expected utility given evidence (MEU). 188: this is expectimax one-shot, not a full MDP (unless you unroll). VPI asks whether to buy more evidence first.'),
  (8,  'MEU',
       'For each action a, EU(a | e) = sum_x P(x|e,a) U(a,x) (or the net''s utility parents). Pick argmax. If U is a table on parents, enumerate those parents'' posterior. 188 numeric: two actions, compute both EUs.'),
  (9,  'value of perfect information (VPI)',
       'VPI(E'' | e) = (expected MEU after observing E'') minus MEU now. Always at least 0 (with optimal later action). VPI = 0 if the observation cannot change the action. 188: compute MEU for each possible e'', weight by P(e''|e). Not the same as mutual information unless they say so.'),
  (10, 'myopic VPI',
       '188 usually considers one test. Nonmyopic: sequence of tests is harder (optional information-gathering MDP). If they ask "should you pay $c for the sensor," compare VPI to c in utility units. Units must match U.'),
  (11, 'Ghostbusters + VPI energy',
       'A noisy reading has VPI less than a perfect locator. If your belief is already peaked, more sensors do little. That is VPI, not "sensors are good." Combine with particle filtering: the belief you plug into MEU is approximate.'),
  (12, 'DBNs (light)',
       'Dynamic Bayes net: HMM with extra hidden state (position and heading). Unroll 2-TBN. Inference: still elapse/observe, bigger X. 188 may show a DBN picture and ask for the factorization. Do not invent extra arrows.'),
  (13, 'Project 4/5 HMM piece',
       'Exact forward on a small grid, particles on a large one. If particles collapse, check weights and resampling. If belief ignores walls, T is wrong. VPI questions on exams are usually tiny decision nets, not the full project.'),
  (14, 'HMM/VPI exam move',
       'Filter: elapse then observe, normalize. Viterbi: max and backpointers. Particles: sample T, weight O, resample. VPI: MEU now, MEU after each possible observation, subtract. If they add a second ghost, X is a pair — say the state exploded.')
) AS c(pos, front, back)
WHERE d.slug = 'cs188'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 10. Machine Learning
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'ml'
CROSS JOIN (VALUES
  (0,  'supervised learning slogan',
       'Given labeled pairs (x, y), learn h that predicts y_new for unseen x. Classification: discrete y. Regression: real y. 188: naive Bayes, perceptron, a taste of neural nets / trees. CS 189 is the full course. Generalization beats training accuracy.'),
  (1,  'train / validation / test',
       'Fit on train. Tune hyperparameters on validation (or CV). Report test once. Training error can go to 0 while test is bad (overfit). 188: smoothing, perceptron iterations, net depth are hyperparameters. Do not peek at test to choose them.'),
  (2,  'naive Bayes',
       'Assume features independent given the class: P(y) product_i P(f_i | y). Predict argmax_y of that (plus log-sum for stability). Linear in the number of features. 188: bag-of-words spam is the picture. The independence is naive and often false; it can still classify well.'),
  (3,  'Laplace (add-k) smoothing',
       'Unseen word given spam would make P=0 and kill the product. Pretend you saw k extra counts of each feature value. k=1 is Laplace. 188: write the smoothed MLE fraction (count + k) / (N + k |V|). Too much k: towards uniform, underfits.'),
  (4,  'NB as a Bayes net',
       'Class at the root, features as leaves. Inference is exactly the NB product. Parameters from counts (with smoothing). 188: this is why NB sits after BNs. If features are not independent given y, the probabilities are wrong but the argmax can still work.'),
  (5,  'perceptron',
       'Linear classifier: yhat = sign(w · f(x)). If a mistake, w := w + y f(x) (for y in {+1,-1}). Separable data: converges (Novikoff). Not probabilistic. 188: features again; the original pixels may not be linearly separable, so you engineer f.'),
  (6,  'multi-class perceptron',
       'One weight vector per class; pick argmax_c w_c · f. On a mistake (true y, guessed yhat): w_y += f, w_yhat -= f. 188 Pacman classification / digit demos use this. Ties and the zero vector initialization matter on tiny examples.'),
  (7,  'neural nets (188 depth)',
       'Linear layers and nonlinearities (ReLU, sigmoid); loss on the output; backprop = chain rule on the computation graph. 188: you will not derive every Jacobian, but you must know that hidden layers make nonlinear decision boundaries and that more capacity overfits. Training uses gradient steps (SGD).'),
  (8,  'overfitting and capacity',
       'A hypothesis class that can fit anything will fit noise. Regularization, early stopping, more data, simpler features. Decision trees: depth as capacity. 188: a training accuracy of 100% with terrible test is the slide they want you to describe.'),
  (9,  'decision trees (if the term includes them)',
       'Split on features to reduce impurity (or error); leaves predict a label. Deep trees overfit; pruning / depth caps help. 188 sp26-style lectures pair trees with linear regression as the "two simplest supervised stories." If Fall 2026 skips trees, this is still AIMA-legal.'),
  (10, 'features win',
       '188 ML performance is usually features, not a fancier optimizer. For Pacman: indicators for "food in quadrant," distances, not the raw board always. Same moral as approximate Q-learning. Bad features: no algorithm saves you.'),
  (11, 'generative vs discriminative',
       'NB models P(x|y)P(y) (generative). Perceptron / logistic / nets model a decision rule or P(y|x) (discriminative). 188: NB can handle missing features via the model; perceptron needs a feature vector. Neither is "AI complete."'),
  (12, 'ethics / society (Pierson energy)',
       'Classifiers copy training bias; medical and policy data are not i.i.d. 188 will not replace a fairness course, but "maximize accuracy" without who is in the test set is incomplete. If the offering includes an applications/LLM lecture, treat it as: same loss, different features and data scale.'),
  (13, '188 closing picture',
       'Search when you can plan; CSPs when the state is an assignment; games when someone plays back; MDPs/RL when the world is a loop of reward; BNs/HMMs when you must infer; ML when you only have examples. Pacman was one agent wearing all of those hats. That is Introduction to Artificial Intelligence.'),
  (14, 'ML exam move',
       'NB: write the product, smooth the counts, argmax. Perceptron: show the mistake update on a tiny vector. If they give train vs test curves, name overfit. If they ask BN vs NB, draw the graph. Do not Q-learn a labeled classification set unless they said RL.')
) AS c(pos, front, back)
WHERE d.slug = 'cs188'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

UPDATE public.decks
SET    card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE  slug = 'cs188';
