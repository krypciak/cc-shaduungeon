import { expect, Test, TestSuite } from 'testyts'

import type * as _ from '../setup-test'
import { BuildQueue, NextQueueEntryGenerator, QueueEntry } from '../dungeon/build-queue'

@TestSuite()
export class Test_DungeonQueue {
    @Test()
    branchless() {
        type Data = { countLeft: number }
        const getNextQueueEntry: NextQueueEntryGenerator<Data> = function (): QueueEntry<Data> {
            const getNextQueueEntry: NextQueueEntryGenerator<Data> = function (
                mapId,
                _branch,
                accesor
            ): QueueEntry<Data> {
                const last = accesor.get(mapId - 1)
                return {
                    data: {
                        countLeft: last.countLeft - 1,
                    },
                    id: mapId,
                    finishedEntry: true,
                    finishedWhole: last.countLeft == 1,

                    branch: 0,
                    branchCount: 1,
                    getNextQueueEntry,
                }
            }
            return {
                data: {
                    countLeft: 4,
                } as any,
                id: 0,
                finishedEntry: true,

                branch: 0,
                branchCount: 1,
                getNextQueueEntry,
            }
        }
        const queue = new BuildQueue<Data>()
        const res = queue.begin(getNextQueueEntry)
        expect.toBeEqual(Object.keys(res).length, 5, 'Queue length')
        expect.toBeEqual(Object.values(res).last().countLeft, 0, 'Last value')
    }
}
