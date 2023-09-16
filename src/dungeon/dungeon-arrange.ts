import { AreaBuilder, AreaInfo } from "@root/area/area-builder"
import { MapBuilder } from "@root/room/map-builder"
import { Room } from "@root/room/room"
import { Stack, assert, assertBool, randomSeedInt, setRandomSeed } from "@root/util/misc"
import { AreaPoint, AreaRect, Dir, PosDir } from "@root/util/pos"

export enum ArmEnd {
    Item,
    Arm,
}
export enum ArmItemType {
    DungeonKey,
    Tresure,
}

export type ExclusiveMapBuilder = MapBuilder & { exclusive: boolean }
interface TEMP$BaseArm {
    length: number | [number, number]
    builders: Set<ExclusiveMapBuilder>
    endBuilders: Set<ExclusiveMapBuilder>
}

interface TEMP$ItemArm extends TEMP$BaseArm {
    end: ArmEnd.Item
    itemType: ArmItemType
}
interface TEMP$ArmArm<T extends Arm> extends TEMP$BaseArm {
    end: ArmEnd.Arm
    arms: T[]
}

type Arm = TEMP$ItemArm | TEMP$ArmArm<Arm>

export type ArmRuntimeStackEntry = {
    builder: MapBuilder
    areaRects: AreaRect[]
    rooms: Room[]
    lastExit: PosDir<AreaPoint> | PosDir<AreaPoint>[] /* set for all builders expect for the last one if its an arm */
    avBuilders: Set<ExclusiveMapBuilder>
}

export type ArmRuntime = {
    parentArm?: ArmRuntime

    stack: Stack<ArmRuntimeStackEntry>
} & TEMP$BaseArm & (TEMP$ItemArm | TEMP$ArmArm<ArmRuntime>)

function copyArmRuntime(arm: ArmRuntime): ArmRuntime {
    const newArm: ArmRuntime = {...arm}
    newArm.stack = new Stack(newArm.stack.array)
    return newArm
}

export function flatOutArmTopDown(arm: ArmRuntime): ArmRuntimeStackEntry[] {
    const entries: ArmRuntimeStackEntry[] = []
    entries.push(...arm.stack.array)
    if (arm.end == ArmEnd.Arm) {
        arm.arms.forEach(a => {
            entries.push(...flatOutArmTopDown(a))
        })
    }
    return entries

}

export interface DungeonGenerateConfig<T extends Arm = Arm> {
    arm?: T
    seed: string
    areaInfo: AreaInfo
}

export class DungeonArranger {
    c: DungeonGenerateConfig<ArmRuntime>
    normalConfig: Readonly<DungeonGenerateConfig>
    constructor(normalConfig: DungeonGenerateConfig) {
        this.normalConfig = Object.freeze(normalConfig)
        setRandomSeed(normalConfig.seed)

        function recursivePrepArm(arm: Arm, parent?: ArmRuntime): ArmRuntime {
            const armr: Partial<ArmRuntime> = { ...arm } as ArmRuntime
            armr.parentArm = parent
            if (Array.isArray(arm.length)) {
                arm.length = randomSeedInt(arm.length[0], arm.length[1])
            }
            if (arm.end == ArmEnd.Arm) {
                arm.arms = arm.arms.map((childArm: Arm) => {
                    return recursivePrepArm(childArm, armr as ArmRuntime)
                })
            }
            return armr as ArmRuntime
        }
        const newArm = recursivePrepArm(normalConfig.arm!)
        const cr: DungeonGenerateConfig<ArmRuntime> = {
            seed: normalConfig.seed,
            areaInfo: normalConfig.areaInfo,
            arm: newArm,
        }
        this.c = cr
    }


    private recursiveTryPlaceArmEntry(arm: ArmRuntime, lastEntry: ArmRuntimeStackEntry, armIndex?: number):
        { arm: ArmRuntime; finishedArm: boolean } | null {

        let avBuilders: Set<ExclusiveMapBuilder>
        assertBool(typeof arm.length === 'number')
        if (arm.stack.length() == arm.length + 1) {
            /* completed arm */
            if (arm.end == ArmEnd.Arm) {
                /* try place all arm ends */
                assertBool(Array.isArray(lastEntry.lastExit))
                arm.arms.forEach((armEnd, i) => {
                    armEnd.stack = new Stack()
                    const obj = this.recursiveTryPlaceArmEntry(armEnd, lastEntry, i)
                    if (obj && obj.finishedArm) {
                        arm.arms[i] = obj.arm
                    } else {
                        return null
                    }
                })
            }
            return { arm, finishedArm: true }
        } else if (arm.stack.length() == arm.length) {
            /* reached the end of the arm, time to place the end room */
            avBuilders = arm.endBuilders
        } else {
            avBuilders = arm.stack.length() > 0 ? arm.stack.peek().avBuilders : arm.builders
        }
        for (const possibleBuilder of avBuilders) {
            const obj = this.recursiveTryArmBuilder(possibleBuilder, arm, lastEntry, armIndex)
            if (obj && obj.finishedArm) { return obj }
        }
        return null /* hit end, popping */
    }

