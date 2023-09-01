import { AreaPoint, AreaRect, Dir, MapPoint, MapRect, PosDir, doRectsOverlap, doesRectArrayOverlapRectArray } from './util/pos'
import { Stamp } from './util/map'
import { Stack, assert } from './util/misc'
import { Blitzkrieg } from './util/blitzkrieg'
import DngGen from './plugin'
import { Room } from './room/room'
import { MapBuilder } from './room/map-builder'

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
            rects.push(this.roomToAreaRect(r, offset))
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
        // builder.exitRoom.setPosToSide(exit, exitPosDir.dir)
        // Point.moveInDirection(exit, exitPosDir.dir)

        return {
            rects,
            exit,
            rooms: builder.rooms,
        }
        //this.lastExit = await this.placeMap(builder, offset.to(EntityPoint), rects, exit, builder.puzzle.room.room.door.dir)
    }

    size!: AreaPoint
    chestCount!: number
    connections!: sc.AreaLoadable.Connection[]
    landmarks!: sc.AreaLoadable.Landmark[]
    maps!: sc.AreaLoadable.Map[]
    tiles!: number[][]

    mapIndex!: number
    genIndex!: number
    lastExit!: AreaPoint
    stamps!: Stamp[]

    builtArea?: sc.AreaLoadable.Data

    mapConnectionSize: number = 1

    static trimBuilderStack(arr: ABStackEntry[], additionalSpace: number = 2): { offset: AreaPoint; size: AreaPoint } {
        const minPos: AreaPoint = new AreaPoint(100000, 100000)
        const maxPos: AreaPoint = new AreaPoint(-100000, -100000)
        for (const entry of arr) {
            for (const rect of entry.rects) {
                if (rect.x < minPos.x) { minPos.x = rect.x }
                if (rect.y < minPos.y) { minPos.y = rect.y }
                if (rect.x2() > maxPos.x) { maxPos.x = rect.x2() }
                if (rect.y2() > maxPos.y) { maxPos.y = rect.y2() }
            }
        }
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
        public stack: Stack<ABStackEntry>
    ) {

    }


    build() {
        this.size = new AreaPoint(-1, -1)
        this.chestCount = 0
        this.connections = []
        this.landmarks = []
        this.stamps = []
        this.tiles = blitzkrieg.util.emptyArray2d(this.size.x, this.size.y)
        this.maps = []
        this.mapIndex = -1
        this.genIndex = -1
        this.lastExit = new AreaPoint(this.size.x/2, this.size.y/2)
    }

    /*
    addToDatabase() {
        const dbEntry: sc.MapModel.Area = {
            path: '',
            boosterItem: '1000000',
            landmarks: { idontexist: { name: allLangs('idontexit'), description: allLangs('idontexit') } },
            name: allLangs(this.areaInfo.displayName),
            description: allLangs(this.areaInfo.displayDesc),
            areaType: this.areaInfo.type,
            order: 1001,
            track: true,
            chests: 0,
            position: this.areaInfo.pos
        }
        
        ig.database.data.areas[this.areaInfo.name] = dbEntry
    }

    finalizeBuild() {
        this.trim()
        Stamp.addStampsToMenu(this.stamps)
        this.builtArea = {
            DOCTYPE: 'AREAS_MAP',
            name: allLangs(this.areaInfo.name),
            width: this.size.x,
            height: this.size.y,
            chests: this.chestCount,
            defaultFloor: 0,
            floors: [
                {
                    level: 0,
                    name: allLangs('G'),
                    tiles: this.tiles,
                    icons: [],
                    maps: this.maps, 
                    connections: this.connections,
                    landmarks: this.landmarks,
                }
            ]
        }
    }

    trim() {
        if (dnggen.debug.trimAreas) {
            const { x1, y1, x2, y2 } = blitzkrieg.util.getTrimArrayPos2d(this.tiles)
            const rect: AreaRect = AreaRect.fromxy2(x1, y1, x2, y2)

            this.tiles = this.tiles.slice(rect.y, rect.y2()).map(row => row.slice(rect.x, rect.x2()));

            this.size = new AreaPoint(this.tiles[0].length, this.tiles.length)

            for (const stamp of this.stamps) {
                stamp.pos.x -= rect.x*8
                stamp.pos.y -= rect.y*8
            }

            for (const connection of this.connections) {
                connection.tx -= rect.x
                connection.ty -= rect.y
            }
        }
    }

    placeMapTiles(rects: AreaRect[]) {
        for (const rect of rects) {
            for (let y = rect.y; y < rect.y2(); y++) {
                for (let x = rect.x; x < rect.x2(); x++) {
                    this.tiles[y][x] = this.mapIndex + 1
                }
            }
        }
    }

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

    addMapToList(path: string, displayName: string) {
        this.maps.push({
            path: path.split('/').join('.'),
            name: allLangs(displayName),
            dungeon: 'DUNGEON',
            offset: { x: 0, y: 0 }
        })
    }

    findClosestFreeTile(pos: AreaPoint, dir: Dir): AreaPoint {
        let xInc = 0, yInc = 0
        switch (dir) {
            case Dir.NORTH: yInc = -1; break
            case Dir.EAST: xInc = 1; break
            case Dir.SOUTH: yInc = 1; break
            case Dir.WEST: xInc = -1; break
        }
        const newPos: AreaPoint = pos.copy()
        for (let i = 0; i < 20; i++) {
            if (this.tiles[newPos.y][newPos.x] == 0) {
                return newPos
            }
            Point.moveInDirection(newPos, dir)
        }
        throw new Error('didint find free tile? how')
    }

    async placeMap(mapBuilder: DungeonMapBuilder, offset: EntityPoint, rects: AreaRect[], pos: AreaPoint, dir: Dir): Promise<AreaPoint> {
        assert(mapBuilder.puzzle.room.room); assert(mapBuilder.puzzle.room.room.door)
        assert(mapBuilder.battle.tunnel.room); assert(mapBuilder.battle.tunnel.room.door)
        assert(mapBuilder.battle.tunnel.room.index)

        this.mapIndex++
        this.genIndex++
        await mapBuilder.decideMapName(this.genIndex)
        assert(mapBuilder.displayName); assert(mapBuilder.path)

        this.addMapToList(mapBuilder.path, mapBuilder.displayName)

        const { prevPath, prevMarker, nextPath, nextMarker } = this.getNextPrevRoomNames()

        mapBuilder.obtainTheme()
        mapBuilder.createEmptyMap()
        assert(mapBuilder.rpv); 

        mapBuilder.battle.tunnel.room.placeDoor(mapBuilder.rpv, DungeonMapBuilder.roomEntarenceMarker, prevPath, prevMarker)
        mapBuilder.puzzle.room.room.placeDoor(mapBuilder.rpv, DungeonMapBuilder.roomExitMarker, nextPath, nextMarker)

        await mapBuilder.place()
        

        if (! dnggen.debug.dontDiscoverAllMaps) { ig.vars.storage.maps[mapBuilder.path] = {} }

        this.placeMapTiles(rects)

        if (dnggen.debug.areaMapConnections) {
            const dir: Dir = mapBuilder.battle.tunnel.room.door.dir
            const rect: AreaRect = rects[mapBuilder.battle.tunnel.room.index]
            const size = DirUtil.isVertical(dir) ? rect.width : rect.height
            const offset = (size - this.mapConnectionSize)/2
            let side: AreaPoint
            // this isnt the same as Rect.getSide for some reason? Rect.getSide doesnt work in this case
            switch (dir) {
                case Dir.NORTH: side = new AreaPoint(rect.x, rect.y); break
                case Dir.EAST: side = new AreaPoint(rect.x, rect.y); break
                case Dir.SOUTH: side = new AreaPoint(rect.x, rect.y); break
                case Dir.WEST: side = new AreaPoint(rect.x2(), rect.y); break
            }
            if (DirUtil.isVertical(dir)) {
                side.x += offset
            } else {
                side.y += offset
            }

            this.addMapConnection(side, dir, this.mapIndex, this.mapIndex - 1)
        }

        const exitPoint = this.findClosestFreeTile(pos, dir)

        if (! dnggen.debug.disableDebugStamps) { this.addStamps(mapBuilder, offset, exitPoint) }

        return exitPoint
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

    saveToFile() {
        assert(this.builtArea, 'called saveToFile() before finalizing build') 
        require('fs').writeFileSync(dnggen.dir + 'assets/data/areas/' + this.areaInfo.name + '.json', JSON.stringify(this.builtArea))
    }
    */
}
