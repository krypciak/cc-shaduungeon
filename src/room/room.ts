import { MapDoor, MapDoorLike, MapTransporter } from '../entity-spawn'
import { Blitzkrieg, Selection } from '../util/blitzkrieg'
import { Coll } from '../util/map'
import { Point, Rect, Dir, DirUtil, MapPoint, MapRect, EntityRect, EntityPoint, Dir3d } from '../util/pos'
import { assert, round } from '../util/misc'
import { RoomPlaceVars } from './map-builder'

const tilesize: number = 16
declare const blitzkrieg: Blitzkrieg

export function getPosOnRectSide<T extends Point>(init: new (x: number, y: number) => T, dir: Dir, rect: Rect, prefPos?: T): T {
    const pos: T = new init(0, 0)
    switch (dir) {
        case Dir.NORTH: pos.y = rect.y - tilesize;  break
        case Dir.EAST:  pos.x = rect.x2() + tilesize; break
        case Dir.SOUTH: pos.y = rect.y2() + tilesize; break
        case Dir.WEST: pos.x = rect.x - tilesize; break
    }
    if (DirUtil.isVertical(dir)) {
        pos.x = prefPos ? prefPos.x : (rect.x + (rect.x2() - rect.x)/2)
    } else {
        pos.y = prefPos ? prefPos.y : (rect.y + (rect.y2() - rect.y)/2)
    }

    return pos
}

export namespace Tpr {
    export function get(name: string, dir: Dir3d, pos: EntityPoint, entityType: MapTransporter.Types, condition?: string): Tpr {
        return { name, dir, pos, entityType, condition }
    }
    export function getReference(name: string, dir: Dir3d, pos: EntityPoint, mtpr: MapTransporter, condition?: string): Tpr {
        return { name, dir, pos, entityType: mtpr.type as MapTransporter.Types, entity: mtpr, entityCondition: condition }
    }
}

export interface Tpr {
    name: string
    entityType: MapTransporter.Types
    pos: EntityPoint
    dir: Dir3d
    condition?: string
    /* this is only set to a reference to a MapTransporter in the puzzle room (if puzzle type is 'whole room') */
    entity?: MapTransporter
    entityCondition?: string /* only set when entity is set */
    /* set after place */
    destMap?: string
    destMarker?: string
}
export interface TprDoorLike extends Tpr {
    entityType: MapDoorLike.Types
    entity?: MapDoorLike
}

// IO: in-out
export interface RoomIO {
    getTpr(): Tpr
}

export class RoomIOTpr implements RoomIO {
    constructor(public tpr: Tpr) {}

    getTpr(): Tpr { return this.tpr }
}
export class RoomIODoorLike extends RoomIOTpr {
    constructor(tpr: TprDoorLike) {
        super(tpr)
    }
    static fromRoom(type: MapDoorLike.Types, room: Room, name: string, dir: Dir, prefPos?: EntityPoint): RoomIODoorLike {
        return new RoomIODoorLike(room.getDoorLikeTpr(type, name, dir, prefPos))
    }
    static fromReference(name: string, dir: Dir, pos: EntityPoint, doorLike: MapDoorLike, condition: string = ''): RoomIODoorLike {
        return new RoomIODoorLike(Tpr.getReference(name, DirUtil.dirToDir3d(dir), pos, doorLike, condition) as TprDoorLike)

    }
}

export class Room extends MapRect {
    private addWalls: boolean
    index?: number
    sel?: Selection
    ios: RoomIO[] = []
    primaryEntarence!: RoomIO
    primaryExit?: RoomIO

    constructor(
        public name: string,
        rect: Rect,
        public wallSides: boolean[],
        public addNavMap: boolean = true,
        public placeOrder: RoomPlaceOrder = RoomPlaceOrder.Room,
        public type: RoomType = RoomType.Room,
    ) {
        const mapRect = rect.to(MapRect)
        super(mapRect.x, mapRect.y, mapRect.width, mapRect.height)
        this.addWalls = false
        for (const addSide of this.wallSides) {
            if (addSide) { this.addWalls = true; break }
        }
    }

