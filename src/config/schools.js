/** Catalogs available in class pickers (Berkeley, AP, etc.). */
export const SCHOOLS = [
  {
    id: 'uc-berkeley',
    label: 'UC Berkeley',
    segmentLabel: 'UC Berkeley',
    browseSubtitle: 'Browse Berkeley classes to enroll in tidbits and study groups.',
    searchPlaceholder: 'Search Berkeley classes…',
    emoji: '🐻',
  },
  {
    id: 'high-school-ap',
    label: 'AP Courses',
    segmentLabel: 'AP Courses',
    browseSubtitle: 'Browse AP courses to enroll in tidbits and study groups.',
    searchPlaceholder: 'Search AP courses…',
    emoji: '📚',
  },
];

export const DEFAULT_SCHOOL_ID = 'uc-berkeley';

export function getSchool(schoolId) {
  return SCHOOLS.find((s) => s.id === schoolId) || SCHOOLS[0];
}

/** Profile school first in segmented catalog toggles. */
export function schoolsForCatalog(preferredSchoolId) {
  const preferred = SCHOOLS.find((s) => s.id === preferredSchoolId);
  if (!preferred) return SCHOOLS;
  return [preferred, ...SCHOOLS.filter((s) => s.id !== preferred.id)];
}

/** Infer catalog from a class id prefix when school_id is unavailable. */
export function schoolIdForClassId(classId) {
  if (!classId) return DEFAULT_SCHOOL_ID;
  if (classId.startsWith('hs-ap:')) return 'high-school-ap';
  if (classId.startsWith('uc-berkeley:')) return 'uc-berkeley';
  return DEFAULT_SCHOOL_ID;
}
