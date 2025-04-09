/**
 * Calculates the letter grade based on the provided score
 * @param {number} score - The numeric score (0-100)
 * @returns {string} The corresponding letter grade
 */
export const calculateGrade = (score) => {
  if (score >= 90 && score <= 100) return 'A1';
  if (score >= 80 && score < 90) return 'B2';
  if (score >= 70 && score < 80) return 'B3';
  if (score >= 65 && score < 70) return 'C4';
  if (score >= 60 && score < 65) return 'C5';
  if (score >= 55 && score < 60) return 'C6';
  if (score >= 50 && score < 55) return 'D7';
  if (score >= 40 && score < 50) return 'E8';
  if (score >= 0 && score < 40) return 'F9';
  return 'N/A'; // Handle invalid scores
};

/**
 * Returns the color associated with a grade
 * @param {string} grade - The letter grade
 * @returns {string} The hex color code for the grade
 */
export const getGradeColor = (grade) => {
  switch (grade) {
    case 'A': return '#4CAF50'; // Green
    case 'B2': return '#8BC34A'; // Light Green
    case 'B3': return '#CDDC39'; // Lime
    case 'C4': return '#FFEB3B'; // Yellow
    case 'C5': return '#FFC107'; // Amber
    case 'C6': return '#FF9800'; // Orange
    case 'D7': return '#FF5722'; // Deep Orange
    case 'E8': return '#F44336'; // Red
    case 'F9': return '#D32F2F'; // Dark Red
    default: return '#9E9E9E'; // Grey for N/A
  }
}; 