import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';
import { StorageService } from './StorageService';

// Maps class IDs → content category IDs in ContentService.
// Only includes classes that have matching preset content.
const CLASS_TO_CATEGORY = {
  // UC Berkeley
  'uc-berkeley:math53:fa26':   'math53',
  'uc-berkeley:math54:fa26':   'math-54',
  'uc-berkeley:math51:fa26':   'math51',
  'uc-berkeley:math52:fa26':   'math52',
  'uc-berkeley:math128a:fa26': 'math128a',
  'uc-berkeley:cs61a:fa26':    'cs-61a',
  'uc-berkeley:cs61b:fa26':    'cs61b',
  'uc-berkeley:cs61c:fa26':    'cs61c',
  'uc-berkeley:cs70:fa26':     'cs70',
  'uc-berkeley:cs188:fa26':    'cs188',
  'uc-berkeley:cs161:fa26':    'cs161',
  'uc-berkeley:data8:fa26':    'data-8',
  'uc-berkeley:data100:fa26':  'data100',
  'uc-berkeley:econ1:fa26':    'econ-1',
  'uc-berkeley:econ100a:fa26': 'econ100a',
  'uc-berkeley:econ100b:fa26': 'econ100b',
  'uc-berkeley:bio1a:fa26':    'science',
  'uc-berkeley:bio1b:fa26':    'science',
  // High School AP
  'hs-ap:ap_ush:ap26':         'history',
  'hs-ap:ap_wh:ap26':          'history',
  'hs-ap:ap_euro:ap26':        'history',
  'hs-ap:ap_bio:ap26':         'science',
  'hs-ap:ap_chem:ap26':        'science',
  'hs-ap:ap_phys1:ap26':       'science',
  'hs-ap:ap_phys2:ap26':       'science',
  'hs-ap:ap_phys_cm:ap26':     'science',
  'hs-ap:ap_phys_ce:ap26':     'science',
  'hs-ap:ap_enviro:ap26':      'science',
};

