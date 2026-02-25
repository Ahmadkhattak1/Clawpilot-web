'use client'

import { useMemo } from 'react'

import { cn } from '@/lib/utils'
import type { CustomerFinderAgentStatus, CustomerFinderOrchestratorLog } from '@/lib/customer-finder'
import {
    AgentPulseDot,
    DiscoverIcon,
    OutreachIcon,
    ResearchIcon,
    ReplyIcon,
} from '@/components/customer-finder/icons'

/* ── Helpers ─────────────────────────────────────────────── */

function formatRelativeTime(value: string | null): string {
    if (!value) return 'Never'
    const parsed = Date.parse(value)
    if (!Number.isFinite(parsed)) return value
    const diff = Date.now() - parsed
    if (diff < 60_000) return 'Just now'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
    return new Date(parsed).toLocaleDateString()
}

/* Agent → visual mapping (matching pipeline order) */
const PIPELINE_ORDER = ['discovered', 'researching', 'ready_for_outreach', 'replied'] as const

const AGENT_VISUALS: Record<string, {
    Icon: React.FC<{ className?: string }>
    iconColor: string
    bg: string
    label: string
    ringIdle: string
    ringActive: string
    glowColor: string
    heartbeatColor: string
    avatarBg: string
}> = {
    discovered: {
        Icon: DiscoverIcon,
        iconColor: 'text-violet-600 dark:text-violet-400',
        bg: 'bg-violet-100 dark:bg-violet-500/15',
        label: 'Discovery',
        ringIdle: 'border-violet-200 dark:border-violet-500/20',
        ringActive: 'border-violet-400 dark:border-violet-400',
        glowColor: 'shadow-violet-500/20',
        heartbeatColor: 'bg-violet-500',
        avatarBg: 'bg-violet-500',
    },
    researching: {
        Icon: ResearchIcon,
        iconColor: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-100 dark:bg-blue-500/15',
        label: 'Research',
        ringIdle: 'border-blue-200 dark:border-blue-500/20',
        ringActive: 'border-blue-400 dark:border-blue-400',
        glowColor: 'shadow-blue-500/20',
        heartbeatColor: 'bg-blue-500',
        avatarBg: 'bg-blue-500',
    },
    ready_for_outreach: {
        Icon: OutreachIcon,
        iconColor: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-100 dark:bg-amber-500/15',
        label: 'Outreach',
        ringIdle: 'border-amber-200 dark:border-amber-500/20',
        ringActive: 'border-amber-400 dark:border-amber-400',
        glowColor: 'shadow-amber-500/20',
        heartbeatColor: 'bg-amber-500',
        avatarBg: 'bg-amber-500',
    },
    replied: {
        Icon: ReplyIcon,
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-100 dark:bg-emerald-500/15',
        label: 'Reply',
        ringIdle: 'border-emerald-200 dark:border-emerald-500/20',
        ringActive: 'border-emerald-400 dark:border-emerald-400',
        glowColor: 'shadow-emerald-500/20',
        heartbeatColor: 'bg-emerald-500',
        avatarBg: 'bg-emerald-500',
    },
}

function getAgentVisual(stage: string) {
    return AGENT_VISUALS[stage] ?? AGENT_VISUALS.discovered!
}

/* ── Connector Arrow ─────────────────────────────────────── */

function PipelineConnector({ active }: { active: boolean }) {
    return (
        <div className="hidden sm:flex items-center justify-center flex-shrink-0 w-10 lg:w-14 self-center">
            <div className="relative w-full flex items-center">
                {/* Track */}
                <div className={cn(
                    'h-[2px] w-full rounded-full transition-colors duration-500',
                    active ? 'bg-violet-300 dark:bg-violet-600' : 'bg-border',
                )} />
                {/* Animated dot traveling along the track */}
                {active && (
                    <div className="absolute inset-0 flex items-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-violet-500 cf-connector-dot" />
                    </div>
                )}
                {/* Arrowhead */}
                <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3 -ml-1 shrink-0">
                    <path
                        d="M2 2L8 6L2 10"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={cn(
                            'transition-colors duration-500',
                            active ? 'text-violet-400' : 'text-border',
                        )}
                    />
                </svg>
            </div>
        </div>
    )
}

