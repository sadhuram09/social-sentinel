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
      const res = await axios.post(`${BASE_URL}/api/analyze`, { text })
      setResult(res.data)
    } catch (e) {
      // Surface the real failure. Never substitute fabricated scores —
      // an unreachable backend must look unreachable, not like a result.
      setError(
        e.response?.data?.error ||
        e.message ||
        'Could not reach the analysis service.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', padding: '120px 40px 100px', maxWidth: 940, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <p style={{ fontSize: 11, color: 'var(--accent-cyan)', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14 }}>
          — Thread Analyzer
        </p>
        <h1 style={{ fontSize: 42, fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.08, marginBottom: 12 }}>
          Paste a Conversation
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 44, maxWidth: 560 }}>
          We detect bullying events, victim responses, and trace how a thread escalates.
        </p>

        {/* Input */}
        <div className="glass-card" style={{ padding: 22, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Tweet thread · one tweet per line</span>
            <button onClick={() => setText(EXAMPLE_THREAD)} style={{
              fontSize: 12, color: 'var(--text-secondary)', background: 'none',
              border: '1px solid var(--border)', borderRadius: 7, padding: '5px 12px', cursor: 'pointer',
              fontFamily: 'Geist, sans-serif',
              transition: 'border-color 0.25s ease, color 0.25s ease, background 0.25s ease',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-glow)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              Load example
            </button>
          </div>
          <textarea
            value={text} onChange={e => setText(e.target.value)}
            placeholder="@attacker: paste tweets here...&#10;@victim: their response..."
            style={{
              width: '100%', minHeight: 190, resize: 'vertical',
              background: 'rgba(0,0,0,0.28)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '16px 18px',
              color: 'var(--text-primary)', fontSize: 13.5, lineHeight: 1.75,
              fontFamily: 'Geist Mono, monospace',
              outline: 'none',
              transition: 'border-color 0.25s ease, background 0.25s ease',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.35)'; e.currentTarget.style.background = 'rgba(0,0,0,0.4)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'rgba(0,0,0,0.28)' }}
          />
          <button
            onClick={analyze} disabled={loading || !text.trim()}
            style={{
              marginTop: 18, width: '100%', padding: '14px',
              background: (loading || !text.trim()) ? 'rgba(255,255,255,0.06)' : 'var(--text-primary)',
              border: '1px solid transparent', borderRadius: 10,
              color: (loading || !text.trim()) ? 'var(--text-muted)' : '#08090c',
              fontWeight: 600, fontSize: 14.5, letterSpacing: '-0.01em',
              cursor: (loading || !text.trim()) ? 'not-allowed' : 'pointer',
              fontFamily: 'Geist, sans-serif',
              transition: 'background 0.25s ease, color 0.25s ease, opacity 0.25s ease',
            }}
            onMouseEnter={e => { if (!loading && text.trim()) e.currentTarget.style.opacity = '0.9' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            {loading ? '⚡ Analyzing Causal Chain...' : '🔍 Analyze Thread →'}
          </button>
        </div>

        {/* Error state — shown instead of a result when the backend is unreachable */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="glass-card"
              style={{
                padding: '20px 22px', marginBottom: 20,
                border: '1px solid rgba(255,61,90,0.28)',
                background: 'rgba(255,61,90,0.05)',
                display: 'flex', alignItems: 'flex-start', gap: 14,
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1.2 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.015em', color: '#ff3d5a', marginBottom: 6 }}>
                  Analysis unavailable
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {error}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.6 }}>
                  The backend sleeps after inactivity and can take up to a minute to
                  wake. Try again in a moment.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* Score cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
                {[
                  { label: 'Bullying Score', value: result.bullying_score, color: '#ff3d5a' },
                  { label: 'Distress Signal', value: result.depression_score, color: '#ffb347' },
                  { label: 'Risk Index', value: result.causal_link, color: '#a855f7' },
                ].map(s => (
                  <div key={s.label} className="stat-card" style={{ padding: '20px 22px' }}>
                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500 }}>{s.label}</div>
                    <div style={{
                      fontSize: 38, fontWeight: 600, color: s.color,
                      fontFamily: 'Geist Mono, monospace', fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '-0.03em', lineHeight: 1,
                    }}>
                      {Math.round(s.value * 100)}<span style={{ fontSize: '0.5em', marginLeft: 2, opacity: 0.55 }}>%</span>
                    </div>
                    <div style={{ marginTop: 16, height: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${s.value * 100}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                        style={{ height: '100%', background: s.color, borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Risk level */}
              <div className="glass-card" style={{ padding: '22px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                  background: result.risk_level === 'HIGH' ? 'rgba(255,61,90,0.10)' : 'rgba(255,179,71,0.10)',
                  border: `1px solid ${result.risk_level === 'HIGH' ? 'rgba(255,61,90,0.30)' : 'rgba(255,179,71,0.30)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                }}>
                  {result.risk_level === 'HIGH' ? '🚨' : '⚠️'}
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500 }}>Overall Risk Level</div>
                  <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1, color: result.risk_level === 'HIGH' ? '#ff3d5a' : '#ffb347' }}>
                    {result.risk_level} RISK
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)', maxWidth: 340, borderLeft: '1px solid var(--border)', paddingLeft: 18 }}>
                  Bullying indicators detected, with elevated distress signals in later messages.
                  Inferred signals — not a clinical assessment.
                </div>
              </div>

              {/* SHAP Feature Importance — HIDDEN.
                  The backend does not compute SHAP values; `shap_features` is
                  fabricated. We do not display explainability we cannot produce.
                  Re-enable by flipping `false` back to `true` below. */}
              {false && (
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
                    <div style={{ width: 40, fontSize: 12, fontFamily: 'Geist Mono, monospace', color: '#a855f7', textAlign: 'right' }}>
                      +{val}
                    </div>
                  </div>
                ))}
              </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}