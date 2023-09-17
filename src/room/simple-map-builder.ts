import { AreaInfo } from "@root/area/area-builder"
import { MapBuilder } from "@root/room/map-builder"
import { SimpleDoubleExitRoom, SimpleDoubleTunnelRoom, SimpleOpenTunnelRoom, SimpleRoom, SimpleTunnelRoom } from "@root/room/simple-room"
import { Dir, DirUtil, EntityPoint, MapPoint, MapRect } from "@root/util/pos"
import { Room } from "@root/room/room"
import { assertBool } from "@root/util/misc"
import { RoomIOTunnelClosed } from "@root/room/tunnel-room"
import { RoomTheme } from "@root/room/themes"

export class SimpleRoomMapBuilder extends MapBuilder {
    simpleRoom: SimpleRoom

    entarenceRoom: SimpleRoom
    exitRoom: SimpleRoom

    constructor(areaInfo: AreaInfo, public entDir: Dir, public exitDir: Dir) {
        super(3, areaInfo, RoomTheme.default)
        this.simpleRoom = this.entarenceRoom = this.exitRoom =
            new SimpleRoom(new MapPoint(0, 0), new MapPoint(16, 16), entDir, exitDir)
        this.simpleRoom.pushAllRooms(this.rooms)
        this.mapIOs.push({ io: this.exitRoom.primaryExit, room: this.exitRoom })
        this.setOnWallPositions()
    }

    prepareToArrange(dir: Dir): boolean {
        return this.entDir == DirUtil.flip(dir);
    }

    async decideDisplayName(index: number): Promise<string> {
        this.displayName = `SimpleRoomMapBuilder ${index}`
        return this.displayName
    }

    static addPreset(builders: MapBuilder[], areaInfo: AreaInfo) {
        builders.push(new SimpleRoomMapBuilder(areaInfo, Dir.SOUTH, Dir.NORTH))
        builders.push(new SimpleRoomMapBuilder(areaInfo, Dir.SOUTH, Dir.EAST))
        builders.push(new SimpleRoomMapBuilder(areaInfo, Dir.WEST, Dir.EAST))
    }

    static addRandom(builders: MapBuilder[], areaInfo: AreaInfo, num: number, creators: (new (areaInfo: AreaInfo, ent: Dir, exit: Dir) => MapBuilder)[] = [SimpleRoomMapBuilder]) {
        for (let i = 0; i < num; i++) {
            let ent = Math.floor(Math.randomSeed() * 4)
            const exit = Math.floor(Math.randomSeed() * 4)
            if (ent == exit) { ent++; if (ent >= 4) { ent = 0 } }

            let creator
            if (creators.length == 1) {
                creator = creators[0]
            } else {
                creator = creators[Math.floor(Math.randomSeed() * creators.length)]
            }
            builders.push(new creator(areaInfo, ent, exit))
        }
    }
}

export class SimpleSingleTunnelMapBuilder extends MapBuilder {
    simpleRoom: SimpleTunnelRoom

    entarenceRoom: SimpleTunnelRoom
    exitRoom: SimpleTunnelRoom

    constructor(areaInfo: AreaInfo, public entDir: Dir, public exitDir: Dir) {
        super(3, areaInfo, RoomTheme.default)
        this.simpleRoom = this.entarenceRoom = this.exitRoom =
            new SimpleTunnelRoom(new MapPoint(0, 0), new MapPoint(16, 16), entDir, exitDir)
        this.simpleRoom.pushAllRooms(this.rooms)
        this.mapIOs.push({ io: this.exitRoom.primaryExit, room: this.exitRoom })
        this.setOnWallPositions()
    }

    prepareToArrange(dir: Dir): boolean {
        return this.entDir == DirUtil.flip(dir);
    }

    async decideDisplayName(index: number): Promise<string> {
        this.displayName = `SimpleSingleTunnelMapBuilder ${index}`
        return this.displayName
    }

    static addPreset(builders: MapBuilder[], areaInfo: AreaInfo) {
        builders.push(new SimpleSingleTunnelMapBuilder(areaInfo, Dir.SOUTH, Dir.NORTH))
        builders.push(new SimpleSingleTunnelMapBuilder(areaInfo, Dir.SOUTH, Dir.EAST))
        builders.push(new SimpleSingleTunnelMapBuilder(areaInfo, Dir.WEST, Dir.EAST))
    }
}

export class SimpleDoubleTunnelMapBuilder extends MapBuilder {
    simpleRoom: SimpleDoubleTunnelRoom

    entarenceRoom: SimpleDoubleTunnelRoom
    exitRoom: SimpleDoubleTunnelRoom

