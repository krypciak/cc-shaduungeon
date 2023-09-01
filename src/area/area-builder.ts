import { AreaPoint, AreaRect, Dir, MapPoint, MapRect, PosDir, Rect, doRectsOverlap, doesRectArrayOverlapRectArray } from '../util/pos'
import { Stamp } from '../util/map'
import { Stack, allLangs, assert } from '../util/misc'
import { Blitzkrieg } from '../util/blitzkrieg'
import DngGen from '../plugin'
import { Room } from '../room/room'
import { MapBuilder } from '../room/map-builder'

declare const blitzkrieg: Blitzkrieg
declare const dnggen: DngGen

export class AreaInfo {
    constructor(
        public name: string,
        public displayName: string,
        public displayDesc: string,
        public type: 'PATH' | 'TOWN' | 'DUNGEON',
        public pos: Vec2) {}
}


export namespace IndexedBuilder {
    export function create(builder: MapBuilder, index: number): IndexedBuilder {
        const b = builder as IndexedBuilder
        b.index = index
        return b
    }
}
export type IndexedBuilder = MapBuilder & { index: number }
export interface ABStackEntry {
    builder?: IndexedBuilder
    exit: AreaPoint
    exitDir: Dir
    level: number
    rects: AreaRect[]
    rooms: Room[]
}

export class AreaBuilder {
    static roomToAreaRect(room: Room, offset: AreaPoint, overlapRect?: AreaRect): AreaRect {
        const rect: MapRect = room
        if (! overlapRect) {
            return new AreaRect(
                rect.x / AreaRect.div + offset.x,
                rect.y / AreaRect.div + offset.y,
                rect.width / AreaRect.div,
                rect.height / AreaRect.div)
        } else {
            // assert(room.door)
            const mul = 4
            const newRect: AreaRect = new MapRect(
                rect.x,
                rect.y,
                Math.ceil(rect.width/mul)*mul,
                Math.ceil(rect.height/mul)*mul,
            ).to(AreaRect)
            Vec2.add(newRect, offset)

            for (let i = 0; i < 3; i++) {
                if (doRectsOverlap(newRect, overlapRect)) {
                    // Point.moveInDirection(newRect, room.door.dir)
                } else {
                    return newRect
                }
            }
            throw new Error('what')
        }
    }

    static tryGetAreaRects(builder: MapBuilder, lastExit: AreaPoint, stackEntries: ABStackEntry[]):
        { exit: AreaPoint, rects: AreaRect[], rooms: Room[] } | undefined {

        assert(builder.entarenceRoom);
        assert(builder.exitRoom); assert(builder.exitRoom.primaryExit)
        
        let entPosDir: PosDir<MapPoint> | null = builder.entarenceOnWall
        const exitPosDir: PosDir<MapPoint> | null = builder.exitOnWall

        if (entPosDir == null) {
            entPosDir = { dir: Dir.SOUTH, pos: new MapPoint(0, 0) }
        }
        if (exitPosDir == null) {
            throw new Error('dead end not supported')
        }

        const exit: AreaPoint = exitPosDir.pos.to(AreaPoint)
        const ent: AreaPoint = entPosDir.pos.to(AreaPoint)

        const offset: AreaPoint = new AreaPoint(lastExit.x - ent.x, lastExit.y - ent.y)
        
        exit.x += offset.x
        exit.y += offset.y

        const rects: AreaRect[] = []
        
        builder.rooms.forEach(r => {
            rects.push(AreaBuilder.roomToAreaRect(r, offset))
        })
        /*
        const exitRect = this.roomToAreaRect(builder.puzzle.room.room, offset)
        rects.push(exitRect)
        rects.push(this.roomToAreaRect(builder.puzzle.tunnel.room, offset))
        const battleAreaRect: AreaRect = this.roomToAreaRect(builder.battle.room.room, offset)
        rects.push(battleAreaRect)
        rects.push(this.roomToAreaRect(builder.battle.tunnel.room, offset, battleAreaRect))
        */

        if (dnggen.debug.collisionlessMapArrange) {
            for (let i = stackEntries.length - 1; i >= 0; i--) {
                const e = stackEntries[i]
                if (doesRectArrayOverlapRectArray(e.rects, rects)) {
                    return
                }
            }
        }

        return {
            rects,
            exit,
            rooms: builder.rooms,
        }
    }

    builtArea?: sc.AreaLoadable.Data

    mapConnectionSize: number = 1

    static trimBuilderStack(arr: ABStackEntry[], additionalSpace: number = 2): { offset: AreaPoint; size: AreaPoint } {
        const obj = Rect.getMinMaxPosFromRectArr(arr.flatMap(e => e.rects))
        const minPos: AreaPoint = obj.min as AreaPoint
        const maxPos: AreaPoint = obj.max as AreaPoint

        Vec2.subC(minPos, additionalSpace)
        const newSize: AreaPoint = maxPos.copy()
        Vec2.sub(newSize, minPos)
        Vec2.addC(newSize, additionalSpace)

        for (const entry of arr) {
            for (const rect of entry.rects) {
                Vec2.sub(rect, minPos)
            }
            Vec2.sub(entry.exit, minPos)
        }
        return { offset: minPos, size: newSize }
    }

