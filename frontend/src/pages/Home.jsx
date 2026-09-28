import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Dashboard from '../components/Dashboard'

const STATS = [
  { label: 'Tweets Analyzed', value: '2.4M', delta: '+12%', color: '#00d4ff' },
  { label: 'Bullying Detected', value: '18,420', delta: '+3.2%', color: '#ff3d5a' },
  { label: 'Depression Signals', value: '7,891', delta: '+8.1%', color: '#ffb347' },
  { label: 'Causal Chains', value: '3,204', delta: '+5.7%', color: '#a855f7' },
]

export default function Home() {
  const navigate = useNavigate()
  const canvasRef = useRef(null)

  // Particle field background
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.4 + 0.1,
      color: Math.random() > 0.7 ? '#ff3d5a' : Math.random() > 0.5 ? '#a855f7' : '#00d4ff',
    }))

    let animId
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        // Draw connections
        particles.forEach(q => {
          const dist = Math.hypot(p.x - q.x, p.y - q.y)
          if (dist < 100) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(99,179,237,${0.06 * (1 - dist / 100)})`
            ctx.lineWidth = 0.5
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(q.x, q.y)
            ctx.stroke()
          }
        })

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.color + Math.floor(p.opacity * 255).toString(16).padStart(2, '0')
        ctx.fill()
      })
      animId = requestAnimationFrame(draw)
    }
    draw()

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* Particle canvas */}
      <canvas ref={canvasRef} style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
      }} />

      {/* Hero */}
      <div style={{
        position: 'relative', zIndex: 1,
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '100px 40px 60px',
        textAlign: 'center',
      }}>
        {/* Top label */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 9,
            border: '1px solid var(--border)',
            background: 'rgba(255,255,255,0.025)',
            borderRadius: 100, padding: '7px 16px', marginBottom: 36,
            fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500,
            letterSpacing: '-0.005em',
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-cyan)', display: 'inline-block', boxShadow: '0 0 0 3px rgba(0,212,255,0.14)' }} />
          AI-Powered Causal Chain Detection
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
          style={{
            fontSize: 'clamp(44px, 7.2vw, 92px)',
            fontWeight: 600, lineHeight: 1.02,
            letterSpacing: '-0.042em', marginBottom: 26,
          }}
        >
          <span className="gradient-text">Bullying Triggers</span>
          <br />
          <span style={{ color: 'var(--text-primary)' }}>Depression.</span>
          <span style={{
            display: 'block', marginTop: 18,
            color: 'var(--text-muted)', fontSize: '0.30em', fontWeight: 400,
            letterSpacing: '-0.015em', lineHeight: 1.3,
          }}>
            We Trace It, Visually.
          </span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.3 }}
          style={{
            fontSize: 17, color: 'var(--text-secondary)',
            maxWidth: 560, lineHeight: 1.65, marginBottom: 44,
            letterSpacing: '-0.008em',
          }}
        >
          A system that detects cyberbullying events and traces the distress
          signals that follow — in real time, with 3D visualizations.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}
        >
          <button onClick={() => navigate('/analyze')} style={{
            padding: '13px 28px', borderRadius: 10,
            background: 'var(--text-primary)',
            border: '1px solid transparent', color: '#08090c', fontWeight: 600, fontSize: 14.5,
            letterSpacing: '-0.01em',
            cursor: 'pointer', fontFamily: 'Geist, sans-serif',
            boxShadow: 'var(--shadow-md)',
            transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1), opacity 0.25s ease',
          }}
            onMouseEnter={e => { e.target.style.transform = 'translateY(-1px)'; e.target.style.opacity = '0.9' }}
            onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.opacity = '1' }}
          >
            Analyze a Thread →
          </button>
          <button onClick={() => navigate('/live')} style={{
            padding: '13px 28px', borderRadius: 10,
            background: 'transparent',
            border: '1px solid var(--border)', color: 'var(--text-secondary)',
            fontWeight: 500, fontSize: 14.5, letterSpacing: '-0.01em',
            cursor: 'pointer', fontFamily: 'Geist, sans-serif',
            transition: 'background 0.25s ease, border-color 0.25s ease, color 0.25s ease',
          }}
            onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.04)'; e.target.style.borderColor = 'var(--border-glow)'; e.target.style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-secondary)' }}
          >
            Live Feed
          </button>
        </motion.div>

        {/* Stat strip */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12, width: '100%', maxWidth: 920, marginTop: 96,
          }}
        >
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.1 }}
              className="stat-card"
              style={{ textAlign: 'left' }}
            >
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 10, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase' }}>
                {s.label}
              </div>
              <div style={{ fontSize: 26, fontWeight: 600, color: s.color, fontFamily: 'Geist Mono, monospace', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8 }}>{s.delta} today</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Dashboard section */}
      <div style={{ position: 'relative', zIndex: 1, padding: '0 40px 120px', maxWidth: 1280, margin: '0 auto' }}>
        <Dashboard />
      </div>
    </div>
  )
}