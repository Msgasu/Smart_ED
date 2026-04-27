-- Allow admin users to view/edit/delete notifications across the system.
-- This keeps student/faculty/guardian behavior unchanged while enabling admin management UI in smart-reports.

-- Ensure RLS is enabled (no-op if already enabled)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Admin can view all notifications
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;
CREATE POLICY "Admins can view all notifications"
  ON public.notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- Admin can update any notifications (edit title/message, mark read, etc.)
DROP POLICY IF EXISTS "Admins can update all notifications" ON public.notifications;
CREATE POLICY "Admins can update all notifications"
  ON public.notifications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- Admin can delete any notifications
DROP POLICY IF EXISTS "Admins can delete all notifications" ON public.notifications;
CREATE POLICY "Admins can delete all notifications"
  ON public.notifications
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

