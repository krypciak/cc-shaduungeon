import { godlikeStats, assert } from '@util/misc'
import { DungeonBuilder } from '@dungeon/dungeon-builder'
import { VimLogic } from '../node_modules/cc-vim/src/logic'
import { AreaDrawer } from '@area/area-drawer'
import { Blitzkrieg } from '@util/blitzkrieg'
import { overrideMapAreaContainer } from '@area/custom-MapAreaContainer'
import { DungeonPaths } from '@dungeon/dungeon-paths'

declare const blitzkrieg: Blitzkrieg
declare const dnggen: DngGen
declare const vim: VimLogic

const ngOptionName = 'dnggen'
const ngOptionDisplayName = 'Generate Dungeon'
const ngOptionDesc = 'Generate a dungeon'

const blitzkriegMissingMsg: string = '\n!!!!!!!!!!!!!!!!!!!!!\nInstall https://github.com/krypciak/cc-blitzkrieg\n!!!!!!!!!!!!!!!!!!!!!'

function updateLangLabels() {
    ig.lang.labels.sc.gui.menu['new-game'].options.names[ngOptionName] = ngOptionDisplayName
    ig.lang.labels.sc.gui.menu['new-game'].options.descriptions[ngOptionName] = ngOptionDesc
}

function addInjects() {
    // add NG+ option
    sc.NEW_GAME_OPTIONS[ngOptionName] = { set: 'others', cost: 0 }
    sc.CrossCode.inject({
        transitionEnded() {
            if (sc.model.currentSubState == sc.GAME_MODEL_SUBSTATE.NEWGAME && sc.newgame.get(ngOptionName)) {
                // ig.game.teleport(DungeonBuilder.initialMap.path, new ig.TeleportPosition(DungeonBuilder.initialMap.entarenceMarker), 'NEW')
            } else {
                this.parent()
            }
        }
    })


    sc.TitleScreenButtonGui.inject({
        init() {
            this.parent();
            ig.lang.labels.sc.gui['title-screen'].generateDungeon = 'Generate dungeon'
            const self1  = this
            this._createButton(
                'generateDungeon',
                this.buttons.last().hook.pos.y + 39,
                this.buttons.length,
                () => { startDnggenGame(self1) },
            );
        },
    });

    ig.Game.inject({
        preloadLevel(mapName: string) {
            this.parent(DungeonPaths.loadIfNeeded(mapName) ?? mapName)
        }
    })
}

async function startDnggenGame(titleGuiInstance?: sc.TitleScreenButtonGui, roomTp: number = -1) {
    ig.bgm.clear('MEDIUM_OUT');
    if (titleGuiInstance) {
        ig.interact.removeEntry(titleGuiInstance.buttonInteract)
    } else {
        ig.interact.entries.forEach((e) => ig.interact.removeEntry(e))
    }
    ig.game.start(sc.START_MODE.NEW_GAME_PLUS, 1)
    ig.game.setPaused(false);

    sc.newgame.active = true
    sc.newgame.options[ngOptionName] = true
    dnggen.dungeonBuilder.build('0', roomTp)

    godlikeStats()
}

async function registerStyles() {
    ig.MapStyle.registerStyle('default', 'puzzle2', { sheet: 'media/entity/style/default-puzzle-2-fix.png' })
    ig.MapStyle.registerStyle('default', 'magnet', { sheet: 'media/map/shockwave-dng.png', x: 160, y: 272 })
    ig.MapStyle.registerStyle('default', 'bouncer', { sheet: 'media/map/shockwave-dng-props.png', x: 0, y: 0 })
    ig.MapStyle.registerStyle('default', 'waterblock', { sheet: 'media/map/shockwave-dng.png', x: 384, y: 304, puddleX: 352, puddleY: 448 })
    ig.MapStyle.registerStyle('default', 'waveblock', { sheet: 'media/map/shockwave-dng.png', x: 96, y: 480 })
    ig.MapStyle.registerStyle('default', 'tesla', { sheet: 'media/map/shockwave-dng.png', x: 240, y: 352 })
    ig.MapStyle.registerStyle('default', 'waveSwitch', { sheet: 'media/map/shockwave-dng.png', x: 16, y: 696 })
    ig.MapStyle.registerStyle('default', 'anticompressor', { sheet: 'media/map/shockwave-dng.png', x: 240, y: 400 })
    ig.MapStyle.registerStyle('default', 'dynPlatformSmall', { sheet: 'media/map/shockwave-dng.png', x: 48, y: 640 })
    ig.MapStyle.registerStyle('default', 'dynPlatformMedium', { sheet: 'media/map/shockwave-dng.png', x: 0, y: 640 })
    ig.MapStyle.registerStyle('default', 'lorry', { sheet: 'media/map/shockwave-dng.png', railX: 176, railY: 304, lorryX: 128, lorryY: 304 })
    ig.MapStyle.registerStyle('default', 'rotateBlocker', { sheet: 'media/map/shockwave-dng.png', x: 256, y: 720 })
    ig.MapStyle.registerStyle('default', 'destruct', { sheet: 'media/entity/style/shockwave-dng-destruct.png' })
    ig.MapStyle.registerStyle('default', 'effect', { sheet: 'area.cold-dng' })
}

export default class DngGen {
    dir: string
    mod: Mod1
    loaded: boolean = false
    dungeonBuilder!: DungeonBuilder
    areaDrawer!: AreaDrawer

    // all should be true
    debug = {
        pastePuzzle: true,
        decorateBattleRoom: true,
        trimAreas: true,
        collisionlessMapArrange: true,
        dontDiscoverAllMaps: false,
        areaMapConnections: true,
    }

    constructor(mod: Mod1) {
        this.dir = mod.baseDirectory
        this.mod = mod
        // @ts-ignore
        window.dnggen = this
        // @ts-expect-error
        this.mod.isCCL3 = mod.findAllAssets ? true : false
    }

    async prestart() {
        assert(blitzkrieg, blitzkriegMissingMsg)
        assert(blitzkrieg.loaded, blitzkriegMissingMsg)

        this.dungeonBuilder = new DungeonBuilder()

        addInjects()

        // https://github.com/krypciak/cc-vim
        if (vim) {
            const isInGenMap = (ingame: boolean) => ingame && ig.game.mapName.startsWith('dnggen')
            vim.addAlias('dnggen', 'generate-dungeon', 'Generate dungeon', 'global', (roomTp: string= '-1') => {
                vim.executeString('title-screen')
                startDnggenGame(undefined, parseInt(roomTp))
            }, [{
                    type: 'number', description: 'room to teleport to'
            }])
            vim.addAlias('dnggen', 'skip-battle', 'Skips the battle', isInGenMap, () => { ig.vars.set('map.battle1done', true) })
        }
        this.loaded = true

        this.areaDrawer = new AreaDrawer()
    }

    async poststart() {
        assert(blitzkrieg, blitzkriegMissingMsg)
        assert(blitzkrieg.loaded, blitzkriegMissingMsg)

        overrideMapAreaContainer()
        registerStyles()
        updateLangLabels()
        startDnggenGame()
    }

    async reloadModAssetList() {
        if (this.mod.isCCL3) {
            this.mod.findAllAssets()
        } else {
            this.mod.assets = new Set(await this.mod.filemanager.findFiles(dnggen.mod.baseDirectory + 'assets/', ['.json', '.json.patch', '.png', '.ogg']))
        }
    }
}
