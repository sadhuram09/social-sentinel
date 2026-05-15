import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts'
import CausalChainPanel from './CausalChainPanel'

const TIMELINE_DATA = [
  { time: '00:00', bullying: 12, depression: 4 },
  { time: '03:00', bullying: 8,  depression: 6 },
  { time: '06:00', bullying: 15, depression: 9 },
  { time: '09:00', bullying: 34, depression: 18 },
  { time: '12:00', bullying: 67, depression: 31 },
  { time: '15:00', bullying: 89, depression: 47 },
  { time: '18:00', bullying: 112,depression: 63 },
  { time: '21:00', bullying: 78, depression: 55 },
  { time: '23:59', bullying: 43, depression: 38 },
]

const RADAR_DATA = [
  { subject: 'Insults', A: 82 },
  { subject: 'Threats', A: 45 },
  { subject: 'Exclusion', A: 63 },
  { subject: 'Harassment', A: 71 },
  { subject: 'Stalking', A: 38 },
  { subject: 'Hate Speech', A: 55 },
]

const CUSTOM_TOOLTIP = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(8,13,20,0.95)', border: '1px solid rgba(99,179,237,0.2)',
      borderRadius: 10, padding: '12px 16px',
    }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 6 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [activeChain, setActiveChain] = useState(null)

  const CHAINS = [
    { id: 1, bully: '@xtr3me_h8r', victim: '@quiet_rose_', severity: 'high', tweets: 3, depressionScore: 0.87, topic: 'body shaming', time: '2h ago' },
    { id: 2, bully: '@troll_lord99', victim: '@stargazer_k', severity: 'medium', tweets: 5, depressionScore: 0.61, topic: 'academic failure', time: '4h ago' },
    { id: 3, bully: '@anon_4321', victim: '@dreamer_m', severity: 'high', tweets: 8, depressionScore: 0.92, topic: 'isolation', time: '6h ago' },
  ]

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        style={{ marginBottom: 40 }}
      >
        <p style={{ fontSize: 12, color: 'var(--accent-cyan)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
          — Real-time Intelligence
        </p>
        <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Live Detection Dashboard
        </h2>
      </motion.div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, marginBottom: 20 }}>
        {/* Area chart */}
        <div className="glass-card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Bullying → Depression Timeline</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>24-hour window · Hourly resolution</p>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 24, height: 2, background: '#ff3d5a', borderRadius: 1 }} />
                <span style={{ color: 'var(--text-muted)' }}>Bullying</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 24, height: 2, background: '#ffb347', borderRadius: 1 }} />
                <span style={{ color: 'var(--text-muted)' }}>Depression</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={TIMELINE_DATA}>
              <defs>
                <linearGradient id="gBully" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff3d5a" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ff3d5a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gDepression" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffb347" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ffb347" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,179,237,0.07)" />
              <XAxis dataKey="time" tick={{ fill: '#3d6080', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#3d6080', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CUSTOM_TOOLTIP />} />
              <Area type="monotone" dataKey="bullying" stroke="#ff3d5a" strokeWidth={2} fill="url(#gBully)" name="bullying" />
              <Area type="monotone" dataKey="depression" stroke="#ffb347" strokeWidth={2} fill="url(#gDepression)" name="depression" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Radar chart */}
        <div className="glass-card" style={{ padding: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Bullying Type Breakdown</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Relative severity index</p>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={RADAR_DATA}>
              <PolarGrid stroke="rgba(99,179,237,0.1)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#7aa3c8', fontSize: 11 }} />
              <Radar name="Severity" dataKey="A" stroke="#a855f7" fill="#a855f7" fillOpacity={0.2} strokeWidth={1.5} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Causal chains list */}
      <div className="glass-card" style={{ padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Active Causal Chains</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Bullying events with confirmed depressive response</p>
          </div>
          <span style={{ fontSize: 12, color: 'var(--accent-cyan)', fontFamily: 'JetBrains Mono, monospace' }}>
            {CHAINS.length} active
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {CHAINS.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setActiveChain(activeChain?.id === c.id ? null : c)}
              style={{
                background: activeChain?.id === c.id ? 'rgba(0,212,255,0.06)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${activeChain?.id === c.id ? 'rgba(0,212,255,0.25)' : 'rgba(99,179,237,0.08)'}`,
                borderRadius: 12, padding: '16px 20px',
                cursor: 'pointer', transition: 'all 0.25s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Chain visualization */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>ATTACKER</div>
                    <div style={{
                      background: 'rgba(255,61,90,0.12)', border: '1px solid rgba(255,61,90,0.3)',
                      borderRadius: 8, padding: '6px 12px', fontSize: 13,
                      color: '#ff3d5a', fontFamily: 'JetBrains Mono, monospace',
                    }}>{c.bully}</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.tweets} tweets</div>
                    <div style={{ width: 60, height: 2, background: 'linear-gradient(90deg, #ff3d5a, #ffb347)', borderRadius: 1 }} />
                    <div style={{ fontSize: 10, color: 'var(--accent-amber)' }}>{c.topic}</div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>VICTIM</div>
                    <div style={{
                      background: 'rgba(255,179,71,0.1)', border: '1px solid rgba(255,179,71,0.25)',
                      borderRadius: 8, padding: '6px 12px', fontSize: 13,
                      color: '#ffb347', fontFamily: 'JetBrains Mono, monospace',
                    }}>{c.victim}</div>
                  </div>
                </div>

                {/* Right side info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Depression Risk</div>
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: c.depressionScore > 0.8 ? '#ff3d5a' : '#ffb347' }}>
                      {Math.round(c.depressionScore * 100)}%
                    </div>
                  </div>
                  <span className={`risk-badge risk-${c.severity}`}>
                    <span>●</span> {c.severity}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.time}</span>
                </div>
              </div>

              {/* Expanded chain detail */}
              {activeChain?.id === c.id && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ marginTop: 20 }}>
                  <CausalChainPanel chain={c} />
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}