import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const Sidebar = () => {
  const location = useLocation();
  const [userRole, setUserRole] = useState(null);
  
  useEffect(() => {
    const getUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
          
        if (data) {
          setUserRole(data.role);
        }
      }
    };
    
    getUserRole();
  }, []);

  // Admin sidebar links
  const adminLinks = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
    { to: '/admin/students', label: 'Users', icon: 'bi-people' },
    { to: '/admin/courses', label: 'Courses', icon: 'bi-book' },
    // Remove the Teacher Dashboard link
    // { to: '/teacher/dashboard', label: 'Teacher Dashboard', icon: 'bi-person-workspace' },
    { to: '/admin/settings', label: 'Settings', icon: 'bi-gear' }
  ];

  // Faculty sidebar links
  const facultyLinks = [
    { to: '/teacher/dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
    { to: '/teacher/courses', label: 'My Courses', icon: 'bi-book' },
    { to: '/teacher/students', label: 'My Students', icon: 'bi-people' }
  ];

  // Student sidebar links
  const studentLinks = [
    { to: '/student/dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
    { to: '/student/courses', label: 'My Courses', icon: 'bi-book' },
    { to: '/student/grades', label: 'My Grades', icon: 'bi-award' }
  ];

  // Guardian sidebar links
  const guardianLinks = [
    { to: '/guardian/dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
    { to: '/guardian/students', label: 'My Students', icon: 'bi-people' }
  ];

  // Determine which links to show based on user role
  const links = userRole === 'admin' ? adminLinks :
                userRole === 'faculty' ? facultyLinks :
                userRole === 'student' ? studentLinks :
                userRole === 'guardian' ? guardianLinks : [];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>School Portal</h3>
      </div>
      <ul className="sidebar-menu">
        {links.map((link, index) => (
          <li key={index} className={location.pathname === link.to ? 'active' : ''}>
            <Link to={link.to}>
              <i className={`bi ${link.icon}`}></i>
              <span>{link.label}</span>
            </Link>
          </li>
        ))}
        <li>
          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/signin';
            }}
            className="sidebar-logout"
          >
            <i className="bi bi-box-arrow-right"></i>
            <span>Logout</span>
          </button>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar; 