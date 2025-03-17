import React from 'react';
import Students from '../../components/admin/Students';
import '../../components/admin/styles/Students.css';
import '../../components/admin/styles/AdminLayout.css';
import AdminLayout from '../../components/admin/AdminLayout';

const StudentsPage = () => {
  return (
    <AdminLayout>
      <Students />
    </AdminLayout>
  );
};

export default StudentsPage;
