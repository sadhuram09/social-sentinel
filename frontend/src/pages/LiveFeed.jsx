import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWebSocket } from '../hooks/useWebSocket'

const TYPE_STYLE = {
  bullying:   { color: '#ff3d5a', bg: 'rgba(255,61,90,0.08)',   border: 'rgba(255,61,90,0.22)',   icon: '🔴', label: 'BULLYING'   },
  depression: { color: '#ffb347', bg: 'rgba(255,179,71,0.07)',  border: 'rgba(255,179,71,0.22)',  icon: '🟠', label: 'DEPRESSION' },
  neutral:    { color: '#3d6080', bg: 'rgba(61,96,128,0.06)',   border: 'rgba(61,96,128,0.15)',   icon: '⚪', label: 'NEUTRAL'    },
}

function ScoreBar({ value, color }) {
  return (
    <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden', marginTop: 6 }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value * 100}%` }}
        transition={{ duration: 0.5 }}
        style={{ height: '100%', background: color, borderRadius: 2 }}
      />
    </div>
  )
}

function TweetCard({ tweet }) {
  const [expanded, setExpanded] = useState(false)
  const s = TYPE_STYLE[tweet.type] || TYPE_STYLE.neutral

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0,   scale: 1    }}
      exit={{    opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.28 }}
      onClick={() => setExpanded(p => !p)}
      style={{
        background: s.bg, border: `1px solid ${s.border}`,
        borderRadius: 12, padding: '14px 18px',
        cursor: 'pointer', transition: 'border-color 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* Icon */}
        <span style={{ fontSize: 18, lineHeight: 1, marginTop: 2 }}>{s.icon}</span>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
            <span style={{
              fontSize: 13, fontWeight: 700, color: s.color,
              fontFamily: 'JetBrains Mono, monospace',
            }}>{tweet.user}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
              color: s.color, background: s.bg,
              border: `1px solid ${s.border}`,
              borderRadius: 4, padding: '2px 7px',
            }}>{s.label}</span>
            {tweet.bullying_type && tweet.bullying_type !== 'not_cyberbullying' && tweet.bullying_type !== 'keyword_fallback' && (
              <span style={{
                fontSize: 10, color: '#a855f7',
                border: '1px solid rgba(168,85,247,0.3)',
                borderRadius: 4, padding: '2px 7px',
              }}>{tweet.bullying_type}</span>
            )}
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {tweet.text}
          </p>

          {/* Score bars always visible */}
          <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Bullying</span>
                <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#ff3d5a' }}>
                  {Math.round(tweet.bullying_score * 100)}%
                </span>
              </div>
              <ScoreBar value={tweet.bullying_score} color="#ff3d5a" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Depression</span>
                <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#ffb347' }}>
                  {Math.round(tweet.depression_score * 100)}%
                </span>
              </div>
              <ScoreBar value={tweet.depression_score} color="#ffb347" />
            </div>
          </div>

          {/* Expanded SHAP */}
          <AnimatePresence>
            {expanded && tweet.shap && Object.keys(tweet.shap).length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ marginTop: 12, borderTop: '1px solid rgba(168,85,247,0.15)', paddingTop: 10 }}
              >
                <p style={{ fontSize: 10, color: '#a855f7', fontWeight: 600, letterSpacing: '0.08em', marginBottom: 8 }}>SHAP FEATURES</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.entries(tweet.shap).slice(0, 5).map(([feat, val]) => (
                    <span key={feat} style={{
                      fontSize: 11, color: '#d4a0ff',
                      background: 'rgba(168,85,247,0.1)',
                      border: '1px solid rgba(168,85,247,0.25)',
                      borderRadius: 5, padding: '2px 8px',
                    }}>
                      {feat} <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>+{val.toFixed(3)}</span>
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: score + time */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontSize: 22, fontWeight: 700, color: s.color,
            fontFamily: 'JetBrains Mono, monospace', lineHeight: 1,
          }}>
            {Math.round(tweet.score * 100)}%
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{tweet.time}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, opacity: 0.6 }}>
            {tweet.models_used}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function LiveFeed() {
  const { connected, tweets, stats, pause, resume } = useWebSocket()
  const [paused, setPaused] = useState(false)

  const togglePause = () => {
    if (paused) resume(); else pause()
    setPaused(p => !p)
  }

  const depressionRate = stats.total > 0
    ? Math.round((stats.depression / stats.total) * 100) : 0
  const bullyingRate = stats.total > 0
    ? Math.round((stats.bullying / stats.total) * 100) : 0

  return (
    <div style={{ minHeight: '100vh', padding: '90px 0 60px' }}>
      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 64, zIndex: 10,
        background: 'rgba(2,4,8,0.92)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(99,179,237,0.08)',
        padding: '16px 40px',
      }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          {/* Title + status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Live Feed</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: connected && !paused ? '#00ff9d' : '#ff3d5a',
                boxShadow: connected && !paused ? '0 0 8px #00ff9d' : '0 0 8px #ff3d5a',
              }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                {connected && !paused ? 'LIVE' : paused ? 'PAUSED' : 'CONNECTING...'}
              </span>
            </div>
          </div>

          {/* Live stat strip */}
          <div style={{ display: 'flex', gap: 24, flex: 1, justifyContent: 'center' }}>
            {[
              { label: 'Total',      value: stats.total,      color: '#00d4ff' },
              { label: 'Bullying',   value: `${bullyingRate}%`,   color: '#ff3d5a' },
              { label: 'Depression', value: `${depressionRate}%`, color: '#ffb347' },
              { label: 'Neutral',    value: stats.neutral,    color: '#3d6080' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Pause button */}
          <button onClick={togglePause} style={{
            padding: '8px 20px', borderRadius: 8,
            background: paused ? 'rgba(0,255,157,0.08)' : 'rgba(255,61,90,0.08)',
            border: `1px solid ${paused ? 'rgba(0,255,157,0.3)' : 'rgba(255,61,90,0.3)'}`,
            color: paused ? '#00ff9d' : '#ff3d5a',
            fontWeight: 600, fontSize: 13, cursor: 'pointer',
            fontFamily: 'Space Grotesk, sans-serif',
            transition: 'all 0.2s',
          }}>
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
        </div>
      </div>

      {/* Feed */}
      <div style={{ maxWidth: 860, margin: '24px auto 0', padding: '0 40px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {tweets.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
            <p style={{ fontSize: 15 }}>{connected ? 'Waiting for stream...' : 'Connecting to backend...'}</p>
            <p style={{ fontSize: 12, marginTop: 6 }}>Make sure Flask is running on port 5000</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {tweets.map(tweet => (
            <TweetCard key={tweet._key} tweet={tweet} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}