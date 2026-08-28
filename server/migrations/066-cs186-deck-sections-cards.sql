-- Migration 066: CS 186 — Introduction to Database Systems, new deck.
-- UC Berkeley Fall 2026: Alvin Cheung, MoWe 9:30-10:59, Gateway 1210.
-- Catalog: access methods, data models, query languages, protection/integrity,
-- transaction processing, implementation. Prereq typically 61B; 61C expected
-- but not enforced in Fall 2026. cs186berkeley.net.
-- No required text; R&G (Ramakrishnan & Gehrke) is the usual optional reading.
-- Projects: SQL, then Java RookieDB (B+ trees, joins/QO, locking, recovery),
-- then NoSQL. Sequence follows Cheung's recent lecture calendar.

INSERT INTO public.decks (owner_id, slug, title, description, class_id, source, is_public, cover_emoji, card_count)
VALUES (
  NULL,
  'cs186',
  'CS 186',
  'Database Systems — Cheung / RookieDB: SQL, indexes, QO, txns, recovery, NoSQL',
  'uc-berkeley:cs186:fa26',
  'system',
  true,
  '🗄️',
  0
)
ON CONFLICT (slug) DO UPDATE SET
  title       = EXCLUDED.title,
  description = EXCLUDED.description,
  class_id    = EXCLUDED.class_id,
  cover_emoji = EXCLUDED.cover_emoji;

DELETE FROM public.saved_tidbits
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'cs186');

