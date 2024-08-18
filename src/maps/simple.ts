import { Vec2 } from '../util/vec2'
import { NextQueueEntryGenerator, QueueEntry } from '../build-queue/build-queue'
import {
    TprArrange,
    MapArrangeData,
    MapArrange,
    RoomArrange,
    doesMapArrangeFit,
    offsetMapArrange,
} from '../map-arrange/map-arrange'
import { MapPicker, registerMapPickerNodeConfig } from '../map-arrange/map-picker/configurable'
import { Dir, DirU, Rect } from '../util/geometry'
import { shuffleArray } from '../util/util'
import { registerMapConstructor } from '../map-construct/map-construct'
import { MapTheme } from '../map-construct/theme'

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
            destId: id - 1,
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
            const rect = Rect.centeredRect(size, tpr)
            room = { ...rect }

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

registerMapConstructor('Simple', (map, areaInfo, pathResolver, _mapsArranged, _mapsConstructed) => {
    const bounds = Rect.boundsOfArr(map.rects)
    const offset = Vec2.mulC(bounds, -1)
    offsetMapArrange(map, offset)

    const theme = MapTheme.default

    const c: sc.MapModel.Map = {
        name: pathResolver(map.id),
        mapWidth: bounds.width,
        mapHeight: bounds.height,
        levels: [{ height: 0 }],
        masterLevel: 0,
        attributes: theme.getMapAttributes(areaInfo.id),
        screen: { x: 0, y: 0 },
        entities: [],
        layer: [],
    }

    for (const tpr of [...map.entranceTprs, ...map.restTprs]) {
        const entity = {
            type: 'DOOR',
            x: tpr.x,
            y: tpr.y,
            level: 0,
            settings: {},
        }
        c.entities.push(entity)
    }

    return {
        ...map,
        constructed: c,
    }
})
