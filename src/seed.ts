/**
 * seed.ts
 * Run with: npx ts-node --esm src/seed.ts
 * OR via npm script: npm run seed
 *
 * Creates:
 *   - 2 users  (admin + reviewer)
 *   - 2 workflow templates (Blog Review Flow, Contract Approval Flow)
 *   - 1 blog post
 *   - 1 contract (amount: 15000 – triggers high-value condition)
 */

import payload from 'payload'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { fileURLToPath } from 'url'
import 'dotenv/config'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

async function seed() {
    await payload.init({
        secret: process.env.PAYLOAD_SECRET || 'seed-secret',
        db: mongooseAdapter({ url: process.env.DATABASE_URL || 'mongodb://127.0.0.1/workflow-cms' }),
        editor: lexicalEditor(),
        local: true,
    } as any)

    console.log('\n🌱 Starting seed...\n')

    // ── 1. Create Admin user ─────────────────────────────────────────
    let admin: any
    try {
        admin = await payload.create({
            collection: 'users',
            data: {
                name: 'Admin User',
                email: 'admin@demo.com',
                password: 'Admin1234!',
                roles: ['admin'],
            } as any,
        })
        console.log('✅ Created admin user: admin@demo.com')
    } catch {
        const existing = await payload.find({ collection: 'users', where: { email: { equals: 'admin@demo.com' } } })
        admin = existing.docs[0]
        console.log('⚠️  Admin user already exists, using existing.')
    }

    // ── 2. Create Reviewer user ──────────────────────────────────────
    let reviewer: any
    try {
        reviewer = await payload.create({
            collection: 'users',
            data: {
                name: 'Reviewer User',
                email: 'reviewer@demo.com',
                password: 'Review1234!',
                roles: ['reviewer'],
            } as any,
        })
        console.log('✅ Created reviewer user: reviewer@demo.com')
    } catch {
        const existing = await payload.find({ collection: 'users', where: { email: { equals: 'reviewer@demo.com' } } })
        reviewer = existing.docs[0]
        console.log('⚠️  Reviewer user already exists, using existing.')
    }

    // ── 3. Create Editor user ────────────────────────────────────────
    let editor: any
    try {
        editor = await payload.create({
            collection: 'users',
            data: {
                name: 'Editor User',
                email: 'editor@demo.com',
                password: 'Editor1234!',
                roles: ['editor'],
            } as any,
        })
        console.log('✅ Created editor user: editor@demo.com')
    } catch {
        const existing = await payload.find({ collection: 'users', where: { email: { equals: 'editor@demo.com' } } })
        editor = existing.docs[0]
        console.log('⚠️  Editor user already exists, using existing.')
    }

    // ── 4. Create Manager user ───────────────────────────────────────
    let manager: any
    try {
        manager = await payload.create({
            collection: 'users',
            data: {
                name: 'Manager User',
                email: 'manager@demo.com',
                password: 'Manager1234!',
                roles: ['manager'],
            } as any,
        })
        console.log('✅ Created manager user: manager@demo.com')
    } catch {
        const existing = await payload.find({ collection: 'users', where: { email: { equals: 'manager@demo.com' } } })
        manager = existing.docs[0]
        console.log('⚠️  Manager user already exists, using existing.')
    }

    // ── 5. Blog Review Workflow ──────────────────────────────────────
    let blogWorkflow: any
    try {
        blogWorkflow = await payload.create({
            collection: 'workflows',
            data: {
                name: 'Blog Review Flow',
                description: 'Two-stage review process for blog posts before publication.',
                targetCollections: [{ collectionSlug: 'blogs' }],
                isActive: true,
                steps: [
                    {
                        stepId: 'editor-review',
                        label: 'Editor Review',
                        order: 1,
                        type: 'review',
                        assignedRole: 'editor',
                        conditions: '',
                        slaHours: 24,
                    },
                    {
                        stepId: 'manager-approval',
                        label: 'Manager Approval',
                        order: 2,
                        type: 'approval',
                        assignedRole: 'manager',
                        conditions: '',
                        slaHours: 12,
                    },
                ],
            } as any,
        })
        console.log('✅ Created workflow: Blog Review Flow')
    } catch (e) {
        console.error('❌ Failed to create Blog workflow:', e)
    }

    // ── 6. Contract Approval Workflow ────────────────────────────────
    let contractWorkflow: any
    try {
        contractWorkflow = await payload.create({
            collection: 'workflows',
            data: {
                name: 'Contract Approval Flow',
                description: 'Three-stage contract approval with high-value condition check.',
                targetCollections: [{ collectionSlug: 'contracts' }],
                isActive: true,
                steps: [
                    {
                        stepId: 'reviewer-check',
                        label: 'Reviewer Check',
                        order: 1,
                        type: 'review',
                        assignedRole: 'reviewer',
                        conditions: '',
                        slaHours: 48,
                    },
                    {
                        stepId: 'high-value-manager',
                        label: 'High-Value Manager Sign-off',
                        order: 2,
                        type: 'sign-off',
                        assignedRole: 'manager',
                        conditions: 'amount > 10000',
                        slaHours: 24,
                    },
                    {
                        stepId: 'final-admin-approval',
                        label: 'Final Admin Approval',
                        order: 3,
                        type: 'approval',
                        assignedRole: 'admin',
                        conditions: '',
                        slaHours: 12,
                    },
                ],
            } as any,
        })
        console.log('✅ Created workflow: Contract Approval Flow')
    } catch (e) {
        console.error('❌ Failed to create Contract workflow:', e)
    }

    // ── 7. Sample Blog Post ──────────────────────────────────────────
    try {
        await payload.create({
            collection: 'blogs',
            data: {
                title: 'Getting Started with Payload CMS',
                slug: 'getting-started-payload-cms',
                excerpt: 'A comprehensive guide to setting up and configuring Payload CMS for your project.',
                status: 'draft',
                author: admin.id,
                tags: [{ tag: 'cms' }, { tag: 'tutorial' }, { tag: 'payload' }],
            } as any,
        })
        console.log('✅ Created sample blog post')
    } catch (e) {
        console.error('❌ Failed to create blog post:', e)
    }

    // ── 8. Sample Contract (high value — triggers condition) ─────────
    try {
        await payload.create({
            collection: 'contracts',
            data: {
                title: 'Software Development Services Agreement',
                amount: 15000,
                currency: 'USD',
                status: 'draft',
                category: 'technical',
                parties: [
                    { name: 'WeframeTech Solutions PVT Ltd', role: 'Vendor', email: 'legal@weframetech.com' },
                    { name: 'Acme Corporation', role: 'Client', email: 'contracts@acme.com' },
                ],
                startDate: new Date('2026-04-01').toISOString(),
                endDate: new Date('2026-09-30').toISOString(),
            } as any,
        })
        console.log('✅ Created sample contract (amount: $15,000 — will trigger high-value condition)')
    } catch (e) {
        console.error('❌ Failed to create contract:', e)
    }

    console.log('\n🎉 Seed complete!\n')
    console.log('Demo credentials:')
    console.log('  Admin    → admin@demo.com    / Admin1234!')
    console.log('  Reviewer → reviewer@demo.com / Review1234!')
    console.log('  Editor   → editor@demo.com   / Editor1234!')
    console.log('  Manager  → manager@demo.com  / Manager1234!')
    console.log('\nVisit: http://localhost:3000/admin\n')
    process.exit(0)
}

seed().catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
})
