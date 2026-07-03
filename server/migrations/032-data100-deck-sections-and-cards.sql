-- Migration 032: DATA 100 preset deck sections + cards.
-- Content sourced from ds100.org course notes (fa23 edition, topics stable across semesters).
-- Definitions omit the term on the back for quiz/recall modes.
-- Safe to re-run: sections ON CONFLICT DO NOTHING; cards skip sections that already have cards.

-- =====================================================================
-- 1. DATA 100 topic sections
-- =====================================================================

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.position, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('pandas-wrangling',   'Pandas & Data Wrangling',
   'DataFrame, Series, Index, .loc/.iloc, groupby, merge, and apply', 0),
  ('eda-cleaning',       'EDA & Data Cleaning',
   'Variable types, granularity, faithfulness, and missing values', 1),
  ('visualization',      'Visualization',
   'Choosing the right plot and reading distributions and relationships', 2),
  ('sampling',           'Sampling',
   'Populations, sample bias, random sampling, and the Central Limit Theorem', 3),
  ('modeling-loss',      'Modeling & Loss',
   'Simple linear regression, constant model, MSE, MAE, and residuals', 4),
  ('ols-regression',     'OLS & Multiple Regression',
   'Design matrix, normal equations, R², and model interpretation', 5),
  ('feature-sklearn',    'Feature Engineering & sklearn',
   'One-hot encoding, polynomial features, pipelines, and gradient descent', 6),
  ('cv-regularization',  'Cross-Validation & Regularization',
   'Train/val/test split, k-fold CV, L1 (Lasso), and L2 (Ridge)', 7),
  ('sql',                'SQL',
   'SELECT, WHERE, GROUP BY, aggregation, and JOIN', 8),
  ('random-variables',   'Random Variables & Inference',
   'Expectation, variance, covariance, bias–variance tradeoff, and bootstrapping', 9),
  ('logistic-regression','Logistic Regression',
   'Sigmoid, cross-entropy loss, decision boundary, and performance metrics', 10),
  ('pca-clustering',     'PCA & Clustering',
   'Dimensionality reduction with SVD and clustering with k-means', 11)
) AS v(slug, title, description, position)
WHERE  d.slug = 'data100'
ON CONFLICT (deck_id, slug) DO NOTHING;

-- =====================================================================
-- Pandas & Data Wrangling
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'pandas-wrangling'
CROSS JOIN (VALUES
  (0,  'DataFrame',            'A 2-dimensional labeled table in pandas, with rows and named columns (think: spreadsheet in Python).'),
  (1,  'Series',               'A 1-dimensional labeled array in pandas — a single column or row with an associated index.'),
  (2,  'Index',                'The sequence of row labels on a DataFrame or Series; not a column, but used to align and look up data.'),
  (3,  '.loc[]',               'Label-based selection: returns rows and columns by their index labels or boolean conditions.'),
  (4,  '.iloc[]',              'Integer-position-based selection: returns rows and columns by their numeric position (0-indexed).'),
  (5,  'boolean indexing',     'Filtering rows with a True/False array: df[df["col"] > 5] keeps only rows where the condition is True.'),
  (6,  '.groupby()',           'Splits a DataFrame by unique values of one or more columns, then applies an aggregation to each group.'),
  (7,  '.agg()',               'Applies one or more aggregation functions to grouped or whole-DataFrame columns.'),
  (8,  '.merge()',             'Combines two DataFrames by matching rows on a key column (like SQL JOIN); defaults to an inner join.'),
  (9,  'inner join',           'Keeps only rows whose key value appears in both tables; rows without a match are dropped.'),
  (10, 'outer join',           'Keeps all rows from both tables; fills missing values with NaN where no match exists.'),
  (11, '.apply()',             'Applies a function element-wise or row/column-wise across a Series or DataFrame axis.'),
  (12, '.str accessor',        'Exposes vectorized string methods on a Series of strings (e.g., .str.lower(), .str.contains()).'),
  (13, 'chaining',             'Calling multiple DataFrame methods in sequence on one line, with each returning a new DataFrame.'),
  (14, '.pivot_table()',       'Reshapes data by aggregating values for combinations of row and column labels, like a spreadsheet pivot.')
) AS c(pos, front, back)
WHERE  d.slug = 'data100'
AND NOT EXISTS (
  SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id
);

