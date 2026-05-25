import { useRef, useState } from 'react'
import styles from './Workspace.module.css'

const TECH_SUGGESTIONS = [
  'React', 'TypeScript', 'Node.js', 'Express', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Stripe', 'GraphQL', 'Tailwind', 'Prisma', 'Svelte', 'Vue', 'Next.js', 'FastAPI', 'Django', 'Rust', 'Go', 'Kafka', 'Supabase', 'Firebase', 'Auth.js', 'Clerk'
]

const EXAMPLES = [
  { label: 'B2B analytics', idea: 'A multi-tenant analytics platform for SaaS teams with event ingestion, role-based dashboards, billing, usage alerts, and scheduled reports.' },
  { label: 'Developer platform', idea: 'A platform for developers to manage API keys, usage quotas, logs, webhooks, and team workspaces with audit trails.' },
  { label: 'Ops workspace', idea: 'An internal operations console for inventory, approvals, incident tracking, reporting, and role-based access across multiple branches.' },
  { label: 'AI assistant SaaS', idea: 'An AI workflow SaaS with chat history, prompt templates, workspace sharing, credit billing, and document upload support.' },
]

export default function PromptComposer({ compact = false, onSubmit, error, envKeyStatus, history }) {
  const [idea, setIdea] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const tagRef = useRef(null)

  function handleTagInput(e) {
    const value = e.target.value
    setTagInput(value)

    if (!value.trim()) {
      setSuggestions([])
      return
    }

    const filtered = TECH_SUGGESTIONS
      .filter((tech) => tech.toLowerCase().includes(value.toLowerCase()) && !tags.includes(tech))
      .slice(0, 6)

    setSuggestions(filtered)
  }

  function addTag(tech) {
    const value = tech.trim()
    if (!value || tags.includes(value) || tags.length >= 10) return
    setTags((prev) => [...prev, value])
    setTagInput('')
    setSuggestions([])
    tagRef.current?.focus()
  }

  function removeTag(tag) {
    setTags((prev) => prev.filter((item) => item !== tag))
  }

  function handleTagKeyDown(e) {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      addTag(tagInput)
      return
    }

    if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1))
    }
  }

  function submitForm(e) {
    e.preventDefault()
    if (!idea.trim()) return
    onSubmit({ idea: idea.trim(), knownStack: tags })
  }

  if (compact) {
    return (
      <form className={styles.compactComposer} onSubmit={submitForm} noValidate>
        <div className={styles.compactRow}>
          <input
            className={styles.compactInput}
            placeholder="Add a microservice..."
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
          />
          <button className={styles.compactButton} type="submit">Generate</button>
        </div>
      </form>
    )
  }

  return (
    <section className={styles.promptPanel}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.panelEyebrow}>AI prompt</p>
          <h1 className={styles.panelTitle}>Describe your system idea</h1>
          <p className={styles.panelDescription}>Use your prompt, existing stack preferences, and constraints to generate a buildable architecture workspace.</p>
        </div>
        <span className={`${styles.envPill} ${envKeyStatus === 'valid' ? styles.envReady : envKeyStatus === 'missing' ? styles.envMissing : styles.envInvalid}`}>
          {envKeyStatus === 'valid' ? 'Gemini loaded' : envKeyStatus === 'missing' ? 'Missing API key' : 'Invalid API key'}
        </span>
      </div>

      <form className={styles.promptForm} onSubmit={submitForm} noValidate>
        <label className={styles.fieldLabel} htmlFor="prompt-input">Project brief</label>
        <textarea
          id="prompt-input"
          className={styles.textarea}
          placeholder="Describe users, core workflows, integrations, scale, and constraints."
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          rows={6}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitForm(e)
          }}
        />
        <div className={styles.hintRow}>
          <span>Press Cmd/Ctrl + Enter to generate</span>
          {error && <span className={styles.errorText}>{error}</span>}
        </div>

        <div className={styles.fieldGroup}>
          <div className={styles.labelRow}>
            <label className={styles.fieldLabel} htmlFor="stack-input">Known stack or preferences</label>
            <span className={styles.optional}>Optional</span>
          </div>
          <div className={styles.tagArea} onClick={() => tagRef.current?.focus()}>
            {tags.map((tag) => (
              <span key={tag} className={styles.tagItem}>
                {tag}
                <button type="button" className={styles.tagRemove} onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`}>
                  ×
                </button>
              </span>
            ))}
            <input
              id="stack-input"
              ref={tagRef}
              className={styles.tagInput}
              value={tagInput}
              onChange={handleTagInput}
              onKeyDown={handleTagKeyDown}
              placeholder={tags.length === 0 ? 'React, PostgreSQL, AWS, Docker…' : ''}
            />
          </div>
          {suggestions.length > 0 && (
            <div className={styles.suggestions}>
              {suggestions.map((item) => (
                <button key={item} type="button" className={styles.suggestionButton} onMouseDown={() => addTag(item)}>
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.actionRow}>
          <button className={styles.submitButton} type="submit">Generate architecture</button>
          <button className={styles.ghostButton} type="button" onClick={() => setIdea('')}>Clear prompt</button>
        </div>
      </form>

      <div className={styles.previewBlock}>
        <div className={styles.previewHeader}>
          <div>
            <p className={styles.previewTitle}>Workspace starter templates</p>
            <p className={styles.previewCopy}>Quick launch patterns for typical engineering workflows.</p>
          </div>
        </div>
        <div className={styles.exampleGrid}>
          {EXAMPLES.map((example) => (
            <button key={example.label} type="button" className={styles.previewCard} onClick={() => setIdea(example.idea)}>
              <strong>{example.label}</strong>
              <span>{example.idea}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
