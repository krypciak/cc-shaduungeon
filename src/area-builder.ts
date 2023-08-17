import { Stamp, Blitzkrieg, allLangs, doRectsOverlapGrid, doRectsOverlap, Dir, DirUtil,
    MapRect, MapPoint, EntityPoint, EntityRect, AreaRect, AreaPoint, assert } from './util.js'
import { DungeonMapBuilder } from './dungeon-room.js'
import DngGen from './plugin.js'
import { DungeonBuilder } from './dungeon-builder.js'
import { MapDoor } from './entity-spawn.js'
import { Room } from './room-builder.js'

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

export class AreaBuilder {
    initialSize: AreaPoint = new AreaPoint(600, 600)

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


    constructor(public areaInfo: AreaInfo) { }

    beginBuild() {
        this.size = ig.copy(this.initialSize)
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

    async placeStartingMap(): Promise<Dir> {
        this.mapIndex++
        const path: string = DungeonBuilder.initialMap.path
        this.addMapToList(path, 'Start')
        
        const map: sc.MapModel.Map = await blitzkrieg.util.getMapObject(path)

        let doorEntity: MapDoor | undefined
        for (const entity of map.entities) {
            if (entity.type == 'Door') {
                doorEntity = entity as MapDoor
                break
            }
        }
        assert(doorEntity)

        const { nextPath, nextMarker } = this.getNextPrevRoomNames()
        doorEntity.settings.map = nextPath
        doorEntity.settings.marker = nextMarker
        doorEntity.settings.name = DungeonBuilder.initialMap.exitMarker
        const dir: Dir = DirUtil.flip(DirUtil.convertToDir(doorEntity.settings.dir!))

        const doorPoint: AreaPoint = EntityPoint.fromVec(doorEntity).to(AreaPoint)
        const offset: AreaPoint = new AreaPoint(this.lastExit.x - doorPoint.x, this.lastExit.y - doorPoint.y)
        Vec2.add(doorPoint, offset)

        const rects: AreaRect[] = [ AreaRect.fromTwoPoints(offset, new MapPoint(map.mapWidth, map.mapHeight).to(AreaPoint)) ]
        this.placeMapTiles(rects)

        this.lastExit = this.findClosestFreeTile(doorPoint, dir)

        if (! dnggen.debug.dontDiscoverAllMaps) { ig.vars.storage.maps[path] = {} }

        return DirUtil.flip(dir)
    }

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

    roomToAreaRect(room: Room, offset: AreaPoint, overlapRect?: AreaRect): AreaRect {
        const rect: MapRect = room.floorRect
        if (! overlapRect) {
            return new AreaRect(
                Math.floor(rect.x / AreaRect.div + offset.x),
                Math.floor(rect.y / AreaRect.div + offset.y),
                Math.ceil(rect.width / AreaRect.div),
                Math.ceil(rect.height / AreaRect.div))
        } else {
            assert(room.door)
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
                    DirUtil.moveInDirection(newRect, room.door.dir)
                } else {
                    return newRect
                }
            }
            throw new Error('what')
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

    async tryArrangeMap(mapBuilder: DungeonMapBuilder): Promise<boolean> {
        assert(mapBuilder.puzzle.room.room);   assert(mapBuilder.puzzle.room.room.door)
        assert(mapBuilder.puzzle.tunnel.room); assert(mapBuilder.battle.room.room)
        assert(mapBuilder.battle.tunnel.room); assert(mapBuilder.battle.tunnel.room.door)

        const ent: AreaPoint = mapBuilder.battle.tunnel.room.door.pos.to(AreaPoint)
        const exit: AreaPoint = mapBuilder.puzzle.room.room.door.pos.to(AreaPoint)

        const offset: AreaPoint = new AreaPoint(this.lastExit.x - ent.x, this.lastExit.y - ent.y)
        
        exit.x += offset.x
        exit.y += offset.y

        const rects: AreaRect[] = []

        rects.push(this.roomToAreaRect(mapBuilder.puzzle.room.room, offset))
        rects.push(this.roomToAreaRect(mapBuilder.puzzle.tunnel.room, offset))
        const battleAreaRect: AreaRect = this.roomToAreaRect(mapBuilder.battle.room.room, offset)
        rects.push(battleAreaRect)
        rects.push(this.roomToAreaRect(mapBuilder.battle.tunnel.room, offset, battleAreaRect))

        for (const room of mapBuilder.rooms) {
            rects.push(this.roomToAreaRect(room, offset))
        }

        if (dnggen.debug.collisionlessMapArrange && doRectsOverlapGrid(this.tiles, rects)) {
            return false
        }
        this.lastExit = await this.placeMap(mapBuilder, offset.to(EntityPoint), rects, exit, mapBuilder.puzzle.room.room.door.dir)
        return true
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
            DirUtil.moveInDirection(newPos, dir)
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

        await mapBuilder.finalize()

        if (! dnggen.debug.disableDebugStamps) { this.addStamps(mapBuilder, offset) }

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

    addStamps(mapBuilder: DungeonMapBuilder, offset: EntityPoint) {
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
    }

    saveToFile() {
        assert(this.builtArea, 'called saveToFile() before finalizing build') 
        require('fs').writeFileSync(dnggen.dir + 'assets/data/areas/' + this.areaInfo.name + '.json', JSON.stringify(this.builtArea))
    }
}
