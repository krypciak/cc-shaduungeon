import { Dir, MapPoint, EntityRect, Rect, setToClosestSelSide, EntityPoint, DirUtil, MapRect, Point } from '@root/util/pos'
import { Selection, SelectionMapEntry } from '@root/types'
import { Room, RoomIO, RoomIODoorLike, RoomIOTpr, Tpr, } from '@root/room/room'
import { assert, assertBool } from '@root/util/misc'
import { MapChest, MapDestructible, MapDoorLike, MapEntity, MapEventTrigger, MapFloorSwitch, MapTeleportField, MapTransporter } from '@root/util/entity'
import { RoomIOTunnel, RoomIOTunnelClosed, RoomIOTunnelOpen } from '@root/room/tunnel-room'
import { MapBuilder, RoomPlaceVars } from '@root/room/map-builder'
import { ArmEnd, ArmRuntime } from '@root/dungeon/dungeon-arm'
import { ItemHandler } from './item-handler'

enum PuzzleRoomType {
    WholeRoom,
    AddWalls,
}

enum PuzzleCompletionType {
    Normal,
    GetTo,
    Item,
}

interface PuzzleData {
    roomType: PuzzleRoomType
    completion: PuzzleCompletionType
    map: sc.MapModel.Map
    sel: Selection
    usel: {
        id: number
        sel: Selection
        solveCondition?: string
        solveConditionUnique?: string
    }
    finishCondition: string
    end: {
        pos: Vec3 & { level: number },
        dir: Dir,
    }
    start: {
        pos: Vec3 & { level: number },
        dir: Dir,
    }
}

export class PuzzleRoom extends Room {
    static puzzleMap: ReadonlyMap<string, Readonly<Readonly<Selection>[]>>
    static puzzleList: Readonly<Readonly<Selection>[]>

    static async preloadPuzzleList() {
        if (! PuzzleRoom.puzzleMap) {
            const puzzleMap = new Map<string, Readonly<Selection>[]>
            const puzzleList: Readonly<Selection>[] = []
            PuzzleRoom.puzzleList = []
            for (const mapName in blitzkrieg.puzzleSelections.selHashMap) {
                const entry: SelectionMapEntry = blitzkrieg.puzzleSelections.selHashMap[mapName]
                /* entry is from blitzkrieg puzzle list */
                if (entry.fileIndex == 0 && entry.sels.length > 0) {
                    const filtered: Readonly<Selection>[] = entry.sels.filter((sel) => sel.data.type != 'dis').map(e => Object.freeze(e))
                    puzzleMap.set(mapName, filtered)
                    for (const sel of filtered) { puzzleList.push(Object.freeze(sel)) }
                }
            }
            PuzzleRoom.puzzleMap = Object.freeze(puzzleMap)
            PuzzleRoom.puzzleList = Object.freeze(puzzleList)
        }
    }

    puzzle: PuzzleData
    primaryExit!: RoomIOTpr
    primaryEntarence!: RoomIO
    origExit!: RoomIOTpr

    private oldFC?: string

    private preplaceFuncionsEntries = [{ order: 0, func: function(this: PuzzleRoom, arm: ArmRuntime, builder: MapBuilder) {
        assert(this.isArmEnd)
        if (this.isArmEnd) {
            this.primaryExit.tpr.noPlace = true
            const origTpr = this.origExit.tpr
            if (origTpr.entity) {
                origTpr.entityCondition = 'false'
                origTpr.destMap = 'none'
                origTpr.destMarker = 'none'
                origTpr.noPlace = true
                this.ios.push(Object.assign(this.origExit, { toDelete: true }))
            }
            if (arm.end == ArmEnd.Item) {
                this.oldFC = this.puzzle.finishCondition
                this.puzzle.finishCondition = this.primaryExit.tpr.condition = `maps.${builder.path!}.puzzleFinished`
            }
        }
    }}]

