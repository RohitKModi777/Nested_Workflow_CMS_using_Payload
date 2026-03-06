/**
 * triggerWorkflow.ts
 * POST /api/workflows/trigger
 * Manually trigger or restart a workflow on a document.
 */

import type { PayloadHandler } from 'payload'
import { triggerWorkflowForDocument } from '../engine/workflowEngine'

export const triggerWorkflowHandler: PayloadHandler = async (req) => {
    try {
        if (!req.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json?.() || {}
        const { workflowId, collectionSlug, documentId } = body as {
            workflowId?: string
            collectionSlug?: string
            documentId?: string
        }

        if (!collectionSlug || !documentId) {
            return Response.json(
                { error: 'Missing required fields: collectionSlug, documentId' },
                { status: 400 },
            )
        }

        // Fetch the document data for condition evaluation
        let docData: Record<string, any> = {}
        try {
            const doc = await req.payload.findByID({
                collection: collectionSlug as any,
                id: documentId,
            })
            docData = doc as Record<string, any>
        } catch {
            return Response.json({ error: `Document not found: ${collectionSlug}/${documentId}` }, { status: 404 })
        }

        await triggerWorkflowForDocument({
            collectionSlug,
            documentId,
            docData,
            actorId: (req.user as any).id,
            payload: req.payload,
            forceNew: true,
        })

        // Get the created instance
        const instances = await req.payload.find({
            collection: 'workflow-instances',
            where: {
                and: [
                    { collectionSlug: { equals: collectionSlug } },
                    { documentId: { equals: documentId } },
                    { status: { in: ['in-progress', 'pending'] } },
                ],
            },
            limit: 5,
        })

        const instance = instances.docs[0] as any

        return Response.json({
            success: true,
            message: `Workflow triggered for ${collectionSlug}/${documentId}`,
            instanceId: instance?.id,
            currentStep: instance?.currentStepId,
            status: instance?.status,
        })
    } catch (err: any) {
        console.error('[POST /workflows/trigger] Error:', err)
        return Response.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
