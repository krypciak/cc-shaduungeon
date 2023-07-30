import { RoomComponents } from './room-components.js'
import { EntitySpawn } from './entity-spawn.js'
import { EnemyDb } from './enemy-db.js'
import { DungeonGenerator } from './dungeon-generate.js'

export default class Rouge {
    constructor(mod) {
        this.mod = mod
    }

    updateLabels() {
        ig.lang.labels.sc.gui.options.headers['rouge-keybindings'] = 'keybindings'
        ig.lang.labels.sc.gui.menu['new-game'].options.names.rouge = 'Rouge'
        ig.lang.labels.sc.gui.menu['new-game'].options.descriptions.rouge = 'Start game in rougelike mode'
        
        for (const keyName in this.keys) {
            const key = this.keys[keyName]
            ig.lang.labels.sc.gui.options.controls.keys[keyName] = key.desc
        }
    }

    registerEvents() {
        // add NG+ option
        sc.NEW_GAME_OPTIONS['rouge'] = {set: 'others', cost: 0}
        sc.CrossCode.inject({
            transitionEnded(...args) {
                if (sc.model.currentSubState == sc.GAME_MODEL_SUBSTATE.NEWGAME && sc.newgame.get('rouge')) {
                    ig.game.teleport(rouge.initMapName, new ig.TeleportPosition('start'), 'NEW')
                    // ig.game.teleport('rouge.gen.0', new ig.TeleportPosition('start'), 'NEW')
                    return
                }
                this.parent(...args)
            }
        })
    }

    async startGame(titleGuiInstance) {
        ig.bgm.clear('MEDIUM_OUT');
        ig.interact.removeEntry(titleGuiInstance.buttonInteract)
        ig.game.start(sc.START_MODE.NEW_GAME_PLUS, 1)
        ig.game.setPaused(false);
        sc.newgame.options.rouge = true
        sc.newgame.setActive('rouge')
        rouge.dungeonGenerator.generate()
        
        // cheat in some stats
        sc.model.player.setSpLevel(4)
        sc.model.player.setLevel(99)
        sc.model.player.equip = {head:657,leftArm:577,rightArm:607,torso:583,feet:596}
        for (let i = 0; i < sc.model.player.skillPoints.length; i++) { sc.model.player.skillPoints[i] = 200 }
        for (let i = 0; i < 400; i++) { sc.model.player.learnSkill(i) }
        for (let i = 0; i < sc.model.player.skillPoints.length; i++) { sc.model.player.skillPoints[i] = 0 }
        sc.model.player.updateStats()
    }

    
    async prestart() {
        if (! blitzkrieg || ! ('loaded' in blitzkrieg && blitzkrieg.loaded)) {
            console.error('cc-blitzkrieg not loaded! rouge cannot load')
            return
        }
        window.rouge = this

        // await blitzkrieg.battleSelectionManager.findAllSpawners()
        rouge.dungeonGenerator = new DungeonGenerator()
        rouge.roomComponents = new RoomComponents()
        rouge.entitySpawn = new EntitySpawn()
        rouge.enemyDb = new EnemyDb()
        
        rouge.puzzleFileIndex = blitzkrieg.puzzleSelections.jsonfiles.length
        blitzkrieg.puzzleSelections.jsonfiles.push(rouge.mod.baseDirectory + 'json/genPuzzle.json')
        blitzkrieg.puzzleSelections.load(rouge.puzzleFileIndex)

        rouge.battleFileIndex = blitzkrieg.battleSelections.jsonfiles.length
        blitzkrieg.battleSelections.jsonfiles.push(rouge.mod.baseDirectory + 'json/genBattle.json')
        blitzkrieg.battleSelections.load(rouge.battleFileIndex)

        rouge.keys = {
            //'generate':           { desc: 'generate',            func: rouge.dungeonGenerator.generate,
            //    key: ig.KEY_5,      header: 'rouge-keybindings', hasDivider: false, parent: rouge.dungeonGenerator },
        }
        // rouge.setupTabs()
        blitzkrieg.bindKeys(rouge.keys, sc.OPTION_CATEGORY.BLITZKRIEG)

        rouge.initMapName = 'rouge.start'
        rouge.registerEvents()

        const self = this
        sc.TitleScreenButtonGui.inject({
            init() {
                this.parent();
                ig.lang.labels.sc.gui['title-screen'].generateDungeon = 'Generate dungeon'
                const self1 = this
                this._createButton(
                    'generateDungeon',
                    this.buttons.last().hook.pos.y + 39,
                    this.buttons.length,
                    () => { self.startGame(self1) },
                    'generateDungeon',
                );
            },
        });
        rouge.loaded = true
    }

    async main() {
        if (! blitzkrieg || ! ('loaded' in blitzkrieg && blitzkrieg.loaded)) { return }
        rouge.updateLabels()
        rouge.enemyDb.loadDatabase()

        // register non existing puzzle elements
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
}