    constructor(
        public areaInfo: AreaInfo, 
        public stack: Stack<ABStackEntry>,
        size: AreaPoint,
    ) {
        size = new AreaPoint(Math.ceil(size.x), Math.ceil(size.y))
        const chestCount = 0

        const scale = 1 / AreaRect.multiplier

        const builtArea: sc.AreaLoadable.Data = {
            DOCTYPE: 'AREAS_MAP',
            name: allLangs(this.areaInfo.name),
            width: size.x,
            height: size.y,
            chests: chestCount,
            defaultFloor: 0,
            floors: [
                this.generateFloor(0, 'G', size, stack.array),
            ],
            type: 'roomList',
        }
        this.builtArea = builtArea
    }

    generateFloor(level: number, name: string, size: AreaPoint, entries: ABStackEntry[]): sc.AreaLoadable.Floor {
        entries = entries.filter(e => e.level == level)
        const connections: sc.AreaLoadable.Connection[] = []
        const landmarks: sc.AreaLoadable.Landmark[] = []
        const stamps: Stamp[] = []

        const maps: sc.AreaLoadable.MapRoomList[] = []
        const mapType: 'DUNGEON' | 'NO_DUNGEON' = this.areaInfo.type == 'DUNGEON' ? 'DUNGEON' : 'NO_DUNGEON'

        let mapIndex = 0
        function addMap(path: string, displayName: string, rects: AreaRect[]) {
            const { min, max } = Rect.getMinMaxPosFromRectArr(rects)
            maps.push({
                path: path.split('/').join('.'),
                name: allLangs(displayName),
                dungeon: mapType,
                offset: { x: 0, y: 0 },
                rects,
                id: mapIndex,
                min: min,
                max: max,
            })
        }
        
        for (const entry of entries) {
            const path = 'rouge.gen.' + mapIndex
            const displayName = 'n' + mapIndex
            addMap(path, displayName, entry.rects)
            mapIndex++
        }

        return {
            level,
            name: allLangs(name),
            icons: [],
            tiles: [],
            type: 'roomList',
            size,
            maps,
            connections,
            landmarks,
        }
    }

    addToDatabase() {
        const dbEntry: sc.MapModel.Area = {
            path: '',
            boosterItem: '1000000',
            landmarks: {},
            name: allLangs(this.areaInfo.displayName),
            description: allLangs(this.areaInfo.displayDesc),
            areaType: this.areaInfo.type,
            order: 1001,
            track: true,
            chests: 0,
            position: this.areaInfo.pos,
        }
        
        ig.database.data.areas[this.areaInfo.name] = dbEntry
    }

    saveToFile() {
        assert(this.builtArea, 'called saveToFile() before finalizing build') 
        require('fs').writeFileSync(dnggen.dir + 'assets/data/areas/' + this.areaInfo.name + '.json', JSON.stringify(this.builtArea))
    }


    /*
    addMapConnection(pos: AreaPoint, dir: Dir, i1: number, i2: number) {
            const connection: sc.AreaLoadable.Connection = {
                tx: pos.x,
                ty: pos.y,
                dir: (DirUtil.isVertical(dir)) ? 'VERTICAL' : 'HORIZONTAL',
                size: this.mapConnectionSize,
                map1: i1,
                map2: i2,
            }
            this.connections.push(connection)
    }
    getNextPrevRoomNames(): { prevPath: string; prevMarker: string; nextPath: string; nextMarker: string } {
        let prevPath, prevMarker, nextPath, nextMarker

        if (this.genIndex == 0) {
            prevPath = DungeonBuilder.initialMap.path
            prevMarker = DungeonBuilder.initialMap.exitMarker
        } else if (this.genIndex == -1) {
            prevPath = ''
            prevMarker = ''
        } else {
            const obj = DungeonMapBuilder.getGenRoomNames(this.genIndex - 1)
            prevPath = obj.path
            prevMarker = DungeonMapBuilder.roomExitMarker
        }
        {
            const obj = DungeonMapBuilder.getGenRoomNames(this.genIndex + 1)
            nextPath = obj.path
            nextMarker = DungeonMapBuilder.roomEntarenceMarker
        }
        return { prevPath, prevMarker, nextPath, nextMarker }
    }

    addStamps(mapBuilder: DungeonMapBuilder, offset: EntityPoint, exitPoint: AreaPoint) {
        const area: string = mapBuilder.areaInfo.name
        const puzzle = mapBuilder.puzzle
        const battle = mapBuilder.battle

        assert(puzzle.room.room);        assert(puzzle.room.room.door); assert(battle.tunnel.room)
        assert(battle.tunnel.room.door); assert(puzzle.start);          assert(puzzle.end)

        const level = 0
        function applyOffset(pos: Vec2): Vec2 {
            return { x: Math.floor(pos.x + offset.x), y: Math.floor(pos.y + offset.y) }
        }

        // puzzle exit door
        this.stamps.push(Stamp.new(area, applyOffset(puzzle.room.room.door.pos), level, puzzle.room.room.door.dir))
        // battle entrance door
        this.stamps.push(Stamp.new(area, applyOffset(battle.tunnel.room.door.pos), level, DirUtil.flip(battle.tunnel.room.door.dir)))
        
        // puzzle start
        this.stamps.push(Stamp.new(area, applyOffset(puzzle.start.pos), level, 'GREEN'))

        // puzzle end
        this.stamps.push(Stamp.new(area, applyOffset(puzzle.end.pos), level, 'ENEMY'))


        const lastExitPos: EntityPoint = exitPoint.copy().to(EntityPoint)
        this.stamps.push(Stamp.new(area, lastExitPos, level, 'XXX'))
    }
    */
}
