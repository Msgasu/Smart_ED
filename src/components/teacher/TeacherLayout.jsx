import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FaChalkboardTeacher, 
  FaBook, 
  FaUserGraduate, 
  FaClipboardList, 
  FaChartBar, 
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaFileAlt,
  FaCog
} from 'react-icons/fa';
import { supabase } from '../../lib/supabase';
import './styles/TeacherLayout.css';
import NotificationsIcon from '../common/NotificationsIcon';
import FontSizeToggle from '../FontSizeToggle';

const TeacherLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userName, setUserName] = useState('');
  const [teacherCourses, setTeacherCourses] = useState([]);
  const [showAssignmentsDropdown, setShowAssignmentsDropdown] = useState(false);

  useEffect(() => {
    const getUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', user.id)
            .single();
            
          if (error) throw error;
          if (data) {
            setUserName(`${data.first_name} ${data.last_name}`);
          }

          // Fetch teacher courses for assignments dropdown
          const { data: coursesData, error: coursesError } = await supabase
            .from('faculty_courses')
            .select(`
              course_id,
              courses (
                id,
                name
              )
            `)
            .eq('faculty_id', user.id);
            
          if (coursesError) throw coursesError;
          
          // Transform the data to match the expected format
          const transformedCourses = coursesData?.map(fc => ({
            id: fc.courses.id,
            name: fc.courses.name
          })) || [];
          
          setTeacherCourses(transformedCourses);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    
    getUserProfile();
  }, []);

  const handleLogout = async () => {
    try {
      // Try to sign out, but don't let errors prevent logout
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn('Logout warning:', error);
        // Even if signOut fails, we should still redirect to clear the UI
      }
      
      // Clear any local session data
      localStorage.clear();
      sessionStorage.clear();
      
      // Force redirect to signin
      navigate('/signin');
      
      // Reload page to ensure clean state
      window.location.reload();
    } catch (error) {
      console.error('Error logging out:', error);
      
      // Even if logout fails, clear local data and redirect
      localStorage.clear();
      sessionStorage.clear();
      navigate('/signin');
      window.location.reload();
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleAssignmentsDropdown = () => {
    setShowAssignmentsDropdown(!showAssignmentsDropdown);
  };

  return (
    <div className="teacher-layout">
      {/* Sidebar */}
      <div className={`teacher-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">Teacher Portal</h2>
          <button className="sidebar-toggle" onClick={toggleSidebar}>
            {isSidebarOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
        
        {/* <div className="user-profile">
          <div className="avatar">
            <span>{userName.split(' ').map(n => n[0]).join('')}</span>
          </div>
          <div className="user-info">
            <h3>{userName}</h3>
            <p>Teacher</p>
          </div>
        </div> */}
        
        <nav className="sidebar-nav">
          <ul>
            <li className={location.pathname === '/teacher/dashboard' ? 'active' : ''}>
              <Link to="/teacher/dashboard">
                <FaChalkboardTeacher /> <span>Dashboard</span>
              </Link>
            </li>
            <li className={location.pathname === '/teacher/courses' ? 'active' : ''}>
              <Link to="/teacher/courses">
                <FaBook /> <span>My Courses</span>
              </Link>
            </li>
            <li className={location.pathname === '/teacher/students' ? 'active' : ''}>
              <Link to="/teacher/students">
                <FaUserGraduate /> <span> Users </span>
              </Link>
            </li>
            <li className={location.pathname.includes('/teacher/assignments') || location.pathname.includes('/teacher/courses') && location.pathname.includes('/assignments') ? 'active' : ''}>
              <div className="dropdown-menu">
                <div className="dropdown-header" onClick={toggleAssignmentsDropdown}>
                  <FaClipboardList /> <span>Assignments</span>
                </div>
                {showAssignmentsDropdown && (
                  <div className="dropdown-items">
                    {teacherCourses.length > 0 ? (
                      teacherCourses.map(course => (
                        <Link 
                          key={course.id} 
                          to={`/teacher/courses/${course.id}/assignments`}
                          className="dropdown-item"
                        >
                          {course.name}
                        </Link>
                      ))
                    ) : (
                      <div className="dropdown-item disabled">No courses available</div>
                    )}
                  </div>
                )}
              </div>
            </li>
            <li className={location.pathname === '/teacher/analysis' ? 'active' : ''}>
              <Link to="/teacher/analysis">
                <FaChartBar /> <span>Student Analysis</span>
              </Link>
            </li>
            <li className={location.pathname.includes('/teacher/reports') || location.pathname.includes('/teacher/report-view') ? 'active' : ''}>
              <Link to="/teacher/reports">
                <FaFileAlt /> <span>Reports</span>
              </Link>
            </li>
            <li className={location.pathname === '/teacher/settings' ? 'active' : ''}>
              <Link to="/teacher/settings">
                <FaCog /> <span>Settings</span>
              </Link>
            </li>
          </ul>
        </nav>
        
        <div className="sidebar-footer">
          <button className="logout-button" onClick={handleLogout}>
            <FaSignOutAlt /> <span>Logout</span>
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="teacher-main">
        <header className="teacher-header">
          <div className="header-title">
            <h2>{userName ? `Welcome, ${userName}` : 'Teacher Portal'}</h2>
          </div>
          <div className="header-actions">
            <NotificationsIcon />
            <FontSizeToggle />
            <div className="avatar">
              <span>{userName.split(' ').map(n => n[0]).join('')}</span>
            </div>
          </div>
        </header>
        <div className="teacher-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default TeacherLayout;