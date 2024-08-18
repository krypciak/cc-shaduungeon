import { copyMapArrange, MapArrange } from '../map-arrange/map-arrange'
import { MapPicker } from '../map-arrange/map-picker/configurable'
import { Id } from '../build-queue/build-queue'
import { assert } from '../util/util'
import { Item } from '../util/items'

export interface MapConstruct extends MapArrange {
    constructed: sc.MapModel.Map
    title: string
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
