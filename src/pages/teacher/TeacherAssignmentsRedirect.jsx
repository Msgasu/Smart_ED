import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getTeacherCourses } from '../../backend/teachers/courses';
import AssignmentsCourseSelect from './AssignmentsCourseSelect';
import TeacherLayout from '../../components/teacher/TeacherLayout.jsx';

/**
 * /teacher/assignments entry: same destination as "Manage Assignments" on My Courses.
 * One course → go straight to that course's assignment management page.
 * Multiple → course picker (same links as My Courses).
 * None → My Courses.
 */
const TeacherAssignmentsRedirect = () => {
  const [status, setStatus] = useState('loading');
  const [courseId, setCourseId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setStatus('none');
          return;
        }

        const { data: courses, error } = await getTeacherCourses(user.id);
        if (error) throw error;

        const rows = courses || [];
        if (cancelled) return;

        if (rows.length === 0) {
          setStatus('none');
        } else if (rows.length === 1) {
          setCourseId(rows[0].course_id);
          setStatus('single');
        } else {
          setStatus('multiple');
        }
      } catch (e) {
        console.error('TeacherAssignmentsRedirect:', e);
        if (!cancelled) setStatus('multiple');
      }
    };

    run();
    return () => { cancelled = true; };
  }, []);

  if (status === 'loading') {
    return (
      <TeacherLayout>
        <div className="loading-spinner" style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Loading assignments…</p>
        </div>
      </TeacherLayout>
    );
  }

  if (status === 'none') {
    return <Navigate to="/teacher/courses" replace />;
  }

  if (status === 'single' && courseId) {
    return <Navigate to={`/teacher/courses/${courseId}/assignments`} replace />;
  }

  return <AssignmentsCourseSelect />;
};

export default TeacherAssignmentsRedirect;
