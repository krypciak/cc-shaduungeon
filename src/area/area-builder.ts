import { AreaPoint, AreaRect, Dir, MapPoint, PosDir, Rect, doesRectArrayOverlapRectArray } from '@root/util/pos'
import { loadArea } from '@root/util/map'
import { allLangs, assert, assertBool } from '@root/util/misc'
import { Room, Tpr, } from '@root/room/room'
import { MapBuilder } from '@root/room/map-builder'
import { DungeonPaths } from '@root/dungeon/dungeon-paths'
import { AreaViewFloorTypes } from '@root/area/custom-MapAreaContainer'
import { ArmEnd, ArmRuntime, ArmRuntimeEntry, flatOutArmTopDown, forEveryArmEntry } from '@root/dungeon/dungeon-arrange'

export class AreaInfo {
    name: string
    constructor(
        public paths: DungeonPaths,
        public displayName: string,
        public displayDesc: string,
        public type: 'PATH' | 'TOWN' | 'DUNGEON',
        public pos: Vec2) {
        this.name = paths.nameAndId
    }
}

export class AreaBuilder {
    static tryGetAreaRects(builder: MapBuilder, lastExit: AreaPoint, arm: ArmRuntime):
        { exits: (PosDir<AreaPoint> | null)[], rects: AreaRect[], rooms: Room[] } | undefined {

        assert(builder.entarenceRoom)
        
        let entPosDir: PosDir<MapPoint> | null = builder.entarenceOnWall
        if (entPosDir == null) {
            entPosDir = Object.assign(new MapPoint(0, 0), { dir: Dir.SOUTH })
        }
        const ent: AreaPoint = entPosDir.to(AreaPoint)

        const offset: AreaPoint = new AreaPoint(lastExit.x - ent.x, lastExit.y - ent.y)

        const rects: AreaRect[] = []
        
        builder.rooms.forEach(r => {
            const ar = r.to(AreaRect)
            Vec2.add(ar, offset)
            rects.push(ar)
        })

        if (dnggen.debug.collisionlessMapArrange) {
            // let rootArm = arm
            // while (rootArm.parentArm) { rootArm = rootArm.parentArm }
            // assertBool(rootArm.rootArm)
            // console.log('rootArm:', rootArm)
            // const arr = flatOutArmTopDown(rootArm).flatMap(e => e.areaRects)
            // if (arr.length == 0) {
            //     const arr1 = flatOutArmTopDown(rootArm).flatMap(e => e.areaRects)
            // }
            // console.log(arr)
            // if (doesRectArrayOverlapRectArray(arr, rects)) {
            //     return
            // }
            let hitRoot = false
            const armsChecked: Set<ArmRuntime> = new Set()
            function doesCollide(arm: ArmRuntime): boolean {
                if (arm.rootArm) { hitRoot = true }
                for (const e of (arm.stack ?? [])) {
                    if (doesRectArrayOverlapRectArray(e.areaRects, rects)) { return true }
                }
                armsChecked.add(arm)
                if (arm.end == ArmEnd.Arm) {
                    for (const childArm of arm.arms) {
                        if (! armsChecked.has(childArm) && doesCollide(childArm)) { return true }
                    }
                }
                if (arm.parentArm && ! armsChecked.has(arm.parentArm)) {
                    if (doesCollide(arm.parentArm)) { return true }
                }
                return false
            }
            if (doesCollide(arm)) { return } else { assertBool(hitRoot) }
        }
        
        const exits: (PosDir<AreaPoint> | null)[] = builder.mapIOsOnWall.map(e => {
            if (e) {
                const pos = e.to(AreaPoint)
                Vec2.add(pos, offset)
                return Object.assign(pos, { dir: e.dir })
            } else { return null }
        })

        return {
            rects,
            exits,
            rooms: builder.rooms,
        }
    }

    static async openAreaViewerGui(areaName: string, map: string, floor: number = 0) {
        sc.map.currentArea = sc.map.currentPlayerArea = await loadArea(areaName)
        sc.map.currentPlayerFloor = floor
        sc.map.currentMap = map
        sc.menu.setDirectMode(true, sc.MENU_SUBMENU.MAP)
        sc.model.enterMenu(true)
        sc.model.prevSubState = sc.GAME_MODEL_SUBSTATE.RUNNING
    }

    dbEntry?: sc.MapModel.Area
    builtArea?: sc.AreaLoadable.Data

    static trimArm(arm: ArmRuntime, additionalSpace: number = 2): { offset: AreaPoint; size: AreaPoint } {
        const rects = flatOutArmTopDown(arm).flatMap(e => e.areaRects)
        const obj = Rect.getMinMaxPosFromRectArr(rects)
        const minPos: AreaPoint = obj.min as AreaPoint
        const maxPos: AreaPoint = obj.max as AreaPoint

        Vec2.subC(minPos, additionalSpace)
        const newSize: AreaPoint = maxPos.copy()
        Vec2.sub(newSize, minPos)
        Vec2.addC(newSize, additionalSpace)

        function offsetArmTopDown(arm: ArmRuntime, offset: AreaPoint) {
            /* arm.stack can be undefined in this context */
            arm.stack?.forEach(e => {
                e.areaRects.forEach(rect => Vec2.sub(rect, offset))
                for (const exit of Array.isArray(e.lastExit) ? e.lastExit : [e.lastExit]) {
                    Vec2.sub(exit, offset)
                }
            })
            if (arm.end == ArmEnd.Arm) {
                arm.arms.forEach(a => {
                    offsetArmTopDown(a, offset)
                })
            }
        }
        offsetArmTopDown(arm, minPos)

        return { offset: minPos, size: newSize }
    }

