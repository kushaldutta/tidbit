-- Migration 061: CS 61B — Data Structures, full deck rebuild.
-- UC Berkeley Fall 2026: Joshua Hug and Manuel Sabin (MoWeFr, Wheeler 150).
-- Catalog: dynamic data structures (lists, queues, trees, linked structures);
-- arrays, strings, hash tables; storage management; software engineering;
-- ADTs; sorting and searching; introduction to Java.
-- Prereq: CS 61A, CS 88, or ENGIN 7. No credit after 61BL / 47B.
-- Course text: Hug's CS 61B textbook (datastructur.es); Sedgewick/Wayne as a
-- recommended algorithms companion. Sequence follows recent Hug calendars.

DELETE FROM public.saved_tidbits
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'cs61b');

DELETE FROM public.tidbits
WHERE category_id = 'cs61b';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'cs61b');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'cs61b');

UPDATE public.decks
SET title = 'CS 61B',
    description = 'Data Structures — Hug: Java, lists, trees, hashing, graphs, sorting',
    cover_emoji = '💻'
WHERE slug = 'cs61b';

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('java-objects',     'Java, Objects & References',
   'Types, references, equals, static vs instance, testing', 0),
  ('lists',            'Lists: SLList, DLList, AList',
   'Linked lists vs arrays, caching, resize (Hug Ch 3–6)', 1),
  ('inheritance-adts', 'Inheritance, Interfaces & ADTs',
   'extends, implements, Iterable, Comparable, generics', 2),
  ('asymptotics',      'Asymptotics',
   'Big-O, best/worst/average, recurrences (Hug)', 3),
  ('disjoint-sets',    'Disjoint Sets',
   'Quick find/union, weighted, path compression, Percolation', 4),
  ('search-trees',     'BSTs, B-Trees & LLRBs',
   'BSTMap, 2-3/2-3-4 trees, left-leaning red-black', 5),
  ('hashing',          'Hashing',
   'hashCode, separate chaining, open addressing, HashMap', 6),
  ('heaps',            'Heaps & Priority Queues',
   'Binary heaps, swim/sink, heap-sort, PQ ADT', 7),
  ('graphs',           'Graphs',
   'DFS/BFS, Dijkstra, A*, Kruskal/Prim, tries', 8),
  ('sorting',          'Sorting & Algorithmic Bounds',
   'Insertion, merge, quick, heap, lower bounds, Gitlet/SE', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'cs61b'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. Java, Objects & References
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'java-objects'
CROSS JOIN (VALUES
  (0,  'CS 61B (Hug) in one sentence',
       'Implement and analyze data structures in Java: lists, trees, heaps, hash tables, graphs, and sorts, plus enough software engineering (testing, ADTs, Gitlet) to ship large projects. 61A is Python/Scheme; 61B is Java and efficiency.'),
  (1,  'primitive vs. reference types',
       'Primitives (int, double, boolean, char, ...) live in the box. Objects (String, arrays, your classes) are references: the variable stores an address. Assigning a reference copies the pointer, not the object — aliasing bugs are a 61B rite of passage.'),
  (2,  '== vs. equals',
       '== on references asks “same object in memory?” equals (if overridden) asks “same value?” Integers outside the cached range, Strings from new String(...), and your own classes will surprise you if you use ==. Always override equals and hashCode together.'),
  (3,  'null and NullPointerException',
       'A reference that points nowhere. Calling a method or field on null throws NPE. Hug''s debugging: draw the box-and-pointer diagram before you “just add a null check.” Sentinel nodes exist so list code can avoid some null cases.'),
  (4,  'static vs. instance',
       'static belongs to the class (one copy). Instance belongs to each object. A static method cannot use this or instance fields. main is static because the JVM has no instance yet. Overuse of static is a 61B code-review smell.'),
  (5,  'constructors and this',
       'A constructor has the class name, no return type, and runs on new. this.x = x disambiguates the field from the parameter. this(...) chains to another constructor. If you write any constructor, Java stops giving you the default no-arg one.'),
  (6,  'pass-by-value (Java)',
       'Java always copies the bits in the variable: for primitives that is the number; for objects that is the reference. You cannot write a swap(a,b) that rebinds the caller''s variables. You can mutate the object those references point to.'),
  (7,  'arrays in Java',
       'Fixed length after new T[n]. Indexed 0..n-1. An array of objects is an array of references (initially null). System.arraycopy / Arrays.copyOf for resize. Length is .length (field), not a method — unlike String.length().'),
  (8,  'String immutability',
       'String methods return new strings; concatenation in a loop is O(n^2) because each + copies. Use StringBuilder when building incrementally. String is a class (reference), not a primitive, but literals are interned.'),
  (9,  'autoboxing',
       'int and Integer convert automatically (autoboxing). ArrayList of Integer cannot store int; it stores Integer. Unboxing a null Integer throws NPE. Identity of cached Integers (-128..127) makes == accidentally work — do not rely on it.'),
  (10, 'JUnit / testing culture',
       '61B expects tests before or alongside implementation (Percolation, Autograder-style). A unit test asserts one behavior. Integration tests hit several classes. Golden rule: if a bug is hard to find, you needed a smaller test.'),
  (11, 'exceptions (checked vs. unchecked)',
       'RuntimeException and Error need not be declared. Checked exceptions (IOException) must be caught or declared. Throw IllegalArgumentException for bad inputs. Do not use exceptions for ordinary control flow in data-structure code.'),
  (12, 'access modifiers',
       'private: this class only. (package): same package. protected: package + subclasses. public: everyone. 61B style: fields private, ADT methods public. Nested helper classes are often private static.'),
  (13, 'generics (intro)',
       'ArrayList of T, Map of K to V: the compiler checks types and erases them at runtime (type erasure). You cannot new T[] easily — AList stores Object[] and casts. Wildcards (question-mark extends T) show up when you write methods that consume collections.'),
  (14, 'box-and-pointer diagrams',
       'Hug''s exam language: draw the stack frame, the objects on the heap, and the arrows. If you cannot draw it, you do not understand aliasing, linked-list insert, or why a recursive call did not “update the list.”')
) AS c(pos, front, back)
WHERE d.slug = 'cs61b'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 2. Lists
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'lists'
CROSS JOIN (VALUES
  (0,  'IntList (naked recursive list)',
       'A first 61B object: first (int) and rest (IntList). Recursion on rest is the natural API (size, get, toString). No size cache, no sentinel — it teaches pointers before SLList hides them.'),
  (1,  'SLList (singly linked with sentinel)',
       'A dummy sentinel node so insert/remove at front never special-cases empty. head is never null; an empty list is sentinel.next == null. Cache size so size() is O(1).'),
  (2,  'addFirst / addLast on SLList',
       'addFirst: O(1), rewire sentinel.next. addLast without a back pointer: O(N) walk. Hug''s improvement: cache last (or use a circular sentinel) so addLast is O(1).'),
  (3,  'DLList (doubly linked)',
       'Each node has prev and next. Insert/remove in the middle is O(1) once you have the node. Sentinel (sometimes circular) kills null checks. The cost is extra pointers and more rewiring bugs.'),
  (4,  'AList (array-backed list)',
       'items[] plus size. addLast is amortized O(1) with geometric resize (typically *2). get(i) is O(1). addFirst without a circular buffer is O(N). This is Java ArrayList''s model.'),
  (5,  'geometric resizing / amortization',
       'If you resize by +1, N inserts cost ~ N^2 copies. If you double, each item is copied O(log N) times total, so N inserts cost O(N) — amortized O(1) per addLast. Hug wants the “potential / accounting” intuition, not a memorized formula only.'),
  (6,  'usage vs. length (AList)',
       'size is the number of logical items; items.length is capacity. Never loop to items.length after a shrink. removeLast may optionally downsize (e.g. when usage is 25%) to reclaim memory — watch the empty-array edge case.'),
  (7,  'why not always AList?',
       'AList: fast random access, bad at addFirst unless you leave empty room at the front. SLList: O(1) addFirst, no wasted array capacity, terrible get(i). Pick the ADT by the operations your client actually runs.'),
  (8,  'generic lists (List61B)',
       'Hug factors a List61B interface so SLList and AList share max, print, etc. via default methods or a helper. The exam move: code to the interface, not the concrete class.'),
  (9,  'destructive vs. non-destructive',
       'Destructive: mutate this (addLast). Non-destructive: return a new list (concat that does not share nodes unless you intend persistence). Sharing a node between two lists is aliasing — later mutation surprises both.'),
  (10, 'sentinel vs. null-terminated',
       'Null-terminated: empty list is null, every method needs a null check. Sentinel: empty is a dummy node. Circular sentinel: last.next is sentinel, sentinel.prev is last — DLList insert is uniform.'),
  (11, 'iterating a linked list',
       'for (Node p = sentinel.next; p != null; p = p.next). Off-by-one: you wanted p != sentinel in a circular list. Concurrent modification (adding while iterating) is undefined unless you designed it.'),
  (12,  'ArrayList vs. LinkedList (Java)',
       'ArrayList: AList. LinkedList: DLList. Java''s LinkedList get(i) is O(N); do not use it as an array. 61B wants you to know why the library made those tradeoffs, not just the names.'),
  (13, 'memory / locality',
       'Arrays are contiguous: cache-friendly, so AList scans beat SLList scans in practice even at the same Big-O. Linked nodes scatter on the heap. “Constants matter” is a Hug exam sentence.'),
  (14, 'common list bugs',
       'Forgetting to update size. Losing the old head pointer. addLast walking off null. Resize forgetting to copy. equals comparing identity of the list object instead of contents. Draw the picture.')
) AS c(pos, front, back)
WHERE d.slug = 'cs61b'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 3. Inheritance, Interfaces & ADTs
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'inheritance-adts'
CROSS JOIN (VALUES
  (0,  'ADT vs. implementation',
       'An abstract data type specifies operations (Map: get, put, containsKey) without dictating the guts. BSTMap and HashMap are two implementations of the same ADT. 61B grades you on picking the right one for the runtime.'),
  (1,  'interface vs. class',
       'interface: “can do these methods” (implements). class: “is a” with fields and constructors (extends). A class can implement many interfaces but extend only one class. Program to List, not ArrayList, unless you need ArrayList-specific methods.'),
  (2,  'extends (implementation inheritance)',
       'Subclass inherits fields and methods. super(...) must be first in the constructor if used. Overriding replaces a method; @Override catches typos. Fragile if the parent was not designed for extension — prefer composition + interfaces when unsure.'),
  (3,  'dynamic method lookup',
       'The runtime type of the object, not the compile-time type of the variable, decides which override runs. AList x = new SLList() will not compile; List61B x = new SLList() will, and x.getLast() uses SLList''s version.'),
  (4,  'Comparable vs. Comparator',
       'Comparable: natural order, compareTo on the object (String, Integer). Comparator: external order passed to sort/PQ (by length, by GPA). 61B exams love “sort students by name then by ID” with a Comparator.'),
  (5,  'compareTo contract',
       'Negative if this comes first, zero if equal, positive if this comes later. Must be consistent with equals for sorted sets/maps or you get lost keys. Antisymmetry: sgn(a.compareTo(b)) == -sgn(b.compareTo(a)).'),
  (6,  'Iterable and Iterator',
       'for (T x : collection) needs Iterable. Iterator has hasNext and next (optional remove). Fail-fast iterators throw if the collection is mutated. Implementing Iterable is how your SLList works in an enhanced for-loop.'),
  (7,  'default methods',
       'Java 8 interfaces can provide default method bodies (Hug uses them so List61B.print() is free). Classes can override. Multiple defaults with the same signature force the class to pick — diamond problem lite.'),
  (8,  'higher-order functions in Java',
       'No first-class functions like Python; use interfaces (Comparator) or lambdas (x -> x.age) which desugar to SAM interfaces. 61B uses this for Max, filter-style helpers, and Comparators.'),
  (9,  'subtype polymorphism',
       'A method that takes a Set can accept TreeSet or HashSet. The caller promises the ADT; the callee cannot assume order unless the type is SortedSet. This is why percolation tests against the UnionFind interface, not one class.'),
  (10, 'checked design: encapsulation',
       'Hide representation (private Node). Invariants (size == actual count, BST order) are enforced by the class, not the client. Gitlet and BYOW fail when you leak internals and then cannot change them.'),
  (11, 'equals/hashCode pair (again)',
       'If a.equals(b) then a.hashCode() must equal b.hashCode(). If you put a mutable object in a HashSet and then mutate a field used by hashCode, the set loses it. Prefer immutable keys.'),
  (12, 'Java collections snapshot',
       'List, Set, Map, Queue, Deque. ArrayList, LinkedList, HashSet, TreeSet, HashMap, TreeMap, ArrayDeque. Know expected times: HashMap get average O(1); TreeMap get O(log N) and ordered iteration.'),
  (13, 'exceptions in ADTs',
       'get on missing key: return null or throw — pick one and document it (Java Map returns null). pop on empty stack: throw. 61B autograders are picky about this; match the spec, not your taste.'),
  (14, 'software engineering I (projects)',
       'Spec first, tests, then code. Packages, small classes, descriptive names. Gitlet is a design project: many classes, persistence, and a CLI — the point is architecture, not a clever 20-line hash map.')
) AS c(pos, front, back)
WHERE d.slug = 'cs61b'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 4. Asymptotics
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'asymptotics'
CROSS JOIN (VALUES
  (0,  'Big-O (Hug definition)',
       'f is O(g) if f grows no faster than a constant times g for large N. Informal: drop lower-order terms and constants. 3N^2 + 100N is O(N^2), also O(N^3) — O is an upper bound, not “exactly.”'),
  (1,  'Omega and Theta',
       'Omega: lower bound (at least). Theta: tight — both O and Omega. 61B exams: “give Theta of the worst case.” Saying O(N^2) for a Theta(N) algorithm is true but weak; they want tightness.'),
  (2,  'best / worst / average case',
       'Worst: adversary input (quicksort N^2). Best: already-sorted insertion sort is Theta(N). Average: expected over a distribution (uniform random). Do not mix “typical homework array” with worst-case unless asked.'),
  (3,  'nested loops',
       'for i in 0..N: for j in 0..N is Theta(N^2). for i in 0..N: for j in i..N is still Theta(N^2) (about N^2/2). for i doubling: Theta(log N) iterations. Count iterations, then work per iteration.'),
  (4,  'amortized vs. worst-case per call',
       'AList addLast: worst-case one call is Theta(N) (resize), amortized Theta(1). Union-find with path compression: amortized nearly O(1), worst-case a single find can still walk a path. Say which one you mean.'),
  (5,  'recursive runtime (intuition)',
       'Draw the recursion tree. merge sort: log N levels, Theta(N) per level → Theta(N log N). binary search: Theta(1) per level, log N levels → Theta(log N). Fibonacci naive: exponential nodes.'),
  (6,  'Master theorem (61B level)',
       'T(N) = a T(N/b) + O(N^k). Compare N^{log_b a} to N^k. 61B uses this lightly for divide-and-conquer sorts; you can also just tree-sum. Know merge sort and binary search by heart either way.'),
  (7,  'space complexity',
       'Auxiliary space vs. total including input. merge sort uses Theta(N) extra. heap sort in-place. Recursion uses stack frames: binary search O(log N) stack if not written iteratively. 61B will ask “extra memory.”'),
  (8,  'common families (fast to slow)',
       'O(1), O(log N), O(N), O(N log N), O(N^2), O(N^3), O(2^N), O(N!). log N is the height of a balanced tree or binary search. N log N is the comparison-sort bound. 2^N is subsets / naive recursion.'),
  (9,  'why constants still matter',
       'N=100, a careful N^2 array scan can beat a pointer-chasing N log N. Cache, constants, and Java overhead (boxing) show up in 61B labs. Asymptotics predict the winner as N → infinity, not for N=10.'),
  (10, 'log in 61B',
       'All logs are the same order (change of base is a constant). Tree height is log_2 N for binary. B-tree height is log_B N. Hug writes log N; the base is implied by the branching factor of the structure.'),
  (11, 'loop that halves N',
       'while (N > 0) { N = N/2; } is Theta(log N). while (N > 0) { N = N-1; } is Theta(N). Mixing: outer N, inner log N is Theta(N log N).'),
  (12, 'graph asymptotics preview',
       'V vertices, E edges. Adjacency list DFS/BFS is Theta(V+E). Adjacency matrix is Theta(V^2) even if sparse. Dijkstra with binary heap is O((V+E) log V). Always state V,E not just N.'),
  (13, 'practice: SLList get vs. AList get',
       'SLList get(i) is Theta(i) worst-case Theta(N). AList get is Theta(1). sum of get(i) for all i is Theta(N^2) on SLList, Theta(N) on AList. That is why “print every element with get” is a trap.'),
  (14, 'practice: disjoint-set construction',
       'N makeset + N-1 unions with weighting + path compression is almost O(N). Naive quick-find N unions is Theta(N^2). Percolation''s runtime story is this table.')
) AS c(pos, front, back)
WHERE d.slug = 'cs61b'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 5. Disjoint Sets
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'disjoint-sets'
CROSS JOIN (VALUES
  (0,  'Union-Find ADT',
       'connect(x,y), isConnected(x,y), and usually count of components. Models “are these in the same set?” — percolation, Kruskal, network connectivity. Hug: DisjointSets interface, several implementations.'),
  (1,  'Quick Find',
       'id[i] is the set name. isConnected is O(1). connect must scan all N entries to relabel — O(N). N unions are Theta(N^2). Too slow for Percolation''s N^2 sites.'),
  (2,  'Quick Union (trees)',
       'parent[i] points to parent; root is the set. connect: hang one root under the other. isConnected: walk to roots and compare. Worst case a line: find is O(N).'),
  (3,  'weighted (union by size/rank)',
       'Always hang the smaller tree under the larger. Height is O(log N). Combined with path compression, operations are essentially O(1) (inverse Ackermann, amortized). Hug wants “never hang large under small.”'),
  (4,  'path compression',
       'During find, point every node on the path at the root (or one-step parent: path halving). Flattens trees. Do it in find, not only in union. Exam drawing: after find(4), 4 and its ancestors point at the root.'),
  (5,  'array representation',
       'parent[i] >= 0 means parent index; Hug sometimes stores negative size at the root. Index is the item. No extra Node objects — good locality. Items are 0..N-1; a Map is overkill in 61B.'),
  (6,  'Percolation (mini-project)',
       'N-by-N grid; open sites; full if connected to the top. Virtual top (and sometimes bottom) node so isFull is a find. Backwash: a bottom virtual node makes a bottom-open site look full — 61B''s famous bug. Fix: two UF instances or no bottom virtual for fullness.'),
  (7,  'connected components',
       'Each root is a component. Number of components = N minus number of successful unions (unions that actually merged). Kruskal stops at V-1 unions for a spanning tree.'),
  (8,  'union of already-connected',
       'If isConnected, union is a no-op (do not decrement component count, do not link). Forgetting this creates cycles in Kruskal and wrong sizes in weighted union.'),
  (9,  'iterative vs. recursive find',
       'Java recursion depth can overflow a degenerate tree before weighting. Weighted + compression stays shallow. Still, Hug often writes find iteratively.'),
  (10, 'time table (remember this)',
       'QF: find O(1), union O(N). QU: both O(N) worst. WQU: O(log N). WQUPC: amortized ~O(1). 61B midterm will ask you to fill this table and pick one for a use case.'),
  (11, 'not a Map',
       'UF does not store keys/values; it partitions a fixed 0..N-1 universe. If your items are strings, index them first. Different ADT from HashMap.'),
  (12, 'height vs. size weighting',
       'Union by rank (height) and union by size both give O(log N) without compression. Mixing them is fine conceptually; pick one invariant and keep it. Size is easier to update: new size = s1+s2.'),
  (13, 'drawing exam trees',
       'Arrows parentward (child → parent) or Hug''s “up-trees.” Label sizes at roots. After connect, only two roots change. If the picture has a cycle, you implemented it wrong.'),
  (14, 'where else UF appears',
       'Kruskal MST, image segmentation, generating mazes (BYOW), network connectivity. If a problem is “merge groups and query same-group,” it is Union-Find until proven otherwise.')
) AS c(pos, front, back)
WHERE d.slug = 'cs61b'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 6. Search Trees
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'search-trees'
CROSS JOIN (VALUES
  (0,  'BST invariant',
       'For every node, all keys in the left subtree are less, all in the right are greater (no duplicates, or a defined side). Inorder traversal yields sorted keys. Search/insert follow BST, not heap, order.'),
  (1,  'BSTMap (Hug lab)',
       'Map via BST nodes with key, value, left, right. get/put/containsKey average O(log N) if balanced, O(N) if you insert already-sorted keys (a stick). That failure is why we need 2-3 trees / LLRBs.'),
  (2,  'BST delete',
       '0 children: drop it. 1 child: replace with child. 2 children: replace with inorder successor (min of right) or predecessor, then delete that node (which has at most one child). Easy to get the pointers wrong.'),
  (3,  'BST height',
       'Balanced: Theta(log N). Degenerate: Theta(N). Random inserts give expected O(log N) but 61B does not rely on luck for maps — use balanced trees or hashing.'),
  (4,  '2-3 tree idea',
       'Nodes have 1 key (2 children) or 2 keys (3 children). All leaves at the same depth. Insert into a leaf; if a node would have 3 keys, split and push the middle up. Search is still log N because height is logarithmic.'),
  (5,  '2-3-4 trees',
       'Allow 3 keys / 4 children. Splits can be top-down (split 4-nodes on the way down) so insertion is one pass. B-trees generalize this for disks: high branching factor, few seeks.'),
  (6,  'B-tree (61B disk story)',
       'A node is a disk page. Huge branching factor (100s) so height is tiny. 61B cares about the 2-3/2-3-4 analogy and that BSTs are a bad on-disk map. You will not implement a full B+tree.'),
  (7,  'left-leaning red-black (LLRB)',
       'A BST encoding of a 2-3 tree: red links glue 3-nodes (left-leaning). Black links are the 2-3 tree edges. Hug: flipColors, rotateLeft, rotateRight. Search ignores color and is a normal BST search.'),
  (8,  'LLRB insert (intuition)',
       'Insert a red leaf, then rotate/flip up the path so reds lean left, no two reds in a row, and perfect black-height. You do not memorize 12 cases if you map back to 2-3 splits.'),
  (9,  'TreeMap vs. HashMap',
       'TreeMap: ordered keys, O(log N) get/put, range queries. HashMap: unordered, average O(1), no order. Need “keys between A and B”? TreeMap. Need English dictionary lookup? HashMap unless you need prefix (then Trie).'),
  (10, 'inorder / preorder / postorder',
       'Inorder BST: sorted. Preorder: node then children (serialize a BST). Postorder: children then node (delete tree, expression trees). Level-order: BFS queue. 61B graph week reuses these names.'),
  (11, 'range search / nearest',
       'BST: if the query interval misses a subtree''s range, skip it. k-d trees (optional Hug) split alternating dimensions for points. Wordnet/NGrams projects care about maps more than geometry.'),
  (12, 'balance is an invariant',
       'A BST is not automatically balanced. AVL (not the Hug default) uses height factors. LLRB uses colors. After insert/delete you restore the invariant; a “just insert left-to-right” tree is wrong for a balanced-map lab.'),
  (13, 'duplicates',
       '61B Map usually unique keys (put replaces value). A BST Set is the same with no values. Multisets need a count field or you break the “strictly less / greater” split.'),
  (14, 'exam drawing',
       'Show keys in nodes, left/right children, and for LLRB color the left reds. After insert, check: BST order, left-leaning reds, no red-red, same black height on every path to a null.')
) AS c(pos, front, back)
WHERE d.slug = 'cs61b'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 7. Hashing
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'hashing'
CROSS JOIN (VALUES
  (0,  'hash table idea',
       'Compute an index from the key, store the value in an array of buckets. Average O(1) get/put if the hash spreads keys and load factor stays bounded. Worst case O(N) if everything collides.'),
  (1,  'hashCode contract (Java)',
       'Equal objects must share a hashCode. Unequal objects should (not must) differ. hashCode must be consistent while the object is in a hash table. Default Object.hashCode is identity — override when you override equals.'),
  (2,  'from hashCode to index',
       'Math.floorMod(hashCode, M) or (hash & 0x7fffffff) % M. Negative Java hashCodes will break a naive % M. M is the number of buckets, often a power of two in java.util (then bitwise AND).'),
  (3,  'separate chaining',
       'Each bucket is a list (or tiny tree in Java 8+). Insert: hash, walk the chain, replace or prepend. Load factor N/M; resize when it exceeds ~0.75. Expected chain length is load factor if hashing is uniform.'),
  (4,  'open addressing / linear probing',
       'Store items in the array itself. On collision, try i+1, i+2, ... Wrap around. Deletion needs a tombstone or you break probe sequences. Primary clustering: long runs form. Hug still teaches it because the diagram is exam-friendly.'),
  (5,  'quadratic probing / double hashing',
       'Reduce clustering vs. linear probing. 61B may only mention them. The invariant: probe sequence must eventually hit an empty slot if the table is not full (mod constraints).'),
  (6,  'load factor and resize',
       'When N/M is high, operations crawl. Double M and rehash every key (Theta(N)). Amortized still O(1) if you double. Never iterate the old array assuming indices stay valid after resize.'),
  (7,  'good vs. bad hash functions',
       'Use all of the key; mix bits (31 * h + c is the classic String hash). Hashing only the first character of a word clusters badly. Hashing mutable fields that change is fatal.'),
  (8,  'HashMap vs. HashSet',
       'HashSet is a HashMap with dummy values (or a dedicated implementation). contains is get. 61B HashMap lab: external chaining, resize, iterator. Do not use the key''s identity if the spec wants value equality.'),
  (9,  'iteration order',
       'HashMap does not promise order (Java 8+ may randomize). If the autograder checks order, you used the wrong ADT or you need LinkedHashMap. TreeMap iterates in key order.'),
  (10, 'collisions are normal',
       'Birthday paradox: collisions happen well before M items. The data structure must be correct with collisions, not only on the happy path. Tests should include equal hashes, different keys.'),
  (11, 'security / hash flooding (light)',
       'Adversarial keys with the same hash make a HashMap O(N). Java later treeifies long chains. 61B: know the attack exists; you still implement lists in the lab.'),
  (12, 'hashing vs. BST for Map',
       'Need order or range? BST/TreeMap. Need average O(1) and no order? HashMap. Need worst-case O(log N) guaranteed? Balanced tree. Need prefix search? Trie, not a hash.'),
  (13, 'implementing hashCode for a pair',
       'Combine: 31 * a.hashCode() + b.hashCode() (null-safe). XOR alone is symmetric (bad for (1,2) vs (2,1) sometimes OK, sometimes not). Be consistent with equals field-by-field.'),
  (14, '61B HashMap bugs',
       'Forgetting to rehash on resize. Using == instead of equals in the chain. Modulo of negative hashes. Iterator that skips empty buckets wrong. size not updated on replace-vs-insert.')
) AS c(pos, front, back)
WHERE d.slug = 'cs61b'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 8. Heaps
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'heaps'
CROSS JOIN (VALUES
  (0,  'Priority Queue ADT',
       'insert(x), max/min(), and removeMax/removeMin. Not FIFO (that is Queue). Dijkstra, A*, Huffman, event simulation, and “k largest” all want a PQ. Java: PriorityQueue is a min-heap by default.'),
  (1,  'binary heap invariant',
       'Complete binary tree (filled left to right) plus heap-order: parent is above children (max-heap: larger; min-heap: smaller). Array index: root at 1 (or 0); children of i are 2i and 2i+1 (adjust if 0-based).'),
  (2,  'swim (bubble up)',
       'After insert at the next leaf, swap with parent while heap-order is violated. O(log N). Used by insert.'),
  (3,  'sink (bubble down)',
       'After replacing root with last leaf (delete-max), swap with the larger (max-heap) child while violated. O(log N). Used by removeMax and heapify.'),
  (4,  'insert and delete-max times',
       'Both O(log N) in a binary heap. Find-max is O(1). Finding an arbitrary key is O(N) — heaps are not search trees. No “decrease-key” unless you add a handle (Dijkstra optimizations).'),
  (5,  'heapify / bottom-up construction',
       'Build a heap in O(N): sink from the last parent to the root. Floyd''s method. N inserts would be O(N log N). 61B exam: “how long to heapify this array?”'),
  (6,  'heapsort',
       'Heapify, then repeatedly swap max with the end and sink. In-place, Theta(N log N) worst-case, not stable. Afterward the array is sorted. Contrast with merge (stable, extra memory) and quick (faster typical, N^2 worst).'),
  (7,  '0-based vs. 1-based indexing',
       '0-based children: 2i+1, 2i+2; parent (i-1)/2. 1-based: 2i, 2i+1; parent i/2. Off-by-one here is the #1 heap bug. Hug lecture often uses 1-based with a wasted index 0.'),
  (8,  'not a BST',
       'Heap-order is only parent vs. children, not left vs. right. Inorder is meaningless. You cannot binary-search a heap. Do not draw a heap and call it a BST on the same exam question.'),
  (9,  'd-ary heaps (light)',
       'More children: shallower but sink does more work per level. 61B mentions them; binary is the default. Fibonacci heaps exist for Dijkstra theory; you will not implement one.'),
  (10, 'PriorityQueue in Java',
       'Min-heap, unordered iteration, O(N) remove(Object). offer/poll/peek. Pass a Comparator for max-heap or custom order. No decrease-key; Dijkstra in 61B often inserts duplicates instead.'),
  (11, 'k largest in a stream',
       'Keep a min-heap of size k. Each new item: if bigger than min, replace. Time N log k. A max-heap of all N is wasteful. Classic PQ pattern.'),
  (12, 'complete tree packing',
       'A complete tree of N nodes has height floor(log2 N). The array has no gaps, so space is Theta(N) with good locality — another reason heaps beat pointer-based PQs in practice.'),
  (13, 'exam: show swim/sink',
       'Draw the array and the tree. After insert 42, swim until parent is larger (max-heap) or you hit the root. After delMax, last item to root, sink. They will ask the array contents, not a speech.'),
  (14, 'PQ vs. sorted list vs. BST',
       'Sorted list: get-min O(1), insert O(N). BST: both O(log N) average, extra pointers. Heap: insert and delete-min O(log N), get-min O(1), no ordered iteration of all keys. Match the ADT to the operations.')
) AS c(pos, front, back)
WHERE d.slug = 'cs61b'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 9. Graphs
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'graphs'
CROSS JOIN (VALUES
  (0,  'graph vocabulary',
       'Vertex, edge, directed vs. undirected, weighted vs. unweighted, simple vs. multigraph, cycle, path, connected vs. strongly connected, DAG. Degree, in-degree, out-degree. 61B: V vertices, E edges.'),
  (1,  'adjacency list vs. matrix',
       'List: array of collections of neighbors, space Theta(V+E), iterate neighbors of v in degree(v). Matrix: V x V bits/weights, Theta(V^2) space, O(1) edge query. Sparse graphs (E much less than V^2) want lists — the 61B default.'),
  (2,  'DFS',
       'Go deep; recurse or explicit stack. Marks vertices. Used for reachability, cycle detect, topological sort (on a DAG), connected components (undirected), and maze generation. Not shortest paths in unweighted graphs (use BFS).'),
  (3,  'BFS',
       'Queue; visit level by level. Unweighted shortest path (fewest edges). Also bipartite check. Runtime Theta(V+E) with lists. Hug: draw the fringe and the marked set.'),
  (4,  'topological sort',
       'On a DAG, an order where every edge goes forward. DFS finishing times reversed, or Kahn''s algorithm (queue zeros in-degree). Cycle ⇒ no topo order. Wordnet/inheritance graphs care about this.'),
  (5,  'Dijkstra',
       'Non-negative weights. Repeatedly settle the unsettled vertex with smallest dist, relax its edges. PQ of (dist, v). Binary heap: O((V+E) log V). Negative edges break it — use Bellman-Ford (rarely 61B-core).'),
  (6,  'A* (Hug/projects)',
       'Dijkstra with f = g + h, h admissible (never overestimate). Same as Dijkstra if h=0. BYOW / pathfinding: Euclidean or Manhattan heuristic on a grid. Inadmissible h can be faster but may miss the true shortest path.'),
  (7,  'MST: Kruskal',
       'Sort edges by weight; add if it does not close a cycle (Union-Find). Undirected, connected, distinct weights ⇒ unique MST. Runtime dominated by sort: O(E log E).'),
  (8,  'MST: Prim',
       'Grow a tree from a start vertex; always add the cheapest edge leaving the tree (PQ of vertices or edges). Same MST as Kruskal for distinct weights. Similar PQ complexity to Dijkstra.'),
  (9,  'relaxing an edge',
       'If dist[v] + w(v,u) is better than dist[u], update dist[u] and parent[u]. Dijkstra/Bellman/A* are all “relax until done” with different vertex orders. Drawing parent pointers reconstructs the path.'),
  (10, 'DFS/BFS runtime',
       'Each vertex marked once, each edge looked at constant times → Theta(V+E) lists. Forgetting to mark causes exponential blow-up (revisit). Directed graphs: an edge is one-way; “connected” is the wrong word (use weakly/strongly).'),
  (11, 'tries (prefix trees)',
       'A tree of characters; a path is a prefix. Autocomplete, dictionary, IP routing. Hug lecture near hashing/sorting. Not a BST of whole strings (that compares full keys). Space can be large; compressed tries (Patricia) exist.'),
  (12, 'Wordnet / NGrams (projects)',
       'Maps and graphs: synsets, hyponym graphs, shortest ancestral paths. NGrams: maps from prefixes to counts. The data structure choice (HashMap vs. TreeMap vs. graph) is the point of the design project.'),
  (13, 'cycle detection',
       'Undirected: DFS back to a marked non-parent. Directed: DFS recurse stack (gray node) or topological-sort failure. Kruskal uses UF instead of DFS for undirected cycles.'),
  (14, 'common 61B graph bugs',
       'Using a matrix on a huge sparse graph. Dijkstra with a min-PQ but forgetting to skip stale PQ entries. BFS using a stack. Treating a directed graph as undirected. Off-by-one on vertex IDs 0..V-1.')
) AS c(pos, front, back)
WHERE d.slug = 'cs61b'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 10. Sorting & Algorithmic Bounds
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'sorting'
CROSS JOIN (VALUES
  (0,  'insertion sort',
       'Grow a sorted prefix; insert A[i] leftward. Theta(N^2) worst/average, Theta(N) if almost sorted. Stable, in-place. Tiny N or nearly sorted: actually fast. Hug: the “cards in hand” sort.'),
  (1,  'selection sort',
       'Repeatedly swap the min of the unsorted suffix into place. Always Theta(N^2) comparisons, N swaps. Not stable in the usual implementation. Rarely the right 61B choice; know it to contrast with heap sort''s smarter selection.'),
  (2,  'mergesort',
       'Split, recurse, merge two sorted halves. Theta(N log N) always. Stable. Needs Theta(N) extra memory. The merge is linear. Hug: naive merge of two lists; then the array version.'),
  (3,  'quicksort (Lomuto/Hoare intuition)',
       'Pick a pivot, partition, recurse. Average Theta(N log N), worst Theta(N^2) (sorted input + bad pivot). In-place (almost), not stable. Random pivot or median-of-three avoids the stick. Java''s Arrays.sort uses dual-pivot quicksort for primitives.'),
  (4,  'partition (quicksort)',
       'After partition, pivot is in its final sorted index; left are less-or-equal and right are greater-or-equal. Off-by-one in the two pointers is the bug. Dijkstra 3-way partition helps with many duplicates.'),
  (5,  'heapsort (again)',
       'Theta(N log N) worst-case, in-place, not stable. Build heap O(N) then N delete-max. Use when you need worst-case N log N without merge''s extra array. Cache behavior is worse than quicksort in practice.'),
  (6,  'stability',
       'Equal keys keep their original order. Needed when you sort by name then by section. Merge and insertion are stable; heap and naive quick are not. Java Collections.sort (TimSort) is stable.'),
  (7,  'comparison lower bound',
       'Any comparison sort needs Omega(N log N) comparisons in the worst case (decision tree: N! leaves, height log2(N!)). Counting/radix/bucket sorts beat this by not comparing keys as whole atoms.'),
  (8,  'counting / radix (light)',
       'If keys are integers in a small range, counting sort is Theta(N+K). Radix sort digits. 61B mentions them to explain the lower bound''s assumption. Not a replacement for Comparable objects in general.'),
  (9,  'which sort on an exam',
       'Need stability + guaranteed N log N: merge. Need in-place + typical speed: quick. Need in-place + guaranteed N log N: heap. Need almost-sorted: insertion. Need Java objects with a Comparator: TimSort (library).'),
  (10, 'shuffling',
       'Knuth/Fisher–Yates: for i from N-1 down to 1, swap i with random 0..i. Uniform permutation. Used before quicksort and in 61B randomness tests. Do not “swap each with a random index” — that is biased.'),
  (11, 'sorting objects vs. primitives',
       'Arrays.sort(int[]) : dual-pivot quick (not stable — ints have no extra identity). Arrays.sort(Object[]) : TimSort (stable, merge-based). Mixing this up loses an exam point about stability of Integer sorts vs. int sorts.'),
  (12, 'Gitlet (design project)',
       'A tiny Git: commits as snapshots/trees, staging area, branches, persistence (serialization or hashed files). Tests your ADTs, HashMaps, and design — not a new graph algorithm. Spec-reading is the skill.'),
  (13, 'BYOW (design project)',
       'Procedural world: randomness, graphs/grids, A* or BFS for movement, saving state. Software engineering III in Hug''s calendar: design doc, then generation. Constants, seeds, and reproducibility matter.'),
  (14, '61B closing picture',
       'Pick an ADT (List, Set, Map, PQ, Graph, UF). Pick an implementation whose asymptotics match the operations. Prove it with Big-O. Then ship it in Java with tests. That is the course.')
) AS c(pos, front, back)
WHERE d.slug = 'cs61b'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

UPDATE public.decks
SET    card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE  slug = 'cs61b';
