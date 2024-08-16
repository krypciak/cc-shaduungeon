import { BuildQueue, Id } from './build-queue'
import { setRandomSeed } from '../util/util'
import { RoomChooser, roomChooserConfigurable } from './room-choosers/configurable'
import { drawQueue } from './queue-drawer'
import { MapArrangeData } from '../map-arrange/map-arrange'

export type RoomBlueprint = {}

export type BlueprintRoot = Record<Id, RoomBlueprint>

export class DungeonBuilder {
    build(seed: string) {
        const queue = new BuildQueue<MapArrangeData>(true)
        const roomSizeReg = { x: 3, y: 3 }
        const tunnelSizeReg = { x: 1, y: 1 }
        const roomSizeBranch = { x: 5, y: 5 }
        const tunnelSizeBranch = { x: 1, y: 1 }
        const randomizeDirTryOrder = true

        function tunnel(count: number, followedBy?: RoomChooser.ConfigNode): RoomChooser.ConfigNode {
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
        ): RoomChooser.ConfigNode {
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

        const roomChooser: RoomChooser = roomChooserConfigurable({
            root: {
                type: 'Simple',
                size: roomSizeReg,
                count: 1,
                randomizeDirTryOrder,

                followedBy: branch(
                    3,
                    () => [1, 2].random(),
                    () => [1, 2, 3, 4].random(),
                    () => [2, 3].random() as any
                ),
            },
        })

        setRandomSeed(seed)
        const res = queue.begin(roomChooser(-1, queue))
        console.log(!!res)
        // console.dir(queue.queue, { depth: null })
        console.log(drawQueue(queue, false, undefined, false, true))
    }
}
