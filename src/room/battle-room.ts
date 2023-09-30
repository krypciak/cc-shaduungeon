import { MapEnemyCounter, MapEventTrigger, MapGlowingLine, MapHiddenBlock, MapTouchTrigger, MapWall } from '@root/util/entity'
import { assert } from '@root/util/misc'
import { DirUtil, EntityPoint, EntityRect, MapPoint, MapRect } from '@root/util/pos'
import { RoomPlaceVars } from '@root/room/map-builder'
import { Room } from '@root/room/room'
import { RoomIOTunnel, RoomIOTunnelOpen, TunnelRoom, } from '@root/room/tunnel-room'
import { ArmRuntime } from '@root/dungeon/dungeon-arm'

export class BattleRoom extends Room {
    primaryEntarence!: RoomIOTunnel

    constructor(pos: MapPoint, size: MapPoint,
        public startCondition: string,
        public doneCondition: string,
        public primExit?: RoomIOTunnelOpen,
    ) {
        super('battle', MapRect.fromTwoPoints(pos, size), [true, true, true, true])
    }

    async place(rpv: RoomPlaceVars, arm: ArmRuntime): Promise<RoomPlaceVars | void> {
        this.sel = { sel: blitzkrieg.util.getSelFromRect(this.to(EntityRect), rpv.map.name, 0), poolName: 'battle'  }
        super.place(rpv, arm)

        if (dnggen.debug.decorateBattleRoom) {
            assert(this.primExit, 'closed tunnels not implemented')
            const exitTunnel: TunnelRoom = this.primExit.tunnel
            const entTunnel: TunnelRoom = this.primaryEntarence.tunnel


            const nextRoomEnterCondition = this.startCondition + ' && !' + this.doneCondition
            const puzzleTunnelExitRect: EntityRect = exitTunnel.getSideEntityRect(exitTunnel.dir)
            rpv.entities.push(                       MapWall.new(puzzleTunnelExitRect, rpv.masterLevel, 'battleExitWall', nextRoomEnterCondition))
            rpv.entities.push(MapHiddenBlock.newInvisibleBlocker(puzzleTunnelExitRect, rpv.masterLevel, 'battleExitBlocker', '!' + this.doneCondition))

            const middlePoint: EntityPoint = this.middlePoint(MapPoint).to(EntityPoint)
            Vec2.sub(middlePoint, { x: 16, y: 16})
            rpv.entities.push(MapEnemyCounter.new(middlePoint, rpv.masterLevel, 'battle1EnemyCounter',
                /* enemyGroup */ '', /* enemyCount */ 0, /* preVariable */ '', /* postVariable */ '', /* countVariable */ ''))

            const glowingLineSize: number = DirUtil.isVertical(exitTunnel.dir) ?
                Math.abs(middlePoint.y - puzzleTunnelExitRect.y) : 
                Math.abs(middlePoint.x - puzzleTunnelExitRect.x)

            rpv.entities.push(MapGlowingLine
                .newPerpendicular(puzzleTunnelExitRect, rpv.masterLevel, 'battle1GlowingLine', exitTunnel.dir, glowingLineSize, this.doneCondition))

            const battleTunnelEntarenceRect: EntityRect = entTunnel.getSideEntityRect(DirUtil.flip(entTunnel.dir))
            rpv.entities.push(                                 MapWall.new(battleTunnelEntarenceRect, rpv.masterLevel, 'battle1EntarenceWall', nextRoomEnterCondition))
            rpv.entities.push(MapHiddenBlock.newInvisibleProjectileBlocker(battleTunnelEntarenceRect, rpv.masterLevel, 'battle1EntarencePBlocker', '!' + this.startCondition))
            rpv.entities.push(                 MapTouchTrigger.newParallel(battleTunnelEntarenceRect, rpv.masterLevel, 'battle1TouchTriggerStart', entTunnel.dir, 10, 32, this.startCondition))

            rpv.entities.push(MapEventTrigger
                .new(EntityPoint.fromVec(puzzleTunnelExitRect), rpv.masterLevel, 'battle1EndEvent', 'PARALLEL', this.doneCondition, 'ONCE_PER_ENTRY', '', [
                    // {
                    //     entity: { player: true },
                    //     marker: { global: true, name: DungeonMapBuilder.roomEntarenceMarker },
                    //     type: 'SET_RESPAWN_POINT',
                    // },
                    { type: 'SAVE' }
                ]
            ))
        }
    }
}
