import { useId, type SVGProps } from 'react'

import { cn } from '@/lib/utils'

type IconProps = SVGProps<SVGSVGElement> & { className?: string }

/* ── Pipeline Stage Icons ─────────────────────────────────── */

export function DiscoverIcon({ className, ...props }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={cn('h-5 w-5', className)} {...props}>
            <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M15.5 15.5L20 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="10.5" cy="10.5" r="2.5" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        </svg>
    )
}

export function QualifyIcon({ className, ...props }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={cn('h-5 w-5', className)} {...props}>
            <path
                d="M12 2L14.9 8.6L22 9.3L16.8 14L18.2 21L12 17.5L5.8 21L7.2 14L2 9.3L9.1 8.6L12 2Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
            />
            <path d="M9 12.5L11 14.5L15 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
        </svg>
    )
}

export function ResearchIcon({ className, ...props }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={cn('h-5 w-5', className)} {...props}>
            <path d="M4 19.5V4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5z" stroke="currentColor" strokeWidth="1.6" />
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke="currentColor" strokeWidth="1.6" />
            <path d="M8 7h8M8 10.5h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
        </svg>
    )
}

export function OutreachIcon({ className, ...props }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={cn('h-5 w-5', className)} {...props}>
            <path d="M22 2L11 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
    )
}

export function ReplyIcon({ className, ...props }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={cn('h-5 w-5', className)} {...props}>
            <path
                d="M21 12a9 9 0 01-9 9c-1.2 0-2.4-.2-3.5-.7L3 21l.7-5.5A9 9 0 0112 3a9 9 0 019 9z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M8.5 11h7M8.5 14h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
        </svg>
    )
}

export function MeetingIcon({ className, ...props }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={cn('h-5 w-5', className)} {...props}>
            <rect x="3" y="4" width="18" height="17" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M3 9h18" stroke="currentColor" strokeWidth="1.6" />
            <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="12" cy="15" r="2" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
        </svg>
    )
}

export function WonIcon({ className, ...props }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={cn('h-5 w-5', className)} {...props}>
            <path
                d="M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2M18 9h2a2 2 0 002-2V5a2 2 0 00-2-2h-2"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M6 3h12v7a6 6 0 01-12 0V3z"
                stroke="currentColor"
                strokeWidth="1.6"
            />
            <path d="M9 21h6M12 16v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    )
}

export function DisqualifiedIcon({ className, ...props }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={cn('h-5 w-5', className)} {...props}>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
            <path d="M15 9L9 15M9 9l6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    )
}

/* ── Stat Icons ───────────────────────────────────────────── */

export function LeadsIcon({ className, ...props }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={cn('h-5 w-5', className)} {...props}>
            <circle cx="9" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M2 21v-1a5 5 0 015-5h4a5 5 0 015 5v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="17.5" cy="8.5" r="2.5" stroke="currentColor" strokeWidth="1.3" opacity="0.5" />
            <path d="M18 15a4 4 0 014 4v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.5" />
        </svg>
    )
}

export function ContactedIcon({ className, ...props }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={cn('h-5 w-5', className)} {...props}>
            <path d="M22 2L11 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <circle cx="11" cy="13" r="1.5" fill="currentColor" opacity="0.3" />
        </svg>
    )
}

export function RepliedIcon({ className, ...props }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={cn('h-5 w-5', className)} {...props}>
            <path d="M9 14l-4 4V6a2 2 0 012-2h10a2 2 0 012 2v6a2 2 0 01-2 2H9z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M9 8.5h6M9 11h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
        </svg>
    )
}

export function MeetingsIcon({ className, ...props }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={cn('h-5 w-5', className)} {...props}>
            <path d="M15 10l5-3v10l-5-3v-4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <rect x="3" y="6" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
        </svg>
    )
}

export function WonStatIcon({ className, ...props }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={cn('h-5 w-5', className)} {...props}>
            <path d="M12 2v4M4.93 4.93l2.83 2.83M2 12h4M4.93 19.07l2.83-2.83M12 18v4M16.24 16.24l2.83 2.83M18 12h4M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.4" />
            <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
            <path d="M10 12l1.5 1.5L14 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function ActiveAgentsIcon({ className, ...props }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={cn('h-5 w-5', className)} {...props}>
            <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="9" cy="10" r="1.5" fill="currentColor" />
            <circle cx="15" cy="10" r="1.5" fill="currentColor" />
            <path d="M9 15c0 0 1.5 2 3 2s3-2 3-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
    )
}

