import { MapEntity } from '../entity-spawn'
import { AreaInfo } from '../area-builder'
import DngGen from '../plugin'
import { RoomTheme, RoomThemeConfig } from './themes'
import { CCMap, MapLayer } from '../util/map'
import { Dir, MapPoint, MapRect, PosDir, } from '../util/pos'
import { assert } from '../util/misc'
import { Room } from './room'
import { getPosDirFromRoomIO } from './tunnel-room'

declare const dnggen: DngGen

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

export abstract class MapBuilder {
    /* pre place vars */
    rooms: Room[] = []

    abstract entarenceRoom: Room
    abstract exitRoom: Room

    exitOnWall!: PosDir<MapPoint> | null
    entarenceOnWall!: PosDir<MapPoint> | null

    /* post place vars */
    size?: MapPoint
    trimOffset?: MapPoint
    theme?: RoomTheme
    rpv?: RoomPlaceVars
    pathParent?: string
    name?: string
    path?: string
    displayName?: string

    builtMap?: sc.MapModel.Map

    constructor(
        public levelCount: number,
        public areaInfo: AreaInfo,
    ) { }

    addRoom(room: Room) {
        room.index = this.rooms.length
        this.rooms.push(room)
    }

    setOnWallPositions() {
        assert(this.exitRoom.primaryExit); assert(this.exitRoom.primaryEntarence)
        this.entarenceOnWall = getPosDirFromRoomIO(this.entarenceRoom, this.entarenceRoom.primaryEntarence)
        this.exitOnWall = getPosDirFromRoomIO(this.exitRoom, this.exitRoom.primaryExit)
    }

    abstract prepareToArrange(dir: Dir): boolean

    /* post place */
    
    trimRoomPositions(additionalSpace: MapRect) {
        const newSize: MapRect = new MapRect(10000, 10000, 0, 0)

        for (const room of this.rooms) {
            const rect = room.floorRect
            if (rect.x < newSize.x) { newSize.x = rect.x }
            if (rect.y < newSize.y) { newSize.y = rect.y }
            if (rect.x2() > newSize.width ) { newSize.width = rect.x2() }
            if (rect.y2() > newSize.height ) { newSize.height = rect.y2() }
        }

        const offset: MapPoint = MapPoint.fromVec(newSize)
        offset.x -= additionalSpace.x
        offset.y -= additionalSpace.y
        this.trimOffset = offset
        this.size = new MapPoint(
            newSize.width - offset.x + additionalSpace.width,
            newSize.height - offset.y + additionalSpace.height)

        Vec2.mulC(offset, -1)
        for (const room of this.rooms) {
            room.offsetBy(offset)
        }
    }

    createEmptyMap() {
        assert(this.theme); assert(this.path); assert(this.size)
        const rpv: RoomPlaceVars = CCMap.getEmpty(this.size, this.levelCount, this.theme, this.path, this.areaInfo.name)
        this.rpv = rpv
    }

    async place() {
        this.trimRoomPositions(new MapRect(3, 10, 4, 4))
        assert(this.rpv)
        this.rooms = this.rooms.sort((a, b) => a.placeOrder- b.placeOrder)
        for (const room of this.rooms) {
            const rpv: RoomPlaceVars | undefined = await room.place(this.rpv)
            if (rpv) {
                this.rpv = rpv
            }
        }
    }

    save(): Promise<void> {
        return new Promise((resolve, reject) => {
            assert(this.rpv)
            console.log('map: ', ig.copy(this.rpv.map))
            const path = dnggen.dir + 'assets/data/maps/' + this.path + '.json'
            const json = JSON.stringify(this.rpv.map)
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

