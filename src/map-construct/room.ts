import { RoomArrange } from '../map-arrange/map-arrange'
import { Rect, Dir } from '../util/geometry'
import { Coll } from '../util/map'
import { Array2d, assert } from '../util/util'
import { MapInConstruction } from './map-construct'
import { MapThemeConfig } from './theme'

export function placeRoom(room: RoomArrange, map: MapInConstruction, tc: MapThemeConfig, addNavMap: boolean) {
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

export function placeWall(map: MapInConstruction, tc: MapThemeConfig, pos: Vec2, dir: Dir): void {
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