/* Mobile vertical connector */
function PipelineConnectorVertical({ active }: { active: boolean }) {
    return (
        <div className="flex sm:hidden items-center justify-center h-8">
            <div className="relative h-full flex flex-col items-center">
                <div className={cn(
                    'w-[2px] flex-1 rounded-full transition-colors duration-500',
                    active ? 'bg-violet-300' : 'bg-border',
                )} />
                <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3 shrink-0">
                    <path
                        d="M2 2L6 8L10 2"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={cn(active ? 'text-violet-400' : 'text-border')}
                    />
                </svg>
            </div>
        </div>
    )
}

/* ── Agent Card ──────────────────────────────────────────── */

function AgentCard({
    agent,
    index,
}: {
    agent: CustomerFinderAgentStatus
    index: number
}) {
    const visual = getAgentVisual(agent.stage)
    const isRunning = agent.status === 'running'
    const isError = agent.status === 'error'
    const isBlocked = agent.status === 'blocked'

    return (
        <div
            className={cn(
                'group relative flex-1 min-w-0 rounded-2xl border overflow-hidden transition-all duration-500',
                'cf-pipeline-card-enter bg-card',
                isRunning
                    ? cn('border-border/40', `shadow-lg ${visual.glowColor}`)
                    : 'border-border/60 hover:shadow-md',
            )}
            style={{ animationDelay: `${index * 120}ms` }}
        >
            <div className="p-4 lg:p-5">
                {/* ── Centered Agent Avatar ───────────── */}
                <div className="flex flex-col items-center text-center">
                    {/* Avatar with orbit ring */}
                    <div className="relative mb-3">
                        {/* Outer orbit ring */}
                        <div className={cn(
                            'absolute -inset-2.5 rounded-full border-2 border-dashed transition-all duration-700',
                            isRunning
                                ? cn(visual.ringActive, 'cf-agent-orbit opacity-100')
                                : cn(visual.ringIdle, 'opacity-40'),
                        )} />

                        {/* Inner glow ring (visible when running) */}
                        {isRunning && (
                            <div className={cn(
                                'absolute -inset-1 rounded-full cf-agent-breathe-ring',
                                visual.bg,
                            )} />
                        )}

                        {/* Avatar circle — flat color bg with white icon */}
                        <div className={cn(
                            'relative h-14 w-14 rounded-full flex items-center justify-center shadow-sm',
                            visual.avatarBg,
                        )}>
                            <visual.Icon className="h-6 w-6 text-white" />
                        </div>

                        {/* Status dot overlay on avatar */}
                        <div className={cn(
                            'absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-card flex items-center justify-center',
                            isRunning ? 'bg-emerald-500' :
                                isError ? 'bg-red-500' :
                                    isBlocked ? 'bg-amber-500' :
                                        'bg-zinc-300 dark:bg-zinc-600',
                        )}>
                            {isRunning && (
                                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                            )}
                        </div>
                    </div>

                    {/* Agent name */}
                    <h3 className="text-[13px] font-bold text-foreground tracking-tight">{agent.name}</h3>

                    {/* Status label */}
                    <span className={cn(
                        'mt-0.5 text-[10px] font-semibold uppercase tracking-widest',
                        isRunning ? 'text-emerald-600 dark:text-emerald-400' :
                            isError ? 'text-red-600 dark:text-red-400' :
                                isBlocked ? 'text-amber-600 dark:text-amber-400' :
                                    'text-muted-foreground/60',
                    )}>
                        {agent.status}
                    </span>
                </div>

                {/* ── Divider ────────────────────────── */}
                <div className="my-3 h-px bg-border/50" />

                {/* ── Activity line (monospace) ──────── */}
                <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                    {agent.summary.split('.')[0]}.
                </p>

                {/* ── Stats row ──────────────────────── */}
                {(agent.processed !== undefined || agent.updated !== undefined) && (
                    <div className="mt-2.5 flex items-center gap-1.5">
                        {agent.processed !== undefined && (
                            <span className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                visual.bg, visual.iconColor,
                            )}>
                                {agent.processed} processed
                            </span>
                        )}
                        {agent.updated !== undefined && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                {agent.updated} updated
                            </span>
                        )}
                    </div>
                )}

                {/* ── Timestamp ──────────────────────── */}
                <p className="mt-2 text-[10px] text-muted-foreground/50">
                    {formatRelativeTime(agent.updatedAt)}
                </p>
            </div>

            {/* ── Bottom heartbeat bar ────────────────── */}
            <div className="h-[3px] w-full bg-secondary/50 overflow-hidden">
                <div
                    className={cn(
                        'h-full rounded-full transition-all duration-700',
                        visual.heartbeatColor,
                        isRunning ? 'w-full cf-agent-heartbeat opacity-80' : 'w-0 opacity-0',
                    )}
                />
            </div>
        </div>
    )
}

