export function assert(v: any, msg?: string): asserts v {
    if (!v) {
        throw new Error(`Assertion error${msg ? `: ${msg}}` : ''}`)
    }
}

export function merge<T, U>(original: T, extended: U): T & U {
    const orig = original as any
    for (const key in extended) {
        const val = extended[key]
        if (!orig[key] || !val || typeof val != 'object') {
            if (Array.isArray(val)) {
                orig[key] = [...val]
            } else {
                orig[key] = val
            }
        } else {
            if (Array.isArray(orig[key])) {
                if (Array.isArray(val)) {
                    orig[key].push(...val)
                    continue
                } else {
                    throw new Error('cannot merge an array and a non array!')
                }
            }

            merge(orig[key], val)
        }
    }
    return orig
}
