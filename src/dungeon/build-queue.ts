import { MapId as Id } from './builder'

import type * as _ from 'ultimate-crosscode-typedefs'

export interface BuildQueueAccesor<T> {
    queue: Readonly<BuildQueue<T>['queue']>

    get: BuildQueue<T>['get']
}

export type NextQueueEntryGenerator<T> = (mapId: Id, branch: number, accesor: BuildQueueAccesor<T>) => QueueEntry<T> | null

export type QueueEntry<T> = {
    data: T
    id: Id
    finishedEntry?: boolean
    finishedWhole?: boolean

    branch: number
    branchCount: number
    getNextQueueEntry: NextQueueEntryGenerator<T>
}

export type BuildQueueResult<T> = Record<Id, T>

export class BuildQueue<T> {
    mapIdToQueueIndex: Record<Id, number> = {}
    queue: QueueEntry<T>[] = []

    begin(getNextQueueEntry: NextQueueEntryGenerator<T>): BuildQueueResult<T> {
        this.queue.push(getNextQueueEntry(0, 0, this)!)
        this.postStep()

        while (!this.queue.last().finishedWhole) {
            this.step()
        }

        const res: BuildQueueResult<T> = {}

        for (const entry of this.queue) {
            if (!entry.finishedEntry) continue
            // TODO: merge
            res[entry.id] = entry.data
        }

        return res
    }

    step() {
        const lastE = this.queue.last()
        if (lastE.branch == lastE.branchCount) {
            this.queue.pop()
            const lastE = this.queue.last()
            lastE.branch++
            return
        }

        let id = lastE.id
        if (lastE.finishedEntry) id++
        const newE = lastE.getNextQueueEntry(id, lastE.branch, this)
        if (newE === null) {
            lastE.branch++
            return
        }
        this.queue.push(newE)

        this.postStep()
    }

    postStep() {
        const lastIndex = this.queue.length - 1
        const newE = this.queue[lastIndex]
        this.mapIdToQueueIndex[newE.id] = lastIndex
    }

    get(id: Id): T {
        return this.queue[this.mapIdToQueueIndex[id]].data
    }
}
