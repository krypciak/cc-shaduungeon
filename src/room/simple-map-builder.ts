import { AreaInfo, IndexedBuilder } from "../area-builder"
import { MapBuilder } from "./map-builder"
import { SimpleDoubleTunnelRoom, SimpleOpenTunnelRoom, SimpleRoom, SimpleTunnelRoom } from "./simple-room"
import { Dir, DirUtil, EntityPoint, MapPoint, MapRect } from "../util/pos"
import { Room } from "./room"
import { assertBool } from "../util/misc"
import { RoomIOTunnelClosed } from "./tunnel-room"

export class SimpleRoomMapBuilder extends MapBuilder {
    simpleRoom: SimpleRoom

    entarenceRoom: SimpleRoom
    exitRoom: SimpleRoom

    constructor(areaInfo: AreaInfo, public entDir: Dir, public exitDir: Dir) {
        super(3, areaInfo)
        this.simpleRoom = new SimpleRoom(new MapPoint(0, 0), new MapPoint(32, 32), 0, entDir, exitDir)
        this.simpleRoom.pushAllRooms(this.rooms)
        this.entarenceRoom = this.simpleRoom
        this.exitRoom = this.simpleRoom
        this.setOnWallPositions()
    }

    prepareToArrange(dir: Dir): boolean {
        return this.entDir == DirUtil.flip(dir);
    }

    static addPreset(builders: MapBuilder[], areaInfo: AreaInfo) {
        builders.push(IndexedBuilder.create(new SimpleRoomMapBuilder(areaInfo, Dir.SOUTH, Dir.NORTH), builders.length))
        builders.push(IndexedBuilder.create(new SimpleRoomMapBuilder(areaInfo, Dir.SOUTH, Dir.EAST), builders.length))
        builders.push(IndexedBuilder.create(new SimpleRoomMapBuilder(areaInfo, Dir.WEST, Dir.EAST), builders.length))
    }

    static addRandom(builders: MapBuilder[], areaInfo: AreaInfo, num: number, creators: (new (areaInfo: AreaInfo, ent: Dir, exit: Dir) => MapBuilder)[] = [SimpleRoomMapBuilder]) {
        for (let i = 0; i < num; i++) {
            let ent = Math.floor(Math.random() * 4)
            const exit = Math.floor(Math.random() * 4)
            if (ent == exit) { ent++; if (ent >= 4) { ent = 0 } }

            let creator
            if (creators.length == 1) {
                creator = creators[0]
            } else {
                creator = creators[Math.floor(Math.random() * creators.length)]

            }
            builders.push(IndexedBuilder.create(new creator(areaInfo, ent, exit), builders.length))
        }
    }
}

export class SimpleSingleTunnelMapBuilder extends MapBuilder {
    simpleRoom: SimpleTunnelRoom

    entarenceRoom: SimpleTunnelRoom
    exitRoom: SimpleTunnelRoom

    constructor(areaInfo: AreaInfo, public entDir: Dir, public exitDir: Dir) {
        super(3, areaInfo)
        this.simpleRoom = new SimpleTunnelRoom(new MapPoint(0, 0), new MapPoint(32, 32), 0, entDir, exitDir)
        this.simpleRoom.pushAllRooms(this.rooms)
        this.entarenceRoom = this.simpleRoom
        this.exitRoom = this.simpleRoom
        this.setOnWallPositions()
    }

    prepareToArrange(dir: Dir): boolean {
        return this.entDir == DirUtil.flip(dir);
    }

    static addPreset(builders: MapBuilder[], areaInfo: AreaInfo) {
        builders.push(IndexedBuilder.create(new SimpleSingleTunnelMapBuilder(areaInfo, Dir.SOUTH, Dir.NORTH), builders.length))
        builders.push(IndexedBuilder.create(new SimpleSingleTunnelMapBuilder(areaInfo, Dir.SOUTH, Dir.EAST), builders.length))
        builders.push(IndexedBuilder.create(new SimpleSingleTunnelMapBuilder(areaInfo, Dir.WEST, Dir.EAST), builders.length))
    }
}

export class SimpleDoubleTunnelMapBuilder extends MapBuilder {
    simpleRoom: SimpleDoubleTunnelRoom

    entarenceRoom: SimpleDoubleTunnelRoom
    exitRoom: SimpleDoubleTunnelRoom

    constructor(areaInfo: AreaInfo, public entDir: Dir, public exitDir: Dir) {
        super(3, areaInfo)
        this.simpleRoom = new SimpleDoubleTunnelRoom(new MapPoint(0, 0), new MapPoint(32, 32), 0, entDir, exitDir)
        this.simpleRoom.pushAllRooms(this.rooms)
        this.entarenceRoom = this.simpleRoom
        this.exitRoom = this.simpleRoom
        this.setOnWallPositions()
    }

    prepareToArrange(dir: Dir): boolean {
        return this.entDir == DirUtil.flip(dir);
    }
}

export class SimpleDoubleRoomMapBuilder extends MapBuilder {
    exitRoom: SimpleOpenTunnelRoom
    entarenceRoom: Room

    constructor(areaInfo: AreaInfo, public entDir: Dir, public exitDir: Dir) {
        super(3, areaInfo)
        this.exitRoom = new SimpleOpenTunnelRoom(new MapPoint(0, 0), new MapPoint(32, 32), 0, entDir, exitDir)

        const entarenceRoomSize: MapPoint = new MapPoint(22.5, 22.5)
        const pos: MapPoint = this.exitRoom.primaryEntarence.tunnel.getRoomPosThatConnectsToTheMiddle(entarenceRoomSize)
        this.entarenceRoom = new Room('simple', MapRect.fromTwoPoints(pos, entarenceRoomSize), [true, true, true, true], 0, true)
        this.exitRoom.pushAllRooms(this.rooms)
    }

    prepareToArrange(dir: Dir): boolean {
        if (dir == this.entDir) { return false }
        const primEnt = this.entarenceRoom.primaryEntarence
        if (primEnt) {
            assertBool(primEnt instanceof RoomIOTunnelClosed)
            this.rooms.splice(this.rooms.indexOf(primEnt.tunnel))
            this.entarenceRoom.ios.splice(this.entarenceRoom.ios.indexOf(this.entarenceRoom.primaryEntarence))
        }
        const entTunnelSize: MapPoint = new MapPoint(8, 16)
        this.entarenceRoom.primaryEntarence = new RoomIOTunnelClosed(this.entarenceRoom, DirUtil.flip(dir), entTunnelSize,
            this.entarenceRoom.floorRect.middlePoint(MapPoint).to(EntityPoint), true)
        this.entarenceRoom.ios.push(this.entarenceRoom.primaryEntarence)

        this.entarenceRoom.pushAllRooms(this.rooms)
        this.setOnWallPositions()
        return true
    }

    static addPreset(builders: MapBuilder[], areaInfo: AreaInfo) {
        builders.push(IndexedBuilder.create(new SimpleDoubleRoomMapBuilder(areaInfo, Dir.SOUTH, Dir.NORTH), builders.length))
        builders.push(IndexedBuilder.create(new SimpleDoubleRoomMapBuilder(areaInfo, Dir.EAST, Dir.WEST), builders.length))
        builders.push(IndexedBuilder.create(new SimpleDoubleRoomMapBuilder(areaInfo, Dir.EAST, Dir.SOUTH), builders.length))
        builders.push(IndexedBuilder.create(new SimpleDoubleRoomMapBuilder(areaInfo, Dir.NORTH, Dir.WEST), builders.length))
    }
}
