import { AreaInfo, IndexedBuilder } from "../area-builder"
import { MapBuilder } from "./map-builder"
import { SimpleRoom, SimpleTunnelRoom } from "./simple-room"
import { Dir, DirUtil, MapPoint } from "../util/pos"
import { TunnelRoom } from "./tunnel-room"

export class SimpleMapBuilder extends MapBuilder {
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
        builders.push(IndexedBuilder.create(new SimpleMapBuilder(areaInfo, Dir.SOUTH, Dir.NORTH), builders.length))
        builders.push(IndexedBuilder.create(new SimpleMapBuilder(areaInfo, Dir.SOUTH, Dir.EAST), builders.length))
        builders.push(IndexedBuilder.create(new SimpleMapBuilder(areaInfo, Dir.WEST, Dir.EAST), builders.length))
    }

    static addRandom(builders: MapBuilder[], areaInfo: AreaInfo, num: number, creators: (new (areaInfo: AreaInfo, ent: Dir, exit: Dir) => MapBuilder)[] = [SimpleMapBuilder]) {
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
    simpleRoom: SimpleRoom

    entarenceRoom: SimpleRoom
    exitRoom: SimpleRoom

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

    static addRandom(builders: MapBuilder[], areaInfo: AreaInfo, num: number) {
        SimpleMapBuilder.addRandom(builders, areaInfo, num, [SimpleSingleTunnelMapBuilder])
    }
}
