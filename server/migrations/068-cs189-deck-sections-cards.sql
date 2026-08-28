-- Migration 068: CS 189 — Introduction to Machine Learning, new deck.
-- UC Berkeley Fall 2026: Joseph E. Gonzalez and Narges Norouzi,
-- TuTh 17:00-18:29, Dwinelle 155 (EECS schedule / eecs189.org/fa26).
-- Catalog: supervised methods, generative/discriminative models, density,
-- clustering, nets, dimensionality reduction; projects on real data.
-- Prereq: MATH 53, MATH 54, CS 70. Sequence follows the FA26 calendar
-- (framing, k-NN/k-means, density/GMMs, linear and logistic models, GD,
-- MLPs, CNNs, transformers/LLMs, MDP/RL, post-training, diffusion).

INSERT INTO public.decks (owner_id, slug, title, description, class_id, source, is_public, cover_emoji, card_count)
VALUES (
  NULL,
  'cs189',
  'CS 189',
  'Machine Learning — Gonzalez / Norouzi: density, linear models, nets, transformers, RL',
  'uc-berkeley:cs189:fa26',
  'system',
  true,
  '🧠',
  0
)
ON CONFLICT (slug) DO UPDATE SET
  title       = EXCLUDED.title,
  description = EXCLUDED.description,
  class_id    = EXCLUDED.class_id,
  cover_emoji = EXCLUDED.cover_emoji;

DELETE FROM public.saved_tidbits
WHERE tidbit_id IN (SELECT id FROM public.tidbits WHERE category_id = 'cs189');

DELETE FROM public.tidbits
WHERE category_id = 'cs189';

DELETE FROM public.cards
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'cs189');

DELETE FROM public.deck_sections
WHERE deck_id = (SELECT id FROM public.decks WHERE slug = 'cs189');

INSERT INTO public.deck_sections (deck_id, slug, title, description, position, kind)
SELECT d.id, v.slug, v.title, v.description, v.pos, 'topic'
FROM   public.decks d
CROSS JOIN (VALUES
  ('framing',      'Problem Framing, k-NN & k-Means',
   'Supervised vs unsupervised, generalization, neighbors, clustering', 0),
  ('density',      'Math, Density & GMMs',
   'Linear algebra, probability, KDE, Gaussians, EM', 1),
  ('linreg',       'Linear Regression & Regularization',
   'Least squares, MLE, bias-variance, ridge', 2),
  ('logreg',       'Logistic Regression',
   'Sigmoid, cross-entropy, softmax, decision boundaries', 3),
  ('gd',           'Gradient Descent',
   'GD, SGD, step sizes, convexity, momentum', 4),
  ('nns',          'Neural Networks',
   'MLPs, activations, backprop, init, batchnorm', 5),
  ('cnn',          'Convolutional Nets',
   'Filters, pooling, equivariance, residual stacks', 6),
  ('transformers', 'Transformers & LLMs',
   'Attention, QKV, tokenization, next-token training', 7),
  ('rl',           'MDPs & Reinforcement Learning',
   'Rewards, Q-learning, policy gradients, RLHF', 8),
  ('posttrain',    'Post-Training & Diffusion',
   'Fine-tuning, LoRA, PEFT, distillation, diffusion', 9)
) AS v(slug, title, description, pos)
WHERE d.slug = 'cs189'
ON CONFLICT (deck_id, slug) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position;

