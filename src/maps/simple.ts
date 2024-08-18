import { Vec2 } from '../util/vec2'
import { NextQueueEntryGenerator, QueueEntry } from '../build-queue/build-queue'
import {
    TprArrange,
    MapArrangeData,
    MapArrange,
    RoomArrange,
    doesMapArrangeFit,
    offsetMapArrange,
    TprArrange3d,
} from '../map-arrange/map-arrange'
import { MapPicker, registerMapPickerNodeConfig } from '../map-arrange/map-picker/configurable'
import { Dir, DirU, Rect } from '../util/geometry'
import { Array2d, assert, shuffleArray } from '../util/util'
import { registerMapConstructor } from '../map-construct/map-construct'
import { MapTheme, MapThemeConfig } from '../map-construct/theme'
import { Coll } from '../util/map'

declare global {
    export namespace MapPickerNodeConfigs {
        export interface All {
            Simple: Simple
        }
        export interface Simple {
            count: number
            size: Vec2
            randomizeDirTryOrder?: boolean
            followedBy?: MapPicker.ConfigNode
        }
    }
}

registerMapPickerNodeConfig('Simple', (data, buildtimeData) => {
    return simpleMapArrange({ ...data, ...buildtimeData })
})
export function simpleMapArrange({
    mapPicker,
    exitTpr,
    size,
    randomizeDirTryOrder,
    finishedWhole,
    forceExit,
    branchDone,
    nodeId,
    nodeProgress,
}: {
    mapPicker: MapPicker
    exitTpr: TprArrange
    size: Vec2
    randomizeDirTryOrder?: boolean
    finishedWhole?: boolean
    forceExit?: Dir
    branchDone?: boolean
    nodeId?: number
    nodeProgress?: number
}): NextQueueEntryGenerator<MapArrangeData> {
    return (id, _, accesor) => {
        const tpr: TprArrange = {
            x: exitTpr.x,
            y: exitTpr.y,
            dir: DirU.flip(exitTpr.dir),
            destId: id - 1,
        }
        const map: MapArrange = {
            type: 'Simple',
            rects: [],
            restTprs: [],
            id,
            entranceTprs: [tpr],
            branchDone,
            nodeId,
            nodeProgress,
        }
        let room: RoomArrange
        {
            const rect = Rect.centeredRect(size, tpr)
            room = { ...rect, walls: [true, true, true, true] }

            map.rects.push(room)
        }

        if (!doesMapArrangeFit(accesor, map, id)) return null

        let dirChoices = DirU.allExpect[tpr.dir]
        if (randomizeDirTryOrder) dirChoices = shuffleArray(dirChoices) as any
        if (forceExit) dirChoices = [forceExit]

        let branchCount = dirChoices.length
        if (branchDone) branchCount = 1

        const ret: QueueEntry<MapArrangeData> = {
            data: map,
            id,
            branch: 0,
            branchCount,
            finishedEntry: branchDone,

            finishedWhole,
            nextQueueEntryGenerator: (_, branch, accesor) => {
                const dir = dirChoices[branch]
                const exitTpr: TprArrange = {
                    ...Rect.middle(Rect.side(room, dir)),
                    dir,
                    destId: id + 1,
                }
                return {
                    data: { restTprs: [exitTpr] },
                    id,
                    finishedEntry: true,

                    branch: 0,
                    branchCount: 1,
                    getNextQueueEntryGenerator: () => mapPicker(id, accesor),
                }
            },
        }
        if (branchDone) {
            Object.assign(ret, {
                nextQueueEntryGenerator: undefined,
                finishedWhole,
                getNextQueueEntryGenerator: () => mapPicker(id, accesor),
            })
        }
        return ret
    }
}

