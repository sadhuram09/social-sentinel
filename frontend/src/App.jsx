import React, { useEffect, useRef } from 'react'
import NetworkPage from './pages/NetworkPage'
import { Routes, Route } from 'react-router-dom'
import GlobePage from './pages/GlobePage'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Analyze from './pages/Analyze'
import EchoChamberPage from './pages/EchoChamberPage'
import LiveFeed from './pages/LiveFeed'

export default function App() {
  const cursorRef = useRef(null)
  const ringRef = useRef(null)

  useEffect(() => {
    const cursor = cursorRef.current
    const ring = ringRef.current
    let mx = 0, my = 0, rx = 0, ry = 0

    const onMove = (e) => {
      mx = e.clientX; my = e.clientY
      cursor.style.left = mx - 6 + 'px'
      cursor.style.top = my - 6 + 'px'
    }

    const lerp = () => {
      rx += (mx - rx) * 0.12
      ry += (my - ry) * 0.12
      ring.style.left = rx - 18 + 'px'
      ring.style.top = ry - 18 + 'px'
      requestAnimationFrame(lerp)
    }

    window.addEventListener('mousemove', onMove)
    lerp()
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <>
      <div className="cursor" ref={cursorRef} />
      <div className="cursor-ring" ref={ringRef} />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/analyze" element={<Analyze />} />
        <Route path="/live" element={<LiveFeed />} />
        <Route path="/network" element={<NetworkPage />} />
        <Route path="/globe" element={<GlobePage />} />
        <Route path="/echo" element={<EchoChamberPage />} />
      </Routes>
    </>
  )
}