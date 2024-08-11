import { startDnggenGame } from "./game-start"

/* in prestart */
export {}
sc.TitleScreenButtonGui.inject({
    init() {
        this.parent()
        const id = 'ShaddungeonGenerate'
        ig.lang.labels.sc.gui['title-screen'][id] = 'Generate dungeon'
        this._createButton(id, this.buttons.last().hook.pos.y + 39, 100 - this.buttons.length, () => {
            startDnggenGame(this)
        })
    },
})
