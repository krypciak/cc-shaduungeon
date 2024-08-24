import { Vec2 } from '../util/vec2'
import { Id, NextQueueEntryGenerator, QueueEntry } from '../build-queue/build-queue'
import {
    TprArrange,
    MapArrangeData,
    MapArrange,
    RoomArrange,
    doesMapArrangeFit,
    TprArrange3d,
    copyMapArrange,
} from '../map-arrange/map-arrange'
import { MapPicker, registerMapPickerNodeConfig } from '../map-arrange/map-picker/configurable'
import { Dir, DirU, Rect } from '../util/geometry'
import { shuffleArray } from '../util/util'
import {
    baseMapConstruct,
    convertRoomsArrangeToRoomsConstruct,
    getTprName,
    MapConstructFunc,
    registerMapConstructor,
} from '../map-construct/map-construct'
import { MapTheme } from '../map-construct/theme'
import { placeRoom } from '../map-construct/room'

declare global {
    export namespace MapPickerNodeConfigs {
        export interface All {
            Simple: Simple
        }
        export interface Simple {
            count: number
            size: Vec2
            randomizeDirTryOrder?: boolean
            followedBy?: MapPicker.ConfigNode
        }
    }
}

registerMapPickerNodeConfig('Simple', (data, buildtimeData) => {
    return simpleMapArrange({ ...data, ...buildtimeData })
})
export function simpleMapArrange({
    mapPicker,
    exitTpr,
    size,
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
    size: Vec2
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
            x: exitTpr.x,
            y: exitTpr.y,
            dir: DirU.flip(exitTpr.dir),
            destId,
            destIndex,
        }
        const map: MapArrange = {
            type: 'Simple',
            rects: [],
            restTprs: [],
            id,
            entranceTprs: [tpr],
            branchDone,
            nodeId,
            nodeProgress,
        }
        let room: RoomArrange
        {
            const rect = Rect.centered(size, tpr)
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

            finishedWhole,
            nextQueueEntryGenerator: (_, branch, accesor) => {
                const dir = dirChoices[branch]
                const exitTpr: TprArrange = {
                    ...Rect.middle(Rect.side(room, dir)),
                    dir,
                    destId: id + 1,
                }
                return {
                    data: { restTprs: [exitTpr] },
                    id,
                    finishedEntry: true,

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

export const simpleMapConstructor = ((
    map,
    areaInfo,
    pathResolver,
    _mapsArranged,
    _mapsConstructed,
    extension: Record<Dir, number> = [8, 1, 1, 1]
) => {
    const theme = MapTheme.default
    const arrangeCopy = copyMapArrange(map)
    const mic = baseMapConstruct(map, pathResolver(map.id), areaInfo.id, theme, extension)

    function pushTprEntity(tpr: TprArrange3d, isEntrance: boolean, index: number) {
        if (tpr.dontPlace) return
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
            level: tpr.level ?? 0,
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
        if (room.dontPlace) continue
        placeRoom(room, mic, theme.config, true)
    }

    const constructed: sc.MapModel.Map = Object.assign(mic, { layers: undefined })

    return {
        ...map,
        rects,
        constructed,
        arrangeCopy,
        title: `map ${constructed.name}`,
    }
}) satisfies MapConstructFunc

registerMapConstructor('Simple', simpleMapConstructor)
