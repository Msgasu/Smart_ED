import { supabase } from './supabase'

// Student Reports API
export const studentReportsAPI = {
  // Create or update a student report
  upsertReport: async (reportData) => {
    try {
      // First check if report exists
      const { data: existingReport } = await supabase
        .from('student_reports')
        .select('id')
        .eq('student_id', reportData.student_id)
        .eq('term', reportData.term)
        .eq('academic_year', reportData.academic_year)
        .single()

      let result
      if (existingReport) {
        // Update existing report
        result = await supabase
          .from('student_reports')
          .update({
            class_year: reportData.class_year,
            total_score: reportData.total_score,
            overall_grade: reportData.overall_grade,
            attendance: reportData.attendance,
            conduct: reportData.conduct,
            next_class: reportData.next_class,
            teacher_remarks: reportData.teacher_remarks,
            principal_signature: reportData.principal_signature,
            reopening_date: reportData.reopening_date,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingReport.id)
          .select()
          .single()
      } else {
        // Create new report
        result = await supabase
          .from('student_reports')
          .insert({
            student_id: reportData.student_id,
            term: reportData.term,
            academic_year: reportData.academic_year,
            class_year: reportData.class_year,
            total_score: reportData.total_score,
            overall_grade: reportData.overall_grade,
            attendance: reportData.attendance,
            conduct: reportData.conduct,
            next_class: reportData.next_class,
            teacher_remarks: reportData.teacher_remarks,
            principal_signature: reportData.principal_signature,
            reopening_date: reportData.reopening_date
          })
          .select()
          .single()
      }

      return { data: result.data, error: result.error }
    } catch (error) {
      console.error('Error in upsertReport:', error)
      return { data: null, error }
    }
  },

  // Get a specific report
  getReport: async (studentId, term, academicYear) => {
    try {
      const { data, error } = await supabase
        .from('student_reports')
        .select('*')
        .eq('student_id', studentId)
        .eq('term', term)
        .eq('academic_year', academicYear)
        .single()

      return { data, error }
    } catch (error) {
      console.error('Error in getReport:', error)
      return { data: null, error }
    }
  },

  // Get all reports with pagination
  getReports: async (limit = 10, offset = 0) => {
    try {
      const { data, error } = await supabase
        .from('student_reports')
        .select(`
          id, 
          term, 
          academic_year, 
          created_at, 
          student_id,
          total_score,
          overall_grade
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      return { data, error }
    } catch (error) {
      console.error('Error in getReports:', error)
      return { data: null, error }
    }
  }
}

// Student Grades API
export const studentGradesAPI = {
  // Upsert multiple grades
  upsertGrades: async (grades) => {
    try {
      // First delete existing grades for this report
      const reportId = grades[0]?.report_id
      if (reportId) {
        await supabase
          .from('student_grades')
          .delete()
          .eq('report_id', reportId)
      }

      // Insert new grades
      const { data, error } = await supabase
        .from('student_grades')
        .insert(grades)
        .select()

      return { data, error }
    } catch (error) {
      console.error('Error in upsertGrades:', error)
      return { data: null, error }
    }
  },

  // Get grades for a report
  getGradesByReport: async (reportId) => {
    try {
      const { data, error } = await supabase
        .from('student_grades')
        .select(`
          *,
          courses (
            id,
            name,
            code
          )
        `)
        .eq('report_id', reportId)

      return { data, error }
    } catch (error) {
      console.error('Error in getGradesByReport:', error)
      return { data: null, error }
    }
  }
}

// Students API
export const studentsAPI = {
  // Get all students with their course enrollments
  getStudents: async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          students (
            class_year,
            student_id
          )
        `)
        .eq('role', 'student')
        .order('first_name')

      return { data, error }
    } catch (error) {
      console.error('Error in getStudents:', error)
      return { data: null, error }
    }
  },

  // Get student's enrolled courses
  getStudentCourses: async (studentId) => {
    try {
      const { data, error } = await supabase
        .from('student_courses')
        .select(`
          course_id,
          courses (
            id,
            name,
            code
          )
        `)
        .eq('student_id', studentId)

      return { data, error }
    } catch (error) {
      console.error('Error in getStudentCourses:', error)
      return { data: null, error }
    }
  }
}

// Courses API
export const coursesAPI = {
  // Get all courses
  getCourses: async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('name')

      return { data, error }
    } catch (error) {
      console.error('Error in getCourses:', error)
      return { data: null, error }
    }
  }
}

// Profiles API
export const profilesAPI = {
  // Get profiles by IDs
  getProfilesByIds: async (ids) => {
    try {
      if (!ids || ids.length === 0) {
        return { data: [], error: null }
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', ids)

      return { data, error }
    } catch (error) {
      console.error('Error in getProfilesByIds:', error)
      return { data: null, error }
    }
  }
} 