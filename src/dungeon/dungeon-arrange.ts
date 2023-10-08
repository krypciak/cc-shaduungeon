import { AreaBuilder, AreaInfo } from "@root/area/area-builder"
import { assert, assertBool, } from "cc-map-util/util"
import { AreaPoint, Dir, PosDir } from "cc-map-util/pos"
import { Arm, ArmEnd, ArmRuntime, ArmRuntimeEntry, ExclusiveMapBuilder, MapBuilderPool, copyArmRuntime, copyBuilderPool, } from "@root/dungeon/dungeon-arm"
import { randomSeedInt, setRandomSeed, shuffleArray } from "@root/util/misc"

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
        console.log(normalConfig.seed)

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
            if (armr.bPool) {
                Object.values(armr.bPool).forEach(v => {
                    if (v.randomize) {
                        v.arr = shuffleArray(v.arr)
                    }
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

    private tryArmBranch(arm: ArmRuntime, index: number): ArmRuntime | undefined {
        assertBool(arm.end == ArmEnd.Arm)
        const armEnd = arm.arms[index]
        armEnd.stack = []
        armEnd.parentArm = arm
        armEnd.parentArmIndex = index
        const parentLastEntry: ArmRuntimeEntry = { ...arm.stack.last() }
        if (index > 0) {
            parentLastEntry.bPool = arm.arms[index - 1].stack.last().bPool
        }

        const retArm = this.recursiveTryPlaceArmEntry(armEnd, parentLastEntry, armEnd.parentArmIndex)
        if (retArm) {
            assertBool(armEnd.parentArm === arm)
        }
        return retArm
    }

    private recursiveTryPlaceArmEntry(arm: ArmRuntime, lastEntry: ArmRuntimeEntry, armIndex?: number): ArmRuntime | undefined {
        assertBool(typeof arm.length === 'number')
        /* if arm is completed */
        if (arm.stack.length == arm.length + 1) {
            let retArm: ArmRuntime | undefined = arm
            if (retArm.end == ArmEnd.Arm) {
                assertBool(lastEntry.builder.exitCount == lastEntry.lastExit.length)
                assertBool(retArm.arms.length == lastEntry.builder.exitCount, 'exit count missmatch with arm count')
                retArm = this.tryArmBranch(arm, 0)?.parentArm /* this has to return the same as arm */
                if (! retArm) { return undefined }
            } 
            if (retArm.parentArmIndex !== undefined) { /* if doing arm branch filling */
                assert(retArm.parentArm)
                retArm.parentArm.arms[retArm.parentArmIndex].stack = arm.stack
                if (retArm.parentArmIndex == retArm.parentArm.arms.length - 1) {
                    /* all arm branched filled succesfully */
                    return retArm
                }
                /* else continue to the next arm branch */
                retArm = this.tryArmBranch(retArm.parentArm, retArm.parentArmIndex + 1)
            }
            return retArm
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
        assertBool(avBuilders.arr.length > 0, 'ran out of builders')
        const len: number = arm.stack.length
        for (const possibleBuilder of avBuilders.arr) {
            if (arm.stack.length != len) {
                arm.stack = arm.stack.slice(0, len)
                assertBool(arm.stack.length == len, 'why')
            }
            const retArm = this.recursiveTryArmBuilder(possibleBuilder, arm, lastEntry, poolIndex, skipPoolCopy, isEnd, armIndex)
            if (retArm) { return retArm }
        }
        return undefined /* hit end, popping */
    }

    private recursiveTryArmBuilder(builder: ExclusiveMapBuilder, arm: ArmRuntime, lastEntry: ArmRuntimeEntry,
        bPoolIndex: number, skipPoolCopy: boolean, isEnd: boolean, armIndex: number | undefined ) {

        const lastExit: PosDir<AreaPoint> = lastEntry.lastExit[armIndex ?? 0]
        if (! builder.prepareToArrange(lastExit.dir, isEnd, arm)) { return }
     
        const obj = AreaBuilder.tryGetAreaRects(builder, lastExit, arm)
        if (! obj) { return /* map overlaps */ }
        assertBool(obj.rooms.length == obj.rects.length)
     
        // shallow copy
        const newArm = copyArmRuntime(arm)
        assert(lastEntry.bPool)
        let bPool: MapBuilderPool = skipPoolCopy ? lastEntry.bPool : copyBuilderPool(lastEntry.bPool)
        if (builder.exclusive) {
            const arr = bPool[bPoolIndex].arr
            arr.splice(arr.indexOf(builder), 1)
        }

        newArm.stack.push({
            builder: builder.copy(),
            areaRects: [...obj.rects],
            rooms: [...obj.rooms],
            lastExit: obj.exits.map(e => e!),
            bPool,
        })
        lastEntry = newArm.stack.last()
     
        return this.recursiveTryPlaceArmEntry(newArm, lastEntry)
    }

    async arrangeDungeon(): Promise<DungeonGenerateConfig<ArmRuntime>> {
        assert(this.c.arm)
        this.c.arm.stack = []
        const lastEntry: Partial<ArmRuntimeEntry> = {
            lastExit: [Object.assign(new AreaPoint(0, 0), { dir: Dir.NORTH })],
        }
        let retArm: ArmRuntime | undefined = this.recursiveTryPlaceArmEntry(this.c.arm, lastEntry as ArmRuntimeEntry)
        retArm && assertBool(retArm.rootArm)
        this.c.arm = retArm
        return this.c
    }
}

