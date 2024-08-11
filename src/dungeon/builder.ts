import { BuildQueue } from './build-queue'

export type RoomBlueprint = {}

export type MapId = number
export type BlueprintRoot = Record<MapId, RoomBlueprint>

export class DungeonBuilder {
    build(seed: number) {
        const queue = new BuildQueue()
        // queue.begin()
    }
}