registerMapConstructor('Simple', (map, areaInfo, pathResolver, _mapsArranged, _mapsConstructed) => {
    const boundsEntity = Rect.boundsOfArr(map.rects)
    Rect.extend(boundsEntity, 8 * 16)
    const offset = Vec2.mulC(boundsEntity, -1)
    offsetMapArrange(map, offset)

    const bounds = Rect.div(Rect.copy(boundsEntity), 16)

    const theme = MapTheme.default
    const mapSize: Vec2 = Rect.toTwoVecSize(bounds)[1]

    const mic: MapInConstruction = {
        name: pathResolver(map.id),
        mapWidth: mapSize.x,
        mapHeight: mapSize.y,
        masterLevel: 0,
        attributes: theme.getMapAttributes(areaInfo.id),
        screen: { x: 0, y: 0 },
        entities: [],

        ...getEmptyLayers(mapSize, 3, theme.config),
    }

    function pushTprEntity(tpr: TprArrange3d, isEntrance: boolean, index: number) {
        const name = getTprName(isEntrance, index)
        const dir = DirU.flip(tpr.dir as Dir)
        if (tpr.destId == -1) {
            return mic.entities.push({
                type: 'Marker',
                x: tpr.x,
                y: tpr.y,
                level: 0,
                settings: { name, dir: DirU.toString(dir) },
            })
        }

        let x = tpr.x
        let y = tpr.y

        if (tpr.dir != Dir.SOUTH) y -= 16
        if (tpr.dir != Dir.EAST) x -= 16

        mic.entities.push({
            type: 'Door',
            x,
            y,
            level: 0,
            settings: {
                name,
                map: pathResolver(tpr.destId),
                marker: getTprName(!isEntrance, tpr.destIndex ?? 0),
                dir: DirU.toString(dir),
            },
        })
    }

    map.entranceTprs.forEach((tpr, i) => pushTprEntity(tpr, true, i))
    map.restTprs.forEach((tpr, i) => pushTprEntity(tpr, false, i))

    for (const room of map.rects) {
        placeRoom(room, mic, theme.config, true)
    }

    const constructed: sc.MapModel.Map = Object.assign(mic, { layers: undefined })

    return {
        ...map,
        constructed,
        title: `map ${constructed.name}`,
    }
})

function getTprName(isEntrance: boolean, index: number): string {
    return `${isEntrance ? 'entrance' : 'rest'}_${index}`
}

interface MapConstructionLayers {
    background: number[][][]
    shadow: number[][]
    light: number[][]
    coll: number[][][]
    nav: number[][][]
}
interface MapInConstruction extends sc.MapModel.Map {
    layers: MapConstructionLayers
}

function emptyLayer(
    size: Vec2,
    fill: number,
    rest: Pick<sc.MapModel.MapLayer, 'type' | 'name' | 'tilesetName' | 'level'>
): sc.MapModel.MapLayer {
    return {
        visible: 1,
        repeat: false,
        distance: 1,
        yDistance: 0,
        tilesize: 16,
        moveSpeed: { x: 0, y: 0 },
        lighter: false,
        id: -10,

        data: Array2d.empty(size, fill),
        width: size.x,
        height: size.y,
        ...rest,
    }
}

function getEmptyLayers(
    size: Vec2,
    levelCount: number,
    theme: MapThemeConfig
): { layers: MapConstructionLayers; levels: sc.MapModel.Map['levels']; layer: sc.MapModel.MapLayer[] } {
    const layer: sc.MapModel.MapLayer[] = []
    const levels: sc.MapModel.Map['levels'] = []

    let background: number[][][] = [],
        shadow: number[][] = [],
        coll: number[][][] = [],
        nav: number[][][] = []

    for (let level = 0; level < levelCount; level++) {
        levels.push({ height: level * 16 * 2 })

        const backgroundLayer = emptyLayer(size, level == 0 ? theme.blackTile : 0, {
            type: 'Background',
            name: 'NEW_BACKGROUND',
            tilesetName: theme.tileset,
            level,
        })

        background.push(backgroundLayer.data)
        layer.push(backgroundLayer)

        if (level == 0 && theme.addShadows) {
            const shadowLayer = emptyLayer(size, 0, {
                name: 'NEW_SHADOW',
                type: 'Background',
                tilesetName: theme.shadowTileset,
                level,
            })
            shadow = shadowLayer.data
            layer.push(shadowLayer)
        }
        const collisionLayer = emptyLayer(size, Coll.Wall, {
            name: 'NEW_COLLISION',
            type: 'Collision',
            tilesetName: 'media/map/collisiontiles-16x16.png',
            level,
        })
        coll.push(collisionLayer.data)
        layer.push(collisionLayer)

        const navigationLayer = emptyLayer(size, 0, {
            name: 'NEW_NAVIGATION',
            type: 'Navigation',
            tilesetName: 'media/map/pathmap-tiles.png',
            level,
        })
        nav.push(navigationLayer.data)
        layer.push(navigationLayer)
    }

    const lightLayer = emptyLayer(size, 0, {
        name: 'NEW_LIGHT',
        type: 'Light',
        tilesetName: 'media/map/lightmap-tiles.png',
        level: 'last',
    })
    const light: number[][] = lightLayer.data
    layer.push(lightLayer)

    return {
        layers: {
            background,
            shadow,
            light,
            coll,
            nav,
        },
        levels,
        layer,
    }
}

