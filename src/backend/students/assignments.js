import { supabase } from '../../lib/supabase';

/**
 * Get all assignments for a student
 * @param {string} studentId - The student ID
 * @returns {Promise<Object>} - The assignments data
 */
export const getStudentAssignments = async (studentId) => {
  try {
    if (!studentId) {
      throw new Error('Student ID is required');
    }
    
    // First get the courses the student is enrolled in
    const { data: studentCourses, error: coursesError } = await supabase
      .from('student_courses')
      .select('course_id')
      .eq('student_id', studentId);
      
    if (coursesError) throw coursesError;
    
    if (!studentCourses || studentCourses.length === 0) {
      return { data: [], error: null };
    }
    
    // Get course IDs
    const courseIds = studentCourses.map(sc => sc.course_id);
    
    // Fetch all assignments for these courses
    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('assignments')
      .select(`
        *,
        courses (
          code,
          name
        ),
        student_assignments (
          id,
          score,
          status,
          submitted_at
        )
      `)
      .in('course_id', courseIds)
      .order('due_date', { ascending: false });
      
    if (assignmentsError) throw assignmentsError;
    
    // Process assignments to include student submission status
    const processedAssignments = assignmentsData.map(assignment => {
      // Find student's submission for this assignment
      const studentSubmission = assignment.student_assignments.find(
        sa => sa.student_id === studentId
      );
      
      // If no submission exists, create a placeholder
      if (!studentSubmission) {
        assignment.student_submission = {
          status: 'not_submitted',
          score: null,
          submitted_at: null
        };
      } else {
        assignment.student_submission = studentSubmission;
      }
      
      return assignment;
    });
    
    return { data: processedAssignments, error: null };
  } catch (error) {
    console.error('Error fetching student assignments:', error);
    return { data: null, error };
  }
};

/**
 * Get details of a specific assignment
 * @param {string} assignmentId - The assignment ID
 * @param {string} studentId - The student ID
 * @returns {Promise<Object>} - The assignment details
 */
export const getAssignmentDetails = async (assignmentId, studentId) => {
  try {
    if (!assignmentId || !studentId) {
      throw new Error('Assignment ID and Student ID are required');
    }
    
    // Fetch assignment details
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select(`
        *,
        courses (
          id,
          code,
          name
        )
      `)
      .eq('id', assignmentId)
      .single();
      
    if (assignmentError) throw assignmentError;
    
    // Fetch student's submission for this assignment
    const { data: submission, error: submissionError } = await supabase
      .from('student_assignments')
      .select('*')
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId)
      .maybeSingle();
      
    if (submissionError) throw submissionError;
    
    // Combine assignment with submission data
    const assignmentWithSubmission = {
      ...assignment,
      submission: submission || {
        status: 'not_submitted',
        score: null,
        submitted_at: null
      }
    };
    
    return { data: assignmentWithSubmission, error: null };
  } catch (error) {
    console.error('Error fetching assignment details:', error);
    return { data: null, error };
  }
};

/**
 * Submit an assignment
 * @param {string} assignmentId - The assignment ID
 * @param {string} studentId - The student ID
 * @param {Object} submissionData - The submission data
 * @returns {Promise<Object>} - The submission result
 */
export const submitAssignment = async (assignmentId, studentId, submissionData) => {
  try {
    if (!assignmentId || !studentId) {
      throw new Error('Assignment ID and Student ID are required');
    }
    
    // Check if submission already exists
    const { data: existingSubmission, error: checkError } = await supabase
      .from('student_assignments')
      .select('*')
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId)
      .maybeSingle();
      
    if (checkError) throw checkError;
    
    let result;
    
    if (existingSubmission) {
      // Update existing submission
      const { data, error } = await supabase
        .from('student_assignments')
        .update({
          ...submissionData,
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .eq('id', existingSubmission.id)
        .select()
        .single();
        
      if (error) throw error;
      result = { data, error: null, isUpdate: true };
    } else {
      // Create new submission
      const { data, error } = await supabase
        .from('student_assignments')
        .insert([{
          assignment_id: assignmentId,
          student_id: studentId,
          ...submissionData,
          status: 'submitted',
          submitted_at: new Date().toISOString()
        }])
        .select()
        .single();
        
      if (error) throw error;
      result = { data, error: null, isUpdate: false };
    }
    
    return result;
  } catch (error) {
    console.error('Error submitting assignment:', error);
    return { data: null, error };
  }
};

/**
 * Upload a file for an assignment submission
 * @param {string} assignmentId - The assignment ID
 * @param {string} studentId - The student ID
 * @param {File} file - The file to upload
 * @param {string} studentAssignmentId - Optional student assignment ID (if already submitted)
 * @returns {Promise<Object>} - The upload result
 */
export const uploadAssignmentFile = async (assignmentId, studentId, file, studentAssignmentId = null) => {
  try {
    if (!assignmentId || !studentId || !file) {
      throw new Error('Assignment ID, Student ID, and file are required');
    }
    
    // Generate a unique filename to prevent collisions
    const fileExt = file.name.split('.').pop();
    const fileName = `${assignmentId}_${studentId}_${Date.now()}.${fileExt}`;
    const filePath = `assignment_files/${assignmentId}/${fileName}`;
    
    console.log("Uploading file to path:", filePath);
    
    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('assignments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // Overwrite existing files
      });
      
    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw uploadError;
    }
    
    console.log("Upload successful:", uploadData);
    
    // Construct a direct public URL for the file
    // Get the supabase URL directly from the client
    const supabaseUrl = supabase.supabaseUrl || 'https://sxndojgvrhjmclveyfoz.supabase.co';
    const fileUrl = `${supabaseUrl}/storage/v1/object/public/assignments/${filePath}`;
    
    console.log("Generated direct public URL:", fileUrl);
    
    // Save file record in the database
    const { data: fileData, error: fileError } = await supabase
      .from('assignment_files')
      .insert([{
        assignment_id: assignmentId,
        student_id: studentId,
        student_assignment_id: studentAssignmentId,
        filename: file.name,
        path: filePath,
        file_type: file.type,
        file_size: file.size,
        url: fileUrl
      }])
      .select()
      .single();
      
    if (fileError) {
      console.error("Database insert error:", fileError);
      throw fileError;
    }
    
    return { data: fileData, error: null };
  } catch (error) {
    console.error('Error uploading assignment file:', error);
    return { data: null, error };
  }
};

