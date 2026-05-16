import { getTeacherProfile } from './profile';
import { 
  getTeacherCourses, 
  getCourseDetails,
  uploadCourseSyllabus,
  getCourseSyllabus,
  createCourseTodo,
  getCourseTodos,
  updateCourseTodo,
  deleteCourseTodo
} from './courses';
import { getAssignments, createAssignment, deleteAssignment, getAssignmentDetails, getCourseClassYears } from './assignments';
import { getStudents, getStudentDetails, getStudentAnalytics, getClassPerformanceStats } from './students';
import { getSubmissions, gradeSubmission, getSubmissionsByAssignment } from './grading';
import { 
  saveStudentReport, 
  getStudentReport, 
  getReportsByAcademicYear, 
  getStudentReports, 
  searchStudentReports,
  generateStudentReport,
  saveReportDetails,
  saveSubjectGrade,
  deleteSubjectGrade,
  calculateClassScoreFromAssignments
} from './reports';

export {
  getTeacherProfile,
  getTeacherCourses,
  getCourseDetails,
  getAssignments,
  createAssignment,
  deleteAssignment,
  getAssignmentDetails,
  getCourseClassYears,
  getStudents,
  getStudentDetails,
  getStudentAnalytics,
  getClassPerformanceStats,
  getSubmissions,
  gradeSubmission,
  getSubmissionsByAssignment,
  // Report functions
  saveStudentReport,
  getStudentReport,
  getReportsByAcademicYear,
  getStudentReports,
  searchStudentReports,
  generateStudentReport,
  saveReportDetails,
  saveSubjectGrade,
  deleteSubjectGrade,
  calculateClassScoreFromAssignments,
  // Course syllabus and to-dos
  uploadCourseSyllabus,
  getCourseSyllabus,
  createCourseTodo,
  getCourseTodos,
  updateCourseTodo,
  deleteCourseTodo
}; 