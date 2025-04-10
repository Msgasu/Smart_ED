-- Create the notifications table for the Smart ED platform
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for the notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own notifications
CREATE POLICY "Users can view their own notifications"
    ON public.notifications
    FOR SELECT
    USING (auth.uid() = recipient_id OR auth.uid() = sender_id);

-- Allow users to create notifications if they are authenticated
CREATE POLICY "Users can create notifications"
    ON public.notifications
    FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

-- Allow users to update their own notifications (e.g., mark as read)
CREATE POLICY "Users can update their own notifications"
    ON public.notifications
    FOR UPDATE
    USING (auth.uid() = recipient_id)
    WITH CHECK (auth.uid() = recipient_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS notifications_recipient_id_idx ON public.notifications (recipient_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications (created_at DESC);

-- Update the public.profiles table to include a notification count
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS unread_notifications INTEGER DEFAULT 0;

-- Function to update unread notification count when a new notification is added
CREATE OR REPLACE FUNCTION public.update_unread_notification_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET unread_notifications = (
    SELECT COUNT(*)
    FROM public.notifications
    WHERE recipient_id = NEW.recipient_id AND is_read = FALSE
  )
  WHERE id = NEW.recipient_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update unread notification count on insert or update
DROP TRIGGER IF EXISTS update_notification_count ON public.notifications;
CREATE TRIGGER update_notification_count
AFTER INSERT OR UPDATE OF is_read ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_unread_notification_count(); 