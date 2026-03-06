import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { workflowStatusHandler } from '@/endpoints/workflowStatus'

export async function GET(
    request: Request,
    { params }: { params: { docId: string } }
): Promise<Response> {
    const payload = await getPayload({ config: configPromise })

    const mockReq = {
        url: request.url,
        payload,
        user: await payload.auth({ headers: request.headers }).then(res => res.user),
    } as any

    return workflowStatusHandler(mockReq)
}
