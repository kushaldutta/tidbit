/**
 * InsightsService — exam dates and weak spots for Premium Study Insights.
 *
 * The old weighted "exam readiness" score lived here and was removed: it capped
 * out at 80, fell as the exam approached whether or not you had studied, and
 * counted a card as known from its stage label alone, ignoring how long ago you
 * last saw it. ForecastService answers the same question from the FSRS
 * forgetting curve instead.
 */
import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';
import { ClassService } from './ClassService';
import { CardLearningService } from './CardLearningService';
import { ContentService } from './ContentService';
import { DeckService } from './DeckService';
import { QueueService } from './QueueService';

class InsightsService {
  static async getExamDates() {
    if (!SUPABASE_CONFIGURED) return {};
    const userId = AuthService.getUserId();
    if (!userId) return {};
    const { data } = await supabase
      .from('profiles')
      .select('exam_dates')
      .eq('id', userId)
      .maybeSingle();
    return data?.exam_dates || {};
  }

  static examKey(classOrCategoryId) {
    return ClassService.getCategoryForClass(classOrCategoryId) || classOrCategoryId;
  }

  /**
   * @param {string[]|null} sectionIds Deck sections the exam actually covers.
   *   Pass null (or every section) for "the whole class" — null is stored in
   *   that case so a final keeps covering sections added to the deck later.
   */
  static async setExamDate(classOrCategoryId, examDateIso, label = 'Exam', sectionIds = null) {
    if (!SUPABASE_CONFIGURED) return false;
    const userId = AuthService.getUserId();
    if (!userId) return false;
    const key = this.examKey(classOrCategoryId);
    if (!key) return false;
    const current = await this.getExamDates();
    const next = {
      ...current,
      [key]: {
        date: examDateIso,
        label,
        sectionIds: sectionIds?.length ? sectionIds : null,
      },
    };
    const { error } = await supabase
      .from('profiles')
      .update({ exam_dates: next, updated_at: new Date().toISOString() })
      .eq('id', userId);
    return !error;
  }

  static async clearExamDate(classOrCategoryId) {
    if (!SUPABASE_CONFIGURED) return false;
    const userId = AuthService.getUserId();
    if (!userId) return false;
    const key = this.examKey(classOrCategoryId);
    const current = await this.getExamDates();
    if (!current[key]) return true;
    const next = { ...current };
    delete next[key];
    const { error } = await supabase
      .from('profiles')
      .update({ exam_dates: next, updated_at: new Date().toISOString() })
      .eq('id', userId);
    return !error;
  }

  static async getUpcomingExams() {
    const dates = await this.getExamDates();
    const cats = await ClassService.getEnrollmentCategoryIds();
    const now = Date.now();
    return cats
      .map((cat) => {
        const info = dates[cat];
        if (!info?.date) return null;
        const daysLeft = Math.ceil((new Date(`${info.date}T12:00:00`) - now) / 86400000);
        return {
          categoryId: cat,
          name: ContentService.formatCategoryName(cat),
          date: info.date,
          label: info.label || 'Exam',
          sectionIds: info.sectionIds || null,
          daysLeft,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }

  static async getWeakSpots(limit = 10) {
    const categories = await ClassService.getEnrollmentCategoryIds();
    const eligible = await QueueService.loadEligibleCards(categories);
    const cardIds = eligible.map((c) => c.id);
    const weakStates = await CardLearningService.getWeakSpots(limit, cardIds);
    if (!weakStates.length) return [];

    // Section titles for every enrolled class, so a weak card can name the
    // topic it belongs to and the row can drill that topic directly.
    const sectionTitles = new Map();
    await Promise.all(
      categories.map(async (cat) => {
        const deckId = await ContentService.getPresetDeckIdForSlug(cat);
        if (!deckId) return;
        const sections = await DeckService.listSections(deckId);
        sections.forEach((sec) => sectionTitles.set(sec.id, sec.title));
      }),
    );

    const spots = [];
    for (const state of weakStates) {
      const card = eligible.find((c) => c.id === state.contentId);
      if (!card) continue;
      const acc = state.totalSeen
        ? Math.round((state.totalCorrect / state.totalSeen) * 100)
        : 0;
      spots.push({
        tidbit: {
          id: card.id,
          text: card.back,
          term: card.front !== card.back ? card.front : null,
          category: card.categoryId,
        },
        sectionId: card.section_id || null,
        sectionTitle: card.section_id ? sectionTitles.get(card.section_id) || null : null,
        accuracy: acc,
        lapses: state.lapses,
        stage: state.stage,
      });
    }
    return spots;
  }
}

export { InsightsService };
export default InsightsService;
