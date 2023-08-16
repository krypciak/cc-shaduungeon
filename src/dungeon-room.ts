import { Dir, DirUtil, Selection, EntityRect, Blitzkrieg, Rect, MapPoint, EntityPoint, assert } from './util.js'
import { MapBuilder, Room, RoomPlaceVars, getPosOnRectSide, getRoomThemeFromArea } from './room-builder.js'
import { AreaInfo } from './area-builder.js'
import { MapFloorSwitch, MapTransporter } from './entity-spawn.js'
import DngGen from './plugin.js'

declare const blitzkrieg: Blitzkrieg
declare const dnggen: DngGen
const tilesize: number = 16

interface PuzzleData {
    type: 'whole room' | 'add walls' | 'dis'
    completion: 'normal' | 'getTo' | 'item'
    origMapName: string
    map?: sc.MapModel.Map
    exitCondition: string
    room: {
        initialPos: MapPoint
        spacing: number
        room?: Room
    }
    tunnel: {
        size: MapPoint
        room?: Room
    }
    unique?: {
        id: number
        sel: Selection
    }
    end?: {
        pos: Vec3 & { level: number },
        dir: Dir,
    }
    start?: {
        pos: Vec3 & { level: number },
        dir: Dir,
    }
}

interface BattleData {
    startCondition: string
    doneCondition: string
    room: {
        size: MapPoint
        spacing: number
        room?: Room
    }
    tunnel: {
        size: MapPoint
        room?: Room
    }
    sel?: Selection
}

export class DungeonMapBuilder extends MapBuilder {
    static basePath: string = 'rouge/gen'
    static roomExitMarker: string = 'puzzleExit'
    static roomEntarenceMarker: string = 'battleEntarence'

    puzzle: PuzzleData
    battle: BattleData

    constructor(
        public areaInfo: AreaInfo, 
        public puzzleSel: Selection) {
        
        assert(puzzleSel.data.type); assert(puzzleSel.data.completionType)

        super(200, 200, 3, areaInfo)
        
        this.battle = {
            startCondition: 'tmp.battle1',
            doneCondition: 'map.battle1done',
            room: {
                size: new MapPoint(9, 9),
                spacing: 2,
            },
            tunnel: {
                size: new MapPoint(5, 3),
            }
        }

        this.puzzle = {
            exitCondition: this.battle.startCondition + ' && !' + this.battle.doneCondition,
            type: puzzleSel.data.type,
            completion: puzzleSel.data.completionType,
            origMapName: puzzleSel.map,
            room: {
                initialPos: new MapPoint(Math.floor(this.width/2.5), Math.floor(this.height/2.5)),
                spacing: 3
            },
            tunnel: {
                size: new MapPoint(5, 8),
            }
        }
    }

    private createTunnelRoom(baseRoom: Room, name: string, dir: Dir, size: MapPoint,
        addNavMap: boolean, exitDir: Dir | null, setPos: EntityPoint, preffedPos: boolean): Room {

        const pos: EntityPoint = preffedPos ? getPosOnRectSide(EntityPoint, dir, baseRoom.floorRect.to(EntityRect), setPos) : setPos
        const rect: EntityRect = EntityRect.fromTwoPoints(pos, size.to(EntityPoint))
        if (! DirUtil.isVertical(dir)) {
            [rect.width, rect.height] = [rect.height, rect.width]
        }
        switch (dir) {
            case Dir.NORTH:
                rect.x += -rect.width/2
                rect.y += -rect.height + tilesize; break
            case Dir.EAST:
                rect.x += -tilesize
                rect.y += -rect.height/2; break
            case Dir.SOUTH:
                rect.x += -rect.width/2
                rect.y += -tilesize; break
            case Dir.WEST:
                rect.x += -rect.width + tilesize
                rect.y += -rect.height/2; break
        }
        const wallSides: boolean[] = [true, true, true, true]
        wallSides[DirUtil.flip(dir)] = false
        if (exitDir !== null) {
            wallSides[DirUtil.flip(exitDir)] = false
        }
        return new Room(name, rect, wallSides, 0, addNavMap, Room.PlaceOrder.Tunnel)
    }

