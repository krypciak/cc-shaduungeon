import { MapLayer, CollisionTile, Tileset, CCMap, Dir, DirUtil,
    Blitzkrieg, Selection, Coll, Point, Rect, MapPoint, MapRect, EntityPoint, EntityRect, assert } from './util.js'
import { MapEntity, MapDoor, MapTransporter } from './entity-spawn.js'
import { AreaInfo } from './area-builder.js'
import DngGen from './plugin.js'

const tilesize: number = 16
declare const blitzkrieg: Blitzkrieg
declare const dnggen: DngGen

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
            cameraInBounds: false,
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
        edgeShadowBottomRight: [
            [182, 184],
            [185, 214]],
        edgeShadowTopLeft: [
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

export namespace RoomPlaceVars {
    export function fromRawMap(map: sc.MapModel.Map, theme: RoomTheme): RoomPlaceVars {
        let background: number[][] | undefined
        let shadow: number[][] | undefined
        let light: number[][] | undefined
        const colls: number[][][] = []
        const navs: number[][][] = []

        for (let i = 0; i < map.layer.length; i++) {
            const layer: sc.MapModel.MapLayer = map.layer[i]
            if (layer.level == map.masterLevel && layer.type == 'Background') {
                if (layer.name == 'NEW_BACKGROUND') {
                    background = layer.data
                } else if (layer.name == 'NEW_SHADOW') {
                    shadow = layer.data
                }
            }
            switch (layer.type) {
                case 'Collision': colls.push(layer.data); break
                case 'Navigation': navs.push(layer.data); break
                case 'Light': light = layer.data; break
             }
        }
        assert(background)
        assert(shadow)
        assert(light)

        return {
            map: new CCMap(map.name, map.levels, map.mapWidth, map.mapHeight,
                map.masterLevel, map.attributes, map.entities, MapLayer.convertArray(map.layer)),
            background, shadow, light, colls, navs,
            entities: map.entities,
            theme, tc: theme.config,
            masterLevel: map.masterLevel,
        }
    }
}

export interface RoomPlaceVars {
    map: CCMap
    background: number[][]
    shadow?: number[][]
    light: number[][]
    colls: number[][][]
    navs: number[][][]
    entities: MapEntity[]
    theme: RoomTheme
    tc: RoomThemeConfig
    masterLevel: number
}

export function getEmptyMap(width: number, height: number, levelCount: number, theme: RoomTheme, mapName: string, areaName: string):  RoomPlaceVars  {
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

    assert(background)

    const map: CCMap = new CCMap(mapName, levels, width, height, 0, theme.getMapAttributes(areaName), [], layers)
    return {
        map,
        background, shadow, light, colls, navs,
        entities: map.entities,
        theme, tc: theme.config,
        masterLevel: 0
    }
}

export function getPosOnRectSide<T extends Point>
    (init: new (x: number, y: number) => T, dir: Dir, rect: Rect, prefPos?: T): T {
    const pos: T = new init(0, 0)
    switch (dir) {
        case Dir.NORTH: pos.y = rect.y - 16;  break
        case Dir.EAST:  pos.x = rect.x2 + 16; break
        case Dir.SOUTH: pos.y = rect.y2 + 16; break
        case Dir.WEST: pos.x = rect.x - 16; break
    }
    if (DirUtil.isVertical(dir)) {
        pos.x = prefPos ? prefPos.x : (rect.x + (rect.x2 - rect.x)/2)
    } else {
        pos.y = prefPos ? prefPos.y : (rect.y + (rect.y2 - rect.y)/2)
    }

    return pos
}

export class MapBuilder {
    rooms: Room[]
    theme?: RoomTheme
    rpv?: RoomPlaceVars
    private placed: boolean

    pathParent?: string
    name?: string
    path?: string
    displayName?: string

    builtMap?: sc.MapModel.Map
    selections: Selection[]

    constructor(
        public width: number,
        public height: number,
        public levelCount: number,
        public areaInfo: AreaInfo) {

        this.rooms = []
        this.selections = []
        this.placed = false
    }

    addSelection(sel: Selection) {
        this.selections.push(sel)
    }

    addRoom(room: Room) {
        this.rooms.push(room)
    }


    createEmptyMap() {
        assert(this.theme); assert(this.path)
        const rpv: RoomPlaceVars = getEmptyMap(
            this.width, this.height, this.levelCount, this.theme, this.path, this.areaInfo.name)
        this.rpv = rpv

    }

    async place() {
        assert(this.rpv)
        this.rooms = this.rooms.sort((a, b) => a.placeOrder- b.placeOrder)
        for (const room of this.rooms) {
            const rpv: RoomPlaceVars | undefined = await room.place(this.rpv)
            if (rpv) {
                this.rpv = rpv
            }
        }
        this.placed = true
    }

    async finalize(): Promise<MapPoint> {
        assert(this.placed); assert(this.rpv)
        if (dnggen.debug.trimMaps) {
            const { offset, map } = await CCMap.trim(this.rpv.map, this.rpv.tc, this.selections)
            this.builtMap = map
            return offset
        } else {
            this.builtMap = this.rpv.map
            return new MapPoint(0, 0)
        }
    }

    save(): Promise<void> {
        return new Promise((resolve, reject) => {
            assert(this.builtMap, 'cannot save map before finalize()')
            console.log('map: ', ig.copy(this.builtMap))
            const path = dnggen.dir + 'assets/data/maps/' + this.path + '.json'
            const json = JSON.stringify(this.builtMap)
            require('fs').writeFile(path, json, (err: Error) => {
                if (err) {
                    console.error('error writing map:', err)
                    reject()
                } else {
                    resolve()
                }
            })
        })
    }
}

export class Room {
    baseRect: MapRect
    floorRect: MapRect
    private addWalls: boolean
    door?: { name: string, dir: Dir, pos: EntityPoint, condition?: string, entity?: MapTransporter }

    constructor(
        public name: string,
        rect: EntityRect,
        public wallSides: boolean[],
        public additionalSpace: number,
        public addNavMap: boolean,
        public placeOrder: Room.PlaceOrder,
        public placeEvent?: (rpv: RoomPlaceVars) => Promise<RoomPlaceVars | undefined>,
    ) {
        this.baseRect = rect.to(MapRect)
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

    async place(rpv: RoomPlaceVars): Promise<RoomPlaceVars | undefined> {
        if (this.placeOrder == Room.PlaceOrder.NoDraw) { return }
        this.placeRoom(rpv, this.addNavMap)

        if (this.placeEvent) {
            return await this.placeEvent(rpv)
        }
    }

    setDoor(name: string, dir: Dir, prefPos?: EntityPoint) {
        const doorPos: EntityPoint = getPosOnRectSide(EntityPoint, dir, this.floorRect.to(EntityRect), prefPos)

        if (DirUtil.isVertical(dir)) { doorPos.x -= 16 } else { doorPos.y -= 16 }
        if (dir == Dir.SOUTH) { doorPos.y -= 16 }
        if (dir == Dir.EAST) { doorPos.x -= 16 }

        this.door = { name, dir, pos: doorPos }
    }

    placeDoor(rpv: RoomPlaceVars, marker: string, destMap: string, destMarker: string) {
        assert(this.door)
        if (this.door.entity) {
            this.door.entity.settings.name = marker
            this.door.entity.settings.map = destMap 
            this.door.entity.settings.marker = destMarker
        } else {
            const door = MapDoor.new(this.door.pos, rpv.masterLevel, this.door.dir, marker, destMap, destMarker, this.door.condition)
            rpv.entities.push(door)
        }
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
                    if (addNavMap) { for (const nav of rpv.navs) { nav[y][x] = 1 } }
                }
            }

            if (this.wallSides[Dir.NORTH]) {
                for (let x = this.floorRect.x; x < this.floorRect.x2; x++) {
                    this.placeWall(rpv, new MapPoint(x, this.floorRect.y), Dir.NORTH)
                }
            } else if (rpv.tc.addShadows) {
                blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.edgeShadowBottomLeft!, this.floorRect.x, this.floorRect.y - 2)
                blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.edgeShadowBottomRight!, this.floorRect.x2 - 2, this.floorRect.y - 2)
                for (let x = this.floorRect.x + 2; x < this.floorRect.x2 - 2; x++) {
                    for (let y = this.floorRect.y - 2; y < this.floorRect.y; y++) {
                        rpv.shadow![y][x] = 0
                    }
                }
            }

            if (this.wallSides[Dir.EAST]) {
                for (let y = this.floorRect.y; y < this.floorRect.y2; y++) {
                    this.placeWall(rpv, new MapPoint(this.floorRect.x2, y), Dir.EAST)
                }
            } else if (rpv.tc.addShadows) {
                blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.edgeShadowTopLeft!, this.floorRect.x2, this.floorRect.y)
                blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.edgeShadowBottomLeft!, this.floorRect.x2, this.floorRect.y2 - 2)
                for (let y = this.floorRect.y + 2; y < this.floorRect.y2 - 2; y++) {
                    for (let x = this.floorRect.x2; x < this.floorRect.x2 + 2; x++) {
                        rpv.shadow![y][x] = 0
                    }
                }
            }

            if (this.wallSides[Dir.SOUTH]) {
                for (let x = this.floorRect.x; x < this.floorRect.x2; x++) {
                    this.placeWall(rpv, new MapPoint(x, this.floorRect.y2), Dir.SOUTH)
                }
            } else if (rpv.tc.addShadows) {
                blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.edgeShadowTopLeft!, this.floorRect.x, this.floorRect.y2)
                blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.edgeShadowTopRight!, this.floorRect.x2 - 2, this.floorRect.y2)
                for (let x = this.floorRect.x + 2; x < this.floorRect.x2 - 2; x++) {
                    for (let y = this.floorRect.y2; y < this.floorRect.y2 + 2; y++) {
                        rpv.shadow![y][x] = 0
                    }
                }
            }
            
            if (this.wallSides[Dir.WEST]) {
                for (let y = this.floorRect.y; y < this.floorRect.y2; y++) {
                    this.placeWall(rpv, new MapPoint(this.floorRect.x, y), Dir.WEST)
                }
            } else if (rpv.tc.addShadows) {
                blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.edgeShadowTopRight!, this.floorRect.x - 2, this.floorRect.y)
                blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.edgeShadowBottomRight!, this.floorRect.x - 2, this.floorRect.y2 - 2)
                for (let y = this.floorRect.y + 2; y < this.floorRect.y2 - 2; y++) {
                    for (let x = this.floorRect.x - 2; x < this.floorRect.x; x++) {
                        rpv.shadow![y][x] = 0
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
                assert(rpv.tc.lightStep); assert(rpv.tc.lightTile);
                const distFromWall = 5
                const lx1 = this.floorRect.x + distFromWall - 1
                const ly1 = this.floorRect.y + distFromWall - 1
                const lx2 = this.floorRect.x2 - distFromWall
                const ly2 = this.floorRect.y2 - distFromWall

                const mx = Math.floor(lx1 + (lx2 - lx1)/2)
                const my = Math.floor(ly1 + (ly2 - ly1)/2)
                rpv.light[my][mx] = rpv.tc.lightTile

                for (let x = lx1; x <= mx; x += rpv.tc.lightStep) {
                    for (let y = ly1; y <= my; y += rpv.tc.lightStep) { rpv.light[y][x] = rpv.tc.lightTile }
                    for (let y = ly2; y >= my; y -= rpv.tc.lightStep) { rpv.light[y][x] = rpv.tc.lightTile }
                    rpv.light[my][x] = rpv.tc.lightTile
                }
                for (let x = lx2; x >= mx; x -= rpv.tc.lightStep) {
                    for (let y = ly1; y <= my; y += rpv.tc.lightStep) { rpv.light[y][x] = rpv.tc.lightTile }
                    for (let y = ly2; y >= my; y -= rpv.tc.lightStep) { rpv.light[y][x] = rpv.tc.lightTile }
                    rpv.light[my][x] = rpv.tc.lightTile
                }

                for (let y = ly1; y <= ly2; y += rpv.tc.lightStep) { rpv.light[y][mx] = rpv.tc.lightTile }
                for (let y = ly2; y >= my; y -= rpv.tc.lightStep) { rpv.light[y][mx] = rpv.tc.lightTile }
            }
        }
    }

    placeWall(rpv: RoomPlaceVars, pos: MapPoint, dir: Dir): void {
        switch (dir) {
            case Dir.NORTH: {
                for (let i = 0; i < rpv.tc.wallUp.length; i++) {
                    const y = pos.y - i + 1
                    if (rpv.tc.wallUp[i]) {
                        rpv.background[y][pos.x] = rpv.tc.wallUp[i]
                    }
                    if (rpv.tc.addShadows && rpv.tc.wallUpShadow![i]) { rpv.shadow![y][pos.x] = rpv.tc.wallUpShadow![i] }
                }
                for (let i = rpv.masterLevel; i < rpv.colls.length; i++) {
                    const ri = i - rpv.masterLevel
                    const coll: number[][] = rpv.colls[i]
                    for (let y = pos.y - 3; y <= pos.y; y++) {
                        coll[y - ri*2][pos.x] = Coll.None
                    }
                    let y: number = pos.y - ri*2 - 1
                    coll[y][pos.x] = Coll.Coll
                }
                break
            }
            case Dir.EAST: {
                for (let i = 0; i < rpv.tc.wallRight.length; i++) {
                    const x = pos.x - rpv.tc.wallRight.length + i + 1
                    if (rpv.tc.wallRight[i]) {
                        if (! rpv.background[pos.y][x]) { rpv.background[pos.y][x] = rpv.tc.wallRight[i] }

                        for (const coll of rpv.colls) {
                            coll[pos.y][x] = Coll.Coll
                            coll[pos.y][x + 1] = Coll.Coll
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
                    }
                    if (rpv.tc.addShadows && rpv.tc.wallDownShadow![i]) { rpv.shadow![y][pos.x] = rpv.tc.wallDownShadow![i] }
                }
                for (let i = rpv.masterLevel; i < rpv.colls.length; i++) {
                    const ri = i - rpv.masterLevel
                    const coll: number[][] = rpv.colls[i]
                    for (let y = pos.y; y >= pos.y - 3; y--) {
                        coll[y - ri*2][pos.x] = Coll.None
                    }
                    const y: number = pos.y - ri*2
                    coll[y][pos.x] = Coll.Coll
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
                            coll[pos.y][x] = Coll.Coll
                            coll[pos.y][x - 1] = Coll.Coll
                        }
                    }
                    if (rpv.tc.addShadows && rpv.tc.wallLeftShadow![i]) { rpv.shadow![pos.y][x] = rpv.tc.wallLeftShadow![i] }
                }
                break
            }
        }
    }

    placeWallsInEmptySpace(rpv: RoomPlaceVars, sel: Selection) {
        const mcollCopy: number[][] = ig.copy(rpv.colls[rpv.masterLevel])
        const additional = 0
        for (const bb of sel.bb) {
            const rect: MapRect = Rect.new(EntityRect, bb).to(MapRect)
            rect.width--
            rect.height--

            for (let y = rect.y; y < rect.y2 + 1; y++) {
                if (mcollCopy[y][rect.x] == Coll.None || mcollCopy[y][rect.x] == Coll.Floor) {
                    for (let y3 = y - additional; y3 < y + additional + 1; y3++) {
                        const point: MapPoint = new MapPoint(rect.x, y3)
                        const checkPoint: MapPoint = MapPoint.fromVec(point)
                        checkPoint.x -= 1/tilesize
                        if (! blitzkrieg.puzzleSelections.isSelInPos(sel, checkPoint.to(EntityPoint))) {
                            this.placeWall(rpv, point, Dir.WEST)
                        }
                    }
                }
                if (mcollCopy[y][rect.x2] == Coll.None || mcollCopy[y][rect.x2] == Coll.Floor) {
                    for (let y3 = y - additional; y3 < y + additional + 1; y3++) {
                        const point: MapPoint = new MapPoint(rect.x2 + 1, y3)
                        const checkPoint: MapPoint = MapPoint.fromVec(point)
                        checkPoint.x += 1/tilesize
                        if (! blitzkrieg.puzzleSelections.isSelInPos(sel, checkPoint.to(EntityPoint))) {
                            this.placeWall(rpv, point, Dir.EAST)
                        }
                    }
                }
            }

            for (let x = rect.x; x < rect.x2 + 1; x++) {
                if (mcollCopy[rect.y][x] == Coll.None || mcollCopy[rect.y][x] == Coll.Floor) {
                    for (let x3 = x - additional; x3 < x + additional + 1; x3++) {
                        const point: MapPoint = new MapPoint(x3, rect.y)
                        const checkPoint: MapPoint = MapPoint.fromVec(point)
                        checkPoint.y -= 1/tilesize
                        if (! blitzkrieg.puzzleSelections.isSelInPos(sel, checkPoint.to(EntityPoint))) {
                            this.placeWall(rpv, point, Dir.NORTH)
                        }
                    }
                }
                if (mcollCopy[rect.y2][x] == Coll.None || mcollCopy[rect.y2][x] == Coll.Floor) {
                    for (let x3 = x - additional; x3 < x + additional + 1; x3++) {
                        const point: MapPoint = new MapPoint(x3, rect.y2 + 1)
                        const checkPoint: MapPoint = MapPoint.fromVec(point)
                        checkPoint.x += 1/tilesize
                        if (! blitzkrieg.puzzleSelections.isSelInPos(sel, checkPoint.to(EntityPoint))) {
                            this.placeWall(rpv, point, Dir.SOUTH)
                        }
                    }
                }
            }
        }
    }
}

export namespace Room {
    export enum PlaceOrder {
        NoDraw,
        Room,
        Tunnel,
    }
}
