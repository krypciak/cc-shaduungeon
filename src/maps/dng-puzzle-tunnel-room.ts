import { Id, NextQueueEntryGenerator } from '../build-queue/build-queue'
import {
    TprArrange,
    MapArrangeData,
    MapArrange,
    RoomArrange,
    RoomPlaceOrder,
    doesMapArrangeFit,
    copyMapArrange,
} from '../map-arrange/map-arrange'
import { registerMapPickerNodeConfig, MapPicker } from '../map-arrange/map-picker/configurable'
import { registerMapConstructor, AreaInfo, MapConstruct, baseMapConstruct } from '../map-construct/map-construct'
import { placeRoom } from '../map-construct/room'
import { MapTheme } from '../map-construct/theme'
import { DirU, Rect, Dir } from '../util/geometry'
import { assert, shuffleArray } from '../util/util'
import { puzzleTunnelArrange, puzzleTunnelConstruct } from './dng-puzzle-tunnel'

declare global {
    export namespace MapPickerNodeConfigs {
        export interface All {
            DngPuzzleTunnelRoom: DngPuzzleTunnelRoom
        }
        export interface DngPuzzleTunnelRoom extends DngPuzzleTunnel {
            roomSize: Vec2
            entranceTunnelSize: Vec2
        }
    }
}

registerMapPickerNodeConfig('DngPuzzleTunnelRoom', (data, buildtimeData) => {
    return puzzleTunnelRoomMapArrange({ ...data, ...buildtimeData })
})
export function puzzleTunnelRoomMapArrange(obj: {
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
    randomizeDirTryOrder?: boolean

    roomSize: Vec2
    entranceTunnelSize: Vec2
}): NextQueueEntryGenerator<MapArrangeData> {
    return (id, _, accesor) => {
        const {
            exitTpr,
            destId,
            destIndex,
            branchDone,
            nodeId,
            nodeProgress,
            tunnelSize,
            entranceTunnelSize,
            roomSize,
            randomizeDirTryOrder,
        } = obj
        const tpr: TprArrange = {
            dir: DirU.flip(exitTpr.dir),
            x: exitTpr.x,
            y: exitTpr.y,
            destId,
            destIndex,
        }
        const map: MapArrange = {
            type: 'DngPuzzleTunnelRoom',
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
            const rect = Rect.centered(entranceTunnelSize, tpr)
            const walls: Record<Dir, boolean> = [true, true, true, true]
            walls[exitTpr.dir] = false
            tunnelEntrance = { ...rect, walls, placeOrder: RoomPlaceOrder.Tunnel }
            map.rects.push(tunnelEntrance)
        }
        let room: RoomArrange
        {
            const rect = Rect.centered(roomSize, {
                ...Rect.middle(Rect.side(tunnelEntrance, exitTpr.dir)),
                dir: tpr.dir,
            })
            room = { ...rect, walls: [true, true, true, true] }
            map.rects.push(room)
        }
        if (!doesMapArrangeFit(accesor, map, id)) return null

        let dirChoices = DirU.allExpect[tpr.dir]
        if (randomizeDirTryOrder) dirChoices = shuffleArray(dirChoices) as any

        return {
            data: map,
            id,
            branch: 0,
            branchCount: dirChoices.length,

            nextQueueEntryGenerator: (_, branch, accesor) => {
                const dir = dirChoices[branch]

                return puzzleTunnelArrange({
                    map: {},
                    accesor,
                    id,
                    centeredTunnelRect: Rect.centered(tunnelSize, {
                        ...Rect.middle(Rect.side(room, dir)),
                        dir: DirU.flip(dir),
                    }),
                    tunnelDir: dir,
                    tunnelOpenWallEntrance: true,
                    ...obj,
                })
            },
        }
    }
}

registerMapConstructor(
    'DngPuzzleTunnelRoom',
    (
        mapArrange: MapArrange,
        areaInfo: AreaInfo,
        pathResolver: (id: Id) => string,
        _mapsArranged: MapArrange[],
        _mapsConstructed: MapConstruct[]
    ) => {
        const entranceTunnelRoom = mapArrange.rects[0]
        assert(entranceTunnelRoom.placeOrder === RoomPlaceOrder.Tunnel)
        const mainRoom = mapArrange.rects[1]
        assert((mainRoom.placeOrder ?? 0) === RoomPlaceOrder.Room)

        const puzzleTunnelRoom = mapArrange.rects[2]
        assert(puzzleTunnelRoom.placeOrder === RoomPlaceOrder.Tunnel)
        const puzzleRoom = mapArrange.rects[3]
        assert((puzzleRoom.placeOrder ?? 0) == RoomPlaceOrder.Room)

        const theme = MapTheme.default
        const arrangeCopy = copyMapArrange(mapArrange)
        let mic = baseMapConstruct(mapArrange, pathResolver(mapArrange.id), areaInfo.id, theme, [12, 4, 4, 4])

        placeRoom(mainRoom, mic, theme.config, true)
        placeRoom(entranceTunnelRoom, mic, theme.config, true)

        const mapConstruct = puzzleTunnelConstruct({
            mapArrange,
            theme,
            mic,
            arrangeCopy,
            pathResolver,
            tunnelRoom: puzzleTunnelRoom,
            mainRoom: puzzleRoom,
        })

        const puzzle = mapArrange.placeData!.puzzle!
        return { ...mapConstruct, title: `DngPuzzleTunnelRoom ${mapArrange.id} ${puzzle.map}@${puzzle.index}` }
    }
)
