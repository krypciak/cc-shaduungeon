export let fs: typeof import('fs')

export async function initLibraries() {
    if ('window' in global) {
        fs = (0, eval)("require('fs')")
    } else {
        fs = await import('fs')
    }
}
