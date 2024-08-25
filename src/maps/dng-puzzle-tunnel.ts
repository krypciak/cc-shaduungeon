import { BuildQueueAccesor, Id, NextQueueEntryGenerator, QueueEntry } from '../build-queue/build-queue'
import {
    TprArrange,
    MapArrangeData,
    MapArrange,
    RoomArrange,
    doesMapArrangeFit,
    TprArrange3d,
    RoomPlaceOrder,
    copyMapArrange,
} from '../map-arrange/map-arrange'
import { MapPicker, registerMapPickerNodeConfig } from '../map-arrange/map-picker/configurable'
import { fixMapLayerOrdering } from '../map-construct/layer'
import {
    AreaInfo,
    baseMapConstruct,
    convertRoomsArrangeToRoomsConstruct,
    getTprName,
    isEntityATpr,
    MapConstruct,
    MapInConstruction,
    mapInConstructionFromMap,
    registerMapConstructor,
    TprType,
} from '../map-construct/map-construct'
import { placeRoom } from '../map-construct/room'
import { MapTheme } from '../map-construct/theme'
import { Dir, DirU, Rect } from '../util/geometry'
import { assert, shuffleArray } from '../util/util'
import { Vec2 } from '../util/vec2'
import { PuzzleData, getPuzzleList } from './puzzle-data'
import { pushTprEntity } from './simple'

function filterOutAlreadyUsedPuzzles(puzzles: PuzzleData[], accesor: BuildQueueAccesor<MapArrangeData>): PuzzleData[] {
    const puzzlesUsed = new Set<string>()
    for (const entry of accesor.queue) {
        const puzzle = entry.data.placeData?.puzzle
        if (!puzzle) continue
        puzzlesUsed.add(`${puzzle.map}@${puzzle.index}`)
    }
    return puzzles.filter(puzzle => !puzzlesUsed.has(`${puzzle.map}@${puzzle.index}`))
}

export function puzzleTunnelArrange({
    id,
    accesor,
    tunnelDir,
    tunnelOpenWallEntrance,
    map,
    mapPicker,
    centeredTunnelRect,
    finishedWhole,
    forcePuzzle,
}: {
    id: Id
    accesor: BuildQueueAccesor<MapArrangeData>
    tunnelDir: Dir
    tunnelOpenWallEntrance?: boolean
    map: MapArrangeData
    mapPicker: MapPicker
    centeredTunnelRect: Rect
    finishedWhole?: boolean
    forcePuzzle?: string
}): QueueEntry<MapArrangeData> | null {
    const oTunnelDir = DirU.flip(tunnelDir)

    let puzzles = shuffleArray(getPuzzleList(oTunnelDir))
    puzzles = filterOutAlreadyUsedPuzzles(puzzles, accesor)
    if (forcePuzzle) {
        const [map, index] = forcePuzzle.split('@')
        puzzles = puzzles.filter(p => p.map == map && p.index == parseInt(index))
    }

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

            let tunnelEntrance: RoomArrange
            {
                const rect = centeredTunnelRect
                const walls: Record<Dir, boolean> = [true, true, true, true]
                walls[tunnelDir] = false
                if (tunnelOpenWallEntrance) walls[oTunnelDir] = false
                tunnelEntrance = { ...rect, walls, placeOrder: RoomPlaceOrder.Tunnel }
                map.rects.push(tunnelEntrance)
            }
            const pasteOffsetVec: Vec2 = {
                x: puzzle.pasteOffset * 16,
                y: puzzle.pasteOffset * 16,
            }

            const bounds = Rect.boundsOfArr(puzzle.rects)
            Rect.extend(bounds, puzzle.pasteOffset * 16)
            const size = { x: bounds.width, y: bounds.height }

            const rect = {
                ...Vec2.snapToGrid(
                    tunnelEntrance,
                    16,
                    Vec2.sub(
                        Vec2.sub(Rect.middle(Rect.side(tunnelEntrance, tunnelDir)), puzzle.entrance.vec),
                        pasteOffsetVec
                    )
                ),
                width: size.x,
                height: size.y,
            }
            if (puzzle.sel.data.type == blitzkrieg.PuzzleRoomType.AddWalls) {
                // Vec2.add(tunnelEntrance, diff)
                Vec2.moveInDirection(rect, tunnelDir, puzzle.pasteOffset * 16)
            }

            const room: RoomArrange = {
                ...rect,
                walls: [true, true, true, true],
                dontPlace: puzzle.sel.data.type == blitzkrieg.PuzzleRoomType.WholeRoom ? true : false,
            }

            map.rects.push(room)

            {
                const selPos = Rect.mul(Rect.copy(puzzle.sel.sizeRect), 16)
                const diff: Vec2 = Vec2.sub(
                    Vec2.copy(puzzle.entrance.vec),
                    Vec2.sub(Vec2.copy(puzzle.sel.data.startPos), selPos)
                )
                Vec2.mulC(Vec2.round(Vec2.divC(diff, 16)), 16)

                if (puzzle.sel.data.type == blitzkrieg.PuzzleRoomType.AddWalls) {
                    // Vec2.add(tunnelEntrance, diff)
                    // Vec2.moveInDirection(tunnelEntrance, oTunnelDir, puzzle.pasteOffset * 16)
                } else if (puzzle.sel.data.type == blitzkrieg.PuzzleRoomType.WholeRoom) {
                    const amount = Math.abs(DirU.isVertical(oTunnelDir) ? diff.y : diff.x)
                    Rect.extend(tunnelEntrance, amount, { [oTunnelDir]: true })
                    Vec2.moveInDirection(tunnelEntrance, tunnelDir, amount)
                } else assert(false)
            }

            if (!doesMapArrangeFit(accesor, map, id)) return null

            {
                const exitPos = Vec2.add(Vec2.copy(puzzle.exit.vec), room)
                if (puzzle.exit.dir == Dir.SOUTH || puzzle.exit.dir == Dir.EAST) {
                    Vec2.add(exitPos, pasteOffsetVec)
                } else if (puzzle.exit.dir == Dir.WEST) {
                    exitPos.y += pasteOffsetVec.y
                } else if (puzzle.exit.dir == Dir.NORTH) {
                    exitPos.x += pasteOffsetVec.x
                }

                const pos: Vec2 = Rect.sideVec(room, exitPos, puzzle.exit.dir)
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
            forcePuzzle?: string
        }
    }
}
registerMapPickerNodeConfig('DngPuzzleTunnel', (data, buildtimeData) => {
    return puzzleTunnelMapArrange({ ...data, ...buildtimeData })
})
export function puzzleTunnelMapArrange(obj: {
    mapPicker: MapPicker
    exitTpr: TprArrange
    tunnelSize: Vec2
    destId: Id
    destIndex: number
    finishedWhole?: boolean
    branchDone?: boolean
    nodeId?: number
    nodeProgress?: number
    forcePuzzle?: string
}): NextQueueEntryGenerator<MapArrangeData> {
    return (id, _, accesor) => {
        const { exitTpr, destId, destIndex, branchDone, nodeId, nodeProgress, tunnelSize } = obj
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

        return puzzleTunnelArrange({
            map,
            accesor,
            id,
            centeredTunnelRect: Rect.centered(tunnelSize, tpr),
            tunnelDir: exitTpr.dir,
            ...obj,
        })
    }
}