-- =====================================================================
-- EDA & Data Cleaning
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'eda-cleaning'
CROSS JOIN (VALUES
  (0,  'EDA (Exploratory Data Analysis)', 'An open-ended first pass on a new dataset to understand its structure, find anomalies, and form hypotheses.'),
  (1,  'quantitative variable',    'Takes numeric values where arithmetic makes sense (e.g., height, temperature).'),
  (2,  'qualitative (categorical) variable', 'Represents categories or groups; arithmetic does not apply (e.g., major, eye color).'),
  (3,  'ordinal variable',         'A categorical variable whose categories have a meaningful order (e.g., letter grades).'),
  (4,  'granularity',              'The level at which each row represents data — one row per person vs. one row per transaction vs. per day.'),
  (5,  'scope',                    'Which entities and time periods the dataset actually covers vs. the population of interest.'),
  (6,  'temporality',              'Whether the dataset captures a snapshot in time or tracks changes over time.'),
  (7,  'faithfulness',             'Whether the data accurately reflects the real-world phenomenon it is supposed to measure.'),
  (8,  'missing values (NaN)',     'Entries absent from the data; may be missing completely at random, at random, or not at random.'),
  (9,  'MCAR',                     'Missing Completely At Random: absence of a value is unrelated to any variable in the dataset.'),
  (10, 'MAR',                      'Missing At Random: absence is related to other observed variables but not to the missing value itself.'),
  (11, 'NMAR',                     'Not Missing At Random: absence is systematically related to the value that is missing.'),
  (12, 'outlier',                  'A data point far from the bulk of the distribution; may be an error, a rare event, or a meaningful extreme.'),
  (13, 'data type mismatch',       'A column stored in the wrong dtype (e.g., numeric data read as strings) that silently breaks operations.'),
  (14, 'regular expression (regex)', 'A pattern language for matching or extracting text; used in pandas via .str.contains() and .str.extract().')
) AS c(pos, front, back)
WHERE  d.slug = 'data100'
AND NOT EXISTS (
  SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id
);

-- =====================================================================
-- Visualization
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'visualization'
CROSS JOIN (VALUES
  (0,  'histogram',              'Shows the distribution of one quantitative variable by grouping values into bins and plotting counts or density.'),
  (1,  'bin width (histogram)',  'Controls granularity: too wide hides structure; too narrow creates noise. There is no single correct choice.'),
  (2,  'KDE (kernel density estimate)', 'A smoothed continuous approximation to a distribution, useful when the underlying density is thought to be smooth.'),
  (3,  'box plot',               'Displays median, IQR (25th–75th percentile box), and whiskers; outliers plotted as individual points.'),
  (4,  'scatter plot',           'Shows the relationship between two quantitative variables; each point is one observation.'),
  (5,  'overplotting',           'When many points overlap in a scatter plot, hiding the true density; fixed by transparency (alpha) or jitter.'),
  (6,  'bar chart',              'Compares a quantitative value across categories; length of bars encodes the magnitude.'),
  (7,  'line plot',              'Connects ordered data points (usually over time) to show trends.'),
  (8,  'heatmap',                'Encodes a matrix of values with color; useful for correlation matrices or 2D frequency tables.'),
  (9,  'skewness',               'Asymmetry in a distribution: right-skewed (tail right) means mean > median; left-skewed is the reverse.'),
  (10, 'log scale',              'Compresses large value ranges; useful when data spans several orders of magnitude.'),
  (11, 'misleading visualization', 'A chart that misrepresents data, e.g., by truncating a y-axis, using area to encode length, or cherry-picking.'),
  (12, 'seaborn vs matplotlib',  'seaborn provides high-level statistical plots; matplotlib is the lower-level library both are built on.'),
  (13, 'distribution vs relationship', 'Use histograms/KDE for one variable''s shape; use scatter or line plots to compare two variables.'),
  (14, 'color encoding',         'Hue can encode a categorical variable in scatter plots; use accessible, perceptually uniform palettes.')
) AS c(pos, front, back)
WHERE  d.slug = 'data100'
AND NOT EXISTS (
  SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id
);

