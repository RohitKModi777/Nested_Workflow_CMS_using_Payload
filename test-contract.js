import { writeFileSync } from 'fs'

async function testContractWorkflow() {
    const baseURL = 'http://localhost:3000'
    const out = { logs: [] }

    try {
        const loginRes = await fetch(`${baseURL}/api/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@demo.com', password: 'Admin1234!' })
        })
        const loginData = await loginRes.json()
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `JWT ${loginData.token}`
        }

        // 1. Create a Workflow Template for Contracts
        out.logs.push('Creating Contract Workflow...')
        const wfRes = await fetch(`${baseURL}/api/workflows`, {
            method: 'POST', headers, body: JSON.stringify({
                name: 'Enterprise Contract Flow',
                description: 'Multi-stage approval for high-value contracts',
                isActive: true,
                targetCollections: [{ collectionSlug: 'contracts' }],
                steps: [
                    {
                        stepId: 'manager-review', label: 'Manager Review', type: 'approval', order: 1, assignedRole: 'manager', slaHours: 24
                    },
                    {
                        stepId: 'high-value-signoff', label: 'High Value Sign-off', type: 'approval', order: 2, assignedRole: 'admin', slaHours: 24,
                        conditions: 'amount > 10000'
                    }
                ]
            })
        })
        const workflow = await wfRes.json()
        out.workflowId = workflow?.doc?.id || workflow

        // 2. Create the Contract ($15000 should trigger both steps)
        out.logs.push('Creating Contract ($15000)...')
        const createRes = await fetch(`${baseURL}/api/contracts`, {
            method: 'POST', headers, body: JSON.stringify({
                title: 'Acme Corp Enterprise Deal', amount: 15000, currency: 'USD', status: 'under-review'
            })
        })
        const contract = await createRes.json()
        out.contractId = contract?.doc?.id || contract

        await new Promise(r => setTimeout(r, 2000))

        // 3. Status After Create
        const statusRes = await fetch(`${baseURL}/api/workflows/status/${contract.doc.id}?collection=contracts`, { headers })
        out.statusAfterCreate = await statusRes.json()

        if (out.statusAfterCreate?.instance?.id) {
            out.logs.push('Approving First Step...')
            const actionRes = await fetch(`${baseURL}/api/workflows/action`, {
                method: 'POST', headers, body: JSON.stringify({
                    instanceId: out.statusAfterCreate.instance.id, action: 'approved', comment: 'Manager Approved'
                })
            })
            out.actionResult = await actionRes.json()

            const statusRes2 = await fetch(`${baseURL}/api/workflows/status/${contract.doc.id}?collection=contracts`, { headers })
            out.statusAfterAction = await statusRes2.json()
        }

        out.logs.push('Fetching Audit Logs...')
        const logsRes = await fetch(`${baseURL}/api/workflow-logs?where[documentId][equals]=${contract?.doc?.id}`, { headers })
        out.auditLogs = await logsRes.json()

    } catch (err) {
        out.error = String(err)
    }

    writeFileSync('test-out.json', JSON.stringify(out, null, 2))
}

testContractWorkflow();
