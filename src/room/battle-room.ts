import { Blitzkrieg } from '../util/blitzkrieg'
import { Dir, DirUtil, EntityPoint, MapPoint, MapRect } from '../util/pos'
import { Room, RoomIOTunnel, RoomIOTunnelClosed, RoomIOTunnelOpen, RoomPlaceOrder, RoomType } from './room'
import { TunnelRoom } from './tunnel-room'

declare const blitzkrieg: Blitzkrieg

export class BattleRoom extends Room {
    constructor(pos: MapPoint, size: MapPoint, spacing: number,
        public startCondition: string,
        public doneCondition: string,
        deadEnd: boolean, 
    ) {
        super('battle', MapRect.fromTwoPoints(pos, size), [true, true, true, true], spacing, true, RoomPlaceOrder.Room, RoomType.Room, deadEnd)
    }

    setEntarenceTunnelClosed(dir: Dir, size: MapPoint) {
        const prefPos: EntityPoint = this.floorRect.middlePoint(MapPoint).to(EntityPoint)
        this.primaryEntarence = new RoomIOTunnelClosed(this, dir, size, prefPos, true)
        this.ios.push(this.primaryEntarence)
    }
    setEntarenceTunnelOpen(dir: Dir, size: MapPoint) {
        const prefPos: EntityPoint = this.floorRect.middlePoint(MapPoint).to(EntityPoint)
        this.primaryEntarence = new RoomIOTunnelOpen(this, dir, size, DirUtil.flip(dir), prefPos, true)
        this.ios.push(this.primaryEntarence)
    }
}
