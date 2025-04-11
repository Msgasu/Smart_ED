import React, { useState, useEffect } from 'react';
import { getUserNotifications, markNotificationsAsRead } from '../backend/admin/notifications';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaBell, FaCheck, FaEnvelope, FaEnvelopeOpen, FaTrash, FaUser } from 'react-icons/fa';
import { supabase } from '../lib/supabase';
import './styles/Notifications.css';
import AdminLayout from '../components/admin/AdminLayout';
import TeacherLayout from '../components/teacher/TeacherLayout';
import StudentLayout from '../components/student/StudentLayout';
import { toast } from 'react-hot-toast';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'read', 'unread'
  const navigate = useNavigate();
  
  // Fetch all user notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await getUserNotifications();
      
      if (error) {
        throw error;
      }
      
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Get user role and fetch notifications on component mount
  useEffect(() => {
    const fetchUserAndNotifications = async () => {
      try {
        // Get current user and role
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
            
          if (profile) {
            setUserRole(profile.role);
          }
        } else {
          // User is not authenticated, redirect to login
          navigate('/signin');
        }
        
        // Fetch notifications
        fetchNotifications();
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    };
    
    fetchUserAndNotifications();
  }, [navigate]);
  
  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const { error } = await markNotificationsAsRead(notificationId);
      
      if (error) {
        throw error;
      }
      
      // Update the local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true } 
            : notification
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };
  
  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications
        .filter(notification => !notification.is_read)
        .map(notification => notification.id);
        
      if (unreadIds.length === 0) return;
      
      const { error } = await markNotificationsAsRead(unreadIds);
      
      if (error) {
        throw error;
      }
      
      // Update the local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({ ...notification, is_read: true }))
      );
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };
  
  // Delete a notification
  const deleteNotification = async (notificationId, event) => {
    // Prevent triggering the parent onClick (mark as read)
    event.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
        
      if (error) {
        throw error;
      }
      
      // Update the local state
      setNotifications(prevNotifications => 
        prevNotifications.filter(notification => notification.id !== notificationId)
      );
      
      toast.success('Notification deleted');
    } catch (err) {
      console.error('Error deleting notification:', err);
      toast.error('Failed to delete notification');
    }
  };
  
  // Format notification date
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  // Format sender name
  const formatSenderName = (sender) => {
    if (!sender) return 'System';
    return `${sender.first_name || ''} ${sender.last_name || ''}`.trim() || 'Unknown';
  };
  
  // Filter notifications based on selection
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'read') return notification.is_read;
    if (filter === 'unread') return !notification.is_read;
    return true; // 'all'
  });
  
  // Get the appropriate layout based on user role
  const getLayout = (content) => {
    switch (userRole) {
      case 'admin':
        return <AdminLayout>{content}</AdminLayout>;
      case 'faculty':
        return <TeacherLayout>{content}</TeacherLayout>;
      case 'student':
        return <StudentLayout>{content}</StudentLayout>;
      default:
        return content;
    }
  };

  const notificationsContent = (
    <div className="notifications-page">
      <div className="notifications-header">
        <h1><FaBell /> Notifications</h1>
        <div className="header-actions">
          {notifications.some(n => !n.is_read) && (
            <button 
              className="mark-all-read-btn"
              onClick={markAllAsRead}
            >
              <FaCheck /> Mark all as read
            </button>
          )}
        </div>
      </div>
      
      <div className="notifications-filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`} 
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button 
          className={`filter-btn ${filter === 'unread' ? 'active' : ''}`} 
          onClick={() => setFilter('unread')}
        >
          Unread
        </button>
        <button 
          className={`filter-btn ${filter === 'read' ? 'active' : ''}`} 
          onClick={() => setFilter('read')}
        >
          Read
        </button>
      </div>
      
      <div className="notifications-container">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading notifications...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p>{error}</p>
            <button onClick={fetchNotifications}>Try Again</button>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="empty-container">
            <FaEnvelope className="empty-icon" />
            <p>No {filter !== 'all' ? filter : ''} notifications found</p>
          </div>
        ) : (
          <div className="notifications-list">
            {filteredNotifications.map(notification => (
              <div 
                key={notification.id}
                className={`notification-card ${!notification.is_read ? 'unread' : ''}`}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
              >
                <div className="notification-icon">
                  {notification.is_read ? <FaEnvelopeOpen /> : <FaEnvelope />}
                </div>
                <div className="notification-content">
                  <div className="notification-header">
                    <h3 className="notification-title">{notification.title}</h3>
                    <button 
                      className="delete-notification-btn"
                      onClick={(e) => deleteNotification(notification.id, e)}
                      title="Delete notification"
                    >
                      <FaTrash />
                    </button>
                  </div>
                  <p className="notification-message">{notification.message}</p>
                  <div className="notification-meta">
                    <div className="notification-info">
                      <span className="notification-sender">
                        <FaUser /> {formatSenderName(notification.sender)}
                      </span>
                      <span className="notification-time">{formatDate(notification.created_at)}</span>
                    </div>
                    {!notification.is_read && (
                      <span className="notification-status">Unread</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return getLayout(notificationsContent);
};

export default Notifications; 