import { CCMap } from './util.js'

export class AreaInfo {
    constructor(
        public name: string,
        public displayName: string,
        public displayDesc: string,
        public areaType: 'PATH' | 'TOWN' | 'DUNGEON',
        public pos: Vec2) {}
}


const mapNameToMapDisplayName: Map<string, string> = new Map<string, string>()

export async function getMapDisplayName(map: CCMap) {
    if (mapNameToMapDisplayName.has(map.name)) {
        return mapNameToMapDisplayName.get(map.name)
    }
    const areaName: string = map.attributes.area
    const area: sc.AreaLoadable = await loadArea(areaName)
    for (const floor of area.data.floors) {
        for (const map of floor.maps) {
            const displayName = map.name['en_US']
            mapNameToMapDisplayName.set(map.path.split('.').join('/'), displayName)
        }
    }
    return getMapDisplayName(map)
}

async function loadArea(areaName: string): Promise<sc.AreaLoadable> {
    return new Promise((resolve) => {
        const area: ig.Loadable = new sc.AreaLoadable(areaName)
        area.load(() => {
            // @ts-ignore
            resolve(area)
        })
    })
}
