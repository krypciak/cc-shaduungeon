import { registerOpts } from './options'
import './setup'
import { Mod1 } from 'cc-blitzkrieg/src/types'
import ccmod from '../ccmod.json'

declare global {
    let dnggen: DngGen
    interface Window {
        dnggen: DngGen
    }
    namespace NodeJS {
        interface Global {
            dnggen: DngGen
        }
    }
}

export default class DngGen {
    dir: string
    mod: Mod1
    manifset: typeof import('../ccmod.json') = ccmod

    constructor(mod: Mod1) {
        this.dir = mod.baseDirectory
        this.mod = mod
        this.mod.isCCL3 = mod.findAllAssets ? true : false
        this.mod.isCCModPacked = mod.baseDirectory.endsWith('.ccmod/')

        if ('window' in global) {
            window.dnggen = this
        } else {
            global.dnggen = this
        }
    }

    async prestart() {
        registerOpts()
    }

    async poststart() {}
}