    constructor(areaInfo: AreaInfo, public entDir: Dir, public exitDir: Dir) {
        super(3, areaInfo, RoomTheme.default)
        this.simpleRoom = this.entarenceRoom = this.exitRoom =
            new SimpleDoubleTunnelRoom(new MapPoint(0, 0), new MapPoint(16, 16), entDir, exitDir)
        this.simpleRoom.pushAllRooms(this.rooms)
        this.mapIOs.push({ io: this.exitRoom.primaryExit, room: this.exitRoom })
        this.setOnWallPositions()
    }

    prepareToArrange(dir: Dir): boolean {
        return this.entDir == DirUtil.flip(dir);
    }

    async decideDisplayName(index: number): Promise<string> {
        this.displayName = `SimpleDoubleTunnelMapBuilder ${index}`
        return this.displayName
    }
}

export class SimpleDoubleRoomMapBuilder extends MapBuilder {
    exitRoom: SimpleOpenTunnelRoom
    entarenceRoom: Room

    constructor(areaInfo: AreaInfo, public entDir: Dir, public exitDir: Dir) {
        super(3, areaInfo, RoomTheme.default)
        this.exitRoom = new SimpleOpenTunnelRoom(new MapPoint(0, 0), new MapPoint(16, 16), entDir, exitDir)

        const entarenceRoomSize: MapPoint = new MapPoint(12, 12)
        const pos: MapPoint = this.exitRoom.primaryEntarence.tunnel.getRoomPosThatConnectsToTheMiddle(entarenceRoomSize)
        this.entarenceRoom = new Room('simple', MapRect.fromTwoPoints(pos, entarenceRoomSize), [true, true, true, true], true)
        this.exitRoom.pushAllRooms(this.rooms)
        this.mapIOs.push({ io: this.exitRoom.primaryExit, room: this.exitRoom })
    }

    prepareToArrange(dir: Dir): boolean {
        if (dir == this.entDir) { return false }
        const primEnt = this.entarenceRoom.primaryEntarence
        if (primEnt) {
            assertBool(primEnt instanceof RoomIOTunnelClosed)
            this.entarenceRoom.ios.splice(this.entarenceRoom.ios.indexOf(this.entarenceRoom.primaryEntarence))
            this.rooms.splice(this.rooms.indexOf(primEnt.tunnel))
            this.rooms.splice(this.rooms.indexOf(this.entarenceRoom))
        }
        const entTunnelSize: MapPoint = new MapPoint(4, 8)
        this.entarenceRoom.primaryEntarence = new RoomIOTunnelClosed(this.entarenceRoom, DirUtil.flip(dir), entTunnelSize,
            this.entarenceRoom.middlePoint(MapPoint).to(EntityPoint), true)
        this.entarenceRoom.ios.push(this.entarenceRoom.primaryEntarence)

        this.entarenceRoom.pushAllRooms(this.rooms)
        this.setOnWallPositions()
        return true
    }

    async decideDisplayName(index: number): Promise<string> {
        this.displayName = `SimpleDoubleRoomMapBuilder ${index}`
        return this.displayName
    }

    static addPreset(builders: MapBuilder[], areaInfo: AreaInfo) {
        builders.push(new SimpleDoubleRoomMapBuilder(areaInfo, Dir.SOUTH, Dir.NORTH))
        builders.push(new SimpleDoubleRoomMapBuilder(areaInfo, Dir.NORTH, Dir.SOUTH))
        builders.push(new SimpleDoubleRoomMapBuilder(areaInfo, Dir.EAST, Dir.WEST))
        builders.push(new SimpleDoubleRoomMapBuilder(areaInfo, Dir.EAST, Dir.SOUTH))
        builders.push(new SimpleDoubleRoomMapBuilder(areaInfo, Dir.NORTH, Dir.WEST))
    }
}

export class SimpleDoubleExitMapBuilder extends MapBuilder {
    simpleRoom: SimpleDoubleExitRoom

    entarenceRoom: SimpleDoubleExitRoom
    exitRoom: SimpleDoubleExitRoom

    constructor(areaInfo: AreaInfo, public entDir: Dir, public exitDir1: Dir, public exitDir2: Dir) {
        super(3, areaInfo, RoomTheme.default)
        this.entarenceRoom = this.exitRoom = this.simpleRoom =
            new SimpleDoubleExitRoom(new MapPoint(0, 0), new MapPoint(24, 24), entDir, exitDir1, exitDir2)
        this.simpleRoom.pushAllRooms(this.rooms)
        this.mapIOs.push(
            { io: this.simpleRoom.exit1, room: this.simpleRoom },
            { io: this.simpleRoom.exit2, room: this.simpleRoom },
        )
        this.setOnWallPositions()
    }

    prepareToArrange(dir: Dir): boolean {
        return this.entDir == DirUtil.flip(dir)
    }

    async decideDisplayName(index: number): Promise<string> {
        this.displayName = `SimpleDoubleExitMapBuilder ${index}`
        return this.displayName
    }
}
