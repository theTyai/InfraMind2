import React, { useState, useMemo } from 'react'
import { useArchitectureStore } from '../../store/useArchitectureStore'
import { useAuthContext } from '../../context/AuthContext'

// ── Alternative Pricing Plans per Technology ──────────────────────────────────
export const TECH_OPTIONS = {
  // Frontends
  'React': [
    { service: 'Vercel Hobby', cost: 0, category: 'Frontend' },
    { service: 'Vercel Pro', cost: 20, category: 'Frontend' },
    { service: 'Netlify Starter', cost: 0, category: 'Frontend' },
    { service: 'Render Static', cost: 0, category: 'Frontend' },
    { service: 'AWS S3/CloudFront', cost: 5, category: 'Frontend' },
  ],
  'Next.js': [
    { service: 'Vercel Hobby (Limits)', cost: 0, category: 'Frontend' },
    { service: 'Self-Hosted VPS', cost: 5, category: 'Frontend' },
    { service: 'Render Starter Container', cost: 7, category: 'Frontend' },
    { service: 'Netlify Pro', cost: 19, category: 'Frontend' },
    { service: 'Vercel Pro', cost: 20, category: 'Frontend' },
  ],
  'Vue': [
    { service: 'Netlify Starter', cost: 0, category: 'Frontend' },
    { service: 'Vercel Hobby', cost: 0, category: 'Frontend' },
    { service: 'GitHub Pages', cost: 0, category: 'Frontend' },
    { service: 'Render Static', cost: 0, category: 'Frontend' },
  ],
  'Angular': [
    { service: 'Netlify Starter', cost: 0, category: 'Frontend' },
    { service: 'Vercel Hobby', cost: 0, category: 'Frontend' },
    { service: 'Render Static', cost: 0, category: 'Frontend' },
  ],

  // Backend / APIs
  'Node.js': [
    { service: 'Railway Starter', cost: 5, category: 'Backend' },
    { service: 'Render Free (Eco)', cost: 0, category: 'Backend', note: 'Spins down after inactivity' },
    { service: 'Render Starter', cost: 7, category: 'Backend' },
    { service: 'DigitalOcean Droplet', cost: 4, category: 'Backend' },
    { service: 'AWS Lambda (Free tier)', cost: 0, category: 'Backend' },
  ],
  'Express': [
    { service: 'Railway Starter', cost: 5, category: 'Backend' },
    { service: 'Render Free (Eco)', cost: 0, category: 'Backend', note: 'Spins down after inactivity' },
    { service: 'Render Starter', cost: 7, category: 'Backend' },
    { service: 'DigitalOcean Droplet', cost: 4, category: 'Backend' },
    { service: 'AWS Lambda (Free tier)', cost: 0, category: 'Backend' },
  ],
  'FastAPI': [
    { service: 'Railway Starter', cost: 5, category: 'Backend' },
    { service: 'Render Free (Eco)', cost: 0, category: 'Backend', note: 'Spins down after inactivity' },
    { service: 'Render Starter', cost: 7, category: 'Backend' },
    { service: 'DigitalOcean Droplet', cost: 4, category: 'Backend' },
    { service: 'AWS Lambda (Free tier)', cost: 0, category: 'Backend' },
  ],
  'Django': [
    { service: 'Railway Starter', cost: 5, category: 'Backend' },
    { service: 'Render Free (Eco)', cost: 0, category: 'Backend', note: 'Spins down' },
    { service: 'Render Starter', cost: 7, category: 'Backend' },
    { service: 'DigitalOcean Droplet', cost: 4, category: 'Backend' },
  ],
  'Spring Boot': [
    { service: 'DigitalOcean Droplet', cost: 6, category: 'Backend' },
    { service: 'Render Starter', cost: 7, category: 'Backend' },
    { service: 'Railway Pro', cost: 20, category: 'Backend' },
  ],
  'Go': [
    { service: 'AWS Lambda (Free tier)', cost: 0, category: 'Backend' },
    { service: 'Render Free (Eco)', cost: 0, category: 'Backend', note: 'Spins down' },
    { service: 'Railway Starter', cost: 5, category: 'Backend' },
    { service: 'Render Starter', cost: 7, category: 'Backend' },
    { service: 'Railway Pro', cost: 20, category: 'Backend' },
  ],
  'Rust': [
    { service: 'AWS Lambda (Free tier)', cost: 0, category: 'Backend' },
    { service: 'Render Free (Eco)', cost: 0, category: 'Backend', note: 'Spins down' },
    { service: 'Render Starter', cost: 7, category: 'Backend' },
    { service: 'Railway Pro', cost: 20, category: 'Backend' },
  ],

  // Databases
  'PostgreSQL': [
    { service: 'Supabase Free', cost: 0, category: 'Database', note: '500MB storage limit' },
    { service: 'Supabase Pro', cost: 25, category: 'Database', note: '8GB storage' },
    { service: 'Neon Free', cost: 0, category: 'Database', note: 'Serverless Postgres' },
    { service: 'Render PostgreSQL', cost: 7, category: 'Database' },
    { service: 'Railway PostgreSQL', cost: 5, category: 'Database' },
    { service: 'Self-Hosted Postgres', cost: 0, category: 'Database', note: 'Shared VPS resource' },
  ],
  'MySQL': [
    { service: 'PlanetScale Hobby', cost: 0, category: 'Database', note: '5GB storage' },
    { service: 'PlanetScale Scaler', cost: 39, category: 'Database', note: '10GB storage' },
    { service: 'Aiven MySQL Free', cost: 0, category: 'Database' },
    { service: 'Railway MySQL', cost: 5, category: 'Database' },
    { service: 'Self-Hosted MySQL', cost: 0, category: 'Database', note: 'Shared VPS resource' },
  ],
  'MongoDB': [
    { service: 'Atlas M0 Free', cost: 0, category: 'Database', note: '512MB shared storage' },
    { service: 'Atlas Shared M2', cost: 9, category: 'Database', note: '2GB storage' },
    { service: 'Render MongoDB Addon', cost: 7, category: 'Database' },
    { service: 'Self-Hosted MongoDB', cost: 0, category: 'Database', note: 'Shared VPS resource' },
  ],
  'Firestore': [
    { service: 'Firebase Spark (Free)', cost: 0, category: 'Database' },
    { service: 'Firebase Blaze (Pay-as-you-go)', cost: 5, category: 'Database' },
  ],
  'DynamoDB': [
    { service: 'AWS Free Tier', cost: 0, category: 'Database' },
    { service: 'AWS Pay-as-you-go', cost: 5, category: 'Database' },
  ],
  'Cassandra': [
    { service: 'Astra DB Free', cost: 0, category: 'Database' },
    { service: 'Astra DB Paid', cost: 20, category: 'Database' },
  ],

  // Cache / Queue
  'Redis': [
    { service: 'Upstash Redis Free', cost: 0, category: 'Cache' },
    { service: 'Render Redis Free', cost: 0, category: 'Cache' },
    { service: 'Railway Redis', cost: 3, category: 'Cache' },
    { service: 'Self-Hosted Redis', cost: 0, category: 'Cache' },
  ],
  'Kafka': [
    { service: 'Upstash Kafka Free', cost: 0, category: 'Queue' },
    { service: 'Confluent Cloud Basic', cost: 15, category: 'Queue' },
  ],
  'RabbitMQ': [
    { service: 'CloudAMQP Starter', cost: 0, category: 'Queue' },
    { service: 'CloudAMQP Little Lemur', cost: 19, category: 'Queue' },
  ],

  // Storage / CDN
  'AWS S3': [
    { service: 'S3 Free Tier', cost: 0, category: 'Storage' },
    { service: 'S3 Pay-as-you-go', cost: 5, category: 'Storage' },
    { service: 'Supabase Storage Free', cost: 0, category: 'Storage' },
  ],
  'GCS': [
    { service: 'GCS Free Tier', cost: 0, category: 'Storage' },
    { service: 'GCS Pay-as-you-go', cost: 5, category: 'Storage' },
  ],
  'Cloudinary': [
    { service: 'Cloudinary Free', cost: 0, category: 'Storage' },
    { service: 'Cloudinary Plus', cost: 8, category: 'Storage' },
  ],

  // Auth
  'Auth0': [
    { service: 'Auth0 Free (7k MAU)', cost: 0, category: 'Auth' },
    { service: 'Clerk Free (10k MAU)', cost: 0, category: 'Auth' },
    { service: 'Auth0 Essentials', cost: 25, category: 'Auth' },
  ],
  'Firebase Auth': [
    { service: 'Firebase Free', cost: 0, category: 'Auth' },
  ],
  'Supabase Auth': [
    { service: 'Supabase Free (50k MAU)', cost: 0, category: 'Auth' },
  ],

  // Payments
  'Stripe': [
    { service: 'Stripe Pay-as-you-go', cost: 0, category: 'Payments', note: '2.9% + 30¢ per txn' },
  ],
  'Lemon Squeezy': [
    { service: 'Lemon Squeezy (Usage)', cost: 0, category: 'Payments', note: '5% + 50¢ per txn' },
  ],

  // Infrastructure / Cloud
  'Docker': [
    { service: 'Railway/Render (Included)', cost: 0, category: 'Infra' },
  ],
  'Kubernetes': [
    { service: 'K3s on cheap VPS', cost: 10, category: 'Infra' },
    { service: 'EKS Cluster', cost: 73, category: 'Infra' },
    { service: 'GKE Autopilot', cost: 75, category: 'Infra' },
  ],
  'AWS': [
    { service: 'AWS Free Tier', cost: 0, category: 'Cloud' },
    { service: 'AWS Lightsail VPS', cost: 3.5, category: 'Cloud' },
    { service: 'AWS EC2 t3.micro', cost: 10, category: 'Cloud' },
  ],
  'GCP': [
    { service: 'GCP Free Tier', cost: 0, category: 'Cloud' },
    { service: 'GCP e2-micro VPS', cost: 8, category: 'Cloud' },
  ],
  'Azure': [
    { service: 'Azure Free Tier', cost: 0, category: 'Cloud' },
    { service: 'Azure B1s VM', cost: 15, category: 'Cloud' },
  ],

  // Analytics / Monitoring
  'PostHog': [
    { service: 'PostHog Free (1M events)', cost: 0, category: 'Analytics' },
    { service: 'PostHog Cloud Scale', cost: 10, category: 'Analytics' },
  ],
  'Mixpanel': [
    { service: 'Mixpanel Free', cost: 0, category: 'Analytics' },
  ],
  'Datadog': [
    { service: 'Sentry Developer', cost: 0, category: 'Monitoring' },
    { service: 'Datadog Pro', cost: 15, category: 'Monitoring', note: 'per host/mo' },
  ],
  'Sentry': [
    { service: 'Sentry Free', cost: 0, category: 'Monitoring' },
    { service: 'Sentry Team plan', cost: 26, category: 'Monitoring' },
  ],

  // Serverless
  'Vercel': [
    { service: 'Vercel Hobby', cost: 0, category: 'Serverless' },
    { service: 'Vercel Pro', cost: 20, category: 'Serverless' },
  ],
  'Netlify': [
    { service: 'Netlify Starter', cost: 0, category: 'Serverless' },
    { service: 'Netlify Pro', cost: 19, category: 'Serverless' },
  ],
  'AWS Lambda': [
    { service: 'Lambda Free Tier', cost: 0, category: 'Serverless' },
  ],
  'Cloudflare Workers': [
    { service: 'CF Workers Free', cost: 0, category: 'Serverless' },
    { service: 'CF Workers Paid', cost: 5, category: 'Serverless' },
  ],

  // Email
  'SendGrid': [
    { service: 'SendGrid Free', cost: 0, category: 'Email', note: '100 emails/day' },
    { service: 'SendGrid Essentials', cost: 20, category: 'Email' },
  ],
  'Resend': [
    { service: 'Resend Free', cost: 0, category: 'Email', note: '3k emails/mo' },
    { service: 'Resend Pro', cost: 20, category: 'Email' },
  ],
  'Mailgun': [
    { service: 'Mailgun Trial', cost: 0, category: 'Email' },
    { service: 'Mailgun Foundation', cost: 35, category: 'Email' },
  ],

  // AI
  'OpenAI': [
    { service: 'OpenAI API (Free Credits)', cost: 0, category: 'AI' },
    { service: 'OpenAI API (Usage)', cost: 20, category: 'AI' },
  ],
  'Gemini': [
    { service: 'Gemini API Free', cost: 0, category: 'AI', note: '1M free tokens/mo' },
    { service: 'Gemini API Paid', cost: 15, category: 'AI' },
  ],
  'Anthropic': [
    { service: 'Claude API (Usage)', cost: 15, category: 'AI' },
  ]
}

