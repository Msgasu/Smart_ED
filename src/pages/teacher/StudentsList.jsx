import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const StudentsList = () => {
  const { studentId } = useParams();
  const [students, setStudents] = useState([]);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*');

        if (error) throw error;
        setStudents(data);
      } catch (error) {
        console.error('Error fetching students:', error);
      }
    };

    fetchStudents();
  }, []);

  return (
    <div>
      {students.map(student => (
        <div key={student.id}>
          {student.name}
          <Link to={`/teacher/students/${student.id}/analysis/${student.courseId}`}>
            View Analysis
          </Link>
        </div>
      ))}
    </div>
  );
};

export default StudentsList; 