// Fallback class list used when the DB isn't seeded yet or network is unavailable.
const FALLBACK_CLASSES = {
  'uc-berkeley': [
    { id: 'uc-berkeley:math1a:fa26',   code: 'MATH 1A',    title: 'Calculus',                                          subject: 'Mathematics' },
    { id: 'uc-berkeley:math1b:fa26',   code: 'MATH 1B',    title: 'Calculus',                                          subject: 'Mathematics' },
    { id: 'uc-berkeley:math53:fa26',   code: 'MATH 53',    title: 'Multivariable Calculus',                            subject: 'Mathematics' },
    { id: 'uc-berkeley:math54:fa26',   code: 'MATH 54',    title: 'Linear Algebra and Differential Equations',         subject: 'Mathematics' },
    { id: 'uc-berkeley:math55:fa26',   code: 'MATH 55',    title: 'Discrete Mathematics',                              subject: 'Mathematics' },
    { id: 'uc-berkeley:cs61a:fa26',    code: 'CS 61A',     title: 'Structure and Interpretation of Computer Programs', subject: 'Computer Science' },
    { id: 'uc-berkeley:cs61b:fa26',    code: 'CS 61B',     title: 'Data Structures and Algorithms',                    subject: 'Computer Science' },
    { id: 'uc-berkeley:cs61c:fa26',    code: 'CS 61C',     title: 'Great Ideas in Computer Architecture',              subject: 'Computer Science' },
    { id: 'uc-berkeley:cs70:fa26',     code: 'CS 70',      title: 'Discrete Mathematics and Probability Theory',       subject: 'Computer Science' },
    { id: 'uc-berkeley:eecs16a:fa26',  code: 'EECS 16A',   title: 'Designing Information Devices and Systems I',       subject: 'EECS' },
    { id: 'uc-berkeley:eecs16b:fa26',  code: 'EECS 16B',   title: 'Designing Information Devices and Systems II',      subject: 'EECS' },
    { id: 'uc-berkeley:data8:fa26',    code: 'DATA 8',     title: 'Foundations of Data Science',                       subject: 'Data Science' },
    { id: 'uc-berkeley:data100:fa26',  code: 'DATA 100',   title: 'Principles and Techniques of Data Science',         subject: 'Data Science' },
    { id: 'uc-berkeley:stat134:fa26',  code: 'STAT 134',   title: 'Concepts of Probability',                           subject: 'Statistics' },
    { id: 'uc-berkeley:phys7a:fa26',   code: 'PHYS 7A',    title: 'Physics for Scientists and Engineers I',            subject: 'Physics' },
    { id: 'uc-berkeley:phys7b:fa26',   code: 'PHYS 7B',    title: 'Physics for Scientists and Engineers II',           subject: 'Physics' },
    { id: 'uc-berkeley:chem1a:fa26',   code: 'CHEM 1A',    title: 'General Chemistry',                                 subject: 'Chemistry' },
    { id: 'uc-berkeley:chem1b:fa26',   code: 'CHEM 1B',    title: 'General Chemistry',                                 subject: 'Chemistry' },
    { id: 'uc-berkeley:bio1a:fa26',    code: 'BIO 1A',     title: 'General Biology',                                   subject: 'Biology' },
    { id: 'uc-berkeley:bio1b:fa26',    code: 'BIO 1B',     title: 'General Biology',                                   subject: 'Biology' },
    { id: 'uc-berkeley:econ1:fa26',    code: 'ECON 1',     title: 'Introduction to Economics',                         subject: 'Economics' },
    { id: 'uc-berkeley:econ100a:fa26', code: 'ECON 100A',  title: 'Microeconomic Theory',                              subject: 'Economics' },
    { id: 'uc-berkeley:econ100b:fa26', code: 'ECON 100B',  title: 'Macroeconomic Theory',                              subject: 'Economics' },
    { id: 'uc-berkeley:mcb102:fa26',   code: 'MCB 102',    title: 'Biochemistry and Molecular Biology',                subject: 'Molecular Biology' },
    { id: 'uc-berkeley:psych1:fa26',   code: 'PSYCH 1',    title: 'General Psychology',                                subject: 'Psychology' },
  ],
  'high-school-ap': [
    { id: 'hs-ap:ap_calc_ab:ap26',  code: 'AP Calc AB',      title: 'AP Calculus AB',                        subject: 'Mathematics' },
    { id: 'hs-ap:ap_calc_bc:ap26',  code: 'AP Calc BC',      title: 'AP Calculus BC',                        subject: 'Mathematics' },
    { id: 'hs-ap:ap_stats:ap26',    code: 'AP Stats',         title: 'AP Statistics',                         subject: 'Mathematics' },
    { id: 'hs-ap:ap_csa:ap26',      code: 'AP CS A',          title: 'AP Computer Science A',                 subject: 'Computer Science' },
    { id: 'hs-ap:ap_csp:ap26',      code: 'AP CS P',          title: 'AP Computer Science Principles',        subject: 'Computer Science' },
    { id: 'hs-ap:ap_chem:ap26',     code: 'AP Chemistry',     title: 'AP Chemistry',                          subject: 'Chemistry' },
    { id: 'hs-ap:ap_bio:ap26',      code: 'AP Biology',       title: 'AP Biology',                            subject: 'Biology' },
    { id: 'hs-ap:ap_phys1:ap26',    code: 'AP Physics 1',     title: 'AP Physics 1: Algebra-Based',           subject: 'Physics' },
    { id: 'hs-ap:ap_phys2:ap26',    code: 'AP Physics 2',     title: 'AP Physics 2: Algebra-Based',           subject: 'Physics' },
    { id: 'hs-ap:ap_phys_cm:ap26',  code: 'AP Physics C: M',  title: 'AP Physics C: Mechanics',               subject: 'Physics' },
    { id: 'hs-ap:ap_phys_ce:ap26',  code: 'AP Physics C: E',  title: 'AP Physics C: Electricity & Magnetism', subject: 'Physics' },
    { id: 'hs-ap:ap_ush:ap26',      code: 'AP US History',    title: 'AP United States History',              subject: 'History' },
    { id: 'hs-ap:ap_wh:ap26',       code: 'AP World History', title: 'AP World History: Modern',              subject: 'History' },
    { id: 'hs-ap:ap_euro:ap26',     code: 'AP Euro',          title: 'AP European History',                   subject: 'History' },
    { id: 'hs-ap:ap_gov:ap26',      code: 'AP Gov',           title: 'AP US Government and Politics',         subject: 'Social Studies' },
    { id: 'hs-ap:ap_macro:ap26',    code: 'AP Macro',         title: 'AP Macroeconomics',                     subject: 'Economics' },
    { id: 'hs-ap:ap_micro:ap26',    code: 'AP Micro',         title: 'AP Microeconomics',                     subject: 'Economics' },
    { id: 'hs-ap:ap_psych:ap26',    code: 'AP Psychology',    title: 'AP Psychology',                         subject: 'Psychology' },
    { id: 'hs-ap:ap_eng_lang:ap26', code: 'AP Lang',          title: 'AP English Language and Composition',   subject: 'English' },
    { id: 'hs-ap:ap_eng_lit:ap26',  code: 'AP Lit',           title: 'AP English Literature and Composition', subject: 'English' },
    { id: 'hs-ap:ap_span:ap26',     code: 'AP Spanish',       title: 'AP Spanish Language and Culture',       subject: 'Language' },
    { id: 'hs-ap:ap_hug:ap26',      code: 'AP Human Geo',     title: 'AP Human Geography',                    subject: 'Geography' },
    { id: 'hs-ap:ap_enviro:ap26',   code: 'AP Enviro',        title: 'AP Environmental Science',              subject: 'Science' },
    { id: 'hs-ap:ap_art_hist:ap26', code: 'AP Art History',   title: 'AP Art History',                        subject: 'Art' },
  ],
};

