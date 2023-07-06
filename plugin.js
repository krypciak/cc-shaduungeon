export default class Rouge {

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
        ig.rouge.keys = {
            'test':               { desc: 'rouge test',          func: ig.rouge.test,
                key: ig.KEY_5,      header: 'rouge-keybindings', hasDivider: false, parent: ig.rouge },
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
    }
}
