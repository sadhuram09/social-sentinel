import React, { useRef, useEffect, useState, useCallback } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import * as THREE from 'three'
import { motion } from 'framer-motion'

// ── mock data generator ────────────────────────────────────
const generateGraphData = () => {
  const nodes = []
  const links = []

  // Central bully nodes (red)
  const bullyNodes = [
    { id: 'b1', type: 'bully', label: '@troll_99',    severity: 0.91 },
    { id: 'b2', type: 'bully', label: '@hate_acc',    severity: 0.85 },
    { id: 'b3', type: 'bully', label: '@anon_737',    severity: 0.93 },
    { id: 'b4', type: 'bully', label: '@xtr3me_h8r',  severity: 0.88 },
  ]

  // Victim nodes (amber → orange based on depression score)
  const victimNodes = [
    { id: 'v1', type: 'victim', label: '@quiet_rose_',  depressionScore: 0.87 },
    { id: 'v2', type: 'victim', label: '@sad_user_x',   depressionScore: 0.74 },
    { id: 'v3', type: 'victim', label: '@dreamer_m',    depressionScore: 0.92 },
    { id: 'v4', type: 'victim', label: '@tired_soul',   depressionScore: 0.61 },
    { id: 'v5', type: 'victim', label: '@stargazer_k',  depressionScore: 0.79 },
    { id: 'v6', type: 'victim', label: '@moonchild_x',  depressionScore: 0.55 },
    { id: 'v7', type: 'victim', label: '@lost_soul_9',  depressionScore: 0.83 },
  ]

  // Bystander nodes (blue-grey)
  const bystanderNodes = Array.from({ length: 10 }, (_, i) => ({
    id: `by${i}`, type: 'bystander',
    label: `@user_${Math.random().toString(36).slice(2, 6)}`,
    depressionScore: Math.random() * 0.3,
  }))

  nodes.push(...bullyNodes, ...victimNodes, ...bystanderNodes)

  // Bullying links (bully → victim)
  const bullyLinks = [
    { source: 'b1', target: 'v1', type: 'bullying', strength: 0.91, tweets: 5 },
    { source: 'b1', target: 'v4', type: 'bullying', strength: 0.72, tweets: 3 },
    { source: 'b2', target: 'v2', type: 'bullying', strength: 0.85, tweets: 7 },
    { source: 'b2', target: 'v6', type: 'bullying', strength: 0.68, tweets: 2 },
    { source: 'b3', target: 'v3', type: 'bullying', strength: 0.93, tweets: 8 },
    { source: 'b3', target: 'v7', type: 'bullying', strength: 0.88, tweets: 6 },
    { source: 'b4', target: 'v5', type: 'bullying', strength: 0.79, tweets: 4 },
    { source: 'b4', target: 'v1', type: 'bullying', strength: 0.65, tweets: 2 },
  ]

  // Depression ripple links (victim → bystander — spread of depression)
  const rippleLinks = [
    { source: 'v1', target: 'by0', type: 'depression_ripple', strength: 0.45 },
    { source: 'v1', target: 'by1', type: 'depression_ripple', strength: 0.38 },
    { source: 'v2', target: 'by2', type: 'depression_ripple', strength: 0.32 },
    { source: 'v3', target: 'by3', type: 'depression_ripple', strength: 0.51 },
    { source: 'v3', target: 'by4', type: 'depression_ripple', strength: 0.44 },
    { source: 'v5', target: 'by5', type: 'depression_ripple', strength: 0.29 },
    { source: 'v7', target: 'by6', type: 'depression_ripple', strength: 0.48 },
    { source: 'v7', target: 'by7', type: 'depression_ripple', strength: 0.36 },
    { source: 'by0', target: 'by8', type: 'depression_ripple', strength: 0.21 },
    { source: 'by1', target: 'by9', type: 'depression_ripple', strength: 0.18 },
  ]

  links.push(...bullyLinks, ...rippleLinks)
  return { nodes, links }
}

// ── node color by type ─────────────────────────────────────
const nodeColor = (node) => {
  if (node.type === 'bully')      return `hsl(350, 90%, ${40 + node.severity * 20}%)`
  if (node.type === 'victim')     return `hsl(35,  90%, ${35 + node.depressionScore * 25}%)`
  if (node.type === 'bystander')  return '#1e3a5f'
  return '#7aa3c8'
}

