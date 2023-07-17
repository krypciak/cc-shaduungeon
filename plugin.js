import { RoomGenerator } from './room-generate.js'
import { RoomComponents } from './room-components.js'
import { EntitySpawn } from './entity-spawn.js'
import { BattleRoom } from './battle-room.js'
import { EnemyDb } from './enemy-db.js'

export default class Rouge extends Plugin {
    constructor(mod) {
        super()
        this.mod = mod
    }

    updateLabels() {
        ig.lang.labels.sc.gui.options.headers['rouge-keybindings'] = 'keybindings'
        ig.lang.labels.sc.gui.menu['new-game'].options.names.rouge = 'Rouge'
        ig.lang.labels.sc.gui.menu['new-game'].options.descriptions.rouge = 'Start game in rougelike mode'
        
        for (let keyName in this.keys) {
            let key = this.keys[keyName]
            ig.lang.labels.sc.gui.options.controls.keys[keyName] = key.desc
        }
    }

    registerEvents() {
        // add NG+ option
        sc.NEW_GAME_OPTIONS['rouge'] = {set: 'others', cost: 0}
        sc.CrossCode.inject({
            transitionEnded(...args) {
                if (sc.model.currentSubState == sc.GAME_MODEL_SUBSTATE.NEWGAME && sc.newgame.get('rouge')) {
                    ig.game.teleport(ig.rouge.initMapName, new ig.TeleportPosition('start'), 'NEW')
                    return
                }
                this.parent(...args)
            }
        })

    }

    
    async prestart() {
        if (! ig.blitzkrieg || ! ('loaded' in ig.blitzkrieg && ig.blitzkrieg.loaded)) {
            console.error('cc-blitzkrieg not loaded! rouge cannot load')
            return
        }
        ig.rouge = this

        await ig.blitzkrieg.battleSelectionManager.findAllSpawners()
        ig.rouge.roomComponents = new RoomComponents()
        ig.rouge.entitySpawn = new EntitySpawn()
        ig.rouge.roomGenerator = new RoomGenerator()
        ig.rouge.battleRoom = new BattleRoom()
        ig.rouge.enemyDb = new EnemyDb()

        ig.rouge.keys = {
            'generate':           { desc: 'generate',            func: ig.rouge.roomGenerator.generate,
                key: ig.KEY_5,      header: 'rouge-keybindings', hasDivider: false, parent: ig.rouge.roomGenerator },
        }
        // ig.rouge.setupTabs()
        ig.blitzkrieg.bindKeys(ig.rouge.keys, sc.OPTION_CATEGORY.BLITZKRIEG)

        ig.rouge.initMapName = 'rouge.start'
        ig.rouge.registerEvents()

        ig.rouge.loaded = true
    }

    async main() {
        if (! ig.blitzkrieg || ! ('loaded' in ig.blitzkrieg && ig.blitzkrieg.loaded)) { return }
        ig.rouge.updateLabels()
        ig.rouge.enemyDb.loadDatabase()

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
    }
}
