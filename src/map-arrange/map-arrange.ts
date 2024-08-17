import { BuildQueueAccesor, Id, NextQueueEntryGenerator } from '../build-queue/build-queue'
import { Dir, Dir3d, Rect } from '../util/geometry'
import { Vec2 } from '../util/vec2'
import { MapPicker } from './map-picker/configurable'

export interface TprArrange3d extends Vec2 {
    dir: Dir3d
    destId: Id
    destIndex?: number
}
export interface TprArrange extends TprArrange3d {
    dir: Dir
}

export interface MapArrange {
    type: MapPicker.ConfigTypes
    id: Id
    rects: Rect[]
    floor?: number /* 0 by default */

    entranceTprs: TprArrange3d[]
    restTprs: TprArrange3d[]

    branchDone?: boolean
    createNextBranch?: NextQueueEntryGenerator<MapArrangeData>

    nodeId?: number
    nodeProgress?: number
}

export function copyMapArrange(map: MapArrangeData): MapArrange {
    return {
        type: map.type!,
        id: map.id!,
        rects: (map.rects ?? [])?.map(Rect.copy),
        floor: map.floor,

        entranceTprs: (map.entranceTprs ?? []).map(a => ({ ...a })),
        restTprs: (map.restTprs ?? []).map(a => ({ ...a })),

        branchDone: map.branchDone,
        createNextBranch: map.createNextBranch,

        nodeId: map.nodeId,
        nodeProgress: map.nodeProgress,
    }
}

export function offsetMapArrange(map: MapArrange, vec: Vec2) {
    for (const rect of map.rects) Vec2.add(rect, vec)
    for (const rect of map.restTprs) Vec2.add(rect, vec)
    for (const rect of map.entranceTprs) Vec2.add(rect, vec)
}

export type MapArrangeData = Partial<MapArrange>

export interface RoomArrange extends Rect {}

export function doesMapArrangeFit(
    accesor: BuildQueueAccesor<MapArrangeData>,
    mapToFit: Pick<MapArrange, 'rects' | 'floor'>,
    id: Id
): boolean {
    for (let i = id - 1; i >= 0; i--) {
        const map = accesor.get(i)
        if (map.floor != mapToFit.floor) continue
        if (Rect.doesArrOverlapArr(map.rects!, mapToFit.rects)) return false
    }
    return true
}
