import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import BASE_URL from '../utils/api'


// Display names for the classifier's labels (backend encoder classes).
const CATEGORY_LABEL = {
  age:                 'Age',
  ethnicity:           'Ethnicity',
  gender:              'Gender',
  religion:            'Religion',
  other_cyberbullying: 'Other',
  not_cyberbullying:   'Not cyberbullying',
  keyword_fallback:    'Unavailable — trained model not loaded',
}

const KEYWORD_NOTE = 'Keyword heuristic — distress model not yet trained'

// Category = most likely single class; bullying score = 1 − P(not_cyberbullying),
// i.e. all five abuse classes combined. They disagree when abuse is split across types.
const SCORE_CAPTION = 'All five abuse types combined'
const SPLIT_NOTE = "Abuse probability split across types — no single type outranks 'Not cyberbullying'."
const isSplit = (type, score) => type === 'not_cyberbullying' && score >= 0.5

const EXAMPLE_THREAD = `@user_a: you're literally the dumbest person in this school lmao
@target: please stop
@user_b: fr nobody likes you
@user_a: go cry to your mommy loser
@target: maybe you're all right. i'm tired of this
@target: i don't think i can keep doing this. what's the point anymore`

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
    <div style={{ minHeight: '100vh', padding: '100px 40px 80px', maxWidth: 1000, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <p style={{ fontSize: 12, color: 'var(--accent-cyan)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
          — Thread Analyzer
        </p>
        <h1 style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>
          Paste a Conversation
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 40 }}>
          Paste a message or a short thread. The model classifies it into one of six categories and shows which words drove the decision.
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
            placeholder="@attacker: paste tweets here...&#10;@target: their response..."
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
            {loading ? '⚡ Analyzing...' : '🔍 Analyze Thread →'}
          </button>
        </div>

        {/* Error state — shown instead of a result when the backend is unreachable */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="glass-card"
              style={{
                padding: 20, marginBottom: 20,
                border: '1px solid rgba(255,61,90,0.35)',
                background: 'rgba(255,61,90,0.06)',
                display: 'flex', alignItems: 'flex-start', gap: 14,
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1.2 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#ff3d5a', marginBottom: 6 }}>
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
              {/* Predicted category */}
              <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Most likely category · whole thread</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: result.bullying_type === 'not_cyberbullying' ? 'var(--text-secondary)' : '#ff3d5a' }}>
                  {CATEGORY_LABEL[result.bullying_type] ?? result.bullying_type}
                </div>
                {isSplit(result.bullying_type, result.bullying_score) && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{SPLIT_NOTE}</div>
                )}
              </div>

              {/* Score cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
                {[
                  { label: 'Bullying Score', value: result.bullying_score, color: '#ff3d5a', caption: SCORE_CAPTION,
                    note: result.models_used === 'keyword-fallback' ? 'Keyword fallback — trained model not loaded' : null },
                  { label: 'Distress Signal', value: result.depression_score, color: '#ffb347', note: KEYWORD_NOTE },
                  { label: 'Risk Index', value: result.causal_link, color: '#a855f7', note: KEYWORD_NOTE },
                ].map(s => (
                  <div key={s.label} className="stat-card">
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                    <div style={{ fontSize: 36, fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>
                      {Math.round(s.value * 100)}%
                    </div>
                    {s.caption && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.caption}</div>
                    )}
                    <div style={{ marginTop: 8, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${s.value * 100}%` }} transition={{ duration: 0.8 }}
                        style={{ height: '100%', background: s.color, borderRadius: 2 }} />
                    </div>
                    {s.note && (
                      <span className="risk-badge risk-medium" style={{ marginTop: 12 }}>{s.note}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Risk level */}
              <div className="glass-card" style={{ padding: 24, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: result.risk_level === 'HIGH' ? 'rgba(255,61,90,0.15)' : result.risk_level === 'LOW' ? 'rgba(0,255,157,0.1)' : 'rgba(255,179,71,0.15)',
                  border: `2px solid ${result.risk_level === 'HIGH' ? '#ff3d5a' : result.risk_level === 'LOW' ? 'rgba(0,255,157,0.25)' : '#ffb347'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24,
                  boxShadow: result.risk_level === 'HIGH' ? 'var(--glow-red)' : result.risk_level === 'LOW' ? 'none' : 'var(--glow-amber)',
                  color: 'var(--accent-green)',
                }}>
                  {result.risk_level === 'HIGH' ? '🚨' : result.risk_level === 'LOW' ? '✓' : '⚠️'}
                </div>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Overall Risk Level</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: result.risk_level === 'HIGH' ? '#ff3d5a' : result.risk_level === 'LOW' ? 'var(--accent-green)' : '#ffb347' }}>
                    {result.risk_level} RISK
                  </div>
                  <span className="risk-badge risk-medium" style={{ marginTop: 8 }}>Includes keyword distress heuristic</span>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: 14, color: 'var(--text-secondary)', maxWidth: 300 }}>
                  {result.bullying_type === 'keyword_fallback'
                    ? `Category unavailable — trained model not loaded (keyword score ${Math.round(result.bullying_score * 100)}%).`
                    : `Most likely: ${CATEGORY_LABEL[result.bullying_type] ?? result.bullying_type} (bullying score ${Math.round(result.bullying_score * 100)}%).`}
                  Inferred signals — not a clinical assessment.
                </div>
              </div>

              {/* Attribution — exact per-token contributions to the predicted category's logit */}
              <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: '#a855f7' }}>
                  Why this category · whole thread
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                  Contribution of each word or word pair to the predicted category. Exact for this model.
                </p>
                {result.attribution?.length ? (() => {
                  const maxAbs = Math.max(...result.attribution.map(a => Math.abs(a.weight)))
                  return result.attribution.map(({ token, weight }) => {
                    const pct = `${(Math.abs(weight) / maxAbs) * 100}%`
                    const positive = weight > 0
                    return (
                      <div key={token} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                        <div style={{ width: 140, fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>{token}</div>
                        <div style={{ flex: 1, display: 'flex', height: 6 }}>
                          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', background: 'rgba(255,255,255,0.05)', borderRadius: '3px 0 0 3px' }}>
                            {!positive && (
                              <motion.div initial={{ width: 0 }} animate={{ width: pct }} transition={{ duration: 0.7 }}
                                style={{ height: '100%', background: '#3d6080', borderRadius: '3px 0 0 3px' }} />
                            )}
                          </div>
                          <div style={{ width: 1, background: 'var(--text-muted)' }} />
                          <div style={{ flex: 1, display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '0 3px 3px 0' }}>
                            {positive && (
                              <motion.div initial={{ width: 0 }} animate={{ width: pct }} transition={{ duration: 0.7 }}
                                style={{ height: '100%', background: '#a855f7', borderRadius: '0 3px 3px 0' }} />
                            )}
                          </div>
                        </div>
                        <div style={{ width: 64, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: positive ? '#a855f7' : '#7aa3c8', textAlign: 'right' }}>
                          {positive ? '+' : '−'}{Math.abs(weight).toFixed(4)}
                        </div>
                      </div>
                    )
                  })
                })() : (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Attribution unavailable — trained model not loaded
                  </p>
                )}
                {result.attribution?.length > 0 && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                    Right of centre pushes toward {CATEGORY_LABEL[result.bullying_type] ?? result.bullying_type}; left pushes away.
                  </p>
                )}
              </div>

              {/* Per-line scores — each line scored independently (Stage-1). No connectors or
                  trend styling between rows: cross-message escalation is Stage-2, not built. */}
              {result.timeline?.length > 1 && (
                <div className="glass-card" style={{ padding: 24, marginTop: 20 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
                    Per-message scores · Stage-1
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                    Each line scored independently. Detecting escalation across messages is Stage-2, not yet built.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {result.timeline.map((row, i) => (
                      <div key={i} style={{
                        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(99,179,237,0.08)',
                        borderRadius: 10, padding: '12px 16px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <div style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)' }}>{row.text}</div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: row.bullying_type === 'not_cyberbullying' ? 'var(--text-secondary)' : '#ff3d5a' }}>
                              {CATEGORY_LABEL[row.bullying_type] ?? row.bullying_type}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Most likely category</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>
                              {Math.round(row.bullying_score * 100)}%
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{SCORE_CAPTION}</div>
                          </div>
                        </div>
                        {isSplit(row.bullying_type, row.bullying_score) && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{SPLIT_NOTE}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}