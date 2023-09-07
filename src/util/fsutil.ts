//const fs: {
//    existsSync(path: string): boolean
//    mkdirSync(path: string, options?: { recursive: boolean }): void
//} = eval('require("fs")') /* eval for info suppress */
const fs: any = (0, eval)('require("fs")')

export function mkdirs(path: string) {
    if (! fs.existsSync(path)) { fs.mkdirSync(path, { recursive: true }) }
}

export function writeFile(path: string, obj: object): Promise<void> {
    return new Promise((resolve, reject) => {
        fs.writeFile(path, JSON.stringify(obj), (err: Error) => {
            if (err) {
                console.error('error writing file:', err)
                reject()
            } else {
                resolve()
            }
        })
    })
}

export function writeFileSync(path: string, obj: object) {
    fs.writeFileSync(path, JSON.stringify(obj))
}