    async loadPuzzleMap() {
        this.puzzle.map = await blitzkrieg.util.getMapObject(this.puzzle.origMapName)
    }

    calculatePositions() {
        const puzzle: PuzzleData = this.puzzle
        const battle: BattleData = this.battle
        assert(puzzle.map);

        if (true) {
            const id = blitzkrieg.util.generateUniqueID()
            const pos: EntityPoint = puzzle.room.initialPos.to(EntityPoint)
            const sel = blitzkrieg.selectionCopyManager
                .createUniquePuzzleSelection(this.puzzleSel, pos.x, pos.y, id)
            puzzle.unique = { id, sel }
            
            puzzle.unique.sel.size = Rect.new(EntityRect, puzzle.unique.sel.size)
        }
        if (true) {
            let spacing: number, placeOrder = Room.PlaceOrder.Room, wallSides: boolean[]
            if (puzzle.type == 'whole room') {
                spacing = 0
                placeOrder = Room.PlaceOrder.Room
                wallSides = [false, false, false, false]
            } else {
                // puzzle.type == 'add walls'
                spacing = puzzle.room.spacing
                wallSides = [true, true, true, true]
            }
            puzzle.room.room = new Room('puzzle', puzzle.unique.sel.size, wallSides, spacing, true, placeOrder, (rpv) => {
                return this.placePuzzleRoom(rpv)
            })
            this.addRoom(puzzle.room.room)
        }
        if (true) {
            const pos: Vec3  & { level: number } = ig.copy(puzzle.unique.sel.data.startPos)
            const dir: Dir = puzzle.type == 'whole room' ?
                blitzkrieg.util.setToClosestSelSide(pos, puzzle.unique.sel) :
                blitzkrieg.util.setToClosestRectSide(pos, puzzle.unique.sel.size).side
            puzzle.start = { pos, dir }
        }
        if (true) {
            const pos: Vec3  & { level: number } = ig.copy(puzzle.unique.sel.data.endPos)
            const dir: Dir = puzzle.type == 'whole room' ?
                blitzkrieg.util.setToClosestSelSide(pos, puzzle.unique.sel) :
                blitzkrieg.util.setToClosestRectSide(pos, puzzle.unique.sel.size).side

            puzzle.end = { pos, dir }
        }
        
        if (puzzle.completion != 'item') {
            const name = 'exit'
            if (puzzle.type == 'whole room') {
                let closestDistance: number = 100000
                let closestTransporter: MapTransporter | undefined
                // check if there's a door near puzzle end
                for (const entity of puzzle.map.entities) {
                    if (MapTransporter.check(entity)) {
                        const dist: number = Math.sqrt(Math.pow(entity.x - this.puzzleSel.data.endPos.x, 2) + Math.pow(entity.y - this.puzzleSel.data.endPos.y, 2))
                        if (dist < 200 && dist < closestDistance) {
                            closestDistance = dist
                            closestTransporter = entity
                        }
                    }
                }
                if (closestTransporter) {
                    // console.log('door dist:', closestDistance)

                    const newPos: EntityPoint = EntityPoint.fromVec(closestTransporter)
                    Vec2.sub(newPos, this.puzzleSel.size)
                    Vec2.add(newPos, puzzle.room.initialPos.to(EntityPoint))

                    puzzle.room.room.door = {
                        name,
                        pos: newPos,
                        dir: DirUtil.flip(DirUtil.convertToDir(closestTransporter.settings.dir)),
                        entity: closestTransporter
                    }
                } else {
                    puzzle.room.room.setDoor(name, puzzle.end.dir, EntityPoint.fromVec(puzzle.end.pos))
                }
            } else if (puzzle.type == 'add walls') {
                puzzle.room.room.setDoor(name, puzzle.end.dir, EntityPoint.fromVec(puzzle.end.pos))
            }
            assert(puzzle.room.room.door, 'puzzle door missing?')
        }

        puzzle.tunnel.room = this.createTunnelRoom(puzzle.room.room, 'puzzleTunnel', puzzle.start.dir,
            puzzle.tunnel.size, false, DirUtil.flip(puzzle.start.dir), EntityPoint.fromVec(puzzle.start.pos), puzzle.type == 'add walls')
        this.addRoom(puzzle.tunnel.room)

        if (true) {
            const size: EntityPoint = battle.room.size.to(EntityPoint)
            const puzzleTunnelPos: EntityPoint = EntityPoint.fromVec(puzzle.tunnel.room.floorRect.to(EntityRect))
            const puzzleTunnelSize: EntityPoint = puzzle.tunnel.size.to(EntityPoint)

            const puzzleRoomFloorRect: EntityRect = puzzle.room.room.floorRect.to(EntityRect)

            const pos: EntityPoint = new EntityPoint(0, 0)
            if (DirUtil.isVertical(puzzle.start.dir)) {
                pos.x = puzzleTunnelPos.x - size.x/2 + puzzleTunnelSize.x/2
            } else {
                pos.y = puzzleTunnelPos.y - size.y/2 + puzzleTunnelSize.x/2
            }
            if (puzzle.type == 'whole room') {
                switch (puzzle.start.dir) {
                    case Dir.NORTH: pos.y = puzzle.start.pos.y - puzzleTunnelSize.y - size.y - tilesize; break
                    case Dir.EAST:  pos.x = puzzle.start.pos.x + puzzleTunnelSize.y + tilesize; break
                    case Dir.SOUTH: pos.y = puzzle.start.pos.y + puzzleTunnelSize.y - tilesize; break
                    case Dir.WEST:  pos.x = puzzle.start.pos.x - puzzleTunnelSize.y - size.x + tilesize; break
                }
            } else {
                switch (puzzle.start.dir) {
                    case Dir.NORTH: pos.y = puzzleRoomFloorRect.y - puzzleTunnelSize.y - size.y; break
                    case Dir.EAST:  pos.x = puzzleRoomFloorRect.x2() + puzzleTunnelSize.y + tilesize*2; break
                    case Dir.SOUTH: pos.y = puzzleRoomFloorRect.y2() + puzzleTunnelSize.y + tilesize*2; break
                    case Dir.WEST:  pos.x = puzzleRoomFloorRect.x - puzzleTunnelSize.y - size.x; break
                }
            }
            battle.room.room = new Room('battle', EntityRect.fromTwoPoints(pos, size), [true, true, true, true],
                battle.room.spacing, true, Room.PlaceOrder.Room, (rpv) => {
                return this.placeBattleRoom(rpv)
            })
            this.addRoom(battle.room.room)
        }
    }

