import { expect, Test, TestCase, TestSuite } from 'testyts'

import { Dir, Rect } from './geometry'
import { Vec2 } from './vec2'

@TestSuite()
export class Test_Geometry {
    @Test()
    @TestCase('fromTwoVecX2Y2 1', { x: 1, y: 2 }, { x: 3, y: 3 }, { x: 1, y: 2, width: 2, height: 1 })
    fromTwoVecX2Y2(v1: Vec2, v2: Vec2, expected: Rect) {
        const res = Rect.fromTwoVecX2Y2(v1, v2)
        expect.toBeTrue(
            Rect.isEqual(res, expected),
            `Expected: ${Rect.toString(res)} to be equal: ${Rect.toString(expected)}`
        )
    }
    @Test()
    @TestCase('middle 1', { x: 1, y: 2, width: 2, height: 4 }, { x: 2, y: 4 })
    @TestCase('middle 2', { x: 1, y: 2, width: 2, height: 0 }, { x: 2, y: 2 })
    middle(rect: Rect, expected: Vec2) {
        const res = Rect.middle(rect)
        expect.toBeTrue(
            Vec2.isEqual(res, expected),
            `Expected: ${Vec2.toString(res)} to be equal: ${Vec2.toString(expected)}`
        )
    }
    @Test()
    @TestCase('side north', { x: 1, y: 2, width: 2, height: 4 }, Dir.NORTH, { x: 1, y: 2, width: 2, height: 0 })
    @TestCase('side east', { x: 1, y: 2, width: 2, height: 4 }, Dir.EAST, { x: 3, y: 2, width: 0, height: 4 })
    @TestCase('side south', { x: 1, y: 2, width: 2, height: 4 }, Dir.SOUTH, { x: 1, y: 6, width: 2, height: 0 })
    @TestCase('side west', { x: 1, y: 2, width: 2, height: 4 }, Dir.WEST, { x: 1, y: 2, width: 0, height: 4 })
    side(rect: Rect, dir: Dir, expected: Rect) {
        const res = Rect.side(rect, dir)
        expect.toBeTrue(
            Rect.isEqual(res, expected),
            `Expected: ${Rect.toString(res)} to be equal: ${Rect.toString(expected)}`
        )
    }

    @Test()
    @TestCase('corner north east', { x: 1, y: 2, width: 2, height: 4 }, Dir.EAST, Dir.NORTH, { x: 3, y: 2 })
    @TestCase('corner north west', { x: 1, y: 2, width: 2, height: 4 }, Dir.WEST, Dir.NORTH, { x: 1, y: 2 })
    @TestCase('corner south east', { x: 1, y: 2, width: 2, height: 4 }, Dir.EAST, Dir.SOUTH, { x: 3, y: 6 })
    @TestCase('corner south west', { x: 1, y: 2, width: 2, height: 4 }, Dir.WEST, Dir.SOUTH, { x: 1, y: 6 })
    corner(rect: Rect, h: typeof Dir.EAST | typeof Dir.WEST, v: typeof Dir.NORTH | typeof Dir.SOUTH, expected: Vec2) {
        const res = Rect.corner(rect, h, v)
        expect.toBeTrue(
            Vec2.isEqual(res, expected),
            `Expected: ${Vec2.toString(res)} to be equal: ${Vec2.toString(expected)}`
        )
    }

    @Test()
    @TestCase('far away', { x: 0, y: 0, width: 2, height: 2 }, { x: 9, y: 9, width: 2, height: 2 }, false)
    @TestCase('inside', { x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 5, width: 2, height: 2 }, true)
    @TestCase('inside corner', { x: 0, y: 0, width: 10, height: 10 }, { x: 0, y: 0, width: 2, height: 2 }, true)
    @TestCase('just a bit corner', { x: 0, y: 0, width: 10, height: 10 }, { x: 9, y: 9, width: 2, height: 2 }, true)
    @TestCase('equal', { x: 0, y: 0, width: 10, height: 10 }, { x: 0, y: 0, width: 10, height: 10 }, true)
    doOverlap(r1: Rect, r2: Rect, expected: boolean) {
        const res = Rect.doOverlap(r1, r2)
        expect.toBeEqual(res, expected)
    }
}
