/**
 * ForecastService — projects how much of a class you will actually recall on
 * exam day, under three different study behaviours.
 *
 * This answers the question a student actually has: "if I keep doing what I'm
 * doing, what do I walk into the exam knowing — and what would it take to fix
 * that?"
 *
 * Method
 * ------
 * Every card carries an FSRS memory state (stability + difficulty). FSRS's
 * forgetting curve turns that into a recall probability at any future date, so
 * the predicted recall for a class on day D is just the mean recall probability
 * across its cards on day D. Cards you have never studied count as 0 — they are
 * part of the exam whether or not you have opened them.
 *
 * Three scenarios are simulated day by day to the exam:
 * Only the material the exam actually covers is counted. A midterm scoped to
 * three of nine sections is forecast against those three; the rest of the class
 * is real work, but it is not what you are being tested on next.
 *
 *   stop        — you never study this class again (pure decay)
 *   current     — you keep your measured pace of the last two weeks
 *   recommended — the smallest daily pace that reaches the target by exam day
 *
 * Simulated reviews use expected values rather than dice: a review updates
 * stability to `p * S(good) + (1 - p) * S(again)`, which keeps the projection
 * deterministic — the same inputs always draw the same curve. Following FSRS,
 * p for a card you have seen is exactly its retrievability at the moment of
 * review: a card you are about to forget is a card you are about to fail. A
 * brand new card has no curve to read yet, so p falls back to your measured
 * accuracy in that class — which is also the only place accuracy belongs, since
 * for cards you have already studied it is baked into their stability already.
 *
 * Modelling p as a flat accuracy instead was tempting and wrong: it charges a
 * failure penalty even to a card reviewed yesterday, which made heavy study
 * score *worse* than light study.
 *
 * Each simulated day spends its budget the way the app's own planner does —
 * 60% on due reviews, 40% on new cards, with spillover when one side runs out.
 */
import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';
import { ClassService } from './ClassService';
import { CardLearningService } from './CardLearningService';
import { ContentService } from './ContentService';
import { QueueService } from './QueueService';
import { InsightsService } from './InsightsService';
import { retrievability, scheduleReview } from './fsrs';

const CONFIG = {
  TARGET_RECALL: 85,        // what "exam ready" means, in predicted recall %
  DEFAULT_HORIZON: 30,      // days to project when no exam date is set
  MAX_HORIZON: 120,         // beyond this the projection is fiction
  MAX_PACE: 150,            // ceiling for the recommended-pace search
  DUE_RATIO: 0.6,           // mirrors StudyPlanService's plan mix
  REVIEW_CEILING: 0.92,     // a card above this recall isn't worth a review today
  DEFAULT_ACCURACY: 0.85,   // assumed until the user has attempts to measure
  MIN_ACCURACY: 0.5,        // clamp so a bad week doesn't flatten the curve
  MAX_ACCURACY: 0.98,
  MAX_SIM_CARDS: 1500,      // sample above this to keep the sim snappy
  PACE_WINDOW: 14,          // days of history used to measure current pace
  ACCURACY_WINDOW: 30,      // days of history used to measure accuracy
  SERIES_POINTS: 32,        // points drawn per curve
};

/** Evenly spaced day numbers from 0..days inclusive, always including both ends. */
function samplePlan(days) {
  if (days <= CONFIG.SERIES_POINTS) {
    return Array.from({ length: days + 1 }, (_, i) => i);
  }
  const out = [];
  for (let i = 0; i < CONFIG.SERIES_POINTS; i++) {
    out.push(Math.round((i * days) / (CONFIG.SERIES_POINTS - 1)));
  }
  out[out.length - 1] = days;
  return out;
}

/** Recall probability for one simulated card on a given day. */
function recallOn(card, day) {
  if (!card.seen) return 0;
  return retrievability(day - card.lastDay, card.s);
}

function meanRecall(cards, day) {
  if (!cards.length) return 0;
  let sum = 0;
  for (let i = 0; i < cards.length; i++) sum += recallOn(cards[i], day);
  return (sum / cards.length) * 100;
}

