import { BuildQueue } from '../build-queue/build-queue'
import { drawMapArrangeQueue } from '../map-arrange/drawer'
import { MapArrange, MapArrangeData } from '../map-arrange/map-arrange'
import { MapPicker, mapPickerConfigurable } from '../map-arrange/map-picker/configurable'
import { constructMapsFromMapsArrange } from '../map-construct/map-construct'
import { setRandomSeed } from '../util/util'

export class DungeonBuilder {
    build(seed: string) {
        const queue = new BuildQueue<MapArrangeData>(true)
        const randomizeDirTryOrder = true
        const roomSizeReg = { x: 9*16, y: 9*16 }
        // const tunnelSizeReg = { x: 1, y: 1 }
        // const roomSizeBranch = { x: 5, y: 5 }
        // const tunnelSizeBranch = { x: 1, y: 1 }
        //
        // function tunnel(count: number, followedBy?: MapPicker.ConfigNode): MapPicker.ConfigNode {
        //     return {
        //         type: 'SimpleTunnel',
        //         roomSize: roomSizeReg,
        //         tunnelSize: tunnelSizeReg,
        //         count,
        //         randomizeDirTryOrder,
        //         followedBy,
        //     }
        // }
        // function branch(
        //     deep: number,
        //     branchTunnelCount: () => number,
        //     finalTunnelCount: () => number,
        //     branchCount: () => 1 | 2 | 3
        // ): MapPicker.ConfigNode {
        //     if (deep == 0) {
        //         return tunnel(finalTunnelCount())
        //     }
        //     return {
        //         type: 'SimpleBranch',
        //         roomSize: roomSizeBranch,
        //         tunnelSize: tunnelSizeBranch,
        //         branches: [
        //             ...new Array(branchCount())
        //                 .fill(null)
        //                 .map(_ =>
        //                     tunnel(
        //                         branchTunnelCount(),
        //                         branch(deep - 1, branchTunnelCount, finalTunnelCount, branchCount)
        //                     )
        //                 ),
        //         ] as any,
        //     }
        // }

        const mapPicker: MapPicker = mapPickerConfigurable({
            root: {
                type: 'Simple',
                size: roomSizeReg,
                count: 1,
                randomizeDirTryOrder,

                // followedBy: branch(
                //     2,
                //     () => 2,
                //     () => 2,
                //     () => 2
                // ),
            },
        })

        setRandomSeed(seed)
        const mapsArrange = queue.begin(mapPicker(-1, queue)) as MapArrange[]
        // console.dir(queue.queue, { depth: null })
        console.log(drawMapArrangeQueue(queue, 16, false, undefined, false, true))
        if (!mapsArrange) throw new Error('res null')

        const mapsConstruct = constructMapsFromMapsArrange(mapsArrange, {
            id: 'myarea',
            title: 'My area',
            description: '8th ring of hell',
        })
        console.log(mapsConstruct)
    }
}
