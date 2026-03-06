'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'

interface WorkflowStep {
    stepId: string
    label: string
    order: number
    type: string
    assignedRole?: string
    isCurrent: boolean
    isPast: boolean
    status: string
    slaHours?: number
    conditions?: string
}

interface WorkflowLog {
    id: string
    stepId: string
    stepLabel: string
    actorName?: string
    action: string
    comment?: string
    outcome?: string
    timestamp: string
}

interface WorkflowStatus {
    hasActiveWorkflow: boolean
    instance?: {
        id: string
        status: string
        currentStepId: string
        workflowName: string
        startedAt: string
        completedAt?: string
    }
    steps: WorkflowStep[]
    currentStep?: WorkflowStep
    logs: WorkflowLog[]
}

const STATUS_COLORS: Record<string, string> = {
    completed: '#22c55e',
    approved: '#22c55e',
    'in-progress': '#3b82f6',
    pending: '#94a3b8',
    rejected: '#ef4444',
    escalated: '#f97316',
    skipped: '#a78bfa',
}

const ACTION_ICONS: Record<string, string> = {
    approved: '✅',
    rejected: '❌',
    commented: '💬',
    escalated: '⚠️',
    completed: '🎉',
    started: '🚀',
    skipped: '⏭️',
}

export function WorkflowPanel(): React.ReactElement {
    const { id: docId, collectionSlug } = useDocumentInfo()

    const [status, setStatus] = useState<WorkflowStatus | null>(null)
    const [loading, setLoading] = useState(false)
    const [actionLoading, setActionLoading] = useState(false)
    const [comment, setComment] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)

    const fetchStatus = useCallback(async () => {
        if (!docId || !collectionSlug) return
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/workflows/status/${docId}?collection=${collectionSlug}`, {
                credentials: 'include',
            })
            const data = await res.json()
            setStatus(data)
        } catch (e: any) {
            setError('Failed to load workflow status.')
        } finally {
            setLoading(false)
        }
    }, [docId, collectionSlug])

    useEffect(() => {
        fetchStatus()
    }, [fetchStatus])

    const handleTrigger = async () => {
        setActionLoading(true)
        setError(null)
        setSuccessMsg(null)
        try {
            const res = await fetch('/api/workflows/trigger', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ collectionSlug, documentId: String(docId) }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to trigger')
            setSuccessMsg(`Workflow triggered! Current step: ${data.currentStep}`)
            await fetchStatus()
        } catch (e: any) {
            setError(e.message)
        } finally {
            setActionLoading(false)
        }
    }

    const handleAction = async (action: 'approved' | 'rejected' | 'commented') => {
        if (!status?.instance?.id) return
        setActionLoading(true)
        setError(null)
        setSuccessMsg(null)
        try {
            const res = await fetch('/api/workflows/action', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ instanceId: status.instance.id, action, comment }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Action failed')
            setSuccessMsg(`Action "${action}" recorded successfully!`)
            setComment('')
            await fetchStatus()
        } catch (e: any) {
            setError(e.message)
        } finally {
            setActionLoading(false)
        }
    }

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loading}>⏳ Loading workflow status...</div>
            </div>
        )
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>🔄 Workflow Status</h2>
                <button
                    style={styles.refreshBtn}
                    onClick={fetchStatus}
                    disabled={loading}
                    title="Refresh"
                >
                    ↻
                </button>
            </div>

            {error && <div style={styles.errorBox}>⚠️ {error}</div>}
            {successMsg && <div style={styles.successBox}>✓ {successMsg}</div>}

            {!status?.hasActiveWorkflow ? (
                <div style={styles.emptyState}>
                    <p>No active workflow for this document.</p>
                    <button
                        style={styles.triggerBtn}
                        onClick={handleTrigger}
                        disabled={actionLoading}
                    >
                        {actionLoading ? 'Triggering...' : '▶ Trigger Workflow'}
                    </button>
                </div>
            ) : (
                <>
                    {/* Instance Info */}
                    <div style={styles.instanceCard}>
                        <div style={styles.instanceRow}>
                            <span style={styles.label}>Workflow:</span>
                            <strong>{status.instance?.workflowName}</strong>
                        </div>
                        <div style={styles.instanceRow}>
                            <span style={styles.label}>Status:</span>
                            <span
                                style={{
                                    ...styles.badge,
                                    backgroundColor: STATUS_COLORS[status.instance?.status || 'pending'] + '22',
                                    color: STATUS_COLORS[status.instance?.status || 'pending'],
                                    border: `1px solid ${STATUS_COLORS[status.instance?.status || 'pending']}`,
                                }}
                            >
                                {status.instance?.status?.toUpperCase()}
                            </span>
                        </div>
                        {status.instance?.startedAt && (
                            <div style={styles.instanceRow}>
                                <span style={styles.label}>Started:</span>
                                <span>{new Date(status.instance.startedAt).toLocaleString()}</span>
                            </div>
                        )}
                    </div>

                    {/* Step Progress */}
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>Steps</h3>
                        <div style={styles.stepsContainer}>
                            {status.steps.map((step, idx) => (
                                <div
                                    key={step.stepId}
                                    style={{
                                        ...styles.stepItem,
                                        borderLeft: `3px solid ${STATUS_COLORS[step.isCurrent ? 'in-progress' : step.isPast ? 'completed' : 'pending']}`,
                                    }}
                                >
                                    <div style={styles.stepHeader}>
                                        <span style={styles.stepNumber}>{idx + 1}</span>
                                        <span style={styles.stepLabel}>{step.label}</span>
                                        <span
                                            style={{
                                                ...styles.stepBadge,
                                                backgroundColor:
                                                    STATUS_COLORS[step.isCurrent ? 'in-progress' : step.isPast ? 'completed' : 'pending'] + '22',
                                                color:
                                                    STATUS_COLORS[step.isCurrent ? 'in-progress' : step.isPast ? 'completed' : 'pending'],
                                            }}
                                        >
                                            {step.isCurrent ? '● ACTIVE' : step.isPast ? '✓ Done' : '○ Pending'}
                                        </span>
                                    </div>
                                    <div style={styles.stepMeta}>
                                        <span>Type: {step.type}</span>
                                        {step.assignedRole && <span> | Role: {step.assignedRole}</span>}
                                        {step.slaHours && <span> | SLA: {step.slaHours}h</span>}
                                        {step.conditions && (
                                            <div style={styles.condition}>Condition: <code>{step.conditions}</code></div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action Panel */}
                    {status.instance?.status === 'in-progress' && (
                        <div style={styles.section}>
                            <h3 style={styles.sectionTitle}>Your Action</h3>
                            <textarea
                                style={styles.commentBox}
                                placeholder="Add a comment (optional)..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows={3}
                            />
                            <div style={styles.actionButtons}>
                                <button
                                    style={{ ...styles.actionBtn, ...styles.approveBtn }}
                                    onClick={() => handleAction('approved')}
                                    disabled={actionLoading}
                                >
                                    ✅ Approve
                                </button>
                                <button
                                    style={{ ...styles.actionBtn, ...styles.rejectBtn }}
                                    onClick={() => handleAction('rejected')}
                                    disabled={actionLoading}
                                >
                                    ❌ Reject
                                </button>
                                <button
                                    style={{ ...styles.actionBtn, ...styles.commentBtn }}
                                    onClick={() => handleAction('commented')}
                                    disabled={actionLoading || !comment.trim()}
                                >
                                    💬 Comment
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Re-trigger button */}
                    <div style={{ marginBottom: 16 }}>
                        <button
                            style={{ ...styles.triggerBtn, fontSize: 12, padding: '6px 12px' }}
                            onClick={handleTrigger}
                            disabled={actionLoading}
                        >
                            ↺ Re-trigger Workflow
                        </button>
                    </div>

                    {/* Audit Log */}
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>Audit Log</h3>
                        {status.logs.length === 0 ? (
                            <div style={styles.emptyLogs}>No actions recorded yet.</div>
                        ) : (
                            <div style={styles.logsContainer}>
                                {status.logs.map((log) => (
                                    <div key={log.id} style={styles.logItem}>
                                        <div style={styles.logHeader}>
                                            <span style={styles.logAction}>
                                                {ACTION_ICONS[log.action] || '•'} {log.action.toUpperCase()}
                                            </span>
                                            <span style={styles.logMeta}>
                                                {log.actorName && <strong>{log.actorName}</strong>}
                                                {' — '}
                                                {new Date(log.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                        {log.stepLabel && (
                                            <div style={styles.logStep}>Step: {log.stepLabel}</div>
                                        )}
                                        {log.comment && (
                                            <div style={styles.logComment}>💬 &ldquo;{log.comment}&rdquo;</div>
                                        )}
                                        {log.outcome && (
                                            <div style={styles.logOutcome}>Outcome: {log.outcome}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
    container: {
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        padding: '24px',
        maxWidth: 800,
        fontSize: 16,
        color: '#f8fafc',
        background: 'linear-gradient(145deg, #1e293b, #0f172a)',
        borderRadius: '16px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
        border: '1px solid #334155',
        marginTop: '16px',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        borderBottom: '1px solid #334155',
        paddingBottom: 16,
    },
    title: {
        margin: 0,
        fontSize: 26,
        fontWeight: 700,
        color: '#f8fafc',
        letterSpacing: '-0.02em',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    refreshBtn: {
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid #475569',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 18,
        padding: '6px 12px',
        color: '#cbd5e1',
        transition: 'all 0.2s ease',
    },
    loading: { color: '#94a3b8', padding: 32, textAlign: 'center', fontSize: 18 },
    errorBox: {
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: 12,
        padding: '12px 16px',
        color: '#fca5a5',
        marginBottom: 20,
        backdropFilter: 'blur(4px)',
    },
    successBox: {
        background: 'rgba(34, 197, 94, 0.1)',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        borderRadius: 12,
        padding: '12px 16px',
        color: '#86efac',
        marginBottom: 20,
        backdropFilter: 'blur(4px)',
    },
    emptyState: {
        textAlign: 'center',
        padding: '40px 0',
        color: '#94a3b8',
        fontSize: 16
    },
    instanceCard: {
        background: 'rgba(20, 27, 45, 0.6)',
        border: '1px solid #334155',
        borderRadius: 12,
        padding: '20px',
        marginBottom: 24,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
    },
    instanceRow: {
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        marginBottom: 10,
        fontSize: 16,
    },
    label: { color: '#94a3b8', minWidth: 90, fontWeight: 500 },
    badge: {
        padding: '4px 12px',
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: '0.08em',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    section: { marginBottom: 32 },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        color: '#64748b',
        marginBottom: 16,
    },
    stepsContainer: { display: 'flex', flexDirection: 'column', gap: 12 },
    stepItem: {
        background: 'rgba(30, 41, 59, 0.5)',
        borderRadius: 12,
        padding: '16px 20px',
        border: '1px solid #334155',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        transition: 'transform 0.2s',
    },
    stepHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    stepNumber: {
        background: '#334155',
        color: '#f8fafc',
        borderRadius: '50%',
        width: 30,
        height: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        fontWeight: 700,
        flexShrink: 0,
    } as any,
    stepLabel: { fontWeight: 600, flex: 1, fontSize: 17, color: '#e2e8f0' },
    stepBadge: {
        fontSize: 12,
        fontWeight: 700,
        padding: '4px 10px',
        borderRadius: 999,
        letterSpacing: '0.05em',
    },
    stepMeta: { fontSize: 15, color: '#94a3b8', marginTop: 6 },
    condition: { marginTop: 6, background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: 6, display: 'inline-block' },
    commentBox: {
        width: '100%',
        borderRadius: 12,
        border: '1px solid #475569',
        background: 'rgba(15, 23, 42, 0.6)',
        padding: '14px 16px',
        fontSize: 16,
        color: '#f8fafc',
        resize: 'vertical',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
        marginBottom: 16,
        outline: 'none',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
    },
    actionButtons: { display: 'flex', gap: 12 },
    actionBtn: {
        padding: '10px 24px',
        borderRadius: 8,
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: 16,
        border: 'none',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    },
    approveBtn: { background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff' },
    rejectBtn: { background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff' },
    commentBtn: { background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff' },
    triggerBtn: {
        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        padding: '12px 24px',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: 16,
        marginTop: 12,
        boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)',
    },
    logsContainer: { display: 'flex', flexDirection: 'column', gap: 12 },
    logItem: {
        background: 'rgba(30, 41, 59, 0.3)',
        borderRadius: 10,
        padding: '14px 18px',
        border: '1px solid #334155',
        borderLeft: '3px solid #64748b',
    },
    logHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    logAction: { fontWeight: 700, fontSize: 14, color: '#e2e8f0' },
    logMeta: { fontSize: 14, color: '#94a3b8' },
    logStep: { fontSize: 15, color: '#cbd5e1', marginBottom: 4 },
    logComment: {
        fontSize: 15,
        fontStyle: 'italic',
        color: '#e0e7ff',
        marginTop: 6,
        paddingLeft: 10,
        borderLeft: '2px solid #6366f1'
    },
    logOutcome: { fontSize: 14, color: '#94a3b8', marginTop: 4, fontWeight: 500 },
    emptyLogs: { color: '#64748b', fontStyle: 'italic', padding: '16px 0', fontSize: 16 },
}