-- =====================================================================
-- Sampling
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'sampling'
CROSS JOIN (VALUES
  (0,  'population',             'The complete group of individuals or units we want to draw conclusions about.'),
  (1,  'sample',                 'A subset of the population actually observed; quality depends on how it was collected.'),
  (2,  'census',                 'Collecting data from every member of the population rather than a subset.'),
  (3,  'simple random sample',   'Every subset of the population of the same size has an equal probability of being chosen.'),
  (4,  'convenience sample',     'Uses whoever is easiest to reach; almost always biased in ways that are hard to quantify.'),
  (5,  'selection bias',         'Certain individuals are systematically more or less likely to be included in the sample.'),
  (6,  'response bias',          'Individuals give inaccurate answers due to question wording, social desirability, or other factors.'),
  (7,  'non-response bias',      'People who choose not to respond differ systematically from those who do.'),
  (8,  'sampling frame',         'The list of individuals from which the sample is actually drawn; may not cover the full population.'),
  (9,  'Central Limit Theorem',  'The distribution of the sample mean is approximately normal for large n, regardless of the population shape.'),
  (10, 'standard error',         'The standard deviation of a sample statistic across repeated samples; SE of mean = σ/√n.'),
  (11, 'bootstrap',              'Resample with replacement from the observed sample to approximate the sampling distribution of a statistic.'),
  (12, 'bootstrap confidence interval', 'Take the middle x% of bootstrap statistics to estimate a plausible range for the true parameter.'),
  (13, 'parameter vs statistic', 'A parameter describes the population (fixed but unknown); a statistic is computed from a sample (varies).'),
  (14, 'with vs without replacement', 'With replacement: an individual can appear multiple times; without: each individual appears at most once.')
) AS c(pos, front, back)
WHERE  d.slug = 'data100'
AND NOT EXISTS (
  SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id
);

-- =====================================================================
-- Modeling & Loss
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'modeling-loss'
CROSS JOIN (VALUES
  (0,  'model',                  'A simplified mathematical description of a process; in Data 100, often a function mapping features to predictions.'),
  (1,  'simple linear regression (SLR)', 'Predicts y from one feature x with ŷ = θ₀ + θ₁x; the line that minimizes squared prediction error.'),
  (2,  'fitted value (ŷ)',       'The model''s prediction for a given input; the point on the regression line at that x.'),
  (3,  'residual',               'The difference between the observed value and the fitted value: e = y − ŷ.'),
  (4,  'loss function',          'A measure of how far a single prediction is from the true value; guides how we fit parameters.'),
  (5,  'MSE (Mean Squared Error)', 'Average of squared residuals: (1/n) Σ(yᵢ − ŷᵢ)². Penalizes large errors heavily; sensitive to outliers.'),
  (6,  'RMSE',                   'Square root of MSE; same units as the target variable, easier to interpret.'),
  (7,  'MAE (Mean Absolute Error)', 'Average of absolute residuals: (1/n) Σ|yᵢ − ŷᵢ|. Less sensitive to outliers than MSE.'),
  (8,  'constant model',         'Predicts the same value θ for every input; optimal θ under MSE is the mean, under MAE is the median.'),
  (9,  'empirical risk',         'The average loss over the training dataset; minimizing it finds the best-fit parameters.'),
  (10, 'training error',         'The empirical risk on the data used to fit the model; lower is not always better (overfitting).'),
  (11, 'log transformation',     'Applying log to a skewed variable to make its distribution more symmetric and linear relationships clearer.'),
  (12, 'Pearson correlation r',  'Measures linear association between two variables; ranges from −1 to 1; unchanged by linear rescaling.'),
  (13, 'correlation ≠ causation', 'A strong correlation between two variables does not mean one causes the other.'),
  (14, 'heteroscedasticity',     'When residuals have non-constant variance across fitted values; violates OLS assumptions and inflates standard errors.')
) AS c(pos, front, back)
WHERE  d.slug = 'data100'
AND NOT EXISTS (
  SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id
);

