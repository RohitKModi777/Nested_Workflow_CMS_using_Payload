import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { triggerWorkflowHandler } from '@/endpoints/triggerWorkflow'

export async function POST(request: Request): Promise<Response> {
    const payload = await getPayload({ config: configPromise })

    // Create a mock req object that matches PayloadHandler signature for our existing logic
    const mockReq = {
        url: request.url,
        json: async () => request.json(),
        payload,
        user: await payload.auth({ headers: request.headers }).then(res => res.user),
    } as any

    return triggerWorkflowHandler(mockReq)
}
