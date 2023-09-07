const fs: any = (0, eval)('require("fs")')
const path: any = (0, eval)('require("path")')

export class FsUtil {
    static mkdirs(path: string) {
        if (! fs.existsSync(path)) { fs.mkdirSync(path, { recursive: true }) }
    }
    
    static writeFile(path: string, obj: object): Promise<void> {
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
    static writeFileSync(path: string, obj: object) {
        fs.writeFileSync(path, JSON.stringify(obj))
    }

    static readFileSync(path: string): string {
        return fs.readFileSync(path)
    }
    
    static doesFileExist(path: string): boolean {
        return fs.existsSync(path)
    }
    
    static listFiles(path: string): string[] {
        return fs.readdirSync(path)
    }
    
    static basename(path1: string): string {
        return path.basename(path1)
    }

}
