import { registerOpts } from './options'
import './setup'
import { Mod1 } from 'cc-blitzkrieg/src/types'
import ccmod from '../ccmod.json'
import { RuntimeResources } from './util/runtime-assets'
import { injectGameStarting } from './util/game-start'
import * as _ from 'ultimate-crosscode-typedefs'
import { DungeonPaths } from './dungeon/paths'

export default class DngGen {
    static dir: string
    static mod: Mod1
    static manifset: typeof import('../ccmod.json') = ccmod

    constructor(mod: Mod1) {
        DngGen.dir = mod.baseDirectory
        DngGen.mod = mod
        DngGen.mod.isCCL3 = mod.findAllAssets ? true : false
        DngGen.mod.isCCModPacked = mod.baseDirectory.endsWith('.ccmod/')
    }

    async prestart() {
        registerOpts()
        import('./util/title-screen-button')
        injectGameStarting()
        import('./area/custom-area-container')
        DungeonPaths.registerAutoLoadDungeon()
    }

    async poststart() {
        import('./util/map-style-fix')

        RuntimeResources.reload()
    }
}
