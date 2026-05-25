import { useState } from 'react'
import { X, Layers, Search, Calendar, HardDrive } from 'lucide-react'
import styles from './SavedArchitecturesModal.module.css'

export default function SavedArchitecturesModal({ isOpen, onClose, history = [], onSelectProject }) {
  const [query, setQuery] = useState('')

  if (!isOpen) return null

  const filtered = history.filter((project) => {
    const titleMatch = (project.title || '').toLowerCase().includes(query.toLowerCase())
    const summaryMatch = (project.summary || '').toLowerCase().includes(query.toLowerCase())
    return titleMatch || summaryMatch
  })

  function handleSelect(project) {
    if (onSelectProject) {
      onSelectProject(project)
    }
    onClose()
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <HardDrive size={18} className={styles.titleIcon} />
            <h3>Your Saved Architectures</h3>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.body}>
          {/* Search bar */}
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by project name or description..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className={styles.scrollArea}>
            {filtered.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No architectures found matching your query.</p>
              </div>
            ) : (
              <div className={styles.grid}>
                {filtered.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    className={styles.card}
                    onClick={() => handleSelect(project)}
                    title={`Open ${project.title}`}
                  >
                    <div className={styles.cardHeader}>
                      <span className={styles.cardTitle}>{project.title || 'Untitled Project'}</span>
                      <div className={styles.cardMeta}>
                        <Calendar size={12} />
                        <span>
                          {project.timestamp 
                            ? new Date(project.timestamp.seconds ? project.timestamp.seconds * 1000 : project.timestamp).toLocaleDateString()
                            : 'Unknown Date'
                          }
                        </span>
                      </div>
                    </div>

                    <p className={styles.cardSummary}>{project.summary}</p>

                    <div className={styles.metrics}>
                      <span className={styles.metricItem}>
                        <strong>{project.metrics?.layers || 0}</strong> layers
                      </span>
                      <span className={styles.metricItem}>
                        <strong>{project.metrics?.apis || 0}</strong> APIs
                      </span>
                      <span className={styles.metricItem}>
                        <strong>{project.metrics?.dbSchema || project.metrics?.models || 0}</strong> models
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
