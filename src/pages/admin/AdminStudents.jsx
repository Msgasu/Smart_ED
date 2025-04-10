import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import Students from '../../components/admin/Students';
import '../../components/admin/styles/Students.css';

const AdminStudents = () => {
  return (
    <AdminLayout>
      <Students />
    </AdminLayout>
  );
};

export default AdminStudents;

