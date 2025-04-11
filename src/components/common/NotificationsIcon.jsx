import React, { useState, useEffect, useRef } from 'react';
import { FaBell } from 'react-icons/fa';
import { getUnreadNotificationCount, getUserNotifications, markNotificationsAsRead } from '../../backend/admin/notifications';
import './styles/NotificationsIcon.css';
import { useNavigate } from 'react-router-dom';

const NotificationsIcon = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Fetch unread notification count
  const fetchNotificationCount = async () => {
    try {
      const { count, error } = await getUnreadNotificationCount();
      if (!error) {
        setCount(count);
      }
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };

  // Fetch recent notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await getUserNotifications({ limit: 5 });
      if (!error && data) {
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark a notification as read
  const markAsRead = async (notificationId) => {
    try {
      const { error } = await markNotificationsAsRead(notificationId);
      if (!error) {
        // Update the local notification list
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, is_read: true } 
              : notification
          )
        );
        
        // Update the count
        fetchNotificationCount();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    // Initial fetch
    fetchNotificationCount();
    
    // Set up interval to check for new notifications
    const interval = setInterval(fetchNotificationCount, 60000); // Check every minute
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      clearInterval(interval);
    };
  }, []);

  // Toggle dropdown and fetch notifications
  const toggleDropdown = async () => {
    const newState = !showDropdown;
    setShowDropdown(newState);
    
    if (newState) {
      await fetchNotifications();
    }
  };

  // Format the time
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // View all notifications
  const viewAllNotifications = () => {
    navigate('/notifications');
    setShowDropdown(false);
  };

  return (
    <div className="notifications-icon-container" ref={dropdownRef}>
      <div className="notifications-icon" onClick={toggleDropdown}>
        <FaBell />
        {count > 0 && <span className="notification-badge">{count}</span>}
      </div>
      
      {showDropdown && (
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <h3>Notifications</h3>
            {notifications.some(n => !n.is_read) && (
              <button 
                className="mark-all-read"
                onClick={async () => {
                  const unreadIds = notifications
                    .filter(n => !n.is_read)
                    .map(n => n.id);
                  
                  if (unreadIds.length) {
                    await markNotificationsAsRead(unreadIds);
                    fetchNotifications();
                    fetchNotificationCount();
                  }
                }}
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="notifications-list">
            {loading ? (
              <div className="loading-notifications">Loading...</div>
            ) : notifications.length > 0 ? (
              notifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="notification-title">{notification.title}</div>
                  <div className="notification-message">{notification.message}</div>
                  <div className="notification-time">{formatTime(notification.created_at)}</div>
                </div>
              ))
            ) : (
              <div className="no-notifications">No notifications</div>
            )}
          </div>
          
          <div className="notifications-footer">
            <button onClick={viewAllNotifications}>View all notifications</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsIcon; 