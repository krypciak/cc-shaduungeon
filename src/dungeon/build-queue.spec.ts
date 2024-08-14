import { expect, Test, TestCase, TestSuite } from 'testyts'

import { BuildQueue, NextQueueEntryGenerator, QueueEntry } from '../dungeon/build-queue'
import { assert } from '../util/util'

@TestSuite()
export class Test_DungeonQueue {
    @Test()
    branchless() {
        type Data = { countLeft: number }
        const nextQueueEntryGenerator: NextQueueEntryGenerator<Data> = function (): QueueEntry<Data> {
            const nextQueueEntryGenerator: NextQueueEntryGenerator<Data> = function (
                id,
                _branch,
                accesor
            ): QueueEntry<Data> {
                const last = accesor.get(id - 1)
                return {
                    data: { countLeft: last.countLeft - 1 },
                    id: id,
                    finishedEntry: true,
                    finishedWhole: last.countLeft == 1,

                    branch: 0,
                    branchCount: 1,
                    nextQueueEntryGenerator: nextQueueEntryGenerator,
                }
            }
            return {
                data: { countLeft: 2 },
                id: 0,
                finishedEntry: true,

                branch: 0,
                branchCount: 1,
                nextQueueEntryGenerator: nextQueueEntryGenerator,
            }
        }
        const queue = new BuildQueue<Data>()
        const res = queue.begin(nextQueueEntryGenerator)
        expect.toBeTruthy(res)
        assert(res)
        expect.toBeEqual(Object.keys(res).length, 3, 'Queue length')
        expect.toBeEqual(Object.values(res).last().countLeft, 0, 'Last value')
    }

    @Test()
    branchSomeFail() {
        type Data = { countLeft: number }
        const nextQueueEntryGenerator: NextQueueEntryGenerator<Data> = function (): QueueEntry<Data> {
            const nextQueueEntryGenerator: NextQueueEntryGenerator<Data> = function (
                id,
                branch,
                accesor
            ): QueueEntry<Data> | null {
                const last = accesor.get(id - 1)

                if (id == 2 && branch == 0) return null

                const branchCount = id == 1 ? 3 : 1
                return {
                    data: {
                        countLeft: last.countLeft - 1,
                    },
                    id: id,
                    finishedEntry: true,
                    finishedWhole: last.countLeft == 1,

                    branch: 0,
                    branchCount,
                    nextQueueEntryGenerator,
                }
            }
            return {
                data: { countLeft: 2 },
                id: 0,
                finishedEntry: true,

                branch: 0,
                branchCount: 1,
                nextQueueEntryGenerator: nextQueueEntryGenerator,
            }
        }
        const queue = new BuildQueue<Data>()
        const res = queue.begin(nextQueueEntryGenerator)
        expect.toBeTruthy(res)
        assert(res)
        expect.toBeEqual(Object.keys(res).length, 3, 'Queue length')
        expect.toBeEqual(Object.values(res).last().countLeft, 0, 'Last value')
        expect.toBeEqual(queue.queue[1].branch, 1, 'Failed branch attempt')
    }

    @Test()
    @TestCase(
        'maze2',
        [
            // prettier-ignore
            '#########',
            '#       #',
            '### ## ##',
            '#*#  #  #',
            '#########',
        ],
        null
    )
    @TestCase(
        'maze1',
        [
            // prettier-ignore
            '#########',
            '#       #',
            '###### ##',
            '#*      #',
            '#########',
        ],
        [
            // prettier-ignore
            '#########',
            '#...... #',
            '######.##',
            '#...... #',
            '#########',
        ]
    )
    maze(initialMaze: string[], expected: string[] | null) {
        type Data =
            | { type: 'STEP'; pos: Vec2 }
            | {
                  type: 'INTERSECTION'
                  pos: Vec2
                  possiblePaths: Vec2[]
              }

        const step: NextQueueEntryGenerator<Data> = function (id, branch, accesor): QueueEntry<Data> | null {
            const data = accesor.queue.last().data
            assert(data.type == 'INTERSECTION')

            const { x: ax, y: ay } = data.possiblePaths[branch]
            const newPos = { x: data.pos.x + ax, y: data.pos.y + ay }

            return {
                data: { type: 'STEP', pos: newPos },
                dataNoMerge: true,
                id,
                finishedEntry: true,
                finishedWhole: initialMaze[newPos.y][newPos.x] == '*',

                branch: 0,
                branchCount: 1,
                nextQueueEntryGenerator: intersection,
            }
        }

        const intersection: NextQueueEntryGenerator<Data> = function (id, _branch, accesor): QueueEntry<Data> | null {
            const l = accesor.get(id - 1).pos
            const ll = id >= 2 ? accesor.get(id - 2).pos : { x: l.x, y: l.y }

            const possiblePaths = [
                { x: -1, y: 0 },
                { x: 1, y: 0 },
                { x: 0, y: -1 },
                { x: 0, y: 1 },
            ].filter(({ x, y }) => initialMaze[l.y + y][l.x + x] != '#' && !(l.x + x == ll.x && l.y + y == ll.y))

            if (possiblePaths.length == 0) return null

            return {
                data: { type: 'INTERSECTION', pos: l, possiblePaths: possiblePaths },
                dataNoMerge: true,
                id,

                branch: 0,
                branchCount: possiblePaths.length,
                nextQueueEntryGenerator: step,
            }
        }

        const firstStep: NextQueueEntryGenerator<Data> = function (): QueueEntry<Data> {
            return {
                data: { type: 'STEP', pos: { x: 1, y: 1 } },
                id: 0,
                finishedEntry: true,

                branch: 0,
                branchCount: 1,
                nextQueueEntryGenerator: intersection,
            }
        }
        const queue = new BuildQueue<Data>()
        const res = queue.begin(firstStep)

        if (expected === null) {
            expect.toBeEqual(res, expected)
            return
        }

        expect.toBeTruthy(res)
        assert(res)

        function stringifyMaze(queue: BuildQueue<Data>): string {
            return queue.queue
                .map(a => a.data.pos)
                .reduce(
                    (acc, v) => {
                        const sp = acc[v.y].split('')
                        sp[v.x] = '.'
                        acc[v.y] = sp.join('')
                        return acc
                    },
                    [...initialMaze]
                )
                .join('\n')
        }
        const completedMaze = stringifyMaze(queue)

        expect.toBeEqual('\n' + completedMaze + '\n', '\n' + expected.join('\n') + '\n')
    }

