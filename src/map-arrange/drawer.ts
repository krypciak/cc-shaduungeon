import { Rect } from '../util/geometry'
import { Array2d } from '../util/util'
import { Vec2 } from '../util/vec2'
import { MapArrangeData, MapArrange, offsetMapArrange, copyMapArrange } from '../map-arrange/map-arrange'
import { BuildQueueAccesor } from '../build-queue/build-queue'
import 'colorts/lib/string'

const colorMap = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan'] as const

export function drawMapArrangeQueue(
    queue: BuildQueueAccesor<MapArrangeData>,
    scale: number,
    nonFinished: boolean = false,
    mapsAdd: MapArrangeData[] = [],
    keepInTheSamePlace?: boolean,
    color?: boolean
): string {
    const maps = queue.queue
        .filter(a => nonFinished || a.finishedEntry)
        .map(a => a.data)
        .concat(mapsAdd)
        .filter(a => a.rects && a.rects.length > 0 && a.id !== undefined)
        .map(copyMapArrange)

    if (maps.length == 0) return 'drawQueue: no maps'
    const rects = maps.flatMap(a => a.rects!)
    const bounds: Rect = Rect.boundsOfArr(rects)
    const offset = Vec2.mulC(bounds, -1)

    for (const map of maps) offsetMapArrange(map, offset)

    const map0 = maps.find(a => a.id == 0)
    if (keepInTheSamePlace && map0) {
        const r1 = map0.rects[0]

        let xdiff = 160 - r1.x
        if (xdiff < 0) xdiff = 0
        bounds.width += xdiff

        let ydiff = 35 - r1.y
        if (ydiff < 0) ydiff = 0
        bounds.height += ydiff

        const offset: Vec2 = { x: xdiff, y: ydiff }
        for (const map of maps) offsetMapArrange(map, offset)
    }

    const strmap: string[][] = Array2d.empty(
        { x: (bounds.width / scale).floor(), y: (bounds.height / scale).floor() },
        ' '
    )
    for (const map of maps) {
        for (const rect of map.rects) {
            let char = (map.id % 10).toString()
            if (color) {
                char = char[colorMap[Math.floor(map.id / 10) % colorMap.length]]
                if (map.id == 0) char = char.underline.italic
            }

            try {
                Array2d.pasteInto(
                    strmap,
                    Array2d.empty({ x: (rect.width / scale).floor(), y: (rect.height / scale).floor() }, char),
                    (rect.x / scale).floor(),
                    (rect.y / scale).floor()
                )
            } catch (e) {
                console.error(`error while trying to parse rect ${Rect.toString(rect)} of map ${map.id}`, e)
            }
        }
    }

    return strmap.map(arr => arr.join('')).join('\n')
}

let lastPrint: number = 0

export function printMapArrangeQueue(
    queue: BuildQueueAccesor<MapArrangeData>,
    scale: number,
    nonFinished: boolean = false,
    mapsAdd: MapArrange[] = [],
    keepInTheSamePlace?: boolean,
    color?: boolean,
    add: string = ''
) {
    if (!(lastPrint < Date.now() - 1000 / 10)) return

    lastPrint = Date.now()
    const res = drawMapArrangeQueue(queue, scale, nonFinished, mapsAdd, keepInTheSamePlace, color)
    const len = res.split('\n')[0].length
    // console.clear()
    console.log(add + ' ' + '='.repeat(Math.max(1, len - add.length - 1)) + ' ' + '\n' + res + '\n' + '='.repeat(len))
}