-- =====================================================================
-- OLS & Multiple Regression
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'ols-regression'
CROSS JOIN (VALUES
  (0,  'multiple linear regression', 'Extends SLR to p features: ŷ = θ₀ + θ₁x₁ + … + θₚxₚ; still linear in the parameters θ.'),
  (1,  'design matrix X',        'An n×(p+1) matrix where each row is one observation and the first column is all 1s for the intercept.'),
  (2,  'OLS normal equations',   'The closed-form solution: θ̂ = (XᵀX)⁻¹Xᵀy when XᵀX is invertible.'),
  (3,  'linearity in θ',         'A model is linear if predictions are a linear combination of the parameters; features may still be nonlinear.'),
  (4,  'intercept / bias term',  'The constant θ₀ in the model, added by prepending a column of 1s to the design matrix.'),
  (5,  'R² (coefficient of determination)', 'Fraction of variance in y explained by the model: R² = 1 − RSS/TSS; 1 is perfect, 0 is no better than the mean.'),
  (6,  'RSS (residual sum of squares)', 'Total squared error of the fitted model: Σ(yᵢ − ŷᵢ)².'),
  (7,  'TSS (total sum of squares)', 'Total variance of y around its mean: Σ(yᵢ − ȳ)².'),
  (8,  'multicollinearity',      'Two or more features that are strongly correlated; makes XᵀX near-singular and coefficient estimates unstable.'),
  (9,  'prediction vs inference', 'Prediction: minimize error on new data. Inference: understand how features relate to y (requires careful interpretation).'),
  (10, 'coefficient interpretation', 'In multiple regression, θⱼ is the expected change in ŷ per unit increase in xⱼ, holding all other features fixed.'),
  (11, 'hat matrix / projection', 'H = X(XᵀX)⁻¹Xᵀ; projects y onto the column space of X to produce ŷ = Hy.'),
  (12, 'span of X columns',      'The set of all possible predictions Xθ; OLS finds the projection of y onto this subspace.'),
  (13, 'overfitting (regression)', 'Adding too many features drives training error toward 0 but makes the model fit noise rather than signal.'),
  (14, 'underfitting',           'A model that is too simple to capture the main pattern in the data; high bias, low variance.')
) AS c(pos, front, back)
WHERE  d.slug = 'data100'
AND NOT EXISTS (
  SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id
);

-- =====================================================================
-- Feature Engineering & sklearn
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'feature-sklearn'
CROSS JOIN (VALUES
  (0,  'feature engineering',    'Transforming or creating input features to make a model more expressive or a relationship more linear.'),
  (1,  'one-hot encoding',       'Converts a categorical variable with k categories into k binary (0/1) columns, one per category.'),
  (2,  'dummy variable trap',    'Including all k one-hot columns when one is redundant; drop one category to avoid perfect multicollinearity.'),
  (3,  'polynomial features',    'Adding x², x³, … to the design matrix to fit curves; the model stays linear in θ.'),
  (4,  'standardization (z-score)', 'Subtract mean and divide by SD; puts features on the same scale without changing distributions.'),
  (5,  'sklearn LinearRegression', 'Fits OLS via .fit(X, y); accesses coefficients with .coef_ and intercept with .intercept_.'),
  (6,  'sklearn Pipeline',       'Chains feature transformers and a model into one object so .fit() and .predict() apply the same steps consistently.'),
  (7,  'ColumnTransformer',      'Applies different transformations to different subsets of columns in one step within a Pipeline.'),
  (8,  'gradient descent',       'Iteratively updates θ in the direction of the negative gradient to minimize loss: θ ← θ − α ∇L(θ).'),
  (9,  'learning rate α',        'Step size in gradient descent; too large causes divergence, too small causes slow convergence.'),
  (10, 'stochastic gradient descent', 'Updates θ using the gradient from one randomly chosen data point per step; noisy but faster for large n.'),
  (11, 'mini-batch gradient descent', 'Updates θ using the gradient from a small random batch; balances noise and speed.'),
  (12, 'convergence (gradient descent)', 'When the loss stops decreasing meaningfully between iterations; monitored by watching training loss vs. steps.'),
  (13, 'interaction term',       'A feature formed by multiplying two existing features; captures effects that depend on their joint value.'),
  (14, 'feature importance',     'How much a feature contributes to a model''s predictions; in linear models, measured by coefficient magnitude after scaling.')
) AS c(pos, front, back)
WHERE  d.slug = 'data100'
AND NOT EXISTS (
  SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id
);

