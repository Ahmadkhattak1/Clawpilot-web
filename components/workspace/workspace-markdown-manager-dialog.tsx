'use client'

import Link from 'next/link'
import {
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  FilePlus2,
  Loader2,
  Pencil,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  deleteRuntimeWorkspaceFile,
  listRuntimeWorkspaceFiles,
  readRuntimeWorkspaceFile,
  upsertRuntimeWorkspaceFile,
} from '@/lib/runtime-controls'
import { getRecoveredSupabaseSession } from '@/lib/supabase-auth'
import {
  getPathFileName,
  isCriticalWorkspaceFile,
  isValidRelativeMdPath,
  workspaceFileRisk,
} from '@/lib/workspace-md-utils'

type WorkspaceManagerStatusType = 'success' | 'error' | 'info'

interface WorkspaceMarkdownManagerDialogProps {
  tenantId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onUnauthorized: () => void
  onStatus?: (type: WorkspaceManagerStatusType, message: string) => void
}

interface WorkspaceManagerStatus {
  type: WorkspaceManagerStatusType
  message: string
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim()
  return fallback
}

function isUnauthorizedMessage(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('unauthorized')
    || normalized.includes('forbidden')
    || normalized.includes('(401)')
    || normalized.includes('(403)')
    || normalized.includes('invalid token')
    || normalized.includes('auth')
    || normalized.includes('jwt')
  )
}