    calculateBattleTunnel(dir: Dir): boolean {
        const puzzle: PuzzleData = this.puzzle
        const battle: BattleData = this.battle

        assert(battle.room.room, 'calculateBattleTunnel() battle.room.room is not set')
        assert(puzzle.start)

        if (dir == DirUtil.flip(puzzle.start.dir)) {
            return false
        }

        const prefPos: EntityPoint = new MapPoint(
            battle.room.room.floorRect.x + battle.room.room.floorRect.width/2,
            battle.room.room.floorRect.y + battle.room.room.floorRect.height/2,
        ).to(EntityPoint)

        battle.tunnel.room = this.createTunnelRoom(battle.room.room, 'battleTunnel', dir, battle.tunnel.size, false, null, prefPos, true)
        this.addRoom(battle.tunnel.room)

        battle.tunnel.room.setDoor('entarence', dir)

        return true
    }

    async decideMapName(index: number) {
        assert(this.puzzle.map)

        const { pathParent, name, path } = DungeonMapBuilder.getGenRoomNames(index)
        this.pathParent = pathParent
        this.name = name
        this.path = path
        const mapDisplayName: string = await getMapDisplayName(this.puzzle.map)
        this.displayName = `${index.toString()} => ${this.puzzle.map.name} ${mapDisplayName}`
    }

    static getGenRoomNames(index: number) {
        const pathParent: string = DungeonMapBuilder.basePath
        const name: string = index.toString()
        const path: string = pathParent + '/' + name
        return { pathParent, name, path }
    }

    obtainTheme() {
        this.theme = getRoomThemeFromArea(this.puzzle.map!.attributes.area)
    }

