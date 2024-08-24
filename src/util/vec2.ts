// Vector tools (source: http://impactjs.com/forums/impact-engine/vector-math-helper-class/page/1)

import { Dir, Rect } from './geometry'
import { assert } from './util'

export interface Vec2 {
    x: number
    y: number
}

export namespace Vec2 {
    export function assign(v1: Vec2, v2: Vec2) {
        v1.x = v2.x || 0
        v1.y = v2.y || 0
        return v1
    }

    export function assignC(v: Vec2, x?: number, y?: number) {
        v.x = x || 0
        v.y = y || 0
        return v
    }

    export function add(v1: Vec2, v2: Vec2, copy?: boolean) {
        const res: any = copy || false ? {} : v1
        res.x = (v1.x || 0) + (v2.x || 0)
        res.y = (v1.y || 0) + (v2.y || 0)
        return res
    }

    export function addC(v1: Vec2, x?: number, y?: number, copy?: boolean) {
        const res: any = copy || false ? {} : v1
        y = y === undefined || y === null ? x : y
        res.x = (v1.x || 0) + (x || 0)
        res.y = (v1.y || 0) + (y || 0)
        return res
    }

    export function sub(v1: Vec2, v2: Vec2, copy?: boolean) {
        const res: any = copy || false ? {} : v1
        res.x = (v1.x || 0) - (v2.x || 0)
        res.y = (v1.y || 0) - (v2.y || 0)
        return res
    }

    export function subC(v1: Vec2, x: number, y?: number, copy?: boolean) {
        const res: any = copy ? {} : v1
        y = y === undefined || y === null ? x : y
        res.x = (v1.x || 0) - (x || 0)
        res.y = (v1.y || 0) - (y || 0)
        return res
    }

    export function mul(v1: Vec2, v2: Vec2, copy?: boolean) {
        const res: any = copy || false ? {} : v1
        res.x = (v1.x || 0) * (v2.x || 0)
        res.y = (v1.y || 0) * (v2.y || 0)
        return res
    }

    export function mulC(v1: Vec2, x?: number, y?: number, copy?: boolean) {
        const res: any = copy || false ? {} : v1
        y = y === undefined || y === null ? x : y
        res.x = (v1.x || 0) * (x || 0)
        res.y = (v1.y || 0) * (y || 0)
        return res
    }

    export function mulF(v1: Vec2, f: number, copy?: boolean) {
        const res: any = copy || false ? {} : v1
        res.x = (v1.x || 0) * (f || 0)
        res.y = (v1.y || 0) * (f || 0)
        return res
    }

    export function div(v1: Vec2, v2: Vec2, copy?: boolean) {
        const res: any = copy || false ? {} : v1
        res.x = (v1.x || 0) / (v2.x || 0)
        res.y = (v1.y || 0) / (v2.y || 0)
        return res
    }

    export function divC(v1: Vec2, x?: number, y?: number, copy?: boolean) {
        const res: any = copy || false ? {} : v1
        y = y === undefined || y === null ? x : y
        res.x = (v1.x || 0) / (x || 0)
        res.y = (v1.y || 0) / (y || 0)
        return res
    }

    export function dot(v1: Vec2, v2: Vec2) {
        return (v1.x || 0) * (v2.x || 0) + (v1.y || 0) * (v2.y || 0)
    }

    export function dotR(v1: Vec2, v2: Vec2) {
        return -(v1.y || 0) * (v2.x || 0) + (v1.x || 0) * (v2.y || 0)
    }

    export function vlength(v: Vec2, newLength?: number, copy?: boolean) {
        const oldLength = Math.sqrt((v.x || 0) * (v.x || 0) + (v.y || 0) * (v.y || 0))
        if (newLength) {
            return Vec2.mulC(v, oldLength ? newLength / oldLength : 1, undefined, copy)
        } else {
            return oldLength
        }
    }

    export function limit(v: Vec2, min: number, max: number, copy?: boolean) {
        const length = Vec2.vlength(v)
        if (length > max) {
            return Vec2.mulC(v, max / length, undefined, copy)
        } else if (length < min) {
            return Vec2.mulC(v, min / length, undefined, copy)
        } else {
            return copy || false ? Vec2.copy(v) : v
        }
    }

    export function normalize(v: Vec2, copy?: boolean) {
        return Vec2.vlength(v, 1, copy)
    }

    export function clockangle(v: Vec2) {
        let result = Math.acos(-(v.y || 0) / Vec2.vlength(v))
        if (v.x < 0) {
            result = 2 * Math.PI - result
        }
        return result || 0
    }

