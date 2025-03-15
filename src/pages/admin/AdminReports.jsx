import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import Reports from '../../components/admin/Reports';

const AdminReports = () => {
  return (
    <AdminLayout>
      <div className="report-container">
        <Reports />
      </div>
    </AdminLayout>
  );
};

export default AdminReports;
