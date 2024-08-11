import { Dir, DirUtil, EntityPoint, MapPoint, Point } from 'cc-map-util/pos'
import { Room, RoomIODoorLike, RoomIOTpr, Tpr, getPosOnRectSide } from '@root/room/room'
import { RoomIOTunnelClosed, RoomIOTunnelOpen } from '@root/room/tunnel-room'
import { EntityRect, MapRect, Rect } from 'cc-map-util/src/rect'

export class SimpleRoom extends Room {
    primaryEntarence: RoomIODoorLike
    primaryExit: RoomIODoorLike

    constructor(pos: MapPoint, size: MapPoint, entDir: Dir, exitDir: Dir) {
        if (entDir == exitDir) {
            throw new Error('exit and ent dir cannot be the same')
        }
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
        if (entDir == exitDir) {
            throw new Error('exit and ent dir cannot be the same')
        }
        super('simpletunnelroom', MapRect.fromTwoPoints(pos, size), [true, true, true, true], true)

        const tunnelSize: MapPoint = new MapPoint(4, 4)
        this.primaryEntarence = new RoomIOTunnelClosed(
            this,
            entDir,
            tunnelSize,
            this.middlePoint(MapPoint).to(EntityPoint),
            true
        )
        /* RoomIODoorLike.fromRoom('Door', this, 'simple-ent', entDir) */
        this.primaryExit = RoomIODoorLike.fromRoom('Door', this, 'simple-exit', exitDir)
        this.ios.push(this.primaryEntarence, this.primaryExit)
    }
}
export class SimpleDoubleTunnelRoom extends Room {
    primaryEntarence: RoomIOTunnelClosed
    primaryExit: RoomIOTunnelClosed

    constructor(pos: MapPoint, size: MapPoint, entDir: Dir, exitDir: Dir) {
        if (entDir == exitDir) {
            throw new Error('exit and ent dir cannot be the same')
        }
        super('simpledoubletunnelroom', MapRect.fromTwoPoints(pos, size), [true, true, true, true], true)

        const tunnelSize: MapPoint = new MapPoint(4, 4)
        this.primaryEntarence = new RoomIOTunnelClosed(
            this,
            entDir,
            tunnelSize,
            this.middlePoint(MapPoint).to(EntityPoint),
            true
        )
        this.primaryExit = new RoomIOTunnelClosed(
            this,
            exitDir,
            tunnelSize,
            this.middlePoint(MapPoint).to(EntityPoint),
            true
        )
        this.ios.push(this.primaryEntarence, this.primaryExit)
    }
}
export class SimpleOpenTunnelRoom extends Room {
    primaryEntarence: RoomIOTunnelOpen
    primaryExit: RoomIOTunnelClosed

    constructor(pos: MapPoint, size: MapPoint, entDir: Dir, exitDir: Dir) {
        if (entDir == exitDir) {
            throw new Error('exit and ent dir cannot be the same')
        }
        super('simpleopentunnelroom', MapRect.fromTwoPoints(pos, size), [true, true, true, true], true)

        this.primaryEntarence = new RoomIOTunnelOpen(
            this,
            entDir,
            new MapPoint(4, 8),
            DirUtil.flip(entDir),
            this.middlePoint(MapPoint).to(EntityPoint),
            true
        )
        this.primaryExit = new RoomIOTunnelClosed(
            this,
            exitDir,
            new MapPoint(4, 4),
            this.middlePoint(MapPoint).to(EntityPoint),
            true
        )
        this.ios.push(this.primaryEntarence, this.primaryExit)
    }
}
export class SimpleMultipleExitTunnelRoom extends Room {
    primaryEntarence: RoomIOTunnelClosed

    exitsDirs: Dir[]
    exits: RoomIOTunnelClosed[] = []

    constructor(pos: MapPoint, size: MapPoint, entDir: Dir, ...exitsDirs: Dir[]) {
        if (new Set([...exitsDirs, entDir]).size != exitsDirs.length + 1) {
            throw new Error('invalid dir inputs')
        }
        super('simplemultipleexitroom', MapRect.fromTwoPoints(pos, size), [true, true, true, true], true)
        this.exitsDirs = exitsDirs

        this.teleportFields = []
        const tunnelSize: MapPoint = new MapPoint(4, 4)
        this.primaryEntarence = new RoomIOTunnelClosed(
            this,
            entDir,
            tunnelSize,
            this.middlePoint(MapPoint).to(EntityPoint),
            true
        )

        for (let i = 0; i < exitsDirs.length; i++) {
            const exit = new RoomIOTunnelClosed(
                this,
                exitsDirs[i],
                tunnelSize,
                this.middlePoint(MapPoint).to(EntityPoint),
                true
            )
            this.exits.push(exit)
            this.addTeleportField(exit, i)
        }
        this.ios.push(this.primaryEntarence, ...this.exits, ...this.teleportFields)
    }

    addTeleportField(exit: RoomIOTunnelClosed, index: number): RoomIOTpr {
        const dir = exit.tunnel.dir
        const rect: EntityRect = Rect.new(MapRect, exit.tunnel.getSide(DirUtil.flip(dir), 0)).to(EntityRect)
        rect.x += rect.width / 2 - 12
        rect.y += rect.height / 2 - 12
        const io = new RoomIOTpr(
            Tpr.get(
                'simple-end-of-arm' + index,
                dir,
                EntityPoint.fromVec(rect),
                'TeleportField',
                true,
                'maps.@TARGET_MAP'
            )
        )
        this.teleportFields!.push(io)
        return io
    }
}
export class SimpleTunnelEndRoom extends Room {
    primaryEntarence: RoomIOTunnelClosed
    primaryExit!: RoomIODoorLike | RoomIOTpr

    constructor(
        pos: MapPoint,
        size: MapPoint,
        entDir: Dir,
        public exitDir: Dir
    ) {
        if (entDir == exitDir) {
            throw new Error('exit and ent dir cannot be the same')
        }
        super('simpletunnelroom', MapRect.fromTwoPoints(pos, size), [true, true, true, true], true)

        const tunnelSize: MapPoint = new MapPoint(4, 4)
        this.primaryEntarence = new RoomIOTunnelClosed(
            this,
            entDir,
            tunnelSize,
            this.middlePoint(MapPoint).to(EntityPoint),
            true
        )
        this.ios.push(this.primaryEntarence)
    }

    addExit(isEnd: boolean) {
        if (this.primaryExit) {
            this.ios.splice(this.ios.indexOf(this.primaryExit))
        }
        if (isEnd) {
            const pos: EntityPoint = getPosOnRectSide(EntityPoint, this.exitDir, this.to(EntityRect))
            Point.moveInDirection(pos, DirUtil.flip(this.exitDir), 32)
            Point.moveInDirection(pos, DirUtil.toRight(this.exitDir), -16)
            this.primaryExit = new RoomIOTpr(Tpr.get('simple-exit-to-arm', this.exitDir, pos, 'TeleportField', true))
        } else {
            this.primaryExit = RoomIODoorLike.fromRoom('Door', this, 'simple-exit', this.exitDir)
        }
        this.ios.push(this.primaryExit)
    }
}
