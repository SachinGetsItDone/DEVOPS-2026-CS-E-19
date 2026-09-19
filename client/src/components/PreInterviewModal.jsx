import { useState } from 'react'
import './PreInterviewModal.css'

export default function PreInterviewModal({ open, onClose, onSubmit, isSubmitting, serverError }) {
  const [resumeFile, setResumeFile] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [role, setRole] = useState('')
  const [error, setError] = useState('')

  if (!open) return null

  // Local validation errors take priority; once those pass, a failure
  // from the backend (network down, parse error, etc.) shows instead.
  const displayError = error || serverError

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const okTypes = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!okTypes.includes(file.type)) {
      setError('Please upload a PDF or Word document.')
      return
    }
    setError('')
    setResumeFile(file)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (isSubmitting) return
    if (!resumeFile) return setError('Add your resume to continue.')
    if (!jobDescription.trim()) return setError('Paste the job description to continue.')
    setError('')
    onSubmit({ resumeFile, jobDescription, role })
  }

  return (
    <div className="modal__backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <span className="eyebrow">Before you begin</span>
          <h2>Set up your interview</h2>
          <p className="modal__sub">
            The interviewer reads these to ask questions specific to you — not generic ones.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="modal__form">
          <label className="field">
            <span className="field__label">Resume</span>
            <div className="field__upload">
              <input
                id="resume-upload"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
              />
              <label htmlFor="resume-upload" className="field__upload-btn">
                {resumeFile ? resumeFile.name : 'Choose file (PDF or Word)'}
              </label>
            </div>
          </label>

          <label className="field">
            <span className="field__label">Role you're targeting (optional)</span>
            <input
              className="field__input"
              type="text"
              placeholder="e.g. Frontend Engineer Intern"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field__label">Job description</span>
            <textarea
              className="field__textarea"
              placeholder="Paste the full job description here..."
              rows={6}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </label>

          {displayError && <p className="field__error">{displayError}</p>}

          <div className="modal__actions">
            <button type="button" className="modal__cancel" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="modal__submit" disabled={isSubmitting}>
              {isSubmitting ? 'Setting up your interview…' : 'Enter interview room →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
