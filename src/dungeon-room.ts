import { CCMap, Dir, DirUtil, Selection, EntityRect, Blitzkrieg, Rect, MapPoint, EntityPoint } from './util.js'
import { MapBuilder, Room, getPosOnRectSide } from './room-builder.js'
import { AreaInfo } from './area-builder.js'
import { MapEntity } from './entity-spawn.js'

declare const blitzkrieg: Blitzkrieg
const tilesize: number = 16

export class DungeonMapBuilder extends MapBuilder {
    static basePath: string = 'rouge/gen'
    pathParent?: string
    name?: string
    path?: string
    displayName?: string

    puzzle: {
        type: 'whole room' | 'add walls' | 'dis'
        completion: 'normal' | 'getTo' | 'item'
        origMapName: string
        map?: CCMap
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
            pos: Vec3,
            dir: Dir,
        }
        start?: {
            pos: Vec3,
            dir: Dir,
        }
    }
    battle: {
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

    constructor(
        public areaInfo: AreaInfo, 
        public puzzleSel: Selection) {

        super(200, 200, 4, areaInfo)
        
        this.puzzle = {
            type: puzzleSel.data.type!,
            completion: puzzleSel.data.completionType!,
            origMapName: puzzleSel.map,
            room: {
                initialPos: new MapPoint(this.width/2, this.height/2),
                spacing: 3
            },
            tunnel: {
                size: new MapPoint(5, 5),
            }
        }

        this.battle = {
            room: {
                size: new MapPoint(21, 21),
                spacing: 2,
            },
            tunnel: {
                size: new MapPoint(5, 5),
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
                rect.x += rect.width/2
                rect.y += -rect.height + tilesize; break
            case Dir.EAST:
                rect.x += -tilesize
                rect.y += -rect.height/2; break
            case Dir.SOUTH:
                rect.x += rect.width/2
                rect.y += -tilesize; break
            case Dir.WEST:
                rect.x += -rect.width + tilesize
                rect.y += -rect.height/2; break
        }
        const wallSides: boolean[] = [true, true, true, true]
        wallSides[DirUtil.flip(dir)] = false
        if (exitDir) { wallSides[exitDir] = false }
        return new Room(name, rect, wallSides, 0, addNavMap)
    }

    async calculatePositions() {
        const puzzle = this.puzzle
        const battle = this.battle

        if (true) {
            const id = blitzkrieg.util.generateUniqueID()
            const sel = blitzkrieg.selectionCopyManager
                .createUniquePuzzleSelection(this.puzzleSel, puzzle.room.initialPos.x, puzzle.room.initialPos.y, id)
            puzzle.unique = { id, sel }
            
            puzzle.unique.sel.size = Rect.new(EntityRect, puzzle.unique.sel.size)
        }
        if (true) {
            const spacing = puzzle.type == 'add walls' ? puzzle.room.spacing : 0
            puzzle.room.room = new Room('puzzle', puzzle.unique.sel.size, [true, true, true, true], spacing, true)
            this.addRoom(puzzle.room.room)
        }
        if (true) {
            const pos: Vec3 = ig.copy(puzzle.unique.sel.data.startPos)
            const dir: Dir = puzzle.type == 'whole room' ?
                blitzkrieg.util.setToClosestSelSide(pos, puzzle.unique.sel) :
                blitzkrieg.util.setToClosestRectSide(pos, puzzle.unique.sel.size).side
            puzzle.start = { pos, dir }
        }
        if (true) {
            const pos: Vec3 = ig.copy(puzzle.unique.sel.data.endPos)
            const dir: Dir = puzzle.type == 'whole room' ?
                blitzkrieg.util.setToClosestSelSide(pos, puzzle.unique.sel) :
                blitzkrieg.util.setToClosestRectSide(pos, puzzle.unique.sel.size).side

            puzzle.end = { pos, dir }
        }

        puzzle.map = await blitzkrieg.util.getMapObject(puzzle.origMapName)
        if (! puzzle.map) { throw new Error('puzzle.map is undefined') }
        
        if (puzzle.completion != 'item') {
            const name = 'exit'
            if (puzzle.type == 'whole room') {
                let closestDistance: number = 100000
                let closestEntity: MapEntity | undefined
                // check if there's a door near puzzle end
                for (const entity of puzzle.map.entities) {
                    const dist = Math.pow(entity.x - puzzle.end.pos.x, 2) + Math.pow(entity.y - puzzle.end.pos.y, 2)
                    
                    if (entity.type == 'Door' || entity.type == 'TeleportGround') {
                        if (dist < closestDistance) {
                            closestDistance = dist
                            closestEntity = entity
                        }
                    }
                }
                if (! closestEntity) { throw new Error('no doors found?') }
                puzzle.room.room.door = { name, pos: EntityPoint.fromVec(closestEntity),
                    dir: DirUtil.convertToDir(
                        // @ts-ignore settings.dir is always there
                        closestEntity.settings.dir
                )}
            } else if (puzzle.type == 'add walls') {
                puzzle.room.room.setDoor(name, puzzle.end.dir, EntityPoint.fromVec(puzzle.end.pos))
            }
            if (! puzzle.room.room.door) { throw new Error('puzzle exit door is not set') }
        }
        puzzle.tunnel.room = this.createTunnelRoom(puzzle.room.room, 'puzzleTunnel', puzzle.start.dir,
            puzzle.tunnel.size, false, DirUtil.flip(puzzle.start.dir), EntityPoint.fromVec(puzzle.end.pos), puzzle.type == 'add walls')
        this.addRoom(puzzle.tunnel.room)

        if (true) {
            const size: EntityPoint = battle.room.size.to(EntityPoint)
            const tunnelSize: EntityPoint = battle.tunnel.size.to(EntityPoint)

            const puzzleRoomFloorRect: EntityRect = puzzle.room.room.floorRect.to(EntityRect)

            const pos: EntityPoint = new EntityPoint(0, 0)
            if (DirUtil.isVertical(puzzle.start.dir)) {
                pos.x = puzzle.start.pos.x - size.x/2
            } else {
                pos.y = puzzle.start.pos.y - size.y/2
            }
            if (puzzle.type == 'whole room') {
                switch (puzzle.start.dir) {
                    case Dir.NORTH: pos.y = puzzle.start.pos.y - tunnelSize.x - size.y + tilesize; break
                    case Dir.EAST:  pos.x = puzzle.start.pos.x + tunnelSize.x - tilesize; break
                    case Dir.SOUTH: pos.y = puzzle.start.pos.y + tunnelSize.x - tilesize; break
                    case Dir.WEST:  pos.x = puzzle.start.pos.x - tunnelSize.x - size.x + tilesize; break
                }
            } else {
                switch (puzzle.start.dir) {
                    case Dir.NORTH: pos.y = puzzleRoomFloorRect.y - tunnelSize.x - size.y; break
                    case Dir.EAST:  pos.x = puzzleRoomFloorRect.x2 + tunnelSize.x; break
                    case Dir.SOUTH: pos.y = puzzleRoomFloorRect.y2 + tunnelSize.x; break
                    case Dir.WEST:  pos.x = puzzleRoomFloorRect.x - tunnelSize.x - size.x; break
                }
            }
            battle.room.room = new Room('battle', EntityRect.fromTwoPoints(pos, size), [true, true, true, true], battle.room.spacing, true)
            this.addRoom(battle.room.room)
        }
    }

    calculateBattleTunnel(dir: Dir) {
        const puzzle = this.puzzle
        const battle = this.battle

        if (! battle.room.room) { throw new Error('cannot calculate battle tunnel position') }
        if (dir == DirUtil.flip(puzzle.start!.dir)) { throw new Error('invalid battle tunnel dir input, conflicts with puzzle tunnel') }

        const prefPos: EntityPoint = new MapPoint(
            battle.room.room.floorRect.x + battle.room.room.floorRect.width/2,
            battle.room.room.floorRect.y + battle.room.room.floorRect.height/2
        ).to(EntityPoint)

        battle.tunnel.room = this.createTunnelRoom(battle.room.room, 'battleTunnel', dir, battle.tunnel.size, false, null, prefPos, true)
        this.addRoom(battle.tunnel.room)

        battle.tunnel.room.setDoor('entarence', dir)
    }

    async decideMapName(index: number) {
        this.pathParent = DungeonMapBuilder.basePath
        this.name = index.toString()
        this.path = this.pathParent + '/' + this.name
        const mapDisplayName: string = await getMapDisplayName(this.puzzle.map!)
        this.displayName = `${index.toString()} => ${mapDisplayName}`
    }
}


const mapNameToMapDisplayName: Map<string, string> = new Map<string, string>()

export async function getMapDisplayName(map: CCMap): Promise<string> {
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


/*
export async function generateRoom(puzzleSel, area, displayName, index, battleTunnelSide) {
    const roomConfig = {
        size: { width: 200, height: 200 },
        displayName,
        levels: 4,
        area,
        theme: 'adaptive',
        puzzle: { x: 80*tilesize, y: 80*tilesize, spacing: 3*tilesize },
        puzzleTunnel: { width: 5*tilesize, height: 5*tilesize },
        battleStartCond: 'tmp.battle1',
        battleDoneCond: 'map.battle1done',
        enemyGroup: 'battle1',
        battle: { width: 21*tilesize, height: 21*tilesize, spacing: 2*tilesize },
        battleTunnel: { width: 5*tilesize, height: 5*tilesize, side: battleTunnelSide },
    }

    return await buildRoom(puzzleSel, roomConfig, index)
}


async function buildRoom(puzzleSel, rc, mapIndex) {
    rc = ig.copy(rc)
    if (rc.theme == 'adaptive') {
        rc.theme = rouge.roomComponents.getThemeFromSel(puzzleSel)
    }

    const mapName = 'rouge/gen/' + mapIndex
    const nextMapName = 'rouge/gen/' + (mapIndex+1)
    const prevMapName = 'rouge/gen/' + (mapIndex-1)

    const condId = blitzkrieg.util.generateUniqueID()
    rc.battleStartCond = rc.battleStartCond + '_' + condId
    rc.battleDoneCond = rc.battleDoneCond + '_' + condId

    const tunnelQueue = []
    let map = rouge.roomComponents.getEmptyMap(rc.size.width, rc.size.height, rc.levels, rc.theme, rc.area)
    map.name = mapName

    const puzzleUniqueId = blitzkrieg.util.generateUniqueID()
    const puzzleUniqueSel = blitzkrieg.selectionCopyManager
        .createUniquePuzzleSelection(puzzleSel, rc.puzzle.x, rc.puzzle.y, puzzleUniqueId)

    const puzzleStartPosInRect = ig.copy(puzzleUniqueSel.data.startPos)
    const puzzleStartPosSide = puzzleSel.data.type == 'whole room' ?
        blitzkrieg.util.setToClosestSelSide(puzzleStartPosInRect, puzzleUniqueSel) :
        blitzkrieg.util.setToClosestRectSide(puzzleStartPosInRect, puzzleUniqueSel.size).side

    const puzzleEndPosInRect = ig.copy(puzzleUniqueSel.data.endPos)
    const puzzleEndPosSide = puzzleSel.data.type == 'whole room' ?
        blitzkrieg.util.setToClosestSelSide(puzzleEndPosInRect, puzzleUniqueSel) :
        blitzkrieg.util.setToClosestRectSide(puzzleEndPosInRect, puzzleUniqueSel.size).side

    
    let puzzleSolveCond, puzzleSolveCondUnique
    if (puzzleSel.data.completionType == 'normal') {
        puzzleSolveCond = blitzkrieg.puzzleSelectionManager.getPuzzleSolveCondition(puzzleSel)
        // console.log('puzzleSolution: ' + puzzleSolveCond)
    } else {
        puzzleSolveCond = 'map.puzzleSolution1'
    }
    puzzleSolveCondUnique = puzzleSolveCond
    if (! puzzleSolveCond.includes('_destroyed')) { puzzleSolveCondUnique += '_' + puzzleUniqueId }

    const puzzleMap = ig.copy(await blitzkrieg.util.getMapObject(puzzleSel.map))
    let closestX, closestY, foundAnyDoor = false, closestDoor = 1000000, puzzleExitDoor
    if (puzzleSel.data.type == 'whole room') {
        for (let i = 0; i < puzzleMap.entities.length; i++) {
            const e = puzzleMap.entities[i]
            if (e.type == 'Door' || e.type == 'TeleportGround') {
                const dist = Math.sqrt(Math.pow(e.x - puzzleSel.data.endPos.x, 2) + Math.pow(e.y - puzzleSel.data.endPos.y, 2))
                if (dist < closestDoor) {
                    closestDoor = dist
                    closestX = e.x
                    closestY = e.y
                }
            }
        }
    }
    // console.log('closestDoor: ', closestDoor)
    for (let i = 0; i < puzzleMap.entities.length; i++) {
        const e = puzzleMap.entities[i]
        if (e.type == 'Door' || e.type == 'TeleportGround') {
            if (puzzleSel.data.type == 'whole room' && closestDoor < 20*tilesize && e.x == closestX && e.y == closestY) {
                foundAnyDoor = true
                e.settings.condition = (puzzleSel.data.completionType == 'getTo' ? '' : puzzleSolveCond)
                e.settings.name = 'end'
                e.settings.marker = 'start'
                e.settings.map = nextMapName
                switch (e.settings.dir) {
                    case 'SOUTH': e.dir = 0; break
                    case 'WEST': e.dir = 1; break
                    case 'NORTH': e.dir = 2; break
                    case 'EAST': e.dir = 3; break
                }
                puzzleExitDoor = e
            } else {
                puzzleMap.entities.splice(i, 1)
                i--
            }
        }
    }

    const puzzleTunnelSides = puzzleStartPosSide % 2 == 0 ? [0,1,0,1] : [1,0,1,0]
    const puzzleExitCond = rc.battleStartCond + ' && !' + rc.battleDoneCond

    let puzzleRoomRect
    if (puzzleSel.data.type == 'whole room') {
        const ds = foundAnyDoor ? null : {
            side: puzzleEndPosSide,
            prefX: puzzleEndPosInRect.x,
            prefY: puzzleEndPosInRect.y,
            marker: 'end',
            destMarker: 'start',
            destMap: nextMapName,
            cond: (puzzleSel.data.completionType == 'getTo' ? '' : puzzleSolveCondUnique)
        }
        puzzleRoomRect = rouge.roomComponents
            .rectRoom(map, puzzleUniqueSel.size, rc.theme, -1, [1,1,1,1], ds, {
                name: 'puzzle',
                side: puzzleStartPosSide,
                pos: puzzleStartPosInRect,
                drawSides: puzzleTunnelSides,
                width: rc.puzzleTunnel.width,
                height: rc.puzzleTunnel.height,
                queue: tunnelQueue,
                exitCond: puzzleExitCond, 
                noNavMap: true,
            })
    } else if (puzzleSel.data.type == 'add walls') {
        puzzleRoomRect = rouge.roomComponents
            .rectRoom(map, puzzleUniqueSel.size, rc.theme, rc.puzzle.spacing, [1,1,1,1], {
                side: puzzleEndPosSide,
                prefX: puzzleEndPosInRect.x,
                prefY: puzzleEndPosInRect.y,
                marker: 'end',
                destMarker: 'start',
                destMap: nextMapName,
                cond: puzzleSolveCondUnique,
            }, {
                name: 'puzzle',
                side: puzzleStartPosSide,
                prefX: puzzleStartPosInRect.x,
                prefY: puzzleStartPosInRect.y,
                drawSides: puzzleTunnelSides,
                width: rc.puzzleTunnel.width,
                height: rc.puzzleTunnel.height,
                queue: tunnelQueue,
                exitCond: puzzleExitCond,
                noNavMap: true,
            })
    }
    const puzzleExitDoorPos = puzzleRoomRect.doorPos ? puzzleRoomRect.doorPos :
        { x: puzzleExitDoor.x, y: puzzleExitDoor.y, dir: puzzleExitDoor.dir }

    // blitzkrieg.msg('rouge', 'difficulty: ' + this.currentDifficulty, 1)
    // blitzkrieg.msg('rouge', 'level: ' + this.currentLevel, 1)

    if (puzzleSel.data.completionType == 'getTo' && puzzleSel.data.type == 'add walls') {
        const endPos = puzzleSel.data.endPos
        puzzleMap.entities.push(rouge.entitySpawn.floorSwitch(endPos.x, endPos.y, endPos.level, puzzleSolveCond))
    }

    let battleRoomX1, battleRoomY1
    if (puzzleStartPosSide % 2 == 0) {
        battleRoomX1 = puzzleStartPosInRect.x - rc.battle.width/2
    } else {
        battleRoomY1 = puzzleStartPosInRect.y - rc.battle.height/2
    }
    if (puzzleSel.data.type == 'whole room') {
        switch (puzzleStartPosSide) {
        case 0: battleRoomY1 = puzzleStartPosInRect.y - rc.puzzleTunnel.width - rc.battle.height + 16; break
        case 1: battleRoomX1 = puzzleStartPosInRect.x + rc.puzzleTunnel.width - 16; break
        case 2: battleRoomY1 = puzzleStartPosInRect.y + rc.puzzleTunnel.width - 16; break
        case 3: battleRoomX1 = puzzleStartPosInRect.x - rc.puzzleTunnel.width - rc.battle.width + 16; break
        }
    } else {
        switch (puzzleStartPosSide) {
        case 0: battleRoomY1 = puzzleRoomRect.y - rc.puzzleTunnel.width - rc.battle.height; break
        case 1: battleRoomX1 = puzzleRoomRect.x2 + rc.puzzleTunnel.width; break
        case 2: battleRoomY1 = puzzleRoomRect.y2 + rc.puzzleTunnel.width; break
        case 3: battleRoomX1 = puzzleRoomRect.x - rc.battle.width - rc.puzzleTunnel.width; break
        }
    }
    
    if (puzzleSel.data.type == 'whole room') {
        rouge.roomComponents.addWallsInEmptySpace(map, rc.theme, puzzleUniqueSel)
    }

    const { battleSel, barrierMap, tunnelSide: battleTunnelSide, roomSize: battleRoomRect } = generateBattleRoom(
        map, rc.theme, battleRoomX1, battleRoomY1, prevMapName, puzzleStartPosSide, rc, tunnelQueue)

    map = await blitzkrieg.selectionCopyManager
        .copySelToMap(map, puzzleMap, puzzleSel, rc.puzzle.x, rc.puzzle.y, mapName, {
            disableEntities: false,
            mergeLayers: false,
            removeCutscenes: true,
            makePuzzlesUnique: true,
            uniqueId: puzzleUniqueId,
            uniqueSel: puzzleUniqueSel,
        })

    const obj = await rouge.roomComponents.trimMap(map, rc.theme)
    map = obj.map

    blitzkrieg.util.setSelPos(puzzleUniqueSel, puzzleUniqueSel.size.x - obj.offset.x, puzzleUniqueSel.size.y - obj.offset.y)
    blitzkrieg.util.setSelPos(battleSel, battleSel.size.x - obj.offset.x, battleSel.size.y - obj.offset.y)

    blitzkrieg.puzzleSelections.selHashMap[mapName] = {
        sels: [ puzzleUniqueSel ],
        tempSel: { bb: [], map: mapName, data: {} },
        fileIndex: rouge.puzzleFileIndex,
    }

    blitzkrieg.battleSelections.selHashMap[map.name] = {
        sels: [ battleSel ],
        tempSel: { bb: [], map: map.name, data: {} },
        fileIndex: rouge.battleFileIndex,
    }

    puzzleRoomRect.x -= obj.offset.x
    puzzleRoomRect.y -= obj.offset.y
    battleRoomRect.x -= obj.offset.x
    battleRoomRect.y -= obj.offset.y

    const rects = []
    rects.push(puzzleRoomRect)
    rects.push(battleRoomRect)
    for (const tunnelName in barrierMap) {
        const rect = barrierMap[tunnelName].rect
        rect.x -= obj.offset.x
        rect.y -= obj.offset.y
        rects.push(rect)
    }

    map.displayName = await rc.displayName(puzzleMap)
    map.type = 'DUNGEON'

    map.stamps = []
    const stampDist = 64

    puzzleEndPosInRect.x -= obj.offset.x
    puzzleEndPosInRect.y -= obj.offset.y
    map.stamps.push(getMapStamp(rc.area, puzzleEndPosInRect, puzzleEndPosSide, puzzleEndPosSide))
    setPosToBehindStamp(puzzleEndPosInRect, puzzleEndPosSide, stampDist)
    map.stamps.push(getMapStamp(rc.area, puzzleEndPosInRect, 'ENEMY', puzzleEndPosSide))

    let entarenceDoorPos = barrierMap['battle1'].rect
    entarenceDoorPos = { x: entarenceDoorPos.doorPos.x - obj.offset.x, y: entarenceDoorPos.doorPos.y - obj.offset.y }
    map.stamps.push(getMapStamp(rc.area, entarenceDoorPos, battleTunnelSide, battleTunnelSide))
    setPosToBehindStamp(entarenceDoorPos, battleTunnelSide, stampDist)
    map.stamps.push(getMapStamp(rc.area, entarenceDoorPos, 'GREEN', battleTunnelSide))

    entarenceDoorPos.dir = (entarenceDoorPos.dir+2)%4
    map.doors = {
        entarence: entarenceDoorPos,
        exit: puzzleExitDoorPos,
    }

    return { map, rects, puzzleEndPosSide }
}

function setPosToBehindStamp(pos, side, dist) {
    switch (side) {
    case 0: pos.y += dist; break
    case 1: pos.x -= dist; break
    case 2: pos.y -= dist; break
    case 3: pos.x += dist; break
    }
}
*/