function placeRoom(room: RoomArrange, map: MapInConstruction, tc: MapThemeConfig, addNavMap: boolean) {
    const rect = Rect.div(Rect.copy(room), 16)
    const { x: rx, y: ry } = rect
    const { x: rx2, y: ry2 } = Rect.x2y2(rect)
    const background = map.layers.background[0]
    const shadow = map.layers.shadow
    const light = map.layers.light
    const colls = map.layers.coll
    const navs = map.layers.nav

    // draw floor
    for (let y = ry; y < ry2; y++) {
        for (let x = rx; x < rx2; x++) {
            background[y][x] = tc.floorTile
            if (tc.addShadows) {
                shadow![y][x] = 0
            }
            for (const coll of colls) {
                coll[y][x] = 0
            }
            light[y][x] = 0
            if (addNavMap) {
                for (const nav of navs) {
                    nav[y][x] = 1
                }
            }
        }
    }

    if (room.walls[Dir.NORTH]) {
        for (let x = rx; x < rx2; x++) {
            placeWall(map, tc, { x, y: ry }, Dir.NORTH)
        }
    } else if (tc.addShadows) {
        Array2d.pasteInto(shadow, tc.edgeShadowBottomLeft!, rx, ry - 2)
        Array2d.pasteInto(shadow, tc.edgeShadowBottomRight!, rx2 - 2, ry - 2)
        for (let x = rx + 2; x < rx2 - 2; x++) {
            for (let y = ry - 2; y < ry; y++) {
                shadow![y][x] = 0
            }
        }
    }

    if (room.walls[Dir.EAST]) {
        for (let y = ry; y < ry2; y++) {
            placeWall(map, tc, { x: rx2, y }, Dir.EAST)
        }
    } else if (tc.addShadows) {
        Array2d.pasteInto(shadow!, tc.edgeShadowTopLeft!, rx2, ry)
        Array2d.pasteInto(shadow!, tc.edgeShadowBottomLeft!, rx2, ry2 - 2)
        for (let y = ry + 2; y < ry2 - 2; y++) {
            for (let x = rx2; x < rx2 + 2; x++) {
                shadow![y][x] = 0
            }
        }
    }

    if (room.walls[Dir.SOUTH]) {
        for (let x = rx; x < rx2; x++) {
            placeWall(map, tc, { x, y: ry2 }, Dir.SOUTH)
        }
    } else if (tc.addShadows) {
        Array2d.pasteInto(shadow!, tc.edgeShadowTopLeft!, rx, ry2)
        Array2d.pasteInto(shadow!, tc.edgeShadowTopRight!, rx2 - 2, ry2)
        for (let x = rx + 2; x < rx2 - 2; x++) {
            for (let y = ry2; y < ry2 + 2; y++) {
                shadow![y][x] = 0
            }
        }
    }

    if (room.walls[Dir.WEST]) {
        for (let y = ry; y < ry2; y++) {
            placeWall(map, tc, { x: rx, y }, Dir.WEST)
        }
    } else if (tc.addShadows) {
        Array2d.pasteInto(shadow!, tc.edgeShadowTopRight!, rx - 2, ry)
        Array2d.pasteInto(shadow!, tc.edgeShadowBottomRight!, rx - 2, ry2 - 2)
        for (let y = ry + 2; y < ry2 - 2; y++) {
            for (let x = rx - 2; x < rx; x++) {
                shadow![y][x] = 0
            }
        }
    }

    if (tc.addShadows) {
        // fix shadow corners
        if (room.walls[Dir.NORTH] && room.walls[Dir.WEST]) {
            Array2d.pasteInto(shadow!, tc.cornerShadowTopLeft!, rx, ry)
        }
        if (room.walls[Dir.NORTH] && room.walls[Dir.EAST]) {
            Array2d.pasteInto(shadow!, tc.cornerShadowTopRight!, rx2 - 2, ry)
        }
        if (room.walls[Dir.SOUTH] && room.walls[Dir.WEST]) {
            Array2d.pasteInto(shadow!, tc.cornerShadowBottomLeft!, rx, ry2 - 2)
        }
        if (room.walls[Dir.SOUTH] && room.walls[Dir.EAST]) {
            Array2d.pasteInto(shadow!, tc.cornerShadowBottomRight!, rx2 - 2, ry2 - 2)
        }
    }

    if (tc.addLight) {
        assert(tc.lightStep)
        assert(tc.lightTile)
        const distFromWall = 5
        const lx1 = rx + distFromWall - 1
        const ly1 = ry + distFromWall - 1
        const lx2 = rx2 - distFromWall
        const ly2 = ry2 - distFromWall

        const mx = Math.floor(lx1 + (lx2 - lx1) / 2)
        const my = Math.floor(ly1 + (ly2 - ly1) / 2)
        light[my][mx] = tc.lightTile

        for (let x = lx1; x <= mx; x += tc.lightStep) {
            for (let y = ly1; y <= my; y += tc.lightStep) {
                light[y][x] = tc.lightTile
            }
            for (let y = ly2; y >= my; y -= tc.lightStep) {
                light[y][x] = tc.lightTile
            }
            light[my][x] = tc.lightTile
        }
        for (let x = lx2; x >= mx; x -= tc.lightStep) {
            for (let y = ly1; y <= my; y += tc.lightStep) {
                light[y][x] = tc.lightTile
            }
            for (let y = ly2; y >= my; y -= tc.lightStep) {
                light[y][x] = tc.lightTile
            }
            light[my][x] = tc.lightTile
        }

        for (let y = ly1; y <= ly2; y += tc.lightStep) {
            light[y][mx] = tc.lightTile
        }
        for (let y = ly2; y >= my; y -= tc.lightStep) {
            light[y][mx] = tc.lightTile
        }
    }
}

