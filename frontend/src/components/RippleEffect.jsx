import React, { useEffect, useRef } from 'react'

export default function RippleEffect({ active = true, centerX = 50, centerY = 50, color = '#ff3d5a' }) {
  const canvasRef = useRef()

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width  = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    const cx = canvas.width  * (centerX / 100)
    const cy = canvas.height * (centerY / 100)

    const ripples = []
    let animId

    const addRipple = () => {
      ripples.push({ r: 10, opacity: 0.7, speed: 1.5 + Math.random() * 2 })
    }

    // Spawn a new ripple every 1.2s
    addRipple()
    const spawnInterval = setInterval(addRipple, 1200)

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i]
        ctx.beginPath()
        ctx.arc(cx, cy, rp.r, 0, Math.PI * 2)
        ctx.strokeStyle = color + Math.floor(rp.opacity * 255).toString(16).padStart(2, '0')
        ctx.lineWidth   = 1.5
        ctx.stroke()
        rp.r       += rp.speed
        rp.opacity -= 0.008
        if (rp.opacity <= 0) ripples.splice(i, 1)
      }

      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      clearInterval(spawnInterval)
      cancelAnimationFrame(animId)
    }
  }, [active, centerX, centerY, color])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  )
}