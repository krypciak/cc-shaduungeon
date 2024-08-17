import { assert } from './util'
import { Vec2 } from './vec2'

export const Dir = {
    NORTH: 0,
    EAST: 1,
    SOUTH: 2,
    WEST: 3,
} as const
export type Dir = (typeof Dir)[keyof typeof Dir]
export type DirStr = 'NORTH' | 'EAST' | 'SOUTH' | 'WEST'
const dirReverse = {
    0: 'NORTH',
    1: 'EAST',
    2: 'SOUTH',
    3: 'WEST',
} as const

export const Dir3d = {
    NORTH: 0,
    EAST: 1,
    SOUTH: 2,
    WEST: 3,
    UP: 4,
    DOWN: 5,
} as const
export type Dir3d = (typeof Dir3d)[keyof typeof Dir3d]
export type Dir3dStr = 'NORTH' | 'EAST' | 'SOUTH' | 'WEST' | 'UP' | 'DOWN'

export namespace DirU {
    export function rotate(dir: Dir, count: number): Dir {
        return ((dir + count) % 4) as Dir
    }
    export function flip(dir: Dir): Dir {
        return DirU.rotate(dir, 2)
    }

    export function isVertical(dir: Dir): dir is typeof Dir.NORTH | typeof Dir.SOUTH {
        return dir == Dir.NORTH || dir == Dir.SOUTH
    }

    export function fromString(dir: DirStr): Dir {
        return Dir[dir]
    }
    export function toString(dir: Dir): DirStr {
        return dirReverse[dir]
    }
    export function fromDir3d(dir: Dir3d): Dir {
        assert(dir >= Dir3d.UP, 'Dir3d to Dir conversion error')
        return dir as unknown as Dir
    }
    export const allExpect = {
        [Dir.NORTH]: [Dir.EAST, Dir.SOUTH, Dir.WEST],
        [Dir.EAST]: [Dir.NORTH, Dir.SOUTH, Dir.WEST],
        [Dir.SOUTH]: [Dir.NORTH, Dir.EAST, Dir.WEST],
        [Dir.WEST]: [Dir.NORTH, Dir.EAST, Dir.SOUTH],
    }
}

export interface Vec2Dir extends Vec2 {
    dir: Dir
}

