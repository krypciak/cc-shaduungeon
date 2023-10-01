import { AreaInfo } from '@root/area/area-builder'
import { DungeonGenerateConfig, } from '@root/dungeon/dungeon-arrange'
import { ArmEnd, ArmItemType, MapBuilderArrayGenerate } from '@root/dungeon/dungeon-arm'
import { DungeonConfigFactory } from '@root/dungeon/dungeon-builder'
import { PuzzleRoom } from '@root/room/puzzle-room'
import { Selection } from '@root/types'
import { MapBuilder } from '@root/room/map-builder'
import { BattlePuzzleMapBuilder, DungeonIntersectionMapBuilder, PuzzleMapBuilder } from '@root/room/dungeon-map-builder'
import { DirUtil } from '@root/util/pos'
import { SimpleSingleTunnelEndMapBuilder } from '@root/room/simple-map-builder'
import { randomSeedInt, setRandomSeed } from '@root/util/misc'

export class DungeonConfigMainFactory implements DungeonConfigFactory {
    async get(areaInfo: AreaInfo, seed: string): Promise<DungeonGenerateConfig> {
        await PuzzleRoom.preloadPuzzleList()
        const puzzleList = PuzzleRoom.puzzleList

        const puzzles: Readonly<Selection>[] = []
        for (let i = 0; i < puzzleList.length; i++) {
            puzzles.push(puzzleList[i])
        }
        console.log('puzzles:', puzzles)


        setRandomSeed(seed)
        let index: number = 0
        const bPool = []
        const puzzleB: MapBuilderArrayGenerate = { arr: [], randomize: true, index: index++ }
        // const battlePuzzleB: MapBuilderArrayGenerate = { arr: [], randomize: true, index: index++ }
        for (let i = 0; i < puzzles.length; i++) {
            const sel = puzzles[i]
            const puzzleMap: sc.MapModel.Map = await blitzkrieg.util.getMapObject(sel.map)
            let builder: MapBuilder
            if (randomSeedInt(0, 1) == 0) {
                builder = new PuzzleMapBuilder(areaInfo, sel, puzzleMap, true, '')
            } else {
                builder = new BattlePuzzleMapBuilder(areaInfo, sel, puzzleMap)
            }
            puzzleB.arr.push(Object.assign(builder, { exclusive: true }))
        }
        bPool.push(puzzleB)
        // bPool.push(battlePuzzleB)

        bPool.push(puzzleB)
        const _sb: MapBuilderArrayGenerate = { arr: [], randomize: true, index: index++ }
        DirUtil.forEachUniqueDir2((d1, d2) => {
            const b = Object.assign(new SimpleSingleTunnelEndMapBuilder(areaInfo, d1, d2), { exclusive: true })
            _sb.arr.push(b, b, b)
        })

        bPool.push(_sb)
        const _db1: MapBuilderArrayGenerate = { arr: [], randomize: true, index: index++ }
        DirUtil.forEachUniqueDir4((d1, d2, d3, d4) => 
            _db1.arr.push(Object.assign(new DungeonIntersectionMapBuilder(areaInfo, 2, d1, d2, d3, d4), { exclusive: true })))
        bPool.push(_db1)

        const dngGenConfig: DungeonGenerateConfig = {
            seed,
            areaInfo,
            /*
            arm: {
                bPool,
                length: battlePuzzleB.arr.length / 1.5,
                builderPool: battlePuzzleB.index,
                endBuilderPool: battlePuzzleB.index,
                end: ArmEnd.Item,
                itemType: ArmItemType.Tresure,
            }
            */
            /*
            arm: {
                bPool,
                length: 1,
                builderPool: puzzleB.index,
                endBuilderPool: _db1.index,
                end: ArmEnd.Arm,
                arms: [{
                    length: 0,
                    builderPool: NaN,
                    endBuilderPool: _sb.index,
                    end: ArmEnd.Item,
                    itemType: ArmItemType.DungeonKey,
                }, {
                    length: 5,
                    builderPool: puzzleB.index,
                    endBuilderPool: battlePuzzleB.index,
                    end: ArmEnd.Item,
                    itemType: ArmItemType.DungeonKey,
                }, {
                    length: 5,
                    builderPool: puzzleB.index,
                    endBuilderPool: battlePuzzleB.index,
                    end: ArmEnd.Item,
                    itemType: ArmItemType.DungeonKey,
                }]
            },
            */
            ///*
            arm: {
                bPool,
                length: 1,
                builderPool: puzzleB.index,
                endBuilderPool: _db1.index,
                end: ArmEnd.Arm,
                arms: [{
                    length: 3,
                    builderPool: puzzleB.index,
                    endBuilderPool: _db1.index,
                    end: ArmEnd.Arm,
                    arms: [{
                        length: 0,
                        builderPool: NaN,
                        endBuilderPool: _sb.index,
                        end: ArmEnd.Item,
                        itemType: ArmItemType.DungeonKey,
                    }, {
                        length: 3,
                        builderPool: puzzleB.index,
                        endBuilderPool: puzzleB.index,
                        end: ArmEnd.Item,
                        itemType: ArmItemType.DungeonKey,
                    }, {
                        length: 3,
                        builderPool: puzzleB.index,
                        endBuilderPool: puzzleB.index,
                        end: ArmEnd.Item,
                        itemType: ArmItemType.DungeonKey,
                    }]
                }, {
                    length: 2,
                    builderPool: puzzleB.index,
                    endBuilderPool: puzzleB.index,
                    end: ArmEnd.Item,
                    itemType: ArmItemType.DungeonKey,
                }, {
                    length: 2,
                    builderPool: puzzleB.index,
                    endBuilderPool: puzzleB.index,
                    end: ArmEnd.Item,
                    itemType: ArmItemType.DungeonKey,
                }]
            },
            //*/
        }
        return dngGenConfig
    }
}
