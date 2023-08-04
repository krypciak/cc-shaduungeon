import { MapLayer, CollisionTile, Tileset, CCMap, Rect, Dir, DirUtil, MapRect, Blitzkrieg } from './util.js'
import { AreaInfo } from './area-builder.js'

const tilesize: number = 16
declare const blitzkrieg: Blitzkrieg

export type RoomThemeConfig = {
    bgm: string,
    tileset: Tileset,
    mapSounds: string,
    mapStyle: string,
    weather: string,
    floorTile: number,
    blackTile: number,
    wallUp: number[],
    wallDown: number[],
    wallRight: number[],
    wallLeft: number[],
    addShadows?: boolean,
    shadowTileset?: Tileset,
    wallUpShadow?: number[],
    wallDownShadow?: number[],
    wallRightShadow?: number[],
    wallLeftShadow?: number[],
    cornerShadowTopRight?: number[][],
    cornerShadowTopLeft?: number[][],
    cornerShadowBottomRight?: number[][],
    cornerShadowBottomLeft?: number[][],
    edgeShadowTopRight?: number[][],
    edgeShadowTopLeft?: number[][],
    edgeShadowBottomRight?: number[][],
    edgeShadowBottomLeft?: number[][],
    addLight?: boolean,
    lightTile?: number,
    lightStep?: number
}

export class RoomTheme {
    constructor(public config: RoomThemeConfig) { }
    
    getMapAttributes(areaName: string): sc.MapModel.MapAttributes {
        return { 
            bgm: this.config.bgm,
            "map-sounds": this.config.mapSounds,
            mapStyle: this.config.mapStyle,
            weather: this.config.weather,
            area: areaName,
            saveMode: 'ENABLED',
            cameraInBounds: true,
            npcRunners: ''
        }
    }
}

const themes: Map<String, RoomTheme> = new Map([
    ['rhombus-dng', new RoomTheme({
        bgm: 'puzzle',
        mapSounds: '',
        tileset: 'media/map/rhombus-dungeon2.png',
        mapStyle: 'rhombus-puzzle',
        weather: 'RHOMBUS_DUNGEON',
        floorTile: 34,
        blackTile: 6,

        addShadows: true,
        shadowTileset: 'media/map/dungeon-shadow.png',

        addLight: true,
        lightTile: 18,
        lightStep: 6,
        wallUp: [0, 0, 169, 137, 105, 137, 105, 105, 38],
        wallUpShadow: [168, 200, 168, 97, 81, 65, 49, 33, 17],
        wallRight: [0, 0, 6],
        wallRightShadow: [185, 217, 0],
        wallDown: [0, 0, 296],
        wallDownShadow: [184, 216, 0],
        wallLeft: [6, 0, 0],
        wallLeftShadow: [0, 201, 169],
        cornerShadowTopRight: [
            [200, 200],
            [171, 217]],
        cornerShadowTopLeft: [
            [200, 200],
            [201, 170]],
        cornerShadowBottomRight: [ 
            [187, 217],
            [216, 216]],
        cornerShadowBottomLeft: [ 
            [201, 186],
            [216, 216]],

        edgeShadowTopRight: [
            [185, 198],
            [166, 168]],
        edgeShadowTopLeft: [
            [182, 184],
            [185, 214]],
        edgeShadowBottomRight: [
            [197, 169],
            [168, 165]],
        edgeShadowBottomLeft: [
            [184, 181],
            [213, 169]],
    })],
    ['cold-dng', new RoomTheme({
        bgm: 'coldDungeon',
        mapSounds: 'COLD_DUNGEON',
        tileset: 'media/map/cold-dng.png',
        mapStyle: 'cold-dng',
        weather: 'COLD_DUNGEON',
        floorTile: 156,
        blackTile: 135,

        addShadows: false,

        addLight: true,
        lightTile: 3,
        lightStep: 6,
        wallUp: [0, 0, 366, 334, 302, 334, 302, 275, 243],
        wallRight: [0, 0, 135],
        wallDown: [0, 0, 147],
        wallLeft: [135, 0, 0],
    })],
])

