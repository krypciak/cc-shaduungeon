import { Id } from '../build-queue/build-queue'
import { AreaInfo, MapConstruct, RoomConsturct } from '../map-construct/map-construct'
import { Dir, DirU, Rect } from '../util/geometry'
import { ObjectEntriesT } from '../util/modify-prototypes'
import { allLangs, assert } from '../util/util'
import { Vec2 } from '../util/vec2'

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
                    shaduungeonCustom: true
                    level: number
                    name: ig.LangLabel.Data

                    maps: Map[]
                    connections: Connection[]
                    icons: Icon[]
                    landmarks: Landmark[]
                    rooms?: sc.AreaRoomBounds[]

                    size: Vec2
                }
                interface Map extends sc.AreaLoadable.Map {
                    id: Id
                    min: Vec2
                    max: Vec2
                    rects: (RoomConsturct & {
                        drawEmptyRect?: Rect
                        drawRect?: Rect & { x2: number; y2: number }
                        areaRect?: Rect
                    })[]
                }
                interface Connection {
                    dir: Dir
                    tx: number
                    ty: number
                    size: number
                    map1: number
                    map2: number
                }
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
    const bounds: Rect = Rect.boundsOfArr(maps.flatMap(a => a.arrangeCopy.rects))
    const divider = 64
    const offset = Vec2.divC(Vec2.copy(bounds), divider)
    const size = Vec2.divC({ x: bounds.width, y: bounds.height }, divider)

    const mapsByFloor: Record<number, MapConstruct[]> = {}
    for (const map of maps) {
        ;(mapsByFloor[map.floor ?? 0] ??= []).push(map)
    }

    const floors: sc.AreaLoadable.SDCustom.Floor[] = []
    let actualDefaultFloor!: number
    for (const [floor, maps] of ObjectEntriesT(mapsByFloor)) {
        if (floor == defaultFloor) actualDefaultFloor = floors.length

        const connections: sc.AreaLoadable.SDCustom.Connection[] = []
        const offsetDas = Vec2.divC(Rect.boundsOfArr(maps.flatMap(map => map.arrangeCopy.rects)), divider)
        const areaMaps: sc.AreaLoadable.SDCustom.Map[] = maps.map(map => {
            const boundsAbsolute: Rect = Rect.boundsOfArr(map.arrangeCopy.rects)
            const offsetRelative: Vec2 = Vec2.divC(Rect.boundsOfArr(map.rects), divider)

            for (const tpr of [...map.arrangeCopy.entranceTprs, ...map.arrangeCopy.restTprs]) {
                if (tpr.noDrawConnection) continue
                if (tpr.destId < map.id) continue
                assert(DirU.isDir(tpr.dir))

                const pos: Vec2 = Vec2.copy(tpr)
                Vec2.divC(pos, divider)
                Vec2.sub(pos, offsetDas)
                connections.push({
                    tx: pos.x,
                    ty: pos.y,
                    dir: tpr.dir,
                    size: 3,
                    map1: tpr.destId,
                    map2: map.id,
                })
            }

            return {
                path: map.constructed.name.replace('/', '.'),
                name: allLangs(map.title),
                offset: Vec2.copy(offsetRelative),
                dungeon: 'DUNGEON',

                id: map.id,
                min: Vec2.sub(Vec2.divC(Vec2.copy(boundsAbsolute), divider), offset),
                max: Vec2.sub(Vec2.divC(Rect.x2y2(boundsAbsolute), divider), offset),
                rects: map.rects.map(a => {
                    const copy = { ...a }
                    Rect.div(copy, divider)
                    Vec2.sub(copy, offsetRelative)
                    return copy
                }),
            }
        })

        const name = floorNames[floor]
        assert(name)
        floors.push({
            shaduungeonCustom: true,
            level: floor,
            name,
            size,

            maps: areaMaps,
            connections,
            icons: [],
            landmarks: [],
        })
    }

    assert(actualDefaultFloor !== undefined)
    return {
        DOCTYPE: 'AREAS_MAP',
        shaduungeonCustom: true,
        name: areaInfo.id,
        width: size.x,
        height: size.y,
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