    constructor(
        public areaInfo: AreaInfo, 
        public arm: ArmRuntime,
        public size: AreaPoint,
    ) {
        this.size = new AreaPoint(Math.ceil(size.x), Math.ceil(size.y))
    }

    async build() {
        const chestCount = 0

        const builtArea: sc.AreaLoadable.Data = {
            DOCTYPE: 'AREAS_MAP',
            name: allLangs(this.areaInfo.name),
            width: this.size.x,
            height: this.size.y,
            chests: chestCount,
            defaultFloor: 0,
            floors: [
                await this.generateFloor(0, 'G', this.size, this.arm)
            ],
            type: AreaViewFloorTypes.RoomList,
        }
        this.builtArea = builtArea
    }

    async generateFloor(level: number, name: string, size: AreaPoint, rootArm: ArmRuntime): Promise<sc.AreaLoadable.FloorCustom> {
        /* level filtering not implemented */
        const entries: { entry: ArmRuntimeEntry, parentArm: ArmRuntime, index: number }[] = []
        forEveryArmEntry(rootArm, (entry: ArmRuntimeEntry, parentArm: ArmRuntime, index: number) => { entries.push({ entry, parentArm, index }) })
        
        const connections: sc.AreaLoadable.ConnectionRoomList[] = []
        // const mapConnectionSize = 3
        const landmarks: sc.AreaLoadable.Landmark[] = []
        // const stamps: Stamp[] = []

        const maps: sc.AreaLoadable.MapRoomList[] = []
        const mapType: 'DUNGEON' | 'NO_DUNGEON' = this.areaInfo.type == 'DUNGEON' ? 'DUNGEON' : 'NO_DUNGEON'


        /*
        function addMapConnection(pos: AreaPoint, dir: Dir, map1: number, map2: number) {
                const connection: sc.AreaLoadable.ConnectionRoomList = {
                    tx: pos.x,
                    ty: pos.y,
                    dir,
                    size: mapConnectionSize,
                    map1,
                    map2,
                }
                connections.push(connection)
        }
        */

        let mapIndex = 0
        function addMap(builder: MapBuilder, rects: AreaRect[], rooms: Room[]) {
            const path = builder.path!
            const displayName = builder.displayName!
            assertBool(rects.length == rooms.length)

            const obj = rects.map((r, i) => [r, rooms[i]] as [AreaRect, Room])
                .sort((a, b) => a[1].placeOrder - b[1].placeOrder)

            rects = obj.map(e => e[0])
            rooms = obj.map(e => e[1])

            const { min, max } = Rect.getMinMaxPosFromRectArr(rects)
            const trimmedRecs: sc.AreaLoadable.MapRoomListRect[] = rects.map(
                (r, i) => ({
                    x: (Math.floor((r.x - min.x) * 8)/8),
                    y: Math.floor((r.y - min.y) * 8)/8,
                    width: Math.floor(r.width * 8)/8,
                    height: Math.floor(r.height * 8)/8,
                    roomType: rooms[i].type,
                    placeOrder: rooms[i].placeOrder,
                    /* if the room has no walls make it have all walls (so it renders properly) */
                    wallSides: rooms[i].wallSides.every(v => !v) ? [true, true, true, true] : rooms[i].wallSides,
                })
            )
            maps.push({
                path: path.split('/').join('.'),
                name: allLangs(displayName),
                dungeon: mapType,
                offset: { x: 0, y: 0 },
                rects: trimmedRecs,
                id: mapIndex + 1,
                min: min,
                max: max,
            })

            /*
            if (dnggen.debug.areaMapConnections) {
                const entTpr = builder.entarenceRoom.primaryEntarence.getTpr()
                if (DirUtil.dir3dIsDir(entTpr.dir)) {
                    const dir = entTpr.dir as unknown as Dir
                    const pos = entTpr.pos.to(AreaPoint)

                    const parentRoom =
                        builder.entarenceRoom.primaryEntarence instanceof RoomIOTunnelClosed ?
                            builder.entarenceRoom.primaryEntarence.tunnel : builder.entarenceRoom
                    const areaRect = rects[rooms.indexOf(parentRoom)]
                    pos.x += Math.floor(min.x*8)/8
                    pos.y += Math.floor(min.y*8)/8
                    areaRect.setPosToSide(pos, dir)
                    // const posCopy = pos.copy()
                    // parentRoom.to(AreaRect).setPosToSide(posCopy, dir)
                    // if (pos.x != posCopy.x || pos.y != posCopy.y) {
                    //     debugger
                    // }
                    // pos = posCopy
                    // assertBool(posCopy == pos)
                    // const rect: AreaRect = rects[rooms.indexOf(parentRoom)]
                    switch (dir) {
                        case Dir.NORTH: pos.y -= 2/8; break
                        case Dir.EAST: pos.x -= 2/8; break
                        case Dir.SOUTH: pos.y -= 2/8; break
                        case Dir.WEST: pos.x -= 2/8; break
                    }
                    addMapConnection(pos, dir, mapIndex + 1, mapIndex, areaRect)
                }
            }
            */
        }
        
        for (const obj of entries) {
            const builder = obj.entry.builder
            builder.pathParent = this.areaInfo.name
            assertBool(builder.path === undefined, 'MapBuilder copy fail')
            builder.path = builder.pathParent + '/' + (mapIndex.toLocaleString('en-US', {minimumIntegerDigits: 3, useGrouping: false}))

            await builder.decideDisplayName(mapIndex)
            assert(builder.displayName)
            addMap(builder, obj.entry.areaRects, obj.entry.rooms)
            mapIndex++
        }
        /* set map in/out tpr paths and markers */
        for (const obj of entries) {
            const builder: MapBuilder = obj.entry.builder
            const pa: ArmRuntime = obj.parentArm
            /* set entarence path and marker */ {
                let prevTpr: Tpr, prevBuilder: MapBuilder
                if (obj.index == 0) {
                    const pp = pa.parentArm
                    if (pp) {
                        prevBuilder = pp.stack.last().builder
                        prevTpr = prevBuilder.mapIOs[pp.arms.indexOf(pa)].io.getTpr()
                    } else {
                        /* first first room */
                        prevTpr = builder.entarenceRoom.primaryEntarence.getTpr()
                        prevBuilder = builder
                    }
                } else {
                    prevBuilder = obj.parentArm.stack[obj.index - 1].builder
                    assert(prevBuilder.exitCount == 1)
                    prevTpr = prevBuilder.mapIOs[0].io.getTpr()
                }
                assert(prevTpr); assert(prevBuilder)
                const entTpr: Tpr = builder.entarenceRoom.primaryEntarence.getTpr()
                assertBool(entTpr.destMap === undefined, 'MapBuilder copy fail'); assertBool(entTpr.destMarker === undefined, 'MapBuilder copy fail')
                assert(prevBuilder.path); assert(prevTpr.name)
                entTpr.destMap = prevBuilder.path
                entTpr.destMarker = prevTpr.name
            }

            /* set exit paths and markers */ {
                assertBool(builder.mapIOs.length == builder.exitCount)
                if (obj.index == pa.length) {
                    if (pa.end == ArmEnd.Arm) {
                        assertBool(builder.exitCount == pa.arms.length)
                        builder.mapIOs.forEach((obj1, i) => {
                            const nextArm: ArmRuntime = pa.arms[i]
                            const nextEntry: ArmRuntimeEntry = nextArm.stack[0]
                            const destMap: string = nextEntry.builder.path!
                            const destMarker: string = nextEntry.builder.entarenceRoom.primaryEntarence.getTpr().name
                            assert(destMap); assert(destMarker)

                            const tpr: Tpr = obj1.io.getTpr()
                            assertBool(tpr.destMap === undefined, 'MapBuilder copy fail'); assertBool(tpr.destMarker === undefined, 'MapBuilder copy fail')
                            tpr.destMap = destMap
                            tpr.destMarker = destMarker
                        })
                    } else {
                        assertBool(builder.exitCount == 1)
                        /* dead end */
                        /* temp: set loop the exit */
                        const tpr: Tpr = builder.mapIOs[0].io.getTpr()
                        assertBool(tpr.destMap === undefined, 'MapBuilder copy fail'); assertBool(tpr.destMarker === undefined, 'MapBuilder copy fail')
                        tpr.destMap = builder.path
                        tpr.destMarker = tpr.name
                    }
                } else {
                    assertBool(builder.exitCount == 1)
                    const currTpr: Tpr = builder.mapIOs[0].io.getTpr()
                    const nextBuilder: MapBuilder = obj.parentArm.stack[obj.index + 1].builder
                    assertBool(currTpr.destMap === undefined, 'MapBuilder copy fail'); assertBool(currTpr.destMarker === undefined, 'MapBuilder copy fail')
                    currTpr.destMap = nextBuilder.path!

                    const nextTpr: Tpr = nextBuilder.entarenceRoom.primaryEntarence.getTpr()
                    currTpr.destMarker = nextTpr.name
                }
            }
        }

        return {
            level,
            name: allLangs(name),
            icons: [],
            tiles: [],
            type: AreaViewFloorTypes.RoomList,
            size,
            maps,
            connections,
            landmarks,
        }
    }

    createDbEntry() {
        this.dbEntry = {
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
    }

    addToDb() {
        if (! this.dbEntry) {
            this.createDbEntry()
            assert(this.dbEntry)
        }
        
        ig.database.data.areas[this.areaInfo.name] = this.dbEntry
    }

    saveToFile() {
        this.areaInfo.paths.saveArea(this)
    }
    
    /*
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
