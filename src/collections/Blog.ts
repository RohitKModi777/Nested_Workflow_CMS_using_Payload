import type { CollectionConfig } from 'payload'

export const Blog: CollectionConfig = {
    slug: 'blogs',
    admin: {
        useAsTitle: 'title',
        description: 'Blog posts with workflow approval support.',
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
            label: 'Title',
        },
        {
            name: 'slug',
            type: 'text',
            label: 'Slug',
            admin: {
                description: 'URL-friendly identifier (auto-filled from title if left empty).',
            },
        },
        {
            name: 'content',
            type: 'richText',
            label: 'Content',
        },
        {
            name: 'excerpt',
            type: 'textarea',
            label: 'Excerpt',
        },
        {
            name: 'author',
            type: 'relationship',
            relationTo: 'users',
            label: 'Author',
        },
        {
            name: 'status',
            type: 'select',
            defaultValue: 'draft',
            options: [
                { label: 'Draft', value: 'draft' },
                { label: 'Under Review', value: 'under-review' },
                { label: 'Published', value: 'published' },
                { label: 'Rejected', value: 'rejected' },
            ],
        },
        {
            name: 'tags',
            type: 'array',
            label: 'Tags',
            fields: [
                {
                    name: 'tag',
                    type: 'text',
                },
            ],
        },
        {
            name: 'publishedAt',
            type: 'date',
            label: 'Published At',
        },
    ],
}
