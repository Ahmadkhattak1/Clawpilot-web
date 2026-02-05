"use client"

import { useEffect, useState } from "react"

export function FloatingOrbs() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large ambient orb - top right */}
      <div 
        className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(59, 130, 246, 0.04) 0%, transparent 60%)",
          animation: "float 40s ease-in-out infinite",
        }}
      />
      
      {/* Medium orb - bottom left */}
      <div 
        className="absolute -bottom-32 -left-32 w-[600px] h-[600px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(59, 130, 246, 0.03) 0%, transparent 60%)",
          animation: "float 45s ease-in-out infinite reverse",
        }}
      />

      {/* Subtle top gradient */}
      <div 
        className="absolute top-0 left-0 right-0 h-[500px]"
        style={{
          background: "linear-gradient(180deg, rgba(59, 130, 246, 0.02) 0%, transparent 100%)",
        }}
      />

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(15px, -15px);
          }
        }
      `}</style>
    </div>
  )
}
