import { Id, NextQueueEntryGenerator } from '../dungeon/build-queue'
import { Dir, Dir3d, Rect } from '../util/geometry'
import { Vec2 } from '../util/vec2'

export interface TprArrange3d extends Vec2 {
    dir: Dir3d
    destId: Id
    destIndex?: number
}
export interface TprArrange extends TprArrange3d {
    dir: Dir
}

export interface MapArrange {
    id: Id
    rects: Rect[]

    entranceTprs: TprArrange3d[]
    restTprs: TprArrange3d[]

    branchDone?: boolean
    createNextBranch?: NextQueueEntryGenerator<MapArrangeData>

    nodeId?: number
    nodeProgress?: number
}

export function offsetMapArrange(map: MapArrange, vec: Vec2) {
    for (const rect of map.rects) Vec2.add(rect, vec)
    for (const rect of map.restTprs) Vec2.add(rect, vec)
    for (const rect of map.entranceTprs) Vec2.add(rect, vec)
}

export type MapArrangeData = Partial<MapArrange>
