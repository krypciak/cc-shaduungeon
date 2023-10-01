import { assert, randomSeedInt } from '@root/util/misc'
import { Dir, DirUtil, EntityPoint, EntityRect, MapPoint, MapRect, Point, PosDir, Rect } from '@root/util/pos'
import { Room, RoomIO, RoomIODoorLike, RoomPlaceOrder, RoomType, Tpr } from '@root/room/room'
import { MapDestructible, MapKeyPanel } from '@root/util/entity'
import { RoomPlaceVars } from './map-builder'
import { ArmRuntime } from '@root/dungeon/dungeon-arm'

export class RoomIOTunnel implements RoomIO {
    protected constructor(public tunnel: TunnelRoom) {}

    getTpr(): Tpr { throw new Error('invalid call on RoomIOTunnel') }
}
export class RoomIOTunnelOpen extends RoomIOTunnel {
    _open = true
    constructor(parentRoom: Room, dir: Dir, size: MapPoint, exitDir: Dir, setPos: EntityPoint, preffedPos: boolean, keyCount?: number) {
        super(new TunnelRoom(parentRoom, dir, size, exitDir, setPos, preffedPos, keyCount))
    }
    getTpr(): Tpr { throw new Error('invalid call on RoomIOTunnelOpen: these dont have tprs') }
}
export class RoomIOTunnelClosed extends RoomIOTunnel {
    _closed = true
    constructor(parentRoom: Room, dir: Dir, size: MapPoint, setPos: EntityPoint, preffedPos: boolean, keyCount?: number) {
        super(new TunnelRoom(parentRoom, dir, size, null, setPos, preffedPos, keyCount))
    }
    getTpr(): Tpr {
        assert(this.tunnel.primaryExit)
        return this.tunnel.primaryExit.getTpr()
    }
}

export function getPosDirFromRoomIO(baseRoom: Room, io: RoomIO): PosDir<MapPoint> | null {
    const tpr = io.getTpr()

    const pos: MapPoint = tpr.pos.to(MapPoint)
    const dir = tpr.dir

    const room: Room = io instanceof RoomIOTunnel ? io.tunnel : baseRoom
    room.setPosToSide(pos, dir)
    return Object.assign(pos, { dir })
}

export class TunnelRoom extends Room {
    static keyDestSpacing: number = 16
    primaryExit?: RoomIODoorLike

    constructor(
        public parentRoom: Room,
        public dir: Dir,
        public size: MapPoint,
        public exitDir: Dir | null,
        setPos: EntityPoint,
        preffedPos: boolean,
        public keyCount?: number,
    ) {
        const pos: EntityPoint = setPos.copy()
        preffedPos && parentRoom.to(EntityRect).setPosToSide(pos, dir)

        const rect: EntityRect = EntityRect.fromTwoPoints(pos, size.to(EntityPoint))
        if (keyCount) {
            rect.height += keyCount * (TunnelRoom.keyDestSpacing + 16)
        }
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

    async place(rpv: RoomPlaceVars, arm: ArmRuntime): Promise<void | RoomPlaceVars> {
        super.place(rpv, arm)
        if (this.keyCount) {
            const initKeyArrRect: EntityRect = Rect.new(MapRect, this.getSide(DirUtil.flip(this.dir), 0)).to(EntityRect)
            if (this.dir == Dir.NORTH) { initKeyArrRect.y -= 16 }
            else if (this.dir == Dir.WEST) { initKeyArrRect.x -= 16 }

            const keyArrLen: number = this.size.x
            let lastRealKeyPos: number = -1
            for (let i = 0; i < this.keyCount; i++) {
                const keyArrPos: EntityPoint = EntityPoint.fromVec(initKeyArrRect)
                Point.moveInDirection(keyArrPos, this.dir, (16 + TunnelRoom.keyDestSpacing) * i)
                let keyPos: number = -2
                do {
                    keyPos = randomSeedInt(2, keyArrLen - 1) 
                } while (keyPos == lastRealKeyPos)

                const keyDestArr: MapDestructible[] = MapDestructible.keyPillarChain(keyArrPos, rpv.masterLevel, this.dir,
                    `${this.name}_keyChain`, keyArrLen, keyPos)
                rpv.entities.push(...keyDestArr)
                lastRealKeyPos = keyPos
            }

            const keyPanelPos: EntityPoint = initKeyArrRect.middlePoint(EntityPoint)
            Point.moveInDirection(keyPanelPos, DirUtil.flip(this.dir), 64)
            keyPanelPos.x -= 8
            keyPanelPos.y -= 8
            const keyPanelE: MapKeyPanel = MapKeyPanel.new(keyPanelPos, rpv.masterLevel, `${this.name}_keyPanel`, 'REGULAR')
            rpv.entities.push(keyPanelE)
        }
    }
}
