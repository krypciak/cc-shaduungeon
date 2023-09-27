import { AreaInfo } from '@root/area/area-builder'
import { DungeonGenerateConfig, } from '@root/dungeon/dungeon-arrange'
import { ArmEnd, ArmItemType, MapBuilderArrayGenerate } from '@root/dungeon/dungeon-arm'
import { DungeonConfigFactory } from '@root/dungeon/dungeon-builder'
import { PuzzleRoom } from '@root/room/puzzle-room'
import { Selection } from '@root/types'
import { MapBuilder } from '@root/room/map-builder'
import { DungeonIntersectionMapBuilder, PuzzleMapBuilder } from '@root/room/dungeon-map-builder'
import { DirUtil } from '@root/util/pos'
import { SimpleSingleTunnelEndMapBuilder } from '@root/room/simple-map-builder'

export class DungeonConfigMainFactory implements DungeonConfigFactory {
    async get(areaInfo: AreaInfo, seed: string): Promise<DungeonGenerateConfig> {
        await PuzzleRoom.preloadPuzzleList()
        const puzzleList = PuzzleRoom.puzzleList

        const puzzles: Readonly<Selection>[] = []
        for (let i = 0; i < puzzleList.length; i++) {
            puzzles.push(puzzleList[i])
        }
        console.log('puzzles:', puzzles)

        let index: number = 0
        const bPool = []
        const regularBuilders: MapBuilderArrayGenerate = { arr: [], randomize: true, index: index++ }
        for (let i = 0; i < puzzles.length; i++) {
            const sel = puzzles[i]
            const puzzleMap: sc.MapModel.Map = await blitzkrieg.util.getMapObject(sel.map)
            const builder: MapBuilder = new PuzzleMapBuilder(areaInfo, sel, puzzleMap, true, '')
            regularBuilders.arr.push(Object.assign(builder, { exclusive: true }))
        }
        bPool.push(regularBuilders)
        
        const _sb: MapBuilderArrayGenerate = { arr: [], randomize: true, index: index++ }
        DirUtil.forEachUniqueDir2((d1, d2) => {
            const b = Object.assign(new SimpleSingleTunnelEndMapBuilder(areaInfo, d1, d2), { exclusive: true })
            _sb.arr.push(b, b, b)
        })

        bPool.push(_sb)
        const _db: MapBuilderArrayGenerate = { arr: [], randomize: true, index: index++ }
        DirUtil.forEachUniqueDir4((d1, d2, d3, d4) => 
            _db.arr.push(Object.assign(new DungeonIntersectionMapBuilder(areaInfo, d1, d2, d3, d4), { exclusive: true })))
        bPool.push(_db)

        const dngGenConfig: DungeonGenerateConfig = {
            seed,
            areaInfo,
            // arm: {
            //     bPool,
            //     length: regularBuilders.arr.length / 1.5,
            //     builderPool: regularBuilders.index,
            //     endBuilderPool: regularBuilders.index,
            //     end: ArmEnd.Item,
            //     itemType: ArmItemType.Tresure,
            // }
            arm: {
                bPool,
                length: 1,
                builderPool: regularBuilders.index,
                endBuilderPool: _db.index,
                end: ArmEnd.Arm,
                arms: [{
                    length: 5,
                    builderPool: regularBuilders.index,
                    endBuilderPool: regularBuilders.index,
                    end: ArmEnd.Item,
                    itemType: ArmItemType.Tresure,
                }, {
                    length: 0,
                    builderPool: NaN,
                    endBuilderPool: _sb.index,
                    end: ArmEnd.Item,
                    itemType: ArmItemType.Tresure,
                }, {
                    length: 5,
                    builderPool: regularBuilders.index,
                    endBuilderPool: regularBuilders.index,
                    end: ArmEnd.Item,
                    itemType: ArmItemType.Tresure,
                }]
            },
        }
        return dngGenConfig
    }
}
