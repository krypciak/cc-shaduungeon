import { Dir, DirUtil, EntityPoint, MapPoint, MapRect } from '../util/pos'
import { Room, RoomIODoorLike, RoomPlaceOrder, RoomType } from './room'
import { RoomIOTunnelClosed } from './tunnel-room'

export class SimpleRoom extends Room {
    constructor(pos: MapPoint, size: MapPoint, spacing: number, entDir: Dir, exitDir: Dir) {
        if (entDir == exitDir) { throw new Error('exit and ent dir cannot be the same') }
        super('simple', MapRect.fromTwoPoints(pos, size), [true, true, true, true], spacing, true, RoomPlaceOrder.Room, RoomType.Room)

        this.primaryEntarence = RoomIODoorLike.fromRoom('Door', this, 'simple-ent', entDir)
        this.primaryExit = RoomIODoorLike.fromRoom('Door', this, 'simple-exit', exitDir)
        this.ios.push(this.primaryEntarence, this.primaryExit)
    }
}
export class SimpleTunnelRoom extends Room {
    constructor(pos: MapPoint, size: MapPoint, spacing: number, entDir: Dir, exitDir: Dir) {
        if (entDir == exitDir) { throw new Error('exit and ent dir cannot be the same') }
        super('simple', MapRect.fromTwoPoints(pos, size), [true, true, true, true], spacing, true, RoomPlaceOrder.Room, RoomType.Room)

        const tunnelSize: MapPoint = new MapPoint(8, 8)
        this.primaryEntarence = new RoomIOTunnelClosed(this, entDir, tunnelSize, this.floorRect.middlePoint(MapPoint).to(EntityPoint), true)
            /* RoomIODoorLike.fromRoom('Door', this, 'simple-ent', entDir) */
        this.primaryExit = RoomIODoorLike.fromRoom('Door', this, 'simple-exit', exitDir)
        this.ios.push(this.primaryEntarence, this.primaryExit)
    }
}
export class DoubleTunnelRoom extends Room {
    constructor(pos: MapPoint, size: MapPoint, spacing: number, entDir: Dir, exitDir: Dir) {
        if (entDir == exitDir) { throw new Error('exit and ent dir cannot be the same') }
        super('simple', MapRect.fromTwoPoints(pos, size), [true, true, true, true], spacing, true, RoomPlaceOrder.Room, RoomType.Room)

        const tunnelSize: MapPoint = new MapPoint(8, 8)
        this.primaryEntarence = new RoomIOTunnelClosed(this, entDir, tunnelSize, this.floorRect.middlePoint(MapPoint).to(EntityPoint), true)
        this.primaryExit = new RoomIOTunnelClosed(this, exitDir, tunnelSize, this.floorRect.middlePoint(MapPoint).to(EntityPoint), true)
        this.ios.push(this.primaryEntarence, this.primaryExit)
    }
}
