import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  FaHome, 
  FaBook, 
  FaClipboardList, 
  FaCalendarAlt, 
  FaUserGraduate, 
  FaCog, 
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaChartLine
} from 'react-icons/fa';
import './styles/StudentLayout.css';
import NotificationsIcon from '../common/NotificationsIcon';
import FontSizeToggle from '../FontSizeToggle';

const StudentLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userName, setUserName] = useState('');

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

  return (
    <div className="student-layout">
      {/* Sidebar */}
      <div className={`student-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">Student Portal</h2>
          <button className="sidebar-toggle" onClick={toggleSidebar}>
            {isSidebarOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
        
        <nav className="sidebar-nav">
          <ul>
            <li className={location.pathname === '/student/dashboard' ? 'active' : ''}>
              <Link to="/student/dashboard">
                <FaHome /> <span>Dashboard</span>
              </Link>
            </li>
            <li className={location.pathname === '/student/courses' ? 'active' : ''}>
              <Link to="/student/courses">
                <FaBook /> <span>My Courses</span>
              </Link>
            </li>
            <li className={location.pathname === '/student/assignments' ? 'active' : ''}>
              <Link to="/student/assignments">
                <FaClipboardList /> <span>Assignments</span>
              </Link>
            </li>
            <li className={location.pathname === '/student/career-prediction' ? 'active' : ''}>
              <Link to="/student/career-prediction">
                <FaChartLine /> <span>Career Prediction</span>
              </Link>
            </li>
            <li className={location.pathname === '/student/calendar' ? 'active' : ''}>
              <Link to="/student/calendar">
                <FaCalendarAlt /> <span>Calendar</span>
              </Link>
            </li>
            <li className={location.pathname === '/student/profile' ? 'active' : ''}>
              <Link to="/student/profile">
                <FaUserGraduate /> <span>Profile</span>
              </Link>
            </li>
            <li className={location.pathname === '/student/settings' ? 'active' : ''}>
              <Link to="/student/settings">
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
      <div className="student-main">
        <header className="student-header">
          <div className="header-title">
            <h2>{userName ? `Welcome, ${userName}` : 'Student Portal'}</h2>
          </div>
          <div className="header-actions">
            <NotificationsIcon />
            <FontSizeToggle />
            <div className="avatar">
              <span>{userName.split(' ').map(n => n[0]).join('')}</span>
            </div>
          </div>
        </header>
        <div className="student-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default StudentLayout; 