/* ── Main Pipeline Component ─────────────────────────────── */

export interface AgentPipelineProps {
    agents: CustomerFinderAgentStatus[]
    orchestratorAgent?: CustomerFinderAgentStatus | null
    orchestratorLogs?: CustomerFinderOrchestratorLog[]
}

export function AgentPipeline({
    agents,
    orchestratorAgent,
    orchestratorLogs = [],
}: AgentPipelineProps) {
    const recentLogs = useMemo(() => orchestratorLogs.slice(-3).reverse(), [orchestratorLogs])

    /* Sort agents into pipeline order */
    const sortedAgents = useMemo(() => {
        const orderMap: Record<string, number> = {}
        PIPELINE_ORDER.forEach((s, i) => { orderMap[s] = i })
        return [...agents].sort((a, b) => {
            const ai = orderMap[a.stage] ?? 99
            const bi = orderMap[b.stage] ?? 99
            return ai - bi
        })
    }, [agents])

    const runningCount = agents.filter((a) => a.status === 'running').length
    const hasActiveFlow = runningCount > 0

    return (
        <section>
            {/* ── Orchestrator banner ─────────────────────────── */}
            {orchestratorAgent && (
                <div className="mb-3 rounded-lg border border-border/60 bg-card px-3 py-2">
                    <div className="flex items-center justify-between">
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Supervisor</p>
                            <p className="truncate text-xs text-foreground">{orchestratorAgent.summary}</p>
                        </div>
                        <div className="ml-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <AgentPulseDot status={orchestratorAgent.status} />
                            <span className="capitalize">{orchestratorAgent.status}</span>
                        </div>
                    </div>
                    {recentLogs.length > 0 && (
                        <div className="mt-2 space-y-1">
                            {recentLogs.map((log) => (
                                <p key={`${log.timestamp}-${log.message}`} className="truncate text-[11px] text-muted-foreground">
                                    {`${formatRelativeTime(log.timestamp)} • ${log.message}`}
                                </p>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Pipeline header ────────────────────────────── */}
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agents</h2>
                    {hasActiveFlow && (
                        <span className="inline-flex h-5 items-center gap-1 rounded-full bg-emerald-500/10 px-2 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            </span>
                            {runningCount} running
                        </span>
                    )}
                </div>
                <span className="text-[11px] text-muted-foreground">
                    {runningCount === 0 ? 'Idle' : `${runningCount} active`}
                </span>
            </div>

            {/* ── Pipeline strip ─────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-stretch gap-0">
                {sortedAgents.map((agent, i) => (
                    <div key={agent.agentId} className="contents">
                        {/* Vertical connector (mobile) */}
                        {i > 0 && <PipelineConnectorVertical active={hasActiveFlow} />}

                        {/* The card */}
                        <AgentCard agent={agent} index={i} />

                        {/* Horizontal connector (desktop) */}
                        {i < sortedAgents.length - 1 && <PipelineConnector active={hasActiveFlow} />}
                    </div>
                ))}
            </div>
        </section>
    )
}
