import { Id, NextQueueEntryGenerator } from '../build-queue/build-queue'
import {
    TprArrange,
    MapArrangeData,
    MapArrange,
    RoomArrange,
    doesMapArrangeFit,
    TprArrange3d,
    RoomPlaceOrder,
} from '../map-arrange/map-arrange'
import { MapPicker, registerMapPickerNodeConfig } from '../map-arrange/map-picker/configurable'
import { AreaInfo, MapConstruct, registerMapConstructor } from '../map-construct/map-construct'
import { Dir, DirU, Rect } from '../util/geometry'
import { assert, shuffleArray } from '../util/util'
import { Vec2 } from '../util/vec2'
import { getPuzzleList } from './puzzle-data'
import { simpleMapConstructor } from './simple'

declare global {
    export namespace MapPickerNodeConfigs {
        export interface All {
            DngPuzzleTunnel: DngPuzzleTunnel
        }
        export interface DngPuzzleTunnel {
            count: number
            tunnelSize: Vec2
            randomizeDirTryOrder?: boolean
            followedBy?: MapPicker.ConfigNode
        }
    }
}
registerMapPickerNodeConfig('DngPuzzleTunnel', (data, buildtimeData) => {
    return das({ ...data, ...buildtimeData })
})
export function das({
    mapPicker,
    exitTpr,
    tunnelSize,
    destId,
    destIndex,
    finishedWhole,
    branchDone,
    nodeId,
    nodeProgress,
}: {
    mapPicker: MapPicker
    exitTpr: TprArrange
    tunnelSize: Vec2
    destId: Id
    destIndex: number
    finishedWhole?: boolean
    branchDone?: boolean
    nodeId?: number
    nodeProgress?: number
}): NextQueueEntryGenerator<MapArrangeData> {
    return (id, _, accesor) => {
        const tpr: TprArrange = {
            dir: DirU.flip(exitTpr.dir),
            x: exitTpr.x,
            y: exitTpr.y,
            destId,
            destIndex,
        }
        const map: MapArrange = {
            type: 'DngPuzzleTunnel',
            rects: [],
            restTprs: [],
            id,
            entranceTprs: [tpr],
            branchDone,
            nodeId,
            nodeProgress,
        }

        let tunnelEntrance: RoomArrange
        {
            const rect = Rect.centered(tunnelSize, tpr)
            const walls: Record<Dir, boolean> = [true, true, true, true]
            walls[exitTpr.dir] = false
            tunnelEntrance = { ...rect, walls, placeOrder: RoomPlaceOrder.Tunnel }
            map.rects.push(tunnelEntrance)
        }
        if (!doesMapArrangeFit(accesor, map, id)) return null

        const puzzles = shuffleArray(getPuzzleList(tpr.dir))

        return {
            data: map,
            id,
            branch: 0,
            branchCount: puzzles.length,

            nextQueueEntryGenerator: (_, branch, accesor) => {
                const puzzle = puzzles[branch]
                const map = {
                    rects: [] as RoomArrange[],
                    restTprs: [] as TprArrange3d[],
                    placeData: {
                        puzzle,
                    },
                } satisfies MapArrangeData

                const bounds = Rect.boundsOfArr(puzzle.rects)
                Rect.extend(bounds, puzzle.pasteOffset * 2 * 16)
                const size = { x: bounds.width, y: bounds.height }

                const rect = {
                    ...Vec2.snapToGrid(
                        tunnelEntrance,
                        16,
                        Vec2.sub(Rect.middle(Rect.side(tunnelEntrance, exitTpr.dir)), puzzle.entrance.vec)
                    ),
                    width: size.x,
                    height: size.y,
                }

                function assertRect(rect: Rect, rects1: Rect[]) {
                    const rects = rects1.map(Rect.copy)
                    const bounds = Rect.boundsOfArr(rects)

                    const rect1 = Rect.copy(rect)
                    Vec2.sub(rect1, bounds)
                    assert(rect1.x % 16 == 0)
                    assert(rect1.y % 16 == 0)
                    assert(rect1.width % 16 == 0)
                    assert(rect1.height % 16 == 0)
                }
                assertRect(tunnelEntrance, [tunnelEntrance, rect])
                assertRect(rect, [tunnelEntrance, rect])

                const room: RoomArrange = {
                    ...rect,
                    walls: [true, true, true, true],
                    dontPlace: true
                }

                map.rects.push(room)

                if (!doesMapArrangeFit(accesor, map, id)) return null

                {
                    const pos: Vec2 = Rect.sideVec(room, Vec2.add(Vec2.copy(puzzle.exit.vec), room), puzzle.exit.dir)
                    Vec2.round(pos)

                    map.restTprs.push({
                        ...pos,
                        dir: puzzle.exit.dir,
                        destId: id + 1,
                    })
                }

                return {
                    data: map,
                    id,
                    finishedEntry: true,
                    finishedWhole,

                    branch: 0,
                    branchCount: 1,
                    getNextQueueEntryGenerator: () => mapPicker(id, accesor),
                }
            },
        }
    }
}

registerMapConstructor(
    'DngPuzzleTunnel',
    (
        map: MapArrange,
        areaInfo: AreaInfo,
        pathResolver: (id: Id) => string,
        mapsArranged: MapArrange[],
        mapsConstructed: MapConstruct[]
    ) => {
        const res = simpleMapConstructor(map, areaInfo, pathResolver, mapsArranged, mapsConstructed, [8, 1, 1, 1])
        const puzzle = res.placeData!.puzzle!

        const puzzleMapRaw: string = blitzkrieg.mapUtil.cachedMaps[puzzle.map]
        assert(puzzleMapRaw)
        const puzzleMap: sc.MapModel.Map = JSON.parse(blitzkrieg.mapUtil.cachedMaps[puzzle.map])
        const pastePos = Vec2.add(Vec2.divC(Vec2.copy(res.rects[0]), 16), {
            x: puzzle.pasteOffset,
            y: puzzle.pasteOffset,
        })
        const out: sc.MapModel.Map = blitzkrieg.mapUtil.copySelMapAreaTo(
            res.constructed,
            puzzleMap,
            puzzle.sel,
            pastePos,
            [],
            {
                disableEntities: false,
                mergeLayers: false,
                removeCutscenes: true,
                // makePuzzlesUnique: true,
                // uniqueId: puzzle.usel.id,
                // uniqueSel: puzzle.usel.sel,
            }
        )
        res.constructed = out
        return res
    }
)
