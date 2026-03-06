/**
 * workflowStatus.ts
 * GET /api/workflows/status/:docId?collection=blogs
 * Returns active workflow instance + step info + full audit logs for a document.
 */

import type { PayloadHandler } from 'payload'

export const workflowStatusHandler: PayloadHandler = async (req) => {
    try {
        if (!req.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Extract docId from URL path
        const url = new URL(req.url)
        const pathParts = url.pathname.split('/')
        const docId = pathParts[pathParts.length - 1]

        const collectionSlug = url.searchParams.get('collection')

        if (!docId || !collectionSlug) {
            return Response.json(
                { error: 'Missing required: docId (URL param) and collection (query param)' },
                { status: 400 },
            )
        }

        // Find active instances
        const instanceResult = await req.payload.find({
            collection: 'workflow-instances',
            where: {
                and: [
                    { collectionSlug: { equals: collectionSlug } },
                    { documentId: { equals: docId } },
                ],
            },
            limit: 10,
            sort: '-createdAt',
        })

        const instance = instanceResult.docs[0] as any | undefined

        if (!instance) {
            return Response.json({
                success: true,
                docId,
                collectionSlug,
                hasActiveWorkflow: false,
                instance: null,
                steps: [],
                logs: [],
                currentStep: null,
            })
        }

        // Fetch workflow definition
        const workflow = await req.payload.findByID({
            collection: 'workflows',
            id: typeof instance.workflow === 'string' ? instance.workflow : instance.workflow?.id,
        }) as any

        // Sort steps by order
        const steps = [...(workflow?.steps || [])].sort((a: any, b: any) => a.order - b.order)
        const currentStep = steps.find((s: any) => s.stepId === instance.currentStepId) || null

        // Fetch logs for this document
        const logsResult = await req.payload.find({
            collection: 'workflow-logs',
            where: {
                and: [
                    { collectionSlug: { equals: collectionSlug } },
                    { documentId: { equals: docId } },
                ],
            },
            sort: '-timestamp',
            limit: 100,
        })

        return Response.json({
            success: true,
            docId,
            collectionSlug,
            hasActiveWorkflow: true,
            instance: {
                id: instance.id,
                status: instance.status,
                currentStepId: instance.currentStepId,
                currentStepIndex: instance.currentStepIndex,
                startedAt: instance.startedAt,
                completedAt: instance.completedAt,
                stepStartedAt: instance.stepStartedAt,
                workflowName: workflow?.name,
                workflowId: workflow?.id,
            },
            steps: steps.map((s: any, idx: number) => ({
                stepId: s.stepId,
                label: s.label,
                order: s.order,
                type: s.type,
                assignedRole: s.assignedRole,
                conditions: s.conditions,
                slaHours: s.slaHours,
                isCurrent: s.stepId === instance.currentStepId,
                isPast: idx < (instance.currentStepIndex || 0),
                status:
                    s.stepId === instance.currentStepId
                        ? instance.status
                        : idx < (instance.currentStepIndex || 0)
                            ? 'completed'
                            : 'pending',
            })),
            currentStep,
            logs: logsResult.docs,
        })
    } catch (err: any) {
        console.error('[GET /workflows/status/:docId] Error:', err)
        return Response.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
