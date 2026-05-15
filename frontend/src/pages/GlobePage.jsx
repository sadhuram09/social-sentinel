import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Globe3D from '../components/Globe3D'

const GLOBAL_STATS = [
  { label: 'Countries Monitored', value: '20',    color: '#00d4ff' },
  { label: 'Active Chains',       value: '3,204', color: '#ff3d5a' },
  { label: 'Victims Tracked',     value: '18.4K', color: '#ffb347' },
  { label: 'Avg Causal Rate',     value: '54%',   color: '#a855f7' },
]

export default function GlobePage() {
  const [clickedCity, setClickedCity] = useState(null)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 30%, rgba(10,20,50,0.8) 0%, var(--bg-void) 70%)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: '88px 40px 0', position: 'relative', zIndex: 2 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}
        >
          <div>
            <p style={{ fontSize: 12, color: 'var(--accent-cyan)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
              — Global Intelligence
            </p>
            <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>
              Worldwide Causal Chain Map
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              Live bullying → depression events across 20 countries · Arcs show causal chains · Rings show severity
            </p>
          </div>

          {/* Stat strip */}
          <div style={{ display: 'flex', gap: 28 }}>
            {GLOBAL_STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                style={{ textAlign: 'right' }}
              >
                <div style={{
                  fontSize: 26, fontWeight: 700, color: s.color,
                  fontFamily: 'JetBrains Mono, monospace', lineHeight: 1,
                }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {s.label}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Globe — fills the rest */}
      <div style={{ flex: 1, position: 'relative', marginTop: 16, minHeight: 600 }}>
        <Globe3D onHotspotClick={setClickedCity} />
      </div>
    </div>
  )
}