-- =====================================================================
-- Cross-Validation & Regularization
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'cv-regularization'
CROSS JOIN (VALUES
  (0,  'train-test split',       'Holding out a random portion (10–20%) of data as a test set to get an unbiased estimate of model performance.'),
  (1,  'training set',           'Data used to fit model parameters; the model is allowed to see it.'),
  (2,  'validation set',         'A held-out portion of the training data used to tune model design and hyperparameters.'),
  (3,  'test set',               'Data seen only once, after all design decisions are final; estimates true generalization error.'),
  (4,  'k-fold cross-validation', 'Split training data into k equal folds; train on k−1 folds and validate on the remaining one, rotating k times.'),
  (5,  'cross-validation error', 'Average validation error across all k folds; more reliable than a single validation split.'),
  (6,  'hyperparameter',         'A model setting chosen before training (e.g., polynomial degree, regularization strength λ); not fit by OLS.'),
  (7,  'bias–variance tradeoff', 'More complex models have lower bias but higher variance; the goal is to balance them to minimize test error.'),
  (8,  'regularization',         'Adds a penalty on large coefficients to the loss function, discouraging overfitting.'),
  (9,  'L2 regularization (Ridge)', 'Adds λ Σθⱼ² to the loss; shrinks all coefficients toward zero; always has a unique solution.'),
  (10, 'L1 regularization (Lasso)', 'Adds λ Σ|θⱼ| to the loss; sets some coefficients exactly to zero, performing implicit feature selection.'),
  (11, 'regularization strength λ', 'Controls how much to penalize large coefficients; larger λ increases bias but reduces variance.'),
  (12, 'model selection',        'Choosing among candidate models (e.g., different degrees or λ values) using cross-validation error.'),
  (13, 'data leakage',           'When information from the test or validation set inadvertently influences training, inflating apparent performance.'),
  (14, 'fitting transformers on train only', 'Scalers and encoders must be .fit() on training data only, then .transform() applied to val/test to avoid leakage.')
) AS c(pos, front, back)
WHERE  d.slug = 'data100'
AND NOT EXISTS (
  SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id
);

