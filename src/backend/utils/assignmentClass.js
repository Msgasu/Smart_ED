/** School class labels (same set as smart-reports class management). */
export const SCHOOL_CLASS_OPTIONS = [
  'Form 1 Loyalty',
  'Form 1 Integrity',
  'Form 1 Faith',
  'Form 2 Loyalty',
  'Form 2 Integrity',
  'Form 2 Faith',
  'Form 3 Loyalty',
  'Form 3 Integrity',
  'Form 3 Faith',
];

/**
 * @param {string|null|undefined} assignmentClassYear
 * @param {string|null|undefined} studentClassYear
 */
export function isAssignmentVisibleToStudent(assignmentClassYear, studentClassYear) {
  const target = (assignmentClassYear || '').trim();
  if (!target) return true;
  const studentClass = (studentClassYear || '').trim();
  if (!studentClass) return false;
  return target === studentClass;
}

export function mergeClassYearOptions(fromCourse = [], fallback = SCHOOL_CLASS_OPTIONS) {
  const set = new Set();
  for (const c of [...fromCourse, ...fallback]) {
    const v = (c || '').trim();
    if (v) set.add(v);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
