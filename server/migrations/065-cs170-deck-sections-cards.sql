-- Migration 065: CS 170 — Efficient Algorithms and Intractable Problems, new deck.
-- UC Berkeley Fall 2026: Nika Haghtalab, John Wright (campus listing also
-- David Zhai Yang, Mark Bedaywi). TuTh 9:30-10:59, UAB 100. cs170.org.
-- Catalog: design and analysis of algorithms; graphs, greedy, D&C, DP, LP,
-- NP-completeness. Prereq typically CS 61B and CS 70.
-- Text: Dasgupta, Papadimitriou, Vazirani, Algorithms (DPV).
-- Sequence follows the Fall 2026 lecture calendar.

INSERT INTO public.decks (owner_id, slug, title, description, class_id, source, is_public, cover_emoji, card_count)
VALUES (
  NULL,
  'cs170',
  'CS 170',
  'Efficient Algorithms — Haghtalab / Wright / DPV: D&C, graphs, greedy, DP, LP, NP',
  'uc-berkeley:cs170:fa26',
  'system',
  true,
  '🧩',
  0
)
ON CONFLICT (slug) DO UPDATE SET
  title       = EXCLUDED.title,
  description = EXCLUDED.description,
  class_id    = EXCLUDED.class_id,
  cover_emoji = EXCLUDED.cover_emoji;

DELETE FROM public.saved_tidbits
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'cs170');

