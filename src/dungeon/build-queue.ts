import { assert, merge } from '../util/util'

export type Id = number
export interface BuildQueueAccesor<T> {
    queue: Readonly<BuildQueue<T>['queue']>

    get: BuildQueue<T>['get']
}

export type NextQueueEntryGenerator<T> = (
    mapId: Id,
    branch: number,
    accesor: BuildQueueAccesor<T>
) => QueueEntry<T> | null

export type QueueEntry<T> = {
    data: T
    id: Id
    finishedEntry?: boolean
    dataNoMerge?: boolean

    branch: number
    branchCount: number
} & (
    | { finishedWhole: true }
    | ({ finishedWhole?: boolean } & (
          | { nextQueueEntryGenerator: NextQueueEntryGenerator<T> }
          | { getNextQueueEntryGenerator: () => NextQueueEntryGenerator<T> }
      ))
)

export type BuildQueueResult<T> = Record<Id, T>

export class BuildQueue<T> {
    queue: QueueEntry<T>[] = []

    begin(nextQueueEntryGenerator: NextQueueEntryGenerator<T>): BuildQueueResult<T> | null {
        this.queue.push(nextQueueEntryGenerator(0, 0, this)!)
        this.postStep()

        while (!this.queue.last().finishedWhole) {
            if (!this.step()) return null
        }

        const res: BuildQueueResult<T> = {}

        for (const entry of this.queue) {
            if (!entry.finishedEntry) continue

            res[entry.id] = entry.data
        }

        return res
    }

    step(): boolean {
        const lastE = this.queue.last()
        if (lastE.branch == lastE.branchCount) {
            this.queue.pop()
            const lastE = this.queue.last()
            if (!lastE) return false
            lastE.branch++
            return true
        }

        let id = lastE.id
        if (lastE.finishedEntry) id++

        assert(!lastE.finishedWhole)
        assert('nextQueueEntryGenerator' in lastE)
        const newE = lastE.nextQueueEntryGenerator(id, lastE.branch, this)
        if (newE === null) {
            lastE.branch++
            return true
        }
        this.queue.push(newE)

        this.postStep()
        return true
    }

    postStep() {
        const lastIndex = this.queue.length - 1
        const newE = this.queue[lastIndex]

        if (newE.finishedEntry && !newE.dataNoMerge) {
            newE.data = this.mergeData(newE)
        }
        if (!newE.finishedWhole && 'getNextQueueEntryGenerator' in newE) {
            const func = newE.getNextQueueEntryGenerator
            Object.assign(newE, {
                getNextQueueEntryGenerator: undefined,
                nextQueueEntryGenerator: func(),
            })
        }
    }

    private findLastEntry(id: Id): QueueEntry<T> {
        for (let i = this.queue.length - 1; i >= 0; i--) {
            const entry = this.queue[i]
            if (entry.id == id) return entry
        }
        throw new Error('how? entry not found')
    }

    get(id: Id): T {
        const latestEntry = this.findLastEntry(id)
        if (latestEntry.finishedEntry) return latestEntry.data

        const data = this.mergeData(latestEntry)
        return data
    }

    private mergeData(latestEntry: QueueEntry<T>): T {
        const limit = this.queue.length - 1
        const data: T = {} as any
        let i
        for (i = limit; i >= 0; i--) {
            const entry = this.queue[i]
            if (entry.id != latestEntry.id) {
                break
            }
            if (entry.dataNoMerge) continue
        }

        i++
        for (; i < limit + 1; i++) {
            const entry = this.queue[i]
            if (entry.id != latestEntry.id) throw new Error('id mismatch')
            merge(data, entry.data)
        }

        return data
    }
}
