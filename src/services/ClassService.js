import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';
import { StorageService } from './StorageService';
import { AP_CATEGORY_BY_ID, AP_CLASS_TO_CATEGORY, apCourseHasLiveContent } from '../config/courseCatalog';

// Maps class IDs → content category IDs in ContentService.
// Only includes classes that have matching preset content.
const CLASS_TO_CATEGORY = {
  // UC Berkeley — only classes with dedicated tidbit content
  'uc-berkeley:math53:fa26':   'math53',
  'uc-berkeley:math54:fa26':   'math-54',
  'uc-berkeley:math55:fa26':   'math55',
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
  'uc-berkeley:psych1:fa26':      'psych1',
  'uc-berkeley:mcb102:fa26':      'mcb102',
  'uc-berkeley:phys7a:fa26':      'phys7a',
  'uc-berkeley:phys7b:fa26':      'phys7b',
  'uc-berkeley:physics137a:fa26': 'physics137a',
  'uc-berkeley:nuc150:fa26':      'nuc150',
  'uc-berkeley:nuc155:fa26':      'nuc155',
  'uc-berkeley:stat134:fa26':     'stat134',
  'uc-berkeley:agrs28:fa26':      'agrs28',
  'uc-berkeley:bio1a:fa26':       'bio1a',
  'uc-berkeley:bio1b:fa26':       'bio1b',
  'uc-berkeley:chem1a:fa26':      'chem1a',
  'uc-berkeley:chem1b:fa26':      'chem1b',
  'uc-berkeley:eecs16a:fa26':     'eecs16a',
  'uc-berkeley:eecs16b:fa26':     'eecs16b',
  'uc-berkeley:eps7:fa26':        'eps7',
  'uc-berkeley:math185:fa26':     'math185',
  ...AP_CLASS_TO_CATEGORY,
};

/** Parse trailing course number (and letter suffix) for numeric sort, e.g. MATH 128A → 128. */
function courseNumberSortKey(code) {
  const match = String(code).match(/(\d+)\s*([A-Za-z]*)$/);
  if (!match) return { num: Number.MAX_SAFE_INTEGER, suffix: code, code };
  return { num: parseInt(match[1], 10), suffix: (match[2] || '').toUpperCase(), code };
}

function compareClassesByCourseCode(a, b) {
  const ka = courseNumberSortKey(a.code);
  const kb = courseNumberSortKey(b.code);
  if (ka.num !== kb.num) return ka.num - kb.num;
  if (ka.suffix !== kb.suffix) return ka.suffix.localeCompare(kb.suffix);
  return ka.code.localeCompare(kb.code);
}

/** Sort by subject (A–Z), then course number ascending within each subject. */
function sortClassesForDisplay(classes) {
  const bySubject = {};
  classes.forEach((c) => {
    const subject = c.subject || 'Other';
    if (!bySubject[subject]) bySubject[subject] = [];
    bySubject[subject].push(c);
  });
  return Object.keys(bySubject)
    .sort((a, b) => a.localeCompare(b))
    .flatMap((subject) => bySubject[subject].sort(compareClassesByCourseCode));
}

