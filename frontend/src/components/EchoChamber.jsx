import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { motion, AnimatePresence } from 'framer-motion'

// ── Echo chamber simulation data ──────────────────────────────
const buildEchoData = () => {
  const nodes = [
    // Origin bully post
    { id: 'origin', type: 'origin',  label: '@bully_origin', text: 'nobody wants you here go disappear', severity: 1.0, x: 0, y: 0 },
    // First wave amplifiers
    { id: 'a1', type: 'amplifier', label: '@troll_1',    text: 'LOL so true nobody likes them',          severity: 0.82, wave: 1 },
    { id: 'a2', type: 'amplifier', label: '@hate_acc2',  text: 'reposting this because facts',            severity: 0.78, wave: 1 },
    { id: 'a3', type: 'amplifier', label: '@anon_9912',  text: 'this person deserves it honestly',        severity: 0.75, wave: 1 },
    // Second wave — victims starting to show depression
    { id: 'v1', type: 'victim',    label: '@sad_user_1', text: 'why does everyone hate me',               severity: 0.71, wave: 2, depressionScore: 0.79 },
    { id: 'v2', type: 'victim',    label: '@quiet_x',   text: 'i should just leave social media forever', severity: 0.68, wave: 2, depressionScore: 0.84 },
    { id: 'v3', type: 'victim',    label: '@lost_7',    text: 'feeling so alone after seeing this',       severity: 0.65, wave: 2, depressionScore: 0.72 },
    { id: 'v4', type: 'victim',    label: '@broken_m',  text: 'maybe they are all right about me',        severity: 0.72, wave: 2, depressionScore: 0.91 },
    // Third wave — bystanders affected
    { id: 'b1', type: 'bystander', label: '@witness_1', text: 'this is making me feel really anxious',    severity: 0.41, wave: 3, depressionScore: 0.44 },
    { id: 'b2', type: 'bystander', label: '@viewer_2',  text: 'seeing this ruined my whole day',          severity: 0.38, wave: 3, depressionScore: 0.39 },
    { id: 'b3', type: 'bystander', label: '@reader_3',  text: 'why is twitter so toxic lately',           severity: 0.35, wave: 3, depressionScore: 0.36 },
    { id: 'b4', type: 'bystander', label: '@lurker_4',  text: 'scared to post anything anymore',          severity: 0.44, wave: 3, depressionScore: 0.48 },
    { id: 'b5', type: 'bystander', label: '@watcher_5', text: 'feeling depressed after scrolling',        severity: 0.40, wave: 3, depressionScore: 0.42 },
  ]

  const links = [
    // Origin → amplifiers
    { source: 'origin', target: 'a1', type: 'spread',    strength: 0.9 },
    { source: 'origin', target: 'a2', type: 'spread',    strength: 0.85 },
    { source: 'origin', target: 'a3', type: 'spread',    strength: 0.82 },
    // Amplifiers → victims
    { source: 'a1',     target: 'v1', type: 'bullying',  strength: 0.79 },
    { source: 'a1',     target: 'v2', type: 'bullying',  strength: 0.72 },
    { source: 'a2',     target: 'v3', type: 'bullying',  strength: 0.68 },
    { source: 'a2',     target: 'v4', type: 'bullying',  strength: 0.75 },
    { source: 'a3',     target: 'v1', type: 'bullying',  strength: 0.65 },
    // Victims → bystanders (depression ripple)
    { source: 'v1',     target: 'b1', type: 'ripple',    strength: 0.44 },
    { source: 'v2',     target: 'b2', type: 'ripple',    strength: 0.41 },
    { source: 'v2',     target: 'b3', type: 'ripple',    strength: 0.38 },
    { source: 'v3',     target: 'b4', type: 'ripple',    strength: 0.46 },
    { source: 'v4',     target: 'b5', type: 'ripple',    strength: 0.43 },
    // Cross-amplifier links (echo chamber loops)
    { source: 'a1',     target: 'a2', type: 'echo',      strength: 0.6  },
    { source: 'a2',     target: 'a3', type: 'echo',      strength: 0.55 },
    { source: 'a3',     target: 'a1', type: 'echo',      strength: 0.58 },
  ]

  return { nodes, links }
}