    export function angle(v1: Vec2, v2: Vec2) {
        const result = Math.acos(Vec2.dot(v1, v2) / (Vec2.vlength(v1) * Vec2.vlength(v2)))
        return result || 0
    }

    export function rotate(v: Vec2, angle: number, copy?: boolean) {
        const res: any = copy || false ? {} : v
        const x = v.x || 0
        res.x = Math.cos(angle) * x + Math.sin(angle) * (v.y || 0)
        res.y = Math.sin(-angle) * x + Math.cos(angle) * (v.y || 0)
        return res
    }

    export function rotate90CW(v: Vec2, copy?: boolean) {
        const res: any = copy || false ? {} : v
        const x = v.x || 0
        res.x = v.y || 0
        res.y = -x
        return res
    }

    export function rotate90CCW(v: Vec2, copy?: boolean) {
        const res: any = copy || false ? {} : v
        const x = v.x || 0
        res.x = -(v.y || 0)
        res.y = x
        return res
    }

    export function flip(v: Vec2, copy?: boolean) {
        const res: any = copy || false ? {} : v
        res.x = -v.x
        res.y = -v.y
        return res
    }

    export function isEqual(v1: Vec2, v2: Vec2) {
        return v1.x === v2.x && v1.y === v2.y
    }

    export function distance(v1: Vec2, v2: Vec2) {
        const x = v1.x - v2.x || 0
        const y = v1.y - v2.y || 0
        return Math.sqrt(x * x + y * y)
    }

    export function distance2(v1: Vec2, v2: Vec2) {
        const x = v1.x - v2.x || 0
        const y = v1.y - v2.y || 0
        return x * x + y * y
    }

    export function lerp(v1: Vec2, v2: Vec2, i: number, copy?: boolean) {
        const res: any = copy || false ? {} : v1
        res.x = (v1.x || 0) * (1 - i) + (v2.x || 0) * i
        res.y = (v1.y || 0) * (1 - i) + (v2.y || 0) * i
        return res
    }

    export function toString(v: Vec2): string {
        return `{ x: ${v.x}, y: ${v.y} }`
    }

    export function moveInDirection(pos: Vec2, dir: Dir, amount: number) {
        if (dir == Dir.NORTH) return (pos.y -= amount)
        if (dir == Dir.EAST) return (pos.x += amount)
        if (dir == Dir.SOUTH) return (pos.y += amount)
        pos.x -= amount
    }

    export function flipSides(v: Vec2, doFlip: boolean): Vec2 {
        return doFlip ? { x: v.y, y: v.x } : Vec2.copy(v)
    }

    export function copy(v: Vec2): Vec2 {
        return { x: v.x, y: v.y }
    }

    export function floor(v: Vec2): Vec2 {
        v.x = v.x.floor()
        v.y = v.y.floor()
        return v
    }

    export function ceil(v: Vec2): Vec2 {
        v.x = v.x.ceil()
        v.y = v.y.ceil()
        return v
    }

    export function round(v: Vec2, prec: number = 0): Vec2 {
        v.x = v.x.round(prec)
        v.y = v.y.round(prec)
        return v
    }

    export function min(v1: Vec2, v2: Vec2) {
        v1.x = Math.min(v1.x, v2.x)
        v1.y = Math.min(v1.y, v2.y)
        return v1
    }
    export function minC(v: Vec2, x: number, y: number) {
        v.x = Math.min(v.x, x)
        v.y = Math.min(v.y, y)
        return v
    }
    export function max(v1: Vec2, v2: Vec2) {
        v1.x = Math.max(v1.x, v2.x)
        v1.y = Math.max(v1.y, v2.y)
        return v1
    }
    export function maxC(v: Vec2, x: number, y: number) {
        v.x = Math.max(v.x, x)
        v.y = Math.max(v.y, y)
        return v
    }

    export function snapToGrid(gridCorner: Vec2, interval: number, toSnap: Vec2): Vec2 {
        const offset: Vec2 = Vec2.sub(
            Vec2.copy(gridCorner),
            Vec2.mulC(Vec2.floor(Vec2.divC(Vec2.copy(gridCorner), interval)), interval)
        )

        const div = Vec2.divC(Vec2.sub(Vec2.copy(toSnap), offset), interval)

        const min = Vec2.add(Vec2.mulC(Vec2.floor(Vec2.copy(div)), interval), offset)
        const max = Vec2.addC(Vec2.copy(min), interval)
        const rect: Rect = Rect.fromTwoVecX2Y2(min, max)
        assert(Rect.isVecIn(rect, toSnap))

        const { vec } = Rect.closestCorner(rect, toSnap)

        return vec
    }
}
