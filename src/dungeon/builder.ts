import { Rect } from '../util/geometry'
import { BuildQueue, Id } from './build-queue'
import { Vec2 } from '../util/vec2'
import { Array2d, setRandomSeed } from '../util/util'
import { MapArrange, MapArrangeData, offsetMapArrange } from '../rooms/map-arrange'
import { RoomChooser, roomChooserSimpleSeedRandomSize } from './room-choosers/simple'

export type RoomBlueprint = {}

export type BlueprintRoot = Record<Id, RoomBlueprint>

export class DungeonBuilder {
    build(seed: string) {
        const queue = new BuildQueue<MapArrangeData>()
        const roomChooser: RoomChooser = roomChooserSimpleSeedRandomSize()
        setRandomSeed(seed)
        queue.begin(roomChooser(-1, queue))
        console.log(drawQueue(queue))
    }
}
export function drawQueue(queue: BuildQueue<MapArrangeData>): string {
    const maps = queue.queue.filter(a => a.finishedEntry).map(a => a.data) as MapArrange[]
    if (maps.length == 0) return 'drawQueue: no maps'
    const bounds: Rect = Rect.boundsOfArr(maps.flatMap(a => a.rects))
    const offset = Vec2.mulC(bounds, -1)
    for (const map of maps) offsetMapArrange(map, offset)

    const strmap: string[][] = Array2d.empty({ x: bounds.width, y: bounds.height }, ' ')
    for (const map of maps) {
        for (const rect of map.rects) {
            Array2d.pasteInto(
                strmap,
                Array2d.empty({ x: rect.width, y: rect.height }, map.id.toString().split('').last()),
                rect.x,
                rect.y
            )
        }
    }

    return strmap.map(arr => arr.join('')).join('\n')
}
