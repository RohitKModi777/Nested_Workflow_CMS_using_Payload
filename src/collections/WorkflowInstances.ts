import type { CollectionConfig } from 'payload'

export const WorkflowInstances: CollectionConfig = {
    slug: 'workflow-instances',
    admin: {
        useAsTitle: 'documentId',
        group: 'Workflow System',
        description: 'Live workflow state per document.',
    },
    access: {
        read: () => true,
        create: ({ req }) => Boolean(req.user),
        // Only the workflow engine should update instances, not admin UI users directly
        update: ({ req }) => {
            if (!req.user) return false
            const roles = (req.user as any).roles as string[]
            return roles?.includes('admin') || false
        },
        delete: ({ req }) => {
            if (!req.user) return false
            const roles = (req.user as any).roles as string[]
            return roles?.includes('admin') || false
        },
    },
    fields: [
        {
            name: 'workflow',
            type: 'relationship',
            relationTo: 'workflows',
            required: true,
            label: 'Workflow',
        },
        {
            name: 'collectionSlug',
            type: 'text',
            required: true,
            label: 'Collection Slug',
        },
        {
            name: 'documentId',
            type: 'text',
            required: true,
            label: 'Document ID',
        },
        {
            name: 'currentStepId',
            type: 'text',
            label: 'Current Step ID',
        },
        {
            name: 'currentStepIndex',
            type: 'number',
            label: 'Current Step Index',
            defaultValue: 0,
        },
        {
            name: 'status',
            type: 'select',
            required: true,
            defaultValue: 'pending',
            options: [
                { label: 'Pending', value: 'pending' },
                { label: 'In Progress', value: 'in-progress' },
                { label: 'Completed', value: 'completed' },
                { label: 'Rejected', value: 'rejected' },
                { label: 'Escalated', value: 'escalated' },
            ],
        },
        {
            name: 'startedAt',
            type: 'date',
            label: 'Started At',
        },
        {
            name: 'completedAt',
            type: 'date',
            label: 'Completed At',
        },
        {
            name: 'stepStartedAt',
            type: 'date',
            label: 'Current Step Started At',
            admin: {
                description: 'Used for SLA calculations.',
            },
        },
        {
            name: 'triggeredBy',
            type: 'relationship',
            relationTo: 'users',
            label: 'Triggered By',
        },
    ],
}
