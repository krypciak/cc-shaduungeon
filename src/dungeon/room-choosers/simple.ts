import { TprArrange, MapArrange, MapArrangeData } from '../../rooms/map-arrange'
import { simpleMapRoomArrange, simpleMapRoomBranchTunnelArrange, simpleMapRoomTunnelArrange } from '../../rooms/simple'
import { Dir } from '../../util/geometry'
import { Id, BuildQueueAccesor, NextQueueEntryGenerator } from '../build-queue'
import { randomInt } from '../../util/util'
import { printQueue } from '../queue-drawer'
import { RoomChooser } from './configurable'

export function roomChooserSimpleSeedRandomSize(count: number) {
    const roomChooser: RoomChooser = (id, accesor) => {
        const lastTpr: TprArrange =
            id == -1
                ? { dir: Dir.NORTH, x: 0, y: 0, destId: 0 }
                : ((accesor.get(id) as MapArrange).restTprs[0] as TprArrange)
        const rand = randomInt(1, 5) * 2
        const size = { x: rand, y: rand }
        const roomGen = simpleMapRoomArrange({
            roomChooser,
            exitTpr: lastTpr,
            size,
            randomizeDirTryOrder: true,
            finishedWhole: id + 2 >= count,
        })
        return roomGen
    }
    return roomChooser
}

export function roomChooserSimpleTunnelSeedRandomSize(count: number, tunnelSize = { x: 2, y: 4 }) {
    const roomChooser: RoomChooser = (id, accesor) => {
        const lastTpr: TprArrange =
            id == -1
                ? { dir: Dir.NORTH, x: 0, y: 0, destId: 0 }
                : ((accesor.get(id) as MapArrange).restTprs[0] as TprArrange)
        const rand = randomInt(3, 5) * 2
        const roomSize = { x: rand, y: rand }
        const roomGen = simpleMapRoomTunnelArrange({
            roomChooser,
            exitTpr: lastTpr,
            roomSize,
            tunnelSize,
            randomizeDirTryOrder: true,
            finishedWhole: id + 2 >= count,
        })
        return roomGen
    }
    return roomChooser
}

export function roomChooserSimpleTunnelBranch(branchCount: 1 | 2 | 3) {
    function findLastBranch(id: Id, accesor: BuildQueueAccesor<MapArrangeData>): MapArrangeData | undefined {
        for (let i = id - 1; i >= 0; i--) {
            const map = accesor.get(i)
            if (map.createNextBranch) return map
        }
    }

    const tunnelSize = { x: 1, y: 1 }
    const roomChooser: RoomChooser = (id, accesor, newId = id + 1): NextQueueEntryGenerator<MapArrangeData> => {
        const last = id == -1 ? undefined : (accesor.get(id) as MapArrange)

        if (last?.branchDone) {
            const lastBranch = findLastBranch(id, accesor) as MapArrange
            if (!lastBranch) {
                return id => ({ data: {}, id, finishedWhole: true, branch: 0, branchCount: 1 })
            }

            return lastBranch.createNextBranch!
        }
        printQueue(accesor, true)

        const lastTpr = last
            ? (last.restTprs.find(t => t.destId == newId)! as TprArrange)
            : { x: 0, y: 0, dir: Dir.NORTH, destId: 0 }

        // console.dir(accesor.queue, { depth: null })

        const branchRoomsCount = accesor.queue.filter(a => a.data.restTprs?.length ?? 0 > 2).length

        if (id % 6 == 0 && branchRoomsCount < 2) {
            return simpleMapRoomBranchTunnelArrange({
                roomChooser,
                exitTpr: lastTpr,
                roomSize: { x: 5, y: 5 },
                tunnelSize,
                branchCount,
                randomizeDirTryOrder: false,
            })
        } else {
            const rand = 3 //randomInt(3, 5) * 2
            const roomSize = { x: rand, y: rand }

            const branchDone = id % 3 == 0

            return simpleMapRoomTunnelArrange({
                roomChooser,
                exitTpr: lastTpr,
                roomSize,
                tunnelSize,
                randomizeDirTryOrder: false,
                branchDone,
            })
        }
    }
    return roomChooser
}
