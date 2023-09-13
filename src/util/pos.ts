import { Selection } from "@root/types"

const tilesize: number = 16

export enum Dir {
    NORTH,
    EAST,
    SOUTH,
    WEST,
}

export enum Dir3d {
    NORTH,
    EAST,
    SOUTH,
    WEST,
    UP,
    DOWN,
}

export class DirUtil {
    static flip(dir: Dir): Dir {
        return ((dir + 2) % 4) as Dir
    }

    static convertToDir(dir: keyof typeof Dir): Dir {
        return Dir[dir]
    }
    static convertToString(dir: Dir): keyof typeof Dir {
        return Dir[dir] as keyof typeof Dir
    }

    static convertToStringFace8(dir: ig.ActorEntity.FACE8): keyof typeof ig.ActorEntity.FACE8 {
        return ig.ActorEntity.FACE8[dir] as keyof typeof ig.ActorEntity.FACE8
    }
    static convertToDirFace8(dir: keyof typeof ig.ActorEntity.FACE8): ig.ActorEntity.FACE8 {
        return ig.ActorEntity.FACE8[dir]
    }

    static isVertical(dir: Dir): boolean {
        return dir == Dir.NORTH || dir == Dir.SOUTH
    }

    static dirToDir3d(dir: Dir): Dir3d {
        return dir as unknown as Dir3d
    }

    static dir3dToDir(dir3d: Dir3d): Dir {
        if (! DirUtil.dir3dIsDir(dir3d)) { throw new Error('Invalid dir3d to dir conversion') }
        return dir3d as unknown as Dir
    }

    static dir3dIsDir(dir3d: Dir3d): boolean {
        return dir3d != Dir3d.UP && dir3d != Dir3d.DOWN
    }
}

export type PosDir<T extends Point> = { pos: T, dir: Dir }
export type PosDir3d<T extends Point> = { pos: T, dir: Dir3d }

export type bareRect = { x: number; y: number; width: number; height: number }

export class Rect {
    static multiplier: number
    static ins: Rect
    static pointIns: Point

    constructor(
        public x: number,
        public y: number,
        public width: number,
        public height: number,
    ) {
        if (width < 0) {
            throw new Error('Width cannot be less than 0')
        }
        if (height < 0) {
            throw new Error('Height cannot be less than 0')
        }
    }

    x2() {
        return this.x + this.width
    }
    y2() {
        return this.y + this.height
    }

    getSide(dir: Dir, smallerSize: number = 0.5): Rect {
        let pos: Point
        switch (dir) {
            case Dir.NORTH: pos = new Point(this.x, this.y); break
            case Dir.EAST: pos = new Point(this.x2(), this.y); break
            case Dir.SOUTH: pos = new Point(this.x, this.y2()); break
            case Dir.WEST: pos = new Point(this.x, this.y); break
        }
        const size: Point = DirUtil.isVertical(dir) ? new Point(this.width, smallerSize) : new Point(smallerSize, this.height)
        return Rect.fromTwoPoints(pos, size)
    }

    setPosToSide(pos: Point, dir: Dir) {
        switch (dir) {
            case Dir.NORTH: pos.y = this.y; break
            case Dir.EAST: pos.x = this.x2(); break
            case Dir.SOUTH: pos.y = this.y2(); break
            case Dir.WEST: pos.x = this.x; break
        }
    }

    setToClosestRectSide(pos: Vec2): { distance: number, dir: Dir, pos: Vec2 }  {
        let smallestDist: number = 10000
        let smallestDir: Dir = Dir.NORTH
        let smallestPos: Vec2 = new Point(0, 0)
        for (let dir = 0; dir < 4; dir++) {
            const p: Vec2 = this.getSide(dir)
            if (DirUtil.isVertical(dir)) {
                p.x = pos.x
            } else {
                p.y = pos.y
            }
            const dist = Vec2.distance(pos, p)
            if (dist < smallestDist) {
                smallestDist = dist
                smallestDir = dir
                smallestPos = p
            }
        }
        pos.x = smallestPos.x
        pos.y = smallestPos.y
        return { distance: smallestDist, dir: smallestDir, pos: smallestPos }
    }

    middlePoint<T extends Point>(type: new (x: number, y: number) => T): T {
        return new type(this.x + this.width/2, this.y + this.height/2)
    }

    extend(num: number) {
        this.x -= num
        this.y -= num
        this.width += num*2
        this.height += num*2
    }

    to<T extends typeof Rect>(ins: T): InstanceType<T> {
        const multi = ins.multiplier / 
            // @ts-expect-error
            this.constructor['multiplier']

        return new ins(
            // Math.floor(this.x * multi),
            // Math.floor(this.y * multi),
            // Math.floor(this.width * multi),
            // Math.floor(this.height * multi),
            this.x * multi,
            this.y * multi,
            this.width * multi,
            this.height * multi,
        ) as InstanceType<T>
    }

    /* equals(rect: Rect): boolean {
        return this.x == rect.x && this.y == rect.y
            && this.width == rect.width && this.height == rect.height
    } */

    static getMinMaxPosFromRectArr(rects: Rect[]): { min: Point; max: Point } {
        const min: AreaPoint = new AreaPoint(100000, 100000)
        const max: AreaPoint = new AreaPoint(-100000, -100000)
        for (const rect of rects) {
            if (rect.x < min.x) { min.x = rect.x }
            if (rect.y < min.y) { min.y = rect.y }
            if (rect.x2() > max.x) { max.x = rect.x2() }
            if (rect.y2() > max.y) { max.y = rect.y2() }
        }
        return { min, max }
    }