// Fallback pricing database (default values)
export const DEFAULT_PRICING = {
  'React':    { service: 'Vercel Hobby',      cost: 0,   category: 'Frontend' },
  'Next.js':  { service: 'Vercel Pro',         cost: 20,  category: 'Frontend' },
  'Vue':      { service: 'Netlify Starter',    cost: 0,   category: 'Frontend' },
  'Angular':  { service: 'Netlify Starter',    cost: 0,   category: 'Frontend' },
  'Node.js':  { service: 'Railway Starter',    cost: 5,   category: 'Backend' },
  'Express':  { service: 'Railway Starter',    cost: 5,   category: 'Backend' },
  'FastAPI':  { service: 'Railway Starter',    cost: 5,   category: 'Backend' },
  'Django':   { service: 'Railway Starter',    cost: 5,   category: 'Backend' },
  'Spring Boot': { service: 'Render Starter',  cost: 7,   category: 'Backend' },
  'Go':       { service: 'Railway Pro',        cost: 20,  category: 'Backend' },
  'Rust':     { service: 'Railway Pro',        cost: 20,  category: 'Backend' },
  'PostgreSQL': { service: 'Supabase Free',    cost: 0,   category: 'Database' },
  'MySQL':     { service: 'PlanetScale Hobby', cost: 0,   category: 'Database' },
  'MongoDB':   { service: 'Atlas M0 Free',     cost: 0,   category: 'Database' },
  'Firestore': { service: 'Firebase Spark',    cost: 0,   category: 'Database' },
  'DynamoDB':  { service: 'AWS Free Tier',     cost: 0,   category: 'Database' },
  'Cassandra': { service: 'Astra DB Free',     cost: 0,   category: 'Database' },
  'Redis':    { service: 'Upstash Redis',      cost: 0,   category: 'Cache' },
  'Kafka':    { service: 'Upstash Kafka',      cost: 10,  category: 'Queue' },
  'RabbitMQ': { service: 'CloudAMQP Starter',  cost: 0,   category: 'Queue' },
  'AWS S3':   { service: 'S3 Free Tier',       cost: 0,   category: 'Storage' },
  'GCS':      { service: 'GCS Free Tier',      cost: 0,   category: 'Storage' },
  'Cloudinary': { service: 'Cloudinary Free',  cost: 0,   category: 'Storage' },
  'Auth0':    { service: 'Auth0 Free',         cost: 0,   category: 'Auth' },
  'Firebase Auth': { service: 'Firebase Free', cost: 0,   category: 'Auth' },
  'Supabase Auth': { service: 'Supabase Free', cost: 0,   category: 'Auth' },
  'Stripe':   { service: 'Stripe Pay-as-you-go',  cost: 0,   category: 'Payments' },
  'Lemon Squeezy': { service: 'Lemon Squeezy', cost: 0, category: 'Payments' },
  'Docker':   { service: 'Railway/Render',     cost: 0,   category: 'Infra' },
  'Kubernetes': { service: 'GKE Autopilot',   cost: 75,  category: 'Infra' },
  'AWS':      { service: 'AWS Lightsail VPS',  cost: 3.5, category: 'Cloud' },
  'GCP':      { service: 'GCP e2-micro VPS',   cost: 8,   category: 'Cloud' },
  'Azure':    { service: 'Azure B1s VM',       cost: 15,  category: 'Cloud' },
  'PostHog':  { service: 'PostHog Free',       cost: 0,   category: 'Analytics' },
  'Mixpanel': { service: 'Mixpanel Free',      cost: 0,   category: 'Analytics' },
  'Datadog':  { service: 'Datadog Pro',        cost: 15,  category: 'Monitoring' },
  'Sentry':   { service: 'Sentry Free',        cost: 0,   category: 'Monitoring' },
  'Vercel':   { service: 'Vercel Pro',         cost: 20,  category: 'Serverless' },
  'Netlify':  { service: 'Netlify Pro',        cost: 19,  category: 'Serverless' },
  'AWS Lambda': { service: 'Lambda Free Tier', cost: 0,   category: 'Serverless' },
  'Cloudflare Workers': { service: 'CF Workers Free', cost: 0, category: 'Serverless' },
  'SendGrid': { service: 'SendGrid Free',      cost: 0,   category: 'Email' },
  'Resend':   { service: 'Resend Free',        cost: 0,   category: 'Email' },
  'Mailgun':  { service: 'Mailgun Trial',      cost: 0,   category: 'Email' },
  'OpenAI':   { service: 'OpenAI API',         cost: 20,  category: 'AI' },
  'Gemini':   { service: 'Gemini API Free',    cost: 0,   category: 'AI' },
  'Anthropic': { service: 'Claude API',        cost: 15,  category: 'AI' },
}

