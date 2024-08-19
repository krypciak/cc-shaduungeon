import { copyMapArrange, MapArrange, offsetMapArrange, RoomArrange } from '../map-arrange/map-arrange'
import { MapPicker } from '../map-arrange/map-picker/configurable'
import { Id } from '../build-queue/build-queue'
import { assert } from '../util/util'
import { Item } from '../util/items'
import { Dir, Rect } from '../util/geometry'
import { MapConstructionLayers } from './layer'
import { getEmptyLayers } from './layer'
import { MapTheme } from './theme'

export interface MapConstruct extends MapArrange {
    constructed: sc.MapModel.Map
    rectsAbsolute: Rect[]
    title: string
    rects: RoomConsturct[]
}

export interface RoomConsturct extends RoomArrange {
    wallsFull: boolean
}

export interface AreaInfo {
    id: string
    title: string
    description: string
    pos: Vec2
    boosterItem: Item
    keyItem: Item
    masterKeyItem: Item
    type: sc.MapModel.Area['areaType']
}

export type MapConstructFunc = (
    map: MapArrange,
    areaInfo: AreaInfo,
    pathResolver: (id: Id) => string,
    mapsArranged: MapArrange[],
    mapsConstructed: MapConstruct[]
) => MapConstruct

const constructors: Record<MapPicker.ConfigTypes, MapConstructFunc> = {} as any
export function registerMapConstructor<T extends MapPicker.ConfigTypes>(type: T, constructor: MapConstructFunc) {
    assert(!constructors[type])
    constructors[type] = constructor
}

export function constructMapsFromMapsArrange(maps: MapArrange[], areaInfo: AreaInfo): MapConstruct[] {
    const mapsConstruct: MapConstruct[] = []
    const pathResolver: (id: Id) => string = id => `${areaInfo.id}/${id}`

    for (const map of maps) {
        const constructor = constructors[map.type]
        const constructedMap = constructor(copyMapArrange(map), areaInfo, pathResolver, maps, mapsConstruct)
        mapsConstruct.push(constructedMap)
    }

    return mapsConstruct
}

export interface MapInConstruction extends sc.MapModel.Map {
    layers: MapConstructionLayers
}

export function baseMapConstruct(
    map: MapArrange,
    mapName: string,
    areaId: string,
    theme: MapTheme,
    extend: Record<Dir, number>
): { mic: MapInConstruction; rectsAbsolute: Rect[] } {
    const rectsAbsolute = map.rects.map(Rect.copy)

    const boundsEntity = Rect.boundsOfArr(map.rects)

    for (let dir = 0 as Dir; dir < 4; dir++) {
        if (extend[dir]) {
            Rect.extend(boundsEntity, extend[dir] * 16, { [dir]: true })
        }
    }
    const offset = Vec2.mulC(boundsEntity, -1)

    offsetMapArrange(map, offset)

    const bounds = Rect.div(Rect.copy(boundsEntity), 16)

    const mapSize: Vec2 = Rect.toTwoVecSize(bounds)[1]

    const mic: MapInConstruction = {
        name: mapName,
        mapWidth: mapSize.x,
        mapHeight: mapSize.y,
        masterLevel: 0,
        attributes: theme.getMapAttributes(areaId),
        screen: { x: 0, y: 0 },
        entities: [],

        ...getEmptyLayers(mapSize, 3, theme.config),
    }
    return { mic, rectsAbsolute }
}

export function getTprName(isEntrance: boolean, index: number): string {
    return `${isEntrance ? 'entrance' : 'rest'}_${index}`
}

function areWallsFull(walls: Record<Dir, boolean>): boolean {
    return walls[0] && walls[1] && walls[2] && walls[3]
}
export function convertRoomsArrangeToRoomsConstruct(rooms: RoomArrange[]): RoomConsturct[] {
    const newRooms = rooms.map(room => Object.assign(room, { wallsFull: areWallsFull(room.walls) }) as RoomConsturct)
    newRooms.sort((a, b) => (b.wallsFull ? 1 : -1) - (a.wallsFull ? 1 : -1))
    return newRooms
}