function placeWall(map: MapInConstruction, tc: MapThemeConfig, pos: Vec2, dir: Dir): void {
    const background = map.layers.background[0]
    const shadow = map.layers.shadow
    const colls = map.layers.coll

    switch (dir) {
        case Dir.NORTH: {
            for (let i = 0; i < tc.wallUp.length; i++) {
                const y = pos.y - i + 1
                if (tc.wallUp[i]) {
                    background[y][pos.x] = tc.wallUp[i]
                }
                if (tc.addShadows && tc.wallUpShadow![i]) {
                    shadow![y][pos.x] = tc.wallUpShadow![i]
                }
            }
            for (let i = map.masterLevel; i < colls.length; i++) {
                const ri = i - map.masterLevel
                const coll: number[][] = colls[i]
                for (let y = pos.y - 3; y <= pos.y; y++) {
                    coll[y - ri * 2][pos.x] = Coll.None
                }
                let y: number = pos.y - ri * 2 - 1
                coll[y][pos.x] = Coll.Wall
            }
            break
        }
        case Dir.EAST: {
            for (let i = 0; i < tc.wallRight.length; i++) {
                const x = pos.x - tc.wallRight.length + i + 1
                if (tc.wallRight[i]) {
                    if (!background[pos.y][x]) {
                        background[pos.y][x] = tc.wallRight[i]
                    }

                    for (const coll of colls) {
                        coll[pos.y][x] = Coll.Wall
                        coll[pos.y][x + 1] = Coll.Wall
                    }
                }
                if (tc.addShadows && tc.wallRightShadow![i]) {
                    shadow![pos.y][x] = tc.wallRightShadow![i]
                }
            }
            break
        }
        case Dir.SOUTH: {
            for (let i = 0; i < tc.wallDown.length; i++) {
                const y = pos.y - tc.wallDown.length + i + 1
                if (tc.wallDown[i]) {
                    background[y][pos.x] = tc.wallDown[i]
                }
                if (tc.addShadows && tc.wallDownShadow![i]) {
                    shadow![y][pos.x] = tc.wallDownShadow![i]
                }
            }
            for (let i = map.masterLevel; i < colls.length; i++) {
                const ri = i - map.masterLevel
                const coll: number[][] = colls[i]
                for (let y = pos.y; y >= pos.y - 3; y--) {
                    coll[y - ri * 2][pos.x] = Coll.None
                }
                const y: number = pos.y - ri * 2
                coll[y][pos.x] = Coll.Wall
            }
            break
        }
        case Dir.WEST: {
            for (let i = 0; i < tc.wallLeft.length; i++) {
                const x = pos.x + i - 1
                if (tc.wallLeft[i]) {
                    if (!background[pos.y][x]) {
                        background[pos.y][x] = tc.wallLeft[i]
                    }
                    for (const coll of colls) {
                        coll[pos.y][x] = Coll.Wall
                        coll[pos.y][x - 1] = Coll.Wall
                    }
                }
                if (tc.addShadows && tc.wallLeftShadow![i]) {
                    shadow![pos.y][x] = tc.wallLeftShadow![i]
                }
            }
            break
        }
    }
}
