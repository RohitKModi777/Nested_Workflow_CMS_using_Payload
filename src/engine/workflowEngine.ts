/**
 * workflowEngine.ts
 * Core orchestrator for the Dynamic Workflow Management System.
 * Handles: workflow lookup, step evaluation, state transitions, logging, notifications.
 */

import type { Payload } from 'payload'
import { evaluate } from './stepEvaluator'
import { notifyAssignee, notifyCompletion, notifyEscalation, notifyRejection } from './notifier'

export interface WorkflowStep {
    stepId: string
    label: string
    order: number
    type: 'approval' | 'review' | 'sign-off' | 'comment-only'
    assignedRole?: string
    assignedUser?: string | { id: string; email: string; name: string }
    conditions?: string
    slaHours?: number
    onApprove?: string
    onReject?: string
}

export interface WorkflowDoc {
    id: string
    name: string
    targetCollections: Array<{ collectionSlug: string }>
    steps: WorkflowStep[]
    isActive: boolean
}

export interface AdvanceOptions {
    instanceId: string
    action: 'approved' | 'rejected' | 'commented'
    actorId: string
    comment?: string
    payload: Payload
}

// ─── Find workflows that target a given collection ───────────────────────────
export async function findWorkflowsForCollection(
    collectionSlug: string,
    payload: Payload,
): Promise<WorkflowDoc[]> {
    const result = await payload.find({
        collection: 'workflows',
        where: { isActive: { equals: true } },
        limit: 100,
    })

    return (result.docs as any[]).filter((wf: WorkflowDoc) =>
        wf.targetCollections?.some((t) => t.collectionSlug === collectionSlug),
    )
}

// ─── Sort steps by order ascending ───────────────────────────────────────────
function sortedSteps(steps: WorkflowStep[]): WorkflowStep[] {
    return [...steps].sort((a, b) => a.order - b.order)
}

// ─── Find or create a workflow instance for a document ───────────────────────
export async function getOrCreateInstance(
    workflow: WorkflowDoc,
    collectionSlug: string,
    documentId: string,
    triggeredById: string | undefined,
    payload: Payload,
) {
    const existing = await payload.find({
        collection: 'workflow-instances',
        where: {
            and: [
                { 'workflow': { equals: workflow.id } },
                { 'collectionSlug': { equals: collectionSlug } },
                { 'documentId': { equals: documentId } },
                { 'status': { in: ['pending', 'in-progress'] } },
            ],
        },
        limit: 1,
    })

    if (existing.docs.length > 0) return existing.docs[0]

    const steps = sortedSteps(workflow.steps)
    const firstStep = steps[0]

    const instance = await payload.create({
        collection: 'workflow-instances',
        data: {
            workflow: workflow.id,
            collectionSlug,
            documentId,
            currentStepId: firstStep?.stepId || '',
            currentStepIndex: 0,
            status: 'in-progress',
            startedAt: new Date().toISOString(),
            stepStartedAt: new Date().toISOString(),
            triggeredBy: triggeredById,
        },
    })

    return instance
}

// ─── Log an action to workflow-logs ──────────────────────────────────────────
async function createLog(
    payload: Payload,
    data: {
        instance: string
        workflowId: string
        workflowName: string
        collectionSlug: string
        documentId: string
        stepId: string
        stepLabel: string
        actorId?: string
        actorName?: string
        action: string
        comment?: string
        outcome?: string
    },
) {
    await payload.create({
        collection: 'workflow-logs',
        data: {
            instance: data.instance,
            workflowId: data.workflowId,
            workflowName: data.workflowName,
            collectionSlug: data.collectionSlug,
            documentId: data.documentId,
            stepId: data.stepId,
            stepLabel: data.stepLabel,
            actor: data.actorId,
            actorName: data.actorName,
            action: data.action,
            comment: data.comment,
            outcome: data.outcome,
            timestamp: new Date().toISOString(),
        } as any,
    })
}

// ─── Get user info ────────────────────────────────────────────────────────────
async function getUserInfo(payload: Payload, userId: string) {
    try {
        const user = await payload.findByID({ collection: 'users', id: userId })
        return user as any
    } catch {
        return null
    }
}

// ─── Check if actor is permitted to act on a step ────────────────────────────
export function checkStepPermission(
    step: WorkflowStep,
    actorRoles: string[],
    actorId: string,
): boolean {
    // Admin can always act
    if (actorRoles.includes('admin')) return true

    // Specific user assignment takes precedence over role
    if (step.assignedUser) {
        const assignedId =
            typeof step.assignedUser === 'string' ? step.assignedUser : step.assignedUser.id
        return assignedId === actorId
    }

    // Role-based check
    if (step.assignedRole) {
        return actorRoles.includes(step.assignedRole)
    }

    return false
}