DELETE FROM public.tidbits
WHERE category_id = 'cs186';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'cs186');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'cs186');

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('sql',            'SQL & the Relational Model',
   'Relations, keys, joins, aggregation, nested queries', 0),
  ('disks-files',    'Disks, Files & Pages',
   'I/O cost, heap files, slotted pages, records', 1),
  ('indexes',        'B+ Trees & Indexes',
   'Fanout, occupancy, clustered vs unclustered, vectors', 2),
  ('buffer-sort',    'Buffers, Sorting & Hashing',
   'Replacement, external merge sort, Grace hash', 3),
  ('joins',          'Iterators, RA & Joins',
   'Volcano iterators, NLJ/BNLJ, SMJ, hash join', 4),
  ('qo',             'Query Optimization',
   'Selinger, left-deep trees, costs, interesting orders', 5),
  ('txns',           'Transactions & Concurrency',
   'ACID, conflict serializability, 2PL, isolation', 6),
  ('recovery',       'Logging & ARIES',
   'WAL, STEAL/NO-FORCE, Analysis-Redo-Undo, CLRs', 7),
  ('distributed',    'Parallel & Distributed',
   'Partitioning, 2PC, Paxos, parallel query plans', 8),
  ('nosql',          'NoSQL, Spark & Wrap-up',
   'Documents, MongoDB, MapReduce, when SQL still wins', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'cs186'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. SQL & the Relational Model
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'sql'
CROSS JOIN (VALUES
  (0,  'CS 186 (Cheung) in one sentence',
       'How a DBMS stores, finds, and updates data: SQL on top, pages and indexes in the middle, then cost-based query plans, transactions, crash recovery, and a look at distributed/NoSQL. Labs are RookieDB in Java plus a SQL project and a NoSQL project. Site: cs186berkeley.net.'),
  (1,  'relational model',
       'Data as relations (tables) of tuples with named attributes. A schema is names plus types. Instance is the current rows. First normal form: atomic cells, no nested tables in a cell. The query language is set/bag oriented, not "loop over pointers."'),
  (2,  'keys and foreign keys',
       'Candidate key: uniquely identifies a tuple. Primary key: the chosen one. Foreign key: values must appear in another table''s key (or be NULL). Integrity is a DBMS job, not a hope. 186 exams: which constraint catches which bad INSERT.'),
  (3,  'SELECT-FROM-WHERE',
       'FROM produces a cross product (conceptually), WHERE filters, SELECT projects (and can rename). SQL is bags by default (duplicates stay unless DISTINCT). Conceptual order is not execution order — the optimizer rewrites. Project 1 is this plus joins and grouping.'),
  (4,  'joins in SQL',
       'INNER JOIN / WHERE equality: matching pairs only. LEFT/RIGHT/FULL OUTER: keep unmatched with NULLs. CROSS JOIN: every pair. Self-join: alias the same table twice. A missing join predicate is a accidental cross product — 186 Project 1 classic.'),
  (5,  'NULL three-valued logic',
       'Comparisons with NULL yield UNKNOWN, not TRUE. WHERE keeps only TRUE. Use IS NULL / IS NOT NULL. Aggregates skip NULL (except COUNT(*)). Outer joins manufacture NULLs. "x = NULL" is always unknown — a vitamin trap.'),
  (6,  'GROUP BY and HAVING',
       'GROUP BY partitions rows; SELECT may use group keys and aggregates. HAVING filters groups after aggregation; WHERE filters rows before. You cannot SELECT a non-grouped, non-aggregated column (in strict SQL). COUNT(*) vs COUNT(col) differs on NULLs.'),
  (7,  'aggregation functions',
       'SUM, AVG, MIN, MAX, COUNT. DISTINCT inside an aggregate is allowed (COUNT DISTINCT). Nested aggregates are not "AVG of SUM" in one SELECT without a subquery or CTE. Window functions (OVER) exist in real SQL; 186 may only mention them.'),
  (8,  'nested queries and IN/EXISTS',
       'A subquery in WHERE can be correlated (refers to outer row) or uncorrelated. EXISTS is a semi-join ("is there at least one"). NOT EXISTS / NOT IN with NULLs is a famous footgun. Many nested queries rewrite to joins — the optimizer often does.'),
  (9,  'set ops: UNION, INTERSECT, EXCEPT',
       'Default UNION is set (dedup); UNION ALL is bag. Schemas must match. EXCEPT is set difference. 186: know ALL vs not, and that ORDER BY applies to the whole expression, not a middle operand, unless you wrap a subquery.'),
  (10, 'views vs materialized views',
       'A view is a stored query; reading it reruns the query (virtual). Materialized: stored result, must refresh. Good for security (expose a subset) and simplicity. Updating views is restricted. 186: views are not indexes and not tables.'),
  (11, 'DDL vs DML vs DCL (light)',
       'DDL: CREATE/ALTER/DROP schema. DML: SELECT/INSERT/UPDATE/DELETE. Transactions wrap DML. Indexes are schema objects you CREATE — they change performance, not the SQL result (except pathological uniqueness).'),
  (12, 'declarative vs procedural',
       'SQL says what, not which join algorithm. That is why 186 spends weeks on how the system actually does it. Writing a nested loop in Java is not "using a DBMS." Embedded SQL / JDBC is still declarative queries plus host language glue.'),
  (13, 'Project 1 (SQL)',
       'SQLite (or similar) over a real schema (often Lahman baseball). Practice joins, grouping, and careful DISTINCT. Short reads of the spec beat clever one-liners that fail NULL or duplicate tests. Vitamins will drill the same operators.'),
  (14, 'SQL exam move',
       'Write the query, then say what happens to NULLs and duplicates. If they ask for a result table, draw it. If they ask "equivalent to a join," show both. Do not invent an index in the SQL question unless they ask about efficiency.')
) AS c(pos, front, back)
WHERE d.slug = 'cs186'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 2. Disks, Files & Pages
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'disks-files'
CROSS JOIN (VALUES
  (0,  'why I/O dominates',
       'A disk/SSD page read is orders of magnitude slower than a CPU cycle (61C AMAT energy). 186 cost models count page I/Os, not tuples scanned in RAM. Sequential I/O is cheaper than random. RAM is the buffer pool; durability lives on stable storage.'),
  (1,  'page as the unit',
       'The DBMS reads and writes fixed-size pages (often 4 KiB or 8 KiB in teaching systems). A record lives in a page. An I/O is one page. Never say "one I/O per tuple" for a heap scan unless each tuple is its own page — it is not.'),
  (2,  'heap file',
       'Unordered collection of pages. Insert: put on a page with space (free-space map). Scan: read every page. Equality search without an index: full scan. Delete: mark slot free (and maybe compact later). Cheap inserts, expensive lookups.'),
  (3,  'slotted page',
       'Header with slot directory: each slot points at a record inside the page. Variable-length records can move inside the page without changing their record id if the rid is (page, slot). Deletion can leave holes; reorganization is optional.'),
  (4,  'record ids (RID)',
       '(page id, slot). Indexes store RIDs (alternatives 2/3) or the record itself (alt 1). Updating a record that no longer fits may leave a forwarding address. 186: if the RID changes, every secondary index that stored the old RID is wrong unless you update it.'),
  (5,  'fixed vs variable records',
       'Fixed: offset arithmetic, fragmentation is internal only. Variable: slot directory, packed records, more I/O math. NULLs and varchars make variable the common case. Packed vs unpacked is an implementation choice in RookieDB-style pages.'),
  (6,  'files of pages',
       'A file is a list (or tree) of page ids. Heap vs sorted vs hashed files. The buffer manager does not care which file; it caches pages by id. 186 cost: number of pages in the file, written pages(R) or N_R, not "file size on disk in bytes" unless they give page size.'),
  (7,  'cost model (scan)',
       'Heap scan: about pages(R) I/Os (maybe plus a directory page). If you only need a fraction of tuples and have no index, you still pay the whole scan. Selectivity does not reduce heap-scan I/O. That is why indexes exist.'),
  (8,  'random vs sequential I/O',
       'Sequential: next page is cheap (prefetch, no seek on HDD). Random: one page here, one there. Unclustered index lookups that jump around pay random I/Os per matching RID (until you hit buffer hits). Clustered indexes keep neighbors on nearby pages.'),
  (9,  'double buffering / prefetch (light)',
       'While the CPU processes page i, the disk fetches i+1. Hides latency for sequential scans. Does not help a random RID chase. 186: mention it when they ask how a scan can be "almost sequential-bandwidth bound."'),
  (10, 'row store vs column store (cameo)',
       'N-ary storage model: whole tuples on a page (OLTP). Decomposition / columnar: one attribute''s values together (analytics, Spark/Parquet later). 186 mostly assumes row pages in RookieDB. A SELECT of two columns still reads whole rows in a row store.'),
  (11, 'free space and inserts',
       'A page directory or FSM tells you which pages have room. Append-only heaps are simple. In-place update if the new record fits; else overflow / new page. Overflow chains make scans slower — another reason people like indexes and vacuum.'),
  (12, 'RookieDB page layer',
       'Project 2+ sit on a disk manager plus buffer pool. Your B+ tree is a bunch of pages with a root page id. If you ignore the page abstraction and treat the tree as a Java object graph that is never written, you have not built a DBMS.'),
  (13, '61C connection',
       'Caching, locality, and AMAT. A "cache miss" here is a buffer miss that becomes a disk I/O. Write-back vs write-through reappears in the buffer manager and later in WAL (you cannot just write-back dirty pages in any order — recovery week).'),
  (14, 'disk/file exam move',
       'Count pages, not tuples, unless they give tuples per page. Say heap vs index. Sequential or random? If they give page size and record size, compute occupancy (watch headers and slots). Then one sentence on why an index might still lose to a scan.')
) AS c(pos, front, back)
WHERE d.slug = 'cs186'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 3. B+ Trees & Indexes
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'indexes'
CROSS JOIN (VALUES
  (0,  'index vs table',
       'An index is an extra access path: given a key, find RIDs (or records) faster than a heap scan. It does not replace the table unless it is a clustered / index-organized file (alternative 1). SQL still returns the same answer. CREATE INDEX is a performance hint with maintenance cost.'),
  (1,  'B+ tree shape',
       'All data in leaves; internal nodes are separators (copies of keys) that only route. Leaves linked for range scans. Balanced: every leaf at the same height. Fanout F (order) is huge because a page holds many keys, so height is small (2–4 typical).'),
  (2,  'search, insert, split',
       'Search: root to leaf, binary search inside a node. Insert: into the leaf; if full, split, push a copy of the split key up. Root split increases height by one. Bulk-loading a sorted stream is cheaper than one-at-a-time inserts (build from leaves up).'),
  (3,  'occupancy / order',
       'Nodes stay at least about half full after splits (except the root). Order d often means at most 2d keys. 186 worksheets: fill a node, split, redraw. Redistribute with a sibling instead of split if the policy allows (can delay height growth).'),
  (4,  'delete / merge (light)',
       'Delete from leaf; if underfull, borrow or coalesce with a sibling and delete a separator above. Many systems use lazy deletion (tombstones) to avoid merge storms. Exams may still walk a merge. Empty tree is a special case.'),
  (5,  'alternatives 1, 2, 3',
       'Alt 1: leaf holds the full record (clustered / index-organized). Alt 2: leaf holds (key, RID), unique keys. Alt 3: leaf holds (key, list of RIDs) for duplicates. Secondary indexes are usually 2 or 3. Cost of a lookup depends on which alternative plus clustering.'),
  (6,  'clustered vs unclustered',
       'Clustered: table order matches index order (at most one clustered index per table in the usual story). Range query I/O is about sequential leaf pages plus sequential table pages. Unclustered: each RID may be a random heap page — for many matches, a heap scan can win. 186 loves this comparison.'),
  (7,  'equality vs range cost',
       'Equality unique: height + 1 data I/O (unclustered) or just height if alt 1. Range: height + leaf-page chain + (unclustered) up to one I/O per matching RID. Always compare to heap scan pages(R). Selectivity is the fraction of tuples that qualify.'),
  (8,  'composite keys',
       'Index on (a,b) supports WHERE a = ? and WHERE a = ? AND b = ?, and a range on a. It does not help WHERE b = ? alone (no leading column) unless it is a skip-scan (rare in 186). Order of columns matters. Covering index: all needed columns are in the index, skip the heap.'),
  (9,  'hash indexes (static / extendible slogan)',
       'Equality only, no ranges. Hash the key, go to a bucket page. Overflows if the bucket fills. Extendible / linear hashing grow the directory. 186: B+ is the default for "index"; hash is the "equality specialist." Primary vs secondary still applies.'),
  (10, 'ISAM vs B+ (historical)',
       'ISAM: static tree, overflow chains that decay. B+ stays balanced under updates. If they draw an ISAM picture, overflow I/O is the punchline. You will implement B+ in Project 2, not ISAM.'),
  (11, 'spatial and vector indexes',
       'R-trees / grid files for rectangles and nearest-neighbor in 2D. Vector indexes (LSH, HNSW, IVF slogans) for embeddings — Cheung''s recent 186 includes this lecture. Point: B+ is 1D ordered keys; high-d similarity needs another structure. Exact vs approximate search.'),
  (12, 'index maintenance',
       'Every INSERT/UPDATE/DELETE of an indexed column updates the index. Many indexes = faster reads, slower writes. Unique indexes enforce keys. 186: "just add 12 indexes" is not free. The optimizer is allowed to ignore an index if a scan is cheaper.'),
  (13, 'Project 2 (B+ trees)',
       'Implement search/insert (and often delete) on paged nodes, not a java.util.TreeMap. Splits must write sibling pages and update parents. Iterator over a leaf range is the range-scan primitive later joins will want. Test on a buffer pool that actually evicts.'),
  (14, 'index exam move',
       'Name clustered or not, alternative, height, then I/Os for the query (equality vs range). Compare to heap scan. If they give a filled B+ node, split it on paper. If selectivity is high, unclustered index is a trap.')
) AS c(pos, front, back)
WHERE d.slug = 'cs186'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 4. Buffers, Sorting & Hashing
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'buffer-sort'
CROSS JOIN (VALUES
  (0,  'buffer pool',
       'Fixed array of page frames in RAM. The disk manager reads into a frame; the replacement policy picks a victim. Pin count: a page in use by an operator cannot be evicted. Dirty bit: must write back before reuse. This is the DBMS cache, not the OS page cache (though they interact).'),
  (1,  'pin, unpin, dirty',
       'Pin before touching; unpin when the iterator is done with that page. Forgetting to unpin leaks the whole pool (every frame pinned). Writing a page sets dirty. FORCE at commit vs STEAL of dirty pages is a recovery policy — later week. Buffer week: do not evict pinned pages.'),
  (2,  'LRU vs clock vs MRU',
       'LRU: evict least-recently-used (clock approximates). Sequential flooding: a huge scan can evict the working set; MRU can be better for looping nested-loop inner scans (toss-immediate). 186: name a workload where LRU loses. Hit rate is the metric.'),
  (3,  'prefetch and replacement together',
       'A sequential scan wants prefetch of the next file page. Replacement must not immediately steal that page. Hinting "I am scanning" vs "I am probing an index" is how real systems specialize. RookieDB may be simpler; exams still ask the policy.'),
  (4,  'why not mmap the file and pray',
       'The OS cache does not know pins, WAL order, or "this page is an index root." DBMS buffer managers implement their own because recovery and latches need control. mmap can still be a storage engine choice — 186 wants the control argument.'),
  (5,  'external merge sort',
       'B buffer pages. Pass 0: sort runs of B pages, write them. Merge: fan-in about B-1 runs per pass. Number of passes is 1 + ceil(log_{B-1} of number of initial runs). I/O is about 2 N times (passes) because each pass reads and writes all N pages. 186 staple formula.'),
  (6,  'initial runs and replacement sort',
       'Naïve pass 0: N/B runs. Replacement selection can make average run length about 2B, fewer runs, maybe fewer merge passes. 186: know that longer runs help; do not memorize 2B unless the notes did. Sorted input: one run, sort is almost free.'),
  (7,  'blocked I/O in sorting',
       'Using bigger "pages" (read several at once) reduces random I/O during merge but lowers fan-in. Tradeoff: fewer seeks vs more passes. HDD-era exam story; SSDs flatten seeks but sequential still wins. State the assumption.'),
  (8,  'hashing two phases',
       'Partition (hash to B-1 buckets on disk) then build in-memory hash tables per partition and probe. If a partition still does not fit, recurse (Grace hash join is this for two relations). Overflow: bad hash or too little memory.'),
  (9,  'when sort vs hash',
       'Sort: good if you need the output ordered (ORDER BY, SMJ later) or the data is skewed in hash. Hash: good for equality grouping/join when memory is enough to partition. Both are O(N) I/O with enough memory; both degrade with tiny B.'),
  (10, 'aggregation via sort or hash',
       'GROUP BY: sort then scan adjacent equals, or hash-aggregate in memory (spill like hash join). DISTINCT is grouping. 186 QO will pick based on memory and whether an interesting order already exists.'),
  (11, 'double buffering in merge',
       'Keep one extra frame to prefetch the next block of a run so CPU and disk overlap. Fan-in drops by one. Same idea as scan prefetch. Exam: "B frames, one reserved for output, one for prefetch, rest are runs."'),
  (12, 'cost of writing the result',
       'If the operator''s output is consumed pipelined, you may not write it. If you materialize (sort output to disk), add those I/Os. 186 join costs often assume you count input I/O; be consistent with the question''s convention (write output or not).'),
  (13, '186 vitamin energy',
       'Plug in N pages and B frames, compute runs, passes, I/Os. Off-by-one on fan-in (B vs B-1 vs B-2) is the usual miss — say what each frame is for. If N fits in B, everything is one pass in memory.'),
  (14, 'buffer/sort exam move',
       'Draw frames: pins, dirty, victim. For sort: N, B, runs, passes, 2 N per pass. If they change B, say whether a pass disappears. If they ask hash, partition count is about B, then "does each partition fit?"')
) AS c(pos, front, back)
WHERE d.slug = 'cs186'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 5. Iterators, RA & Joins
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'joins'
CROSS JOIN (VALUES
  (0,  'relational algebra',
       'Select (sigma), project (pi), join, union, difference, rename. SQL compiles toward RA. Duplicate bags vs sets: 186 RA often uses bags to match SQL. Equivalent RA trees are the optimizer''s search space. Selection pushdown and projection pushdown are algebraic rewrites.'),
  (1,  'Volcano iterator model',
       'Every operator implements open / next / close. next() returns one tuple (or a page of tuples). Pipelining: a parent pulls from children without writing a temp file. Blocking operators (sort, hash build) must consume all input first. Project 3 is iterators in Java.'),
  (2,  'simple nested loop join (SNLJ)',
       'For each tuple of R, scan all of S. I/O disaster: about pages(R) + tuples(R)*pages(S) if S is a heap and unbuffered. Almost never chosen. 186: write it to show why page/block nested loop exists.'),
  (3,  'page nested loop join (PNLJ)',
       'For each page of R, for each page of S, join tuples in memory. I/O: pages(R) + pages(R)*pages(S). Still quadratic in pages. Better than tuple-nested because you reuse an R page against a whole S page.'),
  (4,  'block nested loop join (BNLJ)',
       'Use B-2 pages as a block of R, one page for S, one for output. I/O: pages(R) + ceil(pages(R)/(B-2)) * pages(S). Scan the smaller input as the outer if you have no index. 186 workhorse when there is no useful index or sort order.'),
  (5,  'index nested loop join (INLJ)',
       'For each outer tuple, probe an index on the inner join key. I/O: scan outer plus (per outer tuple) index height and data page(s). Wins when the inner is selective and indexed. Clustered inner index makes range/duplicate matches cheaper. Unclustered + many matches: can lose to BNLJ.'),
  (6,  'sort-merge join (SMJ)',
       'Sort R and S on the join key (or use existing order), then merge. Equality join of sorted streams is linear. Cost: sort(R) + sort(S) + merge scan. If both already sorted (interesting order), merge is about pages(R)+pages(S). Unequal key multiplicities: backup in the merge (or buffer a group).'),
  (7,  'SMJ optimization (one side sorted)',
       'If one relation is already a single sorted run and you have a page per remaining run of the other plus one, you can merge without an extra pass on the sorted side. 186 notes spell the buffer inequality; slogan: "do not resort a relation that is already ordered."'),
  (8,  'grace / simple hash join',
       'Partition both on join key, then for each pair of partitions, build a hash table on the smaller and probe. Needs equality predicates (not inequalities). Skew: one partition does not fit — recurse or fallback to nested loop on that partition. Hybrid hash keeps one partition in memory.'),
  (9,  'which join? (decision tree)',
       'Equality + lots of memory: hash. Need output sorted or inputs sorted: SMJ. Inner indexed and few outer tuples: INLJ. General workhorse: BNLJ. Inequality joins: nested loop or SMJ on the inequality (careful), not hash. 186 midterm: pick and cost, do not name all five.'),
  (10, 'left vs right, inner vs outer',
       'In cost formulas, "outer" is the relation you scan in the outer loop (R in the notes). Smaller outer often helps BNLJ. For INLJ, outer is the one without the index you probe. Outer join algorithms must emit unmatched outers — extra state, not just inner-join next().'),
  (11, 'selection and projection in the tree',
       'Push selects below joins when predicates mention one child (reduces join input). Project away columns as soon as they are dead (smaller tuples, sometimes fewer pages if you materialize). Do not project away join keys too early.'),
  (12, 'materialize vs pipeline',
       'A temp file between operators adds 2 * pages(temp) I/O (write then read) unless the consumer is the parent iterator. Hash join build is a materialize-in-memory (or spill). 186 cost questions will say whether intermediate results are written.'),
  (13, 'Project 3 (joins)',
       'Implement join iterators on RookieDB pages. BNLJ is the usual first target; SMJ/hash if the spec says so. Correctness: match SQL bags (duplicates). Cost comments in the design: which input is outer. QO part 2 will call these operators.'),
  (14, 'join exam move',
       'State B, pages(R), pages(S), tuples if INLJ. Write the I/O formula, plug in, pick the min. If they add an index, recompute INLJ vs BNLJ. If they add "already sorted," drop the sort cost from SMJ.')
) AS c(pos, front, back)
WHERE d.slug = 'cs186'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 6. Query Optimization
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'qo'
CROSS JOIN (VALUES
  (0,  'optimizer job',
       'Turn SQL into an RA plan tree of concrete algorithms (which join, which index) with estimated minimum I/O (or time). Correctness: same bag of tuples. The search space is huge (join order is factorial). 186 teaches System R / Selinger, not a neural net.'),
  (1,  'logical vs physical plan',
       'Logical: join(R,S) then select. Physical: INLJ(R index on S.a) vs BNLJ. One logical tree, many physical. Cost is on the physical plan. Pushing select is a logical rewrite that shrinks later physical costs.'),
  (2,  'selectivity and catalogs',
       'Selectivity: expected fraction of tuples that pass a predicate. Catalog: NPages, NTuples, NKeys, index heights, histograms. Independence assumption: multiply selectivities (often wrong, used anyway). 186: if they give histogram buckets, use them instead of magic 1/10.'),
  (3,  'System R / Selinger dynamic programming',
       'Best plan for a set of relations is computed from best plans for subsets (bottom-up). Consider left-deep trees only (one inner relation at a time) to cut the search. Keep the cheapest plan per "interesting order," not just the cheapest unordered plan.'),
  (4,  'left-deep vs bushy',
       'Left-deep: (((R join S) join T) join U). Pipelines well (inner is a base table). Bushy: (R join S) join (T join U) can be better but explodes the search space. 186 default: left-deep like System R. A bushy plan can still appear as a "consider this alternative" exam drawing.'),
  (5,  'interesting orders',
       'A sort order that a later operator can use (SMJ, GROUP BY, ORDER BY). A more expensive sort now can win overall. Selinger keeps multiple winners per subset: cheapest unordered, cheapest for each interesting order. Do not discard a sorted plan just because BNLJ was cheaper at that step.'),
  (6,  'access paths',
       'For a single table: heap scan, index scan (possibly matching several ANDed predicates), covering index. Cost each. The optimizer is allowed to pick the scan even if an index exists. 186: compute both numbers.'),
  (7,  'join order matters',
       'R join S join T: if R join T is huge and S is selective, different orders change intermediate sizes. Estimates of intermediate cardinality drive the DP. A bad estimate (correlation) yields a bad plan — still "correct" SQL, just slow. That is not a bug in the SQL.'),
  (8,  'costing a plan',
       'Sum I/O of each operator using the formulas from joins/sorts, with estimated input pages from selectivity. CPU cost sometimes added (tuple comparisons). 186 exams usually stay in I/Os. Output size feeds the parent.'),
  (9,  'heuristics besides DP',
       'Predicate pushdown first. Do the most selective join early (greedy). Avoid cartesian products until they are forced. These are incomplete; Selinger is the systematic 186 method. Greedy can miss interesting orders.'),
  (10, 'nested queries (unnesting slogan)',
       'Decorrelate when possible: rewrite EXISTS into a semi-join. If you cannot, the inner query may run per outer tuple (like nested loop). 186: expensive nested loops in disguise. Project 1 SQL that looks nested may still hash-join after rewrite.'),
  (11, 'histograms (light)',
       'Equal-width vs equal-height buckets to capture skew. Zipfian keys kill uniform 1/NKeys estimates. If the exam gives a histogram, do not ignore it. Join estimation with histograms is messier; 186 may stay at independence.'),
  (12, 'why plans go wrong',
       'Stale stats, correlated columns, hidden functions on columns (cannot use index), parameter sniffing in real systems. 186: EXPLAIN-style "the optimizer thought selectivity was 0.01." Fix: update stats, rewrite the query, or add the right composite index.'),
  (13, 'Project 3 part 2 (QO)',
       'Cost-based search over the join operators you implemented. Left-deep enumeration and interesting orders if the spec requires them. A correct optimizer that picks a slow plan because of a cost bug still fails hidden tests — print the costs while debugging.'),
  (14, 'QO exam move',
       'List candidate access paths and costs. For two- or three-way joins, enumerate left-deep orders, pick algorithms, keep interesting orders. Circle the final tree and the total I/O. If they give a histogram, use it in the first selectivity.')
) AS c(pos, front, back)
WHERE d.slug = 'cs186'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 7. Transactions & Concurrency
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'txns'
CROSS JOIN (VALUES
  (0,  'ACID',
       'Atomicity: all or nothing. Consistency: if you start legal, you end legal (app + constraints). Isolation: concurrent txns look serial. Durability: after COMMIT, a crash does not undo you. 186 splits isolation (this week) from durability (recovery). 162''s ACID was the slogan; here you implement locks and logs.'),
  (1,  'transaction schedule',
       'A sequence of reads and writes from concurrent txns (plus commits/aborts). The DBMS scheduler / lock manager restricts which schedules occur. Serial schedule: no interleaving. Serializability: equivalent to some serial order. That is the correctness target for isolation.'),
  (2,  'conflict serializability',
       'Two operations conflict if they are on the same item, from different txns, and at least one is a write (RW, WR, WW). A schedule is conflict serializable iff its precedence graph is acyclic. Cycle: not CSR. 186: draw the graph, edges Ti to Tj if Ti conflicts and comes first.'),
  (3,  'view serializability (light)',
       'Weaker than conflict: same reads-from and same final writes as some serial schedule. Harder to test; 186 mentions it and then uses conflict serializability plus 2PL. Blind writes are where they differ. If the exam only gives conflicts, use the graph.'),
  (4,  'two-phase locking (2PL)',
       'Growing phase: acquire locks, no release. Shrinking phase: release, no acquire. Strict 2PL: hold exclusive locks until commit (avoids cascading aborts). 2PL implies conflict serializability. Deadlock is the tax. Project 4 implements lock tables and 2PL.'),
  (5,  'shared vs exclusive locks',
       'S lock for read (compatible with S). X lock for write (compatible with nothing). Upgrade S to X can deadlock two readers who both want to write. Intention locks (IS/IX) on ancestors appear if the course does hierarchical locking (multiple granularity).'),
  (6,  'deadlock',
       'Waits-for graph cycle. Detect (cycle check) and abort a victim, or timeout, or prevent (wait-die / wound-wait timestamps). 186: detection + restart. A txn that restarts must not leave partial writes (atomicity). Locking the same object in different orders is the student bug.'),
  (7,  'cascading aborts',
       'T2 reads a value T1 wrote and T1 aborts: T2 must abort. Strict 2PL (hold X until commit) plus recoverability prevents this. Recoverable schedule: you do not commit until the txn you read-from has committed. 186 wants the picture, not just the name.'),
  (8,  'isolation levels (SQL)',
       'READ UNCOMMITTED: dirty reads allowed. READ COMMITTED: no dirty reads, but nonrepeatable reads. REPEATABLE READ: no dirty/nonrepeatable; phantoms possible. SERIALIZABLE: no phantoms (predicate / SI plus extra in real engines). 186: name the anomaly each level allows.'),
  (9,  'dirty, nonrepeatable, phantom',
       'Dirty: read uncommitted write. Nonrepeatable: same row, two reads, different values because another committed. Phantom: range query sees new rows that appeared. Index locks / next-key (gap) locks fight phantoms. Snapshot isolation (MVCC) is a different mechanism — later or as a cameo.'),
  (10, 'lock granularity',
       'Row vs page vs table: finer = more concurrency, more lock entries, more deadlock chance. Multiple-granularity: intention locks so a table X lock conflicts with a row S lock. 186: "lock the whole table" is correct and slow.'),
  (11, 'index locking / next-key',
       'To prevent phantoms on a range, lock the gaps (next-key / predicate). A B+ leaf scan that only locks existing RIDs still allows inserts in the gap. Project 4 may be tuple locks only; the exam can still ask why serializable needs more.'),
  (12, 'optimistic CC / MVCC (cameo)',
       'OCC: run, validate at commit, abort on conflict. MVCC: readers see a snapshot, writers make new versions (Postgres). Readers often take no S locks. 186 still drills 2PL because RookieDB locking is the project. Do not mix SI anomalies with 2PL proofs unless asked.'),
  (13, 'Project 4 (locking)',
       'Lock manager: grant/block queues, S/X compatibility, strict 2PL around heap/index operations. Deadlock detection on the waits-for graph. Hidden tests interleave txns. If you only test single-threaded, you have not tested 186.'),
  (14, 'concurrency exam move',
       'Draw the schedule, mark conflicts, draw the precedence graph, say CSR or not. If 2PL, mark lock points and find a deadlock or a shrinking-phase illegal lock. If isolation level, name the anomaly with two-txn SQL.')
) AS c(pos, front, back)
WHERE d.slug = 'cs186'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 8. Logging & ARIES
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'recovery'
CROSS JOIN (VALUES
  (0,  'durability vs buffer',
       'COMMIT cannot mean "the heap page is on disk" if we want decent speed (NO-FORCE). Crash can lose dirty RAM. The log on stable storage is the source of truth. Recovery replays enough to restore committed work and undo uncommitted. This is why 186 recovery is a full project.'),
  (1,  'steal and force',
       'STEAL: a dirty page of an uncommitted txn may be written (need UNDO). NO-STEAL: wait until commit (simpler, worse memory). FORCE: at commit, flush all that txn''s pages (need less REDO, slow commits). NO-FORCE: commit after the log is durable (need REDO). ARIES: STEAL + NO-FORCE.'),
  (2,  'write-ahead logging (WAL)',
       'Before a dirty page hits disk, the log records that describe those changes must be on stable storage. Before COMMIT returns, the commit log record must be on stable storage. LSNs (log sequence numbers) totally order log records and are stored on pages (pageLSN).'),
  (3,  'log records',
       'UPDATE: tid, page, prevLSN, undo/redo bytes (or logical ops). COMMIT/ABORT. CLR: compensation for an undo (redo-only). BEGIN CHECKPOINT / END CHECKPOINT for fuzzy checkpoints. prevLSN chains a txn''s records backward for undo. 186: draw the chain, do not invent a linked list in the heap.'),
  (4,  'pageLSN and recLSN',
       'pageLSN: LSN of the latest log record that updated this page (in RAM or on disk). recLSN in the dirty page table: LSN when the page first became dirty — REDO can skip earlier log. After a flush, the DPT entry can go away. Mismatching these is a recovery exam fail.'),
  (5,  'ARIES three phases',
       'Analysis: from last checkpoint, rebuild DPT and transaction table (who was active, lastLSN). Redo: from the oldest recLSN, repeat history (even losers) so pages match the log. Undo: from losers'' lastLSN backward, write CLRs, until you pass the txn''s start. Order is A then R then U.'),
  (6,  'repeat history (redo)',
       'Redo everything, including uncommitted updates, so the database matches the state at crash. Then undo losers. If you skip redo of losers, undo may apply to the wrong bytes. pageLSN on disk tells you whether a log record is already reflected (redo if log LSN is greater than pageLSN).'),
  (7,  'undo and CLRs',
       'Undo is logged with a CLR that points (undoNextLSN) further back. If you crash during undo, redo of CLRs plus remaining undo does not undo twice. Never undo a CLR. Abort of a running txn is the same undo logic as recovery losers.'),
  (8,  'fuzzy checkpoint',
       'Do not freeze the DBMS. Write BEGIN, copy DPT and txn table (approximately), write END. Analysis starts at the BEGIN of the last completed checkpoint (because END''s tables may lag). Shortens analysis; does not replace WAL. 186: start at BEGIN, not at END.'),
  (9,  'transaction table at crash',
       'After analysis: losers = txns that never wrote COMMIT (or that were aborting). Winners = committed. Redo all; undo only losers. A txn with a COMMIT record in the log is a winner even if its pages were not forced.'),
  (10, 'idempotent redo',
       'Reapplying an UPDATE whose pageLSN already shows it is a no-op. Recovery can run twice. Physical/physiological logging (page-level before/after images) makes this check easy. Logical undo (index tree) is harder — 186 mostly physiological on heap pages.'),
  (11, 'log tail and group commit',
       'Flushing the log at every COMMIT is a bottleneck; group commit batches several COMMIT records in one I/O. Still WAL: the batch must hit disk before those COMMITs return. 186: durability is the log, not the table pages.'),
  (12, 'media recovery (light)',
       'Disk dies: restore a backup plus archive logs. Checkpoints do not replace backups. 186 exams stay at crash recovery (RAM + disk pages + log). Do not start talking RAID unless they ask.'),
  (13, 'Project 5 (recovery)',
       'Implement log writes, pageLSN, analysis/redo/undo, and crash tests that kill the process mid-txn. If your buffer FORCE-writes everything, you have not tested NO-FORCE. If you skip CLRs, the second crash test fails. Design the log format first.'),
  (14, 'recovery exam move',
       'List the log, mark COMMIT. Run analysis (DPT, txn table). Redo from oldest recLSN, updating pageLSN. Undo losers with CLRs. If they crash again, start over with the new log including CLRs. Never undo a winner.')
) AS c(pos, front, back)
WHERE d.slug = 'cs186'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 9. Parallel & Distributed
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'distributed'
CROSS JOIN (VALUES
  (0,  'why parallel query processing',
       'One machine''s disk and CPU are not enough. Split data and operators across nodes or cores. Speedup (same data, more machines) vs scaleup (more data, more machines). Startup, interference, and skew kill linear speedup. 186: partitioning is the design.'),
  (1,  'shared-memory vs shared-disk vs shared-nothing',
       'Shared-nothing (each node has its own disk and buffer) is the warehouse default (Teradata, most MPP). Shared-disk is SAN clusters. Shared-memory is one box, many cores (latches, 162 energy). Network is the new I/O. 186 parallel lecture is mostly shared-nothing.'),
  (2,  'partitioning',
       'Hash partition on a key: equality lookups and joins on that key can be local. Range partition: range queries local, risk of skew. Round-robin: even size, every query touches all nodes. Replicate small dimension tables (broadcast).'),
  (3,  'parallel scan / select / aggregate',
       'Scan each partition locally, merge. Aggregates: local partial aggregates then a coordinator merge (same idea as combiners). DISTINCT and GROUP BY need a shuffle if the group key is not the partition key.'),
  (4,  'parallel joins',
       'If both already partitioned on the join key (co-located), join locally. Else: shuffle (repartition) both, or broadcast the smaller. Asymmetric: broadcast R, keep S. Cost is network bytes, not only disk. Skew: one key hash-hotspots a node.'),
  (5,  'two-phase commit (2PC)',
       'Coordinator sends prepare; if all vote yes, send commit; else abort. Blocking if the coordinator dies after prepare (participants uncertain). WAL still required at each site. 186: this is atomicity across machines, not a query optimizer. Same slogan as 162, now with DB logs.'),
  (6,  '2PC states to draw',
       'Participant: init, prepared (uncertain), committed/aborted. After prepare, a participant cannot abort on its own. Recovery of a participant must ask the coordinator (or wait). Presumed-abort optimizations exist; 186 wants the blocking picture.'),
  (7,  'Paxos slogan (Cheung 186)',
       'Replicated log / consensus: a majority agrees on the next command (or ballot). Survives fail-stop nodes if a majority stays. Used so a replicated coordinator/log is not a single point of failure (unlike naive 2PC coordinator). 186: majority, ballots/terms, "do not forget a chosen value." Not a Raft implementation homework here (that was 162).'),
  (8,  'Paxos vs 2PC',
       '2PC: atomic commit across different data partitions (all must say yes). Paxos: agree on a value/log among replicas of the same state. You can run 2PC whose coordinator is made highly available with Paxos. Mixing the two names on an exam loses the distinction.'),
  (9,  'CAP caution (186 level)',
       'Partition: you cannot have perfect linearizability and perfect availability. Serializability across geo-replicas is expensive (latency). Many NoSQL systems relax isolation. 186: say what you give up; do not use CAP as a vibe.'),
  (10, 'clocks and asynchrony',
       'No global now. 2PC and Paxos do not wait for NTP. Timeouts cause extra aborts or extra ballots, not silent corruption if the protocol is followed. 186 distributed exams: message diagrams, not "eventually the clock syncs."'),
  (11, 'replication roles',
       'Primary-backup: writes to primary, ship log. Quorum reads/writes (R + W greater than N) for key-value stores. Read-your-writes needs care with replicas. 186 NoSQL week returns to this with documents.'),
  (12, 'failure models',
       'Fail-stop vs Byzantine. 186 2PC/Paxos assume crashes and message loss/delay, not lying nodes. If a disk is corrupt, checksums and backups, not Paxos, are the first answer.'),
  (13, 'parallel QO (light)',
       'The optimizer must also pick partitionings and broadcast vs shuffle. A "good" single-node plan can be a terrible distributed plan. 186: add network cost to the Selinger story at slogan level unless they give a numeric network model.'),
  (14, 'distributed exam move',
       'Is this one partitioned relation or two replicas of one log? Then 2PC vs Paxos. Draw prepare/commit or majority votes. If a node is down, who blocks? For parallel join, name partition key vs shuffle vs broadcast.')
) AS c(pos, front, back)
WHERE d.slug = 'cs186'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 10. NoSQL, Spark & Wrap-up
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'nosql'
CROSS JOIN (VALUES
  (0,  'what "NoSQL" meant',
       'Not One SQL: systems that drop some relational/SQL/ACID features for scale, flexibility, or latency. Families: key-value, documents, wide-column, graphs. 186: the point is the tradeoff, not a brand war. Project 6 is typically MongoDB-style documents plus queries.'),
  (1,  'document model',
       'JSON-like nested objects and arrays as the record. Schema is optional or "on read." Good for varying attributes and nested data you would otherwise explode into many tables. Joins become application-side or $lookup. Normalization vs embedding is the design question.'),
  (2,  'embedding vs referencing',
       'Embed: one document, one read, duplication and huge documents. Reference: more round trips, less duplication, more join-like work. 186 Mongo: pick based on access pattern (how you query), not a universal rule. Update anomalies return if you embed copies.'),
  (3,  'MongoDB query slogans',
       'find with a filter document, projections, indexes on fields (including nested). Aggregation pipeline: stages like match, group, unwind. 186 Project 6 is this API, not RookieDB. Secondary indexes still have maintenance cost — the buffer/B+ lessons did not vanish.'),
  (4,  'BASE vs ACID (exam caution)',
       'Basically Available, Soft state, Eventual consistency — a slogan for some replicated stores. Eventual: replicas converge if writes stop. Stale reads happen. 186: do not say "NoSQL means no transactions"; many document stores have session or document-level atomicity. Know what the system actually guarantees.'),
  (5,  'key-value and wide-column',
       'Get/put by key (Redis, Dynamo slogans). Wide-column (Bigtable/Cassandra): row key plus sparse columns, good for time series. Design the key so that queries are prefix scans. If you need arbitrary secondary predicates, you reinvent indexes or you scan the world.'),
  (6,  'MapReduce',
       'Map independent records to key-value pairs; shuffle by key; reduce. Faults: rerun tasks (at-least-once; need idempotent-ish work). 186: this is how you process data that does not fit one DBMS node, not how you replace transactions. Same family as 170 HW MapReduce, now with data systems framing.'),
  (7,  'Spark slogan',
       'Lineage of RDD/DataFrame transformations; recompute lost partitions instead of replicating all intermediate data. Lazy plans (like a query optimizer). Spark SQL brings declarative queries back. 186 last lectures: the optimizer ideas return in a cluster.'),
  (8,  'when a DBMS still wins',
       'Ad-hoc SQL, indexes, concurrency, recovery, constraints, small random updates. Data lakes/Spark win at sequential scans of huge immutable files. 186 closing: pick the tool by access pattern. "We dumped it in Mongo because JSON" is not a design.'),
  (9,  'schema-on-read vs schema-on-write',
       'Relational: schema first, inserts checked. Data lake: files now, interpret later — faster ingest, more junk. 186: integrity (catalog lecture) was a feature, not bureaucracy. You still need a schema in someone''s head.'),
  (10, 'secondary indexes in NoSQL',
       'Optional, eventually consistent in some stores, or local to a node. A query that is not by primary key may be a scatter-gather. The B+ cost model still applies if they actually built an index. Magic "it scales" without a key design does not.'),
  (11, 'polyglot persistence',
       'App uses Postgres for money, Redis for cache, Elastic for search. Each has a consistency story; the app is the 2PC now (or you accept inconsistency). 186: caching is not a source of truth unless you designed invalidation. WAL was the source of truth in RookieDB.'),
  (12, '186 project map',
       'P0 setup. P1 SQL. P2 B+ trees. P3 joins and optimizer. P4 locks. P5 recovery. P6 NoSQL. Oral exams on random students after deadlines. Vitamins weekly. That is the implementation spine; exams add costing, serializability graphs, and ARIES traces.'),
  (13, '186 closing picture',
       'Declarative SQL, then pages and I/O, then indexes, then operators and a cost-based optimizer, then 2PL and ARIES so the pretty SQL is still ACID, then scale-out with partitions/consensus and document stores. 61C was the machine; 186 is the data machine on top.'),
  (14, 'NoSQL exam move',
       'Name the data model and the primary access key. Is the operation atomic, and at what grain (document vs multi-key)? If they compare to SQL, say which isolation/durability you lost and which query became easier. For Spark/MR, name shuffle vs local and what reruns on failure.')
) AS c(pos, front, back)
WHERE d.slug = 'cs186'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

UPDATE public.decks
SET    card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE  slug = 'cs186';