/* constructing */
export function puzzleTunnelConstruct({
    mapArrange,
    pathResolver,
    tunnelRoom,
    mainRoom,
    theme,
    mic,
    arrangeCopy,
}: {
    mapArrange: MapArrange
    pathResolver: (id: Id) => string
    tunnelRoom: RoomArrange
    mainRoom: RoomArrange
    theme: MapTheme
    mic: MapInConstruction
    arrangeCopy: MapArrange
}): Omit<MapConstruct, 'title'> {
    const puzzle = mapArrange.placeData!.puzzle!
    const puzzleMapRaw: string = blitzkrieg.mapUtil.cachedMaps[puzzle.map]
    assert(puzzleMapRaw)
    const puzzleMap: sc.MapModel.Map = JSON.parse(blitzkrieg.mapUtil.cachedMaps[puzzle.map])

    const exitTpr = removeUnwantedTprsFromMap(puzzleMap, puzzle.exitTpr)
    removeCutscenesFromMap(puzzleMap)

    if (exitTpr) {
        const destId = mapArrange.id + 1
        const prevExitTprIndex = mapArrange.restTprs.findIndex(tpr => tpr.destId == destId)
        assert(prevExitTprIndex != -1)
        const prevExitTpr = mapArrange.restTprs[prevExitTprIndex]
        prevExitTpr.dontPlace = true

        exitTpr.settings.name = getTprName(false, prevExitTprIndex)
        exitTpr.settings.map = pathResolver(destId)
        exitTpr.settings.marker = getTprName(true, prevExitTpr.destIndex ?? 0)
    }

    mapArrange.entranceTprs.forEach((tpr, i) => pushTprEntity(mic, tunnelRoom, pathResolver, tpr, true, i))
    mapArrange.restTprs.forEach((tpr, i) => pushTprEntity(mic, tunnelRoom, pathResolver, tpr, false, i))

    const roomsConstruct = convertRoomsArrangeToRoomsConstruct(mapArrange.rects)
    if (!mainRoom.dontPlace) {
        placeRoom(mainRoom, mic, theme.config, true)
    }

    let constructed: sc.MapModel.Map = mic

    const pastePos = Vec2.add(Vec2.divC(Vec2.copy(mainRoom), 16), {
        x: puzzle.pasteOffset,
        y: puzzle.pasteOffset,
    })
    constructed = blitzkrieg.mapUtil.copySelMapAreaTo(constructed, puzzleMap, puzzle.sel, pastePos, [], {
        disableEntities: false,
        mergeLayers: false,
    })
    mic = mapInConstructionFromMap(constructed)

    placeRoom(tunnelRoom, mic, theme.config, true)

    constructed = Object.assign(constructed, { layers: undefined })
    constructed.layer = fixMapLayerOrdering(constructed.layer)
    return {
        ...mapArrange,
        rects: roomsConstruct,
        constructed,
        arrangeCopy,
    }
}

registerMapConstructor(
    'DngPuzzleTunnel',
    (
        mapArrange: MapArrange,
        areaInfo: AreaInfo,
        pathResolver: (id: Id) => string,
        _mapsArranged: MapArrange[],
        _mapsConstructed: MapConstruct[]
    ) => {
        const tunnelRoom = mapArrange.rects[0]
        assert(tunnelRoom.placeOrder === RoomPlaceOrder.Tunnel)
        const mainRoom = mapArrange.rects[1]
        assert((mainRoom.placeOrder ?? 0) == RoomPlaceOrder.Room)

        const theme = MapTheme.default
        const arrangeCopy = copyMapArrange(mapArrange)
        let mic = baseMapConstruct(mapArrange, pathResolver(mapArrange.id), areaInfo.id, theme, [12, 4, 4, 4])

        const puzzle = mapArrange.placeData!.puzzle!
        return {
            ...puzzleTunnelConstruct({ mapArrange, theme, mic, arrangeCopy, pathResolver, tunnelRoom, mainRoom }),
            title: `DngPuzzleTunnel ${mapArrange.id} ${puzzle.map}@${puzzle.index}`,
        }
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

        if (entity.type == 'EventTrigger') {
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
