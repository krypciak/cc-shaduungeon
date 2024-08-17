// import { BuildQueueAccesor } from '../build-queue/build-queue'
// import { copyMapArrange, MapArrange, MapArrangeData, offsetMapArrange } from '../map-arrange/map-arrange'
// import { Rect } from '../util/geometry'
// import { ObjectEntriesT } from '../util/modify-prototypes'
// import { assert } from '../util/util'
//
// export {}
// declare global {
//     namespace sc {
//         namespace AreaLoadable {
//             interface Data {
//                 shaduungeonCustom?: boolean
//             }
//             /* SD - ShaDuungeon */
//             namespace SDCustom {
//                 // @ts-expect-error
//                 interface Data extends sc.AreaLoadable.Data {
//                     shaduungeonCustom: true
//                     floors: Floor[]
//                 }
//                 interface Floor {
//                     level: number
//                     name: ig.LangLabel.Data
//
//                     maps: Map[]
//                     connections: Connection[]
//                     icons: Icon[]
//                     landmarks: Landmark[]
//                     rooms?: sc.AreaRoomBounds[]
//                 }
//                 interface Map extends sc.AreaLoadable.Map {}
//             }
//         }
//     }
// }
//
// export function createAreaJsonFromBuildQueue(
//     accesor: BuildQueueAccesor<MapArrangeData>,
//     areaName: string,
//     defaultFloor: number,
//     chests: number,
//     floorNames: Record<number, ig.LangLabel.Data>,
// ): sc.AreaLoadable.SDCustom.Data {
//     const maps: MapArrange[] = []
//     for (let id = 0; ; id++) {
//         const res = accesor.tryGet(id)
//         if (!res) break
//         maps.push(copyMapArrange(res))
//     }
//
//     const bounds: Rect = Rect.boundsOfArr(maps.flatMap(a => a.rects))
//     const offset = Vec2.mulC(bounds, -1)
//     for (const map of maps) offsetMapArrange(map, offset)
//
//     const mapsByFloor: Record<number, MapArrange[]> = {}
//     for (const map of maps) {
//         ;(mapsByFloor[map.floor ?? 0] ??= []).push(map)
//     }
//
//     const floors: sc.AreaLoadable.SDCustom.Floor[] = []
//     let actualDefaultFloor!: number
//     for (const [floor, maps] of ObjectEntriesT(mapsByFloor)) {
//         if (floor == defaultFloor) actualDefaultFloor = floors.length
//
//         const areaMaps: sc.AreaLoadable.SDCustom.Map[] = maps.map(map => {
//             return map as any
//         })
//
//         const name = floorNames[floor]
//         assert(name)
//         floors.push({
//             level: floor,
//             name,
//
//             maps: areaMaps,
//             connections: [],
//             icons: [],
//             landmarks: [],
//         })
//     }
//
//     assert(actualDefaultFloor)
//     return {
//         DOCTYPE: 'AREAS_MAP',
//         shaduungeonCustom: true,
//         name: areaName,
//         width: bounds.width,
//         height: bounds.height,
//         defaultFloor: actualDefaultFloor,
//         chests,
//         floors,
//     }
// }
