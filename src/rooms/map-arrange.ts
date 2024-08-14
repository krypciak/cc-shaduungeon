import { Id } from '../dungeon/build-queue'
import { Dir, Dir3d, Rect } from '../util/geometry'
import { Vec2 } from '../util/vec2'

export interface TprArrange3d extends Vec2 {
    dir: Dir3d
}
export interface TprArrange extends TprArrange3d {
    dir: Dir
}

export interface MapArrange {
    id: Id
    rects: Rect[]

    entranceTpr: TprArrange3d
    restTprs: TprArrange3d[]
}

export function baseMapArrange() {
    return { rects: [] as Rect[], restTprs: [] as TprArrange3d[] }
}

export function offsetMapArrange(map: MapArrange, vec: Vec2) {
    for (const rect of map.rects) Vec2.add(rect, vec)
    for (const rect of map.restTprs) Vec2.add(rect, vec)
    Vec2.add(map.entranceTpr, vec)
}

export type MapArrangeData = Partial<MapArrange>
