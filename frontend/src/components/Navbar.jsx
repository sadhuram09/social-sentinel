import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navLinks = [
    { path: '/',        label: 'Overview'   },
    { path: '/network', label: '3D Network' },
    { path: '/globe',   label: '🌍 Globe'   },
    { path: '/echo',    label: '📡 Echo'    },  // ← ADD
    { path: '/analyze', label: 'Analyze'    },
    { path: '/live',    label: 'Live Feed'  },
  ]

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      zIndex: 500,
      padding: '0 40px',
      height: '64px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: scrolled ? 'rgba(2,4,8,0.92)' : 'transparent',
      backdropFilter: scrolled ? 'blur(20px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(99,179,237,0.1)' : '1px solid transparent',
      transition: 'all 0.4s ease',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 32, height: 32,
          background: 'linear-gradient(135deg, #ff3d5a, #a855f7)',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
          boxShadow: '0 0 20px rgba(168,85,247,0.4)',
        }}>⚡</div>
        <span style={{
          fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #e8f4fd, #7aa3c8)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          SocialSentinel
        </span>
        <span style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
          color: '#ff3d5a', border: '1px solid rgba(255,61,90,0.4)',
          padding: '2px 8px', borderRadius: 4,
          fontFamily: 'JetBrains Mono, monospace',
        }}>BETA</span>
      </div>

      {/* Links */}
      <div style={{ display: 'flex', gap: 4 }}>
        {navLinks.map(({ path, label }) => (
          <Link key={path} to={path} style={{
            padding: '8px 20px',
            borderRadius: 8,
            fontSize: 14, fontWeight: 500,
            textDecoration: 'none',
            color: location.pathname === path ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            background: location.pathname === path ? 'rgba(0,212,255,0.08)' : 'transparent',
            border: location.pathname === path ? '1px solid rgba(0,212,255,0.2)' : '1px solid transparent',
            transition: 'all 0.2s ease',
          }}>
            {label}
          </Link>
        ))}
      </div>

      {/* Status indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#00ff9d',
          boxShadow: '0 0 10px #00ff9d',
          animation: 'glow-pulse 2s infinite',
        }} />
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
          LIVE
        </span>
      </div>
    </nav>
  )
}