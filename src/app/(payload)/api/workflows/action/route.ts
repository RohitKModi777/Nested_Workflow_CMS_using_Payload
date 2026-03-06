import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { workflowActionHandler } from '@/endpoints/workflowAction'

export async function POST(request: Request): Promise<Response> {
    const payload = await getPayload({ config: configPromise })

    const mockReq = {
        url: request.url,
        json: async () => request.json(),
        payload,
        user: await payload.auth({ headers: request.headers }).then(res => res.user),
    } as any

    return workflowActionHandler(mockReq)
}
