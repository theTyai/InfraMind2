// src/components/workspace/PublicShare.jsx
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowRight, AlertCircle, Github, Twitter, Linkedin, ExternalLink } from 'lucide-react'
import Logo from '../ui/Logo.jsx'
import ArchitectureTabs from './ArchitectureTabs.jsx'
import InspectorPanel from '../layout/InspectorPanel.jsx'
import { exportToPdf } from '../../utils/exportPdf.js'
import { generateScaffold } from '../../utils/generateScaffold.js'
import styles from './PublicShare.module.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

export default function PublicShare() {
  const { shareId } = useParams()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const [exporting, setExporting]       = useState(false)
  const [selectedNode, setSelectedNode] = useState(null)

  useEffect(() => {
    if (!shareId) return
    fetch(`${API_BASE}/public/${shareId}`)
      .then(r => { 
        if (!r.ok) throw new Error('Architecture not found or has been revoked.')
        return r.json() 
      })
      .then(d => { 
        setData(d)
        setLoading(false) 
      })
      .catch(e => { 
        setError(e.message)
        setLoading(false) 
      })
  }, [shareId])

  const handleExport = async () => {
    if (!data?.architecture) return
    setExporting(true)
    try {
      await exportToPdf(data.architecture, data.summary || data.architecture.projectTitle)
    } catch (e) {
      console.error('PDF export failed:', e)
      alert('PDF export failed: ' + e.message)
    } finally {
      setExporting(false)
    }
  }

  const handleScaffold = async () => {
    if (!data?.architecture) return
    try {
      await generateScaffold(data.architecture)
    } catch (e) {
      console.error('Scaffold failed:', e)
      alert('Scaffold failed: ' + e.message)
    }
  }

  if (loading) {
    return (
      <div className={styles.center}>
        <div className={styles.spinner} />
        <p>Loading shared architecture…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.center}>
        <div className={styles.errorCard}>
          <AlertCircle size={32} className={styles.errorIcon} />
          <h2>Not Found</h2>
          <p>{error}</p>
          <Link to="/" className={styles.homeBtn}>Go to InfraMind →</Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* Ambient */}
      <div className={styles.ambient}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
      </div>

      {/* Navbar */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Logo size={28} showText />
          
          <div className={styles.navBadge}>
            <ExternalLink size={11} />
            Shared View
          </div>

          {data?.author && (
            <div className={styles.authorBadge}>
              <div className={styles.authorAvatar}>
                {data.author.photoUrl ? (
                  <img src={data.author.photoUrl} alt="" className={styles.authorAvatarImg} />
                ) : (
                  data.author.name ? data.author.name[0].toUpperCase() : 'U'
                )}
              </div>
              <div className={styles.authorMeta}>
                <span className={styles.authorName}>{data.author.name || 'Developer'}</span>
                <span className={styles.authorUsername}>@{data.author.username}</span>
              </div>
              
              {/* Social icons */}
              <div className={styles.authorSocials}>
                {data.author.githubUrl && (
                  <a href={data.author.githubUrl} target="_blank" rel="noopener noreferrer" title="GitHub profile">
                    <Github size={13} />
                  </a>
                )}
                {data.author.twitterUrl && (
                  <a href={data.author.twitterUrl} target="_blank" rel="noopener noreferrer" title="Twitter/X profile">
                    <Twitter size={13} />
                  </a>
                )}
                {data.author.linkedinUrl && (
                  <a href={data.author.linkedinUrl} target="_blank" rel="noopener noreferrer" title="LinkedIn profile">
                    <Linkedin size={13} />
                  </a>
                )}
              </div>
            </div>
          )}
          
          <div className={styles.navRightActions}>
            <Link to="/" className={styles.navCta}>
              Try InfraMind <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Split Interactive Viewport */}
      <div className={styles.mainLayout}>
        <div className={styles.workspaceContent}>
          <ArchitectureTabs
            data={data.architecture}
            idea={data.summary || data.architecture.projectTitle}
            onExport={handleExport}
            onScaffold={handleScaffold}
            onOpenShare={null}
            exporting={exporting}
            onSubmit={null} // Read-only mode: hides prompt refiner bar
            envKeyStatus="valid"
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
          />
        </div>
        {selectedNode && (
          <div className={styles.inspectorSlot}>
            <InspectorPanel
              state="result"
              data={data.architecture}
              exporting={exporting}
              onExport={handleExport}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
              onClose={() => setSelectedNode(null)}
              onSubmit={null} // Read-only mode: hides optimize form
              lastIdea={data.summary || data.architecture.projectTitle}
            />
          </div>
        )}
      </div>
    </div>
  )
}