-- =====================================================================
-- 1. Problem Framing, k-NN & k-Means
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'framing'
CROSS JOIN (VALUES
  (0,  'CS 189 (Gonzalez / Norouzi) in one sentence',
       'Turn data into predictions: frame the task, then density and neighbors, linear and logistic models, gradient descent, neural nets, CNNs, transformers and LLMs, a slice of RL, then post-training and diffusion. FA26 is top-down from modern systems, with 54/70 math underneath. Site: eecs189.org.'),
  (1,  'supervised vs unsupervised vs RL',
       'Supervised: labeled (x, y), learn a predictor. Unsupervised: only x (clusters, densities, embeddings). RL: actions, rewards, sequential feedback, often no fixed dataset of correct y. 189 starts supervised and clustering; RL is late. Mixing the three on an exam without naming the feedback is a fail.'),
  (2,  'problem framing',
       'Name the input, the prediction target, the loss, and who uses the output. Prediction is not causation. Leakage: a feature that is only available after the label is known. 189 HW1 energy: if the task is ill-posed, no model saves you. Train/val/test split is part of the frame, not an afterthought.'),
  (3,  'generalization',
       'The score that matters is on unseen data drawn like the future, not training accuracy. i.i.d. slogan: train and test from the same distribution, independent draws. Distribution shift breaks it. 189: a perfect training fit with a bad test curve is overfitting, not intelligence.'),
  (4,  'train / validation / test',
       'Fit parameters on train. Choose hyperparameters (k, lambda, architecture) on validation or CV. Touch test once for the report. Peeking at test to pick k is cheating. 188 said this; 189 will fail you if you tune on test.'),
  (5,  'k-NN',
       'Predict the majority label (or average y) among the k nearest training points in feature space. Nonparametric: the model is the dataset. Distance metric and feature scaling dominate. k=1 memorizes; large k smooths toward the prior. Slow at query time unless you index.'),
  (6,  'curse of dimensionality (neighbors)',
       'In high dimension, distances concentrate and nearest neighbors stop being local. Need more data or a better representation (learned features, not raw pixels). 189: k-NN on flattened images is a foil so you want nets later.'),
  (7,  'k-means',
       'Pick k centroids. Assign each point to the nearest centroid; move each centroid to the mean of its cluster; repeat. Objective: within-cluster sum of squares. Local minima; init and k matter. Unsupervised. Not the same algorithm as k-NN (no labels).'),
  (8,  'k-means failure modes',
       'Spherical equal-variance clusters in Euclidean space. Unequal sizes, rings, and outliers break it. Empty clusters if a centroid gets stranded. Feature scaling changes the geometry. 189 pairs this with GMMs, which relax the hard spherical assumption.'),
  (9,  'inductive bias',
       'What the algorithm is willing to believe about unseen x. k-NN: nearby points share labels. Linear models: the boundary is a hyperplane in the features you chose. CNNs: translation structure. Name the bias; do not call it magic.'),
  (10, 'classification vs regression',
       'Discrete y vs real y. Metrics follow: accuracy/F1 vs MSE/MAE. Do not report accuracy on a regression. Imbalanced classes: accuracy can be a trap (always predict the majority). 189: pick a metric that matches the decision.'),
  (11, 'data tools and leakage',
       'Tables, missingness, categorical encodings, train-only scaling. Fit a scaler on train, apply to val/test. Target encoding without CV leaks. 189 lecture 2 is tools plus the first algorithms; a notebook that shuffles after splitting is a silent fail.'),
  (12, '188 vs 189',
       '188: agents, search, MDPs, Bayes nets, a taste of perceptrons. 189: statistical learning as the object of the course, with modern deep models. Overlap: naive Bayes, perceptron energy, MDPs/RL. 189 will ask for bias-variance and gradients, not Pacman expansions.'),
  (13, 'features beat fancy later',
       'k-NN and linear models only see the coordinates you give them. Bad features: no later architecture fully saves a misframed problem. Good features can make k-NN look like a net. 189 still starts here so you feel the representation problem before backprop.'),
  (14, 'framing exam move',
       'Name supervised or not, the loss, the split, and the inductive bias. For k-NN, state k, the metric, and scaling. For k-means, write assign-then-mean and say local minima. If they add a feature that includes the label, call leakage.')
) AS c(pos, front, back)
WHERE d.slug = 'cs189'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 2. Math, Density & GMMs
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'density'
CROSS JOIN (VALUES
  (0,  'why 53 / 54 / 70 show up',
       'Gradients live in 53; norms, eigenvalues, PSD covariances in 54; Gaussians, MLE, and conditionals in 70. 189 will not re-teach a full semester. If a covariance is not PSD, it is not a covariance. If a density is negative, it is not a density.'),
  (1,  'vectors, norms, inner products',
       'w · x is the inner product. L2 norm is Euclidean length. Orthogonal: inner product 0. A linear classifier is a hyperplane whose normal is w. Feature maps change the inner product (later kernels are optional; FA26 leans nets). Scale of features scales the geometry.'),
  (2,  'eigen and PSD',
       'Symmetric matrices: orthogonal eigenvectors, real eigenvalues. Covariance Sigma is PSD: v^T Sigma v is at least 0. PCA / Gaussian ellipses point along eigenvectors. A negative eigenvalue in a fitted covariance is a numerical bug, not a discovery.'),
  (3,  'Gaussian facts',
       'Univariate: density peaks at mu, width sigma. Multivariate: mean vector, covariance matrix; level sets are ellipsoids. Independent coordinates iff covariance is diagonal (for jointly Gaussian). 70: MGF / completing the square energy. 189: this is the parametric density you will mix.'),
  (4,  'MLE slogan',
       'Pick parameters that maximize P(data | params), or the log. i.i.d. data: sum of log-likelihoods. Gaussian mean: the sample mean. 189: least squares and logistic regression are MLEs under noise models, not a different religion from density estimation.'),
  (5,  'density estimation',
       'Learn p(x) from samples. Histogram: bin counts over volume. KDE: average a kernel (often Gaussian) centered at each point; bandwidth is the hyperparameter. Too small bandwidth: spiky. Too large: oversmooth. Nonparametric; curse of dimension again.'),
  (6,  'parametric vs nonparametric density',
       'Parametric: Gaussian, GMM, a fixed-size net. Wrong family = forever biased. Nonparametric: KDE, histograms; flexibility grows with n, needs more data. 189: start with histograms/KDE so GMM feels like a compact alternative.'),
  (7,  'GMM',
       'p(x) = sum_k pi_k N(x | mu_k, Sigma_k). Latent cluster index z. Soft k-means with ellipses and mixture weights. More flexible than k-means; more parameters; can overfit a component onto one point (singular Sigma).'),
  (8,  'EM for GMMs',
       'E-step: responsibilities gamma_{ik} = P(z=k | x_i, current params). M-step: update pi, mu, Sigma as weighted MLE using gamma. Log-likelihood never decreases for a full EM step (in exact arithmetic). Local maxima; init matters. 189: write one E and one M on a tiny example.'),
  (9,  'hard vs soft assignments',
       'k-means: each point belongs to one centroid (hard). GMM EM: fractional memberships (soft). As component variances go to 0 and pi is uniform, GMM can approach k-means-like behavior. If they ask which one models p(x), it is the GMM (or KDE), not k-means.'),
  (10, 'covariance constraints',
       'Full Sigma: d(d+1)/2 params per component. Diagonal: axis-aligned. Spherical: one variance. Tied covariances across components: fewer params, more bias. 189: name the constraint if the exam GMM looks too cheap to fit.'),
  (11, 'singular GMM',
       'A component variance collapsing onto one point sends likelihood to infinity. Fix: min variance, shared Sigma, priors, or more data. This is why naive EM on tiny n is unstable. Not a reason to skip GMM — a reason to regularize.'),
  (12, 'clustering vs density',
       'k-means returns a partition. A GMM returns a density and a posterior over components. You can cluster by MAP z. Density models also generate new x (sample z then x | z). 189: if they want samples, you needed a density, not k-means labels.'),
  (13, 'Mahalanobis distance',
       'sqrt( (x-mu)^T Sigma^{-1} (x-mu) ). Euclidean that respects the Gaussian ellipse. k-means uses Euclidean unless you change the metric. GMM uses Mahalanobis inside each component. Feature scaling is a cheap diagonal Mahalanobis.'),
  (14, 'density exam move',
       'Write the GMM density as a weighted sum of Gaussians. EM: name E (responsibilities) then M (weighted means). If they give a bandwidth, it is KDE, not EM. If a fitted Sigma has a negative eigenvalue, say it is invalid and you would PSD-project or regularize.')
) AS c(pos, front, back)
WHERE d.slug = 'cs189'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 3. Linear Regression & Regularization
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'linreg'
CROSS JOIN (VALUES
  (0,  'linear model',
       'yhat = w · phi(x) + b. Linear in the parameters, not necessarily in raw x (polynomial / one-hot / learned phi). 189: the feature map is the modeling choice; GD later will fit w. Add a constant feature instead of a separate b if you like one vector.'),
  (1,  'least squares',
       'Minimize ||Xw - y||_2^2 (optionally 1/n or 1/2n). Convex quadratic. Closed form: normal equations (X^T X) w = X^T y. If X^T X is invertible, unique minimizer. If not (collinear features, more features than rows), infinitely many LS solutions — regularize.'),
  (2,  'MLE view',
       'Assume y = Xw + noise, noise i.i.d. Gaussian. Maximizing likelihood is exactly least squares. Different noise (Laplace) gives MAE. 189 discussion: linear regression plus MLE is one lecture, not two subjects.'),
  (3,  'bias-variance tradeoff',
       'Expected test error decomposes (under square loss) into bias^2 + variance + noise. Flexible models: low bias, high variance. Stiff models: opposite. Regularization and more data cut variance. 189: sketch a U-shaped test error vs model complexity.'),
  (4,  'overfitting vs underfitting',
       'Underfit: train and test both bad (model too small or too regularized). Overfit: train great, test bad. More features, higher polynomial degree, smaller k in k-NN: more variance. 189 plots this on linear models before nets so you recognize the same curve later.'),
  (5,  'ridge regression',
       'Add lambda ||w||_2^2 to the LS objective (often skip the bias). Solution: (X^T X + lambda I) w = X^T y. Makes the system invertible, shrinks weights, can help multicollinearity. lambda is a hyperparameter on val, not test. Equivalent to a Gaussian prior on w (MAP).'),
  (6,  'lasso (light)',
       'L1 penalty: lambda ||w||_1. Promotes sparsity (some weights exactly 0). No as-clean closed form; coordinate descent / proximal GD. 189 may only contrast L1 vs L2. Do not say ridge zeros weights; it shrinks them.'),
  (7,  'feature scaling for linear models',
       'Ridge/lasso and GD care about scale; unscaled columns steal the penalty. Standardize using train mean/std, then apply to val/test. Tree methods care less; k-NN and regularized linear care a lot. 189: scaling is part of the model.'),
  (8,  'polynomial features',
       'phi(x) = (1, x, x^2, ..., x^d). High d interpolates train points (high variance). With ridge, you can keep d large and let lambda do the smoothing. 189: degree is capacity; lambda is a knob on the same axis.'),
  (9,  'residuals and R^2',
       'Residual: y - yhat. Plot vs x to see curvature you missed. R^2: fraction of variance explained vs predicting the mean — not a proof of causation, and can look fine while the model is useless for the actual decision.'),
  (10, 'more features than examples',
       'Wide X: LS is underdetermined. Interpolating solutions exist. Ridge picks a particular one (often small-norm). Modern nets also interpolate; they need implicit bias of GD, not invertibility of X^T X. 189: name the regime before quoting the inverse.'),
  (11, 'cross-validation',
       'K-fold: rotate which fold is val; average scores; pick lambda or degree. Nested CV if you also want an unbiased test estimate. Leave-one-out is n folds. 189: CV is for hyperparameters; it is not a substitute for a true held-out test if you keep peeking.'),
  (12, 'outliers',
       'Square loss grows fast; one wild y can swing w. MAE / Huber is more robust. Do not delete outliers just to raise R^2 without a data story. 189: robust loss is a modeling choice, like the Gaussian assumption.'),
  (13, 'linear exam algebra',
       'Write the objective, take gradient wrt w: 2 X^T (Xw - y) (or 1/n version). Set to 0 for normal equations. For ridge, add 2 lambda w. If they change n or d, say whether X^T X is likely invertible.'),
  (14, 'linreg exam move',
       'State the model, the loss, and closed form vs GD. Name bias-variance if they change degree or lambda. If they add ridge, write X^T X + lambda I. If train MSE drops and test MSE rises, say overfit, not "the math failed."')
) AS c(pos, front, back)
WHERE d.slug = 'cs189'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 4. Logistic Regression
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'logreg'
CROSS JOIN (VALUES
  (0,  'why not LS on 0/1 labels',
       'Linear regression can predict outside [0,1] and is pulled by far-away x. Classification wants a probability and a boundary. Logistic regression squashes a linear score to (0,1). 189: this is still a linear model in feature space; the nonlinearity is the link, not a hidden layer.'),
  (1,  'sigmoid',
       'sigma(z) = 1 / (1 + exp(-z)). Maps R to (0,1), sigma(0)=1/2, sigma(-z)=1-sigma(z). Derivative sigma(1-sigma) — useful in backprop later. z = w · x + b is the logit / log-odds.'),
  (2,  'Bernoulli likelihood',
       'P(y=1|x) = sigma(w · x). Likelihood of a dataset is the product of Bernoullis. Log-likelihood is sum [ y log p + (1-y) log(1-p) ]. Maximizing it is minimizing binary cross-entropy. No closed form like LS; use GD (next section).'),
  (3,  'cross-entropy loss',
       'For one example: - y log p - (1-y) log(1-p). Large when you put tiny p on the true class. Numerically: use log-sigmoid, not naive exp that overflows. 189: CE is the loss; accuracy is a metric. They are not interchangeable on a gradient.'),
  (4,  'decision boundary',
       'Predict class 1 if p is at least 1/2, i.e. w · x + b at least 0 (for the usual threshold). The boundary is linear in x (or in phi(x)). Nonlinear boundaries need nonlinear features or a net. Threshold 1/2 is not mandatory if costs are asymmetric.'),
  (5,  'gradient of logistic loss',
       'For binary CE with p=sigma(w·x): the gradient wrt w looks like (p - y) x (average over the batch). Same (prediction minus label) times feature as LS, but p is sigmoid not linear. 189: write this once; it is the bridge to backprop.'),
  (6,  'regularized logistic',
       'Add lambda ||w||^2 (or L1). Without it, separable data send ||w|| to infinity (confidence to 1). Regularization keeps probabilities calibrated-ish and the optimizer finite. Same lambda-on-val story as ridge.'),
  (7,  'softmax / multinomial',
       'For C classes: scores z_c = w_c · x, p_c = exp(z_c) / sum_j exp(z_j). Loss: - log p_true (categorical CE). One class can be absorbed (identifiability). 189: softmax is the multi-class sigmoid. Argmax z is the prediction.'),
  (8,  'generative vs discriminative',
       'Logistic: models p(y|x) directly (discriminative). LDA/QDA/naive Bayes: model p(x|y)p(y) then Bayes (generative). Generative can handle missing x via the model; logistic needs a feature vector. 189 density week was generative; this week is discriminative.'),
  (9,  'linearly separable data',
       'If a hyperplane fits train perfectly, unregularized MLE weights diverge. Early stopping, ridge, or hard-margin SVM energy (if mentioned) cap the margin/confidence. 189: "100% train accuracy, huge weights" is this, not a bug in GD.'),
  (10, 'class imbalance',
       'CE still works but the decision threshold and metrics must change. Class weights or resampling. Accuracy can be high while you never catch the rare class. 189: state F1 / PR / expected cost, not only accuracy.'),
  (11, 'calibration (light)',
       'p matching true frequencies. Logistic is often decently calibrated on its own features; modern nets are not (temperature scaling later). 189: a sharp but wrong p is confident and wrong — CE punishes it, 0-1 loss might not until the threshold.'),
  (12, 'features for logreg',
       'Same as linreg: one-hots, interactions, scaling. A linear logit cannot XOR without a feature for the interaction. That limitation is why lecture 12 adds hidden layers. 189: if they draw XOR, say you need a nonlinear feature or an MLP.'),
  (13, 'Newton / IRLS (light)',
       'Logistic Hessian is X^T S X with S diagonal p(1-p) — PSD, so locally convex in w for the unregularized CE. Newton is fast on small d. 189 may only say "convex, GD suffices." Do not invent a normal equation that ignores the sigmoid.'),
  (14, 'logreg exam move',
       'Write p = sigma(w·x), CE loss, and the (p-y)x gradient. For multi-class, write softmax. If they ask for a boundary, set w·x+b = 0. If data are separable, mention regularization or infinite weights. Do not solve it with the LS inverse.')
) AS c(pos, front, back)
WHERE d.slug = 'cs189'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 5. Gradient Descent
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'gd'
CROSS JOIN (VALUES
  (0,  'gradient',
       'Vector of partials: direction of steepest increase. Descent: step opposite the gradient. For a scalar loss L(w), w := w - alpha * grad L(w). alpha is the learning rate. 189: if you cannot write grad L, you cannot train the net later.'),
  (1,  'GD vs closed form',
       'Use GD when n or d is huge, the loss is not quadratic, or you want minibatches. Linear LS can be GD or normal equations. Logistic and nets need iterative methods. GD on a convex smooth loss with the right alpha converges to a global min; nonconvex (nets) does not guarantee that.'),
  (2,  'learning rate',
       'Too large: diverge or bounce. Too small: crawl. Schedules: decay, warmup (later nets). Line search is rare in 189. Same alpha for all coordinates can hurt if features are unscaled — another reason to standardize. Plot loss vs step; a hockey-stick up means alpha is too big.'),
  (3,  'convex vs nonconvex',
       'Convex: any local min is global; GD is boring in a good way (logistic CE, ridge LS). Nonconvex: saddles, bad local minima (deep nets). 189: convexity is why logreg GD is safe; it is not why ResNets work. Do not cite convexity for a 5-layer net.'),
  (4,  'SGD',
       'Use a random example (or minibatch) to estimate the gradient. Noisy updates, cheap per step, can escape sharp basins. Variance: smaller batch, noisier. 189: the expected SGD step is full GD (unbiased) if you sample uniformly; the path is not the same.'),
  (5,  'minibatch',
       'Compromise: batch size B. B=n is GD. B=1 is classic SGD. GPU likes medium B. Larger B: stabler grad, often need larger alpha. 189: name B if they give a training curve that is spiky (small B) vs smooth (large B).'),
  (6,  'epochs and shuffling',
       'One epoch: each training example used once (in expectation). Shuffle each epoch so minibatches are not ordered by class. Not shuffling sorted labels is a classic silent fail. 189 HW: if loss is a square wave, check the data order.'),
  (7,  'momentum',
       'Accumulate a velocity: v := beta v + grad, then step along v (sign conventions vary). Smooths noisy SGD and accelerates along valleys. 189: momentum is not a new loss; it is an optimizer state. beta near 1 is heavy smoothing.'),
  (8,  'local minima and saddles',
       'In high-d nets, strict bad minima are less the story than saddles and flat regions. SGD noise can help leave saddles. 189: "stuck" may be tiny alpha, dead ReLUs, or a bug — not necessarily a proven local min.'),
  (9,  'Lipschitz / step-size slogan',
       'If gradients change at most L (smoothness), GD with alpha small enough relative to 1/L decreases a convex loss. 189 may not prove it. Practical: if you 10x the features, the Lipschitz constant can 10x — scale features or shrink alpha.'),
  (10, 'numerical gradient check',
       'Partial wrt w_i is about (L(w+eps e_i) - L(w-eps e_i)) / (2 eps). Compare to autodiff. 189: this is how you debug backprop, not how you train. Too large eps: truncation error; too small: float noise.'),
  (11, 'when GD is the wrong picture',
       'Second-order (Newton) on small convex problems. Coordinate descent for lasso. Closed form for ridge. 189 still wants GD because nets will not have a better story. Do not Newton a million-parameter CNN on the exam unless they ask.'),
  (12, 'loss surface cartoons',
       'Bowl: LS. Elongated bowl: correlated features, need small alpha or preconditioning/scaling. Cross-entropy logistic: convex bowl. Deep net: chaotic. 189 midterm: match the cartoon to the model, then pick alpha qualitatively.'),
  (13, 'implicit bias (light)',
       'Even among interpolators, the optimizer picks a particular w (e.g. small-norm for GD on LS from 0). This is why interpolating models can still generalize. 189 may only mention it. Do not confuse with explicit ridge.'),
  (14, 'GD exam move',
       'Write w := w - alpha grad. State full-batch vs SGD vs minibatch. If loss explodes, shrink alpha or scale features. If they give a convex quadratic, you may also write the closed form. Circle whether a global min is guaranteed.')
) AS c(pos, front, back)
WHERE d.slug = 'cs189'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 6. Neural Networks
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'nns'
CROSS JOIN (VALUES
  (0,  'MLP',
       'Stack affine maps and nonlinearities: h = f(W x + b), repeat, then an output layer. Depth: number of layers. Width: hidden units. Without nonlinearities, the whole stack is one linear map — so activations are the point. 189 lectures 12-16.'),
  (1,  'why nonlinearity',
       'Composition of linear maps is linear. XOR, circles, and image class boundaries need folds. ReLU, tanh, GELU fold the space. Universal approximation slogan: a wide enough one-hidden-layer net with a nice activation can approximate continuous functions on compact sets — existence, not a training algorithm.'),
  (2,  'activations',
       'ReLU: max(z, 0), sparse, cheap, dying ReLU if a unit is always 0. Sigmoid/tanh: saturate, vanish gradients in deep stacks. Softmax: output for multi-class. Match the last layer to the loss (sigmoid+CE, linear+MSE, softmax+CE). 189: do not softmax then MSE as the default.'),
  (3,  'losses for nets',
       'Classification: cross-entropy on softmax/sigmoid. Regression: MSE or MAE. The loss is part of the model. 189: write the forward pass all the way to a scalar L, then backprop. Accuracy is not differentiable in a useful way — do not GD on accuracy.'),
  (4,  'backprop',
       'Chain rule on the computation graph: dL/d(incoming) from dL/d(outgoing) times local Jacobian. Reverse-mode autodiff = backprop for a scalar loss. Cost is a small constant times the forward cost, not exponential. 189: one tiny net by hand (two layers, one example).'),
  (5,  'computation graph',
       'Nodes are tensors/ops; edges are data. Forward: store activations needed for backward. Backward: multiply incoming gradient by local derivative. Sharing a weight (later CNN/RNN) means summing the incoming grads to that weight. 189: if a weight is used twice, the grad adds.'),
  (6,  'initialization',
       'Too large: explode activations. Too small: vanish. Xavier/He scale variance with fan-in/fan-out so signals stay O(1). All zeros: hidden units are symmetric and stay tied. 189: never init a ReLU net to all zeros; random small is the baseline.'),
  (7,  'batch normalization',
       'Normalize hidden activations using batch mean/variance, then learn scale and shift. Stabilizes training, lets you use larger alpha, interacts with init. At test time, use running averages, not the tiny batch stats. 189 lecture 14. Train vs eval mode matters.'),
  (8,  'regularizing nets',
       'Weight decay (L2 on w). Dropout: randomly zero units at train, scale at test. Early stopping. Data augmentation (next section). 189: more capacity plus more regularizers. A 100% train accuracy with a 60% test is still overfit.'),
  (9,  'vanishing and exploding gradients',
       'Deep products of Jacobians go to 0 or infinity. Sigmoid stacks vanish. Careful init, ReLU, residual links, batchnorm, gradient clipping. 189: if the last layers train and the first do not, suspect vanishing.'),
  (10, 'output layer contract',
       'Binary: one logit + sigmoid + BCE, or two logits + softmax. Multi-class: C logits + softmax + CE. Regression: linear last layer. Mixing a sigmoid output with MSE is allowed but not the 189 default for classification.'),
  (11, 'capacity',
       'More layers/units: can fit more functions, including noise. Depth composes features; width mixes them in one step. 189: you control capacity with architecture plus regularizers plus early stop — not with "make it deep" alone.'),
  (12, 'dead ReLUs',
       'If W x + b is always negative, ReLU gradient is 0, the unit never recovers. Large alpha and bad init make this worse. Leaky ReLU is a patch. 189: a zero hidden unit is not "sparsity for free" if the whole channel died.'),
  (13, 'HW3 energy',
       'Implement forward, backward, a training loop, then tricks (init, batchnorm, regularization). If loss is NaN, alpha or log(0). If loss never moves, alpha is ~0, labels are wrong, or grad is not wired. Autograd check on one layer before stacking.'),
  (14, 'NN exam move',
       'Draw the graph, write forward, then backprop one path with numbers. Name the activation and the loss together. If they remove all nonlinearities, the net collapses to linear. If train soars and test dies, name overfit and one regularizer.')
) AS c(pos, front, back)
WHERE d.slug = 'cs189'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 7. Convolutional Nets
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'cnn'
CROSS JOIN (VALUES
  (0,  'why conv, not a giant MLP on pixels',
       'Images are huge and translation-structured: a cat shifted is still a cat. A dense layer on flattened pixels has a weight per pixel and no built-in shift structure. Convolution reuses a small filter across space. 189 lectures 16-17.'),
  (1,  'convolution / cross-correlation in nets',
       'Slide a filter over the input; at each location, inner product with the patch, write one output (plus bias). Libraries often do cross-correlation (unflipped filters) and still call it conv. Output is a feature map. Many filters: many maps (channels).'),
  (2,  'parameter sharing',
       'The same W is used at every spatial position. Number of weights is filter height times width times in-channels times out-channels — not image size. That is the parameter win vs dense. 189: count params on a tiny 3x3, 3-in, 8-out example.'),
  (3,  'translation equivariance',
       'Shift the input, the feature map shifts (ignoring edges/padding). Classification often wants invariance: pooling or global pool plus the fact that later layers see bigger regions. Equivariance is not invariance — say which one they asked.'),
  (4,  'padding and stride',
       'Padding: zeros (or reflect) around the border so size does not shrink, or to keep alignment. Stride s: skip locations; downsamples. "Same" padding vs valid (no pad) are library names. 189: output spatial size depends on pad, stride, and filter size — compute it on a 1-d toy.'),
  (5,  'channels',
       'RGB: 3 input channels. A filter is  k x k x C_in. Stacking convs: C_out of layer i is C_in of layer i+1. 1x1 conv: mix channels at a location, no spatial mixing — a cheap learned bottleneck. Do not forget the channel axis when counting FLOPs.'),
  (6,  'pooling',
       'Max or average over a window: downsample, some invariance to tiny shifts. Strided conv can downsample instead. Global average pool before a classifier avoids a huge dense flatten. 189: pooling is not convolution; it has no learned filter in the basic version.'),
  (7,  'receptive field',
       'Which input pixels affect a given unit. Grows with depth, kernel size, and dilated conv. A 1x1 stack never sees neighbors. 189: if the field is smaller than the object, the class head is guessing from a patch.'),
  (8,  'stacking convs vs one big kernel',
       'Two 3x3 (with nonlinearity between) can emulate a larger field with fewer params and more nonlinear folds than one 5x5. That is the VGG slogan. 189: depth in convs is not just "more layers for fun."'),
  (9,  'residual connections (light)',
       'Learn F(x) added to x (skip). Easier to pass gradients through deep stacks; identity is a default. ResNets made very deep conv nets trainable. 189: a skip is extra edges on the graph; backprop adds the two incoming grads.'),
  (10, 'data augmentation',
       'Train-time random crops, flips, color jitter: more invariance, more effective data. Must not change the label (do not flip a 6 into a 9 unless that is still a 6). Apply the same geometry story at test (five-crop) or not — be consistent. Regularization, not extra labels from nowhere.'),
  (11, 'transfer learning preview',
       'Train on a big image set, freeze early filters (edges, textures), replace the head for your labels. 189 post-training week generalizes this to LoRA. For a tiny medical set, fine-tune a CNN instead of training from random on 200 images.'),
  (12, 'CNN vs transformer for vision (light)',
       'CNNs bake in locality and weight sharing. Vision transformers tokenize patches and use attention (later lecture). 189: CNN is still the inductive-bias baseline; ViT is "let data learn the mixing" at higher data/compute.'),
  (13, 'failure modes',
       'Texture bias, adversarial pixels, ignoring global layout if the receptive field or pooling is sloppy. Padding artifacts. Class imbalance in detection (beyond 189 core). If train accuracy is high only on centered ImageNet-style crops, the model never saw the wild.'),
  (14, 'CNN exam move',
       'Sketch a filter on a tiny grid, write one output pixel as a dot product. Count parameters with sharing. Name pad/stride if they change spatial size. If they flatten into a dense net, say you lost translation structure and exploded params.')
) AS c(pos, front, back)
WHERE d.slug = 'cs189'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 8. Transformers & LLMs
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'transformers'
CROSS JOIN (VALUES
  (0,  'transformer slogan',
       'Sequence in, sequence out, mixing tokens with attention instead of recurrence. Parallel over positions at train time. 189 lectures 18-21: architecture, then LLMs as next-token models. Not a search agent (that was 188).'),
  (1,  'self-attention',
       'Each token builds a query, keys and values from the sequence. Weights: softmax(Q K^T / sqrt(d)) times V. A token is a weighted sum of values. "Attend" means large weight. 189: write Q,K,V as linear maps of the embeddings. No recurrence in the mixer.'),
  (2,  'why divide by sqrt(d)',
       'Dot products of d-dimensional Gaussians grow like sqrt(d); softmax saturates to a one-hot. Scaling keeps the logits in a trainable range. 189: it is not optional numerics trivia — it is why attention stays soft.'),
  (3,  'multi-head attention',
       'Several QKV sets in parallel (heads), each with smaller d, then concat and project. Heads can specialize (syntax vs a name). 189: one head is a single softmax mixture; multi-head is several mixtures concatenated.'),
  (4,  'positional information',
       'Attention is permutation-equivariant without positions. Add (or concatenate) positional encodings: sinusoids, learned embeddings, or relative/RoPE. 189: if you zero the positions, the model cannot tell "dog bites man" from the bag of words in order.'),
  (5,  'encoder vs decoder',
       'Encoder: bidirectional self-attention (BERT energy). Decoder: causal mask so token t only sees 1..t (GPT energy). Encoder-decoder: cross-attention from decoder queries to encoder keys/values (classic translation). 189 LLMs are mostly causal decoders.'),
  (6,  'causal mask',
       'Set attention logits to -inf (then softmax 0) for future positions. Needed so next-token training is not cheating. At inference, generate left to right (or with fancier decoding). 189: if the mask is off, train perplexity is fake.'),
  (7,  'tokenization',
       'Bytes/words are not the atoms. BPE/WordPiece/Unigram: subword units, finite vocab. UNK is rarer. Tokenization changes length and what "a word" means for attention. 189: the model predicts tokens, not English letters, unless it is a byte model.'),
  (8,  'next-token training',
       'Maximize log p(x_{t+1} | x_{1:t}) summed over the corpus (teacher forcing). Loss is CE on the vocab softmax. That is unsupervised on raw text (self-supervised). 189: pretraining is still MLE; the magic is scale plus the architecture.'),
  (9,  'context window',
       'Attention is quadratic in sequence length for vanilla full attention. The window is a hyperparameter of compute, not of language. Long context needs sparse/linear attention or recurrences (later methods lecture). 189: if the fact is outside the window, the model cannot attend to it.'),
  (10, 'in-context learning',
       'At inference, extra examples in the prompt can change behavior without weight updates. Not the same as gradient fine-tuning. 189: it is a property of the trained next-token model plus prompt format, not a new training algorithm.'),
  (11, 'scaling slogan',
       'More data, more params, more compute: loss often follows a smooth power law until you hit data quality or architecture walls. 189: bigger is not a theorem of 54; it is an empirical regularity. Small models still need the same QKV math.'),
  (12, 'attention vs RNN (why transformers won)',
       'RNNs: sequential train, long-range via a compressed hidden state (vanishes). Attention: direct path between distant tokens, parallelizable. 189: quadratic cost is the bill. Linear attention / sliding windows are "attention methods" lecture 21.'),
  (13, 'LLM failure modes',
       'Hallucination: fluent next tokens, not a calibrated knowledge base. Prompt sensitivity. Context stuffing. 189: next-token CE does not optimize truth. Post-training (next section) tries to steer; it does not install a database.'),
  (14, 'transformer exam move',
       'Write attention as softmax(QK^T / sqrt(d)) V. Name causal vs bidirectional. If they permute tokens with no positions, say the mixer cannot see order. For an LLM, write next-token CE. If they ask params vs FLOPs, count QKV projections and the softmax mixing separately.')
) AS c(pos, front, back)
WHERE d.slug = 'cs189'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 9. MDPs & Reinforcement Learning
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'rl'
CROSS JOIN (VALUES
  (0,  'why RL in 189',
       'Supervised learning needs labels. Many sequential problems only give a reward later (games, robots, dialogue). FA26 puts MDP/RL after LLMs so RLHF is not a black box. 188 already did Pacman RL; 189 wants the statistical learning view plus modern post-training.'),
  (1,  'MDP tuple',
       'States, actions, transitions P(s''|s,a), reward, discount gamma in [0,1). Policy pi(a|s). Objective: expected discounted return. If you are given P, it is planning (value iteration). If you only sample, it is RL. Do not Q-learn a labeled classification set.'),
  (2,  'value and Q',
       'V^pi(s): expected return from s following pi. Q^pi(s,a): from taking a then pi. Optimal Q*: greedy V* = max_a Q*. 189: Q is the object that lets you pick actions without a model of P if you have Q.'),
  (3,  'Bellman backup (planning)',
       'V(s) gets max_a of expected r + gamma V(s''). Value iteration repeats this. 189 will not spend three lectures here; write the backup once. If they give a 2-state grid, do one sweep by hand.'),
  (4,  'Q-learning (model-free)',
       'Q(s,a) := Q(s,a) + alpha (r + gamma max_{a''} Q(s'',a'') - Q(s,a)). Off-policy: the max is greedy even if you explored. Needs coverage of (s,a). Tabular: finite S x A. Function approximation: later instability. 188 Project 3 energy.'),
  (5,  'exploration',
       'Epsilon-greedy, bonuses, entropy in policy gradients. Too greedy: never try the good action. Too random: never exploit. 189: supervised CE has no analog; this is extra. Replay buffers (if mentioned) reuse past transitions.'),
  (6,  'policy gradients slogan',
       'Parameterize pi_theta; climb expected return with samples (REINFORCE: multiply log pi by return). High variance; baselines / actor-critic help. Natural when actions are sequences (tokens). 189: this is the family behind RLHF-style updates, not a Q table.'),
  (7,  'bandits (light)',
       'One-step MDP: no s'' dynamics, just arms with unknown means. Explore-exploit in pure form. Contextual bandits: features, still one-step. 189 may use them as a warmup. Do not call a bandit a full MDP.'),
  (8,  'reward design',
       'The policy optimizes the scalar you wrote, not your prose intent. Reward hacking / specification gaming. Sparse rewards: hard credit assignment. Shaping can change the optimum if it is not potential-based. 189: pick R as carefully as you pick a supervised loss.'),
  (9,  'sample inefficiency',
       'RL often needs many environment steps; supervised next-token training reuses a static corpus. That is why we pretrain then RL-fine-tune, not train GPT from scratch with only human preference clicks. 189 closing picture: pretrain (CE) then post-train (RL/others).'),
  (10, 'RLHF cartoon',
       'Collect human (or AI) preferences over outputs, fit a reward model, then RL (or DPO-like) to push the LLM toward preferred tokens while a KL penalty stays near the SFT policy. 189: names the pieces; it is not a full CS 285. Preferences are not ground-truth y.'),
  (11, 'on-policy vs off-policy',
       'On-policy: data from the current pi (policy gradient, SARSA). Off-policy: data from a behavior policy (Q-learning, replay). Mixing them without the right correction biases the update. 189: if they freeze a replay of an old pi, say off-policy.'),
  (12, '188 overlap without Pacman',
       'Same Bellman and Q-learning equations. 189 will ask you to connect them to LLM alignment and to contrast with supervised CE. If the exam gives a T table, use VI, not SGD on a net, unless they say approximate.'),
  (13, 'when not to use RL',
       'If you have plenty of labels, supervised (or imitation) is stabler. RL when the objective is sequential and you cannot cheaply label the optimal action. 189: classification of images is not an MDP unless they force a sequential decision.'),
  (14, 'RL exam move',
       'Write the MDP tuple and whether P is known. For a sample (s,a,r,s''), write the Q-learning update. If they say preferences over completions, name reward model + RL (or a direct preference loss). Circle exploration: epsilon or entropy.')
) AS c(pos, front, back)
WHERE d.slug = 'cs189'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

