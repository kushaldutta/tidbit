/** Catalogs available in class pickers (Berkeley, AP, Miscellaneous, etc.). */
export const SCHOOLS = [
  {
    id: 'uc-berkeley',
    label: 'UC Berkeley',
    segmentLabel: 'UC Berkeley',
    browseSubtitle: 'Browse Berkeley classes to enroll in tidbits and study groups.',
    searchPlaceholder: 'Search Berkeley classes…',
    emoji: '🐻',
    showInOnboarding: true,
  },
  {
    id: 'high-school-ap',
    label: 'AP Courses',
    segmentLabel: 'AP Courses',
    browseSubtitle: 'Browse AP courses to enroll in tidbits and study groups.',
    searchPlaceholder: 'Search AP courses…',
    emoji: '📚',
    showInOnboarding: true,
  },
  {
    id: 'miscellaneous',
    label: 'Miscellaneous',
    segmentLabel: 'Miscellaneous',
    browseSubtitle: 'General topics and community decks — no class required.',
    searchPlaceholder: 'Search topics…',
    emoji: '💡',
    showInOnboarding: false,
  },
];

export const DEFAULT_SCHOOL_ID = 'uc-berkeley';

export function getSchool(schoolId) {
  return SCHOOLS.find((s) => s.id === schoolId) || SCHOOLS[0];
}

function orderSchools(preferredSchoolId, schools) {
  const preferred = schools.find((s) => s.id === preferredSchoolId);
  if (!preferred) return schools;
  return [preferred, ...schools.filter((s) => s.id !== preferred.id)];
}

/** All catalogs for My Classes / Categories (includes Miscellaneous). */
export function schoolsForCatalog(preferredSchoolId) {
  return orderSchools(preferredSchoolId, SCHOOLS);
}

/** Onboarding class picker — Berkeley and AP only. */
export function schoolsForOnboarding(preferredSchoolId) {
  const onboarding = SCHOOLS.filter((s) => s.showInOnboarding !== false);
  return orderSchools(preferredSchoolId, onboarding);
}

/** Infer catalog from a class id prefix when school_id is unavailable. */
export function schoolIdForClassId(classId) {
  if (!classId) return DEFAULT_SCHOOL_ID;
  if (classId.startsWith('hs-ap:')) return 'high-school-ap';
  if (classId.startsWith('uc-berkeley:')) return 'uc-berkeley';
  if (classId.startsWith('misc:')) return 'miscellaneous';
  return DEFAULT_SCHOOL_ID;
}
