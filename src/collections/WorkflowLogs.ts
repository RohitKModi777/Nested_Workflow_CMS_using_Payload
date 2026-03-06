import type { CollectionConfig } from 'payload'

export const WorkflowLogs: CollectionConfig = {
    slug: 'workflow-logs',
    admin: {
        useAsTitle: 'action',
        group: 'Workflow System',
        description: 'Immutable audit trail of all workflow actions.',
    },
    // IMMUTABLE: No one can update or delete logs
    access: {
        read: () => true,
        create: ({ req }) => Boolean(req.user),
        update: () => false,
        delete: () => false,
    },
    hooks: {
        beforeChange: [
            ({ operation }) => {
                if (operation === 'update') {
                    throw new Error('WorkflowLogs are immutable and cannot be edited.')
                }
            },
        ],
    },
    fields: [
        {
            name: 'instance',
            type: 'relationship',
            relationTo: 'workflow-instances',
            label: 'Workflow Instance',
        },
        {
            name: 'workflowId',
            type: 'text',
            required: true,
            label: 'Workflow ID',
        },
        {
            name: 'workflowName',
            type: 'text',
            label: 'Workflow Name',
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
            name: 'stepId',
            type: 'text',
            required: true,
            label: 'Step ID',
        },
        {
            name: 'stepLabel',
            type: 'text',
            label: 'Step Label',
        },
        {
            name: 'actor',
            type: 'relationship',
            relationTo: 'users',
            label: 'Actor (User)',
        },
        {
            name: 'actorName',
            type: 'text',
            label: 'Actor Name (snapshot)',
        },
        {
            name: 'action',
            type: 'select',
            required: true,
            options: [
                { label: 'Workflow Started', value: 'started' },
                { label: 'Approved', value: 'approved' },
                { label: 'Rejected', value: 'rejected' },
                { label: 'Commented', value: 'commented' },
                { label: 'Escalated', value: 'escalated' },
                { label: 'Completed', value: 'completed' },
                { label: 'Step Skipped (Condition)', value: 'skipped' },
            ],
        },
        {
            name: 'comment',
            type: 'textarea',
            label: 'Comment',
        },
        {
            name: 'outcome',
            type: 'text',
            label: 'Outcome',
        },
        {
            name: 'timestamp',
            type: 'date',
            required: true,
            label: 'Timestamp',
            admin: {
                readOnly: true,
            },
        },
        {
            name: 'metadata',
            type: 'json',
            label: 'Additional Metadata',
            admin: {
                description: 'Extra context captured at the time of the action.',
            },
        },
    ],
}