-- =====================================================================
-- SQL
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'sql'
CROSS JOIN (VALUES
  (0,  'SQL',                    'Structured Query Language; used to query, filter, aggregate, and join data stored in relational databases.'),
  (1,  'SELECT',                 'Specifies which columns (or expressions) to include in the result; SELECT * returns all columns.'),
  (2,  'FROM',                   'Names the table (or joined tables) to query from.'),
  (3,  'WHERE',                  'Filters rows before aggregation based on a condition on column values.'),
  (4,  'GROUP BY',               'Collapses rows with the same value in a column into one group; used with aggregate functions.'),
  (5,  'HAVING',                 'Filters groups after GROUP BY, analogous to WHERE but applied to aggregated results.'),
  (6,  'ORDER BY',               'Sorts the result ascending (default) or descending (DESC) by one or more columns.'),
  (7,  'LIMIT',                  'Returns at most n rows; often combined with ORDER BY for top-k queries.'),
  (8,  'COUNT(*)',               'Counts all rows in a group, including those with NULLs; COUNT(col) excludes NULLs.'),
  (9,  'SUM / AVG / MAX / MIN',  'Aggregate functions that compute a summary value over all rows (or within each GROUP BY group).'),
  (10, 'INNER JOIN',             'Returns only rows where the join key appears in both tables.'),
  (11, 'LEFT JOIN',              'Returns all rows from the left table; unmatched rows from the right are filled with NULL.'),
  (12, 'NULL in SQL',            'Represents a missing value; comparisons with NULL use IS NULL / IS NOT NULL, not = NULL.'),
  (13, 'SQL query order of operations', 'FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT; not the written order.'),
  (14, 'subquery',               'A query nested inside another; can appear in SELECT, FROM, or WHERE clauses.')
) AS c(pos, front, back)
WHERE  d.slug = 'data100'
AND NOT EXISTS (
  SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id
);

-- =====================================================================
-- Random Variables & Inference
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'random-variables'
CROSS JOIN (VALUES
  (0,  'random variable',        'A numerical function of the randomness in a sample; its value depends on the random outcome.'),
  (1,  'distribution of X',      'A complete description of the possible values of X and their probabilities.'),
  (2,  'expectation E[X]',       'Weighted average of X''s values using their probabilities: E[X] = Σ x · P(X = x).'),
  (3,  'linearity of expectation', 'E[aX + b] = aE[X] + b; E[X + Y] = E[X] + E[Y] regardless of dependence between X and Y.'),
  (4,  'variance Var(X)',        'E[(X − E[X])²] = E[X²] − (E[X])²; measures how much X spreads around its mean.'),
  (5,  'covariance Cov(X, Y)',   'E[(X − E[X])(Y − E[Y])]; positive means they tend to move together, negative means opposite.'),
  (6,  'correlation r(X, Y)',    'Cov(X,Y) / (SD(X) · SD(Y)); normalized to [−1, 1]; zero does not guarantee independence.'),
  (7,  'i.i.d.',                 'Independent and identically distributed: each draw comes from the same distribution and does not influence others.'),
  (8,  'estimator',              'A statistic (function of sample data) used to estimate an unknown population parameter.'),
  (9,  'bias of an estimator',   'Expected difference between the estimator and the true parameter: Bias = E[θ̂] − θ.'),
  (10, 'variance of an estimator', 'How much the estimator fluctuates across different random samples.'),
  (11, 'MSE of an estimator',    'Bias² + Variance; total mean squared error of the estimator relative to the true parameter.'),
  (12, 'model risk decomposition', 'Expected prediction error = irreducible noise² + bias² + variance; minimizing all three simultaneously is impossible.'),
  (13, 'Bernoulli random variable', 'Takes value 1 with probability p and 0 with probability 1−p; E[X] = p, Var(X) = p(1−p).'),
  (14, 'sample mean as estimator', 'X̄ = (1/n) Σ Xᵢ is an unbiased estimator of μ with variance σ²/n.')
) AS c(pos, front, back)
WHERE  d.slug = 'data100'
AND NOT EXISTS (
  SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id
);

