import { AreaInfo } from '../area-builder'
import { Selection } from '../util/blitzkrieg'
import { assert } from '../util/misc'
import { Dir, DirUtil, MapPoint } from '../util/pos'
import { BattleRoom } from './battle-room'
import { MapBuilder } from './map-builder'
import { PuzzleRoom } from './puzzle-room'
import { Room, RoomIOTunnelClosed } from './room'

export const basePath: string = 'rouge/gen'
export const exitMarker: string = 'puzzleExit'
export const entarenceMarker: string = 'battleEntarence'

export class PuzzleMapBuilder extends MapBuilder {
    static closedTunnelSize = new MapPoint(5, 3)
    static openTunnelSize = new MapPoint(5, 8)

    entarenceRoom: Room
    exitRoom: PuzzleRoom
    
    puzzleRoom: PuzzleRoom
     
    constructor(
        public areaInfo: AreaInfo,
        puzzleSel: Selection,
        puzzleMap: sc.MapModel.Map,
        closedTunnel: boolean,
        entarenceCondition: string,
    ) {
        super(3, areaInfo)
        this.puzzleRoom = new PuzzleRoom(puzzleSel, puzzleMap, entarenceCondition)
        this.puzzleRoom.setEntarenceTunnel(closedTunnel, PuzzleMapBuilder.closedTunnelSize, PuzzleMapBuilder.openTunnelSize)
        this.puzzleRoom.pushAllRooms(this.rooms)

        this.entarenceRoom = this.puzzleRoom
        this.exitRoom = this.puzzleRoom
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

        super(areaInfo, puzzleSel, puzzleMap, false, puzzleEntarenceCondition)
        this.exitRoom = this.puzzleRoom

        const battleSize: MapPoint = new MapPoint(9, 9)
        const battlePos: MapPoint = this.puzzleRoom.entarenceTunnel!.getRoomPosThatConnectsToTheMiddle(battleSize)

        this.battleRoom = new BattleRoom(battlePos, battleSize, 2, battleStartCondition, battleDoneCondition, false)
        this.entarenceRoom = this.battleRoom
    }

    prepareToArrange(dir: Dir): boolean {
        assert(this.puzzleRoom.entarenceTunnel)
        if (dir == DirUtil.flip(this.puzzleRoom.entarenceTunnel.dir)) {
            return false
        }
        /* make sure the tunnel isn't duplicated */
        if (this.battleRoom.primaryEntarence) {
            if (! (this.battleRoom.primaryEntarence instanceof RoomIOTunnelClosed)) { throw new Error('how') }
            assert(this.battleRoom.primaryEntarence.tunnel.index)
            this.rooms.splice(this.battleRoom.primaryEntarence.tunnel.index)
        }

        const tunnelSize: MapPoint = new MapPoint(5, 3)
        this.battleRoom.setEntarenceTunnelClosed(dir, tunnelSize)
        return true
    }

}