DELETE FROM public.tidbits
WHERE category_id = 'cs170';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'cs170');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'cs170');

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('asymptotics',     'Asymptotics & Recurrences',
   'Worst-case, big-O, recurrences, Master theorem (DPV 0, 2.1–2.2)', 0),
  ('divide-conquer',  'Divide and Conquer',
   'Mergesort, selection, Karatsuba, closest pair (DPV 2.3–2.5)', 1),
  ('graph-decomp',    'Graph Search & Decomposition',
   'BFS, DFS, DAGs, topological order, SCCs (DPV 3)', 2),
  ('shortest-paths',  'Shortest Paths',
   'Dijkstra, Bellman-Ford, DAGs, all-pairs (DPV 4)', 3),
  ('greedy',          'Greedy Algorithms',
   'Huffman, MST, Kruskal, Prim, Union-Find (DPV 5)', 4),
  ('dp',              'Dynamic Programming',
   'Knapsack, LCS, trees, Floyd-Warshall (DPV 6)', 5),
  ('lp-flow',         'Linear Programming & Flow',
   'LPs, max-flow min-cut, bipartite matching (DPV 7.1–7.2)', 6),
  ('duality-games',   'Duality & Zero-Sum Games',
   'Weak/strong duality, mixed strategies (DPV 7.4–7.5)', 7),
  ('p-np',            'P, NP & Reductions',
   'Certificates, poly-time reductions, SAT (DPV 8)', 8),
  ('np-coping',       'NP-Completeness & Coping',
   'NPC proofs, approximation, randomized (DPV 8–9, 1)', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'cs170'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. Asymptotics & Recurrences
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'asymptotics'
CROSS JOIN (VALUES
  (0,  'CS 170 (Haghtalab / Wright) in one sentence',
       'Design algorithms you can prove correct and time-bound: divide-and-conquer, graphs, greedy, DP, linear programming, then the wall of NP-completeness and how to cope. Textbook: Dasgupta, Papadimitriou, Vazirani (DPV). Site: cs170.org.'),
  (1,  'algorithm vs. problem',
       'A problem is a spec (input/output, e.g. shortest path). An algorithm is a procedure that solves it. 170 grades both: a clever idea without a runtime, or a runtime without a correctness argument, is half a solution. Reductions relate problems, not codebases.'),
  (2,  'worst-case running time',
       'Asymptotic time as a function of input size in the worst case (unless they ask average). Hide constants and low-order terms. 170 wants Theta when you have matching bounds; big-O is an upper bound only. "It is fast on my laptop" is not an analysis.'),
  (3,  'big-O, Omega, Theta',
       'O: at most this order (upper). Omega: at least this order (lower). Theta: both, tight. f is O(g) if some constant c and n0 exist so f(n) is at most c g(n) for n at least n0. Do not write "O(n) = O(n log n)" as if they were equal functions.'),
  (4,  'polynomial vs. exponential',
       'n^k for fixed k is polynomial (P-land). 2^n, n!, and n^n are not. 170: an O(n^3) graph algorithm is "efficient"; brute-force subsets is not. The P vs NP unit makes this the whole course, not a slogan.'),
  (5,  'loop analysis',
       'Nested loops: multiply when independent; sum when the inner bound depends on the outer (arithmetic series). Recursion is not a loop — write a recurrence. Hash tables and graphs: say what you assume (expected vs worst).'),
  (6,  'recurrences by unfolding',
       'T(n) = T(n/2) + O(1) unfolds to O(log n) (binary search). T(n) = 2T(n/2) + O(n) unfolds to O(n log n) (mergesort). Draw the tree: depth times work per level, or a geometric series if levels shrink.'),
  (7,  'Master theorem (170 slogan)',
       'T(n) = a T(n/b) + O(n^d). Compare log_b(a) to d. If d is smaller, root is dominated by leaves: Theta(n^{log_b a}). If equal, Theta(n^d log n). If d is larger, root dominates: Theta(n^d). Unbalanced splits and floors need extra care; the slogan is for the balanced case.'),
  (8,  'substitution / induction on recurrences',
       'Guess the form, plug in, and check the inductive step with enough slack for the base. A common miss: the constant in O() must work for all n, so strengthen the hypothesis (e.g. T(n) at most c n log n minus a lower-order term).'),
  (9,  'comparison lower bound for sorting',
       'In the comparison model, a sorting algorithm is a decision tree with n! leaves, so height is Omega(n log n). Mergesort matches. Counting sort / radix are not comparison sorts — different model, extra assumptions on keys.'),
  (10, 'logarithms in runtimes',
       'log n rounds of halving; log n bits to name n items; depth of a balanced tree. Changing log bases is a constant. "log-star" and inverse Ackermann show up in Union-Find, not in week 1 — but 170 loves "almost constant."'),
  (11, 'reductions as a design tool',
       'Solve B by transforming to A that you already can solve (and transforming the answer back). Cost of the transform plus cost of A. Later, NP-reductions reverse the intuition: you reduce the known-hard problem TO the new one. Direction matters.'),
  (12, 'CS 70 vs. CS 170',
       '70: proofs, graphs as objects, concentration, modular arithmetic. 170: you design the procedure and bound it. Graph search you saw in 61B; here the point is invariants, shortest-path proofs, and which algorithm dies on negative weights.'),
  (13, 'models of computation (light)',
       'RAM model: arrays, arithmetic in unit time (word size caveats). Graphs: n vertices, m edges; always state O(n+m) vs O(n^2). Bit complexity matters for huge integers (DPV numbers / RSA later). 170 will say when unit-cost is a lie.'),
  (14, '170 exam habit',
       'Name the algorithm family, write the recurrence or loop bound, and give a one-sentence invariant or greedy-choice / subproblem. "Use DP" without defining the subproblem is not full credit. Counterexamples kill greedy claims.')
) AS c(pos, front, back)
WHERE d.slug = 'cs170'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 2. Divide and Conquer
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'divide-conquer'
CROSS JOIN (VALUES
  (0,  'divide-and-conquer pattern',
       'Split the input into similar pieces, recurse, combine. Cost = recursive cost + combine. Works when pieces do not share overlapping subproblems (those want DP) and the split is not pathologically unbalanced. 170 weeks 2–3 are DPV 2.3–2.5.'),
  (1,  'mergesort',
       'Split in half, sort each, merge in linear time. T(n) = 2T(n/2) + O(n) = Theta(n log n). Stable if the merge is. Extra Theta(n) memory for the merge buffer is the usual implementation tax vs in-place heapsort.'),
  (2,  'binary search as D&C',
       'T(n) = T(n/2) + O(1) = Theta(log n). Needs a sorted array (or a monotonic predicate). The 170 trick is to search on the answer: binary-search a cutoff and check feasibility in poly time (later: optimization vs decision).'),
  (3,  'Karatsuba integer multiplication',
       'Naive grade-school is O(n^2) on n-digit numbers. Karatsuba: three n/2 multiplies instead of four, plus linear combine. Master theorem: a=3, b=2, d=1 gives about n^{1.58}. DPV 2.1–2.5 is this story. FFT multiplication is even faster (DPV 2.6, often a cameo).'),
  (4,  'median of medians (selection)',
       'Worst-case linear-time k-th smallest: groups of 5, recurse on about n/5 medians, partition around that pivot, recurse on one side. The pivot is guaranteed good enough that the recurrence is T(n) = T(n/5) + T(7n/10) + O(n) = O(n). Quickselect is faster in practice but worst-case quadratic.'),
  (5,  'why groups of 5',
       'Groups of 5 (or 7) make the guaranteed discard a constant fraction. Groups of 3 do not give a fraction that solves to linear with the same proof. 170 wants the fraction argument, not a magic 5.'),
  (6,  'closest pair of points',
       'D&C in the plane: split by x-median, recurse, then check a strip of width equal to the min-so-far. Sorting by y in the strip, each point only checks a constant number of neighbors. O(n log n). The strip argument is the combine step people forget.'),
  (7,  'FFT slogan (polynomial multiply)',
       'Evaluate two polynomials at roots of unity, pointwise multiply, interpolate. O(n log n) vs O(n^2) naive. DPV 2.6. Even if Fall 2026 spends little lecture time, 170 midterms love "why D&C plus roots of unity." Inverse FFT exists; rounding is a numerical footnote.'),
  (8,  'recursion tree vs Master theorem',
       'Unbalanced or two different recursive sizes (median of medians) need a tree or substitution; Master theorem wants equal a-way splits of n/b. If the exam gives T(n) = T(n/3) + T(2n/3) + O(n), the tree sums to O(n log n).'),
  (9,  'Strassen matrix multiply (light)',
       'Seven n/2 multiplies instead of eight. Better than O(n^3), worse constants. 170: same Karatsuba moral — reduce the number of expensive recursive multiplies. Not the algorithm you run in numpy.'),
  (10, 'correctness by induction on n',
       'Base: tiny inputs. Inductive step: assume the recursive calls are correct, prove combine is. Closest-pair strip and merge correctness are the usual gaps. "It divides, so it works" is not a proof.'),
  (11, 'when D&C is the wrong tool',
       'Overlapping subproblems (Fibonacci naive recursion, shortest paths with reuse) waste exponential work — memoize / DP. Greedy may be simpler if a proof exists. D&C shines when combine is cheap relative to the branching.'),
  (12, 'integer vs. comparison costs',
       'Karatsuba counts digit operations. Sorting counts comparisons. Mixing models (bit complexity of Dijkstra with huge weights) is a 170 gotcha. State the cost model in the first sentence of an analysis.'),
  (13, 'quicksort vs mergesort (170 angle)',
       'Quicksort is D&C with unbalanced expected splits: expected O(n log n), worst O(n^2). Mergesort is deterministic Theta(n log n). Randomized pivot is the 170 "make the worst case unlikely" preview of randomized algorithms.'),
  (14, 'D&C exam move',
       'Write the split, the combine, the recurrence, and solve it. If they ask for worst-case linear selection, it is median-of-medians, not "quickselect with luck." Circle the combine cost — that is where people undercount.')
) AS c(pos, front, back)
WHERE d.slug = 'cs170'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 3. Graph Search & Decomposition
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'graph-decomp'
CROSS JOIN (VALUES
  (0,  'adjacency list vs. matrix',
       'List: Theta(n+m) space, walk neighbors in degree time — default for sparse graphs. Matrix: Theta(n^2), O(1) edge query, better when dense or you need algebra. 170: quote n and m in every runtime. Directed edges are one-way lists.'),
  (1,  'BFS',
       'Queue; explores by layers. On unweighted graphs, first time you reach v is a shortest path in hops. O(n+m). Parent pointers reconstruct. 61B implemented it; 170 wants the layer invariant: nodes in layer k have dist k.'),
  (2,  'DFS',
       'Stack / recursion; discovery and finish times. O(n+m). Builds a forest. Used for topo sort, cycle detection, SCCs — not for unweighted shortest paths (that is BFS). Nested intervals of [discover, finish] encode ancestry.'),
  (3,  'DAG and topological order',
       'Directed acyclic graph: vertices can be ordered so every edge goes forward. DFS finish times reverse, or Kahn''s algorithm (peel indegree 0). Linear time. If a cycle exists, no topo order. DP on DAGs needs this order.'),
  (4,  'cycle detection',
       'Undirected: back edge to a gray ancestor (careful with the parent). Directed: back edge to an ancestor on the DFS stack (gray node). A directed graph can have cycles without being strongly connected — detect on the directed graph, not the underlying undirected one.'),
  (5,  'undirected connected components',
       'BFS or DFS from unvisited vertices; each tree is a component. Equivalence classes of "reachability ignoring direction." Union-Find also works (Kruskal''s cousin). O(n+m).'),
  (6,  'strongly connected components',
       'Maximal sets where every vertex can reach every other (directed). The condensation (meta-graph) is a DAG. Kosaraju: DFS finish order, then DFS on the reversed graph in that order. Tarjan/Gabow are one-pass; 170 usually wants Kosaraju''s two DFS picture.'),
  (7,  'why reverse the graph (Kosaraju)',
       'Finish times in G process sinks of the SCC DAG last. Running DFS on G^T in decreasing finish order peels SCCs as sources of the reversed DAG. If you skip the reverse, you get a wrong partition. Draw the SCC DAG once.'),
  (8,  'edge types in DFS (directed)',
       'Tree, back (to ancestor — cycle), forward (to descendant), cross (the rest). Back edges characterize directed cycles. 170 may ask you to classify after running DFS with timestamps — do not memorize a picture, run the algorithm.'),
  (9,  'runtime O(n+m) discipline',
       'Each vertex and edge is processed a constant number of times. Nested loops over all pairs is O(n^2) and fails the sparse-graph test. If you "look at all paths," you left linear time. Implicit graphs: n and m are whatever you generate.'),
  (10, 'implicit graphs',
       'Vertices are states (configs, subsets, positions). Edges are moves. You never build the whole adjacency list if it is huge — generate neighbors on the fly. BFS still finds shortest hop paths. 170 modeling questions live here.'),
  (11, 'reachability vs. shortest paths',
       'DFS/BFS both decide reachability. Only BFS (unweighted) or Dijkstra/BF (weighted) give distances. "I DFSed so I know the shortest path" is a 170 fail unless every edge has the same nonnegative weight and you actually used BFS.'),
  (12, '2-SAT as implication graph (cameo)',
       'Each clause (a OR b) gives implications (not a) implies b and (not b) implies a. Unsatisfiable iff some x and not-x share an SCC. Linear-time via Kosaraju. Contrast 3-SAT (NP-complete later). Nice SCC application even if the term rushes it.'),
  (13, 'DPV chapter 3 moral',
       'Decompose first: components, topo order, SCCs. Many "hard" directed problems become easy on the DAG of SCCs plus independent work inside. Do not Dijkstra a problem that was actually "is there a cycle."'),
  (14, 'graph-search exam move',
       'Directed or not? Weighted? Need distances or only connectivity? Then pick BFS / DFS / SCC / topo. If they give a DFS forest, use timestamps. If they ask runtime, say O(n+m) and mean it.')
) AS c(pos, front, back)
WHERE d.slug = 'cs170'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 4. Shortest Paths
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'shortest-paths'
CROSS JOIN (VALUES
  (0,  'relaxation',
       'If dist[u] + w(u,v) is better than dist[v], update dist[v] and parent. All the classical algorithms are "relax edges in a smart order." Invariant: dist[v] is always an upper bound on true distance (after init dist[s]=0, others inf).'),
  (1,  'Dijkstra',
       'Nonnegative weights. Repeatedly settle the unsettled vertex with smallest dist (like BFS with a heap). Binary heap: O((n+m) log n). Correct because a settled vertex never needs to decrease again when weights are at least 0. Parent pointers give a shortest-path tree.'),
  (2,  'why Dijkstra fails on negatives',
       'A settled node might have a better path that used a later negative edge. Counterexample: s-a weight 1, s-b weight 100, b-a weight -99. If you settle a first you are wrong. Use Bellman-Ford (or Johnson for all-pairs) when negatives exist.'),
  (3,  'Bellman-Ford',
       'Relax every edge n-1 times. Handles negative weights. Extra nth pass: if anything still updates, a negative cycle is reachable from s. O(nm). Detecting a negative cycle anywhere: add a super-source, or run from each component.'),
  (4,  'negative cycles',
       'If a reachable negative cycle exists, shortest paths are undefined (walk forever). BF reports this. Dijkstra cannot. In difference constraints, a negative cycle means the system is infeasible. 170: "output -inf" only if the problem allows unbounded walks.'),
  (5,  'DAG shortest (and longest) paths',
       'Topo-order, relax outgoing edges once: O(n+m). Negatives are fine — no cycles at all. Longest paths on DAGs: negate weights or take max instead of min. Longest path on general graphs is NP-hard (later).'),
  (6,  'unweighted shortest = BFS',
       'Every edge weight 1 (or equal nonnegative). Dijkstra still works but is overkill; BFS is O(n+m) with a queue. 0-1 BFS (deque) is the cute extension for weights in {0,1}.'),
  (7,  'all-pairs: Floyd-Warshall',
       'DP: d(i,j,k) = shortest i to j using intermediate vertices from 1..k. Triple loop O(n^3). Handles negatives; check diagonal for negative cycles. Simple to code; dense graphs. Sparse: n Dijkstras (nonneg) or Johnson.'),
  (8,  'Johnson''s algorithm (slogan)',
       'Bellman-Ford from a super-source to compute potentials, reweight to nonnegative, then n Dijkstras. All-pairs with negatives, no negative cycle, sparse-friendly. Potentials: w''(u,v) = w(u,v) + h(u) - h(v) preserves shortest paths.'),
  (9,  'path reconstruction',
       'Store parent (or successor) on each successful relaxation. For Floyd, a next[i][j] table. If you only keep distances you cannot list the vertices. Cycles: stop if a vertex repeats (negative cycle or a bug).'),
  (10, 'which algorithm? (decision tree)',
       'Unweighted: BFS. Nonneg: Dijkstra. Negatives, no neg cycle needed detect: BF. DAG: topo. All-pairs dense: Floyd. All-pairs sparse + neg: Johnson. "Always Dijkstra" loses the negative-weight question every year.'),
  (11, 'difference constraints',
       'x_j - x_i at most c_k becomes an edge i to j of weight c_k. Feasible iff no negative cycle. A solution is distances from a super-source. DPV 4.4 energy. 170 loves this as "shortest paths as a solver."'),
  (12, 'bottleneck / min-max paths',
       'Path that minimizes the worst edge (or maximizes the weakest). Not the same as sum-shortest. MST actually gives bottleneck paths between vertices in undirected graphs. Do not run Dijkstra with the wrong combine operator unless you prove it.'),
  (13, 'DPV chapter 4 moral',
       'Shortest paths are the workhorse reduction target: routing, constraints, some scheduling. Prove an invariant on settled nodes or on the number of BF rounds. Heap decrease-key vs insert-duplicates is an implementation footnote, not the proof.'),
  (14, 'shortest-path exam move',
       'State weight assumptions in sentence one. Give the invariant ("settled dist is final"). Name the negative-cycle test if BF. If they change an edge to negative, say which algorithm breaks and give a 3-vertex picture.')
) AS c(pos, front, back)
WHERE d.slug = 'cs170'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 5. Greedy Algorithms
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'greedy'
CROSS JOIN (VALUES
  (0,  'when greedy works',
       'A local rule that never needs to retract, plus a proof: greedy choice (some OPT contains this first pick, or can be swapped to) and optimal substructure. No proof, no algorithm — 0-1 knapsack by value/weight is the classic fail.'),
  (1,  'exchange argument',
       'Take an OPT that disagrees with greedy at the first point; swap in greedy''s choice and show cost does not get worse. Remaining instance matches by induction. Huffman and interval scheduling proofs are this shape. "It looks locally best" is not an exchange.'),
  (2,  'Huffman codes',
       'Prefix-free binary codes; greedy merges the two rarest symbols. Optimal for known independent frequencies (no memory). Proof: exchange on the two deepest leaves. Tree cost = sum of internal node weights. DPV 5.2.'),
  (3,  'MST: cut property',
       'For any cut, a lightest edge across the cut is in some MST (undirected, distinct weights: the MST). Kruskal and Prim are "add a safe light edge." If weights tie, MSTs need not be unique. Directed "MST" is a different problem (arborescence).'),
  (4,  'Kruskal',
       'Sort edges by weight; add if it does not cycle (Union-Find). O(m log n) from sorting. Cycle property: the heaviest edge on a cycle is not needed. Works on disconnected graphs (minimum spanning forest).'),
  (5,  'Prim',
       'Grow a tree from a start vertex; add the lightest edge leaving the tree (heap + decrease-key, or just scan). Same MST (undirected). Feels like Dijkstra with edge weight instead of path dist — do not confuse the keys.'),
  (6,  'Union-Find',
       'Find(x) = representative; Union merges sets. Path compression + union-by-rank: inverse-Ackermann, "almost O(1)." Kruskal''s bottleneck without it is still fine with naive lists for 170 proofs; the data structure is the implementation.'),
  (7,  'Horn SAT (DPV 5.3)',
       'Clauses with at most one positive literal. Greedy: set a variable true only when a unit positive forces it; default the rest false. Polynomial. Contrast general SAT. 170: a greedy that is actually unit-propagation plus a default.'),
  (8,  'interval scheduling',
       'Pick the compatible request that finishes first; repeat. Exchange: OPT''s first interval can be swapped for this one without losing count. Weighted intervals need DP, not this greedy. Start-first greedy fails — keep a counterexample.'),
  (9,  'Dijkstra as greedy',
       'Always settle the closest unsettled vertex. The "cut" is settled vs not; with nonnegative weights the shortest edge (in dist) is safe. Same family as Prim, different key. Negatives break the greedy choice.'),
  (10, 'set cover greedy (approx)',
       'Repeatedly pick the set that covers the most still-uncovered elements. H_n approximation (harmonic). Not exact — that is NP-hard. 170 will return here in coping-with-NPC week. Exact set cover is not this algorithm.'),
  (11, '0-1 knapsack greedy fails',
       'Value/weight density then pack: can miss OPT (one big valuable item vs many dense small ones). Fractional knapsack: density greedy is optimal (take prefixes of items). 170: name which knapsack. DP for 0-1.'),
  (12, 'matroids (slogan, optional)',
       'Independence systems where greedy works for linear objectives (graphic matroid = forests = MST). 170 may not test the axiom list; the moral is "not every greedy is a matroid, but MST is." Skip if the term never said the word.'),
  (13, 'DPV chapter 5 moral',
       'Sort, pick, prove. Huffman, MST, and a Horn pass are the core. If the proof needs looking ahead or undoing, it is not greedy — try DP or flow. Always keep a counterexample in your pocket for the wrong greedy.'),
  (14, 'greedy exam move',
       'State the rule in one line, then either an exchange/cut argument or a small counterexample. Runtime is usually sort plus Union-Find or a heap. If they ask "always optimal?" and it is knapsack-shaped, the answer is no.')
) AS c(pos, front, back)
WHERE d.slug = 'cs170'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 6. Dynamic Programming
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'dp'
CROSS JOIN (VALUES
  (0,  'DP two ingredients',
       'Optimal substructure (an OPT contains OPTs of smaller instances) and overlapping subproblems (the same smaller instance is needed many times). Memoized recursion or a table in a safe order. D&C without overlap is not DP; greedy is DP with a trivial table of size 1.'),
  (1,  'define the subproblem first',
       '170 full credit: "Let dp[i][w] be the max value using items 1..i with capacity w." Then the recurrence, base cases, answer location, and time (number of states times work per state). Code without this sentence is how people drop indices.'),
  (2,  '0-1 knapsack',
       'Each item once. dp[i][w] = max(skip i, take i if it fits). Time O(nW) — pseudo-polynomial (poly in n and W, exponential in bits of W). This is why knapsack is NP-hard but DP-able when W is small. Reconstruct by storing choices or re-deriving.'),
  (3,  'unbounded knapsack / coin change',
       'Item types reusable. Inner loop over coins or over capacity, depending on "order matters" vs combinations. Unlimited coins to make amount A: O(number of coins times A). If coins are {1,5,12} greedy change can fail — DP is the safe hammer.'),
  (4,  'LCS and edit distance',
       'dp[i][j] on prefixes of two strings. LCS: +1 on match, else max of skip either. Edit (Levenshtein): min of insert, delete, substitute. Both O(nm). Subsequence vs substring: substring must be contiguous — different DP (or suffix structures, out of 170).'),
  (5,  'LIS (longest increasing subsequence)',
       'Patience / tails array O(n log n), or O(n^2) DP "best ending at i." 170 may want the O(n^2) recurrence on exams and the log trick as extra. Reducing LIS to LCS with a sorted unique copy is a cute reduction when values are distinct.'),
  (6,  'independent set on trees',
       'For each subtree: include root (then skip children) vs skip root (then take best of each child). Linear time. On general graphs, independent set is NP-hard — the tree structure is the algorithm. DPV 6.7 energy.'),
  (7,  'shortest / longest paths as DP',
       'DAG: dp[v] after processing topo predecessors. Floyd-Warshall is DP on allowed intermediates. Bellman-Ford is DP on hop count (at most k edges). Seeing "DP" in a graph question: name the index (vertex, hop, subset).'),
  (8,  'Held-Karp TSP (slogan)',
       'dp[S][v] = shortest path that visits set S ending at v. O(n^2 2^n) — exponential but far better than n!. 170: still exponential, so TSP stays hard; this is coping, not a poly algorithm. Bitmask DP is the same idea for other subset problems.'),
  (9,  'chain matrix multiplication',
       'Parenthesization: dp[i][j] min cost to multiply A_i ... A_j. O(n^3) split points. Canonical "interval DP." Optimal BST is the same shape with extra weights. Recurrence needs a contiguous interval, not an arbitrary subset.'),
  (10, 'reconstruction',
       'Store argmax/argmin, or walk back comparing dp values. For knapsack, if dp[i][w] equals dp[i-1][w] you skipped. For strings, bounce on the three-way min. Forgetting reconstruction is fine if they only ask the number — read the question.'),
  (11, 'time and space',
       'States times work. Knapsack can drop the item index if you loop capacity backward (0-1) or forward (unbounded) — a rolling array. 170 cares that you do not destroy values you still need. Exponential states (subsets) means you did not find the poly subproblem.'),
  (12, 'DP vs greedy vs D&C (pick)',
       'Greedy: local proof exists. D&C: disjoint pieces, cheap combine. DP: overlap + optimal substructure. If a greedy counterexample is easy and n is 100 with a numeric capacity, it is probably knapsack DP. If n is 10^5, DP on n^2 is too slow — look for n log n or greedy.'),
  (13, 'DPV chapter 6 moral',
       'A week of 170 is "write the table." Knapsack, string prefixes, tree independent set, and shortest paths with extra indices. If the subproblem is wrong, every later line is fiction. Spend the minutes on the definition.'),
  (14, 'DP exam move',
       'Box the subproblem definition, write the recurrence with base cases, state where the answer lives, multiply states by work. If they ask an algorithm for exponential n, you probably wanted greedy/graph, not 2^n DP.')
) AS c(pos, front, back)
WHERE d.slug = 'cs170'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 7. Linear Programming & Flow
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'lp-flow'
CROSS JOIN (VALUES
  (0,  'linear program',
       'Maximize (or min) c·x subject to Ax at most/equal/at least b, maybe x at least 0. Objective and constraints are linear — no x y products, no x^2. Feasible region is a polyhedron; for a bounded LP an optimum exists at a vertex (simplex hops vertices). DPV 7.1.'),
  (1,  'modeling in 170',
       'Name variables (what a number means), write constraints (why they are valid), write the objective. Units must match. Integrality: if you need integers, it is an ILP (hard in general). Sometimes a poly LP still has integer vertices (flow, bipartite matching).'),
  (2,  'feasible / unbounded / infeasible',
       'Infeasible: no x satisfies Ax. Unbounded: objective can be driven to inf (max) along a ray. Optimal: finite best. Simplex and interior-point need to detect these. Duality later: primal unbounded iff dual infeasible (and vice versa, in the clean case).'),
  (3,  'simplex slogan',
       'Walk neighboring vertices, improving the objective, until no improving edge. Exponential worst-case, fast in practice. 170 will not make you pivot by hand for long; they will make you write the LP. Polynomial algorithms for LP exist (Khachiyan/Karmarkar) — existence matters for "P."'),
  (4,  'ILP vs LP',
       'Integer variables: packing, TSP, many 170 reductions to "just ILP" are not poly-time solutions. Relaxing to LP gives bounds (and sometimes exactness). Knapsack ILP vs fractional knapsack LP is the schoolbook picture.'),
  (5,  'max-flow problem',
       'Directed graph, capacities on edges, source s, sink t. Flow: capacity constraints, conservation at non-s/t. Value = net out of s. Goal: max value. DPV 7.2. Algorithms: augmenting paths (FF), better polynomial variants (EK, Dinic) as slogans.'),
  (6,  'residual graph and augmenting paths',
       'Forward leftover capacity; backward edges undo flow. An s-t path in residual means you can increase. Ford-Fulkerson: augment until no path. If capacities are irrational, FF may not terminate; with integers it does, value bounded by total capacity.'),
  (7,  'max-flow min-cut',
       'Max flow value equals min capacity of an s-t cut (partition with s on one side, t on the other). Proof: weak duality (flow at most any cut) plus residual unreachable set is a saturating cut. Certificates: a flow and a cut of equal value.'),
  (8,  'Edmonds-Karp',
       'Always augment a shortest hop residual path (BFS). O(n m^2) polynomial. 170: FF is the idea; EK is "now it is poly-time." You do not implement Dinic on a midterm; you might say "poly-time max-flow exists."'),
  (9,  'bipartite matching via flow',
       'Source to left, left to right (cap 1), right to sink. Integer max flow = maximum matching. Konig / min vertex cover in bipartite graphs equals max matching (later duality energy). Hall''s marriage theorem is the combinatorial cousin.'),
  (10, 'integrality of flow',
       'If capacities are integers, there is an integer max flow (augmenting paths add integers). That is why matching via flow returns 0/1 edges. Real capacities: still a max flow, not necessarily integer — matching needs the 0-1 setup.'),
  (11, 'cuts you can use',
       'Min-cut as clustering, image segmentation slogans, network reliability. In 170, the exam move is: exhibit a cut equal to your flow, or reduce a problem to flow by gadgets (splitting vertices, lower bounds as extra gadgets — only if taught).'),
  (12, 'multi-commodity / circulation (light)',
       'Several s_i-t_i pairs: much harder (often NP). Circulations with lower/upper bounds: extra constraints, still LP/flow family if a single commodity. Do not invent a multi-commodity poly algorithm on the exam unless the course did.'),
  (13, 'LP as a hammer for 170',
       'Shortest paths, max-flow, bipartite matching, and games all have LP formulations. Writing the LP is a correct algorithm if you are allowed "solve an LP" (poly-time). ILP is not that hammer. Reductions TO flow beat simplex-on-a-graph when the graph is the point.'),
  (14, 'LP/flow exam move',
       'Variables, constraints, objective. For flow: residual, augment, min-cut certificate. For matching: draw the three-layer gadget. If they want NP-hardness, do not "solve it with an LP" using integer variables without a proof of integrality.')
) AS c(pos, front, back)
WHERE d.slug = 'cs170'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 8. Duality & Zero-Sum Games
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'duality-games'
CROSS JOIN (VALUES
  (0,  'primal and dual',
       'Every LP has a dual: max c·x, Ax at most b, x at least 0 dualizes to min b·y, A^T y at least c, y at least 0 (standard form). Dual variables price constraints. DPV 7.4. Writing the dual is a 170 mechanical skill — flip max/min, swap bounds.'),
  (1,  'weak duality',
       'Any feasible primal (max) value is at most any feasible dual (min) value. Proof: chain inequalities / nonnegativity. You do not need optimality. Instant certificate: if you exhibit matching primal and dual values, both are optimal.'),
  (2,  'strong duality',
       'If either LP has a finite optimum, so does the other, and the values are equal. (Both infeasible is possible.) Simplex / Farkas-type theorems live underneath. 170: use it; you need not prove strong duality from scratch.'),
  (3,  'min-cut as the flow dual',
       'Max-flow LP''s dual can be read as assigning potentials / cut indicators; optimum equals min-cut. That is why a saturated cut certifies max flow: weak duality plus tightness. Same moral as complementary slackness without the full tableau.'),
  (4,  'complementary slackness (light)',
       'At optimality, a primal variable is unused (zero) or its dual constraint is tight (and vice versa for dual vars). Useful to reconstruct one solution from the other. If the course skipped CS, still remember: slack and dual variable cannot both be "active" in the naive sense.'),
  (5,  'unbounded vs infeasible pair',
       'If the primal (max) is unbounded, the dual is infeasible — otherwise weak duality would cap the primal. If you cannot find a dual feasible point, maybe the primal is unbounded or you dualized wrong. Check a simple 2-variable picture.'),
  (6,  'zero-sum games',
       'Payoff matrix A: row player max, column min (row gets A_ij, column loses it). Pure strategies: a row and a column. Value may not exist in pure (rock-paper-scissors). DPV 7.5. Mixed strategies: probability distributions; expected payoff x^T A y.'),
  (7,  'minimax / value of the game',
       'Von Neumann: max_x min_y x^T A y = min_y max_x x^T A y for mixed x,y (simplex). That common number is the value. Each player has an LP. 170: games are LPs; solving the LP gives the mixed strategy, not a bluff story.'),
  (8,  'mixed vs pure',
       'If a saddle exists in pure strategies (maxmin = minmax over entries with a witnessing pair), play that. Otherwise randomize. Dominated strategies can be dropped. Never "always mix uniformly" unless the matrix is a cyclic tie like RPS.'),
  (9,  'LP for the row player',
       'Maximize v s.t. for every column j, expected payoff against j is at least v, and x is a distribution. Dual is the column player minimizing v. Strong duality = minimax. This is the 170 homework that looks scary and is just "write constraints."'),
  (10, 'search vs optimization (week 11 cameo)',
       'Fall 2026 has a Search lecture near MT2. Decision: yes/no. Search: find a witness. Optimization: best value. Binary search on the objective plus a feasibility LP/flow/greedy check turns optimization into decision. Local search (swap neighbors) is a different "search" — heuristics, no optimality unless you prove it.'),
  (11, 'certificates from duality',
       'An optimal dual y is a short proof that you cannot do better than c·x. Flows: the cut. Games: the opponent''s mixed strategy. 170 exams: "give a dual feasible solution of equal value" is a full optimality proof.'),
  (12, 'reducing matching to an LP',
       'Bipartite matching polytope is integral — the LP relaxation finds a matching. General-graph matching is deeper (Edmonds); 170 usually stops at bipartite + flow. Do not claim every 0-1 LP is poly-time.'),
  (13, 'DPV 7.4–7.5 moral',
       'LPs come in pairs; games are LPs; equal primal/dual values close the argument. If you can only solve one side, weak duality still gives a bound. That bound is how approximation and relaxations get started.'),
  (14, 'duality exam move',
       'Write primal, write dual (watch the inequalities), pick a feasible x and y, compare objectives. For games, state mixed strategies as probabilities summing to 1. If maxmin is strictly less than minmax in pure, you must mix.')
) AS c(pos, front, back)
WHERE d.slug = 'cs170'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 9. P, NP & Reductions
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'p-np'
CROSS JOIN (VALUES
  (0,  'decision, search, optimization',
       'Decision: "does a set of size k exist?" Search: output the set. Optimization: largest set. For NP-completeness we almost always use decision versions. A poly solver for decision plus binary search often yields optimization for integer-valued scores.'),
  (1,  'class P',
       'Decision problems solvable in polynomial time (deterministic). Shortest paths, matching via flow, LP (poly algorithms exist), 2-SAT, Horn SAT, MST. 170: if you gave an O(n k) DP, that is poly in n if k is poly in n — not if k is exponential.'),
  (2,  'class NP',
       'Decision problems with short (poly-size) certificates checkable in poly time. "Yes" instances have a witness. Unsatisfiable SAT is not obviously in NP that way (that is coNP). NP is not "non-polynomial." All of P sits inside NP (empty or easy witness).'),
  (3,  'NP-hard vs NP-complete',
       'NP-hard: every NP problem reduces to it (at least as hard as anything in NP). NP-complete: NP-hard and in NP. Optimization TSP is NP-hard; decision TSP is NP-complete. Halting is undecidable, hence not NPC (not even in NP).'),
  (4,  'polynomial-time reduction',
       'A maps to B in poly time: yes-instances to yes, no to no (Karp / many-one). If A reduces to B and B is in P, then A is in P. To show B is hard, reduce a known-hard A to B. Direction: known-hard TO new problem. 170 #1 exam bug is reversing this.'),
  (5,  'Cook-Levin (slogan)',
       'SAT (Boolean satisfiability) is NP-complete: every NP machine''s computation can be encoded as a formula that is satisfiable iff the machine accepts. 170: you use SAT as the root; you do not replay the tableau proof unless asked.'),
  (6,  '3-SAT',
       'CNF with exactly 3 literals per clause (or at most 3, depending on the notes). Still NP-complete. Reduction from SAT: pad and split long clauses with fresh variables. 2-SAT is in P (implication graph). The jump from 2 to 3 is the complexity cliff.'),
  (7,  'independent set, clique, vertex cover',
       'Ind-set: no two adjacent. Clique: all pairs adjacent (ind-set in the complement). Vertex cover: every edge touches the set. Decision versions NPC. Cover size + ind-set size = n on the same graph — poly reduction between them, same complexity.'),
  (8,  'Hamiltonian cycle / TSP',
       'Cycle through every vertex once: NPC (directed and undirected, with care in the proofs). TSP decision: tour of cost at most K. Optimization TSP is NP-hard to compute exactly. 170 gadgets: vertices as cities, huge costs to ban missing edges.'),
  (9,  'subset-sum / knapsack decision',
       'Numbers summing to exactly T (or 0-1 knapsack reaching value). NPC, but pseudo-poly DP exists. Weakly NP-complete: hard in the bit length, easy if magnitudes are small. Strongly NPC problems stay hard even with small numbers (3-partition, etc.).'),
  (10, 'what a reduction must prove',
       'Poly-time constructible map f. x yes for A iff f(x) yes for B. Both directions (or a clear equivalence). Size of f(x) is poly. If you only show "if A-yes then B-yes," you showed nothing about hardness of B. Draw the gadget and argue no-instances too.'),
  (11, 'coNP (light)',
       'No-certificates. UnSAT, "not Hamiltonian." NP = coNP is also open. Tautology is coNP-complete. 170 may only need: a problem in NP intersect coNP is "unlikely" to be NPC unless the hierarchy collapses (do not overclaim).'),
  (12, 'P vs NP (the open problem)',
       'Is every efficiently checkable yes-problem efficiently solvable? Unknown. Most 170 algorithms people believe P is not NP, so they treat NPC as "no poly algorithm, don''t try brute force on n=200." A poly algorithm for any NPC problem collapses all of them into P.'),
  (13, 'DPV chapter 8 start moral',
       'Efficiency hits a wall you can prove (conditional on P vs NP). The tool is reduction, not "I cannot think of an algorithm." Search problems still want algorithms — that is week 10 coping, not a refusal to try.'),
  (14, 'reduction exam move',
       'Name source problem (usually 3-SAT or ind-set). Draw gadgets. Prove iff. Time to build the instance. If they ask "is this in NP," give the certificate and the checker. If they ask "is it NPC," you need both in-NP and hardness.')
) AS c(pos, front, back)
WHERE d.slug = 'cs170'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 10. NP-Completeness & Coping
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'np-coping'
CROSS JOIN (VALUES
  (0,  'a typical NPC proof',
       '1) Problem is in NP (witness + checker). 2) Reduce a known NPC problem to it (gadgets). 3) Both directions. 170 wants pictures: clause gadgets, vertex-split, triangles for 3-SAT to ind-set (one vertex per literal, edges for complements and clause triangles).'),
  (1,  '3-SAT to independent set (gadget)',
       'A vertex per literal occurrence; connect the three literals of a clause in a triangle (pick one); connect x and not-x across clauses (cannot pick both). Ind-set of size = number of clauses iff satisfiable. This is the DPV-style drawing you should be able to reproduce.'),
  (2,  'why the iff matters',
       'Yes to yes: a satisfying assignment picks a consistent literal per clause. No to no: an ind-set of that size yields a consistent assignment. If extra vertices let a no-instance sneak through, the reduction is broken. Always attack the no case.'),
  (3,  'approximation ratio',
       'For a min problem, alg/OPT at most rho; for max, OPT/alg at most rho (conventions vary — state yours). Poly-time. rho = 1 is exact. 2-approx vertex cover: take both ends of a maximal matching. Greedy set cover: harmonic H_n.'),
  (4,  'vertex cover 2-approximation',
       'Compute a maximal matching (not necessarily maximum); take all matched vertices. Every edge is covered (maximality). OPT must pick at least one vertex per matching edge, so ALG at most 2 OPT. Maximal matching is not max matching — still fine for this proof.'),
  (5,  'PTAS and FPTAS (slogans)',
       'PTAS: (1+eps)-approx for every eps, time poly in n but maybe exponential in 1/eps. FPTAS: also poly in 1/eps (knapsack has one via scaled DP). TSP in general has no PTAS under P vs NP; metric TSP is more approximable (Christofides 1.5, etc.).'),
  (6,  'special structure that restores P',
       'Trees (ind-set DP), bipartite (matching), planar sometimes, bounded treewidth, 2-SAT, Horn, DAGs (longest path). 170: first question when facing NPC names — "is the graph a tree / bipartite / DAG?" That is coping by restricting the input.'),
  (7,  'exponential but smarter: branching',
       'Held-Karp TSP, meet-in-the-middle subset-sum O(2^{n/2}), backtracking with pruning. Still exponential, usable for n around 40 not 400. 170: name the state count. Brute n! vs 2^n is a real difference.'),
  (8,  'local search',
       'Move to a better neighbor (2-opt for TSP). Fast, no guarantee. Local optima may be far from global. Simulated annealing / random restarts are heuristics. Contrast: simplex also walks vertices but on a convex LP, so local is global.'),
  (9,  'Las Vegas vs Monte Carlo',
       'Las Vegas: always correct, runtime random (randomized quicksort). Monte Carlo: may err with small probability, often bounded time (fingerprinting, Karger). Amplify MC by repetition. 170 DPV ch 1 and ch 9 both touch randomness.'),
  (10, 'Karger min-cut',
       'Repeatedly contract a random edge until two supernodes; the remaining edges are a cut. Success probability is only about 1/n^2 per trial; repeat many times. Monte Carlo. Teaches: randomness plus repetition vs clever determinism (max-flow min-cut is deterministic exact).'),
  (11, 'fingerprinting / hashing (DPV numbers)',
       'Compare huge objects by a random modular fingerprint; collision probability is tiny if the prime is large. Freivalds: check matrix products randomly. Pattern: pick a random prime / vector, fail only on unlucky choice. Related to DPV chapter 1 modular arithmetic.'),
  (12, 'RSA / modular arithmetic (DPV 1 cameo)',
       'gcd, extended Euclid, modular inverse, fast exponentiation (repeated squaring). RSA slogan: n=pq public, totient secret, encrypt with e, decrypt with d. 170 is not a crypto course (that is 161); here it is algorithms on numbers and why bit length matters.'),
  (13, '170 closing picture',
       'Poly algorithms: D&C, graphs, greedy (when proved), DP (when states poly), LP/flow. Wall: NPC via reductions. Cope: structure, approx, exp-in-n-small, randomness. That is Efficient Algorithms and Intractable Problems. Pintos is 162; this course is proofs on paper plus the occasional implementation HW.'),
  (14, 'coping exam move',
       'If they want exact and the problem is NPC-named, either restrict the instance or give an exp-time DP. If they want poly, give approx ratio and the proof (matching, greedy harmonic). If they want randomized, name LV vs MC and the failure probability. Do not "run simplex on integer TSP" and call it poly.')
) AS c(pos, front, back)
WHERE d.slug = 'cs170'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

UPDATE public.decks
SET    card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE  slug = 'cs170';