-- =====================================================================
-- 10. Post-Training & Diffusion
-- =====================================================================
INSERT INTO public.cards (deck_id, section_id, front, back, card_type, position)
SELECT d.id, s.id, c.front, c.back, 'basic', c.pos
FROM   public.decks d
JOIN   public.deck_sections s ON s.deck_id = d.id AND s.slug = 'posttrain'
CROSS JOIN (VALUES
  (0,  'pretrain vs post-train',
       'Pretrain: next-token (or similar) on huge unlabeled text. Post-train: adapt to instructions, tools, or a domain with much less data. 189 lecture 25. The pretrained net is the inductive bias; post-train is a second optimization problem with a different loss.'),
  (1,  'supervised fine-tuning (SFT)',
       'Continue CE on instruction-response pairs (or domain docs). Simple and strong. Can overwrite broad pretrain if the SFT set is narrow (catastrophic forgetting). 189: SFT is still supervised learning; the architecture is an LLM.'),
  (2,  'PEFT',
       'Parameter-efficient fine-tuning: update a small subset of weights instead of all. Faster, cheaper, less forgetting, easier to swap adapters. LoRA is the poster child. 189: PEFT is a family, not one algorithm.'),
  (3,  'LoRA',
       'Freeze W; learn a low-rank update BA (rank r much smaller than the hidden size) added to W. Train B and A only. At deploy, you can merge BA into W. 189: r is the capacity knob. If r is full rank, you have basically dense fine-tune in that subspace.'),
  (4,  'adapters and prefixes (light)',
       'Small extra MLPs inserted in blocks, or learned prefix tokens. Same PEFT idea: few params, frozen backbone. 189: if they draw a frozen tower plus a tiny residual, it is PEFT. Name what is frozen.'),
  (5,  'distillation',
       'Train a student to match a teacher (logits, hidden states, or samples). Compress a big LLM into a smaller one, or transfer a chain-of-thought style. Loss is often CE/KL to teacher, not only hard labels. 189: the teacher is extra supervision, not test data.'),
  (6,  'instruction tuning vs RLHF',
       'Instruction tuning: SFT on (prompt, good answer). RLHF: extra preference optimization after that. You can ship after SFT only. 189: do not call every chatbot "RLHF"; ask whether a reward model or preference loss was used.'),
  (7,  'diffusion slogan',
       'Forward: gradually add Gaussian noise until the image (or latent) is nearly N(0,I). Reverse: a net predicts noise (or the score) to denoise step by step. Sampling is iterative. 189 lecture 26 — intuition, not a full score-matching course.'),
  (8,  'why noise prediction works (cartoon)',
       'If you can predict the noise that was added at time t, you can take a step toward the data. Training: sample x, t, noise, minimize ||eps - eps_theta(noisy, t)||^2. 189: this is supervised regression on noise, not GANs. Many steps at sample time.'),
  (9,  'score / DDPM names',
       'Score: gradient of log density. Denoising score matching relates to Tweedie / noise prediction. DDPM: a particular discrete-time Gaussian process. 189: matching names to "predict eps" is enough; deriving the ELBO is extra credit energy.'),
  (10, 'latents and conditioning (light)',
       'Latent diffusion: run the process in a compressed autoencoder space (Stable Diffusion cartoon). Conditioning: extra input (text embeddings) into the denoiser. 189: the language model and the denoiser can be separate modules.'),
  (11, 'compute vs data vs params',
       '189 closing: errors fall when you scale the right resource, but quality and alignment are not automatic. Distillation and PEFT exist because full retraining is expensive. Report all three, not only parameter count.'),
  (12, 'ethics / data (Norouzi-Gonzalez energy)',
       'Training data encode people and power. Benchmarks leak. Medical and policy tasks are not i.i.d. ImageNet. 189 will not replace a fairness course, but "maximize test accuracy" without who is in the test set is incomplete. LLMs copy training text; diffusion copies styles.'),
  (13, '189 closing picture',
       'Frame the problem and split the data. Density and linear models make the math honest. GD trains everything that lacks a closed form. Nets, convs, and transformers are inductive biases. RL and post-train adapt sequential objectives. Diffusion is another generative story. That is Introduction to Machine Learning in FA26.'),
  (14, 'post-train exam move',
       'If weights stay frozen plus a small BA, say LoRA/PEFT. If the loss is still next-token on instructions, say SFT. If they add preference pairs, say reward model or a direct preference loss. For diffusion, write noise-prediction MSE and iterative reverse steps. Do not call SFT "RL."')
) AS c(pos, front, back)
WHERE d.slug = 'cs189'
AND NOT EXISTS (SELECT 1 FROM public.cards e WHERE e.deck_id = d.id AND e.section_id = s.id);

UPDATE public.decks
SET    card_count = (SELECT COUNT(*) FROM public.cards WHERE deck_id = decks.id)
WHERE  slug = 'cs189';
