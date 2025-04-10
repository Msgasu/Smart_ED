import React, { useState, useEffect } from 'react';
import { FaUsers, FaGraduationCap, FaBook, FaChartLine, FaBell, FaUserPlus, FaFileAlt, FaPaperPlane, FaCalendarPlus, FaHistory, FaUserGraduate, FaClipboardCheck, FaBookOpen } from 'react-icons/fa';
import './styles/Dashboard.css';
import './styles/AdminLayout.css';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

const Dashboard = () => {
  const [stats, setStats] = useState({
    students: 0,
    courses: 0,
    faculty: 0,
    assignments: 0,
    recentActivities: [],
    upcomingEvents: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch counts in parallel using Promise.all
        const [studentsResponse, facultyResponse, coursesResponse, assignmentsResponse, activitiesResponse, recentAssignmentsResponse, upcomingAssignmentsResponse] = await Promise.all([
          // Count students
          supabase
            .from('profiles')
            .select('id', { count: 'exact' })
            .eq('role', 'student'),
          
          // Count faculty
          supabase
            .from('profiles')
            .select('id', { count: 'exact' })
            .eq('role', 'faculty'),
          
          // Count courses
          supabase
            .from('courses')
            .select('id', { count: 'exact' }),
          
          // Count assignments
          supabase
            .from('assignments')
            .select('id', { count: 'exact' }),
            
          // Fetch recent user activities (latest profiles)
          supabase
            .from('profiles')
            .select('id, first_name, last_name, email, role, created_at')
            .order('created_at', { ascending: false })
            .limit(3),
            
          // Fetch recent assignments
          supabase
            .from('assignments')
            .select(`
              id, 
              title, 
              created_at,
              course_id, 
              courses (
                name, 
                code
              )
            `)
            .order('created_at', { ascending: false })
            .limit(3),
            
          // Fetch upcoming assignments (due dates in the future)
          supabase
            .from('assignments')
            .select(`
              id,
              title,
              due_date,
              course_id,
              courses(name, code)
            `)
            .gt('due_date', new Date().toISOString())
            .order('due_date', { ascending: true })
            .limit(3)
        ]);
        
        if (studentsResponse.error) throw studentsResponse.error;
        if (facultyResponse.error) throw facultyResponse.error;
        if (coursesResponse.error) throw coursesResponse.error;
        if (assignmentsResponse.error) throw assignmentsResponse.error;
        if (activitiesResponse.error) throw activitiesResponse.error;
        if (recentAssignmentsResponse.error) throw recentAssignmentsResponse.error;
        if (upcomingAssignmentsResponse.error) throw upcomingAssignmentsResponse.error;
        
        // Create a merged and sorted array of activities and assignments
        const userActivities = (activitiesResponse.data || []).map(activity => ({
          ...activity,
          type: 'user'
        }));
        
        const assignmentActivities = (recentAssignmentsResponse.data || []).map(assignment => ({
          id: assignment.id,
          title: assignment.title,
          course: assignment.courses,
          created_at: assignment.created_at,
          type: 'assignment'
        }));
        
        // Combine and sort by created_at, most recent first
        const allActivities = [...userActivities, ...assignmentActivities].sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        ).slice(0, 5); // Take only the 5 most recent
        
        setStats({
          students: studentsResponse.count || 0,
          faculty: facultyResponse.count || 0,
          courses: coursesResponse.count || 0,
          assignments: assignmentsResponse.count || 0,
          recentActivities: allActivities,
          upcomingEvents: upcomingAssignmentsResponse.data || []
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  // Format relative time (e.g., "2 hours ago")
  const getRelativeTime = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now - past) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`;
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    } else if (diffInSeconds < 604800) {
      return `${Math.floor(diffInSeconds / 86400)} days ago`;
    } else {
      return past.toLocaleDateString();
    }
  };

  return (
    <div>
      <h1 className="page-title">Admin Dashboard</h1>
      
      {/* Statistics Cards */}
      <div className="dashboard-container">
        <div className="stats-card">
          <div className="stats-header">
            <h3 className="stats-title">Total Students</h3>
            <div className="stats-icon students">
              <FaUsers />
            </div>
          </div>
          <div className="stats-value">{loading ? '...' : stats.students}</div>
          <div className="stats-description">Enrolled students</div>
          <div className="stats-trend positive">
            <FaChartLine /> Active students
          </div>
        </div>
        
        <div className="stats-card">
          <div className="stats-header">
            <h3 className="stats-title">Active Courses</h3>
            <div className="stats-icon courses">
              <FaBook />
            </div>
          </div>
          <div className="stats-value">{loading ? '...' : stats.courses}</div>
          <div className="stats-description">Across all departments</div>
          <div className="stats-trend positive">
            <FaChartLine /> Available courses
          </div>
        </div>
        
        <div className="stats-card">
          <div className="stats-header">
            <h3 className="stats-title">Faculty Members</h3>
            <div className="stats-icon teachers">
              <FaGraduationCap />
            </div>
          </div>
          <div className="stats-value">{loading ? '...' : stats.faculty}</div>
          <div className="stats-description">Active teachers</div>
          <div className="stats-trend positive">
            <FaChartLine /> Teaching staff
          </div>
        </div>
        
        <div className="stats-card">
          <div className="stats-header">
            <h3 className="stats-title">Assignments</h3>
            <div className="stats-icon assignments">
              <FaClipboardCheck />
            </div>
          </div>
          <div className="stats-value">{loading ? '...' : stats.assignments}</div>
          <div className="stats-description">Active assignments</div>
          <div className="stats-trend positive">
            <FaChartLine /> Current assignments
          </div>
        </div>
      </div>
      
      <div className="row">
        {/* Recent Activities */}
        <div className="col-md-6">
          <div className="recent-activity">
            <div className="activity-header">
              <h2><FaHistory /> Recent Activities</h2>
              <button className="btn btn-secondary">View All</button>
            </div>
            <div className="activity-list">
              {loading ? (
                <div className="loading-spinner">Loading activities...</div>
              ) : stats.recentActivities.length > 0 ? (
                stats.recentActivities.map((activity, index) => (
                  <div className="activity-item" key={activity.id || index}>
                    <div className={`activity-icon ${activity.type === 'user' ? activity.role || 'user' : 'assignment'}`}>
                      {activity.type === 'user' ? (
                        activity.role === 'student' ? (
                          <FaUserGraduate />
                        ) : activity.role === 'faculty' ? (
                          <FaGraduationCap />
                        ) : (
                          <FaUserPlus />
                        )
                      ) : (
                        <FaClipboardCheck />
                      )}
                    </div>
                    <div className="activity-content">
                      <div className="activity-title">
                        {activity.type === 'user' ? (
                          activity.role === 'student'
                            ? 'New Student Registration'
                            : activity.role === 'faculty'
                            ? 'New Faculty Member'
                            : 'New User Added'
                        ) : (
                          'New Assignment Created'
                        )}
                      </div>
                      <div>
                        {activity.type === 'user' ? (
                          <>
                            {activity.first_name || ''} {activity.last_name || ''}{' '}
                            {activity.role ? `(${activity.role})` : ''}
                          </>
                        ) : (
                          <>
                            {activity.title} {activity.course ? `- ${activity.course.code}` : ''}
                          </>
                        )}
                      </div>
                      <div className="activity-time">
                        {getRelativeTime(activity.created_at)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-activities">No recent activities found</div>
              )}
            </div>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="col-md-6">
          <div className="quick-actions">
            <div className="actions-header">
              <h2><FaBell /> Quick Actions</h2>
            </div>
            <div className="actions-grid">
              <button className="action-button">
                <div className="action-icon add-student">
                  <FaUserPlus />
                </div>
                <div className="action-text">Add New Student</div>
              </button>
              
              <button className="action-button">
                <div className="action-icon add-course">
                  <FaBook />
                </div>
                <div className="action-text">Create Course</div>
              </button>
              
              <button className="action-button">
                <div className="action-icon generate-report">
                  <FaFileAlt />
                </div>
                <div className="action-text">Generate Report</div>
              </button>
              
              <button className="action-button">
                <div className="action-icon send-notification">
                  <FaPaperPlane />
                </div>
                <div className="action-text">Send Notification</div>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Upcoming Events */}
      <div className="card mt-4">
        <div className="card-header">
          <div className="card-title">
            <FaCalendarPlus /> Upcoming Assignments
          </div>
        </div>
        <div className="card-body">
          <div className="table-container">
            {loading ? (
              <p className="text-center">Loading upcoming assignments...</p>
            ) : stats.upcomingEvents && stats.upcomingEvents.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Assignment</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Course</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.upcomingEvents.map((event, index) => (
                    <tr key={event.id || index}>
                      <td>{event.title}</td>
                      <td>{new Date(event.due_date).toLocaleDateString()}</td>
                      <td>{new Date(event.due_date).toLocaleTimeString()}</td>
                      <td>{event.courses ? event.courses.name : 'N/A'}</td>
                      <td><span className="badge badge-info">Due</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-center">No upcoming assignments found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
