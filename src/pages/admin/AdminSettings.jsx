// AdminSettings.jsx
import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { FaCog, FaUserCog, FaSchool, FaDatabase } from 'react-icons/fa';
import '../../components/admin/styles/AdminLayout.css';

const AdminSettings = () => {
  return (
    <AdminLayout>
      <div>
        <h1 className="page-title">System Settings</h1>
        
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <FaCog /> General Settings
            </div>
          </div>
          <div className="card-body">
            <p>Configure general system settings and preferences.</p>
            <div className="form-group">
              <label className="form-label">School Name</label>
              <input type="text" className="form-control" defaultValue="Learning Institute Center" />
            </div>
            <div className="form-group">
              <label className="form-label">Academic Year</label>
              <select className="form-select">
                <option>2023-2024</option>
                <option>2024-2025</option>
              </select>
            </div>
            <button className="btn btn-primary mt-3">Save Changes</button>
          </div>
        </div>
        
        <div className="row mt-4">
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <FaUserCog /> User Management
                </div>
              </div>
              <div className="card-body">
                <p>Manage user roles and permissions.</p>
                <button className="btn btn-secondary">Configure Permissions</button>
              </div>
            </div>
          </div>
          
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <FaSchool /> School Information
                </div>
              </div>
              <div className="card-body">
                <p>Update school details and contact information.</p>
                <button className="btn btn-secondary">Edit Information</button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card mt-4">
          <div className="card-header">
            <div className="card-title">
              <FaDatabase /> Database Management
            </div>
          </div>
          <div className="card-body">
            <p>Manage database operations and backups.</p>
            <div className="d-flex gap-2">
              <button className="btn btn-secondary">Backup Database</button>
              <button className="btn btn-danger">Reset Database</button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
