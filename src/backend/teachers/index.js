import { getTeacherProfile } from './profile';
import { getTeacherCourses, getCourseDetails } from './courses';
import { getAssignments, createAssignment, deleteAssignment, getAssignmentDetails } from './assignments';
import { getStudents, getStudentDetails, getStudentAnalytics, getClassPerformanceStats } from './students';
import { getSubmissions, gradeSubmission, getSubmissionsByAssignment } from './grading';

export {
  getTeacherProfile,
  getTeacherCourses,
  getCourseDetails,
  getAssignments,
  createAssignment,
  deleteAssignment,
  getAssignmentDetails,
  getStudents,
  getStudentDetails,
  getStudentAnalytics,
  getClassPerformanceStats,
  getSubmissions,
  gradeSubmission,
  getSubmissionsByAssignment
}; 