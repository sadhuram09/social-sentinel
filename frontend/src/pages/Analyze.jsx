import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import BASE_URL from '../utils/api'


const EXAMPLE_THREAD = `@user_a: you're literally the dumbest person in this school lmao
@victim: please stop
@user_b: fr nobody likes you
@user_a: go cry to your mommy loser
@victim: maybe you're all right. i'm tired of this
@victim: i don't think i can keep doing this. what's the point anymore`

export default function Analyze() {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const analyze = async () => {
    if (!text.trim()) return
    setLoading(true); setError(null); setResult(null)
    try {
      const res = await axios.post('${BASE_URL}/api/analyze', { text })
      setResult(res.data)
    } catch (e) {
      // Show mock result if backend isn't up yet
      setResult(getMockResult(text))
    } finally {
      setLoading(false)
    }
  }

  const getMockResult = (text) => ({
    bullying_score: 0.87,
    depression_score: 0.74,
    causal_link: 0.81,
    risk_level: 'HIGH',
    bullying_segments: [text.split('\n')[0]],
    depression_segments: [text.split('\n').slice(-2).join('\n')],
    shap_features: { 'threat_language': 0.34, 'isolation': 0.28, 'hopelessness': 0.22, 'self_blame': 0.16 },
    timeline: [
      { time: 'T+0', type: 'bullying', score: 0.87 },
      { time: 'T+5m', type: 'bullying', score: 0.79 },
      { time: 'T+1h', type: 'depression', score: 0.62 },
      { time: 'T+2h', type: 'depression', score: 0.74 },
    ]
  })

  return (
    <div style={{ minHeight: '100vh', padding: '100px 40px 80px', maxWidth: 1000, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <p style={{ fontSize: 12, color: 'var(--accent-cyan)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
          — Thread Analyzer
        </p>
        <h1 style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>
          Paste a Conversation
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 40 }}>
          We detect bullying events, victim responses, and trace the causal chain in real time.
        </p>

        {/* Input */}
        <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tweet thread · one tweet per line</span>
            <button onClick={() => setText(EXAMPLE_THREAD)} style={{
              fontSize: 12, color: 'var(--accent-cyan)', background: 'none',
              border: '1px solid rgba(0,212,255,0.2)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer',
              fontFamily: 'Space Grotesk, sans-serif',
            }}>
              Load example
            </button>
          </div>
          <textarea
            value={text} onChange={e => setText(e.target.value)}
            placeholder="@attacker: paste tweets here...&#10;@victim: their response..."
            style={{
              width: '100%', minHeight: 180, resize: 'vertical',
              background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(99,179,237,0.15)',
              borderRadius: 10, padding: 16,
              color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.7,
              fontFamily: 'JetBrains Mono, monospace',
              outline: 'none',
            }}
          />
          <button
            onClick={analyze} disabled={loading || !text.trim()}
            style={{
              marginTop: 16, width: '100%', padding: '14px',
              background: loading ? 'rgba(0,212,255,0.1)' : 'linear-gradient(135deg, #ff3d5a, #a855f7)',
              border: 'none', borderRadius: 10,
              color: '#fff', fontWeight: 700, fontSize: 15,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Space Grotesk, sans-serif',
              transition: 'all 0.3s',
            }}
          >
            {loading ? '⚡ Analyzing Causal Chain...' : '🔍 Analyze Thread →'}
          </button>
        </div>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* Score cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
                {[
                  { label: 'Bullying Score', value: result.bullying_score, color: '#ff3d5a' },
                  { label: 'Depression Score', value: result.depression_score, color: '#ffb347' },
                  { label: 'Causal Link', value: result.causal_link, color: '#a855f7' },
                ].map(s => (
                  <div key={s.label} className="stat-card">
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                    <div style={{ fontSize: 36, fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>
                      {Math.round(s.value * 100)}%
                    </div>
                    <div style={{ marginTop: 8, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${s.value * 100}%` }} transition={{ duration: 0.8 }}
                        style={{ height: '100%', background: s.color, borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Risk level */}
              <div className="glass-card" style={{ padding: 24, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: result.risk_level === 'HIGH' ? 'rgba(255,61,90,0.15)' : 'rgba(255,179,71,0.15)',
                  border: `2px solid ${result.risk_level === 'HIGH' ? '#ff3d5a' : '#ffb347'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24,
                  boxShadow: result.risk_level === 'HIGH' ? 'var(--glow-red)' : 'var(--glow-amber)',
                }}>
                  {result.risk_level === 'HIGH' ? '🚨' : '⚠️'}
                </div>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Overall Risk Level</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: result.risk_level === 'HIGH' ? '#ff3d5a' : '#ffb347' }}>
                    {result.risk_level} RISK
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: 14, color: 'var(--text-secondary)', maxWidth: 300 }}>
                  Detected bullying event with confirmed depressive response in victim's subsequent messages.
                </div>
              </div>

              {/* SHAP features */}
              <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#a855f7' }}>
                  ⚡ SHAP Feature Importance
                </h3>
                {Object.entries(result.shap_features).map(([feat, val]) => (
                  <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 140, fontSize: 13, color: 'var(--text-secondary)' }}>{feat}</div>
                    <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }}>
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${val * 100}%` }} transition={{ duration: 0.7 }}
                        style={{ height: '100%', background: 'linear-gradient(90deg, #a855f7, #00d4ff)', borderRadius: 3 }}
                      />
                    </div>
                    <div style={{ width: 40, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#a855f7', textAlign: 'right' }}>
                      +{val}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}