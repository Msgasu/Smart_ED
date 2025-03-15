import React from 'react';
import './styles/AdminLayout.css';

const Dashboard = () => {
  return (
    <div className="container-fluid">
      <div className="row">
        {/* Statistics Cards */}
        <div className="col-md-3">
          <div className="card">
            <div className="card-header">
              <i className="bi bi-people me-2"></i>Total Students
            </div>
            <div className="card-body">
              <h2 className="card-title">450</h2>
              <p className="text-success"><i className="bi bi-arrow-up"></i> 12% increase</p>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card">
            <div className="card-header">
              <i className="bi bi-calendar-check me-2"></i>Attendance Rate
            </div>
            <div className="card-body">
              <h2 className="card-title">85%</h2>
              <p className="text-muted">This month</p>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card">
            <div className="card-header">
              <i className="bi bi-journal-text me-2"></i>Active Courses
            </div>
            <div className="card-body">
              <h2 className="card-title">24</h2>
              <p className="text-muted">Across all departments</p>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card">
            <div className="card-header">
              <i className="bi bi-currency-dollar me-2"></i>Revenue
            </div>
            <div className="card-body">
              <h2 className="card-title">$52,450</h2>
              <p className="text-success"><i className="bi bi-arrow-up"></i> 8% increase</p>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="col-md-6 mt-4">
          <div className="card">
            <div className="card-header">
              <i className="bi bi-activity me-2"></i>Recent Activities
            </div>
            <div className="card-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <ul className="list-group list-group-flush">
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">New Student Registration</h6>
                    <small className="text-muted">John Doe enrolled in Computer Science</small>
                  </div>
                  <small className="text-muted">2 mins ago</small>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">Course Update</h6>
                    <small className="text-muted">Mathematics 101 syllabus updated</small>
                  </div>
                  <small className="text-muted">1 hour ago</small>
                </li>
                {/* Add more activity items */}
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-md-6 mt-4">
          <div className="card">
            <div className="card-header">
              <i className="bi bi-lightning me-2"></i>Quick Actions
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <button className="btn btn-primary"><i className="bi bi-person-plus me-2"></i>Add New Student</button>
                <button className="btn btn-success"><i className="bi bi-file-earmark-plus me-2"></i>Create Report</button>
                <button className="btn btn-info"><i className="bi bi-envelope me-2"></i>Send Announcement</button>
                <button className="btn btn-warning"><i className="bi bi-calendar-plus me-2"></i>Schedule Event</button>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="col-md-12 mt-4">
          <div className="card">
            <div className="card-header">
              <i className="bi bi-calendar-event me-2"></i>Upcoming Events
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Location</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Parent-Teacher Meeting</td>
                      <td>May 15, 2024</td>
                      <td>10:00 AM</td>
                      <td>Main Hall</td>
                      <td><span className="badge bg-primary">Upcoming</span></td>
                    </tr>
                    <tr>
                      <td>Annual Sports Day</td>
                      <td>May 20, 2024</td>
                      <td>9:00 AM</td>
                      <td>Sports Complex</td>
                      <td><span className="badge bg-warning">Planning</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
