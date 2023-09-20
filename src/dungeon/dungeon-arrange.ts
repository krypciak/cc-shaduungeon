import { AreaBuilder, AreaInfo } from "@root/area/area-builder"
import { MapBuilder } from "@root/room/map-builder"
import { assert, assertBool, randomSeedInt, setRandomSeed, shuffleArray } from "@root/util/misc"
import { AreaPoint, Dir, PosDir } from "@root/util/pos"
import { Arm, ArmEnd, ArmRuntime, ArmRuntimeEntry, ExclusiveMapBuilder, MapBuilderArrayGenerate, MapBuilderArrayGenerateInheritanceMode, copyArmRuntime, flatOutArmTopDown } from "./dungeon-arm"

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
            armr.builders = {...armr.builders}
            armr.endBuilders = {...armr.endBuilders}

            const defExitCount = 1
            for (const b of armr.builders.arr) { assertBool(b.exitCount == defExitCount, 'invalid dng config: builder in builders exit count exit count has to be 1, it isnt') }
            const exitCount = armr.end == ArmEnd.Arm ? armr.arms.length : defExitCount
            for (const b of armr.endBuilders.arr) { assertBool(b.exitCount == exitCount, 'invalid dng config: builder in endBuilders exit count exit count has match the arm count, it doesnt') }

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
        cr.arm!.rootArm = true
        this.c = cr
    }

    private inheritBuilders(builders: MapBuilderArrayGenerate, parentArm: ArmRuntime | undefined): MapBuilderArrayGenerate {
        switch (builders.inheritance) {
            case MapBuilderArrayGenerateInheritanceMode.None:
                return builders
            case MapBuilderArrayGenerateInheritanceMode.Override:
                assert(parentArm)
                return (builders.inheritanceIsEnd ? parentArm.stack.last() : parentArm.stack[parentArm.stack.length - 2]).avBuilders
            default: throw new Error('not implemented')
        }
    }

    private recursiveTryPlaceArmEntry(arm: ArmRuntime, lastEntry: ArmRuntimeEntry, armIndex?: number):
        ArmRuntime | null {

        let avBuilders: MapBuilderArrayGenerate
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
        const isEndRoom: boolean = arm.stack.length == arm.length
        const isStartRoom: boolean = arm.stack.length == 0

        if (isEndRoom) {
            /* reached the end of the arm, time to place the end room */
            avBuilders = this.inheritBuilders(arm.endBuilders, arm.parentArm)
        } else if (isStartRoom) {
            avBuilders = this.inheritBuilders(arm.builders, arm.parentArm)
        } else {
            avBuilders = arm.stack.last().avBuilders
        }
        for (const possibleBuilder of avBuilders.arr) {
            const ignoreLastEntry = isStartRoom || isEndRoom
            const retArm = this.recursiveTryArmBuilder(possibleBuilder, arm, lastEntry, armIndex, ignoreLastEntry ? avBuilders : arm.builders, ignoreLastEntry)
            if (retArm) { return retArm }
        }
        return null /* hit end, popping */
    }

    private recursiveTryArmBuilder(builder: ExclusiveMapBuilder, arm: ArmRuntime, lastEntry: ArmRuntimeEntry,
        armIndex: number | undefined, builders: MapBuilderArrayGenerate, ignoreLastEntry: boolean) {

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
        let avBuilders: MapBuilderArrayGenerate
        if (! ignoreLastEntry && lastEntry.avBuilders) {
            avBuilders = {
                arr: [...lastEntry.avBuilders.arr],
                randomize: lastEntry.avBuilders.randomize,
                inheritance: lastEntry.avBuilders.inheritance,
            }
        } else {
            avBuilders = {
                arr: builders.randomize ? shuffleArray(builders.arr) : [...builders.arr],
                randomize: builders.randomize,
                inheritance: builders.inheritance,
            }
        }
        if (builder.exclusive) {
            avBuilders.arr.splice(avBuilders.arr.indexOf(builder), 1)
        }

        arm.stack.push({
            builder,
            areaRects: obj.rects,
            rooms: obj.rooms,
            lastExit: obj.exits.length == 1 ? obj.exits[0]! : obj.exits.map(e => e!),
            avBuilders,
        })
        lastEntry = arm.stack.last()
     
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
        this.c.arm.stack = []
        const lastEntry: Partial<ArmRuntimeEntry> = {
            lastExit: Object.assign(new AreaPoint(0, 0), { dir: Dir.NORTH }),
        }
        const retArm = this.recursiveTryPlaceArmEntry(this.c.arm, lastEntry as ArmRuntimeEntry)
        if (retArm) {
            /* make sure no builders are linked */
            const arr = flatOutArmTopDown(retArm)
            const set: Set<MapBuilder> = new Set()
            let copyCount = 0
            for (let i = 0; i < arr.length; i++) {
                const e = arr[i]
                if (set.has(e.builder)) {
                    e.builder = e.builder.copy()
                    copyCount++
                } else {
                    set.add(e.builder)
                }
            }
        }
        this.c.arm = retArm ? retArm : undefined
        return this.c
    }
}

