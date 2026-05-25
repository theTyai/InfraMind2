import Logo from './ui/Logo.jsx'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <Logo size={20} showText={true} />
          <span className={styles.dot}>&middot;</span>
          <span className={styles.copy}>
            &copy; {new Date().getFullYear()} InfraMind Technologies Inc. All rights reserved.
          </span>
        </div>
        <div className={styles.right}>
          <a 
            href="https://status.inframind.app" 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.statusLink}
          >
            <span className={styles.statusDot} />
            System Status
          </a>
        </div>
      </div>
    </footer>
  )
}