/**
 * Apply one expected-value review to a simulated card.
 * Blends the "you got it" and "you blanked" branches by the probability of
 * recall at review time instead of sampling, so the curve is reproducible.
 */
function applyReview(card, day, baseAccuracy) {
  const elapsed = card.seen ? Math.max(0, day - card.lastDay) : 0;
  const prev = {
    stability: card.s,
    difficulty: card.d,
    elapsedDays: elapsed,
    reps: card.reps,
    lapses: card.lapses,
  };
  // A card you can still recall is a card you are about to pass. A brand new
  // card has no curve yet, so lean on the user's measured accuracy.
  const p = card.seen ? retrievability(elapsed, card.s) : baseAccuracy;

  const good = scheduleReview(prev, 3);
  const again = scheduleReview(prev, 1);

  card.s = p * good.stability + (1 - p) * again.stability;
  card.d = p * good.difficulty + (1 - p) * again.difficulty;
  card.lapses += 1 - p;
  card.reps += 1;
  card.lastDay = day;
  card.seen = true;
}

/** Spend one day's study budget across due reviews and new cards. */
function studyDay(cards, day, pace, accuracy) {
  const dueQueue = [];
  const newQueue = [];
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    if (!card.seen) {
      if (newQueue.length < pace) newQueue.push(i);
      continue;
    }
    const r = recallOn(card, day);
    if (r < CONFIG.REVIEW_CEILING) dueQueue.push({ i, r });
  }
  // Weakest memories first — that is what the review queue serves up.
  dueQueue.sort((a, b) => a.r - b.r);

  let reviewCount = Math.min(dueQueue.length, Math.round(pace * CONFIG.DUE_RATIO));
  let newCount = Math.min(newQueue.length, pace - reviewCount);
  if (reviewCount + newCount < pace) {
    reviewCount = Math.min(dueQueue.length, pace - newCount);
  }

  for (let k = 0; k < reviewCount; k++) applyReview(cards[dueQueue[k].i], day, accuracy);
  for (let k = 0; k < newCount; k++) applyReview(cards[newQueue[k]], day, accuracy);
}

/**
 * Run one scenario.
 * @returns {{ final: number, series: Array<{day:number,pct:number}> }}
 */
function runScenario(baseCards, days, pace, accuracy, { collect = true } = {}) {
  const cards = baseCards.map((c) => ({ ...c }));
  const sampleDays = collect ? new Set(samplePlan(days)) : null;
  const series = [];

  if (collect && sampleDays.has(0)) series.push({ day: 0, pct: meanRecall(cards, 0) });

  for (let day = 1; day <= days; day++) {
    if (pace > 0) studyDay(cards, day, pace, accuracy);
    if (collect && sampleDays.has(day)) {
      series.push({ day, pct: meanRecall(cards, day) });
    }
  }

  return { final: meanRecall(cards, days), series };
}

/**
 * Coarse-to-fine ladder of candidate paces.
 * Deliberately not a binary search: past a point, extra daily reviews land on
 * cards that are still fresh, where FSRS grants almost no stability but a lapse
 * still costs plenty — so final recall is *almost* but not reliably monotonic in
 * pace. Scanning real candidates and keeping the best is robust to that; each
 * scenario costs about a millisecond, so there is nothing to save by guessing.
 */
const PACE_LADDER = [
  0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 65, 80, 100, 125, 150,
];

/**
 * Smallest daily pace that clears `target` by exam day.
 * @returns {{ pace: number, achievable: boolean, best: number }}
 */
function solveForPace(baseCards, days, accuracy, target) {
  let best = -1;
  let bestPace = CONFIG.MAX_PACE;
  let hitRung = -1;

  for (let i = 0; i < PACE_LADDER.length; i++) {
    const pace = PACE_LADDER[i];
    const { final } = runScenario(baseCards, days, pace, accuracy, { collect: false });
    if (final > best) {
      best = final;
      bestPace = pace;
    }
    if (final >= target) {
      hitRung = i;
      break;
    }
  }

  if (hitRung < 0) {
    // Even the ceiling falls short — report the pace that got closest.
    return { pace: bestPace, achievable: false, best: Math.round(best) };
  }

  // Refine: walk down from the rung that cleared the bar toward the one below
  // it to find the true minimum, so we never over-prescribe.
  const lower = hitRung === 0 ? 0 : PACE_LADDER[hitRung - 1] + 1;
  let answer = PACE_LADDER[hitRung];
  for (let pace = lower; pace < answer; pace++) {
    const { final } = runScenario(baseCards, days, pace, accuracy, { collect: false });
    if (final >= target) {
      answer = pace;
      break;
    }
  }
  return { pace: answer, achievable: true, best: Math.round(best) };
}