    constructor(
        puzzleSel: Selection,
        puzzleMap: sc.MapModel.Map,
        public enterCondition: string,
    ) {
        let roomType: PuzzleRoomType
        switch (puzzleSel.data.type!) {
            case 'whole room': roomType = PuzzleRoomType.WholeRoom; break
            case 'add walls': roomType = PuzzleRoomType.AddWalls; break
            case 'dis': throw new Error('how did a disabled puzzle get here')
        }
        let completionType: PuzzleCompletionType
        switch (puzzleSel.data.completionType!) {
            case 'normal': completionType = PuzzleCompletionType.Normal; break
            case 'getTo': completionType = PuzzleCompletionType.GetTo; break
            case 'item': completionType = PuzzleCompletionType.Item; break
        }

        const puzzle: Partial<PuzzleData> = {
            roomType,
            completion: completionType,
            map: puzzleMap,
            sel: puzzleSel,
        }
        assert(puzzle.sel); assert(puzzle.map);
        /* extract data from original puzzle selection */ {
        const id = blitzkrieg.util.generateUniqueID()
        const sel = blitzkrieg.selectionCopyManager
            .createUniquePuzzleSelection(puzzle.sel, 0, 0, id)

        let solveCondition: string | undefined
        let solveConditionUnique: string | undefined
        switch (puzzle.completion) {
            case PuzzleCompletionType.Normal:
                solveCondition = blitzkrieg.puzzleSelectionManager.getPuzzleSolveCondition(puzzle.sel)
                break
            case PuzzleCompletionType.GetTo:
                if (puzzle.roomType == PuzzleRoomType.WholeRoom) {
                    solveCondition = ''
                } else if (puzzle.roomType == PuzzleRoomType.AddWalls) {
                    solveCondition = 'map.puzzleSolution1'; break
                }
            case PuzzleCompletionType.Item:
                solveCondition = undefined
        }
        if (solveCondition) {
            solveConditionUnique = solveCondition
            if (solveCondition && ! solveCondition.includes('_destroyed')) { solveConditionUnique += '_' + id }
        }
        sel.size = Rect.new(EntityRect, sel.size)
        puzzle.usel = { id, sel, solveCondition, solveConditionUnique }
        } /* end */

        /* prepare for super() call */
        let wallSides: boolean[], roomRect: MapRect
        if (puzzle.roomType == PuzzleRoomType.WholeRoom) {
            wallSides = [false, false, false, false]
            roomRect = puzzle.usel.sel.size.to(MapRect)
        } else if (puzzle.roomType == PuzzleRoomType.AddWalls) {
            wallSides = [true, true, true, true]
            roomRect = puzzle.usel.sel.size.to(MapRect)
            roomRect.extend(3)
        } else { throw new Error('not implemented') }
        /* end */
        super('puzzle', roomRect, wallSides)

        /* set start pos */ {
        const pos: Vec3  & { level: number } = ig.copy(puzzle.usel.sel.data.startPos)
        const dir: Dir = (puzzle.roomType == PuzzleRoomType.WholeRoom ?
            setToClosestSelSide(pos, puzzle.usel.sel) :
            Rect.new(EntityRect, this).setToClosestRectSide(pos)).dir
        puzzle.start = { pos, dir }
        } /* end */
        /* set end pos */ {
        const pos: Vec3  & { level: number } = ig.copy(puzzle.usel.sel.data.endPos)
        const dir: Dir = (puzzle.roomType == PuzzleRoomType.WholeRoom ?
            setToClosestSelSide(pos, puzzle.usel.sel) :
            Rect.new(EntityRect, this).setToClosestRectSide(pos)).dir

        puzzle.end = { pos, dir }
        } /* end */

        /* figure out exit io */
        if (puzzle.completion != PuzzleCompletionType.Item) {
            const name = 'exit'
            if (puzzle.roomType == PuzzleRoomType.WholeRoom) {
                let closestDistance: number = 100000
                let closestTransporter: MapDoorLike | undefined
                // check if there's a door near puzzle end
                for (const entity of puzzle.map.entities) {
                    if (MapDoorLike.check(entity)) {
                        const dist: number = Math.sqrt(Math.pow(entity.x - puzzle.sel.data.endPos.x, 2) + Math.pow(entity.y - puzzle.sel.data.endPos.y, 2))
                        if (dist < 200 && dist < closestDistance) {
                            closestDistance = dist
                            closestTransporter = entity
                        }
                    }
                }
                if (closestTransporter) {
                    // console.log('door dist:', closestDistance)

                    const newPos: EntityPoint = EntityPoint.fromVec(closestTransporter)
                    Vec2.sub(newPos, puzzle.sel.size)

                    let dir: Dir = DirUtil.flip(DirUtil.convertToDir(closestTransporter.settings.dir))
                    if (closestTransporter.type == 'TeleportGround') {
                        dir = DirUtil.flip(dir) /* TeleportGround dir is the opposite of the door for whatever reason */
                    }

                    this.origExit = RoomIODoorLike.fromReference(name, dir, newPos, closestTransporter, puzzle.usel.solveCondition)
                } else {
                    this.origExit = RoomIODoorLike.fromRoom('Door', this, name, puzzle.end.dir, EntityPoint.fromVec(puzzle.end.pos))
                }
            } else if (puzzle.roomType == PuzzleRoomType.AddWalls) {
                this.origExit = RoomIODoorLike.fromRoom('Door', this, name, puzzle.end.dir, EntityPoint.fromVec(puzzle.end.pos))
            }

            this.origExit.tpr.condition = puzzle.usel.solveConditionUnique
        } else {
            throw new Error('not implemented')
        }
        assert(this.origExit, 'primary exit missing?')

        this.sel = { sel: puzzle.usel.sel, poolName: 'puzzle' }

        puzzle.finishCondition = this.origExit.tpr.condition

        /* at this point all variables in PuzzleData are satisfied */
        assert(puzzle.roomType); assert(puzzle.completion); assert(puzzle.map); assert(puzzle.usel)
        assert(puzzle.end); assert(puzzle.start)
        this.puzzle = puzzle as PuzzleData

        this.preplaceFunctions.push(...this.preplaceFuncionsEntries)
    }

