"use client"

import { useEffect, useRef } from "react"

export function GradientAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
    }
    
    resize()

    // Gradient orbs
    const orbs: Array<{
      x: number
      y: number
      vx: number
      vy: number
      radius: number
      color: string
    }> = []

    const colors = [
      "rgba(124, 58, 237, 0.15)",  // violet
      "rgba(139, 92, 246, 0.12)",  // purple
      "rgba(99, 102, 241, 0.1)",   // indigo
      "rgba(79, 70, 229, 0.08)",   // indigo darker
    ]

    const rect = canvas.getBoundingClientRect()

    for (let i = 0; i < 4; i++) {
      orbs.push({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: 200 + Math.random() * 200,
        color: colors[i % colors.length],
      })
    }

    let animationId: number
    let time = 0

    function animate() {
      if (!ctx || !canvas) return
      
      const rect = canvas.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)
      time += 0.003

      // Update and draw orbs
      orbs.forEach((orb, i) => {
        // Gentle movement
        orb.x += orb.vx + Math.sin(time + i) * 0.2
        orb.y += orb.vy + Math.cos(time + i * 0.7) * 0.2

        // Bounce off edges softly
        if (orb.x < -orb.radius) orb.x = rect.width + orb.radius
        if (orb.x > rect.width + orb.radius) orb.x = -orb.radius
        if (orb.y < -orb.radius) orb.y = rect.height + orb.radius
        if (orb.y > rect.height + orb.radius) orb.y = -orb.radius

        // Draw gradient orb
        const gradient = ctx.createRadialGradient(
          orb.x, orb.y, 0,
          orb.x, orb.y, orb.radius
        )
        gradient.addColorStop(0, orb.color)
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)")

        ctx.beginPath()
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()
      })

      // Add subtle noise overlay effect
      ctx.globalAlpha = 0.02
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * rect.width
        const y = Math.random() * rect.height
        const size = Math.random() * 2
        ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.1})`
        ctx.fillRect(x, y, size, size)
      }
      ctx.globalAlpha = 1

      animationId = requestAnimationFrame(animate)
    }

    animate()

    window.addEventListener("resize", resize)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ width: "100%", height: "100%" }}
    />
  )
}
