import { assert } from './util'
import { Vec2 } from './vec2'

export enum Dir {
    NORTH = 0,
    EAST = 1,
    SOUTH = 2,
    WEST = 3,
}
export type DirStr = 'NORTH' | 'EAST' | 'SOUTH' | 'WEST'

export enum Dir3d {
    NORTH = 0,
    EAST = 1,
    SOUTH = 2,
    WEST = 3,
    UP = 4,
    DOWN = 5,
}
export type Dir3dStr = 'NORTH' | 'EAST' | 'SOUTH' | 'WEST' | 'UP' | 'DOWN'

export namespace Dir {
    export function rotate(dir: Dir, count: number): Dir {
        return (dir + count) % 4
    }
    export function flip(dir: Dir): Dir {
        return Dir.rotate(dir, 2)
    }

    export function isVertical(dir: Dir): dir is Dir.NORTH | Dir.SOUTH {
        return dir == Dir.NORTH || dir == Dir.SOUTH
    }

    export function fromString(dir: DirStr): Dir {
        return Dir[dir]
    }
    export function toString(dir: Dir): DirStr {
        return Dir[dir] as DirStr
    }
    export function fromDir3d(dir: Dir3d): Dir {
        assert(dir >= Dir3d.UP, 'Dir3d to Dir conversion error')
        return dir as unknown as Dir
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
        return rect.x + rect.width
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
    export function toTwoVecX2Y2(rect: Rect): [Vec2, Vec2] {
        return [{ x: rect.x, y: rect.y }, Rect.x2y2(rect)]
    }
    export function doOverlap(r1: Rect, r2: Rect): boolean {
        const { x: r1x2, y: r1y2 } = Rect.x2y2(r1)
        const { x: r2x2, y: r2y2 } = Rect.x2y2(r2)
        return r1.x < r2x2 && r1x2 > r2.x && r1.y < r2y2 && r1y2 > r2.y
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
    export function corner(rect: Rect, h: Dir.EAST | Dir.WEST, v: Dir.NORTH | Dir.SOUTH): Vec2 {
        return {
            x: h == Dir.EAST ? Rect.x2(rect) : rect.x,
            y: v == Dir.SOUTH ? Rect.y2(rect) : rect.y,
        }
    }
    export function getSide(rect: Rect, dir: Dir): Rect {
        if (Dir.isVertical(dir)) {
            return Rect.fromTwoVecX2Y2(Rect.corner(rect, Dir.WEST, dir), Rect.corner(rect, Dir.EAST, dir))
        } else {
            return Rect.fromTwoVecX2Y2(Rect.corner(rect, dir, Dir.NORTH), Rect.corner(rect, dir, Dir.SOUTH))
        }
    }
    export function setPosToSide(rect: Rect, vec: Vec2, dir: Dir) {
        if (dir == Dir.NORTH) return (vec.y = rect.y)
        if (dir == Dir.EAST) return (vec.x = Rect.x2(rect))
        if (dir == Dir.SOUTH) return (vec.y = Rect.y2(rect))
        vec.x = rect.x
    }
    export function closestSide(rect: Rect, vec: Vec2): { distance: number; dir: Dir; vec: Vec2 } {
        let smallest: { distance: number; dir: Dir; vec: Vec2 } = {
            distance: 10000,
            dir: Dir.NORTH,
            vec: { x: 0, y: 0 },
        }
        for (let dir = Dir.NORTH; dir < 4; dir++) {
            const v: Vec2 = Rect.getSide(rect, dir)
            if (Dir.isVertical(dir)) {
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
}
