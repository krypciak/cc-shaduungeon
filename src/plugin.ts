import { DungeonBuilder } from '@root/dungeon/dungeon-builder'
import { VimLogic } from '../node_modules/cc-vim/src/logic'
import { AreaDrawer } from '@root/area/area-drawer'
import { Blitzkrieg } from '@root/types'
import { overrideMapAreaContainer } from '@root/area/custom-MapAreaContainer'
import { poststartGameStart, prestartGameStart, startDnggenGame } from '@root/game-start'
import { DungeonPaths } from '@root/dungeon/dungeon-paths'

declare const vim: VimLogic

declare global {
    const blitzkrieg: Blitzkrieg
    const dnggen: DngGen
    interface Window {
        dnggen: DngGen
    }
}

function addVimBindings() {
    if (vim) { /* optional dependency https://github.com/krypciak/cc-vim */
        const isInGenMap = (ingame: boolean) => ingame && ig.game.mapName.startsWith('dnggen')
        vim.addAlias('dnggen', 'generate-dungeon', 'Generate dungeon', 'global', (roomTp: string = '0') => {
            vim.executeString('title-screen')
            dnggen.debug.roomTp = parseInt(roomTp)
            startDnggenGame()
        }, [{
            type: 'number', description: 'room to teleport to'
        }])
        vim.addAlias('dnggen', 'skip-battle', 'Skips the battle', isInGenMap, () => { ig.vars.set('map.battle1done', true) })
    }
}

interface DngGenDebug {
    pastePuzzle: boolean
    decorateBattleRoom: boolean
    trimAreas: boolean
    collisionlessMapArrange: boolean
    dontDiscoverAllMaps: boolean
    areaMapConnections: boolean
    roomTp: number
}

export default class DngGen {
    dir: string
    mod: Mod1
    dungeonBuilder!: DungeonBuilder
    areaDrawer!: AreaDrawer

    debug: DngGenDebug = {
        /* if all all true everything should be as intended */
        pastePuzzle: true,
        decorateBattleRoom: true,
        trimAreas: true,
        collisionlessMapArrange: true,
        dontDiscoverAllMaps: false,
        areaMapConnections: true,
        roomTp: 0,
    }

    constructor(mod: Mod1) {
        this.dir = mod.baseDirectory
        this.mod = mod
        window.dnggen = this
        // @ts-expect-error
        this.mod.isCCL3 = mod.findAllAssets ? true : false
    }

    async prestart() {
        if (! blitzkrieg) { return }

        this.dungeonBuilder = new DungeonBuilder()

        DungeonPaths.registerAutoLoadDungeon()
        addVimBindings()
        prestartGameStart()

        this.areaDrawer = new AreaDrawer()
    }

    async poststart() {
        overrideMapAreaContainer()
        poststartGameStart()
    }
}
