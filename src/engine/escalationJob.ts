/**
 * escalationJob.ts
 * BONUS: SLA monitoring — checks for overdue steps and auto-escalates.
 * Runs on server startup and every 15 minutes.
 */

import type { Payload } from 'payload'
import { notifyEscalation } from './notifier'

async function checkSLABreaches(payload: Payload): Promise<void> {
    console.log(`[EscalationJob] Checking SLA breaches at ${new Date().toISOString()}`)

    // Find all in-progress instances
    const instances = await payload.find({
        collection: 'workflow-instances',
        where: { status: { equals: 'in-progress' } },
        limit: 200,
    })

    for (const inst of instances.docs as any[]) {
        const workflow = await payload.findByID({
            collection: 'workflows',
            id: typeof inst.workflow === 'string' ? inst.workflow : inst.workflow.id,
        }) as any

        if (!workflow) continue

        const currentStep = (workflow.steps as any[]).find(
            (s: any) => s.stepId === inst.currentStepId,
        )

        if (!currentStep?.slaHours) continue

        const stepStarted = inst.stepStartedAt ? new Date(inst.stepStartedAt) : new Date(inst.startedAt)
        const hoursSinceStart = (Date.now() - stepStarted.getTime()) / (1000 * 60 * 60)

        if (hoursSinceStart >= currentStep.slaHours) {
            console.log(
                `[EscalationJob] SLA BREACH: workflow="${workflow.name}" step="${currentStep.stepId}" doc="${inst.documentId}" (${hoursSinceStart.toFixed(1)}h / ${currentStep.slaHours}h)`,
            )

            // Log escalation
            await payload.create({
                collection: 'workflow-logs',
                data: {
                    instance: inst.id,
                    workflowId: workflow.id,
                    workflowName: workflow.name,
                    collectionSlug: inst.collectionSlug,
                    documentId: inst.documentId,
                    stepId: currentStep.stepId,
                    stepLabel: currentStep.label,
                    action: 'escalated',
                    outcome: `SLA of ${currentStep.slaHours}h exceeded by ${(hoursSinceStart - currentStep.slaHours).toFixed(1)}h`,
                    timestamp: new Date().toISOString(),
                } as any,
            })

            // Update instance status
            await payload.update({
                collection: 'workflow-instances',
                id: inst.id,
                data: { status: 'escalated' },
            })

            // Send escalation notification
            notifyEscalation({
                stepId: currentStep.stepId,
                stepLabel: currentStep.label,
                stepType: currentStep.type,
                assignedRole: currentStep.assignedRole,
                assignedUser: null,
                documentId: inst.documentId,
                collectionSlug: inst.collectionSlug,
                workflowName: workflow.name,
                slaHours: currentStep.slaHours,
            })
        }
    }
}

const SLA_CHECK_INTERVAL_MS = 15 * 60 * 1000 // 15 minutes

export function startEscalationJob(payload: Payload): void {
    console.log('[EscalationJob] Starting SLA monitoring job (runs every 15 minutes)...')

    // Run immediately on startup
    checkSLABreaches(payload).catch(console.error)

    // Then on interval
    setInterval(() => {
        checkSLABreaches(payload).catch(console.error)
    }, SLA_CHECK_INTERVAL_MS)
}
