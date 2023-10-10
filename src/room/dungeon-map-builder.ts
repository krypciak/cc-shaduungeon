import { AreaInfo } from '@root/area/area-builder'
import { getMapDisplayName } from 'cc-map-util/map'
import { assertBool } from 'cc-map-util/util'
import { Dir, DirUtil, EntityPoint, MapPoint } from 'cc-map-util/pos'
import { BattleRoom } from '@root/room/battle-room'
import { MapBuilder } from '@root/room/map-builder'
import { PuzzleRoom } from '@root/room/puzzle-room'
import { Room, RoomIOTpr, } from '@root/room/room'
import { RoomTheme } from '@root/room/themes'
import { RoomIOTunnelClosed, RoomIOTunnelOpen } from '@root/room/tunnel-room'
import { ArmRuntime } from '@root/dungeon/dungeon-arm'
import { DungeonIntersectionRoom } from './dungeon-room'
import type { PuzzleSelection } from 'cc-blitzkrieg/types/puzzle-selection'

export const exitMarker: string = 'puzzleExit'
export const entarenceMarker: string = 'battleEntarence'

export class PuzzleMapBuilder extends MapBuilder {
    static closedTunnelSize = new MapPoint(5, 4)
    static openTunnelSize = new MapPoint(5, 8)

    exitCount: number = 1
    entarenceRoom: Room
    exitRoom: PuzzleRoom
    
    puzzleRoom: PuzzleRoom

    prepareCheck: boolean = true
     
    constructor(
        public areaInfo: AreaInfo,
        puzzleSel: PuzzleSelection,
        puzzleMap: sc.MapModel.Map,
        closedTunnel: boolean,
        entarenceCondition: string,
    ) {
        super(3, areaInfo, RoomTheme.getFromArea(puzzleMap.attributes.area))
        this.puzzleRoom = new PuzzleRoom(puzzleSel, puzzleMap, entarenceCondition)
        this.puzzleRoom.setEntarenceTunnel(closedTunnel, closedTunnel ? PuzzleMapBuilder.closedTunnelSize : PuzzleMapBuilder.openTunnelSize)
        this.puzzleRoom.pushAllRooms(this.rooms)

        this.entarenceRoom = this.puzzleRoom
        this.exitRoom = this.puzzleRoom
    }

    prepareToArrange(dir: Dir, isEnd: boolean): boolean {
        if (this.prepareCheck && this.puzzleRoom.puzzle.start.dir != DirUtil.flip(dir)) { return false }

        this.mapIOs = this.mapIOs.filter(obj => ! obj.toDelete)
        this.exitRoom.pushExit(isEnd)
        this.mapIOs.push({ io: this.puzzleRoom.primaryExit, room: this.puzzleRoom, toDelete: true })
        this.prepareCheck && this.setOnWallPositions()
        return true
    }


    async decideDisplayName(index: number): Promise<string> {
        const selMapDisplayName: string = await getMapDisplayName(this.puzzleRoom.puzzle.map)
        this.displayName = `${index.toString()} => ${this.puzzleRoom.puzzle.map.name} ${selMapDisplayName}`
        return this.displayName
    }
}

export class BattlePuzzleMapBuilder extends PuzzleMapBuilder {
    exitCount: number = 1
    battleRoom: BattleRoom

    entarenceRoom: BattleRoom
    exitRoom: PuzzleRoom

    constructor(
        public areaInfo: AreaInfo,
        puzzleSel: PuzzleSelection,
        puzzleMap: sc.MapModel.Map,
    ) {
        const battleStartCondition: string = 'tmp.battle1'
        const battleDoneCondition: string = 'map.battle1done'
        const puzzleEntarenceCondition: string = battleStartCondition + ' && !' + battleDoneCondition

        super(areaInfo, puzzleSel, puzzleMap, false, puzzleEntarenceCondition)
        this.exitRoom = this.puzzleRoom

        const battleSize: MapPoint = new MapPoint(15, 15)
        assertBool(this.puzzleRoom.primaryEntarence instanceof RoomIOTunnelOpen)
        const battlePos: MapPoint = this.puzzleRoom.primaryEntarence.tunnel.getRoomPosThatConnectsToTheMiddle(battleSize)

        this.battleRoom = this.entarenceRoom = new BattleRoom(battlePos, battleSize, battleStartCondition, battleDoneCondition, this.puzzleRoom.primaryEntarence)
    }

    prepareToArrange(dir: Dir, isEnd: boolean): boolean {
        assertBool(this.puzzleRoom.primaryEntarence instanceof RoomIOTunnelOpen)
        if (dir == this.puzzleRoom.primaryEntarence.tunnel.dir) { return false }

        this.prepareCheck = false
        super.prepareToArrange(dir, isEnd)

        /* make sure the tunnel isn't duplicated */
        const primEnt = this.battleRoom.primaryEntarence
        if (primEnt) {
            assertBool(primEnt instanceof RoomIOTunnelClosed)
            this.battleRoom.ios.splice(this.battleRoom.ios.indexOf(this.battleRoom.primaryEntarence))
            this.rooms.splice(this.rooms.indexOf(primEnt.tunnel))
            this.rooms.splice(this.rooms.indexOf(this.battleRoom))
        }

        const tunnelSize: MapPoint = new MapPoint(5, 4)
        this.battleRoom.primaryEntarence = Object.assign(new RoomIOTunnelClosed(this.battleRoom, DirUtil.flip(dir), tunnelSize,
            this.battleRoom.middlePoint(MapPoint).to(EntityPoint), true), { toDelete: true })
        this.battleRoom.ios.push(this.battleRoom.primaryEntarence)
        this.battleRoom.pushAllRooms(this.rooms)
        this.setOnWallPositions()
        return true
    }
}

export class DungeonIntersectionMapBuilder extends MapBuilder {
    exitCount: number = 3
    simpleRoom: DungeonIntersectionRoom

    entarenceRoom: DungeonIntersectionRoom

    constructor(areaInfo: AreaInfo, keyCount: number, public entDir: Dir, aDir1: Dir, aDir2: Dir, keyDir: Dir) {
        super(3, areaInfo, RoomTheme.default)
        this.entarenceRoom = this.simpleRoom =
            new DungeonIntersectionRoom(new MapPoint(0, 0), new MapPoint(20, 20), keyCount, entDir, aDir1, aDir2, keyDir)
        this.simpleRoom.pushAllRooms(this.rooms)
        this.simpleRoom.exits.forEach(io => this.mapIOs.push({ io, room: this.simpleRoom }))
        this.setOnWallPositions()
    }

    prepareToArrange(dir: Dir, isEnd: boolean): boolean {
        if (this.entDir != DirUtil.flip(dir)) { return false }
        assertBool(isEnd)
        return true
    }

    async decideDisplayName(index: number): Promise<string> {
        return this.displayName = `DungeonIntersectionMapBuilder ${index}`
    }

    preplace(arm: ArmRuntime): void {
        if (arm.parentArm) {
            const io: RoomIOTpr = this.simpleRoom.addTeleportField(this.simpleRoom.primaryEntarence, this.simpleRoom.teleportFields!.length)
            this.simpleRoom.ios.push(io)
            this.mapIOs.push({ io, room: this.simpleRoom })
        }
        super.preplace(arm)
    }
}