/**
 * Get submitted files for an assignment
 * @param {string} assignmentId - The assignment ID
 * @param {string} studentId - The student ID
 * @returns {Promise<Object>} - The files data
 */
export const getAssignmentFiles = async (assignmentId, studentId) => {
  try {
    if (!assignmentId || !studentId) {
      throw new Error('Assignment ID and Student ID are required');
    }
    
    console.log(`Fetching files for assignment ${assignmentId} and student ${studentId}`);
    
    // Get files for this assignment/student
    const { data, error } = await supabase
      .from('assignment_files')
      .select('*')
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error("Error fetching assignment files:", error);
      throw error;
    }
    
    console.log(`Found ${data?.length || 0} files`);
    
    // Ensure URLs are up-to-date and using direct public URLs
    if (data && data.length > 0) {
      const filesWithDirectUrls = data.map(file => {
        // Check if the URL already exists and is valid
        if (file.url && file.url.startsWith('http')) {
          console.log(`File ${file.id} already has a valid URL: ${file.url.substring(0, 30)}...`);
          return file;
        }
        
        // If URL is missing or invalid, generate a direct public URL
        const supabaseUrl = supabase.supabaseUrl || 'https://sxndojgvrhjmclveyfoz.supabase.co';
        const directUrl = `${supabaseUrl}/storage/v1/object/public/assignments/${file.path}`;
        
        console.log(`Generated direct URL for file ${file.id}: ${directUrl.substring(0, 30)}...`);
        
        return {
          ...file,
          url: directUrl
        };
      });
      
      return { data: filesWithDirectUrls, error: null };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching assignment files:', error);
    return { data: null, error };
  }
};

/**
 * Delete an assignment file
 * @param {string} fileId - The file ID
 * @param {string} studentId - The student ID 
 * @returns {Promise<Object>} - The deletion result
 */
export const deleteAssignmentFile = async (fileId, studentId) => {
  try {
    if (!fileId || !studentId) {
      throw new Error('File ID and Student ID are required');
    }
    
    console.log(`Attempting to delete file ${fileId} for student ${studentId}`);
    
    // Get file details first
    const { data: fileData, error: fetchError } = await supabase
      .from('assignment_files')
      .select('*')
      .eq('id', fileId)
      .eq('student_id', studentId)
      .single();
      
    if (fetchError) {
      console.error("Error fetching file data:", fetchError);
      throw fetchError;
    }
    
    if (!fileData) {
      throw new Error('File not found or you do not have permission to delete it');
    }
    
    console.log(`Found file to delete: ${fileData.filename}, path: ${fileData.path}`);
    
    // Delete from storage
    const { data: deleteData, error: storageError } = await supabase
      .storage
      .from('assignments')
      .remove([fileData.path]);
      
    if (storageError) {
      console.error("Error deleting from storage:", storageError);
      throw storageError;
    }
    
    console.log("Storage deletion result:", deleteData);
    
    // Delete record from database
    const { data: dbData, error: dbError } = await supabase
      .from('assignment_files')
      .delete()
      .eq('id', fileId)
      .select();
      
    if (dbError) {
      console.error("Error deleting from database:", dbError);
      throw dbError;
    }
    
    console.log("Database deletion result:", dbData);
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting assignment file:', error);
    return { success: false, error };
  }
}; 