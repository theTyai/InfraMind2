// src/components/workspace/PublicShare.jsx
import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowRight, AlertCircle, Github, Twitter, Linkedin, ExternalLink } from 'lucide-react'
import Logo from '../ui/Logo.jsx'
import ArchitectureTabs from './ArchitectureTabs.jsx'
import InspectorPanel from '../layout/InspectorPanel.jsx'
import { exportToPdf } from '../../utils/exportPdf.js'
import { generateScaffold } from '../../utils/generateScaffold.js'
import styles from './PublicShare.module.css'
import { useAuthContext } from '../../context/AuthContext.jsx'
import MermaidDiagram from '../MermaidDiagram.jsx'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

export default function PublicShare({ embed }) {
  const { shareId } = useParams()
  const { appUser } = useAuthContext()

  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const [exporting, setExporting]       = useState(false)
  const [selectedNode, setSelectedNode] = useState(null)

  // Real-time states
  const [presenceUsers, setPresenceUsers] = useState([])
  const [remoteCursors, setRemoteCursors] = useState({})
  const [allComments, setAllComments]     = useState([])
  const [socket, setSocket]               = useState(null)

  // Local persistent anonymous identities
  const localUserId = useMemo(() => {
    if (appUser?.uid) return appUser.uid;
    let uid = sessionStorage.getItem('inframind_collab_uid');
    if (!uid) {
      uid = 'anon_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('inframind_collab_uid', uid);
    }
    return uid;
  }, [appUser])

  const localUserName = useMemo(() => {
    if (appUser?.displayName) return appUser.displayName;
    if (appUser?.email) return appUser.email.split('@')[0];
    let name = sessionStorage.getItem('inframind_collab_name');
    if (!name) {
      name = 'Reviewer_' + Math.floor(100 + Math.random() * 900);
      sessionStorage.setItem('inframind_collab_name', name);
    }
    return name;
  }, [appUser])

  const localPhotoUrl = appUser?.photoURL || '';

  // 1. Fetch Shared Architecture Details
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

  // 2. Fetch Shared Comments History
  useEffect(() => {
    if (!shareId) return;
    fetch(`${API_BASE}/public/${shareId}/comments`)
      .then(r => r.json())
      .then(comments => setAllComments(comments))
      .catch(err => console.error('Failed to load comments:', err));
  }, [shareId]);

  // 3. Establish WebSockets Collaboration Connection
  useEffect(() => {
    if (!shareId) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const apiHost = API_BASE.replace(/^https?:\/\//, '').replace(/\/api$/, '');
    const wsUrl = `${wsProtocol}//${apiHost}/api/collaboration`;

    const ws = new WebSocket(wsUrl);
    setSocket(ws);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'join',
        roomId: shareId,
        userId: localUserId,
        userName: localUserName,
        photoUrl: localPhotoUrl
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'presence') {
          // Filter out ourselves
          setPresenceUsers(msg.users.filter(u => u.userId !== localUserId));
        } else if (msg.type === 'cursor') {
          setRemoteCursors(prev => ({
            ...prev,
            [msg.userId]: { userName: msg.userName, x: msg.x, y: msg.y }
          }));
        } else if (msg.type === 'comment') {
          setAllComments(prev => [...prev, msg]);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      console.log('Collaboration WebSocket connection closed.');
    };

    return () => {
      ws.close();
    };
  }, [shareId, localUserId, localUserName, localPhotoUrl]);

  // 4. Broadcast Mouse Movement
  useEffect(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    let lastSend = 0;
    const handleMouseMove = (e) => {
      const now = Date.now();
      if (now - lastSend > 50) { // Throttled to 50ms
        socket.send(JSON.stringify({
          type: 'cursor',
          x: e.clientX,
          y: e.clientY
        }));
        lastSend = now;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [socket]);

  // 5. Submit New Comment via Socket
  const handleAddComment = (nodeId, commentText) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'comment',
        nodeId,
        commentText
      }));
    }
  };

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
          <Link to={appUser ? "/dashboard" : "/"} className={styles.homeBtn}>Go to InfraMind →</Link>
        </div>
      </div>
    )
  }

  if (embed && data) {
    return (
      <div className={styles.embedContainer}>
        {data.architecture?.mermaidDiagram && (
          <div style={{ width: '100%', height: '100%' }}>
            <MermaidDiagram code={data.architecture.mermaidDiagram} />
          </div>
        )}
        <a 
          href={`https://inframind.ai/p/${shareId}`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className={styles.embedWatermark}
        >
          ⚡ Built with InfraMind
        </a>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Ambient */}
      <div className={styles.ambient}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
      </div>

      {/* Navbar */}
      {/* Navbar */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Logo size={28} showText />
          
          <div className={styles.navBadge}>
            <ExternalLink size={11} />
            Shared View
          </div>

          {presenceUsers.length > 0 && (
            <div className={styles.presenceAvatars}>
              {presenceUsers.map(u => (
                <div key={u.userId} className={styles.presenceAvatar} title={u.userName}>
                  {u.photoUrl ? (
                    <img src={u.photoUrl} alt="" className={styles.presenceAvatarImg} />
                  ) : (
                    u.userName ? u.userName[0].toUpperCase() : 'U'
                  )}
                </div>
              ))}
            </div>
          )}

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
            <button 
              className={styles.navCta}
              onClick={() => {
                try {
                  import('posthog-js').then(({ default: posthog }) => {
                    posthog.capture('clicked_clone_architecture', { shareId });
                  });
                } catch (e) {}
                
                if (appUser) {
                  window.location.href = `/dashboard?clone=${shareId}`;
                } else {
                  window.location.href = `/?clone=${shareId}`;
                }
              }}
            >
              Clone and Modify in 1-Click <ArrowRight size={13} />
            </button>
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
              comments={allComments.filter(c => c.nodeId === selectedNode)}
              onAddComment={handleAddComment}
            />
          </div>
        )}
      </div>

      {/* Shared Cursors Overlay */}
      {Object.entries(remoteCursors).map(([userId, cursor]) => (
        <div 
          key={userId}
          style={{
            position: 'fixed',
            left: cursor.x,
            top: cursor.y,
            pointerEvents: 'none',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transform: 'translate(-2px, -2px)',
            transition: 'left 0.08s ease-out, top 0.08s ease-out'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M0 0L14 4.5L7.5 7L5 13.5L0 0Z" fill="#2563eb" stroke="#fff" strokeWidth="1" />
          </svg>
          <span 
            style={{
              fontSize: '9px',
              fontWeight: 'bold',
              background: '#2563eb',
              color: '#fff',
              padding: '2px 6px',
              borderRadius: '4px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
              whiteSpace: 'nowrap'
            }}
          >
            {cursor.userName}
          </span>
        </div>
      ))}
    </div>
  )
}