// Detect stack items from architecture response
export function detectStack(architecture) {
  if (!architecture) return []
  const allText = JSON.stringify(architecture).toLowerCase()
  const found = []
  
  // Use keys from TECH_OPTIONS or DEFAULT_PRICING
  const keys = Array.from(new Set([
    ...Object.keys(TECH_OPTIONS),
    ...Object.keys(DEFAULT_PRICING)
  ]))

  for (const tech of keys) {
    if (allText.includes(tech.toLowerCase())) {
      const defaultInfo = DEFAULT_PRICING[tech] || { service: 'Hosting Provider', cost: 0, category: 'Other' }
      found.push({ tech, ...defaultInfo })
    }
  }
  return found
}

function getBudgetTier(total) {
  if (total < 50)  return { label: 'MVP Budget', color: '#10b981', emoji: '🟢', desc: 'Perfect for side projects and MVPs. Zero or near-zero cost.' }
  if (total < 200) return { label: 'Early Startup', color: '#f59e0b', emoji: '🟡', desc: 'Healthy early-stage spend. Consider free-tier limits.' }
  if (total < 500) return { label: 'Growing Startup', color: '#f97316', emoji: '🟠', desc: 'Significant infra cost. Make sure you have revenue to match.' }
  return { label: 'Scale-up Territory', color: '#ef4444', emoji: '🔴', desc: 'Enterprise-level spend. Optimize resources or consider VPS.' }
}

