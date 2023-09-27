import { MapBuilder } from "@root/room/map-builder"
import { Room } from "@root/room/room"
import { AreaPoint, AreaRect, PosDir } from "@root/util/pos"

export enum ArmEnd {
    Item,
    Arm,
}
export enum ArmItemType {
    DungeonKey,
    Tresure,
}

export type ExclusiveMapBuilder = MapBuilder & { exclusive: boolean }

export interface MapBuilderArrayGenerate {
    arr: ExclusiveMapBuilder[]
    randomize: boolean
    index: number
}

interface TEMP$BaseArm {
    length: number | [number, number]
    builderPool: number
    endBuilderPool: number
    bPool?: MapBuilderArrayGenerate[]
}

interface TEMP$ItemArm extends TEMP$BaseArm {
    end: ArmEnd.Item
    itemType: ArmItemType
}
interface TEMP$ArmArm<T extends Arm> extends TEMP$BaseArm {
    end: ArmEnd.Arm
    arms: T[]
}

export type Arm = TEMP$ItemArm | TEMP$ArmArm<Arm>

export type MapBuilderPool = { [key: number]: MapBuilderArrayGenerate }

export type ArmRuntimeEntry = {
    builder: MapBuilder
    areaRects: AreaRect[]
    rooms: Room[]
    lastExit: PosDir<AreaPoint>[]
    bPool?: MapBuilderPool
}

export type ArmRuntime = {
    parentArm?: ArmRuntime & TEMP$ArmArm<ArmRuntime>
    parentArmIndex?: number

    stack: ArmRuntimeEntry[]
    rootArm: boolean
    flatRuntimeCache?: (ArmRuntimeEntry & { arm: ArmRuntime })[]
} & TEMP$BaseArm & (TEMP$ItemArm | TEMP$ArmArm<ArmRuntime>)

export function copyArmRuntime(arm: ArmRuntime): ArmRuntime {
    const newArm: ArmRuntime = {...arm}
    newArm.stack = [...newArm.stack]
    return newArm
}

/*
export function copyMapBuilderPool(pool: MapBuilderPool) {
    pool = {...pool}
    Object.entries(pool).forEach((e: [string, MapBuilderArrayGenerate]) => {
        const k = parseInt(e[0])
        pool[k] = {...pool[k]}
        pool[k].arr = [...pool[k].arr]
    })
    return pool
}
*/

export function forEveryArmEntry(arm: ArmRuntime, func: (entry: ArmRuntimeEntry, arm: ArmRuntime, index: number) => void) {
    const entries: ArmRuntimeEntry[] = []
    if (arm.stack) { arm.stack.forEach((e, i) => func(e, arm, i)) }
    if (arm.end == ArmEnd.Arm) {
        arm.arms.forEach(a => {
            forEveryArmEntry(a, func)
        })
    }
    return entries
}

export function flatOutArmTopDown(arm: ArmRuntime, allowCache: boolean = true): (ArmRuntimeEntry & { arm: ArmRuntime })[] {
    if (allowCache && arm.flatRuntimeCache) { return arm.flatRuntimeCache }
    const entries: (ArmRuntimeEntry & { arm: ArmRuntime })[] = []
    forEveryArmEntry(arm, (entry: ArmRuntimeEntry, arm: ArmRuntime) => {
        entries.push(Object.assign(entry, { arm }))
    })
    if (arm.rootArm) {
        arm.flatRuntimeCache = entries
    }
    return entries
}

export function copyBuilderPool(pool: MapBuilderPool): MapBuilderPool {
    return Object.values(pool).map(e => ({
        arr: [...e.arr],
        randomize: e.randomize,
        index: e.index
    }))
}
