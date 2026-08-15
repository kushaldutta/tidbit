/**
 * InsightsService — Premium Exam Readiness + Weak Spots (v2.3 minimal).
 */
import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';
import { ClassService } from './ClassService';
import { CardLearningService } from './CardLearningService';
import { ContentService } from './ContentService';
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

  static async setExamDate(classOrCategoryId, examDateIso, label = 'Exam') {
    if (!SUPABASE_CONFIGURED) return false;
    const userId = AuthService.getUserId();
    if (!userId) return false;
    const key = this.examKey(classOrCategoryId);
    if (!key) return false;
    const current = await this.getExamDates();
    const next = {
      ...current,
      [key]: { date: examDateIso, label },
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
          daysLeft,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }

  static async getClassReadiness(categoryId) {
    const cards = await QueueService.loadCardsForCategory(categoryId);
    if (!cards.length) {
      return { categoryId, score: 0, masteryPct: 0, overdue: 0, total: 0, accuracy7d: null };
    }

    let mastered = 0;
    let overdue = 0;
    const cardIds = cards.map((c) => c.id);

    for (const card of cards) {
      const state = await CardLearningService.getState(card.id);
      if (!state) continue;
      if (state.stage === 'mastered' || state.stage === 'recall') mastered += 1;
      if (state.dueAt && new Date(state.dueAt) < new Date()) overdue += 1;
    }

    const masteryPct = Math.round((mastered / cards.length) * 100);
    const overduePenalty = Math.min(30, Math.round((overdue / Math.max(cards.length, 1)) * 100 * 0.3));

    let accuracy7d = null;
    if (SUPABASE_CONFIGURED) {
      const userId = AuthService.getUserId();
      if (userId) {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const { data: attempts } = await supabase
          .from('card_attempts')
          .select('was_correct, card_id')
          .eq('user_id', userId)
          .in('card_id', cardIds)
          .gte('attempted_at', weekAgo.toISOString());
        if (attempts?.length) {
          const correct = attempts.filter((a) => a.was_correct).length;
          accuracy7d = Math.round((correct / attempts.length) * 100);
        }
      }
    }

    const examDates = await this.getExamDates();
    const examInfo = examDates[categoryId];
    let examBoost = 0;
    if (examInfo?.date) {
      const days = Math.max(0, (new Date(examInfo.date) - new Date()) / 86400000);
      if (days <= 7) examBoost = -10;
      else if (days <= 14) examBoost = -5;
    }

    const accuracyComponent = accuracy7d != null ? accuracy7d * 0.3 : masteryPct * 0.2;
    const score = Math.max(
      0,
      Math.min(
        100,
        Math.round(masteryPct * 0.5 + accuracyComponent - overduePenalty + examBoost),
      ),
    );

    return {
      categoryId,
      name: ContentService.formatCategoryName(categoryId),
      score,
      masteryPct,
      overdue,
      total: cards.length,
      accuracy7d,
      examDate: examInfo?.date || null,
      examLabel: examInfo?.label || null,
    };
  }

  static async getAllReadiness() {
    const categories = await ClassService.getEnrollmentCategoryIds();
    if (!categories.length) return [];
    const results = [];
    for (const cat of categories) {
      results.push(await this.getClassReadiness(cat));
    }
    return results.sort((a, b) => a.score - b.score);
  }

  static async getWeakSpots(limit = 10) {
    const categories = await ClassService.getEnrollmentCategoryIds();
    const eligible = await QueueService.loadEligibleCards(categories);
    const cardIds = eligible.map((c) => c.id);
    const weakStates = await CardLearningService.getWeakSpots(limit, cardIds);

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
