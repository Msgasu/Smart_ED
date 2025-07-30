import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaEye, FaEdit } from 'react-icons/fa'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import TeacherLayout from './TeacherLayout'

const TeacherClassReportsPage = ({ user, profile }) => {
  const { className } = useParams()
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simple placeholder for now
    setLoading(false)
  }, [className])

  return (
    <TeacherLayout user={user} profile={profile}>
      <div className="container-fluid p-4">
        <div className="row mb-4">
          <div className="col">
            <div className="d-flex align-items-center mb-3">
              <button 
                className="btn btn-outline-secondary me-3"
                onClick={() => navigate('/dashboard')}
              >
                <FaArrowLeft className="me-2" />
                Back to Dashboard
              </button>
              <div>
                <h1 className="mb-1">Class {className} Reports</h1>
                <p className="text-muted mb-0">View and manage reports for this class</p>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <p>Class reports functionality will be implemented here.</p>
                <p>For now, please use the <strong>Grade Entry</strong> tab in the main dashboard for entering grades.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TeacherLayout>
  )
}

export default TeacherClassReportsPage 