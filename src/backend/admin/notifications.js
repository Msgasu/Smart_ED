import { supabase } from '../../lib/supabase';

/**
 * Send a notification to one or more recipients
 * @param {object} notification - The notification object
 * @param {string} notification.title - Notification title
 * @param {string} notification.message - Notification message
 * @param {string[]} notification.recipientIds - Array of recipient user IDs
 * @returns {Promise<object>} - Result with data or error
 */
export const sendNotification = async (notification) => {
  try {
    if (!notification.title || !notification.message || !notification.recipientIds || !notification.recipientIds.length) {
      throw new Error('Missing required notification fields');
    }
    
    // Get current user (sender)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Create notification objects for each recipient
    const notificationRecords = notification.recipientIds.map(recipientId => ({
      sender_id: user.id,
      recipient_id: recipientId,
      title: notification.title,
      message: notification.message,
      is_read: false,
      created_at: new Date().toISOString()
    }));
    
    // Insert notifications
    const { data, error } = await supabase
      .from('notifications')
      .insert(notificationRecords)
      .select();
      
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { data: null, error };
  }
};

/**
 * Get notifications for the current user
 * @param {object} options - Query options
 * @param {boolean} options.unreadOnly - Only fetch unread notifications
 * @param {number} options.limit - Maximum number of notifications to fetch
 * @returns {Promise<object>} - Result with data or error
 */
export const getUserNotifications = async (options = {}) => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Build query
    let query = supabase
      .from('notifications')
      .select(`
        *,
        sender:sender_id(id, first_name, last_name)
      `)
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false });
      
    // Apply filters
    if (options.unreadOnly) {
      query = query.eq('is_read', false);
    }
    
    // Apply limit
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    // Execute query
    const { data, error } = await query;
    
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return { data: null, error };
  }
};

/**
 * Mark notifications as read
 * @param {string|string[]} notificationIds - Single ID or array of notification IDs to mark as read
 * @returns {Promise<object>} - Result with data or error
 */
export const markNotificationsAsRead = async (notificationIds) => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Convert single ID to array
    const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds];
    
    // Update notifications
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .in('id', ids)
      .eq('recipient_id', user.id) // Ensure user only updates their own notifications
      .select();
      
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return { data: null, error };
  }
};

/**
 * Get unread notification count for the current user
 * @returns {Promise<object>} - Result with count or error
 */
export const getUnreadNotificationCount = async () => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Get unread count from user profile (faster than counting notifications)
    const { data, error } = await supabase
      .from('profiles')
      .select('unread_notifications')
      .eq('id', user.id)
      .single();
      
    if (error) throw error;
    
    return { count: data?.unread_notifications || 0, error: null };
  } catch (error) {
    console.error('Error getting notification count:', error);
    return { count: 0, error };
  }
}; 