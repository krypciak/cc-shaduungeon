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
import {
    AreaInfo,
    getTprName,
    isEntityATpr,
    MapConstruct,
    registerMapConstructor,
    TprType,
} from '../map-construct/map-construct'
import { Dir, DirU, Rect } from '../util/geometry'
import { assert, shuffleArray } from '../util/util'
import { Vec2 } from '../util/vec2'
import { getPuzzleList, PuzzleData } from './puzzle-data'
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
            forcePuzzleMap?: string
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
    forcePuzzleMap,
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
    forcePuzzleMap?: string
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

        let puzzles = shuffleArray(getPuzzleList(tpr.dir))
        if (forcePuzzleMap) puzzles = puzzles.filter(p => p.map == forcePuzzleMap)
        // printMapArrangeQueue(accesor, 16, true, [], false, true)

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
                    dontPlace: true,
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
        const puzzle = map.placeData!.puzzle!
        const puzzleMapRaw: string = blitzkrieg.mapUtil.cachedMaps[puzzle.map]
        assert(puzzleMapRaw)
        const puzzleMap: sc.MapModel.Map = JSON.parse(blitzkrieg.mapUtil.cachedMaps[puzzle.map])

        const exitTpr = removeUnwantedTprsFromMap(puzzleMap, puzzle.exitTpr)
        removeCutscenesFromMap(puzzleMap)

        if (exitTpr) {
            const destId = map.id + 1
            const prevExitTprIndex = map.restTprs.findIndex(tpr => tpr.destId == destId)
            assert(prevExitTprIndex != -1)
            const prevExitTpr = map.restTprs[prevExitTprIndex]
            prevExitTpr.dontPlace = true

            exitTpr.settings.name = getTprName(false, prevExitTprIndex)
            exitTpr.settings.map = pathResolver(destId)
            exitTpr.settings.marker = getTprName(true, prevExitTpr.destIndex ?? 0)
        }

        const res = simpleMapConstructor(map, areaInfo, pathResolver, mapsArranged, mapsConstructed, [8, 1, 1, 1])

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
            }
        )

        res.constructed = out
        return res
    }
)

function removeUnwantedTprsFromMap(
    map: sc.MapModel.Map,
    keep: PuzzleData.Tpr | undefined
): sc.MapModel.MapEntity<TprType> | undefined {
    let foundToKeep: sc.MapModel.MapEntity<TprType> | undefined
    map.entities = map.entities.filter(e => {
        if (!isEntityATpr(e)) return true
        if (!keep) return false
        if (!(e.x == keep.x && e.y == keep.y && e.level == keep.level && e.type == keep.type)) return false
        assert(!foundToKeep)
        foundToKeep = e
        return true
    })
    if (keep) assert(foundToKeep)
    return foundToKeep
}

const cutsceneEventTypes = new Set<string>([
    'ADD_MSG_PERSON',
    'CLEAR_MSG',
    'SHOW_MSG',
    'SHOW_SIDE_MSG',
    'SET_MSG_EXPRESSION',
    'SET_TASK',
    'SET_ENTITY_ON_TOP_OTHER',
    'SET_CAMERA_TARGET',
    'SET_CAMERA_POS',
    'WAIT_UNTIL_ACTION_DONE',
    'CLEAR_TASK',
])
const cutsceneActionTypes = new Set<string>(['ENTER_DOOR', 'MOVE_TO_POINT', 'NAVIGATE_TO_POINT', 'SET_FACE_TO_ENTITY'])
function removeCutscenesFromMap(map: sc.MapModel.Map) {
    for (let enI = map.entities.length - 1; enI >= 0; enI--) {
        const entity = map.entities[enI]

        if (entity.type == 'NPC') {
            map.entities.splice(enI, 1)
        } else if (entity.type == 'EventTrigger') {
            const events = entity.settings.event ?? []
            for (let evI = events.length - 1; evI >= 0; evI--) {
                const event = events[evI]

                if (cutsceneEventTypes.has(event.type)) {
                    events.splice(evI)
                } else if (event.type == 'DO_ACTION') {
                    for (let acI = event.action.length - 1; acI >= 0; acI--) {
                        const action = event.action[acI]
                        if (cutsceneActionTypes.has(action.type)) {
                            event.action.splice(acI, 1)
                        }
                    }
                }
            }
        }
    }
}
