import React, { useState } from 'react';
import { X, FileText, Server, Code, FileJson, Github } from 'lucide-react';
import styles from './ExportStudioModal.module.css';

export default function ExportStudioModal({ data, onClose, onExportPdf }) {
  const [activeFormat, setActiveFormat] = useState('pdf');
  const [isExporting, setIsExporting] = useState(false);

  const formats = [
    { id: 'pdf', title: 'Investor PDF Slides', icon: FileText, desc: 'High-level architecture and pitch deck slides for investors and stakeholders.' },
    { id: 'terraform', title: 'Terraform Scripts', icon: Server, desc: 'Infrastructure-as-code modules for AWS/GCP based on your system topology.' },
    { id: 'docker', title: 'Docker Compose', icon: Code, desc: 'Containerization stacks for local development and orchestrations.' },
    { id: 'openapi', title: 'Swagger Specs', icon: FileJson, desc: 'OpenAPI 3.0 schema definitions for all your backend routes.' },
    { id: 'prd', title: 'GitHub Repo PRD', icon: Github, desc: 'Product Requirements Document formatted for GitHub markdown.' }
  ];

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (activeFormat === 'pdf') {
        await onExportPdf();
      } else {
        // Simulate delay for generating other formats
        await new Promise(resolve => setTimeout(resolve, 1500));
        alert(`${formats.find(f => f.id === activeFormat).title} generation is currently in beta and will be sent to your email.`);
      }
    } finally {
      setIsExporting(false);
      if (activeFormat === 'pdf') {
        onClose();
      }
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modalContainer} glass-card`} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Export Studio</h2>
          <button onClick={onClose} className={styles.closeBtn}><X size={20} /></button>
        </div>
        
        <div className={styles.formatList}>
          {formats.map((fmt) => (
            <div 
              key={fmt.id}
              className={`${styles.formatItem} ${activeFormat === fmt.id ? styles.active : ''}`}
              onClick={() => setActiveFormat(fmt.id)}
            >
              <div className={styles.formatIcon}><fmt.icon size={24} /></div>
              <div className={styles.formatInfo}>
                <h4>{fmt.title}</h4>
                <p>{fmt.desc}</p>
              </div>
              <div className={styles.radio}>
                {activeFormat === fmt.id && <div className={styles.radioFill} />}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button 
            className={styles.primaryBtn} 
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? 'Generating...' : `Generate ${formats.find(f => f.id === activeFormat).title}`}
          </button>
        </div>
      </div>
    </div>
  );
}