class ForecastService {
  /** Attempts for the accuracy/pace windows — one query, reused across classes. */
  static async loadRecentAttempts() {
    if (!SUPABASE_CONFIGURED) return [];
    const userId = AuthService.getUserId();
    if (!userId) return [];
    const since = new Date();
    since.setDate(since.getDate() - CONFIG.ACCURACY_WINDOW);
    const { data, error } = await supabase
      .from('card_attempts')
      .select('card_id, was_correct, attempted_at')
      .eq('user_id', userId)
      .gte('attempted_at', since.toISOString())
      .order('attempted_at', { ascending: false })
      .limit(5000);
    if (error) {
      console.warn('[Forecast] attempts load error:', error.message);
      return [];
    }
    return data || [];
  }

  /** Turn real learning state into the lightweight shape the simulation mutates. */
  static buildSimCards(cards, categoryId, stateMap) {
    const now = Date.now();
    const pool = cards.length > CONFIG.MAX_SIM_CARDS
      ? cards.filter((_, i) => i % Math.ceil(cards.length / CONFIG.MAX_SIM_CARDS) === 0)
      : cards;

    return pool.map((card) => {
      const st = CardLearningService.getEffectiveStateFromMap(card, categoryId, stateMap);
      if (!CardLearningService.hasBeenReviewed(st)) {
        return { s: 0, d: 0, reps: 0, lapses: 0, lastDay: 0, seen: false };
      }
      return {
        s: st.stability,
        d: st.difficulty || 5,
        // A reviewed card always has at least one rep, whatever the stored
        // value says — a 0 here would send the simulation down the
        // first-encounter branch and understate the card.
        reps: Math.max(1, st.reps || 0),
        lapses: st.lapses || 0,
        // Negative: the last review happened this many days before today.
        lastDay: -(now - new Date(st.lastReviewAt).getTime()) / 86400000,
        seen: true,
      };
    });
  }

