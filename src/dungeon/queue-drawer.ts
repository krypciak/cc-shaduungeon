import { MapArrangeData, MapArrange, offsetMapArrange } from '../rooms/map-arrange'
import { Rect } from '../util/geometry'
import { Array2d } from '../util/util'
import { BuildQueueAccesor } from './build-queue'
import { Vec2 } from '../util/vec2'
import 'colorts/lib/string'

const colorMap = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan'] as const

export function drawQueue(
    queue: BuildQueueAccesor<MapArrangeData>,
    nonFinished: boolean = false,
    mapsAdd: MapArrangeData[] = [],
    keepInTheSamePlace?: boolean,
    color?: boolean
): string {
    let maps = queue.queue
        .filter(a => nonFinished || a.finishedEntry)
        .map(a => a.data)
        .concat(mapsAdd)
        .filter(a => a.rects && a.rects.length > 0 && a.id !== undefined)
    if (maps.length == 0) return 'drawQueue: no maps'
    const rects = maps.flatMap(a => a.rects!)
    const bounds: Rect = Rect.boundsOfArr(rects)
    const offset = Vec2.mulC(bounds, -1)

    const copiedMaps: MapArrange[] = maps.map(a => ({
        rects: [...a.rects!.map(r => ({ ...r }))],
        entranceTprs: [...(a.entranceTprs ?? []).map(t => ({ ...t }))],
        id: a.id!,
        restTprs: [...(a.restTprs ?? []).map(t => ({ ...t }))],
    }))

    for (const map of copiedMaps) offsetMapArrange(map, offset)

    const map0 = copiedMaps.find(a => a.id == 0)
    if (keepInTheSamePlace && map0) {
        const r1 = map0.rects[0]

        let xdiff = 160 - r1.x
        if (xdiff < 0) xdiff = 0
        bounds.width += xdiff

        let ydiff = 35 - r1.y
        if (ydiff < 0) ydiff = 0
        bounds.height += ydiff

        const offset: Vec2 = { x: xdiff, y: ydiff }
        for (const map of copiedMaps) offsetMapArrange(map, offset)
    }

    const strmap: string[][] = Array2d.empty({ x: bounds.width, y: bounds.height }, ' ')
    for (const map of copiedMaps) {
        for (const rect of map.rects) {
            let char = (map.id % 10).toString()
            if (color) {
                char = char[colorMap[Math.floor(map.id / 10) % colorMap.length]]
                if (map.id == 0) char = char.underline.italic
            }

            try {
                Array2d.pasteInto(strmap, Array2d.empty({ x: rect.width, y: rect.height }, char), rect.x, rect.y)
            } catch (e) {
                console.error(`error while trying to parse rect ${Rect.toString(rect)} of map ${map.id}`, e)
            }
        }
    }

    return strmap.map(arr => arr.join('')).join('\n')
}

let lastPrint: number = 0

export function printQueue(
    queue: BuildQueueAccesor<MapArrangeData>,
    nonFinished: boolean = false,
    mapsAdd: MapArrange[] = [],
    keepInTheSamePlace?: boolean,
    color?: boolean,
    add: string = ''
) {
    if (!(lastPrint < Date.now() - 1000 / 10)) return

    lastPrint = Date.now()
    const res = drawQueue(queue, nonFinished, mapsAdd, keepInTheSamePlace, color)
    const len = res.split('\n')[0].length
    console.clear()
    console.log(add + ' ' + '='.repeat(Math.max(1, len - add.length - 1)) + ' ' + '\n' + res + '\n' + '='.repeat(len))
}
