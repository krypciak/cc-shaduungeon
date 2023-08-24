import { MapEntity } from '../entity-spawn.js'
import { AreaInfo } from '../area-builder.js'
import DngGen from '../plugin.js'
import { RoomTheme, RoomThemeConfig } from './themes.js'
import { Selection } from '../util/blitzkrieg.js'
import { CCMap, Coll, MapLayer } from '../util/map.js'
import { MapPoint, MapRect, } from '../util/pos.js'
import { assert } from '../util/misc.js'
import { Room } from './room.js'

const tilesize: number = 16
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
        collisionLayer.fill(Coll.Wall)
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

export class MapBuilder {
    rooms: Room[]
    theme?: RoomTheme
    rpv?: RoomPlaceVars

    width?: number
    height?: number
    trimOffset?: MapPoint

    pathParent?: string
    name?: string
    path?: string
    displayName?: string

    builtMap?: sc.MapModel.Map
    selections: Selection[]

    constructor(
        public levelCount: number,
        public areaInfo: AreaInfo) {

        this.rooms = []
        this.selections = []
    }

    addSelection(sel: Selection) {
        this.selections.push(sel)
    }

    addRoom(room: Room) {
        room.index = this.rooms.length
        this.rooms.push(room)
    }

    trimRoomPositions(additionalSpace: MapRect) {
        const newSize: MapRect = new MapRect(10000, 10000, 0, 0)

        for (const room of this.rooms) {
            const rect = room.floorRect
            if (rect.x < newSize.x) { newSize.x = rect.x }
            if (rect.y < newSize.y) { newSize.y = rect.y }
            if (rect.x2() > newSize.width ) { newSize.width = rect.x2() }
            if (rect.y2() > newSize.height ) { newSize.height = rect.y2() }
        }

        const offset = MapPoint.fromVec(newSize)
        offset.x -= additionalSpace.x
        offset.y -= additionalSpace.y
        this.trimOffset = offset
        this.width = newSize.width - offset.x + additionalSpace.width
        this.height = newSize.height - offset.y + additionalSpace.height

        Vec2.mulC(offset, -1)
        for (const room of this.rooms) {
            room.offsetBy(offset)
        }
    }

    createEmptyMap() {
        assert(this.theme); assert(this.path); assert(this.width); assert(this.height)
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

