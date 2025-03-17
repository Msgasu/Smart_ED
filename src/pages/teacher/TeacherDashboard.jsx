import React, { useState, useEffect } from 'react';
import { FaChalkboardTeacher, FaBook, FaUserGraduate, FaClipboardList, FaChartBar } from 'react-icons/fa';
import { supabase } from '../../lib/supabase';
import TeacherLayout from '../../components/teacher/TeacherLayout';
import { Link } from 'react-router-dom';

const TeacherDashboard = () => {
  const [stats, setStats] = useState({
    courses: 0,
    students: 0,
    assignments: 0,
    submissions: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentSubmissions, setRecentSubmissions] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;

        // Fetch faculty courses
        const { data: facultyCourses, error: coursesError } = await supabase
          .from('faculty_courses')
          .select('course_id')
          .eq('faculty_id', user.id);
          
        if (coursesError) throw coursesError;
        
        const courseIds = facultyCourses?.map(fc => fc.course_id) || [];
        
        // Get count of students enrolled in these courses
        const { count: studentsCount, error: studentsError } = await supabase
          .from('student_courses')
          .select('student_id', { count: 'exact', head: true })
          .in('course_id', courseIds);
          
        if (studentsError) throw studentsError;
        
        // Get count of assignments for these courses
        const { data: assignments, error: assignmentsError } = await supabase
          .from('assignments')
          .select('id')
          .in('course_id', courseIds);
          
        if (assignmentsError) throw assignmentsError;
        
        // Get count of submissions for these assignments
        const assignmentIds = assignments?.map(a => a.id) || [];
        const { count: submissionsCount, error: submissionsError } = await supabase
          .from('submissions')
          .select('id', { count: 'exact', head: true })
          .in('assignment_id', assignmentIds);
          
        if (submissionsError) throw submissionsError;
        
        // Get recent submissions
        const { data: recent, error: recentError } = await supabase
          .from('submissions')
          .select(`
            id,
            submitted_at,
            score,
            status,
            assignment_id,
            student_id,
            assignments(title, course_id),
            profiles(first_name, last_name)
          `)
          .in('assignment_id', assignmentIds)
          .order('submitted_at', { ascending: false })
          .limit(5);
          
        if (recentError) throw recentError;
        
        setStats({
          courses: courseIds.length,
          students: studentsCount || 0,
          assignments: assignments?.length || 0,
          submissions: submissionsCount || 0
        });
        
        setRecentSubmissions(recent || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  return (
    <TeacherLayout>
      <h1 className="page-title">Teacher Dashboard</h1>
      
      {loading ? (
        <div className="loading-spinner">Loading...</div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-icon blue">
                <FaBook />
              </div>
              <div className="stat-info">
                <h3>{stats.courses}</h3>
                <p>Courses</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon green">
                <FaUserGraduate />
              </div>
              <div className="stat-info">
                <h3>{stats.students}</h3>
                <p>Students</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon orange">
                <FaClipboardList />
              </div>
              <div className="stat-info">
                <h3>{stats.assignments}</h3>
                <p>Assignments</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon red">
                <FaChartBar />
              </div>
              <div className="stat-info">
                <h3>{stats.submissions}</h3>
                <p>Submissions</p>
              </div>
            </div>
          </div>
          
          {/* Quick Links */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <FaChalkboardTeacher /> Quick Actions
              </div>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-3">
                  <Link to="/teacher/courses" className="btn btn-primary w-100 mb-2">
                    <FaBook /> View Courses
                  </Link>
                </div>
                <div className="col-md-3">
                  <Link to="/teacher/students" className="btn btn-primary w-100 mb-2">
                    <FaUserGraduate /> View Students
                  </Link>
                </div>
                <div className="col-md-3">
                  <Link to="/teacher/assignments" className="btn btn-primary w-100 mb-2">
                    <FaClipboardList /> Manage Assignments
                  </Link>
                </div>
                <div className="col-md-3">
                  <Link to="/teacher/analysis" className="btn btn-primary w-100 mb-2">
                    <FaChartBar /> Student Analysis
                  </Link>
                </div>
              </div>
            </div>
          </div>
          
          {/* Recent Submissions */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <FaClipboardList /> Recent Submissions
              </div>
            </div>
            <div className="card-body">
              {recentSubmissions.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Assignment</th>
                      <th>Submitted</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSubmissions.map(submission => (
                      <tr key={submission.id}>
                        <td>{submission.profiles?.first_name} {submission.profiles?.last_name}</td>
                        <td>{submission.assignments?.title}</td>
                        <td>{new Date(submission.submitted_at).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge ${submission.status === 'graded' ? 'bg-success' : 'bg-warning'}`}>
                            {submission.status}
                          </span>
                        </td>
                        <td>{submission.status === 'graded' ? `${submission.score}%` : 'Pending'}</td>
                        <td>
                          <Link 
                            to={`/teacher/grade/${submission.id}`} 
                            className="btn btn-sm btn-outline-primary"
                          >
                            {submission.status === 'graded' ? 'Review' : 'Grade'}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No recent submissions found.</p>
              )}
            </div>
          </div>
        </>
      )}
    </TeacherLayout>
  );
};

export default TeacherDashboard;