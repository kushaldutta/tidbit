/**
 * Lightweight FSRS-4.5 scheduler (no external deps).
 * Ratings: 1=Again, 2=Hard, 3=Good, 4=Easy
 */

const W = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575,
  0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898,
];

const DECAY = -0.5;
const FACTOR = 19 / 81;

function constrainDifficulty(d) {
  return Math.min(Math.max(d, 1), 10);
}

function forgettingCurve(elapsedDays, stability) {
  if (stability <= 0) return 0;
  return Math.pow(1 + (FACTOR * elapsedDays) / stability, DECAY);
}

/**
 * Probability of recalling a card `elapsedDays` after its last review.
 * Exported for the exam-day forecast, which decays every card forward in time
 * rather than only asking whether it is due.
 */
export function retrievability(elapsedDays, stability) {
  return forgettingCurve(Math.max(0, elapsedDays), stability);
}

function nextInterval(stability, desiredRetention = 0.9) {
  if (stability <= 0) return 1;
  const interval = (stability / FACTOR) * (Math.pow(desiredRetention, 1 / DECAY) - 1);
  return Math.max(1, Math.round(interval));
}

function initDifficulty(rating) {
  return constrainDifficulty(W[4] - (rating - 3) * W[5]);
}

function initStability(rating) {
  return Math.max(W[rating - 1], 0.1);
}

function nextDifficulty(d, rating) {
  const deltaD = -W[6] * (rating - 3);
  const next = d + deltaD;
  const meanReversion = W[7] * initDifficulty(3);
  return constrainDifficulty(W[8] * next + (1 - W[8]) * meanReversion);
}

function nextRecallStability(d, s, r, rating) {
  const hardPenalty = rating === 2 ? W[15] : 1;
  const easyBonus = rating === 4 ? W[16] : 1;
  if (rating === 1) {
    return W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r));
  }
  return s * (1 + Math.exp(W[9]) * (11 - d) * Math.pow(s, -W[10]) * (Math.exp((1 - r) * W[14]) - 1) * hardPenalty * easyBonus);
}

function nextForgetStability(d, s, r) {
  return W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r));
}

/**
 * @param {{ stability: number, difficulty: number, elapsedDays: number, reps: number, lapses: number }} card
 * @param {1|2|3|4} rating
 * @param {Date} [now]
 * @returns {{ stability: number, difficulty: number, intervalDays: number, dueAt: Date, lapses: number, reps: number }}
 */
export function scheduleReview(card, rating, now = new Date()) {
  const prev = {
    stability: card.stability || 0,
    difficulty: card.difficulty || 0,
    elapsedDays: card.elapsedDays || 0,
    reps: card.reps || 0,
    lapses: card.lapses || 0,
  };

  let stability;
  let difficulty;
  let lapses = prev.lapses;
  let reps = prev.reps + 1;

  if (prev.reps === 0) {
    stability = initStability(rating);
    difficulty = initDifficulty(rating);
    if (rating === 1) lapses += 1;
  } else if (rating === 1) {
    stability = nextForgetStability(prev.difficulty, prev.stability, 0.9);
    difficulty = nextDifficulty(prev.difficulty, rating);
    lapses += 1;
  } else {
    const retrievability = forgettingCurve(prev.elapsedDays, prev.stability);
    stability = nextRecallStability(prev.difficulty, prev.stability, retrievability, rating);
    difficulty = nextDifficulty(prev.difficulty, rating);
  }

  const intervalDays = rating === 1 ? 0 : nextInterval(stability);
  const dueAt = new Date(now);
  if (rating === 1) {
    dueAt.setMinutes(dueAt.getMinutes() + 10);
  } else {
    dueAt.setDate(dueAt.getDate() + intervalDays);
  }

  return {
    stability,
    difficulty,
    intervalDays,
    dueAt,
    lapses,
    reps,
  };
}

/** Map app feedback to FSRS rating */
export function ratingFromReview({ wasCorrect, confidence, mode }) {
  if (!wasCorrect) return 1;
  if (mode === 'notification') return 3;
  if (confidence >= 4) return 4;
  if (confidence >= 3) return 3;
  if (confidence >= 2) return 2;
  return 3;
}

export const STAGES = ['new', 'introduced', 'recognition', 'recall', 'mastered'];

export function stageIndex(stage) {
  const i = STAGES.indexOf(stage);
  return i >= 0 ? i : 0;
}

export function advanceStage(currentStage, { wasCorrect, mode }) {
  const idx = stageIndex(currentStage);
  if (!wasCorrect) {
    if (idx >= 3) return 'recall';
    if (idx >= 1) return STAGES[Math.max(1, idx - 1)];
    // A new card the user says they don't know is still introduced by the
    // encounter, so it enters the ladder and the review queue either way.
    return 'introduced';
  }

  // Self-reported modes only ever introduce a card: a user tapping "I knew it"
  // must not be able to mark it known without answering a real question. They
  // move new -> introduced and then hold, leaving promotion to the quiz modes.
  if (mode === 'notification' || mode === 'session' || mode === 'group_study') {
    return idx === 0 ? 'introduced' : STAGES[idx];
  }
  if (mode === 'quiz' || mode === 'match' || mode === 'speed_run') {
    // Recognition-level modes: push toward recognition, then one step at a time
    if (idx <= 1) return 'recognition';
    return STAGES[Math.min(idx + 1, STAGES.length - 1)];
  }
  if (mode === 'recall' || mode === 'recall_override' || mode === 'daily_challenge') {
    // Full recall: jump straight to recall stage if not already past it
    return idx <= 2 ? 'recall' : STAGES[Math.max(idx, 3)];
  }
  return STAGES[Math.min(idx + 1, STAGES.length - 1)];
}

export function isMasteredStage(stage, intervalDays, correctStreak) {
  return stage === 'mastered' || (stage === 'recall' && intervalDays >= 21 && correctStreak >= 3);
}
