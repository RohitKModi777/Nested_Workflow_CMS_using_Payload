/**
 * workflowPlugin.ts
 * Payload CMS plugin that dynamically attaches workflow hooks
 * to any configured collection. No collection names are hardcoded.
 */

import type { Config } from 'payload'
import { triggerWorkflowForDocument } from '../engine/workflowEngine'
import { startEscalationJob } from '../engine/escalationJob'

export interface WorkflowPluginOptions {
    /** Collection slugs to watch for workflow triggering */
    watchedCollections: string[]
    /** Whether to start the SLA escalation job on server init */
    enableEscalation?: boolean
}

export const workflowPlugin =
    (options: WorkflowPluginOptions) =>
        (config: Config): Config => {
            const { watchedCollections, enableEscalation = true } = options

            // ── 1. Dynamically patch each watched collection with afterChange hook ──
            const updatedCollections = config.collections?.map((collection) => {
                if (!watchedCollections.includes(collection.slug)) return collection

                const existingHooks = collection.hooks || {}
                const existingAfterChange = existingHooks.afterChange || []

                return {
                    ...collection,
                    fields: [
                        {
                            name: 'workflowPanel',
                            type: 'ui',
                            admin: {
                                position: 'sidebar',
                                components: {
                                    Field: '@/components/WorkflowPanel/WorkflowPanel#WorkflowPanel',
                                },
                            },
                        },
                        ...collection.fields,
                    ],
                    hooks: {
                        ...existingHooks,
                        afterChange: [
                            ...existingAfterChange,
                            async ({ doc, req, operation }: any) => {
                                // Only trigger on create or update
                                if (operation !== 'create' && operation !== 'update') return doc

                                const payload = req.payload
                                const actorId = req.user?.id

                                console.log(
                                    `[WorkflowPlugin] Detected ${operation} on collection "${collection.slug}" doc "${doc.id}"`,
                                )

                                try {
                                    await triggerWorkflowForDocument({
                                        collectionSlug: collection.slug,
                                        documentId: doc.id,
                                        docData: doc,
                                        actorId,
                                        payload,
                                    })
                                } catch (err) {
                                    console.error(
                                        `[WorkflowPlugin] Error triggering workflow for ${collection.slug}/${doc.id}:`,
                                        err,
                                    )
                                }

                                return doc
                            },
                        ],
                        // ── Permission-based step locking via beforeOperation ──────────────
                        beforeOperation: [
                            ...(existingHooks.beforeOperation || []),
                            async ({ req, operation, id }: any) => {
                                // Only apply locking on update operations to watched collections
                                if (operation !== 'update' || !id || !req.user) return

                                const payload = req.payload
                                const actor = req.user as any
                                const actorRoles: string[] = actor.roles || []

                                // Admins bypass all locks
                                if (actorRoles.includes('admin')) return

                                // Check if there's an in-progress workflow instance for this doc
                                const instances = await payload.find({
                                    collection: 'workflow-instances',
                                    where: {
                                        and: [
                                            { collectionSlug: { equals: collection.slug } },
                                            { documentId: { equals: String(id) } },
                                            { status: { in: ['in-progress', 'escalated'] } },
                                        ],
                                    },
                                    limit: 1,
                                })

                                if (!instances.docs.length) return

                                const instance = instances.docs[0] as any
                                const workflow = await payload.findByID({
                                    collection: 'workflows',
                                    id: typeof instance.workflow === 'string' ? instance.workflow : instance.workflow.id,
                                }) as any

                                const currentStep = (workflow?.steps || []).find(
                                    (s: any) => s.stepId === instance.currentStepId,
                                )
                                if (!currentStep) return

                                // Check if actor has permission for the current step
                                const assignedRole = currentStep.assignedRole
                                const assignedUserId =
                                    typeof currentStep.assignedUser === 'string'
                                        ? currentStep.assignedUser
                                        : currentStep.assignedUser?.id

                                const hasRoleAccess = assignedRole && actorRoles.includes(assignedRole)
                                const hasUserAccess = assignedUserId && assignedUserId === actor.id

                                if (!hasRoleAccess && !hasUserAccess) {
                                    throw new Error(
                                        `Access denied: Document is locked at workflow step "${currentStep.label}". ` +
                                        `Required role: ${assignedRole || 'specific user'}. Your roles: ${actorRoles.join(', ')}.`,
                                    )
                                }
                            },
                        ],
                    },
                }
            })

            // ── 2. Register onInit to start the escalation job ────────────────────
            const existingOnInit = config.onInit

            return {
                ...config,
                collections: updatedCollections,
                onInit: async (payload) => {
                    if (existingOnInit) await existingOnInit(payload)

                    if (enableEscalation) {
                        startEscalationJob(payload)
                    }

                    console.log(
                        `[WorkflowPlugin] Initialized. Watching collections: ${watchedCollections.join(', ')}`,
                    )
                },
            }
        }
