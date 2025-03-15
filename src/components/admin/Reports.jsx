import React from 'react';
import './styles/AdminLayout.css';

const Reports = () => {
  return (
    <div>
      {/* School Information */}
      <div className="school-info text-center">
        <div className="row">
          <div className="col-md-2">
            {/* <img src="/path/to/school-logo.png" alt="School Logo" className="img-fluid" /> */}
          </div>
          <div className="col-md-10 school-details">
            <h3>Life International College</h3>
            <p>Private mail Bag, 252 Tema. / Tel: 024 437 7584</p>
            <h4>TERMINAL REPORT</h4>
          </div>
        </div>
      </div>

      {/* Student Information */}
      <div className="student-info">
        <div className="row mb-3">
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="studentName" className="form-label">Student Name</label>
              <input type="text" className="form-control" id="studentName" placeholder="Enter student name" />
            </div>
          </div>
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="studentClass" className="form-label">Class</label>
              <input type="text" className="form-control" id="studentClass" placeholder="Enter class" />
            </div>
          </div>
        </div>
        <div className="row mb-3">
          <div className="col-md-4">
            <div className="mb-3">
              <label htmlFor="studentAge" className="form-label">Age</label>
              <input type="number" className="form-control" id="studentAge" placeholder="Enter age" />
            </div>
          </div>
          <div className="col-md-4">
            <div className="mb-3">
              <label htmlFor="studentSex" className="form-label">Sex</label>
              <input type="text" className="form-control" id="studentSex" placeholder="Enter sex" />
            </div>
          </div>
          <div className="col-md-4">
            <div className="mb-3">
              <label htmlFor="currentTerm" className="form-label">Current Term</label>
              <input type="text" className="form-control" id="currentTerm" placeholder="Enter term" />
            </div>
          </div>
        </div>
        <div className="row mb-3">
          <div className="col-md-4">
            <div className="mb-3">
              <label htmlFor="programOffering" className="form-label">Program Offering</label>
              <input type="text" className="form-control" id="programOffering" placeholder="Enter program" />
            </div>
          </div>
          <div className="col-md-4">
            <div className="mb-3">
              <label htmlFor="house" className="form-label">House</label>
              <input type="text" className="form-control" id="house" placeholder="Enter house" />
            </div>
          </div>
          <div className="col-md-4">
            <div className="mb-3">
              <label htmlFor="year" className="form-label">Year</label>
              <input type="text" className="form-control" id="year" placeholder="Enter year" />
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="average" className="form-label">Average</label>
              <input type="text" className="form-control" id="average" placeholder="Enter average" />
            </div>
          </div>
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="attendance" className="form-label">Attendance</label>
              <input type="text" className="form-control" id="attendance" placeholder="Enter attendance" />
            </div>
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Subjects</th>
              <th>Class Score</th>
              <th>Exam Score</th>
              <th>Total Position</th>
              <th>Grades</th>
              <th>Remark</th>
              <th>Sign</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Core Mathematics</td>
              <td><input type="text" className="form-control" placeholder="Enter score" /></td>
              <td><input type="text" className="form-control" placeholder="Enter score" /></td>
              <td><input type="text" className="form-control" placeholder="Enter position" /></td>
              <td><input type="text" className="form-control" placeholder="Enter grade" /></td>
              <td><input type="text" className="form-control" placeholder="Enter remark" /></td>
              <td><input type="text" className="form-control" placeholder="Enter signature" /></td>
            </tr>

            <tr>
              <td>English</td>
              <td><input type="text" className="form-control" placeholder="Enter score" /></td>
              <td><input type="text" className="form-control" placeholder="Enter score" /></td>
              <td><input type="text" className="form-control" placeholder="Enter position" /></td>
              <td><input type="text" className="form-control" placeholder="Enter grade" /></td>
              <td><input type="text" className="form-control" placeholder="Enter remark" /></td>
              <td><input type="text" className="form-control" placeholder="Enter signature" /></td>
            </tr>

            <tr>
              <td>Social Studies</td>
              <td><input type="text" className="form-control" placeholder="Enter score" /></td>
              <td><input type="text" className="form-control" placeholder="Enter score" /></td>
              <td><input type="text" className="form-control" placeholder="Enter position" /></td>
              <td><input type="text" className="form-control" placeholder="Enter grade" /></td>
              <td><input type="text" className="form-control" placeholder="Enter remark" /></td>
              <td><input type="text" className="form-control" placeholder="Enter signature" /></td>
            </tr>

            <tr>
              <td>Integrated Science</td>
              <td><input type="text" className="form-control" placeholder="Enter score" /></td>
              <td><input type="text" className="form-control" placeholder="Enter score" /></td>
              <td><input type="text" className="form-control" placeholder="Enter position" /></td>
              <td><input type="text" className="form-control" placeholder="Enter grade" /></td>
              <td><input type="text" className="form-control" placeholder="Enter remark" /></td>
              <td><input type="text" className="form-control" placeholder="Enter signature" /></td>
            </tr>
          </tbody>
        </table>

        {/* Teachers remarks and next semesters data */}
        <div className="remarks-info">
          <div className="row mb-3">
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="conduct" className="form-label">Conduct</label>
                <input type="text" className="form-control" id="conduct" placeholder="Enter Conduct here" />
              </div>
            </div>
            
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="nextClass" className="form-label">Class</label>
                <input type="text" className="form-control" id="nextClass" placeholder="Enter class" />
              </div>
            </div>
          </div>
          
          {/* Additional fields for teacher remarks */}
          <div className="row mb-3">
            <div className="col-md-12">
              <div className="mb-3">
                <label htmlFor="teacherRemarks" className="form-label">Teacher's Remarks</label>
                <textarea className="form-control" id="teacherRemarks" rows="3" placeholder="Enter teacher's remarks"></textarea>
              </div>
            </div>
          </div>
          
          <div className="row mb-3">
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="principalSignature" className="form-label">Principal's Signature</label>
                <input type="text" className="form-control" id="principalSignature" placeholder="Principal's signature" />
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="date" className="form-label">Date</label>
                <input type="date" className="form-control" id="date" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
