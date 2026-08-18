/**
 * TopicService — rolls a class's cards up to its deck sections so weakness can
 * be read as a topic ("recursion is shaky") rather than a list of loose cards.
 *
 * A topic's score is the mean predicted recall across its cards, using the same
 * forgetting curve as the exam-day forecast. Cards you have never studied count
 * as 0 — a topic you have not opened is a topic you do not know, and hiding
 * that behind "no data" would be the one thing a readiness view must not do.
 *
 * Classes whose content is not backed by a sectioned deck have no topics to
 * roll up to; those report `supported: false` and the UI skips them rather
 * than inventing buckets.
 */
import { CardLearningService } from './CardLearningService';
import { ClassService } from './ClassService';
import { ContentService } from './ContentService';
import { DeckService } from './DeckService';
import { QueueService } from './QueueService';
import { InsightsService } from './InsightsService';

/** Below this a topic is called out as needing attention. */
export const TOPIC_WEAK_THRESHOLD = 40;
/** At or above this a topic is considered solid. */
export const TOPIC_STRONG_THRESHOLD = 75;

class TopicService {
  /**
   * Topic breakdown for one class.
   * @param {string} categoryId
   * @param {{ stateMap?: Map, examDates?: Object }} deps shared across classes
   */
  static async getClassTopics(categoryId, deps = {}) {
    const name = ContentService.formatCategoryName(categoryId);
    const deckId = await ContentService.getPresetDeckIdForSlug(categoryId);
    if (!deckId) return { categoryId, name, supported: false, topics: [] };

    const [sections, cards, stateMap] = await Promise.all([
      DeckService.listSections(deckId),
      QueueService.loadCardsForCategory(categoryId),
      deps.stateMap ? Promise.resolve(deps.stateMap) : CardLearningService.getStateMap(),
    ]);
    if (!sections.length || !cards.length) {
      return { categoryId, name, supported: false, topics: [] };
    }
    // Some preset decks are backed by bundled JSON rather than deck rows, so
    // their cards carry no section_id even though the deck has sections. One
    // "Other cards" tile for the whole class tells the user nothing — treat
    // that as unsupported instead.
    if (!cards.some((c) => c.section_id)) {
      return { categoryId, name, supported: false, topics: [] };
    }

    const examDates = deps.examDates || (await InsightsService.getExamDates());
    const examDate = examDates[categoryId]?.date || null;
    const now = new Date();
    const examAt = examDate ? new Date(`${examDate}T12:00:00`) : null;
    const examIsAhead = examAt && examAt > now;

    const byId = new Map(sections.map((s) => [s.id, s]));
    const buckets = new Map();

    for (const card of cards) {
      const section = card.section_id ? byId.get(card.section_id) : null;
      // Cards outside any section still belong to the class, so they get their
      // own bucket rather than quietly dropping out of the class's score.
      const key = section ? section.id : '__unsectioned__';
      if (!buckets.has(key)) {
        buckets.set(key, {
          sectionId: section ? section.id : null,
          title: section ? section.title : 'Other cards',
          position: section ? section.position ?? 0 : Number.MAX_SAFE_INTEGER,
          cards: [],
        });
      }
      buckets.get(key).cards.push(card);
    }

    const topics = [];
    for (const bucket of buckets.values()) {
      let recallSum = 0;
      let examRecallSum = 0;
      let studied = 0;

      for (const card of bucket.cards) {
        const state = CardLearningService.getEffectiveStateFromMap(card, categoryId, stateMap);
        recallSum += CardLearningService.predictedRecall(state, now);
        if (examIsAhead) examRecallSum += CardLearningService.predictedRecall(state, examAt);
        if (state?.reps) studied += 1;
      }

      const count = bucket.cards.length;
      topics.push({
        categoryId,
        sectionId: bucket.sectionId,
        title: bucket.title,
        position: bucket.position,
        cardCount: count,
        studiedCount: studied,
        recallPct: Math.round((recallSum / count) * 100),
        examRecallPct: examIsAhead ? Math.round((examRecallSum / count) * 100) : null,
        untouched: studied === 0,
      });
    }

    // Weakest first — the point of the grid is to show where to go next.
    topics.sort((a, b) => a.recallPct - b.recallPct || a.position - b.position);

    return { categoryId, name, supported: true, topics, examDate };
  }

  /** Topic breakdowns for every enrolled class, weakest class first. */
  static async getAllClassTopics() {
    const categories = await ClassService.getEnrollmentCategoryIds();
    if (!categories.length) return [];

    const [stateMap, examDates] = await Promise.all([
      CardLearningService.getStateMap(),
      InsightsService.getExamDates(),
    ]);

    const out = [];
    for (const cat of categories) {
      try {
        const result = await this.getClassTopics(cat, { stateMap, examDates });
        if (result.supported) out.push(result);
      } catch (e) {
        console.warn('[Topics] class error:', cat, e.message);
      }
    }

    const weakest = (c) => Math.min(...c.topics.map((t) => t.recallPct));
    return out.sort((a, b) => weakest(a) - weakest(b));
  }

  /** Which band a topic falls in — drives both colour and copy. */
  static bandFor(topic) {
    if (topic.untouched) return 'untouched';
    if (topic.recallPct >= TOPIC_STRONG_THRESHOLD) return 'strong';
    if (topic.recallPct < TOPIC_WEAK_THRESHOLD) return 'weak';
    return 'building';
  }
}

export { TopicService };
export default TopicService;
