import { AreaBuilder, AreaInfo } from "@root/area/area-builder"
import { assert, assertBool, randomSeedInt, setRandomSeed } from "@root/util/misc"
import { AreaPoint, Dir, PosDir } from "@root/util/pos"
import { Arm, ArmEnd, ArmRuntime, ArmRuntimeEntry, ExclusiveMapBuilder, MapBuilderPool, copyArmRuntime, copyBuilderPool } from "./dungeon-arm"

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

        function recursivePrepArm(arm: Arm): ArmRuntime {
            const armr: ArmRuntime = arm as ArmRuntime
            if (Array.isArray(arm.length)) {
                armr.length = randomSeedInt(arm.length[0], arm.length[1])
            }
            if (armr.end == ArmEnd.Arm) {
                armr.arms = armr.arms.map((childArm: Arm) => {
                    return recursivePrepArm(childArm)
                })
            }
            return armr as ArmRuntime
        }
        const newArm: ArmRuntime = recursivePrepArm(normalConfig.arm!)
        const cr: DungeonGenerateConfig<ArmRuntime> = {
            seed: normalConfig.seed,
            areaInfo: normalConfig.areaInfo,
            arm: newArm,
        }
        assert(cr.arm)
        cr.arm.rootArm = true

        this.c = cr
    }

    private recursiveTryPlaceArmEntry(arm: ArmRuntime, lastEntry: ArmRuntimeEntry, armIndex?: number): ArmRuntime | null {
        assertBool(typeof arm.length === 'number')
        if (arm.stack.length == arm.length + 1) {
            /* completed arm */
            if (arm.end == ArmEnd.Arm) {
                /* try place all arm ends */
                assertBool(Array.isArray(lastEntry.lastExit))
                for (let i = 0; i < arm.arms.length; i++) {
                    const armEnd = arm.arms[i]
                    armEnd.stack = []
                    armEnd.parentArm = arm
                    armEnd.parentArmIndex = i
                    const retArm = this.recursiveTryPlaceArmEntry(armEnd, lastEntry, i)
                    if (retArm) {
                        arm.arms[i] = retArm
                    } else {
                        return null
                    }
                }
            }
            return arm
        }

        let poolIndex: number
        const isEnd: boolean = arm.stack.length == arm.length
        if (isEnd) {
            /* reached the end of the arm, time to place the end room */
            poolIndex = arm.endBuilderPool
        } else {
            poolIndex = arm.builderPool
        }
        let skipPoolCopy: boolean = false
        if (arm.stack.length == 0 && arm.bPool) {
            skipPoolCopy = true
            if (! lastEntry.bPool) { lastEntry.bPool = [] }
            for (const overrideEntry of Object.values(arm.bPool)) {
                lastEntry.bPool[overrideEntry.index] = overrideEntry
            }
        }
        const avBuilders = lastEntry.bPool![poolIndex]
        assert(avBuilders)
        for (const possibleBuilder of avBuilders.arr) {
            const retArm = this.recursiveTryArmBuilder(possibleBuilder, arm, lastEntry, poolIndex, skipPoolCopy, isEnd, armIndex)
            if (retArm) { return retArm }
        }
        return null /* hit end, popping */
    }

    private recursiveTryArmBuilder(builder: ExclusiveMapBuilder, arm: ArmRuntime, lastEntry: ArmRuntimeEntry,
        bPoolIndex: number, skipPoolCopy: boolean, isEnd: boolean, armIndex: number | undefined ) {

        let lastExit: PosDir<AreaPoint>
        if (armIndex !== undefined) {
            assertBool(Array.isArray(lastEntry.lastExit))
            lastExit = lastEntry.lastExit[armIndex]
        } else {
            assertBool(! Array.isArray(lastEntry.lastExit))
            lastExit = lastEntry.lastExit
        }
        if (! builder.prepareToArrange(lastExit.dir, isEnd, arm)) { return }
     
        const obj = AreaBuilder.tryGetAreaRects(builder, lastExit, arm)
        if (! obj) { /* map overlaps */ return }
        assertBool(obj.rooms.length == obj.rects.length)
     
        // shallow copy
        arm = copyArmRuntime(arm)
        assert(lastEntry.bPool)
        let bPool: MapBuilderPool = skipPoolCopy ? lastEntry.bPool : copyBuilderPool(lastEntry.bPool)
        if (builder.exclusive) {
            const arr = bPool[bPoolIndex].arr
            arr.splice(arr.indexOf(builder), 1)
        }

        arm.stack.push({
            builder: builder.copy(),
            areaRects: obj.rects.map(e => e),
            rooms: obj.rooms.map(e => e),
            lastExit: obj.exits.length == 1 ? obj.exits[0]! : obj.exits.map(e => e!),
            bPool,
        })
        lastEntry = arm.stack.last()
     
        return this.recursiveTryPlaceArmEntry(arm, lastEntry)
    }

    async arrangeDungeon(): Promise<DungeonGenerateConfig<ArmRuntime>> {
        assert(this.c.arm)
        this.c.arm.stack = []
        const lastEntry: Partial<ArmRuntimeEntry> = {
            lastExit: Object.assign(new AreaPoint(0, 0), { dir: Dir.NORTH }),
        }
        const retArm = this.recursiveTryPlaceArmEntry(this.c.arm, lastEntry as ArmRuntimeEntry)
        this.c.arm = retArm ? retArm : undefined
        return this.c
    }
}

