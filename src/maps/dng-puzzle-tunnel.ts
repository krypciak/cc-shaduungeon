import { Id, NextQueueEntryGenerator } from '../build-queue/build-queue'
import {
    TprArrange,
    MapArrangeData,
    MapArrange,
    RoomArrange,
    doesMapArrangeFit,
    TprArrange3d,
} from '../map-arrange/map-arrange'
import { MapPicker, registerMapPickerNodeConfig } from '../map-arrange/map-picker/configurable'
import { registerMapConstructor } from '../map-construct/map-construct'
import { Dir, DirU, Rect } from '../util/geometry'
import { shuffleArray } from '../util/util'
import { Vec2 } from '../util/vec2'
import { getPuzzleList } from './puzzle-data'
import { simpleMapConstructor } from './simple'

declare global {
    export namespace MapPickerNodeConfigs {
        export interface All {
            DngPuzzleTunnel: DngPuzzleTunnel
        }
        export interface DngPuzzleTunnel {
            count: number
            tunnelSize: Vec2
            randomizeDirTryOrder?: boolean
            followedBy?: MapPicker.ConfigNode
        }
    }
}
registerMapPickerNodeConfig('DngPuzzleTunnel', (data, buildtimeData) => {
    return das({ ...data, ...buildtimeData })
})
export function das({
    mapPicker,
    exitTpr,
    tunnelSize,
    destId,
    destIndex,
    finishedWhole,
    branchDone,
    nodeId,
    nodeProgress,
}: {
    mapPicker: MapPicker
    exitTpr: TprArrange
    tunnelSize: Vec2
    destId: Id
    destIndex: number
    finishedWhole?: boolean
    branchDone?: boolean
    nodeId?: number
    nodeProgress?: number
}): NextQueueEntryGenerator<MapArrangeData> {
    return (id, _, accesor) => {
        const tpr: TprArrange = {
            dir: DirU.flip(exitTpr.dir),
            x: exitTpr.x,
            y: exitTpr.y,
            destId,
            destIndex,
        }
        const map: MapArrange = {
            type: 'DngPuzzleTunnel',
            rects: [],
            restTprs: [],
            id,
            entranceTprs: [tpr],
            branchDone,
            nodeId,
            nodeProgress,
        }

        let tunnelEntrance: RoomArrange
        {
            const rect = Rect.centered(tunnelSize, tpr)
            const walls: Record<Dir, boolean> = [true, true, true, true]
            walls[exitTpr.dir] = false
            tunnelEntrance = { ...rect, walls }
            map.rects.push(tunnelEntrance)
        }
        if (!doesMapArrangeFit(accesor, map, id)) return null

        const puzzles = shuffleArray(getPuzzleList(tpr.dir))

        return {
            data: map,
            id,
            branch: 0,
            branchCount: puzzles.length,

            nextQueueEntryGenerator: (_, branch, accesor) => {
                const map = { rects: [] as RoomArrange[], restTprs: [] as TprArrange3d[] }
                const puzzle = puzzles[branch]

                const bounds = Rect.boundsOfArr(puzzle.rects)
                if (puzzle.sel.data.type == blitzkrieg.PuzzleRoomType.AddWalls) Rect.extend(bounds, 3 * 2 * 16)
                const size = { x: bounds.width, y: bounds.height }
                const offset = { x: 0, y: 0 }
                if ((tunnelSize.x / 16) % 2 != (size.x / 16) % 2) offset.x += 16
                if ((tunnelSize.x / 16) % 2 != (size.y / 16) % 2) offset.y += 16

                Vec2.add(size, offset)

                const rect = Rect.centered(size, {
                    ...Rect.middle(Rect.side(tunnelEntrance, exitTpr.dir)),
                    dir: tpr.dir,
                })
                // const rect = Rect.centered(size, tpr)

                const room: RoomArrange = {
                    ...rect,
                    walls: [true, true, true, true],
                }

                map.rects.push(room)

                if (!doesMapArrangeFit(accesor, map, id)) return null

                {
                    const pos: Vec2 = Rect.sideVec(room, Vec2.add(Vec2.copy(puzzle.exit.vec), room), puzzle.exit.dir)
                    Vec2.round(pos)

                    map.restTprs.push({
                        ...pos,
                        dir: puzzle.exit.dir,
                        destId: id + 1,
                    })
                }

                return {
                    data: map,
                    id,
                    finishedEntry: true,
                    finishedWhole,

                    branch: 0,
                    branchCount: 1,
                    getNextQueueEntryGenerator: () => mapPicker(id, accesor),
                }
            },
        }
    }
}

registerMapConstructor('DngPuzzleTunnel', simpleMapConstructor)
