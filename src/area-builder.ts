import { Stamp, Blitzkrieg, allLangs, doRectsOverlapArray, Dir, 
    MapRect, AreaRect, AreaPoint, assert } from './util.js'
import { DungeonMapBuilder } from './dungeon-room.js'
import DngGen from './plugin.js'
import { DungeonBuilder } from './dungeon-builder.js'

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
    lastExit!: AreaPoint
    stamps!: Stamp[]

    builtArea?: sc.AreaLoadable.Data


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
        this.lastExit = new AreaPoint(this.size.x/2, this.size.y/2)
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
        const { x1, y1, x2, y2 } = blitzkrieg.util.getTrimArrayPos2d(this.tiles)
        const rect: MapRect = MapRect.fromxy2(x1, y1, x2, y2)

        this.tiles = this.tiles.slice(rect.y, rect.y2).map(row => row.slice(rect.x, rect.x2));

        this.size = new AreaPoint(this.tiles[0].length, this.tiles.length)
        for (const stamp of this.stamps) {
            stamp.pos.x -= rect.x
            stamp.pos.y -= rect.y
        }
    }

    placeMapTiles(rects: AreaRect[]) {
        for (const rect of rects) {
            for (let y = rect.y; y < rect.y2; y++) {
                for (let x = rect.x; x < rect.x2; x++) {
                    this.tiles[y][x] = this.mapIndex + 1
                }
            }
        }
    }

    async tryArrangeMap(mapBuilder: DungeonMapBuilder): Promise<boolean> {
        assert(mapBuilder.puzzle.room.room); assert(mapBuilder.puzzle.room.room.door)
        assert(mapBuilder.battle.tunnel.room); assert(mapBuilder.battle.tunnel.room.door)

        const ent: AreaPoint = mapBuilder.puzzle.room.room.door.pos.to(AreaPoint)
        const exit: AreaPoint = mapBuilder.battle.tunnel.room.door.pos.to(AreaPoint)

        const offset: AreaPoint = new AreaPoint(this.lastExit.x - ent.x, this.lastExit.y - ent.y)
        
        exit.x += offset.x
        exit.y += offset.y

        const rects: AreaRect[] = []

        for (const room of mapBuilder.rooms) {
            rects.push(AreaRect.fromMapRect(room.floorRect, offset))
        }

        if (doRectsOverlapArray(this.tiles, rects)) {
            return false
        }
        this.mapIndex++
        await mapBuilder.decideMapName(this.mapIndex)
        this.lastExit = await this.placeMap(mapBuilder, offset, rects, exit, mapBuilder.battle.tunnel.room.door.dir)
        return true
    }

    async placeMap(mapBuilder: DungeonMapBuilder, offset: AreaPoint, rects: AreaRect[], pos: AreaPoint, dir: Dir): Promise<AreaPoint> {
        assert(mapBuilder.puzzle.room.room); assert(mapBuilder.puzzle.room.room.door)
        assert(mapBuilder.battle.tunnel.room); assert(mapBuilder.battle.tunnel.room.door)
        assert(mapBuilder.displayName); assert(mapBuilder.path)

        console.log('placing map:', mapBuilder.displayName)
        this.maps.push({
            path: mapBuilder.path.split('/').join('.'),
            name: allLangs(mapBuilder.displayName),
            dungeon: 'DUNGEON',
            offset: { x: 0, y: 0 }
        })

        mapBuilder.obtainTheme()
        await mapBuilder.place()
        assert(mapBuilder.rpv); 

        const { prevPath, prevMarker, nextPath, nextMarker } = this.getNextPrevRoomNames()

        mapBuilder.battle.tunnel.room.placeDoor(mapBuilder.rpv, DungeonMapBuilder.roomEntarenceMarker, prevPath, prevMarker)
        mapBuilder.puzzle.room.room.placeDoor(mapBuilder.rpv, DungeonMapBuilder.roomExitMarker, nextPath, nextMarker)

        await mapBuilder.finalize()

        this.addStamps(mapBuilder, offset)

        this.placeMapTiles(rects)
        let xInc = 0, yInc = 0
        switch (dir) {
            case Dir.NORTH: yInc = -1; break
            case Dir.EAST: xInc = 1; break
            case Dir.SOUTH: yInc = 1; break
            case Dir.WEST: xInc = -1; break
        }
        for (let x = Math.floor(pos.x), y = Math.floor(pos.y), i = 0; i < 100; x += xInc, y += yInc, i++) {
            if (this.tiles[y][x] == 0) {
                return new AreaPoint(x, y)
            }
        }
        throw new Error('that shouldnt happen')
    }

    getNextPrevRoomNames(): { prevPath: string; prevMarker: string; nextPath: string; nextMarker: string } {
        let prevPath, prevMarker, nextPath, nextMarker

        if (this.mapIndex == 0) {
            prevPath = DungeonBuilder.initialMap.path
            prevMarker = DungeonBuilder.initialMap.exitMarker
        } else {
            const obj = DungeonMapBuilder.getGenRoomNames(this.mapIndex - 1)
            prevPath = obj.path
            prevMarker = DungeonMapBuilder.roomExitMarker
        }
        {
            const obj = DungeonMapBuilder.getGenRoomNames(this.mapIndex + 1)
            nextPath = obj.path
            nextMarker = DungeonMapBuilder.roomEntarenceMarker
        }
        return { prevPath, prevMarker, nextPath, nextMarker }
    }

    addStamps(mapBuilder: DungeonMapBuilder, offset: AreaPoint) {
        const area: string = mapBuilder.areaInfo.name
        const puzzle = mapBuilder.puzzle
        const battle = mapBuilder.battle

        assert(puzzle.room.room); assert(puzzle.room.room.door); assert(battle.tunnel.room); assert(battle.tunnel.room.door); assert(puzzle.start); assert(puzzle.end)

        const level = 0
        function applyOffset(pos: Vec2): Vec2 {
            const pos1: Vec2 = { x: Math.floor(pos.x + offset.x*8), y: Math.floor(pos.y + offset.y*8) }
            return pos1
        }

        // puzzle exit door
        this.stamps.push(Stamp.new(area, applyOffset(puzzle.room.room.door.pos), level, puzzle.room.room.door.dir))
        // battle entrance door
        this.stamps.push(Stamp.new(area, applyOffset(battle.tunnel.room.door.pos), level, battle.tunnel.room.door.dir))
        
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
