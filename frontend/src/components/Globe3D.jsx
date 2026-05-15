import React, {
    useRef, useEffect, useState, useCallback, useMemo
  } from 'react'
  import Globe from 'react-globe.gl'
  import { motion, AnimatePresence } from 'framer-motion'
  
  // ── Geo data — realistic hotspots based on social media usage ──
  const HOTSPOTS = [
    { lat: 40.71,  lng: -74.00, city: 'New York',      country: 'USA',        bullyCount: 342, depCount: 187, severity: 0.91 },
    { lat: 51.51,  lng: -0.13,  city: 'London',        country: 'UK',         bullyCount: 289, depCount: 156, severity: 0.85 },
    { lat: 35.68,  lng: 139.69, city: 'Tokyo',         country: 'Japan',      bullyCount: 201, depCount: 134, severity: 0.78 },
    { lat: 48.86,  lng: 2.35,   city: 'Paris',         country: 'France',     bullyCount: 178, depCount: 98,  severity: 0.72 },
    { lat: -33.87, lng: 151.21, city: 'Sydney',        country: 'Australia',  bullyCount: 156, depCount: 89,  severity: 0.69 },
    { lat: 19.43,  lng: -99.13, city: 'Mexico City',   country: 'Mexico',     bullyCount: 234, depCount: 143, severity: 0.82 },
    { lat: 28.61,  lng: 77.21,  city: 'New Delhi',     country: 'India',      bullyCount: 312, depCount: 201, severity: 0.88 },
    { lat: -23.55, lng: -46.63, city: 'São Paulo',     country: 'Brazil',     bullyCount: 267, depCount: 167, severity: 0.86 },
    { lat: 55.75,  lng: 37.62,  city: 'Moscow',        country: 'Russia',     bullyCount: 145, depCount: 78,  severity: 0.67 },
    { lat: 31.23,  lng: 121.47, city: 'Shanghai',      country: 'China',      bullyCount: 189, depCount: 112, severity: 0.74 },
    { lat: 37.57,  lng: 126.98, city: 'Seoul',         country: 'S. Korea',   bullyCount: 223, depCount: 158, severity: 0.83 },
    { lat: 52.52,  lng: 13.40,  city: 'Berlin',        country: 'Germany',    bullyCount: 134, depCount: 71,  severity: 0.64 },
    { lat: 41.90,  lng: 12.50,  city: 'Rome',          country: 'Italy',      bullyCount: 112, depCount: 58,  severity: 0.61 },
    { lat: 34.05,  lng: -118.24,city: 'Los Angeles',   country: 'USA',        bullyCount: 298, depCount: 189, severity: 0.89 },
    { lat: 43.65,  lng: -79.38, city: 'Toronto',       country: 'Canada',     bullyCount: 167, depCount: 94,  severity: 0.73 },
    { lat: 1.35,   lng: 103.82, city: 'Singapore',     country: 'Singapore',  bullyCount: 98,  depCount: 54,  severity: 0.58 },
    { lat: 6.52,   lng: 3.38,   city: 'Lagos',         country: 'Nigeria',    bullyCount: 176, depCount: 108, severity: 0.76 },
    { lat: 30.04,  lng: 31.24,  city: 'Cairo',         country: 'Egypt',      bullyCount: 143, depCount: 87,  severity: 0.71 },
    { lat: -34.61, lng: -58.38, city: 'Buenos Aires',  country: 'Argentina',  bullyCount: 134, depCount: 79,  severity: 0.68 },
    { lat: 59.33,  lng: 18.07,  city: 'Stockholm',     country: 'Sweden',     bullyCount: 89,  depCount: 51,  severity: 0.59 },
  ]
  
  // ── Causal arcs (bullying origin → victim location) ───────────
  const ARCS = [
    { startLat: 40.71, startLng: -74.00, endLat: 51.51,  endLng: -0.13,  severity: 0.91, label: 'NYC → London' },
    { startLat: 34.05, startLng: -118.24,endLat: 28.61,  endLng: 77.21,  severity: 0.88, label: 'LA → Delhi'   },
    { startLat: 19.43, startLng: -99.13, endLat: -23.55, endLng: -46.63, severity: 0.85, label: 'CDMX → São Paulo' },
    { startLat: 37.57, startLng: 126.98, endLat: 35.68,  endLng: 139.69, severity: 0.83, label: 'Seoul → Tokyo' },
    { startLat: 48.86, startLng: 2.35,   endLat: 52.52,  endLng: 13.40,  severity: 0.72, label: 'Paris → Berlin'},
    { startLat: 40.71, startLng: -74.00, endLat: 34.05,  endLng: -118.24,severity: 0.89, label: 'NYC → LA'      },
    { startLat: -33.87,startLng: 151.21, endLat: 1.35,   endLng: 103.82, severity: 0.68, label: 'Sydney → SG'   },
    { startLat: 31.23, startLng: 121.47, endLat: 37.57,  endLng: 126.98, severity: 0.74, label: 'Shanghai → Seoul'},
    { startLat: 28.61, startLng: 77.21,  endLat: 6.52,   endLng: 3.38,   severity: 0.76, label: 'Delhi → Lagos' },
    { startLat: 55.75, startLng: 37.62,  endLat: 59.33,  endLng: 18.07,  severity: 0.64, label: 'Moscow → Stockholm'},
  ]
  
  // ── colour helpers ─────────────────────────────────────────────
  const severityToColor = (s, alpha = 1) => {
    if (s > 0.85) return `rgba(255,61,90,${alpha})`
    if (s > 0.70) return `rgba(255,120,60,${alpha})`
    if (s > 0.55) return `rgba(255,179,71,${alpha})`
    return `rgba(99,179,237,${alpha})`
  }
  
  export default function Globe3D({ onHotspotClick }) {
    const globeRef  = useRef()
    const wrapRef   = useRef()
    const [size, setSize]             = useState({ w: 800, h: 700 })
    const [hovered, setHovered]       = useState(null)
    const [selected, setSelected]     = useState(null)
    const [liveEvents, setLiveEvents] = useState([])
    const tickRef = useRef(0)
  
    // Responsive
    useEffect(() => {
      const obs = new ResizeObserver(e => {
        const { width, height } = e[0].contentRect
        setSize({ w: width, h: Math.max(height, 500) })
      })
      if (wrapRef.current) obs.observe(wrapRef.current)
      return () => obs.disconnect()
    }, [])
  
    // Globe initial camera + auto-rotate
    useEffect(() => {
      if (!globeRef.current) return
      globeRef.current.pointOfView({ lat: 20, lng: 10, altitude: 2.2 }, 0)
      globeRef.current.controls().autoRotate      = true
      globeRef.current.controls().autoRotateSpeed = 0.4
      globeRef.current.controls().enableZoom      = true
      globeRef.current.controls().minDistance     = 150
      globeRef.current.controls().maxDistance     = 600
    }, [])
  
    // Live event ticker — simulate new causal chain events
    useEffect(() => {
      const iv = setInterval(() => {
        const hs = HOTSPOTS[Math.floor(Math.random() * HOTSPOTS.length)]
        const ev = {
          id:       Date.now(),
          city:     hs.city,
          country:  hs.country,
          severity: +(Math.random() * 0.4 + 0.6).toFixed(2),
          type:     Math.random() > 0.45 ? 'bullying' : 'depression',
          time:     'now',
        }
        setLiveEvents(prev => [ev, ...prev.slice(0, 7)])
        tickRef.current++
      }, 2800)
      return () => clearInterval(iv)
    }, [])
  
    // Ring pulse data — one ring per hotspot
    const rings = useMemo(() => HOTSPOTS.map(h => ({
      lat: h.lat, lng: h.lng,
      maxR:       h.severity * 4 + 1,
      propagationSpeed: 1.5,
      repeatPeriod:     800 + Math.random() * 400,
      color:      severityToColor(h.severity, 0.7),
    })), [])
  
    const handleHotspotHover = useCallback((pt) => {
      setHovered(pt)
      if (globeRef.current) {
        globeRef.current.controls().autoRotate = !pt
      }
    }, [])
  
    const handleHotspotClick = useCallback((pt) => {
      setSelected(prev => prev?.city === pt?.city ? null : pt)
      onHotspotClick?.(pt)
      if (globeRef.current && pt) {
        globeRef.current.pointOfView(
          { lat: pt.lat, lng: pt.lng, altitude: 1.2 }, 900
        )
      }
    }, [onHotspotClick])
  
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div ref={wrapRef} style={{ width: '100%', height: '100%', minHeight: 600 }}>
          <Globe
            ref={globeRef}
            width={size.w}
            height={size.h}
  
            // ── Globe appearance ──────────────────────────────
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
            backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
            atmosphereColor="rgba(30,80,160,0.6)"
            atmosphereAltitude={0.18}
  
            // ── Hotspot points ────────────────────────────────
            pointsData={HOTSPOTS}
            pointLat="lat"
            pointLng="lng"
            pointAltitude={d => d.severity * 0.06}
            pointRadius={d => {
              const base = 0.4 + d.severity * 0.6
              if (selected?.city === d.city) return base * 1.8
              if (hovered?.city  === d.city) return base * 1.4
              return base
            }}
            pointColor={d => severityToColor(d.severity, selected?.city === d.city ? 1 : 0.85)}
            pointLabel={d => `
              <div style="
                background:rgba(8,13,20,0.92);
                border:1px solid rgba(255,61,90,0.3);
                border-radius:10px;padding:10px 14px;
                font-family:Space Grotesk,sans-serif;
                min-width:160px;
              ">
                <div style="font-weight:700;font-size:14px;color:#e8f4fd">${d.city}, ${d.country}</div>
                <div style="font-size:12px;color:#ff3d5a;margin-top:4px">🔴 Bullying: ${d.bullyCount}</div>
                <div style="font-size:12px;color:#ffb347">🟠 Depression: ${d.depCount}</div>
                <div style="font-size:11px;color:#7aa3c8;margin-top:4px">
                  Severity: ${Math.round(d.severity * 100)}%
                </div>
              </div>
            `}
            onPointHover={handleHotspotHover}
            onPointClick={handleHotspotClick}
  
            // ── Pulse rings ───────────────────────────────────
            ringsData={rings}
            ringLat="lat"
            ringLng="lng"
            ringMaxRadius="maxR"
            ringPropagationSpeed="propagationSpeed"
            ringRepeatPeriod="repeatPeriod"
            ringColor={d => t => {
              const c = d.color.replace(/[\d.]+\)$/, `${1 - t})`)
              return c
            }}
            ringAltitude={0.005}
  
            // ── Causal arcs ───────────────────────────────────
            arcsData={ARCS}
            arcStartLat="startLat"
            arcStartLng="startLng"
            arcEndLat="endLat"
            arcEndLng="endLng"
            arcAltitude={d => 0.15 + d.severity * 0.25}
            arcColor={d => [
              severityToColor(d.severity, 0.9),
              severityToColor(d.severity * 0.6, 0.2),
            ]}
            arcStroke={d => d.severity * 1.5}
            arcDashLength={0.4}
            arcDashGap={0.2}
            arcDashAnimateTime={2200}
            arcLabel={d => `
              <div style="
                background:rgba(8,13,20,0.9);
                border:1px solid rgba(255,179,71,0.3);
                border-radius:8px;padding:8px 12px;
                font-family:Space Grotesk,sans-serif;font-size:12px;color:#ffb347
              ">⚡ Causal Chain: ${d.label}</div>
            `}
  
            // ── Hex polygons — heat layer ─────────────────────
            hexBinPointsData={HOTSPOTS.flatMap(h =>
              Array.from({ length: Math.round(h.bullyCount / 40) }, () => ({
                lat: h.lat + (Math.random() - 0.5) * 8,
                lng: h.lng + (Math.random() - 0.5) * 8,
                weight: h.severity,
              }))
            )}
            hexBinPointLat="lat"
            hexBinPointLng="lng"
            hexBinPointWeight="weight"
            hexBinResolution={4}
            hexTopColor={d => severityToColor(d.sumWeight / d.points.length, 0.7)}
            hexSideColor={d => severityToColor(d.sumWeight / d.points.length, 0.3)}
            hexAltitude={d => (d.sumWeight / d.points.length) * 0.04}
            hexBinMerge={true}
          />
        </div>
  
        {/* ── Legend ─────────────────────────────────────────── */}
        <div style={{
          position: 'absolute', top: 20, left: 20,
          background: 'rgba(8,13,20,0.88)',
          backdropFilter: 'blur(14px)',
          border: '1px solid rgba(99,179,237,0.15)',
          borderRadius: 12, padding: '14px 18px',
          minWidth: 190,
        }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            Risk Scale
          </p>
          {[
            { color: '#ff3d5a', label: 'Critical (>85%)' },
            { color: '#ff783c', label: 'High (70–85%)'   },
            { color: '#ffb347', label: 'Medium (55–70%)' },
            { color: '#63b3ed', label: 'Low (<55%)'      },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid rgba(99,179,237,0.1)', paddingTop: 10, marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 22, height: 2, background: 'linear-gradient(90deg,#ff3d5a,rgba(255,61,90,0.2))', borderRadius: 1 }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Causal Arc</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(255,61,90,0.3)', border: '1px solid rgba(255,61,90,0.5)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Heat Hexagon</span>
            </div>
          </div>
        </div>
  
        {/* ── Live event ticker ──────────────────────────────── */}
        <div style={{
          position: 'absolute', top: 20, right: 20,
          background: 'rgba(8,13,20,0.88)',
          backdropFilter: 'blur(14px)',
          border: '1px solid rgba(99,179,237,0.12)',
          borderRadius: 12, padding: '14px 16px',
          width: 240,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff9d', boxShadow: '0 0 6px #00ff9d' }} />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Live Events
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <AnimatePresence initial={false}>
              {liveEvents.map(ev => (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    background: ev.type === 'bullying' ? 'rgba(255,61,90,0.08)' : 'rgba(255,179,71,0.07)',
                    border: `1px solid ${ev.type === 'bullying' ? 'rgba(255,61,90,0.2)' : 'rgba(255,179,71,0.2)'}`,
                    borderRadius: 8, padding: '8px 10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: ev.type === 'bullying' ? '#ff3d5a' : '#ffb347' }}>
                      {ev.city}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {Math.round(ev.severity * 100)}%
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {ev.type === 'bullying' ? '🔴' : '🟠'} {ev.type} detected
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {liveEvents.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
                Waiting for events...
              </p>
            )}
          </div>
        </div>
  
        {/* ── Selected city detail panel ─────────────────────── */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              style={{
                position: 'absolute', bottom: 30,
                left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(8,13,20,0.94)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,61,90,0.25)',
                borderRadius: 16, padding: '20px 28px',
                minWidth: 400, display: 'flex', gap: 32,
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Selected Location
                </div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{selected.city}</div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{selected.country}</div>
              </div>
  
              <div style={{ display: 'flex', gap: 24 }}>
                {[
                  { label: 'Bullying Cases',  value: selected.bullyCount, color: '#ff3d5a' },
                  { label: 'Depression Signals', value: selected.depCount, color: '#ffb347' },
                  { label: 'Severity',        value: `${Math.round(selected.severity * 100)}%`, color: '#a855f7' },
                  { label: 'Causal Rate',     value: `${Math.round((selected.depCount / selected.bullyCount) * 100)}%`, color: '#00d4ff' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>
                      {s.value}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{s.label}</div>
                  </div>
                ))}
              </div>
  
              <button
                onClick={() => setSelected(null)}
                style={{
                  position: 'absolute', top: 12, right: 14,
                  background: 'none', border: 'none',
                  color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer', lineHeight: 1,
                }}
              >×</button>
            </motion.div>
          )}
        </AnimatePresence>
  
        {/* ── Controls hint ──────────────────────────────────── */}
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 20,
          background: 'rgba(8,13,20,0.75)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(99,179,237,0.1)',
          borderRadius: 100, padding: '8px 24px',
          fontSize: 11, color: 'var(--text-muted)',
          pointerEvents: 'none',
        }}>
          <span>🖱 Drag to rotate</span>
          <span>🔍 Scroll to zoom</span>
          <span>👆 Click hotspot for details</span>
        </div>
      </div>
    )
  }