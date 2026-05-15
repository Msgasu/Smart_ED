import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FaChalkboardTeacher, 
  FaBook, 
  FaClipboardList, 
  FaSignOutAlt,
  FaBars,
  FaTimes,
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
      if (error) {
        console.warn('Logout warning:', error);
      }
      
      localStorage.clear();
      sessionStorage.clear();
      
      navigate('/signin');
      window.location.reload();
    } catch (error) {
      console.error('Error logging out:', error);
      
      localStorage.clear();
      sessionStorage.clear();
      navigate('/signin');
      window.location.reload();
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="teacher-layout">
      <div className={`teacher-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">Teacher Portal</h2>
          <button className="sidebar-toggle" onClick={toggleSidebar}>
            {isSidebarOpen ? <FaTimes /> : <FaBars />}
          </button>
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
            <li className={location.pathname.startsWith('/teacher/assignments') ? 'active' : ''}>
              <Link to="/teacher/assignments">
                <FaClipboardList /> <span>Assignments</span>
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
