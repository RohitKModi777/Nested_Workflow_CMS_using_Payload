import type { CollectionConfig } from 'payload'

export const Workflows: CollectionConfig = {
    slug: 'workflows',
    admin: {
        useAsTitle: 'name',
        description: 'Define reusable workflow templates with multi-stage steps.',
        group: 'Workflow System',
    },
    access: {
        read: () => true,
        create: ({ req }) => Boolean(req.user),
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
            name: 'name',
            type: 'text',
            required: true,
            label: 'Workflow Name',
        },
        {
            name: 'description',
            type: 'textarea',
            label: 'Description',
        },
        {
            name: 'targetCollections',
            type: 'array',
            label: 'Target Collections (slugs)',
            minRows: 1,
            required: true,
            admin: {
                description: 'Enter collection slugs (e.g. blogs, contracts). This workflow will attach to these collections dynamically.',
            },
            fields: [
                {
                    name: 'collectionSlug',
                    type: 'text',
                    required: true,
                    label: 'Collection Slug',
                },
            ],
        },
        {
            name: 'steps',
            type: 'array',
            label: 'Workflow Steps',
            minRows: 1,
            required: true,
            fields: [
                {
                    name: 'stepId',
                    type: 'text',
                    required: true,
                    label: 'Step ID (unique identifier)',
                    admin: {
                        description: 'Unique identifier for this step, e.g. "editor-review", "manager-approval"',
                    },
                },
                {
                    name: 'label',
                    type: 'text',
                    required: true,
                    label: 'Step Label',
                },
                {
                    name: 'order',
                    type: 'number',
                    required: true,
                    label: 'Step Order',
                    admin: {
                        description: 'Determines the sequence. Steps are executed in ascending order.',
                    },
                },
                {
                    name: 'type',
                    type: 'select',
                    required: true,
                    label: 'Step Type',
                    options: [
                        { label: 'Approval', value: 'approval' },
                        { label: 'Review', value: 'review' },
                        { label: 'Sign-off', value: 'sign-off' },
                        { label: 'Comment Only', value: 'comment-only' },
                    ],
                },
                {
                    name: 'assignedRole',
                    type: 'select',
                    label: 'Assigned Role',
                    options: [
                        { label: 'Admin', value: 'admin' },
                        { label: 'Manager', value: 'manager' },
                        { label: 'Editor', value: 'editor' },
                        { label: 'Reviewer', value: 'reviewer' },
                    ],
                    admin: {
                        description: 'If set, any user with this role can act on this step.',
                    },
                },
                {
                    name: 'assignedUser',
                    type: 'relationship',
                    relationTo: 'users',
                    label: 'Assigned Specific User',
                    admin: {
                        description: 'If set, overrides role — only this user can act on this step.',
                    },
                },
                {
                    name: 'conditions',
                    type: 'textarea',
                    label: 'Step Conditions (optional)',
                    admin: {
                        description:
                            'Condition expression to evaluate before activating this step. Supports: >, <, ==, !=, >=, <=. E.g. "amount > 10000" or "status == draft".',
                    },
                },
                {
                    name: 'slaHours',
                    type: 'number',
                    label: 'SLA (hours)',
                    admin: {
                        description: 'If set, this step auto-escalates if not completed within this many hours.',
                    },
                },
                // Bonus: conditional branching
                {
                    name: 'onApprove',
                    type: 'text',
                    label: 'On Approve → Go to Step ID',
                    admin: {
                        description: 'Optional: step ID to jump to when this step is approved. Leave blank for sequential flow.',
                    },
                },
                {
                    name: 'onReject',
                    type: 'text',
                    label: 'On Reject → Go to Step ID',
                    admin: {
                        description: 'Optional: step ID to jump to when this step is rejected. Leave blank to end workflow on rejection.',
                    },
                },
            ],
        },
        {
            name: 'isActive',
            type: 'checkbox',
            label: 'Active',
            defaultValue: true,
            admin: {
                description: 'Disable to prevent this workflow from being triggered.',
            },
        },
    ],
}
