import React, { useState } from 'react'
import { motion } from 'framer-motion'
import NetworkGraph3D from '../components/NetworkGraph3D'
import RippleEffect from '../components/RippleEffect'

export default function NetworkPage() {
  const [selectedNode, setSelectedNode] = useState(null)
  const [stats] = useState({
    totalNodes: 21,
    bullyNodes: 4,
    victimNodes: 7,
    links: 18,
    avgDepressionRisk: '74%',
  })

  return (
    <div style={{ minHeight: '100vh', padding: '80px 0 0', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '20px 40px 0', zIndex: 2 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p style={{ fontSize: 12, color: 'var(--accent-cyan)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
            — 3D Causal Network
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em' }}>
              Bullying → Depression Network
            </h1>
            {/* Mini stat strip */}
            <div style={{ display: 'flex', gap: 24 }}>
              {[
                { label: 'Attackers', value: stats.bullyNodes, color: '#ff3d5a' },
                { label: 'Victims',   value: stats.victimNodes, color: '#ffb347' },
                { label: 'Connections', value: stats.links,    color: '#a855f7' },
                { label: 'Avg Risk',  value: stats.avgDepressionRisk, color: '#00d4ff' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* 3D graph — full remaining height */}
      <div style={{
        flex: 1, position: 'relative',
        background: 'radial-gradient(ellipse at center, rgba(10,20,40,0.9) 0%, rgba(2,4,8,1) 80%)',
        margin: '20px 0 0',
        minHeight: 600,
      }}>
        {/* Ripple effects at bully positions */}
        <RippleEffect active centerX={25} centerY={40} color="#ff3d5a" />
        <RippleEffect active centerX={70} centerY={60} color="#ff3d5a" />
        <RippleEffect active centerX={50} centerY={30} color="#ffb347" />

        <NetworkGraph3D onNodeClick={setSelectedNode} />
      </div>

      {/* Bottom info bar */}
      {selectedNode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '16px 40px',
            background: 'rgba(8,13,20,0.95)',
            borderTop: '1px solid rgba(99,179,237,0.1)',
            display: 'flex', alignItems: 'center', gap: 20,
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Selected:</span>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700,
            color: selectedNode.type === 'bully' ? '#ff3d5a' : '#ffb347',
          }}>{selectedNode.label}</span>
          <span className={`risk-badge risk-${selectedNode.type === 'bully' ? 'high' : selectedNode.depressionScore > 0.7 ? 'high' : 'medium'}`}>
            {selectedNode.type}
          </span>
          {selectedNode.depressionScore && (
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Depression risk: <strong style={{ color: '#ffb347' }}>{Math.round(selectedNode.depressionScore * 100)}%</strong>
            </span>
          )}
        </motion.div>
      )}
    </div>
  )
}