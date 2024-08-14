import { TprArrange, MapArrange, MapArrangeData } from '../../rooms/map-arrange'
import { simpleMapRoomArrange, simpleMapRoomTunnelArrange } from '../../rooms/simple'
import { Dir } from '../../util/geometry'
import { Id, BuildQueueAccesor, NextQueueEntryGenerator } from '../build-queue'
import { randomInt } from '../../util/util'

export type RoomChooser = (
    id: Id,
    accesor: BuildQueueAccesor<MapArrangeData>
) => NextQueueEntryGenerator<MapArrangeData>

export function roomChooserSimpleSeedRandomSize(count: number) {
    const roomChooser: RoomChooser = (id, accesor) => {
        const lastTpr: TprArrange =
            id == -1 ? { dir: Dir.NORTH, x: 0, y: 0 } : ((accesor.get(id) as MapArrange).restTprs[0] as TprArrange)
        const rand = randomInt(1, 5) * 2
        const size = { x: rand, y: rand }
        const roomGen = simpleMapRoomArrange(roomChooser, lastTpr, size, true, id + 2 >= count)
        return roomGen
    }
    return roomChooser
}

export function roomChooserTunnelSimpleSeedRandomSize(count: number, tunnelSize = { x: 2, y: 4 }) {
    const roomChooser: RoomChooser = (id, accesor) => {
        const lastTpr: TprArrange =
            id == -1 ? { dir: Dir.NORTH, x: 0, y: 0 } : ((accesor.get(id) as MapArrange).restTprs[0] as TprArrange)
        const rand = randomInt(3, 5) * 2
        const size = { x: rand, y: rand }
        const roomGen = simpleMapRoomTunnelArrange(roomChooser, lastTpr, size, tunnelSize, true, id + 2 >= count)
        return roomGen
    }
    return roomChooser
}
