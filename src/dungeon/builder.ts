import { Rect } from '../util/geometry'
import { BuildQueue, BuildQueueAccesor, Id } from './build-queue'
import { Vec2 } from '../util/vec2'
import { Array2d, setRandomSeed } from '../util/util'
import { MapArrange, MapArrangeData, offsetMapArrange } from '../rooms/map-arrange'
import { RoomChooser, roomChooserTunnelSimpleSeedRandomSize } from './room-choosers/simple'

export type RoomBlueprint = {}

export type BlueprintRoot = Record<Id, RoomBlueprint>

export class DungeonBuilder {
    build(seed: string) {
        const queue = new BuildQueue<MapArrangeData>()
        const roomChooser: RoomChooser = roomChooserTunnelSimpleSeedRandomSize(100, { x: 2, y: 2 })
        setRandomSeed(seed)
        const res = queue.begin(roomChooser(-1, queue))
        if (res) {
        }
        // console.dir(res, { depth: null })
        console.log(drawQueue(queue))
    }
}
export function drawQueue(
    queue: BuildQueueAccesor<MapArrangeData>,
    nonFinished: boolean = false,
    mapsAdd: MapArrange[] = []
): string {
    const maps = queue.queue
        .filter(a => nonFinished || a.finishedEntry)
        .map(a => a.data)
        .concat(mapsAdd) as MapArrange[]
    if (maps.length == 0) return 'drawQueue: no maps'
    const rects = maps.flatMap(a => a.rects)
    const bounds: Rect = Rect.boundsOfArr(rects)
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
export function printQueue(
    queue: BuildQueueAccesor<MapArrangeData>,
    nonFinished: boolean = false,
    mapsAdd: MapArrange[] = [],
    add: string = ''
) {
    const res = drawQueue(queue, nonFinished, mapsAdd)
    const len = res.split('\n')[0].length
    console.log('='.repeat(len) + ' ' + add + '\n' + res + '\n' + '='.repeat(len))
}
