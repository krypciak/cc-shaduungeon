import { DungeonBuilder } from '../dungeon/builder'
import { godmode } from './godmode'

let justStarted = false
export async function startDnggenGame(titleGuiInstance?: sc.TitleScreenButtonGui) {
    ig.bgm.clear('MEDIUM_OUT')
    if (titleGuiInstance) {
        ig.interact.removeEntry(titleGuiInstance.buttonInteract)
    } else {
        ig.interact.entries.forEach(e => ig.interact.removeEntry(e))
    }
    justStarted = true
    ig.game.start(sc.START_MODE.NEW_GAME_PLUS, 0)
    ig.game.setPaused(false)

    const builder = new DungeonBuilder()
    builder.build('helo')

    godmode()
}

export function injectGameStarting() {
    sc.CrossCode.inject({
        start(mode?: sc.START_MODE, transitionTime?: number) {
            this.parent(mode, justStarted ? 0.0001 : transitionTime)
        },
        transitionEnded() {
            if (justStarted) {
                // ig.game.teleport('dnggen/limbo')
                // ig.game.teleport(DungeonBuilder.initialMap.path, new ig.TeleportPosition(DungeonBuilder.initialMap.entarenceMarker), 'NEW')
                justStarted = false
            } else {
                this.parent()
            }
        },
    })
}