  /**
   * Forecast for one class.
   * Pass `deps` when forecasting several classes so the shared queries run once.
   */
  static async getClassForecast(categoryId, deps = {}) {
    const stateMap = deps.stateMap || (await CardLearningService.getStateMap());
    const attempts = deps.attempts || (await this.loadRecentAttempts());
    const examDates = deps.examDates || (await InsightsService.getExamDates());

    // Load the full deck so the exam-scope filter below works against every card,
    // not just the subset the user has enabled for notifications/study.
    const allCards = await QueueService.loadCardsForCategory(categoryId, { bypassStudyScope: true });
    const name = ContentService.formatCategoryName(categoryId);
    const examInfo = examDates[categoryId];

    // Narrow to the sections this exam covers. If the scope matches nothing —
    // a stale section id, or a class whose cards carry no section at all — fall
    // back to the whole class rather than forecasting against zero cards.
    const scopeIds = examInfo?.sectionIds?.length ? new Set(examInfo.sectionIds) : null;
    const scoped = scopeIds ? allCards.filter((c) => scopeIds.has(c.section_id)) : [];
    const cards = scoped.length ? scoped : allCards;
    const examScoped = scopeIds != null && scoped.length > 0;
    const examDate = examInfo?.date || null;
    const daysUntilExam = examDate
      ? Math.ceil((new Date(`${examDate}T12:00:00`).getTime() - Date.now()) / 86400000)
      : null;
    const examPassed = daysUntilExam != null && daysUntilExam < 0;

    if (!cards.length) {
      return {
        categoryId, name, examDate, examLabel: examInfo?.label || null,
        daysUntilExam, examPassed, totalCards: 0, empty: true,
      };
    }

    const horizon = !examDate || examPassed
      ? CONFIG.DEFAULT_HORIZON
      : Math.min(Math.max(daysUntilExam, 1), CONFIG.MAX_HORIZON);

    const simCards = this.buildSimCards(cards, categoryId, stateMap);
    const studiedInSample = simCards.filter((c) => c.seen).length;
    // buildSimCards may thin a very large deck, so scale the count back up to
    // the real deck before showing it to anyone.
    const studiedCards = Math.round((studiedInSample / simCards.length) * cards.length);

    // Accuracy and pace, measured against this class's cards only.
    const cardIds = new Set(cards.map((c) => c.id));
    const mine = attempts.filter((a) => cardIds.has(a.card_id));
    const accuracy = mine.length >= 10
      ? Math.min(
          CONFIG.MAX_ACCURACY,
          Math.max(CONFIG.MIN_ACCURACY, mine.filter((a) => a.was_correct).length / mine.length),
        )
      : CONFIG.DEFAULT_ACCURACY;

    const paceCutoff = Date.now() - CONFIG.PACE_WINDOW * 86400000;
    const recent = mine.filter((a) => new Date(a.attempted_at).getTime() >= paceCutoff);
    const currentPace = Math.round(recent.length / CONFIG.PACE_WINDOW);

    const stop = runScenario(simCards, horizon, 0, accuracy);
    const current = currentPace > 0
      ? runScenario(simCards, horizon, currentPace, accuracy)
      : stop;
    const solved = solveForPace(simCards, horizon, accuracy, CONFIG.TARGET_RECALL);
    const recommendedPace = Math.max(solved.pace, 1);
    const recommended = runScenario(simCards, horizon, recommendedPace, accuracy);

    const today = meanRecall(simCards, 0);

    return {
      categoryId,
      name,
      examDate,
      examLabel: examInfo?.label || null,
      examSectionIds: examInfo?.sectionIds || null,
      daysUntilExam,
      examPassed,
      horizon,
      totalCards: cards.length,
      classCards: allCards.length,
      // True when the forecast is running against a subset of the class.
      examScoped,
      studiedCards,
      coveragePct: Math.round((studiedInSample / simCards.length) * 100),
      accuracy: Math.round(accuracy * 100),
      today: Math.round(today),
      currentPace,
      recommendedPace,
      targetPct: CONFIG.TARGET_RECALL,
      achievable: solved.achievable,
      series: {
        stop: stop.series,
        current: current.series,
        recommended: recommended.series,
      },
      finals: {
        stop: Math.round(stop.final),
        current: Math.round(current.final),
        recommended: Math.round(recommended.final),
      },
      // True when "current pace" is the same line as "stop" — the UI hides the
      // duplicate curve and says so plainly instead of drawing two identical
      // lines on top of each other.
      idle: currentPace === 0,
    };
  }

  /** Forecasts for every enrolled class, soonest exam first. */
  static async getAllForecasts() {
    const categories = await ClassService.getEnrollmentCategoryIds();
    if (!categories.length) return [];

    const [stateMap, attempts, examDates] = await Promise.all([
      CardLearningService.getStateMap(),
      this.loadRecentAttempts(),
      InsightsService.getExamDates(),
    ]);

    const out = [];
    for (const cat of categories) {
      try {
        out.push(await this.getClassForecast(cat, { stateMap, attempts, examDates }));
      } catch (e) {
        console.warn('[Forecast] class error:', cat, e.message);
      }
    }

    // Classes with a real exam come first, soonest deadline leading.
    return out.sort((a, b) => {
      const aDays = a.examDate && !a.examPassed ? a.daysUntilExam : Infinity;
      const bDays = b.examDate && !b.examPassed ? b.daysUntilExam : Infinity;
      if (aDays !== bDays) return aDays - bDays;
      return (a.finals?.current ?? 100) - (b.finals?.current ?? 100);
    });
  }
}

export { ForecastService, CONFIG as FORECAST_CONFIG };
export default ForecastService;
