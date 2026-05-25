// client/src/components/ui/SkipLink.jsx
// "Skip to main content" accessibility link.
// Visually hidden but focusable — critical for keyboard and screen reader users.
// Appears as a floating pill when focused (Tab key from top of page).

export default function SkipLink() {
  return (
    <a
      href="#main-content"
      style={{
        position: 'fixed',
        top: '-100px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        padding: '0.6rem 1.5rem',
        background: '#2563eb',
        color: '#fff',
        borderRadius: '0 0 0.75rem 0.75rem',
        fontFamily: 'Inter, sans-serif',
        fontSize: '0.85rem',
        fontWeight: 600,
        textDecoration: 'none',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        transition: 'top 0.2s ease',
        outline: 'none',
      }}
      onFocus={e => { e.currentTarget.style.top = '0' }}
      onBlur={e => { e.currentTarget.style.top = '-100px' }}
    >
      Skip to main content
    </a>
  )
}
