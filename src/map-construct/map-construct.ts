import { assert } from 'console'
import { MapArrange } from '../map-arrange/map-arrange'
import { MapPicker } from '../map-arrange/map-picker/configurable'

interface MapConstruct extends MapArrange {
    //
}

export interface AreaInfo {
    id: string
    title: string
    description: string
}

type MapConstructor = (
    map: MapArrange,
    areaInfo: AreaInfo,
    mapsArrange: MapArrange[],
    mapsConstruct: MapConstruct[]
) => MapArrange

const constructors: Record<MapPicker.ConfigTypes, MapConstructor> = {} as any
export function registerMapConstructor<T extends MapPicker.ConfigTypes>(type: T, constructor: MapConstructor) {
    assert(!constructors[type])
    constructors[type] = constructor
}

export function constructMapsFromMapsArrange(maps: MapArrange[], areaInfo: AreaInfo): MapConstruct[] {
    const mapsConstruct: MapConstruct[] = []

    return mapsConstruct
}