// ─── Trigger workflow engine on document save ─────────────────────────────────
export async function triggerWorkflowForDocument(opts: {
    collectionSlug: string
    documentId: string
    docData: Record<string, any>
    actorId?: string
    payload: Payload
    forceNew?: boolean
}) {
    const { collectionSlug, documentId, docData, actorId, payload, forceNew } = opts

    const workflows = await findWorkflowsForCollection(collectionSlug, payload)
    if (!workflows.length) {
        console.log(`[WorkflowEngine] No active workflows found for collection: ${collectionSlug}`)
        return
    }

    for (const workflow of workflows) {
        console.log(`[WorkflowEngine] Processing workflow "${workflow.name}" for ${collectionSlug}/${documentId}`)

        if (forceNew) {
            // Mark any existing instances as completed before starting new one
            const existingInstances = await payload.find({
                collection: 'workflow-instances',
                where: {
                    and: [
                        { workflow: { equals: workflow.id } },
                        { collectionSlug: { equals: collectionSlug } },
                        { documentId: { equals: documentId } },
                        { status: { in: ['pending', 'in-progress'] } },
                    ],
                },
            })
            for (const inst of existingInstances.docs) {
                await payload.update({
                    collection: 'workflow-instances',
                    id: (inst as any).id,
                    data: { status: 'completed', completedAt: new Date().toISOString() },
                })
            }
        }

        const instance = await getOrCreateInstance(workflow, collectionSlug, documentId, actorId, payload)
        const steps = sortedSteps(workflow.steps)
        const currentStep = steps.find((s) => s.stepId === (instance as any).currentStepId)

        if (!currentStep) {
            console.log(`[WorkflowEngine] No current step found for instance — workflow may be complete.`)
            continue
        }

        // Evaluate step condition
        const conditionMet = evaluate(currentStep.conditions || '', docData)
        if (!conditionMet) {
            console.log(`[WorkflowEngine] Condition NOT met for step "${currentStep.stepId}". Skipping.`)
            await createLog(payload, {
                instance: (instance as any).id,
                workflowId: workflow.id,
                workflowName: workflow.name,
                collectionSlug,
                documentId,
                stepId: currentStep.stepId,
                stepLabel: currentStep.label,
                action: 'skipped',
                outcome: `Condition not met: ${currentStep.conditions}`,
            })

            // Auto-advance to next step
            const currentIdx = steps.findIndex((s) => s.stepId === currentStep.stepId)
            const nextStep = steps[currentIdx + 1]
            if (nextStep) {
                await payload.update({
                    collection: 'workflow-instances',
                    id: (instance as any).id,
                    data: {
                        currentStepId: nextStep.stepId,
                        currentStepIndex: currentIdx + 1,
                        stepStartedAt: new Date().toISOString(),
                    },
                })
            } else {
                await payload.update({
                    collection: 'workflow-instances',
                    id: (instance as any).id,
                    data: { status: 'completed', completedAt: new Date().toISOString() },
                })
            }
            continue
        }

        // Notify assignee
        const assignedUser =
            currentStep.assignedUser && typeof currentStep.assignedUser !== 'string'
                ? currentStep.assignedUser
                : null

        notifyAssignee({
            stepId: currentStep.stepId,
            stepLabel: currentStep.label,
            stepType: currentStep.type,
            assignedRole: currentStep.assignedRole,
            assignedUser,
            documentId,
            collectionSlug,
            workflowName: workflow.name,
        })
    }
}

