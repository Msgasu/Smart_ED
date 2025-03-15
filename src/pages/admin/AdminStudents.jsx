import React from 'react';
import Students from '../../components/admin/Students';
import '../../components/admin/styles/Students.css';
import '../../components/admin/styles/AdminLayout.css';
import Sidebar from '../../components/admin/Sidebar';


const AdminStudents = () => {
  return (
    <div className="admin-layout">
    <AdminLayout>
      <main className="admin-main">
        <div className="admin-content">
        </div>
      </main>
  </AdminLayout>
    </div>
  );
};

export default AdminStudents;