const defaultRoomTheme = (themes.get('rhombus-dng') as RoomTheme)

export function getRoomThemeFromArea(areaName: string): RoomTheme {
    return (themes.get(areaName) ?? defaultRoomTheme) as RoomTheme
}

interface RoomPlaceVars {
    background: number[][]
    shadow?: number[][]
    light: number[][]
    colls: number[][][]
    navs: number[][][]
    theme: RoomTheme
    tc: RoomThemeConfig
}

export function getEmptyMap(width: number, height: number, levelCount: number, theme: RoomTheme, mapName: string, areaName: string): { map: CCMap, rpv: RoomPlaceVars }  {
    const layers: MapLayer[] = []
    const levels: { height: number }[] = []

    let background: number[][] | undefined, shadow: number[][] | undefined, colls: number[][][] = [], navs: number[][][] = []

    for (let level = 0; level < levelCount; level++) {
        levels.push({ height: level * tilesize*2 })

        const backgroundLayer = new MapLayer(width, height, 'NEW_BACKGROUND', 'Background', theme.config.tileset, level)
        backgroundLayer.fill(level == 0 ? theme.config.blackTile : 0)
        if (level == 0) { background = backgroundLayer.data }
        layers.push(backgroundLayer)

        if (level == 0 && theme.config.addShadows) {
            const shadowLayer = new MapLayer(width, height, 'NEW_SHADOW', 'Background', theme.config.shadowTileset!, level)
            shadowLayer.fill(0)
            shadow = shadowLayer.data
            layers.push(shadowLayer)
        }
        const collisionLayer = new MapLayer(width, height, 'NEW_COLLISION', 'Collision', 'media/map/collisiontiles-16x16.png', level)
        collisionLayer.fill(CollisionTile.Wall)
        colls.push(collisionLayer.data)
        layers.push(collisionLayer)

        const navigationLayer = new MapLayer(width, height, 'NEW_NAVIGATION', 'Navigation', 'media/map/pathmap-tiles.png', level)
        navigationLayer.fill(0)
        navs.push(navigationLayer.data)
        layers.push(navigationLayer)
    }


    const lightLayer = new MapLayer(width, height, 'NEW_LIGHT', 'Light', 'media/map/lightmap-tiles.png', 'last')
    lightLayer.fill(0)
    const light: number[][] = lightLayer.data
    layers.push(lightLayer)

    if (! background) { throw new Error('Background layer is not set') }

    return {
        map: new CCMap(mapName, levels, width, height, 0, theme.getMapAttributes(areaName), [], layers),
        rpv: {
            background, shadow, light, colls, navs, theme, tc: theme.config
        }
    }
}

export function getPosOnRectSide(dir: Dir, rect: Rect, prefPos: Vec2 = { x: 0, y: 0 }): Vec2 {
    const pos = { x: 0, y: 0 }
    switch (dir) {
        case Dir.NORTH: pos.y = rect.y - 1;  break
        case Dir.EAST:  pos.x = rect.x2 + 1; break
        case Dir.SOUTH: pos.y = rect.y2 + 1; break
        case Dir.WEST: pos.x = rect.x - 1; break
    }
    if (dir == Dir.NORTH || dir == Dir.SOUTH) {
        pos.x = (prefPos.x ? prefPos.x/tilesize: rect.x + (rect.x2 - rect.x)/2) * tilesize
    } else {
        pos.y = (prefPos.y ? pos.y = prefPos.y/tilesize : rect.y + (rect.y2 - rect.y)/2) * tilesize
    }

    return pos
}

export class MapBuilder {
    rooms: Room[]
    map?: CCMap
    theme?: RoomTheme
    rpv?: RoomPlaceVars
    private placed: boolean

