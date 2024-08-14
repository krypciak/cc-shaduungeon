import { AreaArranger } from '../area/arranger'
import { NextQueueEntryGenerator } from '../dungeon/build-queue'
import { RoomChooser } from '../dungeon/room-choosers/simple'
import { Dir, DirU, Rect } from '../util/geometry'
import { shuffleArray } from '../util/util'
import { Vec2 } from '../util/vec2'
import { baseMapArrange, MapArrange, MapArrangeData, TprArrange } from './map-arrange'

export interface RoomArrange extends Rect {}

export function simpleRoomArrange(
    roomChooser: RoomChooser,
    exitTpr: TprArrange,
    size: number,
    randomizeDirTryOrder?: boolean,
    finishedWhole?: boolean,
    forceExit?: Dir
): NextQueueEntryGenerator<MapArrangeData> {
    return (id, _, accesor) => {
        const tpr: TprArrange = {
            dir: DirU.flip(exitTpr.dir),
            x: exitTpr.x,
            y: exitTpr.y,
        }
        const map: MapArrange = {
            ...baseMapArrange(),
            id,
            entranceTpr: tpr,
        }
        const roomPos: Vec2 = Vec2.copy(tpr)
        if (tpr.dir == Dir.SOUTH || tpr.dir == Dir.EAST) {
            Vec2.moveInDirection(roomPos, exitTpr.dir, size)
        }
        const move = size / 2
        Vec2.moveInDirection(roomPos, DirU.isVertical(tpr.dir) ? Dir.WEST : Dir.NORTH, move)
        const room: RoomArrange = {
            ...roomPos,
            width: size,
            height: size,
        }
        map.rects.push(room)
        if (!AreaArranger.doesMapFit(accesor, map, id)) return null

        let dirChoices = DirU.allExpect[tpr.dir]
        if (randomizeDirTryOrder) dirChoices = shuffleArray(dirChoices) as any
        if (forceExit) dirChoices = [forceExit]

        return {
            data: map,
            id,
            branch: 0,
            branchCount: dirChoices.length,

            finishedWhole,
            nextQueueEntryGenerator: (_, branch, accesor) => {
                const dir = dirChoices[branch]
                const exitTpr: TprArrange = {
                    dir,
                    ...Rect.middle(Rect.side(room, dir)),
                }
                return {
                    data: { restTprs: [exitTpr] },
                    id,
                    finishedEntry: true,

                    branch: 0,
                    branchCount: 1,
                    getNextQueueEntryGenerator: () => roomChooser(id, accesor),
                }
            },
        }
    }
}
