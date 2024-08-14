import { expect, Test, TestCase, TestSuite } from 'testyts'

@TestSuite()
export class PrototypeTest {
    @Test()
    @TestCase('0 deep array', [0, 1, 2], (a: number) => a + 1, 6)
    @TestCase('1 deep array', [0, [1, 2]], (a: number) => a + 1, '11,21')
    flatMap(array: number[], func: (a: number) => number, result: number | string) {
        const sum = array.flatMap(func).reduce((acc, v) => acc + v, 0)
        expect.toBeEqual(sum, result)
    }

    @Test()
    @TestCase('0 deep array', [0, 1, 2], 3)
    @TestCase('1 deep array', [0, [1, 2]], 3)
    @TestCase('2 deep array', [2, [1, ['2']]], '32')
    flat(array: number[], result: number | string) {
        const sum = array.flat().reduce((acc, v) => acc + v, 0)
        expect.toBeEqual(sum, result)
    }
}
