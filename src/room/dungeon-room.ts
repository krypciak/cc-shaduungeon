import { Dir, DirUtil, EntityPoint, EntityRect, MapPoint, MapRect, Rect } from '@root/util/pos'
import { Room, RoomIOTpr, Tpr, } from '@root/room/room'
import { RoomIOTunnelClosed, } from '@root/room/tunnel-room'

export class DungeonIntersectionRoom extends Room {
    tunnelSize: MapPoint = new MapPoint(5, 5)
    primaryEntarence: RoomIOTunnelClosed

    exitsDirs: Dir[]
    exits: RoomIOTunnelClosed[] = []

    constructor(pos: MapPoint, size: MapPoint, public keyCount: number, entDir: Dir, ...exitsDirs: Dir[]) {
        if (new Set([ ...exitsDirs, entDir ]).size != exitsDirs.length + 1) { throw new Error('invalid dir inputs') }
        super('dungeonintersectionroom', MapRect.fromTwoPoints(pos, size), [true, true, true, true], true)
        this.exitsDirs = exitsDirs

        this.teleportFields = []
        this.primaryEntarence = new RoomIOTunnelClosed(this, entDir, this.tunnelSize, this.middlePoint(MapPoint).to(EntityPoint), true)

        for (let i = 0; i < exitsDirs.length; i++) {
            const exit = new RoomIOTunnelClosed(this, exitsDirs[i], this.tunnelSize,
                this.middlePoint(MapPoint).to(EntityPoint), true, i == 0 ? keyCount : undefined)
            this.exits.push(exit)
            this.addTeleportField(exit, i)
        }
        this.ios.push(this.primaryEntarence, ...this.exits, ...this.teleportFields)
    }

    addTeleportField(exit: RoomIOTunnelClosed, index: number): RoomIOTpr {
        const dir = exit.tunnel.dir
        const rect: EntityRect = Rect.new(MapRect, exit.tunnel.getSide(DirUtil.flip(dir), 0)).to(EntityRect)
        rect.x += rect.width/2 - 12
        rect.y += rect.height/2 - 12
        const io = new RoomIOTpr(Tpr.get('Go back' + index, dir, EntityPoint.fromVec(rect), 'TeleportField', true, '@TARGET_CONDITION'))
        this.teleportFields!.push(io)
        return io
    }
}
