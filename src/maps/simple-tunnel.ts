import { NextQueueEntryGenerator, QueueEntry } from '../build-queue/build-queue'
import {
    TprArrange,
    MapArrangeData,
    MapArrange,
    RoomArrange,
    doesMapArrangeFit,
    TprArrange3d,
} from '../map-arrange/map-arrange'
import { MapPicker, registerMapPickerNodeConfig } from '../map-arrange/map-picker/configurable'
import {
    baseMapConstruct,
    convertRoomsArrangeToRoomsConstruct,
    getTprName,
    registerMapConstructor,
} from '../map-construct/map-construct'
import { placeRoom } from '../map-construct/room'
import { MapTheme } from '../map-construct/theme'
import { Dir, DirU, Rect } from '../util/geometry'
import { shuffleArray } from '../util/util'

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
            destId: id - 1,
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
            const rect = Rect.centeredRect(tunnelSize, tpr)
            const walls: Record<Dir, boolean> = [true, true, true, true]
            walls[exitTpr.dir] = false
            tunnelEntrance = { ...rect, walls }
            map.rects.push(tunnelEntrance)
        }
        let room: RoomArrange
        {
            const rect = Rect.centeredRect(roomSize, {
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
                    const rect = Rect.centeredRect(tunnelSize, {
                        ...Rect.middle(Rect.side(room, dir)),
                        dir: DirU.flip(dir),
                    })
                    const walls: Record<Dir, boolean> = [true, true, true, true]
                    walls[DirU.flip(dir)] = false
                    tunnelExit = { ...rect, walls }
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

registerMapConstructor('SimpleTunnel', (map, areaInfo, pathResolver, _mapsArranged, _mapsConstructed) => {
    const theme = MapTheme.default
    const { mic, rectsAbsolute } = baseMapConstruct(map, pathResolver(map.id), areaInfo.id, theme, [9, 2, 2, 2])

    function pushTprEntity(tpr: TprArrange3d, isEntrance: boolean, index: number) {
        const name = getTprName(isEntrance, index)
        const dir = DirU.flip(tpr.dir as Dir)
        if (tpr.destId == -1) {
            const middle = Vec2.subC(Rect.middle(map.rects[0]), 16, 16)
            return mic.entities.push({
                type: 'Marker',
                ...middle,
                level: 0,
                settings: { name, dir: DirU.toString(dir) },
            })
        }

        let x = tpr.x
        let y = tpr.y

        if (tpr.dir != Dir.SOUTH) y -= 16
        if (tpr.dir != Dir.EAST) x -= 16

        mic.entities.push({
            type: 'Door',
            x,
            y,
            level: 0,
            settings: {
                name,
                map: pathResolver(tpr.destId),
                marker: getTprName(!isEntrance, tpr.destIndex ?? 0),
                dir: DirU.toString(dir),
            },
        })
    }

    map.entranceTprs.forEach((tpr, i) => pushTprEntity(tpr, true, i))
    map.restTprs.forEach((tpr, i) => pushTprEntity(tpr, false, i))

    const rects = convertRoomsArrangeToRoomsConstruct(map.rects)
    for (const room of rects) {
        placeRoom(room, mic, theme.config, true)
    }

    const constructed: sc.MapModel.Map = Object.assign(mic, { layers: undefined })

    return {
        ...map,
        rects,
        constructed,
        rectsAbsolute,
        title: `map ${constructed.name}`,
    }
})