    @Test()
    dataMerge() {
        type Data = { arr: number[]; obj: Record<string, number> }
        let loopsLeft = 2

        const entry0: NextQueueEntryGenerator<Data> = function (id): QueueEntry<Data> {
            return {
                data: { arr: [0], obj: { a: 0 } },
                id,

                branch: 0,
                branchCount: 1,
                nextQueueEntryGenerator: entry1,
            }
        }
        const entry1: NextQueueEntryGenerator<Data> = function (id): QueueEntry<Data> {
            return {
                data: { arr: [1], obj: { b: 1 } },
                id,

                branch: 0,
                branchCount: 1,
                nextQueueEntryGenerator: entry2,
            }
        }
        const entry2: NextQueueEntryGenerator<Data> = function (id, _branch, accesor): QueueEntry<Data> {
            const last = accesor.get(id)
            loopsLeft--
            return {
                data: { arr: [last.arr[1] + 1], obj: { c: last.obj['b'] + 1 } },
                id,
                finishedEntry: true,

                branch: 0,
                branchCount: 1,
                finishedWhole: loopsLeft < 0,
                nextQueueEntryGenerator: entry0,
            }
        }
        const queue = new BuildQueue<Data>()
        const res = queue.begin(entry0)
        expect.toBeTruthy(res)
        assert(res)

        expect.toBeEqual(Object.keys(res).length, 3, 'Queue length')

        for (const { arr, obj } of Object.values(res)) {
            expect.toBeEqual(Object.keys(obj).length, 3, 'obj length')
            expect.arraysToBeEqual(arr, [0, 1, 2])
        }
    }

    @Test()
    dataMergeSomeFail() {
        type Data = { arr: number[]; obj: Record<string, number> }

        const entry0: NextQueueEntryGenerator<Data> = function (id): QueueEntry<Data> {
            return {
                data: { arr: [0], obj: { a: 0 } },
                id,

                branch: 0,
                branchCount: 1,
                nextQueueEntryGenerator: entry1,
            }
        }
        const entry1: NextQueueEntryGenerator<Data> = function (id): QueueEntry<Data> {
            return {
                data: { arr: [1], obj: { b: 1 } },
                id,

                branch: 0,
                branchCount: 3,
                nextQueueEntryGenerator: entry2,
            }
        }
        const entry2: NextQueueEntryGenerator<Data> = function (id, branch, accesor): QueueEntry<Data> | null {
            if (branch == 1) return null
            const last = accesor.get(id)

            return {
                data: { arr: [last.arr.last() + 1], obj: { c: last.obj['b'] + 1 } },
                id,

                branch: 0,
                branchCount: 1,
                nextQueueEntryGenerator: entry3,
            }
        }
        let firstTime = true
        const entry3: NextQueueEntryGenerator<Data> = function (id, _branch, accesor): QueueEntry<Data> | null {
            if (firstTime) {
                firstTime = false
                return null
            }
            const last = accesor.get(id)

            return {
                data: { arr: [last.arr.last() + 1], obj: {} },
                id,
                finishedEntry: true,

                branch: 0,
                branchCount: 1,
                finishedWhole: true,
            }
        }
        const queue = new BuildQueue<Data>()
        const res = queue.begin(entry0)
        expect.toBeTruthy(res)
        assert(res)

        expect.toBeEqual(Object.keys(res).length, 1, 'Queue length')
        const { arr, obj } = res[0]
        expect.toBeEqual(Object.keys(obj).length, 3, 'obj length')
        expect.arraysToBeEqual(arr, [0, 1, 2, 3])
    }
}
