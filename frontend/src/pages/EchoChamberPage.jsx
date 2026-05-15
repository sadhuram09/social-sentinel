import React, { useState } from 'react'
import { motion } from 'framer-motion'
import EchoChamber from '../components/EchoChamber'

const METRICS = [
  { label: 'Origin Posts',   value: '1',    color: '#ff1744', sub: 'trigger event'     },
  { label: 'Amplifications', value: '3',    color: '#ff3d5a', sub: 'wave 1 reshares'   },
  { label: 'Victims Hit',    value: '4',    color: '#ffb347', sub: 'wave 2 depression' },
  { label: 'Bystanders',     value: '5',    color: '#7aa3c8', sub: 'wave 3 affected'   },
  { label: 'Total Reach',    value: '13',   color: '#a855f7', sub: 'nodes in network'  },
  { label: 'Avg Depression', value: '73%',  color: '#00d4ff', sub: 'among victims'     },
]

export default function EchoChamberPage() {
  const [selectedNode, setSelectedNode] = useState(null)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingTop: 64 }}>
      {/* Header */}
      <div style={{ padding: '24px 40px 0', flexShrink: 0 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p style={{ fontSize: 12, color: 'var(--accent-cyan)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
            — Propagation Analysis
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>
                Echo Chamber Detector
              </h1>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 520 }}>
                How one bullying post propagates through a social network — amplified by reshares, landing on victims, and spreading depression to bystanders.
                Hit <span style={{ color: '#00d4ff' }}>▶ Replay Spread</span> to watch it unfold wave by wave.
              </p>
            </div>

            {/* Metric strip */}
            <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
              {METRICS.map((m, i) => (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 10, padding: '12px 16px',
                    textAlign: 'center', minWidth: 80,
                  }}
                >
                  <div style={{ fontSize: 22, fontWeight: 700, color: m.color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>
                    {m.value}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {m.label}
                  </div>
                  <div style={{ fontSize: 10, color: m.color, marginTop: 2, opacity: 0.7 }}>
                    {m.sub}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main graph — fills remaining space */}
      <div style={{
        flex: 1, margin: '0 40px 30px',
        background: 'radial-gradient(ellipse at 50% 40%, rgba(15,25,50,0.7) 0%, rgba(2,4,8,0.95) 75%)',
        border: '1px solid rgba(99,179,237,0.1)',
        borderRadius: 20, overflow: 'hidden',
        position: 'relative', minHeight: 520,
      }}>
        <EchoChamber onNodeSelect={setSelectedNode} />
      </div>

      {/* Bottom info */}
      <div style={{
        padding: '0 40px 30px',
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16,
        flexShrink: 0,
      }}>
        {[
          {
            icon: '🔴',
            title: 'Origin Post',
            desc: 'A single bullying post acts as the trigger. The attacker targets the victim directly with threatening or demeaning language.',
            color: '#ff1744',
          },
          {
            icon: '📡',
            title: 'Amplification Wave',
            desc: 'Bystanders reshare, quote-tweet, or reply, amplifying the reach. Each amplifier extends the harassment to new audiences.',
            color: '#ff3d5a',
          },
          {
            icon: '🌊',
            title: 'Depression Ripple',
            desc: 'Victims develop measurable depression signals. Even uninvolved bystanders who view the thread show anxiety and mood decline.',
            color: '#ffb347',
          },
        ].map(card => (
          <div key={card.title} style={{
            background: 'var(--bg-card)',
            border: `1px solid ${card.color}22`,
            borderRadius: 12, padding: '16px 20px',
          }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>{card.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: card.color, marginBottom: 6 }}>{card.title}</div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}