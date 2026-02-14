import React, { useState, useRef, useEffect } from 'react'
import { FaUniversalAccess } from 'react-icons/fa'
import './AccessibilityZoom.css'

const ZOOM_OPTIONS = [
  { value: 0.75, label: '75%' },
  { value: 0.9, label: '90%' },
  { value: 1, label: '100%' },
  { value: 1.1, label: '110%' },
  { value: 1.25, label: '125%' },
]

const AccessibilityZoom = ({ zoom, setZoom }) => {
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [open])

  const handleSelect = (value) => {
    setZoom(value)
    setOpen(false)
  }

  return (
    <div className="accessibility-zoom" ref={panelRef}>
      <button
        type="button"
        className="accessibility-zoom-btn"
        onClick={() => setOpen((o) => !o)}
        title="Adjust zoom level"
        aria-label="Adjust zoom level"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <FaUniversalAccess className="accessibility-zoom-icon" aria-hidden />
        <span className="accessibility-zoom-label">{Math.round(zoom * 100)}%</span>
      </button>
      {open && (
        <div className="accessibility-zoom-panel" role="menu">
          <div className="accessibility-zoom-panel-title">Page zoom</div>
          {ZOOM_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="menuitem"
              className={`accessibility-zoom-option ${zoom === value ? 'active' : ''}`}
              onClick={() => handleSelect(value)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default AccessibilityZoom
