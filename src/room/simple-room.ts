import { Dir, DirUtil, EntityPoint, MapPoint, MapRect } from '../util/pos'
import { Room, RoomIODoorLike } from './room'
import { RoomIOTunnelClosed, RoomIOTunnelOpen } from './tunnel-room'

export class SimpleRoom extends Room {
    primaryEntarence: RoomIODoorLike
    primaryExit: RoomIODoorLike

    constructor(pos: MapPoint, size: MapPoint, spacing: number, entDir: Dir, exitDir: Dir) {
        if (entDir == exitDir) { throw new Error('exit and ent dir cannot be the same') }
        super('simpleroom', MapRect.fromTwoPoints(pos, size), [true, true, true, true], spacing, true)

        this.primaryEntarence = RoomIODoorLike.fromRoom('Door', this, 'simple-ent', entDir)
        this.primaryExit = RoomIODoorLike.fromRoom('Door', this, 'simple-exit', exitDir)
        this.ios.push(this.primaryEntarence, this.primaryExit)
    }
}
export class SimpleTunnelRoom extends Room {
    primaryEntarence: RoomIOTunnelClosed
    primaryExit: RoomIODoorLike

    constructor(pos: MapPoint, size: MapPoint, spacing: number, entDir: Dir, exitDir: Dir) {
        if (entDir == exitDir) { throw new Error('exit and ent dir cannot be the same') }
        super('simpletunnelroom', MapRect.fromTwoPoints(pos, size), [true, true, true, true], spacing, true)

        const tunnelSize: MapPoint = new MapPoint(8, 8)
        this.primaryEntarence = new RoomIOTunnelClosed(this, entDir, tunnelSize, this.floorRect.middlePoint(MapPoint).to(EntityPoint), true)
            /* RoomIODoorLike.fromRoom('Door', this, 'simple-ent', entDir) */
        this.primaryExit = RoomIODoorLike.fromRoom('Door', this, 'simple-exit', exitDir)
        this.ios.push(this.primaryEntarence, this.primaryExit)
    }
}
export class SimpleDoubleTunnelRoom extends Room {
    primaryEntarence: RoomIOTunnelClosed
    primaryExit: RoomIOTunnelClosed

    constructor(pos: MapPoint, size: MapPoint, spacing: number, entDir: Dir, exitDir: Dir) {
        if (entDir == exitDir) { throw new Error('exit and ent dir cannot be the same') }
        super('simpledoubletunnelroom', MapRect.fromTwoPoints(pos, size), [true, true, true, true], spacing, true)

        const tunnelSize: MapPoint = new MapPoint(8, 8)
        this.primaryEntarence = new RoomIOTunnelClosed(this, entDir, tunnelSize, this.floorRect.middlePoint(MapPoint).to(EntityPoint), true)
        this.primaryExit = new RoomIOTunnelClosed(this, exitDir, tunnelSize, this.floorRect.middlePoint(MapPoint).to(EntityPoint), true)
        this.ios.push(this.primaryEntarence, this.primaryExit)
    }
}
export class SimpleOpenTunnelRoom extends Room {
    primaryEntarence: RoomIOTunnelOpen
    primaryExit: RoomIOTunnelClosed
    
    constructor(pos: MapPoint, size: MapPoint, spacing: number, entDir: Dir, exitDir: Dir) {
        if (entDir == exitDir) { throw new Error('exit and ent dir cannot be the same') }
        super('simpleopentunnelroom', MapRect.fromTwoPoints(pos, size), [true, true, true, true], spacing, true)

        this.primaryEntarence = new RoomIOTunnelOpen(this, entDir, new MapPoint(4, 16), DirUtil.flip(entDir), this.floorRect.middlePoint(MapPoint).to(EntityPoint), true)
        this.primaryExit = new RoomIOTunnelClosed(this, exitDir, new MapPoint(4, 8), this.floorRect.middlePoint(MapPoint).to(EntityPoint), true)
        this.ios.push(this.primaryEntarence, this.primaryExit)
    }
}
