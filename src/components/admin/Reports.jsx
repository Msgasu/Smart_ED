import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaPlus, FaSearch, FaTrashAlt, FaCalendarAlt } from 'react-icons/fa';
import { supabase } from '../../lib/supabase';
import './styles/AdminLayout.css';
import './styles/Reports.css';
import { v4 as uuidv4 } from 'uuid';

const Reports = ({ 
  studentNameRef, 
  averageRef, 
  subjects: initialSubjects, 
  onSubjectsChange, 
  studentId,
  termRef,
  academicYearRef,
  studentAge // Add studentAge prop
}) => {
  const [subjects, setSubjects] = useState(initialSubjects || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [studentData, setStudentData] = useState({
    name: '',
    dateOfBirth: '',
    age: studentAge || '', // Initialize with studentAge prop if available
    class_year: ''
  });
  const [reportData, setReportData] = useState(null);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  // Update subjects when initialSubjects changes
  useEffect(() => {
    if (initialSubjects && initialSubjects.length > 0) {
      console.log('Reports component received subjects:', initialSubjects);
      
      // Convert any non-string values to strings for display
      const formattedSubjects = initialSubjects.map(subject => {
        console.log(`Processing subject ${subject.name}: classScore=${subject.classScore} (${typeof subject.classScore})`);
        
        return {
          ...subject,
          classScore: subject.classScore !== undefined && subject.classScore !== null ? 
            subject.classScore.toString() : '',
          examScore: subject.examScore !== undefined && subject.examScore !== null ? 
            subject.examScore.toString() : '',
          totalScore: subject.totalScore !== undefined && subject.totalScore !== null ? 
            subject.totalScore.toString() : ''
        };
      });
      
      console.log('Formatted subjects for display:', formattedSubjects);
      setSubjects(formattedSubjects);
    }
  }, [initialSubjects]);

  // Use ref to track current studentId to prevent race conditions
  const currentStudentIdRef = useRef(studentId);
  
  // Reset state when studentId changes to prevent showing data from previous students
  useEffect(() => {
    if (studentId) {
      // Update the current student ref to prevent race conditions
      currentStudentIdRef.current = studentId;
      
      console.log(`Resetting state for new student: ${studentId}`);
      
      // Clear previous student data when studentId changes
      setSubjects([]);
      setReportData(null);
      setStudentData({
        name: '',
        dateOfBirth: '',
        age: '',
        class_year: ''
      });
      setSelectedTerm('');
      setSelectedYear('');
      
      // Clear input fields
      if (studentNameRef?.current) {
        studentNameRef.current.value = '';
      }
      
      if (averageRef?.current) {
        averageRef.current.value = '0.00';
      }
      
      // Clear class year input
      const classYearInput = document.getElementById('studentClass');
      if (classYearInput) {
        classYearInput.value = '';
      }
      
      // Set default values for term and year when available
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1; // 1-12
      
      // Set default term based on month
      let defaultTerm;
      if (currentMonth >= 9 && currentMonth <= 12) {
        defaultTerm = 'Term 1';
      } else if (currentMonth >= 1 && currentMonth <= 3) {
        defaultTerm = 'Term 2';
      } else {
        defaultTerm = 'Term 3';
      }
      
      // Set default academic year
      let startYear, endYear;
      if (currentMonth >= 9) { // If we're in the first term (Sept-Dec)
        startYear = currentDate.getFullYear();
        endYear = currentDate.getFullYear() + 1;
      } else { // If we're in the second or third term (Jan-July)
        startYear = currentDate.getFullYear() - 1;
        endYear = currentDate.getFullYear();
      }
      
      const defaultYear = `${startYear}-${endYear}`;
      
      if (termRef?.current) {
        termRef.current.value = defaultTerm;
        setSelectedTerm(defaultTerm);
      }
      
      if (academicYearRef?.current) {
        academicYearRef.current.value = defaultYear;
        setSelectedYear(defaultYear);
      }
    }
  }, [studentId]);

  // Helper function to calculate grade
  const calculateGrade = (total) => {
    if (!total || isNaN(total)) return 'F9';
    
    const score = parseFloat(total);
    
    if (score >= 95) return 'A1';
    if (score >= 90) return 'A2';
    if (score >= 85) return 'B2';
    if (score >= 80) return 'B3';
    if (score >= 75) return 'B4';
    if (score >= 70) return 'C4';
    if (score >= 65) return 'C5';
    if (score >= 60) return 'C6';
    if (score >= 55) return 'D7';
    if (score >= 50) return 'D8';
    if (score >= 45) return 'E8';
    if (score >= 40) return 'E9';
    return 'F9';
  };

  // Helper function to calculate remark
  const calculateRemark = (total) => {
    if (!total || isNaN(total)) return 'Fail';
    
    const score = parseFloat(total);
    
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Very Good';
    if (score >= 65) return 'Good';
    if (score >= 55) return 'Fair';
    if (score >= 45) return 'Pass';
    return 'Fail';
  };

  // Helper function to load default subjects based on student's assigned courses
  const loadDefaultSubjects = async (assignedCourses) => {
    try {
      console.log('Loading default subjects using assigned courses:', assignedCourses);
      
      if (!assignedCourses || assignedCourses.length === 0) {
        console.log('No assigned courses found, fetching all courses');
        // Fetch all courses if no assigned courses
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('*')
          .eq('class_id', studentData?.class_id)
          .order('name');
        
        if (coursesError) {
          console.error('Error fetching courses:', coursesError);
          setSubjects([]);
          return;
        }
        
        if (coursesData && coursesData.length > 0) {
          const defaultSubjects = coursesData.map(course => ({
            id: null,
            courseId: course.id,
            name: course.name || 'Unknown Subject',
            code: course.code || '',
            classScore: '',
            examScore: '',
            totalScore: '',
            position: '',
            grade: '',
            remark: '',
            teacherSignature: ''
          }));
          
          setSubjects(defaultSubjects);
        } else {
          setSubjects([]);
        }
      } else {
        // Use assigned courses
        const subjectsPromises = assignedCourses.map(async (courseId) => {
          try {
            const { data: course, error } = await supabase
              .from('courses')
              .select('name, code')
              .eq('id', courseId)
              .single();
            
            if (error) {
              console.error(`Error fetching course ${courseId}:`, error);
              return {
                id: null,
                courseId: courseId,
                name: 'Unknown Subject',
                code: '',
                classScore: '',
                examScore: '',
                totalScore: '',
                position: '',
                grade: '',
                remark: '',
                teacherSignature: ''
              };
            }
            
            return {
              id: null,
              courseId: courseId,
              name: course?.name || 'Unknown Subject',
              code: course?.code || '',
              classScore: '',
              examScore: '',
              totalScore: '',
              position: '',
              grade: '',
              remark: '',
              teacherSignature: ''
            };
          } catch (error) {
            console.error(`Error processing course ${courseId}:`, error);
            return {
              id: null,
              courseId: courseId,
              name: 'Unknown Subject',
              code: '',
              classScore: '',
              examScore: '',
              totalScore: '',
              position: '',
              grade: '',
              remark: '',
              teacherSignature: ''
            };
          }
        });
        
        try {
          const defaultSubjects = await Promise.all(subjectsPromises);
          setSubjects(defaultSubjects);
        } catch (error) {
          console.error('Error creating default subjects:', error);
          setSubjects([]);
        }
      }
    } catch (error) {
      console.error('Error in loadDefaultSubjects:', error);
      setSubjects([]);
    }
  };

  // Function to fetch student report data
  const fetchStudentReportData = useCallback(async (term, year) => {
    // Ensure we're fetching for the current student to prevent race conditions
    const requestStudentId = currentStudentIdRef.current;
    
    if (!requestStudentId) {
      console.log('No studentId provided, cannot fetch report');
      return;
    }
    
    // Make sure term and year are provided and not empty
    if (!term || !year) {
      console.log(`Missing required parameters: term=${term}, year=${year}`);
      // Clear previous data first
      setSubjects([]);
      // Get student's assigned courses and use default grades
      const { data: assignedCourses, error: coursesError } = await supabase
        .from('student_courses')
        .select(`
          student_id,
          course_id,
          courses (
            id,
            name,
            code
          )
        `)
        .eq('student_id', requestStudentId);
      
      if (coursesError) {
        console.error('Error fetching student courses:', coursesError);
      }
      
      await loadDefaultSubjects(assignedCourses);
      return;
    }
    
    // Clear previous data first
    setSubjects([]);
    
    try {
      setReportLoading(true);
      
      console.log(`Fetching report data for student ${requestStudentId}, term ${term}, year ${year}`);
      
      // Get the correct student ID for database queries
      let queryStudentId = requestStudentId;
      
      // Check if this student exists in the students table
      const { data: studentCheck, error: studentCheckError } = await supabase
        .from('students')
        .select('student_id, profile_id')
        .eq('profile_id', requestStudentId)
        .maybeSingle();
      
      if (studentCheckError) {
        console.error('Error checking student:', studentCheckError);
      } else if (studentCheck) {
        // We found the student in the students table
        // IMPORTANT: For the student_reports table, we should use the profile_id (UUID),
        // NOT the numeric student_id
        console.log(`Using profile_id ${studentCheck.profile_id} for fetching reports`);
        // Keep using the profile_id (UUID) for queries that expect a UUID
        queryStudentId = studentCheck.profile_id;
      } else {
        console.log(`No student record found, using profile ID ${queryStudentId}`);
      }
      
      // Check if student ID changed during async operation to prevent race conditions
      if (requestStudentId !== currentStudentIdRef.current) {
        console.log('Student ID changed during fetch, aborting');
        return;
      }
      
      // Get student's assigned courses regardless of whether a report exists
      const { data: assignedCourses, error: coursesError } = await supabase
        .from('student_courses')
        .select(`
          student_id,
          course_id,
          courses (
            id,
            name,
            code
          )
        `)
        .eq('student_id', requestStudentId);
      
      if (coursesError) {
        console.error('Error fetching student courses:', coursesError);
      }
      
      // Check if student ID changed during async operation to prevent race conditions
      if (requestStudentId !== currentStudentIdRef.current) {
        console.log('Student ID changed during fetch, aborting');
        return;
      }
      
      try {
        // Fetch report data - use the UUID (profile_id) to query student_reports
        const { data: reportData, error: reportError } = await supabase
          .from('student_reports')
          .select('*')
          .eq('student_id', queryStudentId)
          .eq('term', term)
          .eq('academic_year', year)
          .maybeSingle();
        
        // Check if student ID changed during async operation to prevent race conditions
        if (requestStudentId !== currentStudentIdRef.current) {
          console.log('Student ID changed during fetch, aborting');
          return;
        }
        
        if (reportError && reportError.code !== 'PGRST116') {
          console.error('Error fetching report:', reportError);
          // Clear report fields on error
          setReportData({
            id: null,
            term: term,
            academicYear: year,
            comments: '',
            principalComments: '',
            teacherComments: '',
            nextTermBegins: '',
            attendance: '',
            punctuality: '',
            honesty: '',
            neatness: '',
            conduct: '',
            attitudeToWork: '',
            respect: '',
            leadership: '',
            creativity: '',
            games: '',
            handwriting: '',
            musicalSkills: '',
            handlingSTools: '',
            vocalSkills: '',
            drawing: '',
            sportsmanship: '',
            attentiveness: ''
          });
          
          // Always use assigned courses when there's an error
          await loadDefaultSubjects(assignedCourses);
          return;
        }
        
        // Set up default report data
        const defaultReportData = {
          id: null,
          term: term,
          academicYear: year,
          comments: '',
          principalComments: '',
          teacherComments: '',
          nextTermBegins: '',
          attendance: '',
          punctuality: '',
          honesty: '',
          neatness: '',
          conduct: '',
          attitudeToWork: '',
          respect: '',
          leadership: '',
          creativity: '',
          games: '',
          handwriting: '',
          musicalSkills: '',
          handlingSTools: '',
          vocalSkills: '',
          drawing: '',
          sportsmanship: '',
          attentiveness: ''
        };
        
        if (reportData) {
          console.log('Found report data:', reportData);
          
          // Set report fields
          setReportData({
            id: reportData.id,
            term: reportData.term || term,
            academicYear: reportData.academic_year || year,
            comments: reportData.comments || '',
            principalComments: reportData.principal_comments || '',
            teacherComments: reportData.teacher_comments || '',
            nextTermBegins: reportData.next_term_begins || '',
            attendance: reportData.attendance || '',
            punctuality: reportData.punctuality || '',
            honesty: reportData.honesty || '',
            neatness: reportData.neatness || '',
            conduct: reportData.conduct || '',
            attitudeToWork: reportData.attitude_to_work || '',
            respect: reportData.respect || '',
            leadership: reportData.leadership || '',
            creativity: reportData.creativity || '',
            games: reportData.games || '',
            handwriting: reportData.handwriting || '',
            musicalSkills: reportData.musical_skills || '',
            handlingSTools: reportData.handling_tools || '',
            vocalSkills: reportData.vocal_skills || '',
            drawing: reportData.drawing || '',
            sportsmanship: reportData.sportsmanship || '',
            attentiveness: reportData.attentiveness || ''
          });
          
          // Check specifically for grades for this report
          if (reportData.id) {
            // Make sure we're still processing the current student
            if (requestStudentId !== currentStudentIdRef.current) {
              console.log('Student ID changed during fetch, aborting');
              return;
            }
            
            // Fetch grades
            try {
              const { data: gradesData, error: gradesError } = await supabase
                .from('student_grades')
                .select('*')
                .eq('report_id', reportData.id);
              
              if (gradesError) {
                console.error('Error fetching grades:', gradesError);
                // Use assigned courses for default grades
                await loadDefaultSubjects(assignedCourses);
              } else if (gradesData && gradesData.length > 0) {
                console.log('Found grades data:', gradesData);
                
                // Make sure we're still processing the current student
                if (requestStudentId !== currentStudentIdRef.current) {
                  console.log('Student ID changed during fetch, aborting');
                  return;
                }
                
                // Map grade data to subject objects
                const subjectsFromGrades = await Promise.all(gradesData.map(async grade => {
                  // Get the course info for this grade
                  const { data: courseData, error: courseError } = await supabase
                    .from('courses')
                    .select('name, code')
                    .eq('id', grade.subject_id)
                    .single();
                  
                  if (courseError) {
                    console.error(`Error fetching course ${grade.subject_id}:`, courseError);
                  }
                  
                  return {
                    id: grade.id,
                    courseId: grade.subject_id,
                    name: courseData?.name || 'Unknown Subject',
                    code: courseData?.code || '',
                    classScore: grade.class_score.toString(),
                    examScore: grade.exam_score.toString(),
                    totalScore: (grade.class_score + grade.exam_score).toString(),
                    position: grade.position ? grade.position.toString() : '',
                    grade: grade.grade || calculateGrade(grade.class_score + grade.exam_score),
                    remark: grade.remark || calculateRemark(grade.class_score + grade.exam_score),
                    teacherSignature: grade.teacher_signature || ''
                  };
                }));
                
                // Final check before setting state
                if (requestStudentId !== currentStudentIdRef.current) {
                  console.log('Student ID changed during fetch, aborting');
                  return;
                }
                
                setSubjects(subjectsFromGrades);
                
                // Calculate average
                let totalScore = 0;
                gradesData.forEach(grade => {
                  totalScore += (grade.class_score + grade.exam_score);
                });
                
                const average = (totalScore / gradesData.length).toFixed(2);
                if (averageRef?.current) {
                  averageRef.current.value = average;
                }
              } else {
                console.log('Report exists but no grades found. Using assigned courses with default grades.');
                // Report exists but no grades, use assigned courses
                await loadDefaultSubjects(assignedCourses);
              }
            } catch (error) {
              console.error('Error fetching grades:', error);
              await loadDefaultSubjects(assignedCourses);
            }
          } else {
            // No valid report ID, use assigned courses
            await loadDefaultSubjects(assignedCourses);
          }
        } else {
          console.log('No report found for this student/term/year');
          // No report found, set default values
          setReportData(defaultReportData);
          
          // Use assigned courses for default grades
          await loadDefaultSubjects(assignedCourses);
        }
      } catch (error) {
        console.error('Error in supabase query:', error);
        // If we get a 406 error, use default subjects instead
        await loadDefaultSubjects(assignedCourses);
      }
    } catch (error) {
      console.error('Error in fetchStudentReportData:', error);
    } finally {
      setReportLoading(false);
    }
  }, [loadDefaultSubjects]);

  // Load student data when component mounts or studentId changes
  useEffect(() => {
    if (!studentId) return;
    
    // Set loading state to prevent flashing of previous student data
    setLoading(true);
    setSubjects([]);
    
    const fetchStudentData = async () => {
      try {
        console.log('Fetching student data for ID:', studentId);
        
        // First try to get the student from the students table
        // Here studentId is the UUID (profile_id)
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('profile_id, student_id, class_year')
          .eq('profile_id', studentId) // Using profile_id (UUID)
          .maybeSingle();
          
        if (studentError) {
          console.error('Error fetching student:', studentError);
        }
        
        let profileData = null;
        
        // If we found the student, fetch their profile data
        if (studentData) {
          console.log('Found student record:', studentData);
          // Fetch profile using the profile_id (UUID)
          const { data: profile, error: profileError } = await supabase
          .from('profiles')
            .select('*')
            .eq('id', studentData.profile_id)
            .maybeSingle();
            
          if (profileError) {
            console.error('Error fetching profile:', profileError);
          } else if (profile) {
            profileData = profile;
          }
        } else {
          // If not found in students table, try to get directly from profiles
          // Using UUID directly since studentId is a profile_id
          console.log('Student not found in students table, trying profiles');
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', studentId) // Using UUID directly
            .maybeSingle();
            
          if (profileError) {
            console.error('Error fetching profile directly:', profileError);
          } else if (profile) {
            profileData = profile;
          }
        }
        
        if (profileData) {
          console.log('Found profile data:', profileData);
          // Calculate age if date of birth is available
          const age = profileData.date_of_birth ? calculateAge(profileData.date_of_birth) : '';
          
          // Set student name and other info
          const studentName = `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim();
          setStudentData({
            name: studentName,
            dateOfBirth: profileData.date_of_birth || '',
            age: age,
            class_year: studentData?.class_year || ''
          });
          
          // Update input field values
          if (studentNameRef?.current) {
            studentNameRef.current.value = studentName;
          }
          
          // Set class year
          const classYearInput = document.getElementById('studentClass');
          if (classYearInput) {
            classYearInput.value = studentData?.class_year || '';
          }
          
          // Determine current term and year 
          const currentDate = new Date();
          const currentMonth = currentDate.getMonth() + 1; // 1-12
          
          // Check if term and year are already set from refs
          let currentTerm = termRef?.current?.value;
          let currentYear = academicYearRef?.current?.value;
          
          // Only set default term if not already set
          if (!currentTerm && termRef?.current) {
            let defaultTerm;
            if (currentMonth >= 9 && currentMonth <= 12) {
              defaultTerm = 'Term 1';
            } else if (currentMonth >= 1 && currentMonth <= 3) {
              defaultTerm = 'Term 2';
            } else {
              defaultTerm = 'Term 3';
            }
            
            termRef.current.value = defaultTerm;
            setSelectedTerm(defaultTerm);
            currentTerm = defaultTerm;
          }
          
          // Only set default academic year if not already set
          if (!currentYear && academicYearRef?.current) {
            let startYear, endYear;
            if (currentMonth >= 9) { // If we're in the first term (Sept-Dec)
              startYear = currentDate.getFullYear();
              endYear = currentDate.getFullYear() + 1;
            } else { // If we're in the second or third term (Jan-July)
              startYear = currentDate.getFullYear() - 1;
              endYear = currentDate.getFullYear();
            }
            
            const defaultYear = `${startYear}-${endYear}`;
            academicYearRef.current.value = defaultYear;
            setSelectedYear(defaultYear);
            currentYear = defaultYear;
          }
          
          // Fetch report data if we have valid term and year
          if (currentTerm && currentYear && fetchStudentReportData) {
            fetchStudentReportData(currentTerm, currentYear);
          }
        } else {
          console.log('No profile data found for student ID:', studentId);
          if (studentNameRef?.current) {
            studentNameRef.current.value = '';
          }
        }
      } catch (error) {
        console.error('Error in fetchStudentData:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [studentId, fetchStudentReportData, termRef, academicYearRef, studentNameRef]);

  // Helper function to calculate age from date of birth
  const calculateAge = (dob) => {
    if (!dob) return '';
    
    const birthDate = new Date(dob);
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age.toString();
  };

  // Add event listeners to term and year inputs only if refs not provided
  useEffect(() => {
    // Skip adding event listeners if we have refs - parent component will handle changes
    if (termRef?.current && academicYearRef?.current) {
      return;
    }
    
    const termSelect = document.getElementById('currentTerm');
    const academicYearInput = document.getElementById('year');
    
    const handleTermChange = () => {
      console.log('Term changed to:', termSelect.value);
      fetchStudentReportData(termSelect.value, academicYearInput.value);
    };
    
    const handleYearChange = () => {
      console.log('Year changed to:', academicYearInput.value);
      fetchStudentReportData(termSelect.value, academicYearInput.value);
    };
    
    if (termSelect) {
      termSelect.addEventListener('change', handleTermChange);
    }
    
    if (academicYearInput) {
      academicYearInput.addEventListener('change', handleYearChange);
      academicYearInput.addEventListener('blur', handleYearChange);
    }
    
    return () => {
      if (termSelect) {
        termSelect.removeEventListener('change', handleTermChange);
      }
      
      if (academicYearInput) {
        academicYearInput.removeEventListener('change', handleYearChange);
        academicYearInput.removeEventListener('blur', handleYearChange);
      }
    };
  }, [fetchStudentReportData, termRef, academicYearRef]);
  
  // Debounce term/year change handling to prevent multiple rapid requests
  const debouncedFetchRef = useRef(null);
  
  // Watch for changes in term and year from parent component
  useEffect(() => {
    if (termRef?.current && academicYearRef?.current && studentId) {
      const term = termRef.current.value;
      const year = academicYearRef.current.value;
      
      // Only fetch data if both term and year are provided
      if (term && year) {
        // Clear any pending debounced fetch
        if (debouncedFetchRef.current) {
          clearTimeout(debouncedFetchRef.current);
        }
        
        // Set a new debounced fetch with small delay to prevent multiple rapid requests
        debouncedFetchRef.current = setTimeout(() => {
          console.log('Term/year refs changed, fetching data');
          fetchStudentReportData(term, year);
          debouncedFetchRef.current = null;
        }, 100);
      } else {
        console.log('Term or year is missing, skipping data fetch');
      }
    }
    
    // Cleanup debounced fetch on unmount
    return () => {
      if (debouncedFetchRef.current) {
        clearTimeout(debouncedFetchRef.current);
      }
    };
  }, [termRef, academicYearRef, fetchStudentReportData, studentId]);

  // Fetch courses from the database
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        
        // Fetch courses from Supabase
        const { data, error } = await supabase
          .from('courses')
          .select('id, name, code, description');
          
        if (error) throw error;
        
        // Format courses for display
        const formattedCourses = data || [];
        setAvailableCourses(formattedCourses);
        setFilteredCourses(formattedCourses);
      } catch (error) {
        console.error('Error fetching courses:', error);
        // Fallback to mock data if error occurs
        const mockCourses = [
          { id: 1, name: 'Core Mathematics', code: 'MTH101' },
          { id: 2, name: 'English', code: 'ENG101' },
          { id: 3, name: 'Social Studies', code: 'SOC101' },
          { id: 4, name: 'Integrated Science', code: 'SCI101' },
          { id: 5, name: 'Physics', code: 'PHY101' },
          { id: 6, name: 'Chemistry', code: 'CHM101' },
          { id: 7, name: 'Biology', code: 'BIO101' },
          { id: 8, name: 'Economics', code: 'ECO101' },
          { id: 9, name: 'Geography', code: 'GEO101' },
          { id: 10, name: 'History', code: 'HIS101' },
          { id: 11, name: 'Religious Studies', code: 'REL101' },
          { id: 12, name: 'Information Technology', code: 'ICT101' },
        ];
        setAvailableCourses(mockCourses);
        setFilteredCourses(mockCourses);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCourses();
  }, []);

  // Handle search input
  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    
    // Filter courses based on search term (in both name and code)
    const filtered = availableCourses.filter(course => 
      course.name.toLowerCase().includes(term.toLowerCase()) ||
      (course.code && course.code.toLowerCase().includes(term.toLowerCase()))
    );
    setFilteredCourses(filtered);
  };

  // Add a new subject
  const addSubject = (course) => {
    // Check if course is already added using courseId
    if (subjects.some(subject => subject.courseId === course.id)) {
      return; // Course already exists
    }
    
    const newSubject = {
      id: Date.now(),
      courseId: course.id,
      name: course.name,
      code: course.code,
      classScore: '',
      examScore: '',
      position: '',
      grade: '',
      remark: '',
      teacherSignature: ''
    };
    
    const updatedSubjects = [...subjects, newSubject];
    setSubjects(updatedSubjects);
    if (onSubjectsChange) {
      onSubjectsChange(updatedSubjects);
    }
  };

  // Remove a subject
  const removeSubject = (id) => {
    const updatedSubjects = subjects.filter(subject => subject.id !== id);
    setSubjects(updatedSubjects);
    if (onSubjectsChange) {
      onSubjectsChange(updatedSubjects);
    }
  };

  // Calculate total score for a subject
  const calculateTotal = (classScore, examScore) => {
    const class_score = parseFloat(classScore) || 0;
    const exam_score = parseFloat(examScore) || 0;
    return class_score + exam_score;
  };

  // Handle input changes for subjects
  const handleSubjectChange = (id, field, value) => {
    const updatedSubjects = subjects.map(subject => {
      if (subject.id === id) {
        const updatedSubject = { ...subject, [field]: value };
        
        // If class score or exam score changes, update the total score
        if (field === 'classScore' || field === 'examScore') {
          const classScore = field === 'classScore' ? value : subject.classScore;
          const examScore = field === 'examScore' ? value : subject.examScore;
          updatedSubject.totalScore = calculateTotal(classScore, examScore).toString();
        }
        
        return updatedSubject;
      }
      return subject;
    });
    
    setSubjects(updatedSubjects);
    if (onSubjectsChange) {
      onSubjectsChange(updatedSubjects);
    }
  };

  // Calculate average of all subject scores
  const calculateAverage = () => {
    if (!subjects.length) return '0';
    
    const validScores = subjects.filter(subject => {
      const totalScore = calculateTotal(subject.classScore, subject.examScore);
      return !isNaN(totalScore) && totalScore > 0;
    });
    
    if (!validScores.length) return '0';
    
    const sum = validScores.reduce((acc, subject) => {
      return acc + calculateTotal(subject.classScore, subject.examScore);
    }, 0);
    
    return (sum / validScores.length).toFixed(2);
  };

  // Update the average when subjects change
  useEffect(() => {
    if (averageRef?.current) {
      averageRef.current.value = calculateAverage();
    }
  }, [subjects, averageRef]);

  // Function to calculate totals
  const calculateTotals = useCallback(() => {
    // Set default values of 0 for all calculations
    let totalClassScore = 0;
    let totalExamScore = 0;
    let totalScore = 0;
    let count = subjects.length || 0;
    
    // Only calculate if we have subjects
    if (count > 0) {
      subjects.forEach(subject => {
        // Use parseInt with fallback to 0 for empty values
        const classScore = parseInt(subject.classScore || '0', 10) || 0;
        const examScore = parseInt(subject.examScore || '0', 10) || 0;
        const subjectTotal = classScore + examScore;
        
        totalClassScore += classScore;
        totalExamScore += examScore;
        totalScore += subjectTotal;
      });
    }
    
    // Calculate average (prevent division by zero)
    const average = count > 0 ? (totalScore / count).toFixed(2) : '0.00';
    
    // Update the average field if it exists
    if (averageRef?.current) {
      averageRef.current.value = average;
    }
    
    // Return calculated values
    return {
      totalClassScore,
      totalExamScore,
      totalScore,
      average,
      count
    };
  }, [subjects, averageRef]);

  // Function to handle class score change
  const handleClassScoreChange = useCallback((id, value) => {
    console.log(`Class score changed for subject ID ${id}: ${value}`);
    
    const updatedSubjects = subjects.map(subject => {
      if (subject.id === id) {
        const classScore = value === '' ? '0' : value;
        const examScore = subject.examScore === '' ? '0' : subject.examScore;
        
        // Calculate total (handle potential NaN)
        const classScoreNum = parseInt(classScore, 10) || 0;
        const examScoreNum = parseInt(examScore, 10) || 0;
        const totalScore = (classScoreNum + examScoreNum).toString();
        
        // Calculate grade and remark using the new scale
        const total = classScoreNum + examScoreNum;
        const grade = calculateGrade(total);
        const remark = calculateRemark(total);
        
        return { 
          ...subject, 
          classScore, 
          totalScore,
          grade,
          remark
        };
      }
      return subject;
    });
    
    setSubjects(updatedSubjects);
    if (onSubjectsChange) {
      onSubjectsChange(updatedSubjects);
    }
    
    // Recalculate totals
    calculateTotals();
  }, [subjects, onSubjectsChange, calculateTotals]);

  // Function to handle exam score change
  const handleExamScoreChange = useCallback((id, value) => {
    const updatedSubjects = subjects.map(subject => {
      if (subject.id === id) {
        const examScore = value === '' ? '0' : value;
        const classScore = subject.classScore === '' ? '0' : subject.classScore;
        
        // Calculate total (handle potential NaN)
        const classScoreNum = parseInt(classScore, 10) || 0;
        const examScoreNum = parseInt(examScore, 10) || 0;
        const totalScore = (classScoreNum + examScoreNum).toString();
        
        // Calculate grade and remark using the new scale
        const total = classScoreNum + examScoreNum;
        const grade = calculateGrade(total);
        const remark = calculateRemark(total);
        
        return { 
          ...subject, 
          examScore, 
          totalScore,
          grade,
          remark
        };
      }
      return subject;
    });
    
    setSubjects(updatedSubjects);
    if (onSubjectsChange) {
      onSubjectsChange(updatedSubjects);
    }
    
    // Recalculate totals
    calculateTotals();
  }, [subjects, onSubjectsChange, calculateTotals]);

  // Update studentData when studentAge prop changes
  useEffect(() => {
    if (studentAge) {
      setStudentData(prevData => ({
        ...prevData,
        age: studentAge
      }));
      
      // Also set it directly on the field if it exists
      const ageField = document.getElementById('studentAge');
      if (ageField) {
        ageField.value = studentAge;
      }
    }
  }, [studentAge]);

  return (
    <div className="report-main-container">
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Loading student data...</p>
        </div>
      )}
      
      {/* Header with School Information */}
      <div className="report-header-section">
        <div className="school-logo-container">
          {/* Replace with actual logo */}
          <div className="school-logo-placeholder">LIC</div>
          </div>
        <div className="school-details text-center">
            <h3>SmartED sample report</h3>
            <p>Private mail Bag, 252 Tema. / Tel: 024 437 7584</p>
            <h4>TERMINAL REPORT</h4>
          </div>
        </div>

      {/* Student Information - Compact Layout */}
      <div className="content-section">
        <div className="section-divider">
          <span className="section-title">Student Information</span>
      </div>

        <div className="info-grid">
          <div className="info-item">
              <label htmlFor="studentName" className="form-label">Student Name</label>
              <input 
                type="text" 
                className="form-control" 
                id="studentName" 
              placeholder="Enter name" 
                ref={studentNameRef}
                defaultValue={studentData.name}
              />
          </div>
          
          <div className="info-item">
              <label htmlFor="studentClass" className="form-label">Class</label>
              <input 
                type="text" 
                className="form-control" 
                id="studentClass" 
                placeholder="Enter class" 
                defaultValue={studentData.class_year}
              />
          </div>
          
          <div className="info-item">
              <label htmlFor="studentAge" className="form-label">Age</label>
              <input 
                type="text" 
                className="form-control" 
                id="studentAge" 
                value={studentData.age}
                onChange={(e) => {
                  // This makes it a controlled component but we'll keep it read-only
                  // by not actually changing the value when user types
                }}
                readOnly={true}
                placeholder="Auto-calculated"
              />
          </div>
          
          <div className="info-item">
            <label htmlFor="studentSex" className="form-label">Gender</label>
            <select className="form-control" id="studentSex">
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          <div className="info-item">
              <label htmlFor="currentTerm" className="form-label">Current Term</label>
            <select 
              className="form-control" 
              id="currentTerm"
              defaultValue={selectedTerm || reportData?.term || ''}
              onChange={(e) => {
                setSelectedTerm(e.target.value);
                if (termRef?.current) {
                  termRef.current.value = e.target.value;
                }
              }}
            >
              <option value="">Select</option>
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>
          
          <div className="info-item">
            <label htmlFor="year" className="form-label">Academic Year</label>
            <input 
              type="text" 
              className="form-control" 
              id="year" 
              placeholder="e.g. 2023-2024" 
              defaultValue={selectedYear || reportData?.academicYear || ''}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                if (academicYearRef?.current) {
                  academicYearRef.current.value = e.target.value;
                }
              }}
            />
          </div>
          
          <div className="info-item">
              <label htmlFor="average" className="form-label">Average</label>
              <input 
                type="text" 
                className="form-control" 
                id="average" 
                placeholder="Auto-calculated" 
                ref={averageRef}
                defaultValue={reportData?.total_score || calculateAverage()}
                readOnly
              />
            </div>
          
          <div className="info-item">
              <label htmlFor="attendance" className="form-label">Attendance</label>
              <input 
                type="text" 
                className="form-control" 
                id="attendance" 
                placeholder="e.g. 45/50 days" 
                defaultValue={reportData?.attendance || ''}
              />
          </div>
        </div>
      </div>

      {/* Academic Performance Section */}
      <div className="content-section">
        <div className="section-divider">
          <span className="section-title">Academic Performance</span>
          <div className="subject-actions">
            <div className="search-container">
                <input
                  type="text"
                className="search-input" 
                placeholder="Search for a subject..." 
                  value={searchTerm}
                  onChange={handleSearch}
                onFocus={() => setShowDropdown(true)}
              />
              <FaSearch className="search-icon" />
              
              {showDropdown && (
                <div className="course-dropdown">
                {loading ? (
                  <div className="course-loading">Loading courses...</div>
                ) : filteredCourses.length > 0 ? (
                  filteredCourses.map(course => (
                    <div 
                      key={course.id} 
                      className="course-item"
                        onClick={() => {
                          addSubject(course);
                          setShowDropdown(false);
                          setSearchTerm('');
                        }}
                      >
                        <span className="course-code">{course.code}</span>
                        <span className="course-name">{course.name}</span>
                    </div>
                  ))
                ) : (
                  <div className="no-courses">No matching courses found</div>
                )}
              </div>
              )}
            </div>
            <button 
              type="button" 
              className="add-subject-btn"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <FaPlus /> Add Subject
            </button>
          </div>
        </div>
        
        <div className="grades-table-container">
          <table className="grades-table">
          <thead>
            <tr>
                <th style={{ width: '20%' }}>Subject</th>
                <th style={{ width: '10%' }}>Class Score (60%)</th>
                <th style={{ width: '10%' }}>Exam Score (40%)</th>
                <th style={{ width: '8%' }}>Total</th>
                <th style={{ width: '8%' }}>Position</th>
                <th style={{ width: '8%' }}>Grade</th>
                <th style={{ width: '15%' }}>Remark</th>
                <th style={{ width: '15%' }}>Teacher's Sign</th>
                <th style={{ width: '6%' }}>Action</th>
            </tr>
          </thead>
          <tbody>
              {subjects.length > 0 ? (
                subjects.map(subject => (
                  <tr key={subject.id} data-subject-id={subject.courseId} data-course-id={subject.courseId}>
                    <td>{subject.code ? <strong>{subject.code}:</strong> : ''} {subject.name}</td>
                    <td>
                      <input 
                        type="number" 
                        className="form-control sm" 
                        placeholder="Score" 
                        value={subject.classScore}
                        min="0"
                        max="60"
                        onChange={(e) => handleClassScoreChange(subject.id, e.target.value)}
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        className="form-control sm" 
                        placeholder="Score" 
                        value={subject.examScore}
                        min="0"
                        max="40"
                        onChange={(e) => handleExamScoreChange(subject.id, e.target.value)}
                      />
                    </td>
                    <td className="total-score">
                      {calculateTotal(subject.classScore, subject.examScore)}
                    </td>
                    <td>
                      <input 
                        type="text" 
                        className="form-control sm" 
                        placeholder="Position" 
                        value={subject.position}
                        onChange={(e) => handleSubjectChange(subject.id, 'position', e.target.value)}
                      />
                    </td>
                    <td>
                      <input 
                        type="text" 
                        className="form-control sm" 
                        placeholder="Grade" 
                        value={subject.grade}
                        onChange={(e) => handleSubjectChange(subject.id, 'grade', e.target.value)}
                      />
                    </td>
                    <td>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Remark" 
                        value={subject.remark}
                        onChange={(e) => handleSubjectChange(subject.id, 'remark', e.target.value)}
                      />
                    </td>
                    <td>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Sign" 
                        value={subject.teacherSignature}
                        onChange={(e) => handleSubjectChange(subject.id, 'teacherSignature', e.target.value)}
                      />
                    </td>
                    <td>
                      <button 
                        className="delete-btn" 
                        onClick={() => removeSubject(subject.id)}
                        title="Remove subject"
                      >
                        <FaTrashAlt />
                      </button>
                    </td>
            </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="empty-subjects">
                    {loading ? (
                      <span>Loading subjects...</span>
                    ) : (
                      <span>
                    No subjects added. Click "Add Subject" to add courses.
                        {reportData?.id && <div className="mt-2 text-info">This student has an existing report but no subject grades. Add subjects to complete the report.</div>}
                      </span>
                    )}
                  </td>
            </tr>
              )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="3" className="font-weight-bold text-right">Average Score:</td>
              <td className="total-score">{calculateAverage()}</td>
              <td colSpan="5"></td>
            </tr>
          </tfoot>
        </table>
              </div>
            </div>
            
      {/* Final Assessment Section */}
      <div className="content-section">
        <div className="section-divider">
          <span className="section-title">Final Assessment</span>
              </div>
        
        <div className="assessment-grid">
          <div className="info-item">
            <label htmlFor="conduct" className="form-label">Conduct</label>
            <input 
              type="text" 
              className="form-control" 
              id="conduct" 
              placeholder="Enter conduct" 
              defaultValue={reportData?.conduct || ''}
            />
          </div>
          
          <div className="info-item">
            <label htmlFor="nextClass" className="form-label">Next Class</label>
            <input 
              type="text" 
              className="form-control" 
              id="nextClass" 
              placeholder="Enter next class" 
              defaultValue={reportData?.next_class || ''}
            />
          </div>
          
          <div className="info-item">
            <label htmlFor="reopeningDate" className="form-label">Reopening Date</label>
            <div className="date-input-container">
              <FaCalendarAlt className="calendar-icon" />
              <input 
                type="date" 
                className="form-control" 
                id="reopeningDate" 
                defaultValue={reportData?.reopening_date || ''}
              />
            </div>
              </div>
            </div>
        
        <div className="remarks-container">
          <label htmlFor="teacherRemarks" className="form-label">Teacher's Remarks</label>
          <textarea 
            className="form-control" 
            id="teacherRemarks" 
            rows="2" 
            placeholder="Enter teacher's remarks"
            defaultValue={reportData?.teacher_remarks || ''}
          ></textarea>
        </div>
        
        <div className="signature-section">
          <div className="signature-item">
            <label htmlFor="principalSignature" className="form-label">Principal's Signature</label>
            <input 
              type="text" 
              className="form-control" 
              id="principalSignature" 
              placeholder="Principal's signature" 
              defaultValue={reportData?.principal_signature || ''}
            />
          </div>
          
          <div className="signature-item">
            <label htmlFor="date" className="form-label">Date</label>
            <input 
              type="date" 
              className="form-control" 
              id="date" 
              defaultValue={new Date().toISOString().split('T')[0]} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

Reports.defaultProps = {
  studentNameRef: null,
  averageRef: null,
  studentId: null,
  termRef: null,
  academicYearRef: null
};

export default Reports;
