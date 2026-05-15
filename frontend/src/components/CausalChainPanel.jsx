import React from 'react'
import { motion } from 'framer-motion'

const MOCK_EVENTS = [
  { type: 'bullying', time: 'T+0', text: 'nobody wants ur ugly ass here go cry somewhere', score: 0.94, label: 'Bullying Detected' },
  { type: 'bullying', time: 'T+2m', text: 'everyone agrees ur pathetic lmao', score: 0.89, label: 'Escalation' },
  { type: 'neutral', time: 'T+15m', text: '...', score: 0.12, label: 'Silence' },
  { type: 'depression', time: 'T+1h', text: 'maybe they\'re right. i don\'t deserve to be here', score: 0.81, label: 'Depression Signal' },
  { type: 'depression', time: 'T+3h', text: 'tired of existing honestly. what\'s even the point', score: 0.93, label: 'High Risk' },
]

const typeColor = { bullying: '#ff3d5a', depression: '#ffb347', neutral: '#3d6080' }

export default function CausalChainPanel({ chain }) {
  return (
    <div style={{ borderTop: '1px solid rgba(99,179,237,0.1)', paddingTop: 20 }}>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Causal Chain Timeline
      </p>

      <div style={{ position: 'relative' }}>
        {/* Vertical timeline line */}
        <div style={{
          position: 'absolute', left: 83, top: 0, bottom: 0,
          width: 1,
          background: 'linear-gradient(180deg, #ff3d5a, #ffb347, rgba(255,179,71,0))',
        }} />

        {MOCK_EVENTS.map((ev, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.12 }}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 16 }}
          >
            {/* Time */}
            <div style={{
              width: 60, textAlign: 'right',
              fontSize: 11, color: 'var(--text-muted)',
              fontFamily: 'JetBrains Mono, monospace',
              paddingTop: 4, flexShrink: 0,
            }}>
              {ev.time}
            </div>

            {/* Node */}
            <div style={{ position: 'relative', flexShrink: 0, marginTop: 4 }}>
              <div className={`timeline-node ${ev.type !== 'neutral' ? ev.type : ''}`}
                style={{
                  background: typeColor[ev.type],
                  boxShadow: ev.type !== 'neutral' ? `0 0 12px ${typeColor[ev.type]}60` : 'none',
                }}
              />
            </div>

            {/* Content */}
            <div style={{
              flex: 1,
              background: `rgba(${ev.type === 'bullying' ? '255,61,90' : ev.type === 'depression' ? '255,179,71' : '61,96,128'},0.07)`,
              border: `1px solid rgba(${ev.type === 'bullying' ? '255,61,90' : ev.type === 'depression' ? '255,179,71' : '61,96,128'},0.2)`,
              borderRadius: 10, padding: '10px 14px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: typeColor[ev.type], letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {ev.label}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                  Score: {ev.score}
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: ev.type === 'neutral' ? 'italic' : 'normal' }}>
                "{ev.text}"
              </p>
              {/* Score bar */}
              <div style={{ marginTop: 8, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${ev.score * 100}%` }}
                  transition={{ delay: i * 0.12 + 0.3, duration: 0.6 }}
                  style={{ height: '100%', background: typeColor[ev.type], borderRadius: 2 }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* SHAP explanation placeholder */}
      <div style={{
        marginTop: 16, padding: '14px 18px',
        background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)',
        borderRadius: 10,
      }}>
        <p style={{ fontSize: 12, color: '#a855f7', fontWeight: 600, marginBottom: 8 }}>
          ⚡ SHAP Explainability
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['isolation words', 0.34], ['self-deprecation', 0.28], ['hopelessness', 0.22], ['social withdrawal', 0.16]].map(([word, val]) => (
            <div key={word} style={{
              background: `rgba(168,85,247,${val + 0.05})`,
              border: '1px solid rgba(168,85,247,0.3)',
              borderRadius: 6, padding: '4px 10px',
              fontSize: 12, color: '#d4a0ff',
            }}>
              {word} <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>+{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}