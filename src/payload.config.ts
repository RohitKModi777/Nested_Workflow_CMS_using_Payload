import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Workflows } from './collections/Workflows'
import { WorkflowInstances } from './collections/WorkflowInstances'
import { WorkflowLogs } from './collections/WorkflowLogs'
import { Blog } from './collections/Blog'
import { Contracts } from './collections/Contracts'
import { workflowPlugin } from './plugins/workflowPlugin'
import { triggerWorkflowHandler } from './endpoints/triggerWorkflow'
import { workflowStatusHandler } from './endpoints/workflowStatus'
import { workflowActionHandler } from './endpoints/workflowAction'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '— Workflow CMS',
    },
  },
  collections: [Users, Media, Workflows, WorkflowInstances, WorkflowLogs, Blog, Contracts],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URL || '',
  }),
  sharp,
  // ── Custom REST Endpoints ────────────────────────────────────────
  endpoints: [
    {
      path: '/workflows/trigger',
      method: 'post',
      handler: triggerWorkflowHandler,
    },
    {
      path: '/workflows/status/:docId',
      method: 'get',
      handler: workflowStatusHandler,
    },
    {
      path: '/workflows/action',
      method: 'post',
      handler: workflowActionHandler,
    },
  ],
  // ── Workflow Plugin: watches blogs and contracts dynamically ─────
  plugins: [
    workflowPlugin({
      watchedCollections: ['blogs', 'contracts'],
      enableEscalation: true,
    }),
  ],
})
