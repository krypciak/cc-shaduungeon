import { Id, NextQueueEntryGenerator, QueueEntry } from '../build-queue/build-queue'
import {
    TprArrange,
    MapArrangeData,
    MapArrange,
    RoomArrange,
    doesMapArrangeFit,
    TprArrange3d,
    RoomPlaceOrder,
} from '../map-arrange/map-arrange'
import { MapPicker, registerMapPickerNodeConfig } from '../map-arrange/map-picker/configurable'
import { registerMapConstructor } from '../map-construct/map-construct'
import { Dir, DirU, Rect } from '../util/geometry'
import { shuffleArray } from '../util/util'
import { simpleMapConstructor } from './simple'

declare global {
    export namespace MapPickerNodeConfigs {
        export interface All {
            SimpleTunnel: SimpleTunnel
        }
        export interface SimpleTunnel {
            count: number
            roomSize: Vec2
            tunnelSize: Vec2
            randomizeDirTryOrder?: boolean
            followedBy?: MapPicker.ConfigNode
        }
    }
}
registerMapPickerNodeConfig('SimpleTunnel', (data, buildtimeData) => {
    return simpleMapTunnelArrange({ ...data, ...buildtimeData })
})
export function simpleMapTunnelArrange({
    mapPicker,
    exitTpr,
    roomSize,
    tunnelSize,
    destId,
    destIndex,
    randomizeDirTryOrder,
    finishedWhole,
    forceExit,
    branchDone,
    nodeId,
    nodeProgress,
}: {
    mapPicker: MapPicker
    exitTpr: TprArrange
    roomSize: Vec2
    tunnelSize: Vec2
    destId: Id
    destIndex: number
    randomizeDirTryOrder?: boolean
    finishedWhole?: boolean
    forceExit?: Dir
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
            type: 'SimpleTunnel',
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
            tunnelEntrance = { ...rect, walls, placeOrder: RoomPlaceOrder.Tunnel }
            map.rects.push(tunnelEntrance)
        }
        let room: RoomArrange
        {
            const rect = Rect.centered(roomSize, {
                ...Rect.middle(Rect.side(tunnelEntrance, exitTpr.dir)),
                dir: tpr.dir,
            })
            room = { ...rect, walls: [true, true, true, true] }
            map.rects.push(room)
        }

        if (!doesMapArrangeFit(accesor, map, id)) return null

        let dirChoices = DirU.allExpect[tpr.dir]
        if (randomizeDirTryOrder) dirChoices = shuffleArray(dirChoices) as any
        if (forceExit) dirChoices = [forceExit]

        let branchCount = dirChoices.length
        if (branchDone) branchCount = 1

        const ret: QueueEntry<MapArrangeData> = {
            data: map,
            id,
            branch: 0,
            branchCount,
            finishedEntry: branchDone,

            nextQueueEntryGenerator: (_, branch, accesor) => {
                const map = { rects: [] as RoomArrange[], restTprs: [] as TprArrange3d[] }
                const dir = dirChoices[branch]

                let tunnelExit: RoomArrange
                {
                    const rect = Rect.centered(tunnelSize, {
                        ...Rect.middle(Rect.side(room, dir)),
                        dir: DirU.flip(dir),
                    })
                    const walls: Record<Dir, boolean> = [true, true, true, true]
                    walls[DirU.flip(dir)] = false
                    tunnelExit = { ...rect, walls, placeOrder: RoomPlaceOrder.Tunnel }
                    map.rects.push(tunnelExit)
                }
                if (!doesMapArrangeFit(accesor, map, id)) return null

                {
                    const exitTpr: TprArrange = {
                        ...Rect.middle(Rect.side(tunnelExit, dir)),
                        dir,
                        destId: id + 1,
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
                    getNextQueueEntryGenerator: () => mapPicker(id, accesor),
                }
            },
        }
        if (branchDone) {
            Object.assign(ret, {
                nextQueueEntryGenerator: undefined,
                finishedWhole,
                getNextQueueEntryGenerator: () => mapPicker(id, accesor),
            })
        }

        return ret
    }
}

registerMapConstructor('SimpleTunnel', simpleMapConstructor)