const linkColor = (link) => {
  if (link.type === 'bullying')          return 'rgba(255,61,90,0.7)'
  if (link.type === 'depression_ripple') return 'rgba(255,179,71,0.45)'
  return 'rgba(99,179,237,0.3)'
}

const linkWidth = (link) => {
  if (link.type === 'bullying') return link.strength * 3
  return link.strength * 1.5
}

// ── main component ─────────────────────────────────────────
export default function NetworkGraph3D({ onNodeClick }) {
  const fgRef  = useRef()
  const [graphData]       = useState(generateGraphData)
  const [selectedNode, setSelectedNode]   = useState(null)
  const [hoveredNode, setHoveredNode]     = useState(null)
  const [dimensions, setDimensions]       = useState({ w: 800, h: 600 })
  const containerRef = useRef()

  // Responsive dimensions
  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setDimensions({ w: width, h: height })
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // Slow auto-rotate
  useEffect(() => {
    let angle = 0
    let animId
    const rotate = () => {
      if (fgRef.current && !selectedNode) {
        fgRef.current.cameraPosition({
          x: 300 * Math.sin(angle),
          z: 300 * Math.cos(angle),
        })
        angle += 0.003
      }
      animId = requestAnimationFrame(rotate)
    }
    animId = requestAnimationFrame(rotate)
    return () => cancelAnimationFrame(animId)
  }, [selectedNode])

  // Custom 3D node object
  const nodeThreeObject = useCallback((node) => {
    const group = new THREE.Group()

    // Core sphere
    const isSelected = selectedNode?.id === node.id
    const isHovered  = hoveredNode?.id  === node.id
    const size = node.type === 'bully' ? 6 : node.type === 'victim' ? 5 : 3.5
    const scale = isSelected ? 1.6 : isHovered ? 1.3 : 1

    const geo  = new THREE.SphereGeometry(size * scale, 16, 16)
    const color = new THREE.Color(nodeColor(node))
    const mat  = new THREE.MeshPhongMaterial({
      color,
      emissive: color,
      emissiveIntensity: isSelected ? 0.8 : isHovered ? 0.6 : 0.35,
      transparent: true,
      opacity: 0.95,
    })
    group.add(new THREE.Mesh(geo, mat))

    // Outer glow ring for bullies and victims
    if (node.type !== 'bystander') {
      const ringGeo = new THREE.RingGeometry(size * scale * 1.4, size * scale * 1.7, 32)
      const ringMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
      })
      group.add(new THREE.Mesh(ringGeo, ringMat))
    }

    // Pulsing outer shell for selected
    if (isSelected) {
      const pGeo = new THREE.SphereGeometry(size * 2.4, 16, 16)
      const pMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.1,
        wireframe: true,
      })
      group.add(new THREE.Mesh(pGeo, pMat))
    }

    // Sprite label
    const canvas  = document.createElement('canvas')
    canvas.width  = 256
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    ctx.fillStyle   = 'rgba(0,0,0,0)'
    ctx.fillRect(0, 0, 256, 64)
    ctx.font        = 'bold 22px Space Grotesk, sans-serif'
    ctx.fillStyle   = '#e8f4fd'
    ctx.textAlign   = 'center'
    ctx.fillText(node.label, 128, 40)

    const tex    = new THREE.CanvasTexture(canvas)
    const spMat  = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: isSelected || isHovered ? 1 : 0.6 })
    const sprite = new THREE.Sprite(spMat)
    sprite.scale.set(40, 10, 1)
    sprite.position.set(0, size * scale + 12, 0)
    group.add(sprite)

    return group
  }, [selectedNode, hoveredNode])

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(prev => prev?.id === node.id ? null : node)
    onNodeClick?.(node)
    // Zoom camera to node
    if (fgRef.current) {
      fgRef.current.cameraPosition(
        { x: node.x + 60, y: node.y + 30, z: node.z + 60 },
        node,
        1200,
      )
    }
  }, [onNodeClick])

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', minHeight: 600 }}>
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        width={dimensions.w}
        height={dimensions.h}
        backgroundColor="rgba(0,0,0,0)"
        nodeThreeObject={nodeThreeObject}
        nodeThreeObjectExtend={false}
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkOpacity={0.8}
        linkDirectionalArrowLength={link => link.type === 'bullying' ? 6 : 3}
        linkDirectionalArrowRelPos={1}
        linkDirectionalArrowColor={linkColor}
        linkDirectionalParticles={link => link.type === 'bullying' ? 4 : 2}
        linkDirectionalParticleSpeed={link => link.type === 'bullying' ? 0.008 : 0.004}
        linkDirectionalParticleWidth={link => link.type === 'bullying' ? 2.5 : 1.5}
        linkDirectionalParticleColor={linkColor}
        onNodeClick={handleNodeClick}
        onNodeHover={setHoveredNode}
        enableNavigationControls
        showNavInfo={false}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        cooldownTime={3000}
      />

      {/* Overlay legend */}
      <div style={{
        position: 'absolute', top: 20, left: 20,
        background: 'rgba(8,13,20,0.85)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(99,179,237,0.15)',
        borderRadius: 12, padding: '14px 18px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>
          Node Legend
        </p>
        {[
          { color: '#ff3d5a', label: 'Bully Account' },
          { color: '#ffb347', label: 'Victim (Depression)' },
          { color: '#1e3a5f', label: 'Bystander' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid rgba(99,179,237,0.1)', paddingTop: 10, marginTop: 2 }}>
          {[
            { color: 'rgba(255,61,90,0.8)',  label: 'Bullying Link' },
            { color: 'rgba(255,179,71,0.6)', label: 'Depression Ripple' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 22, height: 2, background: color, borderRadius: 1 }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Node detail panel */}
      {selectedNode && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'absolute', top: 20, right: 20,
            background: 'rgba(8,13,20,0.92)',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${selectedNode.type === 'bully' ? 'rgba(255,61,90,0.35)' : 'rgba(255,179,71,0.3)'}`,
            borderRadius: 14, padding: '20px 22px',
            minWidth: 240,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {selectedNode.type === 'bully' ? '🔴 Attacker' : selectedNode.type === 'victim' ? '🟠 Victim' : '⚪ Bystander'}
              </div>
              <div style={{
                fontSize: 16, fontWeight: 700,
                fontFamily: 'JetBrains Mono, monospace',
                color: nodeColor(selectedNode),
              }}>
                {selectedNode.label}
              </div>
            </div>
            <button onClick={() => setSelectedNode(null)} style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              fontSize: 18, cursor: 'pointer', lineHeight: 1,
            }}>×</button>
          </div>

          {selectedNode.type === 'bully' && (
            <div>
              <MetricRow label="Toxicity Score" value={`${Math.round(selectedNode.severity * 100)}%`} color="#ff3d5a" bar={selectedNode.severity} />
              <MetricRow label="Targets" value={graphData.links.filter(l => l.source?.id === selectedNode.id || l.source === selectedNode.id).length} color="#ff3d5a" />
            </div>
          )}

          {selectedNode.type === 'victim' && (
            <div>
              <MetricRow label="Depression Risk" value={`${Math.round(selectedNode.depressionScore * 100)}%`} color="#ffb347" bar={selectedNode.depressionScore} />
              <MetricRow label="Severity" value={selectedNode.depressionScore > 0.8 ? 'Critical' : selectedNode.depressionScore > 0.6 ? 'High' : 'Medium'} color="#ffb347" />
            </div>
          )}

          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>
            Click another node to compare · drag to orbit
          </p>
        </motion.div>
      )}

      {/* Controls hint */}
      <div style={{
        position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 20,
        background: 'rgba(8,13,20,0.75)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(99,179,237,0.1)',
        borderRadius: 100, padding: '8px 24px',
        fontSize: 11, color: 'var(--text-muted)',
      }}>
        <span>🖱 Drag to orbit</span>
        <span>🔍 Scroll to zoom</span>
        <span>👆 Click node for details</span>
      </div>
    </div>
  )
}

function MetricRow({ label, value, color, bar }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace' }}>{value}</span>
      </div>
      {bar !== undefined && (
        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${bar * 100}%` }}
            transition={{ duration: 0.7 }}
            style={{ height: '100%', background: color, borderRadius: 2 }}
          />
        </div>
      )}
    </div>
  )
}