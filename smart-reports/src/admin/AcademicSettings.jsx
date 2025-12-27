import React, { useState, useEffect } from 'react'
import { FaCalendarAlt, FaSave, FaInfoCircle } from 'react-icons/fa'
import { getCurrentAcademicPeriod, setCurrentAcademicPeriod, setReopeningDate, getAvailableAcademicYears } from '../lib/academicPeriod'
import toast from 'react-hot-toast'
import './AcademicSettings.css'

const AcademicSettings = ({ user }) => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentPeriod, setCurrentPeriod] = useState({
    term: 'Term 1',
    academicYear: '',
    reopening_date: null,
    updated_at: null,
    updated_by: null
  })
  const [availableYears, setAvailableYears] = useState([])
  const [formData, setFormData] = useState({
    term: 'Term 1',
    academicYear: '',
    reopening_date: ''
  })
  const [savingReopeningDate, setSavingReopeningDate] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const period = await getCurrentAcademicPeriod()
      setCurrentPeriod(period)
      setFormData({
        term: period.term,
        academicYear: period.academicYear,
        reopening_date: period.reopening_date || ''
      })

      // Load available academic years
      const yearsResult = await getAvailableAcademicYears()
      if (yearsResult.success) {
        setAvailableYears(yearsResult.data)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      toast.error('Failed to load academic settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.term || !formData.academicYear) {
      toast.error('Please fill in all fields')
      return
    }

    // Validate academic year format
    if (!/^\d{4}-\d{4}$/.test(formData.academicYear)) {
      toast.error('Academic year must be in format YYYY-YYYY (e.g., 2024-2025)')
      return
    }

    try {
      setSaving(true)
      const result = await setCurrentAcademicPeriod(
        formData.term,
        formData.academicYear,
        user.id
      )

      if (result.success) {
        toast.success('Academic period updated successfully!')
        await loadSettings()
      } else {
        toast.error(result.error || 'Failed to update academic period')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save academic settings')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveReopeningDate = async () => {
    try {
      setSavingReopeningDate(true)
      const result = await setReopeningDate(
        formData.reopening_date || null,
        user.id
      )

      if (result.success) {
        toast.success('Reopening date updated successfully! This will apply to all student reports for the current period.')
        await loadSettings()
      } else {
        toast.error(result.error || 'Failed to update reopening date')
      }
    } catch (error) {
      console.error('Error saving reopening date:', error)
      toast.error('Failed to save reopening date')
    } finally {
      setSavingReopeningDate(false)
    }
  }

  if (loading) {
    return (
      <div className="academic-settings-container">
        <div className="loading-spinner">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="academic-settings-container">
      <div className="settings-header">
        <div className="settings-title">
          <FaCalendarAlt className="settings-icon" />
          <h2>Academic Period Settings</h2>
        </div>
        <p className="settings-description">
          Configure the current academic term and year. This setting affects what data is shown on both admin and teacher dashboards.
        </p>
      </div>

      <div className="settings-card">
        <div className="current-settings-info">
          <FaInfoCircle className="info-icon" />
          <div>
            <strong>Current Active Period:</strong>
            <span className="current-period">
              {currentPeriod.term} {currentPeriod.academicYear}
            </span>
            {currentPeriod.updated_at && (
              <div className="update-info">
                Last updated: {new Date(currentPeriod.updated_at).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="settings-form">
          <div className="form-group">
            <label htmlFor="term">
              Academic Term <span className="required">*</span>
            </label>
            <select
              id="term"
              value={formData.term}
              onChange={(e) => setFormData({ ...formData, term: e.target.value })}
              className="form-control"
              required
            >
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="academicYear">
              Academic Year <span className="required">*</span>
            </label>
            <input
              type="text"
              id="academicYear"
              value={formData.academicYear}
              onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
              className="form-control"
              placeholder="2024-2025"
              pattern="\d{4}-\d{4}"
              required
            />
            <small className="form-help">
              Format: YYYY-YYYY (e.g., 2024-2025)
            </small>
            {availableYears.length > 0 && (
              <div className="available-years">
                <small>Available years from reports:</small>
                <div className="year-tags">
                  {availableYears.map((year) => (
                    <button
                      key={year}
                      type="button"
                      className="year-tag"
                      onClick={() => setFormData({ ...formData, academicYear: year })}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              <FaSave /> {saving ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={loadSettings}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Reopening Date Section */}
        <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e5e7eb' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--wine, #722F37)' }}>Reopening Date</h3>
          <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.875rem' }}>
            Set a reopening date that will automatically appear in all student reports for the current term and academic year.
          </p>
          
          <div className="form-group">
            <label htmlFor="reopening_date">
              Reopening Date
            </label>
            <input
              type="date"
              id="reopening_date"
              value={formData.reopening_date}
              onChange={(e) => setFormData({ ...formData, reopening_date: e.target.value })}
              className="form-control"
            />
            <small className="form-help">
              This date will be automatically filled in all student reports for {currentPeriod.term} {currentPeriod.academicYear}
            </small>
            {currentPeriod.reopening_date && (
              <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#f0f9ff', borderRadius: '4px', fontSize: '0.875rem' }}>
                <strong>Current:</strong> {new Date(currentPeriod.reopening_date).toLocaleDateString()}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveReopeningDate}
              disabled={savingReopeningDate}
            >
              <FaSave /> {savingReopeningDate ? 'Saving...' : 'Save Reopening Date'}
            </button>
            {formData.reopening_date && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setFormData({ ...formData, reopening_date: '' })
                }}
                disabled={savingReopeningDate}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="settings-note">
          <FaInfoCircle className="info-icon" />
          <div>
            <strong>Important:</strong> Changing the academic period affects what data is displayed on:
            <ul>
              <li><strong>Admin Dashboard</strong> - Teacher progress statistics filter by current period</li>
              <li><strong>Teacher Dashboard</strong> - Statistics and missing grades filter by current period</li>
            </ul>
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f0f9ff', borderRadius: '4px', borderLeft: '3px solid #3b82f6' }}>
              <strong>✓ All Historical Reports Are Preserved</strong>
              <ul style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                <li>All previous reports remain in the database and are never deleted</li>
                <li><strong>Report Bank</strong> shows ALL reports from all terms/years</li>
                <li><strong>Report Viewing</strong> interfaces can access any historical report</li>
                <li>Only dashboard <strong>statistics</strong> are filtered by the configured period</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AcademicSettings

