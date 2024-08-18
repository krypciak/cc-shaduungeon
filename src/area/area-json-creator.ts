import { unique } from 'jquery'
import { AreaInfo, MapConstruct } from '../map-construct/map-construct'
import { Rect } from '../util/geometry'
import { ObjectEntriesT } from '../util/modify-prototypes'
import { allLangs, Array2d, assert } from '../util/util'

export {}
declare global {
    namespace sc {
        namespace AreaLoadable {
            interface Data {
                shaduungeonCustom?: boolean
            }
            /* SD - ShaDuungeon */
            namespace SDCustom {
                // @ts-expect-error
                interface Data extends sc.AreaLoadable.Data {
                    shaduungeonCustom: true
                    floors: Floor[]
                }
                interface Floor {
                    level: number
                    name: ig.LangLabel.Data

                    maps: Map[]
                    connections: Connection[]
                    icons: Icon[]
                    landmarks: Landmark[]
                    rooms?: sc.AreaRoomBounds[]
                }
                interface Map extends sc.AreaLoadable.Map {}
            }
        }
    }
}

export function createArea(
    maps: MapConstruct[],
    areaInfo: AreaInfo,
    defaultFloor: number,
    chests: number,
    floorNames: Record<number, ig.LangLabel.Data>
): sc.AreaLoadable.SDCustom.Data {
    const { width, height }: Rect = Rect.boundsOfArr(maps.flatMap(a => a.rects))

    const mapsByFloor: Record<number, MapConstruct[]> = {}
    for (const map of maps) {
        ;(mapsByFloor[map.floor ?? 0] ??= []).push(map)
    }

    const floors: sc.AreaLoadable.SDCustom.Floor[] = []
    let actualDefaultFloor!: number
    for (const [floor, maps] of ObjectEntriesT(mapsByFloor)) {
        if (floor == defaultFloor) actualDefaultFloor = floors.length

        const areaMaps: sc.AreaLoadable.SDCustom.Map[] = maps.map(map => {
            return {
                path: map.constructed.name,
                name: allLangs(map.title),
                offset: { x: 0, y: 0 },
                dungeon: 'DUNGEON',
            }
        })

        const name = floorNames[floor]
        assert(name)
        floors.push({
            level: floor,
            name,
            tiles: Array2d.empty({ x: width, y: height }, 0),

            maps: areaMaps,
            connections: [],
            icons: [],
            landmarks: [],
        })
    }

    assert(actualDefaultFloor !== undefined)
    return {
        DOCTYPE: 'AREAS_MAP',
        shaduungeonCustom: true,
        name: areaInfo.id,
        width,
        height,
        defaultFloor: actualDefaultFloor,
        chests,
        floors,
    }
}

export function createAreaDbEntry(area: sc.AreaLoadable.SDCustom.Data, areaInfo: AreaInfo): sc.MapModel.Area {
    return {
        boosterItem: areaInfo.boosterItem.toString(),
        landmarks: {},
        name: allLangs(areaInfo.title),
        description: allLangs(areaInfo.description),
        keyItem: areaInfo.keyItem.toString(),
        masterKeyItem: areaInfo.masterKeyItem.toString(),
        areaType: areaInfo.type,
        order: 1001,
        track: true,
        chests: area.chests,
        position: areaInfo.pos,
    }
}