/* ── Agent Status Pulse ───────────────────────────────────── */

export function AgentPulseDot({
    status,
    className,
}: {
    status: 'idle' | 'running' | 'blocked' | 'error'
    className?: string
}) {
    const colors = {
        running: 'bg-emerald-500',
        blocked: 'bg-amber-500',
        error: 'bg-red-500',
        idle: 'bg-zinc-400',
    }
    const ringColors = {
        running: 'bg-emerald-500/30',
        blocked: 'bg-amber-500/30',
        error: 'bg-red-500/30',
        idle: 'bg-zinc-400/20',
    }

    return (
        <span className={cn('relative inline-flex h-3 w-3', className)}>
            {status === 'running' && (
                <span className={cn('absolute inset-0 rounded-full cf-pulse-dot', ringColors[status])} />
            )}
            <span className={cn('relative inline-flex h-3 w-3 rounded-full', colors[status])} />
        </span>
    )
}

/* ── Pipeline Connector ───────────────────────────────────── */

export function PipelineArrow({ className, ...props }: IconProps) {
    return (
        <svg viewBox="0 0 20 8" fill="none" className={cn('h-2 w-5', className)} {...props}>
            <path d="M0 4H16M16 4L13 1.5M16 4L13 6.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

/* ── Empty State Illustration ─────────────────────────────── */

export function EmptyStateIllustration({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 200 140" fill="none" className={cn('h-32 w-auto', className)}>
            {/* Satellite dish base */}
            <ellipse cx="100" cy="120" rx="40" ry="6" className="fill-muted/50" />

            {/* Dish stand */}
            <path d="M100 90v30" className="stroke-muted-foreground/30" strokeWidth="2" strokeLinecap="round" />
            <path d="M88 120h24" className="stroke-muted-foreground/30" strokeWidth="2" strokeLinecap="round" />

            {/* Satellite dish */}
            <path
                d="M60 70C60 48 78 30 100 30C122 30 140 48 140 70"
                className="stroke-muted-foreground/25"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
            />
            <path
                d="M72 70C72 55 84 42 100 42C116 42 128 55 128 70"
                className="stroke-muted-foreground/20"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
            />

            {/* Focal point */}
            <circle cx="100" cy="70" r="5" className="fill-violet-500/30 stroke-violet-500/50" strokeWidth="1.5" />
            <circle cx="100" cy="70" r="2" className="fill-violet-500/60" />

            {/* Signal waves */}
            <path d="M120 25C130 20 138 18 148 20" className="stroke-violet-400/25" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3" />
            <path d="M125 18C135 13 143 11 153 13" className="stroke-violet-400/15" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3" />

            {/* Small stars / dots */}
            <circle cx="150" cy="22" r="2" className="fill-violet-400/30" />
            <circle cx="55" cy="25" r="1.5" className="fill-indigo-400/25" />
            <circle cx="160" cy="40" r="1.5" className="fill-indigo-400/20" />
            <circle cx="40" cy="50" r="1" className="fill-violet-400/15" />
        </svg>
    )
}

/* ── Radar Animated SVG (hero) ────────────────────────────── */

/*
 * Nine themed icons arranged in a constellation around a center beacon.
 * Each icon fades-in → scales-up → floats gently, with staggered timing.
 * Dashed connection lines draw from center to each icon.
 * A radar sweep and pulsing rings layer underneath.
 *
 * Icons used:
 *   Customers · Search · AI · Data · Location · Connection · LinkedIn · Google · Web
 */

const CONSTELLATION_NODES: Array<{
    label: string
    cx: number
    cy: number
    /** 24×24 SVG path data */
    paths: string[]
    color: string
    /** If true, icon paths use fill instead of stroke */
    filled?: boolean
    /** Per-path fills for multi-color icons like Google */
    pathFills?: string[]
}> = [
        {
            // Google "G" — official simplified logo
            label: 'Google',
            cx: 80, cy: 18,
            filled: true,
            pathFills: ['#4285F4', '#34A853', '#FBBC05', '#EA4335'],
            paths: [
                // Blue right section
                'M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.5 5.5 0 01-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z',
                // Green bottom-right
                'M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0012 24z',
                // Yellow bottom-left
                'M5.4 14.3a7.2 7.2 0 010-4.6V6.6H1.4a12 12 0 000 10.8l4-3.1z',
                // Red top-left
                'M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A11.5 11.5 0 0012 0 12 12 0 001.4 6.6l4 3.1c.9-2.8 3.5-4.9 6.6-4.9z',
            ],
            color: 'amber',
        },
        {
            // LinkedIn "in" — official logo mark
            label: 'LinkedIn',
            cx: 130, cy: 30,
            filled: true,
            paths: [
                'M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.36 8h4.27v13.5H.36V8zM8.65 8h4.1v1.85h.06c.57-1.08 1.96-2.22 4.04-2.22 4.32 0 5.12 2.85 5.12 6.55V21.5h-4.27v-6.5c0-1.55-.03-3.54-2.16-3.54-2.16 0-2.49 1.69-2.49 3.43v6.61H8.65V8z',
            ],
            color: 'sky',
        },
        {
            // Globe / Web — clean world icon
            label: 'Web',
            cx: 148, cy: 80,
            paths: [
                'M12 22a10 10 0 110-20 10 10 0 010 20z',
                'M2 12h20',
                'M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z',
            ],
            color: 'rose',
        },
        {
            // Target / Leads icon
            label: 'Leads',
            cx: 118, cy: 135,
            paths: [
                'M16 21v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1',
                'M12 11a3 3 0 100-6 3 3 0 000 6z',
                'M20 21v-1a3 3 0 00-2.2-2.9',
                'M16.5 3.1a3 3 0 010 5.8',
            ],
            color: 'violet',
        },
        {
            // AI / Sparkle
            label: 'AI',
            cx: 42, cy: 135,
            paths: [
                'M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2z',
                'M5 18l1 3 1-3M18 18l1 3 1-3',
            ],
            color: 'violet',
        },
        {
            // Email / Outreach
            label: 'Email',
            cx: 12, cy: 80,
            paths: [
                'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z',
                'M22 6l-10 7L2 6',
            ],
            color: 'emerald',
        },
        {
            // Database / CRM
            label: 'CRM',
            cx: 32, cy: 30,
            paths: [
                'M12 2C6.48 2 2 4.02 2 6.5v11C2 19.98 6.48 22 12 22s10-2.02 10-4.5v-11C22 4.02 17.52 2 12 2z',
                'M2 6.5C2 8.98 6.48 11 12 11s10-2.02 10-4.5',
                'M2 12c0 2.48 4.48 4.5 10 4.5s10-2.02 10-4.5',
            ],
            color: 'blue',
        },
    ]

const COLOR_CLASSES: Record<string, { stroke: string; fill: string; text: string; bg: string }> = {
    violet: { stroke: 'stroke-violet-500/60', fill: 'fill-violet-500/12', text: 'fill-violet-600 dark:fill-violet-400', bg: 'stroke-violet-500/20' },
    indigo: { stroke: 'stroke-indigo-500/60', fill: 'fill-indigo-500/12', text: 'fill-indigo-600 dark:fill-indigo-400', bg: 'stroke-indigo-500/20' },
    blue: { stroke: 'stroke-blue-500/60', fill: 'fill-blue-500/12', text: 'fill-blue-600 dark:fill-blue-400', bg: 'stroke-blue-500/20' },
    cyan: { stroke: 'stroke-cyan-500/60', fill: 'fill-cyan-500/12', text: 'fill-cyan-600 dark:fill-cyan-400', bg: 'stroke-cyan-500/20' },
    emerald: { stroke: 'stroke-emerald-500/60', fill: 'fill-emerald-500/12', text: 'fill-emerald-600 dark:fill-emerald-400', bg: 'stroke-emerald-500/20' },
    sky: { stroke: 'stroke-sky-500/60', fill: 'fill-sky-500/12', text: 'fill-sky-600 dark:fill-sky-400', bg: 'stroke-sky-500/20' },
    amber: { stroke: 'stroke-amber-500/60', fill: 'fill-amber-500/12', text: 'fill-amber-600 dark:fill-amber-400', bg: 'stroke-amber-500/20' },
    rose: { stroke: 'stroke-rose-500/60', fill: 'fill-rose-500/12', text: 'fill-rose-600 dark:fill-rose-400', bg: 'stroke-rose-500/20' },
}

export function RadarSvg({ className }: { className?: string }) {
    const uid = useId()
    const gradId = `cf-rg-${uid}`
    const center = { x: 80, y: 80 }

    return (
        <div className={cn('relative', className)}>
            {/* Layer 1 — base grid + pulsing rings */}
            <svg className="h-full w-full" viewBox="0 0 160 160" fill="none">
                {/* Faint cross hairs */}
                <path d="M80 5v150M5 80h150" className="stroke-violet-500/6" strokeWidth="0.5" />

                {/* Concentric rings */}
                <circle cx="80" cy="80" r="75" className="cf-ring-1 stroke-violet-500/15" strokeWidth="0.8" />
                <circle cx="80" cy="80" r="55" className="cf-ring-2 stroke-violet-500/10" strokeWidth="0.8" />
                <circle cx="80" cy="80" r="35" className="stroke-violet-500/20" strokeWidth="0.8" />

                {/* Center beacon */}
                <circle cx="80" cy="80" r="12" className="cf-ring-1 stroke-violet-500/12" strokeWidth="0.6" />
                <circle cx="80" cy="80" r="6" className="stroke-violet-500/35" strokeWidth="1.2" />
                <circle cx="80" cy="80" r="3" className="fill-violet-500" />
                <circle cx="80" cy="80" r="3" fill="white" fillOpacity="0.2" />
            </svg>

            {/* Layer 2 — radar sweep */}
            <svg className="absolute inset-0 h-full w-full cf-radar" viewBox="0 0 160 160" fill="none">
                <defs>
                    <linearGradient id={gradId} x1="80" y1="80" x2="80" y2="5" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="rgb(139 92 246)" stopOpacity="0" />
                        <stop offset="100%" stopColor="rgb(139 92 246)" stopOpacity="0.3" />
                    </linearGradient>
                </defs>
                <path d="M80 80L80 5A75 75 0 0 1 143.3 40Z" fill={`url(#${gradId})`} />
                <line x1="80" y1="80" x2="80" y2="5" stroke="rgb(139 92 246)" strokeOpacity="0.4" strokeWidth="0.8" />
            </svg>

            {/* Layer 3 — connection lines (center → icons) */}
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 160 160" fill="none">
                {CONSTELLATION_NODES.map((node, i) => (
                    <line
                        key={`line-${node.label}`}
                        x1={center.x} y1={center.y}
                        x2={node.cx} y2={node.cy}
                        className={`cf-conn-line ${COLOR_CLASSES[node.color]?.bg ?? 'stroke-violet-500/20'} cf-line-d${i}`}
                        strokeWidth="0.8"
                    />
                ))}
            </svg>

            {/* Layer 4 — icon nodes */}
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 160 160" fill="none">
                {CONSTELLATION_NODES.map((node, i) => {
                    const cc = COLOR_CLASSES[node.color] ?? COLOR_CLASSES.violet!
                    const iconSize = 16
                    const half = iconSize / 2

                    return (
                        <g
                            key={node.label}
                            className={`cf-icon-node cf-icon-d${i}`}
                            style={{ transformOrigin: `${node.cx}px ${node.cy}px` }}
                        >
                            {/* Backdrop circle */}
                            <circle cx={node.cx} cy={node.cy} r="13" className={cc.fill} />
                            <circle cx={node.cx} cy={node.cy} r="13" className={cc.stroke} strokeWidth="0.8" fill="none" />

                            {/* Icon paths */}
                            <g
                                transform={`translate(${node.cx - half}, ${node.cy - half}) scale(${iconSize / 24})`}
                                className={node.filled ? undefined : cc.text}
                                fill={node.filled ? undefined : 'none'}
                                stroke={node.filled ? 'none' : 'currentColor'}
                                strokeWidth={node.filled ? undefined : '1.8'}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                {node.paths.map((d, pi) => (
                                    <path
                                        key={pi}
                                        d={d}
                                        fill={node.pathFills?.[pi] ?? (node.filled ? 'currentColor' : undefined)}
                                        className={!node.pathFills ? (node.filled ? cc.text : undefined) : undefined}
                                    />
                                ))}
                            </g>

                            {/* Label */}
                            <text
                                x={node.cx}
                                y={node.cy + 20}
                                textAnchor="middle"
                                className="fill-muted-foreground/60"
                                fontSize="5.5"
                                fontWeight="600"
                                letterSpacing="0.3"
                            >
                                {node.label}
                            </text>
                        </g>
                    )
                })}
            </svg>
        </div>
    )
}

