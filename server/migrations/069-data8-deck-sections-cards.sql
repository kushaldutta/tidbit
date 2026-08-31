-- Migration 069: DATA 8 — Foundations of Data Science, full deck rebuild.
-- UC Berkeley Fall 2026: Lisa Yan, MoWeFr 10:00-10:59 (DATA C8 / STAT C8).
-- Catalog: inferential thinking, computational thinking, real-world data;
-- programming and statistical inference; privacy and data ownership.
-- Textbook: Computational and Inferential Thinking (inferentialthinking.com).
-- Sequence follows data8.org/fa26 (tables through classification and Bayes).
-- Labs in the datascience module (Table), not pandas. Site: data8.org/fa26.

DELETE FROM public.saved_tidbits
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'data-8');

DELETE FROM public.tidbits
WHERE category_id = 'data-8';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'data-8');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'data-8');

UPDATE public.decks
SET title = 'DATA 8',
    description = 'Foundations of Data Science — Yan: tables, simulation, tests, regression',
    cover_emoji = '📊'
WHERE slug = 'data-8';

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('causation',    'Intro & Cause and Effect',
   'Data science slogan, association vs causation, experiments', 0),
  ('python',       'Python & Data Types',
   'Expressions, names, numbers, strings, arrays', 1),
  ('tables',       'Tables & the Census',
   'datascience Table methods, rows, columns, census', 2),
  ('viz',          'Visualizations & Histograms',
   'Bar, scatter, line; area principle; histograms', 3),
  ('groups',       'Functions, Groups, Pivots & Joins',
   'apply, group, pivot, join', 4),
  ('chance',       'Randomness, Iteration & Sampling',
   'Simulation, probability, empirical distributions', 5),
  ('testing',      'Hypothesis Tests & Uncertainty',
   'Models, TVD, p-values, error types', 6),
  ('ab-ci',        'A/B Testing, Causality & CIs',
   'Two samples, causality, bootstrap intervals', 7),
  ('clt',          'Center, Normal & the CLT',
   'Mean/SD, normal curve, sample means', 8),
  ('predict',      'Regression, Classification & Bayes',
   'Correlation, least squares, kNN, updating', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'data-8'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. Intro & Cause and Effect
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'causation'
CROSS JOIN (VALUES
  (0,  'DATA 8 (Yan) in one sentence',
       'Read a table, draw it, then use simulation to test claims and make predictions — Python in the datascience module, not a full CS course. Textbook: Computational and Inferential Thinking. Labs plus two midterms and a final, all in person. Site: data8.org/fa26.'),
  (1,  'three perspectives',
       'Inferential thinking (what can the data support?), computational thinking (how do you compute that at scale?), and real-world relevance (whose data, what decision). Data 8 is not "learn pandas"; it is those three together. A pretty chart with the wrong causal story still fails.'),
  (2,  'individuals and variables',
       'A row is usually one individual (person, country, year). A column is a variable. Numerical vs categorical. The unit of the individual matters: averaging people is not averaging countries. 8: name the individual before you group.'),
  (3,  'observational study vs experiment',
       'Observational: you record what happened; treatment was not assigned by the researcher. Experiment: researcher assigns treatments. Causation needs an experiment (or a very strong design). Association in an observational table is not "X causes Y."'),
  (4,  'confounding',
       'A third factor associated with both treatment and outcome can fake a causal story. Ice cream and drowning: heat. 8 exams: name a confounder that could produce the table they drew. Controlling for a confounder (stratify) can shrink or reverse an association (Simpson energy).'),
  (5,  'random assignment',
       'Assign treatments with chance so treatment groups look alike on both measured and unmeasured confounders (in expectation). That is why randomized controlled trials support causal conclusions. Random sampling is a different job (who is in the study). Do not mix the two sentences.'),
  (6,  'random sampling vs random assignment',
       'Sampling: generalizing from the sample to a population (external validity). Assignment: comparing treatments inside the study (internal / causal). A convenience sample of volunteers can still be a valid experiment among those volunteers. 8: say which question they asked.'),
  (7,  'placebo, blinding, control',
       'Control group: the comparison. Placebo: a fake treatment so the act of being treated is shared. Blinding: subject (and often assessor) does not know the arm. 8: if they skip a control, any "improvement" might be time or placebo.'),
  (8,  'association is not causation slogan',
       'Write it, then apply it: if the study is observational, your conclusion is "associated with," not "causes." If they randomized, you may say the treatment caused the difference (for that protocol). Policy slides still need ethics and who is missing from the table.'),
  (9,  'Simpson''s paradox (light)',
       'A trend in groups can reverse in the aggregate (or the other way). Often a lurking group variable (severity, department). 8: always look at the breakdown they hid. Not a reason to ignore aggregates forever — a reason to ask "which individuals?"'),
  (10, 'privacy and ownership (catalog)',
       'Data about people is not free raw material. Consent, re-identification, and who profits. 8 will not replace a law course, but "the dataset was on GitHub" is not a complete ethics answer. Computational thinking includes what you should not compute.'),
  (11, 'comparison is the engine',
       'A rate without a denominator, a count without a population, a "went up" without a baseline: incomplete. 8: always ask compared to what, among whom, over what time. Census lecture is this habit on official tables.'),
  (12, '61A vs Data 8 Python',
       '61A: abstraction, recursion, interpreters. Data 8: expressions, arrays, Table methods, and for-loops for simulation. You will not write classes. If you try to pandas your way through a Table question, you are in the wrong course.'),
  (13, 'what an 8 exam wants on causation',
       'Study type, what was assigned vs what was observed, a possible confounder, and whether the conclusion should say cause or associate. Circle random assignment vs random sampling. If they add "volunteers," you can still have an experiment.'),
  (14, 'causation exam move',
       'Name observational vs experiment. If experiment, say what was randomized. If observational, invent a confounder that fits the story. Do not "control for" a collider on a DAG you were not given — keep it 8-simple: third factor, both associated.')
) AS c(pos, front, back)
WHERE d.slug = 'data-8'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 2. Python & Data Types
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'python'
CROSS JOIN (VALUES
  (0,  'expression vs statement',
       'An expression has a value (2 + 3, a name, a call). A statement does something (assignment, import, a for-loop). 8 notebooks mix them. If they ask what a cell prints vs what it evaluates to, those can differ (display vs last expression).'),
  (1,  'names and assignment',
       'x = 7 binds the name x to 7. Rebinding x does not change other names that already hold the old value. 8: assignment is not algebra "solve for x." Call-by-object: a Table method that returns a new table leaves the old name alone unless you assign.'),
  (2,  'numbers',
       'int vs float. Division / is float in Python 3; // is floor. np.round and int() are not the same (truncation). 8: money and counts still become floats after a mean. Do not treat 0.1 + 0.2 equality as a human decimal.'),
  (3,  'strings',
       'Text in quotes. Concatenate with +. str.upper / replace. A string is not a number even if it looks like "8". Conversion: int(''8''), str(8). 8 tables often store codes as strings; grouping "01" vs 1 is a type trap.'),
  (4,  'arrays (numpy)',
       'A sequence of one type, elementwise arithmetic, np.arange, np.average, np.diff. Broadcasting: array + scalar. 8: make an array, then do math on the whole thing — a Python for-loop over rows is the slow story, saved for simulation later.'),
  (5,  'np.arange',
       'np.arange(start, stop) goes up to but not including stop (like Python range). np.arange(5) is 0..4. Off-by-one on exams is this function. If they want 1 through n inclusive, arange(1, n+1) or arange(n)+1.'),
  (6,  'true and false',
       'Comparisons produce booleans. np.array of booleans can filter (later tables: .where). and/or vs &/| on arrays: 8 mostly uses array comparisons and np.count_nonzero. Counting True is summing booleans or count_nonzero.'),
  (7,  'call expressions',
       'max(2, 9), np.mean(arr), t.column(''Age''). Parentheses call. A method is a function living on an object (t.num_rows). 8: if you forget parentheses you get the function object, not the number — a vitamin classic.'),
  (8,  'errors 8 actually throws',
       'NameError: typo. TypeError: ''3'' + 1. IndexError / array bounds. Table error: wrong label. Read the last line of the traceback. 8: the fix is usually a type or a label, not a new library.'),
  (9,  'import',
       'import numpy as np is the 8 dialect. from datascience import * pulls Table, make_array, etc. 8 labs assume those. Do not import pandas unless the question does — the autograder wants Table.'),
  (10, 'make_array vs list',
       'make_array (datascience) / np.array: homogeneous, math works. A Python list of numbers still needs conversion before np.mean in some styles. 8 prefers arrays for numeric work and Tables for datasets.'),
  (11, 'rounding and display',
       'What you see in a notebook is rounded; the stored float has more bits. Comparisons after division can surprise you. 8: round for reporting, not as a substitute for exact counts of people.'),
  (12, 'comments and readability',
       'Names should say the variable (growth_rate, not x2). 8 project write-ups grade the sentence more than the golfed one-liner. A magic number without a unit is a style fail.'),
  (13, 'Python exam move',
       'Evaluate inside out. Say the type of the result. If they mix str and int, that is the bug. For arange, write the last included number. If a name is on the left of =, it is assignment, not a question.'),
  (14, 'array exam trap',
       'arr + 1 adds one to each element; arr + arr is elementwise, not concatenate (np.append / np.concatenate is the other). Length mismatch is a ValueError. 8: sketch a 3-element example before the general formula.')
) AS c(pos, front, back)
WHERE d.slug = 'data-8'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 3. Tables & the Census
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'tables'
CROSS JOIN (VALUES
  (0,  'Table',
       'The datascience Table: labeled columns, rows as individuals. t.num_rows, t.num_columns, t.labels. Construct with Table().with_columns(...) or Table.read_table(path). 8: the dataset is a Table until you pull a column out as an array.'),
  (1,  'column vs row',
       't.column(''Year'') is an array. t.row(0) is one individual. t.take(indices) selects rows. Most 8 pipelines: filter rows, then column, then np.mean. If you mean() a Table you did it wrong — mean an array.'),
  (2,  'select, drop, relabel',
       't.select(''A'', ''B'') keeps those columns. drop removes. relabel(''old'', ''new''). 8: select before a scatter so you do not plot a code column as a number. Labels are strings; a typo is a silent empty pain or an error.'),
  (3,  'where',
       't.where(''Age'', are.above(17)) keeps matching rows (predicate). are.equal_to, containing, between, not_equal_to. You can chain wheres (AND). 8: where does not change the original Table unless you assign. "Filter in place" is a myth here.'),
  (4,  'sort',
       't.sort(''GDP'') ascending by default; descending=True for biggest first. Ties keep a stable-ish order — do not depend on it. 8: sort then take(10) is "top 10." Sort does not group; group first if you need category totals.'),
  (5,  'with_columns / with_column',
       'Add or replace a column: t.with_columns(''PerCap'', t.column(''GDP'') / t.column(''Pop'')). Returns a new Table. 8: build derived variables this way, then visualize. Division of arrays is elementwise — populations of 0 will explode; know your zeros.'),
  (6,  'show and take',
       't.show(5) displays; t.take(np.arange(5)) is a Table of five rows. show is for you; take is for the pipeline. 8: if the autograder wants a Table, show() is not the answer.'),
  (7,  'census ideas',
       'Counts of people by age, sex, year. A "population" in the census sense is a count, not a statistical population of samples. 8 census lab: interpret a row (one age in one year) and a rate (count over a base). Age is not a person''s birthday forever — it is a variable in that table.'),
  (8,  'rates and denominators',
       'Percent = 100 * part / whole. If the whole changes (population growth), raw counts mislead. 8: always name the denominator. "More babies named X" can be more births, not more popularity. Per capita is the adult move.'),
  (9,  'missingness (light)',
       'Empty strings, nan, "NA" as a category. where will not treat them as zero unless you say so. 8: if a country is missing GDP, dropping vs filling changes the mean. Say what you did.'),
  (10, 'reading files',
       'Table.read_table(''file.csv'') — path relative to the notebook. Encoding and commas in fields can break a naive file. 8 labs give clean CSVs. If num_rows is 0, you pointed at the wrong path.'),
  (11, 'mutability slogan',
       'Table methods return new Tables. t.where(...) without assignment throws the result away. 8: the bug "why didn''t my table shrink?" is a missing =. Same as pandas copies, different API.'),
  (12, 'Project 1 energy (population)',
       'World population / poverty style: join years, compute growth rates, plot. Growth rate (new - old) / old. 8: a rate over a decade is not an annual rate unless you say so. Read the column description in the codebook.'),
  (13, 'table exam move',
       'Write the pipeline left to right: read, where, select, with_columns, sort, take. Name the predicate. If they want an array, end with .column. If they want how many, num_rows after where, not a plot.'),
  (14, 'census exam trap',
       'A 2020 row for age 0 is infants in 2020, not "people born in 2020 who are now 6." Do not age them forward unless the question says to. Totals include all ages; a "working age" cut is a where, not a vibe.')
) AS c(pos, front, back)
WHERE d.slug = 'data-8'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 4. Visualizations & Histograms
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'viz'
CROSS JOIN (VALUES
  (0,  'pick a chart',
       'Categorical counts: bar. Two numerical: scatter. A sequence over time/order: line. One numerical distribution: histogram. 8: a pie is rare and usually worse than a bar. If they give categories with long tails, sort the bar.'),
  (1,  'bar chart',
       't.barh(''Category'') after grouping to counts. One bar per category; length encodes the number. Do not use a bar for a continuous variable with 200 distinct values — that is a histogram. 8: bars start at 0 or you lie with a truncated axis.'),
  (2,  'scatter',
       't.scatter(''x'', ''y''). Each row a point. Look for form (linear?), direction, strength, outliers. 8: a scatter is not a causal proof. Overplotting: many rows on one pixel — jitter or sample to see density.'),
  (3,  'line plot',
       't.plot(''Year'', ''Pop'') when x is ordered (time). Connecting dots implies a path. 8: if the years skip, the line still interpolates visually — say so. Not for unordered categories (use bar).'),
  (4,  'area principle',
       'The amount of ink / area should match the value. A bar twice as long is twice the count. 3D exploding pies violate this. 8: if a chart makes 2 look like 10, it is a bad chart even if the table is right.'),
  (5,  'histogram idea',
       'Bin a numerical variable; each bar''s area (not height, if widths vary) is the percent or proportion in that bin. 8 default: density so total area is 1 (or 100%). Unequal bins: taller thin bins vs short wide bins — read area.'),
  (6,  'height vs area on a histogram',
       'Area = percent in bin. Height = area / width (density). If bins have equal width, height is proportional to percent and people get sloppy. 8 exams love unequal bins: compute height = percent / width. Units of height are percent per unit of x.'),
  (7,  'choosing bins',
       'Too few: hide shape. Too many: noisy spikes. 8: np.arange(start, stop, step) as bins= in .hist. The last edge must cover the max or the max is dropped. Include the right endpoint convention the library uses — if a value sits on an edge, know which bin it entered.'),
  (8,  'skew and modes',
       'Right skew: long tail to large values (income). Left: tail to small. Bimodal: two peaks (maybe two groups mixed). 8: a mean pulled toward the tail is why we also quote the median. Saying "normal" because it is a hist is a fail.'),
  (9,  'overplotting and aggregation',
       'A scatter of 100,000 points is a blob. Hist or hex later (not 8 core). 8: group first, then bar. Two groups on one scatter: color or two tables. A single color scatter cannot show a third categorical well.'),
  (10, 'lying with charts',
       'Cropped y-axis, 3D, dual axes with unmatched scales, a line through unordered categories. 8: if the table and the chart disagree, the chart is wrong. Always check a number off the figure against t.column.'),
  (11, 't.hist',
       't.hist(''Age'', bins=..., unit=''year''). Overlay two groups with a grouping column if the API allows, or hist each subset. 8: density=True is the course default story. Counts-on-y is easier to misread with unequal bins.'),
  (12, 'from picture to percent',
       'Percent in a bin ≈ height times width when height is density. Sum of areas is about 100%. 8 midterm: they draw three bins, you compute one percent. Round as they ask; do not invent extra bins.'),
  (13, 'viz exam move',
       'Name the chart type and what each axis is. For a histogram, write area = percent and height = percent / width if bins differ. If they change bin width, heights change, areas of those individuals stay the same.'),
  (14, 'histogram trap',
       'A taller bar is not automatically "more people" if it is thinner. Compare areas. A gap in the hist is empty bins, not missing axis. Values below the first edge or at/above the last are omitted — check min and max.')
) AS c(pos, front, back)
WHERE d.slug = 'data-8'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 5. Functions, Groups, Pivots & Joins
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'groups'
CROSS JOIN (VALUES
  (0,  'def a function',
       'def double(x): return 2 * x. Body indented. return sends a value back; without return you get None. 8: small functions for apply and for simulation steps. A function does not see notebook variables you forgot to pass as arguments unless they are truly global — pass them in.'),
  (1,  'apply',
       't.apply(fn, ''Col'') runs fn on each entry of that column, returns an array. Then with_column to store it. 8: fn should take one value (or the documented extra args). If you pass a Table method that needs two columns, write a function of the row or use array math instead.'),
  (2,  'group',
       't.group(''Category'') counts. t.group(''Category'', np.mean) aggregates numeric columns (and may behave oddly on strings). 8: group reduces rows: one row per distinct category. If you still see 10,000 rows, you grouped the wrong label (maybe an ID).'),
  (3,  'group with two columns',
       't.group([''A'', ''B'']) counts combinations. Useful before a pivot. 8: the order of the list is the sort key. Distinct pairs explode if A and B are both high-cardinality (two IDs).'),
  (4,  'collect functions',
       'np.mean, np.median, np.sum, len / np.count_nonzero, min, max. 8 group(collect) applies the collect to each numeric column. A column of strings may disappear or error — select numbers first. Median vs mean: skew.'),
  (5,  'pivot',
       't.pivot(columns, rows, values, collect) makes a matrix: unique rows-label down, unique columns-label across, cells aggregated. 8: pivot is group then spread. Empty cells are 0 or nan depending on collect — know which. Good for two categoricals (sex by year).'),
  (6,  'join',
       't.join(''key'', other) matches rows on equal key values (inner join by default in datascience). Duplicate keys duplicate rows (a merge explosion). 8: if num_rows jumps, you had a many-to-many. Prefixes on overlapping labels: read the new names.'),
  (7,  'inner vs missing keys',
       'A key only in the left table is dropped by a plain join. That is a silent population change. 8: if 50 states become 47, three keys did not match (typo, "CA " vs "CA"). Count before and after. Left-join energy: the course may only test inner — still say who disappeared.'),
  (8,  'when to group vs where',
       'where filters individuals. group summarizes groups. 8: "average income by state" is group, not a where per state in a loop (unless they force iteration). "Californians over 40" is where, then maybe a mean.'),
  (9,  'lists vs arrays in group keys',
       'Two-column group uses a list of labels. A single string is one column. 8: t.group(''A'', ''B'') is wrong (B is collect). t.group([''A'', ''B'']) is the combination. This typo is a vitamin factory.'),
  (10, 'apply vs array math',
       'If the rule is + or /, use columns as arrays. apply is for strings, bins you write by hand, or one-off Python. 8: apply is slower and easier to get None in. Prefer vectorized np when you can.'),
  (11, 'Project 1 tables energy',
       'Join a codebook or a second year, group by region, pivot a small two-way table. 8: check num_rows after join. A growth rate is a with_column on two year-columns, not a group of names.'),
  (12, 'pivot exam picture',
       'Rows are one categorical, columns the other, cells a collect (count or mean). If they ask for a count pivot, collect is len or the default count. Totals: you may need to add a sum row yourself — 8 sometimes wants just the body.'),
  (13, 'groups exam move',
       'Say whether the output has one row per category. Write group(label) or group(label, np.mean). For two keys, a list. For a spreadsheet cross-tab, pivot. If rows explode, you joined on a non-unique key.'),
  (14, 'join trap',
       'Keys must be the same type and spelling. int 8 vs str ''8'' will not match. After join, a column name might be column_2. 8: print labels. If they wanted "all left rows," a plain join is the wrong sentence.')
) AS c(pos, front, back)
WHERE d.slug = 'data-8'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 6. Randomness, Iteration & Sampling
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'chance'
CROSS JOIN (VALUES
  (0,  'why simulation',
       'Many chance questions are easier to fake-repeat than to formula. Draw tickets, record a statistic, repeat. The empirical histogram of the statistic is the sampling distribution (approximate). 8: a for-loop plus np.append or an empty array is the idiom. More repetitions, smoother estimate.'),
  (1,  'for-loops in 8',
       'for i in np.arange(n): body. The body should simulate one trial and store the result. 8: if you put t.sample inside and never store, you wasted the trial. range vs arange: both work; course style is np.arange.'),
  (2,  'np.random.choice',
       'np.random.choice(array, n, replace=True/False). With replacement: independent draws (or a die). Without: a sample of people from a finite list. 8: p= for unfair coins. choice on a Table is t.sample.'),
  (3,  't.sample',
       't.sample(k) samples k rows (with replacement by default in some versions — check the docs they gave you; 8 usually discusses with vs without). with_replacement=False for an SRS of rows. 8: sample of a table is a table; then .column for the statistic.'),
  (4,  'law of large numbers (empirical)',
       'The sample proportion (or mean) settles near the true p (or mu) as n grows, in the iid case. 8: a single sample of 10 can still look wild. "Probability is long-run frequency" is the intuition, not a proof from 70.'),
  (5,  'probability 8 actually uses',
       'Equally likely outcomes: P = favorable / total. Complement: 1 - P(A). Multiplication for independent ands. 8 is not a full 70 course: no endless Bayes until the last week. If they say a fair die, count faces.'),
  (6,  'with vs without replacement',
       'With: draws independent, population unchanged (coin, bootstrap). Without: dependence, a finite population (dealing cards, an SRS of people). 8: if n is tiny vs N, they feel similar. If you sample 50 of 50 without replacement, you get everyone — statistic has no sampling error.'),
  (7,  'empirical distribution',
       'Histogram of simulated statistics. Center near the parameter if unbiased; spread is SE. 8: this is the picture for p-values and CIs later. One sample is one number; the empirical dist is many samples.'),
  (8,  'model of a die / ticket box',
       'A box of tickets is the 8 probability story: draw at random. A die is six tickets. A biased coin is tickets 1 and 0 in some ratio. 8: write the box before you simulate. If the box is wrong, 100,000 reps will not save you.'),
  (9,  'seed (light)',
       'np.random.seed(k) makes the stream repeatable for debugging. 8 labs may seed so autograder matches. A real study should not pick a seed to get a star p-value. If they change the seed, the histogram wiggles; the story should not.'),
  (10, 'sample size vs number of repetitions',
       'n: how big each sample is (precision of one statistic). repetitions: how well you map the sampling distribution. 8: n=100, reps=10000 is common. Tiny reps: jagged p-value. Tiny n: wide sampling dist. They are not interchangeable.'),
  (11, 'chance exam counting',
       'List the outcomes or write a simulation plan: initialize, loop, append, histogram. If they want an exact fraction, count equally likely cases. If they want "about," simulate. Do not quote a normal table this week.'),
  (12, 'iteration trap',
       'Reusing the same Table sample outside the loop. Appending a Table instead of a number. Growing a Python list of lists by mistake. 8: the array you histogram should have length = number of repetitions, each entry one statistic.'),
  (13, 'sampling exam move',
       'State with or without replacement and n. Name the statistic (mean, proportion, max). If they change n, the empirical histogram of the mean gets narrower (later CLT). If they sample the whole population without replacement, SE is 0.'),
  (14, 'probability trap',
       'P(A and B) is not P(A)+P(B). "At least one" is 1 - P(none). 8: for a rare event in many independent trials, 1-(1-p)^n, not n*p if they want a probability (n*p can exceed 1). Simulation can check your algebra.')
) AS c(pos, front, back)
WHERE d.slug = 'data-8'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 7. Hypothesis Tests & Uncertainty
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'testing'
CROSS JOIN (VALUES
  (0,  'null and alternative',
       'Null H0: a fully specified chance model (fair coin, jury pool matches eligible, two groups same). Alternative Ha: a world where that model is wrong in a direction you care about. 8: the simulation is always under H0. You do not simulate the alternative unless they say so.'),
  (1,  'test statistic',
       'A number that is large (or extreme) when Ha looks true. Distance from expected, |observed - 0.5|, TVD, difference of means. 8: pick it before you peek at the p-value. If bigger-is-more-Ha, you use the right tail of the null histogram.'),
  (2,  'p-value (simulated)',
       'Fraction of simulated statistics that are at least as extreme as the observed (in the Ha direction). Small p: data would be rare under H0. 8: p is not P(H0 is true). It is not the probability you made a mistake, exactly. It is a tail probability under the model you simulated.'),
  (3,  'cutoff and "significant"',
       'Convention: p at most 0.05 (sometimes 0.01). 8: the cutoff is a policy, not a law of nature. p = 0.049 vs 0.051 is not a different universe. Report the p-value, then the decision if they insist. "Insignificant" is not "H0 proved."'),
  (4,  'total variation distance (TVD)',
       'For two categorical distributions: half the L1 distance between proportions (or 1/2 sum |p - q|). 8 jury / ethnicity problems. TVD is 0 if identical, large if they differ. Simulate TVD under H0 (random draws from the eligible pool). Observed TVD in the tail: reject.'),
  (5,  'one category vs TVD',
       'A single proportion test (coin, one group percent) uses |p_hat - p0| or a directed version. Many categories: TVD (or a chi-square, not 8 core). 8: if they give a full ethnicity table, TVD, not five separate 0.05 tests without a plan.'),
  (6,  'Type I and Type II',
       'Type I: reject H0 when H0 is true (false alarm). Type II: fail to reject when Ha is true (miss). Alpha ≈ Type I rate if H0 is simple and you use that cutoff. 8: shrinking alpha makes Type II worse. Sample size helps both in the usual story.'),
  (7,  'decisions and uncertainty lecture',
       'A test is a decision rule, not a belief update (that is Bayes week). 8: if p is moderate, say inconclusive, do not "accept H0." Language: consistent with H0 vs evidence against H0.'),
  (8,  'assumptions of the null model',
       'Independence, the ticket box, which numbers are fixed. If people in a jury pool are not a simple random sample, the simulation is the wrong world. 8: attack the model if the story is a convenience sample pretending to be SRS.'),
  (9,  'one-tailed vs two',
       'One-tailed: Ha has a direction (greater than). Two-tailed: different, either way — often |stat|. 8: the tail(s) you use must match Ha. Doubling a one-sided p is the two-sided move when the null is symmetric. If they wrote a directed Ha, do not two-tail by habit.'),
  (10, 'comparing distributions lecture',
       'Two samples or sample vs model. Overlay hists or use TVD / difference of means. 8: "they look different" is not a test. Simulate the statistic under a world where they are not different (later: A/B permute).'),
  (11, 'p-hacking (light)',
       'Many tests, publish the small p. Optional stopping. 8 ethics: a p-value is for a pre-specified question. Exploring 20 plots then testing the prettiest is not 0.05. Say you explored.'),
  (12, 'models lecture (ticket box)',
       'A model is a generating process. Simulate from it. If the data are far from what the model produces, doubt the model. 8: this is the same as H0, said in modeling language. A wrong N in the box is a wrong model.'),
  (13, 'testing exam move',
       'Write H0, Ha, the statistic, how you simulate (how many reps), the observed value, the p-value definition, then conclude in English about the model, not about "the probability the null is true." Circle one- vs two-sided.'),
  (14, 'testing trap',
       'Simulating under Ha. Using the sample as the null box when H0 was a fair coin (the box is 50-50, not the data). A p-value of 0 because reps were 100 and you never got there — say "less than 1/100," not magic certainty. More reps refine the tail.')
) AS c(pos, front, back)
WHERE d.slug = 'data-8'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 8. A/B Testing, Causality & CIs
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'ab-ci'
CROSS JOIN (VALUES
  (0,  'A/B test idea',
       'Two groups (A/B), compare a statistic (difference of means or medians). H0: the label is arbitrary — shuffle group labels, keep the values. The null is "no systematic difference," implemented by permutation. 8: this does not require a probability ticket box from outside; it uses the pooled data.'),
  (1,  'permutation / shuffle',
       'Concatenate the numeric outcomes, shuffle, split into the original group sizes, recompute the statistic, repeat. p-value: how often shuffled stats are as extreme as observed. 8: shuffle the labels, not the pairing you meant to keep (unless it is unpaired A/B).'),
  (2,  'A/B vs randomized experiment',
       'If assignment was random, a significant A/B difference supports a causal conclusion about the treatment. If the groups are observational (smokers vs not), permutation still tests "are these numbers compatible with random labels," not "smoking causes." 8: the math is similar; the English is not.'),
  (3,  'causality lecture (after A/B)',
       'Random assignment plus a comparison. Confounding is broken in expectation. 8: an A/B test on an observational table is still observational. Do not say "the shuffle proved causation." Say what was randomized.'),
  (4,  'confidence interval idea',
       'A range of parameter values consistent with the data (for a given method and confidence level). 8 bootstrap percentile interval: resample the sample with replacement, same n, many times; take the 2.5th and 97.5th percentiles of the statistic for ~95%. Not "95% of people are in this range."'),
  (5,  'bootstrap slogan',
       'The sample is to the population as the bootstrap resample is to the sample. Works when the sample looks like the population (iid, n not tiny, statistic not too wild). 8: resample rows of the table, compute the mean (or median, or regression slope), collect.'),
  (6,  'interpreting 95%',
       'The method captures the true parameter in about 95% of repeated samples (frequentist). For this one interval: do not say P(parameter in interval)=0.95 as a posterior unless you are in Bayes week. 8: "We are 95% confident" is the allowed slogan; "95% of the population is here" is a fail unless it is a prediction interval (it is not).'),
  (7,  'CI and tests',
       'A 95% CI for a mean difference that excludes 0 corresponds to a two-sided test at 5% (same method). 8: if they ask whether 0 is plausible, see if 0 is in the interval. Direction: the interval is the set of "do not reject" parameter values for a corresponding test.'),
  (8,  'percentile',
       'np.percentile(array, 50) is the median style they use. For a 95% bootstrap CI: percentile 2.5 and 97.5. 8: off-by-one on "2.5% of 10000 reps" is 250 values in each tail — they may want you to sort and take those positions. Say the convention.'),
  (9,  'sample size and width',
       'Bigger n: usually a narrower CI (more information). More bootstrap reps: a more stable estimate of the same interval, not a narrower truth. 8: 1000 vs 10000 reps should not shrink the CI by a factor of 10. If it does, you resampled wrong.'),
  (10, 'biased samples and bootstrap',
       'Bootstrap cannot fix a sample that is all volunteers from one cafe. It only replays the sample''s own quirks. 8: if they say convenience sample, the CI is for that process, not "all Berkeley students."'),
  (11, 'confidence vs probability of data',
       'A CI is about a parameter. A p-value is about the data given H0. 8: do not call a CI a p-value. If they want whether a claimed value is compatible, check whether it sits in the interval (or run the test).'),
  (12, 'A/B exam move',
       'Write H0 as "random labels." Describe shuffle, group sizes fixed, statistic = mean_A - mean_B (or absolute). p-value from the permutation histogram. If they randomized treatments, add a causal sentence. If not, association only.'),
  (13, 'CI exam move',
       'Name bootstrap, with replacement, size n, the statistic, 2.5 and 97.5 percentiles for 95%. Interpret: method, not "95% of individuals." If they change n, width changes; if they change reps, Monte Carlo error changes.'),
  (14, 'A/B trap',
       'Shuffling inside groups (does nothing). Changing group sizes. Using np.random.choice without fixing the pooled array. Interpreting p as the effect size. 8: a tiny p with a tiny mean difference is still "detectable," not "huge" — show the difference too.')
) AS c(pos, front, back)
WHERE d.slug = 'data-8'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 9. Center, Normal & the CLT
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'clt'
CROSS JOIN (VALUES
  (0,  'mean vs median',
       'Mean: balance point, pulled by tails. Median: 50th percentile, robust to wild outliers. 8: income → median; heights of a symmetric blob → either. A histogram right-skewed: mean to the right of median. Do not say they are "basically the same" on an 8 exam without looking.'),
  (1,  'standard deviation (SD)',
       'rms deviation from the mean (8 uses population-style np.std with the course''s ddof). Spread in the same units as the data. Variance is SD squared. 8: a larger SD is a wider hist, not a worse mean. Chebyshev later: not all mass is within 1 SD.'),
  (2,  'Chebyshev (light)',
       'For any distribution, at least 1 - 1/k^2 of the mass is within k SDs of the mean. k=2: at least 75%. Weaker than the normal 95% rule. 8: use it when they refuse to assume a bell. If they say "normal," use the normal curve, not Chebyshev.'),
  (3,  'standard units',
       'z = (x - mean) / SD. Mean 0, SD 1. A z of 2 is "2 SDs above." 8: converting to standard units lets you read a normal table / the 68-95-99.7 story. Do not z-score the already-averaged sample mean with the wrong SD (see SE).'),
  (4,  'normal curve',
       'The familiar bell, total area 1. 68% within 1 SD, 95% within 2, 99.7% within 3 (approximate). 8: this describes some data histograms and, more importantly, many sampling distributions of means. A single income hist is often not normal.'),
  (5,  'central limit theorem (CLT)',
       'The probability distribution of the sample mean (iid, finite variance) looks more normal as n grows, centered at the population mean. 8 slogan: averages are normal even when individuals are not (n large enough). Proportions are means of 0-1 data, so CLT applies.'),
  (6,  'square root law',
       'SD of the sample mean (SE) = (population SD) / sqrt(n). Four times the sample size halves the SE. 8: this is why polls quote n. It is not the SD of individuals. Mixing SE and SD is the #1 CLT fail.'),
  (7,  'sample means lecture',
       'Simulate many means of size n, hist them. Center: pop mean. Spread: SE. Shape: more normal for larger n. 8: n=2 vs n=100 on a skewed population is the demo. The hist of individuals does not get more normal — the hist of means does.'),
  (8,  'when CLT is a stretch',
       'Tiny n, huge skew, infinite variance fairy tales, dependence. 8: n=5 from income, do not pretend 95% is mean ± 2 SE with a straight face. Bootstrap can still be a picture. They may still ask you to write the SE formula.'),
  (9,  'proportion SE',
       'For a 0-1 variable, pop SD is sqrt(p(1-p)), SE of p_hat is that over sqrt(n). Max spread at p=0.5. 8: a reported 3% margin is often ~2 SE for 95% (normal). If they give n and p, you can compute SE without a table.'),
  (10, 'elections case study',
       'Polls are sample proportions. Bias (who answers) is not fixed by n. 8: a tight CI around a biased number is confidently wrong. CLT is about chance error given the sampling plan, not about nonresponse.'),
  (11, 'mean ± 2 SE',
       'A 95% interval for the population mean when the sampling dist is about normal: sample mean plus or minus 2 SE (sometimes 1.96). 8: you need an SD estimate from the sample when the pop SD is unknown — course may plug in sample SD. This is not a bootstrap percentile, but should be close for nice means.'),
  (12, 'CLT exam move',
       'Write: the distribution of the sample mean, not of one draw. Center mu, SD sigma/sqrt(n), shape ≈ normal for large n. If they change n to 4n, SE halves. If they ask about one person, do not quote the CLT for means.'),
  (13, 'normal trap',
       'Using 68-95-99.7 on a clearly bimodal hist of individuals. Using SD where SE belongs (interval ten times too wide or too narrow). Saying the population becomes normal as n grows. 8: population is fixed; the mean''s distribution changes.'),
  (14, 'center-and-spread exam pair',
       'Give a typical value (mean or median) and a spread (SD or IQR if they taught it). A mean without SD is half a sentence. If they show a hist, match skew to mean vs median before you compute.')
) AS c(pos, front, back)
WHERE d.slug = 'data-8'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 10. Regression, Classification & Bayes
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'predict'
CROSS JOIN (VALUES
  (0,  'correlation r',
       'r is the average of (x in standard units) times (y in standard units), between -1 and 1. Linear association only. r=0 is not "independent" in general, but 8 treats it as "no linear association." Outliers can make or break r. 8: compute on numerical columns after cleaning.'),
  (1,  'r is not slope',
       'r is dimensionless. Slope of the regression line in original units is r * (SD_y / SD_x). Intercept = mean_y - slope * mean_x. 8: a steep line can have modest r if SDs differ. Quote r for strength, slope for "per extra x."'),
  (2,  'regression line (8 formula)',
       'In standard units: estimate of y_su = r * x_su. Then convert back. This is the least-squares line for linear prediction. 8: it always goes through (mean_x, mean_y). Galton: regress to the mean — predicted y is closer to mean_y than x is to mean_x (in SDs), when |r| is less than 1.'),
  (3,  'least squares',
       'Choose slope and intercept to minimize the mean (or sum) of squared residuals. 8: uniqueness for the usual unique-x cloud. Other losses (absolute) give other lines — not the course default. A residual plot with a curve means linear was a bad summary.'),
  (4,  'residuals',
       'residual = observed y - predicted y. Mean residual is about 0 for the LS line. Residual plot vs x (or vs fitted): should look like a formless blob. Funnel: heteroscedasticity. Smile: nonlinearity. 8: a pretty r with a curved residual plot is a trap.'),
  (5,  'regression inference',
       'The slope is a sample statistic; bootstrap a CI for the true slope (or test slope=0). 8: this is CI week applied to the line. A CI for slope that includes 0: linear association not detected. Assumptions: iid-ish pairs, linear-ish, not one leverage point running the show.'),
  (6,  'ecological correlation (light)',
       'r on aggregated units (states) is not r on people. 8: if they correlate state averages, do not conclude about individuals. The census habit again: name the individual.'),
  (7,  'classification slogan',
       'Predict a category (spam, movie genre). 8: k-nearest neighbors in feature space — majority vote among k closest training points. Features must be numeric (or distances defined). Scale matters: z-score columns or one feature dominates.'),
  (8,  'kNN details',
       'k odd to avoid ties (binary). Small k: noisy, flexible. Large k: smoother, toward the majority class. 8 Project 3: movies / attributes. Distance: Euclidean on the features you chose. A missing feature: you cannot kNN that row without a plan.'),
  (9,  'training vs test (8)',
       'Fit / choose k on training (or a validation split). Report accuracy on a test set you did not tune on. 8: training accuracy of 100% with k=1 is memorization. Always show test accuracy. A confusion table beats a single percent if classes are imbalanced.'),
  (10, 'evaluating classifiers',
       'Accuracy = correct / n. Sensitivity / specificity if they name the medical story. 8: a classifier that always says the common class looks accurate and is useless. Compare to a baseline (majority class).'),
  (11, 'Bayes / updating probabilities',
       'Prior P(class), likelihood P(data | class), posterior proportional to product, then normalize. 8 last week: trees or tables of counts, not a full 70 assault. Base rate: rare disease, a "95% accurate" test can still leave a modest posterior. Write the table of 10000 people.'),
  (12, 'health case study',
       'Screening, false positives, who is in the study. 8: updating is the math; whether to screen is costs and ethics. A posterior is for the model you wrote, not a promise from the hospital.'),
  (13, 'regression exam move',
       'Convert to standard units, multiply by r, convert back — or write slope = r SD_y/SD_x and intercept from means. Sketch residuals. If they bootstrap, resample pairs (rows). If residual plot curves, say nonlinear, do not quote r as the whole story.'),
  (14, 'classification / Bayes exam move',
       'kNN: name features, k, distance, vote. If they change scale, the neighbors change. Bayes: write prior times likelihood, normalize. If they skip the base rate, that is the trick. Do not gradient-descend — this is Data 8, not 189.')
) AS c(pos, front, back)
WHERE d.slug = 'data-8'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

UPDATE public.decks
SET    card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE  slug = 'data-8';