    constructor(
        public width: number,
        public height: number,
        public levelCount: number,
        public areaInfo: AreaInfo) {

        this.rooms = []
        this.placed = false
    }

    addRoom(room: Room) {
        this.rooms.push(room)
    }

    place(theme: RoomTheme, mapName: string) {
        this.theme = theme
        const { map, rpv } = getEmptyMap(
            this.width, this.height, this.levelCount, this.theme, mapName, this.areaInfo.name)
        this.map = map
        this.rpv = rpv
        for (const room of this.rooms) {
            room.place(this.rpv)
        }
        this.placed = true
    }

    async finalize() {
        if (! this.placed) { throw new Error('cannot finalize, map in undefinded') }
        const { map } = await CCMap.trim(this.map!, this.rpv!.tc)
        this.map = map
    }
}

export class Room {
    baseRect: MapRect
    floorRect: MapRect
    private addWalls: boolean
    door?: { name: string, dir: Dir, pos: Vec2 }

    constructor(
        public name: string,
        rect: Rect,
        public wallSides: boolean[],
        public additionalSpace: number,
        public addNavMap: boolean,
    ) {
        this.baseRect = MapRect.fromRect(rect)
        this.floorRect = MapRect.fromxy2(
            this.baseRect.x - this.additionalSpace,
            this.baseRect.y - this.additionalSpace,
            this.baseRect.x2 + this.additionalSpace,
            this.baseRect.y2 + this.additionalSpace,
        )

        this.addWalls = false
        for (const addSide of this.wallSides) {
            if (addSide) { this.addWalls = true; break }
        }
    }

    place(rpv: RoomPlaceVars) {
        this.placeRoom(rpv, this.addNavMap)
    }

    setDoor(name: string, dir: Dir, prefPos: Vec2) {
        const doorPos = getPosOnRectSide(dir, this.floorRect, prefPos)

        if (DirUtil.isVertical(dir)) { doorPos.x -= 16 } else { doorPos.y -= 16 }
        if (dir == Dir.SOUTH) { doorPos.y -= 16 }
        if (dir == Dir.EAST) { doorPos.x -= 16 }

        this.door = { name, dir, pos: doorPos }
    }

    placeRoom(rpv: RoomPlaceVars, addNavMap: boolean) {
        if (this.addWalls) {
            // draw floor
            for (let y = this.floorRect.y; y < this.floorRect.y2; y++) {
                for (let x = this.floorRect.x; x < this.floorRect.x2; x++) {
                    rpv.background[y][x] = rpv.tc.floorTile
                    if (rpv.tc.addShadows) { rpv.shadow![y][x] = 0 }
                    for (const coll of rpv.colls) { coll[y][x] = 0 }
                    rpv.light[y][x] = 0
                    if (! addNavMap) { for (const nav of rpv.navs) { nav[y][x] = 1 } }
                }
            }

            if (this.wallSides[Dir.NORTH]) {
                for (let x = this.floorRect.x; x < this.floorRect.x2; x++) {
                    this.placeWall(rpv, { x, y: this.floorRect.y }, Dir.NORTH)
                }
            } else if (rpv.tc.addShadows) {
                blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.edgeShadowBottomLeft!, this.floorRect.x, this.floorRect.y - 2)
                blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.edgeShadowBottomRight!, this.floorRect.x2 - 2, this.floorRect.y - 2)
                for (let x = this.floorRect.x + 2; x < this.floorRect.x2 - 2; x++) {
                    for (let y = this.floorRect.y - 2; y < this.floorRect.y; y++) {
                        rpv.shadow!![y][x] = 0
                    }
                }
            }

