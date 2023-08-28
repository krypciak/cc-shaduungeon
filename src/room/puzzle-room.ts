import { Dir, MapPoint, EntityRect, Rect, setToClosestSelSide, EntityPoint, DirUtil } from '../util/pos'
import { Blitzkrieg, Selection } from '../util/blitzkrieg'
import { Room, RoomIO, RoomIODoorLike, RoomPlaceOrder, RoomType } from './room'
import { assert } from '../util/misc'
import { MapDoorLike } from '../entity-spawn'
import { RoomIOTunnel, RoomIOTunnelClosed, RoomIOTunnelOpen } from './tunnel-room'

declare const blitzkrieg: Blitzkrieg

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
    roomSpacing: number
    sel: Selection
    usel: {
        id: number
        sel: Selection
        solveCondition?: string
        solveConditionUnique?: string
    }
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
    puzzle: PuzzleData
    primaryExit!: RoomIODoorLike
    primaryEntarence!: RoomIO

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
            roomSpacing: 3,
            sel: puzzleSel,
        }
        assert(puzzle.sel); assert(puzzle.roomSpacing); assert(puzzle.map);
        /* extract data from original puzzle selection */ {
        const id = blitzkrieg.util.generateUniqueID()
        const sel = blitzkrieg.selectionCopyManager
            .createUniquePuzzleSelection(puzzle.sel, 0, 0, id)

        let solveCondition: string | undefined
        let solveConditionUnique: string | undefined
        switch (puzzle.completion) {
            case PuzzleCompletionType.Normal:
                solveCondition = blitzkrieg.puzzleSelectionManager.getPuzzleSolveCondition(sel)
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
            if (solveCondition && solveCondition.includes('_destroyed')) { solveConditionUnique += '_' + id }
        }
        puzzle.usel = { id, sel, solveCondition, solveConditionUnique }

        puzzle.usel.sel.size = Rect.new(EntityRect, puzzle.usel.sel.size)
        } /* end */

        /* prepare for super() call */
        let spacing: number, placeOrder = RoomPlaceOrder.Room, wallSides: boolean[]
        if (puzzle.roomType == PuzzleRoomType.WholeRoom) {
            spacing = puzzle.roomSpacing
            placeOrder = RoomPlaceOrder.Room
            wallSides = [false, false, false, false]
        } else if (puzzle.roomType == PuzzleRoomType.AddWalls) {
            spacing = 3
            wallSides = [true, true, true, true]
        } else {
            throw new Error('not implemented')
        }
        /* end */
        super('puzzle', puzzle.usel.sel.size, wallSides, spacing, true, RoomPlaceOrder.Room, RoomType.Room)

        /* set start pos */ {
        const pos: Vec3  & { level: number } = ig.copy(puzzle.usel.sel.data.startPos)
        const dir: Dir = (puzzle.roomType == PuzzleRoomType.WholeRoom ?
            setToClosestSelSide(pos, puzzle.usel.sel) :
            Rect.new(EntityRect, puzzle.usel.sel.size).setToClosestRectSide(pos)).dir
        puzzle.start = { pos, dir }
        } /* end */
        /* set end pos */ {
        const pos: Vec3  & { level: number } = ig.copy(puzzle.usel.sel.data.endPos)
        const dir: Dir = (puzzle.roomType == PuzzleRoomType.WholeRoom ?
            setToClosestSelSide(pos, puzzle.usel.sel) :
            Rect.new(EntityRect, puzzle.usel.sel.size).setToClosestRectSide(pos)).dir

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

                    const dir: Dir = DirUtil.flip(DirUtil.convertToDir(closestTransporter.settings.dir))
                    this.primaryExit = RoomIODoorLike.fromReference(name, dir, newPos, closestTransporter)
                } else {
                    this.primaryExit = RoomIODoorLike.fromRoom('Door', this, name, puzzle.end.dir, EntityPoint.fromVec(puzzle.end.pos))
                }
            } else if (puzzle.roomType == PuzzleRoomType.AddWalls) {
                this.primaryExit = RoomIODoorLike.fromRoom('Door', this, name, puzzle.end.dir, EntityPoint.fromVec(puzzle.end.pos))
            }

            this.ios.push(this.primaryExit)
            this.primaryExit.tpr.condition = puzzle.usel.solveConditionUnique
        } else {
            throw new Error('not implemented')
        }
        assert(this.primaryExit, 'primary exit missing?')

        this.sel = puzzle.sel

        /* at this point all variables in PuzzleData are satisfied */
        assert(puzzle.roomType); assert(puzzle.completion); assert(puzzle.map); assert(puzzle.roomSpacing); assert(puzzle.usel)
        assert(puzzle.end); assert(puzzle.start)
        this.puzzle = puzzle as PuzzleData
    }

    offsetBy(offset: MapPoint): void {
        super.offsetBy(offset)
        const entityOffset: EntityPoint = offset.to(EntityPoint)
        Vec2.add(this.puzzle.start.pos, entityOffset)
        Vec2.add(this.puzzle.end.pos, entityOffset)
    }

    setEntarenceTunnel(closedTunnel: boolean, openSize: MapPoint, closedSize: MapPoint) {
        if (this.primaryEntarence) { throw new Error('cannot add entarence io twice') }
        const puzzle = this.puzzle
        /* create entarence io */
        const setPos = EntityPoint.fromVec(puzzle.start.pos)
        const preffedPos: boolean = puzzle.roomType == PuzzleRoomType.AddWalls
        const entIO: RoomIOTunnel = closedTunnel ? 
            new RoomIOTunnelClosed(this, puzzle.start.dir, closedSize, setPos, preffedPos) :
            new RoomIOTunnelOpen(this, puzzle.start.dir, openSize, DirUtil.flip(puzzle.start.dir), setPos, preffedPos)

        this.primaryEntarence = entIO
    }
}