    toJSON(): bareRect {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        }
    }

    static fromTwoPoints(pos: Point, size: Point): Rect {
        return new Rect(pos.x, pos.y, size.x, size.y)
    }

    static new<T extends Rect>
        (init: new (x: number, y: number, width: number, height: number) => T, rect: bareRect): T {
        return new init(rect.x, rect.y, rect.width, rect.height)
    }
}

export class EntityRect extends Rect {
    static multiplier: number = 64
    private _entityrect: boolean = true

    static fromxy2(x: number, y: number, x2: number, y2: number): EntityRect {
        return new EntityRect(x, y, x2 - x, y2 - y)
    }
    static fromTwoPoints(pos: EntityPoint, size: EntityPoint): EntityRect {
        return new EntityRect(pos.x, pos.y, size.x, size.y)
    }
}

export class MapRect extends Rect {
    static multiplier: number = 4
    private _maprect: boolean = true
    
    static fromxy2(x: number, y: number, x2: number, y2: number): MapRect {
        return new MapRect(x, y, x2 - x, y2 - y)
    }

    static fromTwoPoints(pos: MapPoint, size: MapPoint): MapRect {
        return new MapRect(pos.x, pos.y, size.x, size.y)
    }
}

export class AreaRect extends Rect {
    private _arearect: boolean = true
    static multiplier: number = 1
    static div: number = MapRect.multiplier / AreaRect.multiplier 

    static fromxy2(x: number, y: number, x2: number, y2: number): AreaRect {
        return new AreaRect(x, y, x2 - x, y2 - y)
    }
    static fromTwoPoints(pos: AreaPoint, size: AreaPoint): AreaRect {
        return new AreaRect(pos.x, pos.y, size.x, size.y)
    }
}


export class Point {
    static multiplier: number

    public constructor(
        public x: number,
        public y: number) {}

    to<T extends typeof Point>(ins: T): InstanceType<T> {
        const multi = ins.multiplier / 
            // @ts-expect-error
            this.constructor['multiplier']

        return new ins(
            // Math.floor(this.x * multi),
            // Math.floor(this.y * multi),
            this.x * multi,
            this.y * multi,
        ) as InstanceType<T>
    }

    copy(): Point {
        return new Point(this.x, this.y)
    }

    toJSON() {
        return {
            x: this.x,
            y: this.y,
        }
    }

    static moveInDirection(pos: Vec2, dir: Dir, amount: number = 1) {
        switch (dir) {
            case Dir.NORTH: pos.y -= amount; break
            case Dir.EAST: pos.x += amount; break
            case Dir.SOUTH: pos.y += amount; break
            case Dir.WEST: pos.x -= amount; break
        }
    }
}

export class EntityPoint extends Point {
    static multiplier: number = EntityRect.multiplier
    private _entityPoint: boolean = true

    copy(): EntityPoint {
        return new EntityPoint(this.x, this.y)
    }

    static fromMapPoint(pos: MapPoint): Point {
        return new Point(pos.x * tilesize, pos.y * tilesize)
    }

    static fromVec(pos: Vec2): EntityPoint {
        return new EntityPoint(pos.x, pos.y)
    }
}

export class MapPoint extends Point {
    static multiplier: number = MapRect.multiplier
    private _mapPoint: boolean = true

    copy(): MapPoint {
        return new MapPoint(this.x, this.y)
    }

    static fromVec(pos: Vec2): MapPoint {
        return new MapPoint(pos.x, pos.y)
    }
}

export class AreaPoint extends Point {
    static multiplier: number = AreaRect.multiplier
    private _areaPoint: boolean = true

    copy(): AreaPoint {
        return new AreaPoint(this.x, this.y)
    }
    static fromTwoPoints(pos: AreaPoint, size: AreaPoint): AreaRect {
        return new AreaRect(pos.x, pos.y, size.x, size.y)
    }
    static fromVec(pos: Vec2): AreaPoint {
        return new AreaPoint(pos.x, pos.y)
    }
}

export function doRectsOverlap<T extends Rect>(rect1: T, rect2: T): boolean {
  return (
    rect1.x < rect2.x2() &&
    rect1.x2() > rect2.x &&
    rect1.y < rect2.y2() &&
    rect1.y2() > rect2.y
  )
}

export function doesRectArrayOverlapRectArray<T extends Rect>(arr1: T[], arr2: T[]): boolean {
    for (let i1 = arr1.length - 1; i1 >= 0; i1--) {
        for (let i2 = arr2.length - 1; i2 >= 0; i2--) {
            if (doRectsOverlap(arr1[i1], arr2[i2])) {
                return true
            }
        }
    }
    return false
}

export function setToClosestSelSide(pos: Vec2, sel: Selection): { distance: number, dir: Dir, pos: Vec2 } {
    let minObj: { distance: number, dir: Dir, pos: Vec2 } = { distance: 10000, dir: 0, pos: new Point(0, 0) }
    for (let rect of sel.bb) {
        const obj = Rect.new(EntityRect, rect).setToClosestRectSide({ x: pos.x, y: pos.y })
        if (obj.distance < minObj.distance) {
            minObj = obj
        }
    }
    pos.x = minObj.pos.x
    pos.y = minObj.pos.y
    return minObj
}
