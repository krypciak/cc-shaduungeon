import { Dir, DirUtil, Rect, MapPoint, EntityPoint, MapRect, EntityRect, setToClosestSelSide } from './util/pos.js'
import { assert } from './util/misc.js'
import { Blitzkrieg, Selection } from './util/blitzkrieg.js'
import { MapEnemyCounter, MapEventTrigger, MapFloorSwitch, MapGlowingLine, MapHiddenBlock, MapTouchTrigger, MapTransporter, MapWall } from './entity-spawn.js'
import { MapBuilder, Room, RoomPlaceVars, getPosOnRectSide } from './room-builder.js'
import { RoomTheme } from './themes.js'
import { AreaInfo } from './area-builder.js'
import DngGen from './plugin.js'

declare const blitzkrieg: Blitzkrieg
declare const dnggen: DngGen
const tilesize: number = 16

interface PuzzleData {
    type: 'whole room' | 'add walls' | 'dis'
    completion: 'normal' | 'getTo' | 'item'
    origMapName: string
    map?: sc.MapModel.Map
    enterCondition: string
    room: {
        spacing: number
        room?: Room
    }
    tunnel: {
        size: MapPoint
        room?: Room
    }
    usel?: {
        id: number
        sel: Selection
        solveCondition?: string
        solveConditionUnique?: string
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
        dir?: Dir
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

        super(3, areaInfo)
        
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
            enterCondition: this.battle.startCondition + ' && !' + this.battle.doneCondition,
            type: puzzleSel.data.type,
            completion: puzzleSel.data.completionType,
            origMapName: puzzleSel.map,
            room: {
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
        assert(puzzle.map)

        if (true) {
            const id = blitzkrieg.util.generateUniqueID()
            const sel = blitzkrieg.selectionCopyManager
                .createUniquePuzzleSelection(this.puzzleSel, 0, 0, id)

            let solveCondition: string | undefined
            let solveConditionUnique: string | undefined
            switch (puzzle.completion) {
                case 'normal':
                    solveCondition = blitzkrieg.puzzleSelectionManager.getPuzzleSolveCondition(sel)
                    break
                case 'getTo':
                    if (puzzle.type == 'whole room') {
                        solveCondition = ''
                    } else if (puzzle.type == 'add walls') {
                        solveCondition = 'map.puzzleSolution1'; break
                    }
                case 'item':
                    solveCondition = undefined
            }
            if (solveCondition) {
                solveConditionUnique = solveCondition
                if (solveCondition && solveCondition.includes('_destroyed')) { solveConditionUnique += '_' + id }
            }
            puzzle.usel = { id, sel, solveCondition, solveConditionUnique }

            puzzle.usel.sel.size = Rect.new(EntityRect, puzzle.usel.sel.size)
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
            puzzle.room.room = new Room('puzzle', puzzle.usel.sel.size, wallSides, spacing, true, placeOrder, (rpv) => {
                return this.placePuzzleRoom(rpv)
            })
            this.addRoom(puzzle.room.room)
        }
        if (true) {
            const pos: Vec3  & { level: number } = ig.copy(puzzle.usel.sel.data.startPos)
            const dir: Dir = (puzzle.type == 'whole room' ?
                setToClosestSelSide(pos, puzzle.usel.sel) :
                Rect.new(EntityRect, puzzle.usel.sel.size).setToClosestRectSide(pos)).dir
            puzzle.start = { pos, dir }
        }
        if (true) {
            const pos: Vec3  & { level: number } = ig.copy(puzzle.usel.sel.data.endPos)
            const dir: Dir = (puzzle.type == 'whole room' ?
                setToClosestSelSide(pos, puzzle.usel.sel) :
                Rect.new(EntityRect, puzzle.usel.sel.size).setToClosestRectSide(pos)).dir

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

                    puzzle.room.room.door = {
                        name,
                        pos: newPos,
                        dir: DirUtil.flip(DirUtil.convertToDir(closestTransporter.settings.dir)),
                        entity: closestTransporter
                    }
                    puzzle.end.dir = puzzle.room.room.door.dir
                } else {
                    puzzle.room.room.setDoor(name, puzzle.end.dir, EntityPoint.fromVec(puzzle.end.pos))
                }
            } else if (puzzle.type == 'add walls') {
                puzzle.room.room.setDoor(name, puzzle.end.dir, EntityPoint.fromVec(puzzle.end.pos))
            }
            assert(puzzle.room.room.door, 'puzzle door missing?')

            if (puzzle.room.room.door) {
                puzzle.room.room.door.condition = puzzle.usel.solveConditionUnique
            }
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
                    case Dir.SOUTH: pos.y = puzzle.start.pos.y + puzzleTunnelSize.y + tilesize; break
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

        this.trimRoomPositions(new MapRect(3, 10, 4, 4))
        assert(this.trimOffset)
        const trimOffsetEntity: EntityPoint = this.trimOffset.to(EntityPoint)
        blitzkrieg.util.setSelPos(puzzle.usel.sel, trimOffsetEntity.x, trimOffsetEntity.y)
        Vec2.add(puzzle.start.pos, trimOffsetEntity)
        Vec2.add(puzzle.end.pos, trimOffsetEntity)
    }

    calculateBattleTunnel(dir: Dir): boolean {
        const puzzle: PuzzleData = this.puzzle
        const battle: BattleData = this.battle

        assert(battle.room.room, 'calculateBattleTunnel() battle.room.room is not set')
        assert(puzzle.start)

        // make sure the tunnel isnt duplicated
        if (battle.tunnel.room) {
            this.rooms.splice(battle.tunnel.room.index!)
        }
        if (dir == DirUtil.flip(puzzle.start.dir)) {
            return false
        }
        battle.tunnel.dir = dir

        const prefPos: EntityPoint = battle.room.room.floorRect.middlePoint(MapPoint).to(EntityPoint)

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
        this.theme = RoomTheme.getFromArea(this.puzzle.map!.attributes.area)
    }