export default function CostEstimator({ 
  architecture,
  detectedStack,
  customCosts,
  setCustomCosts,
  enabledServices,
  setEnabledServices,
  sliderVal,
  setSliderVal,
  onTotalCostChange
}) {
  const [expanded, setExpanded] = useState(true) // Expanded by default based on user feedback
  const infrastructureMode = useArchitectureStore(state => state.infrastructureMode)
  const setServiceOverride = useArchitectureStore(state => state.setServiceOverride)
  const generateArchitecture = useArchitectureStore(state => state.generateArchitecture)
  const currentProjectId = useArchitectureStore(state => state.currentProjectId)
  const currentArchitecture = useArchitectureStore(state => state.currentArchitecture)
  
  const { user } = useAuthContext() || {}
  const [isRevalidating, setIsRevalidating] = useState(false)

  const handleRevalidate = async () => {
    if (!currentProjectId || !user) return;
    setIsRevalidating(true);
    try {
      const token = await user.getIdToken();
      // Send a hidden prompt indicating we are re-validating overrides
      await generateArchitecture(currentProjectId, "Re-validate the architecture based on my new service tiers.", [], token);
    } catch (err) {
      console.error("Failed to revalidate architecture:", err);
    } finally {
      setIsRevalidating(false);
    }
  }

  // Handle complexity slider changes to adjust presets
  const handleSliderChange = (e) => {
    const val = parseInt(e.target.value, 10)
    setSliderVal(val)
    const newCustoms = {}
    detectedStack.forEach(item => {
      const options = TECH_OPTIONS[item.tech] || []
      if (options.length > 0) {
        // Plan matching by cost index range
        let selectedOpt = options[0]
        if (val === 1) {
          // Free tier or cheapest
          selectedOpt = options.find(o => o.cost === 0) || options[0]
        } else if (val === 2) {
          // Starter Paid
          selectedOpt = options.find(o => o.cost > 0 && o.cost <= 25) || options[0]
        } else if (val === 3) {
          // Mid Scale
          selectedOpt = options.find(o => o.cost > 25 && o.cost <= 74) || options[options.length - 1]
        } else {
          // Enterprise Scale
          selectedOpt = options.find(o => o.cost >= 75) || options[options.length - 1]
        }
        newCustoms[item.tech] = { service: selectedOpt.service, cost: selectedOpt.cost, isCustom: false }
      }
    })
    setCustomCosts(newCustoms)
  }

  // 2. Map options and load current choices
  const stackItems = useMemo(() => {
    return detectedStack.map(item => {
      const custom = customCosts[item.tech]
      if (custom) {
        return {
          ...item,
          service: custom.service,
          cost: custom.cost,
          note: custom.isCustom ? 'Custom Price' : (TECH_OPTIONS[item.tech]?.find(o => o.service === custom.service)?.note || item.note)
        }
      }

      // Default choice is the first element of options, or the default database pricing
      const options = TECH_OPTIONS[item.tech]
      if (options && options.length > 0) {
        return {
          ...item,
          service: options[0].service,
          cost: options[0].cost,
          note: options[0].note || item.note
        }
      }

      return item
    })
  }, [detectedStack, customCosts])

  // 3. Sum up values
  const totalCost = useMemo(() => {
    return stackItems.reduce((acc, item) => {
      if (enabledServices[item.tech] !== false) {
        return acc + item.cost
      }
      return acc
    }, 0)
  }, [stackItems, enabledServices])

  // Propagate totalCost upwards
  React.useEffect(() => {
    if (onTotalCostChange) {
      onTotalCostChange(totalCost)
    }
  }, [totalCost, onTotalCostChange])

  const tier = getBudgetTier(totalCost)

  // 4. Group elements by category for clean UI rendering
  const byCategory = useMemo(() => {
    const groups = {}
    stackItems.forEach(item => {
      const cat = item.category || 'Other'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(item)
    })
    return groups
  }, [stackItems])

  if (detectedStack.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={emptyStyle}>
          <span style={{ fontSize: '2rem' }}>💰</span>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
            No recognizable technologies detected in this architecture yet.
            <br />Generate an architecture to see cost estimates.
          </p>
        </div>
      </div>
    )
  }

  const sliderLabels = ['Lean MVP', 'Early Startup', 'High Growth', 'Planet Scale']

  return (
    <div style={containerStyle}>
      {/* Predictive Scale Slider */}
      <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
          <span>PROJECT SCALING STAGE:</span>
          <span style={{ color: 'var(--primary)' }}>{sliderLabels[sliderVal - 1]}</span>
        </div>
        <input 
          type="range"
          min="1"
          max="4"
          value={sliderVal}
          onChange={handleSliderChange}
          style={{ width: '100%', height: '4px', cursor: 'pointer', accentColor: 'var(--primary)' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-faint)', marginTop: '4px' }}>
          <span>Lean MVP</span>
          <span>Early Startup</span>
          <span>High Growth</span>
          <span>Planet Scale</span>
        </div>
      </div>

      {/* Header */}
      <div style={headerStyle}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.4rem' }}>{tier.emoji}</span>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Estimated Monthly Cost
              </div>
              <div style={{ fontSize: 'clamp(1.5rem, 6vw, 2rem)', fontWeight: 900, color: tier.color, lineHeight: 1.1 }}>
                ${totalCost}
                <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: 4 }}>/mo</span>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px',
              background: `${tier.color}15`, border: `1px solid ${tier.color}35`,
              borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, color: tier.color
            }}>
              {tier.label}
            </span>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 8, lineHeight: 1.45 }}>
              {tier.desc}
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Enabled</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {Object.values(enabledServices).filter(Boolean).length} / {stackItems.length}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>services</div>
        </div>
      </div>

      {/* Progress bar indicator */}
      <div style={{ height: 6, background: 'var(--border-subtle)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{
          height: '100%',
          width: `${Math.min(100, (totalCost / 500) * 100)}%`,
          background: `linear-gradient(90deg, #10b981, ${tier.color})`,
          borderRadius: 3,
          transition: 'width 0.4s ease'
        }} />
      </div>

      {/* Breakdown toggle button */}
      <button
        type="button"
        onClick={() => setExpanded(p => !p)}
        style={toggleButtonStyle}
      >
        <span>📊 View and Customize Service Plans</span>
        <span style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s ease' }}>▾</span>
      </button>

      {expanded && (
        <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Object.entries(byCategory).map(([category, items]) => (
            <div key={category} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
                {category}
              </div>
              {items.map(item => {
                const options = TECH_OPTIONS[item.tech] || []
                const hasOptions = options.length > 0
                const currentSelection = customCosts[item.tech]

                const isEnabled = enabledServices[item.tech] !== false

                return (
                  <div key={item.tech} style={{ ...itemContainerStyle, opacity: isEnabled ? 1 : 0.5, transition: 'opacity 0.2s' }}>
                    <input 
                      type="checkbox" 
                      checked={isEnabled} 
                      onChange={(e) => {
                        setEnabledServices(prev => ({
                          ...prev,
                          [item.tech]: e.target.checked
                        }))
                      }}
                      style={{ marginRight: '8px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{item.tech}</span>
                        {item.note && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', flex: 1, minWidth: '100px' }}>
                            ({item.note})
                          </span>
                        )}
                      </div>
                      
                      {/* Plan Chip Selector */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                        {hasOptions ? (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {options.map(opt => {
                              const isSelected = !currentSelection?.isCustom && currentSelection?.service === opt.service;
                              return (
                                <button
                                  key={opt.service}
                                  onClick={() => {
                                    setCustomCosts(prev => ({
                                      ...prev,
                                      [item.tech]: { service: opt.service, cost: opt.cost, isCustom: false }
                                    }))
                                    setServiceOverride(item.tech, opt.service)
                                  }}
                                  style={{
                                    background: isSelected ? 'var(--primary-soft)' : 'var(--bg-base)',
                                    border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                                    color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                                    borderRadius: '6px',
                                    padding: '6px 12px',
                                    fontSize: '0.72rem',
                                    fontWeight: isSelected ? 600 : 400,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    outline: 'none',
                                    fontFamily: 'var(--font-sans)',
                                  }}
                                >
                                  {opt.service} <span style={{opacity: 0.7}}>({opt.cost === 0 ? 'Free' : `$${opt.cost}/mo`})</span>
                                </button>
                              )
                            })}
                            <button
                              onClick={() => setCustomCosts(prev => ({
                                ...prev,
                                [item.tech]: { service: 'Custom Plan', cost: item.cost, isCustom: true }
                              }))}
                              style={{
                                background: currentSelection?.isCustom ? 'var(--primary-soft)' : 'var(--bg-base)',
                                border: `1px solid ${currentSelection?.isCustom ? 'var(--primary)' : 'var(--border-subtle)'}`,
                                color: currentSelection?.isCustom ? 'var(--primary)' : 'var(--text-secondary)',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                fontSize: '0.72rem',
                                fontWeight: currentSelection?.isCustom ? 600 : 400,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                outline: 'none',
                                fontFamily: 'var(--font-sans)',
                              }}
                            >
                              ✏️ Custom Price...
                            </button>
                          </div>
                        ) : (
                          // Fallback selector if tech doesn't have options predefined
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => {
                                const temp = { ...customCosts }
                                delete temp[item.tech]
                                setCustomCosts(temp)
                              }}
                              style={{
                                background: !currentSelection?.isCustom ? 'var(--primary-soft)' : 'var(--bg-base)',
                                border: `1px solid ${!currentSelection?.isCustom ? 'var(--primary)' : 'var(--border-subtle)'}`,
                                color: !currentSelection?.isCustom ? 'var(--primary)' : 'var(--text-secondary)',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                fontSize: '0.72rem',
                                fontWeight: !currentSelection?.isCustom ? 600 : 400,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                outline: 'none',
                                fontFamily: 'var(--font-sans)',
                              }}
                            >
                              {item.service} <span style={{opacity: 0.7}}>({item.cost === 0 ? 'Free' : `$${item.cost}/mo`})</span>
                            </button>
                            <button
                              onClick={() => setCustomCosts(prev => ({
                                ...prev,
                                [item.tech]: { service: 'Custom Plan', cost: item.cost, isCustom: true }
                              }))}
                              style={{
                                background: currentSelection?.isCustom ? 'var(--primary-soft)' : 'var(--bg-base)',
                                border: `1px solid ${currentSelection?.isCustom ? 'var(--primary)' : 'var(--border-subtle)'}`,
                                color: currentSelection?.isCustom ? 'var(--primary)' : 'var(--text-secondary)',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                fontSize: '0.72rem',
                                fontWeight: currentSelection?.isCustom ? 600 : 400,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                outline: 'none',
                                fontFamily: 'var(--font-sans)',
                              }}
                            >
                              ✏️ Custom Price...
                            </button>
                          </div>
                        )}

                        {/* Custom Cost Input (Numeric) */}
                        {currentSelection?.isCustom && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                              type="number"
                              min="0"
                              className="custom-cost-input"
                              placeholder="0"
                              value={currentSelection.cost}
                              onChange={(e) => {
                                const val = Math.max(0, parseFloat(e.target.value) || 0)
                                setCustomCosts(prev => ({
                                  ...prev,
                                  [item.tech]: { service: 'Custom Plan', cost: val, isCustom: true }
                                }))
                              }}
                              style={inputStyle}
                            />
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>/mo</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <span style={{
                      color: item.cost === 0 ? 'var(--success)' : 'var(--text-secondary)',
                      fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.82rem', marginLeft: 12
                    }}>
                      {item.cost === 0 ? 'Free' : `$${item.cost}`}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}

          {/* Dynamic summary total */}
          <div style={summaryTotalStyle}>
            <span style={{ color: 'var(--text-secondary)' }}>Total Estimate</span>
            <span style={{ color: tier.color }}>${totalCost}/mo</span>
          </div>

          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.45, textAlign: 'center', marginTop: 4 }}>
            * Interact with the dropdown options to customize plans. Prices reflect standard rates. Actual cloud costs depend on production usage.
          </p>

          {infrastructureMode === 'MANUAL_OVERRIDE' && (
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--warning)', textAlign: 'center' }}>
                ⚠️ You have manually overridden service plans. Re-validate to align the rest of the architecture.
              </div>
              <button
                onClick={handleRevalidate}
                disabled={isRevalidating}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: isRevalidating ? 'not-allowed' : 'pointer',
                  opacity: isRevalidating ? 0.7 : 1,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                {isRevalidating ? 'Re-validating...' : 'Re-validate Architecture'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Shared Styles (CSS Variables for perfect Dark/Light support) ─────────────
const containerStyle = {
  background: 'transparent',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-lg)',
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
}

const emptyStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 12,
  padding: '24px 12px',
}

const toggleButtonStyle = {
  background: 'transparent',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  fontSize: '0.78rem',
  fontWeight: 600,
  padding: '8px 12px',
  cursor: 'pointer',
  width: '100%',
  textAlign: 'left',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  outline: 'none',
}

const itemContainerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 12px',
  background: 'transparent',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)',
  marginBottom: 2,
}

const selectStyle = {
  background: 'var(--bg-base)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-xs)',
  color: 'var(--text-secondary)',
  fontSize: '0.72rem',
  padding: '2px 6px',
  outline: 'none',
  cursor: 'pointer',
  fontFamily: 'var(--font-sans)',
}

const inputStyle = {
  background: 'var(--bg-base)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-xs)',
  color: 'var(--text-primary)',
  fontSize: '0.72rem',
  padding: '2px 6px',
  width: 55,
  outline: 'none',
  fontFamily: 'var(--font-mono)',
}

const summaryTotalStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '10px 12px',
  borderTop: '1px solid var(--border-subtle)',
  marginTop: 4,
  fontWeight: 700,
  fontSize: '0.85rem',
}
