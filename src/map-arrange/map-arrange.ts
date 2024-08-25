import { BuildQueueAccesor, Id, NextQueueEntryGenerator } from '../build-queue/build-queue'
import { PuzzleData } from '../maps/puzzle-data'
import { Dir, Dir3d, Rect } from '../util/geometry'
import { random } from '../util/util'
import { Vec2 } from '../util/vec2'
import { MapPicker } from './map-picker/configurable'

export interface TprArrange3d extends Vec2 {
    level?: number
    dir: Dir3d
    destId: Id
    destIndex?: number
    noDrawConnection?: boolean
    dontPlace?: boolean
}
export interface TprArrange extends TprArrange3d {
    dir: Dir
}

export interface MapArrange {
    type: MapPicker.ConfigTypes
    id: Id
    rects: RoomArrange[]
    floor?: number /* 0 by default */

    entranceTprs: TprArrange3d[]
    restTprs: TprArrange3d[]

    branchDone?: boolean
    createNextBranch?: NextQueueEntryGenerator<MapArrangeData>

    nodeId?: number
    nodeProgress?: number

    placeData?: {
        puzzle?: PuzzleData
    }
}

export function copyMapArrange(map: MapArrangeData): MapArrange {
    return {
        type: map.type!,
        id: map.id!,
        rects: (map.rects ?? [])?.map(a => ({ ...a })),
        floor: map.floor,

        entranceTprs: (map.entranceTprs ?? []).map(a => ({ ...a })),
        restTprs: (map.restTprs ?? []).map(a => ({ ...a })),

        branchDone: map.branchDone,
        createNextBranch: map.createNextBranch,

        nodeId: map.nodeId,
        nodeProgress: map.nodeProgress,

        placeData: map.placeData,
    }
}

export function offsetMapArrange(map: MapArrange, vec: Vec2) {
    for (const rect of map.rects) Vec2.add(rect, vec)
    for (const rect of map.restTprs) Vec2.add(rect, vec)
    for (const rect of map.entranceTprs) Vec2.add(rect, vec)
}

export type MapArrangeData = Partial<MapArrange>

export const RoomPlaceOrder = {
    Room: 0,
    Tunnel: 1,
} as const
export type RoomPlaceOrder = (typeof RoomPlaceOrder)[keyof typeof RoomPlaceOrder]

export interface RoomArrange extends Rect {
    walls: Record<Dir, boolean>
    placeOrder?: RoomPlaceOrder
    dontPlace?: boolean
}

export function doesMapArrangeFit(
    accesor: BuildQueueAccesor<MapArrangeData>,
    mapToFit: { rects: Rect[] } & Pick<MapArrange, 'floor'>,
    id: Id
): boolean {
    for (let i = id - 1; i >= 0; i--) {
        const map = accesor.get(i)
        if (map.floor != mapToFit.floor) continue
        if (Rect.doesArrOverlapArr(map.rects!, mapToFit.rects)) return false
    }
    return true
}