    async placePuzzleRoom(rpv: RoomPlaceVars): Promise<RoomPlaceVars> {
        const puzzle: PuzzleData = this.puzzle

        assert(puzzle.usel); assert(puzzle.room.room);      assert(puzzle.end); assert(puzzle.map);
        assert(this.path);   assert(puzzle.room.room.door); assert(this.trimOffset)

        if (puzzle.completion == 'getTo' && puzzle.type == 'add walls') {
            assert(puzzle.usel.solveConditionUnique)
            rpv.entities.push(MapFloorSwitch.new(EntityPoint.fromVec(puzzle.end.pos), puzzle.end.pos.level, 'puzzleSolveSwitch', puzzle.usel.solveConditionUnique))
        }

        if (puzzle.type == 'whole room') {
            puzzle.room.room.placeWallsInEmptySpace(rpv, puzzle.usel.sel)
        }

        if (dnggen.debug.pastePuzzle) {
            const pastePos: EntityPoint = this.trimOffset.to(EntityPoint)
            const map: sc.MapModel.Map = await blitzkrieg.selectionCopyManager
                .copySelToMap(ig.copy(rpv.map), ig.copy(puzzle.map), this.puzzleSel, pastePos.x, pastePos.y, this.path, {
                    disableEntities: false,
                    mergeLayers: false,
                    removeCutscenes: true,
                    makePuzzlesUnique: true,
                    uniqueId: puzzle.usel.id,
                    uniqueSel: puzzle.usel.sel,
                })
            rpv = RoomPlaceVars.fromRawMap(map, rpv.theme)
        }

        blitzkrieg.puzzleSelections.setSelHashMapEntry(this.path, {
            sels: [ puzzle.usel.sel ],
            fileIndex: dnggen.puzzleFileIndex,
        })
        this.addSelection(puzzle.usel.sel)
        return rpv
    }

    async placeBattleRoom(rpv: RoomPlaceVars): Promise<undefined> {
        const puzzle: PuzzleData = this.puzzle
        const battle: BattleData = this.battle
        assert(this.path); assert(battle.room.room); assert(puzzle.tunnel.room)
        assert(battle.tunnel.room); assert(battle.tunnel.dir); assert(puzzle.start)

        battle.sel = blitzkrieg.util.getSelFromRect(battle.room.room.floorRect.to(EntityRect), this.path, 0)

        blitzkrieg.battleSelections.setSelHashMapEntry(this.path, {
            sels: [ battle.sel ],
            fileIndex: dnggen.puzzleFileIndex,
        })
        this.addSelection(battle.sel)

        if (dnggen.debug.decorateBattleRoom) {
            const puzzleTunnelExitRect: EntityRect = puzzle.tunnel.room.getSideEntityRect(puzzle.start.dir)
            rpv.entities.push(                       MapWall.new(puzzleTunnelExitRect, rpv.masterLevel, 'puzzle1TunnelExitWall', puzzle.enterCondition))
            rpv.entities.push(MapHiddenBlock.newInvisibleBlocker(puzzleTunnelExitRect, rpv.masterLevel, 'puzzle1TunnelExitBlocker', '!' + battle.doneCondition))

            const middlePoint: EntityPoint = battle.room.room.floorRect.middlePoint(MapPoint).to(EntityPoint)
            Vec2.sub(middlePoint, { x: 16, y: 16})
            rpv.entities.push(MapEnemyCounter.new(middlePoint, rpv.masterLevel, 'battle1EnemyCounter',
                /* enemyGroup */ '', /* enemyCount */ 0, /* preVariable */ '', /* postVariable */ '', /* countVariable */ ''))

            const glowingLineSize: number = DirUtil.isVertical(puzzle.start.dir) ?
                Math.abs(middlePoint.y - puzzleTunnelExitRect.y) : 
                Math.abs(middlePoint.x - puzzleTunnelExitRect.x)

            rpv.entities.push(MapGlowingLine
                .newPerpendicular(puzzleTunnelExitRect, rpv.masterLevel, 'battle1GlowingLine', puzzle.start.dir, glowingLineSize, battle.doneCondition))

            const battleTunnelEntarenceRect: EntityRect = battle.tunnel.room.getSideEntityRect(DirUtil.flip(battle.tunnel.dir))
            rpv.entities.push(                                 MapWall.new(battleTunnelEntarenceRect, rpv.masterLevel, 'battle1EntarenceWall', puzzle.enterCondition))
            rpv.entities.push(MapHiddenBlock.newInvisibleProjectileBlocker(battleTunnelEntarenceRect, rpv.masterLevel, 'battle1EntarencePBlocker', '!' + battle.startCondition))
            rpv.entities.push(                 MapTouchTrigger.newParallel(battleTunnelEntarenceRect, rpv.masterLevel, 'battle1TouchTriggerStart', battle.tunnel.dir, 10, 32, battle.startCondition))

            // doesnt work?
            rpv.entities.push(MapEventTrigger
                .new(EntityPoint.fromVec(puzzleTunnelExitRect), rpv.masterLevel, 'battle1EndEvent', 'PARALLEL', battle.doneCondition, 'ONCE_PER_ENTRY', '', [
                    {
                        entity: { player: true },
                        marker: { global: true, name: DungeonMapBuilder.roomEntarenceMarker },
                        type: 'SET_RESPAWN_POINT',
                    },
                    { type: 'SAVE' }
                ]
            ))
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
