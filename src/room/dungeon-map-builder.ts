import { AreaInfo } from '../area/area-builder'
import { Selection } from '../util/blitzkrieg'
import { assertBool } from '../util/misc'
import { Dir, DirUtil, EntityPoint, MapPoint } from '../util/pos'
import { BattleRoom } from './battle-room'
import { MapBuilder } from './map-builder'
import { PuzzleRoom } from './puzzle-room'
import { Room } from './room'
import { RoomIOTunnelClosed, RoomIOTunnelOpen } from './tunnel-room'

export const basePath: string = 'rouge/gen'
export const exitMarker: string = 'puzzleExit'
export const entarenceMarker: string = 'battleEntarence'

export class PuzzleMapBuilder extends MapBuilder {
    static closedTunnelSize = new MapPoint(5, 4)
    static openTunnelSize = new MapPoint(5, 4)

    entarenceRoom: Room
    exitRoom: PuzzleRoom
    
    puzzleRoom: PuzzleRoom
     
    constructor(
        public areaInfo: AreaInfo,
        puzzleSel: Selection,
        puzzleMap: sc.MapModel.Map,
        closedTunnel: boolean,
        entarenceCondition: string,
        finalize: boolean = true,
    ) {
        super(3, areaInfo)
        this.puzzleRoom = new PuzzleRoom(puzzleSel, puzzleMap, entarenceCondition)
        this.puzzleRoom.setEntarenceTunnel(closedTunnel, closedTunnel ? PuzzleMapBuilder.closedTunnelSize : PuzzleMapBuilder.openTunnelSize)
        this.puzzleRoom.pushAllRooms(this.rooms)

        this.entarenceRoom = this.puzzleRoom
        this.exitRoom = this.puzzleRoom

        finalize && this.setOnWallPositions()
    }

    prepareToArrange(_: Dir): boolean { return true; }
}

export class BattlePuzzleMapBuilder extends PuzzleMapBuilder {
    battleRoom: BattleRoom

    entarenceRoom: BattleRoom
    exitRoom: PuzzleRoom

    constructor(
        public areaInfo: AreaInfo,
        puzzleSel: Selection,
        puzzleMap: sc.MapModel.Map,
    ) {
        const battleStartCondition: string = 'tmp.battle1'
        const battleDoneCondition: string = 'map.battle1battleDone'
        const puzzleEntarenceCondition: string = battleStartCondition + ' && !' + battleDoneCondition

        super(areaInfo, puzzleSel, puzzleMap, false, puzzleEntarenceCondition, false)
        this.exitRoom = this.puzzleRoom

        const battleSize: MapPoint = new MapPoint(15, 15)
        assertBool(this.puzzleRoom.primaryEntarence instanceof RoomIOTunnelOpen)
        const battlePos: MapPoint = this.puzzleRoom.primaryEntarence.tunnel.getRoomPosThatConnectsToTheMiddle(battleSize)

        this.battleRoom = this.entarenceRoom = new BattleRoom(battlePos, battleSize, battleStartCondition, battleDoneCondition)
    }

    prepareToArrange(dir: Dir): boolean {
        assertBool(this.puzzleRoom.primaryEntarence instanceof RoomIOTunnelOpen)
        if (dir == this.puzzleRoom.primaryEntarence.tunnel.dir) { return false }

        /* make sure the tunnel isn't duplicated */
        const primEnt = this.battleRoom.primaryEntarence
        if (primEnt) {
            assertBool(primEnt instanceof RoomIOTunnelClosed)
            this.battleRoom.ios.splice(this.battleRoom.ios.indexOf(this.battleRoom.primaryEntarence))
            this.rooms.splice(this.rooms.indexOf(primEnt.tunnel))
            this.rooms.splice(this.rooms.indexOf(this.battleRoom))
        }

        const tunnelSize: MapPoint = new MapPoint(5, 4)
        this.battleRoom.primaryEntarence = new RoomIOTunnelClosed(this.battleRoom, DirUtil.flip(dir), tunnelSize,
            this.battleRoom.middlePoint(MapPoint).to(EntityPoint), true)
        this.battleRoom.ios.push(this.battleRoom.primaryEntarence)
        this.battleRoom.pushAllRooms(this.rooms)
        this.setOnWallPositions()
        return true
    }

}

