import { AreaArranger } from '../area/arranger'
import { NextQueueEntryGenerator } from '../dungeon/build-queue'
import { printQueue } from '../dungeon/builder'
import { RoomChooser } from '../dungeon/room-choosers/simple'
import { Dir, DirU, Rect } from '../util/geometry'
import { shuffleArray } from '../util/util'
import { Vec2 } from '../util/vec2'
import { TprArrange, MapArrangeData, MapArrange, baseMapArrange } from './map-arrange'
import { RoomArrange, getCenteredRect } from './room'

export function simpleMapRoomArrange(
    roomChooser: RoomChooser,
    exitTpr: TprArrange,
    size: Vec2,
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
        let room: RoomArrange
        {
            const rect = getCenteredRect(size, tpr)
            room = { ...rect }

            map.rects.push(room)
        }

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

export function simpleMapRoomTunnelArrange(
    roomChooser: RoomChooser,
    exitTpr: TprArrange,
    roomSize: Vec2,
    tunnelSize: Vec2,
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

        let tunnelEntrance: RoomArrange
        {
            const rect = getCenteredRect(tunnelSize, tpr)
            tunnelEntrance = { ...rect }
            map.rects.push(tunnelEntrance)
        }
        let room: RoomArrange
        {
            const rect = getCenteredRect(roomSize, {
                ...Rect.middle(Rect.side(tunnelEntrance, exitTpr.dir)),
                dir: tpr.dir,
            })
            room = { ...rect }
            map.rects.push(room)
        }

        if (!AreaArranger.doesMapFit(accesor, map, id)) return null

        let dirChoices = DirU.allExpect[tpr.dir]
        if (randomizeDirTryOrder) dirChoices = shuffleArray(dirChoices) as any
        if (forceExit) dirChoices = [forceExit]

        return {
            data: map,
            id,
            branch: 0,
            branchCount: dirChoices.length,

            nextQueueEntryGenerator: (_, branch, accesor) => {
                const map = baseMapArrange()
                const dir = dirChoices[branch]

                let tunnelExit: RoomArrange
                {
                    const rect = getCenteredRect(tunnelSize, {
                        ...Rect.middle(Rect.side(room, dir)),
                        dir: DirU.flip(dir),
                    })
                    tunnelExit = { ...rect }
                    map.rects.push(tunnelExit)
                }
                if (!AreaArranger.doesMapFit(accesor, map, id)) return null

                {
                    const exitTpr: TprArrange = {
                        ...Rect.middle(Rect.side(tunnelExit, dir)),
                        dir,
                    }
                    map.restTprs.push(exitTpr)
                }
                return {
                    data: map,
                    id,
                    finishedEntry: true,
                    finishedWhole,

                    branch: 0,
                    branchCount: 1,
                    getNextQueueEntryGenerator: () => roomChooser(id, accesor),
                }
            },
        }
    }
}