// Fallback class list used when the DB isn't seeded yet or network is unavailable.
const FALLBACK_CLASSES = {
  'uc-berkeley': sortClassesForDisplay([
    { id: 'uc-berkeley:math51:fa26',   code: 'MATH 51',    title: 'Calculus I',                                        subject: 'Mathematics' },
    { id: 'uc-berkeley:math52:fa26',   code: 'MATH 52',    title: 'Calculus II',                                       subject: 'Mathematics' },
    { id: 'uc-berkeley:math53:fa26',   code: 'MATH 53',    title: 'Multivariable Calculus',                            subject: 'Mathematics' },
    { id: 'uc-berkeley:math54:fa26',   code: 'MATH 54',    title: 'Linear Algebra and Differential Equations',         subject: 'Mathematics' },
    { id: 'uc-berkeley:math55:fa26',   code: 'MATH 55',    title: 'Discrete Mathematics',                              subject: 'Mathematics' },
    { id: 'uc-berkeley:math104:fa26',  code: 'MATH 104',   title: 'Introduction to Analysis',                          subject: 'Mathematics' },
    { id: 'uc-berkeley:math105:fa26',  code: 'MATH 105',   title: 'Second Course in Analysis',                         subject: 'Mathematics' },
    { id: 'uc-berkeley:math110:fa26',  code: 'MATH 110',   title: 'Honors Abstract Linear Algebra',                    subject: 'Mathematics' },
    { id: 'uc-berkeley:math113:fa26',  code: 'MATH 113',   title: 'Introduction to Abstract Algebra',                  subject: 'Mathematics' },
    { id: 'uc-berkeley:math118:fa26',  code: 'MATH 118',   title: 'Honors Introduction to Analysis',                   subject: 'Mathematics' },
    { id: 'uc-berkeley:math126:fa26',  code: 'MATH 126',   title: 'Mathematical Logic',                                subject: 'Mathematics' },
    { id: 'uc-berkeley:math128a:fa26', code: 'MATH 128A',  title: 'Numerical Analysis',                                subject: 'Mathematics' },
    { id: 'uc-berkeley:math185:fa26',  code: 'MATH 185',   title: 'Introduction to Complex Analysis',                  subject: 'Mathematics' },
    { id: 'uc-berkeley:cs61a:fa26',    code: 'CS 61A',     title: 'Structure and Interpretation of Computer Programs', subject: 'Computer Science' },
    { id: 'uc-berkeley:cs61b:fa26',    code: 'CS 61B',     title: 'Data Structures and Algorithms',                    subject: 'Computer Science' },
    { id: 'uc-berkeley:cs61c:fa26',    code: 'CS 61C',     title: 'Great Ideas in Computer Architecture',              subject: 'Computer Science' },
    { id: 'uc-berkeley:cs70:fa26',     code: 'CS 70',      title: 'Discrete Mathematics and Probability Theory',       subject: 'Computer Science' },
    { id: 'uc-berkeley:cs188:fa26',    code: 'CS 188',     title: 'Introduction to Artificial Intelligence',           subject: 'Computer Science' },
    { id: 'uc-berkeley:cs161:fa26',    code: 'CS 161',     title: 'Computer Security',                                 subject: 'Computer Science' },
    { id: 'uc-berkeley:cs162:fa26',    code: 'CS 162',     title: 'Operating Systems and System Programming',          subject: 'Computer Science' },
    { id: 'uc-berkeley:cs170:fa26',    code: 'CS 170',     title: 'Efficient Algorithms and Intractable Problems',       subject: 'Computer Science' },
    { id: 'uc-berkeley:cs186:fa26',    code: 'CS 186',     title: 'Introduction to Database Systems',                  subject: 'Computer Science' },
    { id: 'uc-berkeley:cs189:fa26',    code: 'CS 189',     title: 'Introduction to Machine Learning',                  subject: 'Computer Science' },
    { id: 'uc-berkeley:eecs16a:fa26',  code: 'EECS 16A',   title: 'Designing Information Devices and Systems I',       subject: 'EECS' },
    { id: 'uc-berkeley:eecs16b:fa26',  code: 'EECS 16B',   title: 'Designing Information Devices and Systems II',      subject: 'EECS' },
    { id: 'uc-berkeley:eecs127:fa26',  code: 'EECS 127',   title: 'Optimization Models in Engineering',                subject: 'EECS' },
    { id: 'uc-berkeley:eecs149:fa26',  code: 'EECS 149',   title: 'Introduction to Embedded and Real-Time Software',   subject: 'EECS' },
    { id: 'uc-berkeley:data8:fa26',    code: 'DATA 8',     title: 'Foundations of Data Science',                       subject: 'Data Science' },
    { id: 'uc-berkeley:data100:fa26',  code: 'DATA 100',   title: 'Principles and Techniques of Data Science',         subject: 'Data Science' },
    { id: 'uc-berkeley:data140:fa26',  code: 'DATA 140',   title: 'Probability for Data Science',                      subject: 'Data Science' },
    { id: 'uc-berkeley:stat133:fa26',  code: 'STAT 133',   title: 'Concepts in Computing with Data',                   subject: 'Statistics' },
    { id: 'uc-berkeley:stat134:fa26',  code: 'STAT 134',   title: 'Concepts of Probability',                           subject: 'Statistics' },
    { id: 'uc-berkeley:stat135:fa26',  code: 'STAT 135',   title: 'Concepts of Statistics',                            subject: 'Statistics' },
    { id: 'uc-berkeley:phys7a:fa26',   code: 'PHYS 7A',    title: 'Physics for Scientists and Engineers I',            subject: 'Physics' },
    { id: 'uc-berkeley:phys7b:fa26',   code: 'PHYS 7B',    title: 'Physics for Scientists and Engineers II',           subject: 'Physics' },
    { id: 'uc-berkeley:phys7c:fa26',   code: 'PHYS 7C',    title: 'Physics for Scientists and Engineers III',          subject: 'Physics' },
    { id: 'uc-berkeley:phys8a:fa26',   code: 'PHYS 8A',    title: 'Introductory Physics I',                            subject: 'Physics' },
    { id: 'uc-berkeley:phys8b:fa26',   code: 'PHYS 8B',    title: 'Introductory Physics II',                           subject: 'Physics' },
    { id: 'uc-berkeley:physics137a:fa26', code: 'PHYSICS 137A', title: 'Quantum Mechanics',                            subject: 'Physics' },
    { id: 'uc-berkeley:nuc150:fa26',    code: 'NUCENG 150', title: 'Introduction to Nuclear Reactor Theory',            subject: 'Nuclear Engineering' },
    { id: 'uc-berkeley:nuc155:fa26',    code: 'NUCENG 155', title: 'Introduction to Numerical Simulations in Radiation Transport', subject: 'Nuclear Engineering' },
    { id: 'uc-berkeley:agrs28:fa26',    code: 'AGRS 28',    title: 'Greek and Roman Myths',                             subject: 'Classics' },
    { id: 'uc-berkeley:chem1a:fa26',   code: 'CHEM 1A',    title: 'General Chemistry',                                 subject: 'Chemistry' },
    { id: 'uc-berkeley:chem1b:fa26',   code: 'CHEM 1B',    title: 'General Chemistry',                                 subject: 'Chemistry' },
    { id: 'uc-berkeley:chem3a:fa26',   code: 'CHEM 3A',    title: 'Chemical Structure and Reactivity',                 subject: 'Chemistry' },
    { id: 'uc-berkeley:chem3b:fa26',   code: 'CHEM 3B',    title: 'Chemical Structure and Reactivity II',              subject: 'Chemistry' },
    { id: 'uc-berkeley:bio1a:fa26',    code: 'BIO 1A',     title: 'General Biology',                                   subject: 'Biology' },
    { id: 'uc-berkeley:bio1b:fa26',    code: 'BIO 1B',     title: 'General Biology',                                   subject: 'Biology' },
    { id: 'uc-berkeley:econ1:fa26',    code: 'ECON 1',     title: 'Introduction to Economics',                         subject: 'Economics' },
    { id: 'uc-berkeley:econ100a:fa26', code: 'ECON 100A',  title: 'Microeconomic Theory',                              subject: 'Economics' },
    { id: 'uc-berkeley:econ100b:fa26', code: 'ECON 100B',  title: 'Macroeconomic Theory',                              subject: 'Economics' },
    { id: 'uc-berkeley:econ101:fa26',  code: 'ECON 101',   title: 'Macroeconomic Theory',                              subject: 'Economics' },
    { id: 'uc-berkeley:ugba101a:fa26', code: 'UGBA 101A',  title: 'The Microeconomics of Business',                    subject: 'Business' },
    { id: 'uc-berkeley:mcb100:fa26',   code: 'MCB 100',    title: 'Biochemistry and Molecular Biology',                subject: 'Molecular Biology' },
    { id: 'uc-berkeley:mcb102:fa26',   code: 'MCB 102',    title: 'Biochemistry and Molecular Biology',                subject: 'Molecular Biology' },
    { id: 'uc-berkeley:psych1:fa26',   code: 'PSYCH 1',    title: 'General Psychology',                                subject: 'Psychology' },
    { id: 'uc-berkeley:hist7a:fa26',   code: 'HISTORY 7A', title: 'Introduction to the History of the United States: Settlement to Civil War', subject: 'History' },
    { id: 'uc-berkeley:phil25a:fa26',  code: 'PHILOS 25A', title: 'Ancient Philosophy',                                subject: 'Philosophy' },
    { id: 'uc-berkeley:eps7:fa26',     code: 'EPS 7',      title: 'Introduction to Climate Change',                    subject: 'Earth & Planetary Science' },
  ]),
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
  miscellaneous: sortClassesForDisplay([
    { id: 'misc:literature:na',         code: 'Literature',            title: 'Book guides, characters, and terms from the community', subject: 'Books' },
    { id: 'misc:personal-finance:na',  code: 'Personal Finance',      title: 'Budgeting, investing, and money basics',                 subject: 'Life Skills' },
    { id: 'misc:language-learning:na', code: 'Language Learning',   title: 'Vocabulary and phrases for any language',                subject: 'Languages' },
    { id: 'misc:history:na',           code: 'History',               title: 'World and US history beyond the classroom',              subject: 'History' },
    { id: 'misc:philosophy:na',        code: 'Philosophy & Big Ideas', title: 'Stoicism, ethics, and thought experiments',             subject: 'Philosophy' },
    { id: 'misc:fun-facts:na',         code: 'Fun Facts',             title: 'Trivia and interesting knowledge',                       subject: 'General Knowledge' },
    { id: 'misc:science-nature:na',    code: 'Science & Nature',      title: 'How the world works',                                    subject: 'Science' },
    { id: 'misc:health-wellness:na',   code: 'Health & Wellness',     title: 'Sleep, fitness, and mental health',                      subject: 'Life Skills' },
    { id: 'misc:tech-for-everyone:na', code: 'Tech for Everyone',     title: 'Technology explained for everyday life',                 subject: 'Technology' },
  ]),
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
          .select('id, code, title, subject, school_id')
          .eq('school_id', schoolId)
          .order('subject')
          .order('code');
        if (!error && data && data.length > 0) return sortClassesForDisplay(data);
      } catch (e) {
        console.warn('[ClassService] DB fetch failed, using fallback:', e.message);
      }
    }
    return FALLBACK_CLASSES[schoolId] || [];
  }

  /** Fetch class metadata for specific ids (enrollments across catalogs). */
  static async getClassesByIds(classIds) {
    if (!classIds?.length) return [];
    const unique = [...new Set(classIds)];

    if (SUPABASE_CONFIGURED) {
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('id, code, title, subject, school_id')
          .in('id', unique);
        if (!error && data?.length) return sortClassesForDisplay(data);
      } catch (e) {
        console.warn('[ClassService] getClassesByIds DB fetch failed:', e.message);
      }
    }

    const fallback = Object.values(FALLBACK_CLASSES).flat();
    return sortClassesForDisplay(fallback.filter((c) => unique.includes(c.id)));
  }

  /** Whether preset tidbit content is live for this class (enrollment works regardless). */
  static hasTidbitContent(classId) {
    if (!CLASS_TO_CATEGORY[classId]) return false;
    if (AP_CLASS_TO_CATEGORY[classId]) return apCourseHasLiveContent(classId);
    return true;
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
    (classIds || []).forEach((id) => {
      const cat = this.getCategoryForClass(id);
      if (cat) cats.add(cat);
    });
    return [...cats];
  }

  /**
   * Map a class row id → content category slug (tidbits / preset deck slug).
   * Falls back to parsing AP/Berkeley id patterns when the static map misses.
   */
  static getCategoryForClass(classId) {
    if (!classId) return null;
    if (CLASS_TO_CATEGORY[classId]) return CLASS_TO_CATEGORY[classId];

    const id = String(classId);

    const apMatch = id.match(/^hs-ap:([^:]+):/);
    if (apMatch) {
      const slug = apMatch[1].replace(/_/g, '-');
      if (AP_CATEGORY_BY_ID[slug]) return slug;
    }

    const berkeleyMatch = id.match(/^uc-berkeley:([^:]+):/);
    if (berkeleyMatch) {
      const segment = berkeleyMatch[1];
      const key = Object.keys(CLASS_TO_CATEGORY).find((k) => k.includes(`:${segment}:`));
      if (key) return CLASS_TO_CATEGORY[key];
    }

    return null;
  }

  /** Category ids for progress/stats — all enrollments, ignoring notification opt-outs. */
  static async getEnrollmentCategoryIds() {
    const classIds = await this.getMyClassIds();
    return this.categoryIdsForClasses(classIds);
  }

  /**
   * After joining/leaving classes, sync the selectedCategories in AsyncStorage
   * so the Categories tab and notification system reflect the enrollment.
   * Only adds, never removes, so manually-picked categories are preserved.
   */
  static async syncCategoriesToEnrollment(enrolledClassIds) {
    const newCats = this.categoryIdsForClasses(enrolledClassIds);
    if (newCats.length === 0) return;
    const disabled = new Set(await StorageService.getNotificationDisabledCategories());
    const existing = (await StorageService.getSelectedCategories()) || [];
    const toAdd = newCats.filter((c) => !disabled.has(c));
    const merged = Array.from(new Set([...existing, ...toAdd]));
    await StorageService.setSelectedCategories(merged);
    const { NotificationDeckService } = require('./NotificationDeckService');
    await NotificationDeckService.syncPresetsToEnrollment(enrolledClassIds);
    const { NotificationService } = require('./NotificationService');
    await NotificationService.syncPreferences();
  }

  /**
   * Replaces the selectedCategories in AsyncStorage to exactly match the current
   * class enrollment. Used by CategoriesScreen so that removing a class is
   * immediately reflected in the Home screen and notification system.
   */
  static async replaceCategoriesToEnrollment(enrolledClassIds) {
    const enrolledCats = this.categoryIdsForClasses(enrolledClassIds);
    const disabled = (await StorageService.getNotificationDisabledCategories()).filter((c) =>
      enrolledCats.includes(c)
    );
    await StorageService.setNotificationDisabledCategories(disabled);
    const disabledSet = new Set(disabled);
    const next = enrolledCats.filter((c) => !disabledSet.has(c));
    await StorageService.setSelectedCategories(next);
    const { NotificationDeckService } = require('./NotificationDeckService');
    await NotificationDeckService.syncPresetsToEnrollment(enrolledClassIds);
    const { NotificationService } = require('./NotificationService');
    await NotificationService.syncPreferences();
  }

  /**
   * Keep legacy selectedCategories in AsyncStorage aligned with Supabase
   * class enrollments. Fixes stale picks (e.g. Miscellaneous from old onboarding).
   */
  static async ensureCategoriesSyncedToEnrollments() {
    const classIds = await this.getMyClassIds();
    if (classIds.length === 0) return false;

    const expected = this.categoryIdsForClasses(classIds);
    const disabledSet = new Set(await StorageService.getNotificationDisabledCategories());
    const expectedActive = expected.filter((c) => !disabledSet.has(c)).sort();
    const currentActive = (await StorageService.getSelectedCategories())
      .filter((c) => !disabledSet.has(c))
      .sort();

    const matches =
      expectedActive.length === currentActive.length &&
      expectedActive.every((c, i) => c === currentActive[i]);

    if (!matches) {
      await this.replaceCategoriesToEnrollment(classIds);
      return true;
    }
    return false;
  }

  /**
   * When the user deselects a category, leave the corresponding class so that
   * My Groups and the Feed stay in sync.
   * Only acts on categories that map 1:1 to a single class (unambiguous).
   */
  static async leaveClassForCategory(removedCategoryId) {
    if (!SUPABASE_CONFIGURED) return;

    const catToClasses = {};
    Object.entries(CLASS_TO_CATEGORY).forEach(([classId, catId]) => {
      if (!catToClasses[catId]) catToClasses[catId] = [];
      catToClasses[catId].push(classId);
    });

    const classes = catToClasses[removedCategoryId];
    if (!classes || classes.length !== 1) return; // skip ambiguous mappings
    try {
      await this.leaveClass(classes[0]);
    } catch (e) {
      console.warn('[ClassService] leaveClassForCategory error:', e.message);
    }
  }

  /**
   * Reverse direction: when the user selects categories in the Categories tab,
   * also join the corresponding class(es) in Supabase so the My Groups section
   * stays in sync.
   *
   * Only acts on categories that map 1:1 to a single class (unambiguous).
   * Shared categories (e.g. 'science' → multiple classes) are skipped.
   * Only ever joins — never auto-leaves — to avoid overriding manual picks.
   */
  static async joinClassesForCategories(selectedCategoryIds) {
    if (!SUPABASE_CONFIGURED || !selectedCategoryIds.length) return;

    // Build reverse map, counting how many classes map to each category.
    const catToClasses = {};
    Object.entries(CLASS_TO_CATEGORY).forEach(([classId, catId]) => {
      if (!catToClasses[catId]) catToClasses[catId] = [];
      catToClasses[catId].push(classId);
    });

    // Collect class IDs for unambiguous (1:1) category→class mappings.
    const classIdsToJoin = [];
    selectedCategoryIds.forEach((catId) => {
      const classes = catToClasses[catId];
      if (classes && classes.length === 1) {
        classIdsToJoin.push(classes[0]);
      }
    });

    if (classIdsToJoin.length === 0) return;
    try {
      await this.joinClasses(classIdsToJoin);
    } catch (e) {
      // Non-fatal: class might not exist in DB yet (e.g. seed not run).
      console.warn('[ClassService] joinClassesForCategories error:', e.message);
    }
  }
}

export { ClassService };
export default ClassService;
