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
            display: 'inline-flex', alignItems: 'center', gap: 8,
            border: '1px solid rgba(168,85,247,0.3)',
            background: 'rgba(168,85,247,0.08)',
            borderRadius: 100, padding: '6px 18px', marginBottom: 32,
            fontSize: 13, color: '#a855f7', fontWeight: 500,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a855f7', display: 'inline-block' }} />
          AI-Powered Causal Chain Detection
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
          style={{
            fontSize: 'clamp(42px, 7vw, 88px)',
            fontWeight: 700, lineHeight: 1.05,
            letterSpacing: '-0.03em', marginBottom: 24,
          }}
        >
          <span className="gradient-text">Bullying Triggers</span>
          <br />
          <span style={{ color: 'var(--text-primary)' }}>Depression.</span>
          <br />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.6em', fontWeight: 400 }}>
            We Prove It, Visually.
          </span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.3 }}
          style={{
            fontSize: 18, color: 'var(--text-secondary)',
            maxWidth: 580, lineHeight: 1.7, marginBottom: 48,
          }}
        >
          The world's first system that detects cyberbullying events and traces
          their causal impact on victim mental health — in real time, with 3D visualizations.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ display: 'flex', gap: 16 }}
        >
          <button onClick={() => navigate('/analyze')} style={{
            padding: '14px 36px', borderRadius: 12,
            background: 'linear-gradient(135deg, #00d4ff, #a855f7)',
            border: 'none', color: '#000', fontWeight: 700, fontSize: 15,
            cursor: 'pointer', fontFamily: 'Space Grotesk, sans-serif',
            boxShadow: '0 0 30px rgba(0,212,255,0.3)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
            onMouseEnter={e => { e.target.style.transform = 'scale(1.04)'; e.target.style.boxShadow = '0 0 50px rgba(0,212,255,0.5)' }}
            onMouseLeave={e => { e.target.style.transform = 'scale(1)'; e.target.style.boxShadow = '0 0 30px rgba(0,212,255,0.3)' }}
          >
            Analyze a Thread →
          </button>
          <button onClick={() => navigate('/live')} style={{
            padding: '14px 36px', borderRadius: 12,
            background: 'transparent',
            border: '1px solid rgba(0,212,255,0.3)', color: 'var(--accent-cyan)',
            fontWeight: 600, fontSize: 15,
            cursor: 'pointer', fontFamily: 'Space Grotesk, sans-serif',
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.target.style.background = 'rgba(0,212,255,0.08)' }}
            onMouseLeave={e => { e.target.style.background = 'transparent' }}
          >
            Live Feed
          </button>
        </motion.div>

        {/* Stat strip */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16, width: '100%', maxWidth: 900, marginTop: 80,
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
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {s.label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: '#00ff9d', marginTop: 4 }}>{s.delta} today</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Dashboard section */}
      <div style={{ position: 'relative', zIndex: 1, padding: '0 40px 80px' }}>
        <Dashboard />
      </div>
    </div>
  )
}