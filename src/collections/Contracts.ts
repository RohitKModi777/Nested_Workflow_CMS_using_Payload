import type { CollectionConfig } from 'payload'

export const Contracts: CollectionConfig = {
    slug: 'contracts',
    admin: {
        useAsTitle: 'title',
        description: 'Legal contracts with multi-stage approval workflows.',
        group: 'Content',
    },
    access: {
        read: () => true,
        create: ({ req }) => Boolean(req.user),
        update: ({ req }) => Boolean(req.user),
        delete: ({ req }) => {
            if (!req.user) return false
            const roles = (req.user as any).roles as string[]
            return roles?.includes('admin') || false
        },
    },
    fields: [
        {
            name: 'title',
            type: 'text',
            required: true,
            label: 'Contract Title',
        },
        {
            name: 'body',
            type: 'richText',
            label: 'Contract Body',
        },
        {
            name: 'amount',
            type: 'number',
            label: 'Contract Amount ($)',
            admin: {
                description: 'Monetary value — used in workflow conditions (e.g. "amount > 10000").',
            },
        },
        {
            name: 'currency',
            type: 'select',
            defaultValue: 'USD',
            options: [
                { label: 'USD', value: 'USD' },
                { label: 'EUR', value: 'EUR' },
                { label: 'GBP', value: 'GBP' },
                { label: 'INR', value: 'INR' },
            ],
        },
        {
            name: 'parties',
            type: 'array',
            label: 'Parties Involved',
            fields: [
                {
                    name: 'name',
                    type: 'text',
                    label: 'Party Name',
                    required: true,
                },
                {
                    name: 'role',
                    type: 'text',
                    label: 'Role (e.g. Client, Vendor)',
                },
                {
                    name: 'email',
                    type: 'email',
                    label: 'Email',
                },
            ],
        },
        {
            name: 'status',
            type: 'select',
            defaultValue: 'draft',
            options: [
                { label: 'Draft', value: 'draft' },
                { label: 'Under Review', value: 'under-review' },
                { label: 'Pending Approval', value: 'pending-approval' },
                { label: 'Approved', value: 'approved' },
                { label: 'Rejected', value: 'rejected' },
                { label: 'Signed', value: 'signed' },
            ],
        },
        {
            name: 'startDate',
            type: 'date',
            label: 'Contract Start Date',
        },
        {
            name: 'endDate',
            type: 'date',
            label: 'Contract End Date',
        },
        {
            name: 'category',
            type: 'select',
            label: 'Category',
            options: [
                { label: 'Legal', value: 'legal' },
                { label: 'Procurement', value: 'procurement' },
                { label: 'HR', value: 'hr' },
                { label: 'Marketing', value: 'marketing' },
                { label: 'Technical', value: 'technical' },
            ],
        },
    ],
}