export interface Rect extends Vec2 {
    width: number
    height: number
}
export namespace Rect {
    export function copy(r: Rect): Rect {
        return { x: r.x, y: r.y, width: r.width, height: r.height }
    }
    export function isEqual(r1: Rect, r2: Rect): boolean {
        return r1.x == r2.x && r1.y == r2.y && r1.width == r2.width && r1.height == r2.height
    }
    export function toString(r: Rect): string {
        return `{ x: ${r.x}, y: ${r.y}, width: ${r.width}, height: ${r.height} }`
    }
    export function fromTwoVecSize(v1: Vec2, v2: Vec2): Rect {
        return {
            ...v1,
            width: v2.x,
            height: v2.y,
        }
    }
    export function toTwoVecSize(rect: Rect): [Vec2, Vec2] {
        return [
            { x: rect.x, y: rect.y },
            { x: rect.width, y: rect.height },
        ]
    }
    export function x2(rect: Rect): number {
        return rect.x + rect.width
    }
    export function y2(rect: Rect): number {
        return rect.y + rect.height
    }
    export function x2y2(rect: Rect): Vec2 {
        return { x: Rect.x2(rect), y: Rect.y2(rect) }
    }
    export function fromTwoVecX2Y2(v1: Vec2, v2: Vec2): Rect {
        const width = v2.x - v1.x
        const height = v2.y - v1.y
        assert(width >= 0, 'Width cannot be negative')
        assert(height >= 0, 'Height cannot be negative')
        return {
            ...v1,
            width,
            height,
        }
    }
    export function normalize(r: Rect): Rect {
        if (r.width < 0) {
            r.x += r.width
            r.width *= -1
        }
        if (r.height < 0) {
            r.y += r.height
            r.height *= -1
        }
        return r
    }
    export function toTwoVecX2Y2(rect: Rect): [Vec2, Vec2] {
        return [{ x: rect.x, y: rect.y }, Rect.x2y2(rect)]
    }
    export function doOverlap(r1: Rect, r2: Rect): boolean {
        const { x: r1x2, y: r1y2 } = Rect.x2y2(r1)
        const { x: r2x2, y: r2y2 } = Rect.x2y2(r2)
        return r1.x < r2x2 && r1x2 > r2.x && r1.y < r2y2 && r1y2 > r2.y
    }
    export function doesArrOverlap(rectToCheck: Rect, rects: Rect[]): boolean {
        for (const rect of rects) {
            if (Rect.doOverlap(rectToCheck, rect)) return true
        }
        return false
    }
    export function doesArrOverlapArr(rects1: Rect[], rects2: Rect[]): boolean {
        for (const rect of rects1) {
            if (Rect.doesArrOverlap(rect, rects2)) return true
        }
        return false
    }
    /** Returns the middle point of the `rect` */
    export function middle(rect: Rect): Vec2 {
        return {
            x: rect.x + rect.width / 2,
            y: rect.y + rect.height / 2,
        }
    }
    /** Extends the `rect` by `num` on all sides */
    export function extend(rect: Rect, num: number): Rect {
        return {
            x: rect.x - num,
            y: rect.y - num,
            width: rect.width + num * 2,
            height: rect.height + num * 2,
        }
    }
    export function corner(
        rect: Rect,
        h: typeof Dir.EAST | typeof Dir.WEST,
        v: typeof Dir.NORTH | typeof Dir.SOUTH
    ): Vec2 {
        return {
            x: h == Dir.EAST ? Rect.x2(rect) : rect.x,
            y: v == Dir.SOUTH ? Rect.y2(rect) : rect.y,
        }
    }
    export function side(rect: Rect, dir: Dir): Rect {
        if (DirU.isVertical(dir)) {
            return Rect.fromTwoVecX2Y2(Rect.corner(rect, Dir.WEST, dir), Rect.corner(rect, Dir.EAST, dir))
        } else {
            return Rect.fromTwoVecX2Y2(Rect.corner(rect, dir, Dir.NORTH), Rect.corner(rect, dir, Dir.SOUTH))
        }
    }
    export function sideVec(rect: Rect, vec: Vec2, dir: Dir): Vec2 {
        if (dir == Dir.NORTH) return { x: vec.x, y: rect.y }
        if (dir == Dir.EAST) return { x: Rect.x2(rect), y: vec.y }
        if (dir == Dir.SOUTH) return { x: vec.x, y: Rect.y2(rect) }
        return { x: vec.x, y: vec.y }
    }
    export function closestSide(rect: Rect, vec: Vec2): { distance: number; dir: Dir; vec: Vec2 } {
        let smallest: { distance: number; dir: Dir; vec: Vec2 } = {
            distance: 10000,
            dir: Dir.NORTH,
            vec: { x: 0, y: 0 },
        }
        for (let dir = Dir.NORTH; dir < 4; dir++) {
            const v: Vec2 = Rect.side(rect, dir)
            if (DirU.isVertical(dir)) {
                v.x = vec.x
            } else {
                v.y = vec.y
            }
            const distance = Vec2.distance(vec, v)
            if (distance < smallest.distance) {
                smallest = {
                    distance,
                    dir,
                    vec: v,
                }
            }
        }
        return smallest
    }
    export function isVecIn(rect: Rect, vec: Vec2): boolean {
        return vec.x >= rect.x && vec.x < rect.x + rect.width && vec.y >= rect.y && vec.y < rect.y + rect.height
    }
    export function isVecInArr(rects: Rect[], vec: Vec2): boolean {
        for (const rect of rects) {
            if (Rect.isVecIn(rect, vec)) return true
        }
        return false
    }
    export function boundsOfArr(rects: Rect[]): Rect {
        let x = 10e100
        let y = 10e100
        let x2 = -10e100
        let y2 = -10e100

        for (const rect of rects) {
            if (rect.x < x) x = rect.x
            if (rect.y < y) y = rect.y
            const { x: nx2, y: ny2 } = Rect.x2y2(rect)
            if (nx2 > x2) x2 = nx2
            if (ny2 > y2) y2 = ny2
        }
        return {
            x,
            y,
            width: x2 - x,
            height: y2 - y,
        }
    }
    export function centeredRect(size: Vec2, tpr: Vec2Dir): Rect {
        const pos: Vec2 = Vec2.copy(tpr)
        if (tpr.dir == Dir.SOUTH || tpr.dir == Dir.EAST) {
            Vec2.moveInDirection(pos, DirU.flip(tpr.dir), size.y)
        }
        const move = size.x / 2
        Vec2.moveInDirection(pos, DirU.isVertical(tpr.dir) ? Dir.WEST : Dir.NORTH, move)
        return Rect.fromTwoVecSize(pos, Vec2.flipSides(size, !DirU.isVertical(tpr.dir)))
    }
}