class ClassService {
  /**
   * Fetch all classes for a school, falling back to hardcoded list if DB is
   * unavailable or the table hasn't been seeded yet.
   */
  static async listBySchool(schoolId) {
    if (SUPABASE_CONFIGURED) {
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('id, code, title, subject')
          .eq('school_id', schoolId)
          .order('subject')
          .order('code');
        if (!error && data && data.length > 0) return data;
      } catch (e) {
        console.warn('[ClassService] DB fetch failed, using fallback:', e.message);
      }
    }
    return FALLBACK_CLASSES[schoolId] || [];
  }

  /** Get class IDs the current user has already joined. */
  static async getMyClassIds() {
    if (!SUPABASE_CONFIGURED) return [];
    const userId = AuthService.getUserId();
    if (!userId) return [];
    const { data, error } = await supabase
      .from('class_memberships')
      .select('class_id')
      .eq('user_id', userId);
    if (error) {
      console.warn('[ClassService] getMyClassIds error:', error.message);
      return [];
    }
    return (data || []).map((r) => r.class_id);
  }

  /** Join one or more classes (idempotent). */
  static async joinClasses(classIds) {
    if (!SUPABASE_CONFIGURED || !classIds.length) return;
    const userId = AuthService.getUserId();
    if (!userId) return;
    const rows = classIds.map((class_id) => ({ user_id: userId, class_id }));
    const { error } = await supabase
      .from('class_memberships')
      .upsert(rows, { onConflict: 'user_id,class_id' });
    if (error) throw error;
  }

  /** Leave a class. */
  static async leaveClass(classId) {
    if (!SUPABASE_CONFIGURED) return;
    const userId = AuthService.getUserId();
    if (!userId) return;
    const { error } = await supabase
      .from('class_memberships')
      .delete()
      .eq('user_id', userId)
      .eq('class_id', classId);
    if (error) throw error;
  }

  /**
   * Returns the content category IDs (used by ContentService / StorageService)
   * that correspond to the given class IDs.
   */
  static categoryIdsForClasses(classIds) {
    const cats = new Set();
    classIds.forEach((id) => {
      if (CLASS_TO_CATEGORY[id]) cats.add(CLASS_TO_CATEGORY[id]);
    });
    return [...cats];
  }

  /**
   * After joining/leaving classes, sync the selectedCategories in AsyncStorage
   * so the Categories tab and notification system reflect the enrollment.
   * - Adds categories for newly enrolled classes.
   * - Removes categories that no longer have any enrolled class backing them,
   *   unless they were manually added by the user (we keep a union approach:
   *   we only add, never remove, so the user's manual picks are preserved).
   */
  static async syncCategoriesToEnrollment(enrolledClassIds) {
    const newCats = this.categoryIdsForClasses(enrolledClassIds);
    if (newCats.length === 0) return;
    const existing = (await StorageService.getSelectedCategories()) || [];
    const merged = Array.from(new Set([...existing, ...newCats]));
    await StorageService.setSelectedCategories(merged);
  }
}

export { ClassService };
export default ClassService;
