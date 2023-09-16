import { assert } from '@root/util/misc'
import { Dir, DirUtil, EntityPoint, EntityRect, MapPoint, MapRect, PosDir } from '@root/util/pos'
import { Room, RoomIO, RoomIODoorLike, RoomPlaceOrder, RoomType, Tpr } from '@root/room/room'

export class RoomIOTunnel implements RoomIO {
    protected constructor(public tunnel: TunnelRoom) {}

    getTpr(): Tpr { throw new Error('invalid call on RoomIOTunnel') }
}
export class RoomIOTunnelOpen extends RoomIOTunnel {
    private _open = true
    constructor(parentRoom: Room, dir: Dir, size: MapPoint, exitDir: Dir, setPos: EntityPoint, preffedPos: boolean) {
        super(new TunnelRoom(parentRoom, dir, size, exitDir, setPos, preffedPos))
    }
    getTpr(): Tpr { throw new Error('invalid call on RoomIOTunnelOpen: these dont have tprs') }
}
export class RoomIOTunnelClosed extends RoomIOTunnel {
    private _closed = true
    constructor(parentRoom: Room, dir: Dir, size: MapPoint, setPos: EntityPoint, preffedPos: boolean) {
        super(new TunnelRoom(parentRoom, dir, size, null, setPos, preffedPos))
    }
    getTpr(): Tpr {
        assert(this.tunnel.primaryExit)
        return this.tunnel.primaryExit.getTpr()
    }
}

export function getPosDirFromRoomIO(baseRoom: Room, io: RoomIO): PosDir<MapPoint> | null {
    const tpr = io.getTpr()
    if (! DirUtil.dir3dIsDir(tpr.dir)) { return null }

    const pos: MapPoint = tpr.pos.to(MapPoint)
    const dir = DirUtil.dir3dToDir(tpr.dir)

    const room: Room = io instanceof RoomIOTunnel ? io.tunnel : baseRoom
    room.setPosToSide(pos, dir)
    return Object.assign(pos, { dir })
}

export class TunnelRoom extends Room {
    primaryExit?: RoomIODoorLike

    constructor(
        public parentRoom: Room,
        public dir: Dir,
        public size: MapPoint,
        public exitDir: Dir | null,
        setPos: EntityPoint,
        preffedPos: boolean,
    ) {
        const pos: EntityPoint = setPos.copy()
        preffedPos && parentRoom.to(EntityRect).setPosToSide(pos, dir)

        const rect: EntityRect = EntityRect.fromTwoPoints(pos, size.to(EntityPoint))
        if (! DirUtil.isVertical(dir)) {
            [rect.width, rect.height] = [rect.height, rect.width]
        }
        switch (dir) {
            case Dir.NORTH:
                rect.x -= rect.width/2
                rect.y -= rect.height
                break
            case Dir.EAST:
                rect.y -= rect.height/2
                break
            case Dir.SOUTH:
                rect.x -= rect.width/2
                break
            case Dir.WEST:
                rect.x -= rect.width
                rect.y -= rect.height/2
                break
        }
        const wallSides: boolean[] = [true, true, true, true]
        wallSides[DirUtil.flip(dir)] = false
        if (exitDir !== null) {
            wallSides[DirUtil.flip(exitDir)] = false
        }
        super('tunnel-' + dir + '-' + parentRoom.name, rect, wallSides, false, RoomPlaceOrder.Tunnel, RoomType.Tunnel)

        if (exitDir == null) {
            this.primaryExit = RoomIODoorLike.fromRoom('Door', this, this.name + '-exitdoor', dir)
            this.ios.push(this.primaryExit)
        }
    }

    getRoomPosThatConnectsToTheMiddle(roomSize: MapPoint): MapPoint {
        if (this.exitDir === null) { throw new Error('cannot call getRoomPosThatConnectsToTheMiddle() when tunnel is closed') }

        const exitDir = DirUtil.flip(this.exitDir)
        const exitWallRect: MapRect = this.getSide(exitDir, 0) as MapRect
        /* get the tunnel middle point */
        exitWallRect.x += exitWallRect.width/2
        exitWallRect.y += exitWallRect.height/2
        /* calculate the room pos */
        if (DirUtil.isVertical(exitDir)) {
            exitWallRect.x -= roomSize.x/2
            if (exitDir == Dir.NORTH) { exitWallRect.y -= roomSize.y }
        } else {
            exitWallRect.y -= roomSize.y/2
            if (exitDir == Dir.WEST) { exitWallRect.x -= roomSize.x }
        }
        return MapPoint.fromVec(exitWallRect)
    }
}