// ─── Advance workflow: called by approve/reject/comment action ────────────────
export async function advanceWorkflow(opts: AdvanceOptions) {
    const { instanceId, action, actorId, comment, payload } = opts

    const instance = await payload.findByID({
        collection: 'workflow-instances',
        id: instanceId,
    }) as any

    if (!instance) throw new Error(`Workflow instance ${instanceId} not found`)
    if (instance.status === 'completed' || instance.status === 'rejected') {
        throw new Error(`Workflow instance is already ${instance.status}`)
    }

    const workflow = await payload.findByID({
        collection: 'workflows',
        id: typeof instance.workflow === 'string' ? instance.workflow : instance.workflow.id,
    }) as any

    const steps = sortedSteps(workflow.steps)
    const currentStep = steps.find((s: WorkflowStep) => s.stepId === instance.currentStepId)
    if (!currentStep) throw new Error(`Current step not found: ${instance.currentStepId}`)

    // Permission check
    const actor = await getUserInfo(payload, actorId)
    const actorRoles: string[] = actor?.roles || []
    if (!checkStepPermission(currentStep, actorRoles, actorId)) {
        throw new Error(`User ${actorId} does not have permission to act on step "${currentStep.stepId}"`)
    }

    // Log the action
    await createLog(payload, {
        instance: instanceId,
        workflowId: workflow.id,
        workflowName: workflow.name,
        collectionSlug: instance.collectionSlug,
        documentId: instance.documentId,
        stepId: currentStep.stepId,
        stepLabel: currentStep.label,
        actorId,
        actorName: actor?.name || actor?.email,
        action,
        comment,
        outcome: action,
    })

    if (action === 'rejected') {
        // Handle rejection branching or terminal rejection
        if (currentStep.onReject) {
            const branchStep = steps.find((s: WorkflowStep) => s.stepId === currentStep.onReject)
            if (branchStep) {
                await payload.update({
                    collection: 'workflow-instances',
                    id: instanceId,
                    data: {
                        currentStepId: branchStep.stepId,
                        currentStepIndex: steps.indexOf(branchStep),
                        stepStartedAt: new Date().toISOString(),
                    },
                })
                notifyAssignee({
                    stepId: branchStep.stepId,
                    stepLabel: branchStep.label,
                    stepType: branchStep.type,
                    assignedRole: branchStep.assignedRole,
                    assignedUser: null,
                    documentId: instance.documentId,
                    collectionSlug: instance.collectionSlug,
                    workflowName: workflow.name,
                })
                return { status: 'branched', nextStep: branchStep.stepId }
            }
        }

        await payload.update({
            collection: 'workflow-instances',
            id: instanceId,
            data: { status: 'rejected', completedAt: new Date().toISOString() },
        })
        notifyRejection({
            stepId: currentStep.stepId,
            stepLabel: currentStep.label,
            stepType: currentStep.type,
            assignedRole: currentStep.assignedRole,
            assignedUser: null,
            documentId: instance.documentId,
            collectionSlug: instance.collectionSlug,
            workflowName: workflow.name,
            comment,
        })
        return { status: 'rejected' }
    }

    if (action === 'commented') {
        // Comment only — don't advance the step
        return { status: 'commented', currentStep: currentStep.stepId }
    }

    // Approved — determine next step (branching or sequential)
    let nextStep: WorkflowStep | null = null

    if (currentStep.onApprove) {
        nextStep = steps.find((s: WorkflowStep) => s.stepId === currentStep.onApprove) || null
    }

    if (!nextStep) {
        const currentIdx = steps.findIndex((s: WorkflowStep) => s.stepId === currentStep.stepId)
        nextStep = steps[currentIdx + 1] || null
    }

    if (!nextStep) {
        // All steps complete!
        await payload.update({
            collection: 'workflow-instances',
            id: instanceId,
            data: { status: 'completed', completedAt: new Date().toISOString() },
        })
        await createLog(payload, {
            instance: instanceId,
            workflowId: workflow.id,
            workflowName: workflow.name,
            collectionSlug: instance.collectionSlug,
            documentId: instance.documentId,
            stepId: currentStep.stepId,
            stepLabel: 'Workflow Completion',
            actorId,
            action: 'completed',
            outcome: 'All steps approved',
        })
        notifyCompletion({
            stepId: currentStep.stepId,
            stepLabel: currentStep.label,
            stepType: currentStep.type,
            documentId: instance.documentId,
            collectionSlug: instance.collectionSlug,
            workflowName: workflow.name,
            outcome: 'completed',
        })
        return { status: 'completed' }
    }

    // Advance to next step
    await payload.update({
        collection: 'workflow-instances',
        id: instanceId,
        data: {
            currentStepId: nextStep.stepId,
            currentStepIndex: steps.indexOf(nextStep),
            stepStartedAt: new Date().toISOString(),
        },
    })

    notifyAssignee({
        stepId: nextStep.stepId,
        stepLabel: nextStep.label,
        stepType: nextStep.type,
        assignedRole: nextStep.assignedRole,
        assignedUser: null,
        documentId: instance.documentId,
        collectionSlug: instance.collectionSlug,
        workflowName: workflow.name,
    })

    return { status: 'advanced', nextStep: nextStep.stepId }
}