-- =====================================================================
-- Logistic Regression
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'logistic-regression'
CROSS JOIN (VALUES
  (0,  'classification',         'Predicting a discrete category (e.g., spam/not-spam) rather than a continuous value.'),
  (1,  'logistic regression',    'A classification model that applies the sigmoid function to a linear combination of features to output a probability.'),
  (2,  'sigmoid function σ(z)',  '1 / (1 + e^(−z)); maps any real number to (0, 1); used to convert a linear score to a probability.'),
  (3,  'log-odds (logit)',       'log(p / (1−p)); the linear combination of features in logistic regression equals the log-odds.'),
  (4,  'cross-entropy loss',     'The loss for one observation: −[y log(p̂) + (1−y) log(1−p̂)]; heavily penalizes confident wrong predictions.'),
  (5,  'decision boundary',      'The threshold (default 0.5) separating predicted class 1 from class 0; can be adjusted for different tradeoffs.'),
  (6,  'confusion matrix',       'A 2×2 table of true positives, false positives, true negatives, and false negatives.'),
  (7,  'accuracy',               'Fraction of predictions that are correct: (TP + TN) / total; misleading when classes are imbalanced.'),
  (8,  'precision',              'Of all predicted positives, the fraction that are truly positive: TP / (TP + FP).'),
  (9,  'recall (sensitivity)',   'Of all actual positives, the fraction the model correctly identified: TP / (TP + FN).'),
  (10, 'F1 score',               'Harmonic mean of precision and recall: 2 · (precision · recall) / (precision + recall).'),
  (11, 'false positive',         'A negative example that the model incorrectly classified as positive (Type I error).'),
  (12, 'false negative',         'A positive example that the model incorrectly classified as negative (Type II error).'),
  (13, 'threshold tradeoff',     'Raising the threshold increases precision but decreases recall; lowering it does the reverse.'),
  (14, 'regularized logistic regression', 'Adding L1 or L2 penalty to cross-entropy loss prevents overfitting; sklearn defaults to L2 with C = 1/λ.')
) AS c(pos, front, back)
WHERE  d.slug = 'data100'
AND NOT EXISTS (
  SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id
);

-- =====================================================================
-- PCA & Clustering
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'pca-clustering'
CROSS JOIN (VALUES
  (0,  'PCA (Principal Component Analysis)', 'A dimensionality reduction technique that finds directions of maximum variance in the data.'),
  (1,  'principal component',    'A direction (linear combination of features) that captures a new axis of maximum remaining variance, orthogonal to prior ones.'),
  (2,  'SVD (Singular Value Decomposition)', 'Factorizes X = UΣVᵀ; the columns of V are the principal component directions, singular values in Σ measure variance.'),
  (3,  'explained variance',     'The fraction of total data variance captured by the first k principal components; guides how many to keep.'),
  (4,  'scree plot',             'Plots variance explained by each component in order; an "elbow" suggests a good number of components to retain.'),
  (5,  'centering before PCA',   'Subtracting the mean from each feature is required before PCA so components capture variance, not mean offsets.'),
  (6,  'dimensionality reduction', 'Projecting high-dimensional data onto a lower-dimensional subspace while preserving as much structure as possible.'),
  (7,  'biplot',                 'Combines a scatter of data in PCA space with arrows showing how original features load onto the components.'),
  (8,  'clustering',             'Grouping data points so that points in the same cluster are more similar to each other than to those in other clusters.'),
  (9,  'k-means clustering',     'Assigns n points to k clusters by iteratively updating cluster centers to minimize total within-cluster variance.'),
  (10, 'k-means objective',      'Minimize the sum of squared distances from each point to its assigned cluster centroid (inertia).'),
  (11, 'choosing k (elbow method)', 'Plot inertia vs. k; look for a kink where adding more clusters gives diminishing returns.'),
  (12, 'k-means sensitivity to init', 'Different random starting centroids can produce different final clusters; run multiple times and pick the best inertia.'),
  (13, 'hierarchical clustering', 'Builds a tree (dendrogram) of clusters by iteratively merging the two closest clusters (agglomerative) or splitting.'),
  (14, 'unsupervised learning',  'Learning structure from unlabeled data; no target variable y; PCA and clustering are the main examples in Data 100.')
) AS c(pos, front, back)
WHERE  d.slug = 'data100'
AND NOT EXISTS (
  SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id
);

-- Fix deck card_count if trigger missed bulk historical inserts (idempotent).
UPDATE public.decks d
SET    card_count = sub.cnt, updated_at = NOW()
FROM (
  SELECT deck_id, COUNT(*)::int AS cnt
  FROM   public.cards
  GROUP  BY deck_id
) sub
WHERE d.id = sub.deck_id AND d.slug = 'data100';
