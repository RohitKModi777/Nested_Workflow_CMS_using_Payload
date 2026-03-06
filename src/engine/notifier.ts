/**
 * notifier.ts
 * Simulates email notifications via console.log.
 * In production, replace console.log with nodemailer / SendGrid / etc.
 */

export interface NotificationContext {
    stepId: string
    stepLabel: string
    stepType: string
    assignedRole?: string
    assignedUser?: { id: string; email: string; name: string } | null
    documentId: string
    collectionSlug: string
    workflowName: string
    action?: string
}

export function notifyAssignee(ctx: NotificationContext): void {
    const target = ctx.assignedUser
        ? `${ctx.assignedUser.name} <${ctx.assignedUser.email}>`
        : `all users with role: ${ctx.assignedRole}`

    console.log(`\n📧 [Notifier] ─────────────────────────────────────────`)
    console.log(`  Workflow  : ${ctx.workflowName}`)
    console.log(`  Step      : [${ctx.stepId}] ${ctx.stepLabel} (${ctx.stepType})`)
    console.log(`  Document  : ${ctx.collectionSlug}/${ctx.documentId}`)
    console.log(`  Assigned  : ${target}`)
    console.log(`  Action    : Step is now ACTIVE — awaiting action`)
    console.log(`  [Email simulated] Subject: "Action Required: ${ctx.stepLabel}"`)
    console.log(`  [Email simulated] Body: Please review document ${ctx.documentId} in the ${ctx.collectionSlug} collection.`)
    console.log(`────────────────────────────────────────────────────────\n`)
}

export function notifyCompletion(ctx: NotificationContext & { outcome: string }): void {
    console.log(`\n✅ [Notifier] ─────────────────────────────────────────`)
    console.log(`  Workflow  : ${ctx.workflowName}`)
    console.log(`  Document  : ${ctx.collectionSlug}/${ctx.documentId}`)
    console.log(`  Outcome   : ${ctx.outcome.toUpperCase()}`)
    console.log(`  [Email simulated] Subject: "Workflow Completed: ${ctx.workflowName}"`)
    console.log(`────────────────────────────────────────────────────────\n`)
}

export function notifyEscalation(ctx: NotificationContext & { slaHours: number }): void {
    console.log(`\n⚠️  [Notifier – ESCALATION] ──────────────────────────`)
    console.log(`  Workflow  : ${ctx.workflowName}`)
    console.log(`  Step      : [${ctx.stepId}] ${ctx.stepLabel}`)
    console.log(`  Document  : ${ctx.collectionSlug}/${ctx.documentId}`)
    console.log(`  SLA       : ${ctx.slaHours} hours EXCEEDED`)
    console.log(`  [Email simulated] Subject: "⚠️ SLA Breach: ${ctx.stepLabel} overdue"`)
    console.log(`  [Email simulated] Body: Step "${ctx.stepLabel}" has exceeded its ${ctx.slaHours}-hour SLA. Please act immediately.`)
    console.log(`────────────────────────────────────────────────────────\n`)
}

export function notifyRejection(ctx: NotificationContext & { comment?: string }): void {
    console.log(`\n❌ [Notifier] ─────────────────────────────────────────`)
    console.log(`  Workflow  : ${ctx.workflowName}`)
    console.log(`  Step      : [${ctx.stepId}] ${ctx.stepLabel}`)
    console.log(`  Document  : ${ctx.collectionSlug}/${ctx.documentId}`)
    console.log(`  Rejected  : ${ctx.comment || 'No comment provided'}`)
    console.log(`  [Email simulated] Subject: "Document Rejected: ${ctx.workflowName}"`)
    console.log(`────────────────────────────────────────────────────────\n`)
}
