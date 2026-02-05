"use client"

import { useEffect, useRef } from "react"

export function AgentVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    // Mesh grid points
    const gridSize = 40
    const cols = Math.ceil(rect.width / gridSize) + 1
    const rows = Math.ceil(rect.height / gridSize) + 1
    
    const points: Array<{
      x: number
      y: number
      baseX: number
      baseY: number
      offset: number
    }> = []

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        points.push({
          x: i * gridSize,
          y: j * gridSize,
          baseX: i * gridSize,
          baseY: j * gridSize,
          offset: Math.random() * Math.PI * 2,
        })
      }
    }

    const centerX = rect.width / 2
    const centerY = rect.height / 2

    let animationId: number
    let time = 0

    function animate() {
      if (!ctx || !canvas) return
      
      ctx.clearRect(0, 0, rect.width, rect.height)
      time += 0.008

      // Update points with wave motion
      points.forEach((p) => {
        const distFromCenter = Math.sqrt((p.baseX - centerX) ** 2 + (p.baseY - centerY) ** 2)
        const maxDist = Math.sqrt(centerX ** 2 + centerY ** 2)
        const normalizedDist = distFromCenter / maxDist
        
        const wave = Math.sin(time + p.offset + normalizedDist * 3) * 8
        const wave2 = Math.cos(time * 0.7 + p.offset) * 4
        
        p.x = p.baseX + wave
        p.y = p.baseY + wave2
      })

      // Draw mesh lines
      ctx.lineWidth = 1
      
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const idx = i * rows + j
          const p = points[idx]
          
          const distFromCenter = Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2)
          const maxDist = Math.sqrt(centerX ** 2 + centerY ** 2)
          const alpha = Math.max(0.02, 0.12 - (distFromCenter / maxDist) * 0.1)
          
          // Draw horizontal lines
          if (i < cols - 1) {
            const nextH = points[(i + 1) * rows + j]
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(nextH.x, nextH.y)
            ctx.strokeStyle = `rgba(59, 130, 246, ${alpha * 0.6})`
            ctx.stroke()
          }
          
          // Draw vertical lines
          if (j < rows - 1) {
            const nextV = points[i * rows + (j + 1)]
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(nextV.x, nextV.y)
            ctx.strokeStyle = `rgba(59, 130, 246, ${alpha * 0.6})`
            ctx.stroke()
          }
        }
      }

      // Draw central glow
      const pulseSize = 1 + Math.sin(time * 1.5) * 0.1
      
      // Large outer glow
      const outerGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 200 * pulseSize)
      outerGlow.addColorStop(0, "rgba(59, 130, 246, 0.06)")
      outerGlow.addColorStop(0.5, "rgba(59, 130, 246, 0.03)")
      outerGlow.addColorStop(1, "rgba(59, 130, 246, 0)")
      ctx.beginPath()
      ctx.arc(centerX, centerY, 200 * pulseSize, 0, Math.PI * 2)
      ctx.fillStyle = outerGlow
      ctx.fill()

      // Inner core glow
      const coreGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 60 * pulseSize)
      coreGlow.addColorStop(0, "rgba(59, 130, 246, 0.15)")
      coreGlow.addColorStop(0.4, "rgba(59, 130, 246, 0.08)")
      coreGlow.addColorStop(1, "rgba(59, 130, 246, 0)")
      ctx.beginPath()
      ctx.arc(centerX, centerY, 60 * pulseSize, 0, Math.PI * 2)
      ctx.fillStyle = coreGlow
      ctx.fill()

      // Core ring
      ctx.beginPath()
      ctx.arc(centerX, centerY, 30 * pulseSize, 0, Math.PI * 2)
      ctx.strokeStyle = "rgba(59, 130, 246, 0.2)"
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Core center dot
      ctx.beginPath()
      ctx.arc(centerX, centerY, 4, 0, Math.PI * 2)
      ctx.fillStyle = "rgba(59, 130, 246, 0.6)"
      ctx.fill()

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ width: "100%", height: "100%" }}
    />
  )
}
