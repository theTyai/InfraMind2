import { useState } from 'react'
import { MessageSquare, Star, Send, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuthContext } from '../../context/AuthContext'
import styles from './ReviewForm.module.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

export default function ReviewForm() {
  const { appUser, getFreshToken } = useAuthContext()
  const [expanded, setExpanded] = useState(false)
  
  const [formData, setFormData] = useState({
    overallExperience: 0,
    uiUxQuality: 0,
    aiResponseQuality: 0,
    accuracy: 0,
    diagramQuality: 0,
    speed: 0,
    easeOfUnderstanding: 0,
    mostUsedFeature: '',
    projectTypeTested: '',
    promptTestedWith: '',
    missingFeatures: '',
    bugsFaced: '',
    wouldUseAgain: null,
    wouldRecommend: null,
    featureRequests: '',
    openFeedback: ''
  })
  
  const [hoverState, setHoverState] = useState({})
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleUpdate = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.overallExperience) {
      setError('Please provide an Overall Experience rating before submitting.')
      return
    }
    
    setIsSubmitting(true)
    setError('')

    try {
      const token = await getFreshToken()
      const res = await fetch(`${API_BASE}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        throw new Error('Failed to submit review')
      }

      setIsSuccess(true)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Star Rating Component Helper
  const StarRating = ({ field, label, hint }) => (
    <div className={styles.formGroup}>
      <label className={styles.label}>
        {label}
        {hint && <span className={styles.hint}>{hint}</span>}
      </label>
      <div 
        className={styles.starsGroup} 
        onMouseLeave={() => setHoverState(prev => ({ ...prev, [field]: 0 }))}
      >
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            className={`${styles.starBtn} ${(hoverState[field] || formData[field]) >= star ? styles.starFilled : ''}`}
            onMouseEnter={() => setHoverState(prev => ({ ...prev, [field]: star }))}
            onClick={() => handleUpdate(field, star)}
          >
            <Star size={24} fill={(hoverState[field] || formData[field]) >= star ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
    </div>
  )

  // 1-10 Number Rating Component Helper
  const NumberRating = ({ field, label }) => (
    <div className={styles.formGroup}>
      <label className={styles.label}>{label} <span className={styles.hint}>(1 = Poor, 10 = Excellent)</span></label>
      <div className={styles.ratingRow}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
          <button
            key={num}
            type="button"
            className={`${styles.ratingBtn} ${formData[field] === num ? styles.ratingBtnActive : ''}`}
            onClick={() => handleUpdate(field, num)}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className={styles.formContainer}>
      <div className={styles.formHeader} onClick={() => setExpanded(!expanded)}>
        <div className={styles.titleGroup}>
          <MessageSquare size={20} className={styles.titleIcon} />
          <h2 className={styles.title}>Share Your Feedback</h2>
        </div>
        <button className={styles.expandBtn} aria-label={expanded ? "Collapse feedback form" : "Expand feedback form"}>
          {expanded ? <ChevronUp size={20} className={styles.expandIcon} /> : <ChevronDown size={20} className={styles.expandIcon} />}
        </button>
      </div>

      {expanded && (
        isSuccess ? (
          <div className={styles.successState}>
            <CheckCircle2 size={48} className={styles.successIcon} />
            <h3>Thank You!</h3>
            <p>Your detailed feedback has been recorded and will help us improve InfraMind.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.formBody}>
            {error && <div className={styles.errorMsg}>{error}</div>}
            
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>General Experience</h3>
              <NumberRating field="overallExperience" label="Overall Experience" />
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Detailed Ratings</h3>
              <div className={styles.grid}>
                <StarRating field="uiUxQuality" label="UI/UX & Ease of Use" />
                <StarRating field="aiResponseQuality" label="AI Response Quality" />
                <StarRating field="accuracy" label="Accuracy of Architecture Generation" />
                <StarRating field="diagramQuality" label="Diagram Visualization Quality" />
                <StarRating field="speed" label="Speed & Performance" />
                <StarRating field="easeOfUnderstanding" label="Ease of Understanding Output" />
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Usage Details</h3>
              <div className={styles.grid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Which feature did you use most?</label>
                  <select 
                    className={styles.select}
                    value={formData.mostUsedFeature}
                    onChange={(e) => handleUpdate('mostUsedFeature', e.target.value)}
                  >
                    <option value="">Select a feature...</option>
                    <option value="Architecture Generator">Architecture Generator</option>
                    <option value="DB Schema">DB Schema</option>
                    <option value="API Generator">API Generator</option>
                    <option value="Deployment Planning">Deployment Planning</option>
                    <option value="Boilerplate Export">Boilerplate Export</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>What type of project did you test?</label>
                  <select 
                    className={styles.select}
                    value={formData.projectTypeTested}
                    onChange={(e) => handleUpdate('projectTypeTested', e.target.value)}
                  >
                    <option value="">Select project type...</option>
                    <option value="SaaS">SaaS</option>
                    <option value="AI App">AI App</option>
                    <option value="E-commerce">E-commerce</option>
                    <option value="Social Platform">Social Platform</option>
                    <option value="College Project">College Project</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Paste the prompt/project idea you tested with</label>
                <textarea
                  className={styles.textarea}
                  placeholder="e.g., A real-time ride sharing app..."
                  value={formData.promptTestedWith}
                  onChange={(e) => handleUpdate('promptTestedWith', e.target.value)}
                />
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Feedback & Suggestions</h3>
              <div className={styles.grid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Missing Features / Suggestions</label>
                  <textarea
                    className={styles.textarea}
                    placeholder="What would you like to see added?"
                    value={formData.missingFeatures}
                    onChange={(e) => handleUpdate('missingFeatures', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Bugs or Errors Faced</label>
                  <textarea
                    className={styles.textarea}
                    placeholder="Did anything break or feel confusing?"
                    value={formData.bugsFaced}
                    onChange={(e) => handleUpdate('bugsFaced', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Feature Requests</label>
                  <textarea
                    className={styles.textarea}
                    placeholder="Any specific tools or integrations?"
                    value={formData.featureRequests}
                    onChange={(e) => handleUpdate('featureRequests', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Open Feedback / Final Thoughts</label>
                  <textarea
                    className={styles.textarea}
                    placeholder="Any other comments?"
                    value={formData.openFeedback}
                    onChange={(e) => handleUpdate('openFeedback', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Final Thoughts</h3>
              <div className={styles.grid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Would you use it again?</label>
                  <div className={styles.radioGroup}>
                    <label className={styles.radioLabel}>
                      <input 
                        type="radio" 
                        name="wouldUseAgain"
                        checked={formData.wouldUseAgain === true} 
                        onChange={() => handleUpdate('wouldUseAgain', true)} 
                      /> Yes
                    </label>
                    <label className={styles.radioLabel}>
                      <input 
                        type="radio" 
                        name="wouldUseAgain"
                        checked={formData.wouldUseAgain === false} 
                        onChange={() => handleUpdate('wouldUseAgain', false)} 
                      /> No
                    </label>
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Would you recommend it to others?</label>
                  <div className={styles.radioGroup}>
                    <label className={styles.radioLabel}>
                      <input 
                        type="radio" 
                        name="wouldRecommend"
                        checked={formData.wouldRecommend === true} 
                        onChange={() => handleUpdate('wouldRecommend', true)} 
                      /> Yes
                    </label>
                    <label className={styles.radioLabel}>
                      <input 
                        type="radio" 
                        name="wouldRecommend"
                        checked={formData.wouldRecommend === false} 
                        onChange={() => handleUpdate('wouldRecommend', false)} 
                      /> No
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.footer}>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isSubmitting || !formData.overallExperience}
              >
                {isSubmitting ? 'Submitting...' : (
                  <>
                    <Send size={16} />
                    Submit Review
                  </>
                )}
              </button>
            </div>
          </form>
        )
      )}
    </div>
  )
}
