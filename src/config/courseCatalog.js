/**
 * AP class ↔ content category wiring (no tidbit text here).
 * When Supabase cards are added for a course, set contentLive: true.
 */
export const AP_COURSES = [
  { classId: 'hs-ap:ap_calc_ab:ap26',  categoryId: 'ap-calc-ab',  name: 'AP Calculus AB',  description: 'Limits, derivatives, integrals, and the Fundamental Theorem of Calculus', contentLive: true },
  { classId: 'hs-ap:ap_calc_bc:ap26',  categoryId: 'ap-calc-bc',  name: 'AP Calculus BC',  description: 'Series, parametric equations, polar coordinates, and advanced integration', contentLive: true },
  { classId: 'hs-ap:ap_stats:ap26',    categoryId: 'ap-stats',    name: 'AP Statistics',   description: 'Data analysis, probability, inference, and experimental design', contentLive: true },
  { classId: 'hs-ap:ap_csa:ap26',      categoryId: 'ap-csa',      name: 'AP Computer Science A', description: 'Java programming, algorithms, and object-oriented design', contentLive: true },
  { classId: 'hs-ap:ap_csp:ap26',      categoryId: 'ap-csp',      name: 'AP Computer Science Principles', description: 'Computing concepts, data, algorithms, and the internet', contentLive: true },
  { classId: 'hs-ap:ap_chem:ap26',     categoryId: 'ap-chem',     name: 'AP Chemistry',    description: 'Atomic structure, bonding, thermodynamics, and chemical reactions', contentLive: true },
  { classId: 'hs-ap:ap_bio:ap26',      categoryId: 'ap-bio',      name: 'AP Biology',      description: 'Cells, genetics, evolution, ecology, and biological systems', contentLive: true },
  { classId: 'hs-ap:ap_phys1:ap26',    categoryId: 'ap-phys1',    name: 'AP Physics 1',    description: 'Algebra-based mechanics, waves, and introductory physics', contentLive: true },
  { classId: 'hs-ap:ap_phys2:ap26',    categoryId: 'ap-phys2',    name: 'AP Physics 2',    description: 'Fluid mechanics, thermodynamics, optics, and modern physics', contentLive: true },
  { classId: 'hs-ap:ap_phys_cm:ap26',  categoryId: 'ap-phys-c-m', name: 'AP Physics C: Mechanics', description: 'Calculus-based kinematics, forces, energy, and rotation', contentLive: true },
  { classId: 'hs-ap:ap_phys_ce:ap26',  categoryId: 'ap-phys-c-e', name: 'AP Physics C: E&M', description: 'Calculus-based electrostatics, circuits, and magnetism', contentLive: true },
  { classId: 'hs-ap:ap_ush:ap26',      categoryId: 'ap-ush',      name: 'AP US History',   description: 'American history from pre-Columbian societies to the present', contentLive: true },
  { classId: 'hs-ap:ap_wh:ap26',       categoryId: 'ap-world',    name: 'AP World History', description: 'Global history from 1200 CE to the present', contentLive: true },
  { classId: 'hs-ap:ap_euro:ap26',     categoryId: 'ap-euro',     name: 'AP European History', description: 'European history from 1450 to the present', contentLive: true },
  { classId: 'hs-ap:ap_gov:ap26',      categoryId: 'ap-gov',      name: 'AP US Government', description: 'Constitutional foundations, institutions, and political participation', contentLive: true },
  { classId: 'hs-ap:ap_macro:ap26',    categoryId: 'ap-macro',    name: 'AP Macroeconomics', description: 'National income, inflation, unemployment, and fiscal policy', contentLive: true },
  { classId: 'hs-ap:ap_micro:ap26',    categoryId: 'ap-micro',    name: 'AP Microeconomics', description: 'Supply and demand, market structures, and factor markets', contentLive: true },
  { classId: 'hs-ap:ap_psych:ap26',    categoryId: 'ap-psych',    name: 'AP Psychology',   description: 'Biological bases, cognition, development, and social psychology', contentLive: true },
  { classId: 'hs-ap:ap_eng_lang:ap26', categoryId: 'ap-lang',     name: 'AP English Language', description: 'Rhetorical analysis, argument, and synthesis writing', contentLive: true },
  { classId: 'hs-ap:ap_eng_lit:ap26',  categoryId: 'ap-lit',      name: 'AP English Literature', description: 'Literary analysis, poetry, and prose interpretation', contentLive: true },
  { classId: 'hs-ap:ap_span:ap26',     categoryId: 'ap-spanish',  name: 'AP Spanish Language', description: 'Interpersonal, interpretive, and presentational communication in Spanish', contentLive: true },
  { classId: 'hs-ap:ap_hug:ap26',      categoryId: 'ap-hug',      name: 'AP Human Geography', description: 'Population, culture, political organization, and land use', contentLive: true },
  { classId: 'hs-ap:ap_enviro:ap26',   categoryId: 'ap-enviro',   name: 'AP Environmental Science', description: 'Ecosystems, biodiversity, pollution, and sustainability', contentLive: true },
  { classId: 'hs-ap:ap_art_hist:ap26', categoryId: 'ap-art-hist', name: 'AP Art History',  description: 'Global art traditions, visual analysis, and historical context', contentLive: true },
];

export const AP_CLASS_TO_CATEGORY = Object.fromEntries(
  AP_COURSES.map((c) => [c.classId, c.categoryId]),
);

export const AP_CATEGORY_IDS = AP_COURSES.map((c) => c.categoryId);

export const AP_CATEGORY_BY_ID = Object.fromEntries(
  AP_COURSES.map((c) => [c.categoryId, c]),
);

export function isApClassId(classId) {
  return Boolean(classId && AP_CLASS_TO_CATEGORY[classId]);
}

export function apCourseHasLiveContent(classId) {
  const course = AP_COURSES.find((c) => c.classId === classId);
  return Boolean(course?.contentLive);
}