export function WorkspaceMarkdownManagerDialog({
  tenantId,
  open,
  onOpenChange,
  onUnauthorized,
  onStatus,
}: WorkspaceMarkdownManagerDialogProps) {
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [markdownFiles, setMarkdownFiles] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [status, setStatus] = useState<WorkspaceManagerStatus | null>(null)
  const [actionPendingKey, setActionPendingKey] = useState('')

  const [showAddForm, setShowAddForm] = useState(false)
  const [newFilePath, setNewFilePath] = useState('notes/new-note.md')
  const [newFileContent, setNewFileContent] = useState('# New note\n')

  const [activeFilePath, setActiveFilePath] = useState('')
  const [activeFileContent, setActiveFileContent] = useState('')
  const [activeFileOriginalContent, setActiveFileOriginalContent] = useState('')
  const [activeFileMode, setActiveFileMode] = useState<'view' | 'edit'>('view')
  const [fileMetaExpanded, setFileMetaExpanded] = useState(false)
  const [loadingActiveFile, setLoadingActiveFile] = useState(false)

  const reportStatus = useCallback((type: WorkspaceManagerStatusType, message: string) => {
    setStatus({ type, message })
    onStatus?.(type, message)
  }, [onStatus])

  const validateSessionOnce = useCallback(async (): Promise<boolean> => {
    const session = await getRecoveredSupabaseSession({ timeoutMs: 0 })
    if (!session) {
      onUnauthorized()
      onOpenChange(false)
      return false
    }
    return true
  }, [onOpenChange, onUnauthorized])

  const handleUnauthorizedError = useCallback((error: unknown): boolean => {
    const message = extractErrorMessage(error, 'Request failed.')
    if (isUnauthorizedMessage(message)) {
      onUnauthorized()
      onOpenChange(false)
      return true
    }
    return false
  }, [onOpenChange, onUnauthorized])

  const refreshFiles = useCallback(async (syncRuntime: boolean) => {
    const filesData = await listRuntimeWorkspaceFiles(tenantId, {
      includeHidden: true,
      syncRuntime,
    })
    setMarkdownFiles(filesData.files)
  }, [tenantId])

  useEffect(() => {
    if (!open || !tenantId.trim()) return

    let cancelled = false
    setLoadingFiles(true)
    setStatus(null)

    void (async () => {
      try {
        const authorized = await validateSessionOnce()
        if (!authorized || cancelled) return

        // Fast snapshot read first, then a fresh runtime sync in background.
        await refreshFiles(false)
        if (!cancelled) {
          void refreshFiles(true).catch((error) => {
            if (!handleUnauthorizedError(error)) {
              reportStatus('error', extractErrorMessage(error, 'Failed to refresh workspace files.'))
            }
          })
        }
      } catch (error) {
        if (!cancelled && !handleUnauthorizedError(error)) {
          reportStatus('error', extractErrorMessage(error, 'Failed to load workspace files.'))
        }
      } finally {
        if (!cancelled) {
          setLoadingFiles(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [handleUnauthorizedError, open, refreshFiles, reportStatus, tenantId, validateSessionOnce])

  const filteredFiles = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return markdownFiles
    return markdownFiles.filter((relativePath) => (
      relativePath.toLowerCase().includes(query)
      || getPathFileName(relativePath).toLowerCase().includes(query)
    ))
  }, [markdownFiles, search])

  const hasUnsavedChanges = useMemo(() => (
    activeFileMode === 'edit' && activeFileContent !== activeFileOriginalContent
  ), [activeFileContent, activeFileMode, activeFileOriginalContent])

  const applyNewFileTemplate = useCallback((kind: 'note' | 'skill' | 'memory') => {
    if (kind === 'skill') {
      setNewFilePath('skills/new-skill/SKILL.md')
      setNewFileContent([
        '# Skill Name',
        '',
        '## Purpose',
        '-',
        '',
        '## Usage',
        '-',
        '',
      ].join('\n'))
      return
    }

    if (kind === 'memory') {
      const date = new Date().toISOString().slice(0, 10)
      setNewFilePath(`memory/${date}.md`)
      setNewFileContent('# Session Memory\n\n- Context:\n- Decisions:\n- Next steps:\n')
      return
    }

    setNewFilePath('notes/new-note.md')
    setNewFileContent('# New note\n')
  }, [])

  const handleCreateFile = useCallback(async () => {
    const normalizedPath = newFilePath.trim()
    if (!isValidRelativeMdPath(normalizedPath)) {
      reportStatus('error', 'File path must be a relative .md path, for example: notes/project.md')
      return
    }

    const actionKey = `create:${normalizedPath}`
    setActionPendingKey(actionKey)
    try {
      await upsertRuntimeWorkspaceFile(tenantId, {
        relativePath: normalizedPath,
        content: newFileContent,
        overwrite: true,
      })
      await refreshFiles(false)
      setShowAddForm(false)
      setNewFilePath('notes/new-note.md')
      setNewFileContent('# New note\n')
      reportStatus('success', `${normalizedPath} saved.`)
    } catch (error) {
      if (!handleUnauthorizedError(error)) {
        reportStatus('error', extractErrorMessage(error, 'Failed to save markdown file.'))
      }
    } finally {
      setActionPendingKey('')
    }
  }, [
    handleUnauthorizedError,
    newFileContent,
    newFilePath,
    refreshFiles,
    reportStatus,
    tenantId,
  ])

  const handleOpenFile = useCallback(async (relativePath: string) => {
    const actionKey = `open:${relativePath}`
    setActionPendingKey(actionKey)
    setLoadingActiveFile(true)
    setStatus(null)
    try {
      let fileData = await readRuntimeWorkspaceFile(tenantId, relativePath, {
        syncRuntime: false,
      })
      if (!fileData.exists) {
        fileData = await readRuntimeWorkspaceFile(tenantId, relativePath, {
          syncRuntime: true,
        })
      }
      if (!fileData.exists) {
        reportStatus('error', `${relativePath} was not found.`)
        return
      }
      const resolvedPath = fileData.relativePath || relativePath
      setActiveFilePath(resolvedPath)
      setActiveFileContent(fileData.content)
      setActiveFileOriginalContent(fileData.content)
      setActiveFileMode('view')
      setFileMetaExpanded(false)
      reportStatus('info', `${resolvedPath} opened.`)
    } catch (error) {
      if (!handleUnauthorizedError(error)) {
        reportStatus('error', extractErrorMessage(error, `Failed to read ${relativePath}.`))
      }
    } finally {
      setLoadingActiveFile(false)
      setActionPendingKey('')
    }
  }, [handleUnauthorizedError, reportStatus, tenantId])

  const handleSaveOpenedFile = useCallback(async () => {
    const normalizedPath = activeFilePath.trim()
    if (!normalizedPath) return
    if (!isValidRelativeMdPath(normalizedPath)) {
      reportStatus('error', 'File path must be a relative .md path, for example: notes/project.md')
      return
    }
    if (isCriticalWorkspaceFile(normalizedPath)) {
      const confirmed = window.confirm(
        `Save changes to critical file "${normalizedPath}"? This may affect OpenClaw startup and behavior.`,
      )
      if (!confirmed) return
    }

    const actionKey = `save:${normalizedPath}`
    setActionPendingKey(actionKey)
    try {
      await upsertRuntimeWorkspaceFile(tenantId, {
        relativePath: normalizedPath,
        content: activeFileContent,
        overwrite: true,
      })
      await refreshFiles(false)
      setActiveFileOriginalContent(activeFileContent)
      setActiveFileMode('view')
      reportStatus('success', `${normalizedPath} saved.`)
    } catch (error) {
      if (!handleUnauthorizedError(error)) {
        reportStatus('error', extractErrorMessage(error, `Failed to save ${normalizedPath}.`))
      }
    } finally {
      setActionPendingKey('')
    }
  }, [
    activeFileContent,
    activeFilePath,
    handleUnauthorizedError,
    refreshFiles,
    reportStatus,
    tenantId,
  ])

  const handleDeleteFile = useCallback(async (relativePath: string) => {
    const risk = workspaceFileRisk(relativePath)
    if (risk.level === 'critical') {
      const confirmation = window.prompt(
        `Delete critical file "${relativePath}"? This can break OpenClaw behavior.\n\nType the exact path to confirm.`,
      )
      if (confirmation?.trim() !== relativePath) return
    } else {
      const confirmed = window.confirm(`Move ${relativePath} to trash?`)
      if (!confirmed) return
    }

    const actionKey = `delete:${relativePath}`
    setActionPendingKey(actionKey)
    try {
      await deleteRuntimeWorkspaceFile(tenantId, {
        relativePath,
        permanent: false,
      })
      await refreshFiles(false)
      if (activeFilePath.trim() === relativePath.trim()) {
        setActiveFilePath('')
        setActiveFileContent('')
        setActiveFileMode('view')
      }
      reportStatus('success', `${relativePath} moved to trash.`)
    } catch (error) {
      if (!handleUnauthorizedError(error)) {
        reportStatus('error', extractErrorMessage(error, `Failed to delete ${relativePath}.`))
      }
    } finally {
      setActionPendingKey('')
    }
  }, [
    activeFilePath,
    handleUnauthorizedError,
    refreshFiles,
    reportStatus,
    tenantId,
  ])

  const handleCopyPath = useCallback(async () => {
    if (!activeFilePath.trim()) return
    try {
      await navigator.clipboard.writeText(activeFilePath.trim())
      reportStatus('info', 'File path copied.')
    } catch {
      reportStatus('error', 'Unable to copy file path.')
    }
  }, [activeFilePath, reportStatus])

  const handleCancelEdit = useCallback(() => {
    setActiveFileContent(activeFileOriginalContent)
    setActiveFileMode('view')
  }, [activeFileOriginalContent])

  const handleToggleSearch = useCallback(() => {
    setSearchExpanded((previous) => {
      const next = !previous
      if (!next) {
        setSearch('')
      }
      return next
    })
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[95vw] max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Markdown Files</DialogTitle>
          <DialogDescription>
            Focused workspace file management for skills, memory, and operational markdown.
          </DialogDescription>
        </DialogHeader>

        {status ? (
          <div
            className={`rounded-md border px-3 py-2 text-xs ${
              status.type === 'error'
                ? 'border-destructive/30 bg-destructive/5 text-destructive'
                : status.type === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700'
                  : 'border-border/70 bg-muted/20 text-muted-foreground'
            }`}
          >
            {status.message}
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button type="button" size="sm" variant="ghost" className="h-8" asChild>
            <Link
              href="/settings/skills"
              onClick={() => onOpenChange(false)}
            >
              Open advanced workspace tools
            </Link>
          </Button>
        </div>

        <div className="grid min-h-0 flex-1 gap-3 md:min-h-[56vh] md:grid-cols-[1fr_1.1fr]">
          <div className="min-h-0 rounded-lg border border-border/70 p-2">
            <div className="mb-2 space-y-2 px-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-foreground">Markdown files</p>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={handleToggleSearch}
                  >
                    <Search className="mr-1.5 h-3.5 w-3.5" />
                    {searchExpanded ? 'Hide search' : 'Search'}
                    {searchExpanded ? <ChevronUp className="ml-1 h-3.5 w-3.5" /> : <ChevronDown className="ml-1 h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => setShowAddForm((previous) => !previous)}
                  >
                    <FilePlus2 className="mr-1.5 h-3.5 w-3.5" />
                    {showAddForm ? 'Close' : 'Add .md'}
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                {loadingFiles ? (
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">{filteredFiles.length} file(s)</p>
                )}
              </div>
              {searchExpanded ? (
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search files by name or path"
                  className="h-8"
                />
              ) : null}
            </div>

            {showAddForm ? (
              <div className="mb-2 space-y-3 rounded-lg border border-border/70 p-3">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => applyNewFileTemplate('note')}>
                    Note template
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => applyNewFileTemplate('skill')}>
                    New SKILL.md
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => applyNewFileTemplate('memory')}>
                    Daily memory
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="gateway-new-md-path">File path (.md)</Label>
                  <Input
                    id="gateway-new-md-path"
                    value={newFilePath}
                    onChange={(event) => setNewFilePath(event.target.value)}
                    placeholder="notes/new-note.md"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="gateway-new-md-content">Content</Label>
                  <Textarea
                    id="gateway-new-md-content"
                    value={newFileContent}
                    onChange={(event) => setNewFileContent(event.target.value)}
                    className="min-h-32 font-mono text-xs"
                    placeholder="# New note"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleCreateFile()}
                    disabled={actionPendingKey === `create:${newFilePath.trim()}`}
                  >
                    {actionPendingKey === `create:${newFilePath.trim()}` ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Save file
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="max-h-[45vh] space-y-1 overflow-auto">
              {filteredFiles.length > 0 ? filteredFiles.map((relativePath) => {
                const fileRisk = workspaceFileRisk(relativePath)
                const deleteKey = `delete:${relativePath}`
                const openKey = `open:${relativePath}`
                const active = activeFilePath.trim() === relativePath.trim()
                return (
                  <div
                    key={relativePath}
                    className={`rounded-md border px-2 py-2 ${active ? 'border-primary/40 bg-primary/5' : 'border-transparent hover:border-border/70 hover:bg-muted/30'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => void handleOpenFile(relativePath)}
                      >
                        <p className="truncate text-xs font-medium">{getPathFileName(relativePath)}</p>
                        <p className="truncate text-[11px] text-muted-foreground" title={relativePath}>
                          {relativePath}
                        </p>
                      </button>
                      <div className="flex items-center gap-1">
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                            fileRisk.level === 'critical'
                              ? 'bg-destructive/15 text-destructive'
                              : fileRisk.level === 'operational'
                                ? 'bg-amber-500/15 text-amber-700'
                                : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {fileRisk.label}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => void handleOpenFile(relativePath)}
                          disabled={actionPendingKey === openKey}
                        >
                          {actionPendingKey === openKey ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Pencil className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive"
                          onClick={() => void handleDeleteFile(relativePath)}
                          disabled={actionPendingKey === deleteKey}
                        >
                          {actionPendingKey === deleteKey ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              }) : (
                <p className="px-2 py-3 text-xs text-muted-foreground">
                  No markdown files matched your search.
                </p>
              )}
            </div>
          </div>

          <div className="min-h-0 rounded-lg border border-border/70 p-3">
            {activeFilePath ? (
              <div className="flex h-full min-h-0 flex-col space-y-2">
                <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{getPathFileName(activeFilePath)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {activeFileMode === 'edit' ? 'Editing mode' : 'Viewing mode'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => setFileMetaExpanded((previous) => !previous)}
                      >
                        {fileMetaExpanded ? (
                          <>
                            Hide path
                            <ChevronUp className="ml-1 h-3.5 w-3.5" />
                          </>
                        ) : (
                          <>
                            Path
                            <ChevronDown className="ml-1 h-3.5 w-3.5" />
                          </>
                        )}
                      </Button>
                      {activeFileMode === 'view' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setActiveFileMode('edit')}
                          disabled={loadingActiveFile}
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Edit
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {fileMetaExpanded ? (
                    <div className="mt-2 flex items-center gap-2">
                      <Input value={activeFilePath} disabled className="h-8" />
                      <Button type="button" size="sm" variant="outline" onClick={() => void handleCopyPath()}>
                        <ClipboardCopy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : null}
                </div>

                {workspaceFileRisk(activeFilePath).level === 'critical' ? (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    <p className="flex items-center gap-1.5 font-medium">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Critical file
                    </p>
                    <p className="mt-1">Editing this file can affect startup behavior and core assistant behavior.</p>
                  </div>
                ) : (
                  <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {workspaceFileRisk(activeFilePath).message}
                    </p>
                  </div>
                )}

                {activeFileMode === 'edit' ? (
                  <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
                    <p className="text-xs text-muted-foreground">
                      {hasUnsavedChanges ? 'Unsaved changes' : 'No changes yet'}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="min-w-[8.5rem]"
                        onClick={() => void handleSaveOpenedFile()}
                        disabled={!hasUnsavedChanges || loadingActiveFile || actionPendingKey === `save:${activeFilePath.trim()}`}
                      >
                        {loadingActiveFile || actionPendingKey === `save:${activeFilePath.trim()}` ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Save changes
                      </Button>
                    </div>
                  </div>
                ) : null}

                {loadingActiveFile ? (
                  <div className="grid min-h-52 place-items-center rounded-md border border-border/70 bg-muted/20">
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading file
                    </p>
                  </div>
                ) : activeFileMode === 'view' ? (
                  <pre className="h-[50vh] min-h-[18rem] max-h-[56vh] overflow-x-auto overflow-y-auto rounded-md border border-border/70 bg-muted/20 p-3 font-mono text-xs whitespace-pre-wrap">
                    {activeFileContent || '(empty file)'}
                  </pre>
                ) : (
                  <Textarea
                    value={activeFileContent}
                    onChange={(event) => setActiveFileContent(event.target.value)}
                    className="h-[50vh] min-h-[18rem] max-h-[56vh] overflow-y-auto font-mono text-xs"
                    disabled={loadingActiveFile}
                    onKeyDown={(event) => {
                      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
                        event.preventDefault()
                        if (hasUnsavedChanges && !loadingActiveFile && actionPendingKey !== `save:${activeFilePath.trim()}`) {
                          void handleSaveOpenedFile()
                        }
                      }
                    }}
                  />
                )}
              </div>
            ) : (
              <div className="grid h-full min-h-52 place-items-center rounded-md border border-dashed border-border/70 bg-muted/10 px-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Select a markdown file to view or edit its content.
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
