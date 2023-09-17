import { Dir, DirUtil, EntityPoint, MapPoint, MapRect } from '@root/util/pos'
import { Room, RoomIODoorLike } from '@root/room/room'
import { RoomIOTunnelClosed, RoomIOTunnelOpen } from '@root/room/tunnel-room'

export class SimpleRoom extends Room {
    primaryEntarence: RoomIODoorLike
    primaryExit: RoomIODoorLike

    constructor(pos: MapPoint, size: MapPoint, entDir: Dir, exitDir: Dir) {
        if (entDir == exitDir) { throw new Error('exit and ent dir cannot be the same') }
        super('simpleroom', MapRect.fromTwoPoints(pos, size), [true, true, true, true], true)

        this.primaryEntarence = RoomIODoorLike.fromRoom('Door', this, 'simple-ent', entDir)
        this.primaryExit = RoomIODoorLike.fromRoom('Door', this, 'simple-exit', exitDir)
        this.ios.push(this.primaryEntarence, this.primaryExit)
    }
}
export class SimpleTunnelRoom extends Room {
    primaryEntarence: RoomIOTunnelClosed
    primaryExit: RoomIODoorLike

    constructor(pos: MapPoint, size: MapPoint, entDir: Dir, exitDir: Dir) {
        if (entDir == exitDir) { throw new Error('exit and ent dir cannot be the same') }
        super('simpletunnelroom', MapRect.fromTwoPoints(pos, size), [true, true, true, true], true)

        const tunnelSize: MapPoint = new MapPoint(4, 4)
        this.primaryEntarence = new RoomIOTunnelClosed(this, entDir, tunnelSize, this.middlePoint(MapPoint).to(EntityPoint), true)
            /* RoomIODoorLike.fromRoom('Door', this, 'simple-ent', entDir) */
        this.primaryExit = RoomIODoorLike.fromRoom('Door', this, 'simple-exit', exitDir)
        this.ios.push(this.primaryEntarence, this.primaryExit)
    }
}
export class SimpleDoubleTunnelRoom extends Room {
    primaryEntarence: RoomIOTunnelClosed
    primaryExit: RoomIOTunnelClosed

    constructor(pos: MapPoint, size: MapPoint, entDir: Dir, exitDir: Dir) {
        if (entDir == exitDir) { throw new Error('exit and ent dir cannot be the same') }
        super('simpledoubletunnelroom', MapRect.fromTwoPoints(pos, size), [true, true, true, true], true)

        const tunnelSize: MapPoint = new MapPoint(4, 4)
        this.primaryEntarence = new RoomIOTunnelClosed(this, entDir, tunnelSize, this.middlePoint(MapPoint).to(EntityPoint), true)
        this.primaryExit = new RoomIOTunnelClosed(this, exitDir, tunnelSize, this.middlePoint(MapPoint).to(EntityPoint), true)
        this.ios.push(this.primaryEntarence, this.primaryExit)
    }
}
export class SimpleOpenTunnelRoom extends Room {
    primaryEntarence: RoomIOTunnelOpen
    primaryExit: RoomIOTunnelClosed
    
    constructor(pos: MapPoint, size: MapPoint, entDir: Dir, exitDir: Dir) {
        if (entDir == exitDir) { throw new Error('exit and ent dir cannot be the same') }
        super('simpleopentunnelroom', MapRect.fromTwoPoints(pos, size), [true, true, true, true], true)

        this.primaryEntarence = new RoomIOTunnelOpen(this, entDir, new MapPoint(4, 8), DirUtil.flip(entDir), this.middlePoint(MapPoint).to(EntityPoint), true)
        this.primaryExit = new RoomIOTunnelClosed(this, exitDir, new MapPoint(4, 4), this.middlePoint(MapPoint).to(EntityPoint), true)
        this.ios.push(this.primaryEntarence, this.primaryExit)
    }
}
export class SimpleMultipleExitRoom extends Room {
    primaryEntarence: RoomIOTunnelClosed

    exitsDirs: Dir[]
    exits: RoomIODoorLike[] = []

    constructor(pos: MapPoint, size: MapPoint, entDir: Dir, ...exitsDirs: Dir[]) {
        if (new Set([ ...exitsDirs, entDir ]).size != exitsDirs.length + 1) { throw new Error('invalid dir inputs') }
        super('simplemultipleexitroom', MapRect.fromTwoPoints(pos, size), [true, true, true, true], true)
        this.exitsDirs = exitsDirs

        const tunnelSize: MapPoint = new MapPoint(4, 4)
        this.primaryEntarence = new RoomIOTunnelClosed(this, entDir, tunnelSize, this.middlePoint(MapPoint).to(EntityPoint), true)

        for (let i = 0; i < exitsDirs.length; i++) {
            this.exits.push(RoomIODoorLike.fromRoom('Door', this, 'simple-exit' + i, exitsDirs[i]))
        }
        this.ios.push(this.primaryEntarence, ...this.exits)
    }
}
export class SimpleMultipleExitTunnelRoom extends Room {
    primaryEntarence: RoomIOTunnelClosed

    exitsDirs: Dir[]
    exits: RoomIOTunnelClosed[] = []

    constructor(pos: MapPoint, size: MapPoint, entDir: Dir, ...exitsDirs: Dir[]) {
        if (new Set([ ...exitsDirs, entDir ]).size != exitsDirs.length + 1) { throw new Error('invalid dir inputs') }
        super('simplemultipleexitroom', MapRect.fromTwoPoints(pos, size), [true, true, true, true], true)
        this.exitsDirs = exitsDirs

        const tunnelSize: MapPoint = new MapPoint(4, 4)
        this.primaryEntarence = new RoomIOTunnelClosed(this, entDir, tunnelSize, this.middlePoint(MapPoint).to(EntityPoint), true)

        for (let i = 0; i < exitsDirs.length; i++) {
            this.exits.push(
                new RoomIOTunnelClosed(this, exitsDirs[i], tunnelSize, this.middlePoint(MapPoint).to(EntityPoint), true))
        }
        this.ios.push(this.primaryEntarence, ...this.exits)
    }
}
