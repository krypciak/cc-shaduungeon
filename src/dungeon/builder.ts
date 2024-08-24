import { createArea, createAreaDbEntry } from '../area/area-json-creator'
import { BuildQueue } from '../build-queue/build-queue'
import { drawMapArrangeQueue } from '../map-arrange/drawer'
import { MapArrange, MapArrangeData } from '../map-arrange/map-arrange'
import { MapPicker, mapPickerConfigurable } from '../map-arrange/map-picker/configurable'
import { AreaInfo, constructMapsFromMapsArrange } from '../map-construct/map-construct'
import { initAllPuzzles } from '../maps/puzzle-data'
import { Dir } from '../util/geometry'
import { Item } from '../util/items'
import { setRandomSeed } from '../util/util'
import { DungeonPaths } from './paths'

export class DungeonBuilder {
    async build(seed: string) {
        const dungeonId = 'mydng'

        const queue = new BuildQueue<MapArrangeData>(true)
        const randomizeDirTryOrder = true
        const roomSizeReg = { x: 13 * 16, y: 13 * 16 }
        const tunnelSizeReg = { x: 5 * 16, y: 5 * 16 }
        const roomSizeBranch = { x: 17 * 16, y: 17 * 16 }
        const tunnelSizeBranch = { x: 5 * 16, y: 5 * 16 }

        function tunnel(count: number, followedBy?: MapPicker.ConfigNode): MapPicker.ConfigNode {
            return {
                type: 'SimpleTunnel',
                roomSize: roomSizeReg,
                tunnelSize: tunnelSizeReg,
                count,
                randomizeDirTryOrder,
                followedBy,
            }
        }
        function branch(
            deep: number,
            branchTunnelCount: () => number,
            finalTunnelCount: () => number,
            branchCount: () => 1 | 2 | 3
        ): MapPicker.ConfigNode {
            if (deep == 0) {
                return tunnel(finalTunnelCount())
            }
            return {
                type: 'SimpleBranch',
                roomSize: roomSizeBranch,
                tunnelSize: tunnelSizeBranch,
                branches: [
                    ...new Array(branchCount())
                        .fill(null)
                        .map(_ =>
                            tunnel(
                                branchTunnelCount(),
                                branch(deep - 1, branchTunnelCount, finalTunnelCount, branchCount)
                            )
                        ),
                ] as any,
            }
        }

        const mapPicker: MapPicker = mapPickerConfigurable({
            startDir: Dir.WEST,
            root: {
                type: 'DngPuzzleTunnel',
                tunnelSize: tunnelSizeReg,
                // size: roomSizeReg,
                count: 5,
                randomizeDirTryOrder,
                // forcePuzzleMap: 'rhombus-dng/room-1',

                followedBy: {
                    type: 'Simple',
                    size: roomSizeReg,
                    count: 1,
                },
                // followedBy: branch(
                //     1,
                //     () => 1,
                //     () => 1,
                //     () => 2
                // ),
            },
        })

        setRandomSeed(seed)

        await initAllPuzzles()

        const mapsArrange = queue.begin(mapPicker(-1, queue)) as MapArrange[]
        // console.dir(queue.queue, { depth: null })
        console.log(drawMapArrangeQueue(queue, 16, false, undefined, false, true))
        if (!mapsArrange) throw new Error('res null')

        const areaInfo: AreaInfo = {
            id: `dnggen-${dungeonId}-myarea`,
            title: 'My area',
            description: '8th ring of hell',
            pos: { x: 60, y: 60 },
            type: 'DUNGEON',
            masterKeyItem: Item.FajroKeyMaster,
            keyItem: Item.FajroKey,
            boosterItem: 999,
        }
        const mapsConstruct = constructMapsFromMapsArrange(mapsArrange, areaInfo)

        const paths = new DungeonPaths(dungeonId)
        await paths.clearDir()
        await Promise.all(mapsConstruct.map(map => paths.saveMap(map.constructed)))

        const area = createArea(mapsConstruct, areaInfo, 0, 0, { 0: 'myfloor0' })
        const areaDb = createAreaDbEntry(area, areaInfo)
        await paths.saveArea(areaInfo.id, area, areaDb)

        await paths.saveConfig()

        ig.game.teleport(
            mapsConstruct[0].constructed.name,
            ig.TeleportPosition.createFromJson({ marker: 'entrance_0', level: 0, baseZPos: 0, size: { x: 0, y: 0 } })
        )
    }
}
