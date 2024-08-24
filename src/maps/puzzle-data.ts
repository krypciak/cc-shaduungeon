import type { PuzzleRoomType, PuzzleSelection } from 'cc-blitzkrieg/types/puzzle-selection'
import { Rect, Dir } from '../util/geometry'
import { ObjectEntriesT } from '../util/modify-prototypes'
import type * as _ from 'cc-blitzkrieg/types/plugin'
import { TprType } from '../map-construct/map-construct'
import { assert } from '../util/util'
import { Vec2 } from '../util/vec2'

export namespace PuzzleData {
    export type Tpr = sc.MapModel.MapEntity<TprType>
}

export interface PuzzleData {
    sel: PuzzleSelection

    map: string
    rects: Rect[]
    entrance: ReturnType<typeof Rect.closestSideArr>
    exit: ReturnType<typeof Rect.closestSideArr>
    exitTpr?: PuzzleData.Tpr
    completionCondition?: { path: string; value: any }
    pasteOffset: number
}

let allPuzzles!: PuzzleData[]
export async function initAllPuzzles() {
    const puzzles: (PuzzleData | undefined)[] = []
    const promises: Promise<unknown>[] = []

    for (const [map, entry] of ObjectEntriesT(blitzkrieg.sels.puzzle.selMap)) {
        for (const sel of entry.sels) {
            if (sel.data.type == blitzkrieg.PuzzleRoomType.Dis) continue

            const promise = blitzkrieg.mapUtil.getMapObject(map)
            promises.push(promise)
            promise.then(mapData => puzzles.push(createPuzzleData(map, sel, mapData)))
        }
    }

    await Promise.all(promises)
    allPuzzles = puzzles.filter(Boolean) as PuzzleData[]
}

function createPuzzleData(map: string, sel: PuzzleSelection, mapData: sc.MapModel.Map): PuzzleData | undefined {
    if (sel.data.completionType == blitzkrieg.PuzzleCompletionType.Item) {
        console.warn(`sel on ${map} has UNIMPLEMENTED PuzzleCompletionType.Item`)
        return
    }
    const selPos = Rect.mul(Rect.copy(sel.sizeRect), 16)
    const rects = sel.bb.map(r => Vec2.sub(Rect.mul(Rect.copy(r), 16), selPos) as Rect)

    let exitTpr: PuzzleData.Tpr | undefined
    exitTprIf: if (
        sel.data.completionType == blitzkrieg.PuzzleCompletionType.GetTo ||
        sel.data.completionType == blitzkrieg.PuzzleCompletionType.Normal
    ) {
        const { dist, entity } = mapData.entities.reduce(
            (acc, entity) => {
                if (entity.type != 'Door' && entity.type != 'TeleportGround' && entity.type != 'TeleportField')
                    return acc

                const dist = Vec2.distance(entity, sel.data.endPos)
                if (dist < acc.dist) return { dist, entity }
                return acc
            },
            { dist: 100e3, entity: undefined } as { dist: number; entity: sc.MapModel.MapEntity<TprType> | undefined }
        )
        if (dist > 200) break exitTprIf
        assert(entity)

        exitTpr = { ...entity }
    } else assert(false)

    let completionCondition: { path: string; value: any } | undefined
    if (sel.data.completionType == blitzkrieg.PuzzleCompletionType.Normal) {
        const res = blitzkrieg.PuzzleSelectionManager.getPuzzleSolveCondition(sel)
        assert(res)
        completionCondition = { path: res[0], value: res[1] }
    } else if (sel.data.completionType == blitzkrieg.PuzzleCompletionType.GetTo) {
        completionCondition = undefined
    } else if (sel.data.completionType == blitzkrieg.PuzzleCompletionType.Item) {
        assert(false, `sel on ${map} has UNIMPLEMENTED PuzzleCompletionType.Item`)
    } else assert(false)

    const entrance = Rect.closestSideArr(rects, Vec2.sub(Vec2.copy(sel.data.startPos), selPos))
    const exit = Rect.closestSideArr(rects, Vec2.sub(Vec2.copy(sel.data.endPos), selPos))

    const pasteOffset = sel.data.type == blitzkrieg.PuzzleRoomType.AddWalls ? 3 : 0

    const res: PuzzleData = {
        sel,
        rects,
        map,
        entrance,
        exit,
        exitTpr,
        completionCondition,
        pasteOffset,
    }

    if (res.entrance.dir == res.exit.dir) return

    assert(res.exit.distance < 16 * 16)
    assert(res.entrance.distance < 16 * 16)
    return res
}

export function getPuzzleList(entranceDir: Dir, filter?: PuzzleRoomType): PuzzleData[] {
    assert(allPuzzles)
    return allPuzzles.filter(p => p.entrance.dir == entranceDir && (filter === undefined || filter == p.sel.data.type))
}
