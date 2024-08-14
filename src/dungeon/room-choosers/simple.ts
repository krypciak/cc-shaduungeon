import { TprArrange, MapArrange, MapArrangeData } from '../../rooms/map-arrange'
import { simpleRoomArrange } from '../../rooms/simple'
import { Dir } from '../../util/geometry'
import { Id, BuildQueueAccesor, NextQueueEntryGenerator } from '../build-queue'
import { randomInt } from '../../util/util'

export type RoomChooser = (
    id: Id,
    accesor: BuildQueueAccesor<MapArrangeData>
) => NextQueueEntryGenerator<MapArrangeData>

export function roomChooserSimpleSeedRandomSize() {
    const roomChooser: RoomChooser = (id, accesor) => {
        const lastTpr: TprArrange =
            id == -1
                ? {
                      dir: Dir.NORTH,
                      x: 0,
                      y: 0,
                  }
                : ((accesor.get(id) as MapArrange).restTprs[0] as TprArrange)
        const size = randomInt(1, 5) * 2
        const roomGen = simpleRoomArrange(roomChooser, lastTpr, size, true, id >= 100)
        return roomGen
    }
    return roomChooser
}