const NODE_CONFIG = {
  origin:    { color: '#ff1744', size: 28, glow: 'rgba(255,23,68,0.6)',   ring: '#ff6b6b' },
  amplifier: { color: '#ff3d5a', size: 18, glow: 'rgba(255,61,90,0.4)',   ring: '#ff8a8a' },
  victim:    { color: '#ffb347', size: 16, glow: 'rgba(255,179,71,0.4)',  ring: '#ffd080' },
  bystander: { color: '#7aa3c8', size: 12, glow: 'rgba(122,163,200,0.3)', ring: '#9dc0e0' },
}

const LINK_CONFIG = {
  spread:   { color: '#ff3d5a', width: 2.5, dash: null,    opacity: 0.7 },
  bullying: { color: '#ff783c', width: 2,   dash: null,    opacity: 0.65 },
  ripple:   { color: '#ffb347', width: 1.5, dash: '6,4',   opacity: 0.5 },
  echo:     { color: '#a855f7', width: 1,   dash: '3,6',   opacity: 0.4 },
}

export default function EchoChamber({ onNodeSelect }) {
  const svgRef      = useRef()
  const simRef      = useRef()
  const wrapRef     = useRef()
  const [selected, setSelected]     = useState(null)
  const [hovered,  setHovered]      = useState(null)
  const [playing,  setPlaying]      = useState(false)
  const [waveStep, setWaveStep]     = useState(0)   // 0=all, 1,2,3 = progressive reveal
  const [dims,     setDims]         = useState({ w: 900, h: 580 })
  const graphData = buildEchoData()

  // Responsive
  useEffect(() => {
    const obs = new ResizeObserver(e => {
      const { width, height } = e[0].contentRect
      setDims({ w: Math.max(width, 400), h: Math.max(height, 450) })
    })
    if (wrapRef.current) obs.observe(wrapRef.current)
    return () => obs.disconnect()
  }, [])

  // Auto-play wave animation
  useEffect(() => {
    if (!playing) return
    setWaveStep(0)
    const timers = [
      setTimeout(() => setWaveStep(1), 400),
      setTimeout(() => setWaveStep(2), 1400),
      setTimeout(() => setWaveStep(3), 2600),
      setTimeout(() => { setWaveStep(4); setPlaying(false) }, 3800),
    ]
    return () => timers.forEach(clearTimeout)
  }, [playing])

  // Visible nodes/links based on wave step
  const visibleNodes = waveStep === 0
    ? graphData.nodes
    : graphData.nodes.filter(n =>
        n.id === 'origin' ||
        (waveStep >= 1 && n.wave === 1) ||
        (waveStep >= 2 && n.wave === 2) ||
        (waveStep >= 3 && n.wave === 3)
      )

  const visibleNodeIds = new Set(visibleNodes.map(n => n.id))
  const visibleLinks = graphData.links.filter(
    l => visibleNodeIds.has(l.source?.id ?? l.source) &&
         visibleNodeIds.has(l.target?.id ?? l.target)
  )

  // D3 force simulation
  useEffect(() => {
    const { w, h } = dims
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const defs = svg.append('defs')

    // Glow filters
    Object.entries(NODE_CONFIG).forEach(([type, cfg]) => {
      const f = defs.append('filter').attr('id', `glow-${type}`)
      f.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur')
      const merge = f.append('feMerge')
      merge.append('feMergeNode').attr('in', 'blur')
      merge.append('feMergeNode').attr('in', 'SourceGraphic')
    })

    // Arrow markers
    Object.entries(LINK_CONFIG).forEach(([type, cfg]) => {
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -4 8 8')
        .attr('refX', 14).attr('refY', 0)
        .attr('markerWidth', 5).attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-4L8,0L0,4')
        .attr('fill', cfg.color)
        .attr('opacity', cfg.opacity)
    })

    // Clone nodes/links so d3 can mutate positions
    const nodes = visibleNodes.map(n => ({ ...n }))
    const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]))
    const links = visibleLinks.map(l => ({
      ...l,
      source: nodeMap[l.source?.id ?? l.source],
      target: nodeMap[l.target?.id ?? l.target],
    })).filter(l => l.source && l.target)

    // Force layout
    const sim = d3.forceSimulation(nodes)
      .force('link',   d3.forceLink(links).id(d => d.id).distance(d => {
        if (d.type === 'echo') return 90
        if (d.type === 'ripple') return 110
        return 130
      }).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-280))
      .force('center', d3.forceCenter(w / 2, h / 2))
      .force('collision', d3.forceCollide(d => NODE_CONFIG[d.type].size * 1.6))

    simRef.current = sim

    // ── Links ──────────────────────────────────────────────
    const linkGroup = svg.append('g').attr('class', 'links')
    const linkEl = linkGroup.selectAll('line')
      .data(links).enter().append('line')
      .attr('stroke', d => LINK_CONFIG[d.type]?.color ?? '#ffffff')
      .attr('stroke-width', d => LINK_CONFIG[d.type]?.width ?? 1)
      .attr('stroke-dasharray', d => LINK_CONFIG[d.type]?.dash ?? null)
      .attr('stroke-opacity', d => LINK_CONFIG[d.type]?.opacity ?? 0.5)
      .attr('marker-end', d => `url(#arrow-${d.type})`)

    // Animated dash for echo links
    linkEl.filter(d => d.type === 'echo')
      .style('animation', 'dash-move 2s linear infinite')

    // ── Nodes ──────────────────────────────────────────────
    const nodeGroup = svg.append('g').attr('class', 'nodes')
    const nodeEl = nodeGroup.selectAll('g')
      .data(nodes).enter().append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (event, d) => { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
        .on('drag',  (event, d) => { d.fx = event.x; d.fy = event.y })
        .on('end',   (event, d) => { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null })
      )
      .on('click', (event, d) => {
        event.stopPropagation()
        setSelected(prev => prev?.id === d.id ? null : d)
        onNodeSelect?.(d)
      })
      .on('mouseenter', (_, d) => setHovered(d))
      .on('mouseleave', ()    => setHovered(null))

    // Outer glow ring
    nodeEl.append('circle')
      .attr('r', d => NODE_CONFIG[d.type].size * 1.6)
      .attr('fill', 'none')
      .attr('stroke', d => NODE_CONFIG[d.type].ring)
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.25)

    // Main circle
    nodeEl.append('circle')
      .attr('r', d => NODE_CONFIG[d.type].size)
      .attr('fill', d => NODE_CONFIG[d.type].color)
      .attr('fill-opacity', 0.9)
      .attr('filter', d => `url(#glow-${d.type})`)

    // Origin star shape (special)
    nodeEl.filter(d => d.type === 'origin')
      .append('text')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('font-size', 14).attr('fill', '#fff').attr('pointer-events', 'none')
      .text('⚡')

    // Label
    nodeEl.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', d => NODE_CONFIG[d.type].size + 14)
      .attr('font-size', d => d.type === 'origin' ? 12 : 10)
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('fill', d => NODE_CONFIG[d.type].color)
      .attr('fill-opacity', 0.85)
      .attr('pointer-events', 'none')
      .text(d => d.label)

    // Depression score ring for victims
    nodeEl.filter(d => d.depressionScore)
      .append('circle')
      .attr('r', d => NODE_CONFIG[d.type].size + 5)
      .attr('fill', 'none')
      .attr('stroke', '#ffb347')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', d => d.depressionScore)
      .attr('stroke-dasharray', d => {
        const circ = 2 * Math.PI * (NODE_CONFIG[d.type].size + 5)
        return `${circ * d.depressionScore} ${circ * (1 - d.depressionScore)}`
      })

    // Tick
    sim.on('tick', () => {
      linkEl
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
      nodeEl.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    // Click background to deselect
    svg.on('click', () => setSelected(null))

    return () => sim.stop()
  }, [dims, waveStep])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Controls bar */}
      <div style={{
        position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 10, zIndex: 10,
        background: 'rgba(8,13,20,0.85)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(99,179,237,0.12)',
        borderRadius: 100, padding: '8px 20px',
      }}>
        <button
          onClick={() => { setPlaying(true) }}
          disabled={playing}
          style={{
            padding: '6px 18px', borderRadius: 100,
            background: playing ? 'rgba(0,212,255,0.06)' : 'rgba(0,212,255,0.12)',
            border: '1px solid rgba(0,212,255,0.3)',
            color: '#00d4ff', fontWeight: 600, fontSize: 12,
            cursor: playing ? 'not-allowed' : 'pointer',
            fontFamily: 'Space Grotesk, sans-serif',
            opacity: playing ? 0.6 : 1,
          }}
        >
          {playing ? '⏳ Propagating...' : '▶ Replay Spread'}
        </button>

        <button
          onClick={() => { setWaveStep(0); setPlaying(false) }}
          style={{
            padding: '6px 18px', borderRadius: 100,
            background: 'rgba(168,85,247,0.08)',
            border: '1px solid rgba(168,85,247,0.25)',
            color: '#a855f7', fontWeight: 600, fontSize: 12,
            cursor: 'pointer', fontFamily: 'Space Grotesk, sans-serif',
          }}
        >
          ↺ Reset
        </button>

        {/* Wave indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 8, borderLeft: '1px solid rgba(99,179,237,0.15)' }}>
          {['Origin', 'Wave 1', 'Wave 2', 'Wave 3'].map((w, i) => (
            <div key={w} style={{
              fontSize: 10, fontWeight: 600,
              padding: '3px 10px', borderRadius: 100,
              background: waveStep >= i
                ? i === 0 ? 'rgba(255,23,68,0.2)' : i === 1 ? 'rgba(255,61,90,0.15)' : i === 2 ? 'rgba(255,179,71,0.12)' : 'rgba(122,163,200,0.1)'
                : 'transparent',
              color: waveStep >= i
                ? i === 0 ? '#ff1744' : i === 1 ? '#ff3d5a' : i === 2 ? '#ffb347' : '#7aa3c8'
                : 'var(--text-muted)',
              border: `1px solid ${waveStep >= i ? 'currentColor' : 'transparent'}`,
              transition: 'all 0.3s',
            }}>
              {w}
            </div>
          ))}
        </div>
      </div>

      {/* SVG canvas */}
      <div ref={wrapRef} style={{ width: '100%', height: '100%' }}>
        <svg
          ref={svgRef}
          width={dims.w}
          height={dims.h}
          style={{ background: 'transparent', display: 'block' }}
        >
          <style>{`
            @keyframes dash-move {
              to { stroke-dashoffset: -20; }
            }
            line { stroke-dashoffset: 0; }
          `}</style>
        </svg>
      </div>

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16,
        background: 'rgba(8,13,20,0.85)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(99,179,237,0.12)',
        borderRadius: 10, padding: '12px 16px',
      }}>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Node Types</p>
        {[
          { color: '#ff1744', label: '⚡ Origin Bully Post' },
          { color: '#ff3d5a', label: 'Amplifier (Resharer)' },
          { color: '#ffb347', label: 'Victim (Depression)' },
          { color: '#7aa3c8', label: 'Bystander (Affected)' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid rgba(99,179,237,0.1)', paddingTop: 8, marginTop: 4 }}>
          {[
            { color: '#ff3d5a', dash: false, label: 'Spread / Bullying' },
            { color: '#a855f7', dash: true,  label: 'Echo Loop'         },
            { color: '#ffb347', dash: true,  label: 'Depression Ripple' },
          ].map(({ color, dash, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <svg width={22} height={4}>
                <line x1={0} y1={2} x2={22} y2={2}
                  stroke={color} strokeWidth={1.5}
                  strokeDasharray={dash ? '4,3' : null}
                />
              </svg>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Node detail panel */}
      <AnimatePresence>
        {(selected || hovered) && (() => {
          const node = selected || hovered
          const cfg  = NODE_CONFIG[node.type]
          return (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{    opacity: 0, scale: 0.95, y: 10 }}
              style={{
                position: 'absolute', bottom: 16, right: 16,
                background: 'rgba(8,13,20,0.94)',
                backdropFilter: 'blur(16px)',
                border: `1px solid ${cfg.color}40`,
                borderRadius: 14, padding: '18px 20px',
                minWidth: 260, maxWidth: 300,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    {node.type}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: cfg.color, fontFamily: 'JetBrains Mono, monospace' }}>
                    {node.label}
                  </div>
                </div>
                {node.depressionScore && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Depression</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#ffb347', fontFamily: 'JetBrains Mono, monospace' }}>
                      {Math.round(node.depressionScore * 100)}%
                    </div>
                  </div>
                )}
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8, padding: '10px 12px', marginBottom: 12,
              }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, fontStyle: 'italic' }}>
                  "{node.text}"
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Severity</div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                    <div style={{ width: `${node.severity * 100}%`, height: '100%', background: cfg.color, borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: 11, color: cfg.color, fontFamily: 'JetBrains Mono, monospace', marginTop: 3 }}>
                    {Math.round(node.severity * 100)}%
                  </div>
                </div>
                {node.wave && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Spread Wave</div>
                    <div style={{
                      fontSize: 18, fontWeight: 700,
                      color: node.wave === 1 ? '#ff3d5a' : node.wave === 2 ? '#ffb347' : '#7aa3c8',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}>W{node.wave}</div>
                  </div>
                )}
              </div>
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}