    offsetBy(offset: MapPoint): void {
        super.offsetBy(offset)
        const entityOffset: EntityPoint = offset.to(EntityPoint)
        Vec2.add(this.puzzle.start.pos, entityOffset)
        Vec2.add(this.puzzle.end.pos, entityOffset)
    }

    setEntarenceTunnel(closedTunnel: boolean, sizeOrig: MapPoint) {
        if (this.primaryEntarence) { throw new Error('cannot add entarence io twice') }
        const puzzle = this.puzzle
        /* create entarence io */
        const setPos = EntityPoint.fromVec(puzzle.start.pos)
        const dir = puzzle.start.dir
        const size: MapPoint = sizeOrig.copy()

        const preffedPos: boolean = puzzle.roomType == PuzzleRoomType.AddWalls
        if (! preffedPos) {
            const sidePos: EntityPoint = setPos.copy()
            this.to(EntityRect).setPosToSide(sidePos, dir)
            const distEntity: number = Vec2.distance(sidePos, setPos)
            const dist: number = distEntity / (EntityRect.multiplier / MapRect.multiplier)
            size.y += dist
        }
        const entIO: RoomIOTunnel = closedTunnel ? 
            new RoomIOTunnelClosed(this, dir, size, setPos, preffedPos) :
            new RoomIOTunnelOpen(this, dir, size, DirUtil.flip(dir), setPos, preffedPos)

        this.primaryEntarence = entIO
        this.ios.push(this.primaryEntarence)
    }

    pushExit(isEnd: boolean) {
        this.ios = this.ios.filter(io => ! io.toDelete)
        if (isEnd) {
            const oldTpr: Tpr = this.origExit.getTpr()
            this.primaryExit = new RoomIOTpr(Tpr.get('puzzle-exit-to-arm', oldTpr.dir,
                EntityPoint.fromVec(this.puzzle.usel.sel.data.endPos), 'TeleportField', true, this.puzzle.finishCondition))
            if (oldTpr.entity) {
                oldTpr.entity.settings.condition = 'false'
                oldTpr.destMap = 'none'
                oldTpr.destMarker = 'none'
            }
        } else {
            this.primaryExit = this.origExit
        }
        this.ios.push(Object.assign(this.primaryExit, { toDelete: true }))
    }

    async place(rpv: RoomPlaceVars, arm: ArmRuntime): Promise<RoomPlaceVars | void> {
        const puzzle = this.puzzle
        puzzle.usel.sel.map = rpv.map.name
        rpv = await super.place(rpv, arm) ?? rpv

        if (puzzle.roomType == PuzzleRoomType.WholeRoom) {
            this.placeWallsInEmptySpace(rpv, puzzle.usel.sel)
        }

        if (dnggen.debug.pastePuzzle) {
            /* delete all tprs other than the optional tpr (when whole room) */
            puzzle.map = ig.copy(puzzle.map)
            const keepArr: MapEntity[] = []
            if (this.primaryExit.tpr.entity) { keepArr.push(this.primaryExit.tpr.entity) }
            /* remove some unwanted entities */
            puzzle.map.entities = puzzle.map.entities.filter(e => {
                if (MapTransporter.check(e)) {
                    if (e.settings.condition == 'false') { return true }
                    for (const e1 of keepArr) {
                        if (e.x == e1.x && e.y == e1.y) { return true }
                    }
                    return false
                } else if (MapEventTrigger.check(e)) {
                    /* remove all dialog event triggers */
                    for (const event of (e as MapEventTrigger).settings.event ?? []) {
                        if (event.type == 'START_PRIVATE_MSG') {
                            return false
                        }
                    }
                    return true
                } else if (MapDestructible.check(e)) {
                    if (e.settings.desType == 'keyPillar' || e.settings.desType == 'keyPillarAR') { return false }
                    return true
                } else if (MapChest.check(e)) {
                    return false
                } else {
                    return true
                }
            });

            const pastePos: EntityPoint = EntityPoint.fromVec(puzzle.usel.sel.size)
            const map: sc.MapModel.Map = await blitzkrieg.selectionCopyManager
                .copySelToMap(ig.copy(rpv.map), puzzle.map, puzzle.sel, pastePos.x, pastePos.y, rpv.map.name, {
                    disableEntities: false,
                    mergeLayers: false,
                    removeCutscenes: true,
                    makePuzzlesUnique: true,
                    uniqueId: puzzle.usel.id,
                    uniqueSel: puzzle.usel.sel,
                });
            rpv = RoomPlaceVars.fromRawMap(map, rpv.theme, rpv.areaInfo)

            const endPos = puzzle.usel.sel.data.endPos
            const endPosVec: EntityPoint = EntityPoint.fromVec(endPos)
            assert(this.isArmEnd)
            if (this.isArmEnd) {
                if (arm.end == ArmEnd.Item) {
                    const chestPos = endPosVec.copy()
                    Point.moveInDirection(chestPos, DirUtil.flip(this.primaryExit.tpr.dir), 24)
                    if (DirUtil.isVertical(this.primaryExit.tpr.dir)) {
                        chestPos.x += 3
                    }
                    const chestE: MapChest = ItemHandler.get(rpv.areaInfo, arm.itemType, 'puzzle-exit-item', chestPos, endPos.level, this.oldFC)
                    const triggerCond = 'map.chest_' + chestE.settings.mapId
                    rpv.entities.push(chestE)

                    const eventTriggerPos: EntityPoint = endPosVec.copy()
                    Point.moveInDirection(eventTriggerPos, this.primaryExit.tpr.dir, 24)
                    const eventTrigger: MapEventTrigger = MapEventTrigger.new(eventTriggerPos, rpv.masterLevel,
                    'eventTriggerTurnOnTeleportField', 'PARALLEL', triggerCond, 'ONCE', 'true', [
                        { ignoreSlowDown: false, type: 'WAIT', time: 0.5 },
                        {
                            changeType: 'set',
                            type: 'CHANGE_VAR_BOOL',
                            varName: puzzle.finishCondition,
                            value: true,
                        },
                    ])
                    rpv.entities.push(eventTrigger)
                }
                assertBool(this.primaryExit.tpr.entityType == 'TeleportField')
                this.primaryExit.tpr.condition = puzzle.finishCondition
                const entity: MapTeleportField = Room.placeTpr(rpv, this.primaryExit.tpr) as MapTeleportField
                entity.level = endPos.level
            }
     
            if (puzzle.completion == PuzzleCompletionType.GetTo && puzzle.roomType == PuzzleRoomType.AddWalls) {
                assert(puzzle.usel.solveConditionUnique)
                rpv.entities.push(MapFloorSwitch.new(endPosVec, endPos.level, 'puzzleSolveSwitch', puzzle.usel.solveConditionUnique))
            }
        }

        return rpv
    }
}

