import { assert, merge } from '../util/util'

export type Id = number
export interface BuildQueueAccesor<T> {
    queue: Readonly<BuildQueue<T>['queue']>
    globalPopCount: number
    globalPushCount: number

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
    newId?: number

    branch: number
    branchCount: number
} & (
    | { finishedWhole: true }
    | ({ finishedWhole?: boolean } & (
          | { nextQueueEntryGenerator: NextQueueEntryGenerator<T> }
          | { getNextQueueEntryGenerator: () => NextQueueEntryGenerator<T> }
      ))
)

export class BuildQueue<T> {
    queue: QueueEntry<T>[] = []
    globalPopCount: number = 0
    globalPushCount: number = 0

    lastPopCount: number = 0
    lastPushCount: number = 0
    lastChoppingMultiplier: number = 1

    constructor(public aggressiveChopping: boolean = false) {}

    begin(nextQueueEntryGenerator: NextQueueEntryGenerator<T>): T[] | null {
        this.queue.push(nextQueueEntryGenerator(0, 0, this)!)
        this.postStep()

        while (!this.queue.last().finishedWhole) {
            if (!this.step()) return null
        }

        const rec: Record<Id, T> = {}

        for (const entry of this.queue) {
            if (!entry.finishedEntry) continue

            rec[entry.id] = entry.data
        }

        return Object.values(rec)
    }

    step(): boolean {
        const lastE = this.queue.last()
        if (lastE.branch == lastE.branchCount) {
            this.queue.pop()
            this.globalPopCount++

            if (this.aggressiveChopping) {
                this.lastPopCount++
                if (this.lastPushCount % 1000 == 0) {
                    const diff = this.lastPushCount - this.lastPopCount
                    if (diff < 5) {
                        const toChop = Math.floor(10 * this.lastChoppingMultiplier * (this.queue.length / 100))
                        this.lastChoppingMultiplier = Math.min(10, this.lastChoppingMultiplier * 1.5)

                        this.queue.splice(this.queue.length - toChop, 10e3)
                        // console.log( 'chopping', toChop, 'multi', this.lastChoppingMultiplier.round(1), 'newlen', this.queue.length)
                    } else {
                        this.lastChoppingMultiplier = Math.max(0.2, this.lastChoppingMultiplier * 0.8)
                    }
                    this.lastPushCount = 1
                    this.lastPopCount = 1
                }
            }

            const lastE = this.queue.last()
            if (!lastE) return false
            lastE.branch++
            return true
        }

        let id = lastE.id
        if (lastE.finishedEntry) id++
        if (lastE.newId) id = lastE.newId

        assert(!lastE.finishedWhole)
        assert('nextQueueEntryGenerator' in lastE)
        const newE = lastE.nextQueueEntryGenerator(id, lastE.branch, this)
        if (newE === null) {
            lastE.branch++
            return true
        }
        this.queue.push(newE)
        this.globalPushCount++
        if (this.aggressiveChopping) this.lastPushCount++

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
        const data: T = {} as any

        for (const entry of this.queue) {
            if (entry.id != latestEntry.id) continue
            merge(data, entry.data)
        }

        return data
    }
}
