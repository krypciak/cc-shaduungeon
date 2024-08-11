import { godlikeStats } from '@root/util/misc'

const ngOptionName = 'dnggen'
const ngOptionCategory = 'cc-shaduungeon'

declare global {
    namespace sc {
        interface NEW_GAME_SETS {
            'cc-shaduungeon': sc.NewGameSet
        }
    }
}

export function prestartGameStart() {
    registerNewgamePlusOptionsPrestart()

    /* add button to main menu */
    sc.TitleScreenButtonGui.inject({
        init() {
            this.parent()
            ig.lang.labels.sc.gui['title-screen'].generateDungeon = 'Generate dungeon'
            const self1 = this
            this._createButton(
                'generateDungeon',
                this.buttons.last().hook.pos.y + 39,
                100 - this.buttons.length,
                () => {
                    startDnggenGame(self1)
                }
            )
        },
    })
}

export function poststartGameStart() {
    registerNewgamePlusOptionsPoststart()
    registerStyles()
}

function registerNewgamePlusOptionsPrestart() {
    /* runs in prestart */
    sc.NEW_GAME_SETS[ngOptionCategory] = {
        type: sc.TOGGLE_SET_TYPE.MULTI,
        order: 10,
    }
    sc.NEW_GAME_OPTIONS[ngOptionName] = { set: ngOptionCategory, cost: 0 }
    sc.CrossCode.inject({
        start(mode: sc.START_MODE | undefined, transitionTime: number | undefined) {
            this.parent(mode, transitionTime)

            if (mode == sc.START_MODE.NEW_GAME_PLUS && sc.newgame.get(ngOptionName)) {
                const seed = dnggen.debug.seed
                dnggen.dungeonBuilder.build('0', seed)
            }
        },
        transitionEnded() {
            if (sc.model.currentSubState == sc.GAME_MODEL_SUBSTATE.NEWGAME && sc.newgame.get(ngOptionName)) {
                // ig.game.teleport(DungeonBuilder.initialMap.path, new ig.TeleportPosition(DungeonBuilder.initialMap.entarenceMarker), 'NEW')
            } else {
                this.parent()
            }
        },
    })
}

function registerNewgamePlusOptionsPoststart() {
    /* runs in poststart */
    ig.lang.labels.sc.gui.menu['new-game'].sets[ngOptionCategory] = ngOptionCategory
    ig.lang.labels.sc.gui.menu['new-game'].options.names[ngOptionName] = 'Generate Dungeon'
    ig.lang.labels.sc.gui.menu['new-game'].options.descriptions[ngOptionName] = 'Generate a dungeon'
}

async function registerStyles() {
    /* runs in poststart */
    ig.MapStyle.registerStyle('default', 'puzzle2', { sheet: 'media/entity/style/default-puzzle-2-fix.png' })
    ig.MapStyle.registerStyle('default', 'magnet', { sheet: 'media/map/shockwave-dng.png', x: 160, y: 272 })
    ig.MapStyle.registerStyle('default', 'bouncer', { sheet: 'media/map/shockwave-dng-props.png', x: 0, y: 0 })
    ig.MapStyle.registerStyle('default', 'waterblock', {
        sheet: 'media/map/shockwave-dng.png',
        x: 384,
        y: 304,
        puddleX: 352,
        puddleY: 448,
    })
    ig.MapStyle.registerStyle('default', 'waveblock', { sheet: 'media/map/shockwave-dng.png', x: 96, y: 480 })
    ig.MapStyle.registerStyle('default', 'tesla', { sheet: 'media/map/shockwave-dng.png', x: 240, y: 352 })
    ig.MapStyle.registerStyle('default', 'waveSwitch', { sheet: 'media/map/shockwave-dng.png', x: 16, y: 696 })
    ig.MapStyle.registerStyle('default', 'anticompressor', { sheet: 'media/map/shockwave-dng.png', x: 240, y: 400 })
    ig.MapStyle.registerStyle('default', 'dynPlatformSmall', { sheet: 'media/map/shockwave-dng.png', x: 48, y: 640 })
    ig.MapStyle.registerStyle('default', 'dynPlatformMedium', { sheet: 'media/map/shockwave-dng.png', x: 0, y: 640 })
    ig.MapStyle.registerStyle('default', 'lorry', {
        sheet: 'media/map/shockwave-dng.png',
        railX: 176,
        railY: 304,
        lorryX: 128,
        lorryY: 304,
    })
    ig.MapStyle.registerStyle('default', 'rotateBlocker', { sheet: 'media/map/shockwave-dng.png', x: 256, y: 720 })
    ig.MapStyle.registerStyle('default', 'destruct', { sheet: 'media/entity/style/shockwave-dng-destruct.png' })
    ig.MapStyle.registerStyle('default', 'effect', { sheet: 'area.cold-dng' })
}

export async function startDnggenGame(titleGuiInstance?: sc.TitleScreenButtonGui) {
    ig.bgm.clear('MEDIUM_OUT')
    if (titleGuiInstance) {
        ig.interact.removeEntry(titleGuiInstance.buttonInteract)
    } else {
        ig.interact.entries.forEach(e => ig.interact.removeEntry(e))
    }
    sc.newgame.active = true
    sc.newgame.options[ngOptionName] = true
    ig.game.start(sc.START_MODE.NEW_GAME_PLUS, 0)
    ig.game.setPaused(false)

    godlikeStats()
}
