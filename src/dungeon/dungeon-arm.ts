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

export enum MapBuilderArrayGenerateInheritanceMode {
    None = 0,
    Override = 1,
}

export interface MapBuilderArrayGenerate {
    arr: ExclusiveMapBuilder[]
    randomize: boolean
    inheritance: MapBuilderArrayGenerateInheritanceMode
    inheritanceIsEnd?: boolean
}

interface TEMP$BaseArm {
    length: number | [number, number]
    builders: MapBuilderArrayGenerate
    endBuilders: MapBuilderArrayGenerate
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

export type ArmRuntimeEntry = {
    builder: MapBuilder
    areaRects: AreaRect[]
    rooms: Room[]
    lastExit: PosDir<AreaPoint> | PosDir<AreaPoint>[] /* set for all builders expect for the last one if its an arm */
    avBuilders: MapBuilderArrayGenerate
}

export type ArmRuntime = {
    builders: MapBuilderArrayGenerate
    endBuilders: MapBuilderArrayGenerate
    parentArm?: ArmRuntime & TEMP$ArmArm<ArmRuntime>

    stack: ArmRuntimeEntry[]
    rootArm: boolean
    flatRuntimeCache?: ArmRuntimeEntry[]
} & TEMP$BaseArm & (TEMP$ItemArm | TEMP$ArmArm<ArmRuntime>)

export namespace MapBuilderArrayGenerate {
    export function inheritNone(b: Omit<MapBuilderArrayGenerate, 'inheritance'>) : MapBuilderArrayGenerate {
        const copy: Partial<MapBuilderArrayGenerate> = {
            randomize: b.randomize,
            inheritance: MapBuilderArrayGenerateInheritanceMode.None,
        }
        copy.arr = [...b.arr]
        return copy as MapBuilderArrayGenerate
    }

    export function inheritOverride(inheritanceIsEnd: boolean): MapBuilderArrayGenerate {
        return {
            randomize: false,
            arr: [],
            inheritance: MapBuilderArrayGenerateInheritanceMode.Override,
            inheritanceIsEnd,
        }
    }
}


export function copyArmRuntime(arm: ArmRuntime): ArmRuntime {
    const newArm: ArmRuntime = {...arm}
    newArm.stack = [...newArm.stack]
    return newArm
}

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

export function flatOutArmTopDown(arm: ArmRuntime, allowCache: boolean = true): ArmRuntimeEntry[] {
    if (allowCache && arm.flatRuntimeCache) { return arm.flatRuntimeCache }
    const entries: ArmRuntimeEntry[] = []
    forEveryArmEntry(arm, (entry: ArmRuntimeEntry) => {
        entries.push(entry)
    })
    if (arm.rootArm) {
        arm.flatRuntimeCache = entries
    }
    return entries
}
