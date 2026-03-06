/**
 * workflowAction.ts
 * POST /api/workflows/action
 * Approve, reject, or comment on a workflow step.
 */

import type { PayloadHandler } from 'payload'
import { advanceWorkflow } from '../engine/workflowEngine'

export const workflowActionHandler: PayloadHandler = async (req) => {
    try {
        if (!req.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json?.() || {}
        const { instanceId, action, comment } = body as {
            instanceId?: string
            action?: 'approved' | 'rejected' | 'commented'
            comment?: string
        }

        if (!instanceId || !action) {
            return Response.json(
                { error: 'Missing required fields: instanceId, action' },
                { status: 400 },
            )
        }

        if (!['approved', 'rejected', 'commented'].includes(action)) {
            return Response.json(
                { error: 'action must be one of: approved, rejected, commented' },
                { status: 400 },
            )
        }

        const result = await advanceWorkflow({
            instanceId,
            action,
            actorId: (req.user as any).id,
            comment,
            payload: req.payload,
        })

        return Response.json({
            success: true,
            result,
        })
    } catch (err: any) {
        // Permission errors should return 403
        if (err.message?.includes('does not have permission') || err.message?.includes('Access denied')) {
            return Response.json({ error: err.message }, { status: 403 })
        }
        console.error('[POST /workflows/action] Error:', err)
        return Response.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
