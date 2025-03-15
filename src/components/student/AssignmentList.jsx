import React from 'react';

const AssignmentList = ({ assignments }) => {
  return (
    <div>
      <h2>Course Assignments</h2>
      {assignments.length === 0 ? (
        <p>No assignments yet</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map(assignment => (
              <tr key={assignment.id}>
                <td>{assignment.title}</td>
                <td>{assignment.type}</td>
                <td>{new Date(assignment.due_date).toLocaleString()}</td>
                <td>{assignment.student_assignments[0]?.status || 'not_submitted'}</td>
                <td>
                  {assignment.student_assignments[0]?.status === 'graded' 
                    ? `${assignment.student_assignments[0].score} / ${assignment.max_score}`
                    : 'Pending'
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AssignmentList;
