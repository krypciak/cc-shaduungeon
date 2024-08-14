import { BuildQueueAccesor, Id } from '../dungeon/build-queue'
import { MapArrange, MapArrangeData } from '../rooms/map-arrange'
import { Rect } from '../util/geometry'

export class AreaArranger {
    static doesMapFit(
        accesor: BuildQueueAccesor<MapArrangeData>,
        mapToFit: Pick<MapArrange, 'rects'>,
        id: Id
    ): boolean {
        for (let i = id - 1; i >= 0; i--) {
            const map = accesor.get(i)
            if (Rect.doesArrOverlapArr(map.rects!, mapToFit.rects)) return false
        }
        return true
    }
}