    private recursiveTryArmBuilder(builder: ExclusiveMapBuilder, arm: ArmRuntime, lastEntry: ArmRuntimeStackEntry, armIndex?: number) {
        let lastExit: PosDir<AreaPoint>
        if (armIndex !== undefined) {
            assertBool(Array.isArray(lastEntry.lastExit))
            lastExit = lastEntry.lastExit[armIndex]
        } else {
            assertBool(! Array.isArray(lastEntry.lastExit))
            lastExit = lastEntry.lastExit
        }
        if (! builder.prepareToArrange(lastExit.dir)) { return }
     
        const obj = AreaBuilder.tryGetAreaRects(builder, lastExit, arm)
        if (! obj) { /* map overlaps */ return }
        assertBool(obj.rooms.length == obj.rects.length)
     
        // shallow copy
        arm = copyArmRuntime(arm)
        const avBuilders = new Set(lastEntry.avBuilders ?? arm.builders)
        if (builder.exclusive) {
            avBuilders.delete(builder)
        }
        arm.stack.push({
            builder,
            areaRects: obj.rects,
            rooms: obj.rooms,
            lastExit: obj.exits.length == 1 ? obj.exits[0]! : obj.exits.map(e => e!),
            avBuilders,
        })
        lastEntry = arm.stack.array.last()
     
        return this.recursiveTryPlaceArmEntry(arm, lastEntry)
    }

    async arrangeDungeon(): Promise<DungeonGenerateConfig<ArmRuntime>> {
        
        // await PuzzleRoom.preloadPuzzleList()
        // let puzzleList = PuzzleRoom.puzzleList

        // const puzzles: Readonly<Selection>[] = []
        // // puzzleList = puzzleList.sort(() => Math.random() - 0.5)
        // for (let i = 0; i < puzzleList.length; i++) {
        //     puzzles.push(puzzleList[i])
        // }

        // console.log('puzzles:', puzzles)
        // for (let builderIndex = builders.length, i = 0; i < puzzles.length; builderIndex++, i++) {
        //     const sel = puzzles[builderIndex]
        //     const puzzleMap: sc.MapModel.Map = await blitzkrieg.util.getMapObject(sel.map)
        //     const builder: MapBuilder = new BattlePuzzleMapBuilder(this.c.areaInfo, sel, puzzleMap)
        //     builders.push(builder)
        // }

        // SimpleRoomMapBuilder.addRandom(builders, areaInfo, 100, [SimpleRoomMapBuilder, SimpleSingleTunnelMapBuilder, SimpleDoubleTunnelMapBuilder, SimpleDoubleRoomMapBuilder])
        // SimpleRoomMapBuilder.addRandom(builders, areaInfo, 100, [SimpleDoubleRoomMapBuilder])

        // SimpleSingleTunnelMapBuilder.addPreset(builders, areaInfo)
        // SimpleRoomMapBuilder.addPreset(builders, areaInfo)
        // SimpleDoubleRoomMapBuilder.addPreset(builders, areaInfo)


        // builders.push(new SimpleRoomMapBuilder(areaInfo, Dir.SOUTH, Dir.NORTH))
        // builders.push(new SimpleSingleTunnelMapBuilder(areaInfo, Dir.SOUTH, Dir.NORTH))
        // builders.push(new SimpleDoubleTunnelMapBuilder(areaInfo, Dir.SOUTH, Dir.NORTH))
        // builders.push(new SimpleDoubleRoomMapBuilder(areaInfo, Dir.SOUTH, Dir.NORTH))

        assert(this.c.arm)
        this.c.arm.stack = new Stack()
        const lastEntry: Partial<ArmRuntimeStackEntry> = {
            lastExit: Object.assign(new AreaPoint(0, 0), { dir: Dir.NORTH }),
        }
        const obj = this.recursiveTryPlaceArmEntry(this.c.arm, lastEntry as ArmRuntimeStackEntry)
        this.c.arm = obj?.arm
        return this.c
    }
}