            if (this.wallSides[Dir.EAST]) {
                for (let y = this.floorRect.y; y < this.floorRect.y2; y++) {
                    this.placeWall(rpv, { x: this.floorRect.x2, y }, Dir.EAST)
                }
            } else if (rpv.tc.addShadows) {
                blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.edgeShadowTopLeft!, this.floorRect.x2, this.floorRect.y)
                blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.edgeShadowBottomLeft!, this.floorRect.x2, this.floorRect.y2 - 2)
                for (let y = this.floorRect.y + 2; y < this.floorRect.y2 - 2; y++) {
                    for (let x = this.floorRect.x2; x < this.floorRect.x2 + 2; x++) {
                        rpv.shadow!![y][x] = 0
                    }
                }
            }

            if (this.wallSides[Dir.SOUTH]) {
                for (let x = this.floorRect.x; x < this.floorRect.x2; x++) {
                    this.placeWall(rpv, { x, y: this.floorRect.y2 }, Dir.SOUTH)
                }
            } else if (rpv.tc.addShadows) {
                blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.edgeShadowTopLeft!, this.floorRect.x, this.floorRect.y2)
                blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.edgeShadowTopRight!, this.floorRect.x2 - 2, this.floorRect.y2)
                for (let x = this.floorRect.x + 2; x < this.floorRect.x2 - 2; x++) {
                    for (let y = this.floorRect.y2; y < this.floorRect.y2 + 2; y++) {
                        rpv.shadow!![y][x] = 0
                    }
                }
            }
            
            if (this.wallSides[Dir.WEST]) {
                for (let y = this.floorRect.y; y < this.floorRect.y2; y++) {
                    this.placeWall(rpv, { x: this.floorRect.x, y }, Dir.WEST)
                }
            } else if (rpv.tc.addShadows) {
                blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.edgeShadowTopRight!, this.floorRect.x - 2, this.floorRect.y)
                blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.edgeShadowBottomRight!, this.floorRect.x - 2, this.floorRect.y2 - 2)
                for (let y = this.floorRect.y + 2; y < this.floorRect.y2 - 2; y++) {
                    for (let x = this.floorRect.x - 2; x < this.floorRect.x; x++) {
                        rpv.shadow!![y][x] = 0
                    }
                }
            }


            if (rpv.tc.addShadows) {
                // fix shadow corners
                if (this.wallSides[Dir.NORTH] && this.wallSides[Dir.WEST]) {
                    blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.cornerShadowTopLeft!, this.floorRect.x, this.floorRect.y)
                }
                if (this.wallSides[Dir.NORTH] && this.wallSides[Dir.EAST]) {
                    blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.cornerShadowTopRight!, this.floorRect.x2 - 2, this.floorRect.y)
                }
                if (this.wallSides[Dir.SOUTH] && this.wallSides[Dir.WEST]) {
                    blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.cornerShadowBottomLeft!, this.floorRect.x, this.floorRect.y2 - 2)
                }
                if (this.wallSides[Dir.SOUTH] && this.wallSides[Dir.EAST]) {
                    blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.cornerShadowBottomRight!, this.floorRect.x2 - 2, this.floorRect.y2 - 2)
                }
            }
        

            if (rpv.tc.addLight) {
                const distFromWall = 5
                const lx1 = this.floorRect.x + distFromWall - 1
                const ly1 = this.floorRect.y + distFromWall - 1
                const lx2 = this.floorRect.x2 - distFromWall
                const ly2 = this.floorRect.y2 - distFromWall

                const mx = Math.floor(lx1 + (lx2 - lx1)/2)
                const my = Math.floor(ly1 + (ly2 - ly1)/2)
                rpv.light[my][mx] = rpv.tc.lightTile!

                for (let x = lx1; x <= mx; x += rpv.tc.lightStep!) {
                    for (let y = ly1; y <= my; y += rpv.tc.lightStep!) { rpv.light[y][x] = rpv.tc.lightTile! }
                    for (let y = ly2; y >= my; y -= rpv.tc.lightStep!) { rpv.light[y][x] = rpv.tc.lightTile! }
                    rpv.light[my][x] = rpv.tc.lightTile!
                }
                for (let x = lx2; x >= mx; x -= rpv.tc.lightStep!) {
                    for (let y = ly1; y <= my; y += rpv.tc.lightStep!) { rpv.light[y][x] = rpv.tc.lightTile! }
                    for (let y = ly2; y >= my; y -= rpv.tc.lightStep!) { rpv.light[y][x] = rpv.tc.lightTile! }
                    rpv.light[my][x] = rpv.tc.lightTile!
                }

                for (let y = ly1; y <= ly2; y += rpv.tc.lightStep!) { rpv.light[y][mx] = rpv.tc.lightTile! }
                for (let y = ly2; y >= my; y -= rpv.tc.lightStep!) { rpv.light[y][mx] = rpv.tc.lightTile! }
            }
        }
    }

    placeWall(rpv: RoomPlaceVars, pos: Vec2, dir: Dir): void {
        switch (dir) {
            case Dir.NORTH: {
                for (let i = 0; i < rpv.tc.wallUp.length; i++) {
                    const y = pos.y - i + 1
                    if (rpv.tc.wallUp[i]) {
                        rpv.background[y][pos.x] = rpv.tc.wallUp[i]
                    }
                    if (rpv.tc.addShadows && rpv.tc.wallUpShadow![i]) { rpv.shadow![y][pos.x] = rpv.tc.wallUpShadow![i] }
                }
                for (let i = 0; i < rpv.colls.length; i++) {
                    const coll = rpv.colls[i]
                    if (i > 0) { coll[pos.y][pos.x] = 1 }
                    coll[pos.y - 1][pos.x] = 2
                    coll[pos.y - 2][pos.x] = 2
                }
                break
            }
            case Dir.EAST: {
                for (let i = 0; i < rpv.tc.wallRight.length; i++) {
                    const x = pos.x - rpv.tc.wallRight.length + i + 1
                    if (rpv.tc.wallRight[i]) {
                        if (! rpv.background[pos.y][x]) { rpv.background[pos.y][x] = rpv.tc.wallRight[i] }

                        for (const coll of rpv.colls) {
                            coll[pos.y][x] = 2
                            coll[pos.y][x + 1] = 2
                        }
                    }
                    if (rpv.tc.addShadows && rpv.tc.wallRightShadow![i]) { rpv.shadow![pos.y][x] = rpv.tc.wallRightShadow![i] }
                }
                break
            }
            case Dir.SOUTH: {
                for (let i = 0; i < rpv.tc.wallDown.length; i++) {
                    const y = pos.y - rpv.tc.wallDown.length + i + 1
                    if (rpv.tc.wallDown[i]) {
                        rpv.background[y][pos.x] = rpv.tc.wallDown[i]
                        for (let h = 0; h < rpv.colls.length; h++) {
                            const coll = rpv.colls[h]
                            if (h > 0) { 
                                coll[y - 1][pos.x] = 1
                                coll[y - 2][pos.x] = 1
                            }
                            coll[y][pos.x] = 2
                            coll[y + 1][pos.x] = 2
                        }
                    }
                    if (rpv.tc.addShadows && rpv.tc.wallDownShadow![i]) { rpv.shadow![y][pos.x] = rpv.tc.wallDownShadow![i] }
                }
                break
            }
            case Dir.WEST: {
                for (let i = 0; i < rpv.tc.wallLeft.length; i++) {
                    const x = pos.x + i - 1
                    if (rpv.tc.wallLeft[i]) {
                        if (! rpv.background[pos.y][x]) { 
                            rpv.background[pos.y][x] = rpv.tc.wallLeft[i]
                        }
                        for (const coll of rpv.colls) {
                            coll[pos.y][x] = 2
                            coll[pos.y][x - 1] = 2
                        }
                    }
                    if (rpv.tc.addShadows && rpv.tc.wallLeftShadow![i]) { rpv.shadow![pos.y][x] = rpv.tc.wallLeftShadow![i] }
                }
                break
            }
        }
    }
}
