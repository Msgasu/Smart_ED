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
  FaTimes
} from 'react-icons/fa';
import { supabase } from '../../lib/supabase';
import './styles/TeacherLayout.css';

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
            .from('courses')
            .select('id, title')
            .eq('teacher_id', user.id);
            
          if (coursesError) throw coursesError;
          setTeacherCourses(coursesData || []);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    
    getUserProfile();
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/signin');
    } catch (error) {
      console.error('Error logging out:', error);
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
        
        <div className="user-profile">
          <div className="avatar">
            <span>{userName.split(' ').map(n => n[0]).join('')}</span>
          </div>
          <div className="user-info">
            <h3>{userName}</h3>
            <p>Teacher</p>
          </div>
        </div>
        
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
                <FaUserGraduate /> <span>My Students</span>
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
                          {course.title}
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
        <div className="teacher-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default TeacherLayout; 