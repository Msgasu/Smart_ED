import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

const AssignmentSubmission = ({ assignmentId, studentId }) => {
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSubmission();
  }, [assignmentId, studentId]);

  const checkSubmission = async () => {
    try {
      const { data, error } = await supabase
        .from('student_assignments')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', studentId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setSubmission(data);
    } catch (error) {
      console.error('Error checking submission:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const { data, error } = await supabase
        .from('student_assignments')
        .insert({
          assignment_id: assignmentId,
          student_id: studentId,
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      
      setSubmission(data);
      toast.success('Assignment submitted successfully!');
    } catch (error) {
      console.error('Error submitting assignment:', error);
      toast.error('Failed to submit assignment');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex items-center gap-4">
      {submission ? (
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-semibold
            ${submission.status === 'graded' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'}`}
          >
            {submission.status === 'graded' ? 'Graded' : 'Submitted'}
          </span>
          {submission.status === 'graded' && (
            <span className="text-sm">Score: {submission.score}</span>
          )}
        </div>
      ) : (
        <button
          onClick={handleSubmit}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
        >
          Submit Assignment
        </button>
      )}
    </div>
  );
};

export default AssignmentSubmission; 