    offsetBy(offset: MapPoint) {
        offset = offset.copy()
        Vec2.add(this, offset)
        const roundDiff: Vec2 = Vec2.create(this)
        const newPos = Vec2.createC(round(this.x), round(this.y))
        Vec2.sub(roundDiff, newPos)
        Vec2.sub(offset, roundDiff)
        Vec2.sub(this, roundDiff)

        const entityOffset: EntityPoint = offset.to(EntityPoint)

        if (this.sel) {
            const newPos: EntityPoint = EntityPoint.fromVec(this.sel.size)
            Vec2.add(newPos, entityOffset)
            blitzkrieg.util.setSelPos(this.sel, newPos.x, newPos.y)
        }
        this.ios.forEach(io => {
            if (io instanceof RoomIOTpr) {
                Vec2.add(io.tpr.pos, entityOffset)
            }
        })
    }

    getDoorLikeTpr(type: MapDoorLike.Types, name: string, dir: Dir, prefPos?: EntityPoint): TprDoorLike {
        const doorPos: EntityPoint = getPosOnRectSide(EntityPoint, dir, this.to(EntityRect), prefPos)

        if (DirUtil.isVertical(dir)) { doorPos.x -= tilesize } else { doorPos.y -= tilesize }
        if (dir == Dir.SOUTH) { doorPos.y -= tilesize }
        if (dir == Dir.EAST) { doorPos.x -= tilesize }

        return Tpr.get(name, DirUtil.dirToDir3d(dir), doorPos, type) as TprDoorLike
    }

    pushAllRooms(arr: Room[]) {
        arr.push(this)
        this.ios.forEach(io => {
            // @ts-expect-error cant import RoomIOTunnel because of a circular dependency so im doing this
            if (io.tunnel) { arr.push(io.tunnel) }
        })
    }

    // place functions
    
    async place(rpv: RoomPlaceVars): Promise<RoomPlaceVars | void> {
        if (this.placeOrder == RoomPlaceOrder.NoPlace) { return }
        this.placeRoom(rpv, this.addNavMap)
        this.placeTprs(rpv)
    }

    private placeTprs(rpv: RoomPlaceVars) {
        for (const io of this.ios) {
            if (io instanceof RoomIOTpr) {
                const tpr = io.getTpr()
                if (tpr.entity) {
                    const s = tpr.entity.settings
                    s.name = tpr.name
                    s.map = tpr.destMap!
                    s.marker = tpr.destMarker!
                    s.condition = tpr.entityCondition!
                    continue
                }
                let e: MapTransporter
                assert(tpr.destMap); assert(tpr.destMarker)
                switch (tpr.entityType) {
                    case 'Door':
                        e = MapDoor.new(tpr.pos, rpv.masterLevel, DirUtil.dir3dToDir(tpr.dir), tpr.name, tpr.destMap, tpr.destMarker, tpr.condition)
                        break
                    case 'TeleportGround': throw new Error('not implemented')
                    case 'TeleportField': throw new Error('not implemented')
                    default: throw new Error('not implemented')
                }
                rpv.entities.push(e)
            }
        }
    }

    placeRoom(rpv: RoomPlaceVars, addNavMap: boolean) {
        if (this.addWalls) {
            // draw floor
            for (let y = this.y; y < this.y2(); y++) {
                for (let x = this.x; x < this.x2(); x++) {
                    rpv.background[y][x] = rpv.tc.floorTile
                    if (rpv.tc.addShadows) { rpv.shadow![y][x] = 0 }
                    for (const coll of rpv.colls) { coll[y][x] = 0 }
                    rpv.light[y][x] = 0
                    if (addNavMap) { for (const nav of rpv.navs) { nav[y][x] = 1 } }
                }
            }

            if (this.wallSides[Dir.NORTH]) {
                for (let x = this.x; x < this.x2(); x++) {
                    this.placeWall(rpv, new MapPoint(x, this.y), Dir.NORTH)
                }
            } else if (rpv.tc.addShadows) {
                blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.edgeShadowBottomLeft!, this.x, this.y - 2)
                blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.edgeShadowBottomRight!, this.x2() - 2, this.y - 2)
                for (let x = this.x + 2; x < this.x2() - 2; x++) {
                    for (let y = this.y - 2; y < this.y; y++) {
                        rpv.shadow![y][x] = 0
                    }
                }
            }

