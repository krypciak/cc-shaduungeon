import { expect, Test, TestCase, TestSuite } from 'testyts/build/testyCore'
import { setRandomSeed, sha256 } from '../../util/util'
import { BuildQueue } from '../build-queue'
import { drawQueue } from '../queue-drawer'
import { RoomChooser, roomChooserConfigurable } from './configurable'
import { MapArrangeData } from '../../map-arrange/map-arrange'

@TestSuite()
export class Test_RoomChooserConfigurable {
    @Test()
    @TestCase('seed: hello', 'hello', 'ad89a7a5132d192e3b9d2b2408879f6af95b212208639e76162ad4983bf98b1d')
    build(seed: string, expected: string) {
        const queue = new BuildQueue<MapArrangeData>()
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
                    () => 1,
                    () => 2,
                    () => 2
                ),
            },
        })

        setRandomSeed(seed)
        queue.begin(roomChooser(-1, queue))
        const res = drawQueue(queue)
        const sha = sha256(res)
        expect.toBeEqual(sha, expected)
    }
}
