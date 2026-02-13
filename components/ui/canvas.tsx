type Point = {
  x: number
  y: number
}

type CanvasContext = CanvasRenderingContext2D & {
  running: boolean
  frame: number
}

class Oscillator {
  phase: number
  offset: number
  frequency: number
  amplitude: number

  constructor({
    phase = 0,
    offset = 0,
    frequency = 0.001,
    amplitude = 1,
  }: Partial<{
    phase: number
    offset: number
    frequency: number
    amplitude: number
  }> = {}) {
    this.phase = phase
    this.offset = offset
    this.frequency = frequency
    this.amplitude = amplitude
  }

  update() {
    this.phase += this.frequency
    return this.offset + Math.sin(this.phase) * this.amplitude
  }
}

const config = {
  friction: 0.5,
  trails: 80,
  size: 50,
  dampening: 0.025,
  tension: 0.99,
}

class Node {
  x = 0
  y = 0
  vx = 0
  vy = 0
}

let ctx: CanvasContext | null = null
let oscillator: Oscillator | null = null
let pos: Point = { x: 0, y: 0 }
let lines: Line[] = []
let animationFrameId: number | null = null

class Line {
  spring: number
  friction: number
  nodes: Node[]

  constructor({ spring }: { spring: number }) {
    this.spring = spring + 0.1 * Math.random() - 0.05
    this.friction = config.friction + 0.01 * Math.random() - 0.005
    this.nodes = []

    for (let i = 0; i < config.size; i++) {
      const node = new Node()
      node.x = pos.x
      node.y = pos.y
      this.nodes.push(node)
    }
  }

  update() {
    let spring = this.spring
    const firstNode = this.nodes[0]
    firstNode.vx += (pos.x - firstNode.x) * spring
    firstNode.vy += (pos.y - firstNode.y) * spring

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i]
      if (i > 0) {
        const previous = this.nodes[i - 1]
        node.vx += (previous.x - node.x) * spring
        node.vy += (previous.y - node.y) * spring
        node.vx += previous.vx * config.dampening
        node.vy += previous.vy * config.dampening
      }

      node.vx *= this.friction
      node.vy *= this.friction
      node.x += node.vx
      node.y += node.vy
      spring *= config.tension
    }
  }

  draw() {
    if (!ctx) {
      return
    }

    let x = this.nodes[0].x
    let y = this.nodes[0].y

    ctx.beginPath()
    ctx.moveTo(x, y)

    let i = 1
    for (i = 1; i < this.nodes.length - 2; i++) {
      const current = this.nodes[i]
      const next = this.nodes[i + 1]
      x = 0.5 * (current.x + next.x)
      y = 0.5 * (current.y + next.y)
      ctx.quadraticCurveTo(current.x, current.y, x, y)
    }

    const current = this.nodes[i]
    const next = this.nodes[i + 1]
    if (current && next) {
      ctx.quadraticCurveTo(current.x, current.y, next.x, next.y)
    }

    ctx.stroke()
    ctx.closePath()
  }
}

function buildLines() {
  lines = []
  for (let i = 0; i < config.trails; i++) {
    lines.push(new Line({ spring: 0.45 + (i / config.trails) * 0.025 }))
  }
}

function updatePointer(event: MouseEvent | TouchEvent) {
  if ("touches" in event) {
    if (!event.touches[0]) {
      return
    }
    pos.x = event.touches[0].pageX
    pos.y = event.touches[0].pageY
  } else {
    pos.x = event.clientX
    pos.y = event.clientY
  }

  if (event.cancelable) {
    event.preventDefault()
  }
}

function handleTouchStart(event: TouchEvent) {
  if (event.touches.length === 1) {
    pos.x = event.touches[0].pageX
    pos.y = event.touches[0].pageY
  }
}

function render() {
  if (!ctx || !ctx.running) {
    animationFrameId = null
    return
  }

  ctx.globalCompositeOperation = "source-over"
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.globalCompositeOperation = "lighter"
  ctx.strokeStyle = `hsla(${Math.round(oscillator?.update() ?? 0)},100%,50%,0.025)`
  ctx.lineWidth = 10

  for (let i = 0; i < config.trails; i++) {
    const line = lines[i]
    line?.update()
    line?.draw()
  }

  ctx.frame += 1
  animationFrameId = window.requestAnimationFrame(render)
}

function resizeCanvas() {
  if (!ctx) {
    return
  }

  ctx.canvas.width = window.innerWidth - 20
  ctx.canvas.height = window.innerHeight
}

function onFirstInteraction(event: MouseEvent | TouchEvent) {
  document.removeEventListener("mousemove", onFirstMouseMove)
  document.removeEventListener("touchstart", onFirstTouchStart)
  document.addEventListener("mousemove", onMouseMove, { passive: false })
  document.addEventListener("touchmove", onTouchMove, { passive: false })
  document.addEventListener("touchstart", handleTouchStart, { passive: false })

  updatePointer(event)
  buildLines()
  if (animationFrameId === null) {
    render()
  }
}

function onFirstMouseMove(event: MouseEvent) {
  onFirstInteraction(event)
}

function onFirstTouchStart(event: TouchEvent) {
  onFirstInteraction(event)
}

function onMouseMove(event: MouseEvent) {
  updatePointer(event)
}

function onTouchMove(event: TouchEvent) {
  updatePointer(event)
}

function onWindowFocus() {
  if (ctx && !ctx.running) {
    ctx.running = true
    if (animationFrameId === null) {
      render()
    }
  }
}

function onWindowBlur() {
  if (ctx) {
    ctx.running = false
    if (animationFrameId !== null) {
      window.cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }
}

export const renderCanvas = () => {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement | null
  if (!canvas) {
    return () => {}
  }

  const context = canvas.getContext("2d")
  if (!context) {
    return () => {}
  }

  ctx = context as CanvasContext
  ctx.running = true
  ctx.frame = 1

  pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 }

  oscillator = new Oscillator({
    phase: Math.random() * 2 * Math.PI,
    amplitude: 85,
    frequency: 0.0015,
    offset: 285,
  })

  document.addEventListener("mousemove", onFirstMouseMove, { passive: false })
  document.addEventListener("touchstart", onFirstTouchStart, { passive: false })
  window.addEventListener("orientationchange", resizeCanvas)
  window.addEventListener("resize", resizeCanvas)
  window.addEventListener("focus", onWindowFocus)
  window.addEventListener("blur", onWindowBlur)

  resizeCanvas()

  return () => {
    if (ctx) {
      ctx.running = false
    }
    if (animationFrameId !== null) {
      window.cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }

    document.removeEventListener("mousemove", onFirstMouseMove)
    document.removeEventListener("touchstart", onFirstTouchStart)
    document.removeEventListener("mousemove", onMouseMove)
    document.removeEventListener("touchmove", onTouchMove)
    document.removeEventListener("touchstart", handleTouchStart)
    window.removeEventListener("orientationchange", resizeCanvas)
    window.removeEventListener("resize", resizeCanvas)
    window.removeEventListener("focus", onWindowFocus)
    window.removeEventListener("blur", onWindowBlur)
  }
}