            if (this.wallSides[Dir.EAST]) {
                for (let y = this.y; y < this.y2(); y++) {
                    this.placeWall(rpv, new MapPoint(this.x2(), y), Dir.EAST)
                }
            } else if (rpv.tc.addShadows) {
                blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.edgeShadowTopLeft!, this.x2(), this.y)
                blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.edgeShadowBottomLeft!, this.x2(), this.y2() - 2)
                for (let y = this.y + 2; y < this.y2() - 2; y++) {
                    for (let x = this.x2(); x < this.x2() + 2; x++) {
                        rpv.shadow![y][x] = 0
                    }
                }
            }

            if (this.wallSides[Dir.SOUTH]) {
                for (let x = this.x; x < this.x2(); x++) {
                    this.placeWall(rpv, new MapPoint(x, this.y2()), Dir.SOUTH)
                }
            } else if (rpv.tc.addShadows) {
                blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.edgeShadowTopLeft!, this.x, this.y2())
                blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.edgeShadowTopRight!, this.x2() - 2, this.y2())
                for (let x = this.x + 2; x < this.x2() - 2; x++) {
                    for (let y = this.y2(); y < this.y2() + 2; y++) {
                        rpv.shadow![y][x] = 0
                    }
                }
            }
            
            if (this.wallSides[Dir.WEST]) {
                for (let y = this.y; y < this.y2(); y++) {
                    this.placeWall(rpv, new MapPoint(this.x, y), Dir.WEST)
                }
            } else if (rpv.tc.addShadows) {
                blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.edgeShadowTopRight!, this.x - 2, this.y)
                blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.edgeShadowBottomRight!, this.x - 2, this.y2() - 2)
                for (let y = this.y + 2; y < this.y2() - 2; y++) {
                    for (let x = this.x - 2; x < this.x; x++) {
                        rpv.shadow![y][x] = 0
                    }
                }
            }


            if (rpv.tc.addShadows) {
                // fix shadow corners
                if (this.wallSides[Dir.NORTH] && this.wallSides[Dir.WEST]) {
                    blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.cornerShadowTopLeft!, this.x, this.y)
                }
                if (this.wallSides[Dir.NORTH] && this.wallSides[Dir.EAST]) {
                    blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.cornerShadowTopRight!, this.x2() - 2, this.y)
                }
                if (this.wallSides[Dir.SOUTH] && this.wallSides[Dir.WEST]) {
                    blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.cornerShadowBottomLeft!, this.x, this.y2() - 2)
                }
                if (this.wallSides[Dir.SOUTH] && this.wallSides[Dir.EAST]) {
                    blitzkrieg.util.parseArrayAt2d(rpv.shadow!, rpv.tc.cornerShadowBottomRight!, this.x2() - 2, this.y2() - 2)
                }
            }
        

            if (rpv.tc.addLight) {
                assert(rpv.tc.lightStep); assert(rpv.tc.lightTile);
                const distFromWall = 5
                const lx1 = this.x + distFromWall - 1
                const ly1 = this.y + distFromWall - 1
                const lx2 = this.x2() - distFromWall
                const ly2 = this.y2() - distFromWall

                const mx = Math.floor(lx1 + (lx2 - lx1)/2)
                const my = Math.floor(ly1 + (ly2 - ly1)/2)
                rpv.light[my][mx] = rpv.tc.lightTile

                for (let x = lx1; x <= mx; x += rpv.tc.lightStep) {
                    for (let y = ly1; y <= my; y += rpv.tc.lightStep) { rpv.light[y][x] = rpv.tc.lightTile }
                    for (let y = ly2; y >= my; y -= rpv.tc.lightStep) { rpv.light[y][x] = rpv.tc.lightTile }
                    rpv.light[my][x] = rpv.tc.lightTile
                }
                for (let x = lx2; x >= mx; x -= rpv.tc.lightStep) {
                    for (let y = ly1; y <= my; y += rpv.tc.lightStep) { rpv.light[y][x] = rpv.tc.lightTile }
                    for (let y = ly2; y >= my; y -= rpv.tc.lightStep) { rpv.light[y][x] = rpv.tc.lightTile }
                    rpv.light[my][x] = rpv.tc.lightTile
                }

                for (let y = ly1; y <= ly2; y += rpv.tc.lightStep) { rpv.light[y][mx] = rpv.tc.lightTile }
                for (let y = ly2; y >= my; y -= rpv.tc.lightStep) { rpv.light[y][mx] = rpv.tc.lightTile }
            }
        }
    }

    placeWall(rpv: RoomPlaceVars, pos: MapPoint, dir: Dir): void {
        switch (dir) {
            case Dir.NORTH: {
                for (let i = 0; i < rpv.tc.wallUp.length; i++) {
                    const y = pos.y - i + 1
                    if (rpv.tc.wallUp[i]) {
                        rpv.background[y][pos.x] = rpv.tc.wallUp[i]
                    }
                    if (rpv.tc.addShadows && rpv.tc.wallUpShadow![i]) { rpv.shadow![y][pos.x] = rpv.tc.wallUpShadow![i] }
                }
                for (let i = rpv.masterLevel; i < rpv.colls.length; i++) {
                    const ri = i - rpv.masterLevel
                    const coll: number[][] = rpv.colls[i]
                    for (let y = pos.y - 3; y <= pos.y; y++) {
                        coll[y - ri*2][pos.x] = Coll.None
                    }
                    let y: number = pos.y - ri*2 - 1
                    coll[y][pos.x] = Coll.Wall
                }
                break
            }
            case Dir.EAST: {
                for (let i = 0; i < rpv.tc.wallRight.length; i++) {
                    const x = pos.x - rpv.tc.wallRight.length + i + 1
                    if (rpv.tc.wallRight[i]) {
                        if (! rpv.background[pos.y][x]) { rpv.background[pos.y][x] = rpv.tc.wallRight[i] }

                        for (const coll of rpv.colls) {
                            coll[pos.y][x] = Coll.Wall
                            coll[pos.y][x + 1] = Coll.Wall
                        }
                    }
                    if (rpv.tc.addShadows && rpv.tc.wallRightShadow![i]) { rpv.shadow![pos.y][x] = rpv.tc.wallRightShadow![i] }
                }
                break
            }
            case Dir.SOUTH: {
                for (let i = 0; i < rpv.tc.wallDown.length; i++) {
                    const y = pos.y - rpv.tc.wallDown.length + i + 1
                    if (rpv.tc.wallDown[i]) {
                        rpv.background[y][pos.x] = rpv.tc.wallDown[i]
                    }
                    if (rpv.tc.addShadows && rpv.tc.wallDownShadow![i]) { rpv.shadow![y][pos.x] = rpv.tc.wallDownShadow![i] }
                }
                for (let i = rpv.masterLevel; i < rpv.colls.length; i++) {
                    const ri = i - rpv.masterLevel
                    const coll: number[][] = rpv.colls[i]
                    for (let y = pos.y; y >= pos.y - 3; y--) {
                        coll[y - ri*2][pos.x] = Coll.None
                    }
                    const y: number = pos.y - ri*2
                    coll[y][pos.x] = Coll.Wall
                }
                break
            }
            case Dir.WEST: {
                for (let i = 0; i < rpv.tc.wallLeft.length; i++) {
                    const x = pos.x + i - 1
                    if (rpv.tc.wallLeft[i]) {
                        if (! rpv.background[pos.y][x]) { 
                            rpv.background[pos.y][x] = rpv.tc.wallLeft[i]
                        }
                        for (const coll of rpv.colls) {
                            coll[pos.y][x] = Coll.Wall
                            coll[pos.y][x - 1] = Coll.Wall
                        }
                    }
                    if (rpv.tc.addShadows && rpv.tc.wallLeftShadow![i]) { rpv.shadow![pos.y][x] = rpv.tc.wallLeftShadow![i] }
                }
                break
            }
        }
    }

    placeWallsInEmptySpace(rpv: RoomPlaceVars, sel: Selection) {
        const mcollCopy: number[][] = ig.copy(rpv.colls[rpv.masterLevel])
        const additional = 0
        for (const bb of sel.bb) {
            const rect: MapRect = Rect.new(EntityRect, bb).to(MapRect)
            rect.width--
            rect.height--

            for (let y = rect.y; y < rect.y2() + 1; y++) {
                if (mcollCopy[y][rect.x] == Coll.None || mcollCopy[y][rect.x] == Coll.Floor) {
                    for (let y3 = y - additional; y3 < y + additional + 1; y3++) {
                        const point: MapPoint = new MapPoint(rect.x, y3)
                        const checkPoint: MapPoint = MapPoint.fromVec(point)
                        checkPoint.x -= 1/tilesize
                        if (! blitzkrieg.puzzleSelections.isSelInPos(sel, checkPoint.to(EntityPoint))) {
                            this.placeWall(rpv, point, Dir.WEST)
                        }
                    }
                }
                if (mcollCopy[y][rect.x2()] == Coll.None || mcollCopy[y][rect.x2()] == Coll.Floor) {
                    for (let y3 = y - additional; y3 < y + additional + 1; y3++) {
                        const point: MapPoint = new MapPoint(rect.x2() + 1, y3)
                        const checkPoint: MapPoint = MapPoint.fromVec(point)
                        checkPoint.x += 1/tilesize
                        if (! blitzkrieg.puzzleSelections.isSelInPos(sel, checkPoint.to(EntityPoint))) {
                            this.placeWall(rpv, point, Dir.EAST)
                        }
                    }
                }
            }

            for (let x = rect.x; x < rect.x2() + 1; x++) {
                if (mcollCopy[rect.y][x] == Coll.None || mcollCopy[rect.y][x] == Coll.Floor) {
                    for (let x3 = x - additional; x3 < x + additional + 1; x3++) {
                        const point: MapPoint = new MapPoint(x3, rect.y)
                        const checkPoint: MapPoint = MapPoint.fromVec(point)
                        checkPoint.y -= 1/tilesize
                        if (! blitzkrieg.puzzleSelections.isSelInPos(sel, checkPoint.to(EntityPoint))) {
                            this.placeWall(rpv, point, Dir.NORTH)
                        }
                    }
                }
                if (mcollCopy[rect.y2()][x] == Coll.None || mcollCopy[rect.y2()][x] == Coll.Floor) {
                    for (let x3 = x - additional; x3 < x + additional + 1; x3++) {
                        const point: MapPoint = new MapPoint(x3, rect.y2() + 1)
                        const checkPoint: MapPoint = MapPoint.fromVec(point)
                        checkPoint.x += 1/tilesize
                        if (! blitzkrieg.puzzleSelections.isSelInPos(sel, checkPoint.to(EntityPoint))) {
                            this.placeWall(rpv, point, Dir.SOUTH)
                        }
                    }
                }
            }
        }
    }

    getSideEntityRect(dir: Dir) {
        const rect: EntityRect = Rect.new(MapRect, this.getSide(dir)).to(EntityRect)
        if (dir == Dir.EAST) {
            rect.x -= 8
        }
        if (dir == Dir.SOUTH) {
            rect.y -= 8
        }
        return rect
    }
}

export enum RoomPlaceOrder {
    NoPlace,
    Room,
    Tunnel,
}
export enum RoomType {
    Room,
    Tunnel,
}
