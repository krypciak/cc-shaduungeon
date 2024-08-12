import { expect, Test, TestCase, TestSuite } from 'testyts'

import type * as _ from '../setup-test'
import { merge } from './util'

@TestSuite()
export class Test_Util {
    @Test()
    @TestCase('object merge', { a: 0 }, { b: 1 }, (obj: any) => obj['a'] == 0 && obj['b'] == 1)
    @TestCase(
        'array merge',
        { a: [1] },
        { a: [2] },
        (obj: { a: number[] }) => obj.a.length == 2 && obj.a[0] == 1 && obj.a[1] == 2
    )
    merge(obj1: any, obj2: any, test: (obj: any) => boolean) {
        const res = merge(obj1, obj2)
        const passed = test(res)
        expect.toBeTrue(passed)
    }
}