    async placePuzzleRoom(rpv: RoomPlaceVars): Promise<RoomPlaceVars> {
        const puzzle: PuzzleData = this.puzzle

        assert(puzzle.unique); assert(puzzle.room.room);     assert(puzzle.end); assert(puzzle.map);
        assert(this.path);     assert(puzzle.room.room.door)


        let solveCond: string | undefined
        let solveCondUnique: string | undefined
        switch (puzzle.completion) {
            case 'normal':
                solveCond = blitzkrieg.puzzleSelectionManager.getPuzzleSolveCondition(puzzle.unique.sel)
                
                break
            case 'getTo':
                if (puzzle.type == 'whole room') {
                    solveCond = ''
                } else if (puzzle.type == 'add walls') {
                    solveCond = 'map.puzzleSolution1'; break
                }
            case 'item':
                solveCond = undefined
        }
        if (solveCond) {
            solveCondUnique = solveCond
            if (solveCond &&  solveCond.includes('_destroyed')) { solveCondUnique += '_' + puzzle.unique.id }
        }

        if (puzzle.room.room.door) {
            puzzle.room.room.door.condition = solveCondUnique
        }

        if (puzzle.completion == 'getTo' && puzzle.type == 'add walls') {
            assert(solveCondUnique)
            rpv.entities.push(MapFloorSwitch.new(EntityPoint.fromVec(puzzle.end.pos), puzzle.end.pos.level, 'puzzleSolveSwitch', solveCondUnique))
        }

        if (puzzle.type == 'whole room') {
            puzzle.room.room.placeWallsInEmptySpace(rpv, puzzle.unique.sel)
        }

        if (dnggen.debug.pastePuzzle) {
            const pastePos: EntityPoint = puzzle.room.initialPos.to(EntityPoint)
            const map: sc.MapModel.Map = await blitzkrieg.selectionCopyManager
                .copySelToMap(ig.copy(rpv.map), ig.copy(puzzle.map), this.puzzleSel, pastePos.x, pastePos.y, this.path, {
                    disableEntities: false,
                    mergeLayers: false,
                    removeCutscenes: true,
                    makePuzzlesUnique: true,
                    uniqueId: puzzle.unique.id,
                    uniqueSel: puzzle.unique.sel,
                })
            rpv = RoomPlaceVars.fromRawMap(map, rpv.theme)
        }

        blitzkrieg.puzzleSelections.setSelHashMapEntry(this.path, {
            sels: [ puzzle.unique.sel ],
            fileIndex: dnggen.puzzleFileIndex,
        })
        this.addSelection(puzzle.unique.sel)
        return rpv
    }

    async placeBattleRoom(rpv: RoomPlaceVars): Promise<undefined> {
        const puzzle: PuzzleData = this.puzzle
        const battle: BattleData = this.battle
        assert(this.path); assert(battle.room.room)

        battle.sel = blitzkrieg.util.getSelFromRect(battle.room.room.floorRect.to(EntityRect), this.path, 0)

        blitzkrieg.battleSelections.setSelHashMapEntry(this.path, {
            sels: [ battle.sel ],
            fileIndex: dnggen.puzzleFileIndex,
        })
        this.addSelection(battle.sel)

        if (dnggen.debug.decorateBattleRoom) {

        }
    }
}


const mapNameToMapDisplayName: Map<string, string> = new Map<string, string>()

export async function getMapDisplayName(map: sc.MapModel.Map): Promise<string> {
    return new Promise<string>(async (resolve) => {
        const mapName = map.name.split('.').join('/')
        if (mapNameToMapDisplayName.has(mapName)) {
            resolve(mapNameToMapDisplayName.get(mapName) ?? 'maploadingerror')
            return
        }
        const areaName: string = map.attributes.area
        const area: sc.AreaLoadable = await loadArea(areaName)

        for (const floor of area.data.floors) {
            for (const map of floor.maps) {
                const displayName = map.name.en_US!
                mapNameToMapDisplayName.set(map.path.split('.').join('/'), displayName)
            }
        }
        resolve(getMapDisplayName(map))
    })
}

async function loadArea(areaName: string): Promise<sc.AreaLoadable> {
    return new Promise((resolve) => {
        const area: sc.AreaLoadable = new sc.AreaLoadable(areaName)
        area.load(() => {
            resolve(area)
        })
    })
}
