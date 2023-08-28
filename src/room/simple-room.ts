import { Dir, MapPoint, MapRect } from '../util/pos'
import { Room, RoomIODoorLike, RoomPlaceOrder, RoomType } from './room'

export class SimpleRoom extends Room {
    constructor(pos: MapPoint, size: MapPoint, spacing: number, entDir: Dir, exitDir: Dir) {
        if (entDir == exitDir) { throw new Error('exit and ent dir cannot be the same') }
        super('simple', MapRect.fromTwoPoints(pos, size), [true, true, true, true], spacing, true, RoomPlaceOrder.Room, RoomType.Room)

        this.primaryEntarence = RoomIODoorLike.fromRoom('Door', this, 'simple-ent', entDir)
        this.primaryExit = RoomIODoorLike.fromRoom('Door', this, 'simple-exit', exitDir)
    }
}
