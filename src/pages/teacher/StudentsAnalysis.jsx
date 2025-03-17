// src/pages/teacher/StudentAnalysis.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { FaChartBar, FaUserGraduate, FaBook, FaClipboardList, FaArrowLeft } from 'react-icons/fa';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import TeacherLayout from '../../components/teacher/TeacherLayout';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

const StudentAnalysis = () => {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch student profile details
        const { data: studentProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', studentId)
          .single();
          
        if (profileError) throw profileError;
          
        // Fetch student-specific details
        const { data: studentDetails, error: detailsError } = await supabase
          .from('students')
          .select('*')
          .eq('profile_id', studentId)
          .single();
          
        if (detailsError) throw detailsError;
          
        // Combine the data
        const combinedStudentData = {
          ...studentProfile,
          ...studentDetails
        };

        // Fetch assignments and scores
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('student_assignments')
          .select(`
            *,
            assignments (*)
          `)
          .eq('student_id', studentId);
          
        if (assignmentError) throw assignmentError;

        setStudent(combinedStudentData);
        setAssignments(assignmentData || []);
      } catch (error) {
        console.error('Error fetching student data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [studentId]);

  const calculateGrade = () => {
    if (!assignments.length) return 'No assignments';
    const total = assignments.reduce((sum, a) => sum + (a.score || 0), 0);
    const max = assignments.reduce((sum, a) => sum + a.assignments.max_score, 0);
    return `${((total / max) * 100).toFixed(1)}%`;
  };

  if (loading) return <div>Loading...</div>;
  if (!student) return <div>Student not found</div>;

  return (
    <TeacherLayout>
      <h1 className="page-title">
        {student ? `Analysis for ${student.first_name} ${student.last_name}` : 'Student Analysis'}
      </h1>
      
      <div className="mb-3">
        <Link to="/teacher/dashboard" className="btn btn-outline-primary">
          <FaArrowLeft /> Back to Dashboard
        </Link>
      </div>
      
      <div>
        <h2>Student Information</h2>
        <p>Name: {student.first_name} {student.last_name}</p>
        <p>ID: {student.student_id}</p>
        <p>Email: {student.email}</p>
        <p>Overall Grade: {calculateGrade()}</p>
      </div>

      <hr />

      <div>
        <h2>Assignments</h2>
        {assignments.length === 0 ? (
          <p>No assignments yet</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map(assignment => (
                <tr key={assignment.id}>
                  <td>{assignment.assignments.title}</td>
                  <td>{assignment.assignments.type}</td>
                  <td>{new Date(assignment.assignments.due_date).toLocaleString()}</td>
                  <td>{assignment.status}</td>
                  <td>
                    {assignment.status === 'graded' 
                      ? `${assignment.score} / ${assignment.assignments.max_score}`
                      : 'Pending'
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </TeacherLayout>
  );
};

export default StudentAnalysis;