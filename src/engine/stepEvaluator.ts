/**
 * stepEvaluator.ts
 * Safely evaluates step conditions against document data.
 * Supports: >, <, ==, !=, >=, <=
 * Examples: "amount > 10000", "status == draft", "amount >= 5000"
 * Does NOT use eval() — uses a safe custom parser.
 */

type Operator = '>=' | '<=' | '!=' | '==' | '>' | '<'

interface ParsedCondition {
    field: string
    operator: Operator
    value: string | number
}

function parseCondition(condition: string): ParsedCondition | null {
    // Match: fieldName operator value
    const regex = /^\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*(>=|<=|!=|==|>|<)\s*(.+)\s*$/
    const match = condition.trim().match(regex)
    if (!match) return null

    const [, field, operator, rawValue] = match
    // Try to parse as number, otherwise treat as string (strip quotes)
    let value: string | number = rawValue.trim().replace(/^['"]|['"]$/g, '')
    const numeric = parseFloat(value as string)
    if (!isNaN(numeric) && String(numeric) === (value as string)) {
        value = numeric
    }

    return { field, operator: operator as Operator, value }
}

function getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => {
        if (current == null) return undefined
        return current[key]
    }, obj)
}

export function evaluate(condition: string, docData: Record<string, any>): boolean {
    if (!condition || condition.trim() === '') return true

    // Support multiple conditions joined by AND
    const andParts = condition.split(/\bAND\b/i)
    for (const part of andParts) {
        const parsed = parseCondition(part.trim())
        if (!parsed) {
            console.warn(`[StepEvaluator] Could not parse condition: "${part.trim()}"`)
            // If condition is malformed, default to true (don't block the step)
            continue
        }

        const docValue = getNestedValue(docData, parsed.field)
        const { operator, value } = parsed

        let result = false
        const numDocValue = typeof docValue === 'number' ? docValue : parseFloat(String(docValue))
        const numCondValue = typeof value === 'number' ? value : parseFloat(String(value))

        if (!isNaN(numDocValue) && !isNaN(numCondValue)) {
            // Numeric comparison
            switch (operator) {
                case '>': result = numDocValue > numCondValue; break
                case '<': result = numDocValue < numCondValue; break
                case '>=': result = numDocValue >= numCondValue; break
                case '<=': result = numDocValue <= numCondValue; break
                case '==': result = numDocValue === numCondValue; break
                case '!=': result = numDocValue !== numCondValue; break
            }
        } else {
            // String comparison
            const strDoc = String(docValue ?? '').trim()
            const strCond = String(value).trim()
            switch (operator) {
                case '==': result = strDoc === strCond; break
                case '!=': result = strDoc !== strCond; break
                default:
                    console.warn(`[StepEvaluator] Operator "${operator}" not supported for string comparison.`)
                    result = true
            }
        }

        if (!result) return false
    }

    return true
}
