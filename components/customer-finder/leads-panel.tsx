'use client'

import { useMemo } from 'react'
import { Building2, ChevronDown, Download, FolderPlus, Globe, Loader2, Mail, Phone, Search, Trash2, User } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    LEAD_STAGE_LABELS,
    LEAD_STAGE_ORDER,
    type CustomerFinderLead,
    type CustomerFinderOverview,
    type LeadStage,
} from '@/lib/customer-finder'
import { EmptyStateIllustration } from '@/components/customer-finder/icons'

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

/* Stage → visual color mapping */
const STAGE_COLORS: Record<string, {
    bg: string
    text: string
    border: string
    dot: string
}> = {
    discovered: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500' },
    qualified: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
    researching: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
    ready_for_outreach: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
    outreach_sent: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
    replied: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-500' },
    meeting_booked: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
    won: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    disqualified: { bg: 'bg-zinc-50', text: 'text-zinc-500', border: 'border-zinc-200', dot: 'bg-zinc-400' },
}

function getStageColor(stage: string) {
    return STAGE_COLORS[stage] ?? STAGE_COLORS.discovered!
}

/* ── Lead Row ────────────────────────────────────────────── */

function LeadRow({
    lead,
    onStageChange,
    stageUpdating,
}: {
    lead: CustomerFinderLead
    onStageChange: (leadId: string, stage: LeadStage) => void
    stageUpdating: boolean
}) {
    const sc = getStageColor(lead.stage)
    const hasContact = lead.contactName || lead.email || lead.phone

    return (
        <div className="group flex items-start gap-4 border-b border-border/40 px-4 py-3.5 transition-colors hover:bg-secondary/30 last:border-b-0">
            {/* Company icon + info */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/60 mt-0.5">
                <Building2 className="h-4 w-4 text-muted-foreground/70" />
            </div>

            {/* Main content */}
            <div className="min-w-0 flex-1">
                {/* Company name + timestamp */}
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <h4 className="text-[13px] font-semibold text-foreground leading-snug truncate">
                            {lead.companyName}
                        </h4>
                        {lead.website && (
                            <a
                                href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground truncate"
                            >
                                <Globe className="h-3 w-3 shrink-0" />
                                {lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                            </a>
                        )}
                    </div>
                    <span className="text-[11px] text-muted-foreground/60 shrink-0 pt-0.5">
                        {formatRelativeTime(lead.stageUpdatedAt)}
                    </span>
                </div>

                {/* Contact info row */}
                {hasContact && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {lead.contactName && (
                            <span className="inline-flex items-center gap-1 text-[12px] text-foreground/80">
                                <User className="h-3 w-3 text-muted-foreground/50" />
                                {lead.contactName}
                            </span>
                        )}
                        {lead.email && (
                            <a
                                href={`mailto:${lead.email}`}
                                className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <Mail className="h-3 w-3 text-muted-foreground/50" />
                                {lead.email}
                            </a>
                        )}
                        {lead.phone && (
                            <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                                <Phone className="h-3 w-3 text-muted-foreground/50" />
                                {lead.phone}
                            </span>
                        )}
                    </div>
                )}

                {/* Bottom row: stage + source + tags */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    {/* Stage badge with change dropdown */}
                    <div className="flex items-center gap-1">
                        <Badge className={cn(
                            'border text-[10px] font-semibold px-2 py-0 h-5 gap-1',
                            sc.bg, sc.text, sc.border,
                        )}>
                            <span className={cn('h-1.5 w-1.5 rounded-full', sc.dot)} />
                            {LEAD_STAGE_LABELS[lead.stage]}
                        </Badge>
                        <Select
                            value={lead.stage}
                            onValueChange={(v) => onStageChange(lead.leadId, v as LeadStage)}
                            disabled={stageUpdating}
                        >
                            <SelectTrigger className="h-5 w-5 border-0 bg-transparent p-0 opacity-0 shadow-none transition-opacity group-hover:opacity-100 [&>svg]:h-3 [&>svg]:w-3">
                                <ChevronDown className="h-3 w-3 text-muted-foreground" />
                            </SelectTrigger>
                            <SelectContent>
                                {LEAD_STAGE_ORDER.map((s) => (
                                    <SelectItem key={s} value={s}>{LEAD_STAGE_LABELS[s]}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Source */}
                    <span className="inline-flex items-center rounded-full bg-secondary/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {lead.source}
                    </span>

                    {/* Tags */}
                    {(lead.tags ?? []).slice(0, 2).map((tag) => (
                        <span key={tag} className="inline-flex items-center rounded-full bg-secondary/30 px-2 py-0.5 text-[10px] text-muted-foreground">
                            {tag}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    )
}

/* ── Main Component ──────────────────────────────────────── */

export interface LeadsPanelProps {
    leads: CustomerFinderLead[]
    overview: CustomerFinderOverview | null
    leadSearch: string
    onSearchChange: (search: string) => void
    leadRunFilter: string
    onRunFilterChange: (v: string) => void
    leadFilterStage: string
    onStageFilterChange: (v: string) => void
    stageUpdatingLeadId: string | null
    onLeadStageChange: (leadId: string, stage: LeadStage) => void
    managingLeads: boolean
    onStartFresh: () => void
    onExportLeads: () => void
    onDiscardLeads: () => void
    onExportAndDiscardLeads: () => void
}

export function LeadsPanel({
    leads,
    overview,
    leadSearch,
    onSearchChange,
    leadRunFilter,
    onRunFilterChange,
    leadFilterStage,
    onStageFilterChange,
    stageUpdatingLeadId,
    onLeadStageChange,
    managingLeads,
    onStartFresh,
    onExportLeads,
    onDiscardLeads,
    onExportAndDiscardLeads,
}: LeadsPanelProps) {
    /* Stage summary counts from pipeline data */
    const stageCounts = useMemo(() => {
        const counts: Record<string, number> = {}
        for (const item of overview?.pipeline ?? []) {
            counts[item.stage] = item.count
        }
        return counts
    }, [overview?.pipeline])

    /* Quick stage filter pills */
    const activeStages = useMemo(() => {
        return LEAD_STAGE_ORDER.filter((s) => (stageCounts[s] ?? 0) > 0)
    }, [stageCounts])

    return (
        <section>
            {/* ── Header row: title + search/filters ───── */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Leads</h2>
                    <span className="text-[11px] text-muted-foreground/60">
                        {leads.length} {leads.length === 1 ? 'result' : 'results'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
                        <Input
                            value={leadSearch}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Search leads..."
                            className="h-8 w-40 bg-card pl-8 text-xs sm:w-52"
                        />
                    </div>
                    {/* Run filter */}
                    <Select value={leadRunFilter} onValueChange={onRunFilterChange}>
                        <SelectTrigger className="h-8 w-32 bg-card text-xs">
                            <SelectValue placeholder="Latest run" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="latest">Latest run</SelectItem>
                            <SelectItem value="all">All runs</SelectItem>
                            {(overview?.runs ?? []).map((run) => (
                                <SelectItem key={run.runId} value={run.runId}>
                                    {`${run.runName || run.runId.slice(0, 8)} · ${run.leadCount} leads`}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* ── Actions toolbar ─────────────────────── */}
            <div className="mb-3 flex items-center gap-1 rounded-lg border border-border/50 bg-secondary/20 px-1.5 py-1">
                {/* Primary: new list */}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 rounded-md px-2.5 text-[11px] font-medium text-foreground hover:bg-card"
                    onClick={onStartFresh}
                    disabled={managingLeads}
                    title="Create a new empty lead list"
                >
                    {managingLeads ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderPlus className="h-3.5 w-3.5" />}
                    New list
                </Button>

                {/* Separator */}
                <div className="mx-0.5 h-4 w-px bg-border/60" />

                {/* Export group */}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 rounded-md px-2.5 text-[11px] font-medium text-muted-foreground hover:bg-card hover:text-foreground"
                    onClick={onExportLeads}
                    disabled={managingLeads}
                    title="Export leads as CSV"
                >
                    <Download className="h-3.5 w-3.5" />
                    Export
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 rounded-md px-2.5 text-[11px] font-medium text-muted-foreground hover:bg-card hover:text-foreground"
                    onClick={onExportAndDiscardLeads}
                    disabled={managingLeads}
                    title="Export as CSV then remove from pipeline"
                >
                    <Download className="h-3.5 w-3.5" />
                    Export &amp; clear
                </Button>

                {/* Spacer pushes destructive action to right */}
                <div className="flex-1" />

                {/* Destructive: discard */}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 rounded-md px-2.5 text-[11px] font-medium text-red-600/70 hover:bg-red-50 hover:text-red-700 dark:text-red-400/70 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    onClick={onDiscardLeads}
                    disabled={managingLeads}
                    title="Permanently remove these leads"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                    Discard
                </Button>
            </div>

            {/* ── Stage filter pills ─────────────────────── */}
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
                <button
                    type="button"
                    onClick={() => onStageFilterChange('all')}
                    className={cn(
                        'inline-flex h-7 items-center gap-1 rounded-full border px-3 text-[11px] font-medium transition-colors',
                        leadFilterStage === 'all'
                            ? 'border-foreground/20 bg-foreground/5 text-foreground'
                            : 'border-border/60 text-muted-foreground hover:bg-secondary/50',
                    )}
                >
                    All
                    <span className="text-[10px] text-muted-foreground/60">{leads.length}</span>
                </button>
                {activeStages.map((stage) => {
                    const sc = getStageColor(stage)
                    const count = stageCounts[stage] ?? 0
                    const isActive = leadFilterStage === stage
                    return (
                        <button
                            key={stage}
                            type="button"
                            onClick={() => onStageFilterChange(stage)}
                            className={cn(
                                'inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[11px] font-medium transition-colors',
                                isActive
                                    ? cn(sc.bg, sc.text, sc.border)
                                    : 'border-border/60 text-muted-foreground hover:bg-secondary/50',
                            )}
                        >
                            <span className={cn('h-1.5 w-1.5 rounded-full', sc.dot)} />
                            {LEAD_STAGE_LABELS[stage]}
                            <span className="text-[10px] opacity-60">{count}</span>
                        </button>
                    )
                })}
            </div>

            {/* ── Lead rows ──────────────────────────────── */}
            <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
                {leads.length > 0 ? (
                    leads.map((lead) => (
                        <LeadRow
                            key={lead.leadId}
                            lead={lead}
                            onStageChange={onLeadStageChange}
                            stageUpdating={stageUpdatingLeadId === lead.leadId}
                        />
                    ))
                ) : (
                    <div className="flex flex-col items-center gap-2 py-16">
                        <EmptyStateIllustration className="h-24 opacity-50" />
                        <p className="text-sm text-muted-foreground">No leads found</p>
                        {leadSearch && (
                            <p className="text-xs text-muted-foreground/60">Try a different search term</p>
                        )}
                    </div>
                )}
            </div>
        </section>
    )
}
