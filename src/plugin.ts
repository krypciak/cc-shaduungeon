import { godlikeStats, Blitzkrieg } from './util.js'

declare const blitzkrieg: Blitzkrieg

const initialMapName = 'rouge.start'
const ngOptionName = 'dnggen'
const ngOptionDisplayName = 'Generate Dungeon'
const ngOptionDesc = 'Generate a dungeon'


function updateLangLabels() {
    ig.lang.labels.sc.gui.menu['new-game'].options.names[ngOptionName] = ngOptionDisplayName
    ig.lang.labels.sc.gui.menu['new-game'].options.descriptions[ngOptionName] = ngOptionDesc
}

function addInjects() {
    // add NG+ option
    // @ts-ignore
    sc.NEW_GAME_OPTIONS[ngOptionName] = { set: 'others', cost: 0 }
    sc.CrossCode.inject({
        transitionEnded() {
            if (sc.model.currentSubState == sc.GAME_MODEL_SUBSTATE.NEWGAME &&
                // @ts-ignore
                sc.newgame.get(ngOptionName)) {

                ig.game.teleport(initialMapName, new ig.TeleportPosition('start'), 'NEW')
                return
            }
            this.parent()
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
}

async function startDnggenGame(titleGuiInstance: sc.TitleScreenButtonGui) {
    ig.bgm.clear('MEDIUM_OUT');
    ig.interact.removeEntry(titleGuiInstance.buttonInteract)
    ig.game.start(sc.START_MODE.NEW_GAME_PLUS, 1)
    ig.game.setPaused(false);

    // @ts-ignore
    sc.newgame.setActive(ngOptionName)
    // @ts-ignore
    sc.newgame.options[ngOptionName] = true
    // dnggen.dungeonGenerator.generate()

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
    puzzleFileIndex: number = -1
    battleFileIndex: number = -1
    loaded: boolean = false

    constructor(mod: { baseDirectory: string }) {
        this.dir = mod.baseDirectory
        // @ts-ignore
        window.dnggen = this
    }

    async prestart() {
        if (! blitzkrieg || ! ('loaded' in blitzkrieg && blitzkrieg.loaded)) { return }

        // register selections
        this.puzzleFileIndex = blitzkrieg.puzzleSelections.jsonfiles.length
        blitzkrieg.puzzleSelections.jsonfiles.push(this.dir + 'json/genPuzzle.json')
        blitzkrieg.puzzleSelections.load(this.puzzleFileIndex)

        this.battleFileIndex = blitzkrieg.battleSelections.jsonfiles.length
        blitzkrieg.battleSelections.jsonfiles.push(this.dir + 'json/genBattle.json')
        blitzkrieg.battleSelections.load(this.battleFileIndex)
 
        

        addInjects()

        this.loaded = true
    }

    async main() {
        if (! blitzkrieg || ! ('loaded' in blitzkrieg && blitzkrieg.loaded)) { return }

        registerStyles()
        updateLangLabels()
    }
}
