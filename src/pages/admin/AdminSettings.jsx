// AdminSettings.jsx
import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

const AdminSettings = () => {
  return (
    <AdminLayout>
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <i className="bi bi-gear me-2"></i>System Settings
              </div>
              <div className="card-body">
                <h4>Settings</h4>
                <p>This page is under construction. Settings functionality will be added